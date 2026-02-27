import { supabase } from '../api-client/supabase';
import { getAdminModuleCodes, getUserPermissions } from './permissionsService';
import { clearCachedPermissions } from './permissionsCache';

/**
 * Interfaz para una solicitud de acceso
 */
export interface AccessRequest {
  id: number;
  user_id: string;
  modulo_solicitado: string;
  mensaje: string | null;
  estado: string;
  created_at: string;
  updated_at: string | null;
  resuelto_por: string | null;
  resuelto_at: string | null;
  user_email?: string | null;
  user_name?: string | null;
}

/**
 * Tipos de permisos que se pueden otorgar en solicitudes pendientes
 */
export type PermissionType = 'view' | 'edit' | 'acreditar' | 'admin';

/**
 * Nivel de permiso para usuarios que ya tienen acceso
 */
export type PermissionLevel = 'viewer' | 'editor' | 'acreditar' | 'admin';

export interface ManagedUserModulePermission {
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  module_code: string;
  level: PermissionLevel;
  role_codes: string[];
}

interface RoleRow {
  id: string | number;
  code: string;
}

interface RoleCodeParts {
  module: string;
  action: string;
}

const ROLE_CODE_SUFFIX_CANDIDATES: Record<PermissionType, readonly string[]> = {
  view: ['viewer', 'view'],
  edit: ['editor', 'edit'],
  acreditar: ['acreditar'],
  admin: ['admin'],
};

const PERMISSION_PRIORITY_ORDER: readonly PermissionType[] = [
  'view',
  'edit',
  'acreditar',
  'admin',
];
const MANAGED_ACTIONS = new Set([
  'viewer',
  'view',
  'editor',
  'edit',
  'acreditar',
  'admin',
]);
type ProfileIdentity = {
  email: string | null;
  full_name: string | null;
};

const normalizeNullableString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeUserId = (value: unknown): string | null => {
  const normalized = normalizeNullableString(value);
  if (!normalized) return null;
  return normalized.replace(/[{}]/g, '').toLowerCase();
};

const fetchProfilesByUserIds = async (
  userIds: string[]
): Promise<Map<string, ProfileIdentity>> => {
  const uniqueUserIds = Array.from(
    new Set(userIds.map((id) => normalizeUserId(id)).filter(Boolean))
  ) as string[];

  if (uniqueUserIds.length === 0) {
    return new Map();
  }

  const mapProfilesData = (profilesData: any[] | null | undefined) =>
    new Map(
      (profilesData || [])
        .map((profile: any) => {
          const profileId = normalizeUserId(profile?.id);
          if (!profileId) return null;

          return [
            profileId,
            {
              email: normalizeNullableString(profile?.email),
              full_name: normalizeNullableString(profile?.full_name),
            },
          ] as const;
        })
        .filter(Boolean) as Array<readonly [string, ProfileIdentity]>
    );

  const { data: rpcProfilesData, error: rpcError } = await supabase.rpc(
    'rbac_get_profiles_by_ids',
    {
      p_user_ids: uniqueUserIds,
    }
  );

  if (!rpcError) {
    return mapProfilesData(rpcProfilesData as any[]);
  }

  const rpcMissing =
    rpcError.code === 'PGRST202' ||
    rpcError.message?.toLowerCase().includes('rbac_get_profiles_by_ids');

  if (!rpcMissing) {
    console.warn(
      'Error usando rpc rbac_get_profiles_by_ids, aplicando fallback por tabla profiles:',
      rpcError
    );
  }

  const { data: profilesData, error } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .in('id', uniqueUserIds);

  if (error) {
    throw new Error(`Error al obtener perfiles de usuario: ${error.message}`);
  }

  return mapProfilesData(profilesData);
};

const normalizeModuleCode = (moduleCode: string): string =>
  moduleCode.toLowerCase().trim();

const parseRoleCode = (roleCode: string): RoleCodeParts | null => {
  if (!roleCode || !roleCode.includes(':')) {
    return null;
  }

  const [rawModule, rawAction] = roleCode.split(':');
  if (!rawModule || !rawAction) {
    return null;
  }

  return {
    module: normalizeModuleCode(rawModule),
    action: rawAction.toLowerCase().trim(),
  };
};

const normalizeRequestedPermissions = (
  permissions: PermissionType[]
): PermissionType[] => {
  const uniquePermissions = Array.from(new Set<PermissionType>(permissions));

  if (!uniquePermissions.includes('view')) {
    uniquePermissions.unshift('view');
  }

  return PERMISSION_PRIORITY_ORDER.filter((perm) => uniquePermissions.includes(perm));
};

const getRoleCodeCandidates = (
  moduleCode: string,
  permission: PermissionType
): string[] => {
  return ROLE_CODE_SUFFIX_CANDIDATES[permission].map(
    (suffix) => `${moduleCode}:${suffix}`
  );
};

const derivePermissionLevelFromActions = (
  actions: Set<string>
): PermissionLevel | null => {
  if (actions.has('admin')) return 'admin';
  if (actions.has('acreditar')) return 'acreditar';
  if (actions.has('editor') || actions.has('edit')) return 'editor';
  if (actions.has('viewer') || actions.has('view')) return 'viewer';
  return null;
};

const getAdminModulesForCurrentUser = async (): Promise<string[]> => {
  const userPermissions = await getUserPermissions();
  return getAdminModuleCodes(userPermissions);
};

const resolveRoleForPermission = (
  moduleCode: string,
  permission: PermissionType,
  rolesByCode: Map<string, RoleRow>
): RoleRow => {
  const candidates = getRoleCodeCandidates(moduleCode, permission);
  const role = candidates
    .map((code) => rolesByCode.get(code))
    .find((candidate) => Boolean(candidate));

  if (!role) {
    throw new Error(
      `No se encontro un rol para "${permission}" en el modulo "${moduleCode}". Se probaron: ${candidates.join(', ')}.`
    );
  }

  return role;
};

const getModuleRoleRows = async (moduleCode: string): Promise<RoleRow[]> => {
  const normalizedModule = normalizeModuleCode(moduleCode);

  const { data, error } = await supabase
    .from('rbac_role')
    .select('id, code');

  if (error) {
    throw new Error(`Error al obtener roles de RBAC: ${error.message}`);
  }

  return (data || []).filter((role: any) => {
    const parsed = parseRoleCode(role.code);
    return parsed?.module === normalizedModule;
  });
};

const ensureModuleIsManageable = async (moduleCode: string): Promise<void> => {
  const manageableModules = await fetchManageableModuleCodes();
  const normalizedModule = normalizeModuleCode(moduleCode);

  if (!manageableModules.includes(normalizedModule)) {
    throw new Error(
      `No tienes permisos para administrar el modulo "${normalizedModule}".`
    );
  }
};

const resolveTargetLevelRoleIds = (
  moduleCode: string,
  level: PermissionLevel,
  moduleRoles: RoleRow[]
): Array<string | number> => {
  const normalizedModule = normalizeModuleCode(moduleCode);
  const rolesByCode = new Map<string, RoleRow>(
    moduleRoles.map((role) => [role.code, role])
  );
  const isAcreditacionModule = normalizedModule === 'acreditacion';

  if (level === 'acreditar' && !isAcreditacionModule) {
    throw new Error(
      'El nivel "acreditar" solo esta disponible para el modulo "acreditacion".'
    );
  }

  const requiredPermissions: PermissionType[] =
    level === 'viewer'
      ? ['view']
      : level === 'editor'
        ? ['view', 'edit']
        : level === 'acreditar'
          ? ['view', 'acreditar']
        : ['view', 'edit', 'admin'];

  const resolvedRoleIds = requiredPermissions.map(
    (permission) => resolveRoleForPermission(normalizedModule, permission, rolesByCode).id
  );

  return Array.from(new Set(resolvedRoleIds));
};

/**
 * Obtener modulos donde el usuario actual tiene permiso admin
 */
export const fetchManageableModuleCodes = async (): Promise<string[]> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    return getAdminModulesForCurrentUser();
  } catch (error) {
    console.error('Error in fetchManageableModuleCodes:', error);
    return [];
  }
};

/**
 * Obtener solicitudes pendientes filtradas por modulos administrables
 */
export const fetchPendingAccessRequests = async (): Promise<AccessRequest[]> => {
  try {
    const adminModules = await fetchManageableModuleCodes();
    if (adminModules.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from('fct_rbac_solicitud_acceso')
      .select('*')
      .eq('estado', 'pendiente')
      .in('modulo_solicitado', adminModules)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching access requests:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return [];
    }

    const userIds = [...new Set(data.map((request: any) => request.user_id))];
    const profilesById = await fetchProfilesByUserIds(userIds);
    const missingProfileIds = userIds
      .map((id) => normalizeUserId(id))
      .filter((id): id is string => Boolean(id))
      .filter((id) => !profilesById.has(id));
    if (missingProfileIds.length > 0) {
      console.warn(
        'No se encontraron perfiles para algunos user_id en solicitudes pendientes:',
        missingProfileIds
      );
    }

    return data.map((request: any) => {
      const normalizedUserId =
        normalizeUserId(request.user_id) || String(request.user_id || '');
      const profileIdentity = profilesById.get(normalizedUserId);
      return {
        id: request.id,
        user_id: normalizedUserId,
        modulo_solicitado: request.modulo_solicitado,
        mensaje: request.mensaje,
        estado: request.estado,
        created_at: request.created_at,
        updated_at: request.updated_at,
        resuelto_por: request.resuelto_por,
        resuelto_at: request.resuelto_at,
        user_email: profileIdentity?.email || request.user_email || null,
        user_name: profileIdentity?.full_name || null,
      } as AccessRequest;
    });
  } catch (error) {
    console.error('Error in fetchPendingAccessRequests:', error);
    return [];
  }
};

/**
 * Obtener permisos existentes de usuarios para modulos administrables
 */
export const fetchManagedUsersPermissions = async (): Promise<
  ManagedUserModulePermission[]
> => {
  try {
    const manageableModules = await fetchManageableModuleCodes();
    if (manageableModules.length === 0) {
      return [];
    }

    const { data: allRoles, error: rolesError } = await supabase
      .from('rbac_role')
      .select('id, code');

    if (rolesError) {
      throw new Error(`Error al obtener roles: ${rolesError.message}`);
    }

    const managedRoles = (allRoles || []).filter((role: any) => {
      const parsed = parseRoleCode(role.code);
      return (
        parsed !== null &&
        manageableModules.includes(parsed.module) &&
        MANAGED_ACTIONS.has(parsed.action)
      );
    });

    if (managedRoles.length === 0) {
      return [];
    }

    const managedRoleIds = managedRoles.map((role: any) => role.id);
    const roleById = new Map(
      managedRoles.map((role: any) => [String(role.id), role as RoleRow])
    );

    const { data: userRoles, error: userRolesError } = await supabase
      .from('rbac_user_role')
      .select('user_id, role_id')
      .in('role_id', managedRoleIds);

    if (userRolesError) {
      throw new Error(
        `Error al obtener relaciones usuario/rol: ${userRolesError.message}`
      );
    }

    if (!userRoles || userRoles.length === 0) {
      return [];
    }

    const grouped = new Map<
      string,
      {
        user_id: string;
        module_code: string;
        actions: Set<string>;
        role_codes: Set<string>;
      }
    >();

    userRoles.forEach((userRole: any) => {
      const role = roleById.get(String(userRole.role_id));
      if (!role) return;

      const parsed = parseRoleCode(role.code);
      if (!parsed || !manageableModules.includes(parsed.module)) return;

      const normalizedUserId = normalizeUserId(userRole.user_id);
      if (!normalizedUserId) return;

      const key = `${normalizedUserId}::${parsed.module}`;
      const current = grouped.get(key) || {
        user_id: normalizedUserId,
        module_code: parsed.module,
        actions: new Set<string>(),
        role_codes: new Set<string>(),
      };

      current.actions.add(parsed.action);
      current.role_codes.add(role.code);
      grouped.set(key, current);
    });

    if (grouped.size === 0) {
      return [];
    }

    const userIds = Array.from(
      new Set(Array.from(grouped.values()).map((entry) => entry.user_id))
    );

    const profilesById = await fetchProfilesByUserIds(userIds);
    const missingProfileIds = userIds
      .map((id) => normalizeUserId(id))
      .filter((id): id is string => Boolean(id))
      .filter((id) => !profilesById.has(id));
    if (missingProfileIds.length > 0) {
      console.warn(
        'No se encontraron perfiles para algunos user_id en permisos gestionables:',
        missingProfileIds
      );
    }

    const result: ManagedUserModulePermission[] = [];

    grouped.forEach((entry) => {
      const level = derivePermissionLevelFromActions(entry.actions);
      if (!level) return;

      const profileIdentity = profilesById.get(entry.user_id);
      result.push({
        user_id: entry.user_id,
        user_email: profileIdentity?.email || null,
        user_name: profileIdentity?.full_name || null,
        module_code: entry.module_code,
        level,
        role_codes: Array.from(entry.role_codes).sort(),
      });
    });

    return result.sort((a, b) => {
      const nameA = (a.user_name || a.user_email || '').toLowerCase();
      const nameB = (b.user_name || b.user_email || '').toLowerCase();

      if (nameA !== nameB) return nameA.localeCompare(nameB);
      return a.module_code.localeCompare(b.module_code);
    });
  } catch (error) {
    console.error('Error in fetchManagedUsersPermissions:', error);
    return [];
  }
};

/**
 * Aprobar una solicitud de acceso y asignar permisos
 */
export const approveAccessRequest = async (
  requestId: number,
  permissions: PermissionType[],
  _reviewNotes?: string
): Promise<void> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    const { data: requestData, error: requestError } = await supabase
      .from('fct_rbac_solicitud_acceso')
      .select('user_id, modulo_solicitado')
      .eq('id', requestId)
      .eq('estado', 'pendiente')
      .single();

    if (requestError || !requestData) {
      throw new Error('Solicitud no encontrada o ya procesada');
    }

    const userId = requestData.user_id;
    const moduleCode = normalizeModuleCode(requestData.modulo_solicitado);
    const normalizedPermissions = normalizeRequestedPermissions(permissions);

    if (
      normalizedPermissions.includes('acreditar') &&
      moduleCode !== 'acreditacion'
    ) {
      throw new Error(
        'El permiso "acreditar" solo se puede asignar al módulo de Acreditación.'
      );
    }

    const roleCandidatesByPermission = normalizedPermissions.reduce(
      (acc, permission) => {
        acc[permission] = getRoleCodeCandidates(moduleCode, permission);
        return acc;
      },
      {} as Record<PermissionType, string[]>
    );

    const roleCodeCandidates = Array.from(
      new Set(
        normalizedPermissions.flatMap(
          (permission) => roleCandidatesByPermission[permission]
        )
      )
    );

    const { data: rolesData, error: rolesError } = await supabase
      .from('rbac_role')
      .select('id, code')
      .in('code', roleCodeCandidates);

    if (rolesError) {
      throw new Error(
        `Error al obtener los roles: ${rolesError.message}. Verifica la tabla rbac_role.`
      );
    }

    if (!rolesData || rolesData.length === 0) {
      throw new Error(
        `No se encontraron roles para el modulo ${moduleCode}. Se buscaron: ${roleCodeCandidates.join(', ')}.`
      );
    }

    const rolesByCode = new Map(
      (rolesData || []).map((role: any) => [role.code, role as RoleRow])
    );

    const resolvedRoles = normalizedPermissions.map((permission) =>
      resolveRoleForPermission(moduleCode, permission, rolesByCode)
    );

    // Limpiar roles previos del mismo mÃ³dulo para evitar conservar permisos
    // mÃ¡s altos (por ejemplo, admin) cuando se aprueba como editor/viewer.
    const moduleRoles = await getModuleRoleRows(moduleCode);
    const moduleRoleIds = Array.from(new Set(moduleRoles.map((role) => role.id)));

    if (moduleRoleIds.length > 0) {
      const { error: deleteModuleRolesError } = await supabase
        .from('rbac_user_role')
        .delete()
        .eq('user_id', userId)
        .in('role_id', moduleRoleIds);

      if (deleteModuleRolesError) {
        throw new Error(
          `Error al limpiar roles previos del modulo: ${deleteModuleRolesError.message}`
        );
      }
    }

    const { data: pendingRoleData } = await supabase
      .from('rbac_role')
      .select('id')
      .eq('code', 'system:pending')
      .single();

    if (pendingRoleData) {
      const { error: deletePendingError } = await supabase
        .from('rbac_user_role')
        .delete()
        .eq('user_id', userId)
        .eq('role_id', pendingRoleData.id);

      if (deletePendingError) {
        console.warn(
          'No se pudo remover el rol system:pending:',
          deletePendingError
        );
      }
    }

    const userRoleRecords = resolvedRoles.map((role) => ({
      user_id: userId,
      role_id: role.id,
    }));

    const { error: userRoleError } = await supabase
      .from('rbac_user_role')
      .upsert(userRoleRecords, {
        onConflict: 'user_id,role_id',
      });

    if (userRoleError) {
      throw new Error(
        `Error al asignar roles al usuario: ${userRoleError.message}`
      );
    }

    const { error: updateError } = await supabase
      .from('fct_rbac_solicitud_acceso')
      .update({
        estado: 'aprobado',
        resuelto_por: user.id,
        resuelto_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .eq('estado', 'pendiente');

    if (updateError) {
      throw new Error(`Error al actualizar la solicitud: ${updateError.message}`);
    }

    clearCachedPermissions();
  } catch (error) {
    console.error('Error in approveAccessRequest:', error);
    throw error;
  }
};

/**
 * Rechazar una solicitud de acceso
 */
export const rejectAccessRequest = async (
  requestId: number,
  _reviewNotes?: string
): Promise<void> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    const { error } = await supabase
      .from('fct_rbac_solicitud_acceso')
      .update({
        estado: 'rechazado',
        resuelto_por: user.id,
        resuelto_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .eq('estado', 'pendiente');

    if (error) {
      throw new Error(`Error al rechazar solicitud: ${error.message}`);
    }
  } catch (error) {
    console.error('Error in rejectAccessRequest:', error);
    throw error;
  }
};

/**
 * Actualizar nivel de permiso existente para un usuario en un modulo
 */
export const updateManagedUserPermissionLevel = async (params: {
  userId: string;
  moduleCode: string;
  level: PermissionLevel;
}): Promise<void> => {
  const normalizedModule = normalizeModuleCode(params.moduleCode);

  await ensureModuleIsManageable(normalizedModule);

  const moduleRoles = await getModuleRoleRows(normalizedModule);
  if (moduleRoles.length === 0) {
    throw new Error(`No se encontraron roles para el modulo "${normalizedModule}".`);
  }

  const moduleRoleIds = Array.from(new Set(moduleRoles.map((role) => role.id)));

  if (moduleRoleIds.length > 0) {
    const { error: deleteError } = await supabase
      .from('rbac_user_role')
      .delete()
      .eq('user_id', params.userId)
      .in('role_id', moduleRoleIds);

    if (deleteError) {
      throw new Error(`Error al limpiar roles del modulo: ${deleteError.message}`);
    }
  }

  const targetRoleIds = resolveTargetLevelRoleIds(
    normalizedModule,
    params.level,
    moduleRoles
  );

  if (targetRoleIds.length > 0) {
    const records = targetRoleIds.map((roleId) => ({
      user_id: params.userId,
      role_id: roleId,
    }));

    const { error: upsertError } = await supabase
      .from('rbac_user_role')
      .upsert(records, {
        onConflict: 'user_id,role_id',
      });

    if (upsertError) {
      throw new Error(`Error al asignar nuevo nivel: ${upsertError.message}`);
    }
  }

  clearCachedPermissions();
};

/**
 * Revocar acceso completo de un usuario a un modulo
 */
export const revokeManagedUserModuleAccess = async (params: {
  userId: string;
  moduleCode: string;
}): Promise<void> => {
  const normalizedModule = normalizeModuleCode(params.moduleCode);

  await ensureModuleIsManageable(normalizedModule);

  const moduleRoles = await getModuleRoleRows(normalizedModule);
  if (moduleRoles.length === 0) {
    return;
  }

  const moduleRoleIds = Array.from(new Set(moduleRoles.map((role) => role.id)));

  if (moduleRoleIds.length === 0) {
    return;
  }

  const { error } = await supabase
    .from('rbac_user_role')
    .delete()
    .eq('user_id', params.userId)
    .in('role_id', moduleRoleIds);

  if (error) {
    throw new Error(`Error al revocar acceso: ${error.message}`);
  }

  clearCachedPermissions();
};

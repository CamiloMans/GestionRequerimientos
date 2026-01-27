import { supabase } from '../api-client/supabase';
import { AreaId } from '@contracts/areas';

/**
 * Interfaz para los permisos devueltos por v_my_permissions
 */
export interface PermissionRow {
  module_code: string;
  action_code: string;
}

/**
 * Estructura de permisos por módulo
 */
export interface ModulePermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  admin?: boolean;
}

/**
 * Permisos organizados por módulo
 */
export type PermissionsByModule = Record<string, ModulePermissions>;

/**
 * Mapeo de action_code a tipo de permiso
 */
const ACTION_CODE_MAP: Record<string, keyof ModulePermissions> = {
  'view': 'view',
  'create': 'create',
  'edit': 'edit',
  'update': 'edit', // Alias para edit
  'delete': 'delete',
  'remove': 'delete', // Alias para delete
  'admin': 'admin',
};

/**
 * Consultar permisos del usuario actual desde v_my_permissions
 */
export const fetchUserPermissions = async (): Promise<PermissionRow[]> => {
  try {
    // Obtener el usuario autenticado primero
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Error obteniendo usuario autenticado:', userError);
      return [];
    }

    // Consultar permisos filtrando por user_id
    const { data, error } = await supabase
      .from('v_my_permissions')
      .select('module_code, action_code')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching permissions from v_my_permissions:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchUserPermissions:', error);
    return [];
  }
};

/**
 * Transformar permisos de la vista en objeto estructurado por módulo
 */
export const transformPermissions = (
  permissions: PermissionRow[]
): PermissionsByModule => {
  const result: PermissionsByModule = {};

  permissions.forEach(({ module_code, action_code }) => {
    // Normalizar module_code (puede venir como 'acreditacion', 'proveedores', etc.)
    const module = module_code.toLowerCase().trim();
    
    // Normalizar action_code
    const action = action_code.toLowerCase().trim();
    
    // Mapear action_code a tipo de permiso
    const permissionType = ACTION_CODE_MAP[action] || action as keyof ModulePermissions;
    
    // Inicializar módulo si no existe
    if (!result[module]) {
      result[module] = {
        view: false,
        create: false,
        edit: false,
        delete: false,
      };
    }
    
    // Asignar permiso
    if (permissionType in result[module]) {
      (result[module] as any)[permissionType] = true;
    }
  });

  return result;
};

/**
 * Obtener permisos del usuario actual transformados
 */
export const getUserPermissions = async (): Promise<PermissionsByModule> => {
  const permissions = await fetchUserPermissions();
  return transformPermissions(permissions);
};

/**
 * Verificar si el usuario tiene permiso de view en un módulo específico
 */
export const hasModuleViewPermission = (
  permissions: PermissionsByModule,
  moduleCode: string
): boolean => {
  const module = moduleCode.toLowerCase().trim();
  return permissions[module]?.view === true;
};

/**
 * Mapear AreaId a module_code
 */
export const areaIdToModuleCode = (areaId: AreaId): string => {
  return areaId.toLowerCase();
};

/**
 * Verificar si el usuario tiene acceso a un área basándose en permisos
 */
export const hasAreaAccess = (
  permissions: PermissionsByModule,
  areaId: AreaId
): boolean => {
  const moduleCode = areaIdToModuleCode(areaId);
  return hasModuleViewPermission(permissions, moduleCode);
};


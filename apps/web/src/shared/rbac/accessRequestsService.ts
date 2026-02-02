import { supabase } from '../api-client/supabase';
import { getUserPermissions } from './permissionsService';

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
  // Datos del usuario que solicita (join con profiles)
  user_email?: string;
  user_name?: string;
}

/**
 * Obtener solicitudes pendientes filtradas por módulos donde el usuario es admin
 */
export const fetchPendingAccessRequests = async (): Promise<AccessRequest[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return [];
    }

    // Obtener permisos del usuario para verificar qué módulos tiene permiso de admin
    const userPermissions = await getUserPermissions();
    
    // Obtener códigos de módulos donde el usuario tiene permiso admin
    const adminModules = Object.entries(userPermissions)
      .filter(([_, perms]) => perms.admin === true)
      .map(([moduleCode, _]) => moduleCode.toLowerCase());

    if (adminModules.length === 0) {
      // Si no es admin de ningún módulo, no retornar solicitudes
      return [];
    }

    // Consultar solicitudes pendientes solo de los módulos donde es admin
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

    // Obtener información de los usuarios (profiles) para enriquecer los datos
    const userIds = [...new Set(data.map((r: any) => r.user_id))];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds);

    // Crear un mapa de user_id -> profile
    const profilesMap = new Map(
      (profilesData || []).map((p: any) => [p.id, p])
    );

    // Mapear los datos para incluir información del usuario
    return data.map((request: any) => {
      const profile = profilesMap.get(request.user_id);
      return {
        id: request.id,
        user_id: request.user_id,
        modulo_solicitado: request.modulo_solicitado,
        mensaje: request.mensaje,
        estado: request.estado,
        created_at: request.created_at,
        updated_at: request.updated_at,
        resuelto_por: request.resuelto_por,
        resuelto_at: request.resuelto_at,
        user_email: profile?.email || null,
        user_name: profile?.full_name || null,
      };
    });
  } catch (error) {
    console.error('Error in fetchPendingAccessRequests:', error);
    return [];
  }
};

/**
 * Tipos de permisos que se pueden otorgar
 */
export type PermissionType = 'view' | 'edit' | 'admin';

/**
 * Aprobar una solicitud de acceso y asignar permisos
 */
export const approveAccessRequest = async (
  requestId: number,
  permissions: PermissionType[],
  reviewNotes?: string
): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    // Obtener la solicitud para conocer el usuario y módulo
    const { data: requestData, error: requestError } = await supabase
      .from('fct_rbac_solicitud_acceso')
      .select('user_id, modulo_solicitado')
      .eq('id', requestId)
      .eq('estado', 'pendiente')
      .single();

    if (requestError || !requestData) {
      throw new Error('Solicitud no encontrada o ya procesada');
    }

    const { user_id, modulo_solicitado } = requestData;
    const moduleCode = modulo_solicitado.toLowerCase();

    // IMPORTANTE: Primero asignar roles, luego actualizar la solicitud
    // Esto evita que la solicitud quede como aprobada si falla la asignación de roles

    // Obtener los IDs de los roles correspondientes desde rbac_role
    // Los roles deben tener un formato: {modulo}:{permiso}
    // Ejemplo: "acreditacion:view", "acreditacion:edit", "acreditacion:admin"
    // O "proveedores:view", "proveedores:edit", "proveedores:admin"
    const roleCodes = permissions.map((perm) => `${moduleCode}:${perm}`);
    
    console.log('🔍 Buscando roles con códigos:', roleCodes);
    
    // Consultar los roles en rbac_role
    const { data: rolesData, error: rolesError } = await supabase
      .from('rbac_role')
      .select('id, code')
      .in('code', roleCodes);

    if (rolesError) {
      console.error('❌ Error fetching roles:', rolesError);
      throw new Error(`Error al obtener los roles: ${rolesError.message}. Verifica que la tabla rbac_role existe.`);
    }

    if (!rolesData || rolesData.length === 0) {
      console.error('❌ No se encontraron roles para los códigos:', roleCodes);
      console.error('💡 Verifica que en rbac_role existan roles con estos códigos exactos');
      throw new Error(`No se encontraron roles para: ${roleCodes.join(', ')}. Verifica que los roles existan en rbac_role con estos códigos.`);
    }

    console.log('✅ Roles encontrados:', rolesData.map((r: any) => ({ id: r.id, code: r.code })));

    // Verificar que se encontraron todos los roles solicitados
    const foundCodes = rolesData.map((r: any) => r.code);
    const missingCodes = roleCodes.filter((code) => !foundCodes.includes(code));
    if (missingCodes.length > 0) {
      console.error('❌ Faltan roles:', missingCodes);
      throw new Error(`No se encontraron los siguientes roles: ${missingCodes.join(', ')}. Verifica que existan en rbac_role.`);
    }

    // Obtener el ID del rol system:pending para removerlo si existe
    const { data: pendingRoleData } = await supabase
      .from('rbac_role')
      .select('id')
      .eq('code', 'system:pending')
      .single();

    // Crear registros en rbac_user_role
    const userRoleRecords = rolesData.map((role: any) => ({
      user_id,
      role_id: role.id,
    }));

    console.log('📝 Asignando roles al usuario:', userRoleRecords);

    // Primero, remover el rol system:pending si existe
    if (pendingRoleData) {
      console.log('🗑️ Removiendo rol system:pending del usuario');
      const { error: deletePendingError } = await supabase
        .from('rbac_user_role')
        .delete()
        .eq('user_id', user_id)
        .eq('role_id', pendingRoleData.id);

      if (deletePendingError) {
        console.warn('⚠️ No se pudo remover el rol system:pending:', deletePendingError);
        // No lanzamos error, solo logueamos, porque puede que no exista
      } else {
        console.log('✅ Rol system:pending removido');
      }
    }

    // Insertar o actualizar roles del usuario
    const { error: userRoleError } = await supabase
      .from('rbac_user_role')
      .upsert(userRoleRecords, {
        onConflict: 'user_id,role_id',
      });

    if (userRoleError) {
      console.error('❌ Error inserting user roles:', userRoleError);
      console.error('Detalles del error:', JSON.stringify(userRoleError, null, 2));
      throw new Error(`Error al asignar los roles al usuario: ${userRoleError.message}`);
    }

    console.log('✅ Roles asignados correctamente al usuario');

    // Solo después de asignar roles exitosamente, actualizar el estado de la solicitud
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
      console.error('❌ Error updating access request:', updateError);
      // Si falla la actualización, intentar revertir los roles (opcional)
      console.warn('⚠️ Los roles fueron asignados pero la solicitud no se actualizó. Considera revertir manualmente.');
      throw new Error(`Error al actualizar la solicitud: ${updateError.message}`);
    }

    console.log('✅ Solicitud aprobada y roles asignados correctamente');
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
  reviewNotes?: string
): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
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
      .eq('estado', 'pendiente'); // Solo actualizar si está pendiente

    if (error) {
      console.error('Error rejecting access request:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in rejectAccessRequest:', error);
    throw error;
  }
};


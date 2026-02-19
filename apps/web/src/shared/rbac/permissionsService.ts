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

    console.log('👤 Usuario autenticado ID:', user.id);
    console.log('🔍 Consultando permisos para user_id:', user.id);

    // Consultar permisos filtrando por user_id
    const { data, error } = await supabase
      .from('v_my_permissions')
      .select('module_code, action_code')
      .eq('user_id', user.id);

    if (error) {
      console.error('❌ Error fetching permissions from v_my_permissions:', error);
      console.error('❌ Detalles del error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }

    console.log('✅ Permisos obtenidos:', data?.length || 0, 'registros');
    if (data && data.length > 0) {
      const modules = [...new Set(data.map(p => p.module_code))];
      console.log('📋 Módulos encontrados:', modules);
      
      // Verificar específicamente si el módulo "adendas" está presente
      const hasAdendas = modules.some(m => m.toLowerCase().trim() === 'adendas');
      if (hasAdendas) {
        console.log('✅ Módulo "adendas" encontrado en permisos');
      } else {
        console.warn('⚠️ Módulo "adendas" NO encontrado en permisos. Módulos disponibles:', modules);
      }
    } else {
      console.warn('⚠️ No se obtuvieron permisos de la base de datos');
    }

    return data || [];
  } catch (error) {
    console.error('❌ Error in fetchUserPermissions:', error);
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

  console.log('🔄 Transformando permisos raw:', permissions);

  permissions.forEach(({ module_code, action_code }) => {
    // Normalizar module_code (puede venir como 'acreditacion', 'proveedores', etc.)
    const module = module_code.toLowerCase().trim();
    
    // Normalizar action_code
    const action = action_code.toLowerCase().trim();
    
    // Mapear action_code a tipo de permiso
    const permissionType = ACTION_CODE_MAP[action] || action as keyof ModulePermissions;
    
    // Debug especial para adendas
    const isAdendas = module === 'adendas';
    if (isAdendas) {
      console.log(`🔍 DEBUG ADENDAS: Procesando permiso: module_code="${module_code}" -> module="${module}", action_code="${action_code}" -> action="${action}" -> permissionType="${permissionType}"`);
    }
    
    // Debug: Log de cada permiso procesado
    console.log(`🔄 Procesando permiso: module_code="${module_code}" -> module="${module}", action_code="${action_code}" -> action="${action}" -> permissionType="${permissionType}"`);
    
    // Inicializar módulo si no existe
    if (!result[module]) {
      result[module] = {
        view: false,
        create: false,
        edit: false,
        delete: false,
        // Inicializar admin para poder mapear correctamente action_code = 'admin'
        admin: false,
      };
      if (isAdendas) {
        console.log(`🔍 DEBUG ADENDAS: Módulo inicializado con todos los permisos en false`);
      }
    }
    
    // Asignar permiso
    if (permissionType in result[module]) {
      (result[module] as any)[permissionType] = true;
      console.log(`✅ Permiso asignado: ${module}.${permissionType} = true`);
      if (isAdendas) {
        console.log(`🔍 DEBUG ADENDAS: Permiso ${permissionType} asignado correctamente. Estado actual:`, result[module]);
      }
    } else {
      console.warn(`⚠️ Tipo de permiso no reconocido: ${permissionType} para módulo ${module}`);
      if (isAdendas) {
        console.warn(`🔍 DEBUG ADENDAS: ERROR - Tipo de permiso "${permissionType}" no reconocido. Tipos válidos:`, Object.keys(result[module]));
      }
    }
  });
  
  // Debug final para adendas
  if (result['adendas']) {
    console.log('🔍 DEBUG ADENDAS FINAL: Permisos transformados para adendas:', result['adendas']);
    console.log('🔍 DEBUG ADENDAS FINAL: view === true?', result['adendas'].view === true);
  } else {
    console.warn('🔍 DEBUG ADENDAS FINAL: Módulo "adendas" NO encontrado en permisos transformados');
    console.warn('🔍 DEBUG ADENDAS FINAL: Módulos disponibles:', Object.keys(result));
  }

  console.log('✅ Permisos transformados:', result);
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
 * Buscar el módulo en los permisos con variaciones del nombre
 */
const findModuleInPermissions = (
  permissions: PermissionsByModule,
  moduleCode: string
): string | null => {
  const normalized = moduleCode.toLowerCase().trim();
  
  // Búsqueda exacta
  if (permissions[normalized]) {
    return normalized;
  }
  
  // Búsqueda flexible: buscar módulos que contengan el código o viceversa
  const moduleKeys = Object.keys(permissions);
  const found = moduleKeys.find(key => {
    const keyNormalized = key.toLowerCase().trim();
    return keyNormalized === normalized || 
           keyNormalized.includes(normalized) || 
           normalized.includes(keyNormalized);
  });
  
  return found || null;
};

/**
 * Verificar si el usuario tiene permiso de view en un módulo específico
 */
export const hasModuleViewPermission = (
  permissions: PermissionsByModule,
  moduleCode: string
): boolean => {
  const module = findModuleInPermissions(permissions, moduleCode);
  if (!module) {
    console.warn(`⚠️ Módulo "${moduleCode}" no encontrado en permisos. Módulos disponibles:`, Object.keys(permissions));
    return false;
  }
  const hasView = permissions[module]?.view === true;
  if (!hasView) {
    console.warn(`⚠️ Módulo "${moduleCode}" encontrado pero sin permiso view. Permisos:`, permissions[module]);
  }
  return hasView;
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

/**
 * Verificar si el usuario tiene permiso admin en un módulo específico
 */
export const hasModuleAdminPermission = (
  permissions: PermissionsByModule,
  moduleCode: string
): boolean => {
  const module = moduleCode.toLowerCase().trim();
  return permissions[module]?.admin === true;
};

/**
 * Verificar si el usuario tiene permiso admin en un área específica
 */
export const hasAreaAdminPermission = (
  permissions: PermissionsByModule,
  areaId: AreaId
): boolean => {
  const moduleCode = areaIdToModuleCode(areaId);
  return hasModuleAdminPermission(permissions, moduleCode);
};


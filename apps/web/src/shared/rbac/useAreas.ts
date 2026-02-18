import { useState, useEffect } from 'react';
import { supabase } from '../api-client/supabase';
import { AreaId, AREAS } from '@contracts/areas';
import { getUserPermissions, hasAreaAccess, PermissionsByModule, fetchUserPermissions } from './permissionsService';
import { getCachedPermissions, saveCachedPermissions } from './permissionsCache';

export interface UserArea {
  areaId: AreaId;
  permissions: string[];
}

/**
 * Hook para obtener las áreas permitidas para el usuario actual
 * Basado en permisos de v_my_permissions
 */
export const useAreas = () => {
  const [areas, setAreas] = useState<AreaId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<PermissionsByModule>({});

  useEffect(() => {
    const fetchUserAreas = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setAreas([]);
          setPermissions({});
          setLoading(false);
          return;
        }

        // Siempre consultar permisos raw primero para detectar cambios
        console.log('🔍 Consultando permisos raw desde la base de datos...');
        const rawPerms = await fetchUserPermissions();
        console.log('📊 Permisos raw obtenidos:', rawPerms.length, 'registros');
        console.log('📊 Módulos en raw:', [...new Set(rawPerms.map(p => p.module_code.toLowerCase().trim()))]);
        
        // Intentar obtener permisos desde caché
        const cached = getCachedPermissions(user.id);
        let userPermissions: PermissionsByModule;

        if (cached) {
          console.log('✅ Caché encontrado, módulos en caché:', Object.keys(cached.permissions));
          
          // Verificar si hay módulos nuevos en los permisos raw que no están en el caché
          const modulesInRaw = new Set(rawPerms.map(p => p.module_code.toLowerCase().trim()));
          const modulesInCache = new Set(Object.keys(cached.permissions));
          
          // Verificar si hay módulos en raw que no están en caché
          const missingModules = Array.from(modulesInRaw).filter(m => !modulesInCache.has(m));
          
          if (missingModules.length > 0) {
            console.warn(`⚠️ Módulos faltantes en caché: ${missingModules.join(', ')}. Forzando recarga desde BD`);
            userPermissions = await getUserPermissions();
            // Actualizar caché con los nuevos permisos
            const hasAnyPermission = Object.values(userPermissions).some(
              (modulePerms) => modulePerms.view === true
            );
            saveCachedPermissions(user.id, hasAnyPermission, userPermissions);
            console.log('✅ Caché actualizado con nuevos módulos');
          } else {
            console.log('✅ Usando permisos desde caché (todos los módulos presentes)');
            userPermissions = cached.permissions;
          }
        } else {
          // Consultar permisos desde v_my_permissions si no hay caché
          console.log('🔍 No hay caché, consultando permisos desde la base de datos');
          userPermissions = await getUserPermissions();
        }

        setPermissions(userPermissions);

        // Debug: Log de permisos recibidos
        console.log('🔍 Permisos recibidos:', userPermissions);
        console.log('🔍 Áreas disponibles en AreaId:', Object.values(AreaId));

        // Determinar qué áreas mostrar basándose en permisos de view
        const allowedAreas: AreaId[] = [];
        
        // Debug: Mostrar todos los módulos disponibles en permisos
        console.log('📋 Módulos disponibles en permisos:', Object.keys(userPermissions));
        console.log('📋 Áreas disponibles en AreaId:', Object.values(AreaId));
        
        // Verificar cada área disponible
        Object.values(AreaId).forEach((areaId) => {
          const moduleCode = areaId.toLowerCase();
          const modulePerms = userPermissions[moduleCode];
          const hasAccess = hasAreaAccess(userPermissions, areaId);
          
          // Debug: Log de verificación por área
          console.log(`🔍 Verificando área ${areaId}:`, {
            moduleCode,
            modulePerms,
            hasAccess,
            permissionsForModule: userPermissions[moduleCode],
            hasViewPermission: modulePerms?.view === true,
            allModuleKeys: Object.keys(userPermissions).filter(k => k.includes(moduleCode) || moduleCode.includes(k))
          });
          
          if (hasAccess) {
            allowedAreas.push(areaId);
            console.log(`✅ Área ${areaId} agregada a la lista`);
          } else {
            console.warn(`❌ Área ${areaId} NO tiene acceso. Módulo "${moduleCode}" no encontrado o sin permiso view.`);
          }
        });
        
        console.log('✅ Áreas permitidas finales:', allowedAreas);
        console.log('📊 Resumen:', {
          totalAreas: Object.values(AreaId).length,
          areasWithAccess: allowedAreas.length,
          areasWithoutAccess: Object.values(AreaId).filter(a => !allowedAreas.includes(a))
        });

        // Si no hay permisos, retornar array vacío (el onboarding se mostrará)
        setAreas(allowedAreas);
      } catch (err: any) {
        console.error('Error fetching user areas:', err);
        setError(err.message || 'Error al cargar áreas permitidas');
        // En caso de error, retornar array vacío
        setAreas([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAreas();

    // Escuchar cambios en la autenticación (solo para invalidar caché, no recargar inmediatamente)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        // Solo recargar si hay cambio de sesión
        fetchUserAreas();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const hasAccessToArea = (areaId: AreaId): boolean => {
    return areas.includes(areaId);
  };

  const getAreaInfo = (areaId: AreaId) => {
    return AREAS[areaId];
  };

  const getModulePermissions = (moduleCode: string) => {
    return permissions[moduleCode.toLowerCase()] || {
      view: false,
      create: false,
      edit: false,
      delete: false,
    };
  };

  return {
    areas,
    loading,
    error,
    permissions,
    hasAccessToArea,
    getAreaInfo,
    getModulePermissions,
  };
};


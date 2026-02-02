import { useState, useEffect } from 'react';
import { supabase } from '../api-client/supabase';
import { AreaId, AREAS } from '@contracts/areas';
import { getUserPermissions, hasAreaAccess, PermissionsByModule } from './permissionsService';
import { getCachedPermissions } from './permissionsCache';

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

        // Intentar obtener permisos desde caché (usando el mismo caché que useHasPermissions)
        const cached = getCachedPermissions(user.id);
        let userPermissions: PermissionsByModule;

        if (cached) {
          console.log('✅ Usando permisos desde caché para áreas');
          userPermissions = cached.permissions;
        } else {
          // Consultar permisos desde v_my_permissions solo si no hay caché
          console.log('🔍 Consultando permisos desde la base de datos para áreas');
          userPermissions = await getUserPermissions();
        }

        setPermissions(userPermissions);

        // Determinar qué áreas mostrar basándose en permisos de view
        const allowedAreas: AreaId[] = [];
        
        // Verificar cada área disponible
        Object.values(AreaId).forEach((areaId) => {
          const hasAccess = hasAreaAccess(userPermissions, areaId);
          if (hasAccess) {
            allowedAreas.push(areaId);
          }
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


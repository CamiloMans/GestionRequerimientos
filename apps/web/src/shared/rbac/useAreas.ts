import { useEffect, useState } from 'react';
import { supabase } from '../api-client/supabase';
import { AreaId, AREAS } from '@contracts/areas';
import { getUserPermissions, hasAreaAccess, PermissionsByModule } from './permissionsService';
import { getCachedPermissions, saveCachedPermissions, clearCachedPermissions } from './permissionsCache';

export interface UserArea {
  areaId: AreaId;
  permissions: string[];
}

const DEBUG_RBAC = import.meta.env.DEV;

const debugLog = (...args: unknown[]) => {
  if (DEBUG_RBAC) {
    console.log(...args);
  }
};

const debugWarn = (...args: unknown[]) => {
  if (DEBUG_RBAC) {
    console.warn(...args);
  }
};

const getAllowedAreas = (userPermissions: PermissionsByModule): AreaId[] => {
  const allowedAreas: AreaId[] = [];

  Object.values(AreaId).forEach((areaId) => {
    const hasAccess = hasAreaAccess(userPermissions, areaId);

    debugLog(`Verificando área ${areaId}:`, {
      hasAccess,
      modulePermissions: userPermissions[areaId.toLowerCase()],
    });

    if (hasAccess) {
      allowedAreas.push(areaId);
    } else {
      debugWarn(`Área ${areaId} sin acceso (sin permiso view)`);
    }
  });

  debugLog('Áreas permitidas finales:', allowedAreas);
  return allowedAreas;
};

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
    let mounted = true;

    const fetchUserAreas = async () => {
      try {
        if (!mounted) return;
        setLoading(true);
        setError(null);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted) return;

        if (!user) {
          setAreas([]);
          setPermissions({});
          setLoading(false);
          return;
        }

        let userPermissions: PermissionsByModule;
        const cached = getCachedPermissions(user.id);

        if (cached) {
          debugLog('Usando permisos desde caché');
          userPermissions = cached.permissions;
        } else {
          debugLog('No hay caché, consultando permisos desde la base de datos');
          userPermissions = await getUserPermissions();

          const hasAnyPermission = Object.values(userPermissions).some(
            (modulePerms) => modulePerms.view === true
          );

          saveCachedPermissions(user.id, hasAnyPermission, userPermissions);
        }

        if (!mounted) return;

        setPermissions(userPermissions);
        setAreas(getAllowedAreas(userPermissions));
      } catch (err: any) {
        console.error('Error fetching user areas:', err);
        if (!mounted) return;
        setError(err?.message || 'Error al cargar áreas permitidas');
        setAreas([]);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void fetchUserAreas();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        clearCachedPermissions();
        setAreas([]);
        setPermissions({});
        setError(null);
        setLoading(false);
        return;
      }

      if (event === 'SIGNED_IN') {
        void fetchUserAreas();
      }
    });

    return () => {
      mounted = false;
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

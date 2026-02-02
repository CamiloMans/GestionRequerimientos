import { useState, useEffect } from 'react';
import { supabase } from '../api-client/supabase';
import { AreaId, AREAS } from '@contracts/areas';
import { getUserPermissions, hasAreaAccess, PermissionsByModule } from './permissionsService';

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

        // Consultar permisos desde v_my_permissions
        const userPermissions = await getUserPermissions();
        setPermissions(userPermissions);

        // 🔍 DEBUG: Mostrar permisos en consola
        console.log('🔐 ===== PERMISOS DEL USUARIO =====');
        console.log('👤 Usuario:', user.email);
        console.log('📋 Permisos raw de v_my_permissions:', userPermissions);
        
        // Determinar qué áreas mostrar basándose en permisos de view
        const allowedAreas: AreaId[] = [];
        
        // Verificar cada área disponible
        Object.values(AreaId).forEach((areaId) => {
          const hasAccess = hasAreaAccess(userPermissions, areaId);
          const moduleCode = areaId.toLowerCase();
          const modulePerms = userPermissions[moduleCode];
          console.log(`📋 Área "${areaId}" (módulo: "${moduleCode}"):`, {
            tieneAcceso: hasAccess ? '✅ SÍ' : '❌ NO',
            permisos: modulePerms || 'Sin permisos'
          });
          if (hasAccess) {
            allowedAreas.push(areaId);
          }
        });

        console.log('🎯 Áreas permitidas (visibles en el selector):', allowedAreas);
        console.log('🔐 ========================================');

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

    // Escuchar cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUserAreas();
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


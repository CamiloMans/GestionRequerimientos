import { useState, useEffect } from 'react';
import { supabase } from '../api-client/supabase';
import { AreaId, AreaPermission } from './constants';

/**
 * Hook para verificar permisos del usuario actual
 */
export const usePermissions = (areaId?: AreaId) => {
  const [permissions, setPermissions] = useState<AreaPermission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setPermissions([]);
          setLoading(false);
          return;
        }

        // TODO: Implementar consulta real a Supabase cuando se cree la tabla user_areas
        // Por ahora, retornamos permisos básicos para desarrollo
        
        if (!areaId) {
          setPermissions([]);
          setLoading(false);
          return;
        }

        // Simulación: Por ahora todos tienen permisos de view
        // Los admins tienen todos los permisos
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile?.role === 'admin') {
          // Admins tienen todos los permisos
          setPermissions([
            `${areaId}:view`,
            `${areaId}:create`,
            `${areaId}:edit`,
            `${areaId}:delete`,
            `${areaId}:admin`,
          ]);
        } else {
          // Usuarios normales tienen solo view
          setPermissions([`${areaId}:view`]);
        }
      } catch (err) {
        console.error('Error fetching permissions:', err);
        setPermissions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [areaId]);

  const hasPermission = (permission: AreaPermission): boolean => {
    return permissions.includes(permission);
  };

  const hasAnyPermission = (permissionList: AreaPermission[]): boolean => {
    return permissionList.some(perm => permissions.includes(perm));
  };

  const hasAllPermissions = (permissionList: AreaPermission[]): boolean => {
    return permissionList.every(perm => permissions.includes(perm));
  };

  return {
    permissions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
};







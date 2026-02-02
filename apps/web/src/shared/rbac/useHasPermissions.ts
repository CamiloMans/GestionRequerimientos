import { useState, useEffect } from 'react';
import { getUserPermissions, PermissionsByModule } from './permissionsService';

/**
 * Hook para verificar si el usuario tiene permisos en algún módulo
 * Retorna true si tiene al menos un permiso de view en algún módulo
 */
export const useHasPermissions = () => {
  const [hasPermissions, setHasPermissions] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<PermissionsByModule>({});

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        setLoading(true);
        const userPermissions = await getUserPermissions();
        setPermissions(userPermissions);

        // Verificar si tiene al menos un permiso de view en algún módulo
        const hasAnyPermission = Object.values(userPermissions).some(
          (modulePerms) => modulePerms.view === true
        );

        setHasPermissions(hasAnyPermission);
      } catch (error) {
        console.error('Error checking permissions:', error);
        setHasPermissions(false);
      } finally {
        setLoading(false);
      }
    };

    checkPermissions();
  }, []);

  return {
    hasPermissions,
    loading,
    permissions,
  };
};


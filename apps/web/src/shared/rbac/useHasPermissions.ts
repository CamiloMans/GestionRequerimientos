import { useState, useEffect } from 'react';
import { supabase } from '../api-client/supabase';
import { getUserPermissions, PermissionsByModule } from './permissionsService';
import { getCachedPermissions, saveCachedPermissions, clearCachedPermissions } from './permissionsCache';

/**
 * Hook para verificar si el usuario tiene permisos en algún módulo
 * Retorna true si tiene al menos un permiso de view en algún módulo
 * Usa caché en sessionStorage para evitar verificaciones innecesarias
 */
export const useHasPermissions = () => {
  const [hasPermissions, setHasPermissions] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<PermissionsByModule>({});

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        setLoading(true);

        // Obtener usuario actual
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setHasPermissions(false);
          setPermissions({});
          setLoading(false);
          return;
        }

        // Intentar obtener del caché
        const cached = getCachedPermissions(user.id);
        if (cached) {
          console.log('✅ Usando permisos desde caché');
          setHasPermissions(cached.hasPermissions);
          setPermissions(cached.permissions);
          setLoading(false);
          return;
        }

        // Si no hay caché válido, consultar permisos
        console.log('🔍 Consultando permisos desde la base de datos');
        const userPermissions = await getUserPermissions();
        setPermissions(userPermissions);

        // Verificar si tiene al menos un permiso de view en algún módulo
        const hasAnyPermission = Object.values(userPermissions).some(
          (modulePerms) => modulePerms.view === true
        );

        setHasPermissions(hasAnyPermission);

        // Guardar en caché
        saveCachedPermissions(user.id, hasAnyPermission, userPermissions);
      } catch (error) {
        console.error('Error checking permissions:', error);
        setHasPermissions(false);
        setPermissions({});
      } finally {
        setLoading(false);
      }
    };

    checkPermissions();

    // Escuchar cambios en la autenticación para invalidar caché
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        // Limpiar caché al cerrar sesión o refrescar token
        clearCachedPermissions();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    hasPermissions,
    loading,
    permissions,
  };
};


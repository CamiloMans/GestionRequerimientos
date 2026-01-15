import { useState, useEffect } from 'react';
import { supabase } from '../api-client/supabase';
import { AreaId, AREAS } from '@contracts/areas';

export interface UserArea {
  areaId: AreaId;
  permissions: string[];
}

/**
 * Hook para obtener las áreas permitidas para el usuario actual
 */
export const useAreas = () => {
  const [areas, setAreas] = useState<AreaId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserAreas = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setAreas([]);
          setLoading(false);
          return;
        }

        // TODO: Implementar consulta real a Supabase cuando se cree la tabla user_areas
        // Por ahora, retornamos todas las áreas para desarrollo
        // En producción, esto debería consultar la tabla user_areas
        
        // Simulación: Por ahora todos los usuarios tienen acceso a acreditaciones
        // Esto se cambiará cuando se implemente la tabla de permisos
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

          // Por defecto, todos tienen acceso a acreditaciones y proveedores
          // Los admins tienen acceso a todas las áreas
          if (profile?.role === 'admin') {
            setAreas(Object.values(AreaId));
          } else {
            // Por ahora, acreditaciones y proveedores para usuarios normales
            setAreas([AreaId.ACREDITACION, AreaId.PROVEEDORES]);
          }
        } catch (profileError) {
          // Si no existe la tabla profiles o hay error, dar acceso por defecto a acreditaciones y proveedores
          console.warn('Error al obtener perfil, usando acceso por defecto:', profileError);
          setAreas([AreaId.ACREDITACION, AreaId.PROVEEDORES]);
        }
      } catch (err: any) {
        console.error('Error fetching user areas:', err);
        setError(err.message || 'Error al cargar áreas permitidas');
        // Fallback: dar acceso a acreditaciones y proveedores
        setAreas([AreaId.ACREDITACION, AreaId.PROVEEDORES]);
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

  return {
    areas,
    loading,
    error,
    hasAccessToArea,
    getAreaInfo,
  };
};


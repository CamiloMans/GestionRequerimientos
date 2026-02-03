import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../api-client/supabase';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        // Verificar si hay una sesión guardada en localStorage
        // Supabase automáticamente verifica y renueva el token si es necesario
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error verificando sesión:', error);
          if (mounted) {
            setIsAuthenticated(false);
          }
        } else {
          if (mounted) {
            setIsAuthenticated(!!session);
          }
        }
      } catch (error) {
        console.error('Error en verificación de autenticación:', error);
        if (mounted) {
          setIsAuthenticated(false);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    // Verificar inmediatamente si hay una sesión guardada
    checkAuth();

    // Escuchar cambios en el estado de autenticación
    // Esto se dispara cuando:
    // - El usuario inicia sesión
    // - El usuario cierra sesión
    // - El token se renueva automáticamente
    // - El usuario vuelve a la pestaña (si detectSessionInUrl está habilitado)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        console.log('Auth state changed:', event, session?.user?.email);
        setIsAuthenticated(!!session);
        setIsLoading(false);
      }
    });

    // Escuchar cuando la pestaña vuelve a estar activa
    const handleVisibilityChange = () => {
      if (!document.hidden && mounted) {
        // Cuando la pestaña vuelve a estar visible, verificar la sesión
        // Supabase automáticamente renueva el token si es necesario
        checkAuth();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4"></div>
          <p className="text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirigir al login guardando la ubicación actual para poder volver después
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;












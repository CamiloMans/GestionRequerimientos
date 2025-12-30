import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    let subscription: { unsubscribe: () => void } | null = null;

    const handleAuthCallback = async () => {
      try {
        // Leer los parámetros de la URL (Supabase puede incluir hash fragments o query params)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);
        
        // Verificar si hay un error en la URL
        const errorParam = hashParams.get('error') || queryParams.get('error');
        const errorDescription = hashParams.get('error_description') || queryParams.get('error_description');
        
        if (errorParam) {
          console.error('Error en callback de OAuth:', errorParam, errorDescription);
          setError(errorDescription || errorParam);
          // Redirigir al login después de mostrar el error
          timeoutId = setTimeout(() => {
            navigate('/login', { replace: true });
          }, 3000);
          return;
        }

        // Esperar a que Supabase procese la sesión y la fije
        // Primero intentamos leer la sesión inmediatamente
        let { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Error obteniendo sesión:', sessionError);
          setError('Error al verificar la sesión. Por favor, intente nuevamente.');
          timeoutId = setTimeout(() => {
            navigate('/login', { replace: true });
          }, 3000);
          return;
        }

        // Si no hay sesión inmediatamente, esperar un poco más
        // Supabase puede necesitar procesar el callback de OAuth
        if (!session) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          const retryResult = await supabase.auth.getSession();
          session = retryResult.data.session;
          sessionError = retryResult.error;
          
          if (sessionError || !session) {
            // Si aún no hay sesión, escuchar el evento de cambio de autenticación
            // Esto es importante porque Supabase puede establecer la sesión después
            timeoutId = setTimeout(() => {
              console.error('Timeout esperando la sesión');
              setError('No se pudo iniciar sesión. Por favor, intente nuevamente.');
              setTimeout(() => {
                navigate('/login', { replace: true });
              }, 3000);
            }, 5000);

            const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, session) => {
              if (event === 'SIGNED_IN' && session) {
                if (timeoutId) clearTimeout(timeoutId);
                navigate('/app', { replace: true });
              }
            });

            subscription = authSubscription;
            return;
          }
        }

        // Si llegamos aquí, la sesión está establecida correctamente
        // Limpiar la URL removiendo los parámetros de autenticación
        window.history.replaceState({}, document.title, '/auth/callback');
        // Redirigir al dashboard/app
        navigate('/app', { replace: true });
      } catch (err: any) {
        console.error('Error en callback de autenticación:', err);
        setError(err.message || 'Error al procesar la autenticación. Por favor, intente nuevamente.');
        timeoutId = setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
      }
    };

    handleAuthCallback();

    // Cleanup function
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (subscription) subscription.unsubscribe();
    };
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50 px-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-red-600 text-4xl">error</span>
          </div>
          <h2 className="text-2xl font-bold text-[#111318] mb-4">Error de Autenticación</h2>
          <p className="text-[#616f89] mb-6">{error}</p>
          <p className="text-sm text-[#616f89]">Redirigiendo al login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50 px-4">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4"></div>
        <p className="text-gray-600">Procesando autenticación...</p>
        <p className="text-sm text-gray-500 mt-2">Por favor, espera un momento</p>
      </div>
    </div>
  );
};

export default AuthCallback;


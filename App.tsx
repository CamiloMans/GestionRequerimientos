import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import RequestList from './components/RequestList';
import RequestForm from './components/RequestForm';
import FieldRequestForm from './components/FieldRequestForm';
import ProjectGalleryV2 from './components/ProjectGalleryV2';
import Login from './components/Login';
import { RequestItem, NewRequestPayload, ProjectGalleryItem } from './types';
import { 
  fetchPersonaRequerimientos, 
  createPersonaRequerimiento, 
  updatePersonaRequerimiento,
  fetchProjectGalleryItems
} from './services/supabaseService';
import { supabase } from './config/supabase';
import './utils/testSupabase'; // Script de diagnóstico disponible en consola

type ViewState = 'list' | 'create' | 'fieldRequest' | 'reports' | 'login';

function App() {
  const [view, setView] = useState<ViewState>('list');
  const [editingItem, setEditingItem] = useState<RequestItem | null>(null);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [projects, setProjects] = useState<ProjectGalleryItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null); // null = verificando, true = autenticado, false = no autenticado
  const [checkingAuth, setCheckingAuth] = useState(true);

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchPersonaRequerimientos();
      setRequests(data);
    } catch (error) {
      console.error('Error loading requests:', error);
      alert('Error al cargar las solicitudes. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Verificar autenticación al cargar la aplicación
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error verificando sesión:', error);
          setIsAuthenticated(false);
        } else {
          setIsAuthenticated(!!session);
          if (session) {
            // Si hay sesión, cargar los datos
            loadRequests();
          } else {
            // Si no hay sesión, mostrar login
            setView('login');
          }
        }
      } catch (error) {
        console.error('Error en verificación de autenticación:', error);
        setIsAuthenticated(false);
        setView('login');
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();

    // Escuchar cambios en el estado de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      const authenticated = !!session;
      setIsAuthenticated(authenticated);
      
      if (authenticated) {
        // Si el usuario se autentica, cargar datos y mostrar la aplicación
        loadRequests();
        setView((currentView) => {
          // Solo cambiar a 'list' si estamos en login
          return currentView === 'login' ? 'list' : currentView;
        });
      } else {
        // Si el usuario cierra sesión, mostrar login
        setView('login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadRequests]);

  const loadProjects = async () => {
    try {
      setLoadingProjects(true);
      const data = await fetchProjectGalleryItems();
      setProjects(data);
    } catch (error) {
      console.error('Error loading projects:', error);
      alert('Error al cargar los proyectos. Por favor, intente nuevamente.');
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleEdit = (item: RequestItem) => {
    setEditingItem(item);
    setView('create');
  };

  const handleCreateNew = () => {
    setEditingItem(null);
    setView('create');
  };

  const handleNavigateToList = () => {
    setEditingItem(null);
    setView('list');
  };

  const handleNavigateToFieldRequest = () => {
    setEditingItem(null);
    setView('fieldRequest');
  };

  const handleNavigateToReports = () => {
    setEditingItem(null);
    setView('reports');
    // Cargar proyectos cuando se navega a reportes
    loadProjects();
  };

  const handleNavigateToLogin = () => {
    setEditingItem(null);
    setView('login');
  };

  const handleLoginSuccess = () => {
    // Después de un login exitoso, redirigir a la vista principal
    console.log('Login exitoso');
    setIsAuthenticated(true);
    setView('list');
    loadRequests();
  };

  const handleSave = async (data: NewRequestPayload) => {
    console.log('🔥 handleSave recibió:', data);
    console.log('🔥 Estado en data:', data.estado);
    
    try {
      if (editingItem && editingItem.id) {
        console.log('✏️ Editando registro ID:', editingItem.id);
        // Actualizar registro existente
        await updatePersonaRequerimiento(
          parseInt(editingItem.id),
          data.fecha_vigencia,
          data.fecha_vencimiento,
          data.estado,
          data.link
        );
      } else {
        // Crear nuevo registro
        await createPersonaRequerimiento(
          data.persona_id,
          data.requerimiento_id,
          data.fecha_vigencia,
          data.fecha_vencimiento,
          data.link
        );
      }
      
      // Recargar la lista
      await loadRequests();
      setEditingItem(null);
      setView('list');
    } catch (error) {
      console.error('Error saving request:', error);
      alert('Error al guardar la solicitud. Por favor, intente nuevamente.');
    }
  };

  // Mostrar loading mientras se verifica la autenticación
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4"></div>
          <p className="text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // Si no está autenticado, mostrar solo el login (sin sidebar ni header)
  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Si está autenticado, mostrar la aplicación completa
  return (
    <div className="relative flex min-h-screen w-full flex-row">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        onNavigateToRequests={handleNavigateToList}
        onNavigateToFieldRequest={handleNavigateToFieldRequest}
        onNavigateToReports={handleNavigateToReports}
        onNavigateToLogin={handleNavigateToLogin}
        activeView={view}
        hideOnDesktop={isFilterSidebarOpen}
      />
      
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <button 
          onClick={() => setSidebarOpen(true)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined text-gray-600">menu</span>
        </button>
        <h2 className="text-lg font-semibold text-[#111318]">Gestión de Solicitudes</h2>
        <div className="w-10"></div> {/* Spacer for centering */}
      </div>

      <main className={`flex flex-1 flex-col h-full min-h-screen bg-[#f8fafc] pt-[60px] lg:pt-0 overflow-x-hidden ${!isFilterSidebarOpen ? 'lg:ml-[80px]' : ''}`}>
        {view === 'login' ? (
          <Login onLoginSuccess={handleLoginSuccess} />
        ) : loading ? (
          <div className="flex items-center justify-center h-full min-h-screen">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
              <p className="text-gray-600">Cargando solicitudes...</p>
            </div>
          </div>
        ) : view === 'list' ? (
          <RequestList 
            requests={requests} 
            onCreateNew={handleCreateNew} 
            onEdit={handleEdit}
          />
        ) : view === 'fieldRequest' ? (
          <FieldRequestForm 
            onBack={() => setView('list')} 
          />
        ) : view === 'reports' ? (
          loadingProjects ? (
            <div className="flex items-center justify-center h-full min-h-screen">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-gray-600">Cargando proyectos...</p>
              </div>
            </div>
          ) : (
            <ProjectGalleryV2 
              projects={projects}
              onProjectUpdate={loadProjects}
              onFilterSidebarChange={setIsFilterSidebarOpen}
            />
          )
        ) : (
          <RequestForm 
            onBack={() => setView('list')} 
            onSave={handleSave} 
            initialData={editingItem}
          />
        )}
      </main>
    </div>
  );
}

export default App;
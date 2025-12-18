import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import RequestList from './components/RequestList';
import RequestForm from './components/RequestForm';
import FieldRequestForm from './components/FieldRequestForm';
import ProjectGalleryV2 from './components/ProjectGalleryV2';
import { RequestItem, NewRequestPayload, ProjectGalleryItem } from './types';
import { 
  fetchPersonaRequerimientos, 
  createPersonaRequerimiento, 
  updatePersonaRequerimiento,
  fetchProjectGalleryItems
} from './services/supabaseService';

type ViewState = 'list' | 'create' | 'fieldRequest' | 'reports';

function App() {
  const [view, setView] = useState<ViewState>('list');
  const [editingItem, setEditingItem] = useState<RequestItem | null>(null);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [projects, setProjects] = useState<ProjectGalleryItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Cargar datos al montar el componente
  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
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
  };

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
          data.estado
        );
      } else {
        // Crear nuevo registro
        await createPersonaRequerimiento(
          data.persona_id,
          data.requerimiento_id,
          data.fecha_vigencia,
          data.fecha_vencimiento
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

  return (
    <div className="relative flex min-h-screen w-full flex-row">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        onNavigateToRequests={handleNavigateToList}
        onNavigateToFieldRequest={handleNavigateToFieldRequest}
        onNavigateToReports={handleNavigateToReports}
        activeView={view}
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

      <main className="flex flex-1 flex-col h-full min-h-screen bg-[#f8fafc] pt-[60px] lg:pt-0 lg:ml-[80px] overflow-x-hidden">
        {loading ? (
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
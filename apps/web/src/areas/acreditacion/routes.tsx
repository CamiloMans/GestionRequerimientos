import React from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import RequestList from './pages/RequestList';
import RequestForm from './pages/RequestForm';
import FieldRequestForm from './pages/FieldRequestForm';
import ProjectGalleryV2 from './pages/ProjectGalleryV2';
import DashboardView from './pages/DashboardView';
import { RequestItem, NewRequestPayload, ProjectGalleryItem } from './types';
import { ACREDITACION_ROUTES } from './utils/routes';
import {
  fetchPersonaRequerimientos,
  createPersonaRequerimiento,
  updatePersonaRequerimiento,
  deletePersonaRequerimiento,
  checkUserIsAdmin,
  fetchProjectGalleryItems,
} from './services/acreditacionService';

/**
 * Componente que maneja las rutas del área de Acreditaciones
 */
const AcreditacionRoutes: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [editingItem, setEditingItem] = React.useState<RequestItem | null>(null);
  const [requests, setRequests] = React.useState<RequestItem[]>([]);
  const [projects, setProjects] = React.useState<ProjectGalleryItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingProjects, setLoadingProjects] = React.useState(false);

  const loadRequests = React.useCallback(async () => {
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

  React.useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const loadProjects = React.useCallback(async () => {
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
  }, []);

  React.useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Actualizar proyectos cuando se navega a la ruta "reports"
  React.useEffect(() => {
    if (location.pathname.includes('/reports')) {
      loadProjects();
    }
  }, [location.pathname, loadProjects]);

  const handleEdit = (item: RequestItem) => {
    setEditingItem(item);
    navigate(ACREDITACION_ROUTES.requestsEdit);
  };

  const handleCreateNew = () => {
    setEditingItem(null);
    navigate(ACREDITACION_ROUTES.requestsCreate);
  };

  const handleSave = async (data: NewRequestPayload) => {
    console.log('🔥 handleSave recibió:', data);
    console.log('🔥 Estado en data:', data.estado);

    try {
      if (editingItem && editingItem.id) {
        console.log('✏️ Editando registro ID:', editingItem.id);
        await updatePersonaRequerimiento(
          parseInt(editingItem.id),
          data.fecha_vigencia,
          data.fecha_vencimiento,
          data.estado,
          data.link
        );
      } else {
        await createPersonaRequerimiento(
          data.persona_id,
          data.requerimiento_id,
          data.fecha_vigencia,
          data.fecha_vencimiento,
          data.link
        );
      }

      await loadRequests();
      setEditingItem(null);
      // Navegar de vuelta a la lista después de guardar
      navigate(ACREDITACION_ROUTES.requests);
    } catch (error) {
      console.error('Error saving request:', error);
      alert('Error al guardar la solicitud. Por favor, intente nuevamente.');
    }
  };

  const handleDelete = async () => {
    if (!editingItem || !editingItem.id) {
      return;
    }

    try {
      const isAdmin = await checkUserIsAdmin();

      if (!isAdmin) {
        alert('No tienes permisos para eliminar registros. Solo los administradores pueden realizar esta acción.');
        return;
      }

      await deletePersonaRequerimiento(parseInt(editingItem.id));

      console.log('✅ Registro eliminado (usuario admin)');

      await loadRequests();
      setEditingItem(null);
    } catch (error) {
      console.error('Error deleting request:', error);
      alert('Error al eliminar la solicitud. Por favor, intente nuevamente.');
    }
  };

  return (
    <Routes>
      <Route
        path="requests"
        element={
          loading ? (
            <div className="flex items-center justify-center h-full min-h-screen">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-gray-600">Cargando solicitudes...</p>
              </div>
            </div>
          ) : (
            <RequestList
              requests={requests}
              onCreateNew={handleCreateNew}
              onEdit={handleEdit}
            />
          )
        }
      />
      <Route
        path="requests/create"
        element={
          <RequestForm
            onBack={() => window.history.back()}
            onSave={handleSave}
            initialData={null}
          />
        }
      />
      <Route
        path="requests/edit"
        element={
          editingItem ? (
            <RequestForm
              onBack={() => window.history.back()}
              onSave={handleSave}
              onDelete={handleDelete}
              initialData={editingItem}
            />
          ) : (
            <Navigate to="requests" replace />
          )
        }
      />
      <Route
        path="field-request"
        element={
          <FieldRequestForm
            onBack={() => window.history.back()}
          />
        }
      />
      <Route
        path="reports"
        element={
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
              onFilterSidebarChange={() => {}}
            />
          )
        }
      />
      <Route
        path="dashboards"
        element={<DashboardView />}
      />
      <Route path="/" element={<Navigate to="dashboards" replace />} />
      <Route path="*" element={<Navigate to="dashboards" replace />} />
    </Routes>
  );
};

export default AcreditacionRoutes;





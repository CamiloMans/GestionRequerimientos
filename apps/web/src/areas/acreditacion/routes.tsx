import React from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import RequestList from './pages/RequestList';
import RequestForm from './pages/RequestForm';
import FieldRequestForm from './pages/FieldRequestForm';
import ProjectGalleryV2 from './pages/ProjectGalleryV2';
import DashboardView from './pages/DashboardView';
import { RequestItem, NewRequestPayload, ProjectGalleryItem } from './types';
import { ACREDITACION_ROUTES } from './utils/routes';
import { getUserPermissions } from '@shared/rbac/permissionsService';
import {
  DEFAULT_ACREDITACION_NAVIGATION_POLICY,
  buildAcreditacionNavigationPolicy,
} from './utils/navigationPolicy';
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
  const [navigationPolicy, setNavigationPolicy] = React.useState(
    DEFAULT_ACREDITACION_NAVIGATION_POLICY
  );
  const [navigationPolicyLoading, setNavigationPolicyLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;

    const loadNavigationPolicy = async () => {
      try {
        setNavigationPolicyLoading(true);
        const permissions = await getUserPermissions();
        if (!mounted) return;
        setNavigationPolicy(buildAcreditacionNavigationPolicy(permissions));
      } catch (error) {
        console.error('Error loading acreditacion navigation policy:', error);
        if (!mounted) return;
        setNavigationPolicy(DEFAULT_ACREDITACION_NAVIGATION_POLICY);
      } finally {
        if (mounted) {
          setNavigationPolicyLoading(false);
        }
      }
    };

    void loadNavigationPolicy();

    return () => {
      mounted = false;
    };
  }, []);

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
    if (navigationPolicyLoading) return;

    if (!navigationPolicy.canAccessRequestsSst) {
      setRequests([]);
      setLoading(false);
      return;
    }

    void loadRequests();
  }, [
    loadRequests,
    navigationPolicyLoading,
    navigationPolicy.canAccessRequestsSst,
  ]);

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
    if (navigationPolicyLoading) return;
    if (!navigationPolicy.canAccessReports) {
      setProjects([]);
      setLoadingProjects(false);
      return;
    }

    void loadProjects();
  }, [loadProjects, navigationPolicyLoading, navigationPolicy.canAccessReports]);

  // Actualizar proyectos cuando se navega a la ruta "reports"
  React.useEffect(() => {
    if (navigationPolicyLoading) return;
    if (!navigationPolicy.canAccessReports) return;

    if (location.pathname.includes('/reports')) {
      void loadProjects();
    }
  }, [
    location.pathname,
    loadProjects,
    navigationPolicyLoading,
    navigationPolicy.canAccessReports,
  ]);

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

  if (navigationPolicyLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  const shouldRedirectFromRequestsSst = !navigationPolicy.canAccessRequestsSst;
  const canAccessDashboards = navigationPolicy.canAccessDashboards;
  const shouldRedirectFromDashboards = !canAccessDashboards;
  const defaultRoute = navigationPolicy.defaultRoute;

  return (
    <Routes>
      <Route
        path="requests"
        element={
          shouldRedirectFromRequestsSst ? (
            <Navigate to="reports" replace />
          ) : loading ? (
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
          shouldRedirectFromRequestsSst ? (
            <Navigate to="reports" replace />
          ) : (
            <RequestForm
              onBack={() => window.history.back()}
              onSave={handleSave}
              initialData={null}
            />
          )
        }
      />
      <Route
        path="requests/edit"
        element={
          shouldRedirectFromRequestsSst ? (
            <Navigate to="reports" replace />
          ) : editingItem ? (
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
              accessLevel={navigationPolicy.accessLevel}
            />
          )
        }
      />
      <Route
        path="dashboards"
        element={
          shouldRedirectFromDashboards ? (
            <Navigate to="reports" replace />
          ) : (
            <DashboardView />
          )
        }
      />
      <Route path="/" element={<Navigate to={defaultRoute} replace />} />
      <Route path="*" element={<Navigate to={defaultRoute} replace />} />
    </Routes>
  );
};

export default AcreditacionRoutes;

import React, { useState } from 'react';
import { ProjectGalleryItem } from '../types';
import AssignResponsiblesModal, { ResponsablesData } from './AssignResponsiblesModal';
import { updateResponsablesSolicitud } from '../services/supabaseService';

interface ProjectGalleryV2Props {
  projects: ProjectGalleryItem[];
  onProjectUpdate?: () => void;
}

const ProjectGalleryV2: React.FC<ProjectGalleryV2Props> = ({ projects, onProjectUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedProject, setSelectedProject] = useState<ProjectGalleryItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filtrar proyectos
  const filteredProjects = projects.filter(project => {
    const matchesSearch = 
      project.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.projectCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus ? project.status === filterStatus : true;
    
    return matchesSearch && matchesStatus;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('');
  };

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === '-') return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    // Pendiente - Amarillo/Ámbar (aún no iniciado)
    if (statusLower.includes('pendiente')) return 'bg-amber-100 text-amber-700 border-amber-200';
    // En proceso - Azul (trabajo en progreso)
    if (statusLower.includes('proceso')) return 'bg-blue-100 text-blue-700 border-blue-200';
    // Finalizada - Verde (completado exitosamente)
    if (statusLower.includes('finalizada')) return 'bg-green-100 text-green-700 border-green-200';
    // Cancelada - Rojo (detenido/cancelado)
    if (statusLower.includes('cancelada')) return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getProjectBorderColor = (status: string) => {
    const statusLower = status.toLowerCase();
    // Pendiente - Amarillo/Ámbar
    if (statusLower.includes('pendiente')) return 'border-amber-500 bg-amber-50';
    // En proceso - Azul
    if (statusLower.includes('proceso')) return 'border-blue-500 bg-blue-50';
    // Finalizada - Verde
    if (statusLower.includes('finalizada')) return 'border-green-500 bg-green-50';
    // Cancelada - Rojo
    if (statusLower.includes('cancelada')) return 'border-red-500 bg-red-50';
    return 'border-gray-500 bg-gray-50';
  };

  const handleProjectClick = (project: ProjectGalleryItem) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProject(null);
  };

  const handleSaveResponsables = async (responsables: ResponsablesData) => {
    if (!selectedProject) return;

    try {
      setSaving(true);
      await updateResponsablesSolicitud(selectedProject.id, responsables);
      
      // Notificar al componente padre para que recargue los datos
      if (onProjectUpdate) {
        onProjectUpdate();
      }
      
      // Mostrar mensaje de éxito (opcional)
      console.log('Responsables actualizados exitosamente');
      
      handleCloseModal();
    } catch (error) {
      console.error('Error guardando responsables:', error);
      alert('Error al guardar los responsables. Por favor, intente nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  // Calcular estadísticas
  const totalProjects = projects.length;
  const totalWorkers = projects.reduce((sum, p) => sum + p.totalWorkers, 0);
  const totalVehicles = projects.reduce((sum, p) => sum + p.totalVehicles, 0);
  const activeProjects = projects.filter(p => p.status.toLowerCase().includes('activo') || p.status.toLowerCase().includes('vigente')).length;

  return (
    <div className="layout-container flex h-full grow flex-col">
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-6 py-8 md:px-10 lg:px-12">
        
        {/* Header */}
        <div className="mb-8 flex flex-wrap justify-between gap-4 border-b border-[#e5e7eb] pb-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-4xl">bar_chart</span>
              <h1 className="text-[#111318] text-2xl lg:text-3xl font-bold tracking-tight">Reportes de Proyectos</h1>
            </div>
            <p className="text-[#616f89] text-sm lg:text-base font-normal">
              Vista general de todas las solicitudes de acreditación y proyectos
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Proyectos</p>
                <p className="text-2xl font-bold text-[#111318] mt-1">{totalProjects}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-600 text-2xl">work</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Trabajadores</p>
                <p className="text-2xl font-bold text-[#111318] mt-1">{totalWorkers}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-green-600 text-2xl">group</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Vehículos</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{totalVehicles}</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-amber-600 text-2xl">directions_car</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Proyectos Activos</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{activeProjects}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-green-600 text-2xl">check_circle</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-6 relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
              <input
                type="text"
                placeholder="Buscar proyectos por nombre, código o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 pl-10 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            
            <div className="md:col-span-3">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="form-select w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="">Todos los estados</option>
                <option value="Activo">Activo</option>
                <option value="En Proceso">En Proceso</option>
                <option value="Completado">Completado</option>
                <option value="Pendiente">Pendiente</option>
              </select>
            </div>

            <div className="md:col-span-3 flex gap-2">
              <button
                onClick={clearFilters}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 font-medium transition-colors text-sm flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">filter_alt_off</span>
                Limpiar
              </button>
            </div>
          </div>
        </div>

        {/* Projects Gallery */}
        <div className="space-y-4">
          {filteredProjects.length > 0 ? (
            filteredProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => handleProjectClick(project)}
                className={`bg-white rounded-xl border-2 shadow-sm overflow-hidden hover:shadow-lg transition-all cursor-pointer ${getProjectBorderColor(project.status)}`}
              >
                {/* Project Header */}
                <div className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 px-6 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-primary text-2xl">folder_open</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-bold text-[#111318] truncate">{project.projectCode}</h3>
                          {project.projectName && (
                            <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600 border border-gray-200 flex-shrink-0">
                              {project.projectName}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 flex-wrap">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">business</span>
                            {project.clientName}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">person</span>
                            {project.projectManager}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">event</span>
                            {formatDate(project.fieldStartDate)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-center px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Trabajadores</p>
                        <p className="text-xl font-bold text-primary">{project.totalWorkers}</p>
                      </div>
                      <div className="text-center px-3 py-2 bg-amber-50 rounded-lg border border-amber-100">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Vehículos</p>
                        <p className="text-xl font-bold text-amber-600">{project.totalVehicles}</p>
                      </div>
                      <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${getStatusColor(project.status)}`}>
                        {project.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Workers List */}
                {project.workers && project.workers.length > 0 && (
                  <div className="p-6">
                    <h4 className="text-sm font-bold text-[#111318] mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[18px]">group</span>
                      Trabajadores Asignados
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {project.workers.map((worker, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-primary text-[18px]">person</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-[#111318] truncate">{worker.name}</p>
                            {worker.phone && (
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">phone</span>
                                {worker.phone}
                              </p>
                            )}
                            {worker.company && (
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">business</span>
                                {worker.company}
                              </p>
                            )}
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            worker.type?.includes('Interno') 
                              ? 'bg-blue-100 text-blue-700 border border-blue-200'
                              : 'bg-orange-100 text-orange-700 border border-orange-200'
                          }`}>
                            {worker.type?.includes('Interno') ? 'INT' : 'EXT'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
              <span className="material-symbols-outlined text-gray-300 text-6xl mb-4 block">search_off</span>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No se encontraron proyectos</h3>
              <p className="text-gray-500 mb-4">No hay proyectos que coincidan con los filtros seleccionados.</p>
              {(searchTerm || filterStatus) && (
                <button
                  onClick={clearFilters}
                  className="text-primary font-medium hover:underline"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Asignación de Responsables */}
      {selectedProject && (
        <AssignResponsiblesModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveResponsables}
          projectName={selectedProject.projectCode}
          currentResponsables={{
            empresa_id: (selectedProject as any).empresa_id,
            empresa_nombre: (selectedProject as any).empresa_nombre,
            jpro_id: (selectedProject as any).jpro_id,
            jpro_nombre: (selectedProject as any).jpro_nombre,
            epr_id: (selectedProject as any).epr_id,
            epr_nombre: (selectedProject as any).epr_nombre,
            rrhh_id: (selectedProject as any).rrhh_id,
            rrhh_nombre: (selectedProject as any).rrhh_nombre,
            legal_id: (selectedProject as any).legal_id,
            legal_nombre: (selectedProject as any).legal_nombre,
          }}
        />
      )}
    </div>
  );
};

export default ProjectGalleryV2;


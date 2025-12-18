import React, { useState } from 'react';
import { ProjectGalleryItem } from '../types';
import AssignResponsiblesModal, { ResponsablesData } from './AssignResponsiblesModal';
import ProjectDetailView from './ProjectDetailView';
import { updateResponsablesSolicitud, fetchEmpresaRequerimientos, createProyectoRequerimientos } from '../services/supabaseService';

interface ProjectGalleryV2Props {
  projects: ProjectGalleryItem[];
  onProjectUpdate?: () => void;
}

const ProjectGalleryV2: React.FC<ProjectGalleryV2Props> = ({ projects, onProjectUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterProgress, setFilterProgress] = useState('');
  const [selectedProject, setSelectedProject] = useState<ProjectGalleryItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);
  const [saving, setSaving] = useState(false);

  // Obtener lista única de clientes
  const uniqueClients = Array.from(new Set(projects.map(p => p.clientName))).sort();

  // Filtrar proyectos
  const filteredProjects = projects.filter(project => {
    const matchesSearch = 
      project.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.projectCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus ? project.status === filterStatus : true;
    const matchesClient = filterClient ? project.clientName === filterClient : true;
    
    // Filtro por progreso
    let matchesProgress = true;
    if (filterProgress && project.totalTasks && project.totalTasks > 0) {
      const progressPercentage = ((project.completedTasks || 0) / project.totalTasks) * 100;
      if (filterProgress === 'low') {
        matchesProgress = progressPercentage < 25;
      } else if (filterProgress === 'medium') {
        matchesProgress = progressPercentage >= 25 && progressPercentage < 75;
      } else if (filterProgress === 'high') {
        matchesProgress = progressPercentage >= 75;
      }
    }
    
    return matchesSearch && matchesStatus && matchesClient && matchesProgress;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('');
    setFilterClient('');
    setFilterProgress('');
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
    // Finalizada/Finalizado - Verde (completado exitosamente)
    if (statusLower.includes('finalizada') || statusLower.includes('finalizado')) return 'bg-green-100 text-green-700 border-green-200';
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
    // Finalizada/Finalizado - Verde
    if (statusLower.includes('finalizada') || statusLower.includes('finalizado')) return 'border-green-500 bg-green-50';
    // Cancelada - Rojo
    if (statusLower.includes('cancelada')) return 'border-red-500 bg-red-50';
    return 'border-gray-500 bg-gray-50';
  };

  const getProjectDuration = (createdAt: string) => {
    if (!createdAt) return { value: '-', unit: '' };
    
    const created = new Date(createdAt);
    const now = new Date();
    const diffInMs = now.getTime() - created.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return { value: '0', unit: 'días' };
    } else if (diffInDays === 1) {
      return { value: '1', unit: 'día' };
    } else {
      return { value: diffInDays.toString(), unit: 'días' };
    }
  };

  const handleProjectClick = (project: ProjectGalleryItem) => {
    setSelectedProject(project);
    
    // Si el proyecto está en estado "Pendiente", abre el modal de asignación
    // Si NO está en "Pendiente", abre la vista de detalle
    if (project.status.toLowerCase().includes('pendiente')) {
      setIsModalOpen(true);
    } else {
      setShowDetailView(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProject(null);
  };

  const handleBackFromDetail = () => {
    setShowDetailView(false);
    setSelectedProject(null);
    // Recargar datos después de ver el detalle (por si hubo cambios)
    if (onProjectUpdate) {
      onProjectUpdate();
    }
  };

  const handleSaveResponsables = async (responsables: ResponsablesData) => {
    if (!selectedProject) return;

    try {
      setSaving(true);
      
      console.log('═══════════════════════════════════════════════════');
      console.log('💾 GUARDANDO RESPONSABLES Y REQUERIMIENTOS');
      console.log('═══════════════════════════════════════════════════');
      console.log('Proyecto:', selectedProject.projectCode);
      console.log('Empresa:', responsables.empresa_nombre);
      console.log('Responsables seleccionados:', {
        JPRO: responsables.jpro_nombre || 'Sin asignar',
        EPR: responsables.epr_nombre || 'Sin asignar',
        RRHH: responsables.rrhh_nombre || 'Sin asignar',
        Legal: responsables.legal_nombre || 'Sin asignar'
      });
      console.log('Requerimientos recibidos:', responsables.empresaRequerimientos?.length || 0);
      
      // 1. Guardar responsables en la base de datos (esto es lo PRINCIPAL)
      console.log('\n📝 Paso 1: Guardando responsables en solicitud_acreditacion...');
      await updateResponsablesSolicitud(selectedProject.id, responsables);
      console.log('✅ Responsables guardados exitosamente');
      
      // 2. Guardar requerimientos del proyecto si hay empresa y requerimientos
      if (responsables.empresa_nombre && responsables.empresaRequerimientos && responsables.empresaRequerimientos.length > 0) {
        try {
          console.log('\n📋 Paso 2: Guardando requerimientos en proyecto_requerimientos_acreditacion...');
          console.log(`Total de requerimientos a guardar: ${responsables.empresaRequerimientos.length}`);
          console.log('\nVista previa de los primeros 3 requerimientos:');
          
          responsables.empresaRequerimientos.slice(0, 3).forEach((req, i) => {
            const nombreResp = req.responsable === 'JPRO' ? responsables.jpro_nombre :
                              req.responsable === 'EPR' ? responsables.epr_nombre :
                              req.responsable === 'RRHH' ? responsables.rrhh_nombre :
                              req.responsable === 'Legal' ? responsables.legal_nombre : 'Sin asignar';
            
            console.log(`\n  ${i + 1}. ${req.requerimiento}`);
            console.log(`     Cargo: ${req.responsable}`);
            console.log(`     Nombre Responsable: ${nombreResp || 'Sin asignar'}`);
            console.log(`     Categoría: ${req.categoria_requerimiento}`);
          });
          
          if (responsables.empresaRequerimientos.length > 3) {
            console.log(`\n  ... y ${responsables.empresaRequerimientos.length - 3} más`);
          }
          
          // Crear requerimientos del proyecto con los nombres de responsables seleccionados
          await createProyectoRequerimientos(
            selectedProject.projectCode,
            responsables.empresa_nombre,
            responsables.empresaRequerimientos,
            {
              jpro_nombre: responsables.jpro_nombre,
              epr_nombre: responsables.epr_nombre,
              rrhh_nombre: responsables.rrhh_nombre,
              legal_nombre: responsables.legal_nombre
            }
          );
          
          console.log('\n✅ Requerimientos del proyecto guardados exitosamente en la BD');
          console.log('═══════════════════════════════════════════════════\n');
        } catch (reqError) {
          // Si falla la creación de requerimientos, NO afecta el guardado principal
          console.error('\n❌ Error al guardar requerimientos:', reqError);
          console.warn('⚠️ Los responsables se guardaron, pero hubo un problema con los requerimientos');
          console.log('💡 Posible causa: La tabla proyecto_requerimientos_acreditacion no existe o faltan columnas');
          // No lanzamos el error, continuamos normalmente
        }
      } else {
        console.log('\n⚠️ No hay requerimientos para guardar');
        console.log('Razones posibles:');
        console.log('  - No se seleccionó empresa:', !responsables.empresa_nombre);
        console.log('  - No hay requerimientos:', !responsables.empresaRequerimientos || responsables.empresaRequerimientos.length === 0);
      }
      
      // 3. Notificar al componente padre para que recargue los datos
      if (onProjectUpdate) {
        onProjectUpdate();
      }
      
      // 4. Mostrar mensaje de éxito
      let successMsg = '✅ Guardado Exitoso\n\n';
      successMsg += `Proyecto: ${selectedProject.projectCode}\n`;
      
      if (responsables.empresa_nombre) {
        successMsg += `Empresa: ${responsables.empresa_nombre}\n\n`;
      }
      
      successMsg += '👥 Responsables Asignados:\n';
      successMsg += (responsables.jpro_nombre ? `  • JPRO: ${responsables.jpro_nombre}\n` : '  • JPRO: Sin asignar\n');
      successMsg += (responsables.epr_nombre ? `  • EPR: ${responsables.epr_nombre}\n` : '  • EPR: Sin asignar\n');
      successMsg += (responsables.rrhh_nombre ? `  • RRHH: ${responsables.rrhh_nombre}\n` : '  • RRHH: Sin asignar\n');
      successMsg += (responsables.legal_nombre ? `  • Legal: ${responsables.legal_nombre}\n` : '  • Legal: Sin asignar\n');
      
      if (responsables.empresaRequerimientos && responsables.empresaRequerimientos.length > 0) {
        successMsg += `\n📋 Requerimientos Creados: ${responsables.empresaRequerimientos.length}`;
      }
      
      alert(successMsg);
      
      handleCloseModal();
    } catch (error) {
      console.error('❌ Error guardando responsables:', error);
      
      // Mostrar error detallado
      let errorMsg = '❌ Error al guardar los responsables\n\n';
      
      if (error instanceof Error) {
        errorMsg += `Detalle: ${error.message}\n\n`;
        
        // Ayuda específica según el error
        if (error.message.includes('column') || error.message.includes('does not exist')) {
          errorMsg += '💡 Solución: Las columnas de responsables no existen en la base de datos.\n';
          errorMsg += 'Ejecuta el script: sql/add_responsables_columns.sql en Supabase SQL Editor';
        } else if (error.message.includes('table') || error.message.includes('relation')) {
          errorMsg += '💡 Solución: La tabla solicitud_acreditacion no existe.\n';
          errorMsg += 'Verifica tu configuración de Supabase';
        } else {
          errorMsg += 'Por favor, verifica:\n';
          errorMsg += '1. Que ejecutaste sql/add_responsables_columns.sql\n';
          errorMsg += '2. Que la conexión a Supabase está activa\n';
          errorMsg += '3. Los logs en la consola del navegador (F12)';
        }
      } else {
        errorMsg += 'Error desconocido. Revisa la consola del navegador (F12)';
      }
      
      alert(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  // Calcular estadísticas
  const totalProjects = projects.length;
  const totalWorkers = projects.reduce((sum, p) => sum + p.totalWorkers, 0);
  const totalVehicles = projects.reduce((sum, p) => sum + p.totalVehicles, 0);
  const totalTasksCompleted = projects.reduce((sum, p) => sum + (p.completedTasks || 0), 0);
  const totalTasksAll = projects.reduce((sum, p) => sum + (p.totalTasks || 0), 0);
  // Proyectos activos = todos los que NO estén cancelados ni finalizados
  const activeProjects = projects.filter(p => {
    const statusLower = p.status.toLowerCase();
    return !statusLower.includes('cancelada') && !statusLower.includes('finalizada');
  }).length;
  
  // Calcular tiempo promedio de proyectos finalizados (en días)
  const finishedProjects = projects.filter(p => p.status.toLowerCase().includes('finalizada'));
  const averageDuration = finishedProjects.length > 0
    ? Math.round(
        finishedProjects.reduce((sum, p) => {
          const created = new Date(p.createdAt);
          const now = new Date();
          const diffInDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
          return sum + diffInDays;
        }, 0) / finishedProjects.length
      )
    : 0;

  // Si se está mostrando la vista de detalle, renderizar ese componente
  if (showDetailView && selectedProject) {
    return <ProjectDetailView project={selectedProject} onBack={handleBackFromDetail} onUpdate={onProjectUpdate} />;
  }

  return (
    <div className="layout-container flex h-full grow flex-col">
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-6 py-8 md:px-10 lg:px-12">
        
        {/* Header */}
        <div className="mb-8 flex flex-wrap justify-between gap-4 border-b border-[#e5e7eb] pb-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-4xl">assignment</span>
              <h1 className="text-[#111318] text-2xl lg:text-3xl font-bold tracking-tight">Gestión de Solicitudes de Acreditación</h1>
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
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">ACREDITACIONES OK</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <p className="text-2xl font-bold text-blue-600">{finishedProjects.length}</p>
                  <span className="text-sm font-semibold text-gray-400">/</span>
                  <p className="text-xl font-bold text-gray-500">{totalProjects}</p>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">Total de proyectos</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-600 text-2xl">done_all</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tareas Completadas</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <p className="text-2xl font-bold text-green-600">{totalTasksCompleted}</p>
                  <span className="text-sm font-semibold text-gray-400">/</span>
                  <p className="text-xl font-bold text-gray-500">{totalTasksAll}</p>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">Todas las tareas</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-green-600 text-2xl">task_alt</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tiempo Promedio</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <p className="text-2xl font-bold text-amber-600">{averageDuration}</p>
                  <p className="text-sm font-semibold text-amber-600">{averageDuration === 1 ? 'día' : 'días'}</p>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">Proyectos finalizados</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-amber-600 text-2xl">schedule</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Proyectos Activos</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{activeProjects}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Sin finalizar</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-orange-600 text-2xl">pending_actions</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-3 relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
              <input
                type="text"
                placeholder="Buscar proyectos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 pl-10 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            
            <div className="md:col-span-3">
              <select
                value={filterClient}
                onChange={(e) => setFilterClient(e.target.value)}
                className="form-select w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="">Todos los clientes</option>
                {uniqueClients.map(client => (
                  <option key={client} value={client}>{client}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="form-select w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="">Todos los estados</option>
                <option value="Pendiente">Pendiente</option>
                <option value="En proceso">En proceso</option>
                <option value="Finalizada">Finalizada</option>
                <option value="Cancelada">Cancelada</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <select
                value={filterProgress}
                onChange={(e) => setFilterProgress(e.target.value)}
                className="form-select w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="">Todo progreso</option>
                <option value="low">Menos de 25%</option>
                <option value="medium">Entre 25% y 75%</option>
                <option value="high">75% o más</option>
              </select>
            </div>

            <div className="md:col-span-2 flex gap-2">
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
            filteredProjects.map((project) => {
              // Determinar color de hover según el estado
              const getHoverColor = () => {
                const statusLower = project.status.toLowerCase();
                if (statusLower.includes('pendiente')) return 'group-hover:to-amber-50';
                if (statusLower.includes('proceso')) return 'group-hover:to-blue-50';
                if (statusLower.includes('finalizada')) return 'group-hover:to-green-50';
                if (statusLower.includes('cancelada')) return 'group-hover:to-red-50';
                return 'group-hover:to-gray-50';
              };

              return (
                <div
                  key={project.id}
                  onClick={() => handleProjectClick(project)}
                  className={`bg-white rounded-xl border-2 shadow-sm overflow-hidden hover:shadow-lg hover:scale-[1.005] transition-all duration-300 cursor-pointer group ${getProjectBorderColor(project.status)}`}
                >
                  {/* Project Header */}
                  <div className={`bg-gradient-to-r from-gray-50 to-white px-6 py-5 group-hover:from-gray-100 ${getHoverColor()} transition-all duration-300`}>
                  {/* Título y Estado */}
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-14 h-14 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all duration-300">
                        <span className="material-symbols-outlined text-white text-2xl group-hover:scale-105 transition-transform duration-300">folder_open</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-xl font-bold text-[#111318] truncate">{project.projectCode}</h3>
                          {project.projectName && (
                            <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200 flex-shrink-0">
                              {project.projectName}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600 flex-wrap">
                          <span className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[18px]">business</span>
                            <span className="font-medium">{project.clientName}</span>
                          </span>
                          <span className="text-gray-300">•</span>
                          <span className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[18px]">person</span>
                            <span>{project.projectManager}</span>
                          </span>
                          <span className="text-gray-300">•</span>
                          <span className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[18px]">event</span>
                            <span>{formatDate(project.fieldStartDate)}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Estado */}
                    <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                      {(() => {
                        // Si tiene 100% de progreso, mostrar "Finalizado"
                        const progressPercentage = project.totalTasks && project.totalTasks > 0 
                          ? Math.round(((project.completedTasks || 0) / project.totalTasks) * 100)
                          : 0;
                        const displayStatus = (progressPercentage === 100 && project.status.toLowerCase().includes('proceso')) 
                          ? 'Finalizado' 
                          : project.status;
                        const statusColor = getStatusColor(displayStatus);
                        
                        return (
                          <span className={`px-4 py-2 rounded-lg text-sm font-bold border-2 whitespace-nowrap shadow-sm group-hover:shadow transition-all duration-300 ${statusColor}`}>
                            {displayStatus}
                          </span>
                        );
                      })()}
                      {/* Indicador de acción */}
                      {(() => {
                        const progressPercentage = project.totalTasks && project.totalTasks > 0 
                          ? Math.round(((project.completedTasks || 0) / project.totalTasks) * 100)
                          : 0;
                        const isCompleted = progressPercentage === 100 && project.status.toLowerCase().includes('proceso');
                        
                        if (project.status.toLowerCase().includes('pendiente')) {
                          return (
                            <span className="text-xs text-gray-500 flex items-center gap-1 font-medium group-hover:text-gray-700 transition-colors duration-300">
                              <span className="material-symbols-outlined text-[14px] group-hover:scale-105 transition-transform duration-300">assignment_ind</span>
                              <span>Asignar responsables</span>
                            </span>
                          );
                        } else if (isCompleted) {
                          return (
                            <span className="text-xs text-green-600 flex items-center gap-1 font-semibold group-hover:text-green-700 transition-colors duration-300">
                              <span className="material-symbols-outlined text-[14px] group-hover:scale-105 transition-transform duration-300">visibility</span>
                              <span>Ver detalle</span>
                            </span>
                          );
                        } else {
                          return (
                            <span className="text-xs text-blue-600 flex items-center gap-1 font-semibold group-hover:text-blue-700 transition-colors duration-300">
                              <span className="material-symbols-outlined text-[14px] group-hover:scale-105 transition-transform duration-300">visibility</span>
                              <span>Ver detalle</span>
                            </span>
                          );
                        }
                      })()}
                    </div>
                  </div>

                  {/* Progreso General del Proyecto */}
                  {project.totalTasks && project.totalTasks > 0 && (
                    <div className="mb-4 pb-4 border-b border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary text-[18px]">track_changes</span>
                          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Progreso General</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 font-medium">
                            {project.completedTasks || 0} / {project.totalTasks} tareas
                          </span>
                          <span className={`text-sm font-extrabold ${
                            ((project.completedTasks || 0) / project.totalTasks) >= 0.8 ? 'text-green-600' :
                            ((project.completedTasks || 0) / project.totalTasks) >= 0.5 ? 'text-blue-600' :
                            'text-orange-600'
                          }`}>
                            {Math.round(((project.completedTasks || 0) / project.totalTasks) * 100)}%
                          </span>
                        </div>
                      </div>
                      {/* Barra de progreso */}
                      <div className="relative w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${
                            ((project.completedTasks || 0) / project.totalTasks) >= 0.8 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                            ((project.completedTasks || 0) / project.totalTasks) >= 0.5 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                            'bg-gradient-to-r from-orange-500 to-orange-600'
                          }`}
                          style={{ width: `${Math.round(((project.completedTasks || 0) / project.totalTasks) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Progreso por Responsable - Vista compacta */}
                  {(() => {
                    const responsables = [
                      { id: project.jpro_id, nombre: project.jpro_nombre, rol: 'JPRO', color: 'blue' },
                      { id: project.epr_id, nombre: project.epr_nombre, rol: 'EPR', color: 'orange' },
                      { id: project.rrhh_id, nombre: project.rrhh_nombre, rol: 'RRHH', color: 'green' },
                      { id: project.legal_id, nombre: project.legal_nombre, rol: 'Legal', color: 'purple' }
                    ].filter(r => r.id);

                    if (responsables.length === 0) {
                      return (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2 group-hover:bg-gray-100 transition-all duration-300">
                            <span className="material-symbols-outlined text-[18px]">info</span>
                            <span>Sin responsables asignados</span>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="grid grid-cols-4 gap-1.5">
                          {responsables.map((resp) => {
                            const tareas = (project.tasks || []).filter((t: any) => t.responsable === resp.rol);
                            const completadas = tareas.filter((t: any) => t.realizado).length;
                            const total = tareas.length;
                            const porcentaje = total > 0 ? (completadas / total) : 0;

                            const colorMap = {
                              blue: { bg: 'bg-blue-50/80', border: 'border-blue-200/50', ring: '#DBEAFE', stroke: '#3B82F6', text: 'text-blue-600', dot: 'bg-blue-500' },
                              orange: { bg: 'bg-orange-50/80', border: 'border-orange-200/50', ring: '#FED7AA', stroke: '#F97316', text: 'text-orange-600', dot: 'bg-orange-500' },
                              green: { bg: 'bg-green-50/80', border: 'border-green-200/50', ring: '#D1FAE5', stroke: '#10B981', text: 'text-green-600', dot: 'bg-green-500' },
                              purple: { bg: 'bg-purple-50/80', border: 'border-purple-200/50', ring: '#E9D5FF', stroke: '#A855F7', text: 'text-purple-600', dot: 'bg-purple-500' }
                            };
                            const colors = colorMap[resp.color as keyof typeof colorMap] || colorMap.blue;

                            return (
                              <div key={resp.rol} className={`flex items-center gap-2.5 ${colors.bg} rounded-lg border ${colors.border} px-3 py-2.5 transition-all duration-300`}>
                                {/* Anillo de progreso */}
                                <div className="relative flex items-center justify-center flex-shrink-0">
                                  <svg className="w-14 h-14 transform -rotate-90">
                                    <circle cx="28" cy="28" r="23" stroke={colors.ring} strokeWidth="3.5" fill="none" />
                                    <circle
                                      cx="28"
                                      cy="28"
                                      r="23"
                                      stroke={colors.stroke}
                                      strokeWidth="3.5"
                                      fill="none"
                                      strokeDasharray={`${2 * Math.PI * 23}`}
                                      strokeDashoffset={`${2 * Math.PI * 23 * (1 - porcentaje)}`}
                                      strokeLinecap="round"
                                      className="transition-all duration-500"
                                    />
                                  </svg>
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-sm font-extrabold text-gray-800">
                                      {Math.round(porcentaje * 100)}%
                                    </span>
                                  </div>
                                </div>
                                {/* Info horizontal */}
                                <div className="flex flex-col justify-center min-w-0 flex-1">
                                  <div className="flex items-baseline gap-1.5 mb-0.5">
                                    <p className={`text-sm font-extrabold uppercase tracking-wide ${colors.text}`}>{resp.rol}</p>
                                    <div className="flex items-baseline gap-0.5">
                                      <p className={`text-lg font-bold ${colors.text}`}>{completadas}</p>
                                      <span className="text-xs font-semibold text-gray-400">/</span>
                                      <p className="text-base font-semibold text-gray-500">{total}</p>
                                    </div>
                                  </div>
                                  {resp.nombre && (
                                    <p className="text-sm text-gray-600 font-medium truncate leading-tight">
                                      {resp.nombre}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
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
            );
            })
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


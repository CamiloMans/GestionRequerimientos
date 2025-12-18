import React, { useState, useEffect } from 'react';
import { ProjectGalleryItem } from '../types';
import { updateRequerimientoEstado } from '../services/supabaseService';

interface ProjectRequirement {
  id: number;
  responsable: string;
  nombre_responsable?: string;
  nombre_trabajador?: string;
  categoria_empresa?: string;
  id_proyecto_trabajador?: number;
  requerimiento: string;
  categoria: string;
  realizado: boolean;
  fechaFinalizada?: string;
}

interface ProjectDetailViewProps {
  project: ProjectGalleryItem;
  onBack: () => void;
  onUpdate?: () => void;
  onFilterSidebarChange?: (isOpen: boolean) => void;
}

const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({ project, onBack, onUpdate, onFilterSidebarChange }) => {
  // Estado del sidebar de filtros
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);

  // Notificar al componente padre cuando el sidebar de filtros cambie
  useEffect(() => {
    if (onFilterSidebarChange) {
      onFilterSidebarChange(isFilterSidebarOpen);
    }
  }, [isFilterSidebarOpen, onFilterSidebarChange]);

  // Limpiar notificación cuando el componente se desmonte
  useEffect(() => {
    return () => {
      if (onFilterSidebarChange) {
        onFilterSidebarChange(false);
      }
    };
  }, [onFilterSidebarChange]);

  // Bloquear scroll del body cuando el sidebar está abierto
  useEffect(() => {
    if (isFilterSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup: restaurar el scroll cuando el componente se desmonte
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isFilterSidebarOpen]);
  
  // Estados de filtros
  const [filterCargo, setFilterCargo] = useState('');
  const [filterNombreResponsable, setFilterNombreResponsable] = useState('');
  const [filterNombreTrabajador, setFilterNombreTrabajador] = useState('');
  const [filterCategoriaEmpresa, setFilterCategoriaEmpresa] = useState('');
  const [filterRequerimiento, setFilterRequerimiento] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterRealizado, setFilterRealizado] = useState('');

  // Usar las tareas del proyecto (vienen de ProjectGalleryItem)
  const [requirements, setRequirements] = useState<ProjectRequirement[]>(
    (project.tasks || []).map(task => ({
      id: task.id,
      responsable: task.responsable,
      nombre_responsable: task.nombre_responsable,
      nombre_trabajador: task.nombre_trabajador,
      categoria_empresa: task.categoria_empresa,
      id_proyecto_trabajador: task.id_proyecto_trabajador,
      requerimiento: task.requerimiento,
      categoria: task.categoria,
      realizado: task.realizado,
      fechaFinalizada: task.fechaFinalizada
    }))
  );

  // Filtrar requerimientos
  const filteredRequirements = requirements.filter(req => {
    const matchesCargo = filterCargo ? req.responsable === filterCargo : true;
    const matchesNombreResponsable = filterNombreResponsable ? req.nombre_responsable === filterNombreResponsable : true;
    const matchesNombreTrabajador = filterNombreTrabajador ? req.nombre_trabajador === filterNombreTrabajador : true;
    const matchesCategoriaEmpresa = filterCategoriaEmpresa ? req.categoria_empresa === filterCategoriaEmpresa : true;
    const matchesRequerimiento = filterRequerimiento ? req.requerimiento.toLowerCase().includes(filterRequerimiento.toLowerCase()) : true;
    const matchesCategoria = filterCategoria ? req.categoria === filterCategoria : true;
    const matchesRealizado = filterRealizado === '' ? true : 
      filterRealizado === 'realizado' ? req.realizado : !req.realizado;
    
    return matchesCargo && matchesNombreResponsable && matchesNombreTrabajador && 
           matchesCategoriaEmpresa && matchesRequerimiento && matchesCategoria && matchesRealizado;
  });

  // Obtener listas únicas para filtros
  const cargos = Array.from(new Set(requirements.map(r => r.responsable).filter(Boolean)));
  const nombresResponsables = Array.from(new Set(requirements.map(r => r.nombre_responsable).filter(Boolean)));
  const nombresTrabajadores = Array.from(new Set(requirements.map(r => r.nombre_trabajador).filter(Boolean)));
  const categoriasEmpresa = Array.from(new Set(requirements.map(r => r.categoria_empresa).filter(Boolean)));
  const categorias = Array.from(new Set(requirements.map(r => r.categoria).filter(Boolean)));

  const handleToggleRealizado = async (e: React.MouseEvent, id: number) => {
    // Detener la propagación para evitar que se active el click del contenedor
    e.stopPropagation();
    
    const requirement = requirements.find(r => r.id === id);
    if (!requirement) return;

    const newRealizado = !requirement.realizado;
    const newEstado = newRealizado ? 'Completado' : 'Pendiente';

    try {
      // Actualizar en la base de datos
      await updateRequerimientoEstado(id, newEstado);
      
      // Actualizar estado local inmediatamente sin recargar
      setRequirements(prev => prev.map(req => {
        if (req.id === id) {
          return {
            ...req,
            realizado: newRealizado,
            fechaFinalizada: newRealizado ? new Date().toISOString().split('T')[0] : undefined
          };
        }
        return req;
      }));
      
      console.log(`✅ Requerimiento ${id} actualizado a ${newEstado}`);
      
      // NO llamamos a onUpdate() para evitar navegar/recargar la página
      // El estado local ya está actualizado y la UI se refresca automáticamente
    } catch (error) {
      console.error('❌ Error actualizando requerimiento:', error);
      alert('Error al actualizar el requerimiento. Por favor, intente nuevamente.');
    }
  };

  const clearFilters = () => {
    setFilterCargo('');
    setFilterNombreResponsable('');
    setFilterNombreTrabajador('');
    setFilterCategoriaEmpresa('');
    setFilterRequerimiento('');
    setFilterCategoria('');
    setFilterRealizado('');
  };

  const hasActiveFilters = filterCargo || filterNombreResponsable || filterNombreTrabajador || 
                          filterCategoriaEmpresa || filterRequerimiento || filterCategoria || filterRealizado;

  const completedCount = requirements.filter(r => r.realizado).length;
  const totalCount = requirements.length;
  const progressPercentage = (completedCount / totalCount) * 100;

  return (
    <div className="layout-container flex h-full grow flex-col bg-gradient-to-br from-gray-50 to-blue-50/30">
      {/* Header Compacto */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4">
          {/* Back Button */}
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors group mb-3"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            <span className="font-medium text-sm">Volver a Proyectos</span>
          </button>

          {/* Información del Proyecto - Layout Horizontal */}
          <div className="flex items-center justify-between gap-6 flex-wrap">
            {/* Columna Izquierda: Info Principal */}
            <div className="flex items-center gap-4">
              {/* Icono */}
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                <span className="material-symbols-outlined text-white text-2xl">folder_open</span>
              </div>
              
              {/* Info del Proyecto */}
              <div>
                <h1 className="text-xl font-bold text-[#111318] mb-0.5">{project.projectCode}</h1>
                <p className="text-xs text-gray-500">{project.projectName}</p>
              </div>
              
              {/* Divisor */}
              <div className="w-px h-10 bg-gray-300 mx-2"></div>
              
              {/* Empresa Contratista */}
              <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg px-3 py-2">
                <span className="material-symbols-outlined text-indigo-600 text-[20px]">business</span>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-semibold leading-none">Empresa Contratista</p>
                  <p className="text-sm font-bold text-indigo-900">{project.empresa_nombre || 'Sin asignar'}</p>
                </div>
              </div>
              
              {/* Divisor */}
              <div className="w-px h-10 bg-gray-300 mx-2"></div>
              
              {/* Info adicional compacta */}
              <div className="flex items-center gap-4 text-xs text-gray-600">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">business</span>
                  <span>{project.clientName}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">person</span>
                  <span>{project.projectManager}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">groups</span>
                  <span>{project.totalWorkers} trabajadores</span>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Progreso y Estado */}
            <div className="flex items-center gap-4">
              {/* Barra de progreso compacta */}
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end">
                  <span className="text-lg font-bold text-primary">{completedCount}/{totalCount}</span>
                  <span className="text-[10px] text-gray-500 uppercase font-semibold">Tareas</span>
                </div>
                <div className="w-32">
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-1 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-gray-500 text-center font-semibold">{progressPercentage.toFixed(0)}% completado</p>
                </div>
              </div>
              
              {/* Estado */}
              <span className={`px-4 py-2 rounded-lg text-xs font-bold border-2 ${
                project.status.toLowerCase().includes('pendiente') ? 'bg-amber-100 text-amber-700 border-amber-300' :
                project.status.toLowerCase().includes('proceso') ? 'bg-blue-100 text-blue-700 border-blue-300' :
                project.status.toLowerCase().includes('finalizada') ? 'bg-green-100 text-green-700 border-green-300' :
                'bg-red-100 text-red-700 border-red-300'
              }`}>
                {project.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Estadísticas */}
      <div className="bg-gradient-to-r from-white to-gray-50 border-b border-gray-200 px-6 py-3 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          {/* Izquierda: Filtros */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsFilterSidebarOpen(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-primary transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">filter_alt</span>
              <span>Filtros</span>
              {hasActiveFilters && (
                <span className="px-2 py-0.5 text-xs font-bold text-white bg-primary rounded-full">
                  {[filterCargo, filterNombreResponsable, filterNombreTrabajador, filterCategoriaEmpresa, filterRequerimiento, filterCategoria, filterRealizado].filter(Boolean).length}
                </span>
              )}
            </button>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
                <span>Limpiar</span>
              </button>
            )}

            <div className="text-xs text-gray-500 ml-2">
              Mostrando <span className="font-bold text-gray-900">{filteredRequirements.length}</span> de <span className="font-bold text-gray-900">{totalCount}</span>
            </div>
          </div>

          {/* Derecha: Estadísticas en línea */}
          <div className="flex items-center gap-6">
            {/* Completados */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center border border-green-300">
                <span className="material-symbols-outlined text-green-600 text-[18px]">check_circle</span>
              </div>
              <div>
                <p className="text-base font-bold text-green-700 leading-none">{completedCount}</p>
                <p className="text-[10px] text-gray-500 font-medium uppercase">Completados</p>
              </div>
            </div>
            
            <div className="w-px h-8 bg-gray-300"></div>
            
            {/* Pendientes */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-100 rounded-md flex items-center justify-center border border-amber-300">
                <span className="material-symbols-outlined text-amber-600 text-[18px]">pending</span>
              </div>
              <div>
                <p className="text-base font-bold text-amber-700 leading-none">{totalCount - completedCount}</p>
                <p className="text-[10px] text-gray-500 font-medium uppercase">Pendientes</p>
              </div>
            </div>
            
            <div className="w-px h-8 bg-gray-300"></div>
            
            {/* Progreso */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center border border-blue-300">
                <span className="material-symbols-outlined text-blue-600 text-[18px]">analytics</span>
              </div>
              <div>
                <p className="text-base font-bold text-blue-700 leading-none">{Math.round((completedCount / totalCount) * 100)}%</p>
                <p className="text-[10px] text-gray-500 font-medium uppercase">Progreso</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar de Filtros */}
      {isFilterSidebarOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-all duration-300"
            onClick={() => setIsFilterSidebarOpen(false)}
          />
          
          {/* Sidebar */}
          <div className="fixed top-0 left-0 h-full w-[260px] bg-gradient-to-b from-white to-gray-50 shadow-2xl z-50 flex flex-col animate-slide-in-left">
            {/* Header del Sidebar */}
            <div className="bg-gradient-to-br from-primary to-emerald-700 text-white px-4 py-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-2xl">tune</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Filtros Avanzados</h3>
                    <p className="text-xs text-emerald-100 mt-0.5">
                      {filteredRequirements.length} resultado{filteredRequirements.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsFilterSidebarOpen(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-all"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>
            </div>

            {/* Contenido del Sidebar */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {/* Sección: Personal */}
              <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">group</span>
                  Personal
                </h4>
                <div className="space-y-2.5">
                  {/* Filtro por Cargo */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">badge</span>
                      Cargo
                    </label>
                    <select
                      value={filterCargo}
                      onChange={(e) => setFilterCargo(e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded-md text-[9px] focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white hover:border-gray-400 transition-colors cursor-pointer"
                    >
                      <option value="">Todos los Cargos</option>
                      {cargos.map(cargo => (
                        <option key={cargo} value={cargo}>{cargo}</option>
                      ))}
                    </select>
                  </div>

                  {/* Filtro por Nombre Responsable */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">account_circle</span>
                      Responsable
                    </label>
                    <select
                      value={filterNombreResponsable}
                      onChange={(e) => setFilterNombreResponsable(e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded-md text-[9px] focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white hover:border-gray-400 transition-colors cursor-pointer"
                    >
                      <option value="">Todos los Responsables</option>
                      {nombresResponsables.map(nombre => (
                        <option key={nombre} value={nombre}>{nombre}</option>
                      ))}
                    </select>
                  </div>

                  {/* Filtro por Nombre Trabajador */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">person</span>
                      Trabajador
                    </label>
                    <select
                      value={filterNombreTrabajador}
                      onChange={(e) => setFilterNombreTrabajador(e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded-md text-[9px] focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white hover:border-gray-400 transition-colors cursor-pointer"
                    >
                      <option value="">Todos los Trabajadores</option>
                      {nombresTrabajadores.map(nombre => (
                        <option key={nombre} value={nombre}>{nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Sección: Empresa */}
              <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">business</span>
                  Empresa
                </h4>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">business_center</span>
                    Categoría Empresa
                  </label>
                  <select
                    value={filterCategoriaEmpresa}
                    onChange={(e) => setFilterCategoriaEmpresa(e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded-md text-[10px] focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white hover:border-gray-400 transition-colors cursor-pointer"
                  >
                    <option value="">Todas las Empresas</option>
                    {categoriasEmpresa.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sección: Requerimientos */}
              <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">checklist</span>
                  Requerimientos
                </h4>
                <div className="space-y-2.5">
                  {/* Filtro por Requerimiento (búsqueda) */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">search</span>
                      Buscar Requerimiento
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[14px]">search</span>
                      <input
                        type="text"
                        value={filterRequerimiento}
                        onChange={(e) => setFilterRequerimiento(e.target.value)}
                        placeholder="Escribe para buscar..."
                        className="w-full pl-7 pr-2 py-1 border border-gray-300 rounded-md text-[9px] focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white hover:border-gray-400 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Filtro por Categoría */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">category</span>
                      Categoría
                    </label>
                    <select
                      value={filterCategoria}
                      onChange={(e) => setFilterCategoria(e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded-md text-[9px] focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white hover:border-gray-400 transition-colors cursor-pointer"
                    >
                      <option value="">Todas las Categorías</option>
                      {categorias.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Filtro por Estado */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">task_alt</span>
                      Estado
                    </label>
                    <select
                      value={filterRealizado}
                      onChange={(e) => setFilterRealizado(e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded-md text-[9px] focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white hover:border-gray-400 transition-colors cursor-pointer"
                    >
                      <option value="">Todos los Estados</option>
                      <option value="realizado">✅ Realizados</option>
                      <option value="pendiente">⏳ Pendientes</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Resumen de Filtros Activos */}
              {hasActiveFilters && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-amber-600 text-[18px]">info</span>
                    <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">Filtros Activos</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {filterCargo && <div className="text-gray-700 flex items-start gap-1.5"><span className="text-amber-500 mt-0.5">•</span><span><span className="font-semibold">Cargo:</span> {filterCargo}</span></div>}
                    {filterNombreResponsable && <div className="text-gray-700 flex items-start gap-1.5"><span className="text-amber-500 mt-0.5">•</span><span><span className="font-semibold">Responsable:</span> {filterNombreResponsable}</span></div>}
                    {filterNombreTrabajador && <div className="text-gray-700 flex items-start gap-1.5"><span className="text-amber-500 mt-0.5">•</span><span><span className="font-semibold">Trabajador:</span> {filterNombreTrabajador}</span></div>}
                    {filterCategoriaEmpresa && <div className="text-gray-700 flex items-start gap-1.5"><span className="text-amber-500 mt-0.5">•</span><span><span className="font-semibold">Empresa:</span> {filterCategoriaEmpresa}</span></div>}
                    {filterRequerimiento && <div className="text-gray-700 flex items-start gap-1.5"><span className="text-amber-500 mt-0.5">•</span><span><span className="font-semibold">Búsqueda:</span> "{filterRequerimiento}"</span></div>}
                    {filterCategoria && <div className="text-gray-700 flex items-start gap-1.5"><span className="text-amber-500 mt-0.5">•</span><span><span className="font-semibold">Categoría:</span> {filterCategoria}</span></div>}
                    {filterRealizado && <div className="text-gray-700 flex items-start gap-1.5"><span className="text-amber-500 mt-0.5">•</span><span><span className="font-semibold">Estado:</span> {filterRealizado === 'realizado' ? 'Realizados' : 'Pendientes'}</span></div>}
                  </div>
                </div>
              )}
            </div>

            {/* Footer con Botones de Acción */}
            <div className="bg-white border-t border-gray-200 px-6 py-4 shadow-lg">
              <div className="space-y-2">
                <button
                  onClick={() => setIsFilterSidebarOpen(false)}
                  className="w-full px-4 py-2.5 text-sm font-bold text-white bg-primary hover:bg-primary-hover rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">done</span>
                  Aplicar Filtros
                </button>
                
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="w-full px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all border border-gray-300 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">filter_alt_off</span>
                    Limpiar Filtros
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Tabla de Requerimientos */}
      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-blue-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Cargo
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Responsable
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Nombre Trabajador
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Categoría Empresa
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Requerimiento
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Categoría
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Realizado
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Fecha Finalizada
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRequirements.length > 0 ? (
                  filteredRequirements.map((req) => {
                    // Colores según el cargo
                    const cargoColors = {
                      'JPRO': 'bg-blue-100 text-blue-700 border-blue-300',
                      'EPR': 'bg-orange-100 text-orange-700 border-orange-300',
                      'RRHH': 'bg-green-100 text-green-700 border-green-300',
                      'Legal': 'bg-purple-100 text-purple-700 border-purple-300',
                    };
                    const colorClass = cargoColors[req.responsable as keyof typeof cargoColors] || 'bg-gray-100 text-gray-700 border-gray-300';

                    return (
                      <tr key={req.id} className="hover:bg-blue-50/50 transition-colors">
                        {/* Cargo */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1.5 rounded-md text-xs font-bold border ${colorClass}`}>
                            {req.responsable}
                          </span>
                        </td>
                        
                        {/* Responsable */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-gray-600 text-[20px]">account_circle</span>
                            <span className="text-sm font-semibold text-gray-900">
                              {req.nombre_responsable || <span className="text-gray-400 italic font-normal">Sin asignar</span>}
                            </span>
                          </div>
                        </td>

                        {/* Nombre Trabajador */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-gray-600 text-[20px]">person</span>
                            <span className="text-sm text-gray-900">
                              {req.nombre_trabajador || <span className="text-gray-400 italic text-xs">N/A</span>}
                            </span>
                          </div>
                        </td>

                        {/* Categoría Empresa */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {req.categoria_empresa ? (
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                              req.categoria_empresa === 'MyMA' 
                                ? 'bg-blue-50 text-blue-700 border-blue-300' 
                                : 'bg-amber-50 text-amber-700 border-amber-300'
                            }`}>
                              {req.categoria_empresa}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic text-xs">N/A</span>
                          )}
                        </td>

                        {/* Requerimiento */}
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-900">{req.requerimiento}</span>
                        </td>

                        {/* Categoría */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                            {req.categoria}
                          </span>
                        </td>

                        {/* Realizado */}
                        <td className="px-6 py-4 text-center">
                          <button
                            type="button"
                            onClick={(e) => handleToggleRealizado(e, req.id)}
                            className={`inline-flex items-center justify-center w-10 h-10 rounded-full transition-all ${
                              req.realizado 
                                ? 'bg-green-100 hover:bg-green-200 border-2 border-green-500' 
                                : 'bg-gray-100 hover:bg-gray-200 border-2 border-gray-300'
                            }`}
                          >
                            {req.realizado ? (
                              <span className="material-symbols-outlined text-green-600 text-2xl">check_circle</span>
                            ) : (
                              <span className="material-symbols-outlined text-gray-400 text-2xl">radio_button_unchecked</span>
                            )}
                          </button>
                        </td>

                        {/* Fecha Finalizada */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {req.fechaFinalizada ? (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <span className="material-symbols-outlined text-[18px]">event</span>
                              <span>{new Date(req.fechaFinalizada).toLocaleDateString('es-ES', { 
                                day: '2-digit', 
                                month: '2-digit', 
                                year: 'numeric' 
                              })}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <span className="material-symbols-outlined text-gray-300 text-5xl">search_off</span>
                        <p className="text-gray-500 text-lg">No se encontraron requerimientos</p>
                        <p className="text-gray-400 text-sm">Intenta ajustar los filtros</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailView;


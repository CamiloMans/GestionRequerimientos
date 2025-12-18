import React, { useState } from 'react';
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
}

const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({ project, onBack, onUpdate }) => {
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
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-5">
          {/* Back Button y Título */}
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors group"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              <span className="font-medium">Volver a Proyectos</span>
            </button>
          </div>

          {/* Información del Proyecto */}
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex-1 min-w-[300px]">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-14 h-14 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="material-symbols-outlined text-white text-3xl">folder_open</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-[#111318]">{project.projectCode}</h1>
                  <p className="text-sm text-gray-600">{project.projectName}</p>
                </div>
              </div>
              
              {/* Empresa */}
              <div className="mt-4 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-indigo-600 text-xl">business</span>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Empresa Contratista</p>
                    <p className="text-base font-bold text-indigo-900">
                      {project.empresa_nombre || 'Sin asignar'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Info adicional */}
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">business</span>
                  <span>{project.clientName}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">person</span>
                  <span>{project.projectManager}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">groups</span>
                  <span>{project.totalWorkers} trabajadores</span>
                </div>
              </div>
            </div>

            {/* Progreso */}
            <div className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-xl p-5 min-w-[280px]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Progreso General</h3>
                <span className="text-2xl font-bold text-primary">{completedCount}/{totalCount}</span>
              </div>
              
              {/* Barra de progreso */}
              <div className="w-full bg-gray-200 rounded-full h-3 mb-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 text-center">{progressPercentage.toFixed(0)}% completado</p>
              
              {/* Estado */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border inline-block w-full text-center ${
                  project.status.toLowerCase().includes('pendiente') ? 'bg-amber-100 text-amber-700 border-amber-200' :
                  project.status.toLowerCase().includes('proceso') ? 'bg-blue-100 text-blue-700 border-blue-200' :
                  project.status.toLowerCase().includes('finalizada') ? 'bg-green-100 text-green-700 border-green-200' :
                  'bg-red-100 text-red-700 border-red-200'
                }`}>
                  {project.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="material-symbols-outlined text-gray-500 text-xl">filter_alt</span>
            <span className="text-sm font-semibold text-gray-700">Filtros:</span>
          </div>

          {/* Filtro por Cargo */}
          <select
            value={filterCargo}
            onChange={(e) => setFilterCargo(e.target.value)}
            className="min-w-[160px] px-3 py-2 pr-8 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white hover:border-gray-400 transition-colors cursor-pointer"
          >
            <option value="">Todos los Cargos</option>
            {cargos.map(cargo => (
              <option key={cargo} value={cargo}>{cargo}</option>
            ))}
          </select>

          {/* Filtro por Nombre Responsable */}
          <select
            value={filterNombreResponsable}
            onChange={(e) => setFilterNombreResponsable(e.target.value)}
            className="min-w-[200px] px-3 py-2 pr-8 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white hover:border-gray-400 transition-colors cursor-pointer"
          >
            <option value="">Todos los Responsables</option>
            {nombresResponsables.map(nombre => (
              <option key={nombre} value={nombre}>{nombre}</option>
            ))}
          </select>

          {/* Filtro por Nombre Trabajador */}
          <select
            value={filterNombreTrabajador}
            onChange={(e) => setFilterNombreTrabajador(e.target.value)}
            className="min-w-[200px] px-3 py-2 pr-8 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white hover:border-gray-400 transition-colors cursor-pointer"
          >
            <option value="">Todos los Trabajadores</option>
            {nombresTrabajadores.map(nombre => (
              <option key={nombre} value={nombre}>{nombre}</option>
            ))}
          </select>

          {/* Filtro por Categoría Empresa */}
          <select
            value={filterCategoriaEmpresa}
            onChange={(e) => setFilterCategoriaEmpresa(e.target.value)}
            className="min-w-[180px] px-3 py-2 pr-8 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white hover:border-gray-400 transition-colors cursor-pointer"
          >
            <option value="">Todas las Empresas</option>
            {categoriasEmpresa.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Filtro por Requerimiento (búsqueda) */}
          <div className="relative min-w-[220px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
            <input
              type="text"
              value={filterRequerimiento}
              onChange={(e) => setFilterRequerimiento(e.target.value)}
              placeholder="Buscar requerimiento..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white hover:border-gray-400 transition-colors"
            />
          </div>

          {/* Filtro por Categoría */}
          <select
            value={filterCategoria}
            onChange={(e) => setFilterCategoria(e.target.value)}
            className="min-w-[180px] px-3 py-2 pr-8 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white hover:border-gray-400 transition-colors cursor-pointer"
          >
            <option value="">Todas las Categorías</option>
            {categorias.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Filtro por Estado */}
          <select
            value={filterRealizado}
            onChange={(e) => setFilterRealizado(e.target.value)}
            className="min-w-[160px] px-3 py-2 pr-8 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white hover:border-gray-400 transition-colors cursor-pointer"
          >
            <option value="">Todos los Estados</option>
            <option value="realizado">Realizados</option>
            <option value="pendiente">Pendientes</option>
          </select>

          {/* Botón limpiar filtros */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">filter_alt_off</span>
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

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

        {/* Resumen */}
        <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="material-symbols-outlined text-blue-600">info</span>
              <span>Mostrando {filteredRequirements.length} de {totalCount} requerimientos</span>
            </div>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                <span className="text-gray-600">{completedCount} completados</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-gray-400"></span>
                <span className="text-gray-600">{totalCount - completedCount} pendientes</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailView;


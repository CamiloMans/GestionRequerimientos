import React, { useState } from 'react';
import { RequestItem, RequestStatus, RequirementType, RequestCategory } from '../types';

interface RequestListProps {
  requests: RequestItem[];
  onCreateNew: () => void;
  onEdit: (item: RequestItem) => void;
}

const RequestList: React.FC<RequestListProps> = ({ requests, onCreateNew, onEdit }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter States
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterRequirement, setFilterRequirement] = useState('');

  const filteredRequests = requests.filter(req => {
    const term = searchTerm.toLowerCase();
    
    // Search Logic:
    // 1. Name match (standard)
    // 2. RUT match: allows searching with or without dots by stripping dots from both source and term
    // 3. Requirement match (standard)
    
    const rutNoDots = req.rut.toLowerCase().replace(/\./g, '');
    const termNoDots = term.replace(/\./g, '');
    
    const matchesSearch = 
      req.name.toLowerCase().includes(term) || 
      req.rut.toLowerCase().includes(term) ||
      rutNoDots.includes(termNoDots) ||
      req.requirement.toLowerCase().includes(term);
      
    const matchesStatus = filterStatus ? req.status === filterStatus : true;
    const matchesCategory = filterCategory ? req.category === filterCategory : true;
    const matchesRequirement = filterRequirement ? req.requirement === filterRequirement : true;

    return matchesSearch && matchesStatus && matchesCategory && matchesRequirement;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('');
    setFilterCategory('');
    setFilterRequirement('');
  };

  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.Current:
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case RequestStatus.InRenewal:
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case RequestStatus.Expiring:
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case RequestStatus.Expired:
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusDot = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.Current: return 'bg-emerald-600';
      case RequestStatus.InRenewal: return 'bg-blue-600';
      case RequestStatus.Expiring: return 'bg-amber-600';
      case RequestStatus.Expired: return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  const formatDate = (dateString: string) => {
    if (dateString === '-' || dateString === 'Indefinido') return dateString;
    // Assume input is YYYY-MM-DD, output DD/MM/YYYY
    const [y, m, d] = dateString.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="layout-container flex h-full grow flex-col">
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-6 py-8 md:px-10 lg:px-12">
        {/* Breadcrumbs */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <a href="#" className="text-[#616f89] hover:text-primary text-sm font-medium transition-colors">Inicio</a>
          <span className="material-symbols-outlined text-[#616f89] text-base">chevron_right</span>
          <span className="text-[#111318] text-sm font-medium">Listado de Requerimientos</span>
        </div>

        {/* Header */}
        <div className="mb-8 flex flex-wrap justify-between items-end gap-4 border-b border-[#e5e7eb] pb-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-[#111318] text-3xl font-bold tracking-tight">Listado de Requerimientos</h1>
            <p className="text-[#616f89] text-base font-normal">Visualice y gestione los requerimientos de los colaboradores en formato tabla.</p>
          </div>
          <div>
            <button 
              onClick={onCreateNew}
              className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-all shadow-primary/20 hover:shadow-primary/40"
            >
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
              Crear Nuevo Registro
            </button>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex gap-4">
            <div className="relative flex-1 max-w-md">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined">search</span>
              <input 
                type="text" 
                placeholder="Buscar por nombre, RUT o requerimiento..." 
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2.5 border rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${showFilters ? 'bg-primary/10 border-primary text-primary' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <span className="material-symbols-outlined text-[18px]">filter_list</span> 
                Filtros
                {(filterStatus || filterCategory || filterRequirement) && (
                  <span className="flex h-2 w-2 rounded-full bg-primary ml-1"></span>
                )}
              </button>
            </div>
          </div>

          {/* Expanded Filters Panel */}
          {showFilters && (
            <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex flex-col lg:flex-row gap-6 items-end justify-between">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full lg:flex-1">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</label>
                    <select 
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-primary shadow-sm py-2 cursor-pointer bg-white"
                    >
                      <option value="">Todos</option>
                      {Object.values(RequestStatus).map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Categoría</label>
                    <select 
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="w-full rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-primary shadow-sm py-2 cursor-pointer bg-white"
                    >
                      <option value="">Todas</option>
                      {Object.values(RequestCategory).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Requerimiento</label>
                    <select 
                      value={filterRequirement}
                      onChange={(e) => setFilterRequirement(e.target.value)}
                      className="w-full rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-primary shadow-sm py-2 cursor-pointer bg-white"
                    >
                      <option value="">Todos</option>
                      {Object.values(RequirementType).map(req => (
                        <option key={req} value={req}>{req}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="w-full lg:w-auto">
                  <button 
                    onClick={clearFilters}
                    className="w-full lg:w-auto px-6 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 text-sm font-medium transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                    Limpiar Filtros
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-[#616f89] uppercase bg-gray-50 border-b border-gray-100">
                <tr>
                  <th scope="col" className="px-6 py-4 font-semibold">Nombre</th>
                  <th scope="col" className="px-6 py-4 font-semibold">RUT</th>
                  <th scope="col" className="px-6 py-4 font-semibold text-center">Requerimiento</th>
                  <th scope="col" className="px-6 py-4 font-semibold">Categoría</th>
                  <th scope="col" className="px-6 py-4 font-semibold">Estado</th>
                  <th scope="col" className="px-6 py-4 font-semibold">F. Adjudicación</th>
                  <th scope="col" className="px-6 py-4 font-semibold">F. Vencimiento</th>
                  <th scope="col" className="px-6 py-4 font-semibold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="px-6 py-4 font-medium text-[#111318]">{req.name}</td>
                    <td className="px-6 py-4 font-mono text-gray-600">{req.rut}</td>
                    <td className="px-6 py-4 text-gray-600 text-center">
                      {req.requirement}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                        {req.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border inline-flex items-center gap-1.5 ${getStatusBadge(req.status)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(req.status)}`}></span> 
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <span className={`material-symbols-outlined text-[16px] ${req.adjudicationDate !== '-' ? 'text-primary' : 'text-gray-400'}`}>event_available</span>
                        {formatDate(req.adjudicationDate)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <span className={`material-symbols-outlined text-[16px] ${req.expirationDate !== '-' ? 'text-red-500' : 'text-gray-400'}`}>event_busy</span>
                        {formatDate(req.expirationDate)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => onEdit(req)}
                        className="text-gray-400 hover:text-primary hover:bg-primary-light p-1.5 rounded-full transition-colors" 
                        title="Editar Solicitud"
                      >
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRequests.length === 0 && (
              <div className="p-8 text-center text-gray-500 flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-4xl text-gray-300">search_off</span>
                <p>No se encontraron registros que coincidan con los filtros.</p>
                {(filterStatus || filterCategory || filterRequirement || searchTerm) && (
                  <button onClick={clearFilters} className="text-primary font-medium hover:underline text-sm">
                    Limpiar todos los filtros
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestList;
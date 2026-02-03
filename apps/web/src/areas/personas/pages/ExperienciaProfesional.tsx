import React, { useState, useEffect, useMemo } from 'react';
import { fetchExperienciasProfesionales, searchExperienciasProfesionales } from '../services/experienciaProfesionalService';
import { ExperienciaProfesional } from '../types';

// Colores para los tags de aptitudes
const APTITUD_COLORS = [
  'bg-pink-100 text-pink-700',
  'bg-blue-100 text-blue-700',
  'bg-orange-100 text-orange-700',
  'bg-purple-100 text-purple-700',
  'bg-yellow-100 text-yellow-700',
  'bg-red-100 text-red-700',
  'bg-green-100 text-green-700',
  'bg-gray-100 text-gray-700',
  'bg-indigo-100 text-indigo-700',
  'bg-teal-100 text-teal-700',
];

const ExperienciaProfesionalPage: React.FC = () => {
  const [experiencias, setExperiencias] = useState<ExperienciaProfesional[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);

  useEffect(() => {
    loadExperiencias();
  }, []);

  const loadExperiencias = async () => {
    try {
      setLoading(true);
      const data = await fetchExperienciasProfesionales();
      setExperiencias(data);
    } catch (error) {
      console.error('Error loading experiencias profesionales:', error);
      // No mostrar error si la tabla no existe aún
      setExperiencias([]);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar experiencias según el término de búsqueda
  const filteredExperiencias = useMemo(() => {
    if (!searchTerm.trim()) return experiencias;
    
    const term = searchTerm.toLowerCase().trim();
    return experiencias.filter((exp) =>
      exp.nombre_completo?.toLowerCase().includes(term) ||
      exp.empresa?.toLowerCase().includes(term) ||
      exp.cargo?.toLowerCase().includes(term) ||
      exp.funciones?.toLowerCase().includes(term)
    );
  }, [experiencias, searchTerm]);

  // Calcular paginación
  const totalPages = Math.ceil(filteredExperiencias.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedExperiencias = filteredExperiencias.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddExperience = () => {
    // TODO: Implementar modal o formulario para agregar experiencia
    alert('Función de agregar experiencia próximamente disponible');
  };

  // Función para obtener color de tag basado en el índice
  const getTagColor = (index: number) => {
    return APTITUD_COLORS[index % APTITUD_COLORS.length];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600">Cargando experiencias profesionales...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-6 bg-[#f8fafc] min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-[#111318]">Experiencia Profesional</h1>
          
          <div className="flex gap-3 w-full sm:w-auto">
            <div className="flex-1 sm:flex-initial">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Buscar por persona, empresa."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
            
            <button
              onClick={handleAddExperience}
              className="flex items-center gap-2 px-4 py-2 bg-[#059669] text-white rounded-lg hover:bg-[#047857] transition-colors whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              <span>Agregar Experiencia Profesional</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">PERSONA</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">EMPRESA</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">CARGO</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">AÑO INICIO</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">AÑO TÉRMINO</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">FUNCIONES</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">APTITUDES / CONOCIMIENTOS</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedExperiencias.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    {experiencias.length === 0 
                      ? 'No hay experiencias profesionales registradas'
                      : 'No se encontraron experiencias que coincidan con la búsqueda'
                    }
                  </td>
                </tr>
              ) : (
                paginatedExperiencias.map((exp) => (
                  <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-gray-400 text-lg">person</span>
                        <span className="text-sm font-medium text-gray-900">
                          {exp.nombre_completo || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-gray-400 text-lg">business</span>
                        <span className="text-sm text-gray-700">
                          {exp.empresa || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      {exp.cargo || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      {exp.ano_inicio || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      {exp.ano_termino_display === 'ACTUAL' ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                          ACTUAL
                        </span>
                      ) : (
                        exp.ano_termino_display || '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 max-w-md">
                      <div className="line-clamp-2">{exp.funciones || '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex flex-wrap gap-1">
                        {exp.aptitudes && exp.aptitudes.length > 0 ? (
                          exp.aptitudes.map((aptitud, index) => (
                            <span
                              key={index}
                              className={`px-2 py-1 rounded text-xs font-medium ${getTagColor(index)}`}
                            >
                              {aptitud}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-700">
            Mostrando {paginatedExperiencias.length} de {filteredExperiencias.length} registros de experiencia
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              &lt;
            </button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                let pageNum;
                if (totalPages <= 10) {
                  pageNum = i + 1;
                } else if (currentPage <= 5) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 4) {
                  pageNum = totalPages - 9 + i;
                } else {
                  pageNum = currentPage - 4 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      currentPage === pageNum
                        ? 'bg-[#059669] text-white'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {totalPages > 10 && currentPage < totalPages - 4 && (
                <span className="px-2 py-2 text-sm text-gray-500">...</span>
              )}
            </div>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExperienciaProfesionalPage;


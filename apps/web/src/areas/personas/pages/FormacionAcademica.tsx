import React, { useState, useEffect, useMemo } from 'react';
import { fetchFormacionesAcademicas } from '../services/formacionAcademicaService';
import { FormacionAcademica } from '../types';

// Colores para los tags de tipo
const TIPO_COLORS: Record<string, string> = {
  'Pregrado': 'bg-pink-100 text-pink-700',
  'Postitulo': 'bg-purple-100 text-purple-700',
  'Diplomado': 'bg-green-100 text-green-700',
  'Curso': 'bg-gray-100 text-gray-700',
  'Magister': 'bg-blue-100 text-blue-700',
  'Doctorado': 'bg-indigo-100 text-indigo-700',
};

// Colores para los tags de etiquetas
const ETIQUETA_COLORS = [
  'bg-green-100 text-green-700',
  'bg-orange-100 text-orange-700',
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-red-100 text-red-700',
  'bg-yellow-100 text-yellow-700',
  'bg-indigo-100 text-indigo-700',
  'bg-teal-100 text-teal-700',
  'bg-pink-100 text-pink-700',
];

const FormacionAcademicaPage: React.FC = () => {
  const [formaciones, setFormaciones] = useState<FormacionAcademica[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);

  useEffect(() => {
    loadFormaciones();
  }, []);

  const loadFormaciones = async () => {
    try {
      setLoading(true);
      const data = await fetchFormacionesAcademicas();
      setFormaciones(data);
    } catch (error) {
      console.error('Error loading formaciones académicas:', error);
      setFormaciones([]);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar formaciones según el término de búsqueda
  const filteredFormaciones = useMemo(() => {
    if (!searchTerm.trim()) return formaciones;
    
    const term = searchTerm.toLowerCase().trim();
    return formaciones.filter((form) =>
      form.nombre_completo?.toLowerCase().includes(term) ||
      form.nombre_estudio?.toLowerCase().includes(term) ||
      form.universidad_institucion?.toLowerCase().includes(term)
    );
  }, [formaciones, searchTerm]);

  // Calcular paginación
  const totalPages = Math.ceil(filteredFormaciones.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedFormaciones = filteredFormaciones.slice(startIndex, endIndex);
  const startRecord = filteredFormaciones.length > 0 ? startIndex + 1 : 0;
  const endRecord = Math.min(endIndex, filteredFormaciones.length);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddFormacion = () => {
    // TODO: Implementar modal o formulario para agregar formación
    alert('Función de agregar formación académica próximamente disponible');
  };

  // Función para obtener color de tag de etiqueta basado en el índice
  const getEtiquetaColor = (index: number) => {
    return ETIQUETA_COLORS[index % ETIQUETA_COLORS.length];
  };

  // Función para obtener color de tag de tipo
  const getTipoColor = (tipo: string) => {
    return TIPO_COLORS[tipo] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600">Cargando formaciones académicas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-6 bg-[#f8fafc] min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-[#111318] mb-2">Formación Académica</h1>
          <p className="text-sm text-gray-600">Gestión de Antecedentes Curriculares</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1 sm:flex-initial">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                search
              </span>
              <input
                type="text"
                placeholder="Buscar por profesional o estudio..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full sm:w-80 pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
          
          <button
            onClick={handleAddFormacion}
            className="flex items-center gap-2 px-4 py-2 bg-[#059669] text-white rounded-lg hover:bg-[#047857] transition-colors whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            <span>Agregar Formación Académica</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">PROFESIONAL</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">NOMBRE DEL ESTUDIO</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">UNIVERSIDAD / INSTITUCIÓN</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">TIPO</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">AÑO</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ETIQUETAS</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedFormaciones.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    {formaciones.length === 0 
                      ? 'No hay formaciones académicas registradas'
                      : 'No se encontraron formaciones que coincidan con la búsqueda'
                    }
                  </td>
                </tr>
              ) : (
                paginatedFormaciones.map((form) => (
                  <tr key={form.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-gray-400 text-lg">person</span>
                        <span className="text-sm font-medium text-gray-900">
                          {form.nombre_completo || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-gray-400 text-lg">description</span>
                        <span className="text-sm text-gray-700">
                          {form.nombre_estudio || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-gray-400 text-lg">business</span>
                        <span className="text-sm text-gray-700">
                          {form.universidad_institucion || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getTipoColor(form.tipo)}`}>
                        {form.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                      {form.ano || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex flex-wrap gap-1">
                        {form.etiquetas && form.etiquetas.length > 0 ? (
                          form.etiquetas.map((etiqueta, index) => (
                            <span
                              key={index}
                              className={`px-2 py-1 rounded text-xs font-medium ${getEtiquetaColor(index)}`}
                            >
                              {etiqueta}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <span className="material-symbols-outlined text-lg">more_vert</span>
                      </button>
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
            Mostrando {startRecord} a {endRecord} de {filteredFormaciones.length} registros
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

export default FormacionAcademicaPage;


import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AreaId } from '@contracts/areas';
import { fetchProveedorById, ProveedorResponse, fetchEspecialidades, fetchEvaluacionesByNombreProveedor, fetchEvaluacionesByRutProveedor, EvaluacionProveedor } from '../services/proveedoresService';
import { Clasificacion } from '../types';

interface Servicio {
  id: number;
  nombre: string;
  codigo: string;
  descripcion: string;
  categoria: string;
  tarifaRef: number | null;
  ordenCompra: string | null;
  fechaEvaluacion: string | null;
  evaluadorResponsable: string | null;
  estado: 'Vigente' | 'En revisión' | 'Inactivo';
  clasificacion?: 'A' | 'B' | 'C' | null;
  documentacionUrl?: string | null;
  notaTotalPonderada?: number | null;
}

const ProveedorDetalle: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [proveedor, setProveedor] = useState<ProveedorResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState<string>('Todas las categorías');
  const [categorias, setCategorias] = useState<{ id: number; nombre: string }[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(true);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loadingServicios, setLoadingServicios] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionProveedor[]>([]);

  const getAreaPath = (path: string) => {
    return `/app/area/${AreaId.PROVEEDORES}/${path}`;
  };

  // Cargar categorías (especialidades)
  useEffect(() => {
    const loadCategorias = async () => {
      try {
        setLoadingCategorias(true);
        const data = await fetchEspecialidades();
        setCategorias(data);
      } catch (err) {
        console.error('Error al cargar categorías:', err);
      } finally {
        setLoadingCategorias(false);
      }
    };

    loadCategorias();
  }, []);

  // Cargar datos del proveedor
  useEffect(() => {
    const loadProveedor = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);
        const data = await fetchProveedorById(Number(id));
        
        if (!data) {
          setError('Proveedor no encontrado');
          return;
        }

        setProveedor(data);
      } catch (err: any) {
        console.error('Error al cargar proveedor:', err);
        setError('Error al cargar los datos del proveedor');
      } finally {
        setLoading(false);
      }
    };

    loadProveedor();
  }, [id]);

  // Cargar evaluaciones (servicios) del proveedor
  useEffect(() => {
    const loadEvaluaciones = async () => {
      if (!proveedor) return;

      try {
        setLoadingServicios(true);
        console.log('🔍 Cargando evaluaciones para proveedor:', {
          id: proveedor.id,
          nombre: proveedor.nombre_proveedor,
          rut: proveedor.rut,
        });
        
        // Intentar buscar por RUT primero, luego por nombre, y finalmente por ambos
        let evaluaciones: EvaluacionProveedor[] = [];
        
        if (proveedor.rut) {
          console.log('📋 Buscando por RUT:', proveedor.rut);
          evaluaciones = await fetchEvaluacionesByRutProveedor(proveedor.rut);
        }
        
        // Si no se encontraron por RUT, buscar por nombre
        if (evaluaciones.length === 0) {
          console.log('📋 No se encontraron por RUT, buscando por nombre:', proveedor.nombre_proveedor);
          evaluaciones = await fetchEvaluacionesByNombreProveedor(proveedor.nombre_proveedor);
        }
        
        console.log(`✅ Total de evaluaciones encontradas: ${evaluaciones.length}`);
        
        // Guardar las evaluaciones originales para poder pasarlas al formulario de edición
        setEvaluaciones(evaluaciones);
        
        // Convertir evaluaciones a formato Servicio
        const serviciosMapeados: Servicio[] = evaluaciones.map((evaluacion) => ({
          id: evaluacion.id,
          nombre: evaluacion.nombre_proyecto || evaluacion.nombre || evaluacion.nombre_proveedor || 'Sin nombre',
          codigo: evaluacion.codigo_proyecto || evaluacion.orden_compra || `EVAL-${evaluacion.id}`,
          descripcion: evaluacion.actividad || evaluacion.observacion || 'Sin descripción',
          categoria: evaluacion.especialidad || evaluacion.actividad || 'Sin categoría',
          tarifaRef: evaluacion.precio_servicio || null,
          ordenCompra: evaluacion.orden_compra || null,
          fechaEvaluacion: evaluacion.fecha_evaluacion || null,
          evaluadorResponsable: evaluacion.evaluador || null,
          estado: 'Vigente' as const, // Por defecto
          clasificacion: (evaluacion.categoria_proveedor as 'A' | 'B' | 'C') || null,
          documentacionUrl: evaluacion.link_servicio_ejecutado || null,
          notaTotalPonderada: evaluacion.nota_total_ponderada || null,
        }));

        setServicios(serviciosMapeados);
      } catch (err: any) {
        console.error('Error al cargar evaluaciones:', err);
        // No mostrar error, solo dejar array vacío
        setServicios([]);
      } finally {
        setLoadingServicios(false);
      }
    };

    if (proveedor) {
      loadEvaluaciones();
    }
  }, [proveedor]);

  // Filtrar servicios
  const filteredServicios = servicios.filter((servicio) => {
    const matchesSearch =
      servicio.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      servicio.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      servicio.descripcion.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategoria = filterCategoria === 'Todas las categorías' || servicio.categoria === filterCategoria;

    return matchesSearch && matchesCategoria;
  });

  // Paginación
  const totalPages = Math.ceil(filteredServicios.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedServicios = filteredServicios.slice(startIndex, endIndex);


  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'Vigente':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'En revisión':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Inactivo':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getCategoriaColor = (categoria: string) => {
    // Paleta de colores para especialidades (misma que en ProveedoresActuales)
    const colorPalette = [
      'bg-blue-100 text-blue-700 border-blue-200',
      'bg-purple-100 text-purple-700 border-purple-200',
      'bg-cyan-100 text-cyan-700 border-cyan-200',
      'bg-indigo-100 text-indigo-700 border-indigo-200',
      'bg-orange-100 text-orange-700 border-orange-200',
      'bg-teal-100 text-teal-700 border-teal-200',
      'bg-green-100 text-green-700 border-green-200',
      'bg-pink-100 text-pink-700 border-pink-200',
      'bg-rose-100 text-rose-700 border-rose-200',
      'bg-amber-100 text-amber-700 border-amber-200',
      'bg-lime-100 text-lime-700 border-lime-200',
      'bg-emerald-100 text-emerald-700 border-emerald-200',
      'bg-sky-100 text-sky-700 border-sky-200',
      'bg-violet-100 text-violet-700 border-violet-200',
      'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
      'bg-stone-100 text-stone-700 border-stone-200',
    ];

    // Función hash simple para asignar color de forma consistente
    const hashString = (str: string): number => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return Math.abs(hash);
    };

    // Asignar color basado en el hash del nombre de la categoría
    const hash = hashString(categoria.toLowerCase());
    const colorIndex = hash % colorPalette.length;
    return colorPalette[colorIndex];
  };

  const getEvaluacionColor = (evaluacion: number | null | undefined) => {
    if (!evaluacion) return 'bg-gray-500';
    // Nueva lógica: convertir porcentaje a decimal (0-1) y aplicar umbrales
    const cumplimiento = evaluacion / 100;
    if (cumplimiento > 0.764) return 'bg-green-500';
    if (cumplimiento >= 0.5 && cumplimiento <= 0.764) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getClasificacionColor = (clasificacion: string | null | undefined) => {
    if (!clasificacion) return 'bg-gray-100 text-gray-700';
    switch (clasificacion.toUpperCase()) {
      case 'A':
        return 'bg-green-100 text-green-700';
      case 'B':
        return 'bg-yellow-100 text-yellow-700';
      case 'C':
        return 'bg-orange-100 text-orange-700';
      case 'D':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-gray-500">Cargando proveedor...</p>
        </div>
      </div>
    );
  }

  if (error || !proveedor) {
    return (
      <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error || 'Proveedor no encontrado'}
          </div>
          <button
            onClick={() => navigate(getAreaPath('actuales'))}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
          >
            Volver a Proveedores
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Botón Volver */}
        <button
          onClick={() => navigate(getAreaPath('actuales'))}
          className="mb-4 flex items-center gap-2 text-primary hover:text-primary-hover transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          <span>Volver a Gestión de Proveedores</span>
        </button>

        {/* Información del Proveedor */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-6 mb-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-start gap-4 flex-1">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-2xl">business</span>
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-[#111318] mb-2">{proveedor.nombre_proveedor}</h1>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">RUT:</span> {proveedor.rut || 'N/A'}
                  </div>
                  {proveedor.razon_social && (
                    <div>
                      <span className="font-medium">Razón Social:</span> {proveedor.razon_social}
                    </div>
                  )}
                  {proveedor.correo_contacto && (
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">email</span>
                      <span>{proveedor.correo_contacto}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              {(() => {
                // Usar promedio_nota_total_ponderada si está disponible, sino usar evaluacion
                // El promedio_nota_total_ponderada viene en formato decimal (0-1), multiplicar por 100 para porcentaje
                const evaluacionMostrar = proveedor.promedio_nota_total_ponderada !== null && proveedor.promedio_nota_total_ponderada !== undefined
                  ? proveedor.promedio_nota_total_ponderada * 100 // Convertir de decimal (0-1) a porcentaje (0-100)
                  : (proveedor.evaluacion !== null && proveedor.evaluacion !== undefined ? proveedor.evaluacion : null);
                
                return evaluacionMostrar !== null && evaluacionMostrar !== undefined ? (
                  <div className="text-right">
                    <div className="text-sm text-gray-600 mb-1">EVALUACIÓN</div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${getEvaluacionColor(evaluacionMostrar)}`}
                          style={{ width: `${evaluacionMostrar}%` }}
                        />
                      </div>
                      <span className="text-lg font-semibold text-[#111318]">{evaluacionMostrar}%</span>
                    </div>
                  </div>
                ) : null;
              })()}
              {proveedor.clasificacion && (
                <div className="text-right">
                  <div className="text-sm text-gray-600 mb-1">CLASIFICACIÓN</div>
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-lg ${getClasificacionColor(
                      proveedor.clasificacion
                    )}`}
                  >
                    {proveedor.clasificacion}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Servicios del Proveedor */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-[#111318] mb-1">Servicios del Proveedor</h2>
              <p className="text-sm text-gray-500">
                Listado de servicios disponibles o contratados con este proveedor.
              </p>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">BUSCAR SERVICIO</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Nombre, código o descripción del servicio"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">CATEGORÍA</label>
                <select
                  value={filterCategoria}
                  onChange={(e) => setFilterCategoria(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
                  disabled={loadingCategorias}
                >
                  <option value="Todas las categorías">Todas las categorías</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.nombre}>
                      {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tabla de Servicios */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 overflow-hidden">
            {loadingServicios ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                <p className="text-sm text-gray-500">Cargando evaluaciones...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-blue-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">NOMBRE DEL SERVICIO</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">DESCRIPCIÓN</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">FECHA</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">EVALUADOR</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">ESPECIALIDAD</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">ORDEN DE SERVICIO</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">MONTO</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">ORDEN SERVICIO</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">EVALUACIÓN</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">CALIFICACIÓN</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">DOCUMENTACIÓN</th>
                      <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedServicios.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="py-8 text-center text-gray-500">
                          No hay evaluaciones registradas para este proveedor.
                        </td>
                      </tr>
                    ) : (
                      paginatedServicios.map((servicio) => (
                    <tr
                      key={servicio.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => {
                        // Buscar la evaluación original en el array de evaluaciones
                        const evaluacionOriginal = evaluaciones.find(
                          (e) => e.id === servicio.id
                        );
                        if (evaluacionOriginal) {
                          navigate(getAreaPath('evaluacion'), {
                            state: { 
                              evaluacionData: evaluacionOriginal,
                              returnPath: getAreaPath(`actuales/${id}`),
                              proveedorId: id,
                              readOnly: true // Modo solo lectura
                            }
                          });
                        }
                      }}
                    >
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="font-medium text-[#111318]">{servicio.nombre}</span>
                          <span className="text-xs text-gray-500">COD: {servicio.codigo}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-gray-600 line-clamp-2 max-w-xs">{servicio.descripcion}</span>
                      </td>
                      <td className="py-4 px-6">
                        {servicio.fechaEvaluacion ? (
                          <span className="text-sm text-[#111318]">
                            {new Date(servicio.fechaEvaluacion).toLocaleDateString('es-CL', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit'
                            })}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {servicio.evaluadorResponsable ? (
                          <span className="text-sm text-[#111318]">{servicio.evaluadorResponsable}</span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getCategoriaColor(
                            servicio.categoria
                          )}`}
                        >
                          {servicio.categoria}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {servicio.ordenCompra ? (
                          <span className="text-sm text-[#111318]">{servicio.ordenCompra}</span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {servicio.tarifaRef !== null ? (
                          <span className="text-sm font-medium text-[#111318]">{formatCurrency(servicio.tarifaRef)}</span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-xs text-gray-500">{servicio.codigo}</span>
                      </td>
                      <td className="py-4 px-6">
                        {servicio.notaTotalPonderada !== null && servicio.notaTotalPonderada !== undefined ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-100 rounded-full h-2 max-w-[100px]">
                              <div
                                className={`h-2 rounded-full transition-all ${getEvaluacionColor(servicio.notaTotalPonderada * 100)}`}
                                style={{ width: `${Math.round(servicio.notaTotalPonderada * 100)}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-[#111318] min-w-[40px]">
                              {Math.round(servicio.notaTotalPonderada * 100)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {servicio.clasificacion ? (
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${getClasificacionColor(
                              servicio.clasificacion
                            )}`}
                          >
                            {servicio.clasificacion}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {servicio.documentacionUrl ? (
                          <a
                            href={servicio.documentacionUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors inline-flex items-center justify-center"
                            title="Ver documentación"
                          >
                            <span className="material-symbols-outlined text-lg">description</span>
                          </a>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Evitar que se active el onClick de la fila
                            // Buscar la evaluación original en el array de evaluaciones
                            const evaluacionOriginal = evaluaciones.find(
                              (e) => e.id === servicio.id
                            );
                            if (evaluacionOriginal) {
                              navigate(getAreaPath('evaluacion'), {
                                state: { 
                                  evaluacionData: evaluacionOriginal,
                                  returnPath: getAreaPath(`actuales/${id}`),
                                  proveedorId: id,
                                  readOnly: false // Modo edición
                                }
                              });
                            } else {
                              navigate(getAreaPath('evaluacion'), {
                                state: {
                                  returnPath: getAreaPath(`actuales/${id}`),
                                  proveedorId: id,
                                  readOnly: false
                                }
                              });
                            }
                          }}
                          className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                      </td>
                    </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Paginación */}
            {filteredServicios.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Mostrando {startIndex + 1} a {Math.min(endIndex, filteredServicios.length)} de{' '}
                  {filteredServicios.length} servicios
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">chevron_left</span>
                  </button>
                  {Array.from({ length: Math.min(totalPages, 8) }, (_, i) => {
                    const page = i + 1;
                    if (totalPages > 8 && page === 8) {
                      return (
                        <span key="ellipsis" className="px-2 text-gray-500">
                          ...
                        </span>
                      );
                    }
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === page
                            ? 'bg-primary text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>© 2024 MyMALAB. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
};

export default ProveedorDetalle;


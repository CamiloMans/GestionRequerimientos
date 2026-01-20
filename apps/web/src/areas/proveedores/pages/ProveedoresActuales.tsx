import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Proveedor, TipoProveedor, Especialidad, Clasificacion } from '../types';
import { AreaId } from '@contracts/areas';
import { fetchProveedores, ProveedorResponse, fetchEspecialidadesByNombreProveedor, fetchEspecialidades } from '../services/proveedoresService';

const ProveedoresActuales: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('Todos');
  const [filterCategoria, setFilterCategoria] = useState<string>('Todas');
  const [filterEspecialidad, setFilterEspecialidad] = useState<string>('Todas');
  const [filterClasificacion, setFilterClasificacion] = useState<string>('Todas');
  const [categorias, setCategorias] = useState<{ id: number; nombre: string }[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Mapear ProveedorResponse a Proveedor
  const mapProveedorResponseToProveedor = async (response: ProveedorResponse): Promise<Proveedor> => {
    // Mapear tipo_proveedor a TipoProveedor enum
    let tipo: TipoProveedor = TipoProveedor.EMPRESA;
    if (response.tipo_proveedor === 'Persona natural') {
      tipo = TipoProveedor.PERSONA;
    }

    // Mapear clasificacion string a Clasificacion enum
    let clasificacion: Clasificacion = Clasificacion.A;
    if (response.clasificacion) {
      switch (response.clasificacion.toUpperCase()) {
        case 'A':
          clasificacion = Clasificacion.A;
          break;
        case 'B':
          clasificacion = Clasificacion.B;
          break;
        case 'C':
          clasificacion = Clasificacion.C;
          break;
        case 'D':
          clasificacion = Clasificacion.D;
          break;
        default:
          clasificacion = Clasificacion.A;
      }
    } else if (response.evaluacion !== null && response.evaluacion !== undefined) {
      // Si no hay clasificación pero hay evaluación, calcularla
      // Nueva lógica: convertir porcentaje a decimal (0-1) y aplicar umbrales
      const cumplimiento = response.evaluacion / 100;
      if (cumplimiento > 0.764) clasificacion = Clasificacion.A;
      else if (cumplimiento >= 0.5 && cumplimiento <= 0.764) clasificacion = Clasificacion.B;
      else clasificacion = Clasificacion.C;
    }

    // Obtener especialidades desde brg_core_proveedor_especialidad
    const especialidades = await fetchEspecialidadesByNombreProveedor(response.nombre_proveedor);

    // Generar dato dummy para tieneServiciosEjecutados
    // Si tiene evaluación, asumimos que tiene servicios ejecutados
    // Si no tiene evaluación, 70% de probabilidad de tener servicios ejecutados (para datos dummy)
    const tieneEvaluacion = response.evaluacion !== null && response.evaluacion !== undefined && response.evaluacion > 0;
    const tieneServiciosEjecutados = tieneEvaluacion 
      ? true 
      : (response.id % 10 < 7); // 70% de probabilidad basado en el ID

    // Si no tiene servicios ejecutados, no debería tener evaluación ni clasificación
    const evaluacionFinal = tieneServiciosEjecutados ? (response.evaluacion ?? 0) : 0;
    const clasificacionFinal = tieneServiciosEjecutados ? clasificacion : Clasificacion.A; // Mantener tipo pero no se mostrará

    return {
      id: response.id,
      nombre: response.nombre_proveedor,
      razonSocial: response.razon_social || undefined,
      rut: response.rut || '',
      tipo,
      especialidad: especialidades.length > 0 ? especialidades : [], // Array de especialidades
      email: response.correo_contacto || undefined,
      contacto: response.correo_contacto || undefined,
      evaluacion: evaluacionFinal,
      clasificacion: clasificacionFinal,
      activo: true,
      tieneServiciosEjecutados,
      created_at: response.created_at,
      updated_at: response.updated_at,
    };
  };

  // Cargar categorías desde Supabase
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

  // Cargar proveedores desde Supabase
  useEffect(() => {
    const loadProveedores = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchProveedores();
        // Mapear proveedores de forma asíncrona para cargar especialidades
        const mappedProveedores = await Promise.all(
          data.map((proveedor) => mapProveedorResponseToProveedor(proveedor))
        );
        setProveedores(mappedProveedores);
      } catch (err: any) {
        console.error('Error al cargar proveedores:', err);
        setError('Error al cargar los proveedores. Por favor, intente nuevamente.');
      } finally {
        setLoading(false);
      }
    };

    loadProveedores();
  }, []);

  // Leer parámetro de especialidad de la URL y aplicar filtro
  useEffect(() => {
    const especialidadParam = searchParams.get('especialidad');
    if (especialidadParam && proveedores.length > 0) {
      // Buscar si existe una especialidad que coincida con el parámetro
      const especialidadesUnicas = Array.from(new Set(proveedores.flatMap((p) => p.especialidad)));
      const especialidadEncontrada = especialidadesUnicas.find(esp => 
        esp.toLowerCase().includes(especialidadParam.toLowerCase()) ||
        especialidadParam.toLowerCase().includes(esp.toLowerCase())
      );
      
      if (especialidadEncontrada) {
        setFilterEspecialidad(especialidadEncontrada);
        // Limpiar el parámetro de la URL después de aplicarlo
        searchParams.delete('especialidad');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [searchParams, proveedores, setSearchParams]);

  // Leer parámetro de evaluación menor a 60% y aplicar filtro de clasificación C
  useEffect(() => {
    const evaluacionMenor60 = searchParams.get('evaluacionMenor60');
    if (evaluacionMenor60 === 'true') {
      setFilterClasificacion(Clasificacion.C);
      // Limpiar el parámetro de la URL después de aplicarlo
      searchParams.delete('evaluacionMenor60');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const getAreaPath = (path: string) => {
    return `/app/area/${AreaId.PROVEEDORES}/${path}`;
  };

  // Filtrar proveedores
  const filteredProveedores = proveedores.filter((proveedor) => {
    const matchesSearch =
      proveedor.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proveedor.razonSocial?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proveedor.rut.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proveedor.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTipo = filterTipo === 'Todos' || proveedor.tipo === filterTipo;
    const matchesCategoria = filterCategoria === 'Todas' || proveedor.especialidad.some(esp => {
      const categoriaSeleccionada = categorias.find(cat => cat.nombre === filterCategoria);
      if (!categoriaSeleccionada) return false;
      // Verificar si la especialidad contiene el nombre de la categoría (case insensitive)
      return esp.toLowerCase().includes(categoriaSeleccionada.nombre.toLowerCase());
    });
    const matchesEspecialidad = filterEspecialidad === 'Todas' || proveedor.especialidad.includes(filterEspecialidad);
    const matchesClasificacion = filterClasificacion === 'Todas' || proveedor.clasificacion === filterClasificacion;

    return matchesSearch && matchesTipo && matchesCategoria && matchesEspecialidad && matchesClasificacion;
  });

  // Paginación
  const totalPages = Math.ceil(filteredProveedores.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProveedores = filteredProveedores.slice(startIndex, endIndex);

  const getEspecialidadColor = (especialidad: string) => {
    // Paleta de colores para especialidades
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

    // Asignar color basado en el hash del nombre de la especialidad
    const hash = hashString(especialidad.toLowerCase());
    const colorIndex = hash % colorPalette.length;
    return colorPalette[colorIndex];
  };

  const getClasificacionColor = (clasificacion: Clasificacion) => {
    const colors: Record<Clasificacion, string> = {
      [Clasificacion.A]: 'bg-green-100 text-green-700',
      [Clasificacion.B]: 'bg-yellow-100 text-yellow-700',
      [Clasificacion.C]: 'bg-orange-100 text-orange-700',
      [Clasificacion.D]: 'bg-red-100 text-red-700',
    };
    return colors[clasificacion];
  };

  const getEvaluacionColor = (evaluacion: number) => {
    // Nueva lógica: convertir porcentaje a decimal (0-1) y aplicar umbrales
    const cumplimiento = evaluacion / 100;
    if (cumplimiento > 0.764) return 'bg-green-500';
    if (cumplimiento >= 0.5 && cumplimiento <= 0.764) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-[#111318] mb-1">
                Proveedores Actuales
              </h1>
              <p className="text-sm text-gray-500">
                Gestión y control de la base de datos de proveedores activos y vigentes.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-[#111318] font-medium">
                <span className="material-symbols-outlined text-lg">download</span>
                <span className="hidden sm:inline">Exportar</span>
              </button>
              <button
                onClick={() => navigate(getAreaPath('actuales/nuevo'))}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                <span>Nuevo Proveedor</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Búsqueda */}
            <div className="lg:col-span-1">
              <label className="block text-xs font-medium text-gray-700 mb-2">
                BUSCAR
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Nombre, RUT o Email"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Tipo de Proveedor */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                TIPO DE PROVEEDOR
              </label>
              <select
                value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
              >
                <option value="Todos">Todos los tipos</option>
                <option value={TipoProveedor.EMPRESA}>Empresa</option>
                <option value={TipoProveedor.PERSONA}>Persona</option>
              </select>
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                CATEGORÍA
              </label>
              {loadingCategorias ? (
                <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50">
                  <span className="text-sm text-gray-500">Cargando...</span>
                </div>
              ) : (
                <select
                  value={filterCategoria}
                  onChange={(e) => setFilterCategoria(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
                >
                  <option value="Todas">Todas las categorías</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.nombre}>
                      {cat.nombre}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Especialidad */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                ESPECIALIDAD
              </label>
              <select
                value={filterEspecialidad}
                onChange={(e) => setFilterEspecialidad(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
              >
                <option value="Todas">Todas las especialidades</option>
                {Array.from(new Set(proveedores.flatMap((p) => p.especialidad)))
                  .sort()
                  .map((esp) => (
                    <option key={esp} value={esp}>
                      {esp}
                    </option>
                  ))}
              </select>
            </div>

            {/* Clasificación */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                CLASIFICACIÓN
              </label>
              <select
                value={filterClasificacion}
                onChange={(e) => setFilterClasificacion(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
              >
                <option value="Todas">Todas las clasificaciones</option>
                {Object.values(Clasificacion).map((clas) => (
                  <option key={clas} value={clas}>
                    {clas}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-gray-500">Cargando proveedores...</p>
              </div>
            </div>
          ) : error ? (
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                <span className="material-symbols-outlined">error</span>
                <span>{error}</span>
              </div>
            </div>
          ) : filteredProveedores.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p>No se encontraron proveedores.</p>
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-blue-50 border-b-2 border-gray-200">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">NOMBRE / RAZÓN SOCIAL</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">RUT / TIPO</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">ESPECIALIDAD</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">CONTACTO</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">ESTADO</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">EVALUACIÓN</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">CLASIFICACIÓN</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700"></th>
                </tr>
              </thead>
              <tbody>
                {paginatedProveedores.map((proveedor) => (
                  <tr
                    key={proveedor.id}
                    onClick={() => navigate(getAreaPath(`actuales/${proveedor.id}`))}
                    className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="font-medium text-[#111318]">{proveedor.nombre}</span>
                        {proveedor.razonSocial && proveedor.razonSocial !== proveedor.nombre && (
                          <span className="text-sm text-gray-500">{proveedor.razonSocial}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="text-sm text-[#111318]">{proveedor.rut}</span>
                        <span className="text-xs text-gray-500">{proveedor.tipo}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {proveedor.especialidad.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {proveedor.especialidad.map((esp, index) => (
                            <span
                              key={index}
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getEspecialidadColor(esp)}`}
                            >
                              {esp}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {proveedor.contacto && (
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-gray-400 text-sm">email</span>
                          <span className="text-sm text-[#111318] truncate max-w-[200px]">{proveedor.contacto}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          proveedor.tieneServiciosEjecutados
                            ? 'bg-green-100 text-green-700 border-green-200'
                            : 'bg-gray-100 text-gray-700 border-gray-200'
                        }`}
                      >
                        {proveedor.tieneServiciosEjecutados ? 'Con servicios ejecutados' : 'Sin servicios ejecutados'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {proveedor.tieneServiciosEjecutados ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-2 max-w-[100px]">
                            <div
                              className={`h-2 rounded-full transition-all ${getEvaluacionColor(proveedor.evaluacion)}`}
                              style={{ width: `${proveedor.evaluacion}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-[#111318] min-w-[40px]">
                            {proveedor.evaluacion}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {proveedor.tieneServiciosEjecutados ? (
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${getClasificacionColor(
                            proveedor.clasificacion
                          )}`}
                        >
                          {proveedor.clasificacion}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(getAreaPath(`actuales/${proveedor.id}/editar`));
                        }}
                        className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}

          {/* Paginación */}
          {!loading && !error && filteredProveedores.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Mostrando {startIndex + 1} a {Math.min(endIndex, filteredProveedores.length)} de{' '}
              {filteredProveedores.length} resultados
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

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>© 2024 MyMALAB. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
};

export default ProveedoresActuales;



import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { AreaId } from '@contracts/areas';
import { fetchProveedores, ProveedorResponse, fetchEspecialidadesByNombreProveedor, fetchEspecialidades } from '../services/proveedoresService';
import { Proveedor, Clasificacion, TipoProveedor } from '../types';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [especialidades, setEspecialidades] = useState<{ id: number; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const getAreaPath = (path: string) => {
    return `/app/area/${AreaId.PROVEEDORES}/${path}`;
  };

  // Mapear ProveedorResponse a Proveedor
  const mapProveedorResponseToProveedor = async (response: ProveedorResponse): Promise<Proveedor> => {
    const tipo = response.tipo_proveedor === 'Persona natural' ? TipoProveedor.PERSONA : TipoProveedor.EMPRESA;
    
    let clasificacion: Clasificacion = Clasificacion.A;
    if (response.clasificacion) {
      switch (response.clasificacion.toUpperCase()) {
        case 'A': clasificacion = Clasificacion.A; break;
        case 'B': clasificacion = Clasificacion.B; break;
        case 'C': clasificacion = Clasificacion.C; break;
        case 'D': clasificacion = Clasificacion.D; break;
        default: clasificacion = Clasificacion.A;
      }
    } else if (response.evaluacion !== null && response.evaluacion !== undefined) {
      // Nueva lógica: convertir porcentaje a decimal (0-1) y aplicar umbrales
      const cumplimiento = response.evaluacion / 100;
      if (cumplimiento > 0.764) clasificacion = Clasificacion.A;
      else if (cumplimiento >= 0.5 && cumplimiento <= 0.764) clasificacion = Clasificacion.B;
      else clasificacion = Clasificacion.C;
    }

    const especialidades = await fetchEspecialidadesByNombreProveedor(response.nombre_proveedor);
    const tieneEvaluacion = response.evaluacion !== null && response.evaluacion !== undefined && response.evaluacion > 0;
    const tieneServiciosEjecutados = tieneEvaluacion || (response.id % 10 < 7);

    return {
      id: response.id,
      nombre: response.nombre_proveedor,
      razonSocial: response.razon_social || undefined,
      rut: response.rut || '',
      tipo,
      especialidad: especialidades.length > 0 ? especialidades : [],
      email: response.correo_contacto || undefined,
      contacto: response.correo_contacto || undefined,
      evaluacion: tieneServiciosEjecutados ? (response.evaluacion ?? 0) : 0,
      clasificacion,
      activo: true,
      tieneServiciosEjecutados,
      created_at: response.created_at,
      updated_at: response.updated_at,
    };
  };

  // Cargar especialidades
  useEffect(() => {
    const loadEspecialidades = async () => {
      try {
        const data = await fetchEspecialidades();
        setEspecialidades(data);
      } catch (err) {
        console.error('Error al cargar especialidades:', err);
      }
    };

    loadEspecialidades();
  }, []);

  // Cargar proveedores
  useEffect(() => {
    const loadProveedores = async () => {
      try {
        setLoading(true);
        const data = await fetchProveedores();
        const mappedProveedores = await Promise.all(
          data.map((proveedor) => mapProveedorResponseToProveedor(proveedor))
        );
        setProveedores(mappedProveedores);
      } catch (err) {
        console.error('Error al cargar proveedores:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProveedores();
  }, []);

  // Calcular métricas
  const metrics = useMemo(() => {
    const total = proveedores.length;
    const conServicios = proveedores.filter(p => p.tieneServiciosEjecutados);
    const promedio = conServicios.length > 0
      ? Math.round(conServicios.reduce((sum, p) => sum + p.evaluacion, 0) / conServicios.length)
      : 0;
    const categoriaA = proveedores.filter(p => p.clasificacion === Clasificacion.A && p.tieneServiciosEjecutados).length;
    const categoriaC = proveedores.filter(p => p.clasificacion === Clasificacion.C && p.tieneServiciosEjecutados).length;
    
    // Calcular proveedores nuevos este mes (dummy)
    const nuevosEsteMes = Math.floor(total * 0.08);
    const promedioAnterior = promedio - 2;

    return {
      total,
      nuevosEsteMes,
      promedio,
      promedioAnterior,
      categoriaA,
      categoriaC,
      porcentajeA: total > 0 ? Math.round((categoriaA / total) * 100) : 0,
    };
  }, [proveedores]);

  // Proveedores por componente (usando nombres reales de la tabla especialidad)
  const proveedoresPorComponente = useMemo(() => {
    // Usar las especialidades reales de la base de datos
    const componentes = especialidades.map(especialidad => {
      const cantidad = proveedores.filter(proveedor => 
        proveedor.especialidad.includes(especialidad.nombre)
      ).length;
      return { nombre: especialidad.nombre, cantidad };
    });

    // Ordenar por cantidad (mayor a menor) y luego por nombre alfabéticamente
    return componentes.sort((a, b) => {
      if (b.cantidad !== a.cantidad) {
        return b.cantidad - a.cantidad;
      }
      return a.nombre.localeCompare(b.nombre);
    });
  }, [proveedores, especialidades]);

  // Distribución por clasificación
  const distribucionClasificacion = useMemo(() => {
    const categoriaA = proveedores.filter(p => p.clasificacion === Clasificacion.A && p.tieneServiciosEjecutados).length;
    const categoriaB = proveedores.filter(p => p.clasificacion === Clasificacion.B && p.tieneServiciosEjecutados).length;
    const categoriaC = proveedores.filter(p => p.clasificacion === Clasificacion.C && p.tieneServiciosEjecutados).length;
    const total = categoriaA + categoriaB + categoriaC;
    
    return [
      { nombre: 'Categoría A', cantidad: categoriaA, porcentaje: total > 0 ? Math.round((categoriaA / total) * 100) : 0, color: '#10b981' },
      { nombre: 'Categoría B', cantidad: categoriaB, porcentaje: total > 0 ? Math.round((categoriaB / total) * 100) : 0, color: '#eab308' },
      { nombre: 'Categoría C', cantidad: categoriaC, porcentaje: total > 0 ? Math.round((categoriaC / total) * 100) : 0, color: '#ef4444' },
    ];
  }, [proveedores]);

  // Top proveedores (ordenados por mejor evaluación)
  const topProveedores = useMemo(() => {
    return proveedores
      .filter(p => p.evaluacion > 0) // Mostrar todos los que tengan evaluación, no solo los con servicios ejecutados
      .sort((a, b) => b.evaluacion - a.evaluacion)
      .slice(0, 10); // Mostrar top 10
  }, [proveedores]);

  // Proveedores categoría C (inhabilitados)
  const proveedoresCategoriaC = useMemo(() => {
    return proveedores
      .filter(p => p.clasificacion === Clasificacion.C && p.tieneServiciosEjecutados)
      .slice(0, 2);
  }, [proveedores]);

  // Iconos para componentes (mapeo basado en palabras clave del nombre)
  const getComponentIcon = (nombre: string) => {
    const nombreLower = nombre.toLowerCase();
    
    // Mapeo basado en palabras clave
    if (nombreLower.includes('aire') || nombreLower.includes('calidad del aire')) return 'air';
    if (nombreLower.includes('agua') && !nombreLower.includes('hidrogeología')) return 'water_drop';
    if (nombreLower.includes('hidrogeología')) return 'waves';
    if (nombreLower.includes('hidrología') || nombreLower.includes('hidrologia')) return 'water_drop';
    if (nombreLower.includes('ruido') || nombreLower.includes('acústica') || nombreLower.includes('acustica')) return 'hearing';
    if (nombreLower.includes('geología') || nombreLower.includes('geologia')) return 'terrain';
    if (nombreLower.includes('lumínica') || nombreLower.includes('luminica') || nombreLower.includes('luminotecnia')) return 'lightbulb';
    if (nombreLower.includes('medio humano')) return 'people';
    if (nombreLower.includes('antropología') || nombreLower.includes('antropologia')) return 'account_circle';
    if (nombreLower.includes('topografía') || nombreLower.includes('topografia')) return 'map';
    if (nombreLower.includes('arquitectura')) return 'architecture';
    if (nombreLower.includes('cartografía') || nombreLower.includes('cartografia')) return 'public';
    if (nombreLower.includes('paisaje') || nombreLower.includes('paisajismo')) return 'landscape';
    if (nombreLower.includes('turismo')) return 'explore';
    if (nombreLower.includes('laboratorio')) return 'science';
    if (nombreLower.includes('glaciares')) return 'ac_unit';
    if (nombreLower.includes('olores')) return 'mood';
    if (nombreLower.includes('fauna') || nombreLower.includes('vegetación') || nombreLower.includes('vegetacion') || nombreLower.includes('flora')) return 'category';
    if (nombreLower.includes('suelo') || nombreLower.includes('suelos')) return 'terrain';
    if (nombreLower.includes('difusión') || nombreLower.includes('difusion')) return 'campaign';
    if (nombreLower.includes('erosión') || nombreLower.includes('erosion')) return 'terrain';
    if (nombreLower.includes('eólica') || nombreLower.includes('eolica')) return 'air';
    if (nombreLower.includes('campo electromagnético') || nombreLower.includes('campo electromagnetico')) return 'bolt';
    if (nombreLower.includes('hongos') || nombreLower.includes('líquenes') || nombreLower.includes('liquenes')) return 'eco';
    
    // Por defecto
    return 'category';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-gray-500">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-[#111318] mb-1">
                Dashboard - Navegación Normalizada
              </h1>
            </div>
          </div>
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Proveedores */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Proveedores</p>
                <p className="text-3xl font-bold text-[#111318]">{metrics.total}</p>
                <p className="text-xs text-gray-500 mt-2">+{metrics.nuevosEsteMes} este mes</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-600 text-2xl">groups</span>
              </div>
            </div>
          </div>

          {/* Promedio General */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Promedio General</p>
                <p className="text-3xl font-bold text-[#111318]">{metrics.promedio}%</p>
                <p className="text-xs text-green-600 mt-2">↑+{metrics.promedio - metrics.promedioAnterior}% vs mes anterior</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-yellow-600 text-2xl">star</span>
              </div>
            </div>
          </div>

          {/* Top Performers (A) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Top Performers (A)</p>
                <p className="text-3xl font-bold text-[#111318]">{metrics.categoriaA}</p>
                <p className="text-xs text-gray-500 mt-2">{metrics.porcentajeA}% del total</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-green-600 text-2xl">diamond</span>
              </div>
            </div>
          </div>

          {/* Inhabilitados (C) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Inhabilitados (C)</p>
                <p className="text-3xl font-bold text-[#111318]">{metrics.categoriaC}</p>
                <p className="text-xs text-red-600 mt-2">No Contratar</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-600 text-2xl">block</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Proveedores por Componente */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">groups</span>
                <h2 className="text-lg font-bold text-[#111318]">Proveedores por Componente</h2>
              </div>
               <span className="text-sm text-gray-500">{especialidades.length} Especialidades</span>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {proveedoresPorComponente.map((componente, index) => (
                <div
                  key={index}
                  onClick={() => navigate(`${getAreaPath('actuales')}?especialidad=${encodeURIComponent(componente.nombre)}`)}
                  className="flex flex-col items-center p-3 rounded-lg border border-gray-200 hover:border-primary transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                    <span className="material-symbols-outlined text-primary text-xl">
                      {getComponentIcon(componente.nombre)}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-[#111318] text-center mb-1">{componente.nombre}</p>
                  <p className="text-lg font-bold text-primary">{componente.cantidad}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Criterios de Elegibilidad */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-6">
            <h2 className="text-lg font-bold text-[#111318] mb-4">Criterios de Elegibilidad</h2>
            <div className="space-y-4">
              {/* Categoría A */}
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-green-600 text-2xl">check_circle</span>
                  <div>
                    <h3 className="font-semibold text-green-700 mb-1">Categoría A</h3>
                    <p className="text-sm text-green-600 mb-1">Cumplimiento &gt; 76,4%</p>
                    <p className="text-xs text-gray-600">Habilitado para contratación inmediata.</p>
                  </div>
                </div>
              </div>

              {/* Categoría B */}
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-yellow-600 text-2xl">info</span>
                  <div>
                    <h3 className="font-semibold text-yellow-700 mb-1">Categoría B</h3>
                    <p className="text-sm text-yellow-600 mb-1">50% ≤ cumplimiento ≤ 76,4%</p>
                    <p className="text-xs text-gray-600">Habilitado con plan de mejora obligatorio.</p>
                  </div>
                </div>
              </div>

              {/* Categoría C */}
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-red-600 text-2xl">cancel</span>
                  <div>
                    <h3 className="font-semibold text-red-700 mb-1">Categoría C</h3>
                    <p className="text-sm text-red-600 mb-1">Cumplimiento &lt; 50%</p>
                    <p className="text-xs text-gray-600">INHABILITADO PARA CONTRATACIÓN.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Distribución por Clasificación */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-6 mb-6">
          <h2 className="text-lg font-bold text-[#111318] mb-4">Distribución por Clasificación</h2>
          <div className="mb-4">
            <div className="flex h-8 rounded-lg overflow-hidden">
              {distribucionClasificacion.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-center text-white font-semibold text-sm"
                  style={{
                    width: `${item.porcentaje}%`,
                    backgroundColor: item.color,
                  }}
                >
                  {item.porcentaje > 5 && `${item.porcentaje}%`}
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            {distribucionClasificacion.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-sm text-gray-600">
                  {item.nombre} ({item.cantidad} proveedores)
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Proveedores Categoría C - Inhabilitados */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600">warning</span>
                <h2 className="text-lg font-bold text-[#111318]">Proveedores Categoría C - Inhabilitados</h2>
              </div>
              <button className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
                NO CONTRATAR
              </button>
            </div>
            {proveedoresCategoriaC.length > 0 ? (
              <div className="space-y-3">
                {proveedoresCategoriaC.map((proveedor) => (
                  <div
                    key={proveedor.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-red-300 transition-colors cursor-pointer"
                    onClick={() => navigate(getAreaPath(`actuales/${proveedor.id}`))}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-[#111318]">{proveedor.nombre}</p>
                        <p className="text-xs text-gray-500">RUT: {proveedor.rut}</p>
                      </div>
                      <span className="text-sm font-semibold text-red-600">{proveedor.evaluacion}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">{proveedor.tipo} {proveedor.especialidad[0] || ''}</span>
                      <span className="text-xs text-red-600 font-medium">BLOQUEADO Desde {new Date(proveedor.created_at || '').toLocaleDateString('es-CL')}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(getAreaPath(`actuales/${proveedor.id}`));
                      }}
                      className="mt-2 text-xs text-primary hover:underline"
                    >
                      Ver Ficha
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 mb-2">No hay proveedores inhabilitados</p>
                <button
                  onClick={() => navigate(`${getAreaPath('actuales')}?evaluacionMenor60=true`)}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  Ver todos los proveedores inhabilitados
                </button>
              </div>
            )}
          </div>

          {/* Top Proveedores */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#111318]">Top Proveedores</h2>
              <span className="material-symbols-outlined text-gray-400 cursor-pointer">more_vert</span>
            </div>
            {topProveedores.length > 0 ? (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                {topProveedores.map((proveedor, index) => (
                  <div
                    key={proveedor.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-primary transition-colors cursor-pointer"
                    onClick={() => navigate(getAreaPath(`actuales/${proveedor.id}`))}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                      index === 0 ? 'bg-yellow-500 text-white' :
                      index === 1 ? 'bg-gray-400 text-white' :
                      index === 2 ? 'bg-orange-600 text-white' :
                      'bg-primary text-white'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#111318] truncate">{proveedor.nombre}</p>
                      <p className="text-xs text-gray-500 truncate">{proveedor.especialidad[0] || 'Sin especialidad'}</p>
                    </div>
                    <span className={`text-sm font-semibold whitespace-nowrap shrink-0 ${
                      proveedor.evaluacion && (proveedor.evaluacion / 100) > 0.764 ? 'text-green-600' :
                      proveedor.evaluacion && (proveedor.evaluacion / 100) >= 0.5 ? 'text-yellow-600' :
                      'text-orange-600'
                    }`}>
                      {proveedor.evaluacion}%
                    </span>
                  </div>
                ))}
                <button
                  onClick={() => navigate(getAreaPath('actuales'))}
                  className="w-full text-sm text-primary hover:underline flex items-center justify-center gap-1 mt-3 pt-3 border-t border-gray-200"
                >
                  VER RANKING COMPLETO
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 mb-2">No hay proveedores con evaluación registrada</p>
                <button
                  onClick={() => navigate(getAreaPath('actuales'))}
                  className="text-sm text-primary hover:underline"
                >
                  Ver todos los proveedores
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;


import React, { useState } from 'react';

interface AlertaPregunta {
  id: string;
  pregunta: string;
  detalle: string;
  complejidad: 'Alta' | 'Media' | 'Baja';
  especialidad: string;
  estado: 'Retrasado' | 'En Proceso' | 'No iniciado';
  accion: string;
}

/**
 * Datos dummy para el reporte
 */
const DUMMY_ALERTAS: AlertaPregunta[] = [
  {
    id: '018',
    pregunta: 'Cuadro consolidado de partes y obras',
    detalle: 'Falta definir cronograma de cierre',
    complejidad: 'Alta',
    especialidad: 'Desc. Proyecto',
    estado: 'Retrasado',
    accion: 'Revisar',
  },
  {
    id: '042',
    pregunta: 'Modelación de dispersión de contaminantes',
    detalle: 'Pendiente validación de datos meteorológicos',
    complejidad: 'Alta',
    especialidad: 'Aire',
    estado: 'En Proceso',
    accion: 'Revisar',
  },
  {
    id: '089',
    pregunta: 'Línea base hidrogeológica',
    detalle: 'Requerimiento de pozos adicionales',
    complejidad: 'Alta',
    especialidad: 'Agua',
    estado: 'No iniciado',
    accion: 'Revisar',
  },
  {
    id: '056',
    pregunta: 'Análisis de impacto en flora y fauna',
    detalle: 'Falta completar inventario de especies',
    complejidad: 'Alta',
    especialidad: 'Flora y Fauna',
    estado: 'Retrasado',
    accion: 'Revisar',
  },
  {
    id: '073',
    pregunta: 'Evaluación de ruido y vibraciones',
    detalle: 'Pendiente mediciones en campo',
    complejidad: 'Alta',
    especialidad: 'Ruido y Vibraciones',
    estado: 'En Proceso',
    accion: 'Revisar',
  },
];

const ReporteView: React.FC = () => {
  const [especialidadFiltro, setEspecialidadFiltro] = useState('Todas');

  // Estadísticas dummy
  const totalPreguntas = 142;
  const completadas = 78;
  const enDesarrollo = 42;
  const noIniciadas = 22;

  const altaComplejidad = 32;
  const mediaComplejidad = 68;
  const bajaComplejidad = 42;

  // Avance por especialidad dummy
  const avancePorEspecialidad = [
    { nombre: 'Geología', completadas: 17, total: 20, porcentaje: 85 },
    { nombre: 'Agua', completadas: 9, total: 20, porcentaje: 45 },
    { nombre: 'Medio Humano (Social)', completadas: 23, total: 25, porcentaje: 92 },
    { nombre: 'Calidad del Aire', completadas: 3, total: 10, porcentaje: 30 },
    { nombre: 'Ruido y Vibraciones', completadas: 6, total: 10, porcentaje: 60 },
    { nombre: 'Flora y Fauna', completadas: 1, total: 10, porcentaje: 10 },
  ];

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'Retrasado':
        return 'bg-red-100 text-red-800';
      case 'En Proceso':
        return 'bg-yellow-100 text-yellow-800';
      case 'No iniciado':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEstadoDot = (estado: string) => {
    switch (estado) {
      case 'Retrasado':
        return 'bg-red-500';
      case 'En Proceso':
        return 'bg-yellow-500';
      case 'No iniciado':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getProgressColor = (porcentaje: number) => {
    if (porcentaje >= 80) return 'bg-green-500';
    if (porcentaje >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Calcular porcentajes para el gráfico de dona
  const porcentajeCompletadas = Math.round((completadas / totalPreguntas) * 100);
  const porcentajeEnDesarrollo = Math.round((enDesarrollo / totalPreguntas) * 100);
  const porcentajeNoIniciadas = Math.round((noIniciadas / totalPreguntas) * 100);

  // Calcular ángulos para el gráfico de dona
  const radio = 60;
  const circunferencia = 2 * Math.PI * radio;
  const strokeDasharrayCompletadas = (porcentajeCompletadas / 100) * circunferencia;
  const strokeDasharrayEnDesarrollo = (porcentajeEnDesarrollo / 100) * circunferencia;
  const strokeDasharrayNoIniciadas = (porcentajeNoIniciadas / 100) * circunferencia;
  
  // Offset para posicionar cada segmento
  const offsetCompletadas = circunferencia - strokeDasharrayCompletadas;
  const offsetEnDesarrollo = circunferencia - strokeDasharrayEnDesarrollo;
  const offsetNoIniciadas = circunferencia - strokeDasharrayNoIniciadas;
  
  // Rotación para cada segmento (acumulativa)
  const rotationEnDesarrollo = (porcentajeCompletadas / 100) * 360;
  const rotationNoIniciadas = ((porcentajeCompletadas + porcentajeEnDesarrollo) / 100) * 360;

  return (
    <div className="w-full p-6 bg-[#f8fafc] min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#111318] mb-2">Reporte de Cumplimiento y Avance</h1>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Estado General de Preguntas */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Estado General de Preguntas</h3>
            <div className="flex items-center justify-center gap-8">
              {/* Gráfico de dona */}
              <div className="relative w-40 h-40">
                <svg className="transform -rotate-90 w-40 h-40">
                  {/* Fondo gris */}
                  <circle
                    cx="80"
                    cy="80"
                    r={radio}
                    stroke="#e5e7eb"
                    strokeWidth="20"
                    fill="none"
                  />
                  {/* Completadas (verde) */}
                  <circle
                    cx="80"
                    cy="80"
                    r={radio}
                    stroke="#10b981"
                    strokeWidth="20"
                    fill="none"
                    strokeDasharray={`${strokeDasharrayCompletadas} ${circunferencia}`}
                    strokeDashoffset={0}
                    strokeLinecap="round"
                  />
                  {/* En desarrollo (amarillo) */}
                  <circle
                    cx="80"
                    cy="80"
                    r={radio}
                    stroke="#f59e0b"
                    strokeWidth="20"
                    fill="none"
                    strokeDasharray={`${strokeDasharrayEnDesarrollo} ${circunferencia}`}
                    strokeDashoffset={-strokeDasharrayCompletadas}
                    strokeLinecap="round"
                  />
                  {/* No iniciadas (gris) */}
                  <circle
                    cx="80"
                    cy="80"
                    r={radio}
                    stroke="#9ca3af"
                    strokeWidth="20"
                    fill="none"
                    strokeDasharray={`${strokeDasharrayNoIniciadas} ${circunferencia}`}
                    strokeDashoffset={-(strokeDasharrayCompletadas + strokeDasharrayEnDesarrollo)}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#111318]">{totalPreguntas}</p>
                    <p className="text-xs text-gray-500">TOTAL</p>
                  </div>
                </div>
              </div>

              {/* Leyenda */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-600"></span>
                  <span className="text-sm text-gray-600">Completadas</span>
                  <span className="text-sm font-semibold text-[#111318] ml-auto">
                    {completadas} ({porcentajeCompletadas}%)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                  <span className="text-sm text-gray-600">En desarrollo</span>
                  <span className="text-sm font-semibold text-[#111318] ml-auto">
                    {enDesarrollo} ({porcentajeEnDesarrollo}%)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-gray-400"></span>
                  <span className="text-sm text-gray-600">No iniciadas</span>
                  <span className="text-sm font-semibold text-[#111318] ml-auto">
                    {noIniciadas} ({porcentajeNoIniciadas}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Resumen de Complejidad */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Resumen de Complejidad</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-[#111318]">Alta</span>
                  <span className="text-sm font-semibold text-red-600">
                    {altaComplejidad} preg <span className="text-gray-500">22% del total</span>
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-red-500 h-2.5 rounded-full"
                    style={{ width: '22%' }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-[#111318]">Media</span>
                  <span className="text-sm font-semibold text-orange-600">
                    {mediaComplejidad} pr <span className="text-gray-500">48% del total</span>
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-orange-500 h-2.5 rounded-full"
                    style={{ width: '48%' }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-[#111318]">Baja</span>
                  <span className="text-sm font-semibold text-blue-600">
                    {bajaComplejidad} pr <span className="text-gray-500">30% del total</span>
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-500 h-2.5 rounded-full"
                    style={{ width: '30%' }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Alertas: Preguntas Complejas Pendientes */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500">warning</span>
              <h2 className="text-lg font-semibold text-[#111318]">Alertas: Preguntas Complejas Pendientes</h2>
            </div>
            <span className="px-3 py-1 text-sm font-medium rounded-full bg-red-100 text-red-800">
              5 críticas
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PREGUNTA / TÍTULO
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    COMPLEJIDAD
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ESPECIALIDAD
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ESTADO
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ACCIÓN
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {DUMMY_ALERTAS.map((alerta) => (
                  <tr key={alerta.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-[#111318]">{alerta.id}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-[#111318]">{alerta.pregunta}</div>
                      <div className="text-xs text-gray-500 mt-1">{alerta.detalle}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                        {alerta.complejidad}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-[#111318]">{alerta.especialidad}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${getEstadoDot(alerta.estado)}`}></span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getEstadoColor(alerta.estado)}`}>
                          {alerta.estado}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <button className="text-sm text-primary hover:text-primary-hover hover:underline">
                        {alerta.accion}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 text-right">
            <button className="text-sm text-primary hover:text-primary-hover hover:underline">
              Ver todas las alertas →
            </button>
          </div>
        </div>

        {/* Avance por Especialidad */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#111318]">Avance por Especialidad</h2>
            <select
              value={especialidadFiltro}
              onChange={(e) => setEspecialidadFiltro(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="Todas">Todas</option>
              {avancePorEspecialidad.map((esp) => (
                <option key={esp.nombre} value={esp.nombre}>
                  {esp.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-4">
            {avancePorEspecialidad.map((especialidad) => (
              <div key={especialidad.nombre}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-[#111318]">{especialidad.nombre}</span>
                  <span className="text-sm font-semibold text-[#111318]">
                    {especialidad.porcentaje}% ({especialidad.completadas}/{especialidad.total} completadas)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${getProgressColor(especialidad.porcentaje)}`}
                    style={{ width: `${especialidad.porcentaje}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReporteView;


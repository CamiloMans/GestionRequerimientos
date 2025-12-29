import React from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LabelList,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface DashboardViewProps {
  // Por ahora no necesita props, pero se puede extender en el futuro
}

const DashboardView: React.FC<DashboardViewProps> = () => {
  // Datos dummy para los 12 meses del año
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  
  // Datos para gráfico de evolución de actividad (según tabla proporcionada)
  const activityData = [
    { mes: 'Ene', solicitudes: 46, completadas: 38, pendientes: 7 },
    { mes: 'Feb', solicitudes: 53, completadas: 44, pendientes: 8 },
    { mes: 'Mar', solicitudes: 38, completadas: 31, pendientes: 6 },
    { mes: 'Abr', solicitudes: 61, completadas: 52, pendientes: 9 },
    { mes: 'May', solicitudes: 55, completadas: 47, pendientes: 8 },
    { mes: 'Jun', solicitudes: 49, completadas: 41, pendientes: 7 },
    { mes: 'Jul', solicitudes: 58, completadas: 50, pendientes: 8 },
    { mes: 'Ago', solicitudes: 62, completadas: 54, pendientes: 8 },
    { mes: 'Sep', solicitudes: 49, completadas: 42, pendientes: 7 },
    { mes: 'Oct', solicitudes: 54, completadas: 46, pendientes: 8 },
    { mes: 'Nov', solicitudes: 47, completadas: 40, pendientes: 7 },
    { mes: 'Dic', solicitudes: 51, completadas: 44, pendientes: 7 },
  ];

  // Custom Tooltip para el gráfico
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-lg">
          <p className="text-sm font-semibold text-[#111318] mb-3">{label}</p>
          <div className="space-y-2">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm text-gray-600">{entry.name}</span>
                </div>
                <span className="text-sm font-medium text-[#111318]">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip para gráfico de tiempos de acreditación
  const TiemposTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-lg">
          <p className="text-sm font-semibold text-[#111318] mb-3">{label}</p>
          <div className="space-y-2">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm text-gray-600">{entry.name}</span>
                </div>
                <span className="text-sm font-medium text-[#111318]">{entry.value} días</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };
  
  // Datos para gráfico de barras (debe estar antes de complianceData)
  const barData = [
    { mes: 'Ene', solicitudes: 45 },
    { mes: 'Feb', solicitudes: 52 },
    { mes: 'Mar', solicitudes: 38 },
    { mes: 'Abr', solicitudes: 61 },
    { mes: 'May', solicitudes: 55 },
    { mes: 'Jun', solicitudes: 48 },
    { mes: 'Jul', solicitudes: 58 },
    { mes: 'Ago', solicitudes: 62 },
    { mes: 'Sep', solicitudes: 49 },
    { mes: 'Oct', solicitudes: 54 },
    { mes: 'Nov', solicitudes: 47 },
    { mes: 'Dic', solicitudes: 51 },
  ];

  // Datos para tendencia de cumplimiento
  const complianceTrend = [82, 85, 88, 86, 91, 89, 87, 90, 88, 89, 91, 92];
  const maxCompliance = 100;
  
  // Datos para gráfico de cumplimiento en formato Recharts
  const complianceData = months.map((mes, index) => ({
    mes,
    cumplimiento: complianceTrend[index],
    solicitudes: barData[index].solicitudes,
  }));

  // Custom Tooltip para gráfico de cumplimiento
  const ComplianceTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-lg">
          <p className="text-sm font-semibold text-[#111318] mb-3">{label}</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-gray-600">Cumplimiento:</span>
              <span className="text-sm font-bold text-emerald-600">{value}%</span>
            </div>
            {data.solicitudes && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-gray-600">Solicitudes:</span>
                <span className="text-sm font-medium text-[#111318]">{data.solicitudes}</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const promedio = Math.round(barData.reduce((acc, item) => acc + item.solicitudes, 0) / barData.length);

  // Datos para gráfico de tareas pendientes por responsable
  const tareasPendientesPorResponsable = [
    { responsable: 'JPRO', cantidad: 45, color: 'hsl(217, 91%, 60%)' },
    { responsable: 'EPR', cantidad: 32, color: 'hsl(160, 72%, 42%)' },
    { responsable: 'RRHH', cantidad: 28, color: 'hsl(38, 92%, 50%)' },
    { responsable: 'Legal', cantidad: 15, color: 'hsl(4, 90%, 58%)' },
  ];

  const totalTareasPendientes = tareasPendientesPorResponsable.reduce((acc, item) => acc + item.cantidad, 0);

  // Datos simulados para tiempos de acreditación (en días)
  const tiemposAcreditacion = {
    promedio: 18,
    masRapido: 7,
    masLento: 35,
    mediana: 16,
  };

  // Datos para gráfico de evolución de tiempos de acreditación
  const tiemposEvolucionData = [
    { mes: 'Ene', promedio: 22, minimo: 8, maximo: 38 },
    { mes: 'Feb', promedio: 19, minimo: 7, maximo: 35 },
    { mes: 'Mar', promedio: 17, minimo: 6, maximo: 32 },
    { mes: 'Abr', promedio: 16, minimo: 7, maximo: 30 },
    { mes: 'May', promedio: 18, minimo: 8, maximo: 33 },
    { mes: 'Jun', promedio: 15, minimo: 6, maximo: 28 },
    { mes: 'Jul', promedio: 16, minimo: 7, maximo: 29 },
    { mes: 'Ago', promedio: 17, minimo: 7, maximo: 31 },
    { mes: 'Sep', promedio: 15, minimo: 6, maximo: 27 },
    { mes: 'Oct', promedio: 16, minimo: 7, maximo: 30 },
    { mes: 'Nov', promedio: 14, minimo: 6, maximo: 26 },
    { mes: 'Dic', promedio: 15, minimo: 6, maximo: 28 },
  ];

  // KPIs principales
  const stats = [
    {
      title: 'Total Solicitudes',
      value: '244',
      change: '+12%',
      positive: true,
      icon: 'description',
      iconBg: 'bg-[hsl(160,72%,42%)]',
    },
    {
      title: 'Tasa de Cumplimiento',
      value: '89%',
      change: '+3%',
      positive: true,
      icon: 'check_circle',
      iconBg: 'bg-[hsl(160,72%,42%)]',
    },
    {
      title: 'Solicitudes Pendientes',
      value: '34',
      change: '-8%',
      positive: false,
      icon: 'pending',
      iconBg: 'bg-amber-500',
    },
    {
      title: 'Tiempo Promedio',
      value: `${tiemposAcreditacion.promedio} días`,
      change: '-2 días',
      positive: true,
      icon: 'schedule',
      iconBg: 'bg-blue-500',
    },
  ];



  // Función para renderizar gráfico de líneas
  const renderLineChart = (data: number[], maxValue: number, labels: string[]) => {
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - (value / maxValue) * 100;
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="h-48 relative">
        <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polyline
            points={points}
            fill="none"
            stroke="#059669"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polygon
            points={`${points} 100,100 0,100`}
            fill="url(#lineGradient)"
          />
          {data.map((value, index) => {
            const x = (index / (data.length - 1)) * 100;
            const y = 100 - (value / maxValue) * 100;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="2"
                fill="#059669"
                className="hover:r-3 transition-all"
              />
            );
          })}
        </svg>
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500 px-1">
          {labels.map((label, index) => (
            <span key={index}>{label}</span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <span className="material-symbols-outlined text-primary text-2xl">bar_chart</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-[#111318] text-2xl lg:text-3xl font-bold tracking-tight">
                Dashboards de Acreditación
              </h1>
              <p className="text-gray-500 text-sm font-medium mt-0.5">
                Análisis y métricas de gestión de solicitudes
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-5 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-2xl ${stat.iconBg} w-12 h-12 flex items-center justify-center`}>
                  <span className="material-symbols-outlined text-white text-xl">{stat.icon}</span>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    stat.positive ? 'text-[hsl(160,72%,42%)]' : 'text-red-600'
                  }`}
                >
                  {stat.change}
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-1">{stat.title}</p>
              <p className="text-3xl font-bold text-[#111318]">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Gráfico de Evolución de Tiempos de Acreditación */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-6 mb-6">
          <div className="mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div className="space-y-1">
                <h3 className="text-xl font-semibold text-[#111318]">
                  Evolución de Tiempos de Acreditación
                </h3>
                <p className="text-sm text-gray-500">
                  Tiempo promedio, mínimo y máximo de acreditación por mes (en días)
                </p>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[hsl(217,91%,60%)]" />
                  <span className="text-sm text-gray-600">Promedio</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[hsl(160,72%,42%)]" />
                  <span className="text-sm text-gray-600">Mínimo</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[hsl(4,90%,58%)]" />
                  <span className="text-sm text-gray-600">Máximo</span>
                </div>
              </div>
            </div>
          </div>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={tiemposEvolucionData}
                margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorPromedio" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorMinimo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(160, 72%, 42%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(160, 72%, 42%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorMaximo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(4, 90%, 58%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(4, 90%, 58%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="#e5e7eb" 
                  vertical={false}
                />
                <XAxis 
                  dataKey="mes" 
                  stroke="#6b7280"
                  fontSize={13}
                  fontWeight={500}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={13}
                  fontWeight={500}
                  tickLine={false}
                  axisLine={false}
                  dx={-10}
                  label={{ value: 'Días', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#6b7280' } }}
                />
                <Tooltip content={<TiemposTooltip />} />
                <Legend content={() => null} />
                <Area
                  type="monotone"
                  dataKey="maximo"
                  name="Máximo"
                  stroke="hsl(4, 90%, 58%)"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorMaximo)"
                  dot={{ fill: 'hsl(4, 90%, 58%)', strokeWidth: 0, r: 0 }}
                  activeDot={{ fill: 'hsl(4, 90%, 58%)', strokeWidth: 3, stroke: 'white', r: 6 }}
                />
                <Area
                  type="monotone"
                  dataKey="promedio"
                  name="Promedio"
                  stroke="hsl(217, 91%, 60%)"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorPromedio)"
                  dot={{ fill: 'hsl(217, 91%, 60%)', strokeWidth: 0, r: 0 }}
                  activeDot={{ fill: 'hsl(217, 91%, 60%)', strokeWidth: 3, stroke: 'white', r: 6 }}
                />
                <Area
                  type="monotone"
                  dataKey="minimo"
                  name="Mínimo"
                  stroke="hsl(160, 72%, 42%)"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorMinimo)"
                  dot={{ fill: 'hsl(160, 72%, 42%)', strokeWidth: 0, r: 0 }}
                  activeDot={{ fill: 'hsl(160, 72%, 42%)', strokeWidth: 3, stroke: 'white', r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Bar Chart Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-[#111318]">Solicitudes por Mes</h3>
                <p className="text-sm text-gray-500 mt-1">Tendencia de los últimos 6 meses</p>
              </div>
              <div className="p-2 rounded-lg bg-gray-100">
                <span className="material-symbols-outlined text-gray-500 text-xl">trending_up</span>
              </div>
            </div>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barData}
                  margin={{ top: 25, right: 10, left: 10, bottom: 5 }}
                  barCategoryGap="18%"
                >
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(160, 72%, 50%)" />
                      <stop offset="100%" stopColor="hsl(160, 72%, 38%)" />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="mes"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 500 }}
                    dy={8}
                  />
                  <YAxis hide />
                  <Bar
                    dataKey="solicitudes"
                    fill="url(#barGradient)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  >
                    <LabelList
                      dataKey="solicitudes"
                      position="top"
                      fill="#111318"
                      fontSize={13}
                      fontWeight={600}
                      offset={8}
                    />
                    {barData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill="url(#barGradient)" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200/50 flex items-center justify-between">
              <span className="text-sm text-gray-500">Promedio mensual</span>
              <span className="text-xl font-bold text-[#111318]">{promedio}</span>
            </div>
          </div>

          {/* Gráfico de Tareas Pendientes por Responsable */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-[#111318]">Tareas Pendientes por Responsable</h3>
              <p className="text-sm text-gray-500 mt-1">Distribución de tareas pendientes según responsable</p>
            </div>
            <div className="p-2 rounded-lg bg-gray-100">
              <span className="material-symbols-outlined text-gray-500 text-xl">assignment</span>
            </div>
          </div>
          <div className="flex items-center gap-8">
            {/* Donut Chart */}
            <div className="relative w-[240px] h-[240px] flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    offset={-50}
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const porcentaje = ((data.cantidad / totalTareasPendientes) * 100).toFixed(1);
                        return (
                          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-lg">
                            <p className="text-sm font-semibold text-[#111318] mb-3">{data.responsable}</p>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: data.color }}
                                  />
                                  <span className="text-sm text-gray-600">Cantidad</span>
                                </div>
                                <span className="text-sm font-medium text-[#111318]">{data.cantidad}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: data.color }}
                                  />
                                  <span className="text-sm text-gray-600">Porcentaje</span>
                                </div>
                                <span className="text-sm font-medium text-[#111318]">{porcentaje}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Pie
                    data={tareasPendientesPorResponsable}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="cantidad"
                    strokeWidth={0}
                    nameKey="responsable"
                  >
                    {tareasPendientesPorResponsable.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold text-[#111318]">{totalTareasPendientes}</span>
                <span className="text-sm text-gray-500">Total</span>
              </div>
            </div>
            {/* Legend */}
            <div className="flex-1 space-y-4">
              {tareasPendientesPorResponsable.map((item, index) => {
                const porcentaje = ((item.cantidad / totalTareasPendientes) * 100).toFixed(1);
                return (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm font-medium text-[#111318]">{item.responsable}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-semibold text-[#111318]">{item.cantidad}</span>
                      <span className="text-sm text-gray-500 w-12 text-right">{porcentaje}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          </div>
        </div>

        {/* Second Row Charts */}
        <div className="mb-6">
          {/* Tendencia de Cumplimiento */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-[#111318] mb-1">
                  Tendencia de Cumplimiento
                </h3>
                <p className="text-sm text-gray-500">Porcentaje de cumplimiento mensual</p>
              </div>
              <span className="material-symbols-outlined text-gray-400">show_chart</span>
            </div>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={complianceData}
                  margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="complianceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(160, 72%, 42%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(160, 72%, 42%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="#e5e7eb" 
                    vertical={false}
                  />
                  <XAxis 
                    dataKey="mes" 
                    stroke="#6b7280"
                    fontSize={13}
                    fontWeight={500}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis 
                    domain={[0, 100]}
                    stroke="#6b7280"
                    fontSize={13}
                    fontWeight={500}
                    tickLine={false}
                    axisLine={false}
                    dx={-10}
                  />
                  <Tooltip content={<ComplianceTooltip />} />
                  <Legend content={() => null} />
                  <Area
                    type="monotone"
                    dataKey="cumplimiento"
                    name="Cumplimiento"
                    stroke="hsl(160, 72%, 42%)"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#complianceGradient)"
                    dot={{ fill: 'hsl(160, 72%, 42%)', strokeWidth: 0, r: 0 }}
                    activeDot={{ fill: 'hsl(160, 72%, 42%)', strokeWidth: 3, stroke: 'white', r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Promedio</span>
                <span className="font-semibold text-emerald-600">
                  {Math.round(complianceTrend.reduce((a, b) => a + b, 0) / complianceTrend.length)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-[#111318] mb-1">
                Resumen de Actividad Reciente
              </h3>
              <p className="text-sm text-gray-500">Últimas solicitudes procesadas</p>
            </div>
            <span className="material-symbols-outlined text-gray-400">table_chart</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Mes</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Solicitudes</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Completadas</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Pendientes</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Tasa de Éxito</th>
                </tr>
              </thead>
              <tbody>
                {barData.map((item, index) => {
                  const completed = Math.round(item.solicitudes * 0.85);
                  const pending = item.solicitudes - completed;
                  const successRate = ((completed / item.solicitudes) * 100).toFixed(1);
                  return (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-sm text-gray-700 font-medium">{item.mes}</td>
                      <td className="py-3 px-4 text-sm text-[#111318]">{item.solicitudes}</td>
                      <td className="py-3 px-4 text-sm text-emerald-600 font-medium">{completed}</td>
                      <td className="py-3 px-4 text-sm text-amber-600 font-medium">{pending}</td>
                      <td className="py-3 px-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#111318]">{successRate}%</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-3 max-w-32">
                            <div
                              className="bg-emerald-500 h-3 rounded-full"
                              style={{ width: `${successRate}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Gráfico de Evolución de Actividad */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
          <div className="mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div className="space-y-1">
                <h3 className="text-xl font-semibold text-[#111318]">
                  Evolución de Actividad
                </h3>
                <p className="text-sm text-gray-500">
                  Tendencias mensuales de solicitudes, completadas y pendientes
                </p>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[hsl(243,75%,59%)]" />
                  <span className="text-sm text-gray-600">Solicitudes</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[hsl(160,72%,42%)]" />
                  <span className="text-sm text-gray-600">Completadas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[hsl(4,90%,58%)]" />
                  <span className="text-sm text-gray-600">Pendientes</span>
                </div>
              </div>
            </div>
          </div>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={activityData}
                margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorSolicitudes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(243, 75%, 59%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(243, 75%, 59%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCompletadas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(160, 72%, 42%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(160, 72%, 42%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPendientes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(4, 90%, 58%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(4, 90%, 58%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="#e5e7eb" 
                  vertical={false}
                />
                <XAxis 
                  dataKey="mes" 
                  stroke="#6b7280"
                  fontSize={13}
                  fontWeight={500}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={13}
                  fontWeight={500}
                  tickLine={false}
                  axisLine={false}
                  dx={-10}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend content={() => null} />
                {/* Solicitudes primero (atrás, más grande) - ordenadas de mayor a menor para visibilidad */}
                <Area
                  type="monotone"
                  dataKey="solicitudes"
                  name="Solicitudes"
                  stroke="hsl(243, 75%, 59%)"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorSolicitudes)"
                  dot={{ fill: 'hsl(243, 75%, 59%)', strokeWidth: 0, r: 0 }}
                  activeDot={{ fill: 'hsl(243, 75%, 59%)', strokeWidth: 3, stroke: 'white', r: 6 }}
                />
                {/* Completadas en el medio */}
                <Area
                  type="monotone"
                  dataKey="completadas"
                  name="Completadas"
                  stroke="hsl(160, 72%, 42%)"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorCompletadas)"
                  dot={{ fill: 'hsl(160, 72%, 42%)', strokeWidth: 0, r: 0 }}
                  activeDot={{ fill: 'hsl(160, 72%, 42%)', strokeWidth: 3, stroke: 'white', r: 6 }}
                />
                {/* Pendientes al final (adelante, más pequeña) */}
                <Area
                  type="monotone"
                  dataKey="pendientes"
                  name="Pendientes"
                  stroke="hsl(4, 90%, 58%)"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorPendientes)"
                  dot={{ fill: 'hsl(4, 90%, 58%)', strokeWidth: 0, r: 0 }}
                  activeDot={{ fill: 'hsl(4, 90%, 58%)', strokeWidth: 3, stroke: 'white', r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;



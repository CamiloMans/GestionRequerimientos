import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

interface Pregunta {
  id: string;
  estado: 'En revisión' | 'Pendientes' | 'Completadas';
  complejidad: 'Baja' | 'Media' | 'Alta';
  pregunta: string;
  adjuntos: number;
  encargado: {
    nombre: string;
    avatar?: string;
  };
  especialidad: string;
  estrategia: string[];
  respuesta_ia: string;
}

/**
 * Datos dummy para la gestión de adenda
 */
const DUMMY_PREGUNTAS: Pregunta[] = [
  {
    id: '018',
    estado: 'En revisión',
    complejidad: 'Media',
    pregunta: 'Respecto a las partes, obras y acciones del Proyecto, se solicita adjuntar un cuadro consolidado que detalle claramente las... Ver completo',
    adjuntos: 2,
    encargado: {
      nombre: 'PT Paula Olivares',
    },
    especialidad: 'Descripción proyecto',
    estrategia: [
      'Consolidar en una tabla maestra POA-Fase.',
      'Definir Parte/Obra, Acción, Fase.',
    ],
    respuesta_ia: 'BORRADOR IA Se adjunta un cuad Acciones que detal actividades a ejecu Se incluye la totalid',
  },
  {
    id: '016',
    estado: 'En revisión',
    complejidad: 'Alta',
    pregunta: 'Se solicita al Titular fundamentar técnica y cuantitativamente que la configuración geométrica y estructural del Depósito de... Ver completo',
    adjuntos: 1,
    encargado: {
      nombre: 'EG Eduardo G.',
    },
    especialidad: 'Permisos sectoriales',
    estrategia: [
      'Delimitar sector poniente con referencia a figura.',
      'Presentar paquete técnico trazable.',
    ],
    respuesta_ia: 'BORRADOR IA Se fundamenta téci configuración geon Relaves asegura la en el costado ponie',
  },
  {
    id: '015',
    estado: 'Pendientes',
    complejidad: 'Baja',
    pregunta: 'Se requiere información adicional sobre el impacto ambiental del proyecto... Ver completo',
    adjuntos: 0,
    encargado: {
      nombre: 'PT Paula Olivares',
    },
    especialidad: 'Impacto ambiental',
    estrategia: [
      'Recopilar datos de estudios previos.',
      'Preparar informe consolidado.',
    ],
    respuesta_ia: 'BORRADOR IA Se requiere información adicional sobre el impacto ambiental...',
  },
  {
    id: '014',
    estado: 'Completadas',
    complejidad: 'Media',
    pregunta: 'Solicitud de aclaración sobre los plazos de ejecución del proyecto... Ver completo',
    adjuntos: 1,
    encargado: {
      nombre: 'EG Eduardo G.',
    },
    especialidad: 'Planificación',
    estrategia: [
      'Revisar cronograma detallado.',
      'Actualizar documentación.',
    ],
    respuesta_ia: 'BORRADOR IA Los plazos de ejecución se han actualizado según el cronograma...',
  },
];

const GestionAdendaView: React.FC = () => {
  const navigate = useNavigate();
  const { codigoMyma } = useParams<{ codigoMyma: string }>();
  const [searchTerm, setSearchTerm] = useState('');
  const [preguntas] = useState<Pregunta[]>(DUMMY_PREGUNTAS);

  const handleBack = () => {
    navigate('');
  };

  const handleNuevaPregunta = () => {
    // TODO: Implementar creación de nueva pregunta
    console.log('Nueva pregunta');
  };

  const handlePreguntaClick = (preguntaId: string) => {
    if (codigoMyma) {
      navigate(`pregunta/${preguntaId}`);
    } else {
      navigate(`pregunta/${preguntaId}`);
    }
  };

  // Calcular estadísticas
  const enRevision = preguntas.filter(p => p.estado === 'En revisión').length;
  const pendientes = preguntas.filter(p => p.estado === 'Pendientes').length;
  const completadas = preguntas.filter(p => p.estado === 'Completadas').length;
  const total = preguntas.length;
  const avanceGlobal = total > 0 ? Math.round((completadas / total) * 100) : 0;

  const baja = preguntas.filter(p => p.complejidad === 'Baja').length;
  const media = preguntas.filter(p => p.complejidad === 'Media').length;
  const alta = preguntas.filter(p => p.complejidad === 'Alta').length;

  const filteredPreguntas = preguntas.filter((pregunta) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      pregunta.id.toLowerCase().includes(searchLower) ||
      pregunta.pregunta.toLowerCase().includes(searchLower) ||
      pregunta.encargado.nombre.toLowerCase().includes(searchLower) ||
      pregunta.especialidad.toLowerCase().includes(searchLower)
    );
  });

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'En revisión':
        return 'bg-gray-100 text-gray-800';
      case 'Pendientes':
        return 'bg-yellow-100 text-yellow-800';
      case 'Completadas':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getComplejidadColor = (complejidad: string) => {
    switch (complejidad) {
      case 'Baja':
        return 'bg-green-100 text-green-800';
      case 'Media':
        return 'bg-purple-100 text-purple-800';
      case 'Alta':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEspecialidadColor = (especialidad: string) => {
    if (especialidad.includes('proyecto')) return 'bg-orange-100 text-orange-800';
    if (especialidad.includes('sectoriales')) return 'bg-blue-100 text-blue-800';
    if (especialidad.includes('ambiental')) return 'bg-green-100 text-green-800';
    if (especialidad.includes('Planificación')) return 'bg-indigo-100 text-indigo-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="w-full p-6 bg-[#f8fafc] min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-[#111318] mb-4 transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            <span>Volver</span>
          </button>
          <div>
            <h1 className="text-3xl font-bold text-[#111318] mb-2">Gestión de Adenda</h1>
            <p className="text-gray-600">Monitoreo y respuesta de observaciones ICSARA</p>
          </div>
        </div>

        {/* Top Bar with Search and Actions */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 max-w-md w-full">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Buscar en Adenda..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="material-symbols-outlined text-sm">refresh</span>
                <span>Última actualización: Hoy, 10:45 AM</span>
              </div>
              <button
                onClick={handleNuevaPregunta}
                className="flex items-center gap-2 px-4 py-2 bg-[#059669] text-white rounded-lg hover:bg-[#047857] transition-colors"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                <span>Nueva Pregunta</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Estado de Preguntas */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Estado de Preguntas</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                  <span className="text-sm text-gray-600">En revisión</span>
                </div>
                <span className="text-sm font-semibold text-[#111318]">{enRevision}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                  <span className="text-sm text-gray-600">Pendientes</span>
                </div>
                <span className="text-sm font-semibold text-[#111318]">{pendientes}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400"></span>
                  <span className="text-sm text-gray-600">Completadas</span>
                </div>
                <span className="text-sm font-semibold text-[#111318]">{completadas}</span>
              </div>
            </div>
          </div>

          {/* Progreso de Adenda */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Progreso de Adenda</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-[#111318] mb-1">{avanceGlobal}%</p>
                <p className="text-xs text-gray-500">Avance global</p>
                <p className="text-xs text-green-600 mt-1">↑+12% esta semana</p>
              </div>
              <div className="relative w-20 h-20">
                <svg className="transform -rotate-90 w-20 h-20">
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="#e5e7eb"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="#059669"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 36}`}
                    strokeDashoffset={`${2 * Math.PI * 36 * (1 - avanceGlobal / 100)}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-semibold text-[#111318]">{avanceGlobal}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Complejidad de Preguntas */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">Complejidad de Preguntas</h3>
              <div className="text-xs text-gray-500">
                <span className="font-medium">Fecha de Ingreso</span>
                <br />
                <span>18/02 2026</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400"></span>
                  <span className="text-sm text-gray-600">Baja</span>
                </div>
                <span className="text-sm font-semibold text-[#111318]">{baja}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                  <span className="text-sm text-gray-600">Media</span>
                </div>
                <span className="text-sm font-semibold text-[#111318]">{media}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400"></span>
                  <span className="text-sm text-gray-600">Alta</span>
                </div>
                <span className="text-sm font-semibold text-[#111318]">{alta}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Table Header with Filters */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                <span className="material-symbols-outlined text-sm">filter_list</span>
                <span>Filtros</span>
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                <span className="material-symbols-outlined text-sm">sort</span>
                <span>Ordenar</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ESTADO
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    COMPLEJIDAD
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PREGUNTA
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ADJUNTOS
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ENCARGADO
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ESPECIALIDAD
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ESTRATEGIA
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    RESPUESTA IA
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPreguntas.map((pregunta) => (
                  <tr 
                    key={pregunta.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handlePreguntaClick(pregunta.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-[#111318]">{pregunta.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getEstadoColor(pregunta.estado)}`}>
                        {pregunta.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getComplejidadColor(pregunta.complejidad)}`}>
                        {pregunta.complejidad}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-[#111318] max-w-md">
                        {pregunta.pregunta}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {pregunta.adjuntos > 0 && (
                          <>
                            <span className="material-symbols-outlined text-gray-400 text-sm">description</span>
                            {pregunta.adjuntos > 1 && (
                              <span className="material-symbols-outlined text-gray-400 text-sm">image</span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-blue-500 flex items-center justify-center text-white text-xs font-semibold">
                          {pregunta.encargado.nombre.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </div>
                        <span className="text-sm text-[#111318]">{pregunta.encargado.nombre}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getEspecialidadColor(pregunta.especialidad)}`}>
                        {pregunta.especialidad}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-[#111318] max-w-xs">
                        <ul className="list-disc list-inside space-y-1">
                          {pregunta.estrategia.map((estrategia, idx) => (
                            <li key={idx} className="text-xs">{estrategia}</li>
                          ))}
                        </ul>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-600 max-w-xs">
                        {pregunta.respuesta_ia}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Mostrando 1 a {filteredPreguntas.length} de {filteredPreguntas.length} resultados
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm">
                &lt;
              </button>
              <button className="px-3 py-1 bg-primary text-white rounded-lg text-sm">1</button>
              <button className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm">2</button>
              <button className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm">3</button>
              <button className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm">
                &gt;
              </button>
              <button className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm">
                <span className="material-symbols-outlined text-sm">help</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GestionAdendaView;


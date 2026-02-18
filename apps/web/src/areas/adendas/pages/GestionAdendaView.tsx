import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adendasList, adendasPregunta } from '../utils/routes';

type EstadoPregunta = 'En revisión' | 'Pendientes' | 'Completadas';
type ComplejidadPregunta = 'Baja' | 'Media' | 'Alta';
type SortField = 'id' | 'estado' | 'complejidad';
type SortDirection = 'asc' | 'desc';

interface Pregunta {
  id: string;
  estado: EstadoPregunta;
  complejidad: ComplejidadPregunta;
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

interface FiltrosPregunta {
  estado: 'Todos' | EstadoPregunta;
  complejidad: 'Todas' | ComplejidadPregunta;
  especialidad: 'Todas' | string;
}

interface NuevaPreguntaForm {
  id: string;
  estado: EstadoPregunta;
  complejidad: ComplejidadPregunta;
  pregunta: string;
  adjuntos: number;
  encargadoNombre: string;
  especialidad: string;
  estrategia: string;
  respuestaIA: string;
}

const DUMMY_PREGUNTAS: Pregunta[] = [
  {
    id: '018',
    estado: 'En revisión',
    complejidad: 'Media',
    pregunta:
      'Respecto a las partes, obras y acciones del Proyecto, se solicita adjuntar un cuadro consolidado que detalle claramente las... Ver completo',
    adjuntos: 2,
    encargado: { nombre: 'PT Paula Olivares' },
    especialidad: 'Descripción proyecto',
    estrategia: ['Consolidar en una tabla maestra POA-Fase.', 'Definir Parte/Obra, Acción, Fase.'],
    respuesta_ia: 'BORRADOR IA Se adjunta un cuadro de acciones por fase con trazabilidad del proyecto.',
  },
  {
    id: '016',
    estado: 'En revisión',
    complejidad: 'Alta',
    pregunta:
      'Se solicita al Titular fundamentar técnica y cuantitativamente que la configuración geométrica y estructural del Depósito de... Ver completo',
    adjuntos: 1,
    encargado: { nombre: 'EG Eduardo G.' },
    especialidad: 'Permisos sectoriales',
    estrategia: ['Delimitar sector poniente con referencia a figura.', 'Presentar paquete técnico trazable.'],
    respuesta_ia: 'BORRADOR IA Se fundamenta técnicamente la configuración geométrica para asegurar estabilidad.',
  },
  {
    id: '015',
    estado: 'Pendientes',
    complejidad: 'Baja',
    pregunta:
      'Se requiere información adicional sobre el impacto ambiental del proyecto... Ver completo',
    adjuntos: 0,
    encargado: { nombre: 'PT Paula Olivares' },
    especialidad: 'Impacto ambiental',
    estrategia: ['Recopilar datos de estudios previos.', 'Preparar informe consolidado.'],
    respuesta_ia: 'BORRADOR IA Se requiere información adicional sobre el impacto ambiental.',
  },
  {
    id: '014',
    estado: 'Completadas',
    complejidad: 'Media',
    pregunta: 'Solicitud de aclaración sobre los plazos de ejecución del proyecto... Ver completo',
    adjuntos: 1,
    encargado: { nombre: 'EG Eduardo G.' },
    especialidad: 'Planificación',
    estrategia: ['Revisar cronograma detallado.', 'Actualizar documentación.'],
    respuesta_ia: 'BORRADOR IA Los plazos de ejecución se actualizaron según cronograma.',
  },
];

const SORT_SEQUENCE: SortField[] = ['id', 'estado', 'complejidad'];

const emptyNuevaPregunta: NuevaPreguntaForm = {
  id: '',
  estado: 'Pendientes',
  complejidad: 'Media',
  pregunta: '',
  adjuntos: 0,
  encargadoNombre: '',
  especialidad: '',
  estrategia: '',
  respuestaIA: '',
};

const GestionAdendaView: React.FC = () => {
  const navigate = useNavigate();
  const { codigoMyma } = useParams<{ codigoMyma: string }>();
  const [searchTerm, setSearchTerm] = useState('');
  const [preguntas, setPreguntas] = useState<Pregunta[]>(DUMMY_PREGUNTAS);
  const [filtros, setFiltros] = useState<FiltrosPregunta>({
    estado: 'Todos',
    complejidad: 'Todas',
    especialidad: 'Todas',
  });
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showFilters, setShowFilters] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showNewPreguntaModal, setShowNewPreguntaModal] = useState(false);
  const [newPreguntaForm, setNewPreguntaForm] = useState<NuevaPreguntaForm>(emptyNuevaPregunta);
  const [newPreguntaError, setNewPreguntaError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const especialidadesDisponibles = useMemo(() => {
    return Array.from(new Set(preguntas.map((pregunta) => pregunta.especialidad)));
  }, [preguntas]);

  const filteredPreguntas = useMemo(() => {
    const searchLower = searchTerm.trim().toLowerCase();
    return preguntas.filter((pregunta) => {
      const matchSearch =
        !searchLower ||
        pregunta.id.toLowerCase().includes(searchLower) ||
        pregunta.pregunta.toLowerCase().includes(searchLower) ||
        pregunta.encargado.nombre.toLowerCase().includes(searchLower) ||
        pregunta.especialidad.toLowerCase().includes(searchLower);

      const matchEstado = filtros.estado === 'Todos' || pregunta.estado === filtros.estado;
      const matchComplejidad =
        filtros.complejidad === 'Todas' || pregunta.complejidad === filtros.complejidad;
      const matchEspecialidad =
        filtros.especialidad === 'Todas' || pregunta.especialidad === filtros.especialidad;

      return matchSearch && matchEstado && matchComplejidad && matchEspecialidad;
    });
  }, [preguntas, searchTerm, filtros]);

  const sortedPreguntas = useMemo(() => {
    const items = [...filteredPreguntas];
    items.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'id') comparison = a.id.localeCompare(b.id, undefined, { numeric: true });
      if (sortField === 'estado') comparison = a.estado.localeCompare(b.estado);
      if (sortField === 'complejidad') {
        const rank: Record<ComplejidadPregunta, number> = { Baja: 1, Media: 2, Alta: 3 };
        comparison = rank[a.complejidad] - rank[b.complejidad];
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return items;
  }, [filteredPreguntas, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedPreguntas.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filtros, sortField, sortDirection]);

  const paginatedPreguntas = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedPreguntas.slice(start, start + pageSize);
  }, [sortedPreguntas, currentPage]);

  const visiblePages = useMemo(() => {
    const maxPages = 5;
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + maxPages - 1);
    const adjustedStart = Math.max(1, end - maxPages + 1);
    return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index);
  }, [currentPage, totalPages]);

  const handleBack = () => {
    navigate(adendasList());
  };

  const handleNuevaPregunta = () => {
    setNewPreguntaForm(emptyNuevaPregunta);
    setNewPreguntaError(null);
    setShowNewPreguntaModal(true);
  };

  const handlePreguntaClick = (preguntaId: string) => {
    if (!codigoMyma) {
      navigate(adendasList());
      return;
    }
    navigate(adendasPregunta(codigoMyma, preguntaId));
  };

  const handleSortClick = () => {
    const currentFieldIndex = SORT_SEQUENCE.indexOf(sortField);
    const nextField = SORT_SEQUENCE[(currentFieldIndex + 1) % SORT_SEQUENCE.length];
    setSortField(nextField);
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  const handleClearFilters = () => {
    setFiltros({ estado: 'Todos', complejidad: 'Todas', especialidad: 'Todas' });
  };

  const handleSaveNuevaPregunta = (event: React.FormEvent) => {
    event.preventDefault();
    setNewPreguntaError(null);

    const trimmedId = newPreguntaForm.id.trim();
    const trimmedPregunta = newPreguntaForm.pregunta.trim();
    const trimmedEncargado = newPreguntaForm.encargadoNombre.trim();
    const trimmedEspecialidad = newPreguntaForm.especialidad.trim();

    if (!trimmedId || !trimmedPregunta || !trimmedEncargado || !trimmedEspecialidad) {
      setNewPreguntaError('Completa ID, pregunta, encargado y especialidad.');
      return;
    }

    if (preguntas.some((pregunta) => pregunta.id === trimmedId)) {
      setNewPreguntaError('El ID ya existe. Usa un ID distinto.');
      return;
    }

    const estrategia = newPreguntaForm.estrategia
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const nuevaPregunta: Pregunta = {
      id: trimmedId,
      estado: newPreguntaForm.estado,
      complejidad: newPreguntaForm.complejidad,
      pregunta: trimmedPregunta,
      adjuntos: Number.isFinite(newPreguntaForm.adjuntos)
        ? Math.max(0, newPreguntaForm.adjuntos)
        : 0,
      encargado: { nombre: trimmedEncargado },
      especialidad: trimmedEspecialidad,
      estrategia: estrategia.length > 0 ? estrategia : ['Sin estrategia registrada en esta pregunta.'],
      respuesta_ia:
        newPreguntaForm.respuestaIA.trim() ||
        'BORRADOR IA pendiente de redacción para esta pregunta.',
    };

    setPreguntas((prev) => [nuevaPregunta, ...prev]);
    setShowNewPreguntaModal(false);
    setNewPreguntaForm(emptyNuevaPregunta);
    setCurrentPage(1);
  };

  const enRevision = preguntas.filter((pregunta) => pregunta.estado === 'En revisión').length;
  const pendientes = preguntas.filter((pregunta) => pregunta.estado === 'Pendientes').length;
  const completadas = preguntas.filter((pregunta) => pregunta.estado === 'Completadas').length;
  const total = preguntas.length;
  const avanceGlobal = total > 0 ? Math.round((completadas / total) * 100) : 0;

  const baja = preguntas.filter((pregunta) => pregunta.complejidad === 'Baja').length;
  const media = preguntas.filter((pregunta) => pregunta.complejidad === 'Media').length;
  const alta = preguntas.filter((pregunta) => pregunta.complejidad === 'Alta').length;

  const getEstadoColor = (estado: EstadoPregunta) => {
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

  const getComplejidadColor = (complejidad: ComplejidadPregunta) => {
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
    if (especialidad.toLowerCase().includes('proyecto')) return 'bg-orange-100 text-orange-800';
    if (especialidad.toLowerCase().includes('sectoriales')) return 'bg-blue-100 text-blue-800';
    if (especialidad.toLowerCase().includes('ambiental')) return 'bg-green-100 text-green-800';
    if (especialidad.toLowerCase().includes('planificación')) return 'bg-indigo-100 text-indigo-800';
    return 'bg-gray-100 text-gray-800';
  };

  const resultStart = sortedPreguntas.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const resultEnd = Math.min(currentPage * pageSize, sortedPreguntas.length);

  return (
    <div className="w-full p-6 bg-[#f8fafc] min-h-screen">
      <div className="max-w-7xl mx-auto">
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
                  onChange={(event) => setSearchTerm(event.target.value)}
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Progreso de Adenda</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-[#111318] mb-1">{avanceGlobal}%</p>
                <p className="text-xs text-gray-500">Avance global</p>
                <p className="text-xs text-green-600 mt-1">+12% esta semana</p>
              </div>
              <div className="relative w-20 h-20">
                <svg className="transform -rotate-90 w-20 h-20">
                  <circle cx="40" cy="40" r="36" stroke="#e5e7eb" strokeWidth="8" fill="none" />
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

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">Complejidad de Preguntas</h3>
              <div className="text-xs text-gray-500">
                <span className="font-medium">Fecha de Ingreso</span>
                <br />
                <span>18/02/2026</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between"><span className="text-sm text-gray-600">Baja</span><span className="text-sm font-semibold text-[#111318]">{baja}</span></div>
              <div className="flex items-center justify-between"><span className="text-sm text-gray-600">Media</span><span className="text-sm font-semibold text-[#111318]">{media}</span></div>
              <div className="flex items-center justify-between"><span className="text-sm text-gray-600">Alta</span><span className="text-sm font-semibold text-[#111318]">{alta}</span></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={() => setShowFilters((prev) => !prev)} className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                  <span className="material-symbols-outlined text-sm">filter_list</span>
                  <span>Filtros</span>
                </button>
                <button onClick={handleSortClick} className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                  <span className="material-symbols-outlined text-sm">sort</span>
                  <span>Ordenar: {sortField}</span>
                  <span className="text-xs text-gray-500 uppercase">{sortDirection}</span>
                </button>
              </div>
              <button onClick={() => setShowHelpModal(true)} className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm">
                <span className="material-symbols-outlined text-sm">help</span>
              </button>
            </div>
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
                <select
                  value={filtros.estado}
                  onChange={(event) =>
                    setFiltros((prev) => ({ ...prev, estado: event.target.value as FiltrosPregunta['estado'] }))
                  }
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="Todos">Estado: Todos</option>
                  <option value="En revisión">En revisión</option>
                  <option value="Pendientes">Pendientes</option>
                  <option value="Completadas">Completadas</option>
                </select>

                <select
                  value={filtros.complejidad}
                  onChange={(event) =>
                    setFiltros((prev) => ({
                      ...prev,
                      complejidad: event.target.value as FiltrosPregunta['complejidad'],
                    }))
                  }
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="Todas">Complejidad: Todas</option>
                  <option value="Baja">Baja</option>
                  <option value="Media">Media</option>
                  <option value="Alta">Alta</option>
                </select>

                <select
                  value={filtros.especialidad}
                  onChange={(event) =>
                    setFiltros((prev) => ({ ...prev, especialidad: event.target.value }))
                  }
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="Todas">Especialidad: Todas</option>
                  {especialidadesDisponibles.map((especialidad) => (
                    <option key={especialidad} value={especialidad}>
                      {especialidad}
                    </option>
                  ))}
                </select>

                <button onClick={handleClearFilters} className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Complejidad</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pregunta</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Adjuntos</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Encargado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Especialidad</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estrategia</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Respuesta IA</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedPreguntas.map((pregunta) => (
                  <tr key={pregunta.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handlePreguntaClick(pregunta.id)}>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-[#111318]">{pregunta.id}</div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${getEstadoColor(pregunta.estado)}`}>{pregunta.estado}</span></td>
                    <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${getComplejidadColor(pregunta.complejidad)}`}>{pregunta.complejidad}</span></td>
                    <td className="px-6 py-4 max-w-xs"><div className="text-sm text-[#111318] truncate" title={pregunta.pregunta}>{pregunta.pregunta}</div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center gap-2">{pregunta.adjuntos > 0 && (<><span className="material-symbols-outlined text-gray-400 text-sm">description</span>{pregunta.adjuntos > 1 && <span className="material-symbols-outlined text-gray-400 text-sm">image</span>}</>)}</div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-blue-500 flex items-center justify-center text-white text-xs font-semibold">{pregunta.encargado.nombre.split(' ').map((name) => name[0]).join('').substring(0, 2)}</div><span className="text-sm text-[#111318]">{pregunta.encargado.nombre}</span></div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-medium rounded-full ${getEspecialidadColor(pregunta.especialidad)}`}>{pregunta.especialidad}</span></td>
                    <td className="px-6 py-4"><div className="text-sm text-[#111318] max-w-xs"><ul className="list-disc list-inside space-y-1">{pregunta.estrategia.map((estrategia, index) => (<li key={index} className="text-xs">{estrategia}</li>))}</ul></div></td>
                    <td className="px-6 py-4"><div className="text-xs text-gray-600 max-w-xs">{pregunta.respuesta_ia}</div></td>
                  </tr>
                ))}
                {paginatedPreguntas.length === 0 && (
                  <tr>
                    <td className="px-6 py-8 text-sm text-gray-500 text-center" colSpan={9}>
                      No hay preguntas para los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">Mostrando {resultStart} a {resultEnd} de {sortedPreguntas.length} resultados</div>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1} className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm disabled:opacity-50 disabled:cursor-not-allowed">&lt;</button>
              {visiblePages.map((page) => (
                <button key={page} onClick={() => setCurrentPage(page)} className={`px-3 py-1 rounded-lg text-sm ${currentPage === page ? 'bg-primary text-white' : 'border border-gray-200 hover:bg-gray-50'}`}>
                  {page}
                </button>
              ))}
              <button onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm disabled:opacity-50 disabled:cursor-not-allowed">&gt;</button>
              <button onClick={() => setShowHelpModal(true)} className="px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm"><span className="material-symbols-outlined text-sm">help</span></button>
            </div>
          </div>
        </div>
      </div>

      {showNewPreguntaModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowNewPreguntaModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-2xl border border-gray-200 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <form onSubmit={handleSaveNuevaPregunta} className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[#111318]">Nueva Pregunta</h2>
                <button type="button" onClick={() => setShowNewPreguntaModal(false)} className="p-1 rounded hover:bg-gray-100">
                  <span className="material-symbols-outlined text-gray-500">close</span>
                </button>
              </div>

              {newPreguntaError && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{newPreguntaError}</div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="ID" value={newPreguntaForm.id} onChange={(event) => setNewPreguntaForm((prev) => ({ ...prev, id: event.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg" />
                <input type="text" placeholder="Encargado" value={newPreguntaForm.encargadoNombre} onChange={(event) => setNewPreguntaForm((prev) => ({ ...prev, encargadoNombre: event.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg" />
                <select value={newPreguntaForm.estado} onChange={(event) => setNewPreguntaForm((prev) => ({ ...prev, estado: event.target.value as EstadoPregunta }))} className="px-3 py-2 border border-gray-200 rounded-lg"><option value="En revisión">En revisión</option><option value="Pendientes">Pendientes</option><option value="Completadas">Completadas</option></select>
                <select value={newPreguntaForm.complejidad} onChange={(event) => setNewPreguntaForm((prev) => ({ ...prev, complejidad: event.target.value as ComplejidadPregunta }))} className="px-3 py-2 border border-gray-200 rounded-lg"><option value="Baja">Baja</option><option value="Media">Media</option><option value="Alta">Alta</option></select>
                <input type="text" placeholder="Especialidad" value={newPreguntaForm.especialidad} onChange={(event) => setNewPreguntaForm((prev) => ({ ...prev, especialidad: event.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg" />
                <input type="number" min={0} placeholder="Adjuntos" value={newPreguntaForm.adjuntos} onChange={(event) => setNewPreguntaForm((prev) => ({ ...prev, adjuntos: Number(event.target.value || 0) }))} className="px-3 py-2 border border-gray-200 rounded-lg" />
              </div>

              <textarea rows={3} placeholder="Pregunta" value={newPreguntaForm.pregunta} onChange={(event) => setNewPreguntaForm((prev) => ({ ...prev, pregunta: event.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
              <textarea rows={3} placeholder="Estrategia (una línea por punto)" value={newPreguntaForm.estrategia} onChange={(event) => setNewPreguntaForm((prev) => ({ ...prev, estrategia: event.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
              <textarea rows={3} placeholder="Respuesta IA" value={newPreguntaForm.respuestaIA} onChange={(event) => setNewPreguntaForm((prev) => ({ ...prev, respuestaIA: event.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg" />

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowNewPreguntaModal(false)} className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-[#059669] text-white rounded-lg hover:bg-[#047857]">Guardar pregunta</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowHelpModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-lg border border-gray-200 shadow-xl p-6" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-primary">help</span>
              <h3 className="text-lg font-semibold text-[#111318]">Ayuda de gestión</h3>
            </div>
            <p className="text-sm text-gray-700 mb-4">
              Usa filtros para acotar preguntas, el botón ordenar para alternar criterio y la paginación para revisar resultados. El botón Nueva Pregunta agrega registros en memoria local.
            </p>
            <div className="flex justify-end">
              <button onClick={() => setShowHelpModal(false)} className="px-4 py-2 bg-[#059669] text-white rounded-lg hover:bg-[#047857]">Entendido</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionAdendaView;


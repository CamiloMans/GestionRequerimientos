import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adendasGestion, adendasList } from '../utils/routes';

type EstadoPregunta = 'En revisión' | 'Pendientes' | 'Completadas';
type ComplejidadPregunta = 'Baja' | 'Media' | 'Alta';

interface PreguntaDetail {
  id: string;
  estado: EstadoPregunta;
  complejidad: ComplejidadPregunta;
  avance: number;
  informacion_faltante: string[];
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

const getDummyPreguntaDetail = (id: string): PreguntaDetail | null => {
  const dummyData: Record<string, PreguntaDetail> = {
    '018': {
      id: '018',
      estado: 'En revisión',
      complejidad: 'Media',
      avance: 50,
      informacion_faltante: ['Cuadro consolidado único que integre actividad por fase.', 'Desagregación clara: Parte/obras.'],
      pregunta:
        'Respecto a las partes, obras y acciones del Proyecto, se solicita adjuntar un cuadro consolidado que detalle claramente las partes, obras y acciones del Proyecto, identificando la fase en la que se ejecuta cada una de ellas.',
      adjuntos: 2,
      encargado: { nombre: 'PT Paula Olivares' },
      especialidad: 'Descripción proyecto',
      estrategia: ['Consolidar en una tabla maestra POA-Fase.', 'Definir Parte/Obra, Acción, Fase.'],
      respuesta_ia:
        'BORRADOR IA Se adjunta un cuadro consolidado que detalla las acciones por fase y parte de obra.',
    },
    '016': {
      id: '016',
      estado: 'En revisión',
      complejidad: 'Alta',
      avance: 30,
      informacion_faltante: ['Fundamentación técnica y cuantitativa de la configuración geométrica.', 'Análisis estructural del Depósito de Relaves.'],
      pregunta:
        'Se solicita al Titular fundamentar técnica y cuantitativamente que la configuración geométrica y estructural del Depósito de Relaves asegura la estabilidad en el costado poniente.',
      adjuntos: 1,
      encargado: { nombre: 'EG Eduardo G.' },
      especialidad: 'Permisos sectoriales',
      estrategia: ['Delimitar sector poniente con referencia a figura.', 'Presentar paquete técnico trazable.'],
      respuesta_ia:
        'BORRADOR IA Se fundamenta técnicamente la configuración geométrica para asegurar estabilidad en el costado poniente.',
    },
    '015': {
      id: '015',
      estado: 'Pendientes',
      complejidad: 'Baja',
      avance: 20,
      informacion_faltante: ['Datos de estudios previos de impacto ambiental.', 'Informe consolidado de impactos.'],
      pregunta:
        'Se requiere información adicional sobre el impacto ambiental del proyecto en la zona de influencia.',
      adjuntos: 0,
      encargado: { nombre: 'PT Paula Olivares' },
      especialidad: 'Impacto ambiental',
      estrategia: ['Recopilar datos de estudios previos.', 'Preparar informe consolidado.'],
      respuesta_ia:
        'BORRADOR IA Se requiere información adicional sobre impacto ambiental en zona de influencia.',
    },
    '014': {
      id: '014',
      estado: 'Completadas',
      complejidad: 'Media',
      avance: 100,
      informacion_faltante: [],
      pregunta:
        'Solicitud de aclaración sobre los plazos de ejecución del proyecto y las fases de implementación.',
      adjuntos: 1,
      encargado: { nombre: 'EG Eduardo G.' },
      especialidad: 'Planificación',
      estrategia: ['Revisar cronograma detallado.', 'Actualizar documentación.'],
      respuesta_ia:
        'BORRADOR IA Los plazos de ejecución se actualizaron según el cronograma detallado.',
    },
  };

  return dummyData[id] || null;
};

const clonePregunta = (pregunta: PreguntaDetail): PreguntaDetail => ({
  ...pregunta,
  informacion_faltante: [...pregunta.informacion_faltante],
  estrategia: [...pregunta.estrategia],
  encargado: { ...pregunta.encargado },
});

const PreguntaDetailView: React.FC = () => {
  const navigate = useNavigate();
  const { codigoMyma, preguntaId } = useParams<{ codigoMyma?: string; preguntaId: string }>();
  const [loading, setLoading] = useState(true);
  const [pregunta, setPregunta] = useState<PreguntaDetail | null>(null);
  const [draftPregunta, setDraftPregunta] = useState<PreguntaDetail | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [selectedAdjunto, setSelectedAdjunto] = useState<number | null>(null);

  useEffect(() => {
    if (!preguntaId) return;
    const data = getDummyPreguntaDetail(preguntaId);
    if (data) {
      setPregunta(clonePregunta(data));
      setDraftPregunta(clonePregunta(data));
    } else {
      setPregunta(null);
      setDraftPregunta(null);
    }
    setLoading(false);
  }, [preguntaId]);

  const handleBack = () => {
    if (codigoMyma) {
      navigate(adendasGestion(codigoMyma));
      return;
    }
    navigate(adendasList());
  };

  const handleToggleEdit = () => {
    if (!pregunta) return;
    if (!isEditing) {
      setDraftPregunta(clonePregunta(pregunta));
      setIsEditing(true);
      return;
    }
    if (draftPregunta) {
      setPregunta(clonePregunta(draftPregunta));
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    if (!pregunta) return;
    setDraftPregunta(clonePregunta(pregunta));
    setIsEditing(false);
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600">Cargando pregunta...</p>
        </div>
      </div>
    );
  }

  if (!pregunta || !draftPregunta) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No se encontró la pregunta</p>
          <button onClick={handleBack} className="px-4 py-2 bg-[#059669] text-white rounded-lg hover:bg-[#047857] transition-colors">Volver</button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-6 bg-[#f8fafc] min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button onClick={handleBack} className="flex items-center gap-2 text-gray-600 hover:text-[#111318] mb-4 transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
            <span>Volver a preguntas</span>
          </button>

          <div className="flex items-center justify-between gap-3">
            <h1 className="text-4xl font-bold text-[#111318]">{pregunta.id}</h1>
            <div className="flex items-center gap-2">
              {isEditing && (
                <button onClick={handleCancelEdit} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
              )}
              <button onClick={handleToggleEdit} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-[#059669] text-white hover:bg-[#047857]">
                <span className="material-symbols-outlined text-sm">{isEditing ? 'save' : 'edit'}</span>
                <span>{isEditing ? 'Guardar' : 'Editar'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-gray-400">info</span>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Estado pregunta</label>
              {isEditing ? (
                <select value={draftPregunta.estado} onChange={(event) => setDraftPregunta((prev) => prev ? { ...prev, estado: event.target.value as EstadoPregunta } : prev)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm">
                  <option value="En revisión">En revisión</option>
                  <option value="Pendientes">Pendientes</option>
                  <option value="Completadas">Completadas</option>
                </select>
              ) : (
                <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${getEstadoColor(pregunta.estado)}`}>{pregunta.estado}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-yellow-500">warning</span>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Complejidad</label>
              {isEditing ? (
                <select value={draftPregunta.complejidad} onChange={(event) => setDraftPregunta((prev) => prev ? { ...prev, complejidad: event.target.value as ComplejidadPregunta } : prev)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm">
                  <option value="Baja">Baja</option>
                  <option value="Media">Media</option>
                  <option value="Alta">Alta</option>
                </select>
              ) : (
                <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${getComplejidadColor(pregunta.complejidad)}`}>{pregunta.complejidad}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-500 mb-2">% de avance</label>
              {isEditing ? (
                <div className="flex items-center gap-3">
                  <input type="range" min={0} max={100} value={draftPregunta.avance} onChange={(event) => setDraftPregunta((prev) => prev ? { ...prev, avance: Number(event.target.value) } : prev)} className="flex-1" />
                  <input type="number" min={0} max={100} value={draftPregunta.avance} onChange={(event) => setDraftPregunta((prev) => prev ? { ...prev, avance: Number(event.target.value) } : prev)} className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-sm" />
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold text-[#111318]">{pregunta.avance}%</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                    <div className="bg-green-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${pregunta.avance}%` }}></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {pregunta.informacion_faltante.length > 0 && (
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-orange-500 mt-1">error</span>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-500 mb-2">Información faltante</label>
                <ul className="list-disc list-inside space-y-1">
                  {pregunta.informacion_faltante.map((item, idx) => (
                    <li key={idx} className="text-sm text-[#111318]">{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">Pregunta</label>
            <p className="text-sm text-[#111318] leading-relaxed">{pregunta.pregunta}</p>
          </div>

          {pregunta.adjuntos > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">Adjuntos</label>
              <div className="flex items-center gap-2">
                {Array.from({ length: pregunta.adjuntos }).map((_, idx) => (
                  <button key={idx} onClick={() => setSelectedAdjunto(idx + 1)} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer" type="button">
                    <span className="material-symbols-outlined text-gray-400">{idx === 0 ? 'description' : 'image'}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">Encargado</label>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-blue-500 flex items-center justify-center text-white text-sm font-semibold">
                {pregunta.encargado.nombre.split(' ').map((n) => n[0]).join('').substring(0, 2)}
              </div>
              <span className="text-sm text-[#111318]">{pregunta.encargado.nombre}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">Especialidad</label>
            <span className="inline-block px-3 py-1 text-sm font-medium rounded-full bg-orange-100 text-orange-800">{pregunta.especialidad}</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">Estrategia</label>
            {isEditing ? (
              <textarea
                rows={4}
                value={draftPregunta.estrategia.join('\n')}
                onChange={(event) => setDraftPregunta((prev) => prev ? { ...prev, estrategia: event.target.value.split('\n').map((line) => line.trim()).filter(Boolean) } : prev)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            ) : (
              <ul className="list-disc list-inside space-y-1">
                {pregunta.estrategia.map((estrategia, idx) => (
                  <li key={idx} className="text-sm text-[#111318]">{estrategia}</li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">Respuesta IA</label>
            {isEditing ? (
              <textarea
                rows={5}
                value={draftPregunta.respuesta_ia}
                onChange={(event) => setDraftPregunta((prev) => prev ? { ...prev, respuesta_ia: event.target.value } : prev)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-[#111318] leading-relaxed">{pregunta.respuesta_ia}</p>
              </div>
            )}
          </div>
        </div>

        <button onClick={() => setShowHelpModal(true)} className="fixed bottom-6 right-6 w-12 h-12 bg-primary text-white rounded-full shadow-lg hover:bg-[#047857] transition-colors flex items-center justify-center" type="button">
          <span className="material-symbols-outlined">help</span>
        </button>
      </div>

      {selectedAdjunto !== null && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setSelectedAdjunto(null)}>
          <div className="bg-white rounded-xl w-full max-w-md border border-gray-200 shadow-xl p-6" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[#111318] mb-2">Adjunto #{selectedAdjunto}</h3>
            <p className="text-sm text-gray-700 mb-4">Vista previa local de adjunto. Aquí puedes conectar descarga/visor cuando exista backend de archivos.</p>
            <div className="flex justify-end"><button onClick={() => setSelectedAdjunto(null)} className="px-4 py-2 bg-[#059669] text-white rounded-lg hover:bg-[#047857]" type="button">Cerrar</button></div>
          </div>
        </div>
      )}

      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowHelpModal(false)}>
          <div className="bg-white rounded-xl w-full max-w-lg border border-gray-200 shadow-xl p-6" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3"><span className="material-symbols-outlined text-primary">help</span><h3 className="text-lg font-semibold text-[#111318]">Ayuda de detalle</h3></div>
            <p className="text-sm text-gray-700 mb-4">Usa Editar para modificar estado, complejidad, avance, estrategia y respuesta IA localmente. Los adjuntos abren una ficha local para evitar clics sin efecto.</p>
            <div className="flex justify-end"><button onClick={() => setShowHelpModal(false)} className="px-4 py-2 bg-[#059669] text-white rounded-lg hover:bg-[#047857]" type="button">Entendido</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreguntaDetailView;


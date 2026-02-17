import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

interface PreguntaDetail {
  id: string;
  estado: 'En revisión' | 'Pendientes' | 'Completadas';
  complejidad: 'Baja' | 'Media' | 'Alta';
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

/**
 * Datos dummy para el detalle de preguntas
 */
const getDummyPreguntaDetail = (id: string): PreguntaDetail | null => {
  const dummyData: Record<string, PreguntaDetail> = {
    '018': {
      id: '018',
      estado: 'En revisión',
      complejidad: 'Media',
      avance: 50,
      informacion_faltante: [
        'Cuadro consolidado único que integre actividad por fase.',
        'Desagregación clara: Parte/obras',
      ],
      pregunta: 'Respecto a las partes, obras y acciones del Proyecto, se solicita adjuntar un cuadro consolidado que detalle claramente las partes, obras y acciones del Proyecto, identificando la fase en la que se ejecuta cada una de ellas.',
      adjuntos: 2,
      encargado: {
        nombre: 'PT Paula Olivares',
      },
      especialidad: 'Descripción proyecto',
      estrategia: [
        'Consolidar en una tabla maestra POA-Fase.',
        'Definir Parte/Obra, Acción, Fase.',
      ],
      respuesta_ia: 'BORRADOR IA Se adjunta un cuadro consolidado que detalla las Acciones que se ejecutarán en cada fase. Se incluye la totalidad de las partes, obras y acciones del proyecto.',
    },
    '016': {
      id: '016',
      estado: 'En revisión',
      complejidad: 'Alta',
      avance: 30,
      informacion_faltante: [
        'Fundamentación técnica y cuantitativa de la configuración geométrica.',
        'Análisis estructural del Depósito de Relaves.',
      ],
      pregunta: 'Se solicita al Titular fundamentar técnica y cuantitativamente que la configuración geométrica y estructural del Depósito de Relaves asegura la estabilidad en el costado poniente.',
      adjuntos: 1,
      encargado: {
        nombre: 'EG Eduardo G.',
      },
      especialidad: 'Permisos sectoriales',
      estrategia: [
        'Delimitar sector poniente con referencia a figura.',
        'Presentar paquete técnico trazable.',
      ],
      respuesta_ia: 'BORRADOR IA Se fundamenta técnicamente la configuración geométrica del Depósito de Relaves asegurando la estabilidad en el costado poniente mediante análisis estructural detallado.',
    },
    '015': {
      id: '015',
      estado: 'Pendientes',
      complejidad: 'Baja',
      avance: 20,
      informacion_faltante: [
        'Datos de estudios previos de impacto ambiental.',
        'Informe consolidado de impactos.',
      ],
      pregunta: 'Se requiere información adicional sobre el impacto ambiental del proyecto en la zona de influencia.',
      adjuntos: 0,
      encargado: {
        nombre: 'PT Paula Olivares',
      },
      especialidad: 'Impacto ambiental',
      estrategia: [
        'Recopilar datos de estudios previos.',
        'Preparar informe consolidado.',
      ],
      respuesta_ia: 'BORRADOR IA Se requiere información adicional sobre el impacto ambiental del proyecto en la zona de influencia, incluyendo estudios previos y análisis detallados.',
    },
    '014': {
      id: '014',
      estado: 'Completadas',
      complejidad: 'Media',
      avance: 100,
      informacion_faltante: [],
      pregunta: 'Solicitud de aclaración sobre los plazos de ejecución del proyecto y las fases de implementación.',
      adjuntos: 1,
      encargado: {
        nombre: 'EG Eduardo G.',
      },
      especialidad: 'Planificación',
      estrategia: [
        'Revisar cronograma detallado.',
        'Actualizar documentación.',
      ],
      respuesta_ia: 'BORRADOR IA Los plazos de ejecución se han actualizado según el cronograma detallado, incluyendo todas las fases de implementación del proyecto.',
    },
  };

  return dummyData[id] || null;
};

const PreguntaDetailView: React.FC = () => {
  const navigate = useNavigate();
  const { codigoMyma, preguntaId } = useParams<{ codigoMyma?: string; preguntaId: string }>();
  const [loading, setLoading] = useState(true);
  const [pregunta, setPregunta] = useState<PreguntaDetail | null>(null);

  useEffect(() => {
    if (preguntaId) {
      // Usar datos dummy basados en el ID de la pregunta
      const data = getDummyPreguntaDetail(preguntaId);
      setPregunta(data);
      setLoading(false);
    }
  }, [preguntaId]);

  const handleBack = () => {
    // Volver a la gestión de adenda usando el código MyMA
    if (codigoMyma) {
      navigate(`/adendas/gestion/${codigoMyma}`);
    } else {
      navigate(-1);
    }
  };

  const handleEdit = () => {
    // TODO: Implementar edición
    console.log('Editar pregunta', preguntaId);
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

  if (!pregunta) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No se encontró la pregunta</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-[#059669] text-white rounded-lg hover:bg-[#047857] transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

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

  return (
    <div className="w-full p-6 bg-[#f8fafc] min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-[#111318] mb-4 transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            <span>de Preguntas</span>
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold text-[#111318]">{pregunta.id}</h1>
            <button
              onClick={handleEdit}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-gray-600">edit</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          {/* Estado pregunta */}
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-gray-400">info</span>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Estado pregunta</label>
              <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${getEstadoColor(pregunta.estado)}`}>
                {pregunta.estado}
              </span>
            </div>
          </div>

          {/* Complejidad */}
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-yellow-500">warning</span>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Complejidad</label>
              <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${getComplejidadColor(pregunta.complejidad)}`}>
                {pregunta.complejidad}
              </span>
            </div>
          </div>

          {/* % de avance */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-500 mb-2">% de avance</label>
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold text-[#111318]">{pregunta.avance}%</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-green-500 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${pregunta.avance}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Información faltante */}
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

          {/* Pregunta completa */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">Pregunta</label>
            <p className="text-sm text-[#111318] leading-relaxed">{pregunta.pregunta}</p>
          </div>

          {/* Adjuntos */}
          {pregunta.adjuntos > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-2">Adjuntos</label>
              <div className="flex items-center gap-2">
                {Array.from({ length: pregunta.adjuntos }).map((_, idx) => (
                  <div key={idx} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <span className="material-symbols-outlined text-gray-400">
                      {idx === 0 ? 'description' : 'image'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Encargado */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">Encargado</label>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-blue-500 flex items-center justify-center text-white text-sm font-semibold">
                {pregunta.encargado.nombre.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </div>
              <span className="text-sm text-[#111318]">{pregunta.encargado.nombre}</span>
            </div>
          </div>

          {/* Especialidad */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">Especialidad</label>
            <span className="inline-block px-3 py-1 text-sm font-medium rounded-full bg-orange-100 text-orange-800">
              {pregunta.especialidad}
            </span>
          </div>

          {/* Estrategia */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">Estrategia</label>
            <ul className="list-disc list-inside space-y-1">
              {pregunta.estrategia.map((estrategia, idx) => (
                <li key={idx} className="text-sm text-[#111318]">{estrategia}</li>
              ))}
            </ul>
          </div>

          {/* Respuesta IA */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">Respuesta IA</label>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-[#111318] leading-relaxed">{pregunta.respuesta_ia}</p>
            </div>
          </div>
        </div>

        {/* Floating Help Button */}
        <button className="fixed bottom-6 right-6 w-12 h-12 bg-primary text-white rounded-full shadow-lg hover:bg-[#047857] transition-colors flex items-center justify-center">
          <span className="material-symbols-outlined">help</span>
        </button>
      </div>
    </div>
  );
};

export default PreguntaDetailView;


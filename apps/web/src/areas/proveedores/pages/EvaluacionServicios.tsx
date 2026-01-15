import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaId } from '@contracts/areas';
import { fetchProveedores, ProveedorResponse } from '../services/proveedoresService';

interface CriterioEvaluacion {
  id: string;
  nombre: string;
  peso: number;
  valor: 'ALTO' | 'MEDIO' | 'BAJO' | 'MUY_BAJO' | null;
}

interface EvaluacionData {
  proveedorId: string;
  nombreContacto: string;
  correoContacto: string;
  ordenServicio: string;
  fechaEvaluacion: string;
  precioServicio: number;
  evaluadorResponsable: string;
  descripcionServicio: string;
  criterios: CriterioEvaluacion[];
  observaciones: string;
}

const EvaluacionServicios: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingProveedores, setLoadingProveedores] = useState(true);
  const [proveedores, setProveedores] = useState<ProveedorResponse[]>([]);
  const [formData, setFormData] = useState<EvaluacionData>({
    proveedorId: '',
    nombreContacto: '',
    correoContacto: '',
    ordenServicio: '',
    fechaEvaluacion: '',
    precioServicio: 0,
    evaluadorResponsable: '',
    descripcionServicio: '',
    criterios: [
      { id: 'calidad', nombre: 'Calidad', peso: 30, valor: null },
      { id: 'disponibilidad', nombre: 'Disponibilidad', peso: 20, valor: null },
      { id: 'cumplimiento', nombre: 'Cumplimiento', peso: 30, valor: null },
      { id: 'precio', nombre: 'Precio', peso: 20, valor: null },
    ],
    observaciones: '',
  });

  const getAreaPath = (path: string) => {
    return `/app/area/${AreaId.PROVEEDORES}/${path}`;
  };

  // Cargar proveedores
  useEffect(() => {
    const loadProveedores = async () => {
      try {
        setLoadingProveedores(true);
        const data = await fetchProveedores();
        setProveedores(data);
      } catch (err) {
        console.error('Error al cargar proveedores:', err);
      } finally {
        setLoadingProveedores(false);
      }
    };

    loadProveedores();
  }, []);

  // Calcular evaluación total
  const evaluacionTotal = useMemo(() => {
    const valores = {
      ALTO: 100,
      MEDIO: 60,
      BAJO: 30,
      MUY_BAJO: 0,
    };

    let totalPonderado = 0;
    let totalPeso = 0;

    formData.criterios.forEach((criterio) => {
      if (criterio.valor) {
        const valorNumerico = valores[criterio.valor];
        totalPonderado += valorNumerico * criterio.peso;
        totalPeso += criterio.peso;
      }
    });

    if (totalPeso === 0) return null;
    return Math.round(totalPonderado / totalPeso);
  }, [formData.criterios]);

  // Calcular clasificación
  const clasificacion = useMemo(() => {
    if (evaluacionTotal === null) return null;
    if (evaluacionTotal >= 80) return 'A';
    if (evaluacionTotal >= 60) return 'B';
    return 'C';
  }, [evaluacionTotal]);

  // Obtener estatus final
  const estatusFinal = useMemo(() => {
    if (!clasificacion) return null;
    if (clasificacion === 'A') return 'Habilitado para contratación inmediata.';
    if (clasificacion === 'B') return 'Habilitado con plan de mejora obligatorio.';
    return 'INHABILITADO PARA CONTRATACIÓN.';
  }, [clasificacion]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCriterioChange = (criterioId: string, valor: 'ALTO' | 'MEDIO' | 'BAJO' | 'MUY_BAJO') => {
    setFormData((prev) => ({
      ...prev,
      criterios: prev.criterios.map((c) => (c.id === criterioId ? { ...c, valor } : c)),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // TODO: Guardar evaluación en Supabase
      console.log('Guardando evaluación:', formData);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Redirigir o mostrar mensaje de éxito
      alert('Evaluación guardada exitosamente');
    } catch (err: any) {
      console.error('Error al guardar evaluación:', err);
      alert('Error al guardar la evaluación');
    } finally {
      setLoading(false);
    }
  };

  const getCriterioOpciones = (criterioId: string) => {
    const opciones: Record<string, { ALTO: string; MEDIO: string; BAJO: string; MUY_BAJO: string }> = {
      calidad: {
        ALTO: 'Óptima',
        MEDIO: 'Buena',
        BAJO: 'Regular',
        MUY_BAJO: 'Deficiente',
      },
      disponibilidad: {
        ALTO: 'Inmediatamente',
        MEDIO: 'A 15 días',
        BAJO: 'A 30 días',
        MUY_BAJO: 'A más de 30 días',
      },
      cumplimiento: {
        ALTO: 'Óptimo',
        MEDIO: 'Generalmente cumple',
        BAJO: 'Se retrasa ocasionalmente',
        MUY_BAJO: 'Generalmente se retrasa',
      },
      precio: {
        ALTO: 'Gral. menor precio',
        MEDIO: 'Gral. igual precio',
        BAJO: 'Gral. mayor precio',
        MUY_BAJO: 'No existe competencia',
      },
    };
    return opciones[criterioId] || opciones.calidad;
  };

  const getClasificacionColor = (clasif: string | null) => {
    if (!clasif) return 'bg-gray-100 text-gray-700 border-gray-300';
    switch (clasif) {
      case 'A':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'B':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'C':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-[#111318] mb-1">
                Evaluación de Servicios
              </h1>
              <p className="text-sm text-gray-500">
                Workflow Secuencial para Calificación de Proveedores
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">save</span>
                <span>Guardar Evaluación</span>
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-[#111318] font-medium">
                <span className="material-symbols-outlined text-lg">edit</span>
                <span>Editar</span>
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-[#111318] font-medium">
                <span className="material-symbols-outlined text-lg">download</span>
                <span>Exportar</span>
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-[#111318] font-medium">
                <span className="material-symbols-outlined text-lg">send</span>
                <span>Enviar a proveedor</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contenido Principal */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSubmit}>
              {/* 1. Antecedentes */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-6">
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                      1
                    </span>
                    <h2 className="text-lg font-bold text-[#111318]">Antecedentes</h2>
                  </div>
                  <p className="text-sm text-gray-500 ml-10">
                    Información general del servicio y proveedor
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        PROVEEDOR
                      </label>
                      {loadingProveedores ? (
                        <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50">
                          <span className="text-sm text-gray-500">Cargando...</span>
                        </div>
                      ) : (
                        <select
                          name="proveedorId"
                          value={formData.proveedorId}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
                        >
                          <option value="">Seleccione un proveedor</option>
                          {proveedores.map((prov) => (
                            <option key={prov.id} value={prov.id.toString()}>
                              {prov.nombre_proveedor}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        NOMBRE DE CONTACTO
                      </label>
                      <input
                        type="text"
                        name="nombreContacto"
                        value={formData.nombreContacto}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        placeholder="Juan Pérez Maldonado"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        CORREO DE CONTACTO
                      </label>
                      <input
                        type="email"
                        name="correoContacto"
                        value={formData.correoContacto}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        placeholder="j.perez@proveedorit.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        ORDEN DE SERVICIO
                      </label>
                      <input
                        type="text"
                        name="ordenServicio"
                        value={formData.ordenServicio}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        placeholder="OS-2024-001"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        FECHA DE EVALUACIÓN
                      </label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                          calendar_today
                        </span>
                        <input
                          type="date"
                          name="fechaEvaluacion"
                          value={formData.fechaEvaluacion}
                          onChange={handleChange}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        PRECIO DE SERVICIO
                      </label>
                      <input
                        type="number"
                        name="precioServicio"
                        value={formData.precioServicio || ''}
                        onChange={handleChange}
                        min="0"
                        step="0.01"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        EVALUADOR RESPONSABLE
                      </label>
                      <select
                        name="evaluadorResponsable"
                        value={formData.evaluadorResponsable}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
                      >
                        <option value="">Seleccione evaluador</option>
                        <option value="Admin User">Admin User</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      DESCRIPCIÓN DEL SERVICIO
                    </label>
                    <textarea
                      name="descripcionServicio"
                      value={formData.descripcionServicio}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none"
                      placeholder="Breve descripción del alcance del servicio evaluado..."
                    />
                  </div>
                </div>
              </div>

              {/* 2. Evaluación de Criterios */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-6">
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                      2
                    </span>
                    <h2 className="text-lg font-bold text-[#111318]">Evaluación de Criterios</h2>
                  </div>
                  <p className="text-sm text-gray-500 ml-10">
                    Criterios detallados según la clasificación de desempeño
                  </p>
                </div>

                <div className="space-y-4">
                  {formData.criterios.map((criterio) => {
                    const opciones = getCriterioOpciones(criterio.id);
                    return (
                      <div key={criterio.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <span className="font-medium text-[#111318]">{criterio.nombre}</span>
                            <span className="ml-2 text-sm text-gray-500">PESO: {criterio.peso}%</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {(['ALTO', 'MEDIO', 'BAJO', 'MUY_BAJO'] as const).map((nivel) => (
                            <label
                              key={nivel}
                              className={`flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                                criterio.valor === nivel
                                  ? 'border-primary bg-primary/5'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`criterio-${criterio.id}`}
                                checked={criterio.valor === nivel}
                                onChange={() => handleCriterioChange(criterio.id, nivel)}
                                className="text-primary focus:ring-primary"
                              />
                              <span className="text-sm text-[#111318]">{opciones[nivel]}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Observaciones */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-6">
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                      3
                    </span>
                    <h2 className="text-lg font-bold text-[#111318]">Observaciones</h2>
                  </div>
                  <p className="text-sm text-gray-500 ml-10">
                    Comentarios adicionales y justificación del puntaje
                  </p>
                </div>

                <textarea
                  name="observaciones"
                  value={formData.observaciones}
                  onChange={handleChange}
                  rows={5}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none"
                  placeholder="Escriba aquí los detalles que sustentan la calificación global..."
                />
              </div>
            </form>
          </div>

          {/* Sidebar Derecho */}
          <div className="space-y-6">
            {/* Resultado de Evaluación */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">RESULTADO EVALUACIÓN</h3>
              <div className={`border-4 rounded-lg p-8 text-center ${getClasificacionColor(clasificacion)}`}>
                <div className="text-8xl font-bold mb-4">{clasificacion || '—'}</div>
                <div className="text-sm font-medium mb-2">CALIFICACIÓN ACTUAL</div>
              </div>
              {estatusFinal && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs font-medium text-gray-600 mb-1">ESTATUS FINAL</div>
                  <div className="text-sm text-[#111318] font-medium">{estatusFinal}</div>
                </div>
              )}
              {evaluacionTotal !== null && (
                <p className="mt-2 text-xs text-gray-500 text-center">
                  Calculado automáticamente según criterios
                </p>
              )}
            </div>

            {/* Guía de Niveles */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">GUÍA DE NIVELES</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <span className="material-symbols-outlined text-green-600">check_circle</span>
                  <div>
                    <div className="font-semibold text-green-700 mb-1">Categoría A</div>
                    <div className="text-xs text-green-600">Evaluación ≥ 80%</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Habilitado para contratación inmediata.
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <span className="material-symbols-outlined text-yellow-600">info</span>
                  <div>
                    <div className="font-semibold text-yellow-700 mb-1">Categoría B</div>
                    <div className="text-xs text-yellow-600">Evaluación 60% - 79%</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Habilitado con plan de mejora obligatorio.
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <span className="material-symbols-outlined text-red-600">warning</span>
                  <div>
                    <div className="font-semibold text-red-700 mb-1">Categoría C</div>
                    <div className="text-xs text-red-600">Evaluación &lt; 60%</div>
                    <div className="text-xs text-gray-600 mt-1">
                      INHABILITADO PARA CONTRATACIÓN.
                    </div>
                  </div>
                </div>
              </div>
            </div>
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

export default EvaluacionServicios;


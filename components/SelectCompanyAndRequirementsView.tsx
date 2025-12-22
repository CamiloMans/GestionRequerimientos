import React, { useState, useEffect } from 'react';
import { ProjectGalleryItem } from '../types';
import { fetchClientes, fetchEmpresaRequerimientos, createProyectoRequerimientos, fetchCatalogoRequerimientos } from '../services/supabaseService';
import { Cliente, EmpresaRequerimiento } from '../types';
import { updateSolicitudAcreditacion } from '../services/supabaseService';

interface SelectCompanyAndRequirementsViewProps {
  project: ProjectGalleryItem;
  onBack: () => void;
  onUpdate?: () => void;
}

interface CatalogoRequerimiento {
  id?: number;
  requerimiento: string;
  categoria_requerimiento?: string;
  responsable?: string;
  [key: string]: any;
}

const SelectCompanyAndRequirementsView: React.FC<SelectCompanyAndRequirementsViewProps> = ({
  project,
  onBack,
  onUpdate,
}) => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>('');
  const [selectedEmpresaNombre, setSelectedEmpresaNombre] = useState<string>('');
  const [empresaRequerimientos, setEmpresaRequerimientos] = useState<EmpresaRequerimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRequerimientos, setLoadingRequerimientos] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAddRequerimiento, setShowAddRequerimiento] = useState(false);
  const [catalogoRequerimientos, setCatalogoRequerimientos] = useState<CatalogoRequerimiento[]>([]);
  const [newRequerimiento, setNewRequerimiento] = useState({
    requerimientoId: '',
    requerimiento: '',
    categoria_requerimiento: '',
    responsable: 'JPRO',
    observaciones: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Cargar empresa seleccionada si ya existe
    if ((project as any).empresa_id) {
      setSelectedEmpresaId((project as any).empresa_id);
      if ((project as any).empresa_nombre) {
        setSelectedEmpresaNombre((project as any).empresa_nombre);
        handleEmpresaChange((project as any).empresa_id, (project as any).empresa_nombre);
      }
    }
  }, [project]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [clientesData, catalogoData] = await Promise.all([
        fetchClientes(),
        fetchCatalogoRequerimientos()
      ]);
      setClientes(clientesData);
      setCatalogoRequerimientos(catalogoData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmpresaChange = async (empresaId: string, empresaNombre?: string) => {
    const selectedCliente = clientes.find(c => c.id.toString() === empresaId);
    const nombre = empresaNombre || selectedCliente?.nombre || '';
    
    setSelectedEmpresaId(empresaId);
    setSelectedEmpresaNombre(nombre);

    if (nombre) {
      setLoadingRequerimientos(true);
      setEmpresaRequerimientos([]);
      
      try {
        const reqs = await fetchEmpresaRequerimientos(nombre);
        setEmpresaRequerimientos(reqs);
      } catch (error) {
        console.error('Error cargando requerimientos:', error);
        setEmpresaRequerimientos([]);
      } finally {
        setLoadingRequerimientos(false);
      }
    } else {
      setEmpresaRequerimientos([]);
    }
  };

  const handleRequerimientoChange = (requerimientoId: string) => {
    // Buscar el requerimiento seleccionado en el catálogo por ID
    const requerimientoSeleccionado = catalogoRequerimientos.find(
      req => (req.id?.toString() || req.id) === requerimientoId
    );

    if (requerimientoSeleccionado) {
      // Autocompletar categoría y responsable desde el catálogo usando el ID
      setNewRequerimiento({
        requerimientoId: requerimientoId,
        requerimiento: requerimientoSeleccionado.requerimiento,
        categoria_requerimiento: requerimientoSeleccionado.categoria_requerimiento || '',
        responsable: requerimientoSeleccionado.responsable || 'JPRO',
        observaciones: newRequerimiento.observaciones, // Mantener observaciones
      });
    } else {
      // Si no se encuentra, limpiar los campos
      setNewRequerimiento({
        requerimientoId: '',
        requerimiento: '',
        categoria_requerimiento: '',
        responsable: 'JPRO',
        observaciones: newRequerimiento.observaciones,
      });
    }
  };

  const handleAddRequerimiento = () => {
    if (!newRequerimiento.requerimiento.trim() || !newRequerimiento.categoria_requerimiento.trim()) {
      alert('Por favor completa el requerimiento y la categoría');
      return;
    }

    const nuevoReq: EmpresaRequerimiento = {
      empresa: selectedEmpresaNombre,
      requerimiento: newRequerimiento.requerimiento.trim(),
      categoria_requerimiento: newRequerimiento.categoria_requerimiento,
      responsable: newRequerimiento.responsable,
      observaciones: newRequerimiento.observaciones.trim() || undefined,
    };

    setEmpresaRequerimientos([...empresaRequerimientos, nuevoReq]);
    setNewRequerimiento({
      requerimientoId: '',
      requerimiento: '',
      categoria_requerimiento: '',
      responsable: 'JPRO',
      observaciones: '',
    });
    setShowAddRequerimiento(false);
  };

  const handleRemoveRequerimiento = (index: number) => {
    const nuevosReqs = empresaRequerimientos.filter((_, i) => i !== index);
    setEmpresaRequerimientos(nuevosReqs);
  };

  const handleSave = async () => {
    if (!selectedEmpresaId || !selectedEmpresaNombre) {
      alert('Por favor selecciona una empresa contratista');
      return;
    }

    if (empresaRequerimientos.length === 0) {
      const confirmar = window.confirm(
        'No hay requerimientos seleccionados. ¿Deseas continuar sin requerimientos?'
      );
      if (!confirmar) return;
    }

    try {
      setSaving(true);

      // Actualizar la solicitud con la empresa seleccionada y cambiar estado a "Por asignar responsables"
      await updateSolicitudAcreditacion(project.id, {
        empresa_id: selectedEmpresaId,
        empresa_nombre: selectedEmpresaNombre,
        estado_solicitud_acreditacion: 'Por asignar responsables',
      });

      // Guardar los requerimientos seleccionados en proyecto_requerimientos_acreditacion
      // Sin responsables asignados todavía (se asignarán después)
      if (empresaRequerimientos.length > 0) {
        await createProyectoRequerimientos(
          project.projectCode,
          selectedEmpresaNombre,
          empresaRequerimientos,
          {
            jpro_nombre: undefined,
            epr_nombre: undefined,
            rrhh_nombre: undefined,
            legal_nombre: undefined,
          },
          project.id // Pasar el id de solicitud_acreditacion como id_proyecto
        );
      }

      alert('✅ Empresa y requerimientos guardados exitosamente\n\nEl proyecto ahora está en estado "Por asignar responsables"');

      if (onUpdate) {
        onUpdate();
      }
      onBack();
    } catch (error) {
      console.error('Error guardando:', error);
      alert('❌ Error al guardar. Por favor intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600">Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="layout-container flex h-full grow flex-col">
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-6 py-8 md:px-10 lg:px-12">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between border-b border-[#e5e7eb] pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-gray-600">arrow_back</span>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-[#111318]">Seleccionar Empresa y Requerimientos</h1>
              <p className="text-sm text-[#616f89]">{project.projectCode}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Selector de Empresa */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                <span className="material-symbols-outlined text-white text-2xl">business</span>
              </div>
              <div>
                <label className="block text-sm font-bold text-[#111318]">
                  Empresa Contratista
                </label>
                <p className="text-xs text-[#616f89]">Selecciona la empresa responsable del proyecto</p>
              </div>
            </div>
            <select
              value={selectedEmpresaId}
              onChange={(e) => {
                const empresaId = e.target.value;
                const selectedCliente = clientes.find(c => c.id.toString() === empresaId);
                handleEmpresaChange(empresaId, selectedCliente?.nombre);
              }}
              className="w-full px-4 py-3 border-2 border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white text-[#111318] font-medium"
            >
              <option value="">Seleccionar empresa...</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Tabla de Requerimientos */}
          {selectedEmpresaNombre && (
            <div className="bg-blue-50/30 border border-blue-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600 text-xl">checklist</span>
                  <h4 className="text-sm font-bold text-[#111318]">
                    Requerimientos de {selectedEmpresaNombre}
                  </h4>
                </div>
                <button
                  onClick={() => setShowAddRequerimiento(!showAddRequerimiento)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <span className="material-symbols-outlined text-lg">add</span>
                  Agregar Requerimiento
                </button>
              </div>

              {/* Formulario para agregar requerimiento */}
              {showAddRequerimiento && (
                <div className="mb-4 p-4 bg-white rounded-lg border-2 border-blue-300">
                  <h5 className="text-sm font-bold text-[#111318] mb-3">Nuevo Requerimiento</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Requerimiento *
                      </label>
                      <select
                        value={newRequerimiento.requerimientoId}
                        onChange={(e) => handleRequerimientoChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Seleccionar requerimiento...</option>
                        {catalogoRequerimientos.map((req, index) => (
                          <option key={req.id || index} value={req.id?.toString() || req.id || index.toString()}>
                            {req.requerimiento} {req.categoria_requerimiento ? `(${req.categoria_requerimiento})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Categoría *
                      </label>
                      <input
                        type="text"
                        value={newRequerimiento.categoria_requerimiento}
                        onChange={(e) => setNewRequerimiento({ ...newRequerimiento, categoria_requerimiento: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Se completará automáticamente"
                        readOnly={!!newRequerimiento.requerimientoId && !!newRequerimiento.categoria_requerimiento}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Responsable
                      </label>
                      <select
                        value={newRequerimiento.responsable}
                        onChange={(e) => setNewRequerimiento({ ...newRequerimiento, responsable: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={!newRequerimiento.requerimientoId}
                      >
                        <option value="JPRO">JPRO</option>
                        <option value="EPR">EPR</option>
                        <option value="RRHH">RRHH</option>
                        <option value="Legal">Legal</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Observaciones
                      </label>
                      <input
                        type="text"
                        value={newRequerimiento.observaciones}
                        onChange={(e) => setNewRequerimiento({ ...newRequerimiento, observaciones: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Opcional"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleAddRequerimiento}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      Agregar
                    </button>
                    <button
                      onClick={() => {
                        setShowAddRequerimiento(false);
                        setNewRequerimiento({
                          requerimientoId: '',
                          requerimiento: '',
                          categoria_requerimiento: '',
                          responsable: 'JPRO',
                          observaciones: '',
                        });
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {loadingRequerimientos ? (
                <div className="flex items-center justify-center py-6">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : empresaRequerimientos.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-blue-200 bg-blue-100/50">
                        <th className="text-left py-3 px-4 font-semibold text-[#111318]">Requerimiento</th>
                        <th className="text-left py-3 px-4 font-semibold text-[#111318]">Categoría</th>
                        <th className="text-center py-3 px-4 font-semibold text-[#111318]">Cargo</th>
                        <th className="text-left py-3 px-4 font-semibold text-[#111318]">Observaciones</th>
                        <th className="text-center py-3 px-4 font-semibold text-[#111318]">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {empresaRequerimientos.map((req, index) => {
                        const responsableColors = {
                          'JPRO': 'bg-blue-100 text-blue-700 border-blue-300',
                          'EPR': 'bg-orange-100 text-orange-700 border-orange-300',
                          'RRHH': 'bg-green-100 text-green-700 border-green-300',
                          'Legal': 'bg-purple-100 text-purple-700 border-purple-300',
                        };
                        const colorClass = responsableColors[req.responsable as keyof typeof responsableColors] || 'bg-gray-100 text-gray-700 border-gray-300';

                        return (
                          <tr key={index} className="border-b border-blue-100 hover:bg-blue-50/50 transition-colors">
                            <td className="py-3 px-4 text-[#111318] font-medium">{req.requerimiento}</td>
                            <td className="py-3 px-4 text-[#616f89]">{req.categoria_requerimiento}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${colorClass}`}>
                                {req.responsable}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-[#616f89] text-xs">
                              {req.observaciones || '-'}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => handleRemoveRequerimiento(index)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Eliminar requerimiento"
                              >
                                <span className="material-symbols-outlined text-lg">delete</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="mt-3 text-xs text-[#616f89] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">info</span>
                    <span>Se crearán {empresaRequerimientos.length} tareas para este proyecto</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-[#616f89]">
                  <span className="material-symbols-outlined text-4xl mb-2 block text-gray-400">inbox</span>
                  <p className="text-sm">No hay requerimientos definidos</p>
                  <p className="text-xs mt-1">Agrega requerimientos usando el botón "Agregar Requerimiento"</p>
                </div>
              )}
            </div>
          )}

          {/* Footer con botones */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onBack}
              className="px-6 py-2.5 rounded-lg border border-gray-200 bg-white text-[#616f89] font-medium hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !selectedEmpresaId}
              className="px-6 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary-hover shadow-sm shadow-primary/20 hover:shadow-primary/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-xl">save</span>
                  Guardar y Continuar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectCompanyAndRequirementsView;

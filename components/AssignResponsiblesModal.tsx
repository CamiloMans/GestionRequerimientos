import React, { useState, useEffect } from 'react';
import { fetchResponsablesRequerimiento, fetchClientes, fetchEmpresaRequerimientos } from '../services/supabaseService';
import { ResponsableRequerimiento, Cliente, EmpresaRequerimiento } from '../types';

interface AssignResponsiblesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (responsables: ResponsablesData) => void;
  projectName: string;
  currentResponsables?: ResponsablesData;
}

export interface ResponsablesData {
  empresa_id?: string;
  empresa_nombre?: string;
  jpro_id?: number;
  jpro_nombre?: string;
  epr_id?: number;
  epr_nombre?: string;
  rrhh_id?: number;
  rrhh_nombre?: string;
  legal_id?: number;
  legal_nombre?: string;
  empresaRequerimientos?: EmpresaRequerimiento[];
}

const AssignResponsiblesModal: React.FC<AssignResponsiblesModalProps> = ({
  isOpen,
  onClose,
  onSave,
  projectName,
  currentResponsables,
}) => {
  const [responsables, setResponsables] = useState<ResponsableRequerimiento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [empresaRequerimientos, setEmpresaRequerimientos] = useState<EmpresaRequerimiento[]>([]);
  const [loadingRequerimientos, setLoadingRequerimientos] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<ResponsablesData>({
    empresa_id: currentResponsables?.empresa_id,
    empresa_nombre: currentResponsables?.empresa_nombre,
    jpro_id: currentResponsables?.jpro_id,
    epr_id: currentResponsables?.epr_id,
    rrhh_id: currentResponsables?.rrhh_id,
    legal_id: currentResponsables?.legal_id,
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (currentResponsables) {
      setFormData({
        empresa_id: currentResponsables.empresa_id,
        empresa_nombre: currentResponsables.empresa_nombre,
        jpro_id: currentResponsables.jpro_id,
        epr_id: currentResponsables.epr_id,
        rrhh_id: currentResponsables.rrhh_id,
        legal_id: currentResponsables.legal_id,
      });
    }
  }, [currentResponsables]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [responsablesData, clientesData] = await Promise.all([
        fetchResponsablesRequerimiento(),
        fetchClientes()
      ]);
      setResponsables(responsablesData);
      setClientes(clientesData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmpresaChange = async (empresaId: string) => {
    console.log('═══════════════════════════════════════════════════');
    console.log('🏢 CAMBIO DE EMPRESA');
    console.log('═══════════════════════════════════════════════════');
    console.log('ID seleccionado:', empresaId);
    
    const selectedCliente = clientes.find(c => c.id.toString() === empresaId);
    console.log('Cliente encontrado:', selectedCliente);
    
    const empresaNombre = selectedCliente ? selectedCliente.nombre : undefined;
    console.log('Nombre de empresa:', empresaNombre);
    console.log('Longitud del nombre:', empresaNombre?.length);
    console.log('Nombre con marcadores:', empresaNombre ? `|${empresaNombre}|` : 'undefined');
    
    setFormData(prev => ({
      ...prev,
      empresa_id: empresaId || undefined,
      empresa_nombre: empresaNombre,
    }));

    // Cargar requerimientos de la empresa seleccionada
    if (empresaNombre) {
      console.log('─────────────────────────────────────────────────');
      console.log('📋 BUSCANDO REQUERIMIENTOS');
      console.log('WHERE empresa =', `'${empresaNombre}'`);
      console.log('─────────────────────────────────────────────────');
      
      setLoadingRequerimientos(true);
      setEmpresaRequerimientos([]);
      
      try {
        const reqs = await fetchEmpresaRequerimientos(empresaNombre);
        
        console.log('═══════════════════════════════════════════════════');
        console.log('✅ RESULTADO DE LA BÚSQUEDA');
        console.log('═══════════════════════════════════════════════════');
        console.log(`Total encontrados: ${reqs.length}`);
        
        if (reqs.length > 0) {
          console.log('\n📦 REQUERIMIENTOS ENCONTRADOS:');
          reqs.forEach((req, i) => {
            console.log(`\n  ${i + 1}. ${req.requerimiento}`);
            console.log(`     Categoría: ${req.categoria_requerimiento}`);
            console.log(`     Cargo: ${req.responsable}`);
            console.log(`     Observaciones: ${req.observaciones || 'N/A'}`);
          });
        } else {
          console.warn('\n⚠️ NO SE ENCONTRARON REQUERIMIENTOS');
          console.log('💡 Posibles causas:');
          console.log('   1. No hay datos en empresa_requerimiento para esta empresa');
          console.log('   2. El nombre de la empresa no coincide exactamente');
          console.log('   3. Hay espacios o caracteres invisibles en el nombre');
          console.log('\n🔧 Para verificar, ejecuta en Supabase:');
          console.log(`   SELECT * FROM empresa_requerimiento WHERE empresa = '${empresaNombre}';`);
          console.log(`   SELECT DISTINCT empresa FROM empresa_requerimiento;`);
        }
        console.log('═══════════════════════════════════════════════════\n');
        
        setEmpresaRequerimientos(reqs);
      } catch (error) {
        console.error('═══════════════════════════════════════════════════');
        console.error('❌ ERROR AL BUSCAR REQUERIMIENTOS');
        console.error('═══════════════════════════════════════════════════');
        console.error(error);
        console.error('═══════════════════════════════════════════════════\n');
        setEmpresaRequerimientos([]);
      } finally {
        setLoadingRequerimientos(false);
      }
    } else {
      console.log('⚠️ No se seleccionó ninguna empresa');
      setEmpresaRequerimientos([]);
    }
  };

  const handleSelectChange = (role: keyof ResponsablesData, responsableId: string) => {
    const selectedResponsable = responsables.find(r => r.id === parseInt(responsableId));
    const idKey = role;
    const nombreKey = role.replace('_id', '_nombre') as keyof ResponsablesData;
    
    setFormData(prev => ({
      ...prev,
      [idKey]: responsableId ? parseInt(responsableId) : undefined,
      [nombreKey]: selectedResponsable ? selectedResponsable.nombre_responsable : undefined,
    }));
  };

  const handleSubmit = () => {
    // Agregar nombres completos antes de guardar
    const dataToSave: ResponsablesData = { ...formData };
    
    if (formData.jpro_id) {
      const responsable = responsables.find(r => r.id === formData.jpro_id);
      dataToSave.jpro_nombre = responsable?.nombre_responsable;
    }
    if (formData.epr_id) {
      const responsable = responsables.find(r => r.id === formData.epr_id);
      dataToSave.epr_nombre = responsable?.nombre_responsable;
    }
    if (formData.rrhh_id) {
      const responsable = responsables.find(r => r.id === formData.rrhh_id);
      dataToSave.rrhh_nombre = responsable?.nombre_responsable;
    }
    if (formData.legal_id) {
      const responsable = responsables.find(r => r.id === formData.legal_id);
      dataToSave.legal_nombre = responsable?.nombre_responsable;
    }

    // Incluir los requerimientos de la empresa para guardarlos después
    dataToSave.empresaRequerimientos = empresaRequerimientos;

    onSave(dataToSave);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-primary px-6 py-5 flex items-center justify-between flex-shrink-0 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-white text-3xl">assignment_ind</span>
            <div>
              <h2 className="text-xl font-bold text-white">Asignar Responsables</h2>
              <p className="text-white/80 text-sm">{projectName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-gray-600">Cargando datos...</p>
              </div>
            </div>
          ) : (
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
                  value={formData.empresa_id || ''}
                  onChange={(e) => handleEmpresaChange(e.target.value)}
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

              {/* Tabla de Requerimientos de la Empresa */}
              {formData.empresa_nombre && (
                <div className="bg-blue-50/30 border border-blue-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-blue-600 text-xl">checklist</span>
                    <h4 className="text-sm font-bold text-[#111318]">
                      Requerimientos de {formData.empresa_nombre}
                    </h4>
                  </div>

                  {loadingRequerimientos ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : empresaRequerimientos.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-blue-200">
                            <th className="text-left py-2 px-3 font-semibold text-[#111318]">Requerimiento</th>
                            <th className="text-left py-2 px-3 font-semibold text-[#111318]">Categoría</th>
                            <th className="text-center py-2 px-3 font-semibold text-[#111318]">Cargo</th>
                            <th className="text-left py-2 px-3 font-semibold text-[#111318]">Nombre Responsable</th>
                            <th className="text-left py-2 px-3 font-semibold text-[#111318]">Observaciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {empresaRequerimientos.map((req, index) => {
                            // Colores por responsable
                            const responsableColors = {
                              'JPRO': 'bg-blue-100 text-blue-700 border-blue-300',
                              'EPR': 'bg-orange-100 text-orange-700 border-orange-300',
                              'RRHH': 'bg-green-100 text-green-700 border-green-300',
                              'Legal': 'bg-purple-100 text-purple-700 border-purple-300',
                            };
                            const colorClass = responsableColors[req.responsable as keyof typeof responsableColors] || 'bg-gray-100 text-gray-700 border-gray-300';

                            // Obtener el nombre del responsable SELECCIONADO en el dropdown según el cargo
                            let nombreResponsable = '';
                            if (req.responsable === 'JPRO') {
                              nombreResponsable = formData.jpro_nombre || '';
                            } else if (req.responsable === 'EPR') {
                              nombreResponsable = formData.epr_nombre || '';
                            } else if (req.responsable === 'RRHH') {
                              nombreResponsable = formData.rrhh_nombre || '';
                            } else if (req.responsable === 'Legal') {
                              nombreResponsable = formData.legal_nombre || '';
                            }

                            return (
                              <tr key={index} className="border-b border-blue-100 hover:bg-blue-50/50 transition-colors">
                                <td className="py-2.5 px-3 text-[#111318]">{req.requerimiento}</td>
                                <td className="py-2.5 px-3 text-[#616f89]">{req.categoria_requerimiento}</td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${colorClass}`}>
                                    {req.responsable}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-[#111318] font-medium">
                                  {nombreResponsable ? (
                                    <span className="text-[#111318]">{nombreResponsable}</span>
                                  ) : (
                                    <span className="text-gray-400 italic text-xs">Sin asignar</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-[#616f89] text-xs">
                                  {req.observaciones || '-'}
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
                      <p className="text-sm">No hay requerimientos estándar definidos para esta empresa</p>
                      <p className="text-xs mt-1">Las tareas se crearán manualmente</p>
                    </div>
                  )}
                </div>
              )}

              {/* Divisor */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500 font-medium">Responsables del Proyecto</span>
                </div>
              </div>

              {/* JPRO - Jefe de Proyecto */}
              <div className="bg-gray-50/50 border border-[#e5e7eb] rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined text-blue-600 text-2xl">engineering</span>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#111318]">
                      Jefe de Proyecto (JPRO)
                    </label>
                    <p className="text-xs text-[#616f89]">Responsable principal del proyecto</p>
                  </div>
                </div>
                <select
                  value={formData.jpro_id || ''}
                  onChange={(e) => handleSelectChange('jpro_id', e.target.value)}
                  className="w-full px-4 py-3 border border-[#dbdfe6] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-[#111318]"
                >
                  <option value="">Seleccionar responsable...</option>
                  {responsables.map((responsable) => (
                    <option key={responsable.id} value={responsable.id}>
                      {responsable.nombre_responsable} - {responsable.rut_responsable} ({responsable.cargo_responsable})
                    </option>
                  ))}
                </select>
              </div>

              {/* EPR - Especialista en Prevención de Riesgo */}
              <div className="bg-gray-50/50 border border-[#e5e7eb] rounded-xl p-5 hover:border-orange-300 hover:shadow-sm transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined text-orange-600 text-2xl">health_and_safety</span>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#111318]">
                      Especialista en Prevención de Riesgo (EPR)
                    </label>
                    <p className="text-xs text-[#616f89]">Responsable de seguridad y prevención</p>
                  </div>
                </div>
                <select
                  value={formData.epr_id || ''}
                  onChange={(e) => handleSelectChange('epr_id', e.target.value)}
                  className="w-full px-4 py-3 border border-[#dbdfe6] rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white text-[#111318]"
                >
                  <option value="">Seleccionar responsable...</option>
                  {responsables.map((responsable) => (
                    <option key={responsable.id} value={responsable.id}>
                      {responsable.nombre_responsable} - {responsable.rut_responsable} ({responsable.cargo_responsable})
                    </option>
                  ))}
                </select>
              </div>

              {/* RRHH - Recursos Humanos */}
              <div className="bg-gray-50/50 border border-[#e5e7eb] rounded-xl p-5 hover:border-green-300 hover:shadow-sm transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined text-green-600 text-2xl">groups</span>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#111318]">
                      Recursos Humanos (RRHH)
                    </label>
                    <p className="text-xs text-[#616f89]">Responsable de gestión de personal</p>
                  </div>
                </div>
                <select
                  value={formData.rrhh_id || ''}
                  onChange={(e) => handleSelectChange('rrhh_id', e.target.value)}
                  className="w-full px-4 py-3 border border-[#dbdfe6] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white text-[#111318]"
                >
                  <option value="">Seleccionar responsable...</option>
                  {responsables.map((responsable) => (
                    <option key={responsable.id} value={responsable.id}>
                      {responsable.nombre_responsable} - {responsable.rut_responsable} ({responsable.cargo_responsable})
                    </option>
                  ))}
                </select>
              </div>

              {/* Legal */}
              <div className="bg-gray-50/50 border border-[#e5e7eb] rounded-xl p-5 hover:border-purple-300 hover:shadow-sm transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined text-purple-600 text-2xl">gavel</span>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#111318]">
                      Legal
                    </label>
                    <p className="text-xs text-[#616f89]">Responsable de asuntos legales</p>
                  </div>
                </div>
                <select
                  value={formData.legal_id || ''}
                  onChange={(e) => handleSelectChange('legal_id', e.target.value)}
                  className="w-full px-4 py-3 border border-[#dbdfe6] rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all bg-white text-[#111318]"
                >
                  <option value="">Seleccionar responsable...</option>
                  {responsables.map((responsable) => (
                    <option key={responsable.id} value={responsable.id}>
                      {responsable.nombre_responsable} - {responsable.rut_responsable} ({responsable.cargo_responsable})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50/50 border-t border-[#e5e7eb] flex justify-end gap-3 flex-shrink-0 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg border border-gray-200 bg-white text-[#616f89] font-medium hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary-hover shadow-sm shadow-primary/20 hover:shadow-primary/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-xl">save</span>
            Guardar Responsables
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignResponsiblesModal;


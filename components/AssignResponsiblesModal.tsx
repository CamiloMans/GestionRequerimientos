import React, { useState, useEffect } from 'react';
import { fetchPersonas } from '../services/supabaseService';
import { Persona, MOCK_COMPANIES } from '../types';

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
}

const AssignResponsiblesModal: React.FC<AssignResponsiblesModalProps> = ({
  isOpen,
  onClose,
  onSave,
  projectName,
  currentResponsables,
}) => {
  const [personas, setPersonas] = useState<Persona[]>([]);
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
      loadPersonas();
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

  const loadPersonas = async () => {
    try {
      setLoading(true);
      const data = await fetchPersonas();
      setPersonas(data);
    } catch (error) {
      console.error('Error cargando personas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmpresaChange = (empresaId: string) => {
    const selectedEmpresa = MOCK_COMPANIES.find(c => c.id === empresaId);
    setFormData(prev => ({
      ...prev,
      empresa_id: empresaId || undefined,
      empresa_nombre: selectedEmpresa ? selectedEmpresa.name : undefined,
    }));
  };

  const handleSelectChange = (role: keyof ResponsablesData, personaId: string) => {
    const selectedPersona = personas.find(p => p.id === parseInt(personaId));
    const idKey = role;
    const nombreKey = role.replace('_id', '_nombre') as keyof ResponsablesData;
    
    setFormData(prev => ({
      ...prev,
      [idKey]: personaId ? parseInt(personaId) : undefined,
      [nombreKey]: selectedPersona ? selectedPersona.nombre_completo : undefined,
    }));
  };

  const handleSubmit = () => {
    // Agregar nombres completos antes de guardar
    const dataToSave: ResponsablesData = { ...formData };
    
    if (formData.jpro_id) {
      const persona = personas.find(p => p.id === formData.jpro_id);
      dataToSave.jpro_nombre = persona?.nombre_completo;
    }
    if (formData.epr_id) {
      const persona = personas.find(p => p.id === formData.epr_id);
      dataToSave.epr_nombre = persona?.nombre_completo;
    }
    if (formData.rrhh_id) {
      const persona = personas.find(p => p.id === formData.rrhh_id);
      dataToSave.rrhh_nombre = persona?.nombre_completo;
    }
    if (formData.legal_id) {
      const persona = personas.find(p => p.id === formData.legal_id);
      dataToSave.legal_nombre = persona?.nombre_completo;
    }

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
                <p className="text-gray-600">Cargando personas...</p>
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
                  {MOCK_COMPANIES.map((empresa) => (
                    <option key={empresa.id} value={empresa.id}>
                      {empresa.name}
                    </option>
                  ))}
                </select>
              </div>

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
                  <option value="">Seleccionar persona...</option>
                  {personas.map((persona) => (
                    <option key={persona.id} value={persona.id}>
                      {persona.nombre_completo} - {persona.rut}
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
                  <option value="">Seleccionar persona...</option>
                  {personas.map((persona) => (
                    <option key={persona.id} value={persona.id}>
                      {persona.nombre_completo} - {persona.rut}
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
                  <option value="">Seleccionar persona...</option>
                  {personas.map((persona) => (
                    <option key={persona.id} value={persona.id}>
                      {persona.nombre_completo} - {persona.rut}
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
                  <option value="">Seleccionar persona...</option>
                  {personas.map((persona) => (
                    <option key={persona.id} value={persona.id}>
                      {persona.nombre_completo} - {persona.rut}
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


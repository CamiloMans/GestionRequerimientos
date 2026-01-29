import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { fetchPersonas } from '../services/acreditacionService';
import { Persona } from '../types';

interface AssignResponsiblesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (responsables: ResponsablesData) => void;
  projectName: string;
  projectCode?: string;
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
  acreditacion_id?: number;
  acreditacion_nombre?: string;
  empresaRequerimientos?: import('../types').EmpresaRequerimiento[];
}

const AssignResponsiblesModal: React.FC<AssignResponsiblesModalProps> = ({
  isOpen,
  onClose,
  onSave,
  projectName,
  projectCode,
  currentResponsables,
}) => {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchJpro, setSearchJpro] = useState('');
  const [searchEpr, setSearchEpr] = useState('');
  const [searchRrhh, setSearchRrhh] = useState('');
  const [searchLegal, setSearchLegal] = useState('');
  // Estados para el buscador con dropdown de JPRO
  const [searchTermJpro, setSearchTermJpro] = useState('');
  const [showDropdownJpro, setShowDropdownJpro] = useState(false);
  const [filteredPersonasJpro, setFilteredPersonasJpro] = useState<Persona[]>([]);
  // Estados para el buscador con dropdown de EPR
  const [searchTermEpr, setSearchTermEpr] = useState('');
  const [showDropdownEpr, setShowDropdownEpr] = useState(false);
  const [filteredPersonasEpr, setFilteredPersonasEpr] = useState<Persona[]>([]);
  // Estados para el buscador con dropdown de RRHH
  const [searchTermRrhh, setSearchTermRrhh] = useState('');
  const [showDropdownRrhh, setShowDropdownRrhh] = useState(false);
  const [filteredPersonasRrhh, setFilteredPersonasRrhh] = useState<Persona[]>([]);
  // Estados para el buscador con dropdown de Legal
  const [searchTermLegal, setSearchTermLegal] = useState('');
  const [showDropdownLegal, setShowDropdownLegal] = useState(false);
  const [filteredPersonasLegal, setFilteredPersonasLegal] = useState<Persona[]>([]);
  // Estados para el buscador con dropdown de Acreditación
  const [searchTermAcreditacion, setSearchTermAcreditacion] = useState('');
  const [showDropdownAcreditacion, setShowDropdownAcreditacion] = useState(false);
  const [filteredPersonasAcreditacion, setFilteredPersonasAcreditacion] = useState<Persona[]>([]);
  // Refs para los inputs
  const inputJproRef = useRef<HTMLInputElement>(null);
  const inputEprRef = useRef<HTMLInputElement>(null);
  const inputRrhhRef = useRef<HTMLInputElement>(null);
  const inputLegalRef = useRef<HTMLInputElement>(null);
  const inputAcreditacionRef = useRef<HTMLInputElement>(null);
  // Estados para la posición de los dropdowns
  const [dropdownPositionJpro, setDropdownPositionJpro] = useState<{ top: number; left: number; width: number } | null>(null);
  const [dropdownPositionEpr, setDropdownPositionEpr] = useState<{ top: number; left: number; width: number } | null>(null);
  const [dropdownPositionRrhh, setDropdownPositionRrhh] = useState<{ top: number; left: number; width: number } | null>(null);
  const [dropdownPositionLegal, setDropdownPositionLegal] = useState<{ top: number; left: number; width: number } | null>(null);
  const [dropdownPositionAcreditacion, setDropdownPositionAcreditacion] = useState<{ top: number; left: number; width: number } | null>(null);
  const [formData, setFormData] = useState<ResponsablesData>({
    empresa_id: currentResponsables?.empresa_id,
    empresa_nombre: currentResponsables?.empresa_nombre,
    jpro_id: currentResponsables?.jpro_id,
    epr_id: currentResponsables?.epr_id,
    rrhh_id: currentResponsables?.rrhh_id,
    legal_id: currentResponsables?.legal_id,
    acreditacion_id: currentResponsables?.acreditacion_id,
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
      // Establecer filtro por defecto para Acreditación
      setSearchTermAcreditacion('Acreditaciones');
    } else {
      // Limpiar el filtro cuando se cierra el modal
      setSearchTermAcreditacion('');
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
        acreditacion_id: currentResponsables.acreditacion_id,
      });
    }
  }, [currentResponsables]);

  // Filtrar personas cuando cambia el término de búsqueda de JPRO
  useEffect(() => {
    if (searchTermJpro.trim() === '') {
      setFilteredPersonasJpro(personas);
    } else {
      const filtered = personas.filter(persona => 
        persona.nombre_completo.toLowerCase().includes(searchTermJpro.toLowerCase()) ||
        persona.rut.toLowerCase().includes(searchTermJpro.toLowerCase())
      );
      setFilteredPersonasJpro(filtered);
    }
  }, [searchTermJpro, personas]);

  // Filtrar personas cuando cambia el término de búsqueda de EPR
  useEffect(() => {
    if (searchTermEpr.trim() === '') {
      setFilteredPersonasEpr(personas);
    } else {
      const filtered = personas.filter(persona => 
        persona.nombre_completo.toLowerCase().includes(searchTermEpr.toLowerCase()) ||
        persona.rut.toLowerCase().includes(searchTermEpr.toLowerCase())
      );
      setFilteredPersonasEpr(filtered);
    }
  }, [searchTermEpr, personas]);

  // Filtrar personas cuando cambia el término de búsqueda de RRHH
  useEffect(() => {
    if (searchTermRrhh.trim() === '') {
      setFilteredPersonasRrhh(personas);
    } else {
      const filtered = personas.filter(persona => 
        persona.nombre_completo.toLowerCase().includes(searchTermRrhh.toLowerCase()) ||
        persona.rut.toLowerCase().includes(searchTermRrhh.toLowerCase())
      );
      setFilteredPersonasRrhh(filtered);
    }
  }, [searchTermRrhh, personas]);

  // Filtrar personas cuando cambia el término de búsqueda de Legal
  useEffect(() => {
    if (searchTermLegal.trim() === '') {
      setFilteredPersonasLegal(personas);
    } else {
      const filtered = personas.filter(persona => 
        persona.nombre_completo.toLowerCase().includes(searchTermLegal.toLowerCase()) ||
        persona.rut.toLowerCase().includes(searchTermLegal.toLowerCase())
      );
      setFilteredPersonasLegal(filtered);
    }
  }, [searchTermLegal, personas]);

  // Filtrar personas cuando cambia el término de búsqueda de Acreditación
  useEffect(() => {
    if (searchTermAcreditacion.trim() === '') {
      setFilteredPersonasAcreditacion(personas);
    } else {
      const term = searchTermAcreditacion.toLowerCase();
      const filtered = personas.filter(persona => 
        persona.nombre_completo.toLowerCase().includes(term) ||
        persona.rut.toLowerCase().includes(term) ||
        (persona.cargo_myma_id && String(persona.cargo_myma_id).toLowerCase().includes(term)) ||
        (persona.cargo_nombre && persona.cargo_nombre.toLowerCase().includes(term))
      );
      setFilteredPersonasAcreditacion(filtered);
    }
  }, [searchTermAcreditacion, personas]);

  // Actualizar el texto de búsqueda cuando se carga una persona en modo edición
  useEffect(() => {
    if (formData.jpro_id && personas.length > 0) {
      const persona = personas.find(p => p.id === formData.jpro_id);
      if (persona) {
        setSearchTermJpro(`${persona.nombre_completo} - ${persona.rut}`);
      }
    }
    if (formData.epr_id && personas.length > 0) {
      const persona = personas.find(p => p.id === formData.epr_id);
      if (persona) {
        setSearchTermEpr(`${persona.nombre_completo} - ${persona.rut}`);
      }
    }
    if (formData.rrhh_id && personas.length > 0) {
      const persona = personas.find(p => p.id === formData.rrhh_id);
      if (persona) {
        setSearchTermRrhh(`${persona.nombre_completo} - ${persona.rut}`);
      }
    }
    if (formData.legal_id && personas.length > 0) {
      const persona = personas.find(p => p.id === formData.legal_id);
      if (persona) {
        setSearchTermLegal(`${persona.nombre_completo} - ${persona.rut}`);
      }
    }
    if (formData.acreditacion_id && personas.length > 0) {
      const persona = personas.find(p => p.id === formData.acreditacion_id);
      if (persona) {
        setSearchTermAcreditacion(`${persona.nombre_completo} - ${persona.rut}`);
      }
    }
  }, [formData.jpro_id, formData.epr_id, formData.rrhh_id, formData.legal_id, formData.acreditacion_id, personas]);

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const searchContainer = target.closest('#persona_search') || target.closest('[id^="persona_search"]') ||
                              target.closest('#persona_search_epr') || target.closest('#persona_search_rrhh') || 
                              target.closest('#persona_search_legal') || target.closest('#persona_search_acreditacion');
      const dropdown = target.closest('.dropdown-jpro-results') || target.closest('.dropdown-epr-results') ||
                       target.closest('.dropdown-rrhh-results') || target.closest('.dropdown-legal-results') ||
                       target.closest('.dropdown-acreditacion-results');
      if (!searchContainer && !dropdown) {
        setShowDropdownJpro(false);
        setShowDropdownEpr(false);
        setShowDropdownRrhh(false);
        setShowDropdownLegal(false);
        setShowDropdownAcreditacion(false);
      }
    };

    if (showDropdownJpro || showDropdownEpr || showDropdownRrhh || showDropdownLegal || showDropdownAcreditacion) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdownJpro, showDropdownEpr, showDropdownRrhh, showDropdownLegal, showDropdownAcreditacion]);

  const loadData = async () => {
    try {
      setLoading(true);
      const personasData = await fetchPersonas();
      setPersonas(personasData);
    } catch (error) {
      console.error('Error cargando personas:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterPersonas = (search: string) => {
    const term = search.trim().toLowerCase();
    if (!term) return personas;
    return personas.filter(p =>
      p.nombre_completo.toLowerCase().includes(term) ||
      p.rut.toLowerCase().includes(term)
    );
  };

  const handleSelectChange = (role: keyof ResponsablesData, responsableId: string) => {
    const selectedPersona = personas.find(p => p.id === parseInt(responsableId));
    const idKey = role;
    const nombreKey = role.replace('_id', '_nombre') as keyof ResponsablesData;
    
    setFormData(prev => ({
      ...prev,
      [idKey]: responsableId ? parseInt(responsableId) : undefined,
      [nombreKey]: selectedPersona ? selectedPersona.nombre_completo : undefined,
    }));
  };

  // Función para calcular la posición del dropdown
  const calculateDropdownPosition = (inputRef: React.RefObject<HTMLInputElement>) => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      return {
        top: rect.bottom + 4, // Usar posición relativa al viewport (getBoundingClientRect ya da esto)
        left: rect.left,
        width: rect.width,
      };
    }
    return null;
  };

  // Manejar la búsqueda de colaboradores JPRO
  const handleSearchChangeJpro = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTermJpro(e.target.value);
    const position = calculateDropdownPosition(inputJproRef);
    setDropdownPositionJpro(position);
    setShowDropdownJpro(true);
    // Si se borra el texto, resetear la selección
    if (e.target.value === '') {
      setFormData(prev => ({...prev, jpro_id: undefined, jpro_nombre: undefined}));
    }
  };

  // Seleccionar una persona del dropdown JPRO
  const handleSelectPersonaJpro = (persona: Persona) => {
    setFormData(prev => ({
      ...prev,
      jpro_id: persona.id,
      jpro_nombre: persona.nombre_completo,
    }));
    setSearchTermJpro(`${persona.nombre_completo} - ${persona.rut}`);
    setShowDropdownJpro(false);
  };

  // Manejar la búsqueda de colaboradores EPR
  const handleSearchChangeEpr = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTermEpr(e.target.value);
    const position = calculateDropdownPosition(inputEprRef);
    setDropdownPositionEpr(position);
    setShowDropdownEpr(true);
    if (e.target.value === '') {
      setFormData(prev => ({...prev, epr_id: undefined, epr_nombre: undefined}));
    }
  };

  // Seleccionar una persona del dropdown EPR
  const handleSelectPersonaEpr = (persona: Persona) => {
    setFormData(prev => ({
      ...prev,
      epr_id: persona.id,
      epr_nombre: persona.nombre_completo,
    }));
    setSearchTermEpr(`${persona.nombre_completo} - ${persona.rut}`);
    setShowDropdownEpr(false);
  };

  // Manejar la búsqueda de colaboradores RRHH
  const handleSearchChangeRrhh = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTermRrhh(e.target.value);
    const position = calculateDropdownPosition(inputRrhhRef);
    setDropdownPositionRrhh(position);
    setShowDropdownRrhh(true);
    if (e.target.value === '') {
      setFormData(prev => ({...prev, rrhh_id: undefined, rrhh_nombre: undefined}));
    }
  };

  // Seleccionar una persona del dropdown RRHH
  const handleSelectPersonaRrhh = (persona: Persona) => {
    setFormData(prev => ({
      ...prev,
      rrhh_id: persona.id,
      rrhh_nombre: persona.nombre_completo,
    }));
    setSearchTermRrhh(`${persona.nombre_completo} - ${persona.rut}`);
    setShowDropdownRrhh(false);
  };

  // Manejar la búsqueda de colaboradores Legal
  const handleSearchChangeLegal = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTermLegal(e.target.value);
    const position = calculateDropdownPosition(inputLegalRef);
    setDropdownPositionLegal(position);
    setShowDropdownLegal(true);
    if (e.target.value === '') {
      setFormData(prev => ({...prev, legal_id: undefined, legal_nombre: undefined}));
    }
  };

  // Seleccionar una persona del dropdown Legal
  const handleSelectPersonaLegal = (persona: Persona) => {
    setFormData(prev => ({
      ...prev,
      legal_id: persona.id,
      legal_nombre: persona.nombre_completo,
    }));
    setSearchTermLegal(`${persona.nombre_completo} - ${persona.rut}`);
    setShowDropdownLegal(false);
  };

  // Manejar la búsqueda de colaboradores Acreditación
  const handleSearchChangeAcreditacion = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTermAcreditacion(e.target.value);
    const position = calculateDropdownPosition(inputAcreditacionRef);
    setDropdownPositionAcreditacion(position);
    setShowDropdownAcreditacion(true);
    if (e.target.value === '') {
      setFormData(prev => ({...prev, acreditacion_id: undefined, acreditacion_nombre: undefined}));
    }
  };

  // Seleccionar una persona del dropdown Acreditación
  const handleSelectPersonaAcreditacion = (persona: Persona) => {
    setFormData(prev => ({
      ...prev,
      acreditacion_id: persona.id,
      acreditacion_nombre: persona.nombre_completo,
    }));
    setSearchTermAcreditacion(`${persona.nombre_completo} - ${persona.rut}`);
    setShowDropdownAcreditacion(false);
  };

  const handleSubmit = async () => {
    // Limpiar errores y mensajes previos
    setError(null);
    setSuccess(null);

    try {
      setIsLoading(true);

      // Simular un pequeño delay para mejor UX (opcional)
      await new Promise(resolve => setTimeout(resolve, 300));

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
      if (formData.acreditacion_id) {
        const persona = personas.find(p => p.id === formData.acreditacion_id);
        dataToSave.acreditacion_nombre = persona?.nombre_completo;
      }

      // Ejecutar onSave (puede ser async)
      if (onSave) {
        await Promise.resolve(onSave(dataToSave));
      }

      // Mostrar mensaje de éxito
      setSuccess('Responsables asignados exitosamente.');
      
      // Esperar un momento para que el usuario vea el mensaje
      await new Promise(resolve => setTimeout(resolve, 1000));

      onClose();
    } catch (error: any) {
      console.error('Error guardando responsables:', error);
      const errorMessage = error?.message || 'Error al guardar responsables. Por favor intenta nuevamente.';
      setError(errorMessage);
      
      // El error se ocultará automáticamente después de 8 segundos
      setTimeout(() => setError(null), 8000);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {/* Overlay de carga - bloquea toda interacción */}
      {isLoading && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mb-4"></div>
            <h3 className="text-lg font-semibold text-[#111318] mb-2">Guardando responsables...</h3>
            <p className="text-sm text-[#616f89] text-center">
              Por favor espera mientras se guardan los responsables asignados.
            </p>
          </div>
        </div>
      )}

      {/* Mensaje de error */}
      {error && (
        <div className="fixed top-4 right-4 z-[60] bg-red-50 border-2 border-red-300 rounded-lg shadow-lg p-4 max-w-md animate-slide-in">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <span className="material-symbols-outlined text-red-600 text-2xl">error</span>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-red-900 mb-1">Error al guardar</h4>
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="flex-shrink-0 text-red-600 hover:text-red-800 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
      )}

      {/* Mensaje de éxito */}
      {success && (
        <div className="fixed top-4 right-4 z-[60] bg-green-50 border-2 border-green-300 rounded-lg shadow-lg p-4 max-w-md animate-slide-in">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <span className="material-symbols-outlined text-green-600 text-2xl">check_circle</span>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-green-900 mb-1">Guardado exitoso</h4>
              <p className="text-sm text-green-700">{success}</p>
            </div>
            <button
              onClick={() => setSuccess(null)}
              className="flex-shrink-0 text-green-600 hover:text-green-800 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
      )}

      <div className={`bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col ${isLoading ? 'pointer-events-none opacity-75' : ''}`}>
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
              {/* JPRO - Jefe de Proyecto */}
              <div className="bg-gray-50/50 border border-[#e5e7eb] rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all relative z-10">
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
                <div className="space-y-2 relative z-10" style={{ overflow: 'visible' }}>
                  <div className="relative z-20">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[20px]">search</span>
                    <input
                      ref={inputJproRef}
                      id="persona_search"
                      type="text"
                      className={`w-full pl-10 pr-10 rounded-lg text-sm focus:ring-primary shadow-sm py-2.5 ${
                        !formData.jpro_id 
                          ? 'border-2 border-orange-400 focus:border-orange-500' 
                          : 'border-gray-200 focus:border-primary'
                      }`}
                      placeholder="Buscar por nombre o RUT..."
                      value={searchTermJpro}
                      onChange={handleSearchChangeJpro}
                      onFocus={() => {
                        const position = calculateDropdownPosition(inputJproRef);
                        setDropdownPositionJpro(position);
                        setShowDropdownJpro(true);
                      }}
                      autoComplete="off"
                    />
                    {searchTermJpro && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchTermJpro('');
                          setFormData(prev => ({...prev, jpro_id: undefined, jpro_nombre: undefined}));
                          setShowDropdownJpro(true);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                      </button>
                    )}
                  </div>
                  
                  {/* Dropdown de resultados - Renderizado con Portal */}
                  {showDropdownJpro && dropdownPositionJpro && createPortal(
                    <div 
                      className="dropdown-jpro-results fixed bg-white border border-gray-200 rounded-lg shadow-2xl max-h-60 overflow-y-auto z-[99999]"
                      style={{ 
                        top: `${dropdownPositionJpro.top}px`,
                        left: `${dropdownPositionJpro.left}px`,
                        width: `${dropdownPositionJpro.width}px`,
                        zIndex: 99999
                      }}
                    >
                      {filteredPersonasJpro.length > 0 ? (
                        filteredPersonasJpro.map(persona => (
                          <button
                            key={persona.id}
                            type="button"
                            onClick={() => handleSelectPersonaJpro(persona)}
                            className={`w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors ${
                              formData.jpro_id === persona.id ? 'bg-blue-50' : ''
                            }`}
                          >
                            <div className="text-sm font-medium text-gray-900">{persona.nombre_completo}</div>
                            <div className="text-xs text-gray-500">{persona.rut}</div>
                            {persona.cargo_nombre && (
                              <div className="text-xs text-gray-600 mt-1">Cargo: {persona.cargo_nombre}</div>
                            )}
                            {persona.area_nombre && (
                              <div className="text-xs text-gray-600">Área: {persona.area_nombre}</div>
                            )}
                            {persona.cargo_myma_id && (
                              <div className="text-xs text-gray-400 mt-1">Cargo ID: {persona.cargo_myma_id}</div>
                            )}
                            {persona.gerencia_id && (
                              <div className="text-xs text-gray-400">Gerencia ID: {persona.gerencia_id}</div>
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          No se encontraron colaboradores
                        </div>
                      )}
                    </div>,
                    document.body
                  )}
                </div>
              </div>

              {/* EPR - Especialista en Prevención de Riesgo */}
              <div className="bg-gray-50/50 border border-[#e5e7eb] rounded-xl p-5 hover:border-orange-300 hover:shadow-sm transition-all relative z-10">
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
                <div className="space-y-2 relative z-10" style={{ overflow: 'visible' }}>
                  <div className="relative z-20">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[20px]">search</span>
                    <input
                      ref={inputEprRef}
                      id="persona_search_epr"
                      type="text"
                      className={`w-full pl-10 pr-10 rounded-lg text-sm focus:ring-primary shadow-sm py-2.5 ${
                        !formData.epr_id 
                          ? 'border-2 border-orange-400 focus:border-orange-500' 
                          : 'border-gray-200 focus:border-primary'
                      }`}
                      placeholder="Buscar por nombre o RUT..."
                      value={searchTermEpr}
                      onChange={handleSearchChangeEpr}
                      onFocus={() => {
                        const position = calculateDropdownPosition(inputEprRef);
                        setDropdownPositionEpr(position);
                        setShowDropdownEpr(true);
                      }}
                      autoComplete="off"
                    />
                    {searchTermEpr && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchTermEpr('');
                          setFormData(prev => ({...prev, epr_id: undefined, epr_nombre: undefined}));
                          setShowDropdownEpr(true);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                      </button>
                    )}
                  </div>
                  
                  {/* Dropdown de resultados - Renderizado con Portal */}
                  {showDropdownEpr && dropdownPositionEpr && createPortal(
                    <div 
                      className="dropdown-epr-results fixed bg-white border border-gray-200 rounded-lg shadow-2xl max-h-60 overflow-y-auto z-[99999]"
                      style={{ 
                        top: `${dropdownPositionEpr.top}px`,
                        left: `${dropdownPositionEpr.left}px`,
                        width: `${dropdownPositionEpr.width}px`,
                        zIndex: 99999
                      }}
                    >
                      {filteredPersonasEpr.length > 0 ? (
                        filteredPersonasEpr.map(persona => (
                          <button
                            key={persona.id}
                            type="button"
                            onClick={() => handleSelectPersonaEpr(persona)}
                            className={`w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors ${
                              formData.epr_id === persona.id ? 'bg-orange-50' : ''
                            }`}
                          >
                            <div className="text-sm font-medium text-gray-900">{persona.nombre_completo}</div>
                            <div className="text-xs text-gray-500">{persona.rut}</div>
                            {persona.cargo_nombre && (
                              <div className="text-xs text-gray-600 mt-1">Cargo: {persona.cargo_nombre}</div>
                            )}
                            {persona.area_nombre && (
                              <div className="text-xs text-gray-600">Área: {persona.area_nombre}</div>
                            )}
                            {persona.cargo_myma_id && (
                              <div className="text-xs text-gray-400 mt-1">Cargo ID: {persona.cargo_myma_id}</div>
                            )}
                            {persona.gerencia_id && (
                              <div className="text-xs text-gray-400">Gerencia ID: {persona.gerencia_id}</div>
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          No se encontraron colaboradores
                        </div>
                      )}
                    </div>,
                    document.body
                  )}
                </div>
              </div>

              {/* RRHH - Recursos Humanos */}
              <div className="bg-gray-50/50 border border-[#e5e7eb] rounded-xl p-5 hover:border-green-300 hover:shadow-sm transition-all relative z-10">
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
                <div className="space-y-2 relative z-10" style={{ overflow: 'visible' }}>
                  <div className="relative z-20">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[20px]">search</span>
                    <input
                      ref={inputRrhhRef}
                      id="persona_search_rrhh"
                      type="text"
                      className={`w-full pl-10 pr-10 rounded-lg text-sm focus:ring-primary shadow-sm py-2.5 ${
                        !formData.rrhh_id 
                          ? 'border-2 border-orange-400 focus:border-orange-500' 
                          : 'border-gray-200 focus:border-primary'
                      }`}
                      placeholder="Buscar por nombre o RUT..."
                      value={searchTermRrhh}
                      onChange={handleSearchChangeRrhh}
                      onFocus={() => {
                        const position = calculateDropdownPosition(inputRrhhRef);
                        setDropdownPositionRrhh(position);
                        setShowDropdownRrhh(true);
                      }}
                      autoComplete="off"
                    />
                    {searchTermRrhh && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchTermRrhh('');
                          setFormData(prev => ({...prev, rrhh_id: undefined, rrhh_nombre: undefined}));
                          setShowDropdownRrhh(true);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                      </button>
                    )}
                  </div>
                  
                  {/* Dropdown de resultados - Renderizado con Portal */}
                  {showDropdownRrhh && dropdownPositionRrhh && createPortal(
                    <div 
                      className="dropdown-rrhh-results fixed bg-white border border-gray-200 rounded-lg shadow-2xl max-h-60 overflow-y-auto z-[99999]"
                      style={{ 
                        top: `${dropdownPositionRrhh.top}px`,
                        left: `${dropdownPositionRrhh.left}px`,
                        width: `${dropdownPositionRrhh.width}px`,
                        zIndex: 99999
                      }}
                    >
                      {filteredPersonasRrhh.length > 0 ? (
                        filteredPersonasRrhh.map(persona => (
                          <button
                            key={persona.id}
                            type="button"
                            onClick={() => handleSelectPersonaRrhh(persona)}
                            className={`w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors ${
                              formData.rrhh_id === persona.id ? 'bg-green-50' : ''
                            }`}
                          >
                            <div className="text-sm font-medium text-gray-900">{persona.nombre_completo}</div>
                            <div className="text-xs text-gray-500">{persona.rut}</div>
                            {persona.cargo_nombre && (
                              <div className="text-xs text-gray-600 mt-1">Cargo: {persona.cargo_nombre}</div>
                            )}
                            {persona.area_nombre && (
                              <div className="text-xs text-gray-600">Área: {persona.area_nombre}</div>
                            )}
                            {persona.cargo_myma_id && (
                              <div className="text-xs text-gray-400 mt-1">Cargo ID: {persona.cargo_myma_id}</div>
                            )}
                            {persona.gerencia_id && (
                              <div className="text-xs text-gray-400">Gerencia ID: {persona.gerencia_id}</div>
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          No se encontraron colaboradores
                        </div>
                      )}
                    </div>,
                    document.body
                  )}
                </div>
              </div>

              {/* Legal */}
              <div className="bg-gray-50/50 border border-[#e5e7eb] rounded-xl p-5 hover:border-purple-300 hover:shadow-sm transition-all relative z-10">
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
                <div className="space-y-2 relative z-10" style={{ overflow: 'visible' }}>
                  <div className="relative z-20">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[20px]">search</span>
                    <input
                      ref={inputLegalRef}
                      id="persona_search_legal"
                      type="text"
                      className={`w-full pl-10 pr-10 rounded-lg text-sm focus:ring-primary shadow-sm py-2.5 ${
                        !formData.legal_id 
                          ? 'border-2 border-orange-400 focus:border-orange-500' 
                          : 'border-gray-200 focus:border-primary'
                      }`}
                      placeholder="Buscar por nombre o RUT..."
                      value={searchTermLegal}
                      onChange={handleSearchChangeLegal}
                      onFocus={() => {
                        const position = calculateDropdownPosition(inputLegalRef);
                        setDropdownPositionLegal(position);
                        setShowDropdownLegal(true);
                      }}
                      autoComplete="off"
                    />
                    {searchTermLegal && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchTermLegal('');
                          setFormData(prev => ({...prev, legal_id: undefined, legal_nombre: undefined}));
                          setShowDropdownLegal(true);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                      </button>
                    )}
                  </div>
                  
                  {/* Dropdown de resultados - Renderizado con Portal */}
                  {showDropdownLegal && dropdownPositionLegal && createPortal(
                    <div 
                      className="dropdown-legal-results fixed bg-white border border-gray-200 rounded-lg shadow-2xl max-h-60 overflow-y-auto z-[99999]"
                      style={{ 
                        top: `${dropdownPositionLegal.top}px`,
                        left: `${dropdownPositionLegal.left}px`,
                        width: `${dropdownPositionLegal.width}px`,
                        zIndex: 99999
                      }}
                    >
                      {filteredPersonasLegal.length > 0 ? (
                        filteredPersonasLegal.map(persona => (
                          <button
                            key={persona.id}
                            type="button"
                            onClick={() => handleSelectPersonaLegal(persona)}
                            className={`w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors ${
                              formData.legal_id === persona.id ? 'bg-purple-50' : ''
                            }`}
                          >
                            <div className="text-sm font-medium text-gray-900">{persona.nombre_completo}</div>
                            <div className="text-xs text-gray-500">{persona.rut}</div>
                            {persona.cargo_nombre && (
                              <div className="text-xs text-gray-600 mt-1">Cargo: {persona.cargo_nombre}</div>
                            )}
                            {persona.area_nombre && (
                              <div className="text-xs text-gray-600">Área: {persona.area_nombre}</div>
                            )}
                            {persona.cargo_myma_id && (
                              <div className="text-xs text-gray-400 mt-1">Cargo ID: {persona.cargo_myma_id}</div>
                            )}
                            {persona.gerencia_id && (
                              <div className="text-xs text-gray-400">Gerencia ID: {persona.gerencia_id}</div>
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          No se encontraron colaboradores
                        </div>
                      )}
                    </div>,
                    document.body
                  )}
                </div>
              </div>

              {/* Acreditación */}
              <div className="bg-gray-50/50 border border-[#e5e7eb] rounded-xl p-5 hover:border-indigo-300 hover:shadow-sm transition-all relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined text-indigo-600 text-2xl">verified</span>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#111318]">
                      Acreditación
                    </label>
                    <p className="text-xs text-[#616f89]">Responsable de acreditar la solicitud</p>
                  </div>
                </div>
                <div className="space-y-2 relative z-10" style={{ overflow: 'visible' }}>
                  <div className="relative z-20">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[20px]">search</span>
                    <input
                      ref={inputAcreditacionRef}
                      id="persona_search_acreditacion"
                      type="text"
                      className={`w-full pl-10 pr-10 rounded-lg text-sm focus:ring-primary shadow-sm py-2.5 ${
                        !formData.acreditacion_id 
                          ? 'border-2 border-orange-400 focus:border-orange-500' 
                          : 'border-gray-200 focus:border-primary'
                      }`}
                      placeholder="Buscar por nombre o RUT..."
                      value={searchTermAcreditacion}
                      onChange={handleSearchChangeAcreditacion}
                      onFocus={() => {
                        const position = calculateDropdownPosition(inputAcreditacionRef);
                        setDropdownPositionAcreditacion(position);
                        setShowDropdownAcreditacion(true);
                      }}
                      autoComplete="off"
                    />
                    {searchTermAcreditacion && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchTermAcreditacion('');
                          setFormData(prev => ({...prev, acreditacion_id: undefined, acreditacion_nombre: undefined}));
                          setShowDropdownAcreditacion(true);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                      </button>
                    )}
                  </div>
                  
                  {/* Dropdown de resultados - Renderizado con Portal */}
                  {showDropdownAcreditacion && dropdownPositionAcreditacion && createPortal(
                    <div 
                      className="dropdown-acreditacion-results fixed bg-white border border-gray-200 rounded-lg shadow-2xl max-h-60 overflow-y-auto z-[99999]"
                      style={{ 
                        top: `${dropdownPositionAcreditacion.top}px`,
                        left: `${dropdownPositionAcreditacion.left}px`,
                        width: `${dropdownPositionAcreditacion.width}px`,
                        zIndex: 99999
                      }}
                    >
                      {filteredPersonasAcreditacion.length > 0 ? (
                        filteredPersonasAcreditacion.map(persona => (
                          <button
                            key={persona.id}
                            type="button"
                            onClick={() => handleSelectPersonaAcreditacion(persona)}
                            className={`w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors ${
                              formData.acreditacion_id === persona.id ? 'bg-indigo-50' : ''
                            }`}
                          >
                            <div className="text-sm font-medium text-gray-900">{persona.nombre_completo}</div>
                            <div className="text-xs text-gray-500">{persona.rut}</div>
                            {persona.cargo_nombre && (
                              <div className="text-xs text-gray-600 mt-1">Cargo: {persona.cargo_nombre}</div>
                            )}
                            {persona.area_nombre && (
                              <div className="text-xs text-gray-600">Área: {persona.area_nombre}</div>
                            )}
                            {persona.cargo_myma_id && (
                              <div className="text-xs text-gray-400 mt-1">Cargo ID: {persona.cargo_myma_id}</div>
                            )}
                            {persona.gerencia_id && (
                              <div className="text-xs text-gray-400">Gerencia ID: {persona.gerencia_id}</div>
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          No se encontraron colaboradores
                        </div>
                      )}
                    </div>,
                    document.body
                  )}
                </div>
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
            disabled={loading || isLoading}
            className="px-6 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary-hover shadow-sm shadow-primary/20 hover:shadow-primary/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Guardando...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-xl">save</span>
                Guardar Responsables
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignResponsiblesModal;


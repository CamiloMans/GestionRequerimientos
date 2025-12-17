import React, { useState, useEffect } from 'react';
import { Worker, WorkerType, MOCK_WORKERS_DB, MOCK_COMPANIES, Persona } from '../types';
import { fetchPersonas } from '../services/supabaseService';

interface WorkerListProps {
  workers: Worker[];
  onAddWorker: (worker: Worker) => void;
  onRemoveWorker: (id: string) => void;
}

export const WorkerList: React.FC<WorkerListProps> = ({ workers, onAddWorker, onRemoveWorker }) => {
  const [selectedType, setSelectedType] = useState<WorkerType>(WorkerType.INTERNAL);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Internal State
  const [searchQuery, setSearchQuery] = useState('');
  
  // External State (Manual Entry)
  const [extCompany, setExtCompany] = useState('');
  const [extName, setExtName] = useState('');
  const [extPhone, setExtPhone] = useState('');

  // Cargar personas de Supabase
  useEffect(() => {
    loadPersonas();
  }, []);

  const loadPersonas = async () => {
    try {
      setLoading(true);
      const data = await fetchPersonas();
      setPersonas(data);
    } catch (error) {
      console.error('Error loading personas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    if (selectedType === WorkerType.INTERNAL) {
      if (!searchQuery.trim()) return;
      
      // Extraer el nombre y RUT del searchQuery (formato: "Nombre - RUT")
      const searchParts = searchQuery.split(' - ');
      const nombreBuscado = searchParts[0].trim();
      const rutBuscado = searchParts.length > 1 ? searchParts[1].trim() : '';
      
      // Buscar la persona en la base de datos de Supabase
      const existingPersona = personas.find(p => 
        p.nombre_completo.toLowerCase() === nombreBuscado.toLowerCase() ||
        p.rut === rutBuscado ||
        searchQuery.toLowerCase().includes(p.nombre_completo.toLowerCase())
      );
      
      const newWorker: Worker = {
        id: Date.now().toString(),
        name: existingPersona ? existingPersona.nombre_completo : nombreBuscado,
        type: WorkerType.INTERNAL,
        phone: existingPersona?.telefono || '+56 9 XXXX XXXX'
      };
      onAddWorker(newWorker);
      setSearchQuery('');
    } else {
      if (!extName.trim()) return; // Minimal validation
      
      const newWorker: Worker = {
        id: Date.now().toString(),
        name: extName,
        type: WorkerType.EXTERNAL,
        company: extCompany || 'Empresa Externa',
        phone: extPhone || 'Sin contacto'
      };
      onAddWorker(newWorker);
      // Reset
      setExtCompany('');
      setExtName('');
      setExtPhone('');
    }
  };

  const isExternal = selectedType === WorkerType.EXTERNAL;

  return (
    <div className="flex flex-col gap-4 md:col-span-2 border-2 border-dashed border-primary/40 rounded-xl p-5 bg-blue-50/20">
      <div className="flex flex-col gap-1 mb-2">
        <h4 className="text-[#111318] text-sm font-bold">Agregar Trabajadores</h4>
        <p className="text-xs text-[#616f89]">
          Agregue colaboradores a la lista. Puede buscar trabajadores internos existentes o registrar externos manualmente.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        <div className="md:col-span-9 flex flex-col gap-2">
          <span className="text-[#111318] text-xs font-semibold">Buscar / Nombre</span>
          <div className="relative">
            <input 
              type="text"
              list="staff-list"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nombre del colaborador..."
              className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm text-[#111318] placeholder-[#616f89] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all pl-9"
            />
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#616f89] text-base">search</span>
            <datalist id="staff-list">
              {personas.map(persona => (
                <option key={persona.id} value={`${persona.nombre_completo} - ${persona.rut}`} />
              ))}
            </datalist>
          </div>
        </div>
        
        <div className="md:col-span-3 flex items-end">
          <button 
            type="button"
            onClick={handleAdd}
            className="w-full h-[42px] bg-white border-2 border-primary text-primary hover:bg-primary hover:text-white font-semibold rounded-lg text-sm px-4 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-lg">person_add</span>
            <span>Agregar a lista</span>
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <span className="text-[#111318] text-[10px] font-bold uppercase tracking-wider text-gray-500">Lista de Asistentes</span>
        <div className="bg-white border border-[#dbdfe6] rounded-lg overflow-hidden shadow-sm">
          {workers.length === 0 ? (
            <div className="p-6 flex flex-col items-center justify-center text-center gap-2">
              <span className="material-symbols-outlined text-gray-300 text-4xl">group</span>
              <p className="text-xs text-gray-500">No hay trabajadores seleccionados.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#dbdfe6]">
              {workers.map((worker) => (
                <div key={worker.id} className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${
                      worker.type === WorkerType.INTERNAL 
                        ? 'bg-blue-100 text-primary' 
                        : 'bg-orange-100 text-orange-600'
                    }`}>
                      {worker.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#111318]">{worker.name}</span>
                        <span className={`px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wide border ${
                           worker.type === WorkerType.INTERNAL 
                             ? 'bg-blue-50 text-blue-700 border-blue-200'
                             : 'bg-orange-50 text-orange-700 border-orange-200'
                        }`}>
                           {worker.type === WorkerType.INTERNAL ? 'Interno' : 'Externo'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#616f89] mt-0.5">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">phone</span> {worker.phone}
                        </span>
                        {worker.company && (
                          <span className="flex items-center gap-1 text-gray-500">
                             • <span className="material-symbols-outlined text-xs">business</span> {worker.company}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => onRemoveWorker(worker.id)}
                    className="text-gray-300 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition-all"
                    title="Eliminar"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


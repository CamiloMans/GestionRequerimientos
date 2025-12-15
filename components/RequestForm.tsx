import React, { useState } from 'react';
import { NewRequestPayload, RequirementType, RequestStatus, RequestItem } from '../types';

interface RequestFormProps {
  onBack: () => void;
  onSave: (data: NewRequestPayload) => void;
  initialData?: RequestItem | null;
}

const RequestForm: React.FC<RequestFormProps> = ({ onBack, onSave, initialData }) => {
  const isEditing = !!initialData;
  const [formData, setFormData] = useState<NewRequestPayload>({
    name: initialData?.name || '',
    requirement: initialData?.requirement || '' as RequirementType,
    status: initialData?.status || RequestStatus.Current,
    adjudicationDate: initialData?.adjudicationDate || '',
    expirationDate: initialData?.expirationDate || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.requirement) {
      alert("Por favor complete los campos requeridos");
      return;
    }
    onSave(formData);
  };

  return (
    <div className="layout-container flex h-full grow flex-col">
      <div className="mx-auto flex w-full max-w-[1000px] flex-1 flex-col px-6 py-8 md:px-10 lg:px-12">
        {/* Breadcrumbs */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <a href="#" onClick={onBack} className="text-[#616f89] hover:text-primary text-sm font-medium transition-colors">Inicio</a>
          <span className="material-symbols-outlined text-[#616f89] text-base">chevron_right</span>
          <a href="#" onClick={onBack} className="text-[#616f89] hover:text-primary text-sm font-medium transition-colors">Solicitudes</a>
          <span className="material-symbols-outlined text-[#616f89] text-base">chevron_right</span>
          <span className="text-[#111318] text-sm font-medium">{isEditing ? 'Editar Solicitud' : 'Crear Nuevo Registro'}</span>
        </div>

        {/* Header */}
        <div className="mb-8 flex flex-wrap justify-between items-end gap-4 border-b border-[#e5e7eb] pb-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-[#111318] text-3xl font-bold tracking-tight">
              {isEditing ? 'Editar Solicitud' : 'Crear Nuevo Registro de Solicitud'}
            </h1>
            <p className="text-[#616f89] text-base font-normal">
              {isEditing 
                ? 'Modifique los datos de la solicitud existente.' 
                : 'Complete el formulario para registrar una nueva solicitud de colaborador.'}
            </p>
          </div>
          <div>
            <button 
              onClick={onBack}
              className="flex items-center gap-2 bg-white hover:bg-gray-50 text-[#616f89] border border-gray-200 px-4 py-2.5 rounded-lg font-medium shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              Volver al Listado
            </button>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 md:p-8">
          <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
            {/* Section 1 */}
            <div>
              <h2 className="text-lg font-semibold text-[#111318] mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">person</span>
                Datos del Colaborador
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-1 md:col-span-2 space-y-2">
                  <label htmlFor="name" className="block text-sm font-medium text-[#111318]">Nombre Completo</label>
                  <input 
                    type="text" 
                    id="name" 
                    name="name" 
                    placeholder="Ingrese el nombre del colaborador" 
                    className="w-full rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-primary shadow-sm py-2.5"
                    value={formData.name}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Section 2 */}
            <div>
              <h2 className="text-lg font-semibold text-[#111318] mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">assignment</span>
                Detalles de la Solicitud
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="requirement" className="block text-sm font-medium text-[#111318]">Requerimiento</label>
                  <select 
                    id="requirement" 
                    name="requirement" 
                    className="w-full rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-primary shadow-sm py-2.5"
                    value={formData.requirement}
                    onChange={handleChange}
                  >
                    <option value="" disabled>Seleccione un tipo...</option>
                    <option value={RequirementType.AUD}>AUD - Auditoría</option>
                    <option value={RequirementType.CTT}>C.TT - Contrato Trabajo</option>
                    <option value={RequirementType.CCD}>CCD - Certificado Conducción</option>
                    <option value={RequirementType.CEXT}>C.EXT - Curso Externo</option>
                    <option value={RequirementType.EPP}>EPP - Equipo Protección Personal</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="status" className="block text-sm font-medium text-[#111318]">Estado Inicial</label>
                  <select 
                    id="status" 
                    name="status" 
                    className="w-full rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-primary shadow-sm py-2.5"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value={RequestStatus.Current}>Vigente</option>
                    <option value={RequestStatus.InRenewal}>En Renovación</option>
                    <option value={RequestStatus.Expiring}>A vencer</option>
                    <option value={RequestStatus.Expired}>Vencida</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="adjudicationDate" className="block text-sm font-medium text-[#111318]">Fecha de Adjudicación</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[20px]">calendar_today</span>
                    <input 
                      type="date" 
                      id="adjudicationDate" 
                      name="adjudicationDate" 
                      className="w-full pl-10 rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-primary shadow-sm py-2.5 text-gray-500"
                      value={formData.adjudicationDate}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="expirationDate" className="block text-sm font-medium text-[#111318]">Fecha de Vencimiento</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-[20px]">event_busy</span>
                    <input 
                      type="date" 
                      id="expirationDate" 
                      name="expirationDate" 
                      className="w-full pl-10 rounded-lg border-gray-200 text-sm focus:border-primary focus:ring-primary shadow-sm py-2.5 text-gray-500"
                      value={formData.expirationDate}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100 mt-2">
              <button 
                type="button" 
                onClick={onBack}
                className="px-5 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 font-medium transition-colors text-sm"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-medium shadow-sm shadow-primary/20 hover:shadow-primary/40 transition-all flex items-center gap-2 text-sm"
              >
                <span className="material-symbols-outlined text-[20px]">save</span>
                {isEditing ? 'Actualizar Registro' : 'Guardar Registro'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RequestForm;
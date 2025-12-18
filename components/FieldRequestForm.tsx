import React, { useState } from 'react';
import { WorkerList } from './WorkerList';
import { Worker, RequestFormData, PROJECT_MANAGERS, MOCK_COMPANIES } from '../types';
import { createSolicitudAcreditacion } from '../services/supabaseService';

interface Horario {
  dias: string;
  horario: string;
}

interface FieldRequestFormProps {
  onBack: () => void;
}

const FieldRequestForm: React.FC<FieldRequestFormProps> = ({ onBack }) => {
  const [formData, setFormData] = useState<RequestFormData>({
    requestDate: '',
    requesterName: '',
    kickoffDate: '',
    projectCode: '',
    requirement: '',
    clientName: '',
    clientContactName: '',
    clientContactEmail: '',
    projectManager: '',
    accreditationFollowUp: '',
    fieldStartDate: '',
    riskPreventionNotice: '',
    companyAccreditationRequired: '',
    contractAdmin: '',
    // Información del Contrato
    nombreContrato: '',
    numeroContrato: '',
    administradorContrato: '',
    // Condiciones Laborales
    jornadaTrabajo: '',
    horarioTrabajo: '',
    // Información de Vehículos
    cantidadVehiculos: '',
    placaPatente: '',
    // Pregunta sobre Contratista
    requiereAcreditarContratista: '',
    // Información del Contrato (Contratista)
    modalidadContrato: '',
    razonSocialContratista: '',
    nombreResponsableContratista: '',
    telefonoResponsableContratista: '',
    emailResponsableContratista: '',
    // Vehículos Contratista
    cantidadVehiculosContratista: '',
    placasVehiculosContratista: '',
    // SST
    registroSstTerreo: '',
  });

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [workersContratista, setWorkersContratista] = useState<Worker[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [placasPatente, setPlacasPatente] = useState<string[]>([]);
  const [placasPatenteContratista, setPlacasPatenteContratista] = useState<string[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Si se cambia la cantidad de vehículos, actualizar el array de placas
    if (name === 'cantidadVehiculos') {
      const cantidad = parseInt(value) || 0;
      setPlacasPatente(prev => {
        const newPlacas = [...prev];
        // Agregar o quitar elementos según la cantidad
        if (cantidad > newPlacas.length) {
          // Agregar elementos vacíos
          return [...newPlacas, ...Array(cantidad - newPlacas.length).fill('')];
        } else {
          // Recortar el array
          return newPlacas.slice(0, cantidad);
        }
      });
    }

    // Si se cambia la cantidad de vehículos del contratista, actualizar el array de placas
    if (name === 'cantidadVehiculosContratista') {
      const cantidad = parseInt(value) || 0;
      setPlacasPatenteContratista(prev => {
        const newPlacas = [...prev];
        // Agregar o quitar elementos según la cantidad
        if (cantidad > newPlacas.length) {
          // Agregar elementos vacíos
          return [...newPlacas, ...Array(cantidad - newPlacas.length).fill('')];
        } else {
          // Recortar el array
          return newPlacas.slice(0, cantidad);
        }
      });
    }
  };

  const handleAddWorker = (worker: Worker) => {
    setWorkers(prev => [...prev, worker]);
  };

  const handleRemoveWorker = (id: string) => {
    setWorkers(prev => prev.filter(w => w.id !== id));
  };

  const handleAgregarHorario = () => {
    setHorarios(prev => [...prev, { dias: '', horario: '' }]);
  };

  const handleEliminarHorario = (index: number) => {
    setHorarios(prev => prev.filter((_, i) => i !== index));
  };

  const handleHorarioChange = (index: number, field: 'dias' | 'horario', value: string) => {
    setHorarios(prev => prev.map((horario, i) => 
      i === index ? { ...horario, [field]: value } : horario
    ));
  };

  const handlePlacaChange = (index: number, value: string) => {
    setPlacasPatente(prev => prev.map((placa, i) => i === index ? value : placa));
  };

  const handlePlacaContratistaChange = (index: number, value: string) => {
    setPlacasPatenteContratista(prev => prev.map((placa, i) => i === index ? value : placa));
  };

  const handleAddWorkerContratista = (worker: Worker) => {
    setWorkersContratista(prev => [...prev, worker]);
  };

  const handleRemoveWorkerContratista = (id: string) => {
    setWorkersContratista(prev => prev.filter(w => w.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Preparar los datos para enviar a Supabase - Nombres corregidos según esquema real
      const solicitudData: any = {
        fecha_solicitud: formData.requestDate || null,
        nombre_solicitante: formData.requesterName || null,
        fecha_reunion_arranque: formData.kickoffDate || null,
        codigo_proyecto: formData.projectCode,  // Requerido (NOT NULL)
        requisito: formData.requirement || null,
        nombre_cliente: formData.clientName || null,
        jefe_proyectos_myma: formData.projectManager || null,
        encargado_seguimiento_acreditacion: formData.accreditationFollowUp || null, // ← Nombre corregido
        fecha_inicio_terreno: formData.fieldStartDate || null,
        aviso_prevencion_riesgo: formData.riskPreventionNotice === 'yes', // ← Convertir a boolean
        requiere_acreditar_empresa: formData.companyAccreditationRequired === 'yes', // ← Convertir a boolean
        admin_contrato_myma: formData.contractAdmin || null,
      };

      // Agregar campos opcionales solo si tienen valor - Nombres corregidos
      if (formData.clientContactName) {
        solicitudData.nombre_contacto_cliente = formData.clientContactName; // ← Nombre corregido
      }
      if (formData.clientContactEmail) {
        solicitudData.email_contacto_cliente = formData.clientContactEmail; // ← Nombre corregido
      }

      // Información del Contrato (solo si se requiere acreditar empresa)
      if (formData.companyAccreditationRequired === 'yes') {
        if (formData.nombreContrato) solicitudData.nombre_contrato = formData.nombreContrato;
        if (formData.numeroContrato) solicitudData.numero_contrato = formData.numeroContrato;
        if (formData.administradorContrato) solicitudData.administrador_contrato = formData.administradorContrato;
        
        // Horarios de trabajo (como JSONB)
        solicitudData.horarios_trabajo = horarios.length > 0 ? horarios : null;
        
        // Vehículos - Nombres corregidos
        solicitudData.cantidad_vehiculos = parseInt(formData.cantidadVehiculos) || 0; // ← Nombre corregido
        solicitudData.placas_patente = placasPatente.length > 0 ? placasPatente : null; // ← Nombre corregido (text[])
      }

      // Información de Contratista
      if (formData.requiereAcreditarContratista) {
        solicitudData.requiere_acreditar_contratista = formData.requiereAcreditarContratista === 'yes'; // ← Convertir a boolean
        
        if (formData.requiereAcreditarContratista === 'yes') {
          if (formData.modalidadContrato) solicitudData.modalidad_contrato_contratista = formData.modalidadContrato;
          if (formData.razonSocialContratista) solicitudData.razon_social_contratista = formData.razonSocialContratista;
          if (formData.nombreResponsableContratista) solicitudData.nombre_responsable_contratista = formData.nombreResponsableContratista; // ← Nombre corregido
          if (formData.telefonoResponsableContratista) solicitudData.telefono_responsable_contratista = formData.telefonoResponsableContratista; // ← Nombre corregido
          if (formData.emailResponsableContratista) solicitudData.email_responsable_contratista = formData.emailResponsableContratista; // ← Nombre corregido
          
          // Vehículos Contratista - Nombres corregidos
          solicitudData.cantidad_vehiculos_contratista = parseInt(formData.cantidadVehiculosContratista) || 0; // ← Nombre corregido
          solicitudData.placas_vehiculos_contratista = placasPatenteContratista.length > 0 ? placasPatenteContratista : null; // ← Nombre corregido (text[])
          
          // SST - Convertir a boolean
          solicitudData.registro_sst_terreno = formData.registroSstTerreo === 'yes'; // ← Convertir a boolean
        }
      }

      console.log('📤 Enviando datos a Supabase:', solicitudData);
      
      // Guardar en Supabase
      const result = await createSolicitudAcreditacion(solicitudData);
      
      console.log('✅ Solicitud guardada exitosamente:', result);
      alert('¡Solicitud guardada exitosamente! ID: ' + result.id);
      
      // Opcional: Resetear el formulario o redirigir
      // onBack(); // Descomentar si quieres volver atrás automáticamente
      
    } catch (error) {
      console.error('❌ Error al guardar la solicitud:', error);
      alert('Error al guardar la solicitud. Por favor, revisa la consola para más detalles.');
    }
  };

  return (
    <div className="layout-container flex h-full grow flex-col">
      <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col px-6 py-8 md:px-10 lg:px-12">
        
        {/* Breadcrumb */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <button onClick={onBack} className="text-[#616f89] hover:text-primary text-sm font-medium transition-colors">
            Inicio
          </button>
          <span className="material-symbols-outlined text-[#616f89] text-base">chevron_right</span>
          <button onClick={onBack} className="text-[#616f89] hover:text-primary text-sm font-medium transition-colors">
            Proyectos
          </button>
          <span className="material-symbols-outlined text-[#616f89] text-base">chevron_right</span>
          <span className="text-[#111318] text-sm font-medium">Nueva Solicitud</span>
        </div>

        {/* Header */}
        <div className="mb-8 flex flex-wrap justify-between gap-4 border-b border-[#e5e7eb] pb-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-[#111318] text-2xl lg:text-3xl font-bold tracking-tight">Formulario de solicitud de Acreditación</h1>
            <p className="text-[#616f89] text-sm lg:text-base font-normal">
              Ingrese los datos requeridos para la gestión de terreno y acreditación.
            </p>
          </div>
          <div className="hidden lg:block">
            <button 
              onClick={onBack}
              className="flex items-center gap-2 bg-white hover:bg-gray-50 text-[#616f89] border border-gray-200 px-4 py-2.5 rounded-lg font-medium shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              Volver al Listado
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-8 pb-12">
          
          {/* Section 1: Identificación de la Solicitud */}
          <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
            <div className="border-b border-[#e5e7eb] px-6 py-4 bg-gray-50/50">
              <h3 className="text-[#111318] text-base lg:text-lg font-bold leading-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">description</span>
                Identificación de la Solicitud
              </h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <label className="flex flex-col gap-2">
                <span className="text-[#111318] text-sm font-medium">Fecha de Solicitud</span>
                <input 
                  type="date" 
                  name="requestDate"
                  value={formData.requestDate}
                  onChange={handleInputChange}
                  className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                />
              </label>
              <label className="flex flex-col gap-2 lg:col-span-2">
                <span className="text-[#111318] text-sm font-medium">Nombre de Solicitante</span>
                <input 
                  type="text" 
                  name="requesterName"
                  value={formData.requesterName}
                  onChange={handleInputChange}
                  placeholder="Nombre completo"
                  className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-[#111318] text-sm font-medium">Fecha Reunión de Arranque</span>
                <input 
                  type="date" 
                  name="kickoffDate"
                  value={formData.kickoffDate}
                  onChange={handleInputChange}
                  className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-[#111318] text-sm font-medium">Código de Proyecto</span>
                <input 
                  type="text" 
                  name="projectCode"
                  value={formData.projectCode}
                  onChange={handleInputChange}
                  placeholder="Ej: PRJ-2024-001"
                  className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-[#111318] text-sm font-medium">Fecha de Inicio de Terreno</span>
                <div className="relative">
                   <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">calendar_today</span>
                   <input 
                    type="date" 
                    name="fieldStartDate"
                    value={formData.fieldStartDate}
                    onChange={handleInputChange}
                    className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none pl-10" 
                  />
                </div>
              </label>
              <label className="flex flex-col gap-2 md:col-span-2 lg:col-span-4">
                <span className="text-[#111318] text-sm font-medium">Requisito</span>
                <textarea 
                  name="requirement"
                  value={formData.requirement}
                  onChange={handleInputChange}
                  rows={2}
                  placeholder="Descripción breve del requisito"
                  className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none" 
                />
              </label>
            </div>
          </div>

          {/* Section 2: Cliente y Contrato */}
          <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
            <div className="border-b border-[#e5e7eb] px-6 py-4 bg-gray-50/50">
              <h3 className="text-[#111318] text-base lg:text-lg font-bold leading-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">business</span>
                Cliente y Contrato
              </h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="flex flex-col gap-2 md:col-span-2">
                <span className="text-[#111318] text-sm font-medium">Nombre de Cliente</span>
                <input 
                  type="text" 
                  name="clientName"
                  value={formData.clientName}
                  onChange={handleInputChange}
                  placeholder="Razón Social o Nombre"
                  className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                />
              </label>
              
              <div className="md:col-span-2 flex flex-col gap-3">
                <span className="text-[#111318] text-sm font-medium">Contactos del Cliente</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">person</span>
                    <input 
                      type="text" 
                      name="clientContactName"
                      value={formData.clientContactName}
                      onChange={handleInputChange}
                      placeholder="Nombre del Contacto"
                      className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none pl-10" 
                    />
                  </div>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">mail</span>
                    <input 
                      type="email" 
                      name="clientContactEmail"
                      value={formData.clientContactEmail}
                      onChange={handleInputChange}
                      placeholder="Correo Electrónico"
                      className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none pl-10" 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Gestión Interna MYMA */}
          <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
            <div className="border-b border-[#e5e7eb] px-6 py-4 bg-gray-50/50">
              <h3 className="text-[#111318] text-base lg:text-lg font-bold leading-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">work</span>
                Gestión Interna MYMA
              </h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <label className="flex flex-col gap-2">
                <span className="text-[#111318] text-sm font-medium">Jefe de Proyectos MYMA</span>
                <select 
                  name="projectManager"
                  value={formData.projectManager}
                  onChange={handleInputChange}
                  className="form-select w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="">Seleccione...</option>
                  {PROJECT_MANAGERS.map(pm => (
                    <option key={pm} value={pm}>{pm}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-[#111318] text-sm font-medium">Admin. de Contrato MYMA</span>
                <input 
                  type="text" 
                  name="contractAdmin"
                  value={formData.contractAdmin}
                  onChange={handleInputChange}
                  placeholder="Nombre del administrador"
                  className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-[#111318] text-sm font-medium">Encargado Seguimiento Acreditación</span>
                <input 
                  type="text" 
                  name="accreditationFollowUp"
                  value={formData.accreditationFollowUp}
                  onChange={handleInputChange}
                  placeholder="Nombre del encargado"
                  className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                />
              </label>
            </div>
          </div>

          {/* Section 4: Terreno, Seguridad y Acreditación */}
          <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
            <div className="border-b border-[#e5e7eb] px-6 py-4 bg-gray-50/50">
              <h3 className="text-[#111318] text-base lg:text-lg font-bold leading-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">shield</span>
                Seguridad y Acreditación
              </h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2 p-4 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-[#111318] text-sm font-medium flex items-center gap-2">
                  <span className="material-symbols-outlined text-orange-500 text-base">warning</span>
                  ¿Se dio aviso a los encargados de Prevención de Riesgo?
                </span>
                <div className="flex gap-6 mt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="riskPreventionNotice" 
                      value="yes"
                      checked={formData.riskPreventionNotice === 'yes'}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                    />
                    <span className="text-sm">Sí</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="riskPreventionNotice" 
                      value="no"
                      checked={formData.riskPreventionNotice === 'no'}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                    />
                    <span className="text-sm">No</span>
                  </label>
                </div>
              </div>

              <div className="flex flex-col gap-2 p-4 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-[#111318] text-sm font-medium flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-500 text-base">check_circle</span>
                  ¿Se requiere acreditar empresa?
                </span>
                <div className="flex gap-6 mt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="companyAccreditationRequired" 
                      value="yes"
                      checked={formData.companyAccreditationRequired === 'yes'}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                    />
                    <span className="text-sm">Sí</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="companyAccreditationRequired" 
                      value="no"
                      checked={formData.companyAccreditationRequired === 'no'}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                    />
                    <span className="text-sm">No</span>
                  </label>
                </div>
              </div>

            </div>
          </div>

          {/* Mostrar secciones solo si se requiere acreditar empresa */}
          {formData.companyAccreditationRequired === 'yes' && (
            <>
              {/* Section 5: Información del Contrato */}
              <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
            <div className="border-b border-[#e5e7eb] px-6 py-4 bg-gray-50/50">
              <h3 className="text-[#111318] text-base lg:text-lg font-bold leading-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">description</span>
                Información del Contrato
              </h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="flex flex-col gap-2">
                <span className="text-[#111318] text-sm font-medium">Nombre del contrato</span>
                <input 
                  type="text" 
                  name="nombreContrato"
                  value={formData.nombreContrato}
                  onChange={handleInputChange}
                  placeholder="Ingrese el nombre del contrato"
                  className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[#111318] text-sm font-medium">Número de contrato</span>
                <input 
                  type="text" 
                  name="numeroContrato"
                  value={formData.numeroContrato}
                  onChange={handleInputChange}
                  placeholder="Ej: CON-2025-001"
                  className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                />
              </label>

              <label className="flex flex-col gap-2 md:col-span-2">
                <span className="text-[#111318] text-sm font-medium">Nombre del administrador de contrato (MYMA)</span>
                <input 
                  type="text" 
                  name="administradorContrato"
                  value={formData.administradorContrato}
                  onChange={handleInputChange}
                  placeholder="Ingrese el nombre del administrador"
                  className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                />
              </label>
            </div>
          </div>

          {/* Section 6: Información de Trabajadores MYMA */}
          <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
            <div className="border-b border-[#e5e7eb] px-6 py-4 bg-gray-50/50">
              <h3 className="text-[#111318] text-base lg:text-lg font-bold leading-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">engineering</span>
                Información de Trabajadores MYMA
              </h3>
            </div>
            <div className="p-6">
              <WorkerList 
                workers={workers} 
                onAddWorker={handleAddWorker} 
                onRemoveWorker={handleRemoveWorker} 
              />
            </div>
          </div>

          {/* Section 7: Condiciones Laborales */}
          <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
            <div className="border-b border-[#e5e7eb] px-6 py-4 bg-gray-50/50">
              <h3 className="text-[#111318] text-base lg:text-lg font-bold leading-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">schedule</span>
                Condiciones Laborales
              </h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-[#111318]">Horarios de trabajo</h4>
                  <button
                    type="button"
                    onClick={handleAgregarHorario}
                    className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-medium transition-all shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    Agregar Horario
                  </button>
                </div>

                {horarios.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <span className="material-symbols-outlined text-4xl mb-2 block text-gray-400">schedule</span>
                    <p className="text-sm">No hay horarios agregados. Haz clic en "Agregar Horario" para comenzar.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {horarios.map((horario, index) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-sm font-semibold text-[#111318]">Horario {index + 1}</h5>
                          <button
                            type="button"
                            onClick={() => handleEliminarHorario(index)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                            title="Eliminar horario"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-2">
                            <span className="text-[#111318] text-sm font-medium">Días</span>
                            <input 
                              type="text" 
                              placeholder="Ej: Lunes a Jueves"
                              className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                              value={horario.dias}
                              onChange={(e) => handleHorarioChange(index, 'dias', e.target.value)}
                            />
                          </div>

                          <div className="flex flex-col gap-2">
                            <span className="text-[#111318] text-sm font-medium">Horario</span>
                            <input 
                              type="text" 
                              placeholder="Ej: 08:00 - 18:00"
                              className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                              value={horario.horario}
                              onChange={(e) => handleHorarioChange(index, 'horario', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 8: Información de Vehículos */}
          <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
            <div className="border-b border-[#e5e7eb] px-6 py-4 bg-gray-50/50">
              <h3 className="text-[#111318] text-base lg:text-lg font-bold leading-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">directions_car</span>
                Información de Vehículos
              </h3>
            </div>
            <div className="p-6 space-y-6">
              <label className="flex flex-col gap-2">
                <span className="text-[#111318] text-sm font-medium">Cantidad de vehículos a acreditar</span>
                <input 
                  type="number" 
                  name="cantidadVehiculos"
                  value={formData.cantidadVehiculos}
                  onChange={handleInputChange}
                  placeholder="Ej: 3"
                  min="0"
                  className="form-input w-full md:w-64 rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                />
              </label>

              {placasPatente.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-[#111318]">Placas de patente</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {placasPatente.map((placa, index) => (
                      <div key={index} className="flex flex-col gap-2">
                        <span className="text-[#111318] text-xs font-medium">Vehículo {index + 1}</span>
                        <div className="relative">
                          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">directions_car</span>
                          <input 
                            type="text" 
                            placeholder="Ej: ABCD12"
                            className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 pl-10 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                            value={placa}
                            onChange={(e) => handlePlacaChange(index, e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pregunta sobre Acreditación de Contratista */}
          <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
            <div className="p-6">
              <div className="flex flex-col gap-2 p-4 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-[#111318] text-sm font-medium flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-500 text-base">check_circle</span>
                  ¿Se requiere acreditar a contratista?
                </span>
                <div className="flex gap-6 mt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="requiereAcreditarContratista" 
                      value="yes"
                      checked={formData.requiereAcreditarContratista === 'yes'}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                    />
                    <span className="text-sm">Sí</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="requiereAcreditarContratista" 
                      value="no"
                      checked={formData.requiereAcreditarContratista === 'no'}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                    />
                    <span className="text-sm">No</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Mostrar secciones de contratista solo si se requiere acreditar */}
          {formData.requiereAcreditarContratista === 'yes' && (
            <>
          {/* Section 9: Información del Contrato */}
          <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
            <div className="border-b border-[#e5e7eb] px-6 py-4 bg-gray-50/50">
              <h3 className="text-[#111318] text-base lg:text-lg font-bold leading-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">description</span>
                Información del Contrato
              </h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="flex flex-col gap-2">
                <span className="text-[#111318] text-sm font-medium">Modalidad de contrato</span>
                <select 
                  name="modalidadContrato"
                  value={formData.modalidadContrato}
                  onChange={handleInputChange}
                  className="form-select w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="">Seleccione...</option>
                  <option value="honorarios">Honorarios</option>
                  <option value="contratista">Contratista</option>
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[#111318] text-sm font-medium">Razón social de contratista</span>
                <input 
                  type="text" 
                  name="razonSocialContratista"
                  value={formData.razonSocialContratista}
                  onChange={handleInputChange}
                  placeholder="Ingrese la razón social"
                  className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                />
              </label>
            </div>
          </div>

          {/* Section 10: Responsable de la Solicitud */}
          <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
            <div className="border-b border-[#e5e7eb] px-6 py-4 bg-gray-50/50">
              <h3 className="text-[#111318] text-base lg:text-lg font-bold leading-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">person</span>
                Responsable de la Solicitud
              </h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <label className="flex flex-col gap-2">
                <span className="text-[#111318] text-sm font-medium">Nombre de contacto</span>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">person</span>
                  <input 
                    type="text" 
                    name="nombreResponsableContratista"
                    value={formData.nombreResponsableContratista}
                    onChange={handleInputChange}
                    placeholder="Nombre completo"
                    className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 pl-10 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                  />
                </div>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[#111318] text-sm font-medium">Teléfono</span>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">phone</span>
                  <input 
                    type="tel" 
                    name="telefonoResponsableContratista"
                    value={formData.telefonoResponsableContratista}
                    onChange={handleInputChange}
                    placeholder="+569 1234 5678"
                    className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 pl-10 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                  />
                </div>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-[#111318] text-sm font-medium">Email</span>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">mail</span>
                  <input 
                    type="email" 
                    name="emailResponsableContratista"
                    value={formData.emailResponsableContratista}
                    onChange={handleInputChange}
                    placeholder="correo@ejemplo.com"
                    className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 pl-10 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                  />
                </div>
              </label>
            </div>
            <div className="px-6 pb-6">
              <p className="text-xs text-gray-500">
                Persona responsable para la solicitud de documentación de trabajadores contratista
              </p>
            </div>
          </div>

          {/* Section 11: Información de Trabajadores Contratista */}
          <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
            <div className="border-b border-[#e5e7eb] px-6 py-4 bg-gray-50/50">
              <h3 className="text-[#111318] text-base lg:text-lg font-bold leading-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">group</span>
                Información de Trabajadores Contratista
              </h3>
            </div>
            <div className="p-6">
              <WorkerList 
                workers={workersContratista} 
                onAddWorker={handleAddWorkerContratista} 
                onRemoveWorker={handleRemoveWorkerContratista}
                requireCompanySelection={true}
                companies={MOCK_COMPANIES.map(c => c.name)}
              />
            </div>
          </div>

          {/* Section 12: Información de Vehículos Contratista */}
          <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
            <div className="border-b border-[#e5e7eb] px-6 py-4 bg-gray-50/50">
              <h3 className="text-[#111318] text-base lg:text-lg font-bold leading-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">local_shipping</span>
                Información de Vehículos Contratista
              </h3>
            </div>
            <div className="p-6 space-y-6">
              <label className="flex flex-col gap-2">
                <span className="text-[#111318] text-sm font-medium">Cantidad de vehículos a acreditar del contratista</span>
                <input 
                  type="number" 
                  name="cantidadVehiculosContratista"
                  value={formData.cantidadVehiculosContratista}
                  onChange={handleInputChange}
                  placeholder="Ej: 3"
                  min="0"
                  className="form-input w-full md:w-64 rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                />
              </label>

              {placasPatenteContratista.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-[#111318]">Placas de patente</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {placasPatenteContratista.map((placa, index) => (
                      <div key={index} className="flex flex-col gap-2">
                        <span className="text-[#111318] text-xs font-medium">Vehículo {index + 1}</span>
                        <div className="relative">
                          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">directions_car</span>
                          <input 
                            type="text" 
                            placeholder="Ej: ABCD12"
                            className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 pl-10 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                            value={placa}
                            onChange={(e) => handlePlacaContratistaChange(index, e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 13: Seguridad y Salud en el Trabajo (SST) */}
          <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
            <div className="border-b border-[#e5e7eb] px-6 py-4 bg-gray-50/50">
              <h3 className="text-[#111318] text-base lg:text-lg font-bold leading-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">health_and_safety</span>
                Seguridad y Salud en el Trabajo (SST)
              </h3>
            </div>
            <div className="p-6">
              <div className="flex flex-col gap-2 p-4 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-[#111318] text-sm font-medium flex items-center gap-2">
                  <span className="material-symbols-outlined text-orange-500 text-base">assignment</span>
                  ¿Se registró actividad en la planilla SST terreno?
                </span>
                <div className="flex gap-6 mt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="registroSstTerreo" 
                      value="yes"
                      checked={formData.registroSstTerreo === 'yes'}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                    />
                    <span className="text-sm">Sí</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="registroSstTerreo" 
                      value="no"
                      checked={formData.registroSstTerreo === 'no'}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                    />
                    <span className="text-sm">No</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
            </>
          )}
            </>
          )}

          {/* Footer Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-6 border-t border-gray-100 mt-2">
            <button 
              type="button" 
              onClick={onBack}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 font-medium transition-colors text-sm"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-medium shadow-sm shadow-primary/20 hover:shadow-primary/40 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <span className="material-symbols-outlined text-[20px]">save</span>
              Guardar Solicitud
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default FieldRequestForm;


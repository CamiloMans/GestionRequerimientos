import React, { useState, useEffect } from 'react';
import { WorkerList } from './WorkerList';
import { Worker, WorkerType, RequestFormData, MOCK_COMPANIES, Persona } from '../types';
import {
  createSolicitudAcreditacion,
  createProyectoTrabajadores,
  createProyectoHorarios,
  createProyectoConductores,
  fetchProveedores,
  fetchPersonas,
  fetchProyectoTrabajadoresByProyecto,
  fetchProyectoConductoresByProyecto,
  logResumenSolicitudAcreditacion,
  crearCarpetasProyecto,
} from '../services/acreditacionService';

interface Horario {
  dias: string;
  horario: string;
}

interface VehiculoMyma {
  placa: string;
  conductor: string;
}

interface VehiculoContratista {
  placa: string;
  conductor: string;
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
    companyAccreditationRequired: '', // Iniciar sin selección
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
    requiereAcreditarContratista: '', // Iniciar sin selección
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
    registroSstTerreo: '', // Iniciar sin selección
  });

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [workersContratista, setWorkersContratista] = useState<Worker[]>([]);
  const [targetWorkerCountMyma, setTargetWorkerCountMyma] = useState(0);
  const [targetWorkerCountContratista, setTargetWorkerCountContratista] = useState(0);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [vehiculosMyma, setVehiculosMyma] = useState<VehiculoMyma[]>([]);
  const [vehiculosContratista, setVehiculosContratista] = useState<VehiculoContratista[]>([]);
  const [proveedores, setProveedores] = useState<string[]>([]);
  
  // Estados para el buscador de solicitante
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [filteredPersonasSolicitante, setFilteredPersonasSolicitante] = useState<Persona[]>([]);
  const [searchQuerySolicitante, setSearchQuerySolicitante] = useState('');
  const [selectedPersonaSolicitante, setSelectedPersonaSolicitante] = useState<Persona | null>(null);
  const [showDropdownSolicitante, setShowDropdownSolicitante] = useState(false);

  // Limpiar todos los campos cuando se monta el componente
  useEffect(() => {
    // Limpiar sessionStorage para evitar cargar borradores previos
    const STORAGE_KEY = 'field_request_form_draft';
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      console.log('🧹 Formulario limpiado: sessionStorage eliminado');
    } catch (error) {
      console.error('Error limpiando sessionStorage:', error);
    }

    // Resetear todos los campos del formulario a valores vacíos
    setFormData({
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
      companyAccreditationRequired: '', // Limpiar campo de radio (ninguno seleccionado)
      contractAdmin: '',
      nombreContrato: '',
      numeroContrato: '',
      administradorContrato: '',
      jornadaTrabajo: '',
      horarioTrabajo: '',
      cantidadVehiculos: '',
      placaPatente: '',
      requiereAcreditarContratista: '', // Limpiar campo de radio (ninguno seleccionado)
      modalidadContrato: '',
      razonSocialContratista: '',
      nombreResponsableContratista: '',
      telefonoResponsableContratista: '',
      emailResponsableContratista: '',
      cantidadVehiculosContratista: '',
      placasVehiculosContratista: '',
      registroSstTerreo: '', // Limpiar campo de radio (ninguno seleccionado)
    });
    
    // Limpiar otros estados
    setWorkers([]);
    setWorkersContratista([]);
    setTargetWorkerCountMyma(0);
    setTargetWorkerCountContratista(0);
    setHorarios([]);
    setVehiculosMyma([]);
    setVehiculosContratista([]);
    setSearchQuerySolicitante('');
    setSelectedPersonaSolicitante(null);
    setShowDropdownSolicitante(false);
  }, []); // Solo se ejecuta al montar el componente

  // Cargar proveedores desde la base de datos
  useEffect(() => {
    const loadProveedores = async () => {
      try {
        const proveedoresData = await fetchProveedores();
        const nombresProveedores = proveedoresData.map(p => p.nombre_proveedor);
        setProveedores(nombresProveedores);
      } catch (error) {
        console.error('Error cargando proveedores:', error);
        // Si falla, usar MOCK_COMPANIES como fallback
        setProveedores(MOCK_COMPANIES.map(c => c.name));
      }
    };

    loadProveedores();
  }, []);

  // Cargar personas para el buscador de solicitante
  useEffect(() => {
    const loadPersonas = async () => {
      try {
        const data = await fetchPersonas();
        setPersonas(data);
        setFilteredPersonasSolicitante(data);
      } catch (error) {
        console.error('Error cargando personas:', error);
      }
    };

    loadPersonas();
  }, []);

  // Clave para el almacenamiento del formulario
  const STORAGE_KEY = 'field_request_form_draft';

  // NOTA: Se deshabilitó la carga automática de borradores desde sessionStorage
  // para que el formulario siempre se inicie limpio cuando se navega desde el sidebar
  // Si se necesita restaurar borradores, se puede habilitar esta funcionalidad con un botón específico
  /*
  // Cargar datos guardados al montar el componente
  useEffect(() => {
    try {
      const savedData = sessionStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        
        // Restaurar formData
        if (parsed.formData) {
          setFormData(parsed.formData);
        }
        
        // Restaurar workers
        if (parsed.workers) {
          setWorkers(parsed.workers);
        }
        
        // Restaurar workersContratista
        if (parsed.workersContratista) {
          setWorkersContratista(parsed.workersContratista);
        }
        
        // Restaurar targetWorkerCountMyma
        if (parsed.targetWorkerCountMyma !== undefined) {
          setTargetWorkerCountMyma(parsed.targetWorkerCountMyma);
        }
        
        // Restaurar targetWorkerCountContratista
        if (parsed.targetWorkerCountContratista !== undefined) {
          setTargetWorkerCountContratista(parsed.targetWorkerCountContratista);
        }
        
        // Restaurar horarios
        if (parsed.horarios) {
          setHorarios(parsed.horarios);
        }
        
        // Restaurar vehiculosMyma
        if (parsed.vehiculosMyma) {
          setVehiculosMyma(parsed.vehiculosMyma);
        }
        
        // Restaurar vehiculosContratista
        if (parsed.vehiculosContratista) {
          setVehiculosContratista(parsed.vehiculosContratista);
        }
        
        // Restaurar selectedPersonaSolicitante
        if (parsed.selectedPersonaSolicitante) {
          setSelectedPersonaSolicitante(parsed.selectedPersonaSolicitante);
        }
        
        // Restaurar searchQuerySolicitante
        if (parsed.searchQuerySolicitante) {
          setSearchQuerySolicitante(parsed.searchQuerySolicitante);
        }
      }
    } catch (error) {
      console.error('Error cargando datos guardados del formulario:', error);
    }
  }, []);
  */

  // Guardar datos cuando cambian
  useEffect(() => {
    try {
      const dataToSave = {
        formData,
        workers,
        workersContratista,
        targetWorkerCountMyma,
        targetWorkerCountContratista,
        horarios,
        vehiculosMyma,
        vehiculosContratista,
        selectedPersonaSolicitante,
        searchQuerySolicitante,
        timestamp: Date.now(),
      };
      
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Error guardando datos del formulario:', error);
    }
  }, [
    formData,
    workers,
    workersContratista,
    targetWorkerCountMyma,
    targetWorkerCountContratista,
    horarios,
    vehiculosMyma,
    vehiculosContratista,
    selectedPersonaSolicitante,
    searchQuerySolicitante,
  ]);

  // Filtrar personas cuando cambia el término de búsqueda del solicitante
  useEffect(() => {
    if (searchQuerySolicitante.trim() === '') {
      setFilteredPersonasSolicitante(personas);
    } else {
      const filtered = personas.filter(persona =>
        persona.nombre_completo.toLowerCase().includes(searchQuerySolicitante.toLowerCase()) ||
        persona.rut.toLowerCase().includes(searchQuerySolicitante.toLowerCase())
      );
      setFilteredPersonasSolicitante(filtered);
    }
  }, [searchQuerySolicitante, personas]);

  // Cerrar dropdown del solicitante al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('#solicitante_search') && !target.closest('.dropdown-results-solicitante')) {
        setShowDropdownSolicitante(false);
      }
    };

    if (showDropdownSolicitante) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdownSolicitante]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Si se cambia la cantidad de vehículos, actualizar el array de vehículos
    if (name === 'cantidadVehiculos') {
      const cantidad = parseInt(value) || 0;
      setVehiculosMyma(prev => {
        const newVehiculos = [...prev];
        // Agregar o quitar elementos según la cantidad
        if (cantidad > newVehiculos.length) {
          // Agregar elementos vacíos con placa y conductor
          return [...newVehiculos, ...Array(cantidad - newVehiculos.length).fill(null).map(() => ({ placa: '', conductor: '' }))];
        } else {
          // Recortar el array
          return newVehiculos.slice(0, cantidad);
        }
      });
    }

    // Si se cambia la cantidad de vehículos del contratista, actualizar el array de vehículos
    if (name === 'cantidadVehiculosContratista') {
      const cantidad = parseInt(value) || 0;
      setVehiculosContratista(prev => {
        const newVehiculos = [...prev];
        // Agregar o quitar elementos según la cantidad
        if (cantidad > newVehiculos.length) {
          // Agregar elementos vacíos con placa y conductor
          return [...newVehiculos, ...Array(cantidad - newVehiculos.length).fill(null).map(() => ({ placa: '', conductor: '' }))];
        } else {
          // Recortar el array
          return newVehiculos.slice(0, cantidad);
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

  const handleVehiculoMymaChange = (index: number, field: 'placa' | 'conductor', value: string) => {
    setVehiculosMyma(prev => prev.map((vehiculo, i) => 
      i === index ? { ...vehiculo, [field]: value } : vehiculo
    ));
  };

  const handleVehiculoContratistaChange = (index: number, field: 'placa' | 'conductor', value: string) => {
    setVehiculosContratista(prev => prev.map((vehiculo, i) => 
      i === index ? { ...vehiculo, [field]: value } : vehiculo
    ));
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
        estado_solicitud_acreditacion: 'Por asignar requerimientos', // ← Estado inicial del proyecto
      };

      // Agregar campos opcionales solo si tienen valor - Nombres corregidos
      if (formData.clientContactName) {
        solicitudData.nombre_contacto_cliente = formData.clientContactName; // ← Nombre corregido
      }
      if (formData.clientContactEmail) {
        solicitudData.email_contacto_cliente = formData.clientContactEmail; // ← Nombre corregido
      }

      // Cantidad de trabajadores
      solicitudData.cantidad_trabajadores_myma = targetWorkerCountMyma || 0;
      solicitudData.cantidad_trabajadores_contratista = targetWorkerCountContratista || 0;

      // Información del Contrato (solo si se requiere acreditar empresa)
      if (formData.companyAccreditationRequired === 'yes') {
        if (formData.nombreContrato) solicitudData.nombre_contrato = formData.nombreContrato;
        if (formData.numeroContrato) solicitudData.numero_contrato = formData.numeroContrato;
        if (formData.administradorContrato) solicitudData.administrador_contrato = formData.administradorContrato;
        
        // Horarios de trabajo ya no se guardan aquí, se guardarán en fct_acreditacion_solicitud_horario_manual después de crear la solicitud
        // Vehículos ya no se guardan aquí, se guardarán en fct_acreditacion_solicitud_conductor_manual después de crear la solicitud
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
          
          // Vehículos Contratista ya no se guardan aquí, se guardarán en fct_acreditacion_solicitud_conductor_manual después de crear la solicitud
          
          // SST - Convertir a boolean
          solicitudData.registro_sst_terreno = formData.registroSstTerreo === 'yes'; // ← Convertir a boolean
        }
      }

      console.log('📤 Enviando datos a Supabase:', solicitudData);
      
      // Guardar en Supabase
      const result = await createSolicitudAcreditacion(solicitudData);
      
      console.log('✅ Solicitud guardada exitosamente:', result);
      
      // Guardar trabajadores en fct_acreditacion_solicitud_trabajador_manual
      if (result.id && result.codigo_proyecto) {
        try {
          console.log('👷 Guardando trabajadores del proyecto...');
          await createProyectoTrabajadores(
            result.id,
            result.codigo_proyecto,
            workers,
            workersContratista
          );
          console.log('✅ Trabajadores guardados exitosamente');
        } catch (trabajadorError) {
          console.error('❌ Error al guardar trabajadores:', trabajadorError);
          alert('⚠️ La solicitud se guardó, pero hubo un error al guardar los trabajadores.');
        }
      }
      
      // Guardar horarios en fct_acreditacion_solicitud_horario_manual
      if (result.id && result.codigo_proyecto && horarios.length > 0 && formData.companyAccreditationRequired === 'yes') {
        try {
          console.log('⏰ Guardando horarios del proyecto...');
          await createProyectoHorarios(
            result.id,
            result.codigo_proyecto,
            horarios,
            'MyMA' // Los horarios son de la empresa MyMA
          );
          console.log('✅ Horarios guardados exitosamente');
        } catch (horarioError) {
          console.error('❌ Error al guardar horarios:', horarioError);
          alert('⚠️ La solicitud se guardó, pero hubo un error al guardar los horarios.');
        }
      }
      
      // Guardar vehículos MYMA en fct_acreditacion_solicitud_conductor_manual
      if (result.id && result.codigo_proyecto && vehiculosMyma.length > 0 && formData.companyAccreditationRequired === 'yes') {
        try {
          console.log('🚗 Guardando vehículos MYMA del proyecto...');
          await createProyectoConductores(
            result.id,
            result.codigo_proyecto,
            vehiculosMyma,
            'MyMA'
          );
          console.log('✅ Vehículos MYMA guardados exitosamente');
        } catch (vehiculoMymaError) {
          console.error('❌ Error al guardar vehículos MYMA:', vehiculoMymaError);
          alert('⚠️ La solicitud se guardó, pero hubo un error al guardar los vehículos MYMA.');
        }
      }
      
      // Guardar vehículos Contratista en fct_acreditacion_solicitud_conductor_manual
      if (result.id && result.codigo_proyecto && vehiculosContratista.length > 0 && formData.requiereAcreditarContratista === 'yes') {
        try {
          console.log('🚗 Guardando vehículos Contratista del proyecto...');
          await createProyectoConductores(
            result.id,
            result.codigo_proyecto,
            vehiculosContratista,
            'Contratista'
          );
          console.log('✅ Vehículos Contratista guardados exitosamente');
        } catch (vehiculoContratistaError) {
          console.error('❌ Error al guardar vehículos Contratista:', vehiculoContratistaError);
          alert('⚠️ La solicitud se guardó, pero hubo un error al guardar los vehículos Contratista.');
        }
      }

      // Construir JSON resumen de acreditación (especialistas, conductores y vehículos)
      if (result.id && result.codigo_proyecto) {
        try {
          const [trabajadoresProyecto, conductoresProyecto] = await Promise.all([
            fetchProyectoTrabajadoresByProyecto(result.id, result.codigo_proyecto),
            fetchProyectoConductoresByProyecto(result.id, result.codigo_proyecto),
          ]);

          // Especialistas y conductores internos (MyMA)
          const especialistasMyma = trabajadoresProyecto
            .filter((t: any) => t.categoria_empresa === 'MyMA')
            .map((t: any) => ({
              id: t.id,
              nombre: t.nombre_trabajador,
            }));

          const especialistasExternos = trabajadoresProyecto
            .filter((t: any) => t.categoria_empresa !== 'MyMA')
            .map((t: any) => ({
              id: t.id,
              nombre: t.nombre_trabajador,
            }));

          const conductoresMyma = conductoresProyecto
            .filter((c: any) => c.categoria_empresa === 'MyMA')
            .map((c: any) => ({
              id: c.id,
              nombre: c.nombre_conductor,
            }));

          const conductoresExternos = conductoresProyecto
            .filter((c: any) => c.categoria_empresa !== 'MyMA')
            .map((c: any) => ({
              id: c.id,
              nombre: c.nombre_conductor,
            }));

          // Por ahora dejamos los vehículos como arreglos vacíos
          const resumenAcreditacion = {
            codigo_proyecto: result.codigo_proyecto,
            myma: {
              especialistas: especialistasMyma,
              conductores: conductoresMyma,
              vehiculos: [] as any[],
            },
            externo: {
              empresa: formData.razonSocialContratista || null,
              especialistas: especialistasExternos,
              conductores: conductoresExternos,
              vehiculos: [] as any[],
            },
          };

          // Consola del navegador
          console.log('📦 Resumen de acreditación generado:', resumenAcreditacion);

          // Logs backend / terminal a través de función edge
          await logResumenSolicitudAcreditacion(resumenAcreditacion);

          // Llamar a API local para crear carpetas del proyecto
          try {
            const respuestaCarpetas = await crearCarpetasProyecto(resumenAcreditacion);
            console.log('✅ Carpetas del proyecto creadas exitosamente:', respuestaCarpetas);
          } catch (errorCarpetas) {
            console.error('❌ Error al crear carpetas del proyecto:', errorCarpetas);
            // No mostrar alert al usuario, solo loguear el error
            // La solicitud ya se guardó exitosamente, esto es un paso adicional
          }
        } catch (resumenError) {
          console.error('❌ Error generando o enviando el resumen de acreditación:', resumenError);
        }
      }
      
      alert('¡Solicitud guardada exitosamente! ID: ' + result.id);
      
      // Limpiar los datos guardados en sessionStorage después de enviar exitosamente
      try {
        sessionStorage.removeItem(STORAGE_KEY);
        console.log('✅ Datos del formulario eliminados de sessionStorage');
      } catch (storageError) {
        console.error('Error limpiando sessionStorage:', storageError);
      }
      
      // Opcional: Resetear el formulario o redirigir
      // onBack(); // Descomentar si quieres volver atrás automáticamente
      
    } catch (error) {
      console.error('❌ Error al guardar la solicitud:', error);
      alert('Error al guardar la solicitud. Por favor, revisa la consola para más detalles.');
    }
  };

  // Función para limpiar los datos guardados cuando el usuario vuelve atrás
  const handleBack = () => {
    // Opcional: Preguntar al usuario si quiere guardar antes de salir
    // Por ahora, mantenemos los datos guardados para que pueda volver
    // Si quieres limpiar al volver, descomenta la siguiente línea:
    // sessionStorage.removeItem(STORAGE_KEY);
    onBack();
  };

  // Función para normalizar texto para correos electrónicos (eliminar tildes y caracteres especiales)
  const normalizeEmail = (text: string): string => {
    return text
      .toLowerCase()
      .normalize('NFD') // Normaliza caracteres con tildes
      .replace(/[\u0300-\u036f]/g, '') // Elimina diacríticos (tildes)
      .replace(/ñ/g, 'n') // Reemplaza ñ por n
      .replace(/[^a-z0-9\s]/g, '') // Elimina caracteres especiales excepto letras, números y espacios
      .replace(/\s+/g, '.') // Reemplaza espacios por puntos
      .trim();
  };

  // Función para rellenar el formulario con datos aleatorios
  const fillRandomData = () => {
    const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    const randomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    
    // Generar fechas aleatorias
    const today = new Date();
    const randomDate = (daysOffset: number) => {
      const date = new Date(today);
      date.setDate(date.getDate() + daysOffset);
      return date.toISOString().split('T')[0];
    };

    // Nombres y datos aleatorios
    const nombres = ['Juan Pérez', 'María González', 'Carlos Ruiz', 'Ana Silva', 'Pedro Martínez', 'Laura Sánchez'];
    const empresas = ['CODELCO', 'BHP', 'Antofagasta Minerals', 'KINROSS', 'LAS CENIZAS', 'AGQ'];
    const requisitos = ['Acreditación', 'Carpeta de arranque', 'Acreditación y Carpeta de arranque', 'Pase de visita'];
    const modalidades = ['honorarios', 'contratista'];
    const diasSemana = ['Lunes a Viernes', 'Lunes a Jueves', 'Lunes a Sábado', 'Martes a Viernes'];
    const horarios = ['08:00 - 18:00', '07:00 - 17:00', '09:00 - 19:00', '06:00 - 16:00'];
    const placas = ['ABCD12', 'EFGH34', 'IJKL56', 'MNOP78', 'QRST90', 'UVWX12'];
    const nombresConductores = ['Roberto Silva', 'Patricia Muñoz', 'Fernando Torres', 'Carmen Díaz'];

    // Seleccionar una persona aleatoria para el solicitante
    const personaAleatoria = personas.length > 0 ? randomItem(personas) : null;

    // Generar correos sin tildes
    const nombreCliente = randomItem(nombres);
    const empresaCliente = randomItem(empresas);
    const nombreResponsable = randomItem(nombres);

    // Rellenar formData
    setFormData({
      requestDate: randomDate(0),
      requesterName: personaAleatoria?.nombre_completo || randomItem(nombres),
      kickoffDate: randomDate(randomInt(1, 7)),
      projectCode: `PRJ-${new Date().getFullYear()}-${String(randomInt(100, 999)).padStart(3, '0')}`,
      requirement: randomItem(requisitos),
      clientName: empresaCliente,
      clientContactName: nombreCliente,
      clientContactEmail: `${normalizeEmail(nombreCliente)}@${normalizeEmail(empresaCliente)}.cl`,
      projectManager: personas.length > 0 ? randomItem(personas).nombre_completo : randomItem(nombres),
      accreditationFollowUp: randomItem(nombres),
      fieldStartDate: randomDate(randomInt(7, 30)),
      riskPreventionNotice: 'yes',
      companyAccreditationRequired: 'yes',
      contractAdmin: randomItem(nombres),
      nombreContrato: `Contrato ${randomItem(['Servicios', 'Obra', 'Suministro'])} ${new Date().getFullYear()}`,
      numeroContrato: `CON-${new Date().getFullYear()}-${String(randomInt(100, 999)).padStart(3, '0')}`,
      administradorContrato: randomItem(nombres),
      jornadaTrabajo: `${randomInt(8, 12)} horas`,
      horarioTrabajo: randomItem(horarios),
      cantidadVehiculos: String(randomInt(1, 5)),
      placaPatente: '',
      requiereAcreditarContratista: 'yes',
      modalidadContrato: randomItem(modalidades),
      razonSocialContratista: proveedores.length > 0 ? randomItem(proveedores) : randomItem(empresas),
      nombreResponsableContratista: nombreResponsable,
      telefonoResponsableContratista: `+56 9 ${randomInt(1000, 9999)} ${randomInt(1000, 9999)}`,
      emailResponsableContratista: `${normalizeEmail(nombreResponsable)}@contratista.cl`,
      cantidadVehiculosContratista: String(randomInt(1, 3)),
      placasVehiculosContratista: '',
      registroSstTerreo: 'yes',
    });

    // Rellenar solicitante si hay personas disponibles
    if (personaAleatoria) {
      setSelectedPersonaSolicitante(personaAleatoria);
      setSearchQuerySolicitante(`${personaAleatoria.nombre_completo} - ${personaAleatoria.rut}`);
    }

    // Rellenar horarios
    const numHorarios = randomInt(1, 3);
    setHorarios(Array.from({ length: numHorarios }, () => ({
      dias: randomItem(diasSemana),
      horario: randomItem(horarios),
    })));

    // Rellenar vehículos MYMA
    const numVehiculosMyma = randomInt(1, 5);
    setVehiculosMyma(Array.from({ length: numVehiculosMyma }, () => ({
      placa: randomItem(placas),
      conductor: randomItem(nombresConductores),
    })));
    setFormData(prev => ({ ...prev, cantidadVehiculos: String(numVehiculosMyma) }));

    // Rellenar vehículos Contratista
    const numVehiculosContratista = randomInt(1, 3);
    setVehiculosContratista(Array.from({ length: numVehiculosContratista }, () => ({
      placa: randomItem(placas),
      conductor: randomItem(nombresConductores),
    })));
    setFormData(prev => ({ ...prev, cantidadVehiculosContratista: String(numVehiculosContratista) }));

    // Agregar algunos trabajadores aleatorios
    if (personas.length > 0) {
      const trabajadoresAleatorios = personas.slice(0, randomInt(2, 4)).map((persona, index) => ({
        id: `worker-${Date.now()}-${index}`,
        name: persona.nombre_completo,
        phone: `+56 9 ${randomInt(1000, 9999)} ${randomInt(1000, 9999)}`,
        type: WorkerType.INTERNAL,
        personaId: persona.id,
      }));
      setWorkers(trabajadoresAleatorios);
      setTargetWorkerCountMyma(trabajadoresAleatorios.length);
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
          <div className="hidden lg:flex items-center gap-3">
            <button 
              type="button"
              onClick={fillRandomData}
              className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2.5 rounded-lg font-medium shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">auto_fix_high</span>
              Rellenar Datos
            </button>
            <button 
              onClick={handleBack}
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
                <span className="text-[#111318] text-sm font-medium">Requisito</span>
                <select 
                  name="requirement"
                  value={formData.requirement}
                  onChange={handleInputChange}
                  className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="">Seleccione un requisito...</option>
                  <option value="Acreditación">Acreditación</option>
                  <option value="Carpeta de arranque">Carpeta de arranque</option>
                  <option value="Acreditación y Carpeta de arranque">Acreditación y Carpeta de arranque</option>
                  <option value="Pase de visita">Pase de visita</option>
                </select>
              </label>
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
              <label className="flex flex-col gap-2 lg:col-span-2">
                <span className="text-[#111318] text-sm font-medium">Nombre de Solicitante</span>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#616f89] text-base">search</span>
                  <input 
                    id="solicitante_search"
                    type="text" 
                    value={selectedPersonaSolicitante ? `${selectedPersonaSolicitante.nombre_completo} - ${selectedPersonaSolicitante.rut}` : searchQuerySolicitante}
                    onChange={(e) => {
                      setSearchQuerySolicitante(e.target.value);
                      setSelectedPersonaSolicitante(null);
                      setShowDropdownSolicitante(true);
                      setFormData(prev => ({ ...prev, requesterName: '' }));
                    }}
                    onFocus={() => setShowDropdownSolicitante(true)}
                    placeholder="Buscar por nombre o RUT..."
                    autoComplete="off"
                    className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 pl-10 pr-10 text-sm text-[#111318] placeholder-[#616f89] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                  />
                  {searchQuerySolicitante && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuerySolicitante('');
                        setSelectedPersonaSolicitante(null);
                        setShowDropdownSolicitante(true);
                        setFormData(prev => ({ ...prev, requesterName: '' }));
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                  )}
                  {/* Dropdown de resultados */}
                  {showDropdownSolicitante && (
                    <div className="dropdown-results-solicitante absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto top-full">
                      {filteredPersonasSolicitante.length > 0 ? (
                        filteredPersonasSolicitante.map(persona => (
                          <button
                            key={persona.id}
                            type="button"
                            onClick={() => {
                              setSelectedPersonaSolicitante(persona);
                              setSearchQuerySolicitante(`${persona.nombre_completo} - ${persona.rut}`);
                              setShowDropdownSolicitante(false);
                              setFormData(prev => ({ ...prev, requesterName: persona.nombre_completo }));
                            }}
                            className={`w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors ${
                              selectedPersonaSolicitante?.id === persona.id ? 'bg-blue-50' : ''
                            }`}
                          >
                            <div className="text-sm font-medium text-gray-900">{persona.nombre_completo}</div>
                            <div className="text-xs text-gray-500">{persona.rut}</div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          No se encontraron colaboradores
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
                  {personas.map(persona => (
                    <option key={persona.id} value={persona.nombre_completo}>
                      {persona.nombre_completo}
                    </option>
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

          {/* Section 4: Acreditación MyMA */}
          <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
            <div className="border-b border-[#e5e7eb] px-6 py-4 bg-gray-50/50">
              <h3 className="text-[#111318] text-base lg:text-lg font-bold leading-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">shield</span>
                Acreditación MyMA
              </h3>
            </div>
            <div className="p-6">
              <div className="flex flex-col gap-2 p-4 bg-gray-50 rounded-lg border border-gray-100 w-full">
                <span className="text-[#111318] text-sm font-medium flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-500 text-base">check_circle</span>
                  ¿Se requiere acreditar a Myma?
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
                  placeholder="Ej: +56 9 1234 5678"
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
                targetWorkerCount={targetWorkerCountMyma}
                onTargetWorkerCountChange={setTargetWorkerCountMyma}
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
                    <span className="material-symbols-outlined text-4xl mb-2 block text-gray-400 mx-auto">schedule</span>
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

              {vehiculosMyma.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-[#111318]">Placas de patente y conductores</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {vehiculosMyma.map((vehiculo, index) => (
                      <div key={index} className="flex flex-col gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <span className="text-[#111318] text-xs font-medium">Vehículo {index + 1}</span>
                        <div className="relative">
                          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">directions_car</span>
                          <input 
                            type="text" 
                            placeholder="Ej: ABCD12"
                            className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 pl-10 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                            value={vehiculo.placa}
                            onChange={(e) => handleVehiculoMymaChange(index, 'placa', e.target.value)}
                          />
                        </div>
                        <div className="relative">
                          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">person</span>
                          <input 
                            type="text" 
                            placeholder="Nombre del conductor"
                            className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 pl-10 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                            value={vehiculo.conductor}
                            onChange={(e) => handleVehiculoMymaChange(index, 'conductor', e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
            </>
          )}

          {/* Section: Acreditación Contratista */}
          <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
            <div className="border-b border-[#e5e7eb] px-6 py-4 bg-gray-50/50">
              <h3 className="text-[#111318] text-base lg:text-lg font-bold leading-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">shield</span>
                Acreditación Contratista
              </h3>
            </div>
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

          {/* Mostrar secciones de contratista cuando se selecciona Sí o No */}
          {formData.requiereAcreditarContratista && (
            <>
          {/* Section 9: Información del Contrato */}
          <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
            <div className="border-b border-[#e5e7eb] px-6 py-4 bg-gray-50/50">
              <h3 className="text-[#111318] text-base lg:text-lg font-bold leading-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">description</span>
                Información del Contrato Contratista
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
                <select 
                  name="razonSocialContratista"
                  value={formData.razonSocialContratista}
                  onChange={handleInputChange}
                  className="form-select w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="">Seleccione...</option>
                  {proveedores.map((proveedor, index) => (
                    <option key={index} value={proveedor}>
                      {proveedor}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {/* Section 10: Responsable de la Solicitud */}
          <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
            <div className="border-b border-[#e5e7eb] px-6 py-4 bg-gray-50/50">
              <h3 className="text-[#111318] text-base lg:text-lg font-bold leading-tight flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">person</span>
                Responsable de la Solicitud Contratista
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
                companies={proveedores.length > 0 ? proveedores : MOCK_COMPANIES.map(c => c.name)}
                selectedCompany={formData.razonSocialContratista}
                targetWorkerCount={targetWorkerCountContratista}
                onTargetWorkerCountChange={setTargetWorkerCountContratista}
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

              {vehiculosContratista.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-[#111318]">Placas de patente y conductores</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {vehiculosContratista.map((vehiculo, index) => (
                      <div key={index} className="flex flex-col gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <span className="text-[#111318] text-xs font-medium">Vehículo {index + 1}</span>
                        <div className="relative">
                          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">directions_car</span>
                          <input 
                            type="text" 
                            placeholder="Ej: ABCD12"
                            className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 pl-10 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                            value={vehiculo.placa}
                            onChange={(e) => handleVehiculoContratistaChange(index, 'placa', e.target.value)}
                          />
                        </div>
                        <div className="relative">
                          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">person</span>
                          <input 
                            type="text" 
                            placeholder="Nombre del conductor"
                            className="form-input w-full rounded-lg border border-[#dbdfe6] bg-white px-3 py-2.5 pl-10 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                            value={vehiculo.conductor}
                            onChange={(e) => handleVehiculoContratistaChange(index, 'conductor', e.target.value)}
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


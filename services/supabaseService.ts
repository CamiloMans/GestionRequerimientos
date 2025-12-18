import { supabase } from '../config/supabase';
import { Persona, Requerimiento, PersonaRequerimientoSST, RequestItem, RequestStatus, SolicitudAcreditacion, ProjectGalleryItem } from '../types';
import { generateProjectTasks, calculateCompletedTasks } from '../utils/projectTasks';

// Función para calcular el estado basado en la fecha de vencimiento
export const calculateStatus = (fechaVencimiento: string | null | undefined): RequestStatus => {
  if (!fechaVencimiento) return RequestStatus.Current;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const expirationDate = new Date(fechaVencimiento);
  expirationDate.setHours(0, 0, 0, 0);
  
  const diffTime = expirationDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return RequestStatus.Expired;
  } else if (diffDays <= 30) {
    return RequestStatus.Expiring;
  } else {
    return RequestStatus.Current;
  }
};

// Función para obtener todas las personas
export const fetchPersonas = async (): Promise<Persona[]> => {
  const { data, error } = await supabase
    .from('persona')
    .select('*')
    .eq('estado', 'Activo')
    .order('nombre_completo', { ascending: true });
  
  if (error) {
    console.error('Error fetching personas:', error);
    throw error;
  }
  
  return data || [];
};

// Función para obtener todos los requerimientos
export const fetchRequerimientos = async (): Promise<Requerimiento[]> => {
  const { data, error } = await supabase
    .from('requerimientos')
    .select('*')
    .order('requerimiento', { ascending: true });
  
  if (error) {
    console.error('Error fetching requerimientos:', error);
    throw error;
  }
  
  return data || [];
};

// Función para obtener persona_requerimientos_sst con cálculo de estado
export const fetchPersonaRequerimientos = async (): Promise<RequestItem[]> => {
  const { data, error } = await supabase
    .from('persona_requerimientos_sst')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching persona_requerimientos_sst:', error);
    throw error;
  }
  
  if (!data) return [];
  
  // Transformar los datos al formato RequestItem
  return data.map((item: PersonaRequerimientoSST) => ({
    id: item.id.toString(),
    name: item.nombre_completo || '',
    rut: item.rut || '',
    requirement: item.requerimiento || '',
    category: item.categoria_requerimiento || '',
    // Usar estado si existe, sino calcular automáticamente
    status: item.estado ? (item.estado as RequestStatus) : calculateStatus(item.fecha_vencimiento),
    adjudicationDate: item.fecha_vigencia || '-',
    expirationDate: item.fecha_vencimiento || '-',
    persona_id: item.persona_id,
    requerimiento_id: item.requerimiento_id,
  }));
};

// Función para crear un nuevo registro en persona_requerimientos_sst
export const createPersonaRequerimiento = async (
  personaId: number,
  requerimientoId: number,
  fechaVigencia: string,
  fechaVencimiento: string
): Promise<PersonaRequerimientoSST> => {
  // Obtener información de persona y requerimiento
  const [personaResult, requerimientoResult] = await Promise.all([
    supabase.from('persona').select('*').eq('id', personaId).single(),
    supabase.from('requerimientos').select('*').eq('id', requerimientoId).single()
  ]);
  
  if (personaResult.error) throw personaResult.error;
  if (requerimientoResult.error) throw requerimientoResult.error;
  
  const persona = personaResult.data as Persona;
  const requerimiento = requerimientoResult.data as Requerimiento;
  
  // Calcular días de anticipación
  const fechaVenc = new Date(fechaVencimiento);
  const hoy = new Date();
  const diffTime = fechaVenc.getTime() - hoy.getTime();
  const diasAnticipacion = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Insertar nuevo registro
  const { data, error } = await supabase
    .from('persona_requerimientos_sst')
    .insert({
      persona_id: personaId,
      requerimiento_id: requerimientoId,
      rut: persona.rut,
      nombre_completo: persona.nombre_completo,
      requerimiento: requerimiento.requerimiento,
      categoria_requerimiento: requerimiento.categoria_requerimiento,
      fecha_vigencia: fechaVigencia,
      fecha_vencimiento: fechaVencimiento,
      dias_anticipacion: diasAnticipacion,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating persona_requerimiento:', error);
    throw error;
  }
  
  return data;
};

// Función para actualizar un registro existente
export const updatePersonaRequerimiento = async (
  id: number,
  fechaVigencia: string,
  fechaVencimiento: string,
  estado?: RequestStatus
): Promise<PersonaRequerimientoSST> => {
  console.log('🔧 updatePersonaRequerimiento recibido:');
  console.log('  - ID:', id);
  console.log('  - Estado recibido:', estado);
  console.log('  - Tipo de estado:', typeof estado);
  console.log('  - Estado === undefined?', estado === undefined);
  
  // Calcular días de anticipación
  const fechaVenc = new Date(fechaVencimiento);
  const hoy = new Date();
  const diffTime = fechaVenc.getTime() - hoy.getTime();
  const diasAnticipacion = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const updateData: any = {
    fecha_vigencia: fechaVigencia,
    fecha_vencimiento: fechaVencimiento,
    dias_anticipacion: diasAnticipacion,
    estado: estado || null, // Siempre incluir el campo estado
  };
  
  console.log('💾 Datos a enviar a Supabase:', updateData);
  
  const { data, error } = await supabase
    .from('persona_requerimientos_sst')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('❌ Error updating persona_requerimiento:', error);
    throw error;
  }
  
  console.log('✅ Registro actualizado exitosamente:', data);
  
  return data;
};

// Función para eliminar un registro (opcional)
export const deletePersonaRequerimiento = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from('persona_requerimientos_sst')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting persona_requerimiento:', error);
    throw error;
  }
};

// ===== FUNCIONES PARA SOLICITUD_ACREDITACION =====

// Función para obtener todas las solicitudes de acreditación
export const fetchSolicitudesAcreditacion = async (): Promise<SolicitudAcreditacion[]> => {
  const { data, error } = await supabase
    .from('solicitud_acreditacion')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching solicitudes_acreditacion:', error);
    throw error;
  }
  
  return data || [];
};

// Función para transformar solicitudes a formato de galería de proyectos
export const fetchProjectGalleryItems = async (): Promise<ProjectGalleryItem[]> => {
  const solicitudes = await fetchSolicitudesAcreditacion();
  
  return solicitudes.map((solicitud: SolicitudAcreditacion) => {
    // Parsear trabajadores de los campos JSON
    const trabajadoresMyma = solicitud.trabajadores_myma || [];
    const trabajadoresContratista = solicitud.trabajadores_contratista || [];
    const allWorkers = [...trabajadoresMyma, ...trabajadoresContratista];
    
    // Calcular total de vehículos
    const totalVehicles = (solicitud.vehiculos_cantidad || 0) + (solicitud.vehiculos_contratista_cantidad || 0);
    
    // Generar tareas basadas en los responsables asignados
    const projectStatus = solicitud.estado_solicitud_acreditacion || solicitud.estado || 'Pendiente';
    const projectTasks = generateProjectTasks(
      solicitud.id,
      !!solicitud.jpro_id,    // Tiene JPRO asignado
      !!solicitud.epr_id,     // Tiene EPR asignado
      !!solicitud.rrhh_id,    // Tiene RRHH asignado
      !!solicitud.legal_id,   // Tiene Legal asignado
      projectStatus
    );
    
    // Calcular tareas completadas
    const { completed: completedTasks, total: totalTasks } = calculateCompletedTasks(projectTasks);
    
    return {
      id: solicitud.id,
      projectCode: solicitud.codigo_proyecto || 'Sin código',
      projectName: solicitud.requisito || 'Proyecto sin nombre',
      clientName: solicitud.nombre_cliente || 'Sin cliente',
      projectManager: solicitud.jefe_proyectos_myma || 'Sin asignar',
      fieldStartDate: solicitud.fecha_inicio_terreno || solicitud.fecha_solicitud,
      totalWorkers: allWorkers.length,
      totalVehicles: totalVehicles,
      status: solicitud.estado_solicitud_acreditacion || solicitud.estado || 'Pendiente',
      workers: allWorkers,
      createdAt: solicitud.created_at,
      // Progreso de tareas
      completedTasks: completedTasks,
      totalTasks: totalTasks,
      tasks: projectTasks, // Tareas completas del proyecto
      // Responsables del proyecto
      empresa_id: solicitud.empresa_id,
      empresa_nombre: solicitud.empresa_nombre,
      jpro_id: solicitud.jpro_id,
      jpro_nombre: solicitud.jpro_nombre,
      epr_id: solicitud.epr_id,
      epr_nombre: solicitud.epr_nombre,
      rrhh_id: solicitud.rrhh_id,
      rrhh_nombre: solicitud.rrhh_nombre,
      legal_id: solicitud.legal_id,
      legal_nombre: solicitud.legal_nombre,
    };
  });
};

// Función para crear una nueva solicitud de acreditación
export const createSolicitudAcreditacion = async (data: Partial<SolicitudAcreditacion>): Promise<SolicitudAcreditacion> => {
  const { data: result, error } = await supabase
    .from('solicitud_acreditacion')
    .insert(data)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating solicitud_acreditacion:', error);
    throw error;
  }
  
  return result;
};

// Función para actualizar una solicitud de acreditación
export const updateSolicitudAcreditacion = async (
  id: number,
  data: Partial<SolicitudAcreditacion>
): Promise<SolicitudAcreditacion> => {
  const { data: result, error } = await supabase
    .from('solicitud_acreditacion')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating solicitud_acreditacion:', error);
    throw error;
  }
  
  return result;
};

// Función para eliminar una solicitud de acreditación
export const deleteSolicitudAcreditacion = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from('solicitud_acreditacion')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting solicitud_acreditacion:', error);
    throw error;
  }
};

// Función para actualizar responsables de una solicitud
export const updateResponsablesSolicitud = async (
  id: number,
  responsables: {
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
): Promise<SolicitudAcreditacion> => {
  console.log('🔄 Actualizando responsables para solicitud ID:', id);

  const updateData = { 
    empresa_id: responsables.empresa_id,
    empresa_nombre: responsables.empresa_nombre,
    jpro_id: responsables.jpro_id,
    jpro_nombre: responsables.jpro_nombre,
    epr_id: responsables.epr_id,
    epr_nombre: responsables.epr_nombre,
    rrhh_id: responsables.rrhh_id,
    rrhh_nombre: responsables.rrhh_nombre,
    legal_id: responsables.legal_id,
    legal_nombre: responsables.legal_nombre,
    estado_solicitud_acreditacion: 'En proceso',
    updated_at: new Date().toISOString() 
  };

  console.log('📦 Payload:', updateData);

  const { data, error } = await supabase
    .from('solicitud_acreditacion')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('❌ Error al actualizar responsables:', error);
    console.error('📊 Detalles del error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    throw error;
  }
  
  console.log('✅ Responsables actualizados exitosamente');
  return data;
};


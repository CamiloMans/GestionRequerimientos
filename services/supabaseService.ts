import { supabase } from '../config/supabase';
import { Persona, Requerimiento, PersonaRequerimientoSST, RequestItem, RequestStatus, SolicitudAcreditacion, ProjectGalleryItem, Cliente, EmpresaRequerimiento, ProyectoRequerimientoAcreditacion, ResponsableRequerimiento } from '../types';
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

// Función para obtener todos los clientes
export const fetchClientes = async (): Promise<Cliente[]> => {
  const { data, error } = await supabase
    .from('cliente')
    .select('*')
    .order('nombre', { ascending: true });
  
  if (error) {
    console.error('Error fetching clientes:', error);
    throw error;
  }
  
  return data || [];
};

// Función para obtener todos los responsables de requerimiento
export const fetchResponsablesRequerimiento = async (): Promise<ResponsableRequerimiento[]> => {
  const { data, error } = await supabase
    .from('responsable_requerimiento')
    .select('*')
    .order('nombre_responsable', { ascending: true });
  
  if (error) {
    console.error('Error fetching responsables de requerimiento:', error);
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
  
  return Promise.all(solicitudes.map(async (solicitud: SolicitudAcreditacion) => {
    // Parsear trabajadores de los campos JSON
    const trabajadoresMyma = solicitud.trabajadores_myma || [];
    const trabajadoresContratista = solicitud.trabajadores_contratista || [];
    const allWorkers = [...trabajadoresMyma, ...trabajadoresContratista];
    
    // Calcular total de vehículos
    const totalVehicles = (solicitud.vehiculos_cantidad || 0) + (solicitud.vehiculos_contratista_cantidad || 0);
    
    // Obtener tareas reales del proyecto desde la base de datos
    let projectTasks: any[] = [];
    let completedTasks = 0;
    let totalTasks = 0;
    
    try {
      const codigoProyecto = solicitud.codigo_proyecto;
      if (codigoProyecto) {
        const requerimientos = await fetchProyectoRequerimientos(codigoProyecto);
        
        // Transformar requerimientos a formato de tareas
        projectTasks = requerimientos.map(req => ({
          id: req.id,
          responsable: req.responsable,
          requerimiento: req.requerimiento,
          categoria: req.categoria_requerimiento,
          realizado: req.estado === 'Completado',
          fechaFinalizada: req.estado === 'Completado' ? req.updated_at?.split('T')[0] : undefined
        }));
        
        completedTasks = projectTasks.filter(t => t.realizado).length;
        totalTasks = projectTasks.length;
      }
      
      // Si no hay tareas en la BD, usar las generadas por defecto
      if (totalTasks === 0) {
        const projectStatus = solicitud.estado_solicitud_acreditacion || solicitud.estado || 'Pendiente';
        projectTasks = generateProjectTasks(
          solicitud.id,
          !!solicitud.jpro_id,
          !!solicitud.epr_id,
          !!solicitud.rrhh_id,
          !!solicitud.legal_id,
          projectStatus
        );
        const taskStats = calculateCompletedTasks(projectTasks);
        completedTasks = taskStats.completed;
        totalTasks = taskStats.total;
      }
    } catch (error) {
      console.error('Error cargando requerimientos del proyecto:', error);
      // Si hay error, usar tareas generadas por defecto
      const projectStatus = solicitud.estado_solicitud_acreditacion || solicitud.estado || 'Pendiente';
      projectTasks = generateProjectTasks(
        solicitud.id,
        !!solicitud.jpro_id,
        !!solicitud.epr_id,
        !!solicitud.rrhh_id,
        !!solicitud.legal_id,
        projectStatus
      );
      const taskStats = calculateCompletedTasks(projectTasks);
      completedTasks = taskStats.completed;
      totalTasks = taskStats.total;
    }
    
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
  }));
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
  console.log('📝 Responsables recibidos:', responsables);

  const updateData = { 
    empresa_id: responsables.empresa_id || null,
    empresa_nombre: responsables.empresa_nombre || null,
    jpro_id: responsables.jpro_id || null,
    jpro_nombre: responsables.jpro_nombre || null,
    epr_id: responsables.epr_id || null,
    epr_nombre: responsables.epr_nombre || null,
    rrhh_id: responsables.rrhh_id || null,
    rrhh_nombre: responsables.rrhh_nombre || null,
    legal_id: responsables.legal_id || null,
    legal_nombre: responsables.legal_nombre || null,
    estado_solicitud_acreditacion: 'En proceso',
    updated_at: new Date().toISOString() 
  };

  console.log('📦 Datos a guardar:', updateData);

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

// Función para obtener requerimientos estándar de una empresa
export const fetchEmpresaRequerimientos = async (empresa: string): Promise<EmpresaRequerimiento[]> => {
  console.log('═══════════════════════════════════════════════════');
  console.log('🔍 fetchEmpresaRequerimientos');
  console.log('═══════════════════════════════════════════════════');
  console.log('Empresa buscada:', empresa);
  console.log('Longitud:', empresa.length);
  console.log('Con marcadores:', `|${empresa}|`);
  console.log('Primer carácter (código):', empresa.charCodeAt(0));
  
  const { data, error } = await supabase
    .from('empresa_requerimiento')
    .select('*')
    .eq('empresa', empresa)
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('═══════════════════════════════════════════════════');
    console.error('❌ ERROR EN LA CONSULTA');
    console.error('═══════════════════════════════════════════════════');
    console.error('Error completo:', error);
    console.error('Mensaje:', error.message);
    console.error('Detalles:', error.details);
    console.error('Código:', error.code);
    console.error('═══════════════════════════════════════════════════');
    throw error;
  }
  
  console.log('═══════════════════════════════════════════════════');
  console.log('✅ CONSULTA EXITOSA');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Total registros: ${data?.length || 0}`);
  
  if (data && data.length > 0) {
    console.log('\n📋 Primeros registros:');
    data.slice(0, 3).forEach((req, i) => {
      console.log(`\n  ${i + 1}. ID: ${req.id}`);
      console.log(`     Empresa: "${req.empresa}"`);
      console.log(`     Requerimiento: ${req.requerimiento}`);
      console.log(`     Responsable: ${req.responsable}`);
    });
    if (data.length > 3) {
      console.log(`\n  ... y ${data.length - 3} más`);
    }
  } else {
    console.log('\n⚠️ NO SE ENCONTRARON REGISTROS');
    console.log('\n💡 Sugerencias:');
    console.log('   1. Verifica que existan datos en Supabase con este SQL:');
    console.log(`      SELECT * FROM empresa_requerimiento WHERE empresa = '${empresa}';`);
    console.log('   2. Verifica todas las empresas disponibles:');
    console.log('      SELECT DISTINCT empresa FROM empresa_requerimiento;');
    console.log('   3. Busca con coincidencia parcial:');
    console.log(`      SELECT * FROM empresa_requerimiento WHERE empresa ILIKE '%${empresa}%';`);
  }
  console.log('═══════════════════════════════════════════════════\n');
  
  return data || [];
};

// Función para crear requerimientos de acreditación de un proyecto
export const createProyectoRequerimientos = async (
  codigoProyecto: string,
  cliente: string,
  empresaRequerimientos: EmpresaRequerimiento[],
  responsables: {
    jpro_nombre?: string;
    epr_nombre?: string;
    rrhh_nombre?: string;
    legal_nombre?: string;
  }
): Promise<void> => {
  console.log('📝 Creando requerimientos para proyecto:', codigoProyecto);
  console.log('👥 Responsables:', responsables);
  
  // Primero, verificar si ya existen requerimientos para este proyecto
  const { data: existingReqs } = await supabase
    .from('proyecto_requerimientos_acreditacion')
    .select('id')
    .eq('codigo_proyecto', codigoProyecto)
    .limit(1);
  
  if (existingReqs && existingReqs.length > 0) {
    console.log('⚠️ Ya existen requerimientos para este proyecto, no se crearán duplicados');
    return;
  }
  
  // Mapear cada requerimiento de empresa a un requerimiento de proyecto
  const proyectoRequerimientos = empresaRequerimientos.map(req => {
    // Asignar el nombre del responsable según el rol
    let nombreResponsable = '';
    switch (req.responsable) {
      case 'JPRO':
        nombreResponsable = responsables.jpro_nombre || 'Sin asignar';
        break;
      case 'EPR':
        nombreResponsable = responsables.epr_nombre || 'Sin asignar';
        break;
      case 'RRHH':
        nombreResponsable = responsables.rrhh_nombre || 'Sin asignar';
        break;
      case 'Legal':
        nombreResponsable = responsables.legal_nombre || 'Sin asignar';
        break;
      default:
        nombreResponsable = 'Sin asignar';
    }

    return {
      codigo_proyecto: codigoProyecto,
      requerimiento: req.requerimiento,
      responsable: req.responsable,
      estado: 'Pendiente',
      cliente: cliente,
      categoria_requerimiento: req.categoria_requerimiento,
      observaciones: req.observaciones || null,
      nombre_responsable: nombreResponsable
    };
  });

  console.log(`📦 Insertando ${proyectoRequerimientos.length} requerimientos`);

  // Insertar todos los requerimientos
  const { data, error } = await supabase
    .from('proyecto_requerimientos_acreditacion')
    .insert(proyectoRequerimientos)
    .select();
  
  if (error) {
    console.error('❌ Error creando requerimientos del proyecto:', error);
    // Si es error de duplicado, no es crítico
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      console.log('⚠️ Algunos requerimientos ya existen (UNIQUE constraint)');
      return; // No lanzamos error
    }
    throw error;
  }
  
  console.log(`✅ ${data?.length || 0} requerimientos creados exitosamente`);
};

// Función para obtener requerimientos de un proyecto
export const fetchProyectoRequerimientos = async (codigoProyecto: string): Promise<ProyectoRequerimientoAcreditacion[]> => {
  console.log('🔍 Buscando requerimientos del proyecto:', codigoProyecto);
  
  const { data, error } = await supabase
    .from('proyecto_requerimientos_acreditacion')
    .select('*')
    .eq('codigo_proyecto', codigoProyecto)
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('❌ Error fetching proyecto requerimientos:', error);
    throw error;
  }
  
  console.log(`✅ Encontrados ${data?.length || 0} requerimientos para proyecto ${codigoProyecto}`);
  return data || [];
};

// Función para actualizar el estado de un requerimiento
export const updateRequerimientoEstado = async (
  id: number,
  estado: string
): Promise<void> => {
  const updateData = {
    estado: estado,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('proyecto_requerimientos_acreditacion')
    .update(updateData)
    .eq('id', id);
  
  if (error) {
    console.error('❌ Error actualizando estado del requerimiento:', error);
    throw error;
  }
  
  console.log(`✅ Requerimiento ${id} actualizado a ${estado}`);
};


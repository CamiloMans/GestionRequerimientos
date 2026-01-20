import { supabase } from '@shared/api-client/supabase';
import { Persona, Requerimiento, PersonaRequerimientoSST, RequestItem, RequestStatus, SolicitudAcreditacion, ProjectGalleryItem, Cliente, EmpresaRequerimiento, ProyectoRequerimientoAcreditacion, ResponsableRequerimiento, ProyectoTrabajador } from '../types';
import { generateProjectTasks, calculateCompletedTasks } from '../utils/projectTasks';

// Función para enviar webhook a través de la función edge de Supabase (evita CORS)
export const sendWebhookViaEdgeFunction = async (payload: any): Promise<any> => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://pugasfsnckeyitjemvju.supabase.co';
  const functionUrl = `${supabaseUrl}/functions/v1/send-webhook`;
  
  console.log('🔗 Invocando función edge:', functionUrl);
  console.log('📦 Payload:', payload);
  
  try {
    const { data, error } = await supabase.functions.invoke('send-webhook', {
      body: payload,
    });

    if (error) {
      console.error('❌ Error al invocar función edge:', error);
      console.error('❌ Detalles del error:', {
        message: error.message,
        name: error.name,
        context: (error as any).context,
      });
      
      // Si es un 404, intentar hacer fetch directo como fallback
      if (error.message?.includes('404') || error.message?.includes('not found') || (error as any).status === 404) {
        console.warn('⚠️ Función edge no encontrada (404). Intentando método alternativo...');
        
        // Fallback: intentar hacer fetch directo con headers CORS
        try {
          const directResponse = await fetch(functionUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1Z2FzZnNuY2tleWl0amVtdmp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4OTM5MTMsImV4cCI6MjA4MTQ2OTkxM30.XDAdVZOenvzsJRxXbDkfuxIUxkGgxKWo6q6jFFPCNjg'}`,
            },
            body: JSON.stringify(payload),
          });

          if (!directResponse.ok) {
            throw new Error(`Error ${directResponse.status}: La función edge "send-webhook" no está desplegada o no es accesible. Por favor, verifica en el Dashboard de Supabase que la función esté desplegada correctamente.`);
          }

          const directData = await directResponse.json();
          console.log('✅ Respuesta usando método alternativo:', directData);
          return directData;
        } catch (fallbackError: any) {
          throw new Error(`La función edge "send-webhook" no está desplegada. Ve al Dashboard de Supabase > Edge Functions y verifica que la función "send-webhook" esté desplegada. Error: ${fallbackError.message}`);
        }
      }
      
      throw error;
    }

    console.log('✅ Respuesta de función edge:', data);
    return data;
  } catch (err: any) {
    console.error('❌ Error completo:', err);
    throw err;
  }
};

// Función para enviar el ID del proyecto a la edge function de n8n
export const enviarIdProyectoN8n = async (idProyecto: number): Promise<any> => {
  console.log('🔗 Invocando función edge: Enviar_id_proyecto_n8n');
  console.log('📦 ID Proyecto:', idProyecto);
  
  // Obtener el correo del usuario autenticado
  let userEmail: string | null = null;
  
  // Intentar primero con getSession (más confiable)
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (session?.user?.email && !sessionError) {
      userEmail = session.user.email;
      console.log('👤 Correo obtenido desde session:', userEmail);
    } else {
      // Si no funciona con getSession, intentar con getUser
      console.log('⚠️ No se obtuvo correo desde session, intentando getUser...');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (user?.email && !userError) {
        userEmail = user.email;
        console.log('👤 Correo obtenido desde getUser:', userEmail);
      } else {
        console.warn('⚠️ No se pudo obtener el correo del usuario:', userError || sessionError);
      }
    }
  } catch (error) {
    console.error('❌ Error al obtener usuario:', error);
  }
  
  if (!userEmail) {
    console.error('❌ No se pudo obtener el correo del usuario autenticado');
  }

  // Preparar el payload
  const payload = { 
    id_proyecto: idProyecto,
    email_usuario: userEmail,
  };
  
  console.log('📤 Payload completo a enviar a edge function:', payload);
  
  try {
    // Usar el método invoke de Supabase que maneja CORS automáticamente
    const { data, error } = await supabase.functions.invoke('Enviar_id_proyecto_n8n', {
      body: payload,
    });

    if (error) {
      console.error('❌ Error al invocar función edge:', error);
      console.error('❌ Detalles del error:', {
        message: error.message,
        name: error.name,
        context: (error as any).context,
      });
      
      // Si el error indica que la función no existe, dar un mensaje más claro
      if (error.message?.includes('not found') || error.message?.includes('404') || (error as any).status === 404) {
        throw new Error('La función edge "Enviar_id_proyecto_n8n" no está desplegada. Por favor, despliega la función en Supabase usando: supabase functions deploy Enviar_id_proyecto_n8n');
      }
      
      throw error;
    }

    console.log('✅ Respuesta de función edge:', data);
    return data;
  } catch (err: any) {
    console.error('❌ Error completo al enviar ID del proyecto:', err);
    
    // Proporcionar un mensaje más amigable
    let errorMessage = 'Error al enviar ID del proyecto';
    if (err.message) {
      errorMessage += `: ${err.message}`;
    } else if (err.toString) {
      errorMessage += `: ${err.toString()}`;
    }
    
    throw new Error(errorMessage);
  }
};

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

// Función para obtener requerimientos del catálogo
export const fetchCatalogoRequerimientos = async (): Promise<any[]> => {
  const { data, error } = await supabase
    .from('catalogo_requerimientos')
    .select('*')
    .order('requerimiento', { ascending: true });
  
  if (error) {
    console.error('Error fetching catalogo_requerimientos:', error);
    throw error;
  }
  
  return data || [];
};

// Función para obtener todos los proveedores
export const fetchProveedores = async (): Promise<{ id: number; nombre_proveedor: string }[]> => {
  const { data, error } = await supabase
    .from('dim_core_proveedor')
    .select('id, nombre_proveedor')
    .order('nombre_proveedor', { ascending: true });
  
  if (error) {
    console.error('Error fetching proveedores:', error);
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
    link: item.link || undefined,
    drive_folder_id: item.drive_folder_id || undefined,
    drive_folder_url: item.drive_folder_url || undefined,
  }));
};

// Función para obtener requerimientos de una persona específica por nombre
export const fetchPersonaRequerimientosByNombre = async (nombreCompleto: string): Promise<RequestItem[]> => {
  const { data, error } = await supabase
    .from('persona_requerimientos_sst')
    .select('*')
    .ilike('nombre_completo', `%${nombreCompleto}%`)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching persona_requerimientos_sst by nombre:', error);
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
    link: item.link || undefined,
    drive_folder_id: item.drive_folder_id || undefined,
    drive_folder_url: item.drive_folder_url || undefined,
  }));
};

// Función para crear un nuevo registro en persona_requerimientos_sst
export const createPersonaRequerimiento = async (
  personaId: number,
  requerimientoId: number,
  fechaVigencia: string,
  fechaVencimiento: string,
  linkDrive?: string
): Promise<PersonaRequerimientoSST> => {
  // Obtener información de persona y requerimiento (incluyendo dias_anticipacion_notificacion)
  const [personaResult, requerimientoResult] = await Promise.all([
    supabase.from('persona').select('*').eq('id', personaId).single(),
    supabase.from('requerimientos').select('*').eq('id', requerimientoId).single()
  ]);
  
  if (personaResult.error) throw personaResult.error;
  if (requerimientoResult.error) throw requerimientoResult.error;
  
  const persona = personaResult.data as Persona;
  const requerimiento = requerimientoResult.data as Requerimiento;
  
  // Usar dias_anticipacion_notificacion de la tabla requerimientos
  // Si no existe, usar 60 como valor por defecto
  let diasAnticipacion: number;
  if (requerimiento.dias_anticipacion_notificacion !== undefined && requerimiento.dias_anticipacion_notificacion !== null) {
    diasAnticipacion = requerimiento.dias_anticipacion_notificacion;
    console.log('✅ Usando dias_anticipacion_notificacion del requerimiento:', diasAnticipacion);
  } else {
    // Fallback: usar 60 como valor por defecto
    diasAnticipacion = 60;
    console.log('⚠️ dias_anticipacion_notificacion no disponible, usando valor por defecto: 60');
  }
  
  // Insertar nuevo registro
  const insertData: any = {
    persona_id: personaId,
    requerimiento_id: requerimientoId,
    rut: persona.rut,
    nombre_completo: persona.nombre_completo,
    requerimiento: requerimiento.requerimiento,
    categoria_requerimiento: requerimiento.categoria_requerimiento,
    fecha_vigencia: fechaVigencia,
    fecha_vencimiento: fechaVencimiento,
    dias_anticipacion: diasAnticipacion,
  };

  if (linkDrive) {
    insertData.link = linkDrive;
  }

  const { data, error } = await supabase
    .from('persona_requerimientos_sst')
    .insert(insertData)
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
  estado?: RequestStatus,
  linkDrive?: string
): Promise<PersonaRequerimientoSST> => {
  console.log('🔧 updatePersonaRequerimiento recibido:');
  console.log('  - ID:', id);
  console.log('  - Estado recibido:', estado);
  console.log('  - Tipo de estado:', typeof estado);
  console.log('  - Estado === undefined?', estado === undefined);
  
  // Obtener el requerimiento_id del registro existente para obtener dias_anticipacion_notificacion
  const { data: registroExistente, error: fetchError } = await supabase
    .from('persona_requerimientos_sst')
    .select('requerimiento_id')
    .eq('id', id)
    .single();
  
  let diasAnticipacion: number;
  
  if (!fetchError && registroExistente?.requerimiento_id) {
    // Obtener el requerimiento para obtener dias_anticipacion_notificacion
    const { data: requerimiento, error: reqError } = await supabase
      .from('requerimientos')
      .select('dias_anticipacion_notificacion')
      .eq('id', registroExistente.requerimiento_id)
      .single();
    
    if (!reqError && requerimiento?.dias_anticipacion_notificacion !== undefined && requerimiento.dias_anticipacion_notificacion !== null) {
      diasAnticipacion = requerimiento.dias_anticipacion_notificacion;
      console.log('✅ Usando dias_anticipacion_notificacion del requerimiento:', diasAnticipacion);
    } else {
      // Fallback: usar 60 como valor por defecto
      diasAnticipacion = 60;
      console.log('⚠️ dias_anticipacion_notificacion no disponible, usando valor por defecto: 60');
    }
  } else {
    // Fallback: usar 60 como valor por defecto si no se puede obtener el requerimiento
    diasAnticipacion = 60;
    console.log('⚠️ No se pudo obtener requerimiento_id, usando valor por defecto: 60');
  }
  
  const updateData: any = {
    fecha_vigencia: fechaVigencia,
    fecha_vencimiento: fechaVencimiento,
    dias_anticipacion: diasAnticipacion,
    estado: estado || null, // Siempre incluir el campo estado
  };

  if (linkDrive !== undefined) {
    updateData.link = linkDrive || null;
  }
  
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

// Función para verificar si el usuario actual es admin
export const checkUserIsAdmin = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error checking user role:', error);
      return false;
    }

    return data?.role === 'admin';
  } catch (error) {
    console.error('Error checking if user is admin:', error);
    return false;
  }
};

// Función para eliminar un registro (solo admin puede eliminar)
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
          nombre_responsable: req.nombre_responsable,
          nombre_trabajador: req.nombre_trabajador,
          categoria_empresa: req.categoria_empresa,
          id_proyecto_trabajador: req.id_proyecto_trabajador,
          requerimiento: req.requerimiento,
          categoria: req.categoria_requerimiento,
          realizado: req.estado === 'Completado',
          fechaFinalizada: req.estado === 'Completado' ? req.updated_at?.split('T')[0] : undefined,
          drive_doc_url: req.drive_doc_url
        }));
        
        completedTasks = projectTasks.filter(t => t.realizado).length;
        totalTasks = projectTasks.length;
      }
      
      // Si no hay tareas en la BD, usar las generadas por defecto
      if (totalTasks === 0) {
        const projectStatus = solicitud.estado_solicitud_acreditacion || solicitud.estado || 'Por asignar requerimientos';
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
      const projectStatus = solicitud.estado_solicitud_acreditacion || solicitud.estado || 'Por asignar requerimientos';
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
      status: solicitud.estado_solicitud_acreditacion || solicitud.estado || 'Por asignar requerimientos',
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

// Función para obtener las observaciones de un requerimiento específico de una empresa
export const fetchEmpresaRequerimientoObservaciones = async (
  empresa: string,
  requerimiento: string
): Promise<string | null> => {
  const { data, error } = await supabase
    .from('empresa_requerimiento')
    .select('observaciones')
    .eq('empresa', empresa)
    .eq('requerimiento', requerimiento)
    .single();
  
  if (error) {
    // Si no se encuentra el registro, no es un error crítico
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching observaciones:', error);
    return null;
  }
  
  // Retornar observaciones solo si no están vacías
  if (data && data.observaciones && data.observaciones.trim() !== '') {
    return data.observaciones;
  }
  
  return null;
};

// Función para obtener las observaciones de un requerimiento específico de un proyecto
export const fetchProyectoRequerimientoObservaciones = async (
  codigoProyecto: string,
  requerimiento: string
): Promise<string | null> => {
  const { data, error } = await supabase
    .from('proyecto_requerimientos_acreditacion')
    .select('observaciones')
    .eq('codigo_proyecto', codigoProyecto)
    .eq('requerimiento', requerimiento)
    .limit(1)
    .single();
  
  if (error) {
    // Si no se encuentra el registro, no es un error crítico
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching observaciones del proyecto:', error);
    return null;
  }
  
  // Retornar observaciones solo si no están vacías
  if (data && data.observaciones && data.observaciones.trim() !== '') {
    return data.observaciones;
  }
  
  return null;
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
  },
  idProyecto?: number
): Promise<void> => {
  console.log('═══════════════════════════════════════════════════');
  console.log('🚀 INICIO: createProyectoRequerimientos');
  console.log('═══════════════════════════════════════════════════');
  console.log('📝 Código Proyecto:', codigoProyecto);
  console.log('🏢 Cliente:', cliente);
  console.log('📋 Empresa Requerimientos recibidos:', empresaRequerimientos?.length || 0);
  console.log('👥 Responsables:', JSON.stringify(responsables, null, 2));
  
  if (!empresaRequerimientos || empresaRequerimientos.length === 0) {
    console.error('❌ NO HAY REQUERIMIENTOS PARA GUARDAR');
    console.log('═══════════════════════════════════════════════════\n');
    return;
  }
  
  // Primero, verificar si ya existen requerimientos para este proyecto
  console.log('\n🔍 Verificando requerimientos existentes...');
  const { data: existingReqs, error: checkError } = await supabase
    .from('proyecto_requerimientos_acreditacion')
    .select('id, requerimiento, categoria_requerimiento, responsable')
    .eq('codigo_proyecto', codigoProyecto);
  
  if (checkError) {
    console.error('❌ Error al verificar requerimientos existentes:', checkError);
  }
  
  console.log(`📊 Requerimientos existentes: ${existingReqs?.length || 0}`);
  
  if (existingReqs && existingReqs.length > 0) {
    console.log('⚠️ Ya existen requerimientos para este proyecto:');
    existingReqs.forEach((req: any, i) => {
      console.log(`  ${i + 1}. ${req.requerimiento} (${req.categoria_requerimiento})`);
    });
    
    // Si hay responsables asignados, actualizar los requerimientos existentes
    const tieneResponsables = responsables.jpro_nombre || responsables.epr_nombre || responsables.rrhh_nombre || responsables.legal_nombre;
    
    if (tieneResponsables) {
      console.log('🔄 Actualizando requerimientos existentes con responsables asignados...');
      
      // Actualizar cada requerimiento existente con el nombre del responsable correspondiente
      for (const req of existingReqs) {
        let nombreResponsable = '';
        switch (req.responsable) {
          case 'JPRO':
            nombreResponsable = responsables.jpro_nombre || '';
            break;
          case 'EPR':
            nombreResponsable = responsables.epr_nombre || '';
            break;
          case 'RRHH':
            nombreResponsable = responsables.rrhh_nombre || '';
            break;
          case 'Legal':
            nombreResponsable = responsables.legal_nombre || '';
            break;
        }
        
        if (nombreResponsable) {
          const { error: updateError } = await supabase
            .from('proyecto_requerimientos_acreditacion')
            .update({ nombre_responsable: nombreResponsable })
            .eq('id', req.id);
          
          if (updateError) {
            console.error(`❌ Error actualizando requerimiento ${req.id}:`, updateError);
          } else {
            console.log(`✅ Requerimiento ${req.id} actualizado con responsable: ${nombreResponsable}`);
          }
        }
      }
      
      console.log('✅ Requerimientos actualizados exitosamente');
      console.log('═══════════════════════════════════════════════════\n');
      return;
    } else {
      console.log('⏭️  SALIENDO SIN CREAR NUEVOS REQUERIMIENTOS (ya existen y no hay responsables para asignar)');
      console.log('═══════════════════════════════════════════════════\n');
      return;
    }
  }
  
  console.log('✅ No hay requerimientos existentes, procediendo a crear...');

  // Obtener el id_proyecto (id de solicitud_acreditacion)
  let proyectoId = idProyecto;
  
  if (!proyectoId) {
    // Si no se pasó como parámetro, buscarlo en la base de datos
    console.log('\n🔍 Buscando solicitud_acreditacion...');
    const { data: solicitud, error: solicitudError } = await supabase
      .from('solicitud_acreditacion')
      .select('id')
      .eq('codigo_proyecto', codigoProyecto)
      .single();

    if (solicitudError) {
      console.error('❌ Error obteniendo solicitud:', solicitudError);
      console.log('═══════════════════════════════════════════════════\n');
      throw new Error(`No se encontró el proyecto ${codigoProyecto}`);
    }

    proyectoId = solicitud?.id;
  }
  
  console.log(`✅ ID Proyecto encontrado: ${proyectoId}`);

  // Obtener los trabajadores de proyecto_trabajadores
  console.log('\n🔍 Buscando trabajadores en proyecto_trabajadores...');
  let trabajadoresProyecto: ProyectoTrabajador[] = [];
  
  if (proyectoId) {
    const { data: trabajadores, error: trabajadoresError } = await supabase
      .from('proyecto_trabajadores')
      .select('*')
      .eq('id_proyecto', proyectoId);

    if (trabajadoresError) {
      console.error('❌ Error obteniendo trabajadores:', trabajadoresError);
    } else {
      trabajadoresProyecto = trabajadores || [];
      console.log(`✅ Trabajadores encontrados: ${trabajadoresProyecto.length}`);
      if (trabajadoresProyecto.length > 0) {
        trabajadoresProyecto.forEach((t, i) => {
          console.log(`  ${i + 1}. ${t.nombre_trabajador} (${t.categoria_empresa}) - ID: ${t.id}`);
        });
      }
    }
  } else {
    console.warn('⚠️ No se pudo obtener el ID del proyecto');
  }
  
  // Mapear cada requerimiento de empresa a uno o más requerimientos de proyecto
  console.log('\n🔧 Construyendo requerimientos...');
  const proyectoRequerimientos: any[] = [];

  empresaRequerimientos.forEach((req, index) => {
    console.log(`\n  Procesando requerimiento ${index + 1}/${empresaRequerimientos.length}:`);
    console.log(`    Requerimiento: ${req.requerimiento}`);
    console.log(`    Categoría: ${req.categoria_requerimiento}`);
    console.log(`    Responsable: ${req.responsable}`);
    
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
    
    console.log(`    Nombre responsable asignado: ${nombreResponsable}`);

    // Si la categoría es "Trabajadores", crear un registro por cada trabajador de proyecto_trabajadores
    const esTrabajadores = req.categoria_requerimiento?.toLowerCase() === 'trabajadores';
    console.log(`    ¿Es categoría Trabajadores?: ${esTrabajadores}`);
    console.log(`    Trabajadores disponibles: ${trabajadoresProyecto.length}`);
    
    if (esTrabajadores && trabajadoresProyecto.length > 0) {
      console.log(`    👷 Creando ${trabajadoresProyecto.length} registros (uno por trabajador)`);
      
      trabajadoresProyecto.forEach((trabajador, tIndex) => {
        const registro = {
          codigo_proyecto: codigoProyecto,
          id_proyecto: proyectoId,
          requerimiento: req.requerimiento,
          responsable: req.responsable,
          estado: 'Pendiente',
          cliente: cliente,
          categoria_requerimiento: req.categoria_requerimiento,
          observaciones: req.observaciones || null,
          nombre_responsable: nombreResponsable,
          nombre_trabajador: trabajador.nombre_trabajador,
          categoria_empresa: trabajador.categoria_empresa,
          id_proyecto_trabajador: trabajador.id
        };
        console.log(`      Trabajador ${tIndex + 1}: ${trabajador.nombre_trabajador}`);
        proyectoRequerimientos.push(registro);
      });
    } else {
      // Para otras categorías, crear solo un registro
      console.log(`    📄 Creando 1 registro (categoría normal)`);
      const registro = {
        codigo_proyecto: codigoProyecto,
        id_proyecto: proyectoId,
        requerimiento: req.requerimiento,
        responsable: req.responsable,
        estado: 'Pendiente',
        cliente: cliente,
        categoria_requerimiento: req.categoria_requerimiento,
        observaciones: req.observaciones || null,
        nombre_responsable: nombreResponsable,
        nombre_trabajador: null,
        categoria_empresa: null,
        id_proyecto_trabajador: null
      };
      proyectoRequerimientos.push(registro);
    }
  });

  console.log(`\n📦 TOTAL DE REGISTROS A INSERTAR: ${proyectoRequerimientos.length}`);
  
  if (proyectoRequerimientos.length === 0) {
    console.error('❌ NO SE CONSTRUYERON REQUERIMIENTOS');
    console.log('═══════════════════════════════════════════════════\n');
    return;
  }
  
  console.log('\nVista previa de los primeros 3 registros:');
  proyectoRequerimientos.slice(0, 3).forEach((r, i) => {
    console.log(`\n  Registro ${i + 1}:`);
    console.log(`    Requerimiento: ${r.requerimiento}`);
    console.log(`    Responsable: ${r.responsable} (${r.nombre_responsable})`);
    console.log(`    Categoría: ${r.categoria_requerimiento}`);
    console.log(`    Trabajador: ${r.nombre_trabajador || 'N/A'}`);
  });

  // Insertar todos los requerimientos
  console.log('\n💾 INSERTANDO EN BASE DE DATOS...');
  console.log(`Tabla: proyecto_requerimientos_acreditacion`);
  console.log(`Registros a insertar: ${proyectoRequerimientos.length}`);
  
  const { data, error } = await supabase
    .from('proyecto_requerimientos_acreditacion')
    .insert(proyectoRequerimientos)
    .select();
  
  if (error) {
    console.error('═══════════════════════════════════════════════════');
    console.error('❌ ERROR EN INSERT');
    console.error('═══════════════════════════════════════════════════');
    console.error('Mensaje:', error.message);
    console.error('Código:', error.code);
    console.error('Detalles:', error.details);
    console.error('Hint:', error.hint);
    console.error('Error completo:', JSON.stringify(error, null, 2));
    
    // Si es error de duplicado, no es crítico
    if (error.message.includes('duplicate') || error.message.includes('unique') || error.code === '23505') {
      console.log('⚠️ Error de UNIQUE constraint - algunos requerimientos ya existen');
      console.log('💡 Solución: Ejecuta sql/URGENTE_actualizar_constraint.sql');
      console.log('═══════════════════════════════════════════════════\n');
      return; // No lanzamos error
    }
    
    console.log('═══════════════════════════════════════════════════\n');
    throw error;
  }
  
  console.log('═══════════════════════════════════════════════════');
  console.log('✅ INSERT EXITOSO');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Registros insertados: ${data?.length || 0}`);
  
  if (data && data.length > 0) {
    console.log('\nPrimeros 3 registros insertados:');
    data.slice(0, 3).forEach((r: any, i) => {
      console.log(`  ${i + 1}. ID: ${r.id} - ${r.requerimiento} (${r.categoria_requerimiento})`);
    });
  }
  
  console.log('═══════════════════════════════════════════════════\n');
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

// Función para obtener solicitud_acreditacion por código de proyecto (para obtener drive_folder_id y drive_folder_url)
export const fetchSolicitudAcreditacionByCodigo = async (codigoProyecto: string): Promise<Partial<SolicitudAcreditacion> | null> => {
  console.log('🔍 Buscando solicitud_acreditacion para proyecto:', codigoProyecto);
  
  const { data, error } = await supabase
    .from('solicitud_acreditacion')
    .select('drive_folder_id, drive_folder_url, codigo_proyecto')
    .eq('codigo_proyecto', codigoProyecto)
    .single();
  
  if (error) {
    console.error('❌ Error fetching solicitud_acreditacion:', error);
    console.error('❌ Código de proyecto buscado:', codigoProyecto);
    return null;
  }
  
  console.log('✅ Solicitud encontrada:', {
    codigo_proyecto: data?.codigo_proyecto,
    drive_folder_id: data?.drive_folder_id,
    drive_folder_url: data?.drive_folder_url,
  });
  
  return data;
};

// Función para actualizar el estado de un requerimiento
export const updateRequerimientoEstado = async (
  id: number,
  estado: string
): Promise<{ allCompleted: boolean; codigoProyecto?: string; proyectoEstadoCambio?: string }> => {
  const updateData: any = {
    estado: estado,
    updated_at: new Date().toISOString()
  };
  
  // Si el estado es "Completado", guardar la fecha de finalización
  // Si no es "Completado", establecer fecha_finalizacion como NULL
  if (estado === 'Completado') {
    updateData.fecha_finalizacion = new Date().toISOString();
  } else {
    updateData.fecha_finalizacion = null;
  }

  // Primero, obtener el requerimiento para saber el código del proyecto
  const { data: requerimiento, error: fetchError } = await supabase
    .from('proyecto_requerimientos_acreditacion')
    .select('codigo_proyecto, id_proyecto')
    .eq('id', id)
    .single();

  if (fetchError) {
    console.error('❌ Error obteniendo requerimiento:', fetchError);
    throw fetchError;
  }

  // Actualizar el requerimiento
  const { error } = await supabase
    .from('proyecto_requerimientos_acreditacion')
    .update(updateData)
    .eq('id', id);
  
  if (error) {
    console.error('❌ Error actualizando estado del requerimiento:', error);
    throw error;
  }
  
  console.log(`✅ Requerimiento ${id} actualizado a ${estado}`);

  // Verificar y actualizar el estado del proyecto según los requerimientos
  let allCompleted = false;
  let nuevoEstadoProyecto: string | undefined = undefined;
  
  if (requerimiento?.codigo_proyecto && requerimiento.id_proyecto) {
    try {
      // Obtener el estado actual del proyecto
      const { data: proyectoActual, error: proyectoError } = await supabase
        .from('solicitud_acreditacion')
        .select('estado_solicitud_acreditacion')
        .eq('id', requerimiento.id_proyecto)
        .single();

      if (proyectoError) {
        console.error('❌ Error obteniendo estado del proyecto:', proyectoError);
      }

      // Obtener todos los requerimientos del proyecto
      const { data: todosRequerimientos, error: reqError } = await supabase
        .from('proyecto_requerimientos_acreditacion')
        .select('estado')
        .eq('codigo_proyecto', requerimiento.codigo_proyecto);

      if (reqError) {
        console.error('❌ Error obteniendo requerimientos del proyecto:', reqError);
        return { allCompleted: false, codigoProyecto: requerimiento?.codigo_proyecto };
      }

      // Verificar si todos están completados
      allCompleted = todosRequerimientos && todosRequerimientos.length > 0 &&
        todosRequerimientos.every(req => req.estado === 'Completado');

      const estadoProyectoActual = proyectoActual?.estado_solicitud_acreditacion?.toLowerCase() || '';

      // Si todos están completados y el proyecto no está en "Finalizado", actualizar a "Finalizado"
      if (allCompleted && !estadoProyectoActual.includes('finalizado')) {
        nuevoEstadoProyecto = 'Finalizado';
        const { error: updateProyectoError } = await supabase
          .from('solicitud_acreditacion')
          .update({ 
            estado_solicitud_acreditacion: nuevoEstadoProyecto,
            fecha_finalizacion: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', requerimiento.id_proyecto);

        if (updateProyectoError) {
          console.error('❌ Error actualizando estado del proyecto:', updateProyectoError);
        } else {
          console.log(`✅ Proyecto ${requerimiento.codigo_proyecto} actualizado a "Finalizado" - Todos los requerimientos están completados`);
        }
      }
      // Si NO todos están completados y el proyecto está en "Finalizado", cambiar a "En proceso"
      else if (!allCompleted && estadoProyectoActual.includes('finalizado')) {
        nuevoEstadoProyecto = 'En proceso';
        const { error: updateProyectoError } = await supabase
          .from('solicitud_acreditacion')
          .update({ 
            estado_solicitud_acreditacion: nuevoEstadoProyecto,
            fecha_finalizacion: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', requerimiento.id_proyecto);

        if (updateProyectoError) {
          console.error('❌ Error actualizando estado del proyecto:', updateProyectoError);
        } else {
          console.log(`✅ Proyecto ${requerimiento.codigo_proyecto} actualizado a "En proceso" - Ya no todos los requerimientos están completados`);
        }
      }
    } catch (checkError) {
      console.error('❌ Error verificando estado del proyecto:', checkError);
      // No fallar la actualización del requerimiento si falla la verificación del proyecto
    }
  }

  return { 
    allCompleted, 
    codigoProyecto: requerimiento?.codigo_proyecto,
    proyectoEstadoCambio: nuevoEstadoProyecto
  };
};

// Función para actualizar los nombres de responsables en los requerimientos del proyecto
export const updateProyectoRequerimientosResponsables = async (
  codigoProyecto: string,
  responsables: {
    jpro_nombre?: string;
    epr_nombre?: string;
    rrhh_nombre?: string;
    legal_nombre?: string;
  }
): Promise<void> => {
  console.log('═══════════════════════════════════════════════════');
  console.log('🔄 ACTUALIZANDO RESPONSABLES EN REQUERIMIENTOS');
  console.log('═══════════════════════════════════════════════════');
  console.log('Código Proyecto:', codigoProyecto);
  console.log('Responsables:', responsables);

  // Obtener todos los requerimientos del proyecto
  const { data: requerimientos, error: fetchError } = await supabase
    .from('proyecto_requerimientos_acreditacion')
    .select('id, requerimiento, responsable')
    .eq('codigo_proyecto', codigoProyecto);

  if (fetchError) {
    console.error('❌ Error obteniendo requerimientos:', fetchError);
    throw fetchError;
  }

  if (!requerimientos || requerimientos.length === 0) {
    console.log('⚠️ No se encontraron requerimientos para actualizar');
    return;
  }

  console.log(`📋 Encontrados ${requerimientos.length} requerimientos para actualizar`);

  // Actualizar cada requerimiento según su responsable
  let actualizados = 0;
  let errores = 0;

  for (const req of requerimientos) {
    let nombreResponsable = '';
    
    switch (req.responsable) {
      case 'JPRO':
        nombreResponsable = responsables.jpro_nombre || '';
        break;
      case 'EPR':
        nombreResponsable = responsables.epr_nombre || '';
        break;
      case 'RRHH':
        nombreResponsable = responsables.rrhh_nombre || '';
        break;
      case 'Legal':
        nombreResponsable = responsables.legal_nombre || '';
        break;
      default:
        console.log(`⚠️ Responsable desconocido: ${req.responsable} para requerimiento ${req.id}`);
        continue;
    }

    if (nombreResponsable) {
      const { error: updateError } = await supabase
        .from('proyecto_requerimientos_acreditacion')
        .update({ 
          nombre_responsable: nombreResponsable,
          updated_at: new Date().toISOString()
        })
        .eq('id', req.id);

      if (updateError) {
        console.error(`❌ Error actualizando requerimiento ${req.id}:`, updateError);
        errores++;
      } else {
        console.log(`✅ Requerimiento ${req.id} (${req.requerimiento}) actualizado: ${req.responsable} → ${nombreResponsable}`);
        actualizados++;
      }
    } else {
      console.log(`⚠️ No hay responsable asignado para ${req.responsable} en requerimiento ${req.id}`);
    }
  }

  console.log('═══════════════════════════════════════════════════');
  console.log(`✅ Actualización completada: ${actualizados} actualizados, ${errores} errores`);
  console.log('═══════════════════════════════════════════════════\n');
};

// Función para guardar trabajadores del proyecto
export const createProyectoTrabajadores = async (
  idProyecto: number,
  codigoProyecto: string,
  trabajadoresMyma: { name: string }[],
  trabajadoresContratista: { name: string }[]
): Promise<void> => {
  console.log('👷 Guardando trabajadores del proyecto:', codigoProyecto);
  console.log(`  - MyMA: ${trabajadoresMyma.length} trabajadores`);
  console.log(`  - Contratista: ${trabajadoresContratista.length} trabajadores`);

  const trabajadores: Omit<ProyectoTrabajador, 'id' | 'created_at' | 'updated_at'>[] = [];

  // Agregar trabajadores MyMA
  trabajadoresMyma.forEach(trabajador => {
    trabajadores.push({
      id_proyecto: idProyecto,
      codigo_proyecto: codigoProyecto,
      nombre_trabajador: trabajador.name,
      categoria_empresa: 'MyMA'
    });
  });

  // Agregar trabajadores Contratista
  trabajadoresContratista.forEach(trabajador => {
    trabajadores.push({
      id_proyecto: idProyecto,
      codigo_proyecto: codigoProyecto,
      nombre_trabajador: trabajador.name,
      categoria_empresa: 'Contratista'
    });
  });

  if (trabajadores.length === 0) {
    console.log('⚠️ No hay trabajadores para guardar');
    return;
  }

  console.log(`📦 Insertando ${trabajadores.length} trabajadores en total`);

  const { data, error } = await supabase
    .from('proyecto_trabajadores')
    .insert(trabajadores)
    .select();

  if (error) {
    console.error('❌ Error guardando trabajadores del proyecto:', error);
    throw error;
  }

  console.log(`✅ ${data?.length || 0} trabajadores guardados exitosamente`);
};

// Función para guardar horarios del proyecto
export const createProyectoHorarios = async (
  idProyecto: number,
  codigoProyecto: string,
  horarios: Array<{ dias: string; horario: string }>,
  categoriaEmpresa: string = 'MyMA'
): Promise<void> => {
  console.log('⏰ Guardando horarios del proyecto:', codigoProyecto);
  console.log(`  - Total: ${horarios.length} horarios`);
  console.log(`  - Categoría: ${categoriaEmpresa}`);

  if (!horarios || horarios.length === 0) {
    console.log('⚠️ No hay horarios para guardar');
    return;
  }

  // Guardar todos los horarios sin restricciones
  const horariosData = horarios.map(horario => ({
    id_proyecto: idProyecto,
    codigo_proyecto: codigoProyecto,
    dias: horario.dias || '',
    horario: horario.horario || '',
    categoria_empresa: categoriaEmpresa
  }));

  console.log(`📦 Insertando ${horariosData.length} horarios`);

  const { data, error } = await supabase
    .from('proyecto_horarios')
    .insert(horariosData)
    .select();

  if (error) {
    console.error('❌ Error guardando horarios del proyecto:', error);
    throw error;
  }

  console.log(`✅ ${horariosData.length} horarios guardados exitosamente`);
};

// Función para guardar conductores del proyecto
export const createProyectoConductores = async (
  idProyecto: number,
  codigoProyecto: string,
  vehiculos: Array<{ placa: string; conductor: string }>,
  categoriaEmpresa: 'MyMA' | 'Contratista'
): Promise<void> => {
  console.log('🚗 Guardando conductores del proyecto:', codigoProyecto);
  console.log(`  - Total: ${vehiculos.length} vehículos`);
  console.log(`  - Categoría: ${categoriaEmpresa}`);

  if (!vehiculos || vehiculos.length === 0) {
    console.log('⚠️ No hay vehículos para guardar');
    return;
  }

  // Guardar todos los vehículos sin restricciones
  const conductoresData = vehiculos.map(vehiculo => ({
    id_proyecto: idProyecto,
    codigo_proyecto: codigoProyecto,
    patente: vehiculo.placa || '',
    nombre_conductor: vehiculo.conductor || '',
    categoria_empresa: categoriaEmpresa
  }));

  console.log(`📦 Insertando ${conductoresData.length} conductores`);

  const { data, error } = await supabase
    .from('proyecto_conductores')
    .insert(conductoresData)
    .select();

  if (error) {
    console.error('❌ Error guardando conductores del proyecto:', error);
    throw error;
  }

  console.log(`✅ ${conductoresData.length} conductores guardados exitosamente`);
};


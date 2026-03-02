import { supabase } from '@shared/api-client/supabase';
import { Persona, Requerimiento, PersonaRequerimientoSST, RequestItem, RequestStatus, SolicitudAcreditacion, ProjectGalleryItem, Cliente, EmpresaRequerimiento, ProyectoRequerimientoAcreditacion, ResponsableRequerimiento, ProyectoTrabajador, FieldRequestFormSnapshot, RequestFormData, Worker, WorkerType } from '../types';
import { generateProjectTasks, calculateCompletedTasks } from '../utils/projectTasks';
import { ACREDITACION_PROXY_ENDPOINTS } from './acreditacionProxyEndpoints';

// FunciÃ³n para enviar webhook a travÃ©s de la funciÃ³n edge de Supabase (evita CORS)
export const sendWebhookViaEdgeFunction = async (payload: any): Promise<any> => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://pugasfsnckeyitjemvju.supabase.co';
  const functionUrl = `${supabaseUrl}/functions/v1/send-webhook`;
  
  console.log('ðŸ”— Invocando funciÃ³n edge:', functionUrl);
  console.log('ðŸ“¦ Payload:', payload);
  
  try {
    const { data, error } = await supabase.functions.invoke('send-webhook', {
      body: payload,
    });

    if (error) {
      console.error('âŒ Error al invocar funciÃ³n edge:', error);
      console.error('âŒ Detalles del error:', {
        message: error.message,
        name: error.name,
        context: (error as any).context,
      });
      
      // Si es un 404, intentar hacer fetch directo como fallback
      if (error.message?.includes('404') || error.message?.includes('not found') || (error as any).status === 404) {
        console.warn('âš ï¸ FunciÃ³n edge no encontrada (404). Intentando mÃ©todo alternativo...');
        
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
            throw new Error(`Error ${directResponse.status}: La funciÃ³n edge "send-webhook" no estÃ¡ desplegada o no es accesible. Por favor, verifica en el Dashboard de Supabase que la funciÃ³n estÃ© desplegada correctamente.`);
          }

          const directData = await directResponse.json();
          console.log('âœ… Respuesta usando mÃ©todo alternativo:', directData);
          return directData;
        } catch (fallbackError: any) {
          throw new Error(`La funciÃ³n edge "send-webhook" no estÃ¡ desplegada. Ve al Dashboard de Supabase > Edge Functions y verifica que la funciÃ³n "send-webhook" estÃ© desplegada. Error: ${fallbackError.message}`);
        }
      }
      
      throw error;
    }

    console.log('âœ… Respuesta de funciÃ³n edge:', data);
    return data;
  } catch (err: any) {
    console.error('âŒ Error completo:', err);
    throw err;
  }
};

interface EnviarIdProyectoN8nOptions {
  emailUsuario?: string | null;
  solicitudPrueba?: boolean;
}

// FunciÃ³n para enviar el ID del proyecto a la edge function de n8n
export const enviarIdProyectoN8n = async (
  idProyecto: number,
  options?: EnviarIdProyectoN8nOptions
): Promise<any> => {
  console.log('ðŸ”— Invocando funciÃ³n edge: Enviar_id_proyecto_n8n');
  console.log('ðŸ“¦ ID Proyecto:', idProyecto);
  
  // Obtener el correo del usuario autenticado
  let userEmail: string | null = options?.emailUsuario ?? null;
  const solicitudPrueba = options?.solicitudPrueba ?? false;
  
  if (!userEmail) {
    // Intentar primero con getSession (mÃ¡s confiable)
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (session?.user?.email && !sessionError) {
        userEmail = session.user.email;
        console.log('ðŸ‘¤ Correo obtenido desde session:', userEmail);
      } else {
        // Si no funciona con getSession, intentar con getUser
        console.log('âš ï¸ No se obtuvo correo desde session, intentando getUser...');
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (user?.email && !userError) {
          userEmail = user.email;
          console.log('ðŸ‘¤ Correo obtenido desde getUser:', userEmail);
        } else {
          console.warn('âš ï¸ No se pudo obtener el correo del usuario:', userError || sessionError);
        }
      }
    } catch (error) {
      console.error('âŒ Error al obtener usuario:', error);
    }
  }
  
  if (!userEmail) {
    console.error('âŒ No se pudo obtener el correo del usuario autenticado');
  }

  // Preparar el payload
  const payload = { 
    id_proyecto: idProyecto,
    email_usuario: userEmail,
    solicitud_prueba: solicitudPrueba,
  };
  
  console.log('ðŸ“¤ Payload completo a enviar a edge function:', payload);
  
  try {
    // Usar el mÃ©todo invoke de Supabase que maneja CORS automÃ¡ticamente
    const { data, error } = await supabase.functions.invoke('Enviar_id_proyecto_n8n', {
      body: payload,
    });

    if (error) {
      console.error('âŒ Error al invocar funciÃ³n edge:', error);
      console.error('âŒ Detalles del error:', {
        message: error.message,
        name: error.name,
        context: (error as any).context,
      });
      
      // Si el error indica que la funciÃ³n no existe, dar un mensaje mÃ¡s claro
      if (error.message?.includes('not found') || error.message?.includes('404') || (error as any).status === 404) {
        throw new Error('La funciÃ³n edge "Enviar_id_proyecto_n8n" no estÃ¡ desplegada. Por favor, despliega la funciÃ³n en Supabase usando: supabase functions deploy Enviar_id_proyecto_n8n');
      }
      
      throw error;
    }

    console.log('âœ… Respuesta de funciÃ³n edge:', data);
    return data;
  } catch (err: any) {
    console.error('âŒ Error completo al enviar ID del proyecto:', err);
    
    // Proporcionar un mensaje mÃ¡s amigable
    let errorMessage = 'Error al enviar ID del proyecto';
    if (err.message) {
      errorMessage += `: ${err.message}`;
    } else if (err.toString) {
      errorMessage += `: ${err.toString()}`;
    }
    
    throw new Error(errorMessage);
  }
};

// FunciÃ³n para calcular el estado basado en la fecha de vencimiento
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

// FunciÃ³n para obtener todas las personas
export const fetchPersonas = async (): Promise<Persona[]> => {
  const { data, error } = await supabase
    .from('dim_core_persona')
    .select('*')
    .eq('estado', 'Activo')
    .order('nombre_completo', { ascending: true });
  
  if (error) {
    console.error('Error fetching personas:', error);
    throw error;
  }
  
  if (!data || data.length === 0) {
    return [];
  }
  
  // Obtener IDs Ãºnicos de cargos y gerencias
  const cargoIds = [...new Set(data.map((p: any) => p.cargo_myma_id).filter(Boolean))];
  const gerenciaIds = [...new Set(data.map((p: any) => p.gerencia_id).filter(Boolean))];
  
  // Obtener nombres de cargos
  let cargosMap: Record<string, string> = {};
  if (cargoIds.length > 0) {
    try {
      const { data: cargosData } = await supabase
        .from('dim_core_cargo_myma')
        .select('id, nombre')
        .in('id', cargoIds);
      
      if (cargosData) {
        cargosMap = cargosData.reduce((acc: Record<string, string>, cargo: any) => {
          acc[cargo.id] = cargo.nombre;
          return acc;
        }, {});
      }
    } catch (err) {
      console.warn('Error obteniendo cargos:', err);
    }
  }
  
  // Obtener nombres de gerencias
  let gerenciasMap: Record<string, string> = {};
  if (gerenciaIds.length > 0) {
    try {
      const { data: gerenciasData } = await supabase
        .from('dim_core_gerencia')
        .select('id, nombre')
        .in('id', gerenciaIds);
      
      if (gerenciasData) {
        gerenciasMap = gerenciasData.reduce((acc: Record<string, string>, gerencia: any) => {
          acc[gerencia.id] = gerencia.nombre;
          return acc;
        }, {});
      }
    } catch (err) {
      console.warn('Error obteniendo gerencias:', err);
    }
  }
  
  // Mapear los datos para incluir cargo y Ã¡rea
  const personas = data.map((persona: any) => ({
    ...persona,
    cargo_nombre: persona.cargo_myma_id ? (cargosMap[persona.cargo_myma_id] || '') : '',
    area_nombre: persona.gerencia_id ? (gerenciasMap[persona.gerencia_id] || '') : '',
  }));
  
  return personas;
};

// FunciÃ³n para obtener todos los clientes
export const fetchClientes = async (): Promise<Cliente[]> => {
  const { data, error } = await supabase
    .from('dim_acreditacion_cliente')
    .select('*')
    .order('nombre', { ascending: true });
  
  if (error) {
    console.error('Error fetching clientes:', error);
    throw error;
  }
  
  return data || [];
};

// FunciÃ³n para obtener todos los responsables de requerimiento
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

// FunciÃ³n para obtener todos los requerimientos
export const fetchRequerimientos = async (): Promise<Requerimiento[]> => {
  const { data, error } = await supabase
    .from('dim_acreditacion_requerimiento_sst')
    .select('*')
    .order('requerimiento', { ascending: true });
  
  if (error) {
    console.error('Error fetching requerimientos:', error);
    throw error;
  }
  
  return data || [];
};

// FunciÃ³n para obtener todas las categorÃ­as Ãºnicas de requerimientos
export const fetchCategoriasRequerimientos = async (): Promise<string[]> => {
  const { data, error } = await supabase
    .from('dim_acreditacion_requerimiento_sst')
    .select('categoria_requerimiento')
    .not('categoria_requerimiento', 'is', null);
  
  if (error) {
    console.error('Error fetching categorias:', error);
    throw error;
  }
  
  // Obtener valores Ãºnicos y ordenarlos
  const categoriasUnicas = Array.from(
    new Set(data?.map(item => item.categoria_requerimiento).filter(Boolean))
  ).sort() as string[];
  
  return categoriasUnicas;
};

// FunciÃ³n para crear un nuevo requerimiento
export const createRequerimiento = async (
  requerimiento: string,
  categoria_requerimiento: string,
  dias_anticipacion_notificacion?: number
): Promise<Requerimiento> => {
  const insertData: any = {
    requerimiento,
    categoria_requerimiento,
  };

  if (dias_anticipacion_notificacion !== undefined && dias_anticipacion_notificacion !== null) {
    insertData.dias_anticipacion_notificacion = dias_anticipacion_notificacion;
  }

  const { data, error } = await supabase
    .from('dim_acreditacion_requerimiento_sst')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Error creating requerimiento:', error);
    throw error;
  }

  return data;
};

// FunciÃ³n para obtener requerimientos del catÃ¡logo
export const fetchCatalogoRequerimientos = async (): Promise<any[]> => {
  const { data, error } = await supabase
    .from('dim_acreditacion_requerimiento')
    .select('*')
    .order('requerimiento', { ascending: true });
  
  if (error) {
    console.error('Error fetching dim_acreditacion_requerimiento:', error);
    throw error;
  }
  
  return data || [];
};

// FunciÃ³n para obtener todos los proveedores
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

// FunciÃ³n para obtener brg_acreditacion_persona_requerimiento_sst con cÃ¡lculo de estado
export const fetchPersonaRequerimientos = async (): Promise<RequestItem[]> => {
  const { data, error } = await supabase
    .from('brg_acreditacion_persona_requerimiento_sst')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching brg_acreditacion_persona_requerimiento_sst:', error);
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
    // Usar estado si existe, sino calcular automÃ¡ticamente
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

// FunciÃ³n para obtener requerimientos de una persona especÃ­fica por nombre
export const fetchPersonaRequerimientosByNombre = async (nombreCompleto: string): Promise<RequestItem[]> => {
  const { data, error } = await supabase
    .from('brg_acreditacion_persona_requerimiento_sst')
    .select('*')
    .ilike('nombre_completo', `%${nombreCompleto}%`)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching brg_acreditacion_persona_requerimiento_sst by nombre:', error);
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
    // Usar estado si existe, sino calcular automÃ¡ticamente
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

// FunciÃ³n para crear un nuevo registro en brg_acreditacion_persona_requerimiento_sst
export const createPersonaRequerimiento = async (
  personaId: number,
  requerimientoId: number,
  fechaVigencia: string,
  fechaVencimiento: string,
  linkDrive?: string
): Promise<PersonaRequerimientoSST> => {
  // Obtener informaciÃ³n de persona y requerimiento (incluyendo dias_anticipacion_notificacion)
  const [personaResult, requerimientoResult] = await Promise.all([
    supabase.from('dim_core_persona').select('*').eq('id', personaId).single(),
    supabase.from('dim_acreditacion_requerimiento_sst').select('*').eq('id', requerimientoId).single()
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
    console.log('âœ… Usando dias_anticipacion_notificacion del requerimiento:', diasAnticipacion);
  } else {
    // Fallback: usar 60 como valor por defecto
    diasAnticipacion = 60;
    console.log('âš ï¸ dias_anticipacion_notificacion no disponible, usando valor por defecto: 60');
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
    .from('brg_acreditacion_persona_requerimiento_sst')
    .insert(insertData)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating persona_requerimiento:', error);
    throw error;
  }
  
  return data;
};

// FunciÃ³n para actualizar un registro existente
export const updatePersonaRequerimiento = async (
  id: number,
  fechaVigencia: string,
  fechaVencimiento: string,
  estado?: RequestStatus,
  linkDrive?: string
): Promise<PersonaRequerimientoSST> => {
  console.log('ðŸ”§ updatePersonaRequerimiento recibido:');
  console.log('  - ID:', id);
  console.log('  - Estado recibido:', estado);
  console.log('  - Tipo de estado:', typeof estado);
  console.log('  - Estado === undefined?', estado === undefined);
  
  // Obtener el requerimiento_id del registro existente para obtener dias_anticipacion_notificacion
  const { data: registroExistente, error: fetchError } = await supabase
    .from('brg_acreditacion_persona_requerimiento_sst')
    .select('requerimiento_id')
    .eq('id', id)
    .single();
  
  let diasAnticipacion: number;
  
  if (!fetchError && registroExistente?.requerimiento_id) {
    // Obtener el requerimiento para obtener dias_anticipacion_notificacion
    const { data: requerimiento, error: reqError } = await supabase
      .from('dim_acreditacion_requerimiento_sst')
      .select('dias_anticipacion_notificacion')
      .eq('id', registroExistente.requerimiento_id)
      .single();
    
    if (!reqError && requerimiento?.dias_anticipacion_notificacion !== undefined && requerimiento.dias_anticipacion_notificacion !== null) {
      diasAnticipacion = requerimiento.dias_anticipacion_notificacion;
      console.log('âœ… Usando dias_anticipacion_notificacion del requerimiento:', diasAnticipacion);
    } else {
      // Fallback: usar 60 como valor por defecto
      diasAnticipacion = 60;
      console.log('âš ï¸ dias_anticipacion_notificacion no disponible, usando valor por defecto: 60');
    }
  } else {
    // Fallback: usar 60 como valor por defecto si no se puede obtener el requerimiento
    diasAnticipacion = 60;
    console.log('âš ï¸ No se pudo obtener requerimiento_id, usando valor por defecto: 60');
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
  
  console.log('ðŸ’¾ Datos a enviar a Supabase:', updateData);
  
  const { data, error } = await supabase
    .from('brg_acreditacion_persona_requerimiento_sst')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('âŒ Error updating persona_requerimiento:', error);
    throw error;
  }
  
  console.log('âœ… Registro actualizado exitosamente:', data);
  
  return data;
};

// FunciÃ³n para verificar si el usuario actual es admin
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

// FunciÃ³n para eliminar un registro (solo admin puede eliminar)
export const deletePersonaRequerimiento = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from('brg_acreditacion_persona_requerimiento_sst')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting persona_requerimiento:', error);
    throw error;
  }
};

// ===== FUNCIONES PARA SOLICITUD_ACREDITACION =====

// FunciÃ³n para obtener todas las solicitudes de acreditaciÃ³n
export const fetchSolicitudesAcreditacion = async (): Promise<SolicitudAcreditacion[]> => {
  const { data, error } = await supabase
    .from('fct_acreditacion_solicitud')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching solicitudes_acreditacion:', error);
    throw error;
  }
  
  return data || [];
};

// FunciÃ³n para transformar solicitudes a formato de galerÃ­a de proyectos
export const fetchProjectGalleryItems = async (): Promise<ProjectGalleryItem[]> => {
  const solicitudes = await fetchSolicitudesAcreditacion();
  
  return Promise.all(solicitudes.map(async (solicitud: SolicitudAcreditacion) => {
    // Parsear trabajadores de los campos JSON
    const trabajadoresMyma = solicitud.trabajadores_myma || [];
    const trabajadoresContratista = solicitud.trabajadores_contratista || [];
    const allWorkers = [...trabajadoresMyma, ...trabajadoresContratista];
    
    // Calcular total de vehÃ­culos
    const totalVehicles = (solicitud.vehiculos_cantidad || 0) + (solicitud.vehiculos_contratista_cantidad || 0);
    
    // Obtener tareas reales del proyecto desde la base de datos
    let projectTasks: any[] = [];
    let completedTasks = 0;
    let totalTasks = 0;
    
    try {
      const idProyecto = solicitud.id;
      if (idProyecto) {
        const requerimientos = await fetchProyectoRequerimientos(idProyecto);
        
        // Transformar requerimientos a formato de tareas
        projectTasks = requerimientos.map(req => ({
          id: req.id,
          responsable: req.responsable,
          nombre_responsable: req.nombre_responsable,
          nombre_trabajador: req.nombre_trabajador,
          categoria_empresa: req.categoria_empresa,
          id_proyecto_trabajador: req.id_proyecto_trabajador,
          patente_vehiculo: req.patente_vehiculo,
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
      projectCode: solicitud.codigo_proyecto || 'Sin cÃ³digo',
      projectName: solicitud.requisito || 'Proyecto sin nombre',
      clientName: solicitud.nombre_cliente || 'Sin cliente',
      razonSocialContratista: solicitud.razon_social_contratista || undefined,
      projectManager: solicitud.jefe_proyectos_myma || 'Sin asignar',
      fieldStartDate: solicitud.fecha_inicio_terreno || solicitud.fecha_solicitud,
      fechaInicioTerreno: solicitud.fecha_inicio_terreno || undefined,
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

// FunciÃ³n para crear una nueva solicitud de acreditaciÃ³n
export const createSolicitudAcreditacion = async (data: Partial<SolicitudAcreditacion>): Promise<SolicitudAcreditacion> => {
  const { data: result, error } = await supabase
    .from('fct_acreditacion_solicitud')
    .insert(data)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating solicitud_acreditacion:', error);
    throw error;
  }
  
  return result;
};

// FunciÃ³n para actualizar una solicitud de acreditaciÃ³n
export const updateSolicitudAcreditacion = async (
  id: number,
  data: Partial<SolicitudAcreditacion>
): Promise<SolicitudAcreditacion> => {
  const { data: result, error } = await supabase
    .from('fct_acreditacion_solicitud')
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

// FunciÃ³n para eliminar una solicitud de acreditaciÃ³n
export const deleteSolicitudAcreditacion = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from('fct_acreditacion_solicitud')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting solicitud_acreditacion:', error);
    throw error;
  }
};

// FunciÃ³n para actualizar responsables de una solicitud
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
    acreditacion_id?: number;
    acreditacion_nombre?: string;
  }
): Promise<SolicitudAcreditacion> => {
  console.log('ðŸ”„ Actualizando responsables para solicitud ID:', id);
  console.log('ðŸ“ Responsables recibidos:', responsables);

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
    enc_acreditacion_id: responsables.acreditacion_id || null,
    nombre_enc_acreditacion: responsables.acreditacion_nombre || null,
    estado_solicitud_acreditacion: 'En proceso',
    updated_at: new Date().toISOString() 
  };

  console.log('ðŸ“¦ Datos a guardar:', updateData);
  console.log('ðŸ” Ejecutando actualizaciÃ³n en Supabase...');
  console.log('   ID del registro a actualizar:', id);

  try {
    // Primero, ejecutar la actualizaciÃ³n sin select para verificar que se ejecute
    const { error: updateError, count } = await supabase
      .from('fct_acreditacion_solicitud')
      .update(updateData)
      .eq('id', id);
    
    console.log('ðŸ“¡ Respuesta de actualizaciÃ³n recibida');
    console.log('   Error:', updateError);
    console.log('   Count (filas afectadas):', count);
    
    if (updateError) {
      console.error('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
      console.error('âŒ ERROR AL ACTUALIZAR RESPONSABLES EN SUPABASE');
      console.error('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
      console.error('Error completo:', updateError);
      console.error('ðŸ“Š Detalles del error:', {
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code
      });
      console.error('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
      throw updateError;
    }
    
    if (count === 0) {
      console.error('âš ï¸ No se actualizÃ³ ninguna fila. Verificando si el registro existe...');
      // Verificar si el registro existe
      const { data: existingData, error: checkError } = await supabase
        .from('fct_acreditacion_solicitud')
        .select('id, codigo_proyecto')
        .eq('id', id)
        .single();
      
      if (checkError) {
        console.error('âŒ Error al verificar existencia del registro:', checkError);
        throw new Error(`No se pudo verificar si el registro existe: ${checkError.message}`);
      }
      
      if (!existingData) {
        throw new Error(`El registro con ID ${id} no existe en la base de datos.`);
      }
      
      console.warn('âš ï¸ El registro existe pero no se actualizÃ³. Posibles causas:');
      console.warn('   - Los datos son idÃ©nticos a los ya guardados');
      console.warn('   - Problemas con RLS (Row Level Security)');
      console.warn('   - Problemas con permisos de escritura');
    } else {
      console.log(`âœ… Se actualizaron ${count} fila(s)`);
    }
    
    // Ahora obtener los datos actualizados para verificar
    const { data, error: selectError } = await supabase
      .from('fct_acreditacion_solicitud')
      .select('*')
      .eq('id', id)
      .single();
    
    if (selectError) {
      console.error('âŒ Error al obtener datos actualizados:', selectError);
      throw new Error(`La actualizaciÃ³n se ejecutÃ³ pero no se pudieron obtener los datos actualizados: ${selectError.message}`);
    }
    
    if (!data) {
      console.error('âš ï¸ No se obtuvieron datos despuÃ©s de la actualizaciÃ³n');
      throw new Error('La actualizaciÃ³n se ejecutÃ³ pero no se pudieron obtener los datos actualizados.');
    }
    
    console.log('âœ… Responsables actualizados exitosamente');
    console.log('ðŸ“Š Datos actualizados en BD:', JSON.stringify({
      id: data.id,
      codigo_proyecto: data.codigo_proyecto,
      empresa_id: data.empresa_id,
      empresa_nombre: data.empresa_nombre,
      jpro_id: data.jpro_id,
      jpro_nombre: data.jpro_nombre,
      epr_id: data.epr_id,
      epr_nombre: data.epr_nombre,
      rrhh_id: data.rrhh_id,
      rrhh_nombre: data.rrhh_nombre,
      legal_id: data.legal_id,
      legal_nombre: data.legal_nombre,
      estado_solicitud_acreditacion: data.estado_solicitud_acreditacion,
      updated_at: data.updated_at
    }, null, 2));
    
    return data;
  } catch (err: any) {
    console.error('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
    console.error('âŒ EXCEPCIÃ“N AL ACTUALIZAR RESPONSABLES');
    console.error('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
    console.error('Error:', err);
    console.error('Tipo:', typeof err);
    if (err instanceof Error) {
      console.error('Mensaje:', err.message);
      console.error('Stack:', err.stack);
    }
    console.error('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
    throw err;
  }
};

// FunciÃ³n para obtener requerimientos estÃ¡ndar de una empresa
export const fetchEmpresaRequerimientos = async (empresa: string): Promise<EmpresaRequerimiento[]> => {
  console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
  console.log('ðŸ” fetchEmpresaRequerimientos');
  console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
  console.log('Empresa buscada:', empresa);
  console.log('Longitud:', empresa.length);
  console.log('Con marcadores:', `|${empresa}|`);
  console.log('Primer carÃ¡cter (cÃ³digo):', empresa.charCodeAt(0));
  
  const { data, error } = await supabase
    .from('brg_acreditacion_cliente_requerimiento')
    .select('*')
    .eq('empresa', empresa)
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
    console.error('âŒ ERROR EN LA CONSULTA');
    console.error('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
    console.error('Error completo:', error);
    console.error('Mensaje:', error.message);
    console.error('Detalles:', error.details);
    console.error('CÃ³digo:', error.code);
    console.error('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
    throw error;
  }
  
  console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
  console.log('âœ… CONSULTA EXITOSA');
  console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
  console.log(`Total registros: ${data?.length || 0}`);
  
  if (data && data.length > 0) {
    console.log('\nðŸ“‹ Primeros registros:');
    data.slice(0, 3).forEach((req, i) => {
      console.log(`\n  ${i + 1}. ID: ${req.id}`);
      console.log(`     Empresa: "${req.empresa}"`);
      console.log(`     Requerimiento: ${req.requerimiento}`);
      console.log(`     Responsable: ${req.responsable}`);
    });
    if (data.length > 3) {
      console.log(`\n  ... y ${data.length - 3} mÃ¡s`);
    }
  } else {
    console.log('\nâš ï¸ NO SE ENCONTRARON REGISTROS');
    console.log('\nðŸ’¡ Sugerencias:');
    console.log('   1. Verifica que existan datos en Supabase con este SQL:');
    console.log(`      SELECT * FROM brg_acreditacion_cliente_requerimiento WHERE empresa = '${empresa}';`);
    console.log('   2. Verifica todas las empresas disponibles:');
    console.log('      SELECT DISTINCT empresa FROM brg_acreditacion_cliente_requerimiento;');
    console.log('   3. Busca con coincidencia parcial:');
    console.log(`      SELECT * FROM brg_acreditacion_cliente_requerimiento WHERE empresa ILIKE '%${empresa}%';`);
  }
  console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n');
  
  return data || [];
};

// FunciÃ³n para obtener las observaciones de un requerimiento especÃ­fico de una empresa
export const fetchEmpresaRequerimientoObservaciones = async (
  empresa: string,
  requerimiento: string
): Promise<string | null> => {
  const { data, error } = await supabase
    .from('brg_acreditacion_cliente_requerimiento')
    .select('observaciones')
    .eq('empresa', empresa)
    .eq('requerimiento', requerimiento)
    .single();
  
  if (error) {
    // Si no se encuentra el registro, no es un error crÃ­tico
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching observaciones:', error);
    return null;
  }
  
  // Retornar observaciones solo si no estÃ¡n vacÃ­as
  if (data && data.observaciones && data.observaciones.trim() !== '') {
    return data.observaciones;
  }
  
  return null;
};

// FunciÃ³n para obtener las observaciones de un requerimiento especÃ­fico de un proyecto
export const fetchProyectoRequerimientoObservaciones = async (
  codigoProyecto: string,
  requerimiento: string
): Promise<string | null> => {
  const { data, error } = await supabase
    .from('brg_acreditacion_solicitud_requerimiento')
    .select('observaciones')
    .eq('codigo_proyecto', codigoProyecto)
    .eq('requerimiento', requerimiento)
    .limit(1)
    .single();
  
  if (error) {
    // Si no se encuentra el registro, no es un error crÃ­tico
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching observaciones del proyecto:', error);
    return null;
  }
  
  // Retornar observaciones solo si no estÃ¡n vacÃ­as
  if (data && data.observaciones && data.observaciones.trim() !== '') {
    return data.observaciones;
  }
  
  return null;
};

// FunciÃ³n para crear requerimientos de acreditaciÃ³n de un proyecto
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
): Promise<any[]> => {
  console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
  console.log('ðŸš€ INICIO: createProyectoRequerimientos');
  console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
  console.log('ðŸ“ CÃ³digo Proyecto:', codigoProyecto);
  console.log('ðŸ¢ Cliente:', cliente);
  console.log('ðŸ“‹ Empresa Requerimientos recibidos:', empresaRequerimientos?.length || 0);
  console.log('ðŸ‘¥ Responsables:', JSON.stringify(responsables, null, 2));
  
  if (!empresaRequerimientos || empresaRequerimientos.length === 0) {
    console.error('âŒ NO HAY REQUERIMIENTOS PARA GUARDAR');
    console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n');
    return [];
  }
  
  // Primero, verificar si ya existen requerimientos para este proyecto
  console.log('\nðŸ” Verificando requerimientos existentes...');
  const { data: existingReqs, error: checkError } = await supabase
    .from('brg_acreditacion_solicitud_requerimiento')
    .select('id, requerimiento, categoria_requerimiento, responsable')
    .eq('codigo_proyecto', codigoProyecto);
  
  if (checkError) {
    console.error('âŒ Error al verificar requerimientos existentes:', checkError);
  }
  
  console.log(`ðŸ“Š Requerimientos existentes: ${existingReqs?.length || 0}`);
  
  if (existingReqs && existingReqs.length > 0) {
    console.log('âš ï¸ Ya existen requerimientos para este proyecto:');
    existingReqs.forEach((req: any, i) => {
      console.log(`  ${i + 1}. ${req.requerimiento} (${req.categoria_requerimiento})`);
    });
    
    // Si hay responsables asignados, actualizar los requerimientos existentes
    const tieneResponsables = responsables.jpro_nombre || responsables.epr_nombre || responsables.rrhh_nombre || responsables.legal_nombre;
    
    if (tieneResponsables) {
      console.log('ðŸ”„ Actualizando requerimientos existentes con responsables asignados...');
      
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
            .from('brg_acreditacion_solicitud_requerimiento')
            .update({ nombre_responsable: nombreResponsable })
            .eq('id', req.id);
          
          if (updateError) {
            console.error(`âŒ Error actualizando requerimiento ${req.id}:`, updateError);
          } else {
            console.log(`âœ… Requerimiento ${req.id} actualizado con responsable: ${nombreResponsable}`);
          }
        }
      }
      
      console.log('âœ… Requerimientos actualizados exitosamente');
      console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n');
      // Retornar los requerimientos existentes actualizados
      const { data: updatedReqs } = await supabase
        .from('brg_acreditacion_solicitud_requerimiento')
        .select('*')
        .eq('codigo_proyecto', codigoProyecto);
      return updatedReqs || [];
    } else {
      // Si no hay responsables pero hay requerimientos existentes, continuar para crear nuevos
      // (puede ser que se estÃ©n agregando nuevos requerimientos)
      console.log('âš ï¸ Ya existen requerimientos pero no hay responsables asignados');
      console.log('ðŸ“ Continuando para verificar si hay nuevos requerimientos que crear...');
      // NO retornar aquÃ­, continuar con la lÃ³gica de creaciÃ³n
    }
  } else {
    console.log('âœ… No hay requerimientos existentes, procediendo a crear...');
  }

  // Obtener el id_proyecto (id de fct_acreditacion_solicitud) y datos de la solicitud
  let proyectoId = idProyecto;
  let requiereAcreditarEmpresa = false;
  let requiereAcreditarContratista = false;
  let razonSocialContratista: string | null = null;
  
  if (!proyectoId) {
    // Si no se pasÃ³ como parÃ¡metro, buscarlo en la base de datos
    console.log('\nðŸ” Buscando fct_acreditacion_solicitud...');
    const { data: solicitud, error: solicitudError } = await supabase
      .from('fct_acreditacion_solicitud')
      .select('id, requiere_acreditar_empresa, requiere_acreditar_contratista, razon_social_contratista')
      .eq('codigo_proyecto', codigoProyecto)
      .single();

    if (solicitudError) {
      console.error('âŒ Error obteniendo solicitud:', solicitudError);
      console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n');
      throw new Error(`No se encontrÃ³ el proyecto ${codigoProyecto}`);
    }

    proyectoId = solicitud?.id;
    requiereAcreditarEmpresa = solicitud?.requiere_acreditar_empresa === true;
    requiereAcreditarContratista = solicitud?.requiere_acreditar_contratista === true;
    razonSocialContratista = solicitud?.razon_social_contratista || null;
  } else {
    // Si tenemos el ID, obtener los datos de la solicitud
    console.log('\nðŸ” Obteniendo datos de la solicitud...');
    const { data: solicitud, error: solicitudError } = await supabase
      .from('fct_acreditacion_solicitud')
      .select('requiere_acreditar_empresa, requiere_acreditar_contratista, razon_social_contratista')
      .eq('id', proyectoId)
      .single();

    if (!solicitudError && solicitud) {
      requiereAcreditarEmpresa = solicitud.requiere_acreditar_empresa === true;
      requiereAcreditarContratista = solicitud.requiere_acreditar_contratista === true;
      razonSocialContratista = solicitud.razon_social_contratista || null;
    }
  }
  
  console.log(`âœ… ID Proyecto encontrado: ${proyectoId}`);
  console.log(`ðŸ“‹ Requiere acreditar empresa: ${requiereAcreditarEmpresa}`);
  console.log(`ðŸ“‹ Requiere acreditar contratista: ${requiereAcreditarContratista}`);
  if (razonSocialContratista) {
    console.log(`ðŸ“‹ RazÃ³n social contratista: ${razonSocialContratista}`);
  }

  // Obtener los trabajadores de fct_acreditacion_solicitud_trabajador_manual
  console.log('\nðŸ” Buscando trabajadores en fct_acreditacion_solicitud_trabajador_manual...');
  let trabajadoresProyecto: ProyectoTrabajador[] = [];
  
  if (proyectoId) {
    const { data: trabajadores, error: trabajadoresError } = await supabase
      .from('fct_acreditacion_solicitud_trabajador_manual')
      .select('*')
      .eq('id_proyecto', proyectoId);

    if (trabajadoresError) {
      console.error('âŒ Error obteniendo trabajadores:', trabajadoresError);
    } else {
      trabajadoresProyecto = trabajadores || [];
      console.log(`âœ… Trabajadores encontrados: ${trabajadoresProyecto.length}`);
      if (trabajadoresProyecto.length > 0) {
        trabajadoresProyecto.forEach((t, i) => {
          console.log(`  ${i + 1}. ${t.nombre_trabajador} (${t.categoria_empresa}) - ID: ${t.id}`);
        });
      }
    }
  } else {
    console.warn('âš ï¸ No se pudo obtener el ID del proyecto');
  }

  // Obtener los conductores de fct_acreditacion_solicitud_conductor_manual
  console.log('\nðŸ” Buscando conductores en fct_acreditacion_solicitud_conductor_manual...');
  let conductoresProyecto: any[] = [];
  
  if (proyectoId) {
    const { data: conductores, error: conductoresError } = await supabase
      .from('fct_acreditacion_solicitud_conductor_manual')
      .select('*')
      .eq('id_proyecto', proyectoId);

    if (conductoresError) {
      console.error('âŒ Error obteniendo conductores:', conductoresError);
    } else {
      conductoresProyecto = conductores || [];
      console.log(`âœ… Conductores encontrados: ${conductoresProyecto.length}`);
      if (conductoresProyecto.length > 0) {
        conductoresProyecto.forEach((c, i) => {
          console.log(`  ${i + 1}. ${c.nombre_conductor} (${c.categoria_empresa}) - Patente: ${c.patente}`);
        });
      }
    }
  } else {
    console.warn('âš ï¸ No se pudo obtener el ID del proyecto');
  }
  
  // Obtener los vehiculos de fct_acreditacion_solicitud_vehiculos
  console.log('\nðŸ” Buscando vehiculos en fct_acreditacion_solicitud_vehiculos...');
  let vehiculosProyecto: any[] = [];
  
  if (proyectoId) {
    const { data: vehiculos, error: vehiculosError } = await supabase
      .from('fct_acreditacion_solicitud_vehiculos')
      .select('*')
      .eq('id_proyecto', proyectoId);

    if (vehiculosError) {
      console.error('âŒ Error obteniendo vehiculos:', vehiculosError);
    } else {
      vehiculosProyecto = vehiculos || [];
      console.log(`âœ… Vehiculos encontrados: ${vehiculosProyecto.length}`);
      if (vehiculosProyecto.length > 0) {
        vehiculosProyecto.forEach((v, i) => {
          console.log(`  ${i + 1}. ${v.patente} (${v.categoria_empresa}) - ID: ${v.id}`);
        });
      }
    }
  } else {
    console.warn('âš ï¸ No se pudo obtener el ID del proyecto');
  }

  // Mapear cada requerimiento de empresa a uno o mÃ¡s requerimientos de proyecto
  console.log('\nðŸ”§ Construyendo requerimientos...');
  const proyectoRequerimientos: any[] = [];

  empresaRequerimientos.forEach((req, index) => {
    console.log(`\n  Procesando requerimiento ${index + 1}/${empresaRequerimientos.length}:`);
    console.log(`    Requerimiento: ${req.requerimiento}`);
    console.log(`    CategorÃ­a: ${req.categoria_requerimiento}`);
    console.log(`    Responsable: ${req.responsable}`);
    
    // Asignar el nombre del responsable segÃºn el rol
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
    const categoriaNormalizada = (req.categoria_requerimiento || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    // Verificar si es categorÃ­a "Empresa" para duplicar si ambos flags son TRUE
    const esCategoriaEmpresa = categoriaNormalizada === 'empresa' || 
                               categoriaNormalizada === 'empresa myma' ||
                               categoriaNormalizada === 'empresa subcontrato';
    
    // Si la categorÃ­a es "Trabajadores", crear un registro por cada trabajador de fct_acreditacion_solicitud_trabajador_manual
    const esTrabajadores = categoriaNormalizada === 'trabajadores';
    // Si la categorÃ­a es "Conductores", crear un registro por cada conductor de fct_acreditacion_solicitud_conductor_manual
    const esConductores = categoriaNormalizada === 'conductores';
    const esVehiculos = categoriaNormalizada === 'vehiculos';
    console.log(`    Es categoria Vehiculos?: ${esVehiculos}`);
    console.log(`    Â¿Es categorÃ­a Trabajadores?: ${esTrabajadores}`);
    console.log(`    Â¿Es categorÃ­a Conductores?: ${esConductores}`);
    console.log(`    Â¿Es categorÃ­a Empresa?: ${esCategoriaEmpresa}`);
    console.log(`    Trabajadores disponibles: ${trabajadoresProyecto.length}`);
    console.log(`    Conductores disponibles: ${conductoresProyecto.length}`);
    console.log(`    Vehiculos disponibles: ${vehiculosProyecto.length}`);
    
    // FunciÃ³n auxiliar para crear un registro base
    const crearRegistroBase = (empresaAcreditacionValue: string | null = null): any => {
      return {
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
        id_proyecto_trabajador: null,
        ...(empresaAcreditacionValue ? { empresa_acreditacion: empresaAcreditacionValue } : {})
      };
    };
    
    if (esTrabajadores && trabajadoresProyecto.length > 0) {
      console.log(`    ðŸ‘· Creando ${trabajadoresProyecto.length} registros (uno por trabajador)`);
      
      trabajadoresProyecto.forEach((trabajador, tIndex) => {
        // Determinar empresa_acreditacion segÃºn la categorÃ­a del trabajador
        let empresaAcreditacion: string | null = null;
        if (trabajador.categoria_empresa?.toUpperCase() === 'MYMA') {
          empresaAcreditacion = 'MyMA';
          console.log(`      Trabajador ${tIndex + 1} (${trabajador.nombre_trabajador}): categoria_empresa = MyMA â†’ empresa_acreditacion = "MyMA"`);
        } else {
          // Si es Contratista o distinto de MyMA, usar razon_social_contratista
          empresaAcreditacion = razonSocialContratista || null;
          console.log(`      Trabajador ${tIndex + 1} (${trabajador.nombre_trabajador}): categoria_empresa = ${trabajador.categoria_empresa} â†’ empresa_acreditacion = "${razonSocialContratista || 'NULL'}"`);
        }
        
        const registro: any = {
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
          id_proyecto_trabajador: trabajador.id,
          ...(empresaAcreditacion ? { empresa_acreditacion: empresaAcreditacion } : {})
        };
        
        proyectoRequerimientos.push(registro);
      });
    } else if (esConductores && conductoresProyecto.length > 0) {
      console.log(`    ðŸš— Creando ${conductoresProyecto.length} registros (uno por conductor)`);
      
      conductoresProyecto.forEach((conductor, cIndex) => {
        // Determinar empresa_acreditacion segÃºn la categorÃ­a del conductor
        let empresaAcreditacion: string | null = null;
        if (conductor.categoria_empresa?.toUpperCase() === 'MYMA') {
          empresaAcreditacion = 'MyMA';
          console.log(`      Conductor ${cIndex + 1} (${conductor.nombre_conductor}): categoria_empresa = MyMA â†’ empresa_acreditacion = "MyMA"`);
        } else {
          // Si es Contratista o distinto de MyMA, usar razon_social_contratista
          empresaAcreditacion = razonSocialContratista || null;
          console.log(`      Conductor ${cIndex + 1} (${conductor.nombre_conductor}): categoria_empresa = ${conductor.categoria_empresa} â†’ empresa_acreditacion = "${razonSocialContratista || 'NULL'}"`);
        }
        
        const registro: any = {
          codigo_proyecto: codigoProyecto,
          id_proyecto: proyectoId,
          requerimiento: req.requerimiento,
          responsable: req.responsable,
          estado: 'Pendiente',
          cliente: cliente,
          categoria_requerimiento: req.categoria_requerimiento,
          observaciones: req.observaciones || null,
          nombre_responsable: nombreResponsable,
          nombre_trabajador: conductor.nombre_conductor || conductor.patente || null,
          categoria_empresa: conductor.categoria_empresa || null,
          id_proyecto_trabajador: conductor.id ?? null,
          ...(empresaAcreditacion ? { empresa_acreditacion: empresaAcreditacion } : {})
        };
        
        proyectoRequerimientos.push(registro);
      });
    } else if (esVehiculos && vehiculosProyecto.length > 0) {
      console.log(`    ðŸš™ Creando ${vehiculosProyecto.length} registros (uno por vehiculo)`);
      
      vehiculosProyecto.forEach((vehiculo, vIndex) => {
        // Determinar empresa_acreditacion segun la categoria del vehiculo
        let empresaAcreditacion: string | null = null;
        if (vehiculo.categoria_empresa?.toUpperCase() === 'MYMA') {
          empresaAcreditacion = 'MyMA';
          console.log(`      Vehiculo ${vIndex + 1} (${vehiculo.patente}): categoria_empresa = MyMA â†’ empresa_acreditacion = "MyMA"`);
        } else {
          // Si es Contratista o distinto de MyMA, usar razon_social_contratista
          empresaAcreditacion = razonSocialContratista || null;
          console.log(`      Vehiculo ${vIndex + 1} (${vehiculo.patente}): categoria_empresa = ${vehiculo.categoria_empresa} â†’ empresa_acreditacion = "${razonSocialContratista || 'NULL'}"`);
        }
        
        const registro: any = {
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
          categoria_empresa: vehiculo.categoria_empresa || null,
          id_proyecto_trabajador: vehiculo.id ?? null,
          patente_vehiculo: vehiculo.patente || null,
          ...(empresaAcreditacion ? { empresa_acreditacion: empresaAcreditacion } : {})
        };
        
        proyectoRequerimientos.push(registro);
      });
    } else if (esCategoriaEmpresa) {
      // Para categorÃ­a "Empresa", duplicar segÃºn los flags
      console.log(`    ðŸ¢ CategorÃ­a Empresa detectada - Verificando duplicaciÃ³n...`);
      
      // Si requiere_acreditar_empresa es TRUE, crear registro con MyMA
      if (requiereAcreditarEmpresa) {
        const registroMyMA = crearRegistroBase('MyMA');
        proyectoRequerimientos.push(registroMyMA);
        console.log(`    âœ… Registro creado con empresa_acreditacion = "MyMA"`);
      }
      
      // Si requiere_acreditar_contratista es TRUE y hay razÃ³n social, crear registro con contratista
      if (requiereAcreditarContratista && razonSocialContratista) {
        const registroContratista = crearRegistroBase(razonSocialContratista);
        proyectoRequerimientos.push(registroContratista);
        console.log(`    âœ… Registro creado con empresa_acreditacion = "${razonSocialContratista}"`);
      }
      
      // Si ninguno de los dos es TRUE, crear un registro sin empresa_acreditacion
      if (!requiereAcreditarEmpresa && !requiereAcreditarContratista) {
        const registro = crearRegistroBase();
        proyectoRequerimientos.push(registro);
        console.log(`    ðŸ“„ Registro creado sin empresa_acreditacion (ningÃºn flag activo)`);
      }
    } else {
      // Para otras categorÃ­as, crear solo un registro
      console.log(`    ðŸ“„ Creando 1 registro (categorÃ­a normal)`);
      const registro = crearRegistroBase();
      proyectoRequerimientos.push(registro);
    }
  });

  console.log(`\nðŸ“¦ TOTAL DE REGISTROS A INSERTAR: ${proyectoRequerimientos.length}`);
  
  if (proyectoRequerimientos.length === 0) {
    console.error('âŒ NO SE CONSTRUYERON REQUERIMIENTOS');
    console.error('ðŸ” Posibles causas:');
    console.error('   1. No hay requerimientos en empresaRequerimientos');
    console.error('   2. La categorÃ­a no coincide con ninguna condiciÃ³n');
    console.error('   3. Los flags requiere_acreditar_empresa y requiere_acreditar_contratista estÃ¡n en FALSE para categorÃ­a Empresa');
    console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n');
    throw new Error('No se pudieron construir requerimientos para guardar. Verifica los logs anteriores.');
  }
  
  // Logs detallados de TODOS los registros antes de insertar
  console.log('\nðŸ“‹ DETALLE COMPLETO DE TODOS LOS REGISTROS A INSERTAR:');
  proyectoRequerimientos.forEach((r, i) => {
    console.log(`\n  ðŸ“ Registro ${i + 1}/${proyectoRequerimientos.length}:`);
    console.log(`    codigo_proyecto: "${r.codigo_proyecto}"`);
    console.log(`    requerimiento: "${r.requerimiento}"`);
    console.log(`    id_proyecto_trabajador: ${r.id_proyecto_trabajador ?? 'NULL'} (COALESCE â†’ ${r.id_proyecto_trabajador ?? -1})`);
    console.log(`    empresa_acreditacion: "${r.empresa_acreditacion ?? 'NULL'}" (COALESCE â†’ "${r.empresa_acreditacion ?? ''}")`);
    console.log(`    categoria_requerimiento: "${r.categoria_requerimiento}"`);
    console.log(`    responsable: "${r.responsable}"`);
    console.log(`    nombre_trabajador: "${r.nombre_trabajador || 'NULL'}"`);
    console.log(`    â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€`);
    console.log(`    ðŸ”‘ CLAVE ÃšNICA (constraint):`);
    console.log(`       (codigo_proyecto="${r.codigo_proyecto}", requerimiento="${r.requerimiento}", id_trabajador=${r.id_proyecto_trabajador ?? -1}, empresa="${r.empresa_acreditacion ?? ''}")`);
  });

  // Verificar si hay registros duplicados en la base de datos ANTES de insertar
  console.log('\nðŸ” VERIFICANDO REGISTROS EXISTENTES EN BD...');
  const valoresUnicos = proyectoRequerimientos.map(r => ({
    codigo_proyecto: r.codigo_proyecto,
    requerimiento: r.requerimiento,
    id_proyecto_trabajador: r.id_proyecto_trabajador ?? -1,
    empresa_acreditacion: r.empresa_acreditacion ?? ''
  }));
  
  console.log(`   Buscando ${valoresUnicos.length} combinaciones Ãºnicas...`);
  
  // Verificar cada combinaciÃ³n Ãºnica
  for (const valorUnico of valoresUnicos) {
    const { data: existentes, error: checkError } = await supabase
      .from('brg_acreditacion_solicitud_requerimiento')
      .select('id, codigo_proyecto, requerimiento, id_proyecto_trabajador, empresa_acreditacion')
      .eq('codigo_proyecto', valorUnico.codigo_proyecto)
      .eq('requerimiento', valorUnico.requerimiento)
      .eq('id_proyecto_trabajador', valorUnico.id_proyecto_trabajador === -1 ? null : valorUnico.id_proyecto_trabajador)
      .eq('empresa_acreditacion', valorUnico.empresa_acreditacion || null);
    
    if (checkError) {
      console.error(`   âš ï¸ Error verificando:`, checkError);
    } else if (existentes && existentes.length > 0) {
      console.error(`   âŒ CONFLICTO DETECTADO:`);
      console.error(`      codigo_proyecto: "${valorUnico.codigo_proyecto}"`);
      console.error(`      requerimiento: "${valorUnico.requerimiento}"`);
      console.error(`      id_proyecto_trabajador: ${valorUnico.id_proyecto_trabajador}`);
      console.error(`      empresa_acreditacion: "${valorUnico.empresa_acreditacion}"`);
      console.error(`      Registros existentes en BD:`, existentes);
    }
  }

  // Insertar todos los requerimientos
  console.log('\nðŸ’¾ INSERTANDO EN BASE DE DATOS...');
  console.log(`Tabla: brg_acreditacion_solicitud_requerimiento`);
  console.log(`Registros a insertar: ${proyectoRequerimientos.length}`);
  console.log(`\nðŸ“¦ Datos completos a insertar (JSON):`);
  console.log(JSON.stringify(proyectoRequerimientos, null, 2));
  
  const { data, error } = await supabase
    .from('brg_acreditacion_solicitud_requerimiento')
    .insert(proyectoRequerimientos)
    .select();
  
  if (error) {
    console.error('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
    console.error('âŒ ERROR EN INSERT');
    console.error('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
    console.error('Mensaje:', error.message);
    console.error('CÃ³digo:', error.code);
    console.error('Detalles:', error.details);
    console.error('Hint:', error.hint);
    console.error('Error completo:', JSON.stringify(error, null, 2));
    
    // Si es error de duplicado, mostrar informaciÃ³n detallada
    if (error.message.includes('duplicate') || error.message.includes('unique') || error.code === '23505') {
      console.error('\nâš ï¸ ERROR DE UNIQUE CONSTRAINT DETECTADO');
      console.error('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
      console.error('El constraint estÃ¡ bloqueando la inserciÃ³n porque:');
      console.error('  1. Ya existe un registro con la misma combinaciÃ³n de:');
      console.error('     - codigo_proyecto');
      console.error('     - requerimiento');
      console.error('     - id_proyecto_trabajador (o -1 si es NULL)');
      console.error('     - empresa_acreditacion (o "" si es NULL)');
      console.error('\n  2. Posibles causas:');
      console.error('     a) El constraint NO incluye empresa_acreditacion (ejecuta el script SQL)');
      console.error('     b) EstÃ¡s intentando insertar un registro que ya existe');
      console.error('     c) Hay un constraint antiguo que no se eliminÃ³');
      console.error('\n  3. Registros que se intentaron insertar:');
      proyectoRequerimientos.forEach((r, i) => {
        console.error(`     ${i + 1}. (${r.codigo_proyecto}, "${r.requerimiento}", ${r.id_proyecto_trabajador ?? -1}, "${r.empresa_acreditacion ?? ''}")`);
      });
      console.error('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n');
      throw new Error('Error de constraint UNIQUE. Revisa la consola para ver los detalles. Ejecuta el script sql/actualizar_constraint_con_empresa_acreditacion.sql en Supabase SQL Editor si aÃºn no lo has hecho.');
    }
    
    console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n');
    throw error;
  }
  
  console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
  console.log('âœ… INSERT EXITOSO');
  console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
  console.log(`Registros insertados: ${data?.length || 0}`);
  
  if (data && data.length > 0) {
    console.log('\nPrimeros 3 registros insertados:');
    data.slice(0, 3).forEach((r: any, i) => {
      console.log(`  ${i + 1}. ID: ${r.id} - ${r.requerimiento} (${r.categoria_requerimiento})`);
    });
  }
  
  console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n');
  return data || [];
};

// FunciÃ³n para obtener requerimientos de un proyecto
export const fetchProyectoRequerimientos = async (idProyecto: number): Promise<ProyectoRequerimientoAcreditacion[]> => {
  console.log('ðŸ” Buscando requerimientos del proyecto por id_proyecto:', idProyecto);
  
  const { data, error } = await supabase
    .from('brg_acreditacion_solicitud_requerimiento')
    .select('*')
    .eq('id_proyecto', idProyecto)
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('âŒ Error fetching proyecto requerimientos:', error);
    throw error;
  }
  
  console.log(`âœ… Encontrados ${data?.length || 0} requerimientos para id_proyecto ${idProyecto}`);
  return data || [];
};

// FunciÃ³n para obtener fct_acreditacion_solicitud por cÃ³digo de proyecto (para obtener drive_folder_id y drive_folder_url)
export const fetchSolicitudAcreditacionByCodigo = async (codigoProyecto: string): Promise<Partial<SolicitudAcreditacion> | null> => {
  console.log('ðŸ” Buscando fct_acreditacion_solicitud para proyecto:', codigoProyecto);
  
  const { data, error } = await supabase
    .from('fct_acreditacion_solicitud')
    .select('drive_folder_id, drive_folder_url, codigo_proyecto')
    .eq('codigo_proyecto', codigoProyecto)
    .single();
  
  if (error) {
    console.error('âŒ Error fetching fct_acreditacion_solicitud:', error);
    console.error('âŒ CÃ³digo de proyecto buscado:', codigoProyecto);
    return null;
  }
  
  console.log('âœ… Solicitud encontrada:', {
    codigo_proyecto: data?.codigo_proyecto,
    drive_folder_id: data?.drive_folder_id,
    drive_folder_url: data?.drive_folder_url,
  });
  
  return data;
};

// FunciÃ³n para actualizar el estado de un requerimiento
export const updateRequerimientoEstado = async (
  id: number,
  estado: string
): Promise<{ allCompleted: boolean; codigoProyecto?: string; proyectoEstadoCambio?: string }> => {
  const updateData: any = {
    estado: estado,
    updated_at: new Date().toISOString()
  };
  
  // Si el estado es "Completado", guardar la fecha de finalizaciÃ³n
  // Si no es "Completado", establecer fecha_finalizacion como NULL
  if (estado === 'Completado') {
    updateData.fecha_finalizacion = new Date().toISOString();
  } else {
    updateData.fecha_finalizacion = null;
  }

  // Primero, obtener el requerimiento para saber el cÃ³digo del proyecto
  const { data: requerimiento, error: fetchError } = await supabase
    .from('brg_acreditacion_solicitud_requerimiento')
    .select('codigo_proyecto, id_proyecto')
    .eq('id', id)
    .single();

  if (fetchError) {
    console.error('âŒ Error obteniendo requerimiento:', fetchError);
    throw fetchError;
  }

  // Actualizar el requerimiento
  const { error } = await supabase
    .from('brg_acreditacion_solicitud_requerimiento')
    .update(updateData)
    .eq('id', id);
  
  if (error) {
    console.error('âŒ Error actualizando estado del requerimiento:', error);
    throw error;
  }
  
  console.log(`âœ… Requerimiento ${id} actualizado a ${estado}`);

  // Verificar y actualizar el estado del proyecto segÃºn los requerimientos
  let allCompleted = false;
  let nuevoEstadoProyecto: string | undefined = undefined;
  
  if (requerimiento?.codigo_proyecto && requerimiento.id_proyecto) {
    try {
      // Obtener el estado actual del proyecto
      const { data: proyectoActual, error: proyectoError } = await supabase
        .from('fct_acreditacion_solicitud')
        .select('estado_solicitud_acreditacion')
        .eq('id', requerimiento.id_proyecto)
        .single();

      if (proyectoError) {
        console.error('âŒ Error obteniendo estado del proyecto:', proyectoError);
      }

      // Obtener todos los requerimientos del proyecto
      const { data: todosRequerimientos, error: reqError } = await supabase
        .from('brg_acreditacion_solicitud_requerimiento')
        .select('estado')
        .eq('codigo_proyecto', requerimiento.codigo_proyecto);

      if (reqError) {
        console.error('âŒ Error obteniendo requerimientos del proyecto:', reqError);
        return { allCompleted: false, codigoProyecto: requerimiento?.codigo_proyecto };
      }

      // Verificar si todos estÃ¡n completados
      allCompleted = todosRequerimientos && todosRequerimientos.length > 0 &&
        todosRequerimientos.every(req => req.estado === 'Completado');

      const estadoProyectoActual = proyectoActual?.estado_solicitud_acreditacion?.toLowerCase() || '';

      // Si todos estÃ¡n completados y el proyecto no estÃ¡ en "Finalizado", actualizar a "Finalizado"
      if (allCompleted && !estadoProyectoActual.includes('finalizado')) {
        nuevoEstadoProyecto = 'Finalizado';
        const { error: updateProyectoError } = await supabase
          .from('fct_acreditacion_solicitud')
          .update({ 
            estado_solicitud_acreditacion: nuevoEstadoProyecto,
            fecha_finalizacion: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', requerimiento.id_proyecto);

        if (updateProyectoError) {
          console.error('âŒ Error actualizando estado del proyecto:', updateProyectoError);
        } else {
          console.log(`âœ… Proyecto ${requerimiento.codigo_proyecto} actualizado a "Finalizado" - Todos los requerimientos estÃ¡n completados`);
        }
      }
      // Si NO todos estÃ¡n completados y el proyecto estÃ¡ en "Finalizado", cambiar a "En proceso"
      else if (!allCompleted && estadoProyectoActual.includes('finalizado')) {
        nuevoEstadoProyecto = 'En proceso';
        const { error: updateProyectoError } = await supabase
          .from('fct_acreditacion_solicitud')
          .update({ 
            estado_solicitud_acreditacion: nuevoEstadoProyecto,
            fecha_finalizacion: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', requerimiento.id_proyecto);

        if (updateProyectoError) {
          console.error('âŒ Error actualizando estado del proyecto:', updateProyectoError);
        } else {
          console.log(`âœ… Proyecto ${requerimiento.codigo_proyecto} actualizado a "En proceso" - Ya no todos los requerimientos estÃ¡n completados`);
        }
      }
    } catch (checkError) {
      console.error('âŒ Error verificando estado del proyecto:', checkError);
      // No fallar la actualizaciÃ³n del requerimiento si falla la verificaciÃ³n del proyecto
    }
  }

  return { 
    allCompleted, 
    codigoProyecto: requerimiento?.codigo_proyecto,
    proyectoEstadoCambio: nuevoEstadoProyecto
  };
};

// FunciÃ³n para actualizar los nombres de responsables en los requerimientos del proyecto
export const updateProyectoRequerimientosResponsables = async (
  codigoProyecto: string,
  responsables: {
    jpro_nombre?: string;
    epr_nombre?: string;
    rrhh_nombre?: string;
    legal_nombre?: string;
    acreditacion_id?: number;
    acreditacion_nombre?: string;
  }
): Promise<void> => {
  console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
  console.log('ðŸ”„ ACTUALIZANDO RESPONSABLES EN REQUERIMIENTOS');
  console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
  console.log('CÃ³digo Proyecto:', codigoProyecto);
  console.log('Responsables recibidos:', responsables);
  console.log('AcreditaciÃ³n ID:', responsables.acreditacion_id);
  console.log('AcreditaciÃ³n Nombre:', responsables.acreditacion_nombre);

  // Obtener todos los requerimientos del proyecto
  const { data: requerimientos, error: fetchError } = await supabase
    .from('brg_acreditacion_solicitud_requerimiento')
    .select('id, requerimiento, responsable')
    .eq('codigo_proyecto', codigoProyecto);

  if (fetchError) {
    console.error('âŒ Error obteniendo requerimientos:', fetchError);
    throw fetchError;
  }

  if (!requerimientos || requerimientos.length === 0) {
    console.log('âš ï¸ No se encontraron requerimientos para actualizar');
    return;
  }

  console.log(`ðŸ“‹ Encontrados ${requerimientos.length} requerimientos para actualizar`);

  // Actualizar cada requerimiento segÃºn su responsable
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
        console.log(`âš ï¸ Responsable desconocido: ${req.responsable} para requerimiento ${req.id}`);
        // No hacer continue, seguir para actualizar acreditaciÃ³n
        break;
    }

    // Preparar datos de actualizaciÃ³n
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Agregar nombre_responsable si existe
    if (nombreResponsable) {
      updateData.nombre_responsable = nombreResponsable;
    }

    // SIEMPRE agregar el ID y nombre de acreditaciÃ³n a TODOS los requerimientos
    if (responsables.acreditacion_id) {
      updateData.enc_acreditacion_id = responsables.acreditacion_id;
      console.log(`   ðŸ“ [Requerimiento ${req.id}] Agregando enc_acreditacion_id: ${responsables.acreditacion_id}`);
    } else {
      console.log(`   âš ï¸ [Requerimiento ${req.id}] No hay acreditacion_id para agregar`);
    }
    if (responsables.acreditacion_nombre) {
      updateData.nombre_enc_acreditacion = responsables.acreditacion_nombre;
      console.log(`   ðŸ“ [Requerimiento ${req.id}] Agregando nombre_enc_acreditacion: ${responsables.acreditacion_nombre}`);
    } else {
      console.log(`   âš ï¸ [Requerimiento ${req.id}] No hay acreditacion_nombre para agregar`);
    }

    // Solo actualizar si hay algo que actualizar (mÃ¡s que solo updated_at)
    const tieneDatosParaActualizar = nombreResponsable || responsables.acreditacion_id || responsables.acreditacion_nombre;
    
    if (!tieneDatosParaActualizar) {
      console.log(`âš ï¸ No hay datos para actualizar en requerimiento ${req.id}`);
      continue;
    }

    console.log(`   ðŸ“¦ [Requerimiento ${req.id}] Datos completos a actualizar:`, JSON.stringify(updateData, null, 2));

    // Actualizar el requerimiento
    const { error: updateError, data: updatedData } = await supabase
      .from('brg_acreditacion_solicitud_requerimiento')
      .update(updateData)
      .eq('id', req.id)
      .select();

    if (updateError) {
      console.error(`âŒ Error actualizando requerimiento ${req.id}:`, updateError);
      console.error(`   ðŸ“¦ Datos que se intentaron guardar:`, JSON.stringify(updateData, null, 2));
      console.error(`   ðŸ” Detalles del error:`, {
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code
      });
      errores++;
    } else {
      console.log(`âœ… Requerimiento ${req.id} (${req.requerimiento}) actualizado exitosamente`);
      if (updatedData && updatedData.length > 0) {
        console.log(`   ðŸ“Š Datos actualizados en BD:`, JSON.stringify(updatedData[0], null, 2));
      }
      if (nombreResponsable) {
        console.log(`   ${req.responsable} â†’ ${nombreResponsable}`);
      }
      if (responsables.acreditacion_id) {
        console.log(`   âœ… enc_acreditacion_id guardado: ${responsables.acreditacion_id}`);
      }
      if (responsables.acreditacion_nombre) {
        console.log(`   âœ… nombre_enc_acreditacion guardado: ${responsables.acreditacion_nombre}`);
      }
      actualizados++;
    }
  }

  console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
  console.log(`âœ… ActualizaciÃ³n completada: ${actualizados} actualizados, ${errores} errores`);
  console.log('â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•\n');
};

// FunciÃ³n para guardar trabajadores del proyecto
export const createProyectoTrabajadores = async (
  idProyecto: number,
  codigoProyecto: string,
  trabajadoresMyma: { name: string; rut?: string; phone?: string; personaId?: number }[],
  trabajadoresContratista: { name: string; rut?: string; phone?: string }[]
): Promise<void> => {
  console.log('ðŸ‘· Guardando trabajadores del proyecto:', codigoProyecto);
  console.log(`  - MyMA: ${trabajadoresMyma.length} trabajadores`);
  console.log(`  - Contratista: ${trabajadoresContratista.length} trabajadores`);

  const trabajadores: Omit<ProyectoTrabajador, 'id' | 'created_at' | 'updated_at'>[] = [];

  // Agregar trabajadores MyMA
  trabajadoresMyma.forEach(trabajador => {
    trabajadores.push({
      id_proyecto: idProyecto,
      codigo_proyecto: codigoProyecto,
      nombre_trabajador: trabajador.name,
      categoria_empresa: 'MyMA',
      rut: trabajador.rut || null,
      telefono: trabajador.phone || null,
      // Nuevo: relacionar con dim_core_persona si viene desde buscador interno
      persona_id: trabajador.personaId ?? null
    });
  });

  // Agregar trabajadores Contratista
  trabajadoresContratista.forEach(trabajador => {
    trabajadores.push({
      id_proyecto: idProyecto,
      codigo_proyecto: codigoProyecto,
      nombre_trabajador: trabajador.name,
      categoria_empresa: 'Contratista',
      rut: trabajador.rut || null,
      telefono: trabajador.phone || null,
      // Para contratistas no tenemos persona en dim_core_persona
      persona_id: null
    });
  });

  if (trabajadores.length === 0) {
    console.log('âš ï¸ No hay trabajadores para guardar');
    return;
  }

  console.log(`ðŸ“¦ Insertando ${trabajadores.length} trabajadores en total`);

  const { data, error } = await supabase
    .from('fct_acreditacion_solicitud_trabajador_manual')
    .insert(trabajadores)
    .select();

  if (error) {
    console.error('âŒ Error guardando trabajadores del proyecto:', error);
    throw error;
  }

  console.log(`âœ… ${data?.length || 0} trabajadores guardados exitosamente`);
};

// FunciÃ³n para obtener trabajadores del proyecto desde fct_acreditacion_solicitud_trabajador_manual
export const fetchProyectoTrabajadoresByProyecto = async (
  idProyecto: number,
  codigoProyecto: string
): Promise<any[]> => {
  console.log('ðŸ” Leyendo trabajadores del proyecto para resumen JSON:', {
    idProyecto,
    codigoProyecto,
  });

  const { data, error } = await supabase
    .from('fct_acreditacion_solicitud_trabajador_manual')
    .select('*')
    .eq('id_proyecto', idProyecto)
    .eq('codigo_proyecto', codigoProyecto);

  if (error) {
    console.error('âŒ Error leyendo trabajadores del proyecto para resumen:', error);
    throw error;
  }

  return data || [];
};

// FunciÃ³n para guardar horarios del proyecto
export const createProyectoHorarios = async (
  idProyecto: number,
  codigoProyecto: string,
  horarios: Array<{ dias: string; horario: string }>,
  categoriaEmpresa: string = 'MyMA'
): Promise<void> => {
  console.log('â° Guardando horarios del proyecto:', codigoProyecto);
  console.log(`  - Total: ${horarios.length} horarios`);
  console.log(`  - CategorÃ­a: ${categoriaEmpresa}`);

  if (!horarios || horarios.length === 0) {
    console.log('âš ï¸ No hay horarios para guardar');
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

  console.log(`ðŸ“¦ Insertando ${horariosData.length} horarios`);

  const { data, error } = await supabase
    .from('fct_acreditacion_solicitud_horario_manual')
    .insert(horariosData)
    .select();

  if (error) {
    console.error('âŒ Error guardando horarios del proyecto:', error);
    throw error;
  }

  console.log(`âœ… ${horariosData.length} horarios guardados exitosamente`);
};

// FunciÃ³n para guardar conductores del proyecto
export const createProyectoConductores = async (
  idProyecto: number,
  codigoProyecto: string,
  vehiculos: Array<{ placa: string; conductor: string }>,
  categoriaEmpresa: 'MyMA' | 'Contratista'
): Promise<void> => {
  console.log('ðŸš— Guardando conductores del proyecto:', codigoProyecto);
  console.log(`  - Total: ${vehiculos.length} vehÃ­culos`);
  console.log(`  - CategorÃ­a: ${categoriaEmpresa}`);

  if (!vehiculos || vehiculos.length === 0) {
    console.log('âš ï¸ No hay vehÃ­culos para guardar');
    return;
  }

  // Guardar todos los vehÃ­culos sin restricciones
  const conductoresData = vehiculos.map(vehiculo => ({
    id_proyecto: idProyecto,
    codigo_proyecto: codigoProyecto,
    patente: vehiculo.placa || '',
    nombre_conductor: vehiculo.conductor || '',
    categoria_empresa: categoriaEmpresa
  }));

  console.log(`ðŸ“¦ Insertando ${conductoresData.length} conductores`);

  const { data, error } = await supabase
    .from('fct_acreditacion_solicitud_conductor_manual')
    .insert(conductoresData)
    .select();

  if (error) {
    console.error('âŒ Error guardando conductores del proyecto:', error);
    throw error;
  }

  console.log(`âœ… ${conductoresData.length} conductores guardados exitosamente`);
};

// FunciÃ³n para guardar patentes del proyecto
export const createProyectoVehiculos = async (
  idProyecto: number,
  codigoProyecto: string,
  vehiculos: Array<{ placa: string; conductor?: string }>,
  categoriaEmpresa: 'MyMA' | 'Contratista'
): Promise<void> => {
  console.log('ðŸš— Guardando patentes del proyecto:', codigoProyecto);
  console.log(`  - Total recibido: ${vehiculos.length} vehÃ­culos`);
  console.log(`  - CategorÃ­a: ${categoriaEmpresa}`);

  if (!vehiculos || vehiculos.length === 0) {
    console.log('âš ï¸ No hay vehÃ­culos para guardar');
    return;
  }

  // Normalizar y filtrar patentes vacÃ­as
  const vehiculosConPatente = vehiculos
    .map((vehiculo) => ({
      patente: (vehiculo.placa || '').trim().toUpperCase(),
    }))
    .filter((vehiculo) => vehiculo.patente !== '');

  console.log(`  - Con patente vÃ¡lida: ${vehiculosConPatente.length}`);

  if (vehiculosConPatente.length === 0) {
    console.log('âš ï¸ No hay patentes vÃ¡lidas para guardar');
    return;
  }

  // Deduplicar por patente dentro de la categorÃ­a
  const patentesVistas = new Set<string>();
  const vehiculosDeduplicados = vehiculosConPatente.filter((vehiculo) => {
    if (patentesVistas.has(vehiculo.patente)) return false;
    patentesVistas.add(vehiculo.patente);
    return true;
  });

  console.log(`  - Patentes Ãºnicas a insertar: ${vehiculosDeduplicados.length}`);

  const vehiculosData = vehiculosDeduplicados.map((vehiculo) => ({
    id_proyecto: idProyecto,
    codigo_proyecto: codigoProyecto,
    patente: vehiculo.patente,
    categoria_empresa: categoriaEmpresa,
  }));

  console.log(`ðŸ“¦ Insertando ${vehiculosData.length} patentes`);

  const { error } = await supabase
    .from('fct_acreditacion_solicitud_vehiculos')
    .insert(vehiculosData);

  if (error) {
    console.error('âŒ Error guardando patentes del proyecto:', error);
    throw error;
  }

  console.log(`âœ… ${vehiculosData.length} patentes guardadas exitosamente`);
};

// FunciÃ³n para obtener conductores del proyecto desde fct_acreditacion_solicitud_conductor_manual
export const fetchProyectoConductoresByProyecto = async (
  idProyecto: number,
  codigoProyecto: string
): Promise<any[]> => {
  console.log('ðŸ” Leyendo conductores del proyecto para resumen JSON:', {
    idProyecto,
    codigoProyecto,
  });

  const { data, error } = await supabase
    .from('fct_acreditacion_solicitud_conductor_manual')
    .select('*')
    .eq('id_proyecto', idProyecto)
    .eq('codigo_proyecto', codigoProyecto);

  if (error) {
    console.error('âŒ Error leyendo conductores del proyecto para resumen:', error);
    throw error;
  }

  return data || [];
};

// FunciÃ³n para obtener patentes del proyecto desde fct_acreditacion_solicitud_vehiculos
export const fetchProyectoVehiculosByProyecto = async (
  idProyecto: number,
  codigoProyecto: string
): Promise<any[]> => {
  console.log('ðŸ” Leyendo patentes del proyecto para resumen JSON:', {
    idProyecto,
    codigoProyecto,
  });

  const { data, error } = await supabase
    .from('fct_acreditacion_solicitud_vehiculos')
    .select('*')
    .eq('id_proyecto', idProyecto)
    .eq('codigo_proyecto', codigoProyecto);

  if (error) {
    console.error('âŒ Error leyendo patentes del proyecto para resumen:', error);
    throw error;
  }

  return data || [];
};

const createEmptyFieldRequestFormData = (): RequestFormData => ({
  requestDate: '',
  requesterName: '',
  kickoffDate: '',
  projectCode: 'MY-',
  requirement: '',
  clientName: '',
  clientContactName: '',
  clientContactEmail: '',
  projectManager: '',
  accreditationFollowUp: '',
  fieldStartDate: '',
  riskPreventionNotice: '',
  companyAccreditationRequired: '',
  requiereAcreditarTrabajadoresMyma: '',
  contractAdmin: '',
  nombreContrato: '',
  numeroContrato: '',
  administradorContrato: '',
  jornadaTrabajo: '',
  horarioTrabajo: '',
  cantidadVehiculos: '',
  placaPatente: '',
  requiereAcreditarContratista: '',
  requiereAcreditarTrabajadoresContratista: '',
  modalidadContrato: '',
  razonSocialContratista: '',
  nombreResponsableContratista: '',
  telefonoResponsableContratista: '',
  emailResponsableContratista: '',
  cantidadVehiculosContratista: '',
  placasVehiculosContratista: '',
  registroSstTerreo: '',
  cantidad_trabajadores_myma: 0,
  cantidad_trabajadores_contratista: 0,
});

const sortByCreatedAtOrId = <T extends { created_at?: string; id?: number }>(rows: T[]): T[] => {
  return [...rows].sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    if (aTime !== bTime) return aTime - bTime;
    return (a.id || 0) - (b.id || 0);
  });
};

const toYesNoValue = (value: any): string => {
  if (value === null || value === undefined || value === '') return '';
  return normalizeDbBoolean(value) ? 'yes' : 'no';
};

export const fetchFieldRequestFormSnapshotByProjectId = async (
  idProyecto: number
): Promise<FieldRequestFormSnapshot> => {
  if (!idProyecto || typeof idProyecto !== 'number') {
    throw new Error('ID de proyecto invÃ¡lido para reconstruir formulario');
  }

  const missingFields = [
    'accreditationFollowUp',
    'horarioTrabajo',
  ];

  const [
    solicitudResult,
    trabajadoresResult,
    horariosResult,
    conductoresResult,
    vehiculosResult,
  ] = await Promise.all([
    supabase
      .from('fct_acreditacion_solicitud')
      .select('*')
      .eq('id', idProyecto)
      .single(),
    supabase
      .from('fct_acreditacion_solicitud_trabajador_manual')
      .select('*')
      .eq('id_proyecto', idProyecto),
    supabase
      .from('fct_acreditacion_solicitud_horario_manual')
      .select('*')
      .eq('id_proyecto', idProyecto),
    supabase
      .from('fct_acreditacion_solicitud_conductor_manual')
      .select('*')
      .eq('id_proyecto', idProyecto),
    supabase
      .from('fct_acreditacion_solicitud_vehiculos')
      .select('*')
      .eq('id_proyecto', idProyecto),
  ]);

  if (solicitudResult.error || !solicitudResult.data) {
    console.error('Error reconstruyendo formulario: solicitud no encontrada', solicitudResult.error);
    throw solicitudResult.error || new Error(`No se encontrÃ³ la solicitud ${idProyecto}`);
  }

  if (trabajadoresResult.error) {
    console.error('Error obteniendo trabajadores para snapshot:', trabajadoresResult.error);
    missingFields.push('workers (error de lectura en tabla de trabajadores)');
  }
  if (horariosResult.error) {
    console.error('Error obteniendo horarios para snapshot:', horariosResult.error);
    missingFields.push('horarios (error de lectura en tabla de horarios)');
  }
  if (conductoresResult.error) {
    console.error('Error obteniendo conductores para snapshot:', conductoresResult.error);
    missingFields.push('vehiculos/conductores (error de lectura en tabla de conductores)');
  }
  if (vehiculosResult.error) {
    console.error('Error obteniendo vehiculos para snapshot:', vehiculosResult.error);
    missingFields.push('vehiculos (error de lectura en tabla de vehiculos)');
  }

  const solicitud = solicitudResult.data as any;
  const trabajadoresRows = sortByCreatedAtOrId((trabajadoresResult.data || []) as any[]);
  const horariosRows = sortByCreatedAtOrId((horariosResult.data || []) as any[]);
  const conductoresRows = sortByCreatedAtOrId((conductoresResult.data || []) as any[]);
  const vehiculosRows = sortByCreatedAtOrId((vehiculosResult.data || []) as any[]);

  const razonSocialContratista = (solicitud.razon_social_contratista || '').trim();

  const trabajadoresMymaRows = trabajadoresRows.filter((row) => row.categoria_empresa === 'MyMA');
  const trabajadoresContratistaRows = trabajadoresRows.filter((row) => row.categoria_empresa !== 'MyMA');

  const workers: Worker[] = trabajadoresMymaRows.map((row) => ({
    id: String(row.id ?? `${idProyecto}-myma-${row.nombre_trabajador ?? 'trabajador'}`),
    name: row.nombre_trabajador || 'Sin nombre',
    type: WorkerType.INTERNAL,
    phone: row.telefono || undefined,
    rut: row.rut || undefined,
    personaId: row.persona_id ?? undefined,
  }));

  const workersContratista: Worker[] = trabajadoresContratistaRows.map((row) => ({
    id: String(row.id ?? `${idProyecto}-contratista-${row.nombre_trabajador ?? 'trabajador'}`),
    name: row.nombre_trabajador || 'Sin nombre',
    type: WorkerType.EXTERNAL,
    phone: row.telefono || undefined,
    rut: row.rut || undefined,
    company: razonSocialContratista || 'Contratista',
  }));

  const buildVehiculosPorCategoria = (categoriaEmpresa: 'MyMA' | 'Contratista') => {
    const conductoresCategoria = conductoresRows
      .filter((row) => row.categoria_empresa === categoriaEmpresa)
      .map((row) => ({
        placa: (row.patente || '').toString().trim(),
        conductor: (row.nombre_conductor || '').toString().trim(),
      }));

    if (conductoresCategoria.length > 0) {
      return conductoresCategoria;
    }

    return vehiculosRows
      .filter((row) => row.categoria_empresa === categoriaEmpresa)
      .map((row) => ({
        placa: (row.patente || '').toString().trim(),
        conductor: '',
      }));
  };

  const vehiculosMyma = buildVehiculosPorCategoria('MyMA');
  const vehiculosContratista = buildVehiculosPorCategoria('Contratista');

  const horarios = horariosRows.map((row) => ({
    dias: (row.dias || '').toString(),
    horario: (row.horario || '').toString(),
  }));

  const targetWorkerCountMyma = Number(solicitud.cantidad_trabajadores_myma ?? workers.length ?? 0) || 0;
  const targetWorkerCountContratista = Number(solicitud.cantidad_trabajadores_contratista ?? workersContratista.length ?? 0) || 0;

  const requiereAcreditarTrabajadoresMyma = targetWorkerCountMyma > 0 || workers.length > 0 ? 'yes' : 'no';
  const requiereAcreditarTrabajadoresContratista =
    targetWorkerCountContratista > 0 || workersContratista.length > 0 ? 'yes' : 'no';

  const formData: RequestFormData = {
    ...createEmptyFieldRequestFormData(),
    requestDate: solicitud.fecha_solicitud || '',
    requesterName: solicitud.nombre_solicitante || '',
    kickoffDate: solicitud.fecha_reunion_arranque || '',
    projectCode: solicitud.codigo_proyecto || '',
    requirement: solicitud.requisito || '',
    clientName: solicitud.nombre_cliente || '',
    clientContactName: solicitud.nombre_contacto_cliente || solicitud.contacto_cliente_nombre || '',
    clientContactEmail: solicitud.email_contacto_cliente || solicitud.contacto_cliente_email || '',
    projectManager: solicitud.jefe_proyectos_myma || '',
    accreditationFollowUp: '',
    fieldStartDate: solicitud.fecha_inicio_terreno || '',
    riskPreventionNotice: toYesNoValue(solicitud.aviso_prevencion_riesgo),
    companyAccreditationRequired: toYesNoValue(solicitud.requiere_acreditar_empresa),
    requiereAcreditarTrabajadoresMyma,
    contractAdmin: solicitud.admin_contrato_myma || '',
    nombreContrato: solicitud.nombre_contrato || '',
    numeroContrato: solicitud.numero_contrato || '',
    administradorContrato: solicitud.administrador_contrato || '',
    jornadaTrabajo: solicitud.condiciones_laborales || '',
    horarioTrabajo: '',
    cantidadVehiculos: String(vehiculosMyma.length),
    placaPatente: '',
    requiereAcreditarContratista: toYesNoValue(solicitud.requiere_acreditar_contratista),
    requiereAcreditarTrabajadoresContratista,
    modalidadContrato: solicitud.modalidad_contrato_contratista || '',
    razonSocialContratista,
    nombreResponsableContratista:
      solicitud.nombre_responsable_contratista || solicitud.responsable_contratista_nombre || '',
    telefonoResponsableContratista:
      solicitud.telefono_responsable_contratista || solicitud.responsable_contratista_telefono || '',
    emailResponsableContratista:
      solicitud.email_responsable_contratista || solicitud.responsable_contratista_email || '',
    cantidadVehiculosContratista: String(vehiculosContratista.length),
    placasVehiculosContratista: '',
    registroSstTerreo: toYesNoValue(solicitud.registro_sst_terreno),
    cantidad_trabajadores_myma: targetWorkerCountMyma,
    cantidad_trabajadores_contratista: targetWorkerCountContratista,
  };

  return {
    formData,
    workers,
    workersContratista,
    targetWorkerCountMyma,
    targetWorkerCountContratista,
    horarios,
    vehiculosMyma,
    vehiculosContratista,
    missingFields,
  };
};

export interface SolicitudRequerimientoCategoryAvailability {
  empresa: boolean;
  trabajadores: boolean;
  conductores: boolean;
  vehiculos: boolean;
  counts: {
    trabajadores: number;
    conductores: number;
    vehiculos: number;
  };
  flags: {
    requiereAcreditarEmpresa: boolean;
    requiereAcreditarContratista: boolean;
  };
}

const normalizeDbBoolean = (value: any): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return ['true', 't', '1', 'yes', 'y', 'si', 'sÃ­'].includes(normalized);
  }
  return false;
};

export const fetchSolicitudRequerimientoCategoryAvailability = async (
  idProyecto: number
): Promise<SolicitudRequerimientoCategoryAvailability> => {
  const [
    solicitudResult,
    trabajadoresCountResult,
    conductoresCountResult,
    vehiculosCountResult
  ] = await Promise.all([
    supabase
      .from('fct_acreditacion_solicitud')
      .select('requiere_acreditar_empresa, requiere_acreditar_contratista')
      .eq('id', idProyecto)
      .single(),
    supabase
      .from('fct_acreditacion_solicitud_trabajador_manual')
      .select('id', { count: 'exact', head: true })
      .eq('id_proyecto', idProyecto),
    supabase
      .from('fct_acreditacion_solicitud_conductor_manual')
      .select('id', { count: 'exact', head: true })
      .eq('id_proyecto', idProyecto),
    supabase
      .from('fct_acreditacion_solicitud_vehiculos')
      .select('id', { count: 'exact', head: true })
      .eq('id_proyecto', idProyecto),
  ]);

  if (solicitudResult.error) {
    console.error('Error obteniendo flags de solicitud para categorÃ­as:', solicitudResult.error);
    throw solicitudResult.error;
  }

  if (trabajadoresCountResult.error) {
    console.error('Error contando trabajadores del proyecto:', trabajadoresCountResult.error);
    throw trabajadoresCountResult.error;
  }

  if (conductoresCountResult.error) {
    console.error('Error contando conductores del proyecto:', conductoresCountResult.error);
    throw conductoresCountResult.error;
  }

  if (vehiculosCountResult.error) {
    console.error('Error contando vehÃ­culos del proyecto:', vehiculosCountResult.error);
    throw vehiculosCountResult.error;
  }

  const requiereAcreditarEmpresa = normalizeDbBoolean(
    solicitudResult.data?.requiere_acreditar_empresa
  );
  const requiereAcreditarContratista = normalizeDbBoolean(
    solicitudResult.data?.requiere_acreditar_contratista
  );

  const trabajadoresCount = trabajadoresCountResult.count || 0;
  const conductoresCount = conductoresCountResult.count || 0;
  const vehiculosCount = vehiculosCountResult.count || 0;

  return {
    empresa: requiereAcreditarEmpresa || requiereAcreditarContratista,
    trabajadores: trabajadoresCount > 0,
    conductores: conductoresCount > 0,
    vehiculos: vehiculosCount > 0,
    counts: {
      trabajadores: trabajadoresCount,
      conductores: conductoresCount,
      vehiculos: vehiculosCount,
    },
    flags: {
      requiereAcreditarEmpresa,
      requiereAcreditarContratista,
    },
  };
};

// FunciÃ³n para enviar el resumen de solicitud a logs de backend (edge function)
export const logResumenSolicitudAcreditacion = async (resumen: any): Promise<void> => {
  try {
    console.log('ðŸ“¦ Enviando resumen de acreditaciÃ³n a funciÃ³n edge...', resumen);
    await sendWebhookViaEdgeFunction({
      tipo: 'resumen_solicitud_acreditacion',
      payload: resumen,
    });
    console.log('âœ… Resumen de acreditaciÃ³n enviado a funciÃ³n edge correctamente');
  } catch (error) {
    console.error('âŒ Error enviando resumen de acreditaciÃ³n a funciÃ³n edge:', error);
  }
};

// FunciÃ³n para crear carpetas del proyecto llamando a la API local
export const crearCarpetasProyecto = async (resumen: any): Promise<any> => {
  const url = ACREDITACION_PROXY_ENDPOINTS.carpetasCrear;
  
  console.log('[carpetas] Llamando a API para crear carpetas del proyecto...');
  console.log('   URL:', url);
  console.log('   Payload:', JSON.stringify(resumen, null, 2));
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resumen),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('[carpetas] Carpetas creadas exitosamente:', data);
    return data;
  } catch (error: any) {
    console.error('[carpetas] Error llamando a API de carpetas:', error);
    const wrappedError = new Error(error?.message || 'Error llamando a API de carpetas');
    Object.assign(wrappedError, {
      isExternalSyncError: true,
      syncOperation: 'crear_carpetas_proyecto',
      endpoint: url,
      cause: error,
    });
    throw wrappedError;
  }
};

export interface SubirDocumentoAcreditacionPayload {
  documento_base64: string;
  nombre_documento: string;
  fecha_inicio: string;
  folder_id: string;
  nombre_persona: string;
  rut_persona: string;
  id_registro_sst: number;
}

// FunciÃ³n para subir documento a la API de acreditaciÃ³n (proxy local)
export const subirDocumentoAcreditacion = async (
  payload: SubirDocumentoAcreditacionPayload
): Promise<any> => {
  const url = ACREDITACION_PROXY_ENDPOINTS.documentosSubir;

  console.log('[documentos] Subiendo documento a API de acreditaciÃ³n...');
  console.log('   URL:', url);
  console.log('   Payload:', {
    ...payload,
    documento_base64: '[BASE64_DATA]',
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const contentType = response.headers.get('content-type');
    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}: ${responseText}`);
    }

    if (contentType?.includes('application/json')) {
      const data = JSON.parse(responseText);
      console.log('[documentos] Documento subido correctamente:', data);
      return data;
    }

    console.log('[documentos] Documento subido correctamente (texto):', responseText);
    return responseText;
  } catch (error: any) {
    console.error('[documentos] Error subiendo documento:', error);
    const wrappedError = new Error(error?.message || 'Error subiendo documento');
    Object.assign(wrappedError, {
      isExternalSyncError: true,
      syncOperation: 'subir_documento',
      endpoint: url,
      cause: error,
    });
    throw wrappedError;
  }
};



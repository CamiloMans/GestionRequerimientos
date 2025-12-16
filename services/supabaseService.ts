import { supabase } from '../config/supabase';
import { Persona, Requerimiento, PersonaRequerimientoSST, RequestItem, RequestStatus } from '../types';

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




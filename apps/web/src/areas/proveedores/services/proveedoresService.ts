import { supabase } from '@shared/api-client/supabase';

export interface ProveedorData {
  nombre_proveedor: string;
  rut?: string | null;
  razon_social?: string | null;
  correo_contacto?: string | null;
  tipo_proveedor?: string | null;
  evaluacion?: number | null;
  clasificacion?: string | null;
}

export interface ProveedorResponse {
  id: number;
  nombre_proveedor: string;
  rut?: string | null;
  razon_social?: string | null;
  correo_contacto?: string | null;
  tipo_proveedor?: string | null;
  evaluacion?: number | null;
  clasificacion?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Calcular la clasificación basada en el porcentaje de evaluación
 * Nueva lógica: convertir porcentaje a decimal (0-1) y aplicar umbrales
 * > 0.764 → A
 * 0.5 <= cumplimiento <= 0.764 → B
 * < 0.5 → C
 */
export const calcularClasificacion = (evaluacion: number | null | undefined): string | null => {
  if (evaluacion === null || evaluacion === undefined) {
    return null;
  }

  // Convertir porcentaje a decimal (0-1)
  const cumplimiento = evaluacion / 100;
  if (cumplimiento > 0.764) return 'A';
  if (cumplimiento >= 0.5 && cumplimiento <= 0.764) return 'B';
  return 'C';
};

/**
 * Obtener todos los proveedores
 */
export const fetchProveedores = async (): Promise<ProveedorResponse[]> => {
  const { data, error } = await supabase
    .from('proveedor')
    .select('*')
    .order('nombre_proveedor', { ascending: true });

  if (error) {
    console.error('Error fetching proveedores:', error);
    throw error;
  }

  return data || [];
};

/**
 * Crear un nuevo proveedor
 */
export const createProveedor = async (proveedorData: ProveedorData): Promise<ProveedorResponse> => {
  const { data, error } = await supabase
    .from('proveedor')
    .insert([proveedorData])
    .select()
    .single();

  if (error) {
    console.error('Error creating proveedor:', error);
    throw error;
  }

  return data;
};

/**
 * Actualizar un proveedor existente
 */
export const updateProveedor = async (
  id: number,
  proveedorData: Partial<ProveedorData>
): Promise<ProveedorResponse> => {
  const { data, error } = await supabase
    .from('proveedor')
    .update({
      ...proveedorData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating proveedor:', error);
    throw error;
  }

  return data;
};

/**
 * Obtener un proveedor por ID
 */
export const fetchProveedorById = async (id: number): Promise<ProveedorResponse | null> => {
  const { data, error } = await supabase
    .from('proveedor')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No se encontró el registro
      return null;
    }
    console.error('Error fetching proveedor:', error);
    throw error;
  }

  return data;
};

/**
 * Eliminar un proveedor
 */
export const deleteProveedor = async (id: number): Promise<void> => {
  const { error } = await supabase.from('proveedor').delete().eq('id', id);

  if (error) {
    console.error('Error deleting proveedor:', error);
    throw error;
  }
};

/**
 * Obtener todas las especialidades
 */
export const fetchEspecialidades = async (): Promise<{ id: number; nombre: string }[]> => {
  const { data, error } = await supabase
    .from('especialidad')
    .select('id, nombre_especialidad')
    .order('nombre_especialidad', { ascending: true });

  if (error) {
    console.error('Error fetching especialidades:', error);
    throw error;
  }

  // Mapear nombre_especialidad a nombre para mantener la interfaz consistente
  return (data || []).map((item) => ({
    id: item.id,
    nombre: item.nombre_especialidad,
  }));
};

/**
 * Obtener las especialidades de un proveedor desde brg_core_proveedor_especialidad
 */
export const fetchEspecialidadesByNombreProveedor = async (nombreProveedor: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('brg_core_proveedor_especialidad')
      .select('especialidad')
      .eq('nombre_proveedor', nombreProveedor);

    if (error) {
      // Si la tabla no existe, retornar array vacío
      if (error.code === '42P01') {
        console.warn('Tabla brg_core_proveedor_especialidad no existe aún');
        return [];
      }
      console.error('Error fetching especialidades del proveedor:', error);
      throw error;
    }

    // Extraer los valores únicos de especialidad
    const especialidades = (data || []).map((item) => item.especialidad).filter(Boolean);
    return [...new Set(especialidades)]; // Eliminar duplicados
  } catch (err: any) {
    // Si hay cualquier error, retornar array vacío
    console.warn('No se pudieron cargar las especialidades del proveedor:', err);
    return [];
  }
};

/**
 * Obtener las especialidades de un proveedor
 */
export const fetchEspecialidadesByProveedorId = async (proveedorId: number): Promise<number[]> => {
  try {
    const { data, error } = await supabase
      .from('proveedor_especialidad')
      .select('especialidad_id')
      .eq('proveedor_id', proveedorId);

    if (error) {
      // Si la tabla no existe, retornar array vacío
      if (error.code === '42P01') {
        console.warn('Tabla proveedor_especialidad no existe aún');
        return [];
      }
      console.error('Error fetching especialidades del proveedor:', error);
      throw error;
    }

    return (data || []).map((item) => item.especialidad_id);
  } catch (err: any) {
    // Si hay cualquier error (tabla no existe, etc.), retornar array vacío
    console.warn('No se pudieron cargar las especialidades del proveedor:', err);
    return [];
  }
};

/**
 * Guardar las especialidades de un proveedor
 * Elimina las relaciones existentes y crea las nuevas
 */
export const saveProveedorEspecialidades = async (
  proveedorId: number,
  especialidadIds: number[]
): Promise<void> => {
  try {
    // Eliminar todas las relaciones existentes
    const { error: deleteError } = await supabase
      .from('proveedor_especialidad')
      .delete()
      .eq('proveedor_id', proveedorId);

    if (deleteError && deleteError.code !== '42P01') {
      // Si el error no es "tabla no existe", lanzar el error
      console.error('Error eliminando especialidades del proveedor:', deleteError);
      throw deleteError;
    }

    // Si no hay especialidades para guardar, terminar aquí
    if (especialidadIds.length === 0) {
      return;
    }

    // Crear las nuevas relaciones
    const relaciones = especialidadIds.map((especialidadId) => ({
      proveedor_id: proveedorId,
      especialidad_id: especialidadId,
    }));

    const { error: insertError } = await supabase
      .from('proveedor_especialidad')
      .insert(relaciones);

    if (insertError) {
      // Si la tabla no existe, solo loguear un warning
      if (insertError.code === '42P01') {
        console.warn('Tabla proveedor_especialidad no existe aún. Las especialidades no se guardaron.');
        return;
      }
      console.error('Error guardando especialidades del proveedor:', insertError);
      throw insertError;
    }
  } catch (err: any) {
    // Si hay cualquier error, solo loguear un warning pero no fallar
    console.warn('No se pudieron guardar las especialidades del proveedor:', err);
  }
};

/**
 * Interfaz para los datos de evaluación de servicios
 */
export interface EvaluacionServiciosData {
  nombre_proveedor: string;
  especialidad?: string | null;
  actividad?: string | null;
  orden_compra?: string | null;
  codigo_proyecto?: string | null;
  nombre_proyecto?: string | null;
  jefe_proyecto?: string | null;
  gerente_proyecto?: string | null;
  fecha_evaluacion?: string | null;
  evaluador?: string | null;
  evaluacion_calidad?: string | null;
  evaluacion_disponibilidad?: string | null;
  evaluacion_fecha_entrega?: string | null;
  evaluacion_precio?: string | null;
  nota_total_ponderada?: number | null;
  categoria_proveedor?: string | null;
  observacion?: string | null;
  aplica_salida_terreno?: boolean;
  evaluacion_seguridad_terreno?: string | null;
  precio_servicio?: number | null;
  correo_contacto?: string | null;
  descripcion_servicio?: string | null;
  link_servicio_ejecutado?: string | null;
}

/**
 * Guardar una evaluación de servicios en fct_proveedores_evaluacion
 */
export const saveEvaluacionServicios = async (
  evaluacionData: EvaluacionServiciosData
): Promise<any> => {
  const { data, error } = await supabase
    .from('fct_proveedores_evaluacion')
    .insert([evaluacionData])
    .select()
    .single();

  if (error) {
    console.error('Error guardando evaluación de servicios:', error);
    throw error;
  }

  return data;
};


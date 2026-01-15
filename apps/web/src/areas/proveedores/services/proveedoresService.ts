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
 */
export const calcularClasificacion = (evaluacion: number | null | undefined): string | null => {
  if (evaluacion === null || evaluacion === undefined) {
    return null;
  }

  if (evaluacion >= 80) return 'A';
  if (evaluacion >= 60) return 'B';
  if (evaluacion >= 40) return 'C';
  return 'D';
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


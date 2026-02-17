/**
 * Tipos TypeScript para el módulo de Adendas
 */

import { TipoAdenda } from './constants';

export interface Adenda {
  id: number;
  tipo: TipoAdenda;
  codigo_myma?: string;
  nombre?: string;
  descripcion?: string;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
  estado?: string;
  // Agregar más campos según sea necesario
}

export interface NewAdendaPayload {
  tipo: TipoAdenda;
  codigo_myma?: string;
  nombre?: string;
  descripcion?: string;
  estado?: string;
}

export interface AdendaListItem {
  id: number;
  tipo: TipoAdenda;
  codigo_myma?: string;
  nombre?: string;
  estado?: string;
  fecha_creacion?: string;
  // Agregar más campos según sea necesario
}


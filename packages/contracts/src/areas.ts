/**
 * Tipos y constantes relacionados con áreas del sistema
 */

export enum AreaId {
  ACREDITACION = 'acreditacion',
  PROVEEDORES = 'proveedores',
  FINANZAS = 'finanzas',
  OPERACIONES = 'operaciones',
}

export interface Area {
  id: AreaId;
  name: string;
  displayName: string;
  icon: string;
  description?: string;
}

export const AREAS: Record<AreaId, Area> = {
  [AreaId.ACREDITACION]: {
    id: AreaId.ACREDITACION,
    name: 'acreditacion',
    displayName: 'Acreditaciones',
    icon: 'engineering',
    description: 'Gestión de acreditaciones y requerimientos',
  },
  [AreaId.FINANZAS]: {
    id: AreaId.FINANZAS,
    name: 'finanzas',
    displayName: 'Finanzas',
    icon: 'account_balance',
    description: 'Gestión financiera y contable',
  },
  [AreaId.PROVEEDORES]: {
    id: AreaId.PROVEEDORES,
    name: 'proveedores',
    displayName: 'Proveedores',
    icon: 'business_center',
    description: 'Gestión de proveedores y evaluación de servicios',
  },
  [AreaId.OPERACIONES]: {
    id: AreaId.OPERACIONES,
    name: 'operaciones',
    displayName: 'Operaciones',
    icon: 'settings',
    description: 'Gestión de operaciones',
  },
};

export type AreaPermission = string;

export interface UserAreaPermission {
  userId: string;
  areaId: AreaId;
  permissions: AreaPermission[];
}


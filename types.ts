export enum RequestStatus {
  Current = 'Vigente',
  InRenewal = 'En Renovación',
  Expiring = 'A vencer',
  Expired = 'Vencida',
}

export enum RequestCategory {
  Exams = 'Exámenes',
  Courses = 'Cursos',
  Driving = 'Conducción',
  Legal = 'Legal',
}

export enum RequirementType {
  AUD = 'AUD',
  CTT = 'C.TT',
  CCD = 'CCD',
  CEXT = 'C.EXT',
  EPP = 'EPP',
  X4X4 = '4X4',
}

// Tipos de Supabase
export interface Persona {
  id: number;
  rut: string;
  nombres: string;
  apellidos: string;
  nombre_completo: string;
  fecha_nacimiento: string;
  correo: string;
  telefono?: string;
  direccion?: string;
  obs_salud?: string;
  estado: string;
  gerencia_id: string;
  comuna_id: string;
  cargo_myma_id: string;
  especialidad_id: string;
  created_at: string;
  updated_at: string;
}

export interface Requerimiento {
  id: number;
  requerimiento: string;
  categoria_requerimiento: string;
  fe_inicio: string;
  fe_vencimiento: string;
  created_at: string;
  updated_at: string;
}

export interface PersonaRequerimientoSST {
  id: number;
  persona_id: number;
  requerimiento_id: number;
  rut?: string;
  nombre_completo?: string;
  dias_anticipacion?: number;
  requerimiento?: string;
  categoria_requerimiento?: string;
  fecha_vigencia?: string;
  fecha_vencimiento?: string;
  estado?: string;
  created_at: string;
}

// Tipo para el formulario de creación/edición
export interface RequestItem {
  id: string;
  name: string;
  rut: string;
  requirement: string;
  category: string;
  status: RequestStatus;
  adjudicationDate: string;
  expirationDate: string;
  persona_id?: number;
  requerimiento_id?: number;
}

export interface NewRequestPayload {
  persona_id: number;
  requerimiento_id: number;
  fecha_vigencia: string;
  fecha_vencimiento: string;
  estado?: RequestStatus;
}

// === Tipos para Solicitud de Terreno ===

export enum WorkerType {
  INTERNAL = 'Interno (MYMA)',
  EXTERNAL = 'Externo'
}

export interface Worker {
  id: string;
  name: string;
  type: WorkerType;
  phone?: string;
  company?: string;
}

export interface RequestFormData {
  requestDate: string;
  requesterName: string;
  kickoffDate: string;
  projectCode: string;
  requirement: string;
  clientName: string;
  clientContactName: string;
  clientContactEmail: string;
  projectManager: string;
  accreditationFollowUp: string;
  fieldStartDate: string;
  riskPreventionNotice: string;
  companyAccreditationRequired: string;
  contractName: string;
  contractNumber: string;
  contractAdmin: string;
  workersToAccreditCount: number | '';
}

export const REGIONS = [
  "Metropolitana",
  "Valparaíso",
  "Biobío",
  "Antofagasta",
  "Araucanía",
  "Los Lagos"
];

export const PROJECT_MANAGERS = [
  "Juan Pérez",
  "Maria González",
  "Carlos Ruiz",
  "Ana Silva"
];

export const MOCK_WORKERS_DB = [
  { name: "Ana Silva", phone: "+56 9 8765 4321" },
  { name: "Pedro Torres", phone: "+56 9 1234 5678" },
  { name: "Luisa Fernández", phone: "+56 9 1111 2222" },
  { name: "Roberto Díaz", phone: "+56 9 3333 4444" }
];

export const MOCK_COMPANIES = [
  { id: 'tech_mining', name: 'Tech Mining SpA' },
  { id: 'servicios_log', name: 'Servicios Logísticos del Norte' },
  { id: 'geo_consult', name: 'GeoConsulting Ltda.' }
];

export const MOCK_EXTERNAL_WORKERS_BY_COMPANY: Record<string, {name: string, phone: string}[]> = {
  'tech_mining': [
    { name: 'Jorge External', phone: '+56 9 9999 0001' },
    { name: 'Marta Drilling', phone: '+56 9 9999 0002' }
  ],
  'servicios_log': [
    { name: 'Pedro Chofer', phone: '+56 9 8888 0001' },
    { name: 'Lucas Carga', phone: '+56 9 8888 0002' }
  ],
  'geo_consult': [
    { name: 'Valentina Suelos', phone: '+56 9 7777 0001' }
  ]
};

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

export interface RequestItem {
  id: string;
  name: string;
  rut: string;
  requirement: RequirementType;
  category: RequestCategory;
  status: RequestStatus;
  adjudicationDate: string;
  expirationDate: string;
}

export interface NewRequestPayload {
  name: string;
  requirement: RequirementType;
  status: RequestStatus;
  adjudicationDate: string;
  expirationDate: string;
}
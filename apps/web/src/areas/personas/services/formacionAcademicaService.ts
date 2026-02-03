import { FormacionAcademica } from '../types';

/**
 * Obtener todas las formaciones académicas (datos dummy)
 */
export const fetchFormacionesAcademicas = async (): Promise<FormacionAcademica[]> => {
  // Simular delay de carga
  await new Promise(resolve => setTimeout(resolve, 500));

  // Datos dummy de formaciones académicas
  const dummyData: FormacionAcademica[] = [
    {
      id: 1,
      persona_id: 1,
      nombre_completo: "Carolina Pacheco Vega",
      nombre_estudio: "Postítulo en Contaminación Atmosférica",
      universidad_institucion: "Universidad de Chile",
      tipo: "Postitulo",
      ano: 2014,
      etiquetas: ["CONTAMINACIÓN", "EMISIONES", "CALIDAD DEL AIRE"],
    },
    {
      id: 2,
      persona_id: 1,
      nombre_completo: "Carolina Pacheco Vega",
      nombre_estudio: "Ingeniería Civil en Biotecnología",
      universidad_institucion: "Universidad de Chile",
      tipo: "Pregrado",
      ano: 2009,
      etiquetas: ["INGENIERÍA CIVIL", "BIOTECNOLOGÍA"],
    },
    {
      id: 3,
      persona_id: 5,
      nombre_completo: "Cristopher Marchant Sepúlveda",
      nombre_estudio: "Curso de modelación de inundaciones HEC-RAS",
      universidad_institucion: "Universidad de Concepción",
      tipo: "Curso",
      ano: 2017,
      etiquetas: ["HEC-RAS", "MODELACIÓN AMBIENTAL", "DESBORDE DE RÍOS"],
    },
    {
      id: 4,
      persona_id: 5,
      nombre_completo: "Cristopher Marchant Sepúlveda",
      nombre_estudio: "Diplomado en uso de drones para geoinformación",
      universidad_institucion: "Universidad de Santiago de Chile",
      tipo: "Diplomado",
      ano: 2018,
      etiquetas: ["GEOGRAFÍA", "SIG", "DRONES"],
    },
    {
      id: 5,
      persona_id: 5,
      nombre_completo: "Cristopher Marchant Sepúlveda",
      nombre_estudio: "Diplomado en Reducción de Riesgo de Desastres",
      universidad_institucion: "Pontificia Universidad Católica de Chile",
      tipo: "Diplomado",
      ano: 2016,
      etiquetas: ["GESTIÓN DE RIESGOS", "HIDROLOGÍA"],
    },
    {
      id: 6,
      persona_id: 1,
      nombre_completo: "Carolina Pacheco Vega",
      nombre_estudio: "Postítulo en Derecho Ambiental",
      universidad_institucion: "Universidad de Chile",
      tipo: "Postitulo",
      ano: 2018,
      etiquetas: ["DERECHO AMBIENTAL"],
    },
    {
      id: 7,
      persona_id: 5,
      nombre_completo: "Cristopher Marchant Sepúlveda",
      nombre_estudio: "Ingeniería Civil en Geografía",
      universidad_institucion: "Universidad de Santiago de Chile",
      tipo: "Pregrado",
      ano: 2011,
      etiquetas: ["Geografía", "Planificación Territorial", "Calidad del Aire"],
    },
    {
      id: 8,
      persona_id: 5,
      nombre_completo: "Cristopher Marchant Sepúlveda",
      nombre_estudio: "Curso de modelación atmosférica WRF (Geacore)",
      universidad_institucion: "Universidad de Concepción",
      tipo: "Curso",
      ano: 2022,
      etiquetas: ["Modelación Atmosférica", "Modelación Climática"],
    },
    {
      id: 9,
      persona_id: 2,
      nombre_completo: "Ángel Galaz",
      nombre_estudio: "Ingeniería Comercial",
      universidad_institucion: "Universidad de Chile",
      tipo: "Pregrado",
      ano: 1985,
      etiquetas: ["Administración", "Finanzas", "Gestión"],
    },
    {
      id: 10,
      persona_id: 3,
      nombre_completo: "Christian Peralta",
      nombre_estudio: "Ingeniería en Construcción",
      universidad_institucion: "Universidad de Chile",
      tipo: "Pregrado",
      ano: 1995,
      etiquetas: ["Construcción", "Ingeniería", "Proyectos"],
    },
    {
      id: 11,
      persona_id: 4,
      nombre_completo: "Sebastián Galaz",
      nombre_estudio: "Ingeniería Civil Industrial",
      universidad_institucion: "Universidad de Chile",
      tipo: "Pregrado",
      ano: 1998,
      etiquetas: ["Ingeniería Industrial", "Gestión", "Operaciones"],
    },
    {
      id: 12,
      persona_id: 6,
      nombre_completo: "Luis Ayala",
      nombre_estudio: "Ingeniería Civil Industrial",
      universidad_institucion: "Universidad de Chile",
      tipo: "Pregrado",
      ano: 2015,
      etiquetas: ["Ingeniería Industrial", "Negocios", "Comercial"],
    },
  ];

  return dummyData;
};

/**
 * Buscar formaciones académicas por término de búsqueda
 */
export const searchFormacionesAcademicas = async (
  searchTerm: string
): Promise<FormacionAcademica[]> => {
  const allFormaciones = await fetchFormacionesAcademicas();
  
  const term = searchTerm.toLowerCase().trim();
  if (!term) {
    return allFormaciones;
  }

  // Filtrar por término de búsqueda
  return allFormaciones.filter(form => {
    const nombreMatch = form.nombre_completo?.toLowerCase().includes(term);
    const estudioMatch = form.nombre_estudio?.toLowerCase().includes(term);
    const institucionMatch = form.universidad_institucion?.toLowerCase().includes(term);
    const etiquetasMatch = form.etiquetas?.some(etq => etq.toLowerCase().includes(term));
    return nombreMatch || estudioMatch || institucionMatch || etiquetasMatch;
  });
};


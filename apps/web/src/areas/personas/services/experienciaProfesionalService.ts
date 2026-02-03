import { ExperienciaProfesional } from '../types';

/**
 * Obtener todas las experiencias profesionales (datos dummy)
 */
export const fetchExperienciasProfesionales = async (): Promise<ExperienciaProfesional[]> => {
  // Simular delay de carga
  await new Promise(resolve => setTimeout(resolve, 500));

  // Datos dummy de experiencias profesionales
  const dummyData: ExperienciaProfesional[] = [
    {
      id: 1,
      persona_id: 1,
      nombre_completo: "Carolina Pacheco Vega",
      empresa: "Clarke, Modet & C°",
      cargo: "Encargada de Calidad",
      ano_inicio: 2011,
      ano_termino: 2012,
      ano_termino_display: "2012",
      funciones: "Gestión y aseguramiento de calidad en procesos internos.",
      aptitudes: ["Gestión ambiental"],
    },
    {
      id: 2,
      persona_id: 1,
      nombre_completo: "Carolina Pacheco Vega",
      empresa: "CONAMA",
      cargo: "Profesional del Departamento de Control de la Contaminación",
      ano_inicio: 2009,
      ano_termino: 2010,
      ano_termino_display: "2010",
      funciones: "Apoyo técnico en control de la contaminación en la ex CONAMA.",
      aptitudes: ["Servicio público", "Regulación ambiental"],
    },
    {
      id: 3,
      persona_id: 5,
      nombre_completo: "Cristopher Marchant Sepúlveda",
      empresa: "MYMA",
      cargo: "Gerente de Especialidades e Innovación",
      ano_inicio: 2024,
      ano_termino: null,
      ano_termino_display: "ACTUAL",
      funciones: "Implementación y liderazgo de la gerencia de especialistas ambientales. Coordinación de caracterizaciones ambientales por componente y evaluación de impactos. Impulso de proyectos de innovación y geomática para productividad y eficiencia.",
      aptitudes: ["Gestión ambiental", "Liderazgo", "Innovación", "Gestión de proyectos mineros", "Representación sectorial"],
    },
    {
      id: 4,
      persona_id: 1,
      nombre_completo: "Carolina Pacheco Vega",
      empresa: "Jaime Illanes y Asociados Consultores S.A.",
      cargo: "Jefe de Proyectos",
      ano_inicio: 2018,
      ano_termino: 2021,
      ano_termino_display: "2021",
      funciones: "Coordinación de DIA, Consultas de Pertinencia, Auditorías, Prefactibilidades Ambientales y Planes de Cumplimiento ante procesos de la SMA.",
      aptitudes: ["Gestión ambiental", "Permisos ambientales", "Regulación ambiental", "Gestión de proyectos mineros", "Auditorías"],
    },
    {
      id: 5,
      persona_id: 5,
      nombre_completo: "Cristopher Marchant Sepúlveda",
      empresa: "Algoritmos (ALS)",
      cargo: "Ingeniero de Proyectos",
      ano_inicio: 2012,
      ano_termino: 2012,
      ano_termino_display: "2012",
      funciones: "Estudios de calidad del aire, meteorología, inventario de emisiones y modelación atmosférica.",
      aptitudes: ["Gestión ambiental", "Regulación ambiental"],
    },
    {
      id: 6,
      persona_id: 5,
      nombre_completo: "Cristopher Marchant Sepúlveda",
      empresa: "Codelco - RT",
      cargo: "Memorista Dirección de Medio Ambiente y Territorio",
      ano_inicio: 2012,
      ano_termino: 2013,
      ano_termino_display: "2013",
      funciones: "Trabajo de título: instrumento de planificación y gestión territorial minera (Div. Radomiro Tomic). Cartografía de riesgos, imágenes satelitales, servidor de mapas web y apoyo en gestión de calidad del aire.",
      aptitudes: ["Gestión ambiental", "Gestión minera", "Innovación"],
    },
    {
      id: 7,
      persona_id: 1,
      nombre_completo: "Carolina Pacheco Vega",
      empresa: "MYMA",
      cargo: "Gerente de Proyectos",
      ano_inicio: 2021,
      ano_termino: null,
      ano_termino_display: "ACTUAL",
      funciones: "Liderazgo de equipos multidisciplinarios en la ejecución de estudios de impacto ambiental y declaraciones de impacto ambiental para proyectos mineros e industriales.",
      aptitudes: ["Gestión ambiental", "Liderazgo", "Permisos ambientales", "Gestión de proyectos mineros"],
    },
    {
      id: 8,
      persona_id: 2,
      nombre_completo: "Ángel Galaz",
      empresa: "MYMA",
      cargo: "Gerente",
      ano_inicio: 2015,
      ano_termino: null,
      ano_termino_display: "ACTUAL",
      funciones: "Gestión administrativa, financiera y de recursos humanos de la organización.",
      aptitudes: ["Gestión administrativa", "Finanzas", "Recursos humanos"],
    },
    {
      id: 9,
      persona_id: 3,
      nombre_completo: "Christian Peralta",
      empresa: "MYMA",
      cargo: "Gerente",
      ano_inicio: 2016,
      ano_termino: null,
      ano_termino_display: "ACTUAL",
      funciones: "Dirección técnica de proyectos ambientales y coordinación de equipos especializados.",
      aptitudes: ["Gestión técnica", "Liderazgo", "Gestión ambiental"],
    },
    {
      id: 10,
      persona_id: 4,
      nombre_completo: "Sebastián Galaz",
      empresa: "MYMA",
      cargo: "Gerente",
      ano_inicio: 2017,
      ano_termino: null,
      ano_termino_display: "ACTUAL",
      funciones: "Coordinación de operaciones y gestión de proyectos en terreno.",
      aptitudes: ["Gestión de operaciones", "Liderazgo", "Proyectos en terreno"],
    },
    {
      id: 11,
      persona_id: 6,
      nombre_completo: "Luis Ayala",
      empresa: "MYMA",
      cargo: "Gerente",
      ano_inicio: 2019,
      ano_termino: null,
      ano_termino_display: "ACTUAL",
      funciones: "Desarrollo de negocios y relaciones con clientes en el sector minero e industrial.",
      aptitudes: ["Desarrollo de negocios", "Relaciones comerciales", "Sector minero"],
    },
  ];

  return dummyData;
};

/**
 * Buscar experiencias profesionales por término de búsqueda
 */
export const searchExperienciasProfesionales = async (
  searchTerm: string
): Promise<ExperienciaProfesional[]> => {
  const allExperiencias = await fetchExperienciasProfesionales();
  
  const term = searchTerm.toLowerCase().trim();
  if (!term) {
    return allExperiencias;
  }

  // Filtrar por término de búsqueda
  return allExperiencias.filter(exp => {
    const nombreMatch = exp.nombre_completo?.toLowerCase().includes(term);
    const empresaMatch = exp.empresa?.toLowerCase().includes(term);
    const cargoMatch = exp.cargo?.toLowerCase().includes(term);
    const funcionesMatch = exp.funciones?.toLowerCase().includes(term);
    const aptitudesMatch = exp.aptitudes?.some(apt => apt.toLowerCase().includes(term));
    return nombreMatch || empresaMatch || cargoMatch || funcionesMatch || aptitudesMatch;
  });
};


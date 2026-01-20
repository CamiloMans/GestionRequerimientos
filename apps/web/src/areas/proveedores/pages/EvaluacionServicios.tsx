import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaId } from '@contracts/areas';
import { fetchProveedores, ProveedorResponse, saveEvaluacionServicios, EvaluacionServiciosData, sendEvaluacionProveedorToN8n } from '../services/proveedoresService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface CriterioEvaluacion {
  id: string;
  nombre: string;
  peso: number;
  valor: 'ALTO' | 'MEDIO' | 'BAJO' | 'MUY_BAJO' | 'A' | 'B' | 'C' | null;
}

interface EvaluacionData {
  proveedorId: string;
  nombreContacto: string;
  correoContacto: string;
  ordenServicio: string;
  fechaEvaluacion: string;
  precioServicio: number;
  evaluadorResponsable: string;
  descripcionServicio: string;
  linkServicioEjecutado: string;
  vaTerreno: boolean;
  criterios: CriterioEvaluacion[];
  observaciones: string;
}

const EvaluacionServicios: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingProveedores, setLoadingProveedores] = useState(true);
  const [proveedores, setProveedores] = useState<ProveedorResponse[]>([]);
  const [formData, setFormData] = useState<EvaluacionData>({
    proveedorId: '',
    nombreContacto: '',
    correoContacto: '',
    ordenServicio: '',
    fechaEvaluacion: '',
    precioServicio: 0,
    evaluadorResponsable: '',
    descripcionServicio: '',
    linkServicioEjecutado: '',
    vaTerreno: false,
    criterios: [
      { id: 'calidad', nombre: 'Calidad', peso: 52.2, valor: null },
      { id: 'disponibilidad', nombre: 'Disposición operativa y colaboración', peso: 18.2, valor: null },
      { id: 'cumplimiento', nombre: 'Cumplimiento fecha de entrega', peso: 13.7, valor: null },
      { id: 'precio', nombre: 'Precio respecto de la competencia', peso: 15.9, valor: null },
    ],
    observaciones: '',
  });

  const getAreaPath = (path: string) => {
    return `/app/area/${AreaId.PROVEEDORES}/${path}`;
  };

  // Cargar proveedores
  useEffect(() => {
    const loadProveedores = async () => {
      try {
        setLoadingProveedores(true);
        const data = await fetchProveedores();
        setProveedores(data);
      } catch (err) {
        console.error('Error al cargar proveedores:', err);
      } finally {
        setLoadingProveedores(false);
      }
    };

    loadProveedores();
  }, []);

  // Calcular evaluación total usando la nueva fórmula (excluyendo criterio terreno que no tiene peso)
  const evaluacionTotal = useMemo(() => {
    // Pesos por criterio (constantes de la fórmula)
    const pesos: Record<string, number> = {
      calidad: 0.522,
      disponibilidad: 0.182,
      cumplimiento: 0.137,
      precio: 0.159,
    };

    // Valores por opción según criterio (tabla entregada)
    const valoresPorCriterio: Record<
      string,
      { ALTO: number; MEDIO: number; BAJO: number; MUY_BAJO: number }
    > = {
      calidad: {
        ALTO: 0.521, // Sobresaliente
        MEDIO: 0.297, // Buena
        BAJO: 0.144, // Regular
        MUY_BAJO: 0.038, // Deficiente
      },
      disponibilidad: {
        ALTO: 0.544, // Alta
        MEDIO: 0.311, // Buena
        BAJO: 0.097, // Mediana
        MUY_BAJO: 0.048, // Nula
      },
      cumplimiento: {
        ALTO: 0.533, // Entrega por adelantado
        MEDIO: 0.315, // Cumplen la fecha
        BAJO: 0.092, // Se retrasa ocasionalmente
        MUY_BAJO: 0.04, // Generalmente se retrasa
      },
      precio: {
        ALTO: 0.651, // Muy buen precio
        MEDIO: 0.206, // Precio de mercado
        BAJO: 0.096, // Costo elevado
        MUY_BAJO: 0.048, // Costo muy elevado
      },
    };

    const denominador = 0.5475;

    let numerador = 0;
    let tieneAlMenosUnCriterio = false;

    formData.criterios.forEach((criterio) => {
      // Excluir criterio terreno del cálculo
      if (criterio.id === 'terreno') return;

      const peso = pesos[criterio.id];
      const valores = valoresPorCriterio[criterio.id];

      if (!peso || !valores || !criterio.valor) return;

      const valorOpcion = valores[criterio.valor as keyof typeof valores];
      if (typeof valorOpcion !== 'number') return;

      numerador += valorOpcion * peso;
      tieneAlMenosUnCriterio = true;
    });

    if (!tieneAlMenosUnCriterio || denominador === 0) return null;

    // Resultado en rango 0-1 -> convertir a porcentaje 0-100
    const resultado = numerador / denominador;
    return Math.round(resultado * 100);
  }, [formData.criterios]);


  // Calcular clasificación basada en criterios normales
  // Nueva lógica: convertir porcentaje a decimal (0-1) y aplicar umbrales
  const clasificacionCriterios = useMemo(() => {
    if (evaluacionTotal === null) return null;
    // Convertir porcentaje a decimal (0-1)
    const cumplimiento = evaluacionTotal / 100;
    if (cumplimiento > 0.764) return 'A';
    if (cumplimiento >= 0.5 && cumplimiento <= 0.764) return 'B';
    return 'C';
  }, [evaluacionTotal]);

  // Obtener valor de terreno si existe
  const valorTerreno = useMemo(() => {
    const criterioTerreno = formData.criterios.find(c => c.id === 'terreno');
    if (criterioTerreno && criterioTerreno.valor && 
        (criterioTerreno.valor === 'A' || criterioTerreno.valor === 'B' || criterioTerreno.valor === 'C')) {
      return criterioTerreno.valor;
    }
    return null;
  }, [formData.criterios]);

  // Calcular clasificación final considerando terreno
  const clasificacion = useMemo(() => {
    if (!clasificacionCriterios) return null;

    // Si no hay valor de terreno, usar la clasificación de criterios
    if (!valorTerreno) return clasificacionCriterios;

    // Mapear clasificaciones a valores numéricos para comparar (mayor = mejor)
    const valorClasificacion: Record<string, number> = {
      'A': 3,
      'B': 2,
      'C': 1,
    };

    const valorCriterios = valorClasificacion[clasificacionCriterios] || 0;
    const valorTerrenoNum = valorClasificacion[valorTerreno] || 0;

    // Si terreno es inferior (menor valor numérico), usar terreno
    // Si terreno es igual o superior, usar criterios
    if (valorTerrenoNum < valorCriterios) {
      return valorTerreno;
    } else {
      return clasificacionCriterios;
    }
  }, [clasificacionCriterios, valorTerreno]);

  // Obtener estatus final
  const estatusFinal = useMemo(() => {
    if (!clasificacion) return null;
    if (clasificacion === 'A') return 'Habilitado para contratación inmediata.';
    if (clasificacion === 'B') return 'Habilitado con plan de mejora obligatorio.';
    return 'INHABILITADO PARA CONTRATACIÓN.';
  }, [clasificacion]);

  // Función para formatear número con puntos cada 3 dígitos
  const formatNumberWithDots = (value: number | string): string => {
    if (!value && value !== 0) return '';
    const num = typeof value === 'number' ? value : parseFloat(value.toString().replace(/\./g, ''));
    if (isNaN(num)) return '';
    
    // Convertir a string y separar parte entera y decimal
    const numStr = num.toString();
    const parts = numStr.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1] || '';
    
    // Formatear parte entera con puntos cada 3 dígitos
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    // Combinar con decimal si existe
    return decimalPart ? `${formattedInteger}.${decimalPart}` : formattedInteger;
  };

  // Función para convertir valor formateado a número
  const parseFormattedNumber = (value: string): number => {
    if (!value) return 0;
    // Remover todos los puntos (separadores de miles) y mantener solo el último punto como decimal si existe
    // Primero, contar cuántos puntos hay
    const dotCount = (value.match(/\./g) || []).length;
    let cleaned = value;
    
    if (dotCount > 1) {
      // Si hay múltiples puntos, el último es el decimal
      const lastDotIndex = value.lastIndexOf('.');
      cleaned = value.substring(0, lastDotIndex).replace(/\./g, '') + value.substring(lastDotIndex);
    } else if (dotCount === 1) {
      // Si hay un solo punto, verificar si es decimal o separador de miles
      const dotIndex = value.indexOf('.');
      const afterDot = value.substring(dotIndex + 1);
      // Si después del punto hay más de 2 dígitos, es separador de miles
      if (afterDot.length > 2) {
        cleaned = value.replace(/\./g, '');
      } else {
        // Es decimal, remover solo los puntos antes del decimal
        cleaned = value.substring(0, dotIndex).replace(/\./g, '') + '.' + afterDot;
      }
    } else {
      // No hay puntos, solo remover comas si las hay
      cleaned = value.replace(/,/g, '');
    }
    
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    // Si se cambia el proveedor, actualizar automáticamente los campos de contacto
    if (name === 'proveedorId') {
      const proveedorSeleccionado = proveedores.find((p) => p.id.toString() === value);
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        nombreContacto: proveedorSeleccionado?.nombre_proveedor || '',
        correoContacto: proveedorSeleccionado?.correo_contacto || '',
      }));
    } else if (name === 'vaTerreno') {
      // Si se marca "va a terreno", agregar el criterio de terreno y ajustar pesos
      // Si se desmarca, remover el criterio de terreno y restaurar pesos
      setFormData((prev) => {
        const criteriosBase = prev.criterios.filter((c) => c.id !== 'terreno');
        const pesosOriginales: Record<string, number> = {
          calidad: 52.2,
          disponibilidad: 18.2,
          cumplimiento: 13.7,
          precio: 15.9,
        };
        
        if (checked) {
          // Agregar criterio de terreno sin peso (no afecta el cálculo total)
          return {
            ...prev,
            vaTerreno: checked,
            criterios: [
              ...criteriosBase,
              { id: 'terreno', nombre: 'Terreno', peso: 0, valor: null },
            ],
          };
        } else {
          // Remover criterio de terreno y restaurar pesos originales
          return {
            ...prev,
            vaTerreno: checked,
            criterios: criteriosBase.map((c) => ({
              ...c,
              peso: pesosOriginales[c.id] || c.peso,
            })),
          };
        }
      });
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
  };

  // Handler específico para el campo de precio
  const handlePrecioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Permitir solo números y puntos
    const cleaned = value.replace(/[^\d.]/g, '');
    // Convertir a número y guardar
    const numValue = parseFormattedNumber(cleaned);
    setFormData((prev) => ({
      ...prev,
      precioServicio: numValue,
    }));
  };

  const handleCriterioChange = (criterioId: string, valor: 'ALTO' | 'MEDIO' | 'BAJO' | 'MUY_BAJO' | 'A' | 'B' | 'C') => {
    setFormData((prev) => ({
      ...prev,
      criterios: prev.criterios.map((c) => (c.id === criterioId ? { ...c, valor } : c)),
    }));
  };

  // Función helper para obtener el texto de la evaluación según el criterio y valor
  const getTextoEvaluacion = (criterioId: string, valor: string | null): string | null => {
    if (!valor) return null;
    
    const opciones = getCriterioOpciones(criterioId);
    
    // Si es terreno, devolver directamente A, B o C
    if (criterioId === 'terreno') {
      return valor;
    }
    
    // Para otros criterios, mapear ALTO/MEDIO/BAJO/MUY_BAJO a texto
    if (valor === 'ALTO' || valor === 'MEDIO' || valor === 'BAJO' || valor === 'MUY_BAJO') {
      return opciones[valor] || null;
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validar que se haya seleccionado un proveedor
      if (!formData.proveedorId) {
        alert('Por favor selecciona un proveedor');
        setLoading(false);
        return;
      }

      // Obtener el proveedor seleccionado
      const proveedorSeleccionado = proveedores.find(
        (p) => p.id.toString() === formData.proveedorId
      );

      if (!proveedorSeleccionado) {
        alert('Proveedor no encontrado');
        setLoading(false);
        return;
      }

      // Obtener los valores de los criterios
      const criterioCalidad = formData.criterios.find((c) => c.id === 'calidad');
      const criterioDisponibilidad = formData.criterios.find((c) => c.id === 'disponibilidad');
      const criterioCumplimiento = formData.criterios.find((c) => c.id === 'cumplimiento');
      const criterioPrecio = formData.criterios.find((c) => c.id === 'precio');
      const criterioTerreno = formData.criterios.find((c) => c.id === 'terreno');

      // Preparar los datos para guardar
      const evaluacionData: EvaluacionServiciosData = {
        nombre_proveedor: proveedorSeleccionado.nombre_proveedor,
        especialidad: null, // Se puede agregar si se tiene en el formulario
        actividad: null, // Se puede agregar si se tiene en el formulario
        orden_compra: formData.ordenServicio || null,
        codigo_proyecto: null, // Se puede agregar si se tiene en el formulario
        nombre_proyecto: null, // Se puede agregar si se tiene en el formulario
        jefe_proyecto: null, // Se puede agregar si se tiene en el formulario
        gerente_proyecto: null, // Se puede agregar si se tiene en el formulario
        fecha_evaluacion: formData.fechaEvaluacion || null,
        evaluador: formData.evaluadorResponsable || null,
        evaluacion_calidad: getTextoEvaluacion('calidad', criterioCalidad?.valor || null),
        evaluacion_disponibilidad: getTextoEvaluacion('disponibilidad', criterioDisponibilidad?.valor || null),
        evaluacion_fecha_entrega: getTextoEvaluacion('cumplimiento', criterioCumplimiento?.valor || null),
        evaluacion_precio: getTextoEvaluacion('precio', criterioPrecio?.valor || null),
        nota_total_ponderada: evaluacionTotal !== null ? parseFloat((evaluacionTotal / 100).toFixed(2)) : null,
        categoria_proveedor: clasificacion || null,
        observacion: formData.observaciones || null,
        aplica_salida_terreno: formData.vaTerreno,
        evaluacion_seguridad_terreno: criterioTerreno?.valor === 'A' || criterioTerreno?.valor === 'B' || criterioTerreno?.valor === 'C' 
          ? criterioTerreno.valor 
          : null,
        precio_servicio: formData.precioServicio > 0 ? formData.precioServicio : null,
        correo_contacto: formData.correoContacto || null,
        descripcion_servicio: formData.descripcionServicio || null,
        link_servicio_ejecutado: formData.linkServicioEjecutado || null,
      };

      // Guardar en Supabase
      const evaluacionGuardada = await saveEvaluacionServicios(evaluacionData);
      
      // Enviar evaluación a n8n a través de edge function
      try {
        console.log('📤 Enviando evaluación a n8n...');
        await sendEvaluacionProveedorToN8n({
          tipo: 'evaluacion_proveedor',
          fecha_envio: new Date().toISOString(),
          evaluacion: evaluacionData,
          evaluacion_id: evaluacionGuardada?.id || null,
        });
        console.log('✅ Evaluación enviada a n8n exitosamente');
      } catch (errorN8n: any) {
        console.error('⚠️ Error al enviar evaluación a n8n (pero se guardó en BD):', errorN8n);
        // No fallar el guardado si falla el envío a n8n
      }
      
      // Mostrar mensaje de éxito
      alert('Evaluación guardada exitosamente');
      
      // Opcional: limpiar el formulario o redirigir
      // navigate(getAreaPath('proveedores'));
    } catch (err: any) {
      console.error('Error al guardar evaluación:', err);
      alert(`Error al guardar la evaluación: ${err.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const getCriterioOpciones = (criterioId: string) => {
    const opciones: Record<string, { ALTO: string; MEDIO: string; BAJO: string; MUY_BAJO: string }> = {
      calidad: {
        ALTO: 'Sobresaliente',
        MEDIO: 'Buena',
        BAJO: 'Regular',
        MUY_BAJO: 'Deficiente',
      },
      disponibilidad: {
        ALTO: 'Alta',
        MEDIO: 'Buena',
        BAJO: 'Mediana',
        MUY_BAJO: 'Nula',
      },
      cumplimiento: {
        ALTO: 'Entrega por adelantado',
        MEDIO: 'Cumplen la fecha',
        BAJO: 'Se retrasa ocasionalmente',
        MUY_BAJO: 'Generalmente se retrasa',
      },
      precio: {
        ALTO: 'Muy buen precio',
        MEDIO: 'Precio de mercado',
        BAJO: 'Costo elevado',
        MUY_BAJO: 'Costo muy elevado',
      },
      terreno: {
        ALTO: 'A',
        MEDIO: 'B',
        BAJO: 'C',
        MUY_BAJO: 'C',
      },
    };
    return opciones[criterioId] || opciones.calidad;
  };

  // Descripciones detalladas por criterio y nivel (para tooltip de info)
  const getDescripcionOpcion = (
    criterioId: string,
    nivel: 'ALTO' | 'MEDIO' | 'BAJO' | 'MUY_BAJO'
  ): string | null => {
    const descripciones: Record<
      string,
      { ALTO: string; MEDIO: string; BAJO: string; MUY_BAJO: string }
    > = {
      calidad: {
        ALTO:
          'Cumple íntegramente los requisitos de calidad y evidencia un desempeño superior y consistente, sin observaciones.',
        MEDIO:
          'Cumple los requisitos de calidad, presentando observaciones menores que no afectan el resultado del servicio.',
        BAJO:
          'Cumple parcialmente los requisitos de calidad; presenta deficiencias que afectan el resultado y requieren corrección.',
        MUY_BAJO:
          'No cumple los requisitos de calidad; el servicio es técnicamente inaceptable.',
      },
      disponibilidad: {
        ALTO:
          'Presenta alta disponibilidad para reuniones y coordinación. Responde de forma oportuna y consistente a los requerimientos, e implementa las modificaciones solicitadas de manera eficiente, sin reprocesos ni dilaciones.',
        MEDIO:
          'Mantiene una disponibilidad adecuada para la coordinación. Responde a los requerimientos y ejecuta las modificaciones con retrasos menores, sin afectar significativamente el desarrollo del servicio.',
        BAJO:
          'Evidencia una disponibilidad irregular, con respuestas tardías o necesidad de reiteraciones. Las modificaciones se implementan de forma parcial o con demoras que afectan la eficiencia del servicio.',
        MUY_BAJO:
          'No presenta disponibilidad para la coordinación. Existe falta de respuesta o resistencia sistemática a las modificaciones solicitadas, lo que impide una gestión adecuada del servicio y compromete su cumplimiento.',
      },
      cumplimiento: {
        ALTO:
          'Realiza la entrega antes de la fecha comprometida, sin afectar la calidad ni generar reprocesos.',
        MEDIO:
          'Realiza la entrega en la fecha comprometida o con una desviación marginal que, en términos proporcionales, no tiene impacto en la planificación del proyecto.',
        BAJO:
          'Entrega con un retraso proporcionalmente menor respecto del plazo total del servicio, sin comprometer hitos críticos ni generar impactos relevantes en la ejecución del proyecto.',
        MUY_BAJO:
          'Entrega con un retraso proporcionalmente significativo respecto del plazo total del servicio, afectando hitos críticos, la coordinación, los costos o la continuidad del proyecto.',
      },
      precio: {
        ALTO:
          'Presenta un precio significativamente inferior al promedio de mercado para servicios equivalentes, manteniendo los estándares técnicos y de calidad exigidos.',
        MEDIO:
          'Presenta un precio alineado con los valores habituales de mercado para servicios equivalentes, considerando alcance, complejidad y nivel técnico comparable.',
        BAJO:
          'Presenta un precio superior al promedio de mercado, cuya diferencia requiere una justificación técnica o económica específica, como mayor alcance, especialización, plazos o riesgos asumidos.',
        MUY_BAJO:
          'Presenta un precio sustancialmente superior al mercado, sin justificación técnica suficiente, lo que lo vuelve económicamente desventajoso frente a alternativas disponibles.',
      },
    };

    return descripciones[criterioId]?.[nivel] ?? null;
  };

  // Función helper para obtener el valor numérico de una opción
  const getValorOpcion = (criterioId: string, nivel: 'ALTO' | 'MEDIO' | 'BAJO' | 'MUY_BAJO'): number | null => {
    const valoresPorCriterio: Record<
      string,
      { ALTO: number; MEDIO: number; BAJO: number; MUY_BAJO: number }
    > = {
      calidad: {
        ALTO: 0.521,
        MEDIO: 0.297,
        BAJO: 0.144,
        MUY_BAJO: 0.038,
      },
      disponibilidad: {
        ALTO: 0.544,
        MEDIO: 0.311,
        BAJO: 0.097,
        MUY_BAJO: 0.048,
      },
      cumplimiento: {
        ALTO: 0.533,
        MEDIO: 0.315,
        BAJO: 0.092,
        MUY_BAJO: 0.04,
      },
      precio: {
        ALTO: 0.651,
        MEDIO: 0.206,
        BAJO: 0.096,
        MUY_BAJO: 0.048,
      },
    };
    return valoresPorCriterio[criterioId]?.[nivel] ?? null;
  };

  // Función para calcular el valor de la multiplicación (peso criterio × valor opción)
  const getValorMultiplicacion = (criterioId: string, valor: string | null): number | null => {
    if (!valor || criterioId === 'terreno') return null;
    
    const pesos: Record<string, number> = {
      calidad: 0.522,
      disponibilidad: 0.182,
      cumplimiento: 0.137,
      precio: 0.159,
    };

    const pesoCriterio = pesos[criterioId];
    if (!pesoCriterio) return null;

    const valorOpcion = getValorOpcion(criterioId, valor as 'ALTO' | 'MEDIO' | 'BAJO' | 'MUY_BAJO');
    if (valorOpcion === null) return null;

    return pesoCriterio * valorOpcion;
  };

  // Detalle de cómo se calcula la evaluación total (para mostrar la fórmula con números)
  const detalleCalculoEvaluacion = useMemo(() => {
    if (!formData.criterios || formData.criterios.length === 0) return null;

    const pesos: Record<string, number> = {
      calidad: 0.522,
      disponibilidad: 0.182,
      cumplimiento: 0.137,
      precio: 0.159,
    };

    const denominador = 0.5475;

    const terminos: string[] = [];
    let numerador = 0;

    formData.criterios.forEach((criterio) => {
      if (criterio.id === 'terreno') return;
      if (!criterio.valor) return;

      const peso = pesos[criterio.id];
      if (!peso) return;

      const valorOpcion = getValorOpcion(
        criterio.id,
        criterio.valor as 'ALTO' | 'MEDIO' | 'BAJO' | 'MUY_BAJO'
      );
      if (valorOpcion === null) return;

      numerador += peso * valorOpcion;
      terminos.push(`${valorOpcion.toFixed(3)} × ${peso.toFixed(3)}`);
    });

    if (terminos.length === 0) return null;

    const resultadoFraccion = numerador / denominador;
    const porcentaje = resultadoFraccion * 100;

    return {
      formula: `(( ${terminos.join(' + ')} ) / ${denominador.toFixed(4)}) × 100`,
      numerador: numerador.toFixed(4),
      fraccion: resultadoFraccion.toFixed(4),
      porcentaje: Math.round(porcentaje),
    };
  }, [formData.criterios]);

  const getClasificacionColor = (clasif: string | null) => {
    if (!clasif) return 'bg-gray-100 text-gray-700 border-gray-300';
    switch (clasif) {
      case 'A':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'B':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'C':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleExport = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });

    // ====== BRAND TOKENS (ajusta a tu paleta MyMA) ======
    const BRAND = {
      bgHeader: [17, 19, 24] as [number, number, number],     // #111318
      cardBg: [240, 253, 244] as [number, number, number],    // Verde claro transparente (similar al azul anterior)
      border: [229, 231, 235] as [number, number, number],    // #E5E7EB
      text: [17, 19, 24] as [number, number, number],         // #111318
      muted: [107, 114, 128] as [number, number, number],     // #6B7280
      primary: [22, 163, 74] as [number, number, number],    // Verde (antes azul #3B82F6)
      ok: [22, 163, 74] as [number, number, number],          // green
      warn: [217, 119, 6] as [number, number, number],        // amber
      bad: [220, 38, 38] as [number, number, number],         // red
    };

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 44; // más "corporate"
    const spaceAfterCard = 40; // Espacio consistente después del card antes del siguiente título
    let y = margin;

    // ====== HELPERS ======
    const checkPageBreak = (requiredSpace: number) => {
      if (y + requiredSpace > pageHeight - margin) {
        doc.addPage();
        y = margin;
        drawHeader(); // mantener consistencia visual por página
      }
    };

    const setTextColor = (rgb: [number, number, number]) => doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    const setFillColor = (rgb: [number, number, number]) => doc.setFillColor(rgb[0], rgb[1], rgb[2]);
    const setDrawColor = (rgb: [number, number, number]) => doc.setDrawColor(rgb[0], rgb[1], rgb[2]);

    const formatDateTimeCL = (d: Date) =>
      d.toLocaleDateString('es-CL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

    const getClasificacionBadge = (clas?: string | null) => {
      const c = (clas || '').toUpperCase();
      if (c === 'A') return { label: 'Categoría A', color: BRAND.ok };
      if (c === 'B') return { label: 'Categoría B', color: BRAND.warn };
      if (c === 'C') return { label: 'Categoría C', color: BRAND.bad };
      return { label: 'Sin clasificación', color: BRAND.muted };
    };

    const drawHeader = () => {
      // Banda superior oscura tipo "email" - altura reducida
      const headerHeight = 70;
      setFillColor(BRAND.bgHeader);
      doc.rect(0, 0, pageWidth, headerHeight, 'F');

      // "Logo" placeholder (cámbialo por imagen si quieres)
      // doc.addImage(...) si tienes base64/png
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      setTextColor([255, 255, 255]);
      doc.text('MyMA', margin, 28);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      setTextColor([210, 214, 220]);
      doc.text('Evaluación de Servicios · Calificación de Proveedores', margin, 44);

      // Título a la derecha
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      setTextColor([255, 255, 255]);
      doc.text('Reporte de evaluación', pageWidth - margin, 30, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      setTextColor([210, 214, 220]);
      doc.text(`Generado el ${formatDateTimeCL(new Date())}`, pageWidth - margin, 46, { align: 'right' });

      // Separador fino
      setDrawColor([35, 38, 45]);
      doc.setLineWidth(1);
      doc.line(0, headerHeight, pageWidth, headerHeight);

      // Ajuste del cursor
      y = headerHeight + 20;
    };

    const drawFooter = (page: number, total: number) => {
      // Separador
      setDrawColor(BRAND.border);
      doc.setLineWidth(1);
      doc.line(margin, pageHeight - 40, pageWidth - margin, pageHeight - 40);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      setTextColor(BRAND.muted);
      doc.text(`Página ${page} de ${total}`, margin, pageHeight - 22);

      doc.text('© ' + new Date().getFullYear() + ' MyMALAB. Todos los derechos reservados.', pageWidth - margin, pageHeight - 22, {
        align: 'right',
      });
    };

    const drawSectionTitle = (num: string, title: string, subtitle?: string) => {
      checkPageBreak(64);

      // Agregar espacio antes del título (reducido para que quepa mejor)
      y += 20;

      // "pill" número
      const pillW = 22;
      const pillH = 22;
      setFillColor(BRAND.primary);
      doc.roundedRect(margin, y - 14, pillW, pillH, 6, 6, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      setTextColor([255, 255, 255]);
      doc.text(num, margin + pillW / 2, y + 2, { align: 'center' });

      // título
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      setTextColor(BRAND.text);
      doc.text(title.toUpperCase(), margin + 30, y + 2);

      if (subtitle) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        setTextColor(BRAND.muted);
        doc.text(subtitle, margin + 30, y + 18);
        y += 34;
      } else {
        y += 24;
      }
    };

    const drawCard = (height: number) => {
      checkPageBreak(height + 16);

      const x = margin;
      const w = pageWidth - margin * 2;

      setFillColor(BRAND.cardBg);
      setDrawColor(BRAND.border);
      doc.setLineWidth(1);
      doc.roundedRect(x, y, w, height, 12, 12, 'FD');

      return { x, y, w, h: height };
    };

    const drawKpiRow = (items: { label: string; value: string; accent?: [number, number, number] }[]) => {
      const rowH = 56;
      const { x, y: cardY, w } = drawCard(rowH);

      // Anchos proporcionales: más espacio para proveedor, menos para resultado y clasificación
      const colWidths = [w * 0.55, w * 0.225, w * 0.225]; // 55%, 22.5%, 22.5% - más espacio para proveedor
      let currentX = x;

      items.forEach((it, i) => {
        const colW = colWidths[i];
        const cx = currentX;
        const maxWidth = colW - 28; // Ancho disponible menos padding

        // separador vertical
        if (i > 0) {
          setDrawColor(BRAND.border);
          doc.setLineWidth(1);
          doc.line(cx, cardY + 12, cx, cardY + rowH - 12);
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        setTextColor(BRAND.muted);
        doc.text(it.label.toUpperCase(), cx + 14, cardY + 22);

        doc.setFont('helvetica', 'bold');
        setTextColor(it.accent || BRAND.text);
        
        // Para el proveedor, usar tamaño de fuente más pequeño y múltiples líneas si es necesario
        if (i === 0) {
          // Proveedor: tamaño de fuente más pequeño para que quepa mejor
          doc.setFontSize(14);
          const textLines = doc.splitTextToSize(it.value, maxWidth);
          // Si necesita más de una línea, ajustar altura del card
          if (textLines.length > 1) {
            // Ajustar posición Y para múltiples líneas
            doc.text(textLines, cx + 14, cardY + 42, { maxWidth: maxWidth });
          } else {
            doc.text(it.value, cx + 14, cardY + 44, { maxWidth: maxWidth });
          }
        } else {
          // Resultado y Clasificación: tamaño normal
          doc.setFontSize(16);
          doc.text(it.value, cx + 14, cardY + 44);
        }

        currentX += colW;
      });

      y = cardY + rowH + 14;
    };

    // ====== DATA ======
    const proveedorSeleccionado = proveedores.find((p) => p.id.toString() === formData.proveedorId);

    const porcentajeTxt = evaluacionTotal !== null ? `${evaluacionTotal}%` : '—';
    const badge = getClasificacionBadge(clasificacion);

    // ====== START DOC ======
    drawHeader();

    // KPI row (tipo correo) - usar nombre completo del proveedor
    const nombreProveedorKpi = proveedorSeleccionado?.nombre_proveedor || 'No seleccionado';
    drawKpiRow([
      { label: 'Proveedor', value: nombreProveedorKpi },
      { label: 'Resultado', value: porcentajeTxt, accent: BRAND.primary },
      { label: 'Clasificación', value: (clasificacion || '—').toUpperCase(), accent: badge.color },
    ]);

    // 1) Antecedentes
    drawSectionTitle('1', 'Antecedentes', 'Información general del servicio y proveedor');

    const antecedentes = [
      ['Proveedor', proveedorSeleccionado?.nombre_proveedor || 'No seleccionado'],
      ['Nombre de contacto', formData.nombreContacto || '—'],
      ['Correo de contacto', formData.correoContacto || '—'],
      ['Orden de servicio', formData.ordenServicio || '—'],
      ['Fecha de evaluación', formData.fechaEvaluacion || '—'],
      ['Precio del servicio', formData.precioServicio ? formatCurrency(formData.precioServicio) : '—'],
      ['Evaluador responsable', formData.evaluadorResponsable || '—'],
      ['Descripción del servicio', formData.descripcionServicio || '—'],
      ['Link del servicio ejecutado', formData.linkServicioEjecutado || '—'],
    ];

    // Calcular altura de la tabla (más precisa)
    const cardStartY = y;
    const paddingTop = 16; // Padding desde el comienzo del card hasta el primer texto
    const paddingBottom = 8; // Padding desde el último texto hasta el final del card (reducido)
    
    // Calcular altura estimada más precisa basada en el número de filas
    const estimatedTableHeight = antecedentes.length * 25; // Aumentado a 25pt por fila para más espacio
    const estimatedCardHeight = estimatedTableHeight + paddingTop + paddingBottom;
    
    // Dibujar el card primero como fondo con altura generosa
    setFillColor(BRAND.cardBg);
    setDrawColor(BRAND.border);
    doc.setLineWidth(1);
    doc.roundedRect(margin, cardStartY, pageWidth - margin * 2, estimatedCardHeight, 12, 12, 'FD');
    
    // Ahora dibujar la tabla encima del card (sin header)
    autoTable(doc, {
      startY: cardStartY + paddingTop,
      margin: { left: margin + 14, right: margin + 14 },
      head: [], // Sin header
      body: antecedentes,
      theme: 'plain',
      styles: {
        font: 'helvetica',
        fontSize: 9,
        cellPadding: 6,
        textColor: BRAND.text,
        lineColor: BRAND.border,
        lineWidth: 0.5,
      },
      columnStyles: {
        0: { cellWidth: 140, fontStyle: 'bold' },
        1: { cellWidth: pageWidth - margin * 2 - 28 - 140 },
      },
      didDrawCell: (data) => {
        // separador fino por fila (look "dashboard/email")
        if (data.section === 'body' && data.column.index === 0) {
          const x1 = data.table.settings.margin.left;
          const x2 = pageWidth - margin - 14;
          const yLine = (data.cell.y + data.cell.height);
          setDrawColor(BRAND.border);
          doc.setLineWidth(0.5);
          doc.line(x1, yLine, x2, yLine);
        }
      },
    });

    // Obtener la altura final de la tabla
    const finalTableY = (doc as any).lastAutoTable.finalY;
    // Calcular altura real del contenido de la tabla
    const tableContentHeight = finalTableY - (cardStartY + paddingTop);
    // Altura total del card = contenido de tabla + padding superior + padding inferior
    const actualCardHeight = tableContentHeight + paddingTop + paddingBottom;
    
    // Usar la altura real para el cálculo de posición, pero no redibujar el card
    // (el card ya está dibujado y la tabla está encima, visible)

    // Espacio consistente después del card antes del siguiente título
    y = cardStartY + actualCardHeight + spaceAfterCard;

    // 2) Evaluación de criterios
    drawSectionTitle('2', 'Evaluación de criterios', 'Detalle de criterios según la clasificación de desempeño');

    const criteriosData = formData.criterios
      .filter((c) => c.id !== 'terreno' || formData.vaTerreno)
      .map((criterio) => {
        const opciones = getCriterioOpciones(criterio.id);
        let valorTexto = '—';

        if (criterio.valor) {
          if (criterio.id === 'terreno') valorTexto = criterio.valor;
          else valorTexto = opciones[criterio.valor] || criterio.valor;
        }

        return [criterio.nombre, criterio.id === 'terreno' ? 'N/A' : `${criterio.peso}%`, valorTexto];
      });

    // Calcular altura estimada de la tabla para dibujar el card primero
    const estimatedCritHeight = 50 + criteriosData.length * 24;
    const critCardStartY = y;
    const paddingTopCrit = 16; // Padding desde el comienzo del card hasta el primer texto
    const paddingBottomCrit = 8; // Padding desde el último texto hasta el final del card (reducido)
    
    // Dibujar el card primero como fondo
    setFillColor(BRAND.cardBg);
    setDrawColor(BRAND.border);
    doc.setLineWidth(1);
    doc.roundedRect(margin, critCardStartY, pageWidth - margin * 2, estimatedCritHeight + paddingTopCrit + paddingBottomCrit, 12, 12, 'FD');
    
    // Ahora dibujar la tabla encima del card
    autoTable(doc, {
      startY: critCardStartY + paddingTopCrit,
      margin: { left: margin + 14, right: margin + 14 },
      head: [['Criterio', 'Peso', 'Evaluación']],
      body: criteriosData,
      theme: 'plain',
      styles: {
        font: 'helvetica',
        fontSize: 9,
        cellPadding: 6,
        textColor: BRAND.text,
        lineColor: BRAND.border,
        lineWidth: 0.5,
      },
      headStyles: {
        fillColor: BRAND.cardBg,
        textColor: BRAND.muted,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 240, fontStyle: 'bold' },
        1: { cellWidth: 70, halign: 'center' },
        2: { cellWidth: pageWidth - margin * 2 - 28 - 240 - 70 },
      },
      didDrawCell: (data) => {
        // separador por filas
        if (data.section === 'body' && data.column.index === 0) {
          const x1 = data.table.settings.margin.left;
          const x2 = pageWidth - margin - 14;
          const yLine = (data.cell.y + data.cell.height);
          setDrawColor(BRAND.border);
          doc.setLineWidth(0.5);
          doc.line(x1, yLine, x2, yLine);
        }
      },
    });

    // Obtener la altura final de la tabla para ajustar si es necesario
    const finalCritTableY = (doc as any).lastAutoTable.finalY;
    const actualCritTableHeight = finalCritTableY - critCardStartY + paddingTopCrit + paddingBottomCrit;
    
    // Si la tabla es más alta de lo estimado, redibujar el card con la altura correcta
    if (actualCritTableHeight > estimatedCritHeight + paddingTopCrit + paddingBottomCrit) {
      setFillColor(BRAND.cardBg);
      setDrawColor(BRAND.border);
      doc.setLineWidth(1);
      doc.roundedRect(margin, critCardStartY, pageWidth - margin * 2, actualCritTableHeight, 12, 12, 'FD');
    }

    // Espacio consistente después del card antes del siguiente título (igual que la tabla anterior)
    y = critCardStartY + actualCritTableHeight + spaceAfterCard;

    // 3) Resultado - Forzar nueva página
    checkPageBreak(200); // Espacio necesario para la sección completa
    if (y > pageHeight / 2) {
      // Si ya estamos más abajo de la mitad de la página, forzar nueva página
      doc.addPage();
      y = margin;
      drawHeader();
    }
    drawSectionTitle('3', 'Resultado de evaluación', 'Resumen final y estatus');

    // Card resumen con "badge" de clasificación
    const resCardH = 110;
    const res = drawCard(resCardH);

    // Badge color
    setFillColor(badge.color);
    doc.roundedRect(res.x + 14, res.y + 16, 92, 22, 10, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    setTextColor([255, 255, 255]);
    doc.text(badge.label.toUpperCase(), res.x + 14 + 46, res.y + 31, { align: 'center' });

    // KPI texts
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    setTextColor(BRAND.muted);
    doc.text('PORCENTAJE', res.x + 14, res.y + 62);
    doc.text('ESTATUS FINAL', res.x + 160, res.y + 62);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    setTextColor(BRAND.primary);
    doc.text(porcentajeTxt, res.x + 14, res.y + 86);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    setTextColor(BRAND.text);
    doc.text((estatusFinal || '—'), res.x + 160, res.y + 86);

    // Clasificación grande a la derecha
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(44);
    setTextColor(badge.color);
    doc.text((clasificacion || '—').toUpperCase(), res.x + res.w - 14, res.y + 88, { align: 'right' });

    y = res.y + resCardH + 24; // Más espacio antes de observaciones

    // 4) Observaciones
    if (formData.observaciones) {
      drawSectionTitle('4', 'Observaciones', 'Comentarios y justificación del puntaje');

      const obsText = formData.observaciones || '';
      // Ajustar ancho del texto para que no supere el card (margen del card + padding interno)
      const textWidth = pageWidth - margin * 2 - 28; // Ancho disponible dentro del card
      const obsLines = doc.splitTextToSize(obsText, textWidth);

      const obsCardH = Math.min(340, Math.max(120, 44 + obsLines.length * 14));
      const obs = drawCard(obsCardH);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      setTextColor(BRAND.text);
      // Asegurar que el texto no se salga del card
      doc.text(obsLines, obs.x + 14, obs.y + 28, { maxWidth: textWidth });

      y = obs.y + obsCardH + 18;
    }

    // ====== FOOTER (todas las páginas) ======
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);

      // Header en cada página (estilo reporte-email)
      // OJO: en la primera página ya está, pero redibujarlo no hace daño; si prefieres, condicional i>1
      drawHeader();

      // Footer
      drawFooter(i, totalPages);
    }

    // ====== SAVE ======
    const nombreProveedor = proveedorSeleccionado?.nombre_proveedor || 'Proveedor';
    const fecha = new Date().toISOString().split('T')[0];
    const nombreArchivo = `Evaluacion_Servicios_${nombreProveedor}_${fecha}.pdf`;
    doc.save(nombreArchivo);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-[#111318] mb-1">
                Evaluación de Servicios
              </h1>
              <p className="text-sm text-gray-500">
                Calificación de Proveedores
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">save</span>
                <span>Guardar Evaluación</span>
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-[#111318] font-medium">
                <span className="material-symbols-outlined text-lg">edit</span>
                <span>Editar</span>
              </button>
              <button 
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-[#111318] font-medium"
              >
                <span className="material-symbols-outlined text-lg">download</span>
                <span>Exportar</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contenido Principal */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSubmit}>
              {/* 1. Antecedentes */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-6">
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                      1
                    </span>
                    <h2 className="text-lg font-bold text-[#111318]">Antecedentes</h2>
                  </div>
                  <p className="text-sm text-gray-500 ml-10">
                    Información general del servicio y proveedor
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#111318] mb-2">
                        Proveedor
                      </label>
                      {loadingProveedores ? (
                        <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50">
                          <span className="text-sm text-gray-500">Cargando...</span>
                        </div>
                      ) : (
                        <select
                          name="proveedorId"
                          value={formData.proveedorId}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
                        >
                          <option value="">Seleccione un proveedor</option>
                          {proveedores.map((prov) => (
                            <option key={prov.id} value={prov.id.toString()}>
                              {prov.nombre_proveedor}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#111318] mb-2">
                        Nombre de contacto
                      </label>
                      <input
                        type="text"
                        name="nombreContacto"
                        value={formData.nombreContacto}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        placeholder="Juan Pérez Maldonado"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#111318] mb-2">
                        Correo de contacto
                      </label>
                      <input
                        type="email"
                        name="correoContacto"
                        value={formData.correoContacto}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        placeholder="j.perez@proveedorit.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#111318] mb-2">
                        Orden de servicio
                      </label>
                      <input
                        type="text"
                        name="ordenServicio"
                        value={formData.ordenServicio}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        placeholder="OS-2024-001"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#111318] mb-2">
                        Fecha de evaluación
                      </label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                          calendar_today
                        </span>
                        <input
                          type="date"
                          name="fechaEvaluacion"
                          value={formData.fechaEvaluacion}
                          onChange={handleChange}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#111318] mb-2">
                        Precio de servicio
                      </label>
                      <input
                        type="text"
                        name="precioServicio"
                        value={formatNumberWithDots(formData.precioServicio)}
                        onChange={handlePrecioChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#111318] mb-2">
                        Evaluador responsable
                      </label>
                      <select
                        name="evaluadorResponsable"
                        value={formData.evaluadorResponsable}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
                      >
                        <option value="">Seleccione evaluador</option>
                        <option value="Admin User">Admin User</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#111318] mb-2">
                      Descripción del servicio
                    </label>
                    <textarea
                      name="descripcionServicio"
                      value={formData.descripcionServicio}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none"
                      placeholder="Breve descripción del alcance del servicio evaluado..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#111318] mb-2">
                      Link del servicio ejecutado
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        link
                      </span>
                      <input
                        type="url"
                        name="linkServicioEjecutado"
                        value={formData.linkServicioEjecutado}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        placeholder="https://ejemplo.com/servicio-ejecutado"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Ingrese el enlace donde se detalla el servicio ejecutado
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Evaluación de Criterios */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-6">
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                        2
                      </span>
                      <h2 className="text-lg font-bold text-[#111318]">Evaluación de Criterios</h2>
                    </div>
                    {evaluacionTotal !== null && (
                      <div className="text-right max-w-xs">
                        <div className="text-2xl font-bold text-primary">{evaluacionTotal}%</div>
                        <div className="text-xs text-gray-500">Resultado</div>
                        {detalleCalculoEvaluacion && (
                          <div className="mt-1 text-[10px] text-gray-500 text-right leading-snug">
                            <div>{detalleCalculoEvaluacion.formula}</div>
                            <div>
                              = ({detalleCalculoEvaluacion.numerador} / 0.5475) × 100 ≈{' '}
                              {detalleCalculoEvaluacion.porcentaje}%
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 ml-10">
                    Criterios detallados según la clasificación de desempeño
                  </p>
                </div>

                <div className="space-y-4">
                  {formData.criterios.map((criterio) => {
                    const opciones = getCriterioOpciones(criterio.id);
                    const isTerreno = criterio.id === 'terreno';
                    
                    // Descripciones para terreno (solo la parte después de los dos puntos)
                    const descripcionesTerreno: Record<string, string> = {
                      'A': 'Cumple íntegramente las medidas de seguridad exigidas para salidas a terreno. No se identifican desviaciones ni prácticas inseguras.',
                      'B': 'Presenta incumplimientos puntuales o desviaciones menores respecto de las medidas de seguridad exigidas, sin exposición inmediata a riesgos críticos. Las brechas detectadas son corregibles en el corto plazo mediante acciones correctivas formales.',
                      'C': 'Se expone a situaciones de riesgo significativo derivadas del incumplimiento de medidas de seguridad, con potencial de generar accidentes graves, afectación a personas, activos o al mandante. Esta condición constituye un incumplimiento grave y puede derivar en la suspensión de actividades, término anticipado del contrato o exclusión de futuros procesos de contratación.',
                    };
                    
                    // Títulos para terreno (la parte antes de los dos puntos)
                    const titulosTerreno: Record<string, string> = {
                      'A': 'Cumplimiento Adecuado',
                      'B': 'Cumplimiento Parcial / Desviaciones Controlables',
                      'C': 'Incumplimiento Crítico / Exposición a Riesgo Inaceptable',
                    };
                    
                    const valorMultiplicacion = getValorMultiplicacion(criterio.id, criterio.valor);
                    
                    return (
                      <div key={criterio.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[#111318]">{criterio.nombre}</span>
                            {!isTerreno && (
                              <span className="text-sm text-gray-500">PESO: {criterio.peso}%</span>
                            )}
                          </div>
                          {valorMultiplicacion !== null && (
                            <div className="text-right">
                              <div className="text-sm font-semibold text-primary">
                                {valorMultiplicacion.toFixed(4)}
                              </div>
                              <div className="text-xs text-gray-500">Peso × Opción</div>
                            </div>
                          )}
                        </div>
                        {isTerreno ? (
                          // Renderizado especial para terreno con A, B, C
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {(['A', 'B', 'C'] as const).map((nivel) => {
                              const estaSeleccionado = criterio.valor === nivel;
                              
                              return (
                                <label
                                  key={nivel}
                                  className={`relative flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors group ${
                                    estaSeleccionado
                                      ? 'border-primary bg-primary/5 group-hover:border-transparent'
                                      : 'border-gray-200 hover:border-gray-300 group-hover:border-transparent'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`criterio-${criterio.id}`}
                                    checked={estaSeleccionado}
                                    onChange={() => handleCriterioChange(criterio.id, nivel)}
                                    className="text-primary focus:ring-primary mt-1"
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-sm font-semibold text-[#111318]">{nivel}</span>
                                      <div className="relative">
                                        <span className="material-symbols-outlined text-green-600 text-base cursor-help">info</span>
                                        <div className="absolute left-0 bottom-full mb-2 w-80 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none border border-transparent outline-none">
                                          {descripcionesTerreno[nivel]}
                                        </div>
                                      </div>
                                    </div>
                                    <p className="text-xs text-gray-600 mt-1">{titulosTerreno[nivel]}</p>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        ) : (
                          // Renderizado normal para otros criterios
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {(['ALTO', 'MEDIO', 'BAJO', 'MUY_BAJO'] as const).map((nivel) => {
                              const valorOpcion = getValorOpcion(criterio.id, nivel);
                              const descripcionOpcion = getDescripcionOpcion(criterio.id, nivel);
                              return (
                                <label
                                  key={nivel}
                                  className={`relative flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-colors group ${
                                    criterio.valor === nivel
                                      ? 'border-primary bg-primary/5 group-hover:border-transparent'
                                      : 'border-gray-200 hover:border-gray-300 group-hover:border-transparent'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`criterio-${criterio.id}`}
                                    checked={criterio.valor === nivel}
                                    onChange={() => handleCriterioChange(criterio.id, nivel)}
                                    className="text-primary focus:ring-primary"
                                  />
                                  <div className="flex items-center gap-1">
                                    <span className="text-sm text-[#111318]">
                                      {opciones[nivel]}
                                      {valorOpcion !== null && (
                                        <span className="text-xs text-gray-500 ml-1">
                                          ({valorOpcion})
                                        </span>
                                      )}
                                    </span>
                                    {descripcionOpcion && (
                                      <div className="relative">
                                        <span className="material-symbols-outlined text-blue-600 text-base cursor-help">
                                          info
                                        </span>
                                        <div className="absolute left-0 bottom-full mb-2 w-80 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none border border-transparent outline-none">
                                          {descripcionOpcion}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* Checkbox "¿Va a terreno?" */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="vaTerreno"
                        checked={formData.vaTerreno}
                        onChange={handleChange}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        ¿Va a terreno?
                      </span>
                    </label>
                    <p className="text-xs text-gray-500 mt-2 ml-6">
                      Marque esta opción si el servicio requiere trabajo en terreno. Se agregará un criterio adicional de evaluación.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. Observaciones */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-6">
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
                      3
                    </span>
                    <h2 className="text-lg font-bold text-[#111318]">Observaciones</h2>
                  </div>
                  <p className="text-sm text-gray-500 ml-10">
                    Comentarios adicionales y justificación del puntaje
                  </p>
                </div>

                <textarea
                  name="observaciones"
                  value={formData.observaciones}
                  onChange={handleChange}
                  rows={5}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none"
                  placeholder="Escriba aquí los detalles que sustentan la calificación global..."
                />
              </div>
            </form>
          </div>

          {/* Sidebar Derecho */}
          <div className="space-y-6">
            {/* Resultado de Evaluación */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-6">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700">
                    RESULTADO EVALUACIÓN
                  </h3>
                  {evaluacionTotal !== null && (
                    <div className="text-4xl font-bold text-primary">{evaluacionTotal}%</div>
                  )}
                </div>
              </div>
              <div className={`border-4 rounded-lg p-8 text-center ${getClasificacionColor(clasificacion)}`}>
                <div className="text-8xl font-bold mb-4">{clasificacion || '—'}</div>
                <div className="text-sm font-medium mb-2">CALIFICACIÓN ACTUAL</div>
              </div>
              {estatusFinal && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs font-medium text-gray-600 mb-1">ESTATUS FINAL</div>
                  <div className="text-sm text-[#111318] font-medium">{estatusFinal}</div>
                </div>
              )}
              {evaluacionTotal !== null && (
                <p className="mt-2 text-xs text-gray-500 text-center">
                  Calculado automáticamente según criterios
                </p>
              )}
            </div>

            {/* Guía de Niveles */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">GUÍA DE NIVELES</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <span className="material-symbols-outlined text-green-600">check_circle</span>
                  <div>
                    <div className="font-semibold text-green-700 mb-1">Categoría A</div>
                    <div className="text-xs text-green-600">Cumplimiento &gt; 76,4%</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Habilitado para contratación inmediata.
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <span className="material-symbols-outlined text-yellow-600">info</span>
                  <div>
                    <div className="font-semibold text-yellow-700 mb-1">Categoría B</div>
                    <div className="text-xs text-yellow-600">50% ≤ cumplimiento ≤ 76,4%</div>
                    <div className="text-xs text-gray-600 mt-1">
                      Habilitado con plan de mejora obligatorio.
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <span className="material-symbols-outlined text-red-600">warning</span>
                  <div>
                    <div className="font-semibold text-red-700 mb-1">Categoría C</div>
                    <div className="text-xs text-red-600">Cumplimiento &lt; 50%</div>
                    <div className="text-xs text-gray-600 mt-1">
                      INHABILITADO PARA CONTRATACIÓN.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} MyMALAB. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
};

export default EvaluacionServicios;


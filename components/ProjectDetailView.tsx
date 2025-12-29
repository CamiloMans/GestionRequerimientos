import React, { useState, useEffect } from 'react';
import { ProjectGalleryItem, RequestItem } from '../types';
import { updateRequerimientoEstado, fetchProyectoRequerimientoObservaciones, fetchProyectoRequerimientos, fetchPersonaRequerimientosByNombre, sendWebhookViaEdgeFunction, fetchSolicitudAcreditacionByCodigo } from '../services/supabaseService';

interface ProjectRequirement {
  id: number;
  responsable: string;
  nombre_responsable?: string;
  nombre_trabajador?: string;
  categoria_empresa?: string;
  id_proyecto_trabajador?: number;
  requerimiento: string;
  categoria: string;
  realizado: boolean;
  fechaFinalizada?: string;
}

interface ProjectDetailViewProps {
  project: ProjectGalleryItem;
  onBack: () => void;
  onUpdate?: () => void;
  onFilterSidebarChange?: (isOpen: boolean) => void;
}

const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({ project, onBack, onUpdate, onFilterSidebarChange }) => {
  // Estado del sidebar de filtros
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);
  
  // Estado para controlar qué dropdown de columna está abierto
  const [openFilterDropdown, setOpenFilterDropdown] = useState<string | null>(null);

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openFilterDropdown && !(event.target as Element).closest('.filter-dropdown-container')) {
        setOpenFilterDropdown(null);
      }
    };

    if (openFilterDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openFilterDropdown]);

  // Notificar al componente padre cuando el sidebar de filtros cambie
  useEffect(() => {
    if (onFilterSidebarChange) {
      onFilterSidebarChange(isFilterSidebarOpen);
    }
  }, [isFilterSidebarOpen, onFilterSidebarChange]);

  // Limpiar notificación cuando el componente se desmonte
  useEffect(() => {
    return () => {
      if (onFilterSidebarChange) {
        onFilterSidebarChange(false);
      }
    };
  }, [onFilterSidebarChange]);

  // Bloquear scroll del body cuando el sidebar está abierto
  useEffect(() => {
    if (isFilterSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup: restaurar el scroll cuando el componente se desmonte
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isFilterSidebarOpen]);
  
  // Estados de filtros
  const [filterCargo, setFilterCargo] = useState('');
  const [filterNombreResponsable, setFilterNombreResponsable] = useState('');
  const [filterNombreTrabajador, setFilterNombreTrabajador] = useState('');
  const [filterCategoriaEmpresa, setFilterCategoriaEmpresa] = useState('');
  const [filterRequerimiento, setFilterRequerimiento] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterRealizado, setFilterRealizado] = useState('');

  // Estados para el modal de observaciones
  const [observacionesModalOpen, setObservacionesModalOpen] = useState(false);
  const [observacionesText, setObservacionesText] = useState<string | null>(null);
  const [loadingObservaciones, setLoadingObservaciones] = useState(false);
  const [requerimientoSeleccionado, setRequerimientoSeleccionado] = useState<string>('');
  // Set de requerimientos que tienen observaciones
  const [requerimientosConObservaciones, setRequerimientosConObservaciones] = useState<Set<string>>(new Set());

  // Estados para el modal de documentos de persona
  const [documentosModalOpen, setDocumentosModalOpen] = useState(false);
  const [personaSeleccionada, setPersonaSeleccionada] = useState<string>('');
  const [documentosPersona, setDocumentosPersona] = useState<RequestItem[]>([]);
  const [loadingDocumentos, setLoadingDocumentos] = useState(false);
  const [documentosSeleccionados, setDocumentosSeleccionados] = useState<Set<string>>(new Set());
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewLink, setPreviewLink] = useState<string | null>(null);
  const [guardandoDocumentos, setGuardandoDocumentos] = useState(false);

  // Cargar requerimientos del proyecto al montar para saber cuáles tienen observaciones
  useEffect(() => {
    const loadRequerimientosConObservaciones = async () => {
      if (!project.projectCode) return;

      try {
        const proyectoRequerimientos = await fetchProyectoRequerimientos(project.projectCode);
        const requerimientosConObs = new Set<string>();
        
        proyectoRequerimientos.forEach(req => {
          if (req.observaciones && req.observaciones.trim() !== '') {
            requerimientosConObs.add(req.requerimiento);
          }
        });
        
        setRequerimientosConObservaciones(requerimientosConObs);
      } catch (error) {
        console.error('Error al cargar requerimientos del proyecto:', error);
      }
    };

    loadRequerimientosConObservaciones();
  }, [project.projectCode]);

  // Usar las tareas del proyecto (vienen de ProjectGalleryItem)
  const [requirements, setRequirements] = useState<ProjectRequirement[]>(
    (project.tasks || []).map(task => ({
      id: task.id,
      responsable: task.responsable,
      nombre_responsable: task.nombre_responsable,
      nombre_trabajador: task.nombre_trabajador,
      categoria_empresa: task.categoria_empresa,
      id_proyecto_trabajador: task.id_proyecto_trabajador,
      requerimiento: task.requerimiento,
      categoria: task.categoria,
      realizado: task.realizado,
      fechaFinalizada: task.fechaFinalizada
    }))
  );

  // Filtrar requerimientos
  const filteredRequirements = requirements.filter(req => {
    const matchesCargo = filterCargo ? req.responsable === filterCargo : true;
    const matchesNombreResponsable = filterNombreResponsable ? req.nombre_responsable === filterNombreResponsable : true;
    const matchesNombreTrabajador = filterNombreTrabajador ? req.nombre_trabajador === filterNombreTrabajador : true;
    const matchesCategoriaEmpresa = filterCategoriaEmpresa ? req.categoria_empresa === filterCategoriaEmpresa : true;
    const matchesRequerimiento = filterRequerimiento ? req.requerimiento.toLowerCase().includes(filterRequerimiento.toLowerCase()) : true;
    const matchesCategoria = filterCategoria ? req.categoria === filterCategoria : true;
    const matchesRealizado = filterRealizado === '' ? true : 
      filterRealizado === 'realizado' ? req.realizado : !req.realizado;
    
    return matchesCargo && matchesNombreResponsable && matchesNombreTrabajador && 
           matchesCategoriaEmpresa && matchesRequerimiento && matchesCategoria && matchesRealizado;
  });

  // Obtener listas únicas para filtros
  const cargos = Array.from(new Set(requirements.map(r => r.responsable).filter(Boolean)));
  const nombresResponsables = Array.from(new Set(requirements.map(r => r.nombre_responsable).filter(Boolean)));
  const nombresTrabajadores = Array.from(new Set(requirements.map(r => r.nombre_trabajador).filter(Boolean)));
  const categoriasEmpresa = Array.from(new Set(requirements.map(r => r.categoria_empresa).filter(Boolean)));
  const categorias = Array.from(new Set(requirements.map(r => r.categoria).filter(Boolean)));

  // Handler para toggle de dropdown de filtro
  const handleFilterToggle = (column: string) => {
    setOpenFilterDropdown(openFilterDropdown === column ? null : column);
  };

  // Handler para aplicar filtro desde dropdown
  const handleFilterSelect = (column: string, value: string) => {
    switch (column) {
      case 'cargo':
        setFilterCargo(filterCargo === value ? '' : value);
        break;
      case 'responsable':
        setFilterNombreResponsable(filterNombreResponsable === value ? '' : value);
        break;
      case 'trabajador':
        setFilterNombreTrabajador(filterNombreTrabajador === value ? '' : value);
        break;
      case 'categoria_empresa':
        setFilterCategoriaEmpresa(filterCategoriaEmpresa === value ? '' : value);
        break;
      case 'categoria':
        setFilterCategoria(filterCategoria === value ? '' : value);
        break;
      case 'realizado':
        setFilterRealizado(filterRealizado === value ? '' : value);
        break;
    }
    setOpenFilterDropdown(null);
  };

  const handleToggleRealizado = async (e: React.MouseEvent, id: number) => {
    // Detener la propagación para evitar que se active el click del contenedor
    e.stopPropagation();
    
    const requirement = requirements.find(r => r.id === id);
    if (!requirement) return;

    const newRealizado = !requirement.realizado;
    const newEstado = newRealizado ? 'Completado' : 'Pendiente';

    try {
      // Actualizar en la base de datos
      await updateRequerimientoEstado(id, newEstado);
      
      // Actualizar estado local inmediatamente sin recargar
      setRequirements(prev => prev.map(req => {
        if (req.id === id) {
          return {
            ...req,
            realizado: newRealizado,
            fechaFinalizada: newRealizado ? new Date().toISOString().split('T')[0] : undefined
          };
        }
        return req;
      }));
      
      console.log(`✅ Requerimiento ${id} actualizado a ${newEstado}`);
      
      // NO llamamos a onUpdate() para evitar navegar/recargar la página
      // El estado local ya está actualizado y la UI se refresca automáticamente
    } catch (error) {
      console.error('❌ Error actualizando requerimiento:', error);
      alert('Error al actualizar el requerimiento. Por favor, intente nuevamente.');
    }
  };

  const clearFilters = () => {
    setFilterCargo('');
    setFilterNombreResponsable('');
    setFilterNombreTrabajador('');
    setFilterCategoriaEmpresa('');
    setFilterRequerimiento('');
    setFilterCategoria('');
    setFilterRealizado('');
  };

  const hasActiveFilters = filterCargo || filterNombreResponsable || filterNombreTrabajador || 
                          filterCategoriaEmpresa || filterRequerimiento || filterCategoria || filterRealizado;

  const completedCount = requirements.filter(r => r.realizado).length;
  const totalCount = requirements.length;
  const progressPercentage = (completedCount / totalCount) * 100;

  // Función para manejar el clic en el icono de información
  const handleInfoClick = async (requerimiento: string) => {
    if (!project.projectCode) {
      console.warn('No hay código de proyecto');
      return;
    }

    setRequerimientoSeleccionado(requerimiento);
    setLoadingObservaciones(true);
    setObservacionesModalOpen(true);
    setObservacionesText(null);

    try {
      const observaciones = await fetchProyectoRequerimientoObservaciones(
        project.projectCode,
        requerimiento
      );
      setObservacionesText(observaciones);
    } catch (error) {
      console.error('Error al obtener observaciones:', error);
      setObservacionesText(null);
    } finally {
      setLoadingObservaciones(false);
    }
  };

  // Función para cerrar el modal
  const handleCloseObservacionesModal = () => {
    setObservacionesModalOpen(false);
    setObservacionesText(null);
    setRequerimientoSeleccionado('');
  };

  // Función para manejar el clic en el nombre del trabajador
  const handleTrabajadorClick = async (nombreTrabajador: string) => {
    if (!nombreTrabajador) return;
    
    setPersonaSeleccionada(nombreTrabajador);
    setLoadingDocumentos(true);
    setDocumentosModalOpen(true);
    setDocumentosPersona([]);
    setDocumentosSeleccionados(new Set());

    try {
      const documentos = await fetchPersonaRequerimientosByNombre(nombreTrabajador);
      setDocumentosPersona(documentos);
    } catch (error) {
      console.error('Error al cargar documentos de la persona:', error);
      setDocumentosPersona([]);
    } finally {
      setLoadingDocumentos(false);
    }
  };

  // Función para cerrar el modal de documentos
  const handleCloseDocumentosModal = () => {
    setDocumentosModalOpen(false);
    setPersonaSeleccionada('');
    setDocumentosPersona([]);
    setDocumentosSeleccionados(new Set());
  };

  // Función para manejar la selección de documentos
  const handleToggleDocumentoSeleccionado = (documentoId: string) => {
    setDocumentosSeleccionados(prev => {
      const nuevo = new Set(prev);
      if (nuevo.has(documentoId)) {
        nuevo.delete(documentoId);
      } else {
        nuevo.add(documentoId);
      }
      return nuevo;
    });
  };

  // Función para obtener URLs de Google Drive
  const getFileIdFromDriveLink = (link: string): string | null => {
    const patterns = [
      /\/d\/([a-zA-Z0-9_-]+)/,
      /id=([a-zA-Z0-9_-]+)/,
      /\/file\/d\/([a-zA-Z0-9_-]+)/
    ];
    
    for (const pattern of patterns) {
      const match = link.match(pattern);
      if (match) return match[1];
    }
    
    return null;
  };

  const getDriveUrls = (link: string) => {
    const fileId = getFileIdFromDriveLink(link);
    
    if (!fileId) {
      return {
        preview: link,
        drive: link
      };
    }
    
    return {
      preview: `https://drive.google.com/file/d/${fileId}/preview`,
      drive: `https://drive.google.com/file/d/${fileId}/view`
    };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Vigente':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'En Renovación':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'A vencer':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Vencida':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Función para enviar webhook con los documentos seleccionados
  const handleGuardarDocumentos = async () => {
    if (documentosSeleccionados.size === 0) {
      alert('Por favor, selecciona al menos un documento para guardar.');
      return;
    }

    // Obtener drive_folder_id y drive_folder_url del proyecto desde solicitud_acreditacion
    let driveFolderId = null;
    let driveFolderUrl = null;
    
    console.log('🔍 Obteniendo datos de carpeta para proyecto:', project.projectCode);
    
    try {
      const solicitud = await fetchSolicitudAcreditacionByCodigo(project.projectCode || '');
      if (solicitud) {
        driveFolderId = solicitud.drive_folder_id || null;
        driveFolderUrl = solicitud.drive_folder_url || null;
        console.log('📁 Datos de carpeta del proyecto obtenidos:', { 
          driveFolderId, 
          driveFolderUrl,
          proyecto: project.projectCode 
        });
      } else {
        console.warn('⚠️ No se encontró solicitud_acreditacion para el proyecto:', project.projectCode);
      }
    } catch (error) {
      console.error('❌ Error al obtener datos del proyecto:', error);
    }
    
    console.log('📋 Valores finales que se enviarán:', { driveFolderId, driveFolderUrl });

    // Obtener los documentos seleccionados con toda su información
    const documentosParaEnviar = documentosPersona
      .filter(doc => documentosSeleccionados.has(doc.id))
      .map(doc => ({
        id: String(doc.id || ''),
        nombre: String(doc.name || ''),
        rut: String(doc.rut || ''),
        requerimiento: String(doc.requirement || ''),
        categoria: String(doc.category || ''),
        estado: String(doc.status || ''),
        fecha_vigencia: doc.adjudicationDate || '-',
        fecha_vencimiento: doc.expirationDate || '-',
        link_drive: doc.link || null,
        drive_folder_id: driveFolderId, // Usar el valor del proyecto
        drive_folder_url: driveFolderUrl, // Usar el valor del proyecto
        persona_id: doc.persona_id ? Number(doc.persona_id) : null,
        requerimiento_id: doc.requerimiento_id ? Number(doc.requerimiento_id) : null,
      }));

    const payload = {
      persona: personaSeleccionada || '',
      proyecto: project.projectCode || '',
      fecha_envio: new Date().toISOString(),
      documentos: documentosParaEnviar,
    };

    console.log('📤 Enviando webhook con payload:', payload);

    setGuardandoDocumentos(true);

    try {
      // Usar la función edge de Supabase como proxy para evitar CORS
      const result = await sendWebhookViaEdgeFunction(payload);

      console.log('📥 Respuesta del webhook:', result);

      if (!result.success) {
        throw new Error(result.error || `Error ${result.status || 'desconocido'}`);
      }
      
      console.log('✅ Webhook enviado exitosamente:', result.data);
      alert(`✅ ${documentosSeleccionados.size} documento(s) enviado(s) exitosamente.`);
      
      // Opcional: cerrar el modal después de guardar
      // handleCloseDocumentosModal();
    } catch (error) {
      console.error('❌ Error completo al enviar webhook:', error);
      
      let errorMessage = 'Error desconocido';
      let isCorsError = false;
      
      if (error instanceof TypeError) {
        if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
          // Verificar si es un error de CORS
          const errorString = error.toString().toLowerCase();
          if (errorString.includes('cors') || errorString.includes('access-control')) {
            isCorsError = true;
            errorMessage = 'Error de CORS: El webhook de n8n no permite solicitudes desde el navegador.\n\n' +
              'SOLUCIONES:\n' +
              '1. Configura CORS en n8n: En la configuración del webhook, permite solicitudes desde tu dominio.\n' +
              '2. Usa un proxy: Crea una función edge de Supabase que haga el proxy al webhook.\n' +
              '3. Contacta al administrador del webhook para habilitar CORS.';
          } else {
            errorMessage = 'Error de conexión. Verifica tu conexión a internet o si el servidor está disponible.';
          }
        } else {
          errorMessage = error.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      if (isCorsError) {
        // Mostrar un alert más detallado para errores de CORS
        alert(`❌ Error de CORS al guardar los documentos\n\n${errorMessage}\n\nRevisa la consola para más detalles.`);
      } else {
        alert(`❌ Error al guardar los documentos: ${errorMessage}`);
      }
    } finally {
      setGuardandoDocumentos(false);
    }
  };

  return (
    <div className="layout-container flex h-full grow flex-col bg-gradient-to-br from-gray-50 to-blue-50/30">
      {/* Header Compacto */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4">
          {/* Back Button */}
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors group mb-3"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            <span className="font-medium text-sm">Volver a Proyectos</span>
          </button>

          {/* Información del Proyecto - Layout Horizontal */}
          <div className="flex items-center justify-between gap-6 flex-wrap">
            {/* Columna Izquierda: Info Principal */}
            <div className="flex items-center gap-4">
              {/* Icono */}
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                <span className="material-symbols-outlined text-white text-2xl">folder_open</span>
              </div>
              
              {/* Info del Proyecto */}
              <div>
                <h1 className="text-xl font-bold text-[#111318] mb-0.5">{project.projectCode}</h1>
                <p className="text-xs text-gray-500">{project.projectName}</p>
              </div>
              
              {/* Divisor */}
              <div className="w-px h-10 bg-gray-300 mx-2"></div>
              
              {/* Empresa Contratista */}
              <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg px-3 py-2">
                <span className="material-symbols-outlined text-indigo-600 text-[20px]">business</span>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-semibold leading-none">Empresa Contratista</p>
                  <p className="text-sm font-bold text-indigo-900">{project.empresa_nombre || 'Sin asignar'}</p>
                </div>
              </div>
              
              {/* Divisor */}
              <div className="w-px h-10 bg-gray-300 mx-2"></div>
              
              {/* Info adicional compacta */}
              <div className="flex items-center gap-4 text-xs text-gray-600">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">business</span>
                  <span>{project.clientName}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">person</span>
                  <span>{project.projectManager}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">groups</span>
                  <span>{project.totalWorkers} trabajadores</span>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Progreso y Estado */}
            <div className="flex items-center gap-4">
              {/* Barra de progreso compacta */}
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end">
                  <span className="text-lg font-bold text-primary">{completedCount}/{totalCount}</span>
                  <span className="text-[10px] text-gray-500 uppercase font-semibold">Tareas</span>
                </div>
                <div className="w-32">
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-1 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-gray-500 text-center font-semibold">{progressPercentage.toFixed(0)}% completado</p>
                </div>
              </div>
              
              {/* Estado */}
              <span className={`px-4 py-2 rounded-lg text-xs font-bold border-2 ${
                project.status.toLowerCase().includes('pendiente') ? 'bg-amber-100 text-amber-700 border-amber-300' :
                project.status.toLowerCase().includes('proceso') ? 'bg-blue-100 text-blue-700 border-blue-300' :
                project.status.toLowerCase().includes('finalizada') ? 'bg-green-100 text-green-700 border-green-300' :
                'bg-red-100 text-red-700 border-red-300'
              }`}>
                {project.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Estadísticas - Ampliada */}
      <div className="bg-gradient-to-r from-white to-gray-50 border-b border-gray-200 px-6 py-5 shadow-sm">
        {/* Primera fila: Filtros y Estadísticas Generales */}
        <div className="flex items-center justify-between gap-4 mb-4">
          {/* Izquierda: Filtros */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsFilterSidebarOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 text-base font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-primary transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-[20px]">filter_alt</span>
              <span>Filtros</span>
              {hasActiveFilters && (
                <span className="px-2 py-0.5 text-xs font-bold text-white bg-primary rounded-full">
                  {[filterCargo, filterNombreResponsable, filterNombreTrabajador, filterCategoriaEmpresa, filterRequerimiento, filterCategoria, filterRealizado].filter(Boolean).length}
                </span>
              )}
            </button>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
                <span>Limpiar</span>
              </button>
            )}

            <div className="text-sm text-gray-500 ml-2">
              Mostrando <span className="font-bold text-gray-900">{filteredRequirements.length}</span> de <span className="font-bold text-gray-900">{totalCount}</span>
            </div>
          </div>

          {/* Derecha: Estadísticas en línea - Más grandes */}
          <div className="flex items-center gap-8">
            {/* Completados */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center border-2 border-green-300 shadow-sm">
                <span className="material-symbols-outlined text-green-600 text-[24px]">check_circle</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700 leading-none">{completedCount}</p>
                <p className="text-xs text-gray-500 font-semibold uppercase">Completados</p>
              </div>
            </div>
            
            <div className="w-px h-12 bg-gray-300"></div>
            
            {/* Pendientes */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center border-2 border-amber-300 shadow-sm">
                <span className="material-symbols-outlined text-amber-600 text-[24px]">pending</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-700 leading-none">{totalCount - completedCount}</p>
                <p className="text-xs text-gray-500 font-semibold uppercase">Pendientes</p>
              </div>
            </div>
            
            <div className="w-px h-12 bg-gray-300"></div>
            
            {/* Progreso */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center border-2 border-blue-300 shadow-sm">
                <span className="material-symbols-outlined text-blue-600 text-[24px]">analytics</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700 leading-none">{Math.round((completedCount / totalCount) * 100)}%</p>
                <p className="text-xs text-gray-500 font-semibold uppercase">Progreso</p>
              </div>
            </div>
          </div>
        </div>

        {/* Segunda fila: Cumplimiento por Responsables */}
        {(() => {
          const responsables = [
            { id: project.jpro_id, nombre: project.jpro_nombre, rol: 'JPRO', color: 'blue' },
            { id: project.epr_id, nombre: project.epr_nombre, rol: 'EPR', color: 'orange' },
            { id: project.rrhh_id, nombre: project.rrhh_nombre, rol: 'RRHH', color: 'green' },
            { id: project.legal_id, nombre: project.legal_nombre, rol: 'Legal', color: 'purple' }
          ].filter(r => r.id);

          if (responsables.length === 0) {
            return (
              <div className="pt-3 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-lg px-4 py-3">
                  <span className="material-symbols-outlined text-[20px]">info</span>
                  <span>Sin responsables asignados</span>
                </div>
              </div>
            );
          }

          return (
            <div className="pt-4 border-t border-gray-200">
              <div className="mb-3">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">group</span>
                  Cumplimiento por Responsable
                </h3>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {responsables.map((resp) => {
                  const tareas = requirements.filter((t) => t.responsable === resp.rol);
                  const completadas = tareas.filter((t) => t.realizado).length;
                  const total = tareas.length;
                  const porcentaje = total > 0 ? (completadas / total) : 0;

                  const colorMap = {
                    blue: { bg: 'bg-blue-50', border: 'border-blue-200', ring: '#DBEAFE', stroke: '#3B82F6', text: 'text-blue-600' },
                    orange: { bg: 'bg-orange-50', border: 'border-orange-200', ring: '#FED7AA', stroke: '#F97316', text: 'text-orange-600' },
                    green: { bg: 'bg-green-50', border: 'border-green-200', ring: '#D1FAE5', stroke: '#10B981', text: 'text-green-600' },
                    purple: { bg: 'bg-purple-50', border: 'border-purple-200', ring: '#E9D5FF', stroke: '#A855F7', text: 'text-purple-600' }
                  };
                  const colors = colorMap[resp.color as keyof typeof colorMap] || colorMap.blue;

                  return (
                    <div key={resp.rol} className={`flex items-center gap-3 ${colors.bg} rounded-lg border-2 ${colors.border} px-4 py-3 transition-all duration-300 shadow-sm hover:shadow-md`}>
                      {/* Anillo de progreso */}
                      <div className="relative flex items-center justify-center flex-shrink-0">
                        <svg className="w-16 h-16 transform -rotate-90">
                          <circle cx="32" cy="32" r="26" stroke={colors.ring} strokeWidth="4" fill="none" />
                          <circle
                            cx="32"
                            cy="32"
                            r="26"
                            stroke={colors.stroke}
                            strokeWidth="4"
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 26}`}
                            strokeDashoffset={`${2 * Math.PI * 26 * (1 - porcentaje)}`}
                            strokeLinecap="round"
                            className="transition-all duration-500"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-base font-extrabold text-gray-800">
                            {Math.round(porcentaje * 100)}%
                          </span>
                        </div>
                      </div>
                      {/* Info */}
                      <div className="flex flex-col justify-center min-w-0 flex-1">
                        <div className="flex items-baseline gap-2 mb-1">
                          <p className={`text-sm font-extrabold uppercase ${colors.text}`}>{resp.rol}</p>
                          <div className="flex items-baseline gap-1">
                            <p className={`text-lg font-bold ${colors.text}`}>{completadas}</p>
                            <span className="text-xs font-semibold text-gray-400">/</span>
                            <p className="text-sm font-semibold text-gray-500">{total}</p>
                          </div>
                        </div>
                        {resp.nombre && (
                          <p className="text-xs text-gray-600 font-medium truncate leading-tight">
                            {resp.nombre}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Sidebar de Filtros */}
      {isFilterSidebarOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-all duration-300"
            onClick={() => setIsFilterSidebarOpen(false)}
          />
          
          {/* Sidebar */}
          <div className="fixed top-0 left-0 h-full w-[260px] bg-gradient-to-b from-white to-gray-50 shadow-2xl z-50 flex flex-col animate-slide-in-left">
            {/* Header del Sidebar */}
            <div className="bg-gradient-to-br from-primary to-emerald-700 text-white px-4 py-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-2xl">tune</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Filtros Avanzados</h3>
                    <p className="text-xs text-emerald-100 mt-0.5">
                      {filteredRequirements.length} resultado{filteredRequirements.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsFilterSidebarOpen(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-all"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>
            </div>

            {/* Contenido del Sidebar */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {/* Sección: Personal */}
              <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">group</span>
                  Personal
                </h4>
                <div className="space-y-2.5">
                  {/* Filtro por Cargo */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">badge</span>
                      Cargo
                    </label>
                    <select
                      value={filterCargo}
                      onChange={(e) => setFilterCargo(e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded-md text-[9px] focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white hover:border-gray-400 transition-colors cursor-pointer"
                    >
                      <option value="">Todos los Cargos</option>
                      {cargos.map(cargo => (
                        <option key={cargo} value={cargo}>{cargo}</option>
                      ))}
                    </select>
                  </div>

                  {/* Filtro por Nombre Responsable */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">account_circle</span>
                      Responsable
                    </label>
                    <select
                      value={filterNombreResponsable}
                      onChange={(e) => setFilterNombreResponsable(e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded-md text-[9px] focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white hover:border-gray-400 transition-colors cursor-pointer"
                    >
                      <option value="">Todos los Responsables</option>
                      {nombresResponsables.map(nombre => (
                        <option key={nombre} value={nombre}>{nombre}</option>
                      ))}
                    </select>
                  </div>

                  {/* Filtro por Nombre Trabajador */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">person</span>
                      Trabajador
                    </label>
                    <select
                      value={filterNombreTrabajador}
                      onChange={(e) => setFilterNombreTrabajador(e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded-md text-[9px] focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white hover:border-gray-400 transition-colors cursor-pointer"
                    >
                      <option value="">Todos los Trabajadores</option>
                      {nombresTrabajadores.map(nombre => (
                        <option key={nombre} value={nombre}>{nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Sección: Empresa */}
              <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">business</span>
                  Empresa
                </h4>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">business_center</span>
                    Categoría Empresa
                  </label>
                  <select
                    value={filterCategoriaEmpresa}
                    onChange={(e) => setFilterCategoriaEmpresa(e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded-md text-[10px] focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white hover:border-gray-400 transition-colors cursor-pointer"
                  >
                    <option value="">Todas las Empresas</option>
                    {categoriasEmpresa.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sección: Requerimientos */}
              <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">checklist</span>
                  Requerimientos
                </h4>
                <div className="space-y-2.5">
                  {/* Filtro por Requerimiento (búsqueda) */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">search</span>
                      Buscar Requerimiento
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[14px]">search</span>
                      <input
                        type="text"
                        value={filterRequerimiento}
                        onChange={(e) => setFilterRequerimiento(e.target.value)}
                        placeholder="Escribe para buscar..."
                        className="w-full pl-7 pr-2 py-1 border border-gray-300 rounded-md text-[9px] focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white hover:border-gray-400 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Filtro por Categoría */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">category</span>
                      Categoría
                    </label>
                    <select
                      value={filterCategoria}
                      onChange={(e) => setFilterCategoria(e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded-md text-[9px] focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white hover:border-gray-400 transition-colors cursor-pointer"
                    >
                      <option value="">Todas las Categorías</option>
                      {categorias.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Filtro por Estado */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">task_alt</span>
                      Estado
                    </label>
                    <select
                      value={filterRealizado}
                      onChange={(e) => setFilterRealizado(e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded-md text-[9px] focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white hover:border-gray-400 transition-colors cursor-pointer"
                    >
                      <option value="">Todos los Estados</option>
                      <option value="realizado">✅ Realizados</option>
                      <option value="pendiente">⏳ Pendientes</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Resumen de Filtros Activos */}
              {hasActiveFilters && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-amber-600 text-[18px]">info</span>
                    <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">Filtros Activos</span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {filterCargo && <div className="text-gray-700 flex items-start gap-1.5"><span className="text-amber-500 mt-0.5">•</span><span><span className="font-semibold">Cargo:</span> {filterCargo}</span></div>}
                    {filterNombreResponsable && <div className="text-gray-700 flex items-start gap-1.5"><span className="text-amber-500 mt-0.5">•</span><span><span className="font-semibold">Responsable:</span> {filterNombreResponsable}</span></div>}
                    {filterNombreTrabajador && <div className="text-gray-700 flex items-start gap-1.5"><span className="text-amber-500 mt-0.5">•</span><span><span className="font-semibold">Trabajador:</span> {filterNombreTrabajador}</span></div>}
                    {filterCategoriaEmpresa && <div className="text-gray-700 flex items-start gap-1.5"><span className="text-amber-500 mt-0.5">•</span><span><span className="font-semibold">Empresa:</span> {filterCategoriaEmpresa}</span></div>}
                    {filterRequerimiento && <div className="text-gray-700 flex items-start gap-1.5"><span className="text-amber-500 mt-0.5">•</span><span><span className="font-semibold">Búsqueda:</span> "{filterRequerimiento}"</span></div>}
                    {filterCategoria && <div className="text-gray-700 flex items-start gap-1.5"><span className="text-amber-500 mt-0.5">•</span><span><span className="font-semibold">Categoría:</span> {filterCategoria}</span></div>}
                    {filterRealizado && <div className="text-gray-700 flex items-start gap-1.5"><span className="text-amber-500 mt-0.5">•</span><span><span className="font-semibold">Estado:</span> {filterRealizado === 'realizado' ? 'Realizados' : 'Pendientes'}</span></div>}
                  </div>
                </div>
              )}
            </div>

            {/* Footer con Botones de Acción */}
            <div className="bg-white border-t border-gray-200 px-6 py-4 shadow-lg">
              <div className="space-y-2">
                <button
                  onClick={() => setIsFilterSidebarOpen(false)}
                  className="w-full px-4 py-2.5 text-sm font-bold text-white bg-primary hover:bg-primary-hover rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">done</span>
                  Aplicar Filtros
                </button>
                
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="w-full px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all border border-gray-300 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">filter_alt_off</span>
                    Limpiar Filtros
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Tabla de Requerimientos */}
      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-blue-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2 relative filter-dropdown-container">
                      <span>Cargo</span>
                      <button
                        onClick={() => handleFilterToggle('cargo')}
                        className={`p-1 rounded hover:bg-gray-200 transition-colors ${filterCargo ? 'text-primary' : 'text-gray-400'}`}
                      >
                        <span className="material-symbols-outlined text-sm">arrow_drop_down</span>
                      </button>
                      {openFilterDropdown === 'cargo' && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-auto max-h-60 overflow-y-auto">
                          <div className="py-0.5">
                            <button
                              onClick={() => handleFilterSelect('cargo', '')}
                              className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 whitespace-nowrap ${!filterCargo ? 'bg-blue-50 text-primary font-semibold' : ''}`}
                            >
                              Todos los Cargos
                            </button>
                            {cargos.map(cargo => (
                              <button
                                key={cargo}
                                onClick={() => handleFilterSelect('cargo', cargo)}
                                className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 whitespace-nowrap ${filterCargo === cargo ? 'bg-blue-50 text-primary font-semibold' : ''}`}
                              >
                                {cargo}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2 relative filter-dropdown-container">
                      <span>Responsable</span>
                      <button
                        onClick={() => handleFilterToggle('responsable')}
                        className={`p-1 rounded hover:bg-gray-200 transition-colors ${filterNombreResponsable ? 'text-primary' : 'text-gray-400'}`}
                      >
                        <span className="material-symbols-outlined text-sm">arrow_drop_down</span>
                      </button>
                      {openFilterDropdown === 'responsable' && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-auto max-h-60 overflow-y-auto">
                          <div className="py-0.5">
                            <button
                              onClick={() => handleFilterSelect('responsable', '')}
                              className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 whitespace-nowrap ${!filterNombreResponsable ? 'bg-blue-50 text-primary font-semibold' : ''}`}
                            >
                              Todos los Responsables
                            </button>
                            {nombresResponsables.map(nombre => (
                              <button
                                key={nombre}
                                onClick={() => handleFilterSelect('responsable', nombre)}
                                className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 whitespace-nowrap ${filterNombreResponsable === nombre ? 'bg-blue-50 text-primary font-semibold' : ''}`}
                              >
                                {nombre}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2 relative filter-dropdown-container">
                      <span>Nombre Trabajador</span>
                      <button
                        onClick={() => handleFilterToggle('trabajador')}
                        className={`p-1 rounded hover:bg-gray-200 transition-colors ${filterNombreTrabajador ? 'text-primary' : 'text-gray-400'}`}
                      >
                        <span className="material-symbols-outlined text-sm">arrow_drop_down</span>
                      </button>
                      {openFilterDropdown === 'trabajador' && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-auto max-h-60 overflow-y-auto">
                          <div className="py-0.5">
                            <button
                              onClick={() => handleFilterSelect('trabajador', '')}
                              className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 whitespace-nowrap ${!filterNombreTrabajador ? 'bg-blue-50 text-primary font-semibold' : ''}`}
                            >
                              Todos los Trabajadores
                            </button>
                            {nombresTrabajadores.map(nombre => (
                              <button
                                key={nombre}
                                onClick={() => handleFilterSelect('trabajador', nombre)}
                                className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 whitespace-nowrap ${filterNombreTrabajador === nombre ? 'bg-blue-50 text-primary font-semibold' : ''}`}
                              >
                                {nombre}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2 relative filter-dropdown-container">
                      <span>Categoría Empresa</span>
                      <button
                        onClick={() => handleFilterToggle('categoria_empresa')}
                        className={`p-1 rounded hover:bg-gray-200 transition-colors ${filterCategoriaEmpresa ? 'text-primary' : 'text-gray-400'}`}
                      >
                        <span className="material-symbols-outlined text-sm">arrow_drop_down</span>
                      </button>
                      {openFilterDropdown === 'categoria_empresa' && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-auto max-h-60 overflow-y-auto">
                          <div className="py-0.5">
                            <button
                              onClick={() => handleFilterSelect('categoria_empresa', '')}
                              className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 whitespace-nowrap ${!filterCategoriaEmpresa ? 'bg-blue-50 text-primary font-semibold' : ''}`}
                            >
                              Todas las Empresas
                            </button>
                            {categoriasEmpresa.map(cat => (
                              <button
                                key={cat}
                                onClick={() => handleFilterSelect('categoria_empresa', cat)}
                                className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 whitespace-nowrap ${filterCategoriaEmpresa === cat ? 'bg-blue-50 text-primary font-semibold' : ''}`}
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Requerimiento
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2 relative filter-dropdown-container">
                      <span>Categoría</span>
                      <button
                        onClick={() => handleFilterToggle('categoria')}
                        className={`p-1 rounded hover:bg-gray-200 transition-colors ${filterCategoria ? 'text-primary' : 'text-gray-400'}`}
                      >
                        <span className="material-symbols-outlined text-sm">arrow_drop_down</span>
                      </button>
                      {openFilterDropdown === 'categoria' && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-auto max-h-60 overflow-y-auto">
                          <div className="py-0.5">
                            <button
                              onClick={() => handleFilterSelect('categoria', '')}
                              className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 whitespace-nowrap ${!filterCategoria ? 'bg-blue-50 text-primary font-semibold' : ''}`}
                            >
                              Todas las Categorías
                            </button>
                            {categorias.map(cat => (
                              <button
                                key={cat}
                                onClick={() => handleFilterSelect('categoria', cat)}
                                className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 whitespace-nowrap ${filterCategoria === cat ? 'bg-blue-50 text-primary font-semibold' : ''}`}
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center justify-center gap-2 relative filter-dropdown-container">
                      <span>Realizado</span>
                      <button
                        onClick={() => handleFilterToggle('realizado')}
                        className={`p-1 rounded hover:bg-gray-200 transition-colors ${filterRealizado ? 'text-primary' : 'text-gray-400'}`}
                      >
                        <span className="material-symbols-outlined text-sm">arrow_drop_down</span>
                      </button>
                      {openFilterDropdown === 'realizado' && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-auto">
                          <div className="py-0.5">
                            <button
                              onClick={() => handleFilterSelect('realizado', '')}
                              className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 whitespace-nowrap ${!filterRealizado ? 'bg-blue-50 text-primary font-semibold' : ''}`}
                            >
                              Todos los Estados
                            </button>
                            <button
                              onClick={() => handleFilterSelect('realizado', 'realizado')}
                              className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 whitespace-nowrap ${filterRealizado === 'realizado' ? 'bg-blue-50 text-primary font-semibold' : ''}`}
                            >
                              ✅ Realizados
                            </button>
                            <button
                              onClick={() => handleFilterSelect('realizado', 'pendiente')}
                              className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-gray-100 whitespace-nowrap ${filterRealizado === 'pendiente' ? 'bg-blue-50 text-primary font-semibold' : ''}`}
                            >
                              ⏳ Pendientes
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Fecha Finalizada
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRequirements.length > 0 ? (
                  filteredRequirements.map((req) => {
                    // Colores según el cargo
                    const cargoColors = {
                      'JPRO': 'bg-blue-100 text-blue-700 border-blue-300',
                      'EPR': 'bg-orange-100 text-orange-700 border-orange-300',
                      'RRHH': 'bg-green-100 text-green-700 border-green-300',
                      'Legal': 'bg-purple-100 text-purple-700 border-purple-300',
                    };
                    const colorClass = cargoColors[req.responsable as keyof typeof cargoColors] || 'bg-gray-100 text-gray-700 border-gray-300';

                    return (
                      <tr key={req.id} className="hover:bg-blue-50/50 transition-colors">
                        {/* Cargo */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1.5 rounded-md text-xs font-bold border ${colorClass}`}>
                            {req.responsable}
                          </span>
                        </td>
                        
                        {/* Responsable */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-gray-600 text-[20px]">account_circle</span>
                            <span className="text-sm font-semibold text-gray-900">
                              {req.nombre_responsable || <span className="text-gray-400 italic font-normal">Sin asignar</span>}
                            </span>
                          </div>
                        </td>

                        {/* Nombre Trabajador */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-gray-600 text-[20px]">person</span>
                            {req.nombre_trabajador ? (
                              <button
                                onClick={() => handleTrabajadorClick(req.nombre_trabajador!)}
                                className="text-sm text-primary hover:text-primary-hover hover:underline font-medium transition-colors cursor-pointer"
                              >
                                {req.nombre_trabajador}
                              </button>
                            ) : (
                              <span className="text-sm text-gray-400 italic text-xs">N/A</span>
                            )}
                          </div>
                        </td>

                        {/* Categoría Empresa */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {req.categoria_empresa ? (
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                              req.categoria_empresa === 'MyMA' 
                                ? 'bg-blue-50 text-blue-700 border-blue-300' 
                                : 'bg-amber-50 text-amber-700 border-amber-300'
                            }`}>
                              {req.categoria_empresa}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic text-xs">N/A</span>
                          )}
                        </td>

                        {/* Requerimiento */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-900">{req.requerimiento}</span>
                            {requerimientosConObservaciones.has(req.requerimiento) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleInfoClick(req.requerimiento);
                                }}
                                className="flex-shrink-0 p-1.5 rounded-full text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                title="Ver observaciones"
                              >
                                <span className="material-symbols-outlined text-lg">info</span>
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Categoría */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                            {req.categoria}
                          </span>
                        </td>

                        {/* Realizado */}
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center">
                            <button
                              type="button"
                              onClick={(e) => handleToggleRealizado(e, req.id)}
                              className={`inline-flex items-center justify-center w-10 h-10 rounded-full transition-all ${
                                req.realizado 
                                  ? 'bg-green-100 hover:bg-green-200 border-2 border-green-500' 
                                  : 'bg-gray-100 hover:bg-gray-200 border-2 border-gray-300'
                              }`}
                            >
                            {req.realizado ? (
                              <span className="material-symbols-outlined text-green-600 text-2xl">check_circle</span>
                            ) : (
                              <span className="material-symbols-outlined text-gray-400 text-2xl">radio_button_unchecked</span>
                            )}
                            </button>
                          </div>
                        </td>

                        {/* Fecha Finalizada */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {req.fechaFinalizada ? (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <span className="material-symbols-outlined text-[18px]">event</span>
                              <span>{new Date(req.fechaFinalizada).toLocaleDateString('es-ES', { 
                                day: '2-digit', 
                                month: '2-digit', 
                                year: 'numeric' 
                              })}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <span className="material-symbols-outlined text-gray-300 text-5xl">search_off</span>
                        <p className="text-gray-500 text-lg">No se encontraron requerimientos</p>
                        <p className="text-gray-400 text-sm">Intenta ajustar los filtros</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de Observaciones */}
      {observacionesModalOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={handleCloseObservacionesModal}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100">
                  <span className="material-symbols-outlined text-blue-600">info</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Observaciones del Requerimiento</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{requerimientoSeleccionado}</p>
                </div>
              </div>
              <button
                onClick={handleCloseObservacionesModal}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6 overflow-y-auto flex-1">
              {loadingObservaciones ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="text-gray-600 text-sm">Cargando observaciones...</p>
                  </div>
                </div>
              ) : observacionesText ? (
                <div className="prose max-w-none">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{observacionesText}</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <span className="material-symbols-outlined text-gray-300 text-5xl mb-3">info</span>
                  <p className="text-gray-500 text-base">No hay observaciones disponibles para este requerimiento</p>
                </div>
              )}
            </div>

            {/* Footer del Modal */}
            <div className="flex items-center justify-end p-6 border-t border-gray-200">
              <button
                onClick={handleCloseObservacionesModal}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Documentos de Persona */}
      {documentosModalOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={handleCloseDocumentosModal}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <span className="material-symbols-outlined text-primary">description</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Documentos de {personaSeleccionada}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {documentosPersona.length} documento{documentosPersona.length !== 1 ? 's' : ''} encontrado{documentosPersona.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseDocumentosModal}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6 overflow-y-auto flex-1">
              {loadingDocumentos ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="text-gray-600 text-sm">Cargando documentos...</p>
                  </div>
                </div>
              ) : documentosPersona.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-600 uppercase bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th scope="col" className="px-4 py-3 font-semibold w-12">
                          <input
                            type="checkbox"
                            checked={documentosSeleccionados.size === documentosPersona.length && documentosPersona.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setDocumentosSeleccionados(new Set(documentosPersona.map(d => d.id)));
                              } else {
                                setDocumentosSeleccionados(new Set());
                              }
                            }}
                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                          />
                        </th>
                        <th scope="col" className="px-6 py-3 font-semibold">NOMBRE</th>
                        <th scope="col" className="px-6 py-3 font-semibold">Requerimiento</th>
                        <th scope="col" className="px-6 py-3 font-semibold">Categoría</th>
                        <th scope="col" className="px-6 py-3 font-semibold">Estado</th>
                        <th scope="col" className="px-6 py-3 font-semibold text-center">Documento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {documentosPersona.map((doc) => (
                        <tr 
                          key={doc.id} 
                          className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                            documentosSeleccionados.has(doc.id) ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => handleToggleDocumentoSeleccionado(doc.id)}
                        >
                          <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={documentosSeleccionados.has(doc.id)}
                              onChange={() => handleToggleDocumentoSeleccionado(doc.id)}
                              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td className="px-6 py-4 font-medium text-gray-900">{doc.name}</td>
                          <td className="px-6 py-4 text-gray-600">{doc.requirement}</td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                              {doc.category}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border inline-flex items-center gap-1.5 ${getStatusBadge(doc.status)}`}>
                              {doc.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {doc.link ? (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const urls = getDriveUrls(doc.link!);
                                    setPreviewLink(urls.preview);
                                    setIsPreviewModalOpen(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-1.5 rounded-full transition-colors"
                                  title="Visualizar documento"
                                >
                                  <span className="material-symbols-outlined text-[18px]">visibility</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const urls = getDriveUrls(doc.link!);
                                    window.open(urls.drive, '_blank', 'noopener,noreferrer');
                                  }}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-full transition-colors"
                                  title="Abrir en Google Drive"
                                >
                                  <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">Sin documento</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <span className="material-symbols-outlined text-gray-300 text-5xl mb-3">description</span>
                  <p className="text-gray-500 text-base">No se encontraron documentos para esta persona</p>
                </div>
              )}
            </div>

            {/* Footer del Modal */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 flex-shrink-0">
              <div className="text-sm text-gray-600">
                {documentosSeleccionados.size > 0 && (
                  <span className="font-medium">
                    {documentosSeleccionados.size} documento{documentosSeleccionados.size !== 1 ? 's' : ''} seleccionado{documentosSeleccionados.size !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleGuardarDocumentos}
                  disabled={documentosSeleccionados.size === 0 || guardandoDocumentos}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    documentosSeleccionados.size === 0 || guardandoDocumentos
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-primary hover:bg-primary-hover text-white shadow-md hover:shadow-lg'
                  }`}
                >
                  {guardandoDocumentos ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">save</span>
                      <span>Guardar</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleCloseDocumentosModal}
                  disabled={guardandoDocumentos}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    guardandoDocumentos
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Vista Previa del Documento */}
      {isPreviewModalOpen && previewLink && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
          onClick={() => {
            setIsPreviewModalOpen(false);
            setPreviewLink(null);
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-primary px-6 py-4 flex items-center justify-between flex-shrink-0 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-white text-2xl">description</span>
                <h2 className="text-xl font-bold text-white">Vista Previa del Documento</h2>
              </div>
              <button
                onClick={() => {
                  setIsPreviewModalOpen(false);
                  setPreviewLink(null);
                }}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                title="Cerrar"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Content - Iframe */}
            <div className="flex-1 p-4 bg-gray-100">
              <iframe
                src={previewLink}
                className="w-full h-full min-h-[600px] border-0 rounded-lg"
                title="Vista previa del documento"
                allow="fullscreen"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetailView;


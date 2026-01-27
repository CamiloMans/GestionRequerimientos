import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AreaId } from '@contracts/areas';
import {
  createProveedor,
  updateProveedor,
  fetchProveedorById,
  ProveedorData,
  calcularClasificacion,
  fetchEspecialidades,
  fetchEspecialidadesByNombreProveedor,
  saveProveedorEspecialidades,
} from '../services/proveedoresService';

const NuevoProveedor: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditMode);
  const [error, setError] = useState<string | null>(null);
  const [especialidades, setEspecialidades] = useState<{ id: number; nombre: string }[]>([]);
  const [especialidadesSeleccionadas, setEspecialidadesSeleccionadas] = useState<number[]>([]);
  const [loadingEspecialidades, setLoadingEspecialidades] = useState(true);
  const [formData, setFormData] = useState<ProveedorData>({
    nombre_proveedor: '',
    rut: '',
    razon_social: '',
    correo_contacto: '',
    tipo_proveedor: 'Empresa',
    evaluacion: null,
    clasificacion: null,
  });

  // Calcular clasificación automáticamente cuando cambia la evaluación
  // Si hay una clasificación guardada y no hay evaluación, usar la clasificación guardada
  // Si hay evaluación, calcular desde la evaluación (tiene prioridad)
  const clasificacionCalculada = useMemo(() => {
    if (formData.evaluacion !== null && formData.evaluacion !== undefined) {
      return calcularClasificacion(formData.evaluacion);
    }
    // Si no hay evaluación pero hay clasificación guardada, usar esa
    return formData.clasificacion || null;
  }, [formData.evaluacion, formData.clasificacion]);

  const getAreaPath = (path: string) => {
    return `/app/area/${AreaId.PROVEEDORES}/${path}`;
  };

  // Cargar especialidades
  useEffect(() => {
    const loadEspecialidades = async () => {
      try {
        setLoadingEspecialidades(true);
        const data = await fetchEspecialidades();
        setEspecialidades(data);
      } catch (err) {
        console.error('Error al cargar especialidades:', err);
      } finally {
        setLoadingEspecialidades(false);
      }
    };

    loadEspecialidades();
  }, []);

  // Cargar datos del proveedor si está en modo edición
  useEffect(() => {
    const loadProveedor = async () => {
      if (!isEditMode || !id) return;

      try {
        setLoadingData(true);
        const proveedor = await fetchProveedorById(Number(id));
        
        if (!proveedor) {
          setError('Proveedor no encontrado');
          setTimeout(() => navigate(getAreaPath('actuales')), 2000);
          return;
        }

        // Cargar los datos en el formulario
        // Si hay evaluación, usarla; si no, usar null
        const evaluacionValue = proveedor.evaluacion !== null && proveedor.evaluacion !== undefined 
          ? Number(proveedor.evaluacion) 
          : null;
        
        // Si hay clasificación guardada, usarla; si no, calcularla desde la evaluación
        const clasificacionValue = proveedor.clasificacion 
          ? proveedor.clasificacion 
          : (evaluacionValue !== null ? calcularClasificacion(evaluacionValue) : null);

        setFormData({
          nombre_proveedor: proveedor.nombre_proveedor || '',
          rut: proveedor.rut || '',
          razon_social: proveedor.razon_social || '',
          correo_contacto: proveedor.correo_contacto || '',
          tipo_proveedor: proveedor.tipo_proveedor || 'Empresa',
          evaluacion: evaluacionValue,
          clasificacion: clasificacionValue,
        });

        // Cargar especialidades del proveedor desde brg_core_proveedor_especialidad
        try {
          const especialidadesProveedor = await fetchEspecialidadesByNombreProveedor(
            proveedor.nombre_proveedor || ''
          );

          // Convertir los nombres de especialidad a IDs según el catálogo cargado
          setEspecialidadesSeleccionadas((prev) => {
            // Usar el catálogo actual de especialidades para mapear nombres -> ids
            const ids = especialidades
              .filter((esp) => especialidadesProveedor.includes(esp.nombre))
              .map((esp) => esp.id);
            return ids;
          });
        } catch (err) {
          console.warn('No se pudieron cargar las especialidades del proveedor:', err);
        }
      } catch (err: any) {
        console.error('Error al cargar proveedor:', err);
        setError('Error al cargar los datos del proveedor');
      } finally {
        setLoadingData(false);
      }
    };

    loadProveedor();
  }, [id, isEditMode, navigate, especialidades]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Si es el campo de evaluación, convertir a número
    if (name === 'evaluacion') {
      const numValue = value === '' ? null : Number(value);
      // Validar que esté entre 0 y 100
      if (numValue !== null && (numValue < 0 || numValue > 100)) {
        setError('La evaluación debe estar entre 0 y 100');
        return;
      }
      setFormData((prev) => ({
        ...prev,
        [name]: numValue,
        clasificacion: calcularClasificacion(numValue),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value || null,
      }));
    }
    setError(null);
  };

  const handleEspecialidadChange = (especialidadId: number) => {
    setEspecialidadesSeleccionadas((prev) => {
      if (prev.includes(especialidadId)) {
        return prev.filter((id) => id !== especialidadId);
      } else {
        return [...prev, especialidadId];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validar que el nombre_proveedor no esté vacío
      if (!formData.nombre_proveedor.trim()) {
        setError('El nombre del proveedor es requerido');
        setLoading(false);
        return;
      }

      // Preparar los datos para enviar (convertir strings vacíos a null)
      const dataToSend: ProveedorData = {
        nombre_proveedor: formData.nombre_proveedor.trim(),
        rut: formData.rut?.trim() || null,
        razon_social: formData.razon_social?.trim() || null,
        correo_contacto: formData.correo_contacto?.trim() || null,
        tipo_proveedor: formData.tipo_proveedor || null,
        evaluacion: formData.evaluacion ?? null,
        clasificacion: clasificacionCalculada,
      };

      if (isEditMode && id) {
        await updateProveedor(Number(id), dataToSend);
      } else {
        await createProveedor(dataToSend);
      }

      // Obtener los nombres de las especialidades seleccionadas a partir de sus IDs
      const especialidadesSeleccionadasNombres = especialidades
        .filter((esp) => especialidadesSeleccionadas.includes(esp.id))
        .map((esp) => esp.nombre);

      // Guardar las especialidades seleccionadas en brg_core_proveedor_especialidad
      await saveProveedorEspecialidades(
        dataToSend.nombre_proveedor,
        dataToSend.rut || null,
        especialidadesSeleccionadasNombres
      );

      // Redirigir a la lista de proveedores actuales
      navigate(getAreaPath('actuales'));
    } catch (err: any) {
      console.error('Error al crear proveedor:', err);
      setError(
        err.message || 'Error al guardar el proveedor. Por favor, intente nuevamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(getAreaPath('actuales'));
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-[#111318] mb-1">
                {isEditMode ? 'Editar Proveedor' : 'Nuevo Proveedor'}
              </h1>
              <p className="text-sm text-gray-500">
                {isEditMode
                  ? 'Modifique los datos del proveedor y guarde los cambios.'
                  : 'Complete el formulario para agregar un nuevo proveedor a la base de datos.'}
              </p>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/40 p-6 lg:p-8">
          {loadingData ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-gray-500">Cargando datos del proveedor...</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Mensaje de error */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                  <span className="material-symbols-outlined">error</span>
                  <span>{error}</span>
                </div>
              )}

            {/* Primera fila: Nombre y Tipo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="nombre_proveedor" className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Proveedor <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="nombre_proveedor"
                  name="nombre_proveedor"
                  value={formData.nombre_proveedor}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  placeholder="Ej: AGQ Chile SA"
                />
              </div>
              <div>
                <label htmlFor="tipo_proveedor" className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Proveedor
                </label>
                <select
                  id="tipo_proveedor"
                  name="tipo_proveedor"
                  value={formData.tipo_proveedor || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all bg-white"
                >
                  <option value="Empresa">Empresa</option>
                  <option value="Persona natural">Persona natural</option>
                </select>
              </div>
            </div>

            {/* Segunda fila: RUT y Razón Social */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="rut" className="block text-sm font-medium text-gray-700 mb-2">
                  RUT
                </label>
                <input
                  type="text"
                  id="rut"
                  name="rut"
                  value={formData.rut || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  placeholder="Ej: 96.964.370-7"
                />
              </div>
              <div>
                <label htmlFor="razon_social" className="block text-sm font-medium text-gray-700 mb-2">
                  Razón Social
                </label>
                <input
                  type="text"
                  id="razon_social"
                  name="razon_social"
                  value={formData.razon_social || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  placeholder="Ej: AGQ Chile SA"
                />
              </div>
            </div>

            {/* Tercera fila: Correo */}
            <div>
              <label htmlFor="correo_contacto" className="block text-sm font-medium text-gray-700 mb-2">
                Correo de Contacto
              </label>
              <input
                type="email"
                id="correo_contacto"
                name="correo_contacto"
                value={formData.correo_contacto || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                placeholder="Ej: contacto@proveedor.cl"
              />
            </div>

            {/* Cuarta fila: Especialidades */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Especialidades
              </label>
              {loadingEspecialidades ? (
                <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50">
                  <span className="text-sm text-gray-500">Cargando especialidades...</span>
                </div>
              ) : (
                <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 max-h-48 overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {especialidades.map((esp) => (
                      <label
                        key={esp.id}
                        className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-white transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={especialidadesSeleccionadas.includes(esp.id)}
                          onChange={() => handleEspecialidadChange(esp.id)}
                          className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary focus:ring-2"
                        />
                        <span className="text-sm text-gray-700">{esp.nombre}</span>
                      </label>
                    ))}
                  </div>
                  {especialidadesSeleccionadas.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        {especialidadesSeleccionadas.length} especialidad{especialidadesSeleccionadas.length !== 1 ? 'es' : ''} seleccionada{especialidadesSeleccionadas.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quinta fila eliminada: Evaluación y Clasificación (no se muestra en esta pantalla) */}

            {/* Botones */}
            <div className="flex items-center justify-end gap-4 pt-3 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">save</span>
                    <span>Guardar Proveedor</span>
                  </>
                )}
              </button>
            </div>
          </form>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>© 2024 MyMALAB. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
};

export default NuevoProveedor;


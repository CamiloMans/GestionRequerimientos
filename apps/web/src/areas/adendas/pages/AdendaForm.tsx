import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TipoAdendaSelector from '../components/TipoAdendaSelector';
import { TipoAdenda } from '../constants';
import { NewAdendaPayload, Adenda } from '../types';
import { fetchAdendaById, createAdenda, updateAdenda } from '../services/adendasService';

interface AdendaFormProps {
  onBack?: () => void;
  onSave?: () => void;
}

const AdendaForm: React.FC<AdendaFormProps> = ({ onBack, onSave }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;

  const [tipo, setTipo] = useState<TipoAdenda | undefined>(undefined);
  const [codigoMyma, setCodigoMyma] = useState('');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [estado, setEstado] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing && id) {
      loadAdenda(parseInt(id));
    }
  }, [isEditing, id]);

  const loadAdenda = async (adendaId: number) => {
    try {
      setLoading(true);
      const adenda = await fetchAdendaById(adendaId);
      if (adenda) {
        setTipo(adenda.tipo);
        setCodigoMyma(adenda.codigo_myma || '');
        setNombre(adenda.nombre || '');
        setDescripcion(adenda.descripcion || '');
        setEstado(adenda.estado || '');
      }
    } catch (error) {
      console.error('Error loading adenda:', error);
      setError('Error al cargar la adenda');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tipo) {
      setError('Debe seleccionar un tipo de adenda');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload: NewAdendaPayload = {
        tipo,
        codigo_myma: codigoMyma || undefined,
        nombre: nombre || undefined,
        descripcion: descripcion || undefined,
        estado: estado || undefined,
      };

      if (isEditing && id) {
        await updateAdenda(parseInt(id), payload);
      } else {
        await createAdenda(payload);
      }

      if (onSave) {
        onSave();
      } else {
        navigate('');
      }
    } catch (error) {
      console.error('Error saving adenda:', error);
      setError('Error al guardar la adenda. Por favor, intente nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('');
    }
  };

  const handleFileSelect = (file: File) => {
    if (file.type === 'application/pdf') {
      setArchivo(file);
      setError(null);
    } else {
      setError('Por favor, seleccione un archivo PDF válido.');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemoveFile = () => {
    setArchivo(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600">Cargando adenda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-6 bg-[#f8fafc] min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-[#111318] mb-4 transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            <span>Volver</span>
          </button>
          <h1 className="text-3xl font-bold text-[#111318]">
            {isEditing ? 'Editar Adenda' : 'Nueva Adenda'}
          </h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Tipo de Adenda Selector */}
            <div>
              <label className="block text-sm font-medium text-[#111318] mb-2">
                Tipo de Adenda <span className="text-red-500">*</span>
              </label>
              <TipoAdendaSelector value={tipo} onChange={setTipo} />
            </div>

            {/* Código MyMA */}
            <div>
              <label className="block text-sm font-medium text-[#111318] mb-2">
                Código MyMA
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={codigoMyma}
                  onChange={(e) => setCodigoMyma(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Ej: MY-50-2025"
                  list="codigos-myma"
                />
                <datalist id="codigos-myma">
                  <option value="MY-50-2025" />
                  <option value="MY-15-2025" />
                  <option value="MY-22-2025" />
                  <option value="MY-16-2025" />
                  <option value="MY-98-2025" />
                </datalist>
              </div>
            </div>

            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-[#111318] mb-2">
                Nombre
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Ingrese el nombre de la adenda"
              />
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-[#111318] mb-2">
                Descripción
              </label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Ingrese la descripción de la adenda"
              />
            </div>

            {/* Estado */}
            <div>
              <label className="block text-sm font-medium text-[#111318] mb-2">
                Estado
              </label>
              <input
                type="text"
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Ingrese el estado"
              />
            </div>

            {/* Carga de Archivo PDF */}
            <div>
              <label className="block text-sm font-medium text-[#111318] mb-2">
                Archivo PDF
              </label>
              
              {archivo ? (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-red-600 text-2xl">description</span>
                      <div>
                        <p className="text-sm font-medium text-[#111318]">{archivo.name}</p>
                        <p className="text-xs text-gray-500">
                          {(archivo.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="text-red-600 hover:text-red-700 transition-colors"
                      title="Eliminar archivo"
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      isDragging
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-300 bg-gray-50 hover:border-gray-400'
                    }`}
                  >
                    <span className="material-symbols-outlined text-6xl text-gray-400 mb-4 block">
                      description
                    </span>
                    <p className="text-sm text-gray-600 mb-2">Arrastra tu archivo aquí</p>
                    <span className="text-gray-400 text-sm">o</span>
                    <label className="block mt-2">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileInputChange}
                        className="hidden"
                        id="file-input"
                      />
                      <span className="inline-block px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-[#111318] hover:bg-gray-50 cursor-pointer transition-colors">
                        Seleccionar archivo
                      </span>
                    </label>
                  </div>
                  
                  {/* Mensaje de advertencia */}
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                    <span className="material-symbols-outlined text-yellow-600 text-lg">warning</span>
                    <p className="text-sm text-yellow-800">
                      Asegúrate de que el archivo sea un PDF válido para procesar la adenda.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2 border border-gray-200 rounded-lg text-[#111318] hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !tipo}
              className="px-4 py-2 bg-[#059669] text-white rounded-lg hover:bg-[#047857] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdendaForm;


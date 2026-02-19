import React, { useState, useEffect } from 'react';
import { AccessRequest, fetchPendingAccessRequests, approveAccessRequest, rejectAccessRequest, PermissionType } from './accessRequestsService';
import { formatModuleName } from './modulesService';

interface AccessRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AccessRequestsModal: React.FC<AccessRequestsModalProps> = ({ isOpen, onClose }) => {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectConfirm, setRejectConfirm] = useState<{ show: boolean; requestId: number | null; requestInfo: AccessRequest | null }>({
    show: false,
    requestId: null,
    requestInfo: null,
  });
  const [approveConfirm, setApproveConfirm] = useState<{ show: boolean; requestId: number | null; requestInfo: AccessRequest | null }>({
    show: false,
    requestId: null,
    requestInfo: null,
  });
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionType[]>(['view']);

  useEffect(() => {
    if (isOpen) {
      loadRequests();
    }
  }, [isOpen]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchPendingAccessRequests();
      setRequests(data);
    } catch (err: any) {
      console.error('Error loading requests:', err);
      setError('Error al cargar las solicitudes');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveClick = (request: AccessRequest) => {
    setSelectedPermissions(['view']); // Reset a solo view por defecto
    setApproveConfirm({
      show: true,
      requestId: request.id,
      requestInfo: request,
    });
  };

  const togglePermission = (perm: PermissionType) => {
    setSelectedPermissions((prev) => {
      if (prev.includes(perm)) {
        // Si está seleccionado, removerlo (excepto view que siempre debe estar)
        if (perm === 'view') return prev; // View siempre debe estar
        return prev.filter((p) => p !== perm);
      } else {
        // Si no está seleccionado, agregarlo
        return [...prev, perm];
      }
    });
  };

  const handleApproveConfirm = async () => {
    if (!approveConfirm.requestId || selectedPermissions.length === 0) return;

    try {
      setProcessingId(approveConfirm.requestId);
      setApproveConfirm({ show: false, requestId: null, requestInfo: null });
      await approveAccessRequest(approveConfirm.requestId, selectedPermissions);
      await loadRequests(); // Recargar lista
    } catch (err: any) {
      console.error('Error approving request:', err);
      alert('Error al aprobar la solicitud. Por favor, inténtalo de nuevo.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveCancel = () => {
    setApproveConfirm({ show: false, requestId: null, requestInfo: null });
    setSelectedPermissions(['view']);
  };

  const handleRejectClick = (request: AccessRequest) => {
    setRejectConfirm({
      show: true,
      requestId: request.id,
      requestInfo: request,
    });
  };

  const handleRejectConfirm = async () => {
    if (!rejectConfirm.requestId) return;

    try {
      setProcessingId(rejectConfirm.requestId);
      setRejectConfirm({ show: false, requestId: null, requestInfo: null });
      await rejectAccessRequest(rejectConfirm.requestId);
      await loadRequests(); // Recargar lista
    } catch (err: any) {
      console.error('Error rejecting request:', err);
      alert('Error al rechazar la solicitud. Por favor, inténtalo de nuevo.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectCancel = () => {
    setRejectConfirm({ show: false, requestId: null, requestInfo: null });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Solicitudes de Acceso Pendientes
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Gestiona las solicitudes de acceso a módulos
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span className="material-symbols-outlined text-gray-600">close</span>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                <span className="ml-3 text-gray-600">Cargando solicitudes...</span>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <span className="material-symbols-outlined text-gray-400 text-3xl">check_circle</span>
                </div>
                <p className="text-gray-600 font-medium">No hay solicitudes pendientes</p>
                <p className="text-gray-500 text-sm mt-1">
                  Todas las solicitudes han sido procesadas
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {/* Información del usuario */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-blue-500 flex items-center justify-center">
                            <span className="text-white text-sm font-semibold">
                              {request.user_name?.charAt(0).toUpperCase() ||
                                request.user_email?.charAt(0).toUpperCase() ||
                                'U'}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {request.user_name || 'Usuario sin nombre'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {request.user_email}
                            </p>
                          </div>
                        </div>

                        {/* Módulo solicitado */}
                        <div className="mb-3">
                          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-100 text-teal-800 text-sm font-medium">
                            <span className="material-symbols-outlined text-sm">category</span>
                            {formatModuleName(request.modulo_solicitado)}
                          </span>
                        </div>

                        {/* Mensaje */}
                        {request.mensaje && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-gray-700 mb-1">Mensaje:</p>
                            <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                              {request.mensaje}
                            </p>
                          </div>
                        )}

                        {/* Fecha */}
                        <p className="text-xs text-gray-400">
                          Solicitado el {new Date(request.created_at).toLocaleString('es-ES')}
                        </p>
                      </div>

                      {/* Acciones */}
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleApproveClick(request)}
                          disabled={processingId === request.id}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          {processingId === request.id ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>Procesando...</span>
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-sm">check</span>
                              <span>Aprobar</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleRejectClick(request)}
                          disabled={processingId === request.id}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          {processingId === request.id ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>Procesando...</span>
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-sm">close</span>
                              <span>Rechazar</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              {requests.length > 0 && (
                <span>
                  {requests.length} solicitud{requests.length !== 1 ? 'es' : ''} pendiente{requests.length !== 1 ? 's' : ''}
                </span>
              )}
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* Modal de confirmación para rechazar */}
      {rejectConfirm.show && rejectConfirm.requestInfo && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
            onClick={handleRejectCancel}
          />
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header con icono de advertencia */}
              <div className="bg-gradient-to-br from-red-50 to-orange-50 p-6 text-center border-b border-red-100">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                  <span className="material-symbols-outlined text-red-600 text-4xl">warning</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  ¿Rechazar solicitud?
                </h3>
                <p className="text-sm text-gray-600">
                  Esta acción no se puede deshacer
                </p>
              </div>

              {/* Información de la solicitud */}
              <div className="p-6 space-y-4">
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-blue-500 flex items-center justify-center">
                      <span className="text-white text-xs font-semibold">
                        {rejectConfirm.requestInfo.user_name?.charAt(0).toUpperCase() ||
                          rejectConfirm.requestInfo.user_email?.charAt(0).toUpperCase() ||
                          'U'}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">
                        {rejectConfirm.requestInfo.user_name || 'Usuario sin nombre'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {rejectConfirm.requestInfo.user_email}
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-gray-200">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-100 text-teal-800 text-xs font-medium">
                      <span className="material-symbols-outlined text-xs">category</span>
                      {formatModuleName(rejectConfirm.requestInfo.modulo_solicitado)}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-gray-600 text-center">
                  ¿Estás seguro de que deseas <strong className="text-red-600">rechazar</strong> esta solicitud de acceso?
                </p>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3 p-6 bg-gray-50 border-t border-gray-200">
                <button
                  onClick={handleRejectCancel}
                  className="flex-1 px-4 py-2.5 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium border border-gray-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRejectConfirm}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2 shadow-sm"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                  Sí, rechazar
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal de confirmación para aprobar con selección de permisos */}
      {approveConfirm.show && approveConfirm.requestInfo && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
            onClick={handleApproveCancel}
          />
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header con icono de éxito */}
              <div className="bg-gradient-to-br from-green-50 to-teal-50 p-6 text-center border-b border-green-100">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                  <span className="material-symbols-outlined text-green-600 text-4xl">check_circle</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Aprobar solicitud
                </h3>
                <p className="text-sm text-gray-600">
                  Selecciona los permisos a otorgar
                </p>
              </div>

              {/* Información de la solicitud */}
              <div className="p-6 space-y-4">
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-blue-500 flex items-center justify-center">
                      <span className="text-white text-xs font-semibold">
                        {approveConfirm.requestInfo.user_name?.charAt(0).toUpperCase() ||
                          approveConfirm.requestInfo.user_email?.charAt(0).toUpperCase() ||
                          'U'}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">
                        {approveConfirm.requestInfo.user_name || 'Usuario sin nombre'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {approveConfirm.requestInfo.user_email}
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-gray-200">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-100 text-teal-800 text-xs font-medium">
                      <span className="material-symbols-outlined text-xs">category</span>
                      {formatModuleName(approveConfirm.requestInfo.modulo_solicitado)}
                    </span>
                  </div>
                </div>

                {/* Selección de permisos */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">
                    Permisos a otorgar:
                  </p>
                  <div className="space-y-2">
                    {/* View - Siempre seleccionado y deshabilitado */}
                    <label className="flex items-center gap-3 p-3 rounded-lg border-2 border-green-500 bg-green-50 cursor-not-allowed">
                      <div className="w-5 h-5 rounded border-2 border-green-500 bg-green-500 flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">View</div>
                        <div className="text-xs text-gray-500">Ver contenido del módulo (requerido)</div>
                      </div>
                    </label>

                    {/* Edit */}
                    <label
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                        selectedPermissions.includes('edit')
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
                      }`}
                      onClick={() => togglePermission('edit')}
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          selectedPermissions.includes('edit')
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300'
                        }`}
                      >
                        {selectedPermissions.includes('edit') && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">Edit</div>
                        <div className="text-xs text-gray-500">Editar y modificar contenido</div>
                      </div>
                    </label>

                    {/* Admin */}
                    <label
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                        selectedPermissions.includes('admin')
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/50'
                      }`}
                      onClick={() => togglePermission('admin')}
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          selectedPermissions.includes('admin')
                            ? 'border-purple-500 bg-purple-500'
                            : 'border-gray-300'
                        }`}
                      >
                        {selectedPermissions.includes('admin') && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">Admin</div>
                        <div className="text-xs text-gray-500">Administrar módulo y gestionar solicitudes</div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3 p-6 bg-gray-50 border-t border-gray-200">
                <button
                  onClick={handleApproveCancel}
                  className="flex-1 px-4 py-2.5 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium border border-gray-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleApproveConfirm}
                  className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2 shadow-sm"
                >
                  <span className="material-symbols-outlined text-sm">check</span>
                  Aprobar con permisos
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default AccessRequestsModal;


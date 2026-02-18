import React, { useState, useEffect } from 'react';
import { useAreas } from './useAreas';
import { getUserPermissions, fetchUserPermissions } from './permissionsService';
import { AreaId } from '@contracts/areas';

/**
 * Componente de debug temporal para mostrar permisos del usuario
 * Se puede eliminar después de verificar que todo funciona correctamente
 */
const PermissionsDebug: React.FC = () => {
  const { areas, permissions, loading } = useAreas();
  const [rawPermissions, setRawPermissions] = useState<any[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const loadRawPermissions = async () => {
      const raw = await fetchUserPermissions();
      setRawPermissions(raw);
    };
    loadRawPermissions();
  }, []);

  if (loading) {
    return (
      <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-xs z-50">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-primary rounded-full animate-spin"></div>
          <span>Cargando permisos...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border-2 border-blue-300 rounded-lg shadow-xl p-4 text-xs z-50 max-w-md">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-2 font-semibold text-blue-700 hover:text-blue-900"
      >
        <span>🔐 Debug: Permisos del Usuario</span>
        <span className="material-symbols-outlined text-sm">
          {isExpanded ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {isExpanded && (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {/* Áreas visibles */}
          <div>
            <div className="font-semibold text-gray-700 mb-1">🎯 Áreas Visibles:</div>
            <div className="flex flex-wrap gap-1">
              {areas.length > 0 ? (
                areas.map((areaId) => (
                  <span
                    key={areaId}
                    className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium"
                  >
                    {areaId}
                  </span>
                ))
              ) : (
                <span className="text-gray-500">Ninguna</span>
              )}
            </div>
          </div>

          {/* Permisos por módulo */}
          <div>
            <div className="font-semibold text-gray-700 mb-1">📋 Permisos por Módulo:</div>
            <div className="space-y-2">
              {Object.keys(permissions).length > 0 ? (
                Object.entries(permissions).map(([module, perms]) => (
                  <div key={module} className="bg-gray-50 p-2 rounded">
                    <div className="font-medium text-gray-800 mb-1">{module}:</div>
                    <div className="flex flex-wrap gap-1">
                      {perms.view && (
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">view</span>
                      )}
                      {perms.create && (
                        <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">create</span>
                      )}
                      {perms.edit && (
                        <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">edit</span>
                      )}
                      {perms.delete && (
                        <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs">delete</span>
                      )}
                      {perms.admin && (
                        <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">admin</span>
                      )}
                      {!perms.view && !perms.create && !perms.edit && !perms.delete && !perms.admin && (
                        <span className="text-gray-400 text-xs">Sin permisos</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <span className="text-gray-500">No hay permisos configurados</span>
              )}
            </div>
          </div>

          {/* Permisos raw de la vista */}
          <div>
            <div className="font-semibold text-gray-700 mb-1">📊 Raw de v_my_permissions:</div>
            <div className="bg-gray-50 p-2 rounded max-h-32 overflow-y-auto">
              {rawPermissions.length > 0 ? (
                <pre className="text-xs text-gray-600">
                  {JSON.stringify(rawPermissions, null, 2)}
                </pre>
              ) : (
                <span className="text-gray-500">No hay datos</span>
              )}
            </div>
          </div>

          {/* Verificación de áreas específicas */}
          <div>
            <div className="font-semibold text-gray-700 mb-1">✅ Verificación de Acceso:</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={areas.includes(AreaId.ACREDITACION) ? 'text-green-600' : 'text-red-600'}>
                  {areas.includes(AreaId.ACREDITACION) ? '✅' : '❌'}
                </span>
                <span>Acreditaciones: {areas.includes(AreaId.ACREDITACION) ? 'Visible' : 'Oculta'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={areas.includes(AreaId.PROVEEDORES) ? 'text-green-600' : 'text-red-600'}>
                  {areas.includes(AreaId.PROVEEDORES) ? '✅' : '❌'}
                </span>
                <span>Proveedores: {areas.includes(AreaId.PROVEEDORES) ? 'Visible' : 'Oculta'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={areas.includes(AreaId.PERSONAS) ? 'text-green-600' : 'text-red-600'}>
                  {areas.includes(AreaId.PERSONAS) ? '✅' : '❌'}
                </span>
                <span>Personas: {areas.includes(AreaId.PERSONAS) ? 'Visible' : 'Oculta'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={areas.includes(AreaId.ADENDAS) ? 'text-green-600' : 'text-red-600'}>
                  {areas.includes(AreaId.ADENDAS) ? '✅' : '❌'}
                </span>
                <span>Adendas: {areas.includes(AreaId.ADENDAS) ? 'Visible' : 'Oculta'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermissionsDebug;


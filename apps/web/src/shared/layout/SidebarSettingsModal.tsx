import React from 'react';
import PermissionsDebug from '@shared/rbac/PermissionsDebug';

interface SidebarSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SidebarSettingsModal: React.FC<SidebarSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[70]" onClick={onClose} />

      <div className="fixed inset-0 z-[71] flex items-center justify-center p-4">
        <div
          className="w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-[#111318]">Configuracion</h2>
              <p className="text-sm text-[#616f89] mt-1">
                Revisa los permisos del usuario sin tener el panel debug visible en toda la
                pantalla.
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-104px)]">
            <PermissionsDebug variant="inline" defaultExpanded />
          </div>
        </div>
      </div>
    </>
  );
};

export default SidebarSettingsModal;

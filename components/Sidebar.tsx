import React from 'react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToRequests?: () => void;
  onNavigateToFieldRequest?: () => void;
  onNavigateToReports?: () => void;
  activeView?: 'list' | 'create' | 'fieldRequest' | 'reports';
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onNavigateToRequests, onNavigateToFieldRequest, onNavigateToReports, activeView }) => {
  const isRequestsActive = activeView === 'list' || activeView === 'create';
  const isFieldRequestActive = activeView === 'fieldRequest';
  const isReportsActive = activeView === 'reports';
  const handleRequestsClick = () => {
    console.log('🖱️ Click en Solicitudes detectado!');
    if (onNavigateToRequests) {
      onNavigateToRequests();
    }
    onClose();
  };

  const handleFieldRequestClick = () => {
    console.log('🖱️ Click en Proyectos detectado!');
    if (onNavigateToFieldRequest) {
      onNavigateToFieldRequest();
    }
    onClose();
  };

  const handleReportsClick = () => {
    console.log('🖱️ Click en Reportes detectado!');
    if (onNavigateToReports) {
      onNavigateToReports();
    }
    onClose();
  };

  return (
    <>
      {/* Overlay para móvil */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside 
        className={`
          fixed top-0 left-0 flex-col border-r border-[#e5e7eb] bg-white
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex
        `}
        style={{ 
          zIndex: 9999, 
          width: '80px', 
          minWidth: '80px', 
          maxWidth: '80px',
          height: '100vh',
          position: 'fixed'
        }}
      >
        <div className="flex h-full flex-col justify-between py-6 w-full items-center">
          <div className="flex flex-col gap-6 w-full items-center">
            {/* Logo MyMA */}
            <div className="flex flex-col items-center justify-center">
              <div 
                className="size-12 rounded-full bg-gradient-to-br from-teal-700 to-teal-900 flex items-center justify-center shadow-lg border-2 border-teal-600"
                title="MyMA - Sistema de Gestión"
              >
                <span className="text-white font-bold text-sm tracking-tight">MyMA</span>
              </div>
            </div>
            
            {/* Navigation */}
            <nav className="flex flex-col gap-3 w-full px-3">
              {/* Inicio */}
              <button 
                className="flex items-center justify-center p-3 rounded-lg text-[#616f89] hover:bg-gray-100 w-full aspect-square transition-colors" 
                title="Inicio"
              >
                <span className="material-symbols-outlined text-2xl pointer-events-none">home</span>
              </button>
              
              {/* Solicitudes */}
              <button 
                onClick={handleRequestsClick}
                className={`flex items-center justify-center p-3 rounded-lg w-full aspect-square transition-colors ${
                  isRequestsActive 
                    ? 'bg-primary text-white hover:bg-primary-hover' 
                    : 'text-[#616f89] hover:bg-gray-100'
                }`}
                title="Solicitudes"
              >
                <span className="material-symbols-outlined fill text-2xl pointer-events-none">grid_view</span>
              </button>
              
              {/* Proyectos */}
              <button 
                onClick={handleFieldRequestClick}
                className={`flex items-center justify-center p-3 rounded-lg w-full aspect-square transition-colors ${
                  isFieldRequestActive 
                    ? 'bg-primary text-white hover:bg-primary-hover' 
                    : 'text-[#616f89] hover:bg-gray-100'
                }`}
                title="Proyectos"
              >
                <span className="material-symbols-outlined text-2xl pointer-events-none">work</span>
              </button>
              
              {/* Reportes */}
              <button 
                onClick={handleReportsClick}
                className={`flex items-center justify-center p-3 rounded-lg w-full aspect-square transition-colors ${
                  isReportsActive 
                    ? 'bg-primary text-white hover:bg-primary-hover' 
                    : 'text-[#616f89] hover:bg-gray-100'
                }`}
                title="Reportes"
              >
                <span className="material-symbols-outlined text-2xl pointer-events-none">bar_chart</span>
              </button>
              
              {/* Configuración */}
              <button 
                className="flex items-center justify-center p-3 rounded-lg text-[#616f89] hover:bg-gray-100 w-full aspect-square transition-colors" 
                title="Configuración"
              >
                <span className="material-symbols-outlined text-2xl pointer-events-none">settings</span>
              </button>
            </nav>
          </div>
          
          {/* Logout Button */}
          <div className="w-full px-3">
            <button 
              className="flex items-center justify-center w-full aspect-square p-3 rounded-lg text-[#616f89] hover:bg-gray-100 transition-colors" 
              title="Cerrar Sesión"
            >
              <span className="material-symbols-outlined text-2xl pointer-events-none">logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

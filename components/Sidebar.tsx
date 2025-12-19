import React from 'react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToRequests?: () => void;
  onNavigateToFieldRequest?: () => void;
  onNavigateToReports?: () => void;
  activeView?: 'list' | 'create' | 'fieldRequest' | 'reports';
  hideOnDesktop?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onNavigateToRequests, onNavigateToFieldRequest, onNavigateToReports, activeView, hideOnDesktop = false }) => {
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
          ${isOpen ? 'translate-x-0' : hideOnDesktop ? '-translate-x-full' : '-translate-x-full lg:translate-x-0'}
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
        <div className="flex h-full flex-col justify-between py-4 w-full">
          <div className="flex flex-col gap-1 w-full">
            {/* Logo MyMA */}
            <div className="flex flex-col items-center justify-center mb-6 px-3">
              <div 
                className="size-14 rounded-xl bg-gradient-to-br from-teal-600 to-teal-800 flex items-center justify-center shadow-md border border-teal-500/20 transition-transform hover:scale-105"
                title="MyMA - Sistema de Gestión"
              >
                <span className="text-white font-bold text-sm tracking-tight">MyMA</span>
              </div>
            </div>
            
            {/* Navigation */}
            <nav className="flex flex-col gap-1 w-full px-2">
              {/* Inicio */}
              <button 
                className="group flex items-center justify-center p-3 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-gray-900 w-full transition-all duration-200 hover:shadow-sm relative" 
                title="Dashboard"
              >
                <span className="material-symbols-outlined text-2xl pointer-events-none transition-transform group-hover:scale-110">dashboard</span>
                <span className="absolute left-full ml-3 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity duration-200">
                  Dashboard
                </span>
              </button>
              
              {/* Solicitudes */}
              <button 
                onClick={handleRequestsClick}
                className={`group flex items-center justify-center p-3 rounded-xl w-full transition-all duration-200 relative ${
                  isRequestsActive 
                    ? 'bg-primary text-white shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 hover:shadow-sm'
                }`}
                title="Solicitudes de Acreditación"
              >
                <span className={`material-symbols-outlined text-2xl pointer-events-none transition-transform group-hover:scale-110 ${isRequestsActive ? 'fill' : ''}`}>description</span>
                <span className={`absolute left-full ml-3 px-2 py-1 text-xs rounded whitespace-nowrap pointer-events-none transition-opacity duration-200 ${
                  isRequestsActive 
                    ? 'bg-primary text-white opacity-0 group-hover:opacity-100' 
                    : 'bg-gray-900 text-white opacity-0 group-hover:opacity-100'
                }`}>
                  Solicitudes
                </span>
              </button>
              
              {/* Proyectos */}
              <button 
                onClick={handleFieldRequestClick}
                className={`group flex items-center justify-center p-3 rounded-xl w-full transition-all duration-200 relative ${
                  isFieldRequestActive 
                    ? 'bg-primary text-white shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 hover:shadow-sm'
                }`}
                title="Proyectos de Campo"
              >
                <span className={`material-symbols-outlined text-2xl pointer-events-none transition-transform group-hover:scale-110 ${isFieldRequestActive ? 'fill' : ''}`}>engineering</span>
                <span className={`absolute left-full ml-3 px-2 py-1 text-xs rounded whitespace-nowrap pointer-events-none transition-opacity duration-200 ${
                  isFieldRequestActive 
                    ? 'bg-primary text-white opacity-0 group-hover:opacity-100' 
                    : 'bg-gray-900 text-white opacity-0 group-hover:opacity-100'
                }`}>
                  Proyectos
                </span>
              </button>
              
              {/* Reportes */}
              <button 
                onClick={handleReportsClick}
                className={`group flex items-center justify-center p-3 rounded-xl w-full transition-all duration-200 relative ${
                  isReportsActive 
                    ? 'bg-primary text-white shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 hover:shadow-sm'
                }`}
                title="Reportes y Análisis"
              >
                <span className={`material-symbols-outlined text-2xl pointer-events-none transition-transform group-hover:scale-110 ${isReportsActive ? 'fill' : ''}`}>assessment</span>
                <span className={`absolute left-full ml-3 px-2 py-1 text-xs rounded whitespace-nowrap pointer-events-none transition-opacity duration-200 ${
                  isReportsActive 
                    ? 'bg-primary text-white opacity-0 group-hover:opacity-100' 
                    : 'bg-gray-900 text-white opacity-0 group-hover:opacity-100'
                }`}>
                  Reportes
                </span>
              </button>
              
              {/* Configuración */}
              <button 
                className="group flex items-center justify-center p-3 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-gray-900 w-full transition-all duration-200 hover:shadow-sm relative mt-2" 
                title="Configuración"
              >
                <span className="material-symbols-outlined text-2xl pointer-events-none transition-transform group-hover:scale-110">settings</span>
                <span className="absolute left-full ml-3 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity duration-200">
                  Configuración
                </span>
              </button>
            </nav>
          </div>
          
          {/* Logout Button */}
          <div className="w-full px-2 mt-2 border-t border-gray-200 pt-2">
            <button 
              className="group flex items-center justify-center w-full p-3 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200 hover:shadow-sm relative" 
              title="Cerrar Sesión"
            >
              <span className="material-symbols-outlined text-2xl pointer-events-none transition-transform group-hover:scale-110">logout</span>
              <span className="absolute left-full ml-3 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity duration-200">
                Cerrar Sesión
              </span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

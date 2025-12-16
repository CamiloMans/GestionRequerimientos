import React from 'react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToRequests?: () => void;
  onNavigateToFieldRequest?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onNavigateToRequests, onNavigateToFieldRequest }) => {
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
          fixed lg:sticky top-0 h-screen w-20 flex-col border-r border-[#e5e7eb] bg-white
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex
        `}
        style={{ zIndex: 9999 }}
      >
        <div className="flex h-full flex-col justify-between py-6 w-full items-center">
          <div className="flex flex-col gap-6 w-full items-center">
            {/* Avatar */}
            <div className="flex flex-col items-center justify-center">
              <div 
                className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border border-gray-200 shadow-sm"
                style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBXVx6GxCSkS5BfutVlYARGWCwjweC4lytns7aqFA037MEqgU4t3yMIkGTVlGl9xLqeVPNoSydmdH5h64phcOSitbjwQhsdl5osCNYLTEk5wEH06dCOQ81_urNL-khLmhrShhz1grpX8S2ALrd7wqZ5v1om2QvUff89ecmVDHpAakAwvyznN8fXx5TjtUhzYfeovO0rWvb5UVdIDqDZwYrIKHg0CqobW26lRgYLnNRXv3TQwcEfCzc8T5sOQFEzvpxro2i6MzhKfq8")' }}
                title="Admin User"
              />
            </div>
            
            {/* Navigation */}
            <nav className="flex flex-col gap-3 w-full px-3">
              {/* Inicio */}
              <button 
                onClick={() => console.log('Click en Inicio')}
                className="flex items-center justify-center p-3 rounded-lg text-[#616f89] hover:bg-gray-100 w-full aspect-square transition-colors" 
                title="Inicio"
              >
                <span className="material-symbols-outlined pointer-events-none">home</span>
              </button>
              
              {/* Solicitudes */}
              <button 
                onClick={handleRequestsClick}
                className="flex items-center justify-center p-3 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 w-full aspect-square transition-colors" 
                title="Solicitudes"
              >
                <span className="material-symbols-outlined fill pointer-events-none">grid_view</span>
              </button>
              
              {/* Proyectos */}
              <button 
                onClick={handleFieldRequestClick}
                className="flex items-center justify-center p-3 rounded-lg text-[#616f89] hover:bg-gray-100 w-full aspect-square transition-colors" 
                title="Proyectos"
              >
                <span className="material-symbols-outlined pointer-events-none">work</span>
              </button>
              
              {/* Reportes */}
              <button 
                onClick={() => console.log('Click en Reportes')}
                className="flex items-center justify-center p-3 rounded-lg text-[#616f89] hover:bg-gray-100 w-full aspect-square transition-colors" 
                title="Reportes"
              >
                <span className="material-symbols-outlined pointer-events-none">bar_chart</span>
              </button>
              
              {/* Configuración */}
              <button 
                onClick={() => console.log('Click en Configuración')}
                className="flex items-center justify-center p-3 rounded-lg text-[#616f89] hover:bg-gray-100 w-full aspect-square transition-colors" 
                title="Configuración"
              >
                <span className="material-symbols-outlined pointer-events-none">settings</span>
              </button>
            </nav>
          </div>
          
          {/* Logout Button */}
          <div className="w-full px-3">
            <button 
              onClick={() => console.log('Click en Cerrar Sesión')}
              className="flex items-center justify-center w-full aspect-square p-3 rounded-lg text-[#616f89] hover:bg-gray-100 transition-colors" 
              title="Cerrar Sesión"
            >
              <span className="material-symbols-outlined pointer-events-none">logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

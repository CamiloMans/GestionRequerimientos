import React from 'react';

const Sidebar: React.FC = () => {
  return (
    <aside className="hidden w-20 flex-col border-r border-[#e5e7eb] bg-white lg:flex h-screen sticky top-0 transition-all duration-300 ease-in-out z-20">
      <div className="flex h-full flex-col justify-between py-6 w-full items-center">
        <div className="flex flex-col gap-6 w-full items-center">
          <div className="flex flex-col items-center justify-center">
            <div 
              className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border border-gray-200 shadow-sm"
              style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBXVx6GxCSkS5BfutVlYARGWCwjweC4lytns7aqFA037MEqgU4t3yMIkGTVlGl9xLqeVPNoSydmdH5h64phcOSitbjwQhsdl5osCNYLTEk5wEH06dCOQ81_urNL-khLmhrShhz1grpX8S2ALrd7wqZ5v1om2QvUff89ecmVDHpAakAwvyznN8fXx5TjtUhzYfeovO0rWvb5UVdIDqDZwYrIKHg0CqobW26lRgYLnNRXv3TQwcEfCzc8T5sOQFEzvpxro2i6MzhKfq8")' }}
              title="Admin User"
            />
          </div>
          <nav className="flex flex-col gap-3 w-full px-3">
            <button disabled className="flex items-center justify-center p-3 rounded-lg text-gray-300 cursor-not-allowed w-full aspect-square relative opacity-50" title="Inicio">
              <span className="material-symbols-outlined text-gray-300">home</span>
            </button>
            <button disabled className="flex items-center justify-center p-3 rounded-lg bg-gray-100 text-gray-300 cursor-not-allowed w-full aspect-square relative opacity-50" title="Solicitudes">
              <span className="material-symbols-outlined text-gray-300 fill">grid_view</span>
            </button>
            <button disabled className="flex items-center justify-center p-3 rounded-lg text-gray-300 cursor-not-allowed w-full aspect-square relative opacity-50" title="Proyectos">
              <span className="material-symbols-outlined text-gray-300">work</span>
            </button>
            <button disabled className="flex items-center justify-center p-3 rounded-lg text-gray-300 cursor-not-allowed w-full aspect-square relative opacity-50" title="Reportes">
              <span className="material-symbols-outlined text-gray-300">bar_chart</span>
            </button>
            <button disabled className="flex items-center justify-center p-3 rounded-lg text-gray-300 cursor-not-allowed w-full aspect-square relative opacity-50" title="Configuración">
              <span className="material-symbols-outlined text-gray-300">settings</span>
            </button>
          </nav>
        </div>
        <div className="w-full px-3">
          <button disabled className="flex items-center justify-center w-full aspect-square p-3 rounded-lg text-gray-300 cursor-not-allowed opacity-50" title="Cerrar Sesión">
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
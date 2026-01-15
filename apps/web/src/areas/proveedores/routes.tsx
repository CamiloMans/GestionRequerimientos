import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProveedoresActuales from './pages/ProveedoresActuales';
import ProveedoresPotenciales from './pages/ProveedoresPotenciales';
import NuevoProveedor from './pages/NuevoProveedor';
import ProveedorDetalle from './pages/ProveedorDetalle';
import NuevoServicio from './pages/NuevoServicio';
import EvaluacionServicios from './pages/EvaluacionServicios';

/**
 * Componente que maneja las rutas del área de Proveedores
 */
const ProveedoresRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="dashboard" element={<EvaluacionServicios />} />
      <Route path="actuales" element={<ProveedoresActuales />} />
      <Route path="actuales/nuevo" element={<NuevoProveedor />} />
      <Route path="actuales/:id" element={<ProveedorDetalle />} />
      <Route path="actuales/:id/editar" element={<NuevoProveedor />} />
      <Route path="actuales/:id/servicios/nuevo" element={<NuevoServicio />} />
      <Route path="potenciales" element={<ProveedoresPotenciales />} />
      <Route path="potenciales/nuevo" element={<div className="p-8">Formulario Nuevo Proveedor Potencial (por implementar)</div>} />
      <Route path="potenciales/:id/editar" element={<div className="p-8">Formulario Editar Proveedor Potencial (por implementar)</div>} />
      <Route path="evaluacion" element={<EvaluacionServicios />} />
      <Route path="reportes" element={<div className="p-8">Reportes (por implementar)</div>} />
      <Route path="/" element={<Navigate to="actuales" replace />} />
      <Route path="*" element={<Navigate to="actuales" replace />} />
    </Routes>
  );
};

export default ProveedoresRoutes;



import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DirectorioPersonas from './pages/DirectorioPersonas';
import ExperienciaProfesional from './pages/ExperienciaProfesional';
import FormacionAcademica from './pages/FormacionAcademica';
import Organigrama from './pages/Organigrama';
import Curriculum from './pages/Curriculum';

/**
 * Componente que maneja las rutas del área de Personas
 */
const PersonasRoutes: React.FC = () => {
  return (
    <Routes>
      <Route
        path="directorio"
        element={<DirectorioPersonas />}
      />
      <Route
        path="experiencia-profesional"
        element={<ExperienciaProfesional />}
      />
      <Route
        path="formacion-academica"
        element={<FormacionAcademica />}
      />
      <Route
        path="organigrama"
        element={<Organigrama />}
      />
      <Route
        path="curriculum"
        element={<Curriculum />}
      />
      <Route path="/" element={<Navigate to="directorio" replace />} />
      <Route path="*" element={<Navigate to="directorio" replace />} />
    </Routes>
  );
};

export default PersonasRoutes;


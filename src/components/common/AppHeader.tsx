import React from 'react';
import { FiFileText } from 'react-icons/fi';

export const AppHeader: React.FC = () => {
  return (
    <header className="app-header">
      <h1>
        <FiFileText size={32} />
        Generatore Registro Presenza Zoom
      </h1>
      <p>Genera automaticamente registri di presenza in formato Word dai report CSV di Zoom</p>
    </header>
  );
};

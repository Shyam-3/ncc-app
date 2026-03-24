import React from 'react';
import { Routes } from 'react-router-dom';
import { protectedRoutes } from './protectedRoutes';
import { publicRoutes } from './publicRoutes';

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {publicRoutes}
      {protectedRoutes}
    </Routes>
  );
};

export default AppRoutes;

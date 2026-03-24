import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

interface Props {
  children: React.ReactNode;
}

const RouterProvider: React.FC<Props> = ({ children }) => {
  return <Router>{children}</Router>;
};

export default RouterProvider;

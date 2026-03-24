import React from 'react';
import { Toaster } from 'react-hot-toast';
import { Footer, Navbar as AppNavbar, ScrollToTop } from '@/components';
import AuthProvider from './providers/AuthProvider';
import RouterProvider from './providers/RouterProvider';
import AppRoutes from './routes';

const App: React.FC = () => {
  return (
    <RouterProvider>
      <ScrollToTop />
      <AuthProvider>
        <div className="d-flex flex-column min-vh-100">
          <AppNavbar />
          <main className="flex-grow-1">
            <AppRoutes />
          </main>
          <Footer />
        </div>
        <Toaster position="top-right" />
      </AuthProvider>
    </RouterProvider>
  );
};

export default App;

import React from 'react';
import { Toaster } from 'react-hot-toast';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { Navbar as AppNavbar, Footer, ProtectedRoute, ScrollToTop } from './components';
import { AuthProvider } from './contexts/AuthContext';
import { AnnouncementsAdmin, NotificationsPage } from './features/announcements';
import { AttendanceManagement, AttendanceView } from './features/attendance';
import { About, CmsEditor } from './features/cms';
import { OnDutyReportForm } from './features/reports';
import {
    Achievements,
    Alumni,
    AuthDiagnostics,
    CadetList,
    Camps,
    Contact,
    Dashboard,
    DebugFirebase,
    ForgotPassword,
    Home,
    Login,
    NationalDays,
    NotFound,
    Parades,
    Photos,
    Profile,
    Ranks,
    Register,
    Resources,
    RoleManagement,
    CadetManagement,
    SocialService,
    UserManagement,
    Videos,
} from './pages';

// Placeholder components
const Unauthorized: React.FC = () => (
  <div className="container py-5 text-center">
    <h2>Unauthorized Access</h2>
    <p>You don't have permission to view this page.</p>
  </div>
);

const App: React.FC = () => {
  return (
    <Router>
      <ScrollToTop />
      <AuthProvider>
        <div className="d-flex flex-column min-vh-100">
          <AppNavbar />
          <main className="flex-grow-1">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/about" element={<About />} />
              {/* Activities */}
              <Route path="/activities/camps" element={<Camps />} />
              <Route path="/activities/social-service" element={<SocialService />} />
              <Route path="/activities/parades" element={<Parades />} />
              {/* Events */}
              <Route path="/events/national-days" element={<NationalDays />} />
              {/* Gallery */}
              <Route path="/gallery/photos" element={<Photos />} />
              <Route path="/gallery/videos" element={<Videos />} />
              {/* Cadets (public) */}
              <Route path="/cadets/list" element={<CadetList />} />
              <Route path="/cadets/ranks" element={<Ranks />} />
              <Route path="/cadets/achievements" element={<Achievements />} />
              {/* Resources, Alumni, Contact, Notifications */}
              <Route path="/resources" element={<Resources />} />
              <Route path="/alumni" element={<Alumni />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/debug/firebase" element={<DebugFirebase />} />
              <Route path="/debug/auth" element={<AuthDiagnostics />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              {/* 404 */}
              <Route path="*" element={<NotFound />} />

              {/* Protected Routes - All authenticated users */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notifications/private"
                element={
                  <ProtectedRoute>
                    <div className="container py-5"><h2>My Notifications</h2></div>
                  </ProtectedRoute>
                }
              />

              {/* Cadet Routes */}
              <Route
                path="/attendance"
                element={
                  <ProtectedRoute requiredRoles={['member', 'subadmin', 'admin', 'superadmin']}>
                    <AttendanceView />
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/admin/roles"
                element={
                  <ProtectedRoute requiredRoles={['admin', 'superadmin']}>
                    <RoleManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute requiredRoles={['admin', 'superadmin']}>
                    <UserManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/attendance"
                element={
                  <ProtectedRoute requiredRoles={['admin', 'superadmin']}>
                    <AttendanceManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/cadets"
                element={
                  <ProtectedRoute requiredRoles={['admin', 'superadmin']}>
                    <CadetManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/duties"
                element={
                  <ProtectedRoute requiredRoles={['admin', 'superadmin']}>
                    <div className="container py-5"><h2>Duty Management</h2></div>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/events"
                element={
                  <ProtectedRoute requiredRoles={['admin', 'superadmin']}>
                    <div className="container py-5"><h2>Event Management</h2></div>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/reports"
                element={
                  <ProtectedRoute requiredRoles={['admin', 'superadmin']}>
                    <div className="container py-5"><h2>Reports</h2></div>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/announcements"
                element={
                  <ProtectedRoute requiredRoles={['admin', 'superadmin']}>
                    <AnnouncementsAdmin />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/reports/on-duty"
                element={
                  <ProtectedRoute requiredRoles={['subadmin', 'admin', 'superadmin']}>
                    <OnDutyReportForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute requiredRoles={['admin', 'superadmin']}>
                    <div className="container py-5"><h2>Settings</h2></div>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/cms"
                element={
                  <ProtectedRoute requiredRoles={['admin', 'superadmin']}>
                    <CmsEditor />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
          <Footer />
        </div>
        <Toaster position="top-right" />
      </AuthProvider>
    </Router>
  );
};

export default App;

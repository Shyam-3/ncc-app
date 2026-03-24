import React from 'react';
import { Route } from 'react-router-dom';
import {
  About,
  Achievements,
  Alumni,
  CadetList,
  Camps,
  Contact,
  Home,
  NationalDays,
  NotFound,
  Notifications,
  Parades,
  Photos,
  Ranks,
  Resources,
  SocialService,
  Videos,
} from '@/pages/public';
import { ForgotPassword, Login, Register } from '@/pages/auth';

const Unauthorized: React.FC = () => (
  <div className="container py-5 text-center">
    <h2>Unauthorized Access</h2>
    <p>You don't have permission to view this page.</p>
  </div>
);

export const publicRoutes = (
  <>
    <Route path="/" element={<Home />} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/about" element={<About />} />
    <Route path="/activities/camps" element={<Camps />} />
    <Route path="/activities/social-service" element={<SocialService />} />
    <Route path="/activities/parades" element={<Parades />} />
    <Route path="/events/national-days" element={<NationalDays />} />
    <Route path="/gallery/photos" element={<Photos />} />
    <Route path="/gallery/videos" element={<Videos />} />
    <Route path="/cadets/list" element={<CadetList />} />
    <Route path="/cadets/ranks" element={<Ranks />} />
    <Route path="/cadets/achievements" element={<Achievements />} />
    <Route path="/resources" element={<Resources />} />
    <Route path="/alumni" element={<Alumni />} />
    <Route path="/contact" element={<Contact />} />
    <Route path="/notifications" element={<Notifications />} />
    <Route path="/unauthorized" element={<Unauthorized />} />
    <Route path="*" element={<NotFound />} />
  </>
);

const PublicRoutes: React.FC = () => {
  return publicRoutes;
};

export default PublicRoutes;

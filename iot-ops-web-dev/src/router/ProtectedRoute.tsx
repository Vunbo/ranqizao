import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { hasAuthToken } from '../lib/auth';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  if (!hasAuthToken()) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

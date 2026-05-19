import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingScreen from './LoadingScreen';

const ProtectedRoute = () => {
  const { user, loading, authState } = useAuth();

  if (loading) {
    const message = authState === 'reconnecting'
      ? 'Connection lost. Reconnecting to NEXVAULT secure infrastructure...'
      : 'Securing Session';
    return <LoadingScreen variant="full" message={message} />;
  }

  if (authState === 'unauthenticated' || !user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;

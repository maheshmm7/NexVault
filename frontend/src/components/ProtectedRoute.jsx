import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingScreen from './LoadingScreen';

const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen variant="full" message="Securing Session" />;
  }


  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;

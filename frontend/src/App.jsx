import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics as VercelAnalytics } from '@vercel/analytics/react';
import { SettingsProvider } from './contexts/SettingsContext';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { NotificationCenterProvider } from './contexts/NotificationCenterContext';

import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';

import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import RecoverAccount from './pages/RecoverAccount';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Vault from './pages/Vault';
import Transactions from './pages/Transactions';
import Settings from './pages/Settings';
import Analytics from './pages/Analytics';


import Landing from './pages/Landing';

function App() {
  return (
    <ToastProvider>
      <SettingsProvider>
        <AuthProvider>
          <NotificationCenterProvider>
            <Router>
              <Routes>

                {/* Public Routes */}
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password/:token" element={<ResetPassword />} />
                <Route path="/recover-account" element={<RecoverAccount />} />

                {/* Protected Routes */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<DashboardLayout />}>

                    <Route path="/dashboard" element={<Dashboard />} />

                    <Route
                      path="/transactions"
                      element={<Transactions />}
                    />

                    <Route
                      path="/accounts"
                      element={<Accounts />}
                    />

                    <Route
                      path="/vault"
                      element={<Vault />}
                    />

                    <Route
                      path="/settings"
                      element={<Settings />}
                    />

                    <Route
                      path="/analytics"
                      element={<Analytics />}
                    />

                  </Route>
                </Route>

                {/* Fallback */}
                <Route
                  path="*"
                  element={<Navigate to="/" replace />}
                />


              </Routes>
              <VercelAnalytics />
            </Router>
          </NotificationCenterProvider>
        </AuthProvider>
      </SettingsProvider>
    </ToastProvider>
  );
}

export default App;
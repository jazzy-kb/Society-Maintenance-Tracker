import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';

// Layout
import { AppLayout } from './components/layout/AppLayout';

// Public Pages
import Landing from './pages/Landing';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Resident Pages
import ResidentDashboard from './pages/resident/Dashboard';
import ComplaintList from './pages/resident/ComplaintList';
import RaiseComplaint from './pages/resident/RaiseComplaint';
import ComplaintDetailPage from './pages/resident/ComplaintDetail';
import ResidentNotices from './pages/resident/Notices';
import ResidentNotifications from './pages/resident/Notifications';
import ResidentBookings from './pages/resident/Bookings';
import ResidentVisitorPasses from './pages/resident/VisitorPasses';
import ResidentProfile from './pages/resident/Profile';

// Admin Pages
import AdminDashboardPage from './pages/admin/Dashboard';
import ComplaintManagement from './pages/admin/ComplaintManagement';
import StaffManagement from './pages/admin/Staff';
import AdminNotices from './pages/admin/Notices';
import DeepAnalytics from './pages/admin/Analytics';
import RecurringIssues from './pages/admin/RecurringIssues';
import AuditLogPage from './pages/admin/AuditLog';
import SLASettingsPage from './pages/admin/Settings';
import AdminBookings from './pages/admin/BookingManagement';
import AdminVisitorLogs from './pages/admin/VisitorLogs';

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: 'resident' | 'admin' }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (role && user?.role !== role) {
    return <Navigate to={user?.role === 'admin' ? '/admin/dashboard' : '/resident/dashboard'} replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 4000, style: { borderRadius: '12px', background: '#1e293b', color: '#fff' } }} />
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Resident Routes */}
        <Route path="/resident" element={<ProtectedRoute role="resident"><AppLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<ResidentDashboard />} />
          <Route path="complaints" element={<ComplaintList />} />
          <Route path="raise-complaint" element={<RaiseComplaint />} />
          <Route path="complaints/:id" element={<ComplaintDetailPage />} />
          <Route path="notices" element={<ResidentNotices />} />
          <Route path="notifications" element={<ResidentNotifications />} />
          <Route path="bookings" element={<ResidentBookings />} />
          <Route path="visitors" element={<ResidentVisitorPasses />} />
          <Route path="profile" element={<ResidentProfile />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute role="admin"><AppLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="complaints" element={<ComplaintManagement />} />
          <Route path="staff" element={<StaffManagement />} />
          <Route path="notices" element={<AdminNotices />} />
          <Route path="analytics" element={<DeepAnalytics />} />
          <Route path="recurring" element={<RecurringIssues />} />
          <Route path="audit" element={<AuditLogPage />} />
          <Route path="settings" element={<SLASettingsPage />} />
          <Route path="bookings" element={<AdminBookings />} />
          <Route path="visitors" element={<AdminVisitorLogs />} />
        </Route>


        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

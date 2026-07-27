import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import About from './pages/About';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminLogin from './pages/AdminLogin';
import CitizenDashboard from './pages/CitizenDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminOfficers from './pages/AdminOfficers';
import AdminReports from './pages/AdminReports';
import NotFound from './pages/NotFound';

// Lazy-loaded: these pull in Leaflet, Recharts, or react-markdown, and
// shouldn't bloat the initial bundle for pages that don't need them.
const NewComplaint = lazy(() => import('./pages/NewComplaint'));
const ComplaintDetail = lazy(() => import('./pages/ComplaintDetail'));
const AdminHotspots = lazy(() => import('./pages/AdminHotspots'));
const AnalyticsDashboard = lazy(() => import('./pages/AnalyticsDashboard'));
const AdminInsights = lazy(() => import('./pages/AdminInsights'));
const ChatWidget = lazy(() => import('./components/chat/ChatWidget'));

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <p className="text-slate-400 dark:text-slate-500 text-sm">Loading...</p>
    </div>
  );
}

function Home() {
  const { user } = useAuth();
  if (!user) return <Landing />;
  return <Navigate to={user.role === 'admin' || user.role === 'dept_admin' ? '/admin/dashboard' : '/dashboard'} replace />;
}

function ChatWidgetGate() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <Suspense fallback={null}>
      <ChatWidget />
    </Suspense>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <NotificationProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/admin/login" element={<AdminLogin />} />

                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute role="citizen">
                      <CitizenDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/complaints/new"
                  element={
                    <ProtectedRoute role="citizen">
                      <Suspense fallback={<PageFallback />}>
                        <NewComplaint />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/complaints/:id"
                  element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageFallback />}>
                        <ComplaintDetail />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/dashboard"
                  element={
                    <ProtectedRoute role={['admin', 'dept_admin']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/hotspots"
                  element={
                    <ProtectedRoute role="admin">
                      <Suspense fallback={<PageFallback />}>
                        <AdminHotspots />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/analytics"
                  element={
                    <ProtectedRoute role="admin">
                      <Suspense fallback={<PageFallback />}>
                        <AnalyticsDashboard />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/officers"
                  element={
                    <ProtectedRoute role="admin">
                      <AdminOfficers />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/reports"
                  element={
                    <ProtectedRoute role="admin">
                      <AdminReports />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/insights"
                  element={
                    <ProtectedRoute role="admin">
                      <Suspense fallback={<PageFallback />}>
                        <AdminInsights />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <ChatWidgetGate />
            </BrowserRouter>
          </NotificationProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

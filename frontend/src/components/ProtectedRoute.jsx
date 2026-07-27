import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// `role` accepts a single role string or an array of allowed roles (e.g.
// ['admin', 'dept_admin'] for pages both kinds of staff can see).
export default function ProtectedRoute({ role, children }) {
  const { user } = useAuth();
  const allowedRoles = role == null ? null : Array.isArray(role) ? role : [role];
  const isStaffRoute = allowedRoles?.some((r) => r === 'admin' || r === 'dept_admin');

  if (!user) {
    return <Navigate to={isStaffRoute ? '/admin/login' : '/login'} replace />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}

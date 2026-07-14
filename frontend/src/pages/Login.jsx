import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import AuthLayout from '../components/AuthLayout';

const INPUT_CLASS =
  'w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 transition-shadow';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await apiClient.post('/auth/login', { email, password });
      login(data.token, data.user);
      toast.success(`Welcome back, ${data.user.name}`);
      navigate(data.user.role === 'admin' ? '/admin/dashboard' : '/dashboard');
    } catch (err) {
      const message = err.response?.data?.error || 'Login failed';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Citizen Login" subtitle="Sign in to track and submit complaints">
      <form onSubmit={handleSubmit}>
        {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>}

        <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`${INPUT_CLASS} mb-4`}
        />

        <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`${INPUT_CLASS} mb-6`}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm"
        >
          {loading ? 'Logging in...' : 'Log in'}
        </button>

        <p className="text-sm text-slate-500 dark:text-slate-400 mt-4 text-center">
          No account? <Link to="/register" className="text-blue-600 dark:text-blue-400 hover:underline">Register</Link>
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 text-center">
          <Link to="/admin/login" className="text-blue-600 dark:text-blue-400 hover:underline">Admin login</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

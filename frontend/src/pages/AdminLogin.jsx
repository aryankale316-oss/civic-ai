import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import AuthLayout from '../components/AuthLayout';

const INPUT_CLASS =
  'w-full px-3 py-2 border border-ink/30 dark:border-paper-line/30 bg-white dark:bg-board text-ink dark:text-paper focus:outline-none focus:ring-2 focus:ring-brass';

export default function AdminLogin() {
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
      if (data.user.role !== 'admin') {
        setError('This account is not an admin account');
        return;
      }
      login(data.token, data.user);
      toast.success(`Welcome back, ${data.user.name}`);
      navigate('/admin/dashboard');
    } catch (err) {
      const message = err.response?.data?.error || 'Login failed';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Admin Login" subtitle="Sign in to manage complaints and officers">
      <form onSubmit={handleSubmit}>
        {error && <p className="text-sm text-stamp-red mb-4">{error}</p>}

        <label className="block text-sm text-ink-soft mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`${INPUT_CLASS} mb-4`}
        />

        <label className="block text-sm text-ink-soft mb-1">Password</label>
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
          className="w-full py-2 bg-ink text-paper hover:bg-ink/90 transition-colors disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Log in'}
        </button>

        <p className="text-sm text-ink-soft mt-4 text-center">
          <Link to="/login" className="text-ink dark:text-paper underline hover:text-brass">Citizen login</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

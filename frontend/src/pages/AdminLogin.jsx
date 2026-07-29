import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import AuthLayout from '../components/AuthLayout';

const INPUT_CLASS =
  'w-full rounded-md border border-paper-line bg-white px-4 py-3 text-ink focus:border-civic focus:outline-none focus:ring-2 focus:ring-civic/15 dark:border-board-line dark:bg-board-line dark:text-paper';

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
      if (data.user.role !== 'admin' && data.user.role !== 'dept_admin') {
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
    <AuthLayout staff title="Admin portal" subtitle="Sign in to manage grievances, departments, and field operations.">
      <form onSubmit={handleSubmit}>
        {error && <p className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-stamp-red">{error}</p>}

        <label className="mb-2 block text-sm font-semibold text-ink dark:text-paper">Staff email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@civicai.gov"
          className={`${INPUT_CLASS} mb-5`}
        />

        <label className="mb-2 block text-sm font-semibold text-ink dark:text-paper">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          className={`${INPUT_CLASS} mb-6`}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-civic py-3 font-semibold text-white transition-colors hover:bg-civic-bright disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Log in'}
        </button>

        <p className="mt-6 border-t border-paper-line pt-6 text-center text-sm text-ink-soft dark:border-board-line">
          <Link to="/login" className="font-semibold text-civic hover:underline dark:text-seal-green">Return to citizen login</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

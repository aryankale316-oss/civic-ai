import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import AuthLayout from '../components/AuthLayout';

const INPUT_CLASS =
  'w-full px-3 py-2 border border-ink/30 dark:border-paper-line/30 bg-white dark:bg-board text-ink dark:text-paper focus:outline-none focus:ring-2 focus:ring-brass';

export default function Register() {
  const [name, setName] = useState('');
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
      const { data } = await apiClient.post('/auth/register', { name, email, password });
      login(data.token, data.user);
      toast.success('Account created — welcome!');
      navigate('/dashboard');
    } catch (err) {
      const message = err.response?.data?.error || 'Registration failed';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Citizen Registration" subtitle="Create an account to submit complaints">
      <form onSubmit={handleSubmit}>
        {error && <p className="text-sm text-stamp-red mb-4">{error}</p>}

        <label className="block text-sm text-ink-soft mb-1">Name</label>
        <input required value={name} onChange={(e) => setName(e.target.value)} className={`${INPUT_CLASS} mb-4`} />

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
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`${INPUT_CLASS} mb-6`}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-ink text-paper hover:bg-ink/90 transition-colors disabled:opacity-50"
        >
          {loading ? 'Creating account...' : 'Register'}
        </button>

        <p className="text-sm text-ink-soft mt-4 text-center">
          Already have an account? <Link to="/login" className="text-ink dark:text-paper underline hover:text-brass">Log in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

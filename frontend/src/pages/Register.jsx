import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import AuthLayout from '../components/AuthLayout';

const INPUT_CLASS =
  'w-full rounded-md border border-paper-line bg-white px-4 py-3 text-ink focus:border-civic focus:outline-none focus:ring-2 focus:ring-civic/15 dark:border-board-line dark:bg-board-line dark:text-paper';

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
    <AuthLayout title="Create your account" subtitle="Join Civic AI to report, follow, and resolve issues in your community.">
      <form onSubmit={handleSubmit}>
        {error && <p className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-stamp-red">{error}</p>}

        <label className="mb-2 block text-sm font-semibold text-ink dark:text-paper">Full name</label>
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" className={`${INPUT_CLASS} mb-5`} />

        <label className="mb-2 block text-sm font-semibold text-ink dark:text-paper">Email address</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="citizen@example.com"
          className={`${INPUT_CLASS} mb-5`}
        />

        <label className="mb-2 block text-sm font-semibold text-ink dark:text-paper">Password</label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Minimum 6 characters"
          className={`${INPUT_CLASS} mb-6`}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-civic py-3 font-semibold text-white transition-colors hover:bg-civic-bright disabled:opacity-50"
        >
          {loading ? 'Creating account...' : 'Register'}
        </button>

        <p className="mt-6 border-t border-paper-line pt-6 text-center text-sm text-ink-soft dark:border-board-line">
          Already have an account? <Link to="/login" className="font-semibold text-civic hover:underline dark:text-seal-green">Log in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

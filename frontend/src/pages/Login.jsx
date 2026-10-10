import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import AuthLayout from '../components/AuthLayout';
import { useLanguage } from '../context/LanguageContext';

const INPUT_CLASS =
  'w-full rounded-md border border-paper-line bg-white px-4 py-3 text-ink focus:border-civic focus:outline-none focus:ring-2 focus:ring-civic/15 dark:border-board-line dark:bg-board-line dark:text-paper';

export default function Login() {
  const { t } = useLanguage();
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
    <AuthLayout title="Welcome back" subtitle="Securely access your civic portal to file grievances and view progress.">
      <form onSubmit={handleSubmit}>
        {error && <p className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-stamp-red dark:border-red-900 dark:bg-red-950/30">{error}</p>}

        <label className="mb-2 block text-sm font-semibold text-ink dark:text-paper">{t('Email address')}</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="citizen@example.com"
          className={`${INPUT_CLASS} mb-5`}
        />

        <label className="mb-2 block text-sm font-semibold text-ink dark:text-paper">{t('Password')}</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('Enter your password')}
          className={`${INPUT_CLASS} mb-6`}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-civic py-3 font-semibold text-white transition-colors hover:bg-civic-bright disabled:opacity-50"
        >
          {loading ? t('Logging in...') : t('Log in')}
        </button>

        <p className="mt-6 border-t border-paper-line pt-6 text-center text-sm text-ink-soft dark:border-board-line">
          {t('No account?')} <Link to="/register" className="font-semibold text-civic hover:underline dark:text-seal-green">{t('Create account')}</Link>
        </p>
        <p className="text-sm text-ink-soft mt-2 text-center">
          <Link to="/admin/login" className="font-medium text-ink-soft hover:text-civic">{t('Authorized staff login')}</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

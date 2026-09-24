import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import Navbar from '../components/Navbar';
import { NoticeCard } from '../components/civic';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PageTransition from '../components/ui/PageTransition';

const inputClass = 'w-full px-3 py-2 border border-ink/30 dark:border-paper-line/30 bg-white dark:bg-board text-ink dark:text-paper text-sm';

export default function Profile() {
  const { updateUser } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState({ name: '', email: '', role: '' });
  const [password, setPassword] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient.get('/auth/me')
      .then(({ data }) => setProfile(data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load your profile'))
      .finally(() => setLoading(false));
  }, []);

  async function saveProfile(e) {
    e.preventDefault();
    setError('');
    setSavingProfile(true);
    try {
      const { data } = await apiClient.patch('/auth/me', { name: profile.name, email: profile.email });
      setProfile(data);
      updateUser(data);
      toast.success('Profile updated');
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to update profile';
      setError(message);
      toast.error(message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    setError('');
    if (password.new_password !== password.confirm_password) {
      setError('New passwords do not match');
      return;
    }
    setSavingPassword(true);
    try {
      await apiClient.patch('/auth/me/password', password);
      setPassword({ current_password: '', new_password: '', confirm_password: '' });
      toast.success('Password updated');
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to update password';
      setError(message);
      toast.error(message);
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper dark:bg-board">
      <Navbar />
      <PageTransition className="max-w-2xl mx-auto px-6 py-8">
        <p className="text-xs uppercase tracking-wide text-ink-soft font-mono mb-1">Account</p>
        <h1 className="text-3xl font-display font-semibold text-ink dark:text-paper mb-6">Profile & settings</h1>
        {error && <p className="text-stamp-red text-sm mb-4">{error}</p>}
        {loading ? <p className="text-ink-soft">Loading profile…</p> : (
          <div className="space-y-6">
            <NoticeCard title="Personal details">
              <form onSubmit={saveProfile} className="space-y-4">
                <label className="block text-sm text-ink-soft">Name
                  <input required value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} className={`${inputClass} mt-1`} />
                </label>
                <label className="block text-sm text-ink-soft">Email
                  <input required type="email" value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} className={`${inputClass} mt-1`} />
                </label>
                <p className="text-xs text-ink-soft">Account type: {profile.role}</p>
                <button disabled={savingProfile} className="px-4 py-2 bg-ink text-paper text-sm disabled:opacity-60">{savingProfile ? 'Saving…' : 'Save profile'}</button>
              </form>
            </NoticeCard>
            <NoticeCard title="Change password">
              <form onSubmit={savePassword} className="space-y-4">
                {[['current_password', 'Current password'], ['new_password', 'New password (at least 8 characters)'], ['confirm_password', 'Confirm new password']].map(([field, label]) => (
                  <label key={field} className="block text-sm text-ink-soft">{label}
                    <input required type="password" minLength={field === 'new_password' ? 8 : undefined} value={password[field]} onChange={(e) => setPassword((p) => ({ ...p, [field]: e.target.value }))} className={`${inputClass} mt-1`} />
                  </label>
                ))}
                <button disabled={savingPassword} className="px-4 py-2 bg-ink text-paper text-sm disabled:opacity-60">{savingPassword ? 'Updating…' : 'Update password'}</button>
              </form>
            </NoticeCard>
          </div>
        )}
      </PageTransition>
    </div>
  );
}

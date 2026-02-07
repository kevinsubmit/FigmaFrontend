import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(phone, password);
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen app-shell flex items-center justify-center px-6">
      <div className="w-full max-w-sm card-surface p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gold-500/10 border border-gold-500/20 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-gold-500" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Admin Access</p>
            <h1 className="text-xl font-semibold">NailsDash Admin</h1>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-gray-500">Phone</label>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white outline-none focus:border-gold-500"
              placeholder="4151234567"
              inputMode="tel"
              required
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-gray-500">Password</label>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white outline-none focus:border-gold-500"
              type="password"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gold-500 py-3 text-sm font-semibold text-black shadow-glow transition hover:bg-gold-300 disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div className="text-center text-xs text-gray-500">
          Need a store admin account?{' '}
          <button
            onClick={() => navigate('/admin/register')}
            className="text-gold-300 underline-offset-4 hover:underline"
            type="button"
          >
            Apply here
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;

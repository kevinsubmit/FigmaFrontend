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
    <div className="min-h-screen app-shell flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card-surface p-8 hidden lg:block">
          <p className="text-xs uppercase tracking-[0.3em] text-blue-500">Merchant System</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900 leading-tight">
            后台管理系统
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            统一管理预约、店铺、服务、活动与运营素材。
          </p>
          <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm text-slate-700">建议使用最新版本 Chrome/Safari 访问。</p>
          </div>
        </div>

        <div className="card-surface p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gold-500/10 border border-gold-500/20 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-gold-500" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Admin Access</p>
              <h1 className="text-xl font-semibold text-slate-900">NailsDash Admin</h1>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Phone</label>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="mt-2 w-full rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-gold-500"
                placeholder="4151234567"
                inputMode="tel"
                required
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Password</label>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-gold-500"
                type="password"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gold-500 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-gold-300 disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <div className="text-center text-xs text-slate-500">
            Need a store admin account?{' '}
            <button
              onClick={() => navigate('/admin/register')}
              className="text-gold-700 underline-offset-4 hover:underline"
              type="button"
            >
              Apply here
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

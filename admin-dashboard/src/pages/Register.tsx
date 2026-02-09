import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { submitStoreAdminApplication } from '../api/storeAdminApplications';

const Register: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    phone: '',
    password: '',
    store_name: '',
  });

  const updateField = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await submitStoreAdminApplication({
        phone: form.phone,
        password: form.password,
        store_name: form.store_name,
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen app-shell flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md card-surface p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gold-500/10 border border-gold-500/20 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-gold-500" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Store Admin</p>
            <h1 className="text-xl font-semibold">Application</h1>
          </div>
        </div>

        {submitted ? (
          <div className="rounded-xl border border-gold-500/40 bg-gold-500/10 px-4 py-3 text-sm text-gold-200">
            Application submitted. Please wait for super admin approval.
          </div>
        ) : (
          <>
            {error && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Phone</label>
                <input
                  value={form.phone}
                  onChange={updateField('phone')}
                  className="mt-2 w-full rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-gold-500"
                  placeholder="4151234567"
                  inputMode="tel"
                  required
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Password</label>
                <input
                  value={form.password}
                  onChange={updateField('password')}
                  className="mt-2 w-full rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-gold-500"
                  type="password"
                  required
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Store Name</label>
                <input
                  value={form.store_name}
                  onChange={updateField('store_name')}
                  className="mt-2 w-full rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-gold-500"
                  placeholder="Golden Nails"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gold-500 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-gold-300 disabled:opacity-60"
              >
                {loading ? 'Submitting...' : 'Submit Application'}
              </button>
            </form>
          </>
        )}
        <div className="text-center text-xs text-slate-500">
          Already have an account?{' '}
          <a
            href="/admin/login"
            className="text-gold-300 underline-offset-4 hover:underline"
          >
            Sign in
          </a>
        </div>
      </div>
    </div>
  );
};

export default Register;

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
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card-surface p-8 hidden lg:block">
          <p className="text-xs uppercase tracking-[0.3em] text-blue-500">Store Admin</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900 leading-tight">申请店铺管理员</h1>
          <p className="mt-3 text-sm text-slate-600">
            提交手机号、密码和店铺名，等待超管审批后开通后台权限。
          </p>
          <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-slate-700">
            审批通过后可在后台维护店铺信息、服务和预约。
          </div>
        </div>

        <div className="card-surface p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gold-500/10 border border-gold-500/20 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-gold-500" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Store Admin</p>
              <h1 className="text-xl font-semibold text-slate-900">Application</h1>
            </div>
          </div>

          {submitted ? (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Application submitted. Please wait for super admin approval.
            </div>
          ) : (
            <>
              {error && (
                <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
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
              className="text-gold-700 underline-offset-4 hover:underline"
            >
              Sign in
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;

import React, { useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { toast } from 'react-toastify';

import { AdminLayout } from '../layout/AdminLayout';
import { TopBar } from '../layout/TopBar';
import { useAuth } from '../context/AuthContext';
import {
  getAdminSupportContactSettings,
  SupportContactSettings,
  SupportContactSettingsUpdatePayload,
  updateAdminSupportContactSettings,
} from '../api/supportContact';

type ContactFormState = {
  feedback_whatsapp_url: string;
  feedback_imessage_url: string;
  feedback_instagram_url: string;
  partnership_whatsapp_url: string;
  partnership_imessage_url: string;
};

const emptyForm: ContactFormState = {
  feedback_whatsapp_url: '',
  feedback_imessage_url: '',
  feedback_instagram_url: '',
  partnership_whatsapp_url: '',
  partnership_imessage_url: '',
};

const settingsToForm = (settings: SupportContactSettings): ContactFormState => ({
  feedback_whatsapp_url: settings.feedback_whatsapp_url || '',
  feedback_imessage_url: settings.feedback_imessage_url || '',
  feedback_instagram_url: settings.feedback_instagram_url || '',
  partnership_whatsapp_url: settings.partnership_whatsapp_url || '',
  partnership_imessage_url: settings.partnership_imessage_url || '',
});

const ContactConfig: React.FC = () => {
  const { user } = useAuth();
  const [form, setForm] = useState<ContactFormState>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>('');

  useEffect(() => {
    if (!user?.is_admin) return;
    void loadSettings();
  }, [user?.is_admin]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const settings = await getAdminSupportContactSettings();
      setForm(settingsToForm(settings));
      setLastUpdatedAt(settings.updated_at || '');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || '加载联系配置失败');
      setForm(emptyForm);
      setLastUpdatedAt('');
    } finally {
      setLoading(false);
    }
  };

  const setField = <K extends keyof ContactFormState>(key: K, value: ContactFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validateUrl = (label: string, value: string) => {
    const normalized = value.trim();
    if (!normalized) {
      toast.error(`${label} is required`);
      return null;
    }
    if (!/^https?:\/\//i.test(normalized) && !/^sms:/i.test(normalized)) {
      toast.error(`${label} must start with http://, https://, or sms:`);
      return null;
    }
    return normalized;
  };

  const handleSave = async () => {
    const payload: SupportContactSettingsUpdatePayload = {
      feedback_whatsapp_url: validateUrl('Feedback WhatsApp URL', form.feedback_whatsapp_url) || '',
      feedback_imessage_url: validateUrl('Feedback iMessage URL', form.feedback_imessage_url) || '',
      feedback_instagram_url: validateUrl('Feedback Instagram URL', form.feedback_instagram_url) || '',
      partnership_whatsapp_url: validateUrl('Partnership WhatsApp URL', form.partnership_whatsapp_url) || '',
      partnership_imessage_url: validateUrl('Partnership iMessage URL', form.partnership_imessage_url) || '',
    };
    if (Object.values(payload).some((value) => !value)) return;

    setSaving(true);
    try {
      const updated = await updateAdminSupportContactSettings(payload);
      setForm(settingsToForm(updated));
      setLastUpdatedAt(updated.updated_at || '');
      toast.success('联系配置已保存');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || '保存联系配置失败');
    } finally {
      setSaving(false);
    }
  };

  const renderField = (
    key: keyof ContactFormState,
    label: string,
    placeholder: string,
    helper: string,
  ) => (
    <label className="space-y-1">
      <span className="text-xs uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <input
        value={form[key]}
        onChange={(event) => setField(key, event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm !text-slate-900"
      />
      <span className="text-xs text-slate-500">{helper}</span>
    </label>
  );

  if (!user?.is_admin) {
    return (
      <AdminLayout>
        <TopBar title="Contact Config" subtitle="仅超级管理员可访问" />
        <div className="px-4 py-6 text-sm text-slate-900">只有超级管理员可以管理前端支持联系信息。</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <TopBar title="Contact Config" subtitle="配置前端 Settings 中 Feedback & Support / Partnership Inquiry 的联系方式" />
      <div className="px-4 py-5 space-y-4 lg:px-6">
        <div className="card-surface p-4 text-sm text-slate-700 space-y-1">
          <p>1. 三端前端会读取这里的链接，替换硬编码联系方式。</p>
          <p>2. 支持的协议：`https://`、`http://`、`sms:`。</p>
          <p>3. Instagram 建议填写完整主页或私信链接，WhatsApp 建议使用 `wa.me` 链接。</p>
        </div>

        <div className="card-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-gold-500" />
              <p className="text-sm font-semibold text-slate-900">Support Channels</p>
            </div>
            <div className="text-xs text-slate-500">
              {lastUpdatedAt ? `Last updated: ${new Date(lastUpdatedAt).toLocaleString()}` : 'Last updated: -'}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3">
            <div className="rounded-2xl border border-blue-100 p-4 space-y-3">
              <p className="text-sm font-semibold text-slate-900">Feedback & Support</p>
              {renderField('feedback_whatsapp_url', 'WhatsApp URL', 'https://wa.me/14151234567', 'Used by iOS / Android / H5 Feedback & Support.')}
              {renderField('feedback_imessage_url', 'iMessage URL', 'sms:+14151234567', 'Used by iOS / Android / H5 Feedback & Support.')}
              {renderField('feedback_instagram_url', 'Instagram URL', 'https://instagram.com/yourhandle', 'Used by iOS / Android / H5 Feedback & Support.')}
            </div>

            <div className="rounded-2xl border border-blue-100 p-4 space-y-3">
              <p className="text-sm font-semibold text-slate-900">Partnership Inquiry</p>
              {renderField('partnership_whatsapp_url', 'WhatsApp URL', 'https://wa.me/14151234567', 'Used by iOS / Android / H5 Partnership Inquiry.')}
              {renderField('partnership_imessage_url', 'iMessage URL', 'sms:+14151234567', 'Used by iOS / Android / H5 Partnership Inquiry.')}
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="rounded-xl bg-gold-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-60"
            >
              {saving ? 'Saving...' : loading ? 'Loading...' : 'Save Config'}
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ContactConfig;

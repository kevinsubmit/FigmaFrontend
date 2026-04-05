import apiClient from '../lib/api';

export interface SupportContactSettings {
  feedback_whatsapp_url: string;
  feedback_imessage_url: string;
  feedback_instagram_url: string;
  partnership_whatsapp_url: string;
  partnership_imessage_url: string;
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_SUPPORT_CONTACT_SETTINGS: SupportContactSettings = {
  feedback_whatsapp_url: 'https://wa.me/14151234567',
  feedback_imessage_url: 'sms:+14151234567',
  feedback_instagram_url: 'https://instagram.com',
  partnership_whatsapp_url: 'https://wa.me/14151234567',
  partnership_imessage_url: 'sms:+14151234567',
};

class SupportContactService {
  async getSettings(): Promise<SupportContactSettings> {
    return apiClient
      .get<SupportContactSettings>('/support-contact')
      .then((response) => {
        return {
          ...DEFAULT_SUPPORT_CONTACT_SETTINGS,
          ...(response.data || {}),
        };
      })
      .catch(() => DEFAULT_SUPPORT_CONTACT_SETTINGS);
  }
}

export const openSupportContactUrl = (rawUrl: string) => {
  const url = (rawUrl || '').trim();
  if (!url) return;
  if (url.toLowerCase().startsWith('sms:')) {
    window.location.href = url;
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
};

export default new SupportContactService();

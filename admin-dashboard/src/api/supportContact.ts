import { api } from './client';

export interface SupportContactSettings {
  feedback_whatsapp_url: string;
  feedback_imessage_url: string;
  feedback_instagram_url: string;
  partnership_whatsapp_url: string;
  partnership_imessage_url: string;
  created_at: string;
  updated_at: string;
}

export interface SupportContactSettingsUpdatePayload {
  feedback_whatsapp_url: string;
  feedback_imessage_url: string;
  feedback_instagram_url: string;
  partnership_whatsapp_url: string;
  partnership_imessage_url: string;
}

export const getAdminSupportContactSettings = async () => {
  const response = await api.get('/support-contact/admin');
  return response.data as SupportContactSettings;
};

export const updateAdminSupportContactSettings = async (payload: SupportContactSettingsUpdatePayload) => {
  const response = await api.put('/support-contact/admin', payload);
  return response.data as SupportContactSettings;
};

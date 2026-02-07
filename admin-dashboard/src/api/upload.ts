import { api } from './client';

export const uploadImages = async (files: File[]) => {
  const form = new FormData();
  files.forEach((file) => form.append('files', file));
  const response = await api.post('/upload/images', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data as string[];
};

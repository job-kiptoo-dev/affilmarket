import { uploadProductImage } from '@/action/uploadProductImageAction';

export async function uploadImage(file: File) {
  const fd = new FormData();
  fd.append('file', file);

  const result = await uploadProductImage(fd);

  if (result.error) throw new Error(result.error);
  if (!result.url) throw new Error('No URL returned');

  return result.url;
}

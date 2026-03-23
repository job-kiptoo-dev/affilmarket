export const normalizePhone = (phone: string) => {
  let p = phone.replace(/\s/g, '');

  if (p.startsWith('0')) return '254' + p.slice(1);
  if (p.startsWith('+254')) return p.slice(1);

  return p;
};

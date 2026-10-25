export const isCourse = (value) => typeof value?.id === 'string' && typeof value.name === 'string';
export const courseOptions = (signal) => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  ...(signal ? { signal } : {}),
});

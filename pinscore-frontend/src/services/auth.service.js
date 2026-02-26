import api from '../lib/axios';

export async function login(email, password) {
  const res = await api.post('/auth/login', { email, password });
  return res.data;
}

export async function register(username, email, password) {
  const res = await api.post('/auth/register', { username, email, password });
  return res.data;
}

export async function verifyOtp(email, otp) {
  const res = await api.post('/auth/verify-otp', { email, otp });
  return res.data;
}

export async function forgotPassword(email) {
  const res = await api.post('/auth/forgot-password', { email });
  return res.data;
}

export async function resetPassword(email, otp, newPassword) {
  const res = await api.post('/auth/reset-password', { email, otp, newPassword });
  return res.data;
}

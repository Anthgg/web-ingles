import apiClient from './client';

const AUTH_BASE = process.env.REACT_APP_AUTH_BASE_URL || 'http://localhost:3001';

export const login = async (email, password) => {
  const response = await apiClient.post(`${AUTH_BASE}/login`, { email, password });
  return response.data;
};

export const verifyTwoFactor = async ({ tempToken, code }) => {
  const response = await apiClient.post(`${AUTH_BASE}/2fa/verify-login`, {
    tempToken,
    code,
  });
  return response.data;
};

export const requestOtp = async ({ channel, tempToken }) => {
  const response = await apiClient.post(`${AUTH_BASE}/auth/otp/send`, {
    channel,
    tempToken,
  });
  return response.data;
};

export const verifyOtp = async ({ tempToken, code }) => {
  const response = await apiClient.post(`${AUTH_BASE}/auth/otp/verify`, {
    tempToken,
    code,
  });
  return response.data;
};

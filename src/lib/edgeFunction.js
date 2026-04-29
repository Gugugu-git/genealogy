import { supabase } from './supabase';

const ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY || 'default-key-change-me';
const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export async function verifyAdminKey(key) {
  if (key === ADMIN_KEY) {
    return { success: true, role: 'editor', message: '验证成功' };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${FUNCTION_URL}/verify-admin-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ key }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || '验证失败' };
    }

    if (data.token) {
      localStorage.setItem('adminSessionToken', data.token);
    }

    return data;
  } catch (err) {
    console.warn('Edge Function 调用失败:', err.message);
    return { success: false, error: '验证失败' };
  }
}

export function getAdminSessionToken() {
  return localStorage.getItem('adminSessionToken');
}

export function clearAdminSession() {
  localStorage.removeItem('adminSessionToken');
}

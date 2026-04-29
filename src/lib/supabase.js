import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'x-admin-token': localStorage.getItem('adminSessionToken') || ''
    }
  }
});

// 动态更新 headers 的方法
export function updateSupabaseHeaders(token) {
  if (token) {
    localStorage.setItem('adminSessionToken', token);
  } else {
    localStorage.removeItem('adminSessionToken');
  }
}

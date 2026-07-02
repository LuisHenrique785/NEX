import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AUDITORIA_SUPABASE_URL, AUDITORIA_SUPABASE_ANON_KEY } from '../config';

export const supabaseAuditoria = createClient(AUDITORIA_SUPABASE_URL, AUDITORIA_SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

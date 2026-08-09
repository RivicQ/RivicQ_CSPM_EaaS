import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { normalizeEdition, Edition } from '../config/editions';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabasePublishableKey = process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export interface SupabaseAuthUser {
  id: string;
  name: string;
  email: string;
  edition: Edition;
}

function toAuthUser(email: string, edition: Edition): SupabaseAuthUser {
  const fallback = email.split('@')[0] || 'Supabase User';
  const name =
    (email.split('@')[0].split(/[._-]/).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')) ||
    fallback;
  return { id: `sb-${email}`, name, email, edition };
}

export const supabaseAuthService = {
  async signIn(email: string, password: string): Promise<SupabaseAuthUser> {
    if (!supabase) throw new Error('Supabase is not configured');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const user = data.user;
    if (!user?.email) throw new Error('Supabase session did not return a user');
    return toAuthUser(user.email, normalizeEdition((user.user_metadata as any)?.edition));
  },

  async signUp(name: string, email: string, password: string, edition: Edition): Promise<SupabaseAuthUser> {
    if (!supabase) throw new Error('Supabase is not configured');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, edition } },
    });
    if (error) throw error;
    const user = data.user;
    if (!user?.email) throw new Error('Supabase sign up did not return a user');
    return toAuthUser(user.email, edition);
  },

  async signOut(): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  async getSessionToken(): Promise<string | null> {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    if (!supabase) return () => undefined;
    const { data } = supabase.auth.onAuthStateChange((event, session) => callback(event, session));
    return () => data.subscription.unsubscribe();
  },
};

import { createClient } from '@supabase/supabase-js';
import { auth } from '@/lib/firebase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY) are set.");
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    // Supabase must have Firebase Third-Party Auth enabled for this project.
    // The callback is evaluated for every request, so Firebase token refreshes
    // are propagated without creating a second, competing auth session.
    accessToken: async () => {
      await auth.authStateReady();
      const firebaseUser = auth.currentUser;
      return firebaseUser ? firebaseUser.getIdToken() : null;
    },
  },
);

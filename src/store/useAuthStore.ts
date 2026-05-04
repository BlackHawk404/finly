"use client";

import { create } from "zustand";
import { User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  init: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,
  init: async () => {
    const supabase = getSupabase();
    if (!supabase) {
      set({ initialized: true });
      return;
    }
    const { data } = await supabase.auth.getSession();
    set({ user: data.session?.user ?? null, initialized: true });
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null });
    });
  },
  signOut: async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    set({ loading: true });
    await supabase.auth.signOut();
    set({ user: null, loading: false });
  },
}));

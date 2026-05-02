"use client";

import { create } from "zustand";
import { DEFAULT_SETTINGS, getAllSettings, setSetting, SETTING_KEYS } from "@/lib/settings";

interface SettingsState {
  currency: string;
  defaultPaymentMethod: string;
  language: string;
  userName: string;
  loaded: boolean;
  load: () => Promise<void>;
  setCurrency: (v: string) => Promise<void>;
  setDefaultPaymentMethod: (v: string) => Promise<void>;
  setLanguage: (v: string) => Promise<void>;
  setUserName: (v: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  currency: DEFAULT_SETTINGS.currency,
  defaultPaymentMethod: DEFAULT_SETTINGS.defaultPaymentMethod,
  language: DEFAULT_SETTINGS.language,
  userName: DEFAULT_SETTINGS.userName,
  loaded: false,
  load: async () => {
    const s = await getAllSettings();
    set({ ...s, loaded: true });
  },
  setCurrency: async (v) => {
    await setSetting(SETTING_KEYS.currency, v);
    set({ currency: v });
  },
  setDefaultPaymentMethod: async (v) => {
    await setSetting(SETTING_KEYS.defaultPaymentMethod, v);
    set({ defaultPaymentMethod: v });
  },
  setLanguage: async (v) => {
    await setSetting(SETTING_KEYS.language, v);
    set({ language: v });
  },
  setUserName: async (v) => {
    await setSetting(SETTING_KEYS.userName, v.trim());
    set({ userName: v.trim() });
  },
}));

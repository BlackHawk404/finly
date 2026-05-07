"use client";

import { create } from "zustand";
import { DEFAULT_SETTINGS, getAllSettings, setSetting, SETTING_KEYS } from "@/lib/settings";

interface SettingsState {
  currency: string;
  defaultPaymentMethod: string;
  language: string;
  userName: string;
  profession: string;
  employer: string;
  monthlyIncome: string;
  monthlyIncomeCurrency: string;
  financialGoal: string;
  bio: string;
  loaded: boolean;
  load: () => Promise<void>;
  setCurrency: (v: string) => Promise<void>;
  setDefaultPaymentMethod: (v: string) => Promise<void>;
  setLanguage: (v: string) => Promise<void>;
  setUserName: (v: string) => Promise<void>;
  setProfession: (v: string) => Promise<void>;
  setEmployer: (v: string) => Promise<void>;
  setMonthlyIncome: (v: string) => Promise<void>;
  setMonthlyIncomeCurrency: (v: string) => Promise<void>;
  setFinancialGoal: (v: string) => Promise<void>;
  setBio: (v: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  currency: DEFAULT_SETTINGS.currency,
  defaultPaymentMethod: DEFAULT_SETTINGS.defaultPaymentMethod,
  language: DEFAULT_SETTINGS.language,
  userName: DEFAULT_SETTINGS.userName,
  profession: DEFAULT_SETTINGS.profession,
  employer: DEFAULT_SETTINGS.employer,
  monthlyIncome: DEFAULT_SETTINGS.monthlyIncome,
  monthlyIncomeCurrency: DEFAULT_SETTINGS.monthlyIncomeCurrency,
  financialGoal: DEFAULT_SETTINGS.financialGoal,
  bio: DEFAULT_SETTINGS.bio,
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
  setProfession: async (v) => {
    await setSetting(SETTING_KEYS.profession, v.trim());
    set({ profession: v.trim() });
  },
  setEmployer: async (v) => {
    await setSetting(SETTING_KEYS.employer, v.trim());
    set({ employer: v.trim() });
  },
  setMonthlyIncome: async (v) => {
    await setSetting(SETTING_KEYS.monthlyIncome, v);
    set({ monthlyIncome: v });
  },
  setMonthlyIncomeCurrency: async (v) => {
    await setSetting(SETTING_KEYS.monthlyIncomeCurrency, v);
    set({ monthlyIncomeCurrency: v });
  },
  setFinancialGoal: async (v) => {
    await setSetting(SETTING_KEYS.financialGoal, v.trim());
    set({ financialGoal: v.trim() });
  },
  setBio: async (v) => {
    await setSetting(SETTING_KEYS.bio, v.trim());
    set({ bio: v.trim() });
  },
}));

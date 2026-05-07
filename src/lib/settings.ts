import { db } from "./db";
import { triggerSync } from "./sync";

export const SETTING_KEYS = {
  currency: "currency",
  defaultPaymentMethod: "defaultPaymentMethod",
  language: "language",
  userName: "userName",
  profession: "profession",
  employer: "employer",
  monthlyIncome: "monthlyIncome",
  monthlyIncomeCurrency: "monthlyIncomeCurrency",
  financialGoal: "financialGoal",
  bio: "bio",
} as const;

export const DEFAULT_SETTINGS = {
  currency: "USD",
  defaultPaymentMethod: "card",
  language: "en-US",
  userName: "",
  profession: "",
  employer: "",
  monthlyIncome: "",
  monthlyIncomeCurrency: "",
  financialGoal: "",
  bio: "",
};

export async function getSetting(key: string, fallback: string): Promise<string> {
  const row = await db.settings.get(key);
  return row?.value ?? fallback;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.settings.bulkPut([
    { key, value },
    { key: "__updatedAt", value: new Date().toISOString() },
  ]);
  triggerSync();
}

export async function getAllSettings() {
  const [
    currency,
    defaultPaymentMethod,
    language,
    userName,
    profession,
    employer,
    monthlyIncome,
    monthlyIncomeCurrency,
    financialGoal,
    bio,
  ] = await Promise.all([
    getSetting(SETTING_KEYS.currency, DEFAULT_SETTINGS.currency),
    getSetting(SETTING_KEYS.defaultPaymentMethod, DEFAULT_SETTINGS.defaultPaymentMethod),
    getSetting(SETTING_KEYS.language, DEFAULT_SETTINGS.language),
    getSetting(SETTING_KEYS.userName, DEFAULT_SETTINGS.userName),
    getSetting(SETTING_KEYS.profession, DEFAULT_SETTINGS.profession),
    getSetting(SETTING_KEYS.employer, DEFAULT_SETTINGS.employer),
    getSetting(SETTING_KEYS.monthlyIncome, DEFAULT_SETTINGS.monthlyIncome),
    getSetting(SETTING_KEYS.monthlyIncomeCurrency, DEFAULT_SETTINGS.monthlyIncomeCurrency),
    getSetting(SETTING_KEYS.financialGoal, DEFAULT_SETTINGS.financialGoal),
    getSetting(SETTING_KEYS.bio, DEFAULT_SETTINGS.bio),
  ]);
  return {
    currency,
    defaultPaymentMethod,
    language,
    userName,
    profession,
    employer,
    monthlyIncome,
    monthlyIncomeCurrency,
    financialGoal,
    bio,
  };
}

import { db } from "./db";

export const SETTING_KEYS = {
  currency: "currency",
  defaultPaymentMethod: "defaultPaymentMethod",
  language: "language",
  userName: "userName",
} as const;

export const DEFAULT_SETTINGS = {
  currency: "USD",
  defaultPaymentMethod: "card",
  language: "en-US",
  userName: "",
};

export async function getSetting(key: string, fallback: string): Promise<string> {
  const row = await db.settings.get(key);
  return row?.value ?? fallback;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.settings.put({ key, value });
}

export async function getAllSettings() {
  const [currency, defaultPaymentMethod, language, userName] = await Promise.all([
    getSetting(SETTING_KEYS.currency, DEFAULT_SETTINGS.currency),
    getSetting(SETTING_KEYS.defaultPaymentMethod, DEFAULT_SETTINGS.defaultPaymentMethod),
    getSetting(SETTING_KEYS.language, DEFAULT_SETTINGS.language),
    getSetting(SETTING_KEYS.userName, DEFAULT_SETTINGS.userName),
  ]);
  return { currency, defaultPaymentMethod, language, userName };
}

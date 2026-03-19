import { de } from './de';
import { en } from './en';
import type { Language } from './types';

export { de, en };
export type { Language } from './types';

export const translations = {
  de,
  en,
} as const;

export type TranslationKey = keyof typeof de;

export function translate(
  language: Language,
  key: TranslationKey,
  params?: Record<string, string | number | null | undefined>
) {
  const template = translations[language][key] ?? de[key] ?? key;

  if (!params) {
    return template;
  }

  return Object.entries(params).reduce((result, [paramKey, paramValue]) => {
    return result.replaceAll(`{{${paramKey}}}`, String(paramValue ?? ''));
  }, template);
}

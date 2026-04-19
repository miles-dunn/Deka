export const COMMON_LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "Arabic",
  "Somali",
  "Swahili",
  "Mandarin",
  "Hindi",
  "Portuguese",
  "German",
  "Japanese"
] as const;

export type SupportedLanguage = (typeof COMMON_LANGUAGES)[number];

export const isSupportedLanguage = (value: string): value is SupportedLanguage =>
  COMMON_LANGUAGES.some((language) => language.toLowerCase() === value.trim().toLowerCase());

export const normalizeSupportedLanguage = (value: string): SupportedLanguage | null => {
  const language = COMMON_LANGUAGES.find((item) => item.toLowerCase() === value.trim().toLowerCase());

  return language ?? null;
};

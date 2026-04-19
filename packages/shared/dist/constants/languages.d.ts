export declare const COMMON_LANGUAGES: readonly ["English", "Spanish", "French", "Arabic", "Somali", "Swahili", "Mandarin", "Hindi", "Portuguese", "German", "Japanese"];
export type SupportedLanguage = (typeof COMMON_LANGUAGES)[number];
export declare const isSupportedLanguage: (value: string) => value is SupportedLanguage;
export declare const normalizeSupportedLanguage: (value: string) => SupportedLanguage | null;

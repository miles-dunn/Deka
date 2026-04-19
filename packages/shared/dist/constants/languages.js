"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeSupportedLanguage = exports.isSupportedLanguage = exports.COMMON_LANGUAGES = void 0;
exports.COMMON_LANGUAGES = [
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
];
const isSupportedLanguage = (value) => exports.COMMON_LANGUAGES.some((language) => language.toLowerCase() === value.trim().toLowerCase());
exports.isSupportedLanguage = isSupportedLanguage;
const normalizeSupportedLanguage = (value) => {
    const language = exports.COMMON_LANGUAGES.find((item) => item.toLowerCase() === value.trim().toLowerCase());
    return language ?? null;
};
exports.normalizeSupportedLanguage = normalizeSupportedLanguage;

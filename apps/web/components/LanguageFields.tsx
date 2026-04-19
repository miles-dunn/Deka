import { COMMON_LANGUAGES } from "@translator/shared";

interface LanguageFieldsProps {
  disabled?: boolean;
}

export function LanguageFields({ disabled }: LanguageFieldsProps) {
  return (
    <>
      <div className="field">
        <label htmlFor="nativeLanguage">Native language</label>
        <select id="nativeLanguage" name="nativeLanguage" required disabled={disabled} defaultValue="">
          <option value="" disabled>
            Select a language
          </option>
          {COMMON_LANGUAGES.map((language) => (
            <option value={language} key={language}>
              {language}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="targetLanguage">Target language</label>
        <select id="targetLanguage" name="targetLanguage" required disabled={disabled} defaultValue="">
          <option value="" disabled>
            Select a language
          </option>
          {COMMON_LANGUAGES.map((language) => (
            <option value={language} key={language}>
              {language}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}

interface TargetLanguageFieldProps {
  disabled?: boolean;
}

export function TargetLanguageField({ disabled }: TargetLanguageFieldProps) {
  return (
    <div className="field">
      <label htmlFor="targetLanguage">Language to translate to</label>
      <select id="targetLanguage" name="targetLanguage" required disabled={disabled} defaultValue="">
        <option value="" disabled>
          Select a language
        </option>
        {COMMON_LANGUAGES.map((language) => (
          <option value={language} key={language}>
            {language}
          </option>
        ))}
      </select>
    </div>
  );
}

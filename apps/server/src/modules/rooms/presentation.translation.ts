import { env } from "../../config/env";

const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";

interface TranslatePresentationTurnInput {
  sourceText: string;
  sourceLanguage: string;
  targetLanguage: string;
}

interface OpenAIChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
}

const fallbackTranslation = (sourceText: string, targetLanguage: string) => `[${targetLanguage}] ${sourceText}`;

export const translatePresentationTurn = async ({
  sourceText,
  sourceLanguage,
  targetLanguage
}: TranslatePresentationTurnInput): Promise<string> => {
  if (sourceLanguage.toLowerCase() === targetLanguage.toLowerCase()) {
    return sourceText;
  }

  if (!env.openaiApiKey) {
    return fallbackTranslation(sourceText, targetLanguage);
  }

  const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.openaiApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: [
            "You are a professional conference interpreter.",
            `Translate from ${sourceLanguage} to ${targetLanguage}.`,
            "Return only the translated sentence with natural wording.",
            "Do not add notes, labels, or explanations."
          ].join(" ")
        },
        {
          role: "user",
          content: sourceText
        }
      ]
    })
  });

  const payload = (await response.json().catch(() => ({}))) as OpenAIChatCompletionResponse;

  if (!response.ok) {
    return fallbackTranslation(sourceText, targetLanguage);
  }

  const translated = payload.choices?.[0]?.message?.content?.trim();
  return translated && translated.length > 0 ? translated : fallbackTranslation(sourceText, targetLanguage);
};

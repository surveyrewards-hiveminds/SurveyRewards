import { useState } from "react";
import axios from "axios";

const API_KEY = import.meta.env.VITE_GOOGLE_CLOUD_API_KEY;

export function useGoogleTranslate() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Translate a single string or an array of strings.
   * @param text - string or array of strings to translate
   * @param target - target language code
   * @param source - optional source language code
   * @returns translated string or array of strings (same shape as input)
   */
  const translate = async (
    text: string | string[],
    target: string,
    source?: string
  ): Promise<string | string[] | null> => {
    setLoading(true);
    setError(null);
    try {
      // Map 'cn' to 'zh-CN' for Google Translate API
      const mappedTarget = target === "cn" ? "zh-CN" : target;
      const mappedSource = source === "cn" ? "zh-CN" : source;
      const url = `https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`;
      const body: any = {
        q: Array.isArray(text) ? text : [text],
        target: mappedTarget,
      };
      if (mappedSource) body.source = mappedSource;

      const { data } = await axios.post(url, body);
      const translations = data.data.translations.map(
        (t: any) => t.translatedText
      );
      setLoading(false);
      // Return same shape as input
      return Array.isArray(text) ? translations : translations[0];
    } catch (err: any) {
      setError(err.message || "Translation failed");
      setLoading(false);
      return null;
    }
  };

  return { translate, loading, error };
}

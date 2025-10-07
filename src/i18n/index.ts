import en from "./en";
import id from "./id";
import ja from "./ja";
import cn from "./cn";

export const dictionary = { en, id, cn, ja };
export type DictionaryKey = keyof typeof en; // For type safety in <Text tid="..." />

export function getTranslation(
  key: keyof (typeof dictionary)["en"],
  language: keyof typeof dictionary = "en"
): string {
  const result =
    (dictionary[language] as Record<string, string>)[key] ||
    (dictionary["en"] as Record<string, string>)[key] || // fallback to English
    key; // fallback to key itself
  return result;
}

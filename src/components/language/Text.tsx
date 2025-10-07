import React from "react";
import { useLanguage } from "../../context/LanguageContext";
import { dictionary, DictionaryKey } from "../../i18n";

interface TextProps {
  tid: DictionaryKey;
}
interface TextProps {
  tid: keyof (typeof dictionary)["en"];
}

export function Text({ tid }: TextProps) {
  const { language } = useLanguage();
  return (
    <>
      {(dictionary[language] as Record<string, string>)[tid] ||
        (dictionary["en"] as Record<string, string>)[tid] ||
        tid}
    </>
  );
}

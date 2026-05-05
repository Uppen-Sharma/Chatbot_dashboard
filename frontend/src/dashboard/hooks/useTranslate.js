import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { translateTexts } from "../../services/apiClient";

// Maps i18next language codes to Azure Translator BCP-47 codes.
// "en" is the source language — no API call needed.
const LANG_TO_AZURE = {
  en: "en",
  ja: "ja",
  cn: "zh-Hant",
};

/**
 * Translates an array of strings whenever the app language or the source
 * texts change.
 *
 * @param {string[]} texts  - Array of source strings (English from the API).
 * @returns {{ translated: string[], isTranslating: boolean }}
 *   - translated:    Same-length array. Falls back to original strings on error
 *                    or while the current language is English.
 *   - isTranslating: True only while an Azure call is in-flight.
 */
export function useTranslate(texts) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;
  const azureLang = LANG_TO_AZURE[currentLang] ?? currentLang;

  // Only active when there are texts to translate and language is not English.
  const needsTranslation = !!texts?.length && azureLang !== "en";

  // Stable key identifying the current (language + texts) pair. The async
  // result stores the key it resolved for, so we can derive `isTranslating`
  // by comparing without setting state synchronously inside the effect.
  const textsKey = JSON.stringify(texts);
  const requestKey = needsTranslation ? `${azureLang}|${textsKey}` : null;

  const [asyncResult, setAsyncResult] = useState({ key: null, data: null });

  // Track the latest request so stale responses from previous language
  // switches don't overwrite a newer result.
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!needsTranslation) return;

    const requestId = ++requestIdRef.current;

    translateTexts(texts, azureLang)
      .then((result) => {
        // Discard if a newer request has already been dispatched.
        if (requestId !== requestIdRef.current) return;
        setAsyncResult({ key: requestKey, data: result });
      })
      .catch(() => {
        if (requestId !== requestIdRef.current) return;
        // Graceful degradation: show original English strings on failure.
        setAsyncResult({ key: requestKey, data: texts });
      });
  }, [requestKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derive both outputs during render — no synchronous setState in effect.
  const translated =
    needsTranslation && asyncResult.key === requestKey
      ? asyncResult.data
      : texts ?? [];
  const isTranslating = needsTranslation && asyncResult.key !== requestKey;

  return { translated, isTranslating };
}

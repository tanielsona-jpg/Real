import { useState } from "react";

export function useOriginalText() {
  const [openOriginal, setOpenOriginal]       = useState({});
  const [originalText, setOriginalText]       = useState({});
  const [loadingOriginal, setLoadingOriginal] = useState({});

  async function toggleOriginal(book, chapter, verse) {
    const key = `${book}-${chapter}-${verse}`;

    if (openOriginal[key]) {
      setOpenOriginal((prev) => ({ ...prev, [key]: false }));
      return;
    }
    if (originalText[key]) {
      setOpenOriginal((prev) => ({ ...prev, [key]: true }));
      return;
    }

    try {
      setLoadingOriginal((prev) => ({ ...prev, [key]: true }));
      const response = await fetch(
        `https://bible-api.com/${encodeURIComponent(`${book} ${chapter}:${verse}`)}`
      );
      const data = await response.json();
      const text = data?.text?.trim() || "Não foi possível carregar agora.";
      setOriginalText((prev) => ({ ...prev, [key]: text }));
      setOpenOriginal((prev) => ({ ...prev, [key]: true }));
    } catch {
      setOriginalText((prev) => ({ ...prev, [key]: "Erro ao carregar o texto online." }));
      setOpenOriginal((prev) => ({ ...prev, [key]: true }));
    } finally {
      setLoadingOriginal((prev) => ({ ...prev, [key]: false }));
    }
  }

  return { toggleOriginal, openOriginal, originalText, loadingOriginal };
}

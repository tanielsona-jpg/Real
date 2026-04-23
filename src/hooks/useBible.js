import { useEffect, useMemo, useState } from "react";
import ra from "../data/almeida_ra.json";
import rc from "../data/almeida_rc.json";
import { fetchApiChapter } from "../utils/apiBible";

export const VERSIONS = [
  { id: "ARA", label: "ARA", local: true  },
  { id: "ARC", label: "ARC", local: true  },
  { id: "NVT", label: "NVT", local: false },
  { id: "NVI", label: "NVI", local: false },
];

export function useBible(selectedBook, selectedChapter) {
  const [selectedVersion, setSelectedVersion] = useState("ARA");
  const [apiVersesCache, setApiVersesCache]   = useState({});
  const [apiLoading, setApiLoading]           = useState(false);
  const [apiError, setApiError]               = useState(null);

  const books = useMemo(() => (
    [...new Set(ra.verses.map((v) => v.book_name))]
  ), []);

  const chapters = useMemo(() => {
    if (!selectedBook) return [];
    return [...new Set(
      ra.verses
        .filter((v) => v.book_name === selectedBook)
        .map((v) => Number(v.chapter))
    )].sort((a, b) => a - b);
  }, [selectedBook]);

  const versesRA = useMemo(() => {
    if (!selectedBook || !selectedChapter) return [];
    return ra.verses.filter(
      (v) =>
        v.book_name === selectedBook &&
        Number(v.chapter) === Number(selectedChapter)
    );
  }, [selectedBook, selectedChapter]);

  const versesCompared = useMemo(() => (
    versesRA.map((verseRA) => {
      const verseRC = rc.verses.find(
        (v) =>
          v.book_name === verseRA.book_name &&
          Number(v.chapter) === Number(verseRA.chapter) &&
          Number(v.verse) === Number(verseRA.verse)
      );
      return { verse: Number(verseRA.verse), ra: verseRA.text, rc: verseRC?.text || "" };
    })
  ), [versesRA]);

  const localVerses = useMemo(() => {
    if (selectedVersion === "ARC")
      return versesCompared.map((v) => ({ verse: v.verse, text: v.rc }));
    return versesCompared.map((v) => ({ verse: v.verse, text: v.ra }));
  }, [versesCompared, selectedVersion]);

  const isApiVersion  = ["NVI", "NVT"].includes(selectedVersion);
  const apiCacheKey   = `${selectedVersion}-${selectedBook}-${selectedChapter}`;
  const currentVerses = isApiVersion
    ? (apiVersesCache[apiCacheKey] ?? [])
    : localVerses;

  const textoCapitulo = useMemo(() => (
    currentVerses.map((v) => `${v.verse}. ${v.text}`).join(" ")
  ), [currentVerses]);

  const verseOfDay = useMemo(() => {
    const dayIndex = new Date().getDate();
    const index    = (dayIndex * 37) % ra.verses.length;
    return ra.verses[index];
  }, []);

  useEffect(() => {
    if (!selectedBook || !selectedChapter) return;
    if (!isApiVersion) return;
    if (apiVersesCache[apiCacheKey]) return;

    setApiLoading(true);
    setApiError(null);

    fetchApiChapter(selectedVersion, selectedBook, selectedChapter)
      .then((verses) => {
        setApiVersesCache((prev) => ({ ...prev, [apiCacheKey]: verses }));
      })
      .catch((err) => setApiError(err.message))
      .finally(() => setApiLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVersion, selectedBook, selectedChapter]);

  function changeVersion(versionId) {
    setSelectedVersion(versionId);
    setApiError(null);
  }

  return {
    books,
    chapters,
    currentVerses,
    textoCapitulo,
    verseOfDay,
    selectedVersion,
    changeVersion,
    isApiVersion,
    apiLoading,
    apiError,
    VERSIONS,
  };
}

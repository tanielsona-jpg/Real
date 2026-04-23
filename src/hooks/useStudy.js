import { useEffect, useState } from "react";

const STUDY_CHAPTER_KEY = "fa_study_chapter";
const STUDY_BOOK_KEY    = "fa_study_book";

export const STUDY_PLAN = [
  "Daniel",
  "Salmos",
  "Provérbios",
  "João",
  "Romanos",
  "Gênesis",
  "Isaías",
  "Mateus",
  "Atos",
  "Apocalipse",
];

export function useStudy() {
  const [studyBook, setStudyBook] = useState(
    localStorage.getItem(STUDY_BOOK_KEY) || STUDY_PLAN[0]
  );
  const [lastStudyChapter, setLastStudyChapterState] = useState(
    Number(localStorage.getItem(STUDY_CHAPTER_KEY)) || 1
  );

  useEffect(() => {
    localStorage.setItem(STUDY_CHAPTER_KEY, String(lastStudyChapter));
  }, [lastStudyChapter]);

  useEffect(() => {
    localStorage.setItem(STUDY_BOOK_KEY, studyBook);
  }, [studyBook]);

  function setLastStudyChapter(chapter) {
    setLastStudyChapterState(chapter);
  }

  function changeStudyBook(book) {
    setStudyBook(book);
    setLastStudyChapterState(1);
  }

  return { studyBook, lastStudyChapter, setLastStudyChapter, changeStudyBook, STUDY_PLAN };
}

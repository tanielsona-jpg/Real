import React, { useEffect, useMemo, useState } from "react";
import "./styles.css";
import ra from "./data/almeida_ra.json";
import rc from "./data/almeida_rc.json";

// Firebase
import { auth, googleProvider } from "./firebase";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";

// Componentes
import Onboarding    from "./components/Onboarding";
import Anotacoes     from "./components/Anotacoes";
import CanelaDeFogo  from "./components/CanelaDeFogo";

// API.Bible
import { fetchApiChapter } from "./utils/apiBible";
// ─────────────────────────────────────────────────────────────────
const STUDY_BOOK       = "Daniel";
const THEME_KEY        = "fa_theme";
const TAB_KEY          = "fa_tab";
const STUDY_CHAPTER_KEY = "fa_study_chapter";
const ONBOARDING_KEY   = "fa_onboarding_done";

const VERSIONS = [
  { id: 'ARA', label: 'ARA', local: true },
  { id: 'ARC', label: 'ARC', local: true },
  { id: 'NVT', label: 'NVT', local: false },
  { id: 'NVI', label: 'NVI', local: false },
];

const TABS = [
  { id: "home",  emoji: "🏠", label: "Início"  },
  { id: "bible", emoji: "📖", label: "Bíblia"  },
  { id: "study", emoji: "✝️",  label: "Estudo"  },
  { id: "you",   emoji: "👤", label: "Você"    },
];

export default function App() {

  // ── Auth & onboarding ────────────────────────────────────────────
  const [user, setUser]           = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(
    !!localStorage.getItem(ONBOARDING_KEY)
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return unsub;
  }, []);

  function handleOnboardingComplete() {
    localStorage.setItem(ONBOARDING_KEY, "1");
    setOnboardingDone(true);
  }

  // ── App state ────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState(
    localStorage.getItem(TAB_KEY) || "home"
  );
  const [theme, setTheme] = useState(
    localStorage.getItem(THEME_KEY) || "light"
  );
  const [selectedBook, setSelectedBook]       = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [openOriginal, setOpenOriginal]       = useState({});
  const [originalText, setOriginalText]       = useState({});
  const [loadingOriginal, setLoadingOriginal] = useState({});

  // ── Seletor de versão ────────────────────────────────────────────
  const [selectedVersion, setSelectedVersion] = useState('ARA');
  const [apiVersesCache, setApiVersesCache]   = useState({});
  const [apiLoading, setApiLoading]           = useState(false);
  const [apiError, setApiError]               = useState(null);

  const [lastStudyChapter, setLastStudyChapter] = useState(
    Number(localStorage.getItem(STUDY_CHAPTER_KEY)) || 1
  );

  // ── Persist state ────────────────────────────────────────────────
  useEffect(() => { localStorage.setItem(THEME_KEY, theme); }, [theme]);
  useEffect(() => { localStorage.setItem(TAB_KEY, activeTab); }, [activeTab]);
  useEffect(() => {
    localStorage.setItem(STUDY_CHAPTER_KEY, String(lastStudyChapter));
  }, [lastStudyChapter]);

  // ── Bible data ───────────────────────────────────────────────────
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

  // Versículos locais normalizados para a versão selecionada
  const localVerses = useMemo(() => {
    if (selectedVersion === 'ARC')
      return versesCompared.map(v => ({ verse: v.verse, text: v.rc }));
    // ARA (padrão)
    return versesCompared.map(v => ({ verse: v.verse, text: v.ra }));
  }, [versesCompared, selectedVersion]);

  // Versículos da versão em uso (local ou API)
  const isApiVersion = ['NVI', 'NVT'].includes(selectedVersion);
  const apiCacheKey  = `${selectedVersion}-${selectedBook}-${selectedChapter}`;
  const currentVerses = isApiVersion
    ? (apiVersesCache[apiCacheKey] ?? [])
    : localVerses;

  // Fetch da API quando necessário
  useEffect(() => {
    if (!selectedBook || !selectedChapter) return;
    if (!isApiVersion) return;
    if (apiVersesCache[apiCacheKey]) return; // já em cache

    setApiLoading(true);
    setApiError(null);

    fetchApiChapter(selectedVersion, selectedBook, selectedChapter)
      .then(verses => {
        setApiVersesCache(prev => ({ ...prev, [apiCacheKey]: verses }));
      })
      .catch(err => setApiError(err.message))
      .finally(() => setApiLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVersion, selectedBook, selectedChapter]);

  // Texto plano do capítulo para a IA (usa a versão ativa)
  const textoCapitulo = useMemo(() => (
    currentVerses.map(v => `${v.verse}. ${v.text}`).join(' ')
  ), [currentVerses]);

  useEffect(() => {
    if (selectedBook === STUDY_BOOK && selectedChapter) {
      setLastStudyChapter(Number(selectedChapter));
    }
  }, [selectedBook, selectedChapter]);

  // Versículo do dia
  const verseOfDay = useMemo(() => {
    const dayIndex = new Date().getDate();
    const index = (dayIndex * 37) % ra.verses.length;
    return ra.verses[index];
  }, []);

  // ── Navigation ───────────────────────────────────────────────────
  function goToBibleHome() {
    setSelectedBook(null);
    setSelectedChapter(null);
    setActiveTab("bible");
  }
  function openBook(bookName) {
    setSelectedBook(bookName);
    setSelectedChapter(null);
    setActiveTab("bible");
  }
  function openChapter(bookName, chapterNumber) {
    setSelectedBook(bookName);
    setSelectedChapter(Number(chapterNumber));
    setActiveTab("bible");
  }
  function continueStudy() { openChapter(STUDY_BOOK, lastStudyChapter); }

  function previousChapter() {
    const idx = chapters.indexOf(Number(selectedChapter));
    if (idx > 0) setSelectedChapter(chapters[idx - 1]);
  }
  function nextChapter() {
    const idx = chapters.indexOf(Number(selectedChapter));
    if (idx >= 0 && idx < chapters.length - 1) setSelectedChapter(chapters[idx + 1]);
  }

  // ── Toggle KJV original ──────────────────────────────────────────
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

  // ════════════════════════════════════════════════════════════════
  // RENDER FUNCTIONS
  // ════════════════════════════════════════════════════════════════

  // ── Home ─────────────────────────────────────────────────────────
  function renderHome() {
    const nome = localStorage.getItem("fa_nome") || "";
    return (
      <div className="screen">
        <div className="screen-header">
          {nome && <p className="screen-greeting">Olá, {nome.split(" ")[0]}! 👋</p>}
          <h2 className="screen-title">Início</h2>
          <p className="screen-sub">Leitura diária e continuidade da caminhada.</p>
        </div>

        {/* Versículo do dia */}
        <div className="card card--verse">
          <div className="card__eyebrow card__eyebrow--accent">✦ Versículo do dia</div>
          <div className="card__reference">
            {verseOfDay.book_name} {verseOfDay.chapter}:{verseOfDay.verse}
          </div>
          <p className="card__verse-text">{verseOfDay.text}</p>
        </div>

        {/* Estudo */}
        <div className="card card--study">
          <div className="card__eyebrow card__eyebrow--green">📖 Estudo Família Azevedo</div>
          <div className="card__meta-row">
            <span className="card__meta-item">
              <span className="card__meta-label">Livro</span>
              <span className="card__meta-value">{STUDY_BOOK}</span>
            </span>
            <span className="card__meta-sep" />
            <span className="card__meta-item">
              <span className="card__meta-label">Capítulo</span>
              <span className="card__meta-value">{lastStudyChapter}</span>
            </span>
          </div>
          <button className="btn btn--primary" onClick={continueStudy}>
            Continuar estudo →
          </button>
        </div>
      </div>
    );
  }

  // ── Bible ────────────────────────────────────────────────────────
  function renderBible() {
    if (!selectedBook) return (
      <div className="screen">
        <div className="screen-header">
          <h2 className="screen-title">Bíblia</h2>
          <p className="screen-sub">Selecione um livro para começar.</p>
        </div>
        <div className="book-list">
          {books.map((book) => (
            <button key={book} className="book-item" onClick={() => openBook(book)}>
              <span className="book-item__name">{book}</span>
              <span className="book-item__arrow">›</span>
            </button>
          ))}
        </div>
      </div>
    );

    if (!selectedChapter) return (
      <div className="screen">
        <button className="back-btn" onClick={goToBibleHome}>‹ Voltar</button>
        <div className="screen-header">
          <h2 className="screen-title">{selectedBook}</h2>
          <p className="screen-sub">Selecione um capítulo.</p>
        </div>
        <div className="chapter-grid">
          {chapters.map((chapter) => (
            <button
              key={chapter}
              className="chapter-btn"
              onClick={() => setSelectedChapter(chapter)}
            >
              {chapter}
            </button>
          ))}
        </div>
      </div>
    );

    const currentIndex = chapters.indexOf(Number(selectedChapter));
    const isFirst = currentIndex <= 0;
    const isLast  = currentIndex === chapters.length - 1;

    return (
      <div className="screen reading-screen">
        <button className="back-btn" onClick={() => setSelectedChapter(null)}>
          ‹ Voltar
        </button>

        <div className="chapter-nav">
          <button className="nav-arrow" onClick={previousChapter} disabled={isFirst} aria-label="Capítulo anterior">‹</button>
          <h2 className="chapter-nav__title">
            {selectedBook} <span className="chapter-nav__num">{selectedChapter}</span>
          </h2>
          <button className="nav-arrow" onClick={nextChapter} disabled={isLast} aria-label="Próximo capítulo">›</button>
        </div>

        {/* Seletor de versão */}
        <div className="version-selector">
          {VERSIONS.map(v => (
            <button
              key={v.id}
              className={`version-tab${selectedVersion === v.id ? ' version-tab--active' : ''}`}
              onClick={() => { setSelectedVersion(v.id); setApiError(null); }}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* Estado de carregamento da API */}
        {apiLoading && (
          <div className="version-loading">
            <div className="canela-loading" style={{ background: 'transparent' }}>
              <span /><span /><span />
            </div>
            <p>Carregando {selectedVersion}…</p>
          </div>
        )}

        {/* Erro da API */}
        {apiError && !apiLoading && (
          <div className="version-error">
            <p>⚠ {apiError}</p>
          </div>
        )}

        {/* Versículos */}
        {!apiLoading && !apiError && (
          <div className="verses-wrap">
            {currentVerses.map((v) => {
              const key = `${selectedBook}-${selectedChapter}-${v.verse}`;
              return (
                <div key={key} className="verse-block">
                  <div className="verse-block__number"><span>{v.verse}</span></div>
                  <div className="verse-block__body">
                    <p className="verse-text">{v.text}</p>

                    {/* Botão KJV apenas para versões locais */}
                    {!isApiVersion && (
                      <>
                        <button
                          className="btn btn--ghost btn--sm"
                          onClick={() => toggleOriginal(selectedBook, selectedChapter, v.verse)}
                        >
                          {loadingOriginal[key]
                            ? "⏳ Carregando..."
                            : openOriginal[key]
                            ? "▲ Ocultar KJV"
                            : "🌐 Ver KJV"}
                        </button>
                        {openOriginal[key] && !loadingOriginal[key] && (
                          <div className="original-block">
                            <span className="version-badge version-badge--kjv">KJV</span>
                            <p className="original-text">{originalText[key]}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Anotações + IA (apenas quando capítulo selecionado) ── */}
        <div className="reading-extras">
          <Anotacoes livro={selectedBook} capitulo={selectedChapter} />
        </div>

        {/* FAB da Canela de Fogo */}
        <CanelaDeFogo
          livro={selectedBook}
          capitulo={selectedChapter}
          textoCapitulo={textoCapitulo}
        />
      </div>
    );
  }

  // ── Study ────────────────────────────────────────────────────────
  function renderStudy() {
    return (
      <div className="screen">
        <div className="screen-header">
          <h2 className="screen-title">Estudo Família Azevedo</h2>
          <p className="screen-sub">Acompanhe o progresso da família.</p>
        </div>
        <div className="card card--study">
          <div className="card__eyebrow card__eyebrow--green">✦ Progresso atual</div>
          <div className="card__meta-row">
            <span className="card__meta-item">
              <span className="card__meta-label">Livro</span>
              <span className="card__meta-value">{STUDY_BOOK}</span>
            </span>
            <span className="card__meta-sep" />
            <span className="card__meta-item">
              <span className="card__meta-label">Capítulo</span>
              <span className="card__meta-value">{lastStudyChapter}</span>
            </span>
          </div>
          <div className="study-actions">
            <button className="btn btn--primary" onClick={continueStudy}>
              Continuar estudo →
            </button>
            <button className="btn btn--secondary" onClick={() => openBook(STUDY_BOOK)}>
              Ver todos os capítulos
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── You ──────────────────────────────────────────────────────────
  function renderYou() {
    const nome = localStorage.getItem("fa_nome") || "—";

    async function handleLogin() {
      try { await signInWithPopup(auth, googleProvider); }
      catch { /* usuário fechou o popup */ }
    }
    async function handleLogout() {
      await signOut(auth);
    }

    return (
      <div className="screen">
        <div className="screen-header">
          <h2 className="screen-title">Você</h2>
          <p className="screen-sub">Suas preferências e progresso.</p>
        </div>

        {/* Perfil */}
        <div className="card">
          <div className="card__eyebrow">✦ Perfil</div>
          {user ? (
            <div className="you-profile">
              <img
                src={user.photoURL || ""}
                alt={user.displayName || ""}
                className="you-avatar"
              />
              <div className="you-info">
                <p className="you-name">{user.displayName || nome}</p>
                <p className="you-email">{user.email}</p>
              </div>
            </div>
          ) : (
            <div className="you-profile">
              <div className="you-avatar you-avatar--placeholder">
                {nome.charAt(0).toUpperCase() || "?"}
              </div>
              <div className="you-info">
                <p className="you-name">{nome}</p>
                <p className="you-email">Não conectado</p>
              </div>
            </div>
          )}

          {user ? (
            <button className="btn btn--secondary" onClick={handleLogout}>
              Sair da conta
            </button>
          ) : (
            <button className="btn btn--google" onClick={handleLogin}>
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google"
                width="18"
                height="18"
              />
              Entrar com Google
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="profile-cards">
          <div className="profile-card">
            <span className="profile-card__icon">📚</span>
            <span className="profile-card__label">Livro de estudo</span>
            <span className="profile-card__value">{STUDY_BOOK}</span>
          </div>
          <div className="profile-card">
            <span className="profile-card__icon">🔖</span>
            <span className="profile-card__label">Último capítulo</span>
            <span className="profile-card__value">{lastStudyChapter}</span>
          </div>
          <div className="profile-card">
            <span className="profile-card__icon">{theme === "dark" ? "🌙" : "☀️"}</span>
            <span className="profile-card__label">Tema</span>
            <span className="profile-card__value">{theme === "dark" ? "Escuro" : "Claro"}</span>
          </div>
          <div className="profile-card">
            <span className="profile-card__icon">☁️</span>
            <span className="profile-card__label">Anotações</span>
            <span className="profile-card__value">{user ? "Na nuvem" : "Local"}</span>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // ROOT RENDER
  // ════════════════════════════════════════════════════════════════

  // Aguarda Firebase inicializar antes de mostrar qualquer coisa
  if (!authReady) return (
    <div className="app-loading">
      <span className="app-loading-icon">✝</span>
      <span className="app-loading-text">Família Azevedo</span>
    </div>
  );

  // Onboarding na primeira visita
  if (!onboardingDone) return (
    <Onboarding onComplete={handleOnboardingComplete} />
  );

  return (
    <div className={`app ${theme}`}>

      <header className="topbar">
        <div className="topbar__brand">
          <div className="topbar__logo-wrap">
            <span className="topbar__logo">✝</span>
          </div>
          <h1 className="topbar__title">Família Azevedo</h1>
        </div>
        <button
          className="theme-btn"
          onClick={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
          aria-label="Alternar tema"
        >
          {theme === "light" ? "🌙" : "☀️"}
        </button>
      </header>

      <main className="content">
        {activeTab === "home"  && renderHome()}
        {activeTab === "bible" && renderBible()}
        {activeTab === "study" && renderStudy()}
        {activeTab === "you"   && renderYou()}
      </main>

      <nav className="bottom-nav">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? "tab--active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab__emoji">{tab.emoji}</span>
            <span className="tab__label">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

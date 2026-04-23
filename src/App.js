import React, { useEffect, useState } from "react";
import "./styles.css";

// Firebase
import { auth, googleProvider } from "./firebase";
import { signInWithPopup, signOut } from "firebase/auth";

// Componentes
import Onboarding   from "./components/Onboarding";
import Anotacoes    from "./components/Anotacoes";
import CanelaDeFogo from "./components/CanelaDeFogo";
import Favoritos    from "./components/Favoritos";

// Hooks
import { useAuth }         from "./hooks/useAuth";
import { useBible }        from "./hooks/useBible";
import { useStudy }        from "./hooks/useStudy";
import { useOriginalText } from "./hooks/useOriginalText";
import { useFavoritos }    from "./hooks/useFavoritos";

// ─────────────────────────────────────────────────────────────────
const THEME_KEY      = "fa_theme";
const TAB_KEY        = "fa_tab";
const ONBOARDING_KEY = "fa_onboarding_done";

const TABS = [
  { id: "home",      emoji: "🏠", label: "Início"    },
  { id: "bible",     emoji: "📖", label: "Bíblia"    },
  { id: "study",     emoji: "✝️",  label: "Estudo"    },
  { id: "favoritos", emoji: "⭐", label: "Salvos"    },
  { id: "you",       emoji: "👤", label: "Você"      },
];

export default function App() {

  // ── Auth & onboarding ────────────────────────────────────────────
  const { user, authReady } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState(
    !!localStorage.getItem(ONBOARDING_KEY)
  );

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

  useEffect(() => { localStorage.setItem(THEME_KEY, theme); }, [theme]);
  useEffect(() => { localStorage.setItem(TAB_KEY, activeTab); }, [activeTab]);

  // ── Dados bíblicos ───────────────────────────────────────────────
  const {
    books, chapters, currentVerses, textoCapitulo,
    verseOfDay, selectedVersion, changeVersion,
    isApiVersion, apiLoading, apiError, VERSIONS,
  } = useBible(selectedBook, selectedChapter);

  // ── Estudo ───────────────────────────────────────────────────────
  const {
    studyBook, lastStudyChapter, setLastStudyChapter,
    changeStudyBook, STUDY_PLAN,
  } = useStudy();

  useEffect(() => {
    if (selectedBook === studyBook && selectedChapter) {
      setLastStudyChapter(Number(selectedChapter));
    }
  }, [selectedBook, selectedChapter, studyBook, setLastStudyChapter]);

  // ── Texto original (KJV) ─────────────────────────────────────────
  const { toggleOriginal, openOriginal, originalText, loadingOriginal } = useOriginalText();

  // ── Favoritos ────────────────────────────────────────────────────
  const { favoritos, isFavorito, toggleFavorito } = useFavoritos();

  // ── Navegação ────────────────────────────────────────────────────
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
  function continueStudy() { openChapter(studyBook, lastStudyChapter); }

  function previousChapter() {
    const idx = chapters.indexOf(Number(selectedChapter));
    if (idx > 0) setSelectedChapter(chapters[idx - 1]);
  }
  function nextChapter() {
    const idx = chapters.indexOf(Number(selectedChapter));
    if (idx >= 0 && idx < chapters.length - 1) setSelectedChapter(chapters[idx + 1]);
  }

  // ════════════════════════════════════════════════════════════════
  // RENDER FUNCTIONS
  // ════════════════════════════════════════════════════════════════

  function renderHome() {
    const nome = localStorage.getItem("fa_nome") || "";
    return (
      <div className="screen">
        <div className="screen-header">
          {nome && <p className="screen-greeting">Olá, {nome.split(" ")[0]}! 👋</p>}
          <h2 className="screen-title">Início</h2>
          <p className="screen-sub">Leitura diária e continuidade da caminhada.</p>
        </div>

        <div className="card card--verse">
          <div className="card__eyebrow card__eyebrow--accent">✦ Versículo do dia</div>
          <div className="card__reference">
            {verseOfDay.book_name} {verseOfDay.chapter}:{verseOfDay.verse}
          </div>
          <p className="card__verse-text">{verseOfDay.text}</p>
        </div>

        <div className="card card--study">
          <div className="card__eyebrow card__eyebrow--green">📖 Estudo Família Azevedo</div>
          <div className="card__meta-row">
            <span className="card__meta-item">
              <span className="card__meta-label">Livro</span>
              <span className="card__meta-value">{studyBook}</span>
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
    const isFirst      = currentIndex <= 0;
    const isLast       = currentIndex === chapters.length - 1;

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

        <div className="version-selector">
          {VERSIONS.map((v) => (
            <button
              key={v.id}
              className={`version-tab${selectedVersion === v.id ? " version-tab--active" : ""}`}
              onClick={() => changeVersion(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>

        {apiLoading && (
          <div className="version-loading">
            <div className="canela-loading" style={{ background: "transparent" }}>
              <span /><span /><span />
            </div>
            <p>Carregando {selectedVersion}…</p>
          </div>
        )}

        {apiError && !apiLoading && (
          <div className="version-error">
            <p>⚠ {apiError}</p>
          </div>
        )}

        {!apiLoading && !apiError && (
          <div className="verses-wrap">
            {currentVerses.map((v) => {
              const key = `${selectedBook}-${selectedChapter}-${v.verse}`;
              const fav = isFavorito(selectedBook, selectedChapter, v.verse);
              return (
                <div key={key} className="verse-block">
                  <div className="verse-block__number"><span>{v.verse}</span></div>
                  <div className="verse-block__body">
                    <p className="verse-text">{v.text}</p>

                    <div className="verse-actions">
                      <button
                        className={`btn-favorito${fav ? " btn-favorito--ativo" : ""}`}
                        onClick={() => toggleFavorito(selectedBook, selectedChapter, v.verse, v.text)}
                        aria-label={fav ? "Remover dos favoritos" : "Salvar versículo"}
                        title={fav ? "Remover dos salvos" : "Salvar versículo"}
                      >
                        {fav ? "⭐" : "☆"}
                      </button>

                      {!isApiVersion && (
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
                      )}
                    </div>

                    {!isApiVersion && openOriginal[key] && !loadingOriginal[key] && (
                      <div className="original-block">
                        <span className="version-badge version-badge--kjv">KJV</span>
                        <p className="original-text">{originalText[key]}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="reading-extras">
          <Anotacoes livro={selectedBook} capitulo={selectedChapter} />
        </div>

        <CanelaDeFogo
          livro={selectedBook}
          capitulo={selectedChapter}
          textoCapitulo={textoCapitulo}
        />
      </div>
    );
  }

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
              <span className="card__meta-value">{studyBook}</span>
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
            <button className="btn btn--secondary" onClick={() => openBook(studyBook)}>
              Ver todos os capítulos
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card__eyebrow">📋 Plano de leitura</div>
          <div className="study-plan-list">
            {STUDY_PLAN.map((book) => (
              <button
                key={book}
                className={`study-plan-item${book === studyBook ? " study-plan-item--ativo" : ""}`}
                onClick={() => changeStudyBook(book)}
              >
                <span className="study-plan-item__nome">{book}</span>
                {book === studyBook && (
                  <span className="study-plan-item__badge">Atual</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

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

        <div className="profile-cards">
          <div className="profile-card">
            <span className="profile-card__icon">📚</span>
            <span className="profile-card__label">Livro de estudo</span>
            <span className="profile-card__value">{studyBook}</span>
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
            <span className="profile-card__icon">⭐</span>
            <span className="profile-card__label">Versículos salvos</span>
            <span className="profile-card__value">{favoritos.length}</span>
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

  if (!authReady) return (
    <div className="app-loading">
      <span className="app-loading-icon">✝</span>
      <span className="app-loading-text">Família Azevedo</span>
    </div>
  );

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
        {activeTab === "home"      && renderHome()}
        {activeTab === "bible"     && renderBible()}
        {activeTab === "study"     && renderStudy()}
        {activeTab === "favoritos" && <Favoritos favoritos={favoritos} onOpenVerse={openChapter} />}
        {activeTab === "you"       && renderYou()}
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

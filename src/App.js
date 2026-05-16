import React, { useEffect, useMemo, useState } from "react";
import "./styles.css";
import ra from "./data/almeida_ra.json";
import rc from "./data/almeida_rc.json";

import { auth, googleProvider } from "./firebase";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";

import Onboarding from "./components/Onboarding";
import Anotacoes from "./components/Anotacoes";
import CanelaDeFogo from "./components/CanelaDeFogo";

import { fetchApiChapter } from "./utils/apiBible";

const STUDY_BOOK = "Daniel";
const THEME_KEY = "fa_theme";
const TAB_KEY = "fa_tab";
const STUDY_CHAPTER_KEY = "fa_study_chapter";
const ONBOARDING_KEY = "fa_onboarding_done";

const VERSIONS = [
  { id: 'ARA', label: 'ARA', local: true },
  { id: 'ARC', label: 'ARC', local: true },
  { id: 'NVT', label: 'NVT', local: false },
  { id: 'NVI', label: 'NVI', local: false },
  ];

const TABS = [
  { id: "home",  icon: "🏠", label: "Início" },
  { id: "bible", icon: "📖", label: "Bíblia" },
  { id: "study", icon: "✝️", label: "Estudo" },
  { id: "you",   icon: "👤", label: "Você" },
  ];

export default function App() {

  const [user, setUser] = useState(null);
    const [authReady, setAuthReady] = useState(false);
    const [onboardingDone, setOnboardingDone] = useState(
          !!localStorage.getItem(ONBOARDING_KEY)
        );

  useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setAuthReady(true); });
        return unsub;
  }, []);

  function handleOnboardingComplete() {
        localStorage.setItem(ONBOARDING_KEY, "1");
        setOnboardingDone(true);
  }

  const [activeTab, setActiveTab] = useState(localStorage.getItem(TAB_KEY) || "home");
    const [theme, setTheme] = useState(localStorage.getItem(THEME_KEY) || "dark");
    const [selectedBook, setSelectedBook] = useState(null);
    const [selectedChapter, setSelectedChapter] = useState(null);
    const [openOriginal, setOpenOriginal] = useState({});
    const [originalText, setOriginalText] = useState({});
    const [loadingOriginal, setLoadingOriginal] = useState({});
    const [selectedVersion, setSelectedVersion] = useState('ARA');
    const [apiVersesCache, setApiVersesCache] = useState({});
    const [apiLoading, setApiLoading] = useState(false);
    const [apiError, setApiError] = useState(null);
    const [lastStudyChapter, setLastStudyChapter] = useState(
          Number(localStorage.getItem(STUDY_CHAPTER_KEY)) || 1
        );

  useEffect(() => {
        document.body.className = theme;
  }, [theme]);

        useEffect(() => { localStorage.setItem(THEME_KEY, theme); }, [theme]);
    useEffect(() => { localStorage.setItem(TAB_KEY, activeTab); }, [activeTab]);
    useEffect(() => {
          localStorage.setItem(STUDY_CHAPTER_KEY, String(lastStudyChapter));
    }, [lastStudyChapter]);

  const books = useMemo(() => (
        [...new Set(ra.verses.map((v) => v.book_name))]
      ), []);

  const chapters = useMemo(() => {
        if (!selectedBook) return [];
        return [...new Set(
                ra.verses.filter((v) => v.book_name === selectedBook).map((v) => Number(v.chapter))
              )].sort((a, b) => a - b);
  }, [selectedBook]);

  const versesRA = useMemo(() => {
        if (!selectedBook || !selectedChapter) return [];
        return ra.verses.filter(
                (v) => v.book_name === selectedBook && Number(v.chapter) === Number(selectedChapter)
              );
  }, [selectedBook, selectedChapter]);

  const versesCompared = useMemo(() => (
        versesRA.map((verseRA) => {
                const verseRC = rc.verses.find(
                          (v) => v.book_name === verseRA.book_name &&
                                      Number(v.chapter) === Number(verseRA.chapter) &&
                                      Number(v.verse) === Number(verseRA.verse)
                        );
                return { verse: Number(verseRA.verse), ra: verseRA.text, rc: verseRC?.text || "" };
        })
      ), [versesRA]);

  const localVerses = useMemo(() => {
        if (selectedVersion === 'ARC') return versesCompared.map(v => ({ verse: v.verse, text: v.rc }));
        return versesCompared.map(v => ({ verse: v.verse, text: v.ra }));
  }, [versesCompared, selectedVersion]);

  const isApiVersion = ['NVI', 'NVT'].includes(selectedVersion);
    const apiCacheKey = `${selectedVersion}-${selectedBook}-${selectedChapter}`;
    const currentVerses = isApiVersion ? (apiVersesCache[apiCacheKey] ?? []) : localVerses;

  useEffect(() => {
        if (!selectedBook || !selectedChapter || !isApiVersion) return;
        if (apiVersesCache[apiCacheKey]) return;
        setApiLoading(true);
        setApiError(null);
        fetchApiChapter(selectedVersion, selectedBook, selectedChapter)
          .then(verses => setApiVersesCache(prev => ({ ...prev, [apiCacheKey]: verses })))
          .catch(err => setApiError(err.message))
          .finally(() => setApiLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVersion, selectedBook, selectedChapter]);

  const textoCapitulo = useMemo(() => (
        currentVerses.map(v => `${v.verse}. ${v.text}`).join(' ')
      ), [currentVerses]);

  useEffect(() => {
        if (selectedBook === STUDY_BOOK && selectedChapter) {
                setLastStudyChapter(Number(selectedChapter));
        }
  }, [selectedBook, selectedChapter]);

  const verseOfDay = useMemo(() => {
        const dayIndex = new Date().getDate();
        const index = (dayIndex * 37) % ra.verses.length;
        return ra.verses[index];
  }, []);

  function goToBibleHome() { setSelectedBook(null); setSelectedChapter(null); setActiveTab("bible"); }
    function openBook(bookName) { setSelectedBook(bookName); setSelectedChapter(null); setActiveTab("bible"); }
    function openChapter(bookName, chapterNumber) { setSelectedBook(bookName); setSelectedChapter(Number(chapterNumber)); setActiveTab("bible"); }
    function continueStudy() { openChapter(STUDY_BOOK, lastStudyChapter); }

  function previousChapter() {
        const idx = chapters.indexOf(Number(selectedChapter));
        if (idx > 0) setSelectedChapter(chapters[idx - 1]);
  }
    function nextChapter() {
          const idx = chapters.indexOf(Number(selectedChapter));
          if (idx >= 0 && idx < chapters.length - 1) setSelectedChapter(chapters[idx + 1]);
    }

  async function toggleOriginal(book, chapter, verse) {
        const key = `${book}-${chapter}-${verse}`;
        if (openOriginal[key]) { setOpenOriginal(prev => ({ ...prev, [key]: false })); return; }
        if (originalText[key]) { setOpenOriginal(prev => ({ ...prev, [key]: true })); return; }
        try {
                setLoadingOriginal(prev => ({ ...prev, [key]: true }));
                const response = await fetch(`https://bible-api.com/${encodeURIComponent(`${book} ${chapter}:${verse}`)}`);
                const data = await response.json();
                const text = data?.text?.trim() || "Não foi possível carregar agora.";
                setOriginalText(prev => ({ ...prev, [key]: text }));
                setOpenOriginal(prev => ({ ...prev, [key]: true }));
        } catch {
                setOriginalText(prev => ({ ...prev, [key]: "Erro ao carregar o texto online." }));
                setOpenOriginal(prev => ({ ...prev, [key]: true }));
        } finally {
                setLoadingOriginal(prev => ({ ...prev, [key]: false }));
        }
  }

  // ── RENDER HOME ──────────────────────────────────────────────
  function renderHome() {
        const nome = localStorage.getItem("fa_nome") || "";
        return (
                <div className="home-tab">
        {nome && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '-8px' }}>Olá, {nome.split(" ")[0]}! 👋</p>}

{/* Versículo do dia */}
        <div className="verse-card">
                    <div className="verse-card-label">✦ Versículo do dia</div>
                    <div className="verse-ref">{verseOfDay.book_name} {verseOfDay.chapter}:{verseOfDay.verse}</div>
          <p className="verse-text">{verseOfDay.text}</p>
          </div>

{/* Card de estudo */}
        <div className="study-card">
                    <div className="study-card-label">📖 Estudo Família Azevedo</div>
          <div className="study-meta">
                      <div className="study-meta-item">
                        <div className="study-meta-label">Livro</div>
              <div className="study-meta-value">{STUDY_BOOK}</div>
          </div>
            <div className="study-meta-item">
                        <div className="study-meta-label">Capítulo</div>
              <div className="study-meta-value">{lastStudyChapter}</div>
          </div>
          </div>
          <button className="btn-primary" onClick={continueStudy}>Continuar estudo →</button>
          </div>

{/* Canela de Fogo card */}
        <div className="canela-home-card" onClick={() => { setActiveTab("bible"); }}>
          <div className="canela-home-icon">🔥</div>
          <div className="canela-home-text">
                      <h3>Canela de Fogo</h3>
            <p>Converse com a IA sobre qualquer passagem da Bíblia.</p>
          </div>
          </div>
          </div>
    );
}

  // ── RENDER BIBLE ─────────────────────────────────────────────
  function renderBible() {
        // Tela: lista de livros
    if (!selectedBook) {
            return (
                      <div className="bible-tab">
                        <div className="bible-controls">
                          <div className="bible-controls-row">
                            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>Bíblia</span>
      </div>
                <div className="version-tabs">
    {VERSIONS.map(v => (
                      <button key={v.id} className={`version-tab${selectedVersion === v.id ? ' active' : ''}`} onClick={() => setSelectedVersion(v.id)}>{v.label}</button>
              ))}
                </div>
                </div>
          <div className="bible-scroll">
              {books.map((book) => (
                              <div key={book} className="verse-row" onClick={() => openBook(book)} style={{ padding: '12px 4px', borderBottom: '1px solid var(--border)' }}>
                <div className="verse-body" style={{ fontFamily: 'var(--font-body)', fontStyle: 'normal', fontSize: '0.95rem', fontWeight: 500 }}>{book}</div>
                <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>›</span>
                </div>
            ))}
              </div>
              </div>
      );
}

    // Tela: lista de capítulos
    if (!selectedChapter) {
            return (
                      <div className="bible-tab">
                        <div className="bible-controls">
                          <div className="bible-controls-row">
                            <button className="chapter-btn" onClick={goToBibleHome}>‹</button>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', flex: 1, textAlign: 'center' }}>{selectedBook}</span>
              <div style={{ width: 36 }} />
      </div>
            <div className="version-tabs">
    {VERSIONS.map(v => (
                      <button key={v.id} className={`version-tab${selectedVersion === v.id ? ' active' : ''}`} onClick={() => setSelectedVersion(v.id)}>{v.label}</button>
              ))}
                </div>
                </div>
          <div className="bible-scroll">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(52px, 1fr))', gap: '8px', padding: '4px 0' }}>
{chapters.map((chapter) => (
                  <button key={chapter} className="chapter-btn" onClick={() => setSelectedChapter(chapter)}
                  style={{ width: '100%', height: '48px', fontSize: '0.9rem', fontWeight: 700, fontFamily: 'var(--font-body)' }}>
{chapter}
</button>
              ))}
                </div>
                </div>
                </div>
      );
}

    // Tela: leitura do capítulo
    const currentIndex = chapters.indexOf(Number(selectedChapter));
    const isFirst = currentIndex <= 0;
    const isLast = currentIndex === chapters.length - 1;

    return (
            <div className="bible-tab">
              <div className="bible-controls">
                <div className="bible-controls-row">
                  <button className="chapter-btn" onClick={() => setSelectedChapter(null)}>‹</button>
            <div className="chapter-nav" style={{ flex: 1, justifyContent: 'center' }}>
              <button className="chapter-btn" onClick={previousChapter} disabled={isFirst}>‹</button>
              <span className="chapter-indicator">{selectedBook} {selectedChapter}</span>
              <button className="chapter-btn" onClick={nextChapter} disabled={isLast}>›</button>
      </div>
      </div>
          <div className="version-tabs">
    {VERSIONS.map(v => (
                    <button key={v.id} className={`version-tab${selectedVersion === v.id ? ' active' : ''}`}
                      onClick={() => { setSelectedVersion(v.id); setApiError(null); }}>{v.label}</button>
            ))}
              </div>
              </div>

        <div className="bible-scroll">
                        <h2 className="bible-chapter-title">{selectedBook} {selectedChapter}</h2>

{apiLoading && (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <div className="msg-loading" style={{ display: 'inline-flex' }}><span /><span /><span /></div>
              <p style={{ marginTop: 12 }}>Carregando {selectedVersion}…</p>
  </div>
          )}

{apiError && !apiLoading && (
              <div style={{ padding: '16px', background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', marginBottom: 16 }}>
              ⚠ {apiError}
</div>
          )}

{!apiLoading && !apiError && currentVerses.map((v) => {
              const key = `${selectedBook}-${selectedChapter}-${v.verse}`;
              return (
                              <div key={key} className="verse-row">
                                <span className="verse-num">{v.verse}</span>
                                                               <div className="verse-body">
                                                                 <span>{v.text}</span>
                                               {!isApiVersion && (
                      <div style={{ marginTop: 6 }}>
                      <button className="suggestion-pill" style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                        onClick={() => toggleOriginal(selectedBook, selectedChapter, v.verse)}>
                        {loadingOriginal[key] ? "⏳" : openOriginal[key] ? "▲ Ocultar KJV" : "🌐 KJV"}
</button>
{openOriginal[key] && !loadingOriginal[key] && (
                          <div style={{ marginTop: 8, padding: '10px 14px', background: 'rgba(245,158,11,0.08)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--gold-400)' }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.1em', color: 'var(--gold-300)', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>KJV</span>
                          <p style={{ fontFamily: 'var(--font-text)', fontSize: '0.95rem', fontStyle: 'italic', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{originalText[key]}</p>
  </div>
                      )}
</div>
                  )}
</div>
                    </div>
            );
})}

          <div style={{ marginTop: 24 }}>
            <Anotacoes livro={selectedBook} capitulo={selectedChapter} />
            </div>
            </div>

        <CanelaDeFogo livro={selectedBook} capitulo={selectedChapter} textoCapitulo={textoCapitulo} />
            </div>
    );
}

  // ── RENDER STUDY ─────────────────────────────────────────────
  function renderStudy() {
        return (
                <div className="study-tab">
                  <div className="study-tab-header">
                    <h2>Estudo Família Azevedo</h2>
              <p>Acompanhe o progresso da família.</p>
          </div>
            <div className="study-chapter-card">
                    <div className="study-card-label">✦ Progresso atual</div>
              <div className="study-meta">
                      <div className="study-meta-item">
                        <div className="study-meta-label">Livro</div>
                  <div className="study-meta-value">{STUDY_BOOK}</div>
          </div>
                <div className="study-meta-item">
                        <div className="study-meta-label">Capítulo</div>
                  <div className="study-meta-value">{lastStudyChapter}</div>
          </div>
          </div>
              <div className="study-nav-row">
                      <button className="btn-primary" onClick={continueStudy}>Continuar estudo →</button>
                <button className="btn-primary btn-gold" onClick={() => openBook(STUDY_BOOK)} style={{ background: 'var(--grad-button-gold)', color: 'var(--gray-900)', boxShadow: 'var(--shadow-gold)' }}>Ver capítulos</button>
    </div>
    </div>
    </div>
    );
}

  // ── RENDER YOU ───────────────────────────────────────────────
  function renderYou() {
        const nome = localStorage.getItem("fa_nome") || "—";

    async function handleLogin() {
            try { await signInWithPopup(auth, googleProvider); } catch { }
    }
        async function handleLogout() { await signOut(auth); }

    return (
            <div className="you-tab">
    {user ? (
                <div className="profile-header">
                  <div className="profile-avatar">
    {user.photoURL ? <img src={user.photoURL} alt={user.displayName || ""} /> : <span>{(user.displayName || nome).charAt(0).toUpperCase()}</span>}
    </div>
            <div className="profile-name">{user.displayName || nome}</div>
            <div className="profile-email">{user.email}</div>
    </div>
        ) : (
                    <div className="login-card">
                      <h2>Bem-vindo à Família Azevedo</h2>
            <p>Entre com sua conta Google para sincronizar anotações e progresso na nuvem.</p>
            <button className="btn-google" onClick={handleLogin}>
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width="18" height="18" />
                        Entrar com Google
          </button>
          </div>
        )}

        <div className="profile-card">
                    <h3>✦ Estatísticas</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
{[
  { icon: '📚', label: 'Livro de estudo', value: STUDY_BOOK },
  { icon: '🔖', label: 'Último capítulo', value: lastStudyChapter },
  { icon: theme === 'dark' ? '🌙' : '☀️', label: 'Tema', value: theme === 'dark' ? 'Escuro' : 'Claro' },
  { icon: '☁️', label: 'Anotações', value: user ? 'Na nuvem' : 'Local' },
              ].map(item => (
                              <div key={item.label} style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: '1.4rem' }}>{item.icon}</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{item.label}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{item.value}</span>
  </div>
            ))}
              </div>
              </div>

{user && (
            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }} onClick={handleLogout}>
              Sair da conta
  </button>
        )}

        <div style={{ marginTop: 16 }}>
          <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', background: 'rgba(255,255,255,0.07)', border: '1px solid var(--border)', color: 'var(--text-secondary)', boxShadow: 'none' }}
            onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}>
{theme === 'dark' ? '☀️ Tema claro' : '🌙 Tema escuro'}
</button>
  </div>
  </div>
    );
}

  // ── ROOT RENDER ───────────────────────────────────────────────
  if (!authReady) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', gap: 12, background: 'var(--bg)' }}>
      <span style={{ fontSize: '2rem' }}>✝</span>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--text-primary)' }}>Família Azevedo</span>
    </div>
  );

  if (!onboardingDone) return <Onboarding onComplete={handleOnboardingComplete} />;

  return (
        <div className="app-shell">
          <header className="app-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="header-cross">✝</div>
          <h1>Família Azevedo</h1>
    </div>
        <button className="theme-btn" onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')} aria-label="Alternar tema">
  {theme === 'dark' ? '☀️' : '🌙'}
    </button>
    </header>

      <main className="app-main">
  {activeTab === "home"  && renderHome()}
  {activeTab === "bible" && renderBible()}
{activeTab === "study" && renderStudy()}
{activeTab === "you"   && renderYou()}
</main>

      <nav className="bottom-nav">
{TABS.map((tab) => (
            <button
                      key={tab.id}
            className={activeTab === tab.id ? "active" : ""}
                          onClick={() => setActiveTab(tab.id)}
          >
            <span className="nav-icon">{tab.icon}</span>
            <span>{tab.label}</span>
            </button>
        ))}
          </nav>
          </div>
  );
}

import { useState } from "react";
import { auth, googleProvider } from "../firebase";
import { signInWithPopup } from "firebase/auth";

// ─────────────────────────────────────────────────────────────────
// Onboarding — 3 passos: nome → login Google → boas-vindas da IA
// Props:
//   onComplete() → chamado quando o usuário termina o onboarding
// ─────────────────────────────────────────────────────────────────
export default function Onboarding({ onComplete }) {
  const [step, setStep]   = useState(1);
  const [nome, setNome]   = useState("");
  const [erro, setErro]   = useState("");
  const [loading, setLoading] = useState(false);

  // ── Passo 1: nome ────────────────────────────────────────────────
  function handleNome() {
    const n = nome.trim();
    if (!n) { setErro("Digite seu nome para continuar."); return; }
    localStorage.setItem("fa_nome", n);
    setErro("");
    setStep(2);
  }

  // ── Passo 2: login Google ─────────────────────────────────────────
  async function handleGoogle() {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
      setStep(3);
    } catch {
      setErro("Não foi possível entrar com o Google. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const primeiroNome = nome.trim().split(" ")[0] || "amigo(a)";

  // Dots de progresso
  function ProgressDots({ current }) {
    return (
      <div className="onboarding-dots">
        {[1, 2, 3].map(i => (
          <div key={i} className={`onboarding-dot${i === current ? " onboarding-dot--active" : ""}`} />
        ))}
      </div>
    );
  }

  // ── Step 1 — Nome ────────────────────────────────────────────────
  if (step === 1) return (
    <div className="onboarding-screen">
      <div className="onboarding-bg" />
      <div className="onboarding-glow" />

      <div className="onboarding-logo">✝️</div>
      <h1 className="onboarding-title">Família Azevedo</h1>
      <p className="onboarding-sub">
        Bem-vindo(a) ao seu app de estudos bíblicos.
      </p>

      <div className="onboarding-card">
        <p className="onboarding-question">Como podemos te chamar?</p>
        <input
          className="onboarding-input"
          placeholder="Seu nome..."
          value={nome}
          onChange={e => { setNome(e.target.value); setErro(""); }}
          onKeyDown={e => e.key === "Enter" && handleNome()}
          autoFocus
        />
        {erro && <p className="onboarding-erro">⚠ {erro}</p>}
        <button
          className="btn btn--primary btn--full"
          onClick={handleNome}
        >
          Continuar →
        </button>
      </div>

      <ProgressDots current={1} />
    </div>
  );

  // ── Step 2 — Google Login ────────────────────────────────────────
  if (step === 2) return (
    <div className="onboarding-screen">
      <div className="onboarding-bg" />
      <div className="onboarding-glow" />

      <div className="onboarding-logo">☁️</div>
      <h2 className="onboarding-title">Salvar na nuvem</h2>
      <p className="onboarding-sub">
        Suas anotações ficam salvas em qualquer dispositivo.
      </p>

      <div className="onboarding-card">
        <p className="onboarding-question">Entrar com sua conta Google?</p>
        {erro && <p className="onboarding-erro">⚠ {erro}</p>}

        <button
          className="btn btn--google btn--full"
          onClick={handleGoogle}
          disabled={loading}
        >
          {loading ? "Aguarde..." : (
            <>
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google"
                width="18"
                height="18"
              />
              Continuar com Google
            </>
          )}
        </button>

        <button
          className="btn btn--ghost btn--full"
          onClick={() => setStep(3)}
          disabled={loading}
        >
          Pular por agora
        </button>
      </div>

      <ProgressDots current={2} />
    </div>
  );

  // ── Step 3 — Boas-vindas da Canela de Fogo ───────────────────────
  return (
    <div className="onboarding-screen">
      <div className="onboarding-bg" />
      <div className="onboarding-glow onboarding-glow--fire" />

      <div className="onboarding-logo canela-pulse">❤️‍🔥</div>
      <h2 className="onboarding-title">Olá, {primeiroNome}!</h2>

      <div className="canela-welcome-bubble">
        <p>
          Que alegria te ver aqui! Sou a <strong>Canela de Fogo</strong> —
          sua assistente de estudos bíblicos. 🕊️
        </p>
        <p>
          Durante a leitura, pode me chamar para entender versículos,
          buscar contexto histórico ou simplesmente refletir juntos na Palavra.
        </p>
        <p>Vamos começar?</p>
      </div>

      <button
        className="btn btn--primary btn--full"
        style={{ maxWidth: 360 }}
        onClick={onComplete}
      >
        Entrar no app →
      </button>

      <div style={{ height: 16 }} />
      <ProgressDots current={3} />
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { functions } from "../firebase";
import { httpsCallable } from "firebase/functions";

const chamarIA = httpsCallable(functions, "canelaDeFogo");

// ─────────────────────────────────────────────────────────────────
// CanelaDeFogo — Chat bíblico flutuante powered by Claude via
// Firebase Cloud Functions (chave nunca exposta no browser)
//
// Props:
//   livro          string  — ex: "João"
//   capitulo       number  — ex: 3
//   textoCapitulo  string  — versículos concatenados do capítulo
// ─────────────────────────────────────────────────────────────────
export default function CanelaDeFogo({ livro, capitulo, textoCapitulo }) {
  const [aberto, setAberto]       = useState(false);
  const [pergunta, setPergunta]   = useState("");
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const messagesEndRef = useRef(null);

  // Rola para o final quando chega nova mensagem
  useEffect(() => {
    if (aberto) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [historico, aberto]);

  // Limpa conversa ao trocar de capítulo
  useEffect(() => {
    setHistorico([]);
  }, [livro, capitulo]);

  async function enviar() {
    const p = pergunta.trim();
    if (!p || carregando) return;

    setPergunta("");
    setHistorico(h => [...h, { de: "user", texto: p }]);
    setCarregando(true);

    try {
      const result = await chamarIA({
        pergunta: p,
        livro,
        capitulo,
        textoCapitulo,
      });
      setHistorico(h => [...h, {
        de: "canela",
        texto: result.data.resposta,
      }]);
    } catch (err) {
      setHistorico(h => [...h, {
        de: "canela",
        texto: "Ops, não consegui responder agora. Tente novamente! 🙏",
        erro: true,
      }]);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="canela-wrapper">

      {/* ── Painel de chat ─────────────────────────────────────── */}
      {aberto && (
        <div className="canela-panel">

          {/* Cabeçalho */}
          <div className="canela-panel__header">
            <div className="canela-panel__title">
              <span className="canela-panel__icon">❤️‍🔥</span>
              <span>Canela de Fogo</span>
            </div>
            <div className="canela-panel__context">
              {livro} {capitulo}
            </div>
          </div>

          {/* Mensagens */}
          <div className="canela-panel__messages">
            {historico.length === 0 && (
              <div className="canela-msg canela-msg--canela canela-msg--intro">
                Olá! Pode me perguntar qualquer coisa sobre{" "}
                <strong>{livro} {capitulo}</strong>. Estou aqui para
                ajudar na sua leitura 🕊️
              </div>
            )}

            {historico.map((msg, i) => (
              <div
                key={i}
                className={`canela-msg canela-msg--${msg.de}${msg.erro ? " canela-msg--erro" : ""}`}
              >
                {msg.texto}
              </div>
            ))}

            {carregando && (
              <div className="canela-msg canela-msg--canela canela-loading">
                <span />
                <span />
                <span />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="canela-panel__input">
            <input
              value={pergunta}
              onChange={e => setPergunta(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && enviar()}
              placeholder="Pergunte sobre este capítulo..."
              disabled={carregando}
            />
            <button
              onClick={enviar}
              disabled={carregando || !pergunta.trim()}
              aria-label="Enviar"
            >
              →
            </button>
          </div>
        </div>
      )}

      {/* ── Botão flutuante (FAB) ──────────────────────────────── */}
      <button
        className={`canela-fab ${aberto ? "canela-fab--open" : ""}`}
        onClick={() => setAberto(o => !o)}
        aria-label={aberto ? "Fechar Canela de Fogo" : "Abrir Canela de Fogo"}
      >
        {aberto ? "✕" : "❤️‍🔥"}
      </button>
    </div>
  );
}

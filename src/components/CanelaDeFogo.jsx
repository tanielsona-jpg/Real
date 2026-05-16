import { useEffect, useRef, useState } from "react";

const SUPABASE_URL = "https://iofgweifqpnrznfmdfug.supabase.co/functions/v1/canela-de-fogo";

export default function CanelaDeFogo({ livro, capitulo, textoCapitulo }) {
    const [aberto, setAberto] = useState(false);
    const [pergunta, setPergunta] = useState("");
    const [historico, setHistorico] = useState([]);
    const [carregando, setCarregando] = useState(false);
    const messagesEndRef = useRef(null);

  useEffect(() => {
        if (aberto) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [historico, aberto]);

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
                const res = await fetch(SUPABASE_URL, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ pergunta: p, livro, capitulo, textoCapitulo }),
                });
                const data = await res.json();
                if (!res.ok || data.error) throw new Error(data.error || "Erro desconhecido");
                setHistorico(h => [...h, { de: "canela", texto: data.resposta }]);
        } catch (err) {
                setHistorico(h => [...h, {
                          de: "canela",
                          texto: "Ops, nao consegui responder agora. Tente novamente! 🙏",
                          erro: true,
                }]);
        } finally {
                setCarregando(false);
        }
  }

  return (
        <div className="canela-wrapper">
          {aberto && (
                  <div className="canela-panel">
                            <div className="canela-panel__header">
                                        <div className="canela-panel__title">
                                                      <span className="canela-panel__icon">❤️‍🔥</span>span>
                                                      <span>Canela de Fogo</span>span>
                                        </div>div>
                                        <div className="canela-panel__context">{livro} {capitulo}</div>div>
                            </div>div>
                            <div className="canela-panel__messages">
                              {historico.length === 0 && (
                                  <div className="canela-msg canela-msg--canela canela-msg--intro">
                                                  Olá! Pode me perguntar qualquer coisa sobre <strong>{livro} {capitulo}</strong>strong>. Estou aqui para ajudar na sua leitura 🕊️
                                  </div>div>
                                        )}
                              {historico.map((msg, i) => (
                                  <div
                                                    key={i}
                                                    className={`canela-msg canela-msg--${msg.de}${msg.erro ? " canela-msg--erro" : ""}`}
                                                  >
                                    {msg.texto}
                                  </div>div>
                                ))}
                              {carregando && (
                                  <div className="canela-msg canela-msg--canela canela-loading">
                                                  <span /><span /><span />
                                  </div>div>
                                        )}
                                        <div ref={messagesEndRef} />
                            </div>div>
                            <div className="canela-panel__input">
                                        <input
                                                        value={pergunta}
                                                        onChange={e => setPergunta(e.target.value)}
                                                        onKeyDown={e => e.key === "Enter" && !e.shiftKey && enviar()}
                                                        placeholder="Pergunte sobre este capitulo..."
                                                        disabled={carregando}
                                                      />
                                        <button
                                                        onClick={enviar}
                                                        disabled={carregando || !pergunta.trim()}
                                                        aria-label="Enviar"
                                                      >
                                                      →
                                        </button>button>
                            </div>div>
                  </div>div>
              )}
              <button
                        className={`canela-fab ${aberto ? "canela-fab--open" : ""}`}
                        onClick={() => setAberto(o => !o)}
                        aria-label={aberto ? "Fechar Canela de Fogo" : "Abrir Canela de Fogo"}
                      >
                {aberto ? "✕" : "❤️‍🔥"}
              </button>button>
        </div>div>
      );
}</div>

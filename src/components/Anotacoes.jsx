import { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

// ─────────────────────────────────────────────────────────────────
// Anotacoes — Campo de notas por capítulo com auto-save
//
// • Logado → salva no Firestore: users/{uid}/notes/{livro_cap}
// • Deslogado → salva no localStorage como fallback
//
// Props:
//   livro    string — ex: "Gênesis"
//   capitulo number — ex: 1
// ─────────────────────────────────────────────────────────────────
export default function Anotacoes({ livro, capitulo }) {
  const [texto, setTexto]         = useState("");
  const [salvando, setSalvando]   = useState(false);
  const [salvo, setSalvo]         = useState(false);
  const [carregando, setCarregando] = useState(false);

  const docId = `${livro}_${capitulo}`.replace(/\s+/g, "_");
  const uid   = auth.currentUser?.uid;

  // ── Carrega nota ao trocar capítulo ──────────────────────────────
  useEffect(() => {
    async function carregar() {
      setTexto("");
      setSalvo(false);
      setCarregando(true);

      try {
        if (uid) {
          // Firestore
          const ref  = doc(db, "users", uid, "notes", docId);
          const snap = await getDoc(ref);
          if (snap.exists()) setTexto(snap.data().content || "");
        } else {
          // localStorage fallback
          setTexto(localStorage.getItem(`nota_${docId}`) || "");
        }
      } catch {
        // silencia erros de leitura
      } finally {
        setCarregando(false);
      }
    }

    carregar();
  }, [livro, capitulo, uid]);

  // ── Auto-save com debounce de 1.2s ───────────────────────────────
  useEffect(() => {
    if (carregando) return; // evita salvar o estado inicial
    setSalvo(false);

    const timer = setTimeout(async () => {
      setSalvando(true);
      try {
        if (uid) {
          const ref = doc(db, "users", uid, "notes", docId);
          await setDoc(ref, {
            userId:    uid,
            book:      livro,
            chapter:   capitulo,
            content:   texto,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        } else {
          localStorage.setItem(`nota_${docId}`, texto);
        }
        setSalvo(true);
      } catch {
        // silencia erros de escrita
      } finally {
        setSalvando(false);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [texto]);

  const statusLabel = carregando
    ? "Carregando..."
    : salvando
    ? "Salvando..."
    : salvo
    ? "✓ Salvo"
    : uid
    ? "☁️ Nuvem"
    : "💾 Local";

  return (
    <div className="anotacoes-block">
      <div className="anotacoes-header">
        <span className="anotacoes-title">✦ Minha Anotação</span>
        <span className={`anotacoes-status ${salvo ? "anotacoes-status--salvo" : ""}`}>
          {statusLabel}
        </span>
      </div>

      <textarea
        className="anotacoes-textarea"
        placeholder={`Suas reflexões sobre ${livro} ${capitulo}...\n\nEste espaço é seu. Anote insights, perguntas ou orações.`}
        value={texto}
        onChange={e => setTexto(e.target.value)}
        rows={5}
        disabled={carregando}
      />

      {!uid && (
        <p className="anotacoes-hint">
          💡 Faça login com Google na aba Você para salvar na nuvem.
        </p>
      )}
    </div>
  );
}

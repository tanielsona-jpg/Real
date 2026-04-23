// ─────────────────────────────────────────────────────────────────
// Favoritos — Lista de versículos salvos pelo usuário
//
// Props:
//   favoritos    array  — lista de { livro, capitulo, verso, texto }
//   onOpenVerse  fn     — (livro, capitulo) → abre o capítulo na Bíblia
// ─────────────────────────────────────────────────────────────────
export default function Favoritos({ favoritos, onOpenVerse }) {
  if (favoritos.length === 0) {
    return (
      <div className="screen">
        <div className="screen-header">
          <h2 className="screen-title">Versículos Salvos</h2>
          <p className="screen-sub">
            Toque em ☆ em qualquer versículo para salvá-lo aqui.
          </p>
        </div>
        <div className="favoritos-empty">
          <span className="favoritos-empty__icon">⭐</span>
          <p>Nenhum versículo salvo ainda.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <h2 className="screen-title">Versículos Salvos</h2>
        <p className="screen-sub">{favoritos.length} versículo{favoritos.length !== 1 ? "s" : ""} salvo{favoritos.length !== 1 ? "s" : ""}.</p>
      </div>

      <div className="favoritos-list">
        {favoritos.map((f, i) => (
          <button
            key={i}
            className="favorito-card"
            onClick={() => onOpenVerse(f.livro, f.capitulo)}
          >
            <div className="favorito-card__ref">
              {f.livro} {f.capitulo}:{f.verso}
            </div>
            <p className="favorito-card__texto">{f.texto}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

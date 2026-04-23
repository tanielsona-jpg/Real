import { useCallback, useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, deleteDoc, doc, onSnapshot, setDoc } from "firebase/firestore";

const LOCAL_KEY = "fa_favoritos";

function localGet() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) || []; }
  catch { return []; }
}
function localSet(items) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
}

export function useFavoritos() {
  const [favoritos, setFavoritos] = useState([]);
  const uid = auth.currentUser?.uid;

  // Carrega favoritos (Firestore ou localStorage)
  useEffect(() => {
    if (!uid) {
      setFavoritos(localGet());
      return;
    }

    const ref = collection(db, "users", uid, "favorites");
    const unsub = onSnapshot(ref, (snap) => {
      setFavoritos(snap.docs.map((d) => d.data()));
    });
    return unsub;
  }, [uid]);

  const isFavorito = useCallback(
    (livro, capitulo, verso) =>
      favoritos.some(
        (f) => f.livro === livro && f.capitulo === capitulo && f.verso === verso
      ),
    [favoritos]
  );

  async function toggleFavorito(livro, capitulo, verso, texto) {
    const id   = `${livro}_${capitulo}_${verso}`.replace(/\s+/g, "_");
    const item = { livro, capitulo, verso, texto };

    if (isFavorito(livro, capitulo, verso)) {
      // Remover
      if (uid) {
        await deleteDoc(doc(db, "users", uid, "favorites", id));
      } else {
        const updated = localGet().filter(
          (f) => !(f.livro === livro && f.capitulo === capitulo && f.verso === verso)
        );
        localSet(updated);
        setFavoritos(updated);
      }
    } else {
      // Adicionar
      if (uid) {
        await setDoc(doc(db, "users", uid, "favorites", id), item);
      } else {
        const updated = [...localGet(), item];
        localSet(updated);
        setFavoritos(updated);
      }
    }
  }

  return { favoritos, isFavorito, toggleFavorito };
}

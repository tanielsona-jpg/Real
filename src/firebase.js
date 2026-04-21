import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyDIbV0og1ucoHWi-1ybWvKhjRGsluhgYEI",
  authDomain: "biblia-app-3114f.firebaseapp.com",
  projectId: "biblia-app-3114f",
  storageBucket: "biblia-app-3114f.firebasestorage.app",
  messagingSenderId: "1008693362801",
  appId: "1:1008693362801:web:a3a937eb370a8147a4dbd0"
};

const app = initializeApp(firebaseConfig);

export const auth          = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db            = getFirestore(app);
export const functions     = getFunctions(app);

export default app;
import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  getDocsFromServer
} from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyC3nvVGezvzG84sURzSfBBgcS1jrD2Whe0",
  authDomain: "scheduler-9ae2c.firebaseapp.com",
  projectId: "scheduler-9ae2c",
  storageBucket: "scheduler-9ae2c.firebasestorage.app",
  messagingSenderId: "561488622988",
  appId: "1:561488622988:web:c36ec008929af2c58a12a9",
  measurementId: "G-KQ309PFK8X"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize analytics safely if supported in environment
isAnalyticsSupported().then((supported) => {
  if (supported) {
    getAnalytics(app);
  }
});

// Test connection on boot
getDocsFromServer(query(collection(db, 'events'))).catch((err) => {
  console.warn("Firestore connection check note (working offline or awaiting rules):", err.message);
});

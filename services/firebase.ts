
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBMMEO9jXstuc8yplcqJz08CpWEjcKIVkQ",
  authDomain: "alis-953c4.firebaseapp.com",
  projectId: "alis-953c4",
  storageBucket: "alis-953c4.firebasestorage.app",
  messagingSenderId: "642189735296",
  appId: "1:642189735296:web:360fed6cada412844bfd65"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

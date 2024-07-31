
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";


import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCjxalt5khjbxqOvHm1iMbYPpZql1YAjZg",
  authDomain: "mobiapp-11caf.firebaseapp.com",
  projectId: "mobiapp-11caf",
  storageBucket: "mobiapp-11caf.appspot.com",
  messagingSenderId: "273706744720",
  appId: "1:273706744720:web:cbdff2cc99a32124365115"
};


const app = initializeApp(firebaseConfig);


export const auth=getAuth(app);
export const db = getFirestore(app);
export default app;

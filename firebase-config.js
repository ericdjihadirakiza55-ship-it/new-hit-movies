import { initializeApp } from
"https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

import { getFirestore } from
"https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import { getAuth } from
"https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyAnOXRR7pLNvZ_Ef5NiiJjNg7jPpppu-lI",
    authDomain: "new-hit-movies.firebaseapp.com",
    projectId: "new-hit-movies",
    storageBucket: "new-hit-movies.firebasestorage.app",
    messagingSenderId: "1073958419774",
    appId: "1:1073958419774:web:233e71ff397217b531806f"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

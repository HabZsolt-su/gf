/**
 * Firebase Configuration & Firestore Initialization
 */

const firebaseConfig = {
    apiKey: "AIzaSyBfNTRF8yE8Iv2ZHxHewoTWCNmqUTVMyJM",
    authDomain: "anni2-e4bf2.firebaseapp.com",
    projectId: "anni2-e4bf2",
    storageBucket: "anni2-e4bf2.firebasestorage.app",
    messagingSenderId: "150656061338",
    appId: "1:150656061338:web:a1e2d19ca40cd908497423"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

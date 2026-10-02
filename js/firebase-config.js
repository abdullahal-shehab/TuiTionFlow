firebase.initializeApp({
  apiKey: "AIzaSyARZNVURJr6v7TtIxnUuHRp90HdEEcFsPc",
  authDomain: "tuition-flow-54e47.firebaseapp.com",
  projectId: "tuition-flow-54e47",
  storageBucket: "tuition-flow-54e47.firebasestorage.app",
  messagingSenderId: "470310868331",
  appId: "1:470310868331:web:ef5848eaf69f15af8b282e"
});
const auth = firebase.auth();
const db = firebase.firestore();
let USER = null;
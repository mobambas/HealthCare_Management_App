import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { FIREBASE_CONFIG } from "./firebase-config.js";

let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;
let currentUser = null;
let modal = null;

const authLinkSelector = '[data-auth-link]';

function initFirebase() {
  if (!FIREBASE_CONFIG || FIREBASE_CONFIG.apiKey === "YOUR_API_KEY") {
    console.warn("Firebase config is not set. Auth is disabled until configured.");
    return;
  }
  firebaseApp = initializeApp(FIREBASE_CONFIG);
  firebaseAuth = getAuth(firebaseApp);
  firebaseDb = getFirestore(firebaseApp);
}

function ensureModal() {
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'auth-modal';
  modal.innerHTML = `
    <div class="auth-backdrop" data-auth-close></div>
    <div class="auth-dialog">
      <button class="auth-close" data-auth-close>&times;</button>
      <h2 id="auth-title">Login</h2>
      <form id="auth-form" class="auth-form">
        <div class="auth-input">
          <label for="auth-email">Email</label>
          <input type="email" id="auth-email" name="email" placeholder="you@example.com" required />
        </div>
        <div class="auth-input">
          <label for="auth-password">Password</label>
          <input type="password" id="auth-password" name="password" placeholder="••••••••" required />
        </div>
        <button type="submit" class="primary-action" id="auth-submit">Login</button>
        <p class="helper-text" id="auth-switch-text">
          Don't have an account? <a href="#" id="auth-toggle">Sign Up</a>
        </p>
        <p class="status-message" id="auth-status"></p>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelectorAll('[data-auth-close]').forEach((el) => {
    el.addEventListener('click', closeModal);
  });

  const form = modal.querySelector('#auth-form');
  const toggle = modal.querySelector('#auth-toggle');
  let mode = 'login';

  toggle.addEventListener('click', (e) => {
    e.preventDefault();
    mode = mode === 'login' ? 'signup' : 'login';
    modal.querySelector('#auth-title').textContent = mode === 'login' ? 'Login' : 'Sign Up';
    modal.querySelector('#auth-submit').textContent = mode === 'login' ? 'Login' : 'Create Account';
    toggle.textContent = mode === 'login' ? 'Sign Up' : 'Login';
    modal.querySelector('#auth-switch-text').childNodes[0].textContent = mode === 'login'
      ? "Don't have an account? "
      : "Already have an account? ";
    setStatus('');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!firebaseAuth) {
      setStatus('Auth is not configured. Please add your Firebase config.', true);
      return;
    }
    const email = form.email.value.trim();
    const password = form.password.value.trim();
    if (!email || !password) return;
    setStatus(mode === 'login' ? 'Logging in...' : 'Creating account...');
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(firebaseAuth, email, password);
      } else {
        await createUserWithEmailAndPassword(firebaseAuth, email, password);
      }
      setStatus('Success!');
      closeModal();
    } catch (error) {
      console.error('Auth error', error);
      setStatus(error.message || 'Authentication failed', true);
    }
  });

  return modal;
}

function openModal() {
  ensureModal();
  modal.classList.add('open');
}

function closeModal() {
  if (!modal) return;
  modal.classList.remove('open');
}

function setStatus(message, isError = false) {
  if (!modal) return;
  const el = modal.querySelector('#auth-status');
  el.textContent = message;
  el.className = `status-message ${isError ? 'error' : 'success'}`;
}

function wireNavLink() {
  const link = document.querySelector(authLinkSelector);
  if (!link) return;
  link.addEventListener('click', async (e) => {
    e.preventDefault();
    if (currentUser && firebaseAuth) {
      await signOut(firebaseAuth);
      return;
    }
    openModal();
  });
}

async function fetchCollection(collectionName) {
  if (!firebaseDb || !currentUser) return [];
  const q = collection(firebaseDb, 'users', currentUser.uid, collectionName);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function addToCollection(collectionName, item) {
  if (!firebaseDb || !currentUser) return null;
  const col = collection(firebaseDb, 'users', currentUser.uid, collectionName);
  const docRef = await addDoc(col, item);
  return docRef.id;
}

async function deleteFromCollection(collectionName, id) {
  if (!firebaseDb || !currentUser) return;
  const ref = doc(firebaseDb, 'users', currentUser.uid, collectionName, id);
  await deleteDoc(ref);
}

function updateNav(user) {
  const link = document.querySelector(authLinkSelector);
  if (!link) return;
  link.textContent = user ? 'Logout' : 'Login / Sign Up';
}

function exposeApi() {
  window.HealthHavenAuth = {
    getUser: () => currentUser,
    getUserId: () => currentUser?.uid || 'guest',
    isReady: () => !!firebaseDb,
    fetchCollection,
    addToCollection,
    deleteFromCollection,
    openAuthModal: openModal,
    logout: () => firebaseAuth ? signOut(firebaseAuth) : null,
  };
}

function setupAuthListener() {
  if (!firebaseAuth) return;
  onAuthStateChanged(firebaseAuth, (user) => {
    currentUser = user;
    updateNav(user);
    exposeApi();
    if (window.HealthHavenApp && typeof window.HealthHavenApp.onAuthChange === 'function') {
      window.HealthHavenApp.onAuthChange(user);
    }
  });
}

function bootstrap() {
  initFirebase();
  ensureModal();
  wireNavLink();
  exposeApi();
  setupAuthListener();
}

document.addEventListener('DOMContentLoaded', bootstrap);


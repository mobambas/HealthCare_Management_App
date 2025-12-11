// Shared utilities for client-side storage and light interactivity.
// Data is primarily stored per-user; if authenticated and Firebase is configured,
// entries sync to Firestore. Otherwise, data stays in localStorage.

const STORAGE_KEYS = {
  medications: 'healthhaven_medications',
  allergies: 'healthhaven_allergies',
  apiKeys: 'healthhaven_api_keys',
};

function currentUserId() {
  return (window.HealthHavenAuth && window.HealthHavenAuth.getUserId && window.HealthHavenAuth.getUserId()) || 'guest';
}

function safeParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.warn('Unable to parse data from localStorage', error);
    return fallback;
  }
}

function storageKeyFor(key) {
  return `${key}_${currentUserId()}`;
}

function loadLocalList(key) {
  return safeParse(localStorage.getItem(storageKeyFor(key)), []);
}

function saveLocalList(key, list) {
  localStorage.setItem(storageKeyFor(key), JSON.stringify(list));
}

function getApiKey(provider) {
  const apiKeys = safeParse(localStorage.getItem(STORAGE_KEYS.apiKeys), {});
  return apiKeys[provider] || '';
}

function setApiKey(provider, value) {
  const apiKeys = safeParse(localStorage.getItem(STORAGE_KEYS.apiKeys), {});
  apiKeys[provider] = value;
  localStorage.setItem(STORAGE_KEYS.apiKeys, JSON.stringify(apiKeys));
}

function formatDate(dateString) {
  if (!dateString) return 'Not set';
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? 'Not set' : date.toLocaleDateString();
}

function uuid() {
  if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const Cloud = {
  isReady() {
    return window.HealthHavenAuth && window.HealthHavenAuth.isReady && window.HealthHavenAuth.isReady() && window.HealthHavenAuth.getUser && !!window.HealthHavenAuth.getUser();
  },
  async fetch(collectionName) {
    if (!this.isReady()) return null;
    return await window.HealthHavenAuth.fetchCollection(collectionName);
  },
  async add(collectionName, item) {
    if (!this.isReady()) return null;
    return await window.HealthHavenAuth.addToCollection(collectionName, item);
  },
  async remove(collectionName, id) {
    if (!this.isReady()) return;
    return await window.HealthHavenAuth.deleteFromCollection(collectionName, id);
  },
};

async function fetchMedications() {
  const cloudData = await Cloud.fetch('medications');
  if (cloudData) {
    saveLocalList(STORAGE_KEYS.medications, cloudData);
    return cloudData;
  }
  return loadLocalList(STORAGE_KEYS.medications);
}

async function addMedication(item) {
  const entry = { ...item, id: uuid(), userId: currentUserId(), createdAt: new Date().toISOString() };
  const local = loadLocalList(STORAGE_KEYS.medications);
  local.push(entry);
  saveLocalList(STORAGE_KEYS.medications, local);
  if (Cloud.isReady()) {
    const docId = await Cloud.add('medications', entry);
    if (docId) {
      entry.id = docId;
      saveLocalList(STORAGE_KEYS.medications, local.map((i) => (i.id === entry.id ? entry : i)));
    }
  }
  return entry;
}

async function removeMedication(id) {
  const local = loadLocalList(STORAGE_KEYS.medications).filter((m) => m.id !== id);
  saveLocalList(STORAGE_KEYS.medications, local);
  if (Cloud.isReady()) {
    await Cloud.remove('medications', id);
  }
}

async function fetchAllergies() {
  const cloudData = await Cloud.fetch('allergies');
  if (cloudData) {
    saveLocalList(STORAGE_KEYS.allergies, cloudData);
    return cloudData;
  }
  return loadLocalList(STORAGE_KEYS.allergies);
}

async function addAllergy(item) {
  const entry = { ...item, id: uuid(), userId: currentUserId(), createdAt: new Date().toISOString() };
  const local = loadLocalList(STORAGE_KEYS.allergies);
  local.push(entry);
  saveLocalList(STORAGE_KEYS.allergies, local);
  if (Cloud.isReady()) {
    const docId = await Cloud.add('allergies', entry);
    if (docId) {
      entry.id = docId;
      saveLocalList(STORAGE_KEYS.allergies, local.map((i) => (i.id === entry.id ? entry : i)));
    }
  }
  return entry;
}

async function removeAllergy(id) {
  const local = loadLocalList(STORAGE_KEYS.allergies).filter((m) => m.id !== id);
  saveLocalList(STORAGE_KEYS.allergies, local);
  if (Cloud.isReady()) {
    await Cloud.remove('allergies', id);
  }
}

async function renderMedicationList(itemsOverride) {
  const container = document.getElementById('medication-list');
  if (!container) return;
  const items = itemsOverride || await fetchMedications();
  container.innerHTML = '';
  if (!items.length) {
    container.innerHTML = '<p class="muted">No medications added yet.</p>';
    return;
  }
  items.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'list-card';
    card.innerHTML = `
      <div>
        <h3>${item.name}</h3>
        <p class="muted">${item.dosage || 'Dosage not set'} • ${item.frequency || 'Frequency not set'}</p>
        <p class="muted">Start date: ${formatDate(item.startDate)}</p>
        ${item.notes ? `<p>${item.notes}</p>` : ''}
      </div>
      <button class="secondary" data-remove-medication="${item.id}">Remove</button>
    `;
    container.appendChild(card);
  });
}

async function renderAllergyList(itemsOverride) {
  const container = document.getElementById('allergy-list');
  if (!container) return;
  const items = itemsOverride || await fetchAllergies();
  container.innerHTML = '';
  if (!items.length) {
    container.innerHTML = '<p class="muted">No allergies recorded yet.</p>';
    return;
  }
  items.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'list-card';
    card.innerHTML = `
      <div>
        <h3>${item.name}</h3>
        <p class="muted">Severity: <span class="badge">${item.severity || 'Not set'}</span></p>
        ${item.triggers ? `<p class="muted">Triggers: ${item.triggers}</p>` : ''}
        ${item.notes ? `<p>${item.notes}</p>` : ''}
      </div>
      <button class="secondary" data-remove-allergy="${item.id}">Remove</button>
    `;
    container.appendChild(card);
  });
}

function statusHelper(id) {
  const el = document.getElementById(id);
  return (message, isError = false) => {
    if (!el) return;
    el.textContent = message;
    el.className = `status-message ${isError ? 'error' : 'success'}`;
  };
}

function initMedicationPage() {
  const form = document.getElementById('medication-form');
  if (!form) return;

  const setStatus = statusHelper('medication-status');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const name = formData.get('name').trim();
    const dosage = formData.get('dosage').trim();
    const frequency = formData.get('frequency').trim();
    const startDate = formData.get('startDate');
    const notes = formData.get('notes').trim();

    if (!name || !dosage) {
      setStatus('Please add at least a name and dosage.', true);
      return;
    }

    await addMedication({ name, dosage, frequency, startDate, notes });
    form.reset();
    setStatus(Cloud.isReady() ? 'Medication saved to your account.' : 'Medication saved locally.');
    renderMedicationList();
  });

  document.getElementById('medication-list')?.addEventListener('click', async (event) => {
    const target = event.target;
    if (target && target.dataset && target.dataset.removeMedication !== undefined) {
      await removeMedication(target.dataset.removeMedication);
      await renderMedicationList();
      setStatus('Medication removed.');
    }
  });

  renderMedicationList();
}

function initAllergyPage() {
  const form = document.getElementById('allergy-form');
  if (!form) return;

  const setStatus = statusHelper('allergy-status');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const name = formData.get('name').trim();
    const severity = formData.get('severity');
    const triggers = formData.get('triggers').trim();
    const notes = formData.get('notes').trim();

    if (!name) {
      setStatus('Please add an allergy name.', true);
      return;
    }

    await addAllergy({ name, severity, triggers, notes });
    form.reset();
    setStatus(Cloud.isReady() ? 'Allergy saved to your account.' : 'Allergy saved locally.');
    renderAllergyList();
  });

  document.getElementById('allergy-list')?.addEventListener('click', async (event) => {
    const target = event.target;
    if (target && target.dataset && target.dataset.removeAllergy !== undefined) {
      await removeAllergy(target.dataset.removeAllergy);
      await renderAllergyList();
      setStatus('Allergy removed.');
    }
  });

  renderAllergyList();
}

function initHeroSearchRedirect() {
  const input = document.querySelector('.hero .search-bar input');
  const button = document.querySelector('.hero .search-bar button');
  if (!input || !button) return;

  button.addEventListener('click', () => {
    const query = input.value.trim();
    if (!query) return;
    const encoded = encodeURIComponent(query);
    window.location.href = `hospitals.html?address=${encoded}`;
  });
}

function onAuthChange(user) {
  renderMedicationList();
  renderAllergyList();
}

document.addEventListener('DOMContentLoaded', () => {
  initHeroSearchRedirect();
  initMedicationPage();
  initAllergyPage();
});

// Expose a small surface for other scripts (e.g., chatbot / hospitals)
window.HealthHavenApp = {
  getApiKey,
  setApiKey,
  onAuthChange,
};


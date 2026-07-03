const API = '';
let token = localStorage.getItem('token');
let notas = [];
let currentNota = null;
let selectedColor = '';
let pendingTasks = [];
let darkMode = localStorage.getItem('darkMode') === 'true';

// DOM refs
const $ = id => document.getElementById(id);
const authSection = $('auth-section');
const mainSection = $('main-section');
const loginForm = $('login-form');
const registerForm = $('register-form');
const loginError = $('login-error');
const registerError = $('register-error');
const userDisplay = $('user-display');
const logoutBtn = $('logout-btn');
const darkToggle = $('dark-toggle');
const notesGrid = $('notes-grid');
const emptyMsg = $('empty-msg');
const noteTitleInput = $('note-title-input');
const taskInput = $('task-input');
const addTaskBtn = $('add-task-btn');
const taskPreview = $('task-preview');
const saveNoteBtn = $('save-note-btn');
const searchInput = $('search-input');
const modal = $('note-modal');
const modalTitle = $('modal-title');
const modalTasks = $('modal-tasks');
const modalTaskInput = $('modal-task-input');
const modalClose = $('modal-close');
const modalPin = $('modal-pin');
const modalCheckAll = $('modal-check-all');
const modalDeleteNote = $('modal-delete-note');
const addNoteCard = $('add-note-card');

// Init dark mode
if (darkMode) document.documentElement.setAttribute('data-theme', 'dark');
updateDarkIcon();

// Auth
function showAuth() { authSection.classList.remove('hidden'); mainSection.classList.add('hidden'); }
function showMain() { authSection.classList.add('hidden'); mainSection.classList.remove('hidden'); }

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    $('login-form').classList.toggle('hidden', tab.dataset.tab !== 'login');
    $('register-form').classList.toggle('hidden', tab.dataset.tab !== 'register');
    loginError.textContent = ''; registerError.textContent = '';
  });
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = $('login-username').value;
  const password = $('login-password').value;
  loginError.textContent = '';
  try {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Error al iniciar sesión');
    }
    const data = await res.json();
    token = data.token;
    localStorage.setItem('token', token);
    userDisplay.textContent = data.username;
    showMain();
    loadNotas();
  } catch (err) { loginError.textContent = err.message; }
});

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = $('reg-username').value;
  const password = $('reg-password').value;
  registerError.textContent = '';
  try {
    const res = await fetch(`${API}/api/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Error al registrarse');
    }
    document.querySelector('[data-tab="login"]').click();
    $('login-username').value = username;
    loginError.textContent = 'Cuenta creada. Inicia sesión.';
    loginError.style.color = '#34a853';
  } catch (err) { registerError.textContent = err.message; }
});

logoutBtn.addEventListener('click', () => {
  token = null; localStorage.removeItem('token'); showAuth();
  closeModal();
});

darkToggle.addEventListener('click', () => {
  darkMode = !darkMode;
  localStorage.setItem('darkMode', darkMode);
  document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : '');
  updateDarkIcon();
});

function updateDarkIcon() {
  darkToggle.innerHTML = darkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}

// API
async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  if (res.status === 401) {
    token = null; localStorage.removeItem('token');
    showAuth(); closeModal();
    throw new Error('Sesión expirada');
  }
  const text = await res.text();
  if (!res.ok) {
    let msg = 'Error';
    try { const j = JSON.parse(text); msg = j.message || j.title || 'Error'; } catch {}
    throw new Error(msg);
  }
  return text ? JSON.parse(text) : null;
}

// Notes
async function loadNotas() {
  try {
    notas = await api('/api/notas');
    renderNotas(filterNotas());
  } catch (err) { if (err.message !== 'Sesión expirada') console.error(err); }
}

function filterNotas() {
  const q = searchInput.value.toLowerCase();
  return notas.filter(n => {
    const titleMatch = n.titulo && n.titulo.toLowerCase().includes(q);
    const tasksMatch = n.tareas && n.tareas.some(t => t.texto.toLowerCase().includes(q));
    return titleMatch || tasksMatch;
  });
}

function renderNotas(filtered) {
  notesGrid.innerHTML = '';
  if (filtered.length === 0) { emptyMsg.classList.remove('hidden'); return; }
  emptyMsg.classList.add('hidden');
  filtered.forEach(n => {
    const card = document.createElement('div');
    card.className = `note-card${n.isPinned ? ' pinned' : ''}`;
    if (n.color) card.style.background = n.color;
    card.innerHTML = `
      ${n.isPinned ? '<span class="pin-icon"><i class="fas fa-star"></i></span>' : ''}
      ${n.titulo ? `<div class="card-title">${escHtml(n.titulo)}</div>` : ''}
      <div class="card-tasks">
        ${(n.tareas || []).slice(0, 4).map(t => `
          <div class="ct-item${t.completada ? ' done' : ''}">
            <span class="ct-check">${t.completada ? '✓' : ''}</span>
            ${escHtml(t.texto)}
          </div>
        `).join('')}
        ${n.tareas && n.tareas.length > 4 ? `<div class="ct-item" style="color:var(--text-secondary)">+${n.tareas.length - 4} más</div>` : ''}
      </div>
    `;
    card.addEventListener('click', () => openModal(n));
    notesGrid.appendChild(card);
  });
}

function escHtml(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

// Pending tasks for new note
addTaskBtn.addEventListener('click', addPendingTask);
taskInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addPendingTask(); });

function addPendingTask() {
  const text = taskInput.value.trim();
  if (!text) return;
  pendingTasks.push({ texto: text, completada: false });
  taskInput.value = '';
  renderPendingTasks();
}

function renderPendingTasks() {
  taskPreview.innerHTML = pendingTasks.map((t, i) => `
    <div class="preview-item">
      <span class="p-check"></span>
      <span>${escHtml(t.texto)}</span>
      <button class="p-del" data-i="${i}"><i class="fas fa-times"></i></button>
    </div>
  `).join('');
  taskPreview.querySelectorAll('.p-del').forEach(btn => {
    btn.addEventListener('click', () => {
      pendingTasks.splice(parseInt(btn.dataset.i), 1);
      renderPendingTasks();
    });
  });
}

// Color picker (add note)
addNoteCard.querySelectorAll('.color-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    addNoteCard.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedColor = btn.dataset.color;
  });
});

// Save note
saveNoteBtn.addEventListener('click', createNote);
noteTitleInput.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !e.shiftKey) createNote(); });

async function createNote() {
  const titulo = noteTitleInput.value.trim();
  if (!titulo && pendingTasks.length === 0) return;
  try {
    const nota = await api('/api/notas', {
      method: 'POST',
      body: JSON.stringify({ titulo: titulo || null, color: selectedColor || null })
    });
    for (const t of pendingTasks) {
      await api(`/api/notas/${nota.id}/tareas`, {
        method: 'POST', body: JSON.stringify({ texto: t.texto })
      });
    }
    noteTitleInput.value = '';
    taskInput.value = '';
    pendingTasks = [];
    selectedColor = '';
    renderPendingTasks();
    addNoteCard.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
    addNoteCard.querySelector('.color-btn[data-color=""]').classList.add('active');
    loadNotas();
  } catch (err) { console.error(err); }
}

// Modal
function openModal(nota) {
  currentNota = nota;
  modalTitle.value = nota.titulo || '';
  modal.classList.remove('hidden');
  renderModalTasks();
  updateModalPin();
  updateModalColor();
}

function closeModal() {
  modal.classList.add('hidden');
  currentNota = null;
  modalTaskInput.value = '';
}

modalClose.addEventListener('click', closeModal);
document.querySelector('.modal-backdrop')?.addEventListener('click', closeModal);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

// Modal title edit
let titleTimeout;
modalTitle.addEventListener('input', () => {
  clearTimeout(titleTimeout);
  titleTimeout = setTimeout(saveModalTitle, 500);
});

async function saveModalTitle() {
  if (!currentNota) return;
  try {
    currentNota.titulo = modalTitle.value.trim() || null;
    await api(`/api/notas/${currentNota.id}`, {
      method: 'PUT', body: JSON.stringify(currentNota)
    });
    loadNotas();
  } catch (err) { console.error(err); }
}

// Modal color
modal.querySelectorAll('.color-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    modal.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (!currentNota) return;
    try {
      currentNota.color = btn.dataset.color || null;
      await api(`/api/notas/${currentNota.id}/color`, {
        method: 'PUT', body: JSON.stringify({ color: currentNota.color })
      });
      loadNotas();
    } catch (err) { console.error(err); }
  });
});

function updateModalColor() {
  modal.querySelectorAll('.color-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.color === (currentNota?.color || ''));
  });
}

// Modal pin
modalPin.addEventListener('click', async () => {
  if (!currentNota) return;
  try {
    await api(`/api/notas/${currentNota.id}/toggle-pin`, { method: 'PUT' });
    currentNota.isPinned = !currentNota.isPinned;
    updateModalPin();
    loadNotas();
  } catch (err) { console.error(err); }
});

function updateModalPin() {
  const icon = modalPin.querySelector('i');
  if (currentNota?.isPinned) {
    icon.className = 'fas fa-star';
    modalPin.style.color = '#fbbc04';
  } else {
    icon.className = 'far fa-star';
    modalPin.style.color = '';
  }
}

// Modal tasks
function renderModalTasks() {
  if (!currentNota) return;
  const tasks = currentNota.tareas || [];
  modalTasks.innerHTML = tasks.length === 0
    ? '<div style="color:var(--text-secondary);font-size:13px;padding:12px;text-align:center">Sin tareas</div>'
    : tasks.map(t => `
      <div class="m-task${t.completada ? ' done' : ''}" data-id="${t.id}">
        <span class="m-check"></span>
        <span class="m-text${t.completada ? ' done-text' : ''}">${escHtml(t.texto)}</span>
        <button class="m-del" data-id="${t.id}"><i class="fas fa-trash-alt"></i></button>
      </div>
    `).join('');

  modalTasks.querySelectorAll('.m-check').forEach((el, i) => {
    el.addEventListener('click', () => toggleTask(tasks[i]));
  });
  modalTasks.querySelectorAll('.m-del').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTask(parseInt(el.dataset.id));
    });
  });
}

async function toggleTask(task) {
  try {
    await api(`/api/notas/${currentNota.id}/tareas/${task.id}/toggle`, { method: 'PUT' });
    task.completada = !task.completada;
    renderModalTasks();
    loadNotas();
  } catch (err) { console.error(err); }
}

async function deleteTask(id) {
  try {
    await api(`/api/notas/${currentNota.id}/tareas/${id}`, { method: 'DELETE' });
    currentNota.tareas = currentNota.tareas.filter(t => t.id !== id);
    renderModalTasks();
    loadNotas();
  } catch (err) { console.error(err); }
}

// Add task from modal
modalTaskInput.addEventListener('keypress', async (e) => {
  if (e.key !== 'Enter' || !currentNota) return;
  const texto = modalTaskInput.value.trim();
  if (!texto) return;
  modalTaskInput.value = '';
  try {
    const tarea = await api(`/api/notas/${currentNota.id}/tareas`, {
      method: 'POST', body: JSON.stringify({ texto })
    });
    currentNota.tareas.push(tarea);
    renderModalTasks();
    loadNotas();
  } catch (err) { console.error(err); }
});

// Check all
modalCheckAll.addEventListener('click', async () => {
  if (!currentNota) return;
  const allDone = currentNota.tareas.every(t => t.completada);
  try {
    for (const t of currentNota.tareas) {
      if (t.completada !== allDone) {
        await api(`/api/notas/${currentNota.id}/tareas/${t.id}/toggle`, { method: 'PUT' });
        t.completada = !t.completada;
      }
    }
    renderModalTasks();
    loadNotas();
  } catch (err) { console.error(err); }
});

// Delete note
modalDeleteNote.addEventListener('click', async () => {
  if (!currentNota || !confirm('¿Eliminar esta nota?')) return;
  try {
    await api(`/api/notas/${currentNota.id}`, { method: 'DELETE' });
    closeModal();
    loadNotas();
  } catch (err) { console.error(err); }
});

// Search
let searchTimeout;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => renderNotas(filterNotas()), 200);
});

// Init
if (token) {
  showMain();
  loadNotas();
} else {
  showAuth();
}

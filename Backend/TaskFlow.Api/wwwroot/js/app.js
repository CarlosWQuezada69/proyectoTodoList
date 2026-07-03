const API = '';
let token = localStorage.getItem('token');
let notas = [];
let currentNota = null;
let selectedColor = '';
let pendingTasks = [];
let darkMode = localStorage.getItem('darkMode') === 'true';
let isLoading = false;

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
const emptyIcon = $('empty-icon');
const emptyText = $('empty-text');
const emptySub = $('empty-sub');
const noteTitleInput = $('note-title-input');
const taskInput = $('task-input');
const addTaskBtn = $('add-task-btn');
const taskPreview = $('task-preview');
const saveNoteBtn = $('save-note-btn');
const noteError = $('note-error');
const searchInput = $('search-input');
const modal = $('note-modal');
const modalContent = modal?.querySelector('.modal-content');
const modalTitle = $('modal-title');
const modalTasks = $('modal-tasks');
const modalTaskInput = $('modal-task-input');
const modalClose = $('modal-close');
const modalPin = $('modal-pin');
const modalCheckAll = $('modal-check-all');
const modalDeleteNote = $('modal-delete-note');
const addNoteCard = $('add-note-card');
const toast = $('toast');

if (darkMode) document.documentElement.setAttribute('data-theme', 'dark');
updateDarkIcon();

// Toast ---------------------------------------------------------------
let toastTimer;

function showToast(msg, type = '') {
  clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.className = 'toast' + (type ? ' ' + type : '');
  toast.classList.remove('hidden');
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 3000);
}

// Loading state --------------------------------------------------------
function setLoading(btn, loading) {
  if (!btn) return;
  if (loading) {
    btn.dataset.orig = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span>';
    btn.classList.add('btn-loading');
  } else {
    btn.innerHTML = btn.dataset.orig || btn.innerHTML;
    btn.classList.remove('btn-loading');
  }
}

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
  setLoading(loginForm.querySelector('button[type="submit"]'), true);
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
    showToast('Sesión iniciada', 'success');
  } catch (err) { loginError.textContent = err.message; }
  finally { setLoading(loginForm.querySelector('button[type="submit"]'), false); }
});

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = $('reg-username').value;
  const password = $('reg-password').value;
  registerError.textContent = '';
  setLoading(registerForm.querySelector('button[type="submit"]'), true);
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
    showToast('Cuenta creada', 'success');
  } catch (err) { registerError.textContent = err.message; }
  finally { setLoading(registerForm.querySelector('button[type="submit"]'), false); }
});

logoutBtn.addEventListener('click', () => {
  token = null; localStorage.removeItem('token'); showAuth();
  closeModal();
  showToast('Sesión cerrada');
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
  if (res.status === 429) throw new Error('Demasiadas solicitudes. Espera un momento.');
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
  } catch (err) {
    if (err.message !== 'Sesión expirada') {
      showToast('Error al cargar notas', 'error');
    }
  }
}

function filterNotas() {
  const q = searchInput.value.toLowerCase();
  if (!q) return notas;
  return notas.filter(n => {
    const titleMatch = n.titulo && n.titulo.toLowerCase().includes(q);
    const tasksMatch = n.tareas && n.tareas.some(t => t.texto.toLowerCase().includes(q));
    return titleMatch || tasksMatch;
  });
}

function renderNotas(filtered) {
  notesGrid.innerHTML = '';
  const isSearching = searchInput.value.trim().length > 0;
  if (filtered.length === 0) {
    emptyMsg.classList.remove('hidden');
    if (isSearching) {
      emptyIcon.textContent = '🔍';
      emptyText.textContent = 'Sin resultados';
      emptySub.textContent = 'Prueba con otro término de búsqueda';
    } else {
      emptyIcon.textContent = '📝';
      emptyText.textContent = 'No hay notas. ¡Crea una!';
      emptySub.textContent = 'Escribe un título y añade tareas arriba';
    }
    return;
  }
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

// Pending tasks
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
  noteError.textContent = '';
  setLoading(saveNoteBtn, true);
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
    noteError.textContent = '✓ Nota creada';
    noteError.style.color = '#34a853';
    setTimeout(() => { noteError.textContent = ''; noteError.style.color = ''; }, 2000);
    showToast('Nota creada', 'success');
    loadNotas();
  } catch (err) {
    noteError.textContent = '✗ ' + err.message;
    noteError.style.color = '#d93025';
    showToast(err.message, 'error');
  } finally { setLoading(saveNoteBtn, false); }
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
  } catch (err) { showToast('Error al guardar título', 'error'); }
}

// Modal color
modal.querySelectorAll('.color-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    modal.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (!currentNota) return;
    const color = btn.dataset.color || null;
    try {
      currentNota.color = color;
      if (modalContent) modalContent.style.background = color || 'var(--surface)';
      await api(`/api/notas/${currentNota.id}/color`, {
        method: 'PUT', body: JSON.stringify({ color })
      });
      loadNotas();
    } catch (err) { showToast('Error al cambiar color', 'error'); }
  });
});

function updateModalColor() {
  modal.querySelectorAll('.color-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.color === (currentNota?.color || ''));
  });
  if (modalContent) modalContent.style.background = currentNota?.color || 'var(--surface)';
}

// Modal pin
modalPin.addEventListener('click', async () => {
  if (!currentNota) return;
  try {
    await api(`/api/notas/${currentNota.id}/toggle-pin`, { method: 'PUT' });
    currentNota.isPinned = !currentNota.isPinned;
    updateModalPin();
    loadNotas();
  } catch (err) { showToast('Error al fijar nota', 'error'); }
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
    ? '<div style="color:var(--text-secondary);font-size:13px;padding:12px;text-align:center">Sin tareas. Escribe una abajo.</div>'
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
  // Inline edit
  modalTasks.querySelectorAll('.m-text').forEach((el, i) => {
    el.addEventListener('dblclick', () => startInlineEdit(el, tasks[i]));
  });
}

async function toggleTask(task) {
  try {
    await api(`/api/notas/${currentNota.id}/tareas/${task.id}/toggle`, { method: 'PUT' });
    task.completada = !task.completada;
    renderModalTasks();
    loadNotas();
  } catch (err) { showToast('Error al actualizar tarea', 'error'); }
}

async function deleteTask(id) {
  try {
    await api(`/api/notas/${currentNota.id}/tareas/${id}`, { method: 'DELETE' });
    currentNota.tareas = currentNota.tareas.filter(t => t.id !== id);
    renderModalTasks();
    loadNotas();
  } catch (err) { showToast('Error al eliminar tarea', 'error'); }
}

// Inline edit task
function startInlineEdit(el, task) {
  const orig = task.texto;
  el.contentEditable = 'true';
  el.focus();
  const sel = window.getSelection();
  sel.selectAllChildren(el);
  sel.collapseToEnd();

  const finish = async () => {
    el.contentEditable = 'false';
    const newText = el.textContent.trim();
    if (newText && newText !== orig) {
      task.texto = newText;
      try {
        await api(`/api/notas/${currentNota.id}/tareas/${task.id}`, {
          method: 'PUT', body: JSON.stringify(task)
        });
        loadNotas();
      } catch (err) { showToast('Error al editar tarea', 'error'); }
    }
    el.textContent = task.texto;
    renderModalTasks();
  };

  el.addEventListener('blur', () => finish(), { once: true });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); finish(); }
    if (e.key === 'Escape') { el.textContent = orig; el.contentEditable = 'false'; renderModalTasks(); }
  }, { once: false });
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
    showToast('Tarea añadida', 'success');
  } catch (err) { showToast('Error al añadir tarea', 'error'); }
});

// Check all
modalCheckAll.addEventListener('click', async () => {
  if (!currentNota) return;
  const allDone = currentNota.tareas.length > 0 && currentNota.tareas.every(t => t.completada);
  let count = 0;
  try {
    for (const t of currentNota.tareas) {
      if (t.completada !== !allDone) {
        await api(`/api/notas/${currentNota.id}/tareas/${t.id}/toggle`, { method: 'PUT' });
        t.completada = !t.completada;
        count++;
      }
    }
    renderModalTasks();
    loadNotas();
    showToast(allDone ? 'Todas desmarcadas' : 'Todas marcadas', 'success');
  } catch (err) { showToast('Error', 'error'); }
});

// Delete note
modalDeleteNote.addEventListener('click', async () => {
  if (!currentNota || !confirm('¿Eliminar esta nota?')) return;
  try {
    await api(`/api/notas/${currentNota.id}`, { method: 'DELETE' });
    closeModal();
    loadNotas();
    showToast('Nota eliminada', 'success');
  } catch (err) { showToast('Error al eliminar nota', 'error'); }
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

const API = '';
let token = localStorage.getItem('token');
let notas = [];
let etiquetas = [];
let currentNota = null;
let selectedColor = '';
let pendingTasks = [];
let darkMode = localStorage.getItem('darkMode') === 'true';
let listView = localStorage.getItem('listView') === 'true';
let showArchived = false;
let filterLabelId = null;

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
const viewToggle = $('view-toggle');
const notesContainer = $('notes-container');
const emptyMsg = $('empty-msg');
const emptyIcon = $('empty-icon');
const emptyText = $('empty-text');
const emptySub = $('empty-sub');
const noteTitleInput = $('note-title-input');
const noteContentInput = $('note-content-input');
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
const modalContentInput = $('modal-content');
const modalTaskInput = $('modal-task-input');
const modalClose = $('modal-close');
const modalPin = $('modal-pin');
const modalArchive = $('modal-archive');
const modalCheckAll = $('modal-check-all');
const modalDeleteNote = $('modal-delete-note');
const modalRestoreNote = $('modal-restore-note');
const modalReminder = $('modal-reminder');
const modalReminderClear = $('modal-reminder-clear');
const modalEtiquetas = $('modal-etiquetas');
const modalEtiquetaSelect = $('modal-etiqueta-select');
const modalEtiquetaAdd = $('modal-etiqueta-add');
const addNoteCard = $('add-note-card');
const toast = $('toast');
const viewNotesBtn = $('view-notes-btn');
const viewArchivedBtn = $('view-archived-btn');
const labelsBar = $('labels-bar');
const labelsScroll = $('labels-scroll');
const filterBar = $('filter-bar');
const filterLabels = $('filter-labels');
const menuBtn = $('menu-btn');
const menuClose = $('menu-close');
const mobileMenu = $('mobile-menu');
const menuUserName = $('menu-user-name');
const menuNotesBtn = $('menu-notes-btn');
const menuArchivedBtn = $('menu-archived-btn');
const menuViewToggle = $('menu-view-toggle');
const menuViewText = $('menu-view-text');
const menuDarkToggle = $('menu-dark-toggle');
const menuDarkText = $('menu-dark-text');
const menuLogout = $('menu-logout');

if (darkMode) document.documentElement.setAttribute('data-theme', 'dark');
updateDarkIcon();
updateViewIcon();

// Toast
let toastTimer;
function showToast(msg, type = '') {
  clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.className = 'toast' + (type ? ' ' + type : '');
  toast.classList.remove('hidden');
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 3000);
}

// Loading
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
    if (!res.ok) { const err = await res.json(); throw new Error(err.message || 'Error al iniciar sesión'); }
    const data = await res.json();
    token = data.token;
    localStorage.setItem('token', token);
    userDisplay.textContent = data.username;
    showMain();
    loadAll();
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
    if (!res.ok) { const err = await res.json(); throw new Error(err.message || 'Error al registrarse'); }
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

// View toggle
viewToggle.addEventListener('click', () => {
  listView = !listView;
  localStorage.setItem('listView', listView);
  updateViewIcon();
  render();
});

function updateViewIcon() {
  viewToggle.innerHTML = listView ? '<i class="fas fa-th-large"></i>' : '<i class="fas fa-list"></i>';
  viewToggle.title = listView ? 'Vista cuadrícula' : 'Vista lista';
  if (menuViewText) menuViewText.textContent = listView ? 'Vista cuadrícula' : 'Vista lista';
}

// Mobile menu
function openMenu() {
  if (!mobileMenu || !token) return;
  if (menuUserName) menuUserName.textContent = userDisplay.textContent;
  syncMenuTabs();
  mobileMenu.classList.remove('hidden');
}
function closeMenu() {
  if (mobileMenu) mobileMenu.classList.add('hidden');
}
function syncMenuTabs() {
  if (menuNotesBtn) menuNotesBtn.classList.toggle('active', !showArchived);
  if (menuArchivedBtn) menuArchivedBtn.classList.toggle('active', showArchived);
}

if (menuBtn) menuBtn.addEventListener('click', openMenu);
if (menuClose) menuClose.addEventListener('click', closeMenu);
document.querySelector('.mobile-menu-backdrop')?.addEventListener('click', closeMenu);

if (menuNotesBtn) menuNotesBtn.addEventListener('click', () => {
  showArchived = false;
  syncMenuTabs();
  if (viewNotesBtn) { viewNotesBtn.classList.add('active'); viewArchivedBtn?.classList.remove('active'); }
  if (addNoteCard) addNoteCard.classList.remove('hidden');
  if (labelsBar) labelsBar.classList.remove('hidden');
  closeMenu();
  loadNotas();
});
if (menuArchivedBtn) menuArchivedBtn.addEventListener('click', () => {
  showArchived = true;
  syncMenuTabs();
  if (viewArchivedBtn) { viewArchivedBtn.classList.add('active'); viewNotesBtn?.classList.remove('active'); }
  if (addNoteCard) addNoteCard.classList.add('hidden');
  if (labelsBar) labelsBar.classList.add('hidden');
  closeMenu();
  loadNotas();
});
if (menuViewToggle) menuViewToggle.addEventListener('click', () => {
  listView = !listView;
  localStorage.setItem('listView', listView);
  updateViewIcon();
  render();
  closeMenu();
});
if (menuDarkToggle) menuDarkToggle.addEventListener('click', () => {
  darkMode = !darkMode;
  localStorage.setItem('darkMode', darkMode);
  document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : '');
  updateDarkIcon();
  if (menuDarkText) menuDarkText.textContent = darkMode ? 'Modo claro' : 'Modo oscuro';
  closeMenu();
});
if (menuLogout) menuLogout.addEventListener('click', () => {
  closeMenu();
  logoutBtn?.click();
});

function updateDarkIcon() {
  darkToggle.innerHTML = darkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
  darkToggle.title = darkMode ? 'Modo claro' : 'Modo oscuro';
  if (menuDarkText) menuDarkText.textContent = darkMode ? 'Modo claro' : 'Modo oscuro';
}

// Notes / Archived tabs
viewNotesBtn.addEventListener('click', () => {
  showArchived = false;
  viewNotesBtn.classList.add('active');
  viewArchivedBtn.classList.remove('active');
  addNoteCard.classList.remove('hidden');
  labelsBar.classList.remove('hidden');
  loadNotas();
});
viewArchivedBtn.addEventListener('click', () => {
  showArchived = true;
  viewArchivedBtn.classList.add('active');
  viewNotesBtn.classList.remove('active');
  addNoteCard.classList.add('hidden');
  labelsBar.classList.add('hidden');
  loadNotas();
});

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

// Load all data
async function loadAll() {
  await Promise.all([loadNotas(), loadEtiquetas()]);
}

async function loadNotas() {
  try {
    notas = await api(`/api/notas?archivadas=${showArchived}`);
    render();
  } catch (err) {
    if (err.message !== 'Sesión expirada') showToast('Error al cargar notas', 'error');
  }
}

async function loadEtiquetas() {
  try {
    etiquetas = await api('/api/etiquetas');
    renderLabelsBar();
    renderFilterLabels();
  } catch (err) { /* silent */ }
}

function getFiltered() {
  const q = searchInput.value.toLowerCase();
  let filtered = notas;
  if (q) {
    filtered = filtered.filter(n => {
      const titleMatch = n.titulo && n.titulo.toLowerCase().includes(q);
      const contentMatch = n.contenido && n.contenido.toLowerCase().includes(q);
      const tasksMatch = n.tareas && n.tareas.some(t => t.texto.toLowerCase().includes(q));
      return titleMatch || contentMatch || tasksMatch;
    });
  }
  if (filterLabelId) {
    filtered = filtered.filter(n =>
      n.notaEtiquetas && n.notaEtiquetas.some(ne => ne.etiquetaId === filterLabelId)
    );
  }
  return filtered;
}

// Labels bar
function renderLabelsBar() {
  if (etiquetas.length === 0) { labelsBar.classList.add('hidden'); return; }
  labelsBar.classList.remove('hidden');
  labelsScroll.innerHTML = etiquetas.map(e => `
    <span class="label-chip${filterLabelId === e.id ? ' active' : ''}" data-id="${e.id}">
      <span class="label-dot" style="background:${e.color || '#888'}"></span>
      ${escHtml(e.nombre)}
    </span>
  `).join('');
  labelsScroll.querySelectorAll('.label-chip').forEach(el => {
    el.addEventListener('click', () => {
      const id = parseInt(el.dataset.id);
      if (filterLabelId === id) {
        filterLabelId = null;
      } else {
        filterLabelId = id;
      }
      renderLabelsBar();
      render();
    });
  });
}

function renderFilterLabels() {
  filterBar.classList.toggle('hidden', etiquetas.length === 0);
  filterLabels.innerHTML = etiquetas.map(e => `
    <span class="label-chip" data-id="${e.id}">
      <span class="label-dot" style="background:${e.color || '#888'}"></span>
      ${escHtml(e.nombre)}
      <i class="fas fa-times" style="font-size:10px;margin-left:4px"></i>
    </span>
  `).join('');
}

// Render
function render() {
  renderNotas(getFiltered());
}

function renderNotas(filtered) {
  const isGridView = !listView;
  const containerClass = isGridView ? 'notes-grid' : 'notes-list';
  notesContainer.className = containerClass;
  notesContainer.innerHTML = '';

  const isSearching = searchInput.value.trim().length > 0;
  if (filtered.length === 0) {
    emptyMsg.classList.remove('hidden');
    if (isSearching) {
      emptyIcon.textContent = '🔍';
      emptyText.textContent = 'Sin resultados';
      emptySub.textContent = 'Prueba con otro término de búsqueda';
    } else if (showArchived) {
      emptyIcon.textContent = '📦';
      emptyText.textContent = 'No hay notas archivadas';
      emptySub.textContent = 'Archiva notas para que aparezcan aquí';
    } else if (filterLabelId) {
      emptyIcon.textContent = '🏷️';
      emptyText.textContent = 'Sin notas con esa etiqueta';
      emptySub.textContent = 'Prueba con otra etiqueta';
    } else {
      emptyIcon.textContent = '📝';
      emptyText.textContent = 'No hay notas. ¡Crea una!';
      emptySub.textContent = 'Escribe un título, contenido y añade tareas';
    }
    return;
  }
  emptyMsg.classList.add('hidden');

  filtered.forEach((n, idx) => {
    const card = document.createElement('div');
    card.className = `note-card${n.isPinned ? ' pinned' : ''}${n.archivada ? ' archived' : ''}`;
    card.draggable = !showArchived;
    if (n.color) card.style.background = n.color;

    const content = n.contenido ? escHtml(n.contenido).substring(0, 120) + (n.contenido.length > 120 ? '...' : '') : '';
    const labels = (n.notaEtiquetas || []).map(ne => ({
      id: ne.etiquetaId,
      nombre: ne.etiqueta?.nombre || '',
      color: ne.etiqueta?.color || '#888'
    }));
    const hasReminder = n.recordatorio;
    const fecha = n.fechaModificacion || n.fechaCreacion;

    if (isGridView) {
      card.innerHTML = `
        ${n.isPinned ? '<span class="pin-icon"><i class="fas fa-star"></i></span>' : ''}
        ${n.titulo ? `<div class="card-title">${escHtml(n.titulo)}</div>` : ''}
        ${content ? `<div class="card-content">${content}</div>` : ''}
        ${hasReminder ? `<div class="card-reminder"><i class="fas fa-bell"></i> ${formatDate(n.recordatorio)}</div>` : ''}
        ${labels.length > 0 ? `<div class="card-labels">${labels.map(l => `<span class="card-label">${escHtml(l.nombre)}</span>`).join('')}</div>` : ''}
        <div class="card-tasks">
          ${(n.tareas || []).slice(0, 3).map(t => `
            <div class="ct-item${t.completada ? ' done' : ''}">
              <span class="ct-check">${t.completada ? '✓' : ''}</span>
              ${escHtml(t.texto)}
            </div>
          `).join('')}
          ${n.tareas && n.tareas.length > 3 ? `<div class="ct-item" style="color:var(--text-secondary)">+${n.tareas.length - 3} más</div>` : ''}
        </div>
        <div class="card-date">${fecha ? formatDateTime(fecha) : ''}</div>
      `;
    } else {
      const tasksPreview = (n.tareas || []).slice(0, 2).map(t =>
        `<span class="ct-item${t.completada ? ' done' : ''}">${escHtml(t.texto)}</span>`
      ).join('');
      card.innerHTML = `
        ${n.isPinned ? '<span class="pin-icon"><i class="fas fa-star"></i></span>' : ''}
        <div class="card-title">${n.titulo ? escHtml(n.titulo) : '<span style="color:var(--text-secondary)">Sin título</span>'}</div>
        ${content ? `<div class="card-content">${content}</div>` : ''}
        ${n.tareas && n.tareas.length > 0 ? `<div class="card-tasks">${tasksPreview}</div>` : ''}
        <div class="card-meta">
          ${hasReminder ? `<div class="card-reminder"><i class="fas fa-bell"></i> ${formatDate(n.recordatorio)}</div>` : ''}
          ${labels.length > 0 ? `<div class="card-labels">${labels.map(l => `<span class="card-label">${escHtml(l.nombre)}</span>`).join('')}</div>` : ''}
          <span class="card-date">${fecha ? formatDateTime(fecha) : ''}</span>
        </div>
      `;
    }

    // Drag & drop
    card.addEventListener('dragstart', (e) => {
      if (showArchived) return;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', n.id);
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
    card.addEventListener('dragover', (e) => {
      if (showArchived) return;
      e.preventDefault();
      card.classList.add('drag-over');
    });
    card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
    card.addEventListener('drop', async (e) => {
      if (showArchived) return;
      e.preventDefault();
      card.classList.remove('drag-over');
      const draggedId = parseInt(e.dataTransfer.getData('text/plain'));
      if (draggedId === n.id) return;
      await reorderNotas(draggedId, n.id);
    });

    card.addEventListener('click', () => openModal(n));
    notesContainer.appendChild(card);
  });
}

async function reorderNotas(draggedId, targetId) {
  const draggedIdx = notas.findIndex(n => n.id === draggedId);
  const targetIdx = notas.findIndex(n => n.id === targetId);
  if (draggedIdx === -1 || targetIdx === -1) return;

  const [removed] = notas.splice(draggedIdx, 1);
  notas.splice(targetIdx, 0, removed);

  render();
  try {
    for (let i = 0; i < notas.length; i++) {
      await api(`/api/notas/${notas[i].id}/reorder`, {
        method: 'PUT', body: JSON.stringify({ orden: i })
      });
    }
  } catch (err) {
    showToast('Error al reordenar', 'error');
    loadNotas();
  }
}

function formatDate(d) {
  if (!d) return '';
  const date = new Date(d);
  const now = new Date();
  const opts = { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' };
  if (date.getFullYear() !== now.getFullYear()) opts.year = 'numeric';
  return date.toLocaleDateString('es', opts);
}

function formatDateTime(d) {
  if (!d) return '';
  const date = new Date(d);
  const now = new Date();
  const diff = now - date;
  if (diff < 60000) return 'Justo ahora';
  if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
  if (diff < 86400000 && date.getDate() === now.getDate()) {
    return `Hoy ${date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (diff < 172800000 && date.getDate() === now.getDate() - 1) {
    return `Ayer ${date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`;
  }
  const opts = { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' };
  if (date.getFullYear() !== now.getFullYear()) opts.year = 'numeric';
  return date.toLocaleDateString('es', opts);
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
  const contenido = noteContentInput.value.trim() || null;
  if (!titulo && !contenido && pendingTasks.length === 0) return;
  noteError.textContent = '';
  setLoading(saveNoteBtn, true);
  try {
    const nota = await api('/api/notas', {
      method: 'POST',
      body: JSON.stringify({ titulo: titulo || null, contenido, color: selectedColor || null })
    });
    for (const t of pendingTasks) {
      await api(`/api/notas/${nota.id}/tareas`, {
        method: 'POST', body: JSON.stringify({ texto: t.texto })
      });
    }
    noteTitleInput.value = '';
    noteContentInput.value = '';
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
async function openModal(nota) {
  currentNota = nota;
  modalTitle.value = nota.titulo || '';
  modalContentInput.value = nota.contenido || '';
  modal.classList.remove('hidden');

  const datesDiv = $('modal-dates');
  const created = nota.fechaCreacion ? `Creado ${formatDateTime(nota.fechaCreacion)}` : '';
  const modified = nota.fechaModificacion ? `Modificado ${formatDateTime(nota.fechaModificacion)}` : '';
  datesDiv.innerHTML = created
    ? `<span><i class="far fa-calendar-alt"></i> ${created}</span><span><i class="far fa-edit"></i> ${modified}</span>`
    : '';

  renderModalTasks();
  updateModalPin();
  updateModalColor();
  updateModalArchive();
  updateModalReminder();
  renderModalEtiquetas();
  updateModalEtiquetaSelect();
  modalRestoreNote.classList.toggle('hidden', !nota.archivada);
  modalDeleteNote.classList.toggle('hidden', nota.archivada);
  modalArchive.classList.toggle('hidden', nota.archivada);
}

function closeModal() {
  modal.classList.add('hidden');
  currentNota = null;
  modalTaskInput.value = '';
}

modalClose.addEventListener('click', closeModal);
document.querySelector('.modal-backdrop')?.addEventListener('click', closeModal);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

// Modal title + content edit
let modalSaveTimeout;
modalTitle.addEventListener('input', scheduleModalSave);
modalContentInput.addEventListener('input', scheduleModalSave);

function scheduleModalSave() {
  clearTimeout(modalSaveTimeout);
  modalSaveTimeout = setTimeout(saveModalContent, 500);
}

async function saveModalContent() {
  if (!currentNota) return;
  try {
    currentNota.titulo = modalTitle.value.trim() || null;
    currentNota.contenido = modalContentInput.value.trim() || null;
    await api(`/api/notas/${currentNota.id}`, {
      method: 'PUT', body: JSON.stringify(currentNota)
    });
    loadNotas();
  } catch (err) { showToast('Error al guardar', 'error'); }
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

// Modal archive / restore
modalArchive.addEventListener('click', async () => {
  if (!currentNota) return;
  try {
    await api(`/api/notas/${currentNota.id}/archive`, { method: 'PUT' });
    closeModal();
    showToast('Nota archivada', 'success');
    loadNotas();
  } catch (err) { showToast('Error al archivar', 'error'); }
});

modalRestoreNote.addEventListener('click', async () => {
  if (!currentNota) return;
  try {
    await api(`/api/notas/${currentNota.id}/restore`, { method: 'PUT' });
    closeModal();
    showToast('Nota restaurada', 'success');
    loadNotas();
  } catch (err) { showToast('Error al restaurar', 'error'); }
});

function updateModalArchive() {
  if (currentNota?.archivada) {
    modalArchive.querySelector('i').className = 'fas fa-archive';
    modalArchive.title = 'Archivada';
  } else {
    modalArchive.querySelector('i').className = 'fas fa-archive';
    modalArchive.title = 'Archivar';
  }
}

// Modal reminder
modalReminder.addEventListener('change', async () => {
  if (!currentNota) return;
  const val = modalReminder.value;
  const reminderDate = val ? new Date(val).toISOString() : null;
  try {
    currentNota.recordatorio = reminderDate;
    await api(`/api/notas/${currentNota.id}`, {
      method: 'PUT', body: JSON.stringify(currentNota)
    });
    updateModalReminderClear(!!val);
    loadNotas();
    showToast(val ? 'Recordatorio guardado' : 'Recordatorio eliminado', 'success');
  } catch (err) { showToast('Error al guardar recordatorio', 'error'); }
});

modalReminderClear.addEventListener('click', () => {
  modalReminder.value = '';
  modalReminder.dispatchEvent(new Event('change'));
});

function updateModalReminder() {
  if (currentNota?.recordatorio) {
    const d = new Date(currentNota.recordatorio);
    const pad = n => String(n).padStart(2, '0');
    modalReminder.value = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    updateModalReminderClear(true);
  } else {
    modalReminder.value = '';
    updateModalReminderClear(false);
  }
}

function updateModalReminderClear(show) {
  modalReminderClear.classList.toggle('hidden', !show);
}

// Modal etiquetas
function renderModalEtiquetas() {
  if (!currentNota) return;
  const noteLabels = currentNota.notaEtiquetas || [];
  if (noteLabels.length === 0) {
    modalEtiquetas.innerHTML = '<div style="font-size:12px;color:var(--text-secondary);padding:4px 0">Sin etiquetas</div>';
    return;
  }
  modalEtiquetas.innerHTML = noteLabels.map(ne => `
    <span class="modal-etiqueta-chip" data-etiqueta-id="${ne.etiquetaId}">
      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${ne.etiqueta?.color || '#888'};flex-shrink:0"></span>
      ${escHtml(ne.etiqueta?.nombre || '')}
      <span class="rem"><i class="fas fa-times"></i></span>
    </span>
  `).join('');
  modalEtiquetas.querySelectorAll('.modal-etiqueta-chip').forEach(el => {
    el.addEventListener('click', async () => {
      const etiquetaId = parseInt(el.dataset.etiquetaId);
      try {
        await api(`/api/etiquetas/${etiquetaId}/notas/${currentNota.id}`, { method: 'DELETE' });
        currentNota.notaEtiquetas = currentNota.notaEtiquetas.filter(ne => ne.etiquetaId !== etiquetaId);
        renderModalEtiquetas();
        loadNotas();
        showToast('Etiqueta quitada', 'success');
      } catch (err) { showToast('Error', 'error'); }
    });
  });
}

function updateModalEtiquetaSelect() {
  const usedIds = new Set((currentNota?.notaEtiquetas || []).map(ne => ne.etiquetaId));
  const available = etiquetas.filter(e => !usedIds.has(e.id));
  modalEtiquetaSelect.innerHTML = '<option value="">Seleccionar etiqueta...</option>'
    + available.map(e => `<option value="${e.id}">${escHtml(e.nombre)}</option>`).join('');
}

modalEtiquetaAdd.addEventListener('click', async () => {
  if (!currentNota || !modalEtiquetaSelect.value) return;
  const etiquetaId = parseInt(modalEtiquetaSelect.value);
  try {
    await api(`/api/etiquetas/${etiquetaId}/notas/${currentNota.id}`, { method: 'POST' });
    if (!currentNota.notaEtiquetas) currentNota.notaEtiquetas = [];
    const etiqueta = etiquetas.find(e => e.id === etiquetaId);
    if (etiqueta) {
      currentNota.notaEtiquetas.push({ etiquetaId, etiqueta });
    }
    renderModalEtiquetas();
    updateModalEtiquetaSelect();
    loadNotas();
    showToast('Etiqueta añadida', 'success');
  } catch (err) { showToast('Error', 'error'); }
});

// Create new label button in select area
const createLabelBtn = document.createElement('button');
createLabelBtn.className = 'btn-sm btn-outline';
createLabelBtn.textContent = '+ Nueva';
createLabelBtn.addEventListener('click', () => {
  const name = prompt('Nombre de la nueva etiqueta:');
  if (!name || !name.trim()) return;
  const color = prompt('Color (opcional, ej: #f28b82):') || '#888';
  createEtiqueta(name.trim(), color);
});
modalEtiquetaAdd.parentNode.appendChild(createLabelBtn);

async function createEtiqueta(nombre, color) {
  try {
    const e = await api('/api/etiquetas', {
      method: 'POST', body: JSON.stringify({ nombre, color })
    });
    etiquetas.push(e);
    renderLabelsBar();
    renderFilterLabels();
    updateModalEtiquetaSelect();
    showToast('Etiqueta creada', 'success');
  } catch (err) { showToast('Error al crear etiqueta', 'error'); }
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
  searchTimeout = setTimeout(() => render(), 200);
});

// Init
if (token) {
  showMain();
  loadAll();
} else {
  showAuth();
}

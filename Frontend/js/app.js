const API = 'http://localhost:5000';
let notas = [];
let currentNota = null;
let darkMode = localStorage.getItem('darkMode') === 'true';
let listView = localStorage.getItem('listView') === 'true';
let currentView = 'notes';
let modalMode = ''; // 'viewing' | 'editing' | 'creating'

const $ = id => document.getElementById(id);
const mainSection = $('main-section');
const darkToggle = $('dark-toggle');
const viewToggle = $('view-toggle');
const notesContainer = $('notes-container');
const emptyMsg = $('empty-msg');
const emptyIcon = $('empty-icon');
const emptyText = $('empty-text');
const emptySub = $('empty-sub');
const searchInput = $('search-input');
const modal = $('note-modal');
const modalTitle = $('modal-title');
const modalContent = $('modal-content');
const modalTasks = $('modal-tasks');
const modalTaskInput = $('modal-task-input');
const modalClose = $('modal-close');
const modalDots = $('modal-dots');
const modalDotsMenu = $('modal-dots-menu');
const dotsEdit = $('dots-edit');
const dotsDelete = $('dots-delete');
const dotsArchive = $('dots-archive');
const dotsRestore = $('dots-restore');
const modalDates = $('modal-dates');

const modalReminderBtn = $('modal-reminder-btn');
const modalReminderRow = $('modal-reminder-row');
const modalReminder = $('modal-reminder');
const modalReminderClear = $('modal-reminder-clear');
const modalSaveBtn = $('modal-save-btn');
const modalCreateBtn = $('modal-create-btn');
const fabBtn = $('fab-btn');
const toast = $('toast');
const viewNotesBtn = $('view-notes-btn');
const viewArchivedBtn = $('view-archived-btn');
const menuBtn = $('menu-btn');
const menuClose = $('menu-close');
const mobileMenu = $('mobile-menu');
const menuNotesBtn = $('menu-notes-btn');
const menuArchivedBtn = $('menu-archived-btn');
const menuViewToggle = $('menu-view-toggle');
const menuViewText = $('menu-view-text');
const menuDarkToggle = $('menu-dark-toggle');
const menuDarkText = $('menu-dark-text');
const refreshBtn = $('refresh-btn');

if (darkMode) document.documentElement.setAttribute('data-theme', 'dark');
updateDarkIcon();
updateViewIcon();

loadNotas();


// Toast
let toastTimer;
const confirmDialog = document.getElementById('confirmDeleteModal');

function showConfirmModal() {
  const msg = document.getElementById('confirm-msg');
  msg.textContent = '¿Eliminar esta nota?';
  return new Promise((resolve) => {
    confirmDialog.showModal();
    confirmDialog.addEventListener('close', () => {
      resolve(confirmDialog.returnValue === 'confirm');
    }, { once: true });
  });
}

function showToast(msg, type = '') {
  clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.className = 'toast' + (type ? ' ' + type : '');
  toast.classList.remove('hidden');
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 3000);
}

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

darkToggle.addEventListener('click', toggleDark);
function toggleDark() {
  darkMode = !darkMode;
  localStorage.setItem('darkMode', darkMode);
  document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : '');
  updateDarkIcon();
}
function updateDarkIcon() {
  darkToggle.innerHTML = darkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
  darkToggle.title = darkMode ? 'Modo claro' : 'Modo oscuro';
  if (menuDarkText) menuDarkText.textContent = darkMode ? 'Modo claro' : 'Modo oscuro';
}

viewToggle.addEventListener('click', toggleView);
function toggleView() {
  listView = !listView;
  localStorage.setItem('listView', listView);
  updateViewIcon();
  render();
}
function updateViewIcon() {
  viewToggle.innerHTML = listView ? '<i class="fas fa-th-large"></i>' : '<i class="fas fa-list"></i>';
  viewToggle.title = listView ? 'Vista cuadrícula' : 'Vista lista';
  if (menuViewText) menuViewText.textContent = listView ? 'Vista cuadrícula' : 'Vista lista';
}

// Mobile menu
function openMenu() {
  if (!mobileMenu) return;
  menuNotesBtn?.classList.toggle('active', currentView === 'notes');
  menuArchivedBtn?.classList.toggle('active', currentView === 'archived');
  mobileMenu.classList.remove('hidden');
}
function closeMenu() { mobileMenu?.classList.add('hidden'); }
menuBtn?.addEventListener('click', openMenu);
menuClose?.addEventListener('click', closeMenu);
document.querySelector('.mobile-menu-backdrop')?.addEventListener('click', closeMenu);

menuNotesBtn?.addEventListener('click', () => switchView('notes'));
menuArchivedBtn?.addEventListener('click', () => switchView('archived'));
menuViewToggle?.addEventListener('click', () => { toggleView(); closeMenu(); });
menuDarkToggle?.addEventListener('click', () => { toggleDark(); closeMenu(); });

// Sidebar delegation
document.querySelector('.sidebar-nav')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.sidebar-item');
  if (!btn) return;
  const view = btn.dataset.view;
  if (view === 'notes') switchView('notes');
  else if (view === 'archived') switchView('archived');
  else if (view === 'trash') switchView('trash');
});

// Refresh button
refreshBtn?.addEventListener('click', () => { loadNotas(); showToast('Notas actualizadas', 'success'); });

function switchView(view) {
  currentView = view;
  document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
  const btnMap = { notes: 'view-notes-btn', archived: 'view-archived-btn', trash: 'sidebar-trash' };
  const btn = document.getElementById(btnMap[view]);
  if (btn) btn.classList.add('active');
  if (fabBtn) fabBtn.classList.toggle('hidden', view !== 'notes');
  closeMenu();
  loadNotas();
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !modal.classList.contains('hidden') === false && !$('confirmDeleteModal').open) {
    e.preventDefault();
    fabBtn?.click();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
    e.preventDefault();
    searchInput?.focus();
  }
  if (e.key === 'Escape' && $('confirmDeleteModal').open) {
    $('confirmDeleteModal').close();
  }
});

// Focus trap in modal
modal.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab') return;
  const focusable = modal.querySelectorAll('button, input, textarea, select, [tabindex]:not([tabindex="-1"])');
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

// Skeleton loading
function showSkeleton(count = 6) {
  notesContainer.className = 'notes-grid';
  notesContainer.innerHTML = '';
  emptyMsg.classList.add('hidden');
  for (let i = 0; i < count; i++) {
    const sk = document.createElement('div');
    sk.className = 'skeleton-card';
    sk.innerHTML = '<div class="skeleton-line w-60"></div><div class="skeleton-line w-90"></div><div class="skeleton-line w-40"></div>';
    notesContainer.appendChild(sk);
  }
}

// Undo toast
let undoCallback = null;
function showUndoToast(msg, actionLabel, onUndo) {
  const toast = $('toast');
  clearTimeout(toastTimer);
  undoCallback = onUndo;
  toast.innerHTML = `<span>${msg}</span><button class="toast-undo">${actionLabel}</button>`;
  toast.className = 'toast undo-toast';
  toast.classList.remove('hidden');
  toast.querySelector('.toast-undo').onclick = () => {
    undoCallback?.();
    undoCallback = null;
    toast.classList.add('hidden');
  };
  toastTimer = setTimeout(() => { toast.classList.add('hidden'); undoCallback = null; }, 5000);
}

// API
async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  let res = await fetch(`${API}${path}`, { ...options, headers });

  if (res.status === 429) throw new Error('Demasiadas solicitudes. Espera un momento.');

  const text = await res.text();
  if (!res.ok) {
    let msg = 'Error';
    try { const j = JSON.parse(text); msg = j.message || j.title || 'Error'; } catch {}
    throw new Error(msg);
  }
  return text ? JSON.parse(text) : null;
}

let page = 1;
let hasMore = true;
let isLoadingMore = false;
const PAGE_SIZE = 30;

async function loadNotas() {
  page = 1;
  hasMore = true;
  showSkeleton();
  try {
    let url;
    if (currentView === 'trash') {
      url = `/api/notas?eliminadas=true&page=${page}&pageSize=${PAGE_SIZE}`;
    } else {
      url = `/api/notas?archivadas=${currentView === 'archived'}&page=${page}&pageSize=${PAGE_SIZE}`;
    }
    const resp = await api(url);
    notas = resp.items || [];
    hasMore = page < resp.totalPages;
    render();
    observeSentinel();
  } catch (err) {
    if (err.message !== 'Sesión expirada') showToast('Error al cargar notas', 'error');
  }
}

async function loadMore() {
  if (isLoadingMore || !hasMore) return;
  isLoadingMore = true;
  page++;
  try {
    let url;
    if (currentView === 'trash') {
      url = `/api/notas?eliminadas=true&page=${page}&pageSize=${PAGE_SIZE}`;
    } else {
      url = `/api/notas?archivadas=${currentView === 'archived'}&page=${page}&pageSize=${PAGE_SIZE}`;
    }
    const resp = await api(url);
    notas = notas.concat(resp.items || []);
    hasMore = page < resp.totalPages;
    render();
    observeSentinel();
  } catch { page--; }
  finally { isLoadingMore = false; }
}

let sentinelObserver = null;
function observeSentinel() {
  const sentinel = document.getElementById('scroll-sentinel');
  if (!sentinel) return;
  if (sentinelObserver) sentinelObserver.disconnect();
  if (!hasMore) { sentinel.style.display = 'none'; return; }
  sentinel.style.display = '';
  sentinelObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) loadMore();
  }, { rootMargin: '200px' });
  sentinelObserver.observe(sentinel);
}

function getFiltered() {
  const q = searchInput.value.toLowerCase();
  if (!q) return notas;
  return notas.filter(n => {
    const titleMatch = n.titulo && n.titulo.toLowerCase().includes(q);
    const contentMatch = n.contenido && n.contenido.toLowerCase().includes(q);
    const tasksMatch = n.tareas && n.tareas.some(t => t.texto.toLowerCase().includes(q));
    return titleMatch || contentMatch || tasksMatch;
  });
}

function render() { renderNotas(getFiltered()); }

function renderNotas(filtered) {
  const isGrid = !listView;
  notesContainer.className = isGrid ? 'notes-grid' : 'notes-list';
  notesContainer.innerHTML = '';

  if (filtered.length === 0) {
    emptyMsg.classList.remove('hidden');
    const isSearching = searchInput.value.trim().length > 0;
    if (isSearching) { emptyIcon.textContent = '🔍'; emptyText.textContent = 'Sin resultados'; emptySub.textContent = 'Prueba con otro término'; }
    else if (currentView === 'archived') { emptyIcon.textContent = '📦'; emptyText.textContent = 'No hay notas archivadas'; emptySub.textContent = 'Archiva notas para que aparezcan aquí'; }
    else if (currentView === 'trash') { emptyIcon.textContent = '🗑️'; emptyText.textContent = 'No hay notas eliminadas'; emptySub.textContent = 'Las notas eliminadas aparecerán aquí'; }
    else { emptyIcon.textContent = '📝'; emptyText.textContent = 'No hay notas'; emptySub.textContent = 'Presiona + para crear tu primera nota'; }
    return;
  }
  emptyMsg.classList.add('hidden');

  filtered.forEach(n => {
    const card = document.createElement('div');
    card.className = `note-card${n.isPinned ? ' pinned' : ''}${n.archivada ? ' archived' : ''}`;
    card.draggable = currentView === 'notes';

    const content = n.contenido ? escHtml(n.contenido).substring(0, 120) + (n.contenido.length > 120 ? '...' : '') : '';
    const hasReminder = n.recordatorio;
    const createdDate = n.fechaCreacion ? formatDateTime(n.fechaCreacion) : '';
    const modifiedDate = n.fechaModificacion ? formatDateTime(n.fechaModificacion) : '';

    if (isGrid) {
      card.innerHTML = `
        ${n.isPinned ? '<span class="pin-icon"><i class="fas fa-star"></i></span>' : ''}
        ${currentView === 'notes' ? `<button class="card-del" data-id="${n.id}" title="Eliminar"><i class="fas fa-trash-alt"></i></button>` : ''}
        ${currentView === 'trash' ? `<button class="card-restore-btn" data-id="${n.id}" title="Restaurar"><i class="fas fa-undo"></i></button>` : ''}
        ${n.titulo ? `<div class="card-title">${escHtml(n.titulo)}</div>` : ''}
        ${content ? `<div class="card-content">${content}</div>` : ''}
        ${hasReminder ? `<div class="card-reminder"><i class="fas fa-bell"></i> ${formatDate(n.recordatorio)}</div>` : ''}
        <div class="card-tasks">
          ${(n.tareas || []).slice(0, 3).map(t => `
            <div class="ct-item${t.completada ? ' done' : ''}">
              <span class="ct-check">${t.completada ? '✓' : ''}</span>
              ${escHtml(t.texto)}
            </div>
          `).join('')}
          ${n.tareas && n.tareas.length > 3 ? `<div class="ct-item" style="color:var(--text-secondary)">+${n.tareas.length - 3} más</div>` : ''}
        </div>
        <div class="card-date">${createdDate ? `<span><i class="far fa-calendar-alt"></i> ${createdDate}</span>` : ''}${modifiedDate && modifiedDate !== createdDate ? `<span class="card-modified"><i class="far fa-edit"></i> ${modifiedDate}</span>` : ''}</div>
      `;
    } else {
      const tasksPreview = (n.tareas || []).slice(0, 2).map(t =>
        `<span class="ct-item${t.completada ? ' done' : ''}">${escHtml(t.texto)}</span>`
      ).join('');
      card.innerHTML = `
        ${n.isPinned ? '<span class="pin-icon"><i class="fas fa-star"></i></span>' : ''}
        ${currentView === 'notes' ? `<button class="card-del" data-id="${n.id}" title="Eliminar"><i class="fas fa-trash-alt"></i></button>` : ''}
        ${currentView === 'trash' ? `<button class="card-restore-btn" data-id="${n.id}" title="Restaurar"><i class="fas fa-undo"></i></button>` : ''}
        <div class="card-title">${n.titulo ? escHtml(n.titulo) : '<span style="color:var(--text-secondary)">Sin título</span>'}</div>
        ${content ? `<div class="card-content">${content}</div>` : ''}
        ${n.tareas && n.tareas.length > 0 ? `<div class="card-tasks">${tasksPreview}</div>` : ''}
        <div class="card-meta">
          ${hasReminder ? `<div class="card-reminder"><i class="fas fa-bell"></i> ${formatDate(n.recordatorio)}</div>` : ''}
          <span class="card-date">${createdDate || ''}</span>
        </div>
      `;
    }

    card.querySelector('.card-del')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!await showConfirmModal()) return;
      const notaId = n.id;
      const notaTitulo = n.titulo;
      card.style.opacity = '0.3';
      try {
        await api(`/api/notas/${notaId}`, { method: 'DELETE' });
        loadNotas();
        showUndoToast('Nota eliminada', 'Deshacer', async () => {
          try {
            await api(`/api/notas/${notaId}/restore-deleted`, { method: 'PUT' });
            loadNotas();
            showToast('Nota restaurada', 'success');
          } catch { showToast('Error al restaurar', 'error'); }
        });
      }
      catch (err) { showToast('Error al eliminar', 'error'); card.style.opacity = ''; }
    });

    card.querySelector('.card-restore-btn')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      try { await api(`/api/notas/${n.id}/restore-deleted`, { method: 'PUT' }); loadNotas(); showToast('Nota restaurada', 'success'); }
      catch (err) { showToast('Error al restaurar', 'error'); }
    });

    card.addEventListener('dragstart', (e) => {
      if (currentView !== 'notes') return;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', n.id);
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
    card.addEventListener('dragover', (e) => { if (currentView === 'notes') { e.preventDefault(); card.classList.add('drag-over'); } });
    card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
    card.addEventListener('drop', async (e) => {
      if (currentView !== 'notes') return;
      e.preventDefault();
      card.classList.remove('drag-over');
      const draggedId = parseInt(e.dataTransfer.getData('text/plain'));
      if (draggedId === n.id) return;
      await reorderNotas(draggedId, n.id);
    });

    card.addEventListener('click', () => openViewModal(n));
    notesContainer.appendChild(card);
  });
}

async function reorderNotas(draggedId, targetId) {
  const draggedIdx = notas.findIndex(x => x.id === draggedId);
  const targetIdx = notas.findIndex(x => x.id === targetId);
  if (draggedIdx === -1 || targetIdx === -1) return;
  const [removed] = notas.splice(draggedIdx, 1);
  notas.splice(targetIdx, 0, removed);
  render();
  try {
    for (let i = 0; i < notas.length; i++) {
      await api(`/api/notas/${notas[i].id}/reorder`, { method: 'PUT', body: JSON.stringify({ orden: i }) });
    }
  } catch (err) { showToast('Error al reordenar', 'error'); loadNotas(); }
}

function formatDate(d) {
  if (!d) return '';
  const date = new Date(d);
  const opts = { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' };
  if (date.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
  return date.toLocaleDateString('es', opts);
}

function formatDateTime(d) {
  if (!d) return '';
  const date = new Date(d);
  const now = new Date();
  const diff = now - date;
  if (diff < 60000) return 'Justo ahora';
  if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
  if (diff < 86400000 && date.getDate() === now.getDate()) return `Hoy ${date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`;
  if (diff < 172800000 && date.getDate() === now.getDate() - 1) return `Ayer ${date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`;
  const opts = { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' };
  if (date.getFullYear() !== now.getFullYear()) opts.year = 'numeric';
  return date.toLocaleDateString('es', opts);
}

function escHtml(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

// ── Modal ──────────────────────────────────────────────────────────────

function setModalMode(mode) {
  modalMode = mode;
  modal.className = 'modal';
  modal.classList.add(mode);
  if (mode === 'creating') {
    setTimeout(() => modalTitle.focus(), 300);
    fabBtn?.classList.add('open');
  }
}

function openViewModal(nota) {
  currentNota = nota;
  modalTitle.value = nota.titulo || '';
  modalContent.value = nota.contenido || '';

  const created = nota.fechaCreacion ? formatDateTime(nota.fechaCreacion) : '';
  const modified = nota.fechaModificacion ? formatDateTime(nota.fechaModificacion) : '';
  modalDates.innerHTML = created ? `<span><i class="far fa-calendar-alt"></i> Creado ${created}</span><span><i class="far fa-edit"></i> Modificado ${modified}</span>` : '';

  modalReminderRow.classList.add('hidden');
  modalDotsMenu.classList.add('hidden');
  dotsEdit?.classList.toggle('hidden', currentView !== 'notes');
  dotsDelete?.classList.toggle('hidden', currentView !== 'notes');
  dotsArchive?.classList.toggle('hidden', currentView !== 'notes');
  dotsRestore?.classList.toggle('hidden', currentView === 'notes');

  setModalMode('viewing');
  renderModalTasks();

  updateReminderBtn(nota.recordatorio);
}

function openEditModal() {
  if (!currentNota || currentView !== 'notes') return;
  modalDotsMenu.classList.add('hidden');
  setModalMode('editing');
  renderModalTasks();

  updateReminderBtn(currentNota.recordatorio);
  if (currentNota.recordatorio) {
    modalReminderRow.classList.remove('hidden');
    setReminderValue(currentNota.recordatorio);
  }
}

function openCreateModal() {
  currentNota = null;
  modalTitle.value = '';
  modalContent.value = '';
  modalTasks.innerHTML = '';
  modalTaskInput.value = '';
  modalReminderRow.classList.add('hidden');
  modalReminder.value = '';
  modalDates.innerHTML = '';
  modalDotsMenu.classList.add('hidden');

  setModalMode('creating');
}

function closeModal() {
  modal.classList.add('hidden');
  modalDotsMenu.classList.add('hidden');
  currentNota = null;
  modalMode = '';
  fabBtn?.classList.remove('open');
  modalReminderRow.classList.add('hidden');
}

modalClose?.addEventListener('click', closeModal);
document.querySelector('.modal-backdrop')?.addEventListener('click', closeModal);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

fabBtn?.addEventListener('click', openCreateModal);

// 3-dot menu
modalDots?.addEventListener('click', (e) => {
  e.stopPropagation();
  modalDotsMenu.classList.toggle('hidden');
});
document.addEventListener('click', () => modalDotsMenu?.classList.add('hidden'), { capture: true });

dotsEdit?.addEventListener('click', openEditModal);
dotsDelete?.addEventListener('click', async () => {
  if (!currentNota || !await showConfirmModal()) return;
  const notaId = currentNota.id;
  closeModal();
  try {
    await api(`/api/notas/${notaId}`, { method: 'DELETE' });
    loadNotas();
    showUndoToast('Nota eliminada', 'Deshacer', async () => {
      try {
        await api(`/api/notas/${notaId}/restore-deleted`, { method: 'PUT' });
        loadNotas();
        showToast('Nota restaurada', 'success');
      } catch { showToast('Error al restaurar', 'error'); }
    });
  }
  catch (err) { showToast('Error al eliminar', 'error'); }
});
dotsArchive?.addEventListener('click', async () => {
  if (!currentNota) return;
  const notaId = currentNota.id;
  closeModal();
  try {
    await api(`/api/notas/${notaId}/archive`, { method: 'PUT' });
    loadNotas();
    showUndoToast('Nota archivada', 'Deshacer', async () => {
      try {
        await api(`/api/notas/${notaId}/restore`, { method: 'PUT' });
        loadNotas();
        showToast('Nota restaurada', 'success');
      } catch { showToast('Error al restaurar', 'error'); }
    });
  }
  catch (err) { showToast('Error al archivar', 'error'); }
});
dotsRestore?.addEventListener('click', async () => {
  if (!currentNota) return;
  const endpoint = currentView === 'trash' ? 'restore-deleted' : 'restore';
  try { await api(`/api/notas/${currentNota.id}/${endpoint}`, { method: 'PUT' }); closeModal(); loadNotas(); showToast('Nota restaurada', 'success'); }
  catch (err) { showToast('Error al restaurar', 'error'); }
});

// Reminder
modalReminderBtn?.addEventListener('click', () => {
  if (modalMode === 'viewing') return;
  modalReminderRow.classList.toggle('hidden');
  if (!modalReminderRow.classList.contains('hidden') && !modalReminder.value) {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 60 - now.getMinutes() % 60, 0, 0);
    modalReminder.value = now.toISOString().slice(0, 16);
  }
});

modalReminder?.addEventListener('change', async () => {
  if (!currentNota || modalMode === 'creating') return;
  const val = modalReminder.value;
  const reminderDate = val ? new Date(val).toISOString() : null;
  try {
    currentNota.recordatorio = reminderDate;
    await api(`/api/notas/${currentNota.id}`, { method: 'PUT', body: JSON.stringify(currentNota) });
    updateReminderBtn(!!reminderDate);
    loadNotas();
    showToast(val ? 'Recordatorio guardado' : 'Recordatorio eliminado', 'success');
  } catch (err) { showToast('Error al guardar recordatorio', 'error'); }
});

modalReminderClear?.addEventListener('click', () => {
  modalReminder.value = '';
  modalReminderRow.classList.add('hidden');
  modalReminder.dispatchEvent(new Event('change'));
});

function updateReminderBtn(val) {
  const icon = modalReminderBtn?.querySelector('i');
  if (val) {
    icon.className = 'fas fa-bell';
    modalReminderBtn.style.color = 'var(--primary)';
  } else {
    icon.className = 'fas fa-bell';
    modalReminderBtn.style.color = '';
  }
}

function setReminderValue(d) {
  const date = new Date(d);
  const pad = n => String(n).padStart(2, '0');
  modalReminder.value = `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// ── Tasks ──────────────────────────────────────────────────────────────

function renderModalTasks() {
  if (!currentNota || modalMode === 'creating') return;
  const tasks = currentNota.tareas || [];
  modalTasks.innerHTML = tasks.length === 0
    ? '<div style="color:var(--text-secondary);font-size:13px;padding:8px;text-align:center">Sin tareas</div>'
    : tasks.map(t => `
      <div class="m-task${t.completada ? ' done' : ''}" data-id="${t.id}">
        <span class="m-check"></span>
        <span class="m-text${t.completada ? ' done-text' : ''}">${escHtml(t.texto)}</span>
        <button class="m-del" data-id="${t.id}"><i class="fas fa-times"></i></button>
      </div>
    `).join('');

  modalTasks.querySelectorAll('.m-check').forEach((el, i) => {
    el.addEventListener('click', () => toggleTask(tasks[i]));
  });
  modalTasks.querySelectorAll('.m-del').forEach(el => {
    el.addEventListener('click', (e) => { e.stopPropagation(); deleteTask(parseInt(el.dataset.id)); });
  });
  if (modalMode === 'editing') {
    modalTasks.querySelectorAll('.m-text').forEach((el, i) => {
      el.addEventListener('dblclick', () => startInlineEdit(el, tasks[i]));
    });
  }
}

async function toggleTask(task) {
  if (modalMode === 'viewing') return;
  try {
    await api(`/api/notas/${currentNota.id}/tareas/${task.id}/toggle`, { method: 'PUT' });
    task.completada = !task.completada;
    renderModalTasks();
    loadNotas();
  } catch (err) { showToast('Error al actualizar tarea', 'error'); }
}

async function deleteTask(id) {
  if (modalMode === 'viewing') return;
  try {
    await api(`/api/notas/${currentNota.id}/tareas/${id}`, { method: 'DELETE' });
    currentNota.tareas = currentNota.tareas.filter(t => t.id !== id);
    renderModalTasks();
    loadNotas();
  } catch (err) { showToast('Error al eliminar tarea', 'error'); }
}

function startInlineEdit(el, task) {
  if (modalMode === 'viewing') return;
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
      if (modalMode === 'editing' && currentNota && task.id) {
        try {
          await api(`/api/notas/${currentNota.id}/tareas/${task.id}`, { method: 'PUT', body: JSON.stringify(task) });
          loadNotas();
        } catch (err) { showToast('Error al editar tarea', 'error'); }
      }
    } else if (!newText) {
      el.textContent = orig;
    }
    renderModalTasks();
  };
  el.addEventListener('blur', () => finish(), { once: true });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); finish(); }
    if (e.key === 'Escape') { el.textContent = orig; el.contentEditable = 'false'; renderModalTasks(); }
  });
}

// Task input in modal
modalTaskInput.addEventListener('keypress', (e) => {
  if (e.key !== 'Enter') return;
  const texto = modalTaskInput.value.trim();
  if (!texto) return;

  if (modalMode === 'creating') {
    modalTaskInput.value = '';
    const emptyMsg = modalTasks.querySelector('div[style]');
    if (emptyMsg) modalTasks.innerHTML = '';
    const div = document.createElement('div');
    div.className = 'm-task';
    const textSpan = document.createElement('span');
    textSpan.className = 'm-text';
    textSpan.textContent = texto;
    const check = document.createElement('span');
    check.className = 'm-check';
    const del = document.createElement('button');
    del.className = 'm-del';
    del.innerHTML = '<i class="fas fa-times"></i>';
    del.addEventListener('click', (e) => { e.stopPropagation(); div.remove(); });
    textSpan.addEventListener('dblclick', () => startInlineEdit(textSpan, { texto }));
    div.append(check, textSpan, del);
    modalTasks.appendChild(div);
    modalTaskInput.focus();
    return;
  }

  if (!currentNota || modalMode === 'viewing') return;
  modalTaskInput.value = '';
  (async () => {
    try {
      const tarea = await api(`/api/notas/${currentNota.id}/tareas`, { method: 'POST', body: JSON.stringify({ texto }) });
      currentNota.tareas.push(tarea);
      renderModalTasks();
      loadNotas();
      showToast('Tarea añadida', 'success');
    } catch (err) { showToast('Error al añadir tarea', 'error'); }
  })();
});

// ── Edit mode auto-save ────────────────────────────────────────────────

let saveTimeout;
modalTitle.addEventListener('input', () => { if (modalMode === 'editing') scheduleSave(); });
modalContent.addEventListener('input', () => { if (modalMode === 'editing') scheduleSave(); });

function scheduleSave() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveEditChanges, 600);
}

modalSaveBtn?.addEventListener('click', saveEditChanges);

async function saveEditChanges() {
  if (!currentNota || modalMode !== 'editing') return;
  try {
    currentNota.titulo = modalTitle.value.trim() || null;
    currentNota.contenido = modalContent.value.trim() || null;
    await api(`/api/notas/${currentNota.id}`, { method: 'PUT', body: JSON.stringify(currentNota) });
    loadNotas();
    showToast('Guardado', 'success');
  } catch (err) { showToast('Error al guardar', 'error'); }
}

// ── Create note ─────────────────────────────────────────────────────────

modalCreateBtn?.addEventListener('click', createNoteFromModal);

async function createNoteFromModal() {
  const titulo = modalTitle.value.trim();
  const contenido = modalContent.value.trim() || null;
  if (!titulo && !contenido) { showToast('Escribe un título o contenido', 'error'); return; }
  setLoading(modalCreateBtn, true);
  try {
    const nota = await api('/api/notas', {
      method: 'POST',
      body: JSON.stringify({ titulo: titulo || null, contenido })
    });
    const items = modalTasks.querySelectorAll('.m-task .m-text');
    for (const el of items) {
      const text = el.textContent.trim();
      if (text) {
        await api(`/api/notas/${nota.id}/tareas`, { method: 'POST', body: JSON.stringify({ texto: text }) });
      }
    }
    closeModal();
    showToast('Nota creada', 'success');
    loadNotas();
  } catch (err) {
    showToast(err.message || 'Error al crear nota', 'error');
  } finally { setLoading(modalCreateBtn, false); }
}

// ── Export ───────────────────────────────────────────────────────────────

const exportBtn = $('export-btn');
exportBtn?.addEventListener('click', () => showExportMenu());

function showExportMenu() {
  const existing = document.querySelector('.export-menu');
  if (existing) existing.remove();
  const menu = document.createElement('div');
  menu.className = 'export-menu';
  menu.innerHTML = `
    <button class="export-option" data-format="json"><i class="fas fa-file-code"></i> Exportar como JSON</button>
    <button class="export-option" data-format="markdown"><i class="fas fa-file-alt"></i> Exportar como Markdown</button>
  `;
  exportBtn.parentElement.appendChild(menu);
  menu.querySelectorAll('.export-option').forEach(btn => {
    btn.addEventListener('click', async () => {
      menu.remove();
      const format = btn.dataset.format;
      await exportNotas(format);
    });
  });
  const closeMenu = (e) => { if (!menu.contains(e.target) && e.target !== exportBtn) menu.remove(); document.removeEventListener('click', closeMenu); };
  setTimeout(() => document.addEventListener('click', closeMenu), 0);
}

async function exportNotas(format) {
  try {
    const res = await api('/api/notas?todas=true');
    const data = await res.json();
    const items = data.items || data;
    let content, filename, mime;
    if (format === 'json') {
      content = JSON.stringify(items, null, 2);
      filename = `notas-${new Date().toISOString().slice(0,10)}.json`;
      mime = 'application/json';
    } else {
      content = items.map(n => {
        let md = `# ${n.titulo || 'Sin título'}\n\n`;
        md += `${n.contenido || ''}\n\n`;
        if (n.tareas && n.tareas.length) {
          md += `## Checklist\n`;
          n.tareas.forEach(t => md += `- [${t.completada ? 'x' : ' '}] ${t.descripcion}\n`);
          md += '\n';
        }
        if (n.recordatorio) md += `> Recordatorio: ${new Date(n.recordatorio).toLocaleString()}\n\n`;
        md += `---\n*Creado: ${new Date(n.fechaCreacion).toLocaleString()} | Modificado: ${new Date(n.fechaModificacion).toLocaleString()}*\n\n`;
        return md;
      }).join('\n');
      filename = `notas-${new Date().toISOString().slice(0,10)}.md`;
      mime = 'text/markdown';
    }
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Notas exportadas como ${format.toUpperCase()}`, 'success');
  } catch (err) {
    showToast('Error al exportar notas', 'error');
  }
}

// ── Onboarding ───────────────────────────────────────────────────────────

function showOnboarding() {
  if (localStorage.getItem('onboardingDone')) return;
  const overlay = document.createElement('div');
  overlay.className = 'onboarding-overlay';
  overlay.innerHTML = `
    <div class="onboarding-card" role="dialog" aria-label="Tutorial">
      <button class="onboarding-close" aria-label="Cerrar tutorial">&times;</button>
      <div class="onboarding-steps">
        <div class="onboarding-step active">
          <div class="onboarding-icon">📝</div>
          <h2>Bienvenido a TaskFlow</h2>
          <p>Toma notas rápidas con checklist y recordatorios. Todo sincronizado en la nube.</p>
        </div>
        <div class="onboarding-step">
          <div class="onboarding-icon">📋</div>
          <h2>Checklist inteligente</h2>
          <p>Añade tareas a tus notas, márcalas como completadas y edítalas con doble clic.</p>
        </div>
        <div class="onboarding-step">
          <div class="onboarding-icon">🔔</div>
          <h2>Recordatorios</h2>
          <p>Establece recordatorios en cualquier nota para no olvidar lo importante.</p>
        </div>
        <div class="onboarding-step">
          <div class="onboarding-icon">🗑️</div>
          <h2>Papelera y archivado</h2>
          <p>Archiva notas para organizarte. Las notas eliminadas van a la papelera por si necesitas recuperarlas.</p>
        </div>
      </div>
      <div class="onboarding-dots"></div>
      <div class="onboarding-nav">
        <button class="onboarding-prev hidden" aria-label="Anterior">Anterior</button>
        <button class="onboarding-next" aria-label="Siguiente">Siguiente</button>
        <button class="onboarding-finish hidden" aria-label="Comenzar">¡Comenzar!</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const steps = overlay.querySelectorAll('.onboarding-step');
  const dots = overlay.querySelector('.onboarding-dots');
  const prevBtn = overlay.querySelector('.onboarding-prev');
  const nextBtn = overlay.querySelector('.onboarding-next');
  const finishBtn = overlay.querySelector('.onboarding-finish');
  const closeBtn = overlay.querySelector('.onboarding-close');
  let currentStep = 0;

  steps.forEach((_, i) => {
    const dot = document.createElement('span');
    dot.className = 'onboarding-dot' + (i === 0 ? ' active' : '');
    dots.appendChild(dot);
  });

  function updateStep() {
    steps.forEach((s, i) => s.classList.toggle('active', i === currentStep));
    dots.querySelectorAll('.onboarding-dot').forEach((d, i) => d.classList.toggle('active', i === currentStep));
    prevBtn.classList.toggle('hidden', currentStep === 0);
    nextBtn.classList.toggle('hidden', currentStep === steps.length - 1);
    finishBtn.classList.toggle('hidden', currentStep !== steps.length - 1);
  }

  nextBtn.addEventListener('click', () => { if (currentStep < steps.length - 1) { currentStep++; updateStep(); } });
  prevBtn.addEventListener('click', () => { if (currentStep > 0) { currentStep--; updateStep(); } });
  function dismiss() { overlay.remove(); localStorage.setItem('onboardingDone', 'true'); }
  finishBtn.addEventListener('click', dismiss);
  closeBtn.addEventListener('click', dismiss);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) dismiss(); });
}

// ── Service Worker (PWA) ────────────────────────────────────────────────

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => reg.unregister());
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('SW registered:', reg.scope);
    }).catch(err => {
      console.warn('SW registration failed:', err);
    });
  });
}

// ── Search ──────────────────────────────────────────────────────────────

let searchTimeout;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(render, 200);
});

// ── Init ────────────────────────────────────────────────────────────────
// loaded at top of script

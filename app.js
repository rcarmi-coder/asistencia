/**
 * =========================================================================
 * ASISTENCIA DEPORTIVA - LOGICA DE LA APP CLIENTE (PWA)
 * =========================================================================
 */

// Datos de demostración iniciales (si no hay Google Sheets configurado)
const DEMO_PARTICIPANTS = [
  { id: 1, name: "Alejandro Silva", bestLevel: 6, currentLevel: null, present: false },
  { id: 2, name: "Camila Castro", bestLevel: 9, currentLevel: null, present: false },
  { id: 3, name: "Diego Morales", bestLevel: 4, currentLevel: null, present: false },
  { id: 4, name: "Fernanda Ortiz", bestLevel: 11, currentLevel: null, present: false },
  { id: 5, name: "Ignacio Soto", bestLevel: 3, currentLevel: null, present: false },
  { id: 6, name: "Lucía Carrasco", bestLevel: 7, currentLevel: null, present: false },
  { id: 7, name: "Mateo González", bestLevel: null, currentLevel: null, present: false },
  { id: 8, name: "Valentina Rojas", bestLevel: 8, currentLevel: null, present: false }
];

// =========================================================================
// URL PREDETERMINADA DE GOOGLE APPS SCRIPT
// =========================================================================
// Si deseas dejar la app 100% preconfigurada en GitHub, puedes pegar tu URL que termina en /exec aquí:
const DEFAULT_GAS_URL = "";

/**
 * Obtiene la URL de Apps Script analizando parámetros de URL (?api=...),
 * memoria local del teléfono (localStorage) o la URL por defecto.
 */
function getInitialGasUrl() {
  // 1. Detectar si el enlace compartido trae el parámetro ?api=... o ?gas=...
  try {
    const params = new URLSearchParams(window.location.search);
    const paramUrl = params.get('api') || params.get('gas');
    if (paramUrl) {
      const clean = paramUrl.trim().replace(/^["']|["']$/g, '');
      if (clean.startsWith('https://script.google.com/macros/s/')) {
        localStorage.setItem('asistencia_gas_url', clean);
        // Limpiar la URL de la barra del navegador para que quede prolija
        try {
          const cleanPath = window.location.pathname + window.location.hash;
          window.history.replaceState({}, document.title, cleanPath);
        } catch (e) {}
        return clean;
      }
    }
  } catch (e) {}

  // 2. Si ya estaba guardada en este teléfono
  const saved = localStorage.getItem('asistencia_gas_url');
  if (saved && saved.trim()) return saved.trim();

  // 3. Usar constante predeterminada si existe
  return DEFAULT_GAS_URL;
}

// Estado global de la aplicación
const AppState = {
  date: getTodayDateString(),
  gasUrl: getInitialGasUrl(),
  participants: [],
  searchQuery: '',
  sortMode: localStorage.getItem('asistencia_sort_mode') || 'sheet',
  isReordering: false,
  isOnline: navigator.onLine,
  isSaving: false
};

// Elementos DOM
const DOM = {
  datePicker: document.getElementById('date-picker'),
  dateLabel: document.getElementById('date-label'),
  btnPrevDay: document.getElementById('btn-prev-day'),
  btnNextDay: document.getElementById('btn-next-day'),
  syncStatus: document.getElementById('sync-status'),
  bannerNotice: document.getElementById('banner-notice'),
  btnBannerAction: document.getElementById('btn-banner-action'),
  searchInput: document.getElementById('search-input'),
  btnClearSearch: document.getElementById('btn-clear-search'),
  sortSelect: document.getElementById('sort-select'),
  btnToggleReorder: document.getElementById('btn-toggle-reorder'),
  presentCount: document.getElementById('present-count'),
  totalCount: document.getElementById('total-count'),
  btnToggleAll: document.getElementById('btn-toggle-all'),
  participantsList: document.getElementById('participants-list'),
  emptyState: document.getElementById('empty-state'),
  btnAddStudent: document.getElementById('btn-add-student'),
  btnSaveAll: document.getElementById('btn-save-all'),
  saveBtnText: document.getElementById('save-btn-text'),
  saveIcon: document.getElementById('save-icon'),
  // Compartir e Instalar
  btnShareApp: document.getElementById('btn-share-app'),
  installBanner: document.getElementById('install-banner'),
  btnInstallApp: document.getElementById('btn-install-app'),
  btnDismissInstall: document.getElementById('btn-dismiss-install'),
  modalShare: document.getElementById('modal-share'),
  btnCloseShare: document.getElementById('btn-close-share'),
  btnCloseShareBottom: document.getElementById('btn-close-share-bottom'),
  btnShareWhatsapp: document.getElementById('btn-share-whatsapp'),
  btnCopyShareLink: document.getElementById('btn-copy-share-link'),
  copyBtnLabel: document.getElementById('copy-btn-label'),
  shareLinkInput: document.getElementById('share-link-input'),
  modalIosInstall: document.getElementById('modal-ios-install'),
  btnCloseIosInstall: document.getElementById('btn-close-ios-install'),
  btnDismissIosModal: document.getElementById('btn-dismiss-ios-modal'),
  // Modal Nuevo Participante
  modalNewStudent: document.getElementById('modal-new-student'),
  formNewStudent: document.getElementById('form-new-student'),
  studentNameInput: document.getElementById('student-name'),
  btnCloseNewStudent: document.getElementById('btn-close-new-student'),
  btnCancelNewStudent: document.getElementById('btn-cancel-new-student'),
  // Modal Configuración
  modalSettings: document.getElementById('modal-settings'),
  btnOpenSettings: document.getElementById('btn-open-settings'),
  btnCloseSettings: document.getElementById('btn-close-settings'),
  btnCancelSettings: document.getElementById('btn-cancel-settings'),
  btnSaveSettings: document.getElementById('btn-save-settings'),
  appsScriptUrlInput: document.getElementById('apps-script-url'),
  btnTestConnection: document.getElementById('btn-test-connection'),
  testResult: document.getElementById('test-result'),
  btnResetDemo: document.getElementById('btn-reset-demo'),
  // Toast
  toast: document.getElementById('toast')
};

// =========================================================================
// INICIALIZACIÓN
// =========================================================================
// Control de versiones para forzar actualización de archivos en el navegador
const APP_VERSION = '2.3';

document.addEventListener('DOMContentLoaded', async () => {
  // Si la versión guardada es diferente o no existe, limpiar caché de la PWA
  if (localStorage.getItem('app_installed_version') !== APP_VERSION) {
    localStorage.setItem('app_installed_version', APP_VERSION);
    if ('caches' in window) {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
        console.log('Cachés anteriores purgadas exitosamente.');
      } catch (e) {}
    }
  }

  initDatePicker();
  initEventListeners();
  loadData();
  registerServiceWorker();
  updateOnlineStatus();
  initInstallPrompt();
});

function initDatePicker() {
  DOM.datePicker.value = AppState.date;
  updateDateLabel();
}

function updateDateLabel() {
  const [y, m, d] = AppState.date.split('-').map(Number);
  const selected = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const diffTime = selected.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    DOM.dateLabel.textContent = "Hoy";
  } else if (diffDays === -1) {
    DOM.dateLabel.textContent = "Ayer";
  } else if (diffDays === 1) {
    DOM.dateLabel.textContent = "Mañana";
  } else {
    // Formato legible: Ej: "10 sep."
    const options = { weekday: 'short', day: 'numeric', month: 'short' };
    DOM.dateLabel.textContent = selected.toLocaleDateString('es-ES', options);
  }
}

function initEventListeners() {
  // Cambio de fecha
  DOM.datePicker.addEventListener('change', (e) => {
    AppState.date = e.target.value;
    updateDateLabel();
    loadData();
  });

  DOM.btnPrevDay.addEventListener('click', () => changeDayOffset(-1));
  DOM.btnNextDay.addEventListener('click', () => changeDayOffset(1));

  // Búsqueda
  DOM.searchInput.addEventListener('input', (e) => {
    AppState.searchQuery = e.target.value.trim().toLowerCase();
    DOM.btnClearSearch.style.display = AppState.searchQuery ? 'block' : 'none';
    renderParticipants();
  });

  DOM.btnClearSearch.addEventListener('click', () => {
    DOM.searchInput.value = '';
    AppState.searchQuery = '';
    DOM.btnClearSearch.style.display = 'none';
    renderParticipants();
  });

  // Marcar / Desmarcar todos
  DOM.btnToggleAll.addEventListener('click', toggleAllAttendance);

  // Ordenamiento
  if (DOM.sortSelect) {
    DOM.sortSelect.value = AppState.sortMode;
    DOM.sortSelect.addEventListener('change', (e) => {
      AppState.sortMode = e.target.value;
      localStorage.setItem('asistencia_sort_mode', AppState.sortMode);
      renderParticipants();
    });
  }

  if (DOM.btnToggleReorder) {
    DOM.btnToggleReorder.addEventListener('click', () => {
      AppState.isReordering = !AppState.isReordering;
      document.body.classList.toggle('is-reordering', AppState.isReordering);
      DOM.btnToggleReorder.classList.toggle('active', AppState.isReordering);
      DOM.btnToggleReorder.textContent = AppState.isReordering ? '✓ Listo' : '⇅ Organizar';
      if (AppState.isReordering) {
        AppState.sortMode = 'custom';
        if (DOM.sortSelect) DOM.sortSelect.value = 'custom';
        localStorage.setItem('asistencia_sort_mode', 'custom');
        showToast('Toca ▲ o ▼ para mover participantes a tu gusto', 'success');
      }
      renderParticipants();
    });
  }

  // Guardar asistencia
  DOM.btnSaveAll.addEventListener('click', saveAttendance);

  // Modales
  DOM.btnAddStudent.addEventListener('click', () => openModal(DOM.modalNewStudent));
  DOM.btnCloseNewStudent.addEventListener('click', () => closeModal(DOM.modalNewStudent));
  DOM.btnCancelNewStudent.addEventListener('click', () => closeModal(DOM.modalNewStudent));
  DOM.formNewStudent.addEventListener('submit', handleNewStudentSubmit);

  DOM.btnOpenSettings.addEventListener('click', openSettingsModal);
  DOM.btnBannerAction.addEventListener('click', openSettingsModal);
  DOM.btnCloseSettings.addEventListener('click', () => closeModal(DOM.modalSettings));
  DOM.btnCancelSettings.addEventListener('click', () => closeModal(DOM.modalSettings));
  DOM.btnSaveSettings.addEventListener('click', saveSettings);
  DOM.btnTestConnection.addEventListener('click', testConnection);
  DOM.btnResetDemo.addEventListener('click', resetToDemo);

  // Compartir App
  if (DOM.btnShareApp) {
    DOM.btnShareApp.addEventListener('click', openShareModal);
  }
  if (DOM.btnCloseShare) {
    DOM.btnCloseShare.addEventListener('click', () => closeModal(DOM.modalShare));
  }
  if (DOM.btnCloseShareBottom) {
    DOM.btnCloseShareBottom.addEventListener('click', () => closeModal(DOM.modalShare));
  }
  if (DOM.btnShareWhatsapp) {
    DOM.btnShareWhatsapp.addEventListener('click', shareViaWhatsapp);
  }
  if (DOM.btnCopyShareLink) {
    DOM.btnCopyShareLink.addEventListener('click', copyShareLink);
  }

  // Instalación Móvil (PWA)
  if (DOM.btnInstallApp) {
    DOM.btnInstallApp.addEventListener('click', handleInstallClick);
  }
  if (DOM.btnDismissInstall) {
    DOM.btnDismissInstall.addEventListener('click', () => {
      if (DOM.installBanner) DOM.installBanner.style.display = 'none';
      localStorage.setItem('install_dismissed', 'true');
    });
  }
  if (DOM.btnCloseIosInstall) {
    DOM.btnCloseIosInstall.addEventListener('click', () => closeModal(DOM.modalIosInstall));
  }
  if (DOM.btnDismissIosModal) {
    DOM.btnDismissIosModal.addEventListener('click', () => closeModal(DOM.modalIosInstall));
  }

  // Eventos de conexión
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
}

function changeDayOffset(offset) {
  const [y, m, d] = AppState.date.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + offset);
  
  AppState.date = formatDate(date);
  DOM.datePicker.value = AppState.date;
  updateDateLabel();
  loadData();
}

// =========================================================================
// CARGA Y PERSISTENCIA DE DATOS
// =========================================================================
async function loadData() {
  updateSyncBadge();

  // 1. Si no hay URL configurada, usar modo Demo local
  if (!AppState.gasUrl) {
    loadLocalData();
    DOM.bannerNotice.style.display = 'flex';
    return;
  }

  DOM.bannerNotice.style.display = 'none';
  setSyncStatus('Cargando...', 'status-pending');

  try {
    // Petición a Google Apps Script
    const url = `${AppState.gasUrl}?date=${encodeURIComponent(AppState.date)}`;
    const res = await fetch(url, { method: 'GET' });
    
    if (!res.ok) throw new Error('Error al conectar con Google Sheets');
    
    const data = await res.json();
    if (data.success && Array.isArray(data.participants)) {
      AppState.participants = data.participants.map((p, idx) => ({
        ...p,
        orderIndex: p.orderIndex !== undefined ? p.orderIndex : idx
      }));
      // Guardar copia local en caché
      saveLocalCache(AppState.date, AppState.participants);
      renderParticipants();
      setSyncStatus('Sincronizado', 'status-synced');
    } else {
      throw new Error(data.error || 'Respuesta inválida de Google Sheets');
    }
  } catch (error) {
    console.warn('Fallo al cargar de Sheets, cargando caché local:', error);
    loadLocalData();
    setSyncStatus('Modo Offline', 'status-demo');
    showToast('Sin conexión a Sheets. Usando datos locales.', 'error');
  }
}

function loadLocalData() {
  const cacheKey = `asistencia_${AppState.date}`;
  const cached = localStorage.getItem(cacheKey);
  
  if (cached) {
    try {
      AppState.participants = JSON.parse(cached);
    } catch (e) {
      AppState.participants = loadBaseParticipants();
    }
  } else {
    AppState.participants = loadBaseParticipants();
  }
  
  renderParticipants();
}

function loadBaseParticipants() {
  const savedBase = localStorage.getItem('asistencia_base_participants');
  if (savedBase) {
    try {
      const list = JSON.parse(savedBase);
      return list.map(p => ({ ...p, present: false, currentLevel: null }));
    } catch (e) {}
  }
  return JSON.parse(JSON.stringify(DEMO_PARTICIPANTS));
}

function saveLocalCache(dateStr, participants) {
  localStorage.setItem(`asistencia_${dateStr}`, JSON.stringify(participants));
  
  // Actualizar lista base de nombres y mejores niveles
  const base = participants.map(p => ({
    id: p.id,
    name: p.name,
    bestLevel: p.bestLevel
  }));
  localStorage.setItem('asistencia_base_participants', JSON.stringify(base));
}

// =========================================================================
// GESTIÓN DE ORDENAMIENTO DE PARTICIPANTES
// =========================================================================
function getCustomOrder() {
  try {
    const raw = localStorage.getItem('asistencia_custom_order');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveCustomOrder(namesList) {
  localStorage.setItem('asistencia_custom_order', JSON.stringify(namesList));
}

function sortParticipantsList(list) {
  const mode = AppState.sortMode; // 'sheet', 'custom', 'alpha', 'level-desc', 'present-first'
  const copy = [...list];

  if (mode === 'alpha') {
    return copy.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  }
  
  if (mode === 'level-desc') {
    return copy.sort((a, b) => (b.bestLevel || 0) - (a.bestLevel || 0));
  }
  
  if (mode === 'present-first') {
    return copy.sort((a, b) => (b.present ? 1 : 0) - (a.present ? 1 : 0));
  }
  
  if (mode === 'custom') {
    const customOrder = getCustomOrder();
    if (customOrder.length > 0) {
      return copy.sort((a, b) => {
        const idxA = customOrder.indexOf(a.name.trim().toLowerCase());
        const idxB = customOrder.indexOf(b.name.trim().toLowerCase());
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return (a.orderIndex ?? a.id ?? 0) - (b.orderIndex ?? b.id ?? 0);
      });
    }
  }

  // 'sheet' por defecto: Conserva el orden original de las filas de Google Sheets
  return copy.sort((a, b) => (a.orderIndex ?? a.id ?? 0) - (b.orderIndex ?? b.id ?? 0));
}

function moveParticipant(participant, direction) {
  // Activar modo personalizado
  AppState.sortMode = 'custom';
  if (DOM.sortSelect) DOM.sortSelect.value = 'custom';
  localStorage.setItem('asistencia_sort_mode', 'custom');

  // Obtener la lista ordenada actualmente
  const sorted = sortParticipantsList(AppState.participants);
  const index = sorted.findIndex(p => p.name.trim().toLowerCase() === participant.name.trim().toLowerCase());
  if (index === -1) return;

  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= sorted.length) return;

  // Intercambiar
  const temp = sorted[index];
  sorted[index] = sorted[targetIndex];
  sorted[targetIndex] = temp;

  // Guardar en custom order
  saveCustomOrder(sorted.map(p => p.name.trim().toLowerCase()));

  // Re-renderizar
  renderParticipants();
}

// =========================================================================
// RENDERIZADO DE PARTICIPANTES
// =========================================================================
function renderParticipants() {
  const sorted = sortParticipantsList(AppState.participants);

  const filtered = sorted.filter(p => 
    p.name.toLowerCase().includes(AppState.searchQuery)
  );

  DOM.participantsList.innerHTML = '';

  if (filtered.length === 0) {
    DOM.emptyState.style.display = 'block';
  } else {
    DOM.emptyState.style.display = 'none';
    filtered.forEach((participant, idx) => {
      const card = createParticipantCard(participant, idx, filtered.length);
      DOM.participantsList.appendChild(card);
    });
  }

  updateStats();
}

function createParticipantCard(p, index, total) {
  const card = document.createElement('div');
  card.className = `participant-card ${p.present ? 'is-present' : ''}`;
  card.dataset.id = p.id || p.name;

  // 0. Botones de Reordenar (▲ y ▼)
  const reorderActions = document.createElement('div');
  reorderActions.className = 'reorder-actions';

  const btnUp = document.createElement('button');
  btnUp.className = 'btn-move btn-move-up';
  btnUp.type = 'button';
  btnUp.setAttribute('aria-label', `Subir ${p.name}`);
  btnUp.textContent = '▲';
  btnUp.disabled = (index === 0);
  btnUp.addEventListener('click', (e) => {
    e.stopPropagation();
    moveParticipant(p, -1);
  });

  const btnDown = document.createElement('button');
  btnDown.className = 'btn-move btn-move-down';
  btnDown.type = 'button';
  btnDown.setAttribute('aria-label', `Bajar ${p.name}`);
  btnDown.textContent = '▼';
  btnDown.disabled = (index === total - 1);
  btnDown.addEventListener('click', (e) => {
    e.stopPropagation();
    moveParticipant(p, 1);
  });

  reorderActions.appendChild(btnUp);
  reorderActions.appendChild(btnDown);

  // 1. Checkbox táctil a la izquierda
  const checkTarget = document.createElement('div');
  checkTarget.className = 'check-target';
  checkTarget.setAttribute('aria-label', `Marcar asistencia de ${p.name}`);
  checkTarget.innerHTML = `
    <div class="custom-check">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#ffffff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
  `;
  checkTarget.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleParticipantPresent(p);
  });

  // 2. Información central (Nombre y Mejor Nivel)
  const info = document.createElement('div');
  info.className = 'participant-info';
  
  const bestLevelText = p.bestLevel !== null ? `Mejor nivel: ${p.bestLevel}` : 'Sin nivel previo';
  const hasLevelClass = p.bestLevel !== null ? 'has-level' : '';
  
  info.innerHTML = `
    <div class="participant-name">${escapeHtml(p.name)}</div>
    <div class="participant-meta">
      <span class="badge-level ${hasLevelClass}">${bestLevelText}</span>
    </div>
  `;
  info.addEventListener('click', () => {
    toggleParticipantPresent(p);
  });

  // 3. Menú desplegable de Nivel (1 al 12) a la derecha
  const levelContainer = document.createElement('div');
  levelContainer.className = 'level-picker-container';
  
  const selectWrapper = document.createElement('div');
  selectWrapper.className = 'level-select-wrapper';

  const select = document.createElement('select');
  select.className = `level-select ${p.currentLevel !== null ? 'explicit-level' : ''}`;
  select.setAttribute('aria-label', `Nivel para ${p.name}`);

  // Opción por defecto: Mantener mejor nivel previo
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  if (p.bestLevel !== null) {
    defaultOption.textContent = `Mantener (${p.bestLevel})`;
  } else {
    defaultOption.textContent = `Nivel...`;
  }
  select.appendChild(defaultOption);

  // Opciones del 1 al 12
  for (let i = 1; i <= 12; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `Nivel ${i}`;
    if (p.currentLevel === i) {
      opt.selected = true;
    }
    select.appendChild(opt);
  }

  // Deshabilitar select si está ausente
  select.disabled = !p.present;

  select.addEventListener('change', (e) => {
    e.stopPropagation();
    const val = e.target.value;
    if (val === '') {
      p.currentLevel = null;
      select.classList.remove('explicit-level');
    } else {
      p.currentLevel = parseInt(val, 10);
      select.classList.add('explicit-level');
      // Si cambia el nivel, asegurarse de que esté marcado como presente
      if (!p.present) {
        p.present = true;
        card.classList.add('is-present');
        select.disabled = false;
        updateStats();
      }
    }
  });

  // Flecha personalizada (añadida como elemento DOM para no alterar los listeners del select)
  selectWrapper.appendChild(select);
  const arrowSpan = document.createElement('span');
  arrowSpan.className = 'level-select-arrow';
  arrowSpan.innerHTML = `
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  `;
  selectWrapper.appendChild(arrowSpan);

  const levelLabel = document.createElement('span');
  levelLabel.className = 'level-label';
  levelLabel.textContent = 'NIVEL HOY';
  levelContainer.appendChild(levelLabel);
  levelContainer.appendChild(selectWrapper);

  card.appendChild(reorderActions);
  card.appendChild(checkTarget);
  card.appendChild(info);
  card.appendChild(levelContainer);

  return card;
}

function toggleParticipantPresent(p) {
  p.present = !p.present;
  
  // Buscar tarjeta en el DOM
  const cards = DOM.participantsList.children;
  for (let card of cards) {
    if (card.dataset.id === String(p.id || p.name)) {
      if (p.present) {
        card.classList.add('is-present');
        const sel = card.querySelector('.level-select');
        if (sel) sel.disabled = false;
      } else {
        card.classList.remove('is-present');
        const sel = card.querySelector('.level-select');
        if (sel) sel.disabled = true;
      }
      break;
    }
  }

  updateStats();
}

function updateStats() {
  const total = AppState.participants.length;
  const present = AppState.participants.filter(p => p.present).length;

  DOM.totalCount.textContent = total;
  DOM.presentCount.textContent = present;

  if (present === total && total > 0) {
    DOM.btnToggleAll.textContent = 'Desmarcar todos';
  } else {
    DOM.btnToggleAll.textContent = 'Marcar todos';
  }
}

function toggleAllAttendance() {
  const shouldPresent = AppState.participants.some(p => !p.present);
  
  AppState.participants.forEach(p => {
    p.present = shouldPresent;
  });

  renderParticipants();
}

// =========================================================================
// AGREGAR NUEVO PARTICIPANTE
// =========================================================================
async function handleNewStudentSubmit(e) {
  e.preventDefault();
  const name = DOM.studentNameInput.value.trim();
  
  if (!name) return;

  // Comprobar si ya existe
  const exists = AppState.participants.some(
    p => p.name.toLowerCase() === name.toLowerCase()
  );
  if (exists) {
    showToast(`"${name}" ya está en la lista`, 'error');
    return;
  }

  // Deshabilitar botón mientras guarda
  const submitBtn = document.getElementById('btn-submit-student');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Agregando...';

  try {
    if (AppState.gasUrl) {
      // Enviar a Google Apps Script
      // Usamos text/plain para evitar preflight CORS OPTIONS que Apps Script no admite
      const payload = {
        action: 'add_student',
        name: name
      };

      const res = await fetch(AppState.gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'No se pudo agregar el participante en Google Sheets');
      }
    }

    // Agregar a la lista local
    const newStudent = {
      id: Date.now(),
      name: name,
      bestLevel: null,
      currentLevel: null,
      present: true // Marcar presente el primer día por conveniencia
    };

    AppState.participants.push(newStudent);
    AppState.participants.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
    
    saveLocalCache(AppState.date, AppState.participants);
    renderParticipants();
    
    closeModal(DOM.modalNewStudent);
    DOM.studentNameInput.value = '';
    showToast(`"${name}" agregado exitosamente`, 'success');

  } catch (error) {
    console.error('Error al agregar participante:', error);
    showToast(error.message || 'Error al conectar con Google Sheets', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Agregar';
  }
}

// =========================================================================
// GUARDAR ASISTENCIA (SINCRONIZACIÓN)
// =========================================================================
async function saveAttendance() {
  if (AppState.isSaving) return;
  AppState.isSaving = true;

  DOM.btnSaveAll.disabled = true;
  DOM.saveBtnText.textContent = 'Sincronizando...';
  DOM.saveIcon.classList.add('spin');

  // Guardar siempre primero en local
  saveLocalCache(AppState.date, AppState.participants);

  if (!AppState.gasUrl) {
    // Modo Demo
    setTimeout(() => {
      AppState.isSaving = false;
      DOM.btnSaveAll.disabled = false;
      DOM.saveBtnText.textContent = 'Guardar Asistencia';
      DOM.saveIcon.classList.remove('spin');
      showToast('Guardado localmente (Modo Demo)', 'success');
    }, 400);
    return;
  }

  // Preparar payload para Google Apps Script
  const records = AppState.participants.map(p => ({
    name: p.name,
    present: p.present,
    level: p.currentLevel,
    bestLevel: p.bestLevel
  }));

  const payload = {
    action: 'save_attendance',
    date: AppState.date,
    records: records
  };

  try {
    const res = await fetch(AppState.gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      // Actualizar los mejores niveles locales si algún nivel nuevo fue superior
      AppState.participants.forEach(p => {
        if (p.present && p.currentLevel !== null) {
          if (p.bestLevel === null || p.currentLevel > p.bestLevel) {
            p.bestLevel = p.currentLevel;
          }
        }
      });
      saveLocalCache(AppState.date, AppState.participants);
      renderParticipants();

      setSyncStatus('Sincronizado', 'status-synced');
      showToast(`Asistencia de ${AppState.date} guardada en Google Sheets`, 'success');
    } else {
      throw new Error(data.error || 'Error reportado por Google Apps Script');
    }
  } catch (error) {
    console.error('Error al guardar asistencia en Sheets:', error);
    setSyncStatus('Offline / Pendiente', 'status-demo');
    showToast('No se pudo sincronizar. Quedó guardado en tu teléfono.', 'error');
  } finally {
    AppState.isSaving = false;
    DOM.btnSaveAll.disabled = false;
    DOM.saveBtnText.textContent = 'Guardar Asistencia';
    DOM.saveIcon.classList.remove('spin');
  }
}

// =========================================================================
// CONFIGURACIÓN DE GOOGLE SHEETS
// =========================================================================
function openSettingsModal() {
  DOM.appsScriptUrlInput.value = AppState.gasUrl;
  DOM.testResult.textContent = '';
  DOM.testResult.className = 'test-result';
  openModal(DOM.modalSettings);
}

function cleanGasUrl(raw) {
  if (!raw) return '';
  return raw.trim().replace(/^["']|["']$/g, '');
}

function validateGasUrl(url) {
  if (!url) return { valid: false, message: 'Ingresa una URL primero' };
  if (url.includes('/edit')) {
    return { valid: false, message: 'Copia la URL de "Implementar" > "Nueva implementación", no la del editor (/edit).' };
  }
  if (url.includes('/dev')) {
    return { valid: false, message: 'Esta es la URL de prueba (/dev). Usa la URL de la implementación que termina en /exec' };
  }
  if (!url.startsWith('https://script.google.com/macros/s/')) {
    return { valid: false, message: 'La URL debe comenzar con https://script.google.com/macros/s/' };
  }
  if (!url.endsWith('/exec')) {
    return { valid: false, message: 'La URL de la aplicación web debe terminar en /exec' };
  }
  return { valid: true };
}

function saveSettings() {
  const url = cleanGasUrl(DOM.appsScriptUrlInput.value);
  DOM.appsScriptUrlInput.value = url;

  if (url) {
    const validation = validateGasUrl(url);
    if (!validation.valid) {
      DOM.testResult.textContent = validation.message;
      DOM.testResult.className = 'test-result error';
      showToast(validation.message, 'error');
      return;
    }
  }

  AppState.gasUrl = url;
  localStorage.setItem('asistencia_gas_url', url);
  closeModal(DOM.modalSettings);
  updateSyncBadge();
  loadData();
  showToast(url ? 'Conexión guardada y sincronizando...' : 'Modo Demo activado', 'success');
}

async function testConnection() {
  const url = cleanGasUrl(DOM.appsScriptUrlInput.value);
  DOM.appsScriptUrlInput.value = url;

  const validation = validateGasUrl(url);
  if (!validation.valid) {
    DOM.testResult.textContent = validation.message;
    DOM.testResult.className = 'test-result error';
    return;
  }

  DOM.testResult.textContent = 'Probando conexión...';
  DOM.testResult.className = 'test-result';

  try {
    const res = await fetch(`${url}?date=${encodeURIComponent(AppState.date)}`, { method: 'GET' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    
    if (data && data.success) {
      const count = data.participants ? data.participants.length : 0;
      DOM.testResult.textContent = `✓ Conexión exitosa (${count} alumnos en planilla)`;
      DOM.testResult.className = 'test-result success';
    } else {
      DOM.testResult.textContent = '✗ Error: ' + (data.error || 'Respuesta inválida');
      DOM.testResult.className = 'test-result error';
    }
  } catch (error) {
    console.error('Error al probar conexión:', error);
    if (window.location.protocol === 'file:') {
      DOM.testResult.textContent = '✗ Estás en file://. Abre la app con http://localhost:8080 o súbela a GitHub Pages.';
    } else {
      DOM.testResult.textContent = '✗ No se pudo conectar. Verifica en Apps Script: "Quién tiene acceso: Cualquiera".';
    }
    DOM.testResult.className = 'test-result error';
  }
}

function resetToDemo() {
  if (confirm('¿Restablecer datos de prueba? Esto reiniciará la lista local a la demo.')) {
    localStorage.removeItem('asistencia_gas_url');
    localStorage.removeItem('asistencia_base_participants');
    AppState.gasUrl = '';
    AppState.participants = JSON.parse(JSON.stringify(DEMO_PARTICIPANTS));
    DOM.appsScriptUrlInput.value = '';
    closeModal(DOM.modalSettings);
    updateSyncBadge();
    renderParticipants();
    showToast('Restablecido a Modo Demo', 'success');
  }
}

function updateSyncBadge() {
  if (!AppState.gasUrl) {
    setSyncStatus('Modo Demo', 'status-demo');
  } else {
    setSyncStatus('Conectado', 'status-synced');
  }
}

function setSyncStatus(text, className) {
  DOM.syncStatus.textContent = text;
  DOM.syncStatus.className = `status-pill ${className}`;
}

function updateOnlineStatus() {
  AppState.isOnline = navigator.onLine;
  if (!AppState.isOnline) {
    setSyncStatus('Sin Internet', 'status-demo');
  } else {
    updateSyncBadge();
  }
}

// =========================================================================
// GESTIÓN DE MODALES Y TOASTS
// =========================================================================
function openModal(modal) {
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
  modal.style.display = 'none';
  document.body.style.overflow = '';
}

let toastTimeout = null;
function showToast(message, type = 'success') {
  clearTimeout(toastTimeout);
  DOM.toast.textContent = message;
  DOM.toast.className = `toast show ${type}`;
  toastTimeout = setTimeout(() => {
    DOM.toast.className = 'toast';
  }, 3200);
}

// =========================================================================
// HELPERS
// =========================================================================
function getTodayDateString() {
  return formatDate(new Date());
}

function formatDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// =========================================================================
// COMPARTIR APP E INSTALACIÓN PWA
// =========================================================================
let deferredInstallPrompt = null;

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function getShareUrl() {
  const base = window.location.origin + window.location.pathname;
  const gas = AppState.gasUrl || DEFAULT_GAS_URL;
  if (gas && gas.startsWith('https://script.google.com/macros/s/')) {
    return `${base}?api=${encodeURIComponent(gas)}`;
  }
  return base;
}

function openShareModal() {
  const shareUrl = getShareUrl();
  if (DOM.shareLinkInput) DOM.shareLinkInput.value = shareUrl;
  if (DOM.copyBtnLabel) DOM.copyBtnLabel.textContent = 'Copiar enlace listo';
  openModal(DOM.modalShare);
}

function shareViaWhatsapp() {
  const shareUrl = getShareUrl();
  const text = `¡Hola! Aquí tienes la app para tomar la asistencia de Tarucas: ${shareUrl}\n\n(Al abrirla en tu teléfono ya viene conectada a la planilla y puedes agregarla a tu pantalla de inicio como app).`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  window.open(whatsappUrl, '_blank');
}

async function copyShareLink() {
  const shareUrl = getShareUrl();
  try {
    await navigator.clipboard.writeText(shareUrl);
    if (DOM.copyBtnLabel) DOM.copyBtnLabel.textContent = '✓ ¡Enlace copiado!';
    showToast('Enlace listo copiado al portapapeles', 'success');
    setTimeout(() => {
      if (DOM.copyBtnLabel) DOM.copyBtnLabel.textContent = 'Copiar enlace listo';
    }, 2500);
  } catch (err) {
    if (DOM.shareLinkInput) {
      DOM.shareLinkInput.select();
      document.execCommand('copy');
      showToast('Enlace copiado', 'success');
    }
  }
}

function handleInstallClick() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        if (DOM.installBanner) DOM.installBanner.style.display = 'none';
      }
      deferredInstallPrompt = null;
    });
  } else if (isIos()) {
    openModal(DOM.modalIosInstall);
  } else {
    showToast('En el menú del navegador toca "Instalar aplicación" o "Agregar a pantalla principal"', 'success');
  }
}

function initInstallPrompt() {
  // Capturar evento de instalación nativa en Android/Chrome
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (!isStandalone() && localStorage.getItem('install_dismissed') !== 'true') {
      if (DOM.installBanner) DOM.installBanner.style.display = 'flex';
    }
  });

  // Si es iPhone y no es standalone, mostrar banner de instalación si no fue descartado
  if (!isStandalone() && localStorage.getItem('install_dismissed') !== 'true') {
    if (isIos() && DOM.installBanner) {
      DOM.installBanner.style.display = 'flex';
    }
  }
}

// =========================================================================
// SERVICE WORKER PARA PWA
// =========================================================================
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js?v=2.4')
        .then(reg => {
          reg.update();
          console.log('Service Worker registrado con éxito:', reg.scope);
        })
        .catch(err => console.warn('Fallo al registrar Service Worker:', err));
    });
  }
}

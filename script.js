/* =========================================================
   Projeto Spider - app pessoal de evolucao fisica
   Persistencia: Google Apps Script + fallback offline em localStorage
   ========================================================= */

const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbwlCmNouFIy1GJeyZycaqIGM6HvKMc3QAPWC1CTbtyTc2EPQ36QDBDEFdAd_31RpzLKnw/exec';

const STORAGE_KEYS = {
  session: 'spider_session',
  users: 'spider_users',
  theme: 'spider_theme',
  snapshot: 'spider_data',
  pendingSync: 'spider_pending_sync',
  apiUrl: 'spider_api_url',
  aguaMeta: 'spider_agua_meta',
  pesoMeta: 'spider_peso_meta',
  xpTreino: 'spider_xp_treino',
  xpCorrida: 'spider_xp_corrida',
  xpNutricao: 'spider_xp_nutricao',
  xpAgua: 'spider_xp_agua',
  xpPeso: 'spider_xp_peso',
  xpStreak: 'spider_xp_streak',
};

const LS_KEYS = {
  treinos: 'spider_treinos',
  corridas: 'spider_corridas',
  peso: 'spider_peso',
  medidas: 'spider_medidas',
  nutricao: 'spider_nutricao',
  agua: 'spider_agua',
  scoreHistory: 'spider_score_history',
  missions: 'spider_missions',
};

const CATEGORIES = ['treinos', 'corridas', 'peso', 'medidas', 'nutricao', 'agua'];

const SHEETS = {
  treinos: 'Treinos',
  corridas: 'Corridas',
  peso: 'Peso',
  medidas: 'Medidas',
  nutricao: 'Nutrição',
  agua: 'Água',
};

const LEGACY_SHEETS = {
  nutricao: 'NutriÃ§Ã£o',
  agua: 'Ãgua',
};

const CONFIG = {
  apiUrl: localStorage.getItem(STORAGE_KEYS.apiUrl) || DEFAULT_API_URL,
  aguaMeta: readStoredNumber(STORAGE_KEYS.aguaMeta, 2500),
  pesoMeta: readStoredNumber(STORAGE_KEYS.pesoMeta, 0),
  xp: {
    treino: readStoredNumber(STORAGE_KEYS.xpTreino, 100),
    corrida: readStoredNumber(STORAGE_KEYS.xpCorrida, 120),
    nutricao: readStoredNumber(STORAGE_KEYS.xpNutricao, 20),
    agua: readStoredNumber(STORAGE_KEYS.xpAgua, 10),
    peso: readStoredNumber(STORAGE_KEYS.xpPeso, 15),
    streak: readStoredNumber(STORAGE_KEYS.xpStreak, 50),
  },
};

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  treinos: 'Treinos',
  corridas: 'Corridas',
  peso: 'Peso',
  medidas: 'Medidas',
  nutricao: 'Nutrição',
  agua: 'Água',
  missoes: 'Missões',
  timeline: 'Linha do Tempo',
  exportar: 'Exportar',
  configuracoes: 'Configurações',
};

const PAGE_EYEBROWS = {
  dashboard: 'Visão geral',
  treinos: 'Registros',
  corridas: 'Registros',
  peso: 'Registros',
  medidas: 'Registros',
  nutricao: 'Registros',
  agua: 'Hidratação',
  missoes: 'Conquistas',
  timeline: 'Histórico',
  exportar: 'Dados',
  configuracoes: 'Sistema',
};

const MISSIONS = [
  { key: 'treino', icon: 'icon-treino', title: 'Registrar treino', xp: 100, description: 'Treino salvo hoje' },
  { key: 'corrida', icon: 'icon-corrida', title: 'Registrar corrida', xp: 120, description: 'Corrida salva hoje' },
  { key: 'nutricao', icon: 'icon-nutricao', title: 'Registrar alimentação', xp: 20, description: 'Refeição salva hoje' },
  { key: 'agua', icon: 'icon-agua', title: 'Bater meta de água', xp: 10, description: 'Meta de hidratação do dia' },
  { key: 'peso', icon: 'icon-peso', title: 'Registrar peso', xp: 15, description: 'Peso salvo hoje' },
  { key: 'streak', icon: 'icon-timeline', title: 'Sequência mantida', xp: 50, description: 'Registros em dias consecutivos' },
  { key: 'medidas', icon: 'icon-medidas', title: 'Registrar medidas', xp: 30, description: 'Medida salva nos últimos 7 dias' },
];

const MEASURE_FIELDS = [
  ['leftArmCm', 'Braço esquerdo'],
  ['rightArmCm', 'Braço direito'],
  ['chestCm', 'Peitoral'],
  ['waistCm', 'Cintura'],
  ['hipCm', 'Quadril'],
  ['thighCm', 'Coxa'],
  ['calfCm', 'Panturrilha'],
  ['neckCm', 'Pescoço'],
  ['forearmCm', 'Antebraço'],
];

let state = {
  user: null,
  currentPage: 'dashboard',
  treinos: [],
  corridas: [],
  peso: [],
  medidas: [],
  nutricao: [],
  agua: [],
  scoreHistory: [],
  missions: [],
  pendingSync: [],
  xpTotal: 0,
  lastRefresh: null,
  charts: {
    score: null,
    peso: null,
  },
};

const $ = (id) => document.getElementById(id);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function readStoredNumber(key, fallback) {
  const value = Number(localStorage.getItem(key));
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function safeParseJSON(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function uid(prefix = 'id') {
  if (window.crypto?.randomUUID) return `${prefix}_${window.crypto.randomUUID()}`;
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function nowIso() {
  return new Date().toISOString();
}

function toNumber(value, fallback = 0) {
  const numeric = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeDate(value) {
  if (!value) return todayStr();
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? todayStr() : parsed.toISOString().slice(0, 10);
}

function formatDatePt(dateStr) {
  if (!dateStr) return '-';
  const [year, month, day] = String(dateStr).slice(0, 10).split('-');
  if (!year || !month || !day) return String(dateStr);
  const date = new Date(`${year}-${month}-${day}T00:00:00`);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatDatePt(value);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function daysAgoISO(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function weekStart(dateStr = todayStr()) {
  const date = new Date(`${dateStr}T00:00:00`);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  return date.toISOString().slice(0, 10);
}

function getInitials(value) {
  const parts = String(value || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'SP';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function setText(id, value) {
  const element = $(id);
  if (element) element.textContent = value;
}

function setInputValue(id, value) {
  const element = $(id);
  if (element) element.value = value;
}

function showToast(message, type = 'success') {
  const region = $('toastRegion');
  if (!region) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  region.appendChild(toast);

  window.setTimeout(() => {
    toast.classList.add('leaving');
    window.setTimeout(() => toast.remove(), 260);
  }, 2600);
}

function setLoading(isLoading) {
  const loading = $('loadingState');
  if (loading) loading.style.display = isLoading ? 'flex' : 'none';
}

function ensureDefaultUsers() {
  const storedUsers = safeParseJSON(localStorage.getItem(STORAGE_KEYS.users), []);
  if (Array.isArray(storedUsers) && storedUsers.length) return storedUsers;

  const defaultUsers = [{ username: 'admin', password: '123456', name: 'Administrador', role: 'admin' }];
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(defaultUsers));
  return defaultUsers;
}

function getStoredSession() {
  return safeParseJSON(localStorage.getItem(STORAGE_KEYS.session), null);
}

function setStoredSession(user) {
  localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(user));
}

function clearStoredSession() {
  localStorage.removeItem(STORAGE_KEYS.session);
}

function hasApi() {
  try {
    const url = new URL(CONFIG.apiUrl);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

async function apiGet(action) {
  const url = new URL(CONFIG.apiUrl);
  url.searchParams.set('action', action);

  const response = await fetch(url.toString(), {
    method: 'GET',
    redirect: 'follow',
  });

  return parseApiResponse(response);
}

async function apiPost(action, payload = {}) {
  const url = new URL(CONFIG.apiUrl);
  url.searchParams.set('action', action);

  const response = await fetch(url.toString(), {
    method: 'POST',
    redirect: 'follow',
    body: JSON.stringify({ action, ...payload }),
  });

  return parseApiResponse(response);
}

async function parseApiResponse(response) {
  const raw = await response.text();

  if (!response.ok) {
    throw new Error(raw || `Falha na requisição (${response.status})`);
  }

  let parsed;
  try {
    parsed = raw ? JSON.parse(raw) : {};
  } catch {
    const cleaned = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    throw new Error(cleaned || 'Resposta inválida do Apps Script.');
  }

  if (parsed && parsed.ok === false) {
    throw new Error(parsed.error || 'Falha ao comunicar com a planilha.');
  }

  return Object.prototype.hasOwnProperty.call(parsed, 'data') ? parsed.data : parsed;
}

async function authenticateUser(username, password) {
  const cleanUsername = String(username || '').trim();
  const cleanPassword = String(password || '');

  const localUser = ensureDefaultUsers().find(
    (user) => user.username.toLowerCase() === cleanUsername.toLowerCase() && user.password === cleanPassword,
  );

  if (localUser) {
    return {
      username: localUser.username,
      name: localUser.name || localUser.username,
      initials: getInitials(localUser.name || localUser.username),
      role: localUser.role || 'user',
    };
  }

  if (!hasApi()) return null;

  try {
    const data = await apiPost('login', { username: cleanUsername, password: cleanPassword });
    const user = data?.user;
    if (!user) return null;

    return {
      username: user.username || cleanUsername,
      name: user.name || user.username || cleanUsername,
      initials: getInitials(user.name || user.username || cleanUsername),
      role: user.role || 'user',
    };
  } catch (error) {
    console.warn('Falha no login via Apps Script:', error);
    return null;
  }
}

function normalizeRecords(category, records) {
  if (!Array.isArray(records)) return [];
  return records.map((record) => normalizeRecord(category, record)).sort(sortByDateDesc);
}

function normalizeRecord(category, record) {
  const normalizers = {
    treinos: normalizeWorkout,
    corridas: normalizeRun,
    peso: normalizeWeight,
    medidas: normalizeMeasurement,
    nutricao: normalizeNutrition,
    agua: normalizeWater,
  };

  return normalizers[category](record || {});
}

function normalizeBase(record, prefix) {
  const now = nowIso();
  return {
    id: String(record.id || uid(prefix)),
    date: normalizeDate(record.date || record.data),
    createdAt: record.createdAt || now,
    updatedAt: now,
  };
}

function normalizeWorkout(record) {
  const base = normalizeBase(record, 'treino');
  return {
    ...base,
    type: String(record.type || record.tipo || 'Outro').trim() || 'Outro',
    durationMinutes: toNumber(record.durationMinutes ?? record.duracao, 0),
    exercises: Array.isArray(record.exercises)
      ? record.exercises.map(normalizeExercise)
      : parseExerciseText(record.exercises || record.exercicios || ''),
    notes: String(record.notes || record.observacoes || ''),
    status: record.status || 'Concluído',
  };
}

function normalizeExercise(exercise) {
  return {
    id: String(exercise.id || uid('exercicio')),
    name: String(exercise.name || exercise.nome || '').trim(),
    sets: toNumber(exercise.sets ?? exercise.series, 0),
    reps: toNumber(exercise.reps ?? exercise.repeticoes, 0),
    loadKg: toNumber(exercise.loadKg ?? exercise.carga, 0),
    durationSeconds: toNumber(exercise.durationSeconds ?? exercise.duracaoSegundos, 0),
    notes: String(exercise.notes || exercise.observacoes || ''),
  };
}

function parseExerciseText(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [namePart, setsPart = '', loadPart = ''] = line.split('|').map((part) => part.trim());
      const match = setsPart.match(/(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)/i);
      const durationMatch = setsPart.match(/(\d+)\s*s(?:eg)?/i);
      const loadMatch = loadPart.match(/(\d+(?:[.,]\d+)?)/);

      return normalizeExercise({
        name: namePart || line,
        sets: match ? match[1] : 1,
        reps: match ? match[2] : 0,
        loadKg: loadMatch ? loadMatch[1] : 0,
        durationSeconds: durationMatch ? durationMatch[1] : 0,
        notes: [setsPart && !match ? setsPart : '', loadPart && !loadMatch ? loadPart : ''].filter(Boolean).join(' · '),
      });
    });
}

function normalizeRun(record) {
  const base = normalizeBase(record, 'corrida');
  const durationMinutes = toNumber(record.durationMinutes ?? record.duracao, parseDurationToMinutes(record.tempo));
  const distanceKm = toNumber(record.distanceKm ?? record.distancia, 0);

  return {
    ...base,
    distanceKm,
    durationMinutes,
    pace: String(record.pace || calculatePace(distanceKm, durationMinutes) || ''),
    elevationM: toNumber(record.elevationM ?? record.elevacao, 0),
    location: String(record.location || record.local || ''),
    temperatureC: toNumber(record.temperatureC ?? record.temperatura, 0),
    feeling: String(record.feeling || record.sensacao || ''),
    notes: String(record.notes || record.observacoes || ''),
    stravaUrl: String(record.stravaUrl || record.linkStrava || ''),
  };
}

function normalizeWeight(record) {
  return {
    ...normalizeBase(record, 'peso'),
    weightKg: toNumber(record.weightKg ?? record.peso, 0),
    notes: String(record.notes || record.observacoes || ''),
  };
}

function normalizeMeasurement(record) {
  return {
    ...normalizeBase(record, 'medida'),
    leftArmCm: toNumber(record.leftArmCm ?? record.bracoEsq, 0),
    rightArmCm: toNumber(record.rightArmCm ?? record.bracoDir, 0),
    chestCm: toNumber(record.chestCm ?? record.peitoral, 0),
    waistCm: toNumber(record.waistCm ?? record.cintura, 0),
    hipCm: toNumber(record.hipCm ?? record.quadril, 0),
    thighCm: toNumber(record.thighCm ?? record.coxa, 0),
    calfCm: toNumber(record.calfCm ?? record.panturrilha, 0),
    neckCm: toNumber(record.neckCm ?? record.pescoco, 0),
    forearmCm: toNumber(record.forearmCm ?? record.antebraco, 0),
    notes: String(record.notes || record.observacoes || ''),
  };
}

function normalizeNutrition(record) {
  return {
    ...normalizeBase(record, 'refeicao'),
    time: String(record.time || record.horario || record.hora || ''),
    type: String(record.type || record.tipo || 'Outro'),
    foods: Array.isArray(record.foods)
      ? record.foods.map(normalizeFood)
      : parseFoodText(record.foods || record.alimentos || ''),
    notes: String(record.notes || record.observacoes || ''),
  };
}

function normalizeFood(food) {
  return {
    id: String(food.id || uid('alimento')),
    name: String(food.name || food.nome || '').trim(),
    quantity: toNumber(food.quantity ?? food.quantidade, 1),
    unit: String(food.unit || food.unidade || 'porção'),
  };
}

function parseFoodText(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d+(?:[.,]\d+)?)\s*([a-zA-ZÀ-ÿ]+)?\s+(.+)$/);
      if (!match) return normalizeFood({ name: line, quantity: 1, unit: 'porção' });
      return normalizeFood({ quantity: match[1], unit: match[2] || 'un', name: match[3] });
    });
}

function normalizeWater(record) {
  return {
    ...normalizeBase(record, 'agua'),
    amountMl: toNumber(record.amountMl ?? record.quantidade ?? record.ml, 0),
    notes: String(record.notes || record.observacoes || ''),
  };
}

function sortByDateDesc(a, b) {
  return String(b.date || b.createdAt || '').localeCompare(String(a.date || a.createdAt || ''));
}

function upsertLocal(category, record) {
  const normalized = normalizeRecord(category, record);
  const list = state[category].filter((item) => item.id !== normalized.id);
  state[category] = [normalized, ...list].sort(sortByDateDesc);
  persistAll();
  return normalized;
}

function removeLocal(category, id) {
  state[category] = state[category].filter((item) => item.id !== id);
  persistAll();
}

function loadLocalState() {
  const snapshot = safeParseJSON(localStorage.getItem(STORAGE_KEYS.snapshot), {});

  CATEGORIES.forEach((category) => {
    const stored = safeParseJSON(localStorage.getItem(LS_KEYS[category]), null);
    const legacyKey = category === 'nutricao' ? 'refeicoes' : category;
    const source = Array.isArray(stored) ? stored : snapshot?.[category] || snapshot?.[legacyKey] || [];
    state[category] = normalizeRecords(category, source);
  });

  state.scoreHistory = normalizeScoreHistory(
    safeParseJSON(localStorage.getItem(LS_KEYS.scoreHistory), snapshot?.scoreHistory || []),
  );
  state.missions = safeParseJSON(localStorage.getItem(LS_KEYS.missions), []);
  state.pendingSync = safeParseJSON(localStorage.getItem(STORAGE_KEYS.pendingSync), []);
  state.xpTotal = calculateXpTotal();
}

function persistAll() {
  CATEGORIES.forEach((category) => {
    localStorage.setItem(LS_KEYS[category], JSON.stringify(state[category]));
  });

  localStorage.setItem(LS_KEYS.scoreHistory, JSON.stringify(state.scoreHistory));
  localStorage.setItem(LS_KEYS.missions, JSON.stringify(state.missions));
  localStorage.setItem(STORAGE_KEYS.pendingSync, JSON.stringify(state.pendingSync));
  localStorage.setItem(
    STORAGE_KEYS.snapshot,
    JSON.stringify({
      treinos: state.treinos,
      corridas: state.corridas,
      peso: state.peso,
      medidas: state.medidas,
      nutricao: state.nutricao,
      agua: state.agua,
      scoreHistory: state.scoreHistory,
      updatedAt: nowIso(),
    }),
  );
}

function normalizeScoreHistory(entries) {
  if (!Array.isArray(entries)) return [];
  return entries
    .map((entry) => ({
      date: normalizeDate(entry.date || entry.data),
      score: Math.max(0, Math.min(100, Math.round(toNumber(entry.score, 0)))),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30);
}

async function fetchRemoteData() {
  try {
    return await apiGet('bootstrap');
  } catch (bootstrapError) {
    try {
      return await apiGet('getAll');
    } catch {
      throw bootstrapError;
    }
  }
}

function applyRemoteData(remoteData) {
  if (!remoteData || typeof remoteData !== 'object') return;

  const map = {
    treinos: remoteData.treinos || remoteData.workouts,
    corridas: remoteData.corridas || remoteData.runs,
    peso: remoteData.peso || remoteData.weight,
    medidas: remoteData.medidas || remoteData.measurements,
    nutricao: remoteData.nutricao || remoteData.nutrition,
    agua: remoteData.agua || remoteData.water,
  };

  CATEGORIES.forEach((category) => {
    if (Array.isArray(map[category])) state[category] = normalizeRecords(category, map[category]);
  });

  if (Array.isArray(remoteData.scoreHistory)) {
    state.scoreHistory = normalizeScoreHistory(remoteData.scoreHistory);
  }

  applyRemoteSettings(remoteData.settings);
  state.lastRefresh = remoteData.lastSyncedAt ? new Date(remoteData.lastSyncedAt) : new Date();
  state.xpTotal = calculateXpTotal();
  persistAll();
}

function applyRemoteSettings(settings) {
  if (!settings || hasLocalSettings()) return;

  CONFIG.aguaMeta = toNumber(settings.dailyWaterGoalMl, CONFIG.aguaMeta);
  CONFIG.pesoMeta = toNumber(settings.targetWeightKg, CONFIG.pesoMeta);
  CONFIG.xp.treino = toNumber(settings.xpWorkout, CONFIG.xp.treino);
  CONFIG.xp.corrida = toNumber(settings.xpRun, CONFIG.xp.corrida);
  CONFIG.xp.nutricao = toNumber(settings.xpNutrition, CONFIG.xp.nutricao);
  CONFIG.xp.agua = toNumber(settings.xpWater, CONFIG.xp.agua);
  CONFIG.xp.peso = toNumber(settings.xpWeight, CONFIG.xp.peso);
  CONFIG.xp.streak = toNumber(settings.xpStreak, CONFIG.xp.streak);
  persistSettingsLocal();
}

function hasLocalSettings() {
  return [
    STORAGE_KEYS.aguaMeta,
    STORAGE_KEYS.pesoMeta,
    STORAGE_KEYS.xpTreino,
    STORAGE_KEYS.xpCorrida,
    STORAGE_KEYS.xpNutricao,
    STORAGE_KEYS.xpAgua,
    STORAGE_KEYS.xpPeso,
    STORAGE_KEYS.xpStreak,
  ].some((key) => localStorage.getItem(key) !== null);
}

async function loadAll({ silent = false } = {}) {
  setLoading(true);
  loadLocalState();
  ensureMissions();
  renderAll();

  if (!hasApi()) {
    setLoading(false);
    if (!silent) showToast('Usando somente salvamento local. Configure a URL do Apps Script para sincronizar.', 'warning');
    return;
  }

  try {
    const remoteData = await fetchRemoteData();
    applyRemoteData(remoteData);
    await flushPendingSync();
    state.lastRefresh = new Date();
    ensureMissions();
    recordScoreHistory();
    persistAll();
    renderAll();
    if (!silent) showToast('Dados sincronizados com a planilha.', 'success');
  } catch (error) {
    console.warn('Falha ao sincronizar com API:', error);
    if (!silent) showToast('Não consegui sincronizar agora. Seus dados locais continuam salvos.', 'warning');
  } finally {
    setLoading(false);
  }
}

async function saveRecord(category, record) {
  const normalized = upsertLocal(category, record);
  ensureMissions();
  recordScoreHistory();
  renderAll();

  if (!hasApi()) {
    queuePendingSync({ action: 'upsert', category, record: normalized });
    showToast('Registro salvo localmente. Configure a URL do Apps Script para sincronizar.', 'warning');
    return normalized;
  }

  try {
    const saved = await syncUpsert(category, normalized);
    upsertLocal(category, saved);
    await flushPendingSync();
    ensureMissions();
    renderAll();
    showToast('Registro salvo na planilha.', 'success');
    return saved;
  } catch (error) {
    console.warn('Falha ao salvar na API:', error);
    queuePendingSync({ action: 'upsert', category, record: normalized });
    showToast('Registro salvo localmente. A sincronização ficou pendente.', 'warning');
    return normalized;
  }
}

async function deleteRecord(category, id) {
  removeLocal(category, id);
  ensureMissions();
  recordScoreHistory();
  renderAll();

  if (!hasApi()) {
    queuePendingSync({ action: 'delete', category, id });
    showToast('Registro removido localmente. Exclusão pendente na planilha.', 'warning');
    return;
  }

  try {
    await syncDelete(category, id);
    await flushPendingSync();
    showToast('Registro excluído.', 'success');
  } catch (error) {
    console.warn('Falha ao excluir na API:', error);
    queuePendingSync({ action: 'delete', category, id });
    showToast('Registro excluído localmente. Sincronização pendente.', 'warning');
  }
}

async function syncUpsert(category, record) {
  try {
    return normalizeRecord(category, await apiPost('upsert', { sheet: SHEETS[category], record }));
  } catch (error) {
    if (!LEGACY_SHEETS[category]) throw error;
    return normalizeRecord(category, await apiPost('upsert', { sheet: LEGACY_SHEETS[category], record }));
  }
}

async function syncDelete(category, id) {
  try {
    return await apiPost('delete', { sheet: SHEETS[category], id });
  } catch (error) {
    if (!LEGACY_SHEETS[category]) throw error;
    return apiPost('delete', { sheet: LEGACY_SHEETS[category], id });
  }
}

function queuePendingSync(item) {
  const syncItem = {
    id: item.id || `${item.action}:${item.category}:${item.record?.id || item.id || uid('sync')}`,
    createdAt: nowIso(),
    ...item,
  };

  state.pendingSync = state.pendingSync.filter((pending) => {
    const sameRecord = pending.category === syncItem.category && (pending.record?.id || pending.id) === (syncItem.record?.id || syncItem.id);
    return !(sameRecord && pending.action === syncItem.action);
  });
  state.pendingSync.push(syncItem);
  persistAll();
}

async function flushPendingSync() {
  if (!hasApi() || !state.pendingSync.length) return;

  const remaining = [];

  for (const item of state.pendingSync) {
    try {
      if (item.action === 'upsert') {
        const saved = await syncUpsert(item.category, item.record);
        upsertLocal(item.category, saved);
      } else if (item.action === 'delete') {
        await syncDelete(item.category, item.id);
      }
    } catch (error) {
      console.warn('Sincronização pendente falhou:', error);
      remaining.push(item);
    }
  }

  state.pendingSync = remaining;
  persistAll();
}

function parseDurationToMinutes(value) {
  if (!value) return 0;
  const parts = String(value).split(':').map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) return toNumber(value, 0);
  if (parts.length === 3) return Math.round(((parts[0] * 3600 + parts[1] * 60 + parts[2]) / 60) * 10) / 10;
  if (parts.length === 2) return Math.round((parts[0] + parts[1] / 60) * 10) / 10;
  return toNumber(value, 0);
}

function calculatePace(distanceKm, durationMinutes) {
  if (!distanceKm || !durationMinutes) return '';
  const secondsPerKm = Math.round((durationMinutes * 60) / distanceKm);
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = String(secondsPerKm % 60).padStart(2, '0');
  return `${minutes}:${seconds}/km`;
}

function updatePacePreview() {
  const distance = toNumber($('corridaDistancia')?.value, 0);
  const duration = parseDurationToMinutes($('corridaTempo')?.value);
  setInputValue('corridaPace', calculatePace(distance, duration));
}

function formatDuration(minutes) {
  if (!minutes) return '-';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest ? `${hours}h ${rest}min` : `${hours}h`;
}

function uniqueDates(entries) {
  return new Set(entries.map((entry) => entry.date).filter(Boolean));
}

function activeDaysLast30() {
  const limit = daysAgoISO(30);
  return uniqueDates([...state.treinos, ...state.corridas, ...state.peso, ...state.medidas, ...state.nutricao, ...state.agua].filter((entry) => entry.date >= limit)).size;
}

function calcStreak() {
  const days = uniqueDates([...state.treinos, ...state.corridas, ...state.peso, ...state.medidas, ...state.nutricao, ...state.agua]);
  if (!days.size) return 0;

  let streak = 0;
  const cursor = new Date();
  if (!days.has(cursor.toISOString().slice(0, 10))) cursor.setDate(cursor.getDate() - 1);

  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function waterToday() {
  const today = todayStr();
  return state.agua.filter((entry) => entry.date === today).reduce((total, entry) => total + toNumber(entry.amountMl, 0), 0);
}

function treinosThisWeek() {
  const start = weekStart();
  return state.treinos.filter((entry) => entry.date >= start).length;
}

function corridasThisMonth() {
  const month = todayStr().slice(0, 7);
  return state.corridas.filter((entry) => entry.date?.slice(0, 7) === month).length;
}

function pesoRecent7() {
  const limit = daysAgoISO(7);
  return state.peso.some((entry) => entry.date >= limit);
}

function computeSpiderScore() {
  const consistency = Math.min(100, (activeDaysLast30() / 30) * 100);
  const treinosScore = Math.min(100, (treinosThisWeek() / 4) * 100);
  const corridasScore = Math.min(100, (corridasThisMonth() / 8) * 100);
  const aguaScore = Math.min(100, (waterToday() / Math.max(CONFIG.aguaMeta, 1)) * 100);
  const pesoScore = pesoRecent7() ? 100 : 0;
  const streakScore = Math.min(100, calcStreak() * 20);

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        consistency * 0.3 +
          treinosScore * 0.2 +
          corridasScore * 0.15 +
          aguaScore * 0.1 +
          pesoScore * 0.1 +
          streakScore * 0.15,
      ),
    ),
  );
}

function calculateXpTotal() {
  return (
    state.treinos.length * CONFIG.xp.treino +
    state.corridas.length * CONFIG.xp.corrida +
    uniqueDates(state.nutricao).size * CONFIG.xp.nutricao +
    uniqueDates(state.agua).size * CONFIG.xp.agua +
    state.peso.length * CONFIG.xp.peso +
    calcStreak() * CONFIG.xp.streak
  );
}

function getLevel() {
  return Math.floor(state.xpTotal / 500) + 1;
}

function xpBarPct() {
  return ((state.xpTotal % 500) / 500) * 100;
}

function recordScoreHistory() {
  const date = todayStr();
  const score = computeSpiderScore();
  state.scoreHistory = state.scoreHistory.filter((entry) => entry.date !== date);
  state.scoreHistory.push({ date, score });
  state.scoreHistory = normalizeScoreHistory(state.scoreHistory);
  persistAll();
  return score;
}

function getDailyMissions() {
  const today = todayStr();
  const streak = calcStreak();
  const hasToday = (entries) => entries.some((entry) => entry.date === today);
  const doneMap = {
    treino: hasToday(state.treinos),
    corrida: hasToday(state.corridas),
    nutricao: hasToday(state.nutricao),
    agua: waterToday() >= CONFIG.aguaMeta,
    peso: hasToday(state.peso),
    streak: streak >= 2,
    medidas: state.medidas.some((entry) => entry.date >= daysAgoISO(7)),
  };

  return MISSIONS.map((mission) => ({
    ...mission,
    done: Boolean(doneMap[mission.key]),
  }));
}

function ensureMissions() {
  state.missions = getDailyMissions().map((mission) => ({
    key: mission.key,
    date: todayStr(),
    title: mission.title,
    xp: mission.xp,
    status: mission.done ? 'done' : 'pending',
  }));
  persistAll();
}

function updateXpUI() {
  state.xpTotal = calculateXpTotal();
  setText('sidebarXP', `${state.xpTotal} XP`);
  setText('sidebarLevel', `Nível ${getLevel()}`);
  setText('userLevel', `Nível ${getLevel()}`);

  const bar = $('sidebarXPBar');
  if (bar) bar.style.width = `${xpBarPct()}%`;
}

function updateScoreChip(score = computeSpiderScore()) {
  const chip = document.querySelector('.spider-score-chip');
  const el = $('topbarScore');
  if (!chip || !el) return;

  el.textContent = String(score);
  chip.classList.toggle('tone-gold', score >= 40 && score <= 70);
  chip.classList.toggle('tone-mint', score > 70);
  chip.classList.remove('pulse');
  void chip.offsetWidth;
  chip.classList.add('pulse');
}

function renderAll() {
  updateXpUI();
  const score = recordScoreHistory();
  updateScoreChip(score);
  renderDashboard();
  renderCurrentPage();
  renderConfiguracoes();
  updateUserChip();
}

function navigateTo(page) {
  state.currentPage = PAGE_TITLES[page] ? page : 'dashboard';

  $$('.nav-item').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.page === state.currentPage);
  });

  $$('.page').forEach((panel) => {
    panel.classList.toggle('is-active', panel.dataset.pagePanel === state.currentPage);
  });

  setText('pageTitle', PAGE_TITLES[state.currentPage] || 'Dashboard');
  setText('pageEyebrow', PAGE_EYEBROWS[state.currentPage] || 'Visão geral');
  $('sidebar')?.classList.remove('is-open');
  $('sidebarScrim')?.classList.remove('is-visible');
  renderCurrentPage();
}

function renderCurrentPage() {
  const renderers = {
    dashboard: renderDashboard,
    treinos: renderTreinos,
    corridas: renderCorridas,
    peso: renderPeso,
    medidas: renderMedidas,
    nutricao: renderNutricao,
    agua: renderAgua,
    missoes: renderMissoes,
    timeline: renderTimeline,
    exportar: renderExportar,
    configuracoes: renderConfiguracoes,
  };

  renderers[state.currentPage]?.();
}

function renderDashboard() {
  const score = computeSpiderScore();
  const currentWeight = state.peso[0]?.weightKg;
  const water = waterToday();
  const waterPct = Math.min(100, Math.round((water / Math.max(CONFIG.aguaMeta, 1)) * 100));

  const stats = [
    { icon: 'icon-dashboard', value: score, label: 'Spider Score', variation: score >= 70 ? 'Excelente ritmo' : 'Consistência em construção', tone: score >= 70 ? 'up' : '' },
    { icon: 'icon-xp', value: `${state.xpTotal}`, label: `XP total · Nível ${getLevel()}`, variation: `${Math.round(xpBarPct())}% até o próximo nível`, tone: 'up' },
    { icon: 'icon-treino', value: treinosThisWeek(), label: 'Treinos na semana', variation: 'Meta base: 4 treinos', tone: treinosThisWeek() >= 4 ? 'up' : '' },
    { icon: 'icon-agua', value: `${waterPct}%`, label: `${water} ml de água hoje`, variation: `Meta: ${CONFIG.aguaMeta} ml`, tone: waterPct >= 100 ? 'up' : '' },
    { icon: 'icon-peso', value: currentWeight ? `${currentWeight} kg` : '--', label: 'Peso atual', variation: CONFIG.pesoMeta ? `Meta: ${CONFIG.pesoMeta} kg` : 'Defina uma meta', tone: currentWeight ? 'up' : '' },
  ];

  const statsGrid = $('statsGrid');
  if (statsGrid) {
    statsGrid.innerHTML = stats.map((stat) => `
      <article class="stat-card">
        <div class="stat-icon">${icon(stat.icon)}</div>
        <div class="stat-value">${escapeHtml(stat.value)}</div>
        <div class="stat-label">${escapeHtml(stat.label)}</div>
        <div class="stat-variation ${stat.tone}">${escapeHtml(stat.variation)}</div>
      </article>
    `).join('');
  }

  setText('lastRefresh', state.lastRefresh ? `Atualizado ${formatDateTime(state.lastRefresh)}` : 'Dados locais carregados');
  renderScoreChart();
  renderDashboardMissions();
  renderDashboardTimeline();
}

function renderDashboardMissions() {
  const container = $('dashMissoes');
  if (!container) return;
  const missions = getDailyMissions().slice(0, 5);
  container.innerHTML = missions.map((mission) => `
    <article class="stack-item">
      <div class="stack-icon">${icon(mission.icon)}</div>
      <div class="stack-body">
        <div class="stack-title">${escapeHtml(mission.title)}</div>
        <div class="stack-sub">${mission.done ? 'Concluída' : 'Pendente'} · ${mission.xp} XP</div>
      </div>
      <div class="stack-right">${mission.done ? '✓' : '•'}</div>
    </article>
  `).join('');
}

function renderDashboardTimeline() {
  const container = $('dashTimeline');
  if (!container) return;
  const items = getRecentActivity().slice(0, 6);
  container.innerHTML = items.length ? items.map(renderStackActivity).join('') : emptyStack('Nenhuma atividade registrada ainda.');
}

function renderTreinos() {
  const container = $('treinosGrid');
  if (!container) return;

  const typeFilter = $('treinoFiltroTipo')?.value || '';
  const monthFilter = $('treinoFiltroPeriodo')?.value || '';
  hydrateWorkoutTypeFilter();

  const entries = state.treinos.filter((entry) => {
    const matchesType = !typeFilter || entry.type === typeFilter;
    const matchesMonth = !monthFilter || entry.date.slice(0, 7) === monthFilter;
    return matchesType && matchesMonth;
  });

  container.innerHTML = entries.length ? entries.map((entry) => `
    <article class="entry-card">
      <div class="entry-top">
        <span class="entry-cat">${escapeHtml(entry.type)}</span>
        <span class="entry-date">${formatDatePt(entry.date)}</span>
      </div>
      <h3>${formatDuration(entry.durationMinutes)}</h3>
      <div class="entry-meta">
        <span>${entry.exercises.length} exercício(s)</span>
        <span>${escapeHtml(entry.status)}</span>
      </div>
      ${entry.exercises.length ? `<div class="exercise-list">${entry.exercises.map(formatExercise).join('')}</div>` : ''}
      ${entry.notes ? `<p class="entry-notes">${escapeHtml(entry.notes)}</p>` : ''}
      <button class="button button-ghost entry-delete" data-delete-category="treinos" data-delete-id="${escapeHtml(entry.id)}" type="button">Excluir</button>
    </article>
  `).join('') : emptyGrid('Nenhum treino encontrado.');
}

function hydrateWorkoutTypeFilter() {
  const select = $('treinoFiltroTipo');
  if (!select) return;

  const selected = select.value;
  const types = [...new Set(state.treinos.map((entry) => entry.type).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  select.innerHTML = '<option value="">Todos os tipos</option>' + types.map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`).join('');
  select.value = selected;
}

function renderCorridas() {
  const container = $('corridasGrid');
  if (!container) return;
  const monthFilter = $('corridaFiltroPeriodo')?.value || '';
  const entries = state.corridas.filter((entry) => !monthFilter || entry.date.slice(0, 7) === monthFilter);

  container.innerHTML = entries.length ? entries.map((entry) => `
    <article class="entry-card">
      <div class="entry-top">
        <span class="entry-cat">Corrida</span>
        <span class="entry-date">${formatDatePt(entry.date)}</span>
      </div>
      <h3>${entry.distanceKm} km · ${escapeHtml(entry.pace || '-')}</h3>
      <div class="entry-meta">
        <span>${formatDuration(entry.durationMinutes)}</span>
        <span>${entry.elevationM || 0} m elevação</span>
        ${entry.temperatureC ? `<span>${entry.temperatureC} °C</span>` : ''}
      </div>
      ${entry.location ? `<p class="entry-notes">${escapeHtml(entry.location)}</p>` : ''}
      ${entry.notes ? `<p class="entry-notes">${escapeHtml(entry.notes)}</p>` : ''}
      ${entry.stravaUrl ? `<div class="entry-link"><a href="${escapeHtml(entry.stravaUrl)}" target="_blank" rel="noreferrer">Abrir Strava</a></div>` : ''}
      <button class="button button-ghost entry-delete" data-delete-category="corridas" data-delete-id="${escapeHtml(entry.id)}" type="button">Excluir</button>
    </article>
  `).join('') : emptyGrid('Nenhuma corrida encontrada.');
}

function renderPeso() {
  const list = $('pesoList');
  if (list) {
    list.innerHTML = state.peso.length ? state.peso.map((entry) => `
      <article class="stack-item">
        <div class="stack-icon">${icon('icon-peso')}</div>
        <div class="stack-body">
          <div class="stack-title">${entry.weightKg} kg</div>
          <div class="stack-sub">${formatDatePt(entry.date)}${entry.notes ? ` · ${escapeHtml(entry.notes)}` : ''}</div>
        </div>
        <button class="button button-ghost entry-delete" data-delete-category="peso" data-delete-id="${escapeHtml(entry.id)}" type="button">Excluir</button>
      </article>
    `).join('') : emptyStack('Nenhum peso registrado.');
  }

  renderPesoChart();
}

function renderMedidas() {
  const container = $('medidasGrid');
  if (!container) return;

  const latest = state.medidas[0];
  const previous = state.medidas[1];
  if (!latest) {
    container.innerHTML = emptyGrid('Nenhuma medida registrada.');
    return;
  }

  container.innerHTML = MEASURE_FIELDS.map(([key, label]) => {
    const current = toNumber(latest[key], 0);
    const last = previous ? toNumber(previous[key], 0) : 0;
    const delta = previous ? Math.round((current - last) * 10) / 10 : 0;
    const deltaClass = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
    const deltaText = previous ? `${delta > 0 ? '+' : ''}${delta} cm` : 'Primeiro registro';

    return `
      <article class="medida-card">
        <div class="medida-label">${escapeHtml(label)}</div>
        <div class="medida-value">${current || '--'} cm</div>
        <div class="medida-delta ${deltaClass}">${escapeHtml(deltaText)}</div>
      </article>
    `;
  }).join('') + `
    <article class="medida-card medida-summary">
      <div class="medida-label">Última atualização</div>
      <div class="medida-value">${formatDatePt(latest.date)}</div>
      <button class="button button-ghost entry-delete" data-delete-category="medidas" data-delete-id="${escapeHtml(latest.id)}" type="button">Excluir</button>
    </article>
  `;
}

function renderNutricao() {
  const container = $('nutricaoList');
  if (!container) return;

  const filterDate = $('nutricaoFiltroData')?.value || todayStr();
  if ($('nutricaoFiltroData') && !$('nutricaoFiltroData').value) $('nutricaoFiltroData').value = filterDate;
  const entries = state.nutricao.filter((entry) => entry.date === filterDate).sort((a, b) => String(a.time).localeCompare(String(b.time)));

  container.innerHTML = entries.length ? entries.map((entry) => `
    <article class="stack-item stack-item-tall">
      <div class="stack-icon">${icon('icon-nutricao')}</div>
      <div class="stack-body">
        <div class="stack-title">${escapeHtml(entry.type)}${entry.time ? ` · ${escapeHtml(entry.time)}` : ''}</div>
        <div class="stack-sub">${entry.foods.length ? entry.foods.map(formatFood).join(' · ') : 'Sem alimentos detalhados'}</div>
        ${entry.notes ? `<div class="stack-sub">${escapeHtml(entry.notes)}</div>` : ''}
      </div>
      <button class="button button-ghost entry-delete" data-delete-category="nutricao" data-delete-id="${escapeHtml(entry.id)}" type="button">Excluir</button>
    </article>
  `).join('') : emptyStack('Nenhuma refeição registrada para essa data.');
}

function renderAgua() {
  const today = todayStr();
  const entries = state.agua.filter((entry) => entry.date === today).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const total = entries.reduce((sum, entry) => sum + toNumber(entry.amountMl, 0), 0);
  const pct = Math.min(100, Math.round((total / Math.max(CONFIG.aguaMeta, 1)) * 100));

  setText('aguaTotal', `${total} ml`);
  setText('aguaBarPct', `${pct}%`);

  const fill = $('aguaBarFill');
  if (fill) fill.style.width = `${pct}%`;

  const list = $('aguaHistorico');
  if (!list) return;

  list.innerHTML = entries.length ? entries.map((entry) => `
    <article class="stack-item">
      <div class="stack-icon">${icon('icon-agua')}</div>
      <div class="stack-body">
        <div class="stack-title">${entry.amountMl} ml</div>
        <div class="stack-sub">${formatDateTime(entry.createdAt)}</div>
      </div>
      <button class="button button-ghost entry-delete" data-delete-category="agua" data-delete-id="${escapeHtml(entry.id)}" type="button">Excluir</button>
    </article>
  `).join('') : emptyStack('Nenhum registro de água hoje.');
}

function renderMissoes() {
  const container = $('missoesGrid');
  if (!container) return;

  container.innerHTML = getDailyMissions().map((mission) => `
    <article class="missao-card ${mission.done ? 'done' : ''}">
      <div class="missao-head">
        <div class="missao-icon">${icon(mission.icon)}</div>
        <span class="missao-status ${mission.done ? 'done' : 'pending'}">${mission.done ? 'Concluída' : 'Pendente'}</span>
      </div>
      <h3>${escapeHtml(mission.title)}</h3>
      <p class="muted">${escapeHtml(mission.description)}</p>
      <span class="missao-xp">${mission.xp} XP</span>
    </article>
  `).join('');
}

function renderTimeline() {
  const container = $('timelineFeed');
  if (!container) return;
  const items = getRecentActivity();

  container.innerHTML = items.length ? items.map((item) => `
    <article class="timeline-item">
      <div class="timeline-dot">${icon(item.icon)}</div>
      <div class="timeline-body">
        <span class="tl-date">${formatDatePt(item.date)}</span>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.summary)}</p>
        <span class="tl-xp">+${item.xp} XP</span>
      </div>
    </article>
  `).join('') : emptyStack('Nenhuma atividade registrada ainda.');
}

function renderExportar() {
  const preview = $('exportPreview');
  if (preview) preview.textContent = JSON.stringify(buildExportData(), null, 2);
}

function renderConfiguracoes() {
  setInputValue('cfgApiUrl', CONFIG.apiUrl);
  setInputValue('cfgAguaMeta', CONFIG.aguaMeta);
  setInputValue('cfgPesoMeta', CONFIG.pesoMeta || '');
  setInputValue('cfgXpTreino', CONFIG.xp.treino);
  setInputValue('cfgXpCorrida', CONFIG.xp.corrida);
  setInputValue('cfgXpNutricao', CONFIG.xp.nutricao);
  setInputValue('cfgXpAgua', CONFIG.xp.agua);
  setInputValue('cfgXpPeso', CONFIG.xp.peso);
  setInputValue('cfgXpStreak', CONFIG.xp.streak);
}

function renderScoreChart() {
  const canvas = $('canvasScore');
  const ChartCtor = window.Chart;
  if (!canvas || !ChartCtor) return;

  const labels = [];
  const values = [];
  for (let index = 29; index >= 0; index -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - index);
    const key = date.toISOString().slice(0, 10);
    labels.push(date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
    values.push(state.scoreHistory.find((entry) => entry.date === key)?.score || 0);
  }

  state.charts.score?.destroy();
  state.charts.score = new ChartCtor(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Spider Score',
        data: values,
        borderColor: '#d42736',
        pointBackgroundColor: '#1b4f9c',
        backgroundColor: 'rgba(212,39,54,0.15)',
        tension: 0.35,
        fill: true,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, max: 100 } },
    },
  });
}

function renderPesoChart() {
  const canvas = $('canvasPeso');
  const ChartCtor = window.Chart;
  if (!canvas || !ChartCtor) return;

  const list = [...state.peso].sort((a, b) => a.date.localeCompare(b.date)).slice(-20);
  state.charts.peso?.destroy();
  state.charts.peso = new ChartCtor(canvas, {
    type: 'line',
    data: {
      labels: list.map((entry) => formatDatePt(entry.date)),
      datasets: [
        {
          label: 'Peso',
          data: list.map((entry) => entry.weightKg),
          borderColor: '#d42736',
          pointBackgroundColor: '#d42736',
          tension: 0.35,
        },
        {
          label: 'Meta',
          data: list.map(() => CONFIG.pesoMeta || null),
          borderColor: '#1b4f9c',
          borderDash: [6, 6],
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: true } },
      scales: { y: { beginAtZero: false } },
    },
  });
}

function getRecentActivity() {
  const items = [
    ...state.treinos.map((entry) => ({
      date: entry.date,
      icon: 'icon-treino',
      title: 'Treino',
      summary: `${entry.type} · ${formatDuration(entry.durationMinutes)}`,
      xp: CONFIG.xp.treino,
    })),
    ...state.corridas.map((entry) => ({
      date: entry.date,
      icon: 'icon-corrida',
      title: 'Corrida',
      summary: `${entry.distanceKm} km · ${entry.pace || formatDuration(entry.durationMinutes)}`,
      xp: CONFIG.xp.corrida,
    })),
    ...state.peso.map((entry) => ({
      date: entry.date,
      icon: 'icon-peso',
      title: 'Peso',
      summary: `${entry.weightKg} kg`,
      xp: CONFIG.xp.peso,
    })),
    ...state.medidas.map((entry) => ({
      date: entry.date,
      icon: 'icon-medidas',
      title: 'Medidas',
      summary: 'Registro de medidas corporais',
      xp: 30,
    })),
    ...state.nutricao.map((entry) => ({
      date: entry.date,
      icon: 'icon-nutricao',
      title: 'Refeição',
      summary: `${entry.type} · ${entry.foods.length} alimento(s)`,
      xp: CONFIG.xp.nutricao,
    })),
    ...state.agua.map((entry) => ({
      date: entry.date,
      icon: 'icon-agua',
      title: 'Água',
      summary: `${entry.amountMl} ml`,
      xp: CONFIG.xp.agua,
    })),
  ];

  return items.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function buildExportData() {
  const start = new Date();
  start.setDate(start.getDate() - 6);
  const startISO = start.toISOString().slice(0, 10);

  return {
    exportedAt: nowIso(),
    user: state.user?.username || 'admin',
    summary: {
      spiderScore: computeSpiderScore(),
      xpTotal: state.xpTotal,
      level: getLevel(),
      streakDays: calcStreak(),
      waterTodayMl: waterToday(),
      pendingSync: state.pendingSync.length,
    },
    week: Object.fromEntries(CATEGORIES.map((category) => [category, state[category].filter((entry) => entry.date >= startISO)])),
    all: Object.fromEntries(CATEGORIES.map((category) => [category, state[category]])),
  };
}

function exportJSON() {
  downloadFile('spider-semana.json', JSON.stringify(buildExportData(), null, 2), 'application/json;charset=utf-8');
  showToast('Exportação JSON criada.', 'success');
}

function exportCSV() {
  const rows = getRecentActivity().map((item) => [item.date, item.title, item.summary, item.xp]);
  const content = [['data', 'tipo', 'resumo', 'xp'], ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
  downloadFile('spider-dados.csv', content, 'text/csv;charset=utf-8');
  showToast('Exportação CSV criada.', 'success');
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function icon(id) {
  return `<svg aria-hidden="true"><use href="#${id}"></use></svg>`;
}

function emptyGrid(message) {
  return `<article class="entry-card empty-state">${escapeHtml(message)}</article>`;
}

function emptyStack(message) {
  return `<article class="stack-item empty-state"><div class="stack-body"><div class="stack-title">${escapeHtml(message)}</div></div></article>`;
}

function renderStackActivity(item) {
  return `
    <article class="stack-item">
      <div class="stack-icon">${icon(item.icon)}</div>
      <div class="stack-body">
        <div class="stack-title">${escapeHtml(item.title)}</div>
        <div class="stack-sub">${formatDatePt(item.date)} · ${escapeHtml(item.summary)}</div>
      </div>
      <div class="stack-right"><span class="stack-xp">+${item.xp}</span></div>
    </article>
  `;
}

function formatExercise(exercise) {
  const pieces = [
    exercise.sets && exercise.reps ? `${exercise.sets} x ${exercise.reps}` : '',
    exercise.loadKg ? `${exercise.loadKg} kg` : '',
    exercise.durationSeconds ? `${exercise.durationSeconds}s` : '',
  ].filter(Boolean);

  return `<div>${escapeHtml(exercise.name || 'Exercício')}${pieces.length ? ` · ${escapeHtml(pieces.join(' · '))}` : ''}</div>`;
}

function formatFood(food) {
  return `${food.quantity} ${food.unit} ${food.name}`.trim();
}

function updateUserChip() {
  if (!state.user) return;
  setText('userInitials', state.user.initials || getInitials(state.user.name || state.user.username));
  setText('userName', state.user.name || state.user.username || 'Usuário');
}

function persistSettingsLocal() {
  localStorage.setItem(STORAGE_KEYS.apiUrl, CONFIG.apiUrl);
  localStorage.setItem(STORAGE_KEYS.aguaMeta, String(CONFIG.aguaMeta));
  localStorage.setItem(STORAGE_KEYS.pesoMeta, String(CONFIG.pesoMeta));
  localStorage.setItem(STORAGE_KEYS.xpTreino, String(CONFIG.xp.treino));
  localStorage.setItem(STORAGE_KEYS.xpCorrida, String(CONFIG.xp.corrida));
  localStorage.setItem(STORAGE_KEYS.xpNutricao, String(CONFIG.xp.nutricao));
  localStorage.setItem(STORAGE_KEYS.xpAgua, String(CONFIG.xp.agua));
  localStorage.setItem(STORAGE_KEYS.xpPeso, String(CONFIG.xp.peso));
  localStorage.setItem(STORAGE_KEYS.xpStreak, String(CONFIG.xp.streak));
}

async function saveSettings() {
  CONFIG.apiUrl = String($('cfgApiUrl')?.value || '').trim();
  CONFIG.aguaMeta = toNumber($('cfgAguaMeta')?.value, 2500);
  CONFIG.pesoMeta = toNumber($('cfgPesoMeta')?.value, 0);
  CONFIG.xp.treino = toNumber($('cfgXpTreino')?.value, 100);
  CONFIG.xp.corrida = toNumber($('cfgXpCorrida')?.value, 120);
  CONFIG.xp.nutricao = toNumber($('cfgXpNutricao')?.value, 20);
  CONFIG.xp.agua = toNumber($('cfgXpAgua')?.value, 10);
  CONFIG.xp.peso = toNumber($('cfgXpPeso')?.value, 15);
  CONFIG.xp.streak = toNumber($('cfgXpStreak')?.value, 50);
  persistSettingsLocal();
  renderAll();

  if (hasApi()) {
    try {
      await apiPost('settings', {
        settings: {
          userName: state.user?.name || 'Spider',
          targetWeightKg: CONFIG.pesoMeta,
          dailyWaterGoalMl: CONFIG.aguaMeta,
          weeklyWorkoutGoal: 4,
          weeklyRunGoal: 2,
          xpWorkout: CONFIG.xp.treino,
          xpRun: CONFIG.xp.corrida,
          xpNutrition: CONFIG.xp.nutricao,
          xpWater: CONFIG.xp.agua,
          xpWeight: CONFIG.xp.peso,
          xpStreak: CONFIG.xp.streak,
          xpMission: 30,
        },
      });
    } catch (error) {
      console.warn('Falha ao salvar configurações na API:', error);
      showToast('Configurações salvas localmente. A planilha não respondeu.', 'warning');
      return;
    }
  }

  showToast('Configurações salvas.', 'success');
}

function getFormPayload(form) {
  return Object.fromEntries(new FormData(form).entries());
}

async function submitRecordForm(event, category, buildRecord, modalId, successMessage) {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = form.querySelector('[type="submit"]');
  submit?.setAttribute('disabled', 'true');

  try {
    await saveRecord(category, buildRecord(getFormPayload(form)));
    form.reset();
    closeModal(modalId);
    setDefaultDates();
    showToast(successMessage, 'success');
  } catch (error) {
    console.error(error);
    showToast('Não consegui salvar esse registro.', 'error');
  } finally {
    submit?.removeAttribute('disabled');
  }
}

function setDefaultDates() {
  ['treinoData', 'corridaData', 'pesoData', 'medidasData', 'refeicaoData', 'aguaData'].forEach((id) => {
    const input = $(id);
    if (input && !input.value) input.value = todayStr();
  });

  const nutritionFilter = $('nutricaoFiltroData');
  if (nutritionFilter && !nutritionFilter.value) nutritionFilter.value = todayStr();
}

function openModal(id) {
  setDefaultDates();
  const modal = $(id);
  if (modal?.showModal && !modal.open) modal.showModal();
}

function closeModal(id) {
  const modal = $(id);
  if (modal?.close && modal.open) modal.close();
}

function wireEvents() {
  document.addEventListener('click', async (event) => {
    const pageButton = event.target.closest('[data-page]');
    if (pageButton) {
      navigateTo(pageButton.dataset.page);
      return;
    }

    const deleteButton = event.target.closest('[data-delete-category][data-delete-id]');
    if (deleteButton) {
      const confirmed = window.confirm('Excluir este registro?');
      if (confirmed) await deleteRecord(deleteButton.dataset.deleteCategory, deleteButton.dataset.deleteId);
    }
  });

  $('themeToggle')?.addEventListener('click', () => {
    const isLight = document.documentElement.classList.toggle('light');
    localStorage.setItem(STORAGE_KEYS.theme, isLight ? 'light' : 'dark');
    setText('themeToggle', isLight ? 'Modo escuro' : 'Modo claro');
  });

  $('mobileMenuButton')?.addEventListener('click', () => {
    $('sidebar')?.classList.toggle('is-open');
    $('sidebarScrim')?.classList.toggle('is-visible');
  });

  $('sidebarScrim')?.addEventListener('click', () => {
    $('sidebar')?.classList.remove('is-open');
    $('sidebarScrim')?.classList.remove('is-visible');
  });

  $('logoutButton')?.addEventListener('click', () => {
    clearStoredSession();
    state.user = null;
    $('loginView')?.classList.remove('is-hidden');
    $('appView')?.classList.add('is-hidden');
    showToast('Sessão encerrada.', 'success');
  });

  $('refreshButton')?.addEventListener('click', () => loadAll());
  $('btnSalvarConfig')?.addEventListener('click', saveSettings);
  $('btnExportJSON')?.addEventListener('click', exportJSON);
  $('btnExportCSV')?.addEventListener('click', exportCSV);

  ['treinoFiltroTipo', 'treinoFiltroPeriodo'].forEach((id) => $(id)?.addEventListener('change', renderTreinos));
  $('corridaFiltroPeriodo')?.addEventListener('change', renderCorridas);
  $('nutricaoFiltroData')?.addEventListener('change', renderNutricao);
  $('corridaDistancia')?.addEventListener('input', updatePacePreview);
  $('corridaTempo')?.addEventListener('input', updatePacePreview);

  $$('.modal').forEach((modal) => {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) modal.close();
    });
  });

  $$('.modal-close').forEach((button) => button.addEventListener('click', () => button.closest('dialog')?.close()));

  $('btnNovoTreino')?.addEventListener('click', () => openModal('treinoModal'));
  $('btnNovaCorrida')?.addEventListener('click', () => openModal('corridaModal'));
  $('btnNovoPeso')?.addEventListener('click', () => openModal('pesoModal'));
  $('btnNovasMedidas')?.addEventListener('click', () => openModal('medidasModal'));
  $('btnNovaRefeicao')?.addEventListener('click', () => openModal('refeicaoModal'));
  $('btnRegistrarAgua')?.addEventListener('click', () => openModal('aguaModal'));

  $$('.button-subtle[data-ml]').forEach((button) => {
    button.addEventListener('click', () => saveRecord('agua', { amountMl: button.dataset.ml, date: todayStr() }));
  });

  $('treinoForm')?.addEventListener('submit', (event) => submitRecordForm(event, 'treinos', (payload) => ({
    date: payload.data,
    type: payload.tipo,
    durationMinutes: payload.duracao,
    exercises: parseExerciseText(payload.exercicios),
    notes: payload.observacoes,
  }), 'treinoModal', 'Treino registrado.'));

  $('corridaForm')?.addEventListener('submit', (event) => submitRecordForm(event, 'corridas', (payload) => {
    const durationMinutes = parseDurationToMinutes(payload.tempo);
    const distanceKm = toNumber(payload.distancia, 0);
    return {
      date: payload.data,
      distanceKm,
      durationMinutes,
      pace: payload.pace || calculatePace(distanceKm, durationMinutes),
      elevationM: payload.elevacao,
      location: payload.local,
      temperatureC: payload.temperatura,
      feeling: payload.sensacao,
      notes: payload.observacoes,
      stravaUrl: payload.linkStrava,
    };
  }, 'corridaModal', 'Corrida registrada.'));

  $('pesoForm')?.addEventListener('submit', (event) => submitRecordForm(event, 'peso', (payload) => ({
    date: payload.data,
    weightKg: payload.peso,
    notes: payload.observacoes,
  }), 'pesoModal', 'Peso registrado.'));

  $('medidasForm')?.addEventListener('submit', (event) => submitRecordForm(event, 'medidas', (payload) => ({
    date: payload.data,
    leftArmCm: payload.bracoEsq,
    rightArmCm: payload.bracoDir,
    chestCm: payload.peitoral,
    waistCm: payload.cintura,
    hipCm: payload.quadril,
    thighCm: payload.coxa,
    calfCm: payload.panturrilha,
    neckCm: payload.pescoco,
    forearmCm: payload.antebraco,
  }), 'medidasModal', 'Medidas registradas.'));

  $('refeicaoForm')?.addEventListener('submit', (event) => submitRecordForm(event, 'nutricao', (payload) => ({
    date: payload.data,
    time: payload.horario,
    type: payload.tipo,
    foods: parseFoodText(payload.alimentos),
    notes: payload.observacoes,
  }), 'refeicaoModal', 'Refeição registrada.'));

  $('aguaForm')?.addEventListener('submit', (event) => submitRecordForm(event, 'agua', (payload) => ({
    date: payload.data,
    amountMl: payload.quantidade,
  }), 'aguaModal', 'Água registrada.'));

  $('loginForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = $('loginButton');
    const username = $('loginUsername')?.value.trim();
    const password = $('loginPassword')?.value;
    const error = $('loginError');

    if (error) error.textContent = '';
    button?.setAttribute('disabled', 'true');

    const user = await authenticateUser(username, password);
    if (!user) {
      if (error) error.textContent = 'Usuário ou senha inválidos.';
      button?.removeAttribute('disabled');
      return;
    }

    await enterApp(user, true);
    button?.removeAttribute('disabled');
  });
}

async function enterApp(user, persistSession = false) {
  state.user = user;
  if (persistSession) setStoredSession(user);
  $('loginView')?.classList.add('is-hidden');
  $('appView')?.classList.remove('is-hidden');
  updateUserChip();
  navigateTo('dashboard');
  await loadAll({ silent: true });
}

async function bootstrap() {
  ensureDefaultUsers();
  setDefaultDates();

  const savedTheme = localStorage.getItem(STORAGE_KEYS.theme);
  if (savedTheme === 'light') {
    document.documentElement.classList.add('light');
    setText('themeToggle', 'Modo escuro');
  }

  wireEvents();

  const params = new URLSearchParams(window.location.search);
  const queryUsername = params.get('username')?.trim();
  const queryPassword = params.get('password')?.trim();
  const storedUser = getStoredSession();

  if (storedUser) {
    await enterApp(storedUser);
    return;
  }

  if (queryUsername && queryPassword) {
    const user = await authenticateUser(queryUsername, queryPassword);
    if (user) {
      await enterApp(user, true);
      return;
    }
    showToast('Credenciais inválidas.', 'error');
  }

  loadLocalState();
  renderConfiguracoes();
  $('appView')?.classList.add('is-hidden');
  $('loginView')?.classList.remove('is-hidden');
  setLoading(false);
}

document.addEventListener('DOMContentLoaded', bootstrap);

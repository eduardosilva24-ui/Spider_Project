/* =========================================================
   Projeto Spider — script.js
   App pessoal de evolução física (vanilla JS)
   Persistência: Google Apps Script (opcional) + localStorage
   ========================================================= */

/* ---------- 1. Configuração inicial ---------- */
const CONFIG = {
  apiUrl: localStorage.getItem('spider_api_url') || '',
  aguaMeta: Number(localStorage.getItem('spider_agua_meta')) || 2500,
  pesoMeta: Number(localStorage.getItem('spider_peso_meta')) || 0,
  xp: {
    treino: Number(localStorage.getItem('spider_xp_treino')) || 100,
    corrida: Number(localStorage.getItem('spider_xp_corrida')) || 120,
    nutricao: Number(localStorage.getItem('spider_xp_nutricao')) || 20,
    agua: Number(localStorage.getItem('spider_xp_agua')) || 10,
    peso: Number(localStorage.getItem('spider_xp_peso')) || 15,
    streak: Number(localStorage.getItem('spider_xp_streak')) || 50,
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

const TREINO_TIPOS = ['Musculação', 'Funcional', 'Calistenia', 'Outro'];
const REFEICAO_TIPOS = ['Café da manhã', 'Almoço', 'Lanche', 'Jantar', 'Ceia', 'Outro'];

const MISSIONS = [
  { key: 'treino', icon: 'icon-treino', title: 'Registrar treino', xp: 100 },
  { key: 'corrida', icon: 'icon-corrida', title: 'Registrar corrida', xp: 120 },
  { key: 'nutricao', icon: 'icon-nutricao', title: 'Registrar alimentação', xp: 20 },
  { key: 'agua', icon: 'icon-agua', title: 'Bater meta de água', xp: 10 },
  { key: 'peso', icon: 'icon-peso', title: 'Registrar peso', xp: 15 },
  { key: 'streak', icon: 'icon-timeline', title: 'Sequência mantida', xp: 50 },
  { key: 'medidas', icon: 'icon-medidas', title: 'Registrar medidas', xp: 30 },
];

/* ---------- Estado ---------- */
let state = {
  user: null,
  treinos: [],
  corridas: [],
  peso: [],
  medidas: [],
  nutricao: [],
  agua: [],
  scoreHistory: [],
  missions: [],
  xpTotal: 0,
  lastRefresh: null,
  charts: {},
};

/* ---------- Utilidades ---------- */
const $ = (id) => document.getElementById(id);
const todayStr = () => {
  const d = new Date();
  return d.toISOString().slice(0, 10);
};
function toISODate(dateStr) {
  if (!dateStr) return '';
  return dateStr;
}
function uid(prefix) {
  return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
}
function formatDatePt(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${Number(d)} ${months[Number(m) - 1]} ${y}`;
}
function formatHour(hhmm) {
  return hhmm || '';
}
function weekStart(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = (d.getDay() + 6) % 7; // segunda = 0
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}
function todayKey() { return todayStr(); }

/* ---------- Persistência local (fallback) ---------- */
const LS_KEYS = {
  treinos: 'spider_treinos',
  corridas: 'spider_corridas',
  peso: 'spider_peso',
  medidas: 'spider_medidas',
  nutricao: 'spider_nutricao',
  agua: 'spider_agua',
  xp: 'spider_xp_total',
  score: 'spider_score_history',
  missions: 'spider_missions',
};
function loadLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(LS_KEYS[key]);
    return raw ? JSON.parse(raw) : (fallback || (Array.isArray(fallback) ? [] : 0));
  } catch (e) {
    return fallback || [];
  }
}
function saveLocal(key, value) {
  localStorage.setItem(LS_KEYS[key], JSON.stringify(value));
}

/* ---------- 5. API (Google Apps Script) ---------- */
async function apiGet(action) {
  const res = await fetch(`${CONFIG.apiUrl}?action=${action}`);
  return res.json();
}
async function apiPost(payload) {
  const res = await fetch(CONFIG.apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

const hasApi = () => !!CONFIG.apiUrl;

async function loadAll() {
  // Sempre carrega do local primeiro (base offline)
  state.treinos = loadLocal('treinos', []);
  state.corridas = loadLocal('corridas', []);
  state.peso = loadLocal('peso', []);
  state.medidas = loadLocal('medidas', []);
  state.nutricao = loadLocal('nutricao', []);
  state.agua = loadLocal('agua', []);
  state.xpTotal = loadLocal('xp', 0);
  state.scoreHistory = loadLocal('score', []);
  state.missions = loadLocal('missions', []);

  // Se houver API, tenta carregar do servidor
  if (hasApi()) {
    try {
      const res = await apiGet('getAll');
      if (res && res.ok !== false && res.data) {
        const d = res.data;
        state.treinos = d.treinos || d.workouts || state.treinos;
        state.corridas = d.corridas || d.runs || state.corridas;
        state.peso = d.peso || d.weight || state.peso;
        state.medidas = d.medidas || d.measurements || state.medidas;
        state.nutricao = d.nutricao || d.nutrition || state.nutricao;
        state.agua = d.agua || d.water || state.agua;
        if (d.xpTotal !== undefined) state.xpTotal = Number(d.xpTotal) || 0;
        if (d.scoreHistory) state.scoreHistory = d.scoreHistory;
        if (d.missions) state.missions = d.missions;
        // persistir local
        Object.keys(LS_KEYS).forEach((k) => {
          if (state[k] !== undefined) saveLocal(k, state[k]);
        });
      }
    } catch (e) {
      console.warn('Falha ao sincronizar com API:', e);
    }
  }

  state.lastRefresh = new Date();
  ensureMissions();
  updateXPUI();
}

async function saveRecord(category, record) {
  // Salva local
  state[category].push(record);
  state[category].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  saveLocal(category, state[category]);

  // Salva na API
  if (hasApi()) {
    try {
      await apiPost({ action: 'save' + cap(category), data: record });
    } catch (e) {
      console.warn('Falha ao salvar na API:', e);
    }
  }
}

function cap(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/* ---------- 4. Sistema de XP e Nível ---------- */
function addXP(amount) {
  state.xpTotal += amount;
  saveLocal('xp', state.xpTotal);
  updateXPUI();
  showToast(`+${amount} XP`, 'xp');
}

function getLevel() { return Math.floor(state.xpTotal / 500) + 1; }
function xpToNext() { return 500 - (state.xpTotal % 500); }
function xpBarPct() { return ((state.xpTotal % 500) / 500) * 100; }

function updateXPUI() {
  $('sidebarXP').textContent = `${state.xpTotal} XP`;
  $('sidebarXPBar').style.width = `${xpBarPct()}%`;
  $('sidebarLevel').textContent = `Nível ${getLevel()}`;
  $('userLevel').textContent = `Nível ${getLevel()}`;
}

/* ---------- 3. Spider Score (0-100) ---------- */
function activeDaysLast30() {
  const days = new Set();
  const limit = daysAgoISO(30);
  const all = state.treinos.concat(state.corridas, state.peso, state.medidas, state.nutricao, state.agua);
  all.forEach((r) => {
    if (r.date && r.date >= limit) days.add(r.date);
  });
  return days.size;
}
function daysAgoISO(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function treinosThisWeek() {
  const ws = weekStart(todayStr());
  return state.treinos.filter((t) => t.date >= ws).length;
}
function corridasThisMonth() {
  const m = todayStr().slice(0, 7);
  return state.corridas.filter((c) => c.date && c.date.slice(0, 7) === m).length;
}
function waterToday() {
  const t = todayStr();
  return state.agua.filter((a) => a.date === t).reduce((s, a) => s + a.amountMl, 0);
}
function pesoRecent7() {
  const limit = daysAgoISO(7);
  return state.peso.some((p) => p.date >= limit);
}
function calcStreak() {
  const days = new Set();
  state.treinos.concat(state.corridas, state.peso, state.nutricao, state.agua).forEach((r) => {
    if (r.date) days.add(r.date);
  });
  if (days.size === 0) return 0;
  let streak = 0;
  const d = new Date();
  // se hoje não tem registro, começa de ontem
  if (!days.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
  while (days.has(d.toISOString().slice(0, 10))) {
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function computeSpiderScore() {
  const consistency = Math.min(100, (activeDaysLast30() / 30) * 100);
  const treinosScore = Math.min(100, (treinosThisWeek() / 4) * 100);
  const corridasScore = Math.min(100, (corridasThisMonth() / 8) * 100);
  const aguaScore = Math.min(100, (waterToday() / CONFIG.aguaMeta) * 100);
  const pesoScore = pesoRecent7() ? 100 : 0;
  const streakScore = Math.min(100, calcStreak() * 20);

  const score =
    consistency * 0.30 +
    treinosScore * 0.20 +
    corridasScore * 0.15 +
    aguaScore * 0.10 +
    pesoScore * 0.10 +
    streakScore * 0.15;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function recordScoreHistory() {
  const today = todayStr();
  const score = computeSpiderScore();
  let history = state.scoreHistory.filter((h) => h.date !== today);
  history.push({ date: today, score });
  history.sort((a, b) => a.date.localeCompare(b.date));
  history = history.slice(-30);
  state.scoreHistory = history;
  saveLocal('score', history);
  return score;
}

function updateScoreChip(score) {
  const chip = document.querySelector('.spider-score-chip');
  const el = $('topbarScore');
  el.textContent = score;
  chip.classList.toggle('tone-gold', score >= 40 && score <= 70);
  chip.classList.toggle('tone-mint', score > 70);
  chip.classList.remove('pulse');
  void chip.offsetWidth;
  chip.classList.add('pulse');
}

/* ---------- Missões ---------- */
function ensureMissions() {
  const today = todayStr();
  const todayMissions = state.missions.filter((m) => m.date === today);
  if (todayMissions.length === MISSIONS.length) return;

  const base = state.missions.filter((m) => m.date !== today);
  const fresh = MISSIONS.map((m) => ({
    ...m,
    date: today,
    status: 'pending',
  }));
  state.missions = base.concat(fresh);
  saveLocal('missions', state.missions);
  evaluateMissions();
}

function evaluateMissions() {
  const today = todayStr();
  const has = (arr, fn) => arr.some(fn);
  const stri = calcStreak();

  const conditions = {
    treino: has(state.treinos, (t) => t.date === today),
    corrida: has(state.corridas, (c) => c.date === today),
    nutricao: has(state.nutricao, (n) => n.date === today),
    agua: waterToday() >= CONFIG.aguaMeta,
    peso: has(state.peso, (p) => p.date === today),
    streak: stri >= 2,
    medidas: has(state.medidas, (m) => m.date >= daysAgoISO(7)),
  };

  state.missions.forEach((m) => {
    return acc;
  }, {});
  container.innerHTML = Object.entries(groups).length ? Object.entries(groups).map(([type, items]) => `
    <article class="item-card"><div class="surface-header"><div><strong>${type}</strong><div class="meta">${items.length} refeição(ões)</div></div><span class="badge">+${CONFIG.xp.nutricao} XP</span></div>
    ${items.map(item => `<p class="meta">• ${item.alimentos || '—'}</p>`).join('')}
    </article>
  `).join('') : '<div class="item-card">Nenhuma refeição registrada para essa data.</div>';
}

function renderAgua() {
  const totalEl = document.getElementById('aguaTotal');
  const fillEl = document.getElementById('aguaBarFill');
  const pctEl = document.getElementById('aguaBarPct');
  const listEl = document.getElementById('aguaHistorico');
  const today = buildTodayKey();
  const total = state.data.agua.filter(item => (item.data || '').slice(0, 10) === today).reduce((sum, item) => sum + Number(item.quantidade || item.ml || 0), 0);
  if (totalEl) totalEl.textContent = `${total} ml`;
  const pct = Math.min(100, Math.round((total / Math.max(CONFIG.aguaMeta, 1)) * 100));
  if (fillEl) fillEl.style.width = `${pct}%`;
  if (pctEl) pctEl.textContent = `${pct}%`;
  if (listEl) {
    const entries = [...state.data.agua].filter(item => (item.data || '').slice(0, 10) === today).sort((a, b) => new Date(b.data) - new Date(a.data));
    listEl.innerHTML = entries.length ? entries.map(item => `<div class="item-card"><div class="surface-header"><div><strong>${formatDateTime(item.data)}</strong><div class="meta">Registro de hidratação</div></div><span class="badge">${item.quantidade || item.ml || 0} ml</span></div></div>`).join('') : '<div class="item-card">Nenhum registro de água hoje.</div>';
  }
}

function renderMissoes() {
  const container = document.getElementById('missoesGrid');
  if (!container) return;
  const missions = getDailyMissions();
  container.innerHTML = missions.map(m => `
    <article class="item-card ${m.done ? 'mission-done' : ''}">
      <div class="surface-header">
        <div><strong>${m.name}</strong><div class="meta">${m.xp} XP</div></div>
        ${m.done ? '<span class="badge success">✓ Concluída</span>' : '<span class="badge warn">Pendente</span>'}
      </div>
      <p class="meta">${m.description}</p>
    </article>
  `).join('');
}

function renderTimeline() {
  const container = document.getElementById('timelineFeed');
  if (!container) return;
  const items = getRecentActivity();
  container.innerHTML = items.length ? items.map(item => `
    <article class="item-card">
      <div class="surface-header"><div><strong>${item.title}</strong><div class="meta">${formatDate(item.date)}</div></div><span class="badge">+${item.xp} XP</span></div>
      <p class="meta">${item.summary}</p>
    </article>
  `).join('') : '<div class="item-card">Nenhuma atividade registrada ainda.</div>';
}

function renderExportar() {
  const preview = document.getElementById('exportPreview');
  if (!preview) return;
  const data = buildExportData();
  preview.textContent = JSON.stringify(data, null, 2);
}

function renderConfiguracoes() {
  const cfgApiUrl = document.getElementById('cfgApiUrl');
  const cfgAguaMeta = document.getElementById('cfgAguaMeta');
  const cfgPesoMeta = document.getElementById('cfgPesoMeta');
  if (cfgApiUrl) cfgApiUrl.value = CONFIG.apiUrl;
  if (cfgAguaMeta) cfgAguaMeta.value = CONFIG.aguaMeta;
  if (cfgPesoMeta) cfgPesoMeta.value = CONFIG.pesoMeta;
}

function renderScoreChart() {
  const ctx = document.getElementById('canvasScore');
  if (!ctx) return;
  const labels = Array.from({ length: 30 }, (_, index) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - index));
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  });
  const values = labels.map((_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - idx));
    const dayKey = d.toISOString().slice(0, 10);
    const hasAny = [...state.data.treinos, ...state.data.corridas, ...state.data.peso, ...state.data.agua, ...state.data.refeicoes].some(item => (item.data || '').slice(0, 10) === dayKey);
    return hasAny ? computeSpiderScore({ ...state.data, treinos: state.data.treinos.filter(item => (item.data || '').slice(0, 10) === dayKey), corridas: state.data.corridas.filter(item => (item.data || '').slice(0, 10) === dayKey), peso: state.data.peso.filter(item => (item.data || '').slice(0, 10) === dayKey), agua: state.data.agua.filter(item => (item.data || '').slice(0, 10) === dayKey), refeicoes: state.data.refeicoes.filter(item => (item.data || '').slice(0, 10) === dayKey) }, CONFIG).score : 0;
  });
  if (scoreChart) scoreChart.destroy();
  scoreChart = new Chart(ctx, {
    type: 'line', data: { labels, datasets: [{ label: 'Spider Score', data: values, borderColor: '#d42736', pointBackgroundColor: '#1b4f9c', tension: .35, fill: true, backgroundColor: 'rgba(212,39,54,0.15)' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100 } } }
  });
}

function renderPesoChart(list) {
  const ctx = document.getElementById('canvasPeso');
  if (!ctx) return;
  const labels = list.map(item => formatDate(item.data));
  const values = list.map(item => Number(item.peso));
  const metaValues = list.map(() => CONFIG.pesoMeta || 0);
  if (pesoChart) pesoChart.destroy();
  pesoChart = new Chart(ctx, { type: 'line', data: { labels, datasets: [{ label: 'Peso', data: values, borderColor: '#d42736', tension: .35 }, { label: 'Meta', data: metaValues, borderColor: '#1b4f9c', borderDash: [6, 6] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: false } } } });
}

function getDailyMissions() {
  const today = buildTodayKey();
  const hasTreino = state.data.treinos.some(item => (item.data || '').slice(0, 10) === today);
  const hasCorrida = state.data.corridas.some(item => (item.data || '').slice(0, 10) === today);
  const hasRefeicao = state.data.refeicoes.some(item => (item.data || '').slice(0, 10) === today);
  const hasAgua = state.data.agua.filter(item => (item.data || '').slice(0, 10) === today).reduce((sum, item) => sum + Number(item.quantidade || item.ml || 0), 0) >= CONFIG.aguaMeta;
  const hasPeso = state.data.peso.some(item => (item.data || '').slice(0, 10) === today);
  const streak = computeSpiderScore(state.data, CONFIG).streak;
  const hasMeasuresThisWeek = state.data.medidas.some(item => {
    const d = new Date(item.data || new Date());
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    return d >= weekAgo;
  });
  return [
    { name: 'Registrar treino', xp: 100, description: 'Treino salvo hoje', done: hasTreino },
    { name: 'Registrar corrida', xp: 120, description: 'Corrida salva hoje', done: hasCorrida },
    { name: 'Registrar alimentação', xp: 20, description: 'Refeição salva hoje', done: hasRefeicao },
    { name: 'Bater meta de água', xp: 10, description: 'Água >= meta do dia', done: hasAgua },
    { name: 'Registrar peso', xp: 15, description: 'Peso salvo hoje', done: hasPeso },
    { name: 'Sequência mantida', xp: 50, description: 'Registro em dias consecutivos', done: streak > 1 },
    { name: 'Registrar medidas', xp: 30, description: 'Medida salva esta semana', done: hasMeasuresThisWeek }
  ];
}

function getRecentActivity() {
  const items = [];
  state.data.treinos.forEach(item => items.push({ date: item.data, title: 'Treino', summary: `${item.tipo || 'Treino'} • ${item.duracao || '-'} min`, xp: item.xpGain || CONFIG.xp.treino }));
  state.data.corridas.forEach(item => items.push({ date: item.data, title: 'Corrida', summary: `${item.distancia || 0} km • ${item.tempo || '--:--:--'}`, xp: item.xpGain || CONFIG.xp.corrida }));
  state.data.peso.forEach(item => items.push({ date: item.data, title: 'Peso', summary: `${item.peso} kg`, xp: item.xpGain || CONFIG.xp.peso }));
  state.data.refeicoes.forEach(item => items.push({ date: item.data, title: 'Refeição', summary: `${item.tipo || 'Refeição'} • ${item.alimentos || '-'}`, xp: item.xpGain || CONFIG.xp.nutricao }));
  state.data.agua.forEach(item => items.push({ date: item.data, title: 'Água', summary: `${item.quantidade || item.ml || 0} ml`, xp: item.xpGain || CONFIG.xp.agua }));
  state.data.medidas.forEach(item => items.push({ date: item.data, title: 'Medidas', summary: 'Registro de medidas corporais', xp: 30 }));
  return items.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function buildExportData() {
  const now = new Date();
  const start = new Date(now); start.setDate(now.getDate() - 6);
  return {
    exportedAt: now.toISOString(),
    user: state.user?.username || 'admin',
    summary: computeSpiderScore(state.data, CONFIG),
    week: {
      treinos: state.data.treinos.filter(item => new Date(item.data) >= start),
      corridas: state.data.corridas.filter(item => new Date(item.data) >= start),
      peso: state.data.peso.filter(item => new Date(item.data) >= start),
      medidas: state.data.medidas.filter(item => new Date(item.data) >= start),
      refeicoes: state.data.refeicoes.filter(item => new Date(item.data) >= start),
      agua: state.data.agua.filter(item => new Date(item.data) >= start)
    }
  };
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

function exportJSON() {
  const payload = buildExportData();
  downloadFile('spider-semana.json', JSON.stringify(payload, null, 2), 'application/json');
  showToast('Exportação JSON criada', 'success');
}

function exportCSV() {
  const rows = [];
  const allEntries = [
    ...state.data.treinos.map(item => ({ type: 'treino', date: item.data, value: item.tipo || '-', note: item.duracao || '-' })),
    ...state.data.corridas.map(item => ({ type: 'corrida', date: item.data, value: item.distancia || '-', note: item.tempo || '-' })),
    ...state.data.peso.map(item => ({ type: 'peso', date: item.data, value: item.peso || '-', note: item.observacoes || '-' })),
    ...state.data.refeicoes.map(item => ({ type: 'refeicao', date: item.data, value: item.tipo || '-', note: item.alimentos || '-' })),
    ...state.data.agua.map(item => ({ type: 'agua', date: item.data, value: item.quantidade || item.ml || '-', note: '-' }))
  ];
  const header = 'type,date,value,note';
  const body = allEntries.map(row => `${row.type},${row.date},${row.value},${row.note}`).join('\n');
  downloadFile('spider-dados.csv', `${header}\n${body}`, 'text/csv');
  showToast('Exportação CSV criada', 'success');
}

function getSensacaoEmoji(value) {
  if (value >= 4) return '😄';
  if (value === 3) return '🙂';
  if (value === 2) return '😐';
  return '😣';
}

function persistData() {
  localStorage.setItem('spider_data', JSON.stringify(state.data));
}

function loadData() {
  const stored = safeParseJSON(localStorage.getItem('spider_data'), null);
  if (stored) state.data = { ...state.data, ...stored };
}

async function apiGet(action) {
  const res = await fetch(`${CONFIG.apiUrl}?action=${action}`);
  return res.json();
}

async function apiPost(payload) {
  const res = await fetch(CONFIG.apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

function wireEvents() {
  document.querySelectorAll('.nav-item').forEach(btn => btn.addEventListener('click', () => navigateTo(btn.dataset.page)));
  document.querySelectorAll('[data-page]').forEach(btn => btn.addEventListener('click', () => navigateTo(btn.dataset.page)));

  document.getElementById('themeToggle')?.addEventListener('click', () => {
    const isLight = document.documentElement.classList.toggle('light');
    localStorage.setItem('spider_theme', isLight ? 'light' : 'dark');
    document.getElementById('themeToggle').textContent = isLight ? 'Modo escuro' : 'Modo claro';
  });

  document.getElementById('mobileMenuButton')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('is-open');
    document.getElementById('sidebarScrim')?.classList.toggle('is-visible');
  });
  document.getElementById('sidebarScrim')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.remove('is-open');
    document.getElementById('sidebarScrim')?.classList.remove('is-visible');
  });

  document.getElementById('logoutButton')?.addEventListener('click', () => {
    clearStoredSession();
    state.user = null;
    document.getElementById('loginView')?.classList.remove('is-hidden');
    document.getElementById('appView')?.classList.add('is-hidden');
    showToast('Sessão encerrada', 'success');
  });

  document.getElementById('refreshButton')?.addEventListener('click', () => {
    loadData();
    updateXpUI();
    renderPage(state.currentPage);
    showToast('Dados atualizados', 'success');
  });

  document.getElementById('loginForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = document.getElementById('loginButton');
    const loader = button?.querySelector('.button-loader');
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const error = document.getElementById('loginError');
    if (button) button.disabled = true;
    if (loader) loader.style.display = 'inline-block';
    await new Promise(resolve => setTimeout(resolve, 600));

    let authenticatedUser = null;

    if (CONFIG.apiUrl) {
      try {
        const res = await apiPost({ action: 'login', username, password });
        if (res && res.ok !== false && res.data && res.data.user) {
          authenticatedUser = res.data.user;
        }
      } catch (apiError) {
        console.warn('Falha no login via Apps Script:', apiError);
      }
    }

    if (!authenticatedUser) {
      const users = safeParseJSON(localStorage.getItem('spider_users'), []);
      authenticatedUser = users.find(user => user.username === username && user.password === password);
    }

    if (!authenticatedUser) {
      if (error) error.textContent = 'Usuário ou senha inválidos.';
      if (button) button.disabled = false;
      if (loader) loader.style.display = 'none';
      return;
    }

    const displayName = authenticatedUser.name || authenticatedUser.username || username;
    state.user = {
      username: authenticatedUser.username || username,
      name: displayName,
      initials: getInitials(displayName),
      role: authenticatedUser.role || 'user',
    };

    setStoredSession(state.user);
    document.getElementById('loginView')?.classList.add('is-hidden');
    document.getElementById('appView')?.classList.remove('is-hidden');
    document.getElementById('userInitials').textContent = state.user.initials;
    document.getElementById('userName').textContent = state.user.name;
    updateXpUI();
    navigateTo('dashboard');
    if (button) button.disabled = false;
    if (loader) loader.style.display = 'none';
  });

  document.getElementById('btnSalvarConfig')?.addEventListener('click', () => {
    CONFIG.apiUrl = document.getElementById('cfgApiUrl').value;
    CONFIG.aguaMeta = Number(document.getElementById('cfgAguaMeta').value) || 2500;
    CONFIG.pesoMeta = Number(document.getElementById('cfgPesoMeta').value) || 0;
    localStorage.setItem('spider_api_url', CONFIG.apiUrl);
    localStorage.setItem('spider_agua_meta', String(CONFIG.aguaMeta));
    localStorage.setItem('spider_peso_meta', String(CONFIG.pesoMeta));
    showToast('Configurações salvas', 'success');
  });

  document.getElementById('btnExportJSON')?.addEventListener('click', exportJSON);
  document.getElementById('btnExportCSV')?.addEventListener('click', exportCSV);

  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', e => { if (e.target === modal) modal.close(); });
  });
  document.querySelectorAll('.modal-close').forEach(btn => btn.addEventListener('click', () => btn.closest('dialog')?.close()));

  document.querySelectorAll('.button-subtle[data-ml]').forEach(btn => btn.addEventListener('click', async () => {
    const qty = Number(btn.dataset.ml);
    const payload = { action: 'saveAgua', data: { data: new Date().toISOString(), quantidade: qty, xpGain: CONFIG.xp.agua } };
    state.data.agua.push(payload.data);
    persistData();
    updateXpUI();
    renderAgua();
    if (CONFIG.apiUrl) {
      try { await apiPost(payload); } catch { }
    }
    showToast(`+${qty} ml registrados`, 'success');
  }));

  document.getElementById('btnRegistrarAgua')?.addEventListener('click', () => openModal('aguaModal'));
  document.getElementById('btnNovoTreino')?.addEventListener('click', () => openModal('treinoModal'));
  document.getElementById('btnNovaCorrida')?.addEventListener('click', () => openModal('corridaModal'));
  document.getElementById('btnNovoPeso')?.addEventListener('click', () => openModal('pesoModal'));
  document.getElementById('btnNovasMedidas')?.addEventListener('click', () => openModal('medidasModal'));
  document.getElementById('btnNovaRefeicao')?.addEventListener('click', () => openModal('refeicaoModal'));

  document.getElementById('treinoForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    const record = { ...payload, data: payload.data || new Date().toISOString(), xpGain: CONFIG.xp.treino };
    state.data.treinos.push(record);
    persistData();
    updateXpUI();
    renderTreinos();
    renderDashboard();
    event.currentTarget.reset();
    closeModal('treinoModal');
    showToast('Treino registrado', 'success');
  });

  document.getElementById('corridaForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    const pace = payload.tempo && payload.distancia ? (payload.tempo.split(':').reduce((acc, part, idx) => acc + Number(part) * [3600, 60, 1][idx], 0) / Number(payload.distancia)).toFixed(2) : '—';
    const record = { ...payload, pace, data: payload.data || new Date().toISOString(), xpGain: CONFIG.xp.corrida };
    state.data.corridas.push(record);
    persistData();
    updateXpUI();
    renderCorridas();
    renderDashboard();
    event.currentTarget.reset();
    closeModal('corridaModal');
    showToast('Corrida registrada', 'success');
  });

  document.getElementById('pesoForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    const record = { ...payload, data: payload.data || new Date().toISOString(), xpGain: CONFIG.xp.peso };
    state.data.peso.push(record);
    persistData();
    updateXpUI();
    renderPeso();
    renderDashboard();
    event.currentTarget.reset();
    closeModal('pesoModal');
    showToast('Peso registrado', 'success');
  });

  document.getElementById('medidasForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    const record = { ...payload, data: payload.data || new Date().toISOString(), xpGain: 30 };
    state.data.medidas.push(record);
    persistData();
    updateXpUI();
    renderMedidas();
    renderDashboard();
    event.currentTarget.reset();
    closeModal('medidasModal');
    showToast('Medidas registradas', 'success');
  });

  document.getElementById('refeicaoForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    const record = { ...payload, data: payload.data || new Date().toISOString(), xpGain: CONFIG.xp.nutricao };
    state.data.refeicoes.push(record);
    persistData();
    updateXpUI();
    renderNutricao();
    renderDashboard();
    event.currentTarget.reset();
    closeModal('refeicaoModal');
    showToast('Refeição registrada', 'success');
  });

  document.getElementById('aguaForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    const record = { ...payload, data: payload.data || new Date().toISOString(), quantidade: payload.quantidade, xpGain: CONFIG.xp.agua };
    state.data.agua.push(record);
    persistData();
    updateXpUI();
    renderAgua();
    renderDashboard();
    event.currentTarget.reset();
    closeModal('aguaModal');
    showToast('Água registrada', 'success');
  });
}

function openModal(id) { document.getElementById(id)?.showModal(); }
function closeModal(id) { document.getElementById(id)?.close(); }

function bootstrap() {
  ensureDefaultUsers();
  loadData();
  const savedTheme = localStorage.getItem('spider_theme');
  if (savedTheme === 'light') document.documentElement.classList.add('light');
  const storedUser = safeParseJSON(getStoredSession(), null);
  if (storedUser) {
    state.user = storedUser;
    document.getElementById('loginView')?.classList.add('is-hidden');
    document.getElementById('appView')?.classList.remove('is-hidden');
    document.getElementById('userInitials').textContent = state.user.initials || getInitials(state.user.username);
    document.getElementById('userName').textContent = state.user.username;
    navigateTo('dashboard');
  } else {
    document.getElementById('appView')?.classList.add('is-hidden');
    document.getElementById('loginView')?.classList.remove('is-hidden');
  }
  wireEvents();
  updateXpUI();
  setLoading(false);
}

document.addEventListener('DOMContentLoaded', bootstrap);

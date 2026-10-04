/* ========================================================
   HEXSYNC·TH AUTO SYNC — INTERACTIVE SCRIPT & CYBER ENGINE
   MULTI-PROJECT & GITHUB CONFIGURATION
   ======================================================== */

// --- 1. Sound Effects Synth (Web Audio API) ---
let audioCtx = null;
let soundEnabled = true;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playCyberSound(type) {
  if (!soundEnabled) return;
  try {
    initAudio();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'sync') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.25);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'success') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.setValueAtTime(880, now + 0.1);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'detect') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(330, now + 0.08);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    }
  } catch (e) {
    // Ignore audio autoplay restrictions
  }
}

// --- 2. Cyber Canvas Background Animation ---
const canvas = document.getElementById('cyberCanvas');
const ctx = canvas.getContext('2d');
let width, height;
let particles = [];
let scanY = 0;

function resizeCanvas() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Particle {
  constructor() {
    this.reset();
  }
  reset() {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.size = Math.random() * 2 + 1;
    this.speedY = -(Math.random() * 0.8 + 0.2);
    this.speedX = (Math.random() - 0.5) * 0.4;
    this.alpha = Math.random() * 0.6 + 0.2;
    this.decay = Math.random() * 0.003 + 0.001;
  }
  update() {
    this.y += this.speedY;
    this.x += this.speedX;
    this.alpha -= this.decay;
    if (this.alpha <= 0 || this.y < 0) {
      this.reset();
      this.y = height + 10;
    }
  }
  draw() {
    ctx.save();
    ctx.fillStyle = `rgba(255, 0, 60, ${this.alpha})`;
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ff003c';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

for (let i = 0; i < 45; i++) {
  particles.push(new Particle());
}

function drawHexGrid() {
  const hexRadius = 45;
  const hexWidth = hexRadius * Math.sqrt(3);
  const hexHeight = hexRadius * 1.5;
  ctx.strokeStyle = 'rgba(255, 0, 60, 0.04)';
  ctx.lineWidth = 1;

  for (let y = -hexRadius; y < height + hexRadius * 2; y += hexHeight) {
    let row = Math.floor(y / hexHeight);
    let offsetX = (row % 2 === 0) ? 0 : hexWidth / 2;
    for (let x = -hexWidth + offsetX; x < width + hexWidth; x += hexWidth) {
      drawHexagon(x, y, hexRadius);
    }
  }
}

function drawHexagon(cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
}

function animateCanvas() {
  ctx.clearRect(0, 0, width, height);
  drawHexGrid();

  scanY += 1.5;
  if (scanY > height) scanY = 0;
  const scanGrad = ctx.createLinearGradient(0, scanY - 30, 0, scanY);
  scanGrad.addColorStop(0, 'rgba(255, 0, 60, 0)');
  scanGrad.addColorStop(1, 'rgba(255, 0, 60, 0.1)');
  ctx.fillStyle = scanGrad;
  ctx.fillRect(0, scanY - 30, width, 30);

  particles.forEach(p => {
    p.update();
    p.draw();
  });

  requestAnimationFrame(animateCanvas);
}
animateCanvas();

// --- 3. DOM Elements ---
const projectQuickSelect = document.getElementById('projectQuickSelect');
const openConfigBtn = document.getElementById('openConfigBtn');
const sfxToggleBtn = document.getElementById('sfxToggleBtn');
const sfxIcon = document.getElementById('sfxIcon');
const activeProjectPathDisplay = document.getElementById('activeProjectPathDisplay');
const activeRepoUrlDisplay = document.getElementById('activeRepoUrlDisplay');
const branchDisplay = document.getElementById('branchDisplay');
const systemStatePill = document.getElementById('systemStatePill');
const systemStateText = document.getElementById('systemStateText');
const orbStatusIcon = document.getElementById('orbStatusIcon');
const cyberOrb = document.getElementById('cyberOrb');
const debounceProgress = document.getElementById('debounceProgress');
const debounceSecDisplay = document.getElementById('debounceSecDisplay');
const pendingCount = document.getElementById('pendingCount');
const totalSyncsCount = document.getElementById('totalSyncsCount');
const lastSyncTime = document.getElementById('lastSyncTime');
const forceSyncBtn = document.getElementById('forceSyncBtn');
const toggleWatchBtn = document.getElementById('toggleWatchBtn');
const toggleWatchIcon = document.getElementById('toggleWatchIcon');
const toggleWatchText = document.getElementById('toggleWatchText');
const btnOpenGithub = document.getElementById('btnOpenGithub');
const linkGithubText = document.getElementById('linkGithubText');
const btnOpenVercelLive = document.getElementById('btnOpenVercelLive');
const linkVercelText = document.getElementById('linkVercelText');
const badgePendingMini = document.getElementById('badgePendingMini');
const emptyFilesState = document.getElementById('emptyFilesState');
const fileList = document.getElementById('fileList');
const terminalLogBody = document.getElementById('terminalLogBody');
const clearLogsBtn = document.getElementById('clearLogsBtn');
const portDisplay = document.getElementById('portDisplay');

// Modal Elements
const configModalOverlay = document.getElementById('configModalOverlay');
const closeConfigBtn = document.getElementById('closeConfigBtn');
const projectConfigForm = document.getElementById('projectConfigForm');
const cfgProjectName = document.getElementById('cfgProjectName');
const cfgProjectPath = document.getElementById('cfgProjectPath');
const cfgGithubUrl = document.getElementById('cfgGithubUrl');
const cfgVercelUrl = document.getElementById('cfgVercelUrl');
const cfgBranch = document.getElementById('cfgBranch');
const cfgDebounce = document.getElementById('cfgDebounce');
const btnBrowseFolder = document.getElementById('btnBrowseFolder');
const savedProjectsList = document.getElementById('savedProjectsList');

let isWatching = true;
let isSyncing = false;
let previousPendingCount = 0;
let lastRenderedLogCount = 0;
let currentProjects = [];
let activeProjectId = '';

// --- 4. Event Listeners ---
sfxToggleBtn.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  sfxIcon.textContent = soundEnabled ? '🔊' : '🔇';
  if (soundEnabled) playCyberSound('click');
});

forceSyncBtn.addEventListener('click', async () => {
  if (isSyncing) return;
  playCyberSound('sync');
  triggerSync();
});

toggleWatchBtn.addEventListener('click', async () => {
  playCyberSound('click');
  try {
    const res = await fetch('/api/toggle', { method: 'POST' });
    const data = await res.json();
    updateWatcherUI(data.is_watching);
  } catch (err) {
    console.error('Failed to toggle:', err);
  }
});

clearLogsBtn.addEventListener('click', () => {
  playCyberSound('click');
  terminalLogBody.innerHTML = '';
  lastRenderedLogCount = 0;
});

if (btnOpenGithub) {
  btnOpenGithub.addEventListener('click', (e) => {
    e.preventDefault();
    const url = btnOpenGithub.getAttribute('href');
    if (url && url !== '#') {
      window.openLiveWebsite(url);
    }
  });
}

if (btnOpenVercelLive) {
  btnOpenVercelLive.addEventListener('click', (e) => {
    e.preventDefault();
    const url = btnOpenVercelLive.getAttribute('href') || 'https://vercel.com';
    window.openLiveWebsite(url);
  });
}

// Modal Events
openConfigBtn.addEventListener('click', () => {
  playCyberSound('click');
  configModalOverlay.classList.add('active');
  fetchConfigDetails();
});

closeConfigBtn.addEventListener('click', () => {
  playCyberSound('click');
  configModalOverlay.classList.remove('active');
});

configModalOverlay.addEventListener('click', (e) => {
  if (e.target === configModalOverlay) {
    configModalOverlay.classList.remove('active');
  }
});

// Browse Folder Button
btnBrowseFolder.addEventListener('click', async () => {
  playCyberSound('click');
  try {
    const res = await fetch('/api/browse_folder', { method: 'POST' });
    const data = await res.json();
    if (data.path) {
      cfgProjectPath.value = data.path;
      if (!cfgProjectName.value) {
        const parts = data.path.replace(/\\/g, '/').split('/');
        cfgProjectName.value = parts[parts.length - 1] || 'My Project';
      }
      if (data.detected_remote) {
        cfgGithubUrl.value = data.detected_remote;
      }
    }
  } catch (err) {
    console.error('Browse failed:', err);
  }
});

// Save Project Form
projectConfigForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  playCyberSound('sync');

  const payload = {
    name: cfgProjectName.value.trim(),
    path: cfgProjectPath.value.trim(),
    github_url: cfgGithubUrl.value.trim(),
    vercel_url: cfgVercelUrl ? cfgVercelUrl.value.trim() : '',
    branch: cfgBranch.value.trim() || 'main',
    debounce: parseInt(cfgDebounce.value) || 5
  };

  try {
    const res = await fetch('/api/save_project', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.success) {
      playCyberSound('success');
      configModalOverlay.classList.remove('active');
      fetchStatus();
    } else {
      alert(result.error || 'Failed to save project');
    }
  } catch (err) {
    console.error('Error saving project:', err);
  }
});

// Project Selector Dropdown Change
projectQuickSelect.addEventListener('change', async () => {
  const selectedId = projectQuickSelect.value;
  if (!selectedId) return;
  playCyberSound('click');
  switchProject(selectedId);
});

async function switchProject(projectId) {
  try {
    const res = await fetch('/api/switch_project', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId })
    });
    const result = await res.json();
    if (result.success) {
      playCyberSound('success');
      fetchStatus();
    }
  } catch (err) {
    console.error('Failed to switch project:', err);
  }
}

async function triggerSync() {
  setSyncingState(true);
  try {
    const res = await fetch('/api/sync', { method: 'POST' });
    const result = await res.json();
    if (result.success) {
      playCyberSound('success');
    }
  } catch (err) {
    console.error('Sync failed:', err);
  } finally {
    setTimeout(() => {
      setSyncingState(false);
    }, 1500);
  }
}

function setSyncingState(syncing) {
  isSyncing = syncing;
  if (syncing) {
    systemStatePill.className = 'status-pill syncing';
    systemStateText.textContent = 'SYNCING TO CLOUD...';
    orbStatusIcon.textContent = '⚡';
    cyberOrb.style.filter = 'drop-shadow(0 0 25px #ff003c)';
    forceSyncBtn.disabled = true;
    forceSyncBtn.style.opacity = '0.7';
  } else {
    updateWatcherUI(isWatching);
    forceSyncBtn.disabled = false;
    forceSyncBtn.style.opacity = '1';
    cyberOrb.style.filter = '';
  }
}

function updateWatcherUI(watching) {
  isWatching = watching;
  if (isWatching) {
    systemStatePill.className = 'status-pill active';
    systemStateText.textContent = 'ARMED & WATCHING';
    toggleWatchIcon.textContent = '⏸';
    toggleWatchText.textContent = 'PAUSE AUTO-SYNC';
  } else {
    systemStatePill.className = 'status-pill paused';
    systemStateText.textContent = 'WATCHER PAUSED';
    toggleWatchIcon.textContent = '▶';
    toggleWatchText.textContent = 'RESUME AUTO-SYNC';
  }
}

// --- 5. Polling & Sync Status ---
async function fetchStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();

    if (data.port) portDisplay.textContent = data.port;
    if (data.active_path) activeProjectPathDisplay.textContent = data.active_path;
    if (data.branch) branchDisplay.textContent = data.branch;
    if (data.debounce_seconds) debounceSecDisplay.textContent = `${data.debounce_seconds}s`;

    if (data.github_url) {
      activeRepoUrlDisplay.textContent = data.repo_name || data.github_url;
      activeRepoUrlDisplay.href = data.github_url;
      btnOpenGithub.href = data.github_url;
      linkGithubText.textContent = data.repo_name || data.github_url;
    }

    if (btnOpenVercelLive && linkVercelText) {
      if (data.vercel_connected && data.vercel_url) {
        btnOpenVercelLive.href = data.vercel_url;
        linkVercelText.innerHTML = `<span style="color:#00f0ff;">🟢 LIVE:</span> ${escapeHtml(data.vercel_url.replace('https://', ''))}`;
        btnOpenVercelLive.setAttribute('title', `เข้าสู่เว็บจริง Vercel: ${data.vercel_url}`);
      } else {
        btnOpenVercelLive.href = 'https://vercel.com';
        linkVercelText.innerHTML = `<span style="color:#8b949e;">⚪ ยังไม่เชื่อม Vercel</span>`;
        btnOpenVercelLive.setAttribute('title', 'เปิด Vercel Console เพื่อเชื่อมต่อโปรเจกต์');
      }
    }

    if (!isSyncing) {
      updateWatcherUI(data.is_watching);
    }

    pendingCount.textContent = data.pending_count || 0;
    totalSyncsCount.textContent = data.total_syncs || 0;
    lastSyncTime.textContent = data.last_sync || '--:--:--';
    badgePendingMini.textContent = `${data.pending_count || 0} FILES`;

    if (data.debounce_percent !== undefined) {
      debounceProgress.style.width = `${data.debounce_percent}%`;
    }

    if (data.pending_count > 0 && previousPendingCount === 0) {
      playCyberSound('detect');
    }
    previousPendingCount = data.pending_count;

    renderFiles(data.pending_files || []);

    if (data.logs && data.logs.length > lastRenderedLogCount) {
      renderLogs(data.logs);
      lastRenderedLogCount = data.logs.length;
    }

    // Projects list in quick select
    if (data.projects) {
      currentProjects = data.projects;
      activeProjectId = data.active_project_id;
      renderQuickSelect(data.projects, data.active_project_id);
    }

  } catch (err) {
    // Network or server starting
  }
}

function renderQuickSelect(projects, activeId) {
  projectQuickSelect.innerHTML = projects.map(p => `
    <option value="${escapeHtml(p.id)}" ${p.id === activeId ? 'selected' : ''}>
      ${escapeHtml(p.name)} (${escapeHtml(p.branch)})
    </option>
  `).join('');
}

async function fetchConfigDetails() {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    if (data.active_project) {
      cfgProjectName.value = data.active_project.name || '';
      cfgProjectPath.value = data.active_project.path || '';
      cfgGithubUrl.value = data.active_project.github_url || '';
      cfgBranch.value = data.active_project.branch || 'main';
      cfgDebounce.value = data.active_project.debounce || 5;
    }
    renderSavedProjects(data.projects || [], data.active_project_id);
  } catch (err) {
    console.error('Failed to fetch config:', err);
  }
}

function renderSavedProjects(projects, activeId) {
  savedProjectsList.innerHTML = projects.map(p => `
    <li class="saved-project-item ${p.id === activeId ? 'active' : ''}">
      <div class="project-item-info">
        <span class="project-item-name">${escapeHtml(p.name)} ${p.id === activeId ? '🟢 [CURRENT]' : ''}</span>
        <span class="project-item-path">${escapeHtml(p.path)} ➔ ${escapeHtml(p.github_url || 'No remote')}</span>
      </div>
      <div class="project-item-actions">
        ${p.id !== activeId ? `<button type="button" class="switch-btn" onclick="handleSwitchProject('${escapeHtml(p.id)}')">SWITCH</button>` : ''}
        <button type="button" class="delete-btn" onclick="handleDeleteProject('${escapeHtml(p.id)}')">✕</button>
      </div>
    </li>
  `).join('');
}

window.handleSwitchProject = (id) => {
  switchProject(id);
  configModalOverlay.classList.remove('active');
};

window.handleDeleteProject = async (id) => {
  if (!confirm('ยืนยันลบโปรเจกต์นี้ออกจากรายการ?')) return;
  try {
    const res = await fetch('/api/delete_project', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: id })
    });
    fetchConfigDetails();
    fetchStatus();
  } catch (err) {
    console.error('Delete project failed:', err);
  }
};

function renderFiles(files) {
  if (files.length === 0) {
    emptyFilesState.style.display = 'flex';
    fileList.innerHTML = '';
  } else {
    emptyFilesState.style.display = 'none';
    fileList.innerHTML = files.map(f => {
      const parts = f.split(' ');
      const mode = parts[0] || 'M';
      const path = parts.slice(1).join(' ') || f;
      return `
        <li class="file-list-item">
          <span class="file-path">${escapeHtml(path)}</span>
          <span class="file-mod-type">${escapeHtml(mode)}</span>
        </li>
      `;
    }).join('');
  }
}

function renderLogs(logs) {
  const newLogs = logs.slice(lastRenderedLogCount);
  newLogs.forEach(log => {
    const line = document.createElement('div');
    line.className = `log-line ${log.level ? 'log-' + log.level : ''}`;
    line.innerHTML = `
      <span class="log-time">[${escapeHtml(log.time)}]</span>
      <span class="log-text">${escapeHtml(log.message)}</span>
    `;
    terminalLogBody.appendChild(line);
  });
  terminalLogBody.scrollTop = terminalLogBody.scrollHeight;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
}

// --- Window Controls (Frameless PyWebView) ---
const winMinBtn = document.getElementById('winMinBtn');
const winMaxBtn = document.getElementById('winMaxBtn');
const winCloseBtn = document.getElementById('winCloseBtn');

if (winMinBtn) {
  winMinBtn.addEventListener('click', () => {
    playCyberSound('click');
    if (window.pywebview && window.pywebview.api) {
      window.pywebview.api.minimize();
    }
  });
}

if (winMaxBtn) {
  winMaxBtn.addEventListener('click', () => {
    playCyberSound('click');
    if (window.pywebview && window.pywebview.api) {
      window.pywebview.api.toggle_maximize();
    }
  });
}

if (winCloseBtn) {
  winCloseBtn.addEventListener('click', () => {
    playCyberSound('click');
    if (window.pywebview && window.pywebview.api) {
      window.pywebview.api.close();
    } else {
      window.close();
    }
  });
}

// --- GitHub Repo Explorer Modal ---
const openGithubExplorerBtn = document.getElementById('openGithubExplorerBtn');
const githubModalOverlay = document.getElementById('githubModalOverlay');
const closeGithubModalBtn = document.getElementById('closeGithubModalBtn');
const fetchReposBtn = document.getElementById('fetchReposBtn');
const githubUsernameInput = document.getElementById('githubUsernameInput');
const githubReposList = document.getElementById('githubReposList');
const repoCountLabel = document.getElementById('repoCountLabel');

if (openGithubExplorerBtn) {
  openGithubExplorerBtn.addEventListener('click', () => {
    playCyberSound('click');
    githubModalOverlay.classList.add('active');
    if (!githubReposList.querySelector('.repo-card')) {
      fetchGithubRepos();
    }
  });
}

if (closeGithubModalBtn) {
  closeGithubModalBtn.addEventListener('click', () => {
    playCyberSound('click');
    githubModalOverlay.classList.remove('active');
  });
}

if (fetchReposBtn) {
  fetchReposBtn.addEventListener('click', () => {
    fetchGithubRepos();
  });
}

if (githubUsernameInput) {
  githubUsernameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      fetchGithubRepos();
    }
  });
}

window.openLiveWebsite = async function(url) {
  if (!url) return;
  playCyberSound('sync');
  try {
    await fetch('/api/open_browser', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url })
    });
  } catch (err) {
    console.warn('Backend open_browser error:', err);
  }
  try {
    window.open(url, '_blank');
  } catch (e) {}
};

async function fetchGithubRepos() {
  const username = (githubUsernameInput.value || 'daimond33140').trim();
  if (!username) return;

  playCyberSound('click');
  githubReposList.innerHTML = '<div class="empty-state">⏳ กำลังตรวจสอบ Repositories และสถานะ Vercel...</div>';
  repoCountLabel.textContent = 'กำลังตรวจสอบ...';

  try {
    const res = await fetch(`/api/github_repos?username=${encodeURIComponent(username)}`);
    const data = await res.json();

    if (!data.success || !data.repos || data.repos.length === 0) {
      githubReposList.innerHTML = `<div class="empty-state">❌ ไม่พบ Repositories ในบัญชี "${escapeHtml(username)}"</div>`;
      repoCountLabel.textContent = 'พบ 0 Repositories';
      return;
    }

    playCyberSound('success');
    repoCountLabel.textContent = `พบ ${data.repos.length} Repositories ใน @${data.username}`;

    githubReposList.innerHTML = data.repos.map(r => {
      const cloneUrl = r.clone_url || `https://github.com/${r.full_name}.git`;
      const branch = r.default_branch || 'main';
      const isVercelConnected = !!r.vercel_connected;
      const vercelUrl = r.vercel_url || `https://${r.name.toLowerCase().replace(/_/g, '-')}.vercel.app`;
      const importUrl = r.vercel_import_url || `https://vercel.com/new/import?s=https://github.com/${encodeURIComponent(username)}/${encodeURIComponent(r.name)}`;

      return `
        <div class="repo-card ${isVercelConnected ? 'vercel-active' : ''}">
          <div class="repo-top">
            <div class="repo-name">
              <span>📦</span>
              <span>${escapeHtml(r.name)}</span>
            </div>
            <div class="repo-desc">${escapeHtml(r.description)}</div>
          </div>

          <div class="repo-meta">
            <span class="repo-badge branch-badge">🌿 ${escapeHtml(branch)}</span>
            <span class="repo-badge">💻 ${escapeHtml(r.language)}</span>
            ${r.stars > 0 ? `<span class="repo-badge">⭐ ${r.stars}</span>` : ''}
            <span class="repo-badge">🕒 ${escapeHtml(r.updated_at)}</span>
          </div>

          <!-- สถานะ Vercel -->
          <div class="repo-vercel-box ${isVercelConnected ? 'is-connected' : 'is-unconnected'}">
            <div class="vercel-box-header">
              <span class="vercel-dot ${isVercelConnected ? 'dot-live' : 'dot-off'}"></span>
              <span class="vercel-box-title">${isVercelConnected ? 'เชื่อมกับ VERCEL แล้ว (LIVE)' : 'ยังไม่ได้เชื่อมต่อกับ VERCEL'}</span>
            </div>
            ${isVercelConnected ? `
              <div class="vercel-url-preview" onclick="openLiveWebsite('${escapeHtml(vercelUrl)}')" title="คลิกเพื่อเข้าสู่เว็บจริง: ${escapeHtml(vercelUrl)}">
                <span class="v-url-icon">🌐</span>
                <span class="v-url-text">${escapeHtml(vercelUrl.replace('https://', ''))}</span>
                <span class="v-jump-arrow">↗</span>
              </div>
            ` : `
              <div class="vercel-empty-hint">ยังไม่มีการ Deploy บน Vercel</div>
            `}
          </div>

          <!-- ปุ่มการทำงาน -->
          <div class="repo-card-actions">
            <button class="repo-use-btn" title="กำหนดให้โปรเจกต์ปัจจุบันเชื่อมกับ Repo นี้" onclick="selectRepoForActiveProject('${escapeHtml(cloneUrl)}', '${escapeHtml(branch)}', '${escapeHtml(r.name)}')">
              <span>🔗 เชื่อมกับโปรเจกต์นี้</span>
            </button>
            ${isVercelConnected ? `
              <button class="repo-live-btn" title="เด้งเปิดหน้าเว็บจริงบน Vercel ทันที" onclick="openLiveWebsite('${escapeHtml(vercelUrl)}')">
                <span class="btn-live-icon">🚀</span>
                <span>เข้าสู่เว็บจริง</span>
                <span class="btn-jump-arrow">↗</span>
              </button>
            ` : `
              <button class="repo-vercel-btn" title="เปิดหน้า Vercel เพื่อเชื่อมต่อกับ Repo นี้" onclick="openLiveWebsite('${escapeHtml(importUrl)}')">
                <span class="btn-live-icon">▲</span>
                <span>เชื่อมต่อ Vercel</span>
                <span class="btn-jump-arrow">↗</span>
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Fetch github repos error:', err);
    githubReposList.innerHTML = '<div class="empty-state">⚠️ ไม่สามารถเชื่อมต่อกับ GitHub ได้</div>';
  }
}

window.selectRepoForActiveProject = async function(repoUrl, branch, repoName) {
  playCyberSound('sync');
  try {
    const res = await fetch('/api/set_repo_for_project', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo_url: repoUrl, branch: branch })
    });
    const d = await res.json();
    if (d.success) {
      playCyberSound('success');
      githubModalOverlay.classList.remove('active');
      fetchStatus();
    } else {
      alert('ไม่สามารถเชื่อมต่อได้: ' + (d.error || 'Unknown error'));
    }
  } catch (err) {
    console.error('Set repo error:', err);
  }
};

document.addEventListener('contextmenu', e => e.preventDefault());

fetchStatus();
setInterval(fetchStatus, 1500);


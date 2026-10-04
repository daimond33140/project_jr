/* ========================================================
   HEXSYNC·TH AUTO SYNC — INTERACTIVE SCRIPT & CYBER ENGINE
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
      // Tech laser charge
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.25);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'success') {
      // Two-tone high chime
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.1); // A5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'detect') {
      // Alert pulse
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(330, now + 0.08);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    }
  } catch (e) {
    // Ignore audio context autoplay errors
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

// Hexagon Grid Drawing Helper
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

  // Draw hex grid
  drawHexGrid();

  // Draw moving scan laser
  scanY += 1.5;
  if (scanY > height) scanY = 0;
  const scanGrad = ctx.createLinearGradient(0, scanY - 30, 0, scanY);
  scanGrad.addColorStop(0, 'rgba(255, 0, 60, 0)');
  scanGrad.addColorStop(1, 'rgba(255, 0, 60, 0.1)');
  ctx.fillStyle = scanGrad;
  ctx.fillRect(0, scanY - 30, width, 30);

  // Update particles
  particles.forEach(p => {
    p.update();
    p.draw();
  });

  requestAnimationFrame(animateCanvas);
}
animateCanvas();

// --- 3. DOM Elements & State ---
const repoNameDisplay = document.getElementById('repoNameDisplay');
const branchDisplay = document.getElementById('branchDisplay');
const sfxToggleBtn = document.getElementById('sfxToggleBtn');
const sfxIcon = document.getElementById('sfxIcon');
const systemStatePill = document.getElementById('systemStatePill');
const systemStateText = document.getElementById('systemStateText');
const orbStatusIcon = document.getElementById('orbStatusIcon');
const cyberOrb = document.getElementById('cyberOrb');
const debounceProgress = document.getElementById('debounceProgress');
const pendingCount = document.getElementById('pendingCount');
const totalSyncsCount = document.getElementById('totalSyncsCount');
const lastSyncTime = document.getElementById('lastSyncTime');
const forceSyncBtn = document.getElementById('forceSyncBtn');
const toggleWatchBtn = document.getElementById('toggleWatchBtn');
const toggleWatchIcon = document.getElementById('toggleWatchIcon');
const toggleWatchText = document.getElementById('toggleWatchText');
const badgePendingMini = document.getElementById('badgePendingMini');
const emptyFilesState = document.getElementById('emptyFilesState');
const fileList = document.getElementById('fileList');
const terminalLogBody = document.getElementById('terminalLogBody');
const clearLogsBtn = document.getElementById('clearLogsBtn');
const portDisplay = document.getElementById('portDisplay');

let isWatching = true;
let isSyncing = false;
let previousPendingCount = 0;
let lastRenderedLogCount = 0;

// SFX Toggle
sfxToggleBtn.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  sfxIcon.textContent = soundEnabled ? '🔊' : '🔇';
  if (soundEnabled) playCyberSound('click');
});

// Force Sync Button
forceSyncBtn.addEventListener('click', async () => {
  if (isSyncing) return;
  playCyberSound('sync');
  triggerSync();
});

// Toggle Watcher Button
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

// Clear Logs Button
clearLogsBtn.addEventListener('click', () => {
  playCyberSound('click');
  terminalLogBody.innerHTML = '';
  lastRenderedLogCount = 0;
});

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

// --- 4. Polling API Status ---
async function fetchStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();

    // Port display
    if (data.port) {
      portDisplay.textContent = data.port;
    }

    // Repo and Branch
    if (data.repo_name) {
      repoNameDisplay.textContent = data.repo_name;
    }
    if (data.branch) {
      branchDisplay.textContent = data.branch;
    }

    // Watching status
    if (!isSyncing) {
      updateWatcherUI(data.is_watching);
    }

    // Metrics
    pendingCount.textContent = data.pending_count || 0;
    totalSyncsCount.textContent = data.total_syncs || 0;
    lastSyncTime.textContent = data.last_sync || '--:--:--';
    badgePendingMini.textContent = `${data.pending_count || 0} FILES`;

    // Debounce progress bar
    if (data.debounce_percent !== undefined) {
      debounceProgress.style.width = `${data.debounce_percent}%`;
    }

    // Sound if new changes detected
    if (data.pending_count > 0 && previousPendingCount === 0) {
      playCyberSound('detect');
    }
    previousPendingCount = data.pending_count;

    // Render modified files
    renderFiles(data.pending_files || []);

    // Render terminal logs
    if (data.logs && data.logs.length > lastRenderedLogCount) {
      renderLogs(data.logs);
      lastRenderedLogCount = data.logs.length;
    }

  } catch (err) {
    // Network or server starting
  }
}

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
  // Auto scroll to bottom
  terminalLogBody.scrollTop = terminalLogBody.scrollHeight;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
}

// Initial Call and Interval Loop
fetchStatus();
setInterval(fetchStatus, 1500);

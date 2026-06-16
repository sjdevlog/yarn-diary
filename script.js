// ===== 데이터 저장 (localStorage) =====

// localStorage에 저장할 때 쓸 키 이름들
const STORAGE_KEYS = {
  projects: 'yarnDiary.projects',
  completed: 'yarnDiary.completed',
  wishlist: 'yarnDiary.wishlist',
  stash: 'yarnDiary.stash',
};

// key로 저장된 값을 불러온다. 저장된 게 없으면 fallback(기본값)을 돌려준다.
function loadData(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error(`${key} 데이터를 읽는 중 오류:`, err);
    return fallback;
  }
}

// value를 JSON 문자열로 바꿔서 localStorage에 저장한다.
function saveData(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// 앱의 모든 데이터를 담는 객체. 페이지를 열 때 저장된 값을 불러온다.
const state = {
  projects: loadData(STORAGE_KEYS.projects, []),
  completed: loadData(STORAGE_KEYS.completed, []),
  wishlist: loadData(STORAGE_KEYS.wishlist, []),
  stash: loadData(STORAGE_KEYS.stash, { yarns: [], tools: [] }),
};

// 새 항목마다 겹치지 않는 id를 만들어주는 함수
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

console.log('불러온 데이터:', state);


// ===== 별사탕 흩날리는 배경 =====

const STAR_PATH = 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 13.14 2 9.27l6.91-1.01z';
const STAR_COLORS = ['var(--pink)', 'var(--yellow)', 'var(--orange)', 'var(--sky)', 'var(--purple)', 'var(--primary)'];

function createStarField() {
  const field = document.querySelector('.star-field');
  const count = 14;

  for (let i = 0; i < count; i++) {
    const size = 8 + Math.random() * 12;
    const left = Math.random() * 100;
    const duration = 5 + Math.random() * 5;
    const delay = -(Math.random() * duration);
    const color = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)];

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('falling-star');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.style.width = `${size}px`;
    svg.style.height = `${size}px`;
    svg.style.left = `${left}%`;
    svg.style.color = color;
    svg.style.animationDuration = `${duration}s`;
    svg.style.animationDelay = `${delay}s`;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', STAR_PATH);
    svg.appendChild(path);
    field.appendChild(svg);
  }
}

createStarField();


// ===== 탭 전환 기능 =====

const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.panel');
const indicator = document.querySelector('.tab-indicator');

const TAB_NAMES = ['progress', 'gallery', 'wishlist', 'stash'];

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    switchTab(tab.dataset.tab);
  });
});

function switchTab(name) {
  // 클릭한 탭과 같은 이름을 가진 탭/패널에만 active 클래스를 붙인다
  tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
  panels.forEach((p) => p.classList.toggle('active', p.dataset.panel === name));

  // 밑줄(인디케이터)을 해당 탭 위치로 이동
  const index = TAB_NAMES.indexOf(name);
  indicator.style.transform = `translateX(${index * 100}%)`;
}

// 하단 탭에 속하지 않는 화면(새 프로젝트 등)으로 넘어갈 때 쓴다.
// 탭 바/인디케이터는 그대로 두고 패널만 바꾼다.
function showPanel(name) {
  panels.forEach((p) => p.classList.toggle('active', p.dataset.panel === name));
}


// ===== 진행 중인 프로젝트 =====

const projectForm = document.getElementById('project-form');
const showProjectFormBtn = document.getElementById('show-project-form');
const cancelProjectFormBtn = document.getElementById('cancel-project-form');
const projectList = document.getElementById('project-list');

showProjectFormBtn.addEventListener('click', () => {
  showPanel('new-project');
});

cancelProjectFormBtn.addEventListener('click', () => {
  projectForm.reset();
  showPanel('progress');
});

projectForm.addEventListener('submit', (e) => {
  e.preventDefault(); // 기본 동작(페이지 새로고침)을 막는다

  const project = {
    id: uid(),
    name: document.getElementById('project-name').value.trim(),
    patternLink: document.getElementById('project-pattern').value.trim(),
    yarn: document.getElementById('project-yarn').value.trim(),
    needle: document.getElementById('project-needle').value.trim(),
    notes: document.getElementById('project-notes').value.trim(),
    currentRow: 0,
    targetRow: document.getElementById('project-target').value
      ? Number(document.getElementById('project-target').value)
      : null,
    totalSeconds: 0,      // 누적된 작업 시간(초)
    timerStartedAt: null, // 타이머가 켜져있다면 시작 시각, 꺼져있으면 null
  };

  state.projects.push(project);
  saveData(STORAGE_KEYS.projects, state.projects);

  projectForm.reset();
  showPanel('progress');
  renderProjects();
});

// 사용자가 입력한 텍스트에 <, >, & 같은 글자가 있어도
// 화면이 깨지지 않도록 안전한 문자로 바꿔준다
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// http(s)로 시작하는 안전한 링크만 통과시킨다 (https:// 빠뜨려도 자동 보정)
function safeUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.href;
  } catch (e) {}
  return '';
}

// 현재 진행 중인 타이머 시간까지 포함한 "총 시간(초)"을 계산한다
function getElapsedSeconds(project) {
  if (!project.timerStartedAt) return project.totalSeconds;
  const runningFor = Math.floor((Date.now() - project.timerStartedAt) / 1000);
  return project.totalSeconds + runningFor;
}

// 초 단위 숫자를 "HH:MM:SS" 문자열로 바꾼다
function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function renderProjects() {
  if (state.projects.length === 0) {
    projectList.innerHTML = `
      <div class="empty">
        <p>아직 시작한 프로젝트가 없어요.</p>
        <p>+ 새 프로젝트 버튼으로 추가해보세요.</p>
      </div>`;
    return;
  }

  projectList.innerHTML = state.projects.map((p) => {
    const hasTarget = p.targetRow != null && p.targetRow > 0;
    const pct = hasTarget ? Math.min(100, Math.round((p.currentRow / p.targetRow) * 100)) : 0;

    return `
    <div class="card">
      <h3>${escapeHtml(p.name)}</h3>
      <p class="meta">
        ${p.yarn ? `실: ${escapeHtml(p.yarn)}` : ''}
        ${p.yarn && p.needle ? ' · ' : ''}
        ${p.needle ? `바늘: ${escapeHtml(p.needle)}` : ''}
      </p>

      <div class="counter">
        <button class="counter-btn" data-action="row-dec" data-id="${p.id}">−</button>
        <div class="counter-display">
          <span class="counter-num">${p.currentRow}</span>
          <span class="counter-target">${hasTarget ? `/ ${p.targetRow}단` : '단'}</span>
        </div>
        <button class="counter-btn" data-action="row-inc" data-id="${p.id}">+</button>
      </div>
      ${hasTarget ? `
        <div class="progress-bar">
          <div class="progress-fill" style="width:${pct}%"></div>
        </div>
      ` : ''}

      <div class="timer-row">
        <button class="timer-btn ${p.timerStartedAt ? 'running' : ''}" data-action="timer-toggle" data-id="${p.id}">
          ${p.timerStartedAt ? '⏸' : '▶'}
        </button>
        <span class="timer-display" data-timer-display="${p.id}">${formatTime(getElapsedSeconds(p))}</span>
      </div>

      ${p.notes ? `<p class="notes">${escapeHtml(p.notes)}</p>` : ''}
      ${safeUrl(p.patternLink) ? `<a class="pattern-link" href="${safeUrl(p.patternLink)}" target="_blank" rel="noopener">도안 보기 →</a>` : ''}
    </div>
  `;
  }).join('');
}

// 카드 안의 +/−/타이머 버튼 클릭을 처리한다 (이벤트 위임)
projectList.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const project = state.projects.find((p) => p.id === btn.dataset.id);
  if (!project) return;

  if (btn.dataset.action === 'row-inc') {
    project.currentRow += 1;
  } else if (btn.dataset.action === 'row-dec') {
    project.currentRow = Math.max(0, project.currentRow - 1);
  } else if (btn.dataset.action === 'timer-toggle') {
    if (project.timerStartedAt) {
      // 타이머 끄기: 지금까지 흐른 시간을 totalSeconds에 더해서 확정
      project.totalSeconds = getElapsedSeconds(project);
      project.timerStartedAt = null;
    } else {
      // 타이머 켜기: 시작 시각만 기록
      project.timerStartedAt = Date.now();
    }
  }

  saveData(STORAGE_KEYS.projects, state.projects);
  renderProjects();
});

renderProjects();

// 1초마다, 켜져있는 타이머가 있으면 시간 표시만 업데이트한다
setInterval(() => {
  const running = state.projects.filter((p) => p.timerStartedAt);
  running.forEach((p) => {
    const el = document.querySelector(`[data-timer-display="${p.id}"]`);
    if (el) el.textContent = formatTime(getElapsedSeconds(p));
  });
}, 1000);
/* ── Agent Toolchain Dashboard — Frontend Logic ──────────────────── */

// ── i18n ─────────────────────────────────────────────────────────

const i18n = {
  zh: {
    // Sidebar
    overview: '总览', skills: 'Skills 管理', repos: '仓库同步', activity: '执行日志',
    brand_subtitle: 'Skill 管理面板',
    // Header
    search_placeholder: '搜索 Skill...',
    new_skill: '➕ 新建 Skill',
    // Overview
    total_skills: '总 Skill 数', total_executions: '总执行次数',
    used_skills: '已使用', unused_skills: '未使用',
    most_used: '🔥 最常使用', categories: '📂 分类分布',
    recent_activity: '🕒 最近活动',
    // Skills page
    all: '全部',
    content: '内容生产', methodology: '方法论', infrastructure: '基础设施',
    memory: '记忆', 'dev-patterns': '开发模式', tools: '工具',
    files_suffix: '个文件', no_desc: '暂无描述',
    no_match: '没有匹配的 Skill',
    // Detail
    back: '← 返回', edit: '✏️ 编辑', delete: '🗑️ 删除',
    has_scripts: '含脚本', has_references: '含参考文档',
    tab_content: '📝 SKILL.md', tab_files: '📂 文件列表',
    file_list: '← 文件列表',
    confirm_delete: '确定要删除 "{name}" 吗？\n这将移除整个目录，不可恢复。',
    deleted: 'Skill "{name}" 已删除',
    updated: 'Skill "{name}" 已更新',
    // Repos
    last_commit: '最近提交', status: '状态', remote: '远程仓库',
    clean: '✅ 干净', dirty: '个未提交的变更',
    connected: '✅ 已连接', no_remote: '❌ 未连接',
    commit_push: '🔄 提交并推送',
    synced: '同步成功', nothing_commit: '没有需要提交的变更',
    // Activity
    no_logs: '暂无执行日志', agent_dist: '📊 Agent 分布',
    // Modal
    modal_create: '➕ 新建 Skill', modal_edit: '✏️ 编辑: {name}',
    label_name: 'Skill 名称', label_desc: '简要描述',
    label_content: 'SKILL.md 内容',
    create_scripts: '创建 scripts/', create_references: '创建 references/',
    cancel: '取消', save: '💾 保存',
    name_required: 'Skill 名称不能为空',
    created: 'Skill "{name}" 已创建',
    // Language
    lang_toggle: '🌐 English',
    // Sidebar stats
    sidebar_skills: 'Skills', sidebar_exec: '执行次数',
    // Time
    just_now: '刚刚', m_ago: '{n}分钟前', h_ago: '{n}小时前', d_ago: '{n}天前',
  },
  en: {
    overview: 'Overview', skills: 'Skills', repos: 'Repositories', activity: 'Activity Log',
    brand_subtitle: 'Skill Management Dashboard',
    search_placeholder: 'Search skills...',
    new_skill: '➕ New Skill',
    total_skills: 'Total Skills', total_executions: 'Total Executions',
    used_skills: 'Used Skills', unused_skills: 'Unused Skills',
    most_used: '🔥 Most Used Skills', categories: '📂 Categories',
    recent_activity: '🕒 Recent Activity',
    all: 'All',
    content: 'Content', methodology: 'Methodology', infrastructure: 'Infrastructure',
    memory: 'Memory', 'dev-patterns': 'Dev Patterns', tools: 'Tools',
    files_suffix: 'files', no_desc: 'No description',
    no_match: 'No skills match your search',
    back: '← Back', edit: '✏️ Edit', delete: '🗑️ Delete',
    has_scripts: 'Has scripts', has_references: 'Has references',
    tab_content: '📝 SKILL.md', tab_files: '📂 Files',
    file_list: '← File list',
    confirm_delete: 'Are you sure you want to delete "{name}"?\nThis will remove the entire directory.',
    deleted: 'Skill "{name}" deleted',
    updated: 'Skill "{name}" updated',
    last_commit: 'Last commit', status: 'Status', remote: 'Remote',
    clean: '✅ Clean', dirty: 'uncommitted changes',
    connected: '✅ Connected', no_remote: '❌ No remote',
    commit_push: '🔄 Commit & Push',
    synced: 'Synced successfully', nothing_commit: 'Nothing to commit',
    no_logs: 'No execution logs yet', agent_dist: '📊 Agent Distribution',
    modal_create: '➕ New Skill', modal_edit: '✏️ Edit: {name}',
    label_name: 'Skill Name', label_desc: 'Description',
    label_content: 'SKILL.md Content',
    create_scripts: 'Create scripts/', create_references: 'Create references/',
    cancel: 'Cancel', save: '💾 Save',
    name_required: 'Skill name is required',
    created: 'Skill "{name}" created',
    lang_toggle: '🌐 中文',
    sidebar_skills: 'Skills', sidebar_exec: 'Executions',
    just_now: 'just now', m_ago: '{n}m ago', h_ago: '{n}h ago', d_ago: '{n}d ago',
  }
};

let currentLang = localStorage.getItem('dashboard-lang') || 'zh';

function t(key, params = {}) {
  let text = i18n[currentLang]?.[key] || i18n.en[key] || key;
  Object.entries(params).forEach(([k, v]) => { text = text.replace(`{${k}}`, v); });
  return text;
}

function toggleLang() {
  currentLang = currentLang === 'zh' ? 'en' : 'zh';
  localStorage.setItem('dashboard-lang', currentLang);
  updateStaticUI();
  navigateTo(currentPage, currentPage === 'detail' ? currentDetailSkill : null);
}

function updateStaticUI() {
  document.getElementById('brand-subtitle').textContent = t('brand_subtitle');
  document.getElementById('search-input').placeholder = t('search_placeholder');
  document.getElementById('btn-create-skill').innerHTML = t('new_skill');
  document.getElementById('lang-toggle').innerHTML = t('lang_toggle');

  // Sidebar nav labels
  document.querySelectorAll('.sidebar-nav button[data-page]').forEach(btn => {
    const page = btn.dataset.page;
    const icon = btn.querySelector('.nav-icon').textContent;
    btn.innerHTML = `<span class="nav-icon">${icon}</span> ${t(page)}`;
  });
  // Re-apply active class
  document.querySelectorAll('.sidebar-nav button[data-page]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === currentPage);
  });

  document.getElementById('sidebar-label-skills').textContent = t('sidebar_skills');
  document.getElementById('sidebar-label-exec').textContent = t('sidebar_exec');
}

// ── State ────────────────────────────────────────────────────────

const API = '';
let allSkills = [];
let currentPage = 'overview';
let currentFilter = 'all';
let editingSkill = null;
let currentDetailSkill = null;

// ── API Helpers ──────────────────────────────────────────────────

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ── Toast Notifications ─────────────────────────────────────────

function toast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  el.innerHTML = `<span>${icons[type] || ''}</span> ${message}`;
  container.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3000);
}

// ── Navigation ──────────────────────────────────────────────────

document.querySelectorAll('.sidebar-nav button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sidebar-nav button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    navigateTo(btn.dataset.page);
  });
});

function navigateTo(page, data = null) {
  currentPage = page;
  if (page === 'detail') currentDetailSkill = data;
  document.getElementById('page-title').textContent = page === 'detail' ? (data || '') : t(page);

  // Update sidebar active state
  document.querySelectorAll('.sidebar-nav button[data-page]').forEach(b => {
    b.classList.toggle('active', b.dataset.page === page || (page === 'detail' && b.dataset.page === 'skills'));
  });

  const main = document.getElementById('main-content');
  main.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

  switch (page) {
    case 'overview': renderOverview(); break;
    case 'skills': renderSkills(); break;
    case 'repos': renderRepos(); break;
    case 'activity': renderActivity(); break;
    case 'detail': renderDetail(data); break;
  }
}

// ── Page: Overview ──────────────────────────────────────────────

async function renderOverview() {
  const main = document.getElementById('main-content');
  try {
    const [skillsData, stats, repos] = await Promise.all([
      api('/api/skills'),
      api('/api/stats'),
      api('/api/repos'),
    ]);
    allSkills = skillsData.skills;
    updateSidebarStats(allSkills.length, stats.total_executions);

    const categories = {};
    allSkills.forEach(s => { categories[s.category] = (categories[s.category] || 0) + 1; });

    const topSkills = Object.entries(stats.by_skill).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const usedCount = Object.keys(stats.by_skill).length;
    const maxSkillUsage = topSkills.length ? topSkills[0][1] : 1;
    const maxCatUsage = Object.values(categories).length ? Math.max(...Object.values(categories)) : 1;

    main.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon">⚡</div><div class="stat-number">${allSkills.length}</div><div class="stat-label">${t('total_skills')}</div></div>
        <div class="stat-card"><div class="stat-icon">📈</div><div class="stat-number">${stats.total_executions}</div><div class="stat-label">${t('total_executions')}</div></div>
        <div class="stat-card"><div class="stat-icon">✅</div><div class="stat-number">${usedCount}</div><div class="stat-label">${t('used_skills')}</div></div>
        <div class="stat-card"><div class="stat-icon">💤</div><div class="stat-number">${allSkills.length - usedCount}</div><div class="stat-label">${t('unused_skills')}</div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
        <div>
          <div class="section-title">${t('most_used')}</div>
          <div class="detail-content">
            ${topSkills.length ? topSkills.map(([name, count]) => {
              const pct = Math.max(2, Math.round(count / maxSkillUsage * 100));
              return `
              <div style="margin-bottom:14px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                  <span style="font-weight:600;cursor:pointer;color:var(--text-accent);font-size:0.85rem;" onclick="navigateTo('detail','${name}')">${name}</span>
                  <span style="color:var(--text-secondary);font-weight:600;font-size:0.8rem;">${count}×</span>
                </div>
                <div style="width:100%;height:6px;background:var(--bg-input);border-radius:var(--radius-full);overflow:hidden;">
                  <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--accent-amber),var(--accent-red));border-radius:var(--radius-full);transition:width 0.5s ease;"></div>
                </div>
              </div>
            `;}).join('') : `<div class="empty-state"><p>${t('no_logs')}</p></div>`}
          </div>
        </div>
        <div>
          <div class="section-title">${t('categories')}</div>
          <div class="detail-content">
            ${Object.entries(categories).sort((a,b) => b[1] - a[1]).map(([cat, count]) => {
              const pct = Math.max(2, Math.round(count / maxCatUsage * 100));
              return `
              <div style="margin-bottom:14px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                  <span class="badge badge-${cat}">${t(cat)}</span>
                  <span style="color:var(--text-secondary);font-weight:600;font-size:0.8rem;">${count}</span>
                </div>
                <div style="width:100%;height:6px;background:var(--bg-input);border-radius:var(--radius-full);overflow:hidden;">
                  <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--accent-blue),var(--accent-cyan));border-radius:var(--radius-full);transition:width 0.5s ease;"></div>
                </div>
              </div>
            `;}).join('')}
          </div>
        </div>
      </div>
      ${stats.recent.length ? `
        <div style="margin-top:28px;">
          <div class="section-title">${t('recent_activity')}</div>
          <div class="detail-content">
            <ul class="activity-list">
              ${stats.recent.slice(0, 8).map(e => `
                <li class="activity-item">
                  <div class="activity-icon ${e.status}">${e.status === 'success' ? '✅' : '❌'}</div>
                  <div class="activity-detail"><span class="activity-skill">${e.skill}</span><span class="activity-agent"> · ${e.agent}</span></div>
                  <span class="activity-time">${formatTime(e.timestamp)}</span>
                </li>
              `).join('')}
            </ul>
          </div>
        </div>
      ` : ''}
    `;
  } catch (err) {
    main.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
  }
}

// ── Page: Skills List ───────────────────────────────────────────

async function renderSkills() {
  const main = document.getElementById('main-content');
  try {
    if (!allSkills.length) { allSkills = (await api('/api/skills')).skills; }
    updateSidebarStats(allSkills.length);
    renderSkillsList(allSkills);
  } catch (err) {
    main.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
  }
}

function renderSkillsList(skills) {
  const main = document.getElementById('main-content');
  const categories = { all: skills.length };
  skills.forEach(s => { categories[s.category] = (categories[s.category] || 0) + 1; });

  const filtered = currentFilter === 'all' ? skills : skills.filter(s => s.category === currentFilter);
  const q = document.getElementById('search-input').value.toLowerCase();
  const displayed = q ? filtered.filter(s => s.name.includes(q) || s.description.toLowerCase().includes(q)) : filtered;

  main.innerHTML = `
    <div class="filter-bar">
      ${Object.entries(categories).map(([cat, cnt]) => `
        <button class="filter-btn ${currentFilter === cat ? 'active' : ''}" data-filter="${cat}">
          ${t(cat)}<span class="count">${cnt}</span>
        </button>
      `).join('')}
    </div>
    <div class="skills-grid">
      ${displayed.map(s => `
        <div class="skill-card" data-skill="${s.name}">
          <div class="skill-name"><span class="badge badge-${s.category}">${t(s.category)}</span>${s.name}</div>
          <div class="skill-desc">${escapeHtml(s.description) || `<em style="color:var(--text-muted)">${t('no_desc')}</em>`}</div>
          <div class="skill-meta">
            <span>📄 ${s.file_count} ${t('files_suffix')}</span>
            ${s.has_scripts ? '<span>⚙️ scripts</span>' : ''}
            ${s.modified ? `<span>🕒 ${formatTime(s.modified)}</span>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
    ${!displayed.length ? `<div class="empty-state"><div class="empty-icon">🔍</div><p>${t('no_match')}</p></div>` : ''}
  `;

  main.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => { currentFilter = btn.dataset.filter; renderSkillsList(skills); });
  });
  main.querySelectorAll('.skill-card').forEach(card => {
    card.addEventListener('click', () => navigateTo('detail', card.dataset.skill));
  });
}

// ── Page: Skill Detail ──────────────────────────────────────────

async function renderDetail(skillName) {
  const main = document.getElementById('main-content');
  document.getElementById('page-title').textContent = skillName;
  try {
    const skill = await api(`/api/skills/${skillName}`);
    let activeTab = 'content';

    function render() {
      main.innerHTML = `
        <div class="detail-header">
          <h2><span class="badge badge-${skill.category}">${t(skill.category)}</span>${skill.name}</h2>
          <div class="detail-actions">
            <button class="btn btn-ghost" id="btn-back">${t('back')}</button>
            <button class="btn btn-primary" id="btn-edit">${t('edit')}</button>
            <button class="btn btn-danger" id="btn-delete">${t('delete')}</button>
          </div>
        </div>
        <div class="detail-meta">
          <div class="meta-item">📄 ${skill.file_count} ${t('files_suffix')}</div>
          ${skill.has_scripts ? `<div class="meta-item">⚙️ ${t('has_scripts')}</div>` : ''}
          ${skill.has_references ? `<div class="meta-item">📚 ${t('has_references')}</div>` : ''}
          ${skill.modified ? `<div class="meta-item">🕒 ${formatTime(skill.modified)}</div>` : ''}
        </div>
        <div class="detail-tabs">
          <button class="detail-tab ${activeTab === 'content' ? 'active' : ''}" data-tab="content">${t('tab_content')}</button>
          <button class="detail-tab ${activeTab === 'files' ? 'active' : ''}" data-tab="files">${t('tab_files')} (${skill.files.length})</button>
        </div>
        <div class="detail-content" id="tab-content">
          ${activeTab === 'content' ? `<pre>${escapeHtml(skill.content)}</pre>` : `
            <ul class="file-list">
              ${skill.files.map(f => `<li data-file="${f.path}"><span class="file-name">${f.path}</span><span class="file-size">${formatSize(f.size)}</span></li>`).join('')}
            </ul>
          `}
        </div>
      `;

      main.querySelectorAll('.detail-tab').forEach(tab => {
        tab.addEventListener('click', () => { activeTab = tab.dataset.tab; render(); });
      });

      document.getElementById('btn-back').addEventListener('click', () => navigateTo('skills'));
      document.getElementById('btn-edit').addEventListener('click', () => { editingSkill = skillName; openModal('edit', skill); });
      document.getElementById('btn-delete').addEventListener('click', async () => {
        if (!confirm(t('confirm_delete', { name: skillName }))) return;
        try {
          await api(`/api/skills/${skillName}`, { method: 'DELETE' });
          allSkills = allSkills.filter(s => s.name !== skillName);
          toast(t('deleted', { name: skillName }), 'success');
          navigateTo('skills');
        } catch (err) { toast(err.message, 'error'); }
      });

      main.querySelectorAll('.file-list li').forEach(li => {
        li.addEventListener('click', async () => {
          try {
            const data = await api(`/api/skills/${skillName}/file/${li.dataset.file}`);
            document.getElementById('tab-content').innerHTML = `
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                <span style="font-family:var(--font-mono);font-size:0.85rem;color:var(--text-accent);">${li.dataset.file}</span>
                <button class="btn btn-ghost" id="btn-back-files">${t('file_list')}</button>
              </div>
              <pre>${escapeHtml(data.content)}</pre>
            `;
            document.getElementById('btn-back-files').addEventListener('click', () => { activeTab = 'files'; render(); });
          } catch (err) { toast(err.message, 'error'); }
        });
      });
    }
    render();
  } catch (err) {
    main.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
  }
}

// ── Page: Repositories ──────────────────────────────────────────

async function renderRepos() {
  const main = document.getElementById('main-content');
  try {
    const repos = await api('/api/repos');
    const sr = repos.skills_repo;
    const tr = repos.toolchain_repo;

    function repoCard(name, r) {
      const statusText = r.dirty_files > 0 ? `${r.dirty_files} ${t('dirty')}` : t('clean');
      return `
        <div class="repo-card">
          <h3>${name} <span class="status-dot ${r.status}"></span></h3>
          <div class="repo-info">Path: <span>${r.path}</span></div>
          <div class="repo-info">${t('last_commit')}: <span>${r.last_commit}</span></div>
          <div class="repo-info">${t('status')}: <span>${statusText}</span></div>
          <div class="repo-info">${t('remote')}: <span>${r.has_remote ? t('connected') : t('no_remote')}</span></div>
          <div style="margin-top:14px;"><button class="btn btn-success" onclick="syncRepo('${name.includes('ai-skills') ? 'skills' : 'toolchain'}')">${t('commit_push')}</button></div>
        </div>
      `;
    }

    main.innerHTML = `<div class="repo-cards">${repoCard('🎯 927-ai-skills', sr)}${repoCard('🛠️ 927-agent-toolchain', tr)}</div>`;
  } catch (err) {
    main.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
  }
}

async function syncRepo(repo) {
  try {
    const result = await api('/api/repos/sync', { method: 'POST', body: JSON.stringify({ repo }) });
    toast(result.status === 'clean' ? t('nothing_commit') : t('synced'), 'success');
    renderRepos();
  } catch (err) { toast(err.message, 'error'); }
}

// ── Page: Activity Log ──────────────────────────────────────────

async function renderActivity() {
  const main = document.getElementById('main-content');
  try {
    const stats = await api('/api/stats');
    if (!stats.recent.length) {
      main.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>${t('no_logs')}</p></div>`;
      return;
    }
    main.innerHTML = `
      <div class="detail-content">
        <ul class="activity-list">
          ${stats.recent.map(e => `
            <li class="activity-item">
              <div class="activity-icon ${e.status}">${e.status === 'success' ? '✅' : '❌'}</div>
              <div class="activity-detail">
                <span class="activity-skill" style="cursor:pointer;color:var(--text-accent);" onclick="navigateTo('detail','${e.skill}')">${e.skill}</span>
                <span class="activity-agent"> · ${e.agent} · ${e.status}</span>
              </div>
              <span class="activity-time">${formatTime(e.timestamp)}</span>
            </li>
          `).join('')}
        </ul>
      </div>
      <div style="margin-top:28px;">
        <div class="section-title">${t('agent_dist')}</div>
        <div class="detail-content">
          ${Object.entries(stats.by_agent).sort((a,b) => b[1] - a[1]).map(([agent, count]) => {
            const pct = Math.round(count / stats.total_executions * 100);
            return `
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
                <span style="width:80px;font-weight:600;font-size:0.85rem;">${agent}</span>
                <div style="flex:1;height:24px;background:var(--bg-input);border-radius:var(--radius-full);overflow:hidden;">
                  <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--accent-blue),var(--accent-purple));border-radius:var(--radius-full);transition:width 0.5s ease;"></div>
                </div>
                <span style="width:60px;text-align:right;font-size:0.8rem;color:var(--text-secondary);">${count} (${pct}%)</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  } catch (err) {
    main.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${err.message}</p></div>`;
  }
}

// ── Modal ────────────────────────────────────────────────────────

const modalOverlay = document.getElementById('modal-overlay');

function openModal(mode, skill = null) {
  const nameRow = document.getElementById('form-name-row');
  const checkboxRow = document.getElementById('checkbox-row');
  const nameInput = document.getElementById('input-skill-name');
  const descInput = document.getElementById('input-skill-desc');
  const contentInput = document.getElementById('input-skill-content');

  document.getElementById('label-name').textContent = t('label_name');
  document.getElementById('label-desc').textContent = t('label_desc');
  document.getElementById('label-content').textContent = t('label_content');
  document.getElementById('label-check-scripts').lastChild.textContent = ' ' + t('create_scripts');
  document.getElementById('label-check-refs').lastChild.textContent = ' ' + t('create_references');
  document.getElementById('modal-cancel').textContent = t('cancel');
  document.getElementById('modal-save').innerHTML = t('save');

  if (mode === 'create') {
    document.getElementById('modal-title').textContent = t('modal_create');
    nameRow.classList.remove('hidden');
    checkboxRow.classList.remove('hidden');
    nameInput.value = ''; descInput.value = ''; contentInput.value = '';
    nameInput.disabled = false;
  } else {
    document.getElementById('modal-title').textContent = t('modal_edit', { name: skill.name });
    nameRow.classList.add('hidden');
    checkboxRow.classList.add('hidden');
    contentInput.value = skill.content || '';
  }
  modalOverlay.classList.add('active');
}

function closeModal() { modalOverlay.classList.remove('active'); editingSkill = null; }

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-cancel').addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });
document.getElementById('btn-create-skill').addEventListener('click', () => openModal('create'));

document.getElementById('modal-save').addEventListener('click', async () => {
  const contentInput = document.getElementById('input-skill-content');
  if (editingSkill) {
    try {
      await api(`/api/skills/${editingSkill}`, { method: 'PUT', body: JSON.stringify({ content: contentInput.value }) });
      toast(t('updated', { name: editingSkill }), 'success');
      closeModal();
      navigateTo('detail', editingSkill);
    } catch (err) { toast(err.message, 'error'); }
  } else {
    const name = document.getElementById('input-skill-name').value.trim();
    if (!name) { toast(t('name_required'), 'error'); return; }
    try {
      await api('/api/skills', {
        method: 'POST',
        body: JSON.stringify({
          name,
          description: document.getElementById('input-skill-desc').value.trim(),
          content: contentInput.value || undefined,
          create_scripts: document.getElementById('check-scripts').checked,
          create_references: document.getElementById('check-references').checked,
        }),
      });
      allSkills = [];
      toast(t('created', { name }), 'success');
      closeModal();
      navigateTo('detail', name);
    } catch (err) { toast(err.message, 'error'); }
  }
});

// ── Search ──────────────────────────────────────────────────────

document.getElementById('search-input').addEventListener('input', () => {
  if (currentPage === 'skills') renderSkillsList(allSkills);
  else {
    navigateTo('skills');
    document.querySelectorAll('.sidebar-nav button').forEach(b => b.classList.toggle('active', b.dataset.page === 'skills'));
  }
});

// ── Utilities ───────────────────────────────────────────────────

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatTime(ts) {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    const diff = Date.now() - d;
    if (diff < 60000) return t('just_now');
    if (diff < 3600000) return t('m_ago', { n: Math.floor(diff / 60000) });
    if (diff < 86400000) return t('h_ago', { n: Math.floor(diff / 3600000) });
    if (diff < 604800000) return t('d_ago', { n: Math.floor(diff / 86400000) });
    return d.toLocaleDateString(currentLang === 'zh' ? 'zh-CN' : 'en-US');
  } catch { return ts; }
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function updateSidebarStats(skills, executions) {
  document.getElementById('sidebar-skill-count').textContent = skills || '—';
  if (executions !== undefined) document.getElementById('sidebar-exec-count').textContent = executions;
}

// ── Keyboard shortcuts ──────────────────────────────────────────

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
  if (e.key === '/' && !e.ctrlKey && !e.metaKey && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
    e.preventDefault();
    document.getElementById('search-input').focus();
  }
});

// ── Init ────────────────────────────────────────────────────────

updateStaticUI();
navigateTo('overview');

(function() {
  var saved = localStorage.getItem('theme');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();

function toggleTheme() {
  var current = document.documentElement.getAttribute('data-theme');
  var next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  initSakura();
}

if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
    if (!localStorage.getItem('theme')) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  });
}

var CF_SITE_KEY = '';
var isAdmin = false;

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

// Tune or disable the blossom background here. Counts, speed, size, opacity,
// glow, and theme colors are intentionally centralized in this object.
var SAKURA_CONFIG = {
  enabled: true,
  desktopCount: 42,
  mobileCount: 18,
  reducedMotionCount: 6,
  minDuration: 26,
  maxDuration: 52,
  minOpacity: 0.12,
  maxOpacity: 0.36,
  minSize: 5,
  maxSize: 14,
  glowEvery: 4,
  minGlow: 0.14,
  maxGlow: 0.34,
  colors: ['#f2bdca', '#df95a7', '#fff0f4', '#f7cad4'],
  themes: {
    light: {
      minOpacity: 0.22,
      maxOpacity: 0.48,
      minGlow: 0.18,
      maxGlow: 0.42,
      minSize: 6,
      maxSize: 15,
      colors: ['#d47b92', '#e8a6b6', '#f4c8d2', '#c7657f', '#fff0f4']
    },
    dark: {
      minOpacity: 0.14,
      maxOpacity: 0.38,
      minGlow: 0.18,
      maxGlow: 0.42,
      colors: ['#f5bdca', '#e7a1b2', '#fff0f4', '#d98ca0']
    }
  }
};

var iconPaths = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  lock: '<rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/>',
  file: '<path d="M14 2H7a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V7z"/><path d="M14 2v5h5"/><path d="M9 13h6M9 17h4"/>',
  trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  back: '<path d="M15 18l-6-6 6-6"/><path d="M9 12h12"/>'
};

function uiIcon(name) {
  return '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + iconPaths[name] + '</svg>';
}

function loadingMarkup(label) {
  return '<div class="loading">' +
    '<div class="spinner" aria-hidden="true"></div>' +
    '<p>' + escapeHtml(label || 'Loading') + '</p>' +
  '</div>';
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function sakuraThemeOptions() {
  var theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  return SAKURA_CONFIG.themes[theme] || {};
}

function sakuraValue(themeOptions, key) {
  return typeof themeOptions[key] === 'number' ? themeOptions[key] : SAKURA_CONFIG[key];
}

function initSakura() {
  var field = $('#sakuraField');
  if (!field || !SAKURA_CONFIG.enabled) {
    if (field) field.hidden = true;
    return;
  }
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isMobile = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
  var count = reduceMotion
    ? SAKURA_CONFIG.reducedMotionCount
    : (isMobile ? SAKURA_CONFIG.mobileCount : SAKURA_CONFIG.desktopCount);
  field.innerHTML = '';
  field.hidden = false;
  var themeOptions = sakuraThemeOptions();
  var colors = themeOptions.colors || SAKURA_CONFIG.colors;
  for (var i = 0; i < count; i++) {
    var petal = document.createElement('span');
    var size = randomBetween(sakuraValue(themeOptions, 'minSize'), sakuraValue(themeOptions, 'maxSize'));
    var duration = randomBetween(SAKURA_CONFIG.minDuration, SAKURA_CONFIG.maxDuration);
    var opacity = randomBetween(sakuraValue(themeOptions, 'minOpacity'), sakuraValue(themeOptions, 'maxOpacity'));
    var glow = randomBetween(sakuraValue(themeOptions, 'minGlow'), sakuraValue(themeOptions, 'maxGlow'));
    var color = colors[i % colors.length];
    petal.className = 'sakura-petal sakura-petal-' + (i % 4) + (i % SAKURA_CONFIG.glowEvery === 0 ? ' sakura-petal-glow' : '');
    petal.style.setProperty('--petal-x', randomBetween(-4, 104).toFixed(2) + 'vw');
    petal.style.setProperty('--petal-y', randomBetween(-18, 16).toFixed(2) + 'vh');
    petal.style.setProperty('--petal-drift', randomBetween(-9, 9).toFixed(2) + 'vw');
    petal.style.setProperty('--petal-size', size.toFixed(2) + 'px');
    petal.style.setProperty('--petal-opacity', opacity.toFixed(2));
    petal.style.setProperty('--petal-glow', glow.toFixed(2));
    petal.style.setProperty('--petal-rotation', randomBetween(-80, 80).toFixed(2) + 'deg');
    petal.style.setProperty('--petal-duration', duration.toFixed(2) + 's');
    petal.style.setProperty('--petal-delay', (-duration * Math.random()).toFixed(2) + 's');
    petal.style.setProperty('--petal-tint', color);
    field.appendChild(petal);
  }
}

function toast(msg, type) {
  type = type || 'success';
  var container = $('#toastContainer');
  var el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(function() {
    el.style.opacity = '0';
    el.style.transition = 'opacity 300ms cubic-bezier(0.32, 0.72, 0, 1)';
    setTimeout(function() { el.remove(); }, 300);
  }, 3000);
}

function formatDate(iso) {
  var d = new Date(iso);
  return d.toLocaleDateString('vi-VN', { year: 'numeric', month: 'short', day: 'numeric' });
}

function escapeHtml(str) {
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function generateHeadingId(text) {
  return text.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildTOC(markdownBody) {
  var headings = markdownBody.querySelectorAll('h1, h2, h3, h4');
  if (headings.length < 2) return null;
  var ids = {};
  var items = [];
  for (var i = 0; i < headings.length; i++) {
    var h = headings[i];
    var text = h.textContent.trim();
    var base = generateHeadingId(text) || 'section';
    var id = base;
    var c = 1;
    while (ids[id]) { id = base + '-' + c; c++; }
    ids[id] = true;
    h.id = id;
    items.push({ id: id, text: text, level: h.tagName.toLowerCase() });
  }
  return items;
}

function renderTOCHtml(items) {
  return '<div class="toc-title">Sections</div>' +
    '<nav class="toc-nav">' +
    items.map(function(item) {
      return '<a href="#' + item.id + '" class="toc-link toc-' + item.level + '" data-target="' + item.id + '">' + escapeHtml(item.text) + '</a>';
    }).join('') +
    '</nav>';
}

var scrollSpyCleanup = null;

function initScrollSpy() {
  if (scrollSpyCleanup) { scrollSpyCleanup(); scrollSpyCleanup = null; }
  var links = document.querySelectorAll('.toc-sidebar .toc-link, .toc-mobile .toc-link');
  if (links.length === 0) return;
  var headingEls = [];
  var seen = {};
  for (var i = 0; i < links.length; i++) {
    var target = links[i].getAttribute('data-target');
    if (!seen[target]) {
      var el = document.getElementById(target);
      if (el) headingEls.push({ el: el, target: target });
      seen[target] = true;
    }
  }
  function setActive(current) {
    for (var k = 0; k < links.length; k++) {
      if (links[k].getAttribute('data-target') === current) {
        links[k].classList.add('active');
      } else {
        links[k].classList.remove('active');
      }
    }
  }
  if (!('IntersectionObserver' in window)) {
    if (headingEls[0]) setActive(headingEls[0].target);
    return;
  }
  var observer = new IntersectionObserver(function(entries) {
    var visible = entries
      .filter(function(entry) { return entry.isIntersecting; })
      .sort(function(a, b) { return a.boundingClientRect.top - b.boundingClientRect.top; });
    if (visible[0]) setActive(visible[0].target.id);
  }, { rootMargin: '-18% 0px -68% 0px', threshold: 0.01 });
  headingEls.forEach(function(item) { observer.observe(item.el); });
  scrollSpyCleanup = function() {
    observer.disconnect();
  };
}

function toggleMobileTOC() {
  var el = document.querySelector('#tocMobile');
  if (el) el.classList.toggle('open');
}

function setupTOCLinks() {
  var links = document.querySelectorAll('.toc-link');
  for (var i = 0; i < links.length; i++) {
    links[i].addEventListener('click', function(e) {
      e.preventDefault();
      var targetId = this.getAttribute('data-target');
      var targetEl = document.getElementById(targetId);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        var mobileEl = document.querySelector('#tocMobile');
        if (mobileEl) mobileEl.classList.remove('open');
      }
    });
  }
}

function initReveals(root) {
  var scope = root || document;
  var items = scope.querySelectorAll('.reveal-in:not(.is-visible)');
  if (!items.length) return;
  if (!('IntersectionObserver' in window)) {
    items.forEach(function(item) { item.classList.add('is-visible'); });
    return;
  }
  var observer = new IntersectionObserver(function(entries, obs) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  items.forEach(function(item) { observer.observe(item); });
}

function getCodeLanguage(code) {
  var className = code ? code.className : '';
  var match = className.match(/language-([a-z0-9_+-]+)/i);
  return match ? match[1].replace(/_/g, '-') : 'code';
}

function copyCodeText(text, done) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(done).catch(function() {});
    return;
  }
  var textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  try { document.execCommand('copy'); done(); } catch (err) {}
  textarea.remove();
}

function enhanceCodeBlocks(root) {
  if (!root) return;
  root.querySelectorAll('pre').forEach(function(pre) {
    if (pre.classList.contains('code-enhanced')) return;
    var code = pre.querySelector('code');
    if (!code) return;
    pre.classList.add('code-enhanced');
    pre.setAttribute('data-lang', getCodeLanguage(code));
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'code-copy';
    btn.textContent = 'Copy';
    btn.setAttribute('aria-label', 'Copy code');
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      copyCodeText(code.innerText, function() {
        btn.textContent = 'Copied';
        setTimeout(function() { btn.textContent = 'Copy'; }, 1400);
      });
    });
    pre.appendChild(btn);
  });
}

var api = {
  getFolders: function(params) {
    var qs = new URLSearchParams(params || {}).toString();
    return fetch('/api/folders?' + qs).then(function(r) { return r.json(); });
  },
  getFolder: function(id) {
    return fetch('/api/folders/' + encodeURIComponent(id)).then(function(r) {
      if (!r.ok) throw new Error('Folder not found');
      return r.json();
    });
  },
  createFolder: function(data) {
    return fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(function(r) {
      if (!r.ok) return r.json().then(function(d) { throw new Error(d.error); });
      return r.json();
    });
  },
  updateFolder: function(id, data) {
    return fetch('/api/folders/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(function(r) {
      if (!r.ok) return r.json().then(function(d) { throw new Error(d.error); });
      return r.json();
    });
  },
  deleteFolder: function(id) {
    return fetch('/api/folders/' + id, { method: 'DELETE' }).then(function(r) {
      if (!r.ok) throw new Error('Failed');
      return r.json();
    });
  },
  getPost: function(id) {
    return fetch('/api/posts/' + encodeURIComponent(id)).then(function(r) {
      if (!r.ok) throw new Error('Post not found');
      return r.json();
    });
  },
  createPost: function(formData) {
    return fetch('/api/posts', { method: 'POST', body: formData }).then(function(r) {
      if (!r.ok) return r.json().then(function(d) { throw new Error(d.error); });
      return r.json();
    });
  },
  updatePost: function(id, formData) {
    return fetch('/api/posts/' + id, { method: 'PUT', body: formData }).then(function(r) {
      if (!r.ok) return r.json().then(function(d) { throw new Error(d.error); });
      return r.json();
    });
  },
  deletePost: function(id) {
    return fetch('/api/posts/' + id, { method: 'DELETE' }).then(function(r) {
      if (!r.ok) throw new Error('Failed');
      return r.json();
    });
  },
  checkAuth: function() {
    return fetch('/api/auth/check').then(function(r) { return r.json(); });
  },
  login: function(username, password, cfToken) {
    return fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username, password: password, cfToken: cfToken })
    }).then(function(r) {
      if (!r.ok) return r.json().then(function(d) { throw new Error(d.error); });
      return r.json();
    });
  },
  logout: function() {
    return fetch('/api/auth/logout', { method: 'POST' }).then(function(r) { return r.json(); });
  }
};

var router = {
  navigate: function(path) {
    window.location.hash = path;
  },
  getRoute: function() {
    return window.location.hash.slice(1) || '/';
  },
  init: function() {
    var self = this;
    window.addEventListener('hashchange', function() { self.resolve(); });
    this.resolve();
  },
  resolve: function() {
    var mainContent = document.querySelector('.main-content');
    if (mainContent) mainContent.classList.remove('wide');
    if (scrollSpyCleanup) { scrollSpyCleanup(); scrollSpyCleanup = null; }
    var route = this.getRoute();
    if (route === '/' || route === '') {
      document.body.setAttribute('data-route', 'home');
      renderHome();
    } else if (route.indexOf('/folder/') === 0) {
      document.body.setAttribute('data-route', 'folder');
      renderFolder(route.slice(8));
    } else if (route.indexOf('/post/') === 0) {
      document.body.setAttribute('data-route', 'post');
      renderPost(route.slice(6));
    } else {
      document.body.setAttribute('data-route', 'not-found');
      renderNotFound();
    }
  }
};

function updateHeaderActions() {
  var el = $('#headerActions');
  if (isAdmin) {
    el.innerHTML =
      '<span class="admin-indicator">Admin mode</span>' +
      '<button class="btn btn-ghost btn-sm" onclick="handleLogout()">Logout</button>';
  } else {
    el.innerHTML =
      '<button class="btn-icon" onclick="openLoginModal()" title="Admin">' +
        uiIcon('lock') +
      '</button>';
  }
}

function renderHome() {
  var app = $('#app');
  app.innerHTML =
    '<section class="home-hero surface-shell surface-shell-hero reveal-in" aria-labelledby="homeTitle">' +
      '<div class="surface-core hero-core">' +
        '<div class="hero-copy">' +
          '<div class="kicker">security notebook / spring archive</div>' +
          '<h1 id="homeTitle">Ahrial research log</h1>' +
          '<p>CTF notes, exploit analysis, and web security writeups. And my POV with CTF.</p>' +
        '</div>' +
        '<div class="hero-mini-panel" aria-hidden="true">' +
          '<span>Age : 19</span>' +
          '<strong>Ahrial / Kanial</strong>' +
          '<em>ridiculous - serious</em>' +
        '</div>' +
      '</div>' +
    '</section>' +
    '<section class="index-panel surface-shell reveal-in reveal-delay-1" aria-label="Research index">' +
      '<div class="surface-core index-core">' +
        '<div class="section-header index-header">' +
          '<div>' +
            '<div class="page-title">Research index</div>' +
            '<p class="page-subtitle">Browse by event, lab, or investigation thread.</p>' +
          '</div>' +
          (isAdmin ? '<button class="btn btn-primary" onclick="openNewFolderModal()">' + uiIcon('plus') + '<span class="hide-mobile">New Folder</span></button>' : '') +
        '</div>' +
        '<div class="filter-bar">' +
          '<input class="search-input" type="text" id="searchInput" placeholder="Search the archive..." oninput="debounceSearchFolders(this.value)">' +
        '</div>' +
        '<div class="folders-grid" id="foldersGrid">' +
          loadingMarkup('Syncing archive') +
        '</div>' +
      '</div>' +
    '</section>';
  initReveals(app);
  loadFolders();
}

function loadFolders(search) {
  var grid = $('#foldersGrid');
  if (!grid) return;
  var params = {};
  if (search) params.search = search;
  api.getFolders(params).then(function(folders) {
    if (folders.length === 0) {
      grid.innerHTML =
        '<div class="empty-state empty-state-wide">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>' +
          '<h3>' + (search ? 'No matching logs' : 'No research logs yet') + '</h3>' +
          '<p>' + (search ? 'Try a different search term.' : (isAdmin ? 'Create the first research folder.' : 'The archive is empty for now.')) + '</p>' +
        '</div>';
      return;
    }
    grid.innerHTML = folders.map(function(f) {
      var adminBtns = isAdmin
        ? '<div class="folder-card-actions">' +
            '<button class="btn-icon btn-sm" onclick="event.stopPropagation(); openEditFolderModal(\'' + f.id + '\', \'' + escapeHtml(f.name).replace(/'/g, "\\'") + '\', \'' + escapeHtml(f.description || '').replace(/'/g, "\\'") + '\')" title="Edit">' + uiIcon('edit') + '</button>' +
            '<button class="btn-icon btn-sm" onclick="event.stopPropagation(); confirmDeleteFolder(\'' + f.id + '\', \'' + escapeHtml(f.name).replace(/'/g, "\\'") + '\')" title="Delete">' + uiIcon('trash') + '</button>' +
          '</div>'
        : '';
      return '<div class="folder-card card-shell" onclick="router.navigate(\'/folder/' + (f.slug || f.id) + '\')">' +
        adminBtns +
        '<div class="card-core folder-card-core">' +
          '<div class="folder-card-top">' +
            '<div class="folder-card-icon" aria-hidden="true"><span></span></div>' +
            '<span class="folder-card-count">' + f.postCount + ' writeup' + (f.postCount !== 1 ? 's' : '') + '</span>' +
          '</div>' +
          '<div class="folder-card-name">' + escapeHtml(f.name) + '</div>' +
          (f.description ? '<div class="folder-card-desc">' + escapeHtml(f.description) + '</div>' : '') +
          '<div class="folder-card-meta">' +
            '<span>Opened ' + formatDate(f.createdAt) + '</span>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }).catch(function(err) {
    grid.innerHTML = '<div class="empty-state empty-state-wide"><h3>Archive unavailable</h3><p>' + escapeHtml(err.message) + '</p></div>';
  });
}

var searchTimeout;
function debounceSearchFolders(val) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(function() { loadFolders(val); }, 300);
}

function renderFolder(slug) {
  var app = $('#app');
  app.innerHTML = loadingMarkup('Opening log');
  api.getFolder(slug).then(function(data) {
    var adminBtn = isAdmin
      ? '<button class="btn btn-primary btn-sm" onclick="openNewPostModal(\'' + data.id + '\')">' +
          uiIcon('plus') + 'New Post</button>'
      : '';
    app.innerHTML =
      '<button class="back-link" onclick="router.navigate(\'/\')">' + uiIcon('back') + 'Back to index</button>' +
      '<section class="folder-header surface-shell reveal-in">' +
        '<div class="surface-core folder-header-core">' +
          '<div><div class="kicker">folder / field notes</div><div class="page-title">' + escapeHtml(data.name) + '</div>' +
          (data.description ? '<p class="page-subtitle folder-description">' + escapeHtml(data.description) + '</p>' : '') +
          '</div>' +
          adminBtn +
        '</div>' +
      '</section>' +
      '<div class="posts-grid" id="postsGrid"></div>';
    initReveals(app);
    var grid = $('#postsGrid');
    if (!data.posts || data.posts.length === 0) {
      grid.innerHTML =
        '<div class="empty-state">' +
          '<h3>No writeups yet</h3>' +
          '<p>' + (isAdmin ? 'Add the first writeup to this log.' : 'This log has no published notes yet.') + '</p>' +
        '</div>';
      return;
    }
    grid.innerHTML = data.posts.map(function(post) {
      return '<div class="post-card card-shell" onclick="router.navigate(\'/post/' + (post.slug || post.id) + '\')">' +
        '<div class="card-core post-card-core">' +
          '<div class="post-card-kicker">writeup</div>' +
          '<div class="post-card-title">' + escapeHtml(post.title) + '</div>' +
          (post.description ? '<div class="post-card-desc">' + escapeHtml(post.description) + '</div>' : '') +
          '<div class="post-card-meta">' +
            '<span>' + formatDate(post.createdAt) + '</span>' +
            '<span>' + post.readTime + ' min read</span>' +
          '</div>' +
          (post.tags && post.tags.length > 0
            ? '<div class="post-card-tags">' + post.tags.map(function(t) { return '<span class="tag">' + escapeHtml(t) + '</span>'; }).join('') + '</div>'
            : '') +
        '</div>' +
      '</div>';
    }).join('');
  }).catch(function(err) {
    app.innerHTML =
      '<div class="empty-state"><h3>Folder not found</h3><p>' + escapeHtml(err.message) + '</p><br>' +
      '<button class="btn btn-primary" onclick="router.navigate(\'/\')">' + uiIcon('back') + 'Go home</button></div>';
  });
}

function renderPost(id) {
  var app = $('#app');
  var mainContent = document.querySelector('.main-content');
  if (mainContent) mainContent.classList.add('wide');
  app.innerHTML = loadingMarkup('Loading article');
  api.getPost(id).then(function(post) {
    var adminActions = isAdmin
      ? '<div class="post-actions">' +
          '<button class="btn btn-ghost btn-sm" onclick="openEditPostMeta(\'' + post.id + '\')">' + uiIcon('edit') + 'Edit</button>' +
          '<button class="btn btn-ghost btn-sm" onclick="openEditContentModal(\'' + post.id + '\')">' + uiIcon('file') + 'Edit Content</button>' +
          '<button class="btn btn-danger btn-sm" onclick="confirmDeletePost(\'' + post.id + '\')">' + uiIcon('trash') + 'Delete</button>' +
        '</div>'
      : '';
    var backTarget = post.folderSlug ? '/folder/' + post.folderSlug : '/';
    app.innerHTML =
      '<div class="post-page-grid">' +
        '<div class="post-header surface-shell reveal-in">' +
          '<div class="surface-core post-header-core">' +
            '<div class="breadcrumb">' +
              '<a onclick="router.navigate(\'/\')">Home</a>' +
              (post.folderName
                ? '<span class="sep">›</span><a onclick="router.navigate(\'' + backTarget + '\')">' + escapeHtml(post.folderName) + '</a>'
                : '') +
            '</div>' +
            '<div class="kicker">research note</div>' +
            '<h1 class="post-title">' + escapeHtml(post.title) + '</h1>' +
            '<div class="post-meta">' +
              '<span>' + formatDate(post.createdAt) + '</span>' +
              '<span>' + post.readTime + ' min read</span>' +
              (post.updatedAt !== post.createdAt ? '<span>Updated ' + formatDate(post.updatedAt) + '</span>' : '') +
            '</div>' +
            (post.tags && post.tags.length > 0
              ? '<div class="post-tags">' + post.tags.map(function(t) { return '<span class="tag">' + escapeHtml(t) + '</span>'; }).join('') + '</div>'
              : '') +
            adminActions +
          '</div>' +
        '</div>' +
        '<button class="toc-mobile-toggle" id="tocMobileToggle" onclick="toggleMobileTOC()" hidden>' +
          uiIcon('menu') + 'Sections' +
        '</button>' +
        '<div class="toc-mobile" id="tocMobile"></div>' +
        '<aside class="toc-sidebar" id="tocSidebar"></aside>' +
        '<article class="post-content article-shell surface-shell reveal-in reveal-delay-1" aria-label="Article">' +
          '<div class="surface-core article-core">' +
            '<div class="markdown-body">' + post.html + '</div>' +
          '</div>' +
        '</article>' +
      '</div>';
    initReveals(app);
    if (window.hljs) {
      app.querySelectorAll('pre code').forEach(function(block) {
        hljs.highlightElement(block);
      });
    }
    var markdownBody = app.querySelector('.markdown-body');
    enhanceCodeBlocks(markdownBody);
    var tocItems = buildTOC(markdownBody);
    if (tocItems && tocItems.length >= 2) {
      var tocHtml = renderTOCHtml(tocItems);
      var tocSidebar = document.querySelector('#tocSidebar');
      var tocMobile = document.querySelector('#tocMobile');
      var tocMobileToggle = document.querySelector('#tocMobileToggle');
      if (tocSidebar) tocSidebar.innerHTML = '<div class="toc-inner">' + tocHtml + '</div>';
      if (tocMobile) tocMobile.innerHTML = tocHtml;
      if (tocMobileToggle) tocMobileToggle.hidden = false;
      setupTOCLinks();
      initScrollSpy();
    } else {
      var tocSidebarEl = document.querySelector('#tocSidebar');
      if (tocSidebarEl) tocSidebarEl.hidden = true;
      var postPageGrid = document.querySelector('.post-page-grid');
      if (postPageGrid) postPageGrid.classList.add('post-page-grid-no-toc');
    }
  }).catch(function(err) {
    app.innerHTML =
      '<div class="empty-state"><h3>Post not found</h3><p>' + escapeHtml(err.message) + '</p><br>' +
      '<button class="btn btn-primary" onclick="router.navigate(\'/\')">' + uiIcon('back') + 'Go home</button></div>';
  });
}

function renderNotFound() {
  $('#app').innerHTML =
    '<div class="empty-state"><h3>Page not found</h3><p>The page you are looking for does not exist.</p><br>' +
    '<button class="btn btn-primary" onclick="router.navigate(\'/\')">' + uiIcon('back') + 'Go home</button></div>';
}

function openLoginModal() {
  $('#loginForm').reset();
  var w = $('#turnstileWidget');
  if (CF_SITE_KEY && w) {
    w.classList.add('cf-turnstile');
    w.setAttribute('data-sitekey', CF_SITE_KEY);
    w.innerHTML = '';
    if (window.turnstile) {
      window.turnstile.render('#turnstileWidget', { sitekey: CF_SITE_KEY });
    }
  } else if (w) {
    w.classList.remove('cf-turnstile');
    w.removeAttribute('data-sitekey');
    w.innerHTML = '';
  }
  $('#loginModal').classList.add('active');
}

function closeLoginModal() {
  $('#loginModal').classList.remove('active');
}

function handleLogin(e) {
  e.preventDefault();
  var user = $('#loginUser').value.trim();
  var pass = $('#loginPass').value;
  var cfToken = '';
  var turnstileInput = document.querySelector('[name="cf-turnstile-response"]');
  if (turnstileInput) cfToken = turnstileInput.value;
  var btn = $('#loginBtn');
  btn.disabled = true;
  btn.textContent = 'Checking access...';
  api.login(user, pass, cfToken).then(function() {
    isAdmin = true;
    closeLoginModal();
    updateHeaderActions();
    router.resolve();
    toast('Logged in');
  }).catch(function(err) {
    toast(err.message, 'error');
    if (window.turnstile) window.turnstile.reset();
  }).finally(function() {
    btn.disabled = false;
    btn.textContent = 'Login';
  });
}

function handleLogout() {
  api.logout().then(function() {
    isAdmin = false;
    updateHeaderActions();
    router.resolve();
    toast('Logged out');
  });
}

function openNewFolderModal() {
  $('#editFolderId').value = '';
  $('#folderForm').reset();
  $('#folderModalTitle').textContent = 'New Folder';
  $('#folderSubmitBtn').textContent = 'Create';
  $('#folderModal').classList.add('active');
}

function openEditFolderModal(id, name, desc) {
  $('#editFolderId').value = id;
  $('#folderNameInput').value = name;
  $('#folderDescInput').value = desc;
  $('#folderModalTitle').textContent = 'Edit Folder';
  $('#folderSubmitBtn').textContent = 'Save';
  $('#folderModal').classList.add('active');
}

function closeFolderModal() {
  $('#folderModal').classList.remove('active');
}

function handleFolderSubmit(e) {
  e.preventDefault();
  var id = $('#editFolderId').value;
  var name = $('#folderNameInput').value.trim();
  var desc = $('#folderDescInput').value.trim();
  var btn = $('#folderSubmitBtn');
  btn.disabled = true;
  var p = id
    ? api.updateFolder(id, { name: name, description: desc })
    : api.createFolder({ name: name, description: desc });
  p.then(function() {
    closeFolderModal();
    toast(id ? 'Folder updated' : 'Folder created');
    router.resolve();
  }).catch(function(err) {
    toast(err.message, 'error');
  }).finally(function() {
    btn.disabled = false;
  });
}

function confirmDeleteFolder(id, name) {
  if (!confirm('Delete folder "' + name + '" and ALL its writeups? This cannot be undone.')) return;
  api.deleteFolder(id).then(function() {
    toast('Folder deleted');
    router.navigate('/');
  }).catch(function(err) { toast(err.message, 'error'); });
}

var selectedFile = null;
var activeTab = 'upload';

function openNewPostModal(folderId) {
  selectedFile = null;
  activeTab = 'upload';
  $('#editPostId').value = '';
  $('#postFolderId').value = folderId;
  $('#postForm').reset();
  $('#fileName').textContent = '';
  $('#postModalTitle').textContent = 'New Post';
  $('#postSubmitBtn').textContent = 'Publish';
  $('#fileUploadGroup').hidden = false;
  $('#editorGroup').hidden = true;
  $$('#postModal .tab-bar button').forEach(function(b, i) { b.classList.toggle('active', i === 0); });
  $('#postModal').classList.add('active');
}

function openEditPostMeta(postId) {
  api.getPost(postId).then(function(post) {
    $('#editPostId').value = postId;
    $('#postFolderId').value = post.folderId || '';
    $('#titleInput').value = post.title;
    $('#descInput').value = post.description || '';
    $('#tagsInput').value = (post.tags || []).join(', ');
    $('#postModalTitle').textContent = 'Edit Post';
    $('#postSubmitBtn').textContent = 'Save changes';
    $('#fileUploadGroup').hidden = true;
    $('#editorGroup').hidden = true;
    $$('#postModal .tab-bar').forEach(function(el) { el.hidden = true; });
    $('#postModal').classList.add('active');
  }).catch(function(err) { toast(err.message, 'error'); });
}

function closePostModal() {
  $('#postModal').classList.remove('active');
  $$('#postModal .tab-bar').forEach(function(el) { el.hidden = false; });
}

function switchTab(btn, tab) {
  $$('.tab-bar button').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  activeTab = tab;
  if (tab === 'upload') {
    $('#fileUploadGroup').hidden = false;
    $('#editorGroup').hidden = true;
  } else {
    $('#fileUploadGroup').hidden = true;
    $('#editorGroup').hidden = false;
  }
}

function handleFileSelect(file) {
  var ext = file.name.split('.').pop().toLowerCase();
  if (ext !== 'md' && ext !== 'markdown') {
    toast('Please select a .md file', 'error');
    return;
  }
  selectedFile = file;
  $('#fileName').textContent = 'Attached: ' + file.name;
}

function handlePostSubmit(e) {
  e.preventDefault();
  var editId = $('#editPostId').value;
  var folderId = $('#postFolderId').value;
  var title = $('#titleInput').value.trim();
  var description = $('#descInput').value.trim();
  var tags = $('#tagsInput').value.trim();
  var content = $('#contentInput').value.trim();
  var formData = new FormData();
  if (folderId) formData.append('folderId', folderId);
  if (title) formData.append('title', title);
  if (description) formData.append('description', description);
  if (tags) formData.append('tags', tags);
  if (!editId) {
    if (activeTab === 'upload' && selectedFile) {
      formData.append('markdown', selectedFile);
    } else if (activeTab === 'write' && content) {
      formData.append('content', content);
    } else {
      toast('Upload a file or write content', 'error');
      return;
    }
  }
  var btn = $('#postSubmitBtn');
  btn.disabled = true;
  btn.textContent = editId ? 'Saving...' : 'Publishing...';
  var p = editId ? api.updatePost(editId, formData) : api.createPost(formData);
  p.then(function() {
    closePostModal();
    toast(editId ? 'Post updated' : 'Post published');
    router.resolve();
  }).catch(function(err) {
    toast(err.message, 'error');
  }).finally(function() {
    btn.disabled = false;
    btn.textContent = editId ? 'Save changes' : 'Publish';
  });
}

var editingPostId = null;

function openEditContentModal(postId) {
  editingPostId = postId;
  api.getPost(postId).then(function(post) {
    $('#editContentArea').value = post.content;
    $('#editContentModal').classList.add('active');
  }).catch(function(err) { toast(err.message, 'error'); });
}

function closeEditContentModal() {
  $('#editContentModal').classList.remove('active');
  editingPostId = null;
}

function saveEditContent() {
  if (!editingPostId) return;
  var content = $('#editContentArea').value;
  var formData = new FormData();
  formData.append('content', content);
  api.updatePost(editingPostId, formData).then(function() {
    toast('Content updated');
    closeEditContentModal();
    router.resolve();
  }).catch(function(err) { toast(err.message, 'error'); });
}

function confirmDeletePost(postId) {
  if (!confirm('Delete this post? This cannot be undone.')) return;
  api.deletePost(postId).then(function() {
    toast('Post deleted');
    var route = router.getRoute();
    if (route.indexOf('/post/') === 0) {
      router.navigate('/');
    } else {
      router.resolve();
    }
  }).catch(function(err) { toast(err.message, 'error'); });
}

document.addEventListener('DOMContentLoaded', function() {
  initSakura();
  var dropZone = $('#dropZone');
  var fileInput = $('#fileInput');
  if (dropZone) {
    dropZone.addEventListener('click', function() { fileInput.click(); });
    dropZone.addEventListener('dragover', function(e) {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', function() {
      dropZone.classList.remove('dragover');
    });
    dropZone.addEventListener('drop', function(e) {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]);
    });
  }
  if (fileInput) {
    fileInput.addEventListener('change', function(e) {
      if (e.target.files[0]) handleFileSelect(e.target.files[0]);
    });
  }
});

var sakuraResizeTimer = null;
window.addEventListener('resize', function() {
  clearTimeout(sakuraResizeTimer);
  sakuraResizeTimer = setTimeout(initSakura, 250);
});

document.addEventListener('click', function(e) {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
  }
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    $$('.modal-overlay.active').forEach(function(m) { m.classList.remove('active'); });
  }
});

fetch('/api/auth/check')
  .then(function(r) { return r.json(); })
  .then(function(data) {
    isAdmin = data.isAdmin;
    updateHeaderActions();

    var meta = document.querySelector('meta[name="cf-site-key"]');
    if (meta) CF_SITE_KEY = meta.getAttribute('content');

    router.init();
  })
  .catch(function() {
    updateHeaderActions();
    router.init();
  });

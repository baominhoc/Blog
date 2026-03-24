(function() {
  var saved = localStorage.getItem('theme');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();

function toggleTheme() {
  var current = document.documentElement.getAttribute('data-theme');
  var next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
}

if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
    if (!localStorage.getItem('theme')) {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    }
  });
}

var CF_SITE_KEY = '';
var isAdmin = false;

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

function toast(msg, type) {
  type = type || 'success';
  var container = $('#toastContainer');
  var el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(function() {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.3s';
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
  function onScroll() {
    var scrollY = window.scrollY + 120;
    var current = null;
    for (var j = 0; j < headingEls.length; j++) {
      if (headingEls[j].el.offsetTop <= scrollY) {
        current = headingEls[j].target;
      }
    }
    for (var k = 0; k < links.length; k++) {
      if (links[k].getAttribute('data-target') === current) {
        links[k].classList.add('active');
      } else {
        links[k].classList.remove('active');
      }
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  scrollSpyCleanup = function() {
    window.removeEventListener('scroll', onScroll);
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
      renderHome();
    } else if (route.indexOf('/folder/') === 0) {
      renderFolder(route.slice(8));
    } else if (route.indexOf('/post/') === 0) {
      renderPost(route.slice(6));
    } else {
      renderNotFound();
    }
  }
};

function updateHeaderActions() {
  var el = $('#headerActions');
  if (isAdmin) {
    el.innerHTML =
      '<span class="admin-indicator">✦ Admin</span>' +
      '<button class="btn btn-ghost btn-sm" onclick="handleLogout()">Logout</button>';
  } else {
    el.innerHTML =
      '<button class="btn-icon" onclick="openLoginModal()" title="Admin">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>' +
      '</button>';
  }
}

function renderHome() {
  var app = $('#app');
  app.innerHTML =
    '<div class="page-title">Writeups & Research</div>' +
    '<p class="page-subtitle">CTF writeups and research articles</p>' +
    '<div class="filter-bar">' +
      '<input class="search-input" type="text" id="searchInput" placeholder="Search folders..." oninput="debounceSearchFolders(this.value)">' +
      (isAdmin ? '<button class="btn btn-primary" onclick="openNewFolderModal()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg> <span class="hide-mobile">New Folder</span></button>' : '') +
    '</div>' +
    '<div class="folders-grid" id="foldersGrid">' +
      '<div class="loading"><div class="spinner"></div><p>Loading...</p></div>' +
    '</div>';
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
        '<div class="empty-state" style="grid-column:1/-1">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>' +
          '<h3>' + (search ? 'No matching folders' : 'No folders yet') + '</h3>' +
          '<p>' + (search ? 'Try a different search' : (isAdmin ? 'Create your first CTF folder' : '')) + '</p>' +
        '</div>';
      return;
    }
    grid.innerHTML = folders.map(function(f) {
      var adminBtns = isAdmin
        ? '<div class="folder-card-actions">' +
            '<button class="btn-icon btn-sm" onclick="event.stopPropagation(); openEditFolderModal(\'' + f.id + '\', \'' + escapeHtml(f.name).replace(/'/g, "\\'") + '\', \'' + escapeHtml(f.description || '').replace(/'/g, "\\'") + '\')" title="Edit">✏️</button>' +
            '<button class="btn-icon btn-sm" onclick="event.stopPropagation(); confirmDeleteFolder(\'' + f.id + '\', \'' + escapeHtml(f.name).replace(/'/g, "\\'") + '\')" title="Delete">🗑️</button>' +
          '</div>'
        : '';
      return '<div class="folder-card" onclick="router.navigate(\'/folder/' + (f.slug || f.id) + '\')">' +
        adminBtns +
        '<div class="folder-card-icon">📁</div>' +
        '<div class="folder-card-name">' + escapeHtml(f.name) + '</div>' +
        (f.description ? '<div class="folder-card-desc">' + escapeHtml(f.description) + '</div>' : '') +
        '<div class="folder-card-meta">' +
          '<span class="folder-card-count">' + f.postCount + ' writeup' + (f.postCount !== 1 ? 's' : '') + '</span>' +
          '<span>' + formatDate(f.createdAt) + '</span>' +
        '</div>' +
      '</div>';
    }).join('');
  }).catch(function(err) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><h3>Error</h3><p>' + escapeHtml(err.message) + '</p></div>';
  });
}

var searchTimeout;
function debounceSearchFolders(val) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(function() { loadFolders(val); }, 300);
}

function renderFolder(slug) {
  var app = $('#app');
  app.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading...</p></div>';
  api.getFolder(slug).then(function(data) {
    var adminBtn = isAdmin
      ? '<button class="btn btn-primary btn-sm" onclick="openNewPostModal(\'' + data.id + '\')">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg> New Post</button>'
      : '';
    app.innerHTML =
      '<div class="back-link" onclick="router.navigate(\'/\')">← Back to folders</div>' +
      '<div class="section-header">' +
        '<div><div class="page-title">' + escapeHtml(data.name) + '</div>' +
        (data.description ? '<p class="page-subtitle" style="margin-bottom:0">' + escapeHtml(data.description) + '</p>' : '') +
        '</div>' +
        adminBtn +
      '</div>' +
      '<div class="posts-grid" id="postsGrid"></div>';
    var grid = $('#postsGrid');
    if (!data.posts || data.posts.length === 0) {
      grid.innerHTML =
        '<div class="empty-state">' +
          '<h3>No writeups yet</h3>' +
          '<p>' + (isAdmin ? 'Add your first writeup to this folder' : '') + '</p>' +
        '</div>';
      return;
    }
    grid.innerHTML = data.posts.map(function(post) {
      return '<div class="post-card" onclick="router.navigate(\'/post/' + (post.slug || post.id) + '\')">' +
        '<div class="post-card-title">' + escapeHtml(post.title) + '</div>' +
        (post.description ? '<div class="post-card-desc">' + escapeHtml(post.description) + '</div>' : '') +
        '<div class="post-card-meta">' +
          '<span>' + formatDate(post.createdAt) + '</span>' +
          '<span>·</span>' +
          '<span>' + post.readTime + ' min read</span>' +
        '</div>' +
        (post.tags && post.tags.length > 0
          ? '<div class="post-card-tags">' + post.tags.map(function(t) { return '<span class="tag">' + escapeHtml(t) + '</span>'; }).join('') + '</div>'
          : '') +
      '</div>';
    }).join('');
  }).catch(function(err) {
    app.innerHTML =
      '<div class="empty-state"><h3>Folder not found</h3><p>' + escapeHtml(err.message) + '</p><br>' +
      '<button class="btn btn-primary" onclick="router.navigate(\'/\')">← Go Home</button></div>';
  });
}

function renderPost(id) {
  var app = $('#app');
  var mainContent = document.querySelector('.main-content');
  if (mainContent) mainContent.classList.add('wide');
  app.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading...</p></div>';
  api.getPost(id).then(function(post) {
    var adminActions = isAdmin
      ? '<div class="post-actions">' +
          '<button class="btn btn-ghost btn-sm" onclick="openEditPostMeta(\'' + post.id + '\')">✏️ Edit</button>' +
          '<button class="btn btn-ghost btn-sm" onclick="openEditContentModal(\'' + post.id + '\')">📝 Edit Content</button>' +
          '<button class="btn btn-danger btn-sm" onclick="confirmDeletePost(\'' + post.id + '\')">🗑️ Delete</button>' +
        '</div>'
      : '';
    var backTarget = post.folderSlug ? '/folder/' + post.folderSlug : '/';
    app.innerHTML =
      '<div class="post-header">' +
        '<div class="breadcrumb">' +
          '<a onclick="router.navigate(\'/\')">Home</a>' +
          (post.folderName
            ? '<span class="sep">›</span><a onclick="router.navigate(\'' + backTarget + '\')">' + escapeHtml(post.folderName) + '</a>'
            : '') +
        '</div>' +
        '<h1 class="post-title">' + escapeHtml(post.title) + '</h1>' +
        '<div class="post-meta">' +
          '<span>' + formatDate(post.createdAt) + '</span>' +
          '<span>·</span>' +
          '<span>' + post.readTime + ' min read</span>' +
          (post.updatedAt !== post.createdAt ? '<span>·</span><span>Updated ' + formatDate(post.updatedAt) + '</span>' : '') +
        '</div>' +
        (post.tags && post.tags.length > 0
          ? '<div class="post-tags">' + post.tags.map(function(t) { return '<span class="tag">' + escapeHtml(t) + '</span>'; }).join('') + '</div>'
          : '') +
        adminActions +
      '</div>' +
      '<button class="toc-mobile-toggle" id="tocMobileToggle" onclick="toggleMobileTOC()" style="display:none">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg> Sections' +
      '</button>' +
      '<div class="toc-mobile" id="tocMobile"></div>' +
      '<div class="post-layout">' +
        '<aside class="toc-sidebar" id="tocSidebar"></aside>' +
        '<div class="post-content">' +
          '<div class="markdown-body">' + post.html + '</div>' +
        '</div>' +
      '</div>';
    if (window.hljs) {
      app.querySelectorAll('pre code').forEach(function(block) {
        hljs.highlightElement(block);
      });
    }
    var markdownBody = app.querySelector('.markdown-body');
    var tocItems = buildTOC(markdownBody);
    if (tocItems && tocItems.length >= 2) {
      var tocHtml = renderTOCHtml(tocItems);
      var tocSidebar = document.querySelector('#tocSidebar');
      var tocMobile = document.querySelector('#tocMobile');
      var tocMobileToggle = document.querySelector('#tocMobileToggle');
      if (tocSidebar) tocSidebar.innerHTML = '<div class="toc-inner">' + tocHtml + '</div>';
      if (tocMobile) tocMobile.innerHTML = tocHtml;
      if (tocMobileToggle) tocMobileToggle.style.display = '';
      setupTOCLinks();
      initScrollSpy();
    } else {
      var tocSidebarEl = document.querySelector('#tocSidebar');
      if (tocSidebarEl) tocSidebarEl.style.display = 'none';
    }
  }).catch(function(err) {
    app.innerHTML =
      '<div class="empty-state"><h3>Post not found</h3><p>' + escapeHtml(err.message) + '</p><br>' +
      '<button class="btn btn-primary" onclick="router.navigate(\'/\')">← Go Home</button></div>';
  });
}

function renderNotFound() {
  $('#app').innerHTML =
    '<div class="empty-state"><h3>Page not found</h3><p>The page you are looking for does not exist.</p><br>' +
    '<button class="btn btn-primary" onclick="router.navigate(\'/\')">← Go Home</button></div>';
}

function openLoginModal() {
  $('#loginForm').reset();
  var w = $('#turnstileWidget');
  if (CF_SITE_KEY && w) {
    w.setAttribute('data-sitekey', CF_SITE_KEY);
    w.innerHTML = '';
    if (window.turnstile) {
      window.turnstile.render('#turnstileWidget', { sitekey: CF_SITE_KEY });
    }
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
  btn.textContent = 'Logging in...';
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
  $('#fileUploadGroup').style.display = '';
  $('#editorGroup').style.display = 'none';
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
    $('#postSubmitBtn').textContent = 'Save Changes';
    $('#fileUploadGroup').style.display = 'none';
    $('#editorGroup').style.display = 'none';
    $$('#postModal .tab-bar').forEach(function(el) { el.style.display = 'none'; });
    $('#postModal').classList.add('active');
  }).catch(function(err) { toast(err.message, 'error'); });
}

function closePostModal() {
  $('#postModal').classList.remove('active');
  $$('#postModal .tab-bar').forEach(function(el) { el.style.display = ''; });
}

function switchTab(btn, tab) {
  $$('.tab-bar button').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  activeTab = tab;
  if (tab === 'upload') {
    $('#fileUploadGroup').style.display = '';
    $('#editorGroup').style.display = 'none';
  } else {
    $('#fileUploadGroup').style.display = 'none';
    $('#editorGroup').style.display = '';
  }
}

function handleFileSelect(file) {
  var ext = file.name.split('.').pop().toLowerCase();
  if (ext !== 'md' && ext !== 'markdown') {
    toast('Please select a .md file', 'error');
    return;
  }
  selectedFile = file;
  $('#fileName').textContent = '📎 ' + file.name;
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
    btn.textContent = editId ? 'Save Changes' : 'Publish';
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

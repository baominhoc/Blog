require('dotenv').config();
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const { marked } = require('marked');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin123';
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-this-secret';
const CF_SECRET = process.env.CF_TURNSTILE_SECRET_KEY || '';

const DATA_DIR = path.join(__dirname, 'data');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');
const FOLDERS_FILE = path.join(DATA_DIR, 'folders.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

[DATA_DIR, UPLOADS_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});
if (!fs.existsSync(POSTS_FILE)) fs.writeFileSync(POSTS_FILE, '[]');
if (!fs.existsSync(FOLDERS_FILE)) fs.writeFileSync(FOLDERS_FILE, '[]');

marked.setOptions({ breaks: true, gfm: true });

marked.use({
  renderer: {
    code(code, info) {
      const text = typeof code === 'string' ? code : (code || '').toString();
      const lang = typeof info === 'string' ? info.trim() : '';
      const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      if (lang) {
        return '<pre><code class="hljs language-' + lang + '">' + escaped + '</code></pre>\n';
      }
      return '<pre><code class="hljs">' + escaped + '</code></pre>\n';
    }
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.md' || ext === '.markdown') cb(null, true);
    else cb(new Error('Only .md files allowed'));
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); }
  catch { return []; }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}
function readPosts() { return readJSON(POSTS_FILE); }
function writePosts(p) { writeJSON(POSTS_FILE, p); }
function readFolders() { return readJSON(FOLDERS_FILE); }
function writeFolders(f) { writeJSON(FOLDERS_FILE, f); }

function extractTitle(md) {
  for (const line of md.split('\n')) {
    const m = line.match(/^#{1,2}\s+(.+)/);
    if (m) return m[1].trim();
  }
  return null;
}

function slugify(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80);
}

function readTime(text) {
  return Math.max(1, Math.ceil(text.split(/\s+/).length / 200));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax',
  },
}));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

async function verifyTurnstile(token) {
  if (!CF_SECRET || CF_SECRET === '1x0000000000000000000000000000000AA') return true;
  try {
    const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${encodeURIComponent(CF_SECRET)}&response=${encodeURIComponent(token)}`,
    });
    const data = await resp.json();
    return data.success === true;
  } catch { return false; }
}

app.post('/api/auth/login', async (req, res) => {
  const { username, password, cfToken } = req.body;
  const ok = await verifyTurnstile(cfToken || '');
  if (!ok) return res.status(403).json({ error: 'Verification failed' });
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.isAdmin = true;
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'Invalid credentials' });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

app.get('/api/auth/check', (req, res) => {
  res.json({ isAdmin: !!(req.session && req.session.isAdmin) });
});

app.get('/api/folders', (req, res) => {
  const folders = readFolders();
  const posts = readPosts();
  const { search } = req.query;
  let result = folders
    .map(f => ({
      ...f,
      postCount: posts.filter(p => p.folderId === f.id).length,
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(f =>
      f.name.toLowerCase().includes(q) ||
      (f.description && f.description.toLowerCase().includes(q))
    );
  }
  res.json(result);
});

app.get('/api/folders/:id', (req, res) => {
  const folders = readFolders();
  const folder = folders.find(f => f.id === req.params.id || f.slug === req.params.id);
  if (!folder) return res.status(404).json({ error: 'Folder not found' });
  const posts = readPosts()
    .filter(p => p.folderId === folder.id)
    .map(({ content, ...rest }) => rest)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ ...folder, posts });
});

app.post('/api/folders', requireAdmin, (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const folders = readFolders();
  const id = uuidv4();
  const folder = {
    id,
    name: name.trim(),
    slug: slugify(name) || id,
    description: (description || '').trim(),
    createdAt: new Date().toISOString(),
  };
  folders.push(folder);
  writeFolders(folders);
  res.status(201).json(folder);
});

app.put('/api/folders/:id', requireAdmin, (req, res) => {
  const folders = readFolders();
  const idx = folders.findIndex(f => f.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  if (req.body.name) {
    folders[idx].name = req.body.name.trim();
    folders[idx].slug = slugify(req.body.name) || folders[idx].id;
  }
  if (req.body.description !== undefined) {
    folders[idx].description = req.body.description.trim();
  }
  writeFolders(folders);
  res.json(folders[idx]);
});

app.delete('/api/folders/:id', requireAdmin, (req, res) => {
  let folders = readFolders();
  if (!folders.find(f => f.id === req.params.id)) {
    return res.status(404).json({ error: 'Not found' });
  }
  let posts = readPosts();
  posts = posts.filter(p => p.folderId !== req.params.id);
  writePosts(posts);
  folders = folders.filter(f => f.id !== req.params.id);
  writeFolders(folders);
  res.json({ ok: true });
});

app.get('/api/posts/:id', (req, res) => {
  const posts = readPosts();
  const post = posts.find(p => p.id === req.params.id || p.slug === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const folders = readFolders();
  const folder = folders.find(f => f.id === post.folderId);
  res.json({
    ...post,
    html: marked(post.content),
    folderName: folder ? folder.name : null,
    folderSlug: folder ? folder.slug : null,
  });
});

app.post('/api/posts', requireAdmin, upload.single('markdown'), (req, res) => {
  try {
    let md = '';
    let origName = '';
    if (req.file) {
      md = fs.readFileSync(req.file.path, 'utf-8');
      origName = req.file.originalname;
    } else if (req.body.content) {
      md = req.body.content;
    } else {
      return res.status(400).json({ error: 'No content' });
    }
    if (!req.body.folderId) return res.status(400).json({ error: 'Folder required' });
    const title = req.body.title || extractTitle(md) || origName.replace(/\.(md|markdown)$/, '') || 'Untitled';
    const tags = req.body.tags ? req.body.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const posts = readPosts();
    const id = uuidv4();
    posts.push({
      id,
      folderId: req.body.folderId,
      slug: slugify(title) || id,
      title,
      description: req.body.description || '',
      tags,
      content: md,
      readTime: readTime(md),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    writePosts(posts);
    res.status(201).json({ id, title });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/posts/:id', requireAdmin, upload.single('markdown'), (req, res) => {
  try {
    const posts = readPosts();
    const idx = posts.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    if (req.file) {
      posts[idx].content = fs.readFileSync(req.file.path, 'utf-8');
    } else if (req.body.content) {
      posts[idx].content = req.body.content;
    }
    if (req.body.title) posts[idx].title = req.body.title;
    if (req.body.description !== undefined) posts[idx].description = req.body.description;
    if (req.body.folderId) posts[idx].folderId = req.body.folderId;
    if (req.body.tags !== undefined) {
      posts[idx].tags = req.body.tags.split(',').map(t => t.trim()).filter(Boolean);
    }
    posts[idx].readTime = readTime(posts[idx].content);
    posts[idx].updatedAt = new Date().toISOString();
    writePosts(posts);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/posts/:id', requireAdmin, (req, res) => {
  const posts = readPosts();
  const filtered = posts.filter(p => p.id !== req.params.id);
  if (filtered.length === posts.length) return res.status(404).json({ error: 'Not found' });
  writePosts(filtered);
  res.json({ ok: true });
});

app.get('/api/tags', (req, res) => {
  const posts = readPosts();
  const map = {};
  posts.forEach(p => (p.tags || []).forEach(t => { map[t] = (map[t] || 0) + 1; }));
  res.json(map);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) return res.status(400).json({ error: err.message });
  if (err) return res.status(400).json({ error: err.message });
  next();
});

app.listen(PORT, () => {
  console.log(`\n  ✦ Blog running at http://localhost:${PORT}\n`);
});

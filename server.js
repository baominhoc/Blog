require('dotenv').config();
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const { marked } = require('marked');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin123';
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-this-secret';
const CF_SECRET = process.env.CF_TURNSTILE_SECRET_KEY || '';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/blog';

const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ── MongoDB Models ──
const folderSchema = new mongoose.Schema({
  id:          { type: String, required: true, unique: true },
  name:        { type: String, required: true },
  slug:        { type: String, required: true },
  description: { type: String, default: '' },
  createdAt:   { type: Date, default: Date.now },
});
folderSchema.index({ slug: 1 });
const Folder = mongoose.model('Folder', folderSchema);

const postSchema = new mongoose.Schema({
  id:          { type: String, required: true, unique: true },
  folderId:    { type: String, required: true },
  slug:        { type: String, required: true },
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  tags:        { type: [String], default: [] },
  content:     { type: String, default: '' },
  readTime:    { type: Number, default: 1 },
  createdAt:   { type: Date, default: Date.now },
  updatedAt:   { type: Date, default: Date.now },
});
postSchema.index({ slug: 1 });
postSchema.index({ folderId: 1 });
const Post = mongoose.model('Post', postSchema);

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

// (file helpers removed — using MongoDB now)

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

app.get('/api/folders', async (req, res) => {
  try {
    const { search } = req.query;
    let filter = {};
    if (search) {
      const q = new RegExp(search, 'i');
      filter = { $or: [{ name: q }, { description: q }] };
    }
    const folders = await Folder.find(filter).sort({ createdAt: -1 }).lean();
    const result = await Promise.all(folders.map(async f => ({
      ...f,
      _id: undefined,
      __v: undefined,
      postCount: await Post.countDocuments({ folderId: f.id }),
    })));
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/folders/:id', async (req, res) => {
  try {
    const folder = await Folder.findOne({
      $or: [{ id: req.params.id }, { slug: req.params.id }]
    }).lean();
    if (!folder) return res.status(404).json({ error: 'Folder not found' });
    const posts = await Post.find({ folderId: folder.id })
      .select('-content -__v -_id')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ ...folder, _id: undefined, __v: undefined, posts });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/folders', requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const id = uuidv4();
    const folder = await Folder.create({
      id,
      name: name.trim(),
      slug: slugify(name) || id,
      description: (description || '').trim(),
    });
    res.status(201).json(folder.toObject({ versionKey: false }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/folders/:id', requireAdmin, async (req, res) => {
  try {
    const folder = await Folder.findOne({ id: req.params.id });
    if (!folder) return res.status(404).json({ error: 'Not found' });
    if (req.body.name) {
      folder.name = req.body.name.trim();
      folder.slug = slugify(req.body.name) || folder.id;
    }
    if (req.body.description !== undefined) {
      folder.description = req.body.description.trim();
    }
    await folder.save();
    res.json(folder.toObject({ versionKey: false }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/folders/:id', requireAdmin, async (req, res) => {
  try {
    const folder = await Folder.findOne({ id: req.params.id });
    if (!folder) return res.status(404).json({ error: 'Not found' });
    await Post.deleteMany({ folderId: req.params.id });
    await Folder.deleteOne({ id: req.params.id });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/posts/:id', async (req, res) => {
  try {
    const post = await Post.findOne({
      $or: [{ id: req.params.id }, { slug: req.params.id }]
    }).lean();
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const folder = await Folder.findOne({ id: post.folderId }).lean();
    res.json({
      ...post,
      _id: undefined,
      __v: undefined,
      html: marked(post.content),
      folderName: folder ? folder.name : null,
      folderSlug: folder ? folder.slug : null,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/posts', requireAdmin, upload.single('markdown'), async (req, res) => {
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
    const id = uuidv4();
    const post = await Post.create({
      id,
      folderId: req.body.folderId,
      slug: slugify(title) || id,
      title,
      description: req.body.description || '',
      tags,
      content: md,
      readTime: readTime(md),
    });
    res.status(201).json({ id: post.id, title: post.title });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/posts/:id', requireAdmin, upload.single('markdown'), async (req, res) => {
  try {
    const post = await Post.findOne({ id: req.params.id });
    if (!post) return res.status(404).json({ error: 'Not found' });
    if (req.file) {
      post.content = fs.readFileSync(req.file.path, 'utf-8');
    } else if (req.body.content) {
      post.content = req.body.content;
    }
    if (req.body.title) post.title = req.body.title;
    if (req.body.description !== undefined) post.description = req.body.description;
    if (req.body.folderId) post.folderId = req.body.folderId;
    if (req.body.tags !== undefined) {
      post.tags = req.body.tags.split(',').map(t => t.trim()).filter(Boolean);
    }
    post.readTime = readTime(post.content);
    post.updatedAt = new Date();
    await post.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/posts/:id', requireAdmin, async (req, res) => {
  try {
    const result = await Post.deleteOne({ id: req.params.id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/tags', async (req, res) => {
  try {
    const posts = await Post.find({}, 'tags').lean();
    const map = {};
    posts.forEach(p => (p.tags || []).forEach(t => { map[t] = (map[t] || 0) + 1; }));
    res.json(map);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) return res.status(400).json({ error: err.message });
  if (err) return res.status(400).json({ error: err.message });
  next();
});

// ── Connect MongoDB then start server ──
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('  ✦ Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`  ✦ Blog running at http://localhost:${PORT}\n`);
    });
  })
  .catch(err => {
    console.error('  ✖ MongoDB connection error:', err.message);
    process.exit(1);
  });

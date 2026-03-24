/**
 * Migration script: import existing JSON data into MongoDB
 * Run once: node migrate.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/blog';

const folderSchema = new mongoose.Schema({
  id: String, name: String, slug: String, description: String, createdAt: Date,
});
const postSchema = new mongoose.Schema({
  id: String, folderId: String, slug: String, title: String, description: String,
  tags: [String], content: String, readTime: Number, createdAt: Date, updatedAt: Date,
});
const Folder = mongoose.model('Folder', folderSchema);
const Post = mongoose.model('Post', postSchema);

async function migrate() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const dataDir = path.join(__dirname, 'data');
  const foldersFile = path.join(dataDir, 'folders.json');
  const postsFile = path.join(dataDir, 'posts.json');

  // Import folders
  if (fs.existsSync(foldersFile)) {
    const folders = JSON.parse(fs.readFileSync(foldersFile, 'utf-8'));
    if (folders.length > 0) {
      await Folder.deleteMany({});
      await Folder.insertMany(folders);
      console.log(`✓ Imported ${folders.length} folders`);
    } else {
      console.log('  No folders to import');
    }
  }

  // Import posts
  if (fs.existsSync(postsFile)) {
    const posts = JSON.parse(fs.readFileSync(postsFile, 'utf-8'));
    if (posts.length > 0) {
      await Post.deleteMany({});
      await Post.insertMany(posts);
      console.log(`✓ Imported ${posts.length} posts`);
    } else {
      console.log('  No posts to import');
    }
  }

  console.log('\n✦ Migration complete!');
  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});

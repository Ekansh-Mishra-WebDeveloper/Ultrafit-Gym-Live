// routes/upload.js
const express = require('express');
const multer = require('multer');
const { cloudinary } = require('../config/cloudinary');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Member = require('../models/Member');

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Custom auth: try admin first, then member
const tryBothAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    // Try to verify as admin
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.id);
    if (admin) {
      req.admin = admin;
      return next();
    }
    // Not admin, try as member
    const member = await Member.findById(decoded.id);
    if (member) {
      req.member = member;
      return next();
    }
    return res.status(401).json({ error: 'Invalid token – user not found' });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

router.post('/', tryBothAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'ultrafit_gym' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });
    res.json({ url: result.secure_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

module.exports = router;
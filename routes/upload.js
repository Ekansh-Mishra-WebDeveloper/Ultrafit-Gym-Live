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

// Custom auth that works for both admin and member
const tryBothAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.id);
    if (admin) {
      req.admin = admin;
      return next();
    }
    const member = await Member.findById(decoded.id);
    if (member) {
      req.member = member;
      return next();
    }
    return res.status(401).json({ error: 'User not found' });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

router.post('/', tryBothAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Determine resource_type based on mimetype
    let resourceType = 'auto';
    if (req.file.mimetype.startsWith('image/')) resourceType = 'image';
    else if (req.file.mimetype.startsWith('video/')) resourceType = 'video';

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'ultrafit_gym',
          resource_type: resourceType,    // 👈 critical for videos
          allowed_formats: ['jpg', 'png', 'webp', 'mp4', 'mov', 'avi']
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });

    res.json({ url: result.secure_url });
  } catch (err) {
    console.error('Upload error:', err);   // 👈 see this in server console
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

module.exports = router;
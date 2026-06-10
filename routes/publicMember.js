const express = require('express');
const router = express.Router();
const Member = require('../models/Member');

const DEFAULT_AVATAR = 'https://img.freepik.com/premium-vector/default-avatar-profile-icon-social-media-user-image-gray-avatar-icon-blank-profile-silhouette-vector-illustration_561158-3407.jpg';

router.get('/', async (req, res) => {
  try {
    const members = await Member.find(
      {},
      'name age since photoUrl experience goal featured featuredTag status feeStatus'
    );

    const enriched = members.map(m => ({
      _id: m._id,
      name: m.name || '',
      age: m.age || 25,
      since: m.since || '2024',
      photoUrl: m.photoUrl && m.photoUrl !== 'defaultpfp.png' 
        ? (m.photoUrl.startsWith('http') ? m.photoUrl : `/uploads/${m.photoUrl}`)
        : DEFAULT_AVATAR,
      experience: m.experience || 'beginner',
      goal: m.goal || 'musclegain',
      featured: m.featured === true,
      featuredTag: m.featuredTag || 'Featured',  // fallback
      status: m.status || 'active',
      feeStatus: m.feeStatus || 'paid'
    }));

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

module.exports = router;
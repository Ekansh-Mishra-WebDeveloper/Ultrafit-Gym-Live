const express = require('express');
const router = express.Router();
const Member = require('../models/Member');

// GET /api/members-list - public, no auth
router.get('/', async (req, res) => {
  try {
    const members = await Member.find(
      {},
      // Select only fields needed by the public page
      'name age since photoUrl experience goal featured featuredTag status'
    );
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
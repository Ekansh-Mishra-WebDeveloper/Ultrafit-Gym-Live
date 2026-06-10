const express = require('express');
const router = express.Router();
const Member = require('../models/Member'); // adjust path to your Member model

// GET all members (public – no auth)
router.get('/', async (req, res) => {
  try {
    const members = await Member.find();
    // Optionally filter out sensitive fields (e.g., password, email)
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
// Import required modules
const express = require('express');
const router = express.Router();
const Report = require('../Models/Report');

// Define routes
router.post('/user', async (req, res) => {
  try {
    const newUserReport = { /* Extract report data from request body */ };
    await Report.findOneAndUpdate({}, { $push: { UserReports: newUserReport } }, { upsert: true, new: true });
    res.status(200).json({ message: 'User report added successfully' });
  } catch (error) {
    console.error('Error adding user report:', error);
    res.status(500).json({ message: 'Error adding user report', error });
  }
});

router.post('/guild', async (req, res) => {
  try {
    const newGuildReport = { /* Extract report data from request body */ };
    await Report.findOneAndUpdate({}, { $push: { GuildReports: newGuildReport } }, { upsert: true, new: true });
    res.status(200).json({ message: 'Guild report added successfully' });
  } catch (error) {
    console.error('Error adding guild report:', error);
    res.status(500).json({ message: 'Error adding guild report', error });
  }
});

// Export the router
module.exports = router;
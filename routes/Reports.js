const express = require('express');
const router = express.Router();
const Report = require('../Models/Report');

router.post('/user/:ReporterId/:TravelerId', async (req, res) => {
  try {
    const {  TravelerUserName, ReasonForReport, ReportDetails } = req.body;
    const newUserReport = {
      Reporter: req.params.ReporterId,
      TravelerId: req.params.TravelerId,
      TravelerUserName,
      ReasonForReport,
      ReportDetails,
      ReportDate: new Date() 
    };
    await Report.findOneAndUpdate({}, { $push: { UserReports: newUserReport } }, { upsert: true, new: true });
    res.status(200).json({ message: 'User report added successfully' });
  } catch (error) {
    console.error('Error adding user report:', error);
    res.status(500).json({ message: 'Error adding user report', error });
  }
});

router.post('/guild/:ReporterId/:GuildId', async (req, res) => {
  try {
    const { GuildName, ReasonForReport, ReportDetails } = req.body;
    const newGuildReport = {
      Reporter: req.params.ReporterId,
      GuildId: req.params.GuildId,
      GuildName,
      ReasonForReport,
      ReportDetails,
      ReportDate: new Date() 
    };
    await Report.findOneAndUpdate({}, { $push: { GuildReports: newGuildReport } }, { upsert: true, new: true });
    res.status(200).json({ message: 'Guild report added successfully' });
  } catch (error) {
    console.error('Error adding guild report:', error);
    res.status(500).json({ message: 'Error adding guild report', error });
  }
});

module.exports = router;
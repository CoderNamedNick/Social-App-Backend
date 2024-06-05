const mongoose = require('mongoose');

const userReportSchema = new mongoose.Schema({
  Reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  TravelerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  TravelerUserName: { type: String, required: true },
  ReasonForReport: { type: String, required: true },
  ReportDetails: { type: String, required: true },
  ReportDate: { type: Date, default: Date.now }
});

const guildReportSchema = new mongoose.Schema({
  Reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  GuildId: { type: mongoose.Schema.Types.ObjectId, ref: 'Guild', required: true },
  GuildName: { type: String, required: true },
  ReasonForReport: { type: String, required: true },
  ReportDetails: { type: String, required: true },
  ReportDate: { type: Date, default: Date.now }
});

const reportSchema = new mongoose.Schema({
  UserReports: [userReportSchema],
  GuildReports: [guildReportSchema]
});

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;
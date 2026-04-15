const cron = require("node-cron");
const Meeting = require("../models/Meeting");
const User = require("../models/User");
const Project = require("../models/Project");
const { sendMail } = require("../config/mailer");
const { meetingReminderTemplate } = require("./emailTemplates");
const logger = require("./logger");

const initMeetingCron = () => {
  // Run every minute
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      // Look for meetings exactly 15 mins away (give or take a minute for cron execution drift)
      const targetTimeMin = new Date(now.getTime() + 14 * 60000);
      const targetTimeMax = new Date(now.getTime() + 16 * 60000);

      const upcomingMeetings = await Meeting.find({
        status: "scheduled",
        isReminderSent: false,
        startTime: {
          $gte: targetTimeMin,
          $lt: targetTimeMax,
        },
      }).populate("participants", "email username");

      for (const meeting of upcomingMeetings) {
        if (meeting.participants && meeting.participants.length > 0) {
          const project = await Project.findById(meeting.projectId);
          const title = meeting.title;
          const projectName = project ? project.name : "CodeX Project";
          const meetingUrl = meeting.meetingLink;

          for (const participant of meeting.participants) {
            try {
              const html = meetingReminderTemplate(title, projectName, meetingUrl);
              await sendMail(participant.email, `Reminder: ${title} starts in 15 mins!`, html);
            } catch (err) {
              logger.error(`Cron: Failed to send reminder to ${participant.email}`, err);
            }
          }
          
          // Mark as sent
          meeting.isReminderSent = true;
          await meeting.save();
        }
      }
    } catch (err) {
      logger.error("Error in meeting cron job", err);
    }
  });

  logger.info("Meeting reminder cron job initialized");
};

module.exports = initMeetingCron;

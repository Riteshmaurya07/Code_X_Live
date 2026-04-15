/**
 * Generates a styled HTML email template wrapper
 */
const emailWrapper = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background-color: #0a0e17; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background: linear-gradient(135deg, #12162b 0%, #1a1f3a 100%); border-radius: 16px; padding: 40px; border: 1px solid rgba(99, 102, 241, 0.2); }
    .logo { text-align: center; margin-bottom: 30px; }
    .logo h1 { color: #818cf8; font-size: 28px; margin: 0; letter-spacing: -0.5px; }
    .logo span { color: #6366f1; }
    h2 { color: #e2e8f0; font-size: 22px; margin: 0 0 16px; }
    p { color: #94a3b8; font-size: 15px; line-height: 1.6; margin: 0 0 16px; }
    .highlight { color: #818cf8; font-weight: 600; }
    .project-box { background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.25); border-radius: 10px; padding: 16px 20px; margin: 20px 0; }
    .project-name { color: #c7d2fe; font-size: 18px; font-weight: 600; margin: 0; }
    .project-role { color: #818cf8; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
    .btn { display: inline-block; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; margin-top: 24px; transition: all 0.2s; }
    .btn-primary { background: linear-gradient(135deg, #6366f1, #818cf8); color: #ffffff !important; }
    .btn-success { background: linear-gradient(135deg, #059669, #10b981); color: #ffffff !important; }
    .divider { border: none; border-top: 1px solid rgba(99, 102, 241, 0.15); margin: 30px 0; }
    .footer { text-align: center; margin-top: 30px; }
    .footer p { color: #475569; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">
        <h1>Code<span>X</span> Live</h1>
      </div>
      ${content}
      <hr class="divider">
      <div class="footer">
        <p>CodeX Live — Real-time Collaborative Code Editor</p>
        <p>This email was sent because someone invited you to collaborate.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

/**
 * Invitation email sent to the invitee
 */
const invitationEmail = (inviterName, projectName, role, acceptUrl, dashboardUrl) => {
  return emailWrapper(`
    <h2>You've Been Invited! 🎉</h2>
    <p>
      <span class="highlight">@${inviterName}</span> has invited you to collaborate on a project.
    </p>
    <div class="project-box">
      <p class="project-name">📁 ${projectName}</p>
      <p class="project-role">Role: ${role}</p>
    </div>
    <p>
      You can accept or decline this invitation from your dashboard, or click the button below to go there directly.
    </p>
    <div style="text-align: center;">
      <a href="${dashboardUrl}" class="btn btn-primary">View Invitation →</a>
    </div>
    <p style="margin-top: 24px; font-size: 13px; color: #64748b;">
      This invitation will expire in 7 days. If you don't recognize this invitation, you can safely ignore it.
    </p>
  `);
};

/**
 * Acceptance notification email sent to the project owner
 */
const acceptedEmail = (accepterName, projectName, projectUrl) => {
  return emailWrapper(`
    <h2>Invitation Accepted! ✅</h2>
    <p>
      Great news! <span class="highlight">@${accepterName}</span> has accepted your invitation to collaborate.
    </p>
    <div class="project-box">
      <p class="project-name">📁 ${projectName}</p>
      <p class="project-role">Now a collaborator</p>
    </div>
    <p>
      They now have access to the project and can start collaborating with you in real-time.
    </p>
    <div style="text-align: center;">
      <a href="${projectUrl}" class="btn btn-success">Open Project →</a>
    </div>
  `);
};

/**
 * Decline notification email sent to the project owner
 */
const declinedEmail = (declinerName, projectName) => {
  return emailWrapper(`
    <h2>Invitation Declined</h2>
    <p>
      <span class="highlight">@${declinerName}</span> has declined your invitation to collaborate on the project below.
    </p>
    <div class="project-box">
      <p class="project-name">📁 ${projectName}</p>
    </div>
    <p>
      You can invite other collaborators from the Share menu in your project.
    </p>
  `);
};

/**
 * Meeting Invite email sent to participants
 */
const meetingInviteTemplate = (creatorName, projectName, meetingTitle, startTimeStr, meetingUrl) => {
  return emailWrapper(`
    <h2>You're Invited to a Meeting! 📅</h2>
    <p>
      <span class="highlight">@${creatorName}</span> has scheduled a meeting for the project: <strong>${projectName}</strong>
    </p>
    <div class="project-box">
      <p class="project-name">🎥 ${meetingTitle}</p>
      <p class="project-role">Time: ${startTimeStr}</p>
    </div>
    <p>
      You can join the meeting directly from the CodeX Live editor or via the link below:
    </p>
    <div style="text-align: center;">
      <a href="${meetingUrl}" class="btn btn-primary" target="_blank">Join Meeting →</a>
    </div>
  `);
};

/**
 * Reminder email sent to participants 15 mins before
 */
const meetingReminderTemplate = (meetingTitle, projectName, meetingUrl) => {
  return emailWrapper(`
    <h2>Meeting Starts Soon! ⏳</h2>
    <p>
      Your meeting <strong>${meetingTitle}</strong> for project <strong>${projectName}</strong> starts in 15 minutes!
    </p>
    <div style="text-align: center;">
      <a href="${meetingUrl}" class="btn btn-primary" target="_blank">Join Meeting →</a>
    </div>
  `);
};

module.exports = { invitationEmail, acceptedEmail, declinedEmail, meetingInviteTemplate, meetingReminderTemplate };

// utils/mailer.js
const Brevo = require('@getbrevo/brevo');
const client = new Brevo.TransactionalEmailsApi();
client.authentications['apiKey'].apiKey = process.env.BREVO_API_KEY;

// --- Configuration ---

const sender = {
  name: 'Brain-O-Math Olympiad',
  email: 'doonheritageschool@brainomath.online'
};

/**
 * Define your coordinator portal's login URL here.
 * It's best to set this as an environment variable (e.g., in a .env file).
 */
const PORTAL_URL = process.env.PORTAL_URL || 'https://brainomath.online/coordinator-login';

// --- Reusable Email Styles (for inline CSS) ---
// --- [UPDATED] ---
// Styles adjusted for a wider, more spacious, and "expanded" professional look.

const styles = {
  body: `font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; box-sizing: border-box; font-size: 17px; line-height: 1.7; color: #333; margin: 0; padding: 0;`,
  container: `width: 100%; max-width: 680px; margin: 0 auto; padding: 0;`, // Was 600px
  header: `background-color: #2c3e50; padding: 30px; text-align: center; color: #ffffff; border-top-left-radius: 5px; border-top-right-radius: 5px;`, // Was 25px
  headerTitle: `margin: 0; font-size: 26px; font-weight: bold;`, // Was 24px
  content: `background-color: #ffffff; padding: 40px; border: 1px solid #ddd; border-top: 0; border-bottom: 0;`, // Was 30px
  contentTitle: `color: #2c3e50; margin-top: 0; margin-bottom: 25px; font-size: 24px;`, // Was 22px
  footer: `background-color: #f8f9fa; padding: 30px; text-align: center; color: #777; font-size: 13px; border-bottom-left-radius: 5px; border-bottom-right-radius: 5px; border-top: 1px solid #eee;`, // Was 25px padding, 12px font
  card: `background-color: #f8f9fa; padding: 25px; border-radius: 5px; margin: 25px 0; border: 1px solid #eee;`, // Was 20px padding
  highlightBox: `background-color: #e8f5e8; padding: 20px; border-radius: 5px; margin: 25px 0; border: 1px solid #d0e9d0;`, // Was 15px padding
  button: `display: inline-block; padding: 14px 28px; margin: 25px 0; background-color: #3498db; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; -webkit-text-size-adjust: none; mso-hide: all;`, // Was 12px 25px
  signature: `margin-top: 30px; line-height: 1.7; color: #555;` // Was 25px
};

// --- Base Email Template ---
// --- [UNCHANGED] ---
// This HTML structure is robust and works with the new styles.

/**
 * 🎨 Creates a professional, responsive HTML email layout.
 * @param {string} title - The main heading for the email content.
 * @param {string} content - The HTML content for the email body.
 * @returns {string} - The full HTML email string.
 */
function createEmailLayout(title, content) {
  const year = new Date().getFullYear();
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="ie=edge">
      <title>${title}</title>
      <style>
        body { ${styles.body} }
        /* Target all <p> tags with the base body style */
        p { ${styles.body} } 
      </style>
    </head>
    <body style="${styles.body}">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="${styles.container}">
              <tr>
                <td style="${styles.header}">
                  <h1 style="${styles.headerTitle}">Brain-O-Math Olympiad</h1>
                </td>
              </tr>
              <tr>
                <td style="${styles.content}">
                  <h2 style="${styles.contentTitle}">${title}</h2>
                  ${content}
                </td>
              </tr>
              <tr>
                <td style="${styles.footer}">
                  <p style="margin: 0 0 10px 0; font-size: 13px; color: #777;">© ${year} Brain-O-Math Olympiad. All rights reserved.</p>
                  <p style="margin: 0; font-size: 13px; color: #777;">Need help? Contact us: 
                    <a href="mailto:brainomathorg@gmail.com" style="color: #2c3e50; text-decoration: none; font-weight: bold;">brainomathorg@gmail.com</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// --- Core Email Sending Function ---
// --- [UNCHANGED] ---

/**
 * 📨 Common send email function
 * This function remains unchanged as requested.
 */
async function sendEmail({ to, subject, htmlContent }) {
  try {
    const emailData = {
      sender,
      to: [{ email: to }],
      subject,
      htmlContent,
    };

    const response = await client.sendTransacEmail(emailData);
    console.log(` Email sent to ${to}:`, response.messageId || 'Success');
    return response;
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error.message);
    if (error.response) {
      console.error('Error Body:', error.response.body);
    } else {
      console.error('Error Details:', error); // Log full error if no API response
    }
    return null;
  }
}

// --- Specific Email Functions ---
// --- [UNCHANGED LOGIC, BUT WILL USE NEW STYLES] ---

/**
 * 👋 Welcome Email for Coordinators
 */
async function sendCoordinatorWelcomeEmail(data) {
  const title = 'Welcome to Brain-O-Math Olympiad!';
  const content = `
    <p style="${styles.body}">Dear ${data.coordinatorName},</p>
    <p style="${styles.body}">Your account for the Interschool Brain-O-Math Olympiad 2025 portal has been successfully created.</p>
    
    <div style="${styles.card}">
      <h3 style="margin-top: 0; color: #333;">Registration Details:</h3>
      <p style="margin: 5px 0;"><strong>School:</strong> ${data.schoolName}</p>
      <p style="margin: 5px 0;"><strong>Registration ID:</strong> ${data.registrationId}</p>
      <p style="margin: 5px 0;"><strong>Email:</strong> ${data.coordinatorEmail}</p>
      <p style="margin: 5px 0;"><strong>Phone:</strong> ${data.coordinatorPhone}</p>
    </div>

    <div style="${styles.highlightBox}">
      <h4 style="margin-top: 0; color: #155724;">Login Credentials:</h4>
      <p style="margin: 5px 0;"><strong>Email:</strong> ${data.coordinatorEmail}</p>
      <p style="margin: 5px 0;"><strong>Password:</strong> ${String(data.coordinatorPhone).slice(-4)} (last 4 digits)</p>
    </div>
    
    <p style="${styles.body}">Please log in to your dashboard to manage student registrations.</p>
    
    <a href="${PORTAL_URL}" style="${styles.button}">Login to Dashboard</a>
    
    <p style="${styles.signature}">Best regards,<br>Brain-O-Math Olympiad Team</p>
  `;

  const htmlContent = createEmailLayout(title, content);

  return sendEmail({
    to: data.coordinatorEmail,
    subject: 'Welcome to Brain-O-Math Olympiad - Registration Successful',
    htmlContent: htmlContent
  });
}

/**
 * 👩‍🎓 Student Submission Confirmation
 */
async function sendStudentSubmissionEmail(coordinatorData, studentCount, totalAmount) {
  const title = 'Student Registration Submitted!';
  const content = `
    <p style="${styles.body}">Dear ${coordinatorData.coordinatorName},</p>
    <p style="${styles.body}">Your student registration for Brain-O-Math Olympiad 2025 has been submitted successfully.</p>
    
    <div style="${styles.card}">
      <h3 style="margin-top: 0; color: #333;">Registration Summary:</h3>
      <p style="margin: 5px 0;"><strong>School:</strong> ${coordinatorData.schoolName}</p>
      <p style="margin: 5px 0;"><strong>Registration ID:</strong> ${coordinatorData.registrationId}</p>
      <p style="margin: 5px 0;"><strong>Total Students:</strong> ${studentCount}</p>
      <p style="margin: 5px 0;"><strong>Total Amount:</strong> ₹${totalAmount}</p>
      <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #f39c12; font-weight: bold;">Pending Payment Verification</span></p>
    </div>
    
    <p style="${styles.body}">You will receive another email once your payment is verified by our team.</p>
    
    <p style="${styles.signature}">Regards,<br>Brain-O-Math Olympiad Team</p>
  `;

  const htmlContent = createEmailLayout(title, content);

  return sendEmail({
    to: coordinatorData.coordinatorEmail,
    subject: 'Student Registration Submitted - Brain-O-Math Olympiad',
    htmlContent: htmlContent
  });
}

/**
 * 💳 Payment Verification (Approve/Reject)
 */
async function sendPaymentVerificationEmail(coordinatorData, status, totalAmount, studentCount) {
  const isApproved = status === 'approved' || status === 'verified';
  const title = isApproved ? 'Payment Verified' : 'Payment Rejected';
  const color = isApproved ? '#27ae60' : '#e74c3c'; // Green or Red
  const message = isApproved
    ? 'Your payment has been successfully verified, and your students are now confirmed for the event!'
    : 'Unfortunately, your recent payment could not be verified. Please review the details and contact us for assistance.';

  const content = `
    <p style="${styles.body}">Dear ${coordinatorData.coordinatorName},</p>
    <p style="${styles.body}">${message}</p>
    
    <div style="${styles.card}">
      <h3 style="margin-top: 0; color: #333;">Registration Summary:</h3>
      <p style="margin: 5px 0;"><strong>School:</strong> ${coordinatorData.schoolName}</p>
      <p style="margin: 5px 0;"><strong>Registration ID:</strong> ${coordinatorData.registrationId}</p>
      <p style="margin: 5px 0;"><strong>Total Students:</strong> ${studentCount}</p>
      <p style="margin: 5px 0;"><strong>Total Amount:</strong> ₹${totalAmount}</p>
      <p style="margin: 5px 0; font-size: 18px;"><strong>Status:</strong> <span style="color:${color};font-weight:bold;">${title}</span></p>
    </div>
    
    ${!isApproved ? `<p style="${styles.body}">If you believe this is an error, please reply to this email or contact us at <a href="mailto:brainomathorg@gmail.com" style="color: #2c3e50; text-decoration: none; font-weight: bold;">brainomathorg@gmail.com</a>.</p>` : ''}
    
    <p style="${styles.signature}">Regards,<br>Brain-O-Math Olympiad Team</p>
  `;

  const htmlContent = createEmailLayout(title, content);

  return sendEmail({
    to: coordinatorData.coordinatorEmail,
    subject: `Payment ${title} - Brain-O-Math Olympiad`,
    htmlContent: htmlContent
  });
}

/**
 * 🔑 Coordinator Credentials Reminder (Forgot Password)
 */
async function sendCoordinatorCredentialsEmail(coordinatorData) {
  const title = 'Your Coordinator Login Details';
  const content = `
    <p style="${styles.body}">Dear ${coordinatorData.coordinatorName},</p>
    <p style="${styles.body}">As requested, here are your login credentials for the Brain-O-Math Olympiad 2025 coordinator portal.</p>
    
    <div style="${styles.card}">
      <h3 style="margin-top: 0; color: #333;">Account Details:</h3>
      <p style="margin: 5px 0;"><strong>School:</strong> ${coordinatorData.schoolName}</p>
      <p style="margin: 5px 0;"><strong>Registration ID:</strong> ${coordinatorData.registrationId}</p>
    </div>

    <div style="${styles.highlightBox}">
      <h4 style="margin-top: 0; color: #155724;">Login Credentials:</h4>
      <p style="margin: 5px 0;"><strong>Email:</strong> ${coordinatorData.coordinatorEmail}</p>
      <p style="margin: 5px 0;"><strong>Password:</strong> ${String(coordinatorData.coordinatorPhone).slice(-4)} (last 4 digits of your phone)</p>
    </div>
    
    <a href="${PORTAL_URL}" style="${styles.button}">Login to Portal</a>
    
    <p style="${styles.body} margin-top: 20px;">Your password is tied to your phone number. If you need to change it, please contact the organizers to update your registered phone number.</p>
    
    <p style="${styles.signature}">Regards,<br>Brain-O-Math Olympiad Team</p>
  `;

  const htmlContent = createEmailLayout(title, content);

  return sendEmail({
    to: coordinatorData.coordinatorEmail,
    subject: 'Your Coordinator Login Credentials - Brain-O-Math Olympiad',
    htmlContent: htmlContent
  });
}

/**
 * Send admit card release notification to coordinators
 */
async function sendAdmitCardReleaseNotification(coordinatorEmail, coordinatorName, studentCount, schoolName) {
  const title = ' Admit Cards Released!';
  const PORTAL_URL = process.env.PORTAL_URL || 'https://brainomath.online/coordinator-login';
  
  const content = `
    <p>Dear <strong>${coordinatorName}</strong>,</p>
    
    <p> The admit cards for your students have been released and are now available for download.</p>
    
    <div style="${styles.card}">
      <h4 style="margin-top: 0; color: #2c3e50;">Admit Card Summary</h4>
      <p style="margin: 8px 0;"><strong>School:</strong> ${schoolName}</p>
      <p style="margin: 8px 0;"><strong>Students with Admit Cards:</strong> ${studentCount}</p>
      <p style="margin: 8px 0;"><strong>Status:</strong> <span style="color: #10b981; font-weight: bold;">Released & Ready to Download</span></p>
    </div>
    
    <div style="${styles.highlightBox}">
      <h4 style="margin-top: 0; color: #155724;">What to Do Next:</h4>
      <ol style="margin: 10px 0; padding-left: 20px;">
        <li>Login to your coordinator dashboard using your credentials</li>
        <li>Navigate to the "Admit Cards" section</li>
        <li>Download all admit cards for your students</li>
        <li>Print and distribute to your students</li>
      </ol>
    </div>
    
    <a href="${PORTAL_URL}" style="${styles.button}">Open Coordinator Dashboard</a>
    
    <p style="margin-top: 20px; color: #666;">
      <strong>Important:</strong> Please ensure all students have their admit cards before the exam date. 
      If you face any issues downloading the cards, please contact the organizers immediately.
    </p>
    
    <p style="${styles.signature}">Best regards,<br>Brain-O-Math Olympiad Team</p>
  `;

  const htmlContent = createEmailLayout(title, content);

  return sendEmail({
    to: coordinatorEmail,
    subject: ' Admit Cards Released - Download Now - Brain-O-Math Olympiad',
    htmlContent: htmlContent
  });
}

// --- Exports ---
// --- [UNCHANGED] ---
module.exports = {
  sendEmail,
  sendCoordinatorWelcomeEmail,
  sendStudentSubmissionEmail,
  sendPaymentVerificationEmail,
  sendCoordinatorCredentialsEmail,
  sendAdmitCardReleaseNotification,
  sendAdminMessageToCoordinators
};

/**
 * 📢 Send Admin Message to All Coordinators
 */
async function sendAdminMessageToCoordinators(messageContent, senderName = 'Admin') {
  const title = 'Important Notice from Brain-O-Math Olympiad';
  const content = `
    <p style="${styles.body}">Dear Coordinator,</p>
    <p style="${styles.body}">You have received an important message from the Brain-O-Math Olympiad Administration:</p>
    
    <div style="${styles.card}">
      ${messageContent.split('\n').map(line => `<p style="${styles.body}">${line}</p>`).join('')}
    </div>
    
    <p style="${styles.body}">If you have any questions or concerns, please contact us immediately.</p>
    
    <p style="${styles.signature}">Best regards,<br>${senderName}<br>Brain-O-Math Olympiad Team</p>
  `;

  const htmlContent = createEmailLayout(title, content);
  return htmlContent;
}
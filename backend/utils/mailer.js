// utils/mailer.js
const Brevo = require('@getbrevo/brevo');
const client = new Brevo.TransactionalEmailsApi();
client.authentications['apiKey'].apiKey = process.env.BREVO_API_KEY;

const sender = { name: 'Brain-O-Math Olympiad', email: 'doonheritageschool@brainomath.online' };

// 📨 Common send email function
async function sendEmail({ to, subject, htmlContent }) {
  try {
    const emailData = {
      sender,
      to: [{ email: to }],
      subject,
      htmlContent,
    };

    const response = await client.sendTransacEmail(emailData);
    console.log(`✅ Email sent to ${to}:`, response.messageId || 'Success');
    return response;
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error.message);
    if (error.response) {
      console.error('Error details:', error.response.body);
    }
    return null;
  }
}

// 🧑‍🏫 Coordinator Welcome Email
async function sendCoordinatorWelcomeEmail(data) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto;">
      <h2 style="color:#2c3e50;">Welcome to Brain-O-Math Olympiad!</h2>
      <p>Dear ${data.coordinatorName},</p>
      <p>Your account for the Interschool Brain-O-Math Olympiad 2025 portal has been successfully created.</p>
      <div style="background:#f8f9fa;padding:20px;border-radius:5px;">
        <h3>Registration Details:</h3>
        <p><strong>School:</strong> ${data.schoolName}</p>
        <p><strong>Registration ID:</strong> ${data.registrationId}</p>
        <p><strong>Email:</strong> ${data.coordinatorEmail}</p>
        <p><strong>Phone:</strong> ${data.coordinatorPhone}</p>
      </div>
      <div style="background:#e8f5e8;padding:15px;border-radius:5px;">
        <h4>Login Credentials:</h4>
        <p><strong>Email:</strong> ${data.coordinatorEmail}</p>
        <p><strong>Password:</strong> ${data.coordinatorPhone.slice(-4)} (last 4 digits)</p>
      </div>
      <p>Login to your dashboard to manage student registrations.</p>
      <p>Best regards,<br>Brain-O-Math Olympiad Team</p>
    </div>
  `;

  return sendEmail({
    to: data.coordinatorEmail,
    subject: 'Welcome to Brain-O-Math Olympiad - Registration Successful',
    htmlContent: html
  });
}

// 👩‍🎓 Student Submission Email
async function sendStudentSubmissionEmail(coordinatorData, studentCount, totalAmount) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto;">
      <h2 style="color:#2c3e50;">Student Registration Submitted Successfully!</h2>
      <p>Dear ${coordinatorData.coordinatorName},</p>
      <p>Your student registration for Brain-O-Math Olympiad 2025 has been submitted.</p>
      <div style="background:#f8f9fa;padding:20px;border-radius:5px;">
        <h3>Registration Summary:</h3>
        <p><strong>School:</strong> ${coordinatorData.schoolName}</p>
        <p><strong>Registration ID:</strong> ${coordinatorData.registrationId}</p>
        <p><strong>Total Students:</strong> ${studentCount}</p>
        <p><strong>Total Amount:</strong> ₹${totalAmount}</p>
        <p><strong>Status:</strong> Pending Payment Verification</p>
      </div>
      <p>You’ll receive another email once your payment is verified.</p>
      <p>Regards,<br>Brain-O-Math Olympiad Team</p>
    </div>
  `;

  return sendEmail({
    to: coordinatorData.coordinatorEmail,
    subject: 'Student Registration Submitted - Brain-O-Math Olympiad',
    htmlContent: html
  });
}

// 💳 Payment Verification Email
async function sendPaymentVerificationEmail(coordinatorData, status, totalAmount, studentCount) {
  const isApproved = status === 'approved' || status === 'verified';
  const color = isApproved ? '#27ae60' : '#e74c3c';
  const text = isApproved ? 'Payment Verified' : 'Payment Rejected';
  const message = isApproved
    ? 'Your payment has been verified and your students are now registered!'
    : 'Unfortunately, your payment could not be verified. Please contact us.';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto;">
      <h2 style="color:#2c3e50;">${text}</h2>
      <p>Dear ${coordinatorData.coordinatorName},</p>
      <p>${message}</p>
      <div style="background:#f8f9fa;padding:20px;border-radius:5px;">
        <p><strong>School:</strong> ${coordinatorData.schoolName}</p>
        <p><strong>Registration ID:</strong> ${coordinatorData.registrationId}</p>
        <p><strong>Total Students:</strong> ${studentCount}</p>
        <p><strong>Total Amount:</strong> ₹${totalAmount}</p>
        <p><strong>Status:</strong> <span style="color:${color};font-weight:bold;">${text}</span></p>
      </div>
      <p>Regards,<br>Brain-O-Math Olympiad Team</p>
    </div>
  `;

  return sendEmail({
    to: coordinatorData.coordinatorEmail,
    subject: `Payment ${text} - Brain-O-Math Olympiad`,
    htmlContent: html
  });
}

// 🔑 Coordinator Credentials (Forgot Password) Email
async function sendCoordinatorCredentialsEmail(coordinatorData) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto;">
      <h2 style="color:#2c3e50;">Your Coordinator Login Details</h2>
      <p>Dear ${coordinatorData.coordinatorName},</p>
      <p>As requested, here are your login credentials for the Brain-O-Math Olympiad 2025 coordinator portal.</p>
      <div style="background:#f8f9fa;padding:20px;border-radius:5px;">
        <h3>Account Details</h3>
        <p><strong>Registration ID:</strong> ${coordinatorData.registrationId}</p>
        <p><strong>School:</strong> ${coordinatorData.schoolName}</p>
      </div>
      <div style="background:#e8f5e8;padding:15px;border-radius:5px;margin-top:10px;">
        <h4>Login Credentials</h4>
        <p><strong>Email:</strong> ${coordinatorData.coordinatorEmail}</p>
        <p><strong>Password:</strong> ${String(coordinatorData.coordinatorPhone).slice(-4)} (last 4 digits of your phone)</p>
      </div>
      <p style="margin-top:16px;">You can log in at the coordinator portal and change your password by updating your registered phone number with the organizers if needed.</p>
      <p>Regards,<br>Brain-O-Math Olympiad Team</p>
    </div>
  `;

  return sendEmail({
    to: coordinatorData.coordinatorEmail,
    subject: 'Your Coordinator Login Credentials - Brain-O-Math Olympiad',
    htmlContent: html
  });
}

module.exports = {
  sendCoordinatorWelcomeEmail,
  sendStudentSubmissionEmail,
  sendPaymentVerificationEmail,
  sendCoordinatorCredentialsEmail
};

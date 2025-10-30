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

// 📝 Student Submission Email (with student list)
async function sendStudentSubmissionEmail(coordinatorData, students, totalAmount) {
  const studentRows = students.map((s, index) => `
    <tr style="border-bottom:1px solid #ddd;">
      <td style="padding:8px;">${index + 1}</td>
      <td style="padding:8px;">${s.studentId}</td>
      <td style="padding:8px;">${s.name}</td>
      <td style="padding:8px;">${s.class}</td>
      <td style="padding:8px;">${s.category}</td>
      <td style="padding:8px;">₹${s.fee}</td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width:700px; margin:auto;">
      <h2 style="color:#2c3e50;">Student Registration Submitted Successfully!</h2>
      <p>Dear ${coordinatorData.coordinatorName},</p>
      <p>Your student registration for Brain-O-Math Olympiad 2025 has been submitted.</p>
      
      <div style="background:#f8f9fa;padding:20px;border-radius:5px;margin:20px 0;">
        <h3>Registration Summary:</h3>
        <p><strong>School:</strong> ${coordinatorData.schoolName}</p>
        <p><strong>Registration ID:</strong> ${coordinatorData.registrationId}</p>
        <p><strong>Total Students:</strong> ${students.length}</p>
        <p><strong>Total Amount:</strong> ₹${totalAmount}</p>
        <p><strong>Status:</strong> Pending Payment Verification</p>
      </div>

      <h3>Registered Students:</h3>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <thead>
          <tr style="background:#3b82f6;color:white;">
            <th style="padding:10px;text-align:left;">#</th>
            <th style="padding:10px;text-align:left;">Student ID</th>
            <th style="padding:10px;text-align:left;">Name</th>
            <th style="padding:10px;text-align:left;">Class</th>
            <th style="padding:10px;text-align:left;">Category</th>
            <th style="padding:10px;text-align:left;">Fee</th>
          </tr>
        </thead>
        <tbody>
          ${studentRows}
        </tbody>
      </table>

      <p>You'll receive another email once your payment is verified.</p>
      <p>Best regards,<br>Brain-O-Math Olympiad Team</p>
    </div>
  `;

  return sendEmail({
    to: coordinatorData.coordinatorEmail,
    subject: 'Student Registration Submitted - Brain-O-Math Olympiad',
    htmlContent: html
  });
}

// ✅ Payment Verification Email (with student list)
async function sendPaymentVerificationEmail(coordinatorData, students, status, totalAmount) {
  const isApproved = status === 'approved' || status === 'verified';
  const color = isApproved ? '#27ae60' : '#e74c3c';
  const statusText = isApproved ? 'Payment Verified ✅' : 'Payment Rejected ❌';
  const message = isApproved
    ? 'Your payment has been verified and your students are now officially registered for Brain-O-Math Olympiad 2025!'
    : 'Unfortunately, your payment could not be verified. Please contact us at doonheritageschool@brainomath.online for assistance.';

  const studentRows = students.map((s, index) => `
    <tr style="border-bottom:1px solid #ddd;">
      <td style="padding:8px;">${index + 1}</td>
      <td style="padding:8px;">${s.studentId}</td>
      <td style="padding:8px;">${s.name}</td>
      <td style="padding:8px;">${s.class}</td>
      <td style="padding:8px;">${s.category}</td>
      <td style="padding:8px;">₹${s.fee}</td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width:700px; margin:auto;">
      <h2 style="color:${color};">${statusText}</h2>
      <p>Dear ${coordinatorData.coordinatorName},</p>
      <p>${message}</p>
      
      <div style="background:#f8f9fa;padding:20px;border-radius:5px;margin:20px 0;">
        <p><strong>School:</strong> ${coordinatorData.schoolName}</p>
        <p><strong>Registration ID:</strong> ${coordinatorData.registrationId}</p>
        <p><strong>Total Students:</strong> ${students.length}</p>
        <p><strong>Total Amount:</strong> ₹${totalAmount}</p>
        <p><strong>Status:</strong> <span style="color:${color};font-weight:bold;">${statusText}</span></p>
      </div>

      <h3>${isApproved ? 'Verified' : 'Submitted'} Students:</h3>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <thead>
          <tr style="background:${color};color:white;">
            <th style="padding:10px;text-align:left;">#</th>
            <th style="padding:10px;text-align:left;">Student ID</th>
            <th style="padding:10px;text-align:left;">Name</th>
            <th style="padding:10px;text-align:left;">Class</th>
            <th style="padding:10px;text-align:left;">Category</th>
            <th style="padding:10px;text-align:left;">Fee</th>
          </tr>
        </thead>
        <tbody>
          ${studentRows}
        </tbody>
      </table>

      ${isApproved ? '<p><strong>Next Steps:</strong> You will receive the exam schedule and venue details shortly.</p>' : ''}
      
      <p>For any queries, contact us at:<br>
      📧 doonheritageschool@brainomath.online<br>
      📞 +91 XXX XXX XXXX</p>
      
      <p>Best regards,<br>Brain-O-Math Olympiad Team</p>
    </div>
  `;

  return sendEmail({
    to: coordinatorData.coordinatorEmail,
    subject: `${statusText} - Brain-O-Math Olympiad`,
    htmlContent: html
  });
}

module.exports = {
  sendCoordinatorWelcomeEmail,
  sendStudentSubmissionEmail,
  sendPaymentVerificationEmail
};

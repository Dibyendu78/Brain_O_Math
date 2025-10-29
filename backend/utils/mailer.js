// utils/mailer.js
const nodemailer = require('nodemailer');

// Create transporter with timeout settings


// Create transporter with Brevo SMTP
const createTransporter = () => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,     
    port: process.env.EMAIL_PORT,     
    secure: false,                   
    auth: {
      user: process.env.EMAIL_USER,  
      pass: process.env.EMAIL_PASS   
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
    pool: true,
    maxMessages: 1
  });

  // Verify connection on first use
  transporter.verify((error, success) => {
    if (error) {
      console.error('📧 Email transporter verification failed:', error.message);
    } else {
      console.log('✅ Email transporter is ready to send messages via Brevo');
    }
  });

  return transporter;
};


  // Verify connection on first use
 

// Send coordinator welcome email
const sendCoordinatorWelcomeEmail = async (data) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: data.coordinatorEmail,
      subject: 'Welcome to Brain-O-Math Olympiad - Registration Successful',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Welcome to Brain-O-Math Olympiad!</h2>
          <p>Dear ${data.coordinatorName},</p>
          
          <p>Your account for the Interschool Brain-O-Math Olympiad 2025 portal has been successfully created!</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #2c3e50; margin-top: 0;">Registration Details:</h3>
            <p><strong>School:</strong> ${data.schoolName}</p>
            <p><strong>Registration ID:</strong> ${data.registrationId}</p>
            <p><strong>Coordinator Email:</strong> ${data.coordinatorEmail}</p>
            <p><strong>Coordinator Phone:</strong> ${data.coordinatorPhone}</p>
          </div>
          
          <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="color: #27ae60; margin-top: 0;">Login Credentials:</h4>
            <p><strong>Email:</strong> ${data.coordinatorEmail}</p>
            <p><strong>Password:</strong> ${data.coordinatorPhone.slice(-4)} (Last 4 digits of your phone number)</p>
          </div>
          
          <p>You can now log in to your dashboard to add students and manage your registration.</p>
          
          <p>If you have any questions, please contact us.</p>
          <p>Mr. Krishnendu Patra: +91 73846 87034</p>
          <p>Email: brainomathorg@gmail.com</p>
          <p>Best regards,<br>Brain-O-Math Olympiad Team</p>
        </div>
      `
    };
    
    // Add timeout to email sending (30 seconds max)
    const sendPromise = transporter.sendMail(mailOptions);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Email sending timeout')), 30000)
    );
    
    const result = await Promise.race([sendPromise, timeoutPromise]);
    console.log('✅ Welcome email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('❌ Error sending welcome email:', error.message);
    console.error('Email details:', {
      to: data.coordinatorEmail,
      registrationId: data.registrationId,
      error: error.message
    });
    return null;
  }
};

// Send student submission confirmation email
const sendStudentSubmissionEmail = async (coordinatorData, studentCount, totalAmount) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: coordinatorData.coordinatorEmail,
      subject: 'Student Registration Submitted - Brain-O-Math Olympiad',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Student Registration Submitted Successfully!</h2>
          <p>Dear ${coordinatorData.coordinatorName},</p>
          
          <p>Your student registration has been submitted successfully for the Brain-O-Math Olympiad 2025.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #2c3e50; margin-top: 0;">Registration Summary:</h3>
            <p><strong>School:</strong> ${coordinatorData.schoolName}</p>
            <p><strong>Registration ID:</strong> ${coordinatorData.registrationId}</p>
            <p><strong>Total Students:</strong> ${studentCount}</p>
            <p><strong>Total Amount:</strong> ₹${totalAmount}</p>
            <p><strong>Status:</strong> <span style="color: #f39c12; font-weight: bold;">Pending Payment Verification</span></p>
          </div>
          
          <div style="background-color: #e8f4fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="color: #3498db; margin-top: 0;">Next Steps:</h4>
            <p>3. Wait for payment verification from our team</p>
          </div>
          
          <p>You will receive another email once your payment is verified.</p>
          
          <p>If you have any questions, please contact us.</p>
          <p>Mr. Krishnendu Patra: +91 73846 87034</p>
          <p>Email: brainomathorg@gmail.com</p>
          
          <p>Best regards,<br>Brain-O-Math Olympiad Team</p>
        </div>
      `
    };
    
    // Add timeout to email sending (30 seconds max)
    const sendPromise = transporter.sendMail(mailOptions);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Email sending timeout')), 30000)
    );
    
    const result = await Promise.race([sendPromise, timeoutPromise]);
    console.log('✅ Student submission email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('❌ Error sending student submission email:', error.message);
    // Don't throw - just log the error so it doesn't block the main process
    console.error('Email details:', {
      to: coordinatorData.coordinatorEmail,
      registrationId: coordinatorData.registrationId,
      error: error.message
    });
    return null;
  }
};

// Send payment verification email
const sendPaymentVerificationEmail = async (coordinatorData, status, totalAmount, studentCount) => {
  try {
    const transporter = createTransporter();
    
    const isApproved = status === 'approved' || status === 'verified';
    const statusColor = isApproved ? '#27ae60' : '#e74c3c';
    const statusText = isApproved ? 'Payment Verified' : 'Payment Rejected';
    const statusMessage = isApproved 
      ? 'Congratulations! Your payment has been verified and your students are now registered for the Brain-O-Math Olympiad 2025.'
      : 'Unfortunately, your payment could not be verified. Please contact us for assistance.';
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: coordinatorData.coordinatorEmail,
      subject: `Payment ${statusText} - Brain-O-Math Olympiad`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Payment ${statusText}</h2>
          <p>Dear ${coordinatorData.coordinatorName},</p>
          
          <p>${statusMessage}</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #2c3e50; margin-top: 0;">Registration Details:</h3>
            <p><strong>School:</strong> ${coordinatorData.schoolName}</p>
            <p><strong>Registration ID:</strong> ${coordinatorData.registrationId}</p>
            <p><strong>Total Students:</strong> ${studentCount}</p>
            <p><strong>Total Amount:</strong> ₹${totalAmount}</p>
            <p><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span></p>
          </div>
          
          ${isApproved ? `
          <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="color: #27ae60; margin-top: 0;">What's Next:</h4>
            <p>• Your students are now officially registered</p>
            <p>• You will receive further instructions about the exam</p>
            <p>• Keep checking your email for updates</p>
          </div>
          ` : `
          <div style="background-color: #fdf2f2; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="color: #e74c3c; margin-top: 0;">Next Steps:</h4>
            <p>• Please contact us immediately for assistance</p>
            <p>Mr. Krishnendu Patra: +91 73846 87034</p>
            <p>Email: brainomathorg@gmail.com</p>
            <p>• Check your payment details and try again if needed</p>
            <p>• We're here to help resolve any issues</p>
          </div>
          `}
          
          <p>If you have any questions, please contact us.</p>
          <p>Mr. Krishnendu Patra: +91 73846 87034</p>
          <p>Email: brainomathorg@gmail.com</p>
          <p>Best regards,<br>Brain-O-Math Olympiad Team</p>
        </div>
      `
    };
    
    // Add timeout to email sending (30 seconds max)
    const sendPromise = transporter.sendMail(mailOptions);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Email sending timeout')), 30000)
    );
    
    const result = await Promise.race([sendPromise, timeoutPromise]);
    console.log(`✅ Payment ${statusText.toLowerCase()} email sent successfully:`, result.messageId);
    return result;
  } catch (error) {
    console.error(`❌ Error sending payment ${status} email:`, error.message);
    console.error('Email details:', {
      to: coordinatorData.coordinatorEmail,
      registrationId: coordinatorData.registrationId,
      status,
      error: error.message
    });
    return null;
  }
};

module.exports = {
  sendCoordinatorWelcomeEmail,
  sendStudentSubmissionEmail,
  sendPaymentVerificationEmail
};
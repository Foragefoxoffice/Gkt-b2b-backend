import nodemailer from 'nodemailer';

let testAccount;
let transporter;

async function initTransporter() {
  if (transporter) return transporter;

  // Use real credentials from .env if available
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Generate a test account if no real SMTP is provided
    testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false, 
      auth: {
        user: testAccount.user, 
        pass: testAccount.pass, 
      },
    });
  }
  return transporter;
}

export const sendEmailOtp = async (toEmail, otpCode) => {
  try {
    if (!toEmail) {
      console.log(`[Email Service] Warning: No email provided to send OTP: ${otpCode}`);
      return false;
    }

    const t = await initTransporter();

    const fromAddress = process.env.SMTP_USER 
      ? `"Ambigaa Silks B2B" <${process.env.SMTP_USER}>` 
      : '"Ambigaa Silks B2B" <no-reply@ambigaasilks.com>';

    const info = await t.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: "Your Login OTP Code - Ambigaa Silks",
      text: `Your Ambigaa Silks B2B login OTP is: ${otpCode}. It is valid for 10 minutes.`,
      html: `<h3>Ambigaa Silks Security</h3><p>Your B2B login OTP is: <b style="font-size:24px;letter-spacing:4px;">${otpCode}</b></p><p>It is valid for 10 minutes.</p>`,
    });

    console.log('====================================================');
    console.log(`[Email Service] OTP email sent to ${toEmail}`);
    if (!process.env.SMTP_HOST) {
      // Ethereal provides a preview URL where we can see the fake email
      console.log(`[Email Service] Preview your email at: ${nodemailer.getTestMessageUrl(info)}`);
    }
    console.log('====================================================');
    return true;
  } catch (error) {
    console.error("[Email Service] Error sending email OTP:", error);
    return false;
  }
};

export const sendCredentialsEmail = async (toEmail, name, password) => {
  try {
    if (!toEmail) return false;

    const t = await initTransporter();

    const fromAddress = process.env.SMTP_USER 
      ? `"Ambigaa Silks B2B" <${process.env.SMTP_USER}>` 
      : '"Ambigaa Silks B2B" <no-reply@ambigaasilks.com>';

    const info = await t.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: "Your Account Credentials - Ambigaa Silks",
      text: `Dear ${name},\n\nYour account has been created successfully. You can log in using the following credentials:\n\nEmail: ${toEmail}\nPassword: ${password}\n\nPlease change your password after logging in.`,
      html: `<h3>Welcome to Ambigaa Silks B2B Portal</h3>
             <p>Dear ${name},</p>
             <p>Your account has been created successfully. You can log in using the following credentials:</p>
             <p><b>Email:</b> ${toEmail}<br/>
             <b>Password:</b> ${password}</p>
             <p>Please change your password after your first login.</p>`,
    });

    console.log('====================================================');
    console.log(`[Email Service] Credentials email sent to ${toEmail}`);
    if (!process.env.SMTP_HOST) {
      console.log(`[Email Service] Preview your email at: ${nodemailer.getTestMessageUrl(info)}`);
    }
    console.log('====================================================');
    return true;
  } catch (error) {
    console.error("[Email Service] Error sending credentials email:", error);
    return false;
  }
};

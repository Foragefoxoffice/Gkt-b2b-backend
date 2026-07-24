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
      html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-bottom: 1px solid #e2e8f0;">
            <h2 style="color: #1e293b; margin: 0; font-size: 24px;">Welcome to Ambigaa Silks</h2>
          </div>
          <div style="padding: 32px; color: #334155; line-height: 1.6; font-size: 16px;">
            <p style="margin-top: 0;">Dear <strong>${name}</strong>,</p>
            <p>Your B2B portal account has been created successfully. You can log in using the following credentials:</p>
            <div style="background-color: #f1f5f9; padding: 20px; border-radius: 6px; margin: 24px 0; border: 1px solid #e2e8f0;">
              <p style="margin: 0 0 12px 0; display: flex; align-items: center;">
                <span style="color: #64748b; width: 80px; display: inline-block;">Email:</span> 
                <strong style="color: #0f172a;">${toEmail}</strong>
              </p>
              <p style="margin: 0; display: flex; align-items: center;">
                <span style="color: #64748b; width: 80px; display: inline-block;">Password:</span> 
                <strong style="color: #0f172a; font-family: monospace; font-size: 18px; letter-spacing: 1px; background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${password}</strong>
              </p>
            </div>
            <p style="margin-bottom: 0; color: #64748b; font-size: 14px;">
              <em>* Please change your password after your first login for security purposes.</em>
            </p>
          </div>
          <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 13px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
            &copy; ${new Date().getFullYear()} Ambigaa Silks B2B. All rights reserved.
          </div>
        </div>
      `,
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

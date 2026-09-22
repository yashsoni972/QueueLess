const nodemailer = require('nodemailer');

/**
 * Helper function to send OTP email to user
 * @param {string} toEmail - Recipient email address
 * @param {string} otp - 4-digit verification OTP
 */
async function sendOtpEmail(toEmail, otp) {
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    console.log(`[OTP] Generated verification OTP for ${toEmail}: ${otp}`);

    if (!emailUser || !emailPass) {
        console.log(`[EMAIL] EMAIL_USER or EMAIL_PASS environment variables not configured. Skipping email send.`);
        return { success: true, simulated: true };
    }

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: emailUser,
                pass: emailPass
            }
        });

        const mailOptions = {
            from: `"QueueLess System" <${emailUser}>`,
            to: toEmail,
            subject: 'QueueLess - Account Verification OTP',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 500px; border: 1px solid #e0e0e0; border-radius: 8px;">
                    <h2 style="color: #1976D2; text-align: center;">QueueLess Smart System</h2>
                    <hr style="border: none; border-top: 1px solid #eee;" />
                    <p style="font-size: 16px;">Hello,</p>
                    <p style="font-size: 15px;">Thank you for registering with <strong>QueueLess</strong>. Your 4-digit Account Verification OTP is:</p>
                    <div style="background-color: #E3F2FD; padding: 15px; text-align: center; border-radius: 6px; margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0D47A1;">${otp}</span>
                    </div>
                    <p style="font-size: 14px; color: #666;">Please enter this OTP in the app to activate your account. This OTP is valid for 10 minutes.</p>
                    <p style="font-size: 13px; color: #999; margin-top: 30px; text-align: center;">If you did not request this email, please ignore it.</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL] OTP Email successfully sent to ${toEmail}. Message ID: ${info.messageId}`);
        return { success: true, messageId: info.messageId };

    } catch (err) {
        console.error(`[EMAIL ERROR] Failed to send email to ${toEmail}:`, err.message);
        // Return success: true so user registration is not blocked if SMTP fails
        return { success: false, error: err.message };
    }
}

module.exports = sendOtpEmail;

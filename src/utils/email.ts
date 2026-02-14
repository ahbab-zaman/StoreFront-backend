import nodemailer from "nodemailer";
import { env } from "../config/env";

const transporter = nodemailer.createTransport({
  host: env.email.host,
  port: env.email.port,
  secure: env.email.port === 465, // true for 465, false for other ports
  auth: {
    user: env.email.user,
    pass: env.email.pass,
  },
});

export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    const info = await transporter.sendMail({
      from: env.email.from,
      to,
      subject,
      html,
    });
    console.log("Email sent: %s", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};

export const sendOTPEmail = async (email: string, otp: string) => {
  const subject = "Verification Code - StoreFront";
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Verify your email</h2>
      <p>Your verification code is:</p>
      <h1 style="color: #4CAF50; letter-spacing: 5px;">${otp}</h1>
      <p>This code will expire in 5 minutes.</p>
    </div>
  `;
  return await sendEmail(email, subject, html);
};

import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendVerificationEmail(
  email: string,
  code: string
) {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Drop Zone Email Verification Code",
    text: `Your Drop Zone verification code is: ${code}. This code will expire soon.`,
  });
}
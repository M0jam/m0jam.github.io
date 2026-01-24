import nodemailer from 'nodemailer'
import log from 'electron-log'

export class EmailService {
  private transporter: nodemailer.Transporter

  constructor() {
    // TODO: Configure these with your actual sender email credentials
    // For Gmail, you MUST use an App Password: https://myaccount.google.com/apppasswords
    // Do not use your regular login password.
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'playhub320@gmail.com', // Sender email
        pass: 'hetdjwpabsjpuval' // App Password
      }
    })
  }

  async sendWelcomeEmail(username: string, email: string) {
    try {
      const info = await this.transporter.sendMail({
        from: '"PlayHub Team" <playhub320@gmail.com>',
        to: email, // Send to the registered user
        subject: 'Welcome to PlayHub! 🎮',
        text: `Hi ${username},\n\nWelcome to PlayHub! Your account has been successfully created.\n\nWe're excited to have you on board. Start adding your games and enjoy the unified experience!\n\nBest regards,\nThe PlayHub Team`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4; color: #333;">
            <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); max-width: 600px; margin: 0 auto;">
              <h1 style="color: #3b82f6; margin-top: 0;">Welcome to PlayHub! 🎮</h1>
              <p style="font-size: 16px; line-height: 1.5;">Hi <strong>${username}</strong>,</p>
              <p style="font-size: 16px; line-height: 1.5;">Thank you for joining PlayHub! Your account has been successfully created.</p>
              <p style="font-size: 16px; line-height: 1.5;">We're excited to have you on board. You can now start connecting your libraries (Steam, Epic, GOG) and enjoy your unified game collection.</p>
              <p style="color: #666; font-size: 14px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                Best regards,<br>
                The PlayHub Team
              </p>
            </div>
          </div>
        `
      })
      log.info('Welcome email sent to:', email, 'Message ID:', info.messageId)
      return true
    } catch (error) {
      // Don't throw error to avoid blocking registration if email fails
      log.error('Failed to send welcome email:', error)
      return false
    }
  }

  async sendDisconnectCode(username: string, email: string, code: string) {
    try {
      const info = await this.transporter.sendMail({
        from: '"PlayHub Team" <playhub320@gmail.com>',
        to: email,
        subject: 'Disconnect Request Verification 🛡️',
        text: `Hi ${username},\n\nYou requested to disconnect your device from your PlayHub account.\n\nYour verification code is: ${code}\n\nThis code will expire in 10 minutes.\nIf you did not request this, please ignore this email.\n\nBest regards,\nThe PlayHub Team`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4; color: #333;">
            <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); max-width: 600px; margin: 0 auto;">
              <h1 style="color: #ef4444; margin-top: 0;">Disconnect Request Verification 🛡️</h1>
              <p style="font-size: 16px; line-height: 1.5;">Hi <strong>${username}</strong>,</p>
              <p style="font-size: 16px; line-height: 1.5;">You requested to disconnect your device from your PlayHub account.</p>
              <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937;">${code}</span>
              </div>
              <p style="font-size: 14px; color: #666;">This code will expire in 10 minutes.</p>
              <p style="font-size: 14px; color: #666;">If you did not request this, please ignore this email.</p>
              <p style="color: #666; font-size: 14px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                Best regards,<br>
                The PlayHub Team
              </p>
            </div>
          </div>
        `
      })
      log.info('Disconnect code sent to:', email, 'Message ID:', info.messageId)
      return true
    } catch (error) {
      log.error('Failed to send disconnect code:', error)
      throw new Error('Failed to send verification email')
    }
  }
}

export const emailService = new EmailService()

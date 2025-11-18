import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { SendMailOptions, Transporter } from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class EmailService {
    private transporter: Transporter;

    constructor(
        private readonly configService: ConfigService,
        @InjectPinoLogger(EmailService.name) private readonly logger: PinoLogger
    ) {
        //create nodemailer transport 
        this.transporter = nodemailer.createTransport({
            service: this.configService.get('EMAIL_SERVICE'),
            auth: {
                user: this.configService.get('EMAIL_USER'),
                pass: this.configService.get('EMAIL_PASSWORD')
            }
        });
    }

    /**
     * Send email to user for verification email address
     * @param {string} to - User email address to verify 
     * @param {string} token - Verification token  
     * @returns {Promise<any>} A promise resolves to any (nomemailer sendMail transpont return, contain messageId and envelope properties)
     */
    async sendVerificationEmail(to: string, token: string): Promise<any> {
        //file system address of email verification template
        const templatePath = path.join(__dirname, 'templates', 'verify-email.hbs');
        let  html: string;
        
        try {
            //read email template
            this.logger.debug(`Attempting to read send verification email template from file system`);
            const source = fs.readFileSync(templatePath, 'utf8');
            const template = handlebars.compile(source);

            //create html from template with verification link address containing email verification token
            html = template({
                verificationLink: `${this.configService.get('EMAIL_VERIFICATION_URL')}?token=${token}`
            });
        } catch (err) {
            this.logger.error({ error: err }, `Error in reading send verification email template file`);
            //send a simple html body in case of missed template
            html = `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>Email Verification</h2>
                    <p>Please verify your email by clicking the link below:</p>
                    <a href="${this.configService.get('EMAIL_VERIFICATION_URL')}?token=${token}" style="color: #1a73e8;">Verify Email</a>
                </div>
            `;
        }       

        const mailOptions: SendMailOptions = {
            from: `${this.configService.get('EMAIL_FROM_NAME')} <${this.configService.get('EMAIL_FROM_EMAIL')}>`,
            to,
            subject: 'Verification Email',
            html
        };
        try {
            this.logger.debug(`Attempting to send verification email to ${to}`);
            const result = this.transporter.sendMail(mailOptions);
            this.logger.info(`Verification email sent successfully`);
            return result;
        } catch (error) {
            this.logger.error({ error }, `Error in sending verification email to ${to}`);
            throw error;
        }
    }

    /**
     * Send email to user for reset password
     * @param {string} to - User email address 
     * @param {string} token - Reset password token  
     * @returns {Promise<any>} A promise resolves to any (nomemailer sendMail transpont return, contain messageId and envelope properties)
     */
    async sendPasswordResetEmail(to: string, token: string): Promise<any> {
        //file system address of email verification template
        const templatePath = path.join(__dirname, 'templates', 'reset-password.hbs');
        let  html: string;
        
        try {
            //read email template
            this.logger.debug(`Attempting to read reset password email template from file system`);
            const source = fs.readFileSync(templatePath, 'utf8');
            const template = handlebars.compile(source);

            //create html from template with verification link address containing email verification token
            html = template({
                resetLink: `${this.configService.get('RESET_PASSWORD_URL')}?token=${token}`
            });
        } catch (err) {
            this.logger.error({ error: err }, `Error in reading reset password email template file`);
            //send a simple html body in case of missed template
            html = `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>Reset your password</h2>
                    <p>Please reset your password by clicking the link below:</p>
                    <a href="${this.configService.get('RESET_PASSWORD_URL')}?token=${token}" style="color: #1a73e8;">Reset your passwored</a>
                </div>
            `;
        }       

        const mailOptions: SendMailOptions = {
            from: `${this.configService.get('EMAIL_FROM_NAME')} <${this.configService.get('EMAIL_FROM_EMAIL')}>`,
            to,
            subject: 'Reset your password',
            html
        };
        try {
            this.logger.debug(`Attempting to send password reset email to ${to}`);
            const result = this.transporter.sendMail(mailOptions);
            this.logger.info(`Password reset email sent successfully`);
            return result;
        } catch (error) {
            this.logger.error({ error }, `Error in sending password reset email to ${to}`);
            throw error;
        }
    }
}

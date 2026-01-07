import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from '../email.service';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import pino from 'pino';
import { LoggerModule } from 'nestjs-pino';

jest.mock('nodemailer', () => {
  const createTransport = jest.fn();
  return {
    createTransport,
  };
});

describe('EmailService', () => {
  let service: EmailService;
  let configService: ConfigService;
  let sendMailMock: jest.Mock;
  const silentPinoLogger = pino({ enabled: false });

  beforeEach(async () => {
    sendMailMock = jest.fn().mockResolvedValue(true);
    const mockedNodemailer = nodemailer as unknown as {
      createTransport: jest.Mock;
    };
    mockedNodemailer.createTransport.mockReturnValue({
      sendMail: sendMailMock,
    });

    configService = {
      get: jest.fn((key: string) => {
        const map: Record<string, string> = {
          EMAIL_SERVICE: 'gmail',
          EMAIL_USER: 'test-user',
          EMAIL_PASSWORD: 'test-pass',
          EMAIL_FROM_NAME: 'Nimroo',
          EMAIL_FROM_EMAIL: 'no-reply@nimroo.com',
          EMAIL_VERIFICATION_URL: 'http://nimroo.com/auth/verify-emil',
          RESET_PASSWORD_URL: 'http://nimroo.com/auth/reset-password',
        };
        return map[key];
      }),
    } as any;
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        LoggerModule.forRoot({
          pinoHttp: {
            logger: silentPinoLogger,
          },
        }),
      ],
      providers: [
        EmailService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Verification Email', () => {
    it('should send an email', async () => {
      const result = await service.sendVerificationEmail(
        'hanifnouhi@gmail.com',
        'token',
      );

      expect(sendMailMock).toHaveBeenCalledWith({
        from: 'Nimroo <no-reply@nimroo.com>',
        to: 'hanifnouhi@gmail.com',
        subject: 'Verification Email',
        html: expect.any(String),
      });
      expect(result).toBe(true);
    });

    it('should throw an error if the email is not sent', async () => {
      sendMailMock.mockRejectedValue(new Error('Failed to send email'));
      await expect(
        service.sendVerificationEmail('hanifnouhi@gmail.com', 'token'),
      ).rejects.toThrow('Failed to send email');
    });

    it('should use verify email template', async () => {
      const templatePath = path.join(
        __dirname,
        '..',
        'templates',
        'verify-email.hbs',
      );
      const source = fs.readFileSync(templatePath, 'utf8');
      const expectedTemplate = handlebars.compile(source);
      const renderedTemplate = expectedTemplate({
        verificationLink: `${configService.get('EMAIL_VERIFICATION_URL')}?token=token`,
      });

      const result = await service.sendVerificationEmail(
        'hanifnouhi@gmail.com',
        'token',
      );

      expect(result).toBe(true);
      expect(sendMailMock).toHaveBeenCalled();

      expect(sendMailMock).toHaveBeenCalledWith({
        from: 'Nimroo <no-reply@nimroo.com>',
        to: 'hanifnouhi@gmail.com',
        subject: 'Verification Email',
        html: renderedTemplate,
      });
    });

    it('should send fallback HTML if template is missing', async () => {
      jest.spyOn(fs, 'readFileSync').mockImplementationOnce(() => {
        throw new Error('Template not found');
      });

      const result = await service.sendVerificationEmail(
        'user@example.com',
        'token',
      );

      expect(result).toBe(true);
      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('Verify Email'),
        }),
      );
    });
  });

  describe('Password Reset Eamil', () => {
    it('should send an email', async () => {
      const result = await service.sendPasswordResetEmail(
        'hanifnouhi@gmail.com',
        'token',
      );

      expect(sendMailMock).toHaveBeenCalledWith({
        from: 'Nimroo <no-reply@nimroo.com>',
        to: 'hanifnouhi@gmail.com',
        subject: 'Reset your password',
        html: expect.any(String),
      });
      expect(result).toBe(true);
    });

    it('should throw an error if the email is not sent', async () => {
      sendMailMock.mockRejectedValue(new Error('Failed to send email'));
      await expect(
        service.sendPasswordResetEmail('hanifnouhi@gmail.com', 'token'),
      ).rejects.toThrow('Failed to send email');
    });

    it('should use reset password template', async () => {
      const templatePath = path.join(
        __dirname,
        '..',
        'templates',
        'reset-password.hbs',
      );
      const source = fs.readFileSync(templatePath, 'utf8');
      const expectedTemplate = handlebars.compile(source);
      const renderedTemplate = expectedTemplate({
        resetLink: `${configService.get('RESET_PASSWORD_URL')}?token=token`,
      });

      const result = await service.sendPasswordResetEmail(
        'hanifnouhi@gmail.com',
        'token',
      );

      expect(result).toBe(true);
      expect(sendMailMock).toHaveBeenCalled();

      expect(sendMailMock).toHaveBeenCalledWith({
        from: 'Nimroo <no-reply@nimroo.com>',
        to: 'hanifnouhi@gmail.com',
        subject: 'Reset your password',
        html: renderedTemplate,
      });
    });

    it('should send fallback HTML if template is missing', async () => {
      jest.spyOn(fs, 'readFileSync').mockImplementationOnce(() => {
        throw new Error('Template not found');
      });

      const result = await service.sendPasswordResetEmail(
        'user@example.com',
        'token',
      );

      expect(result).toBe(true);
      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('Reset your password'),
        }),
      );
    });
  });
});

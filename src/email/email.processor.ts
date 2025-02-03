import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { MailerService } from '@nestjs-modules/mailer';

interface EmailJob {
  to: string;
  subject: string;
  template: string;
  context: Record<string, any>;
}

@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly mailerService: MailerService) {}

  @Process('send')
  async handleSendEmail(job: Job<EmailJob>) {
    this.logger.debug(`Processing email job ${job.id}`);
    const { to, subject, template, context } = job.data;

    try {
      await this.mailerService.sendMail({
        to,
        subject,
        template,
        context: {
          ...context,
          year: new Date().getFullYear(),
        },
      });
      this.logger.debug(`Email job ${job.id} completed successfully`);
    } catch (error) {
      this.logger.error(`Failed to process email job ${job.id}`, error.stack);
      throw error;
    }
  }
} 
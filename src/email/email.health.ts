import { Injectable } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailHealthStatus } from './interfaces/email-metrics.interface';

@Injectable()
export class EmailHealthIndicator {
  private lastStatus: EmailHealthStatus = {
    status: 'up',
    details: {
      mailer: true,
      lastCheck: new Date(),
    },
  };

  constructor(private readonly emailService: EmailService) {}

  async check(): Promise<EmailHealthStatus> {
    try {
      const health = await this.emailService.checkHealth();
      this.lastStatus = {
        status: health.mailer ? 'up' : 'down',
        details: {
          ...health,
          lastCheck: new Date(),
        },
      };
    } catch (error) {
      this.lastStatus = {
        status: 'down',
        details: {
          mailer: false,
          lastCheck: new Date(),
          error: error.message,
        },
      };
    }

    return this.lastStatus;
  }

  getLastStatus(): EmailHealthStatus {
    return this.lastStatus;
  }
} 
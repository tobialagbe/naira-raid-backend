import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { MailerService } from '@nestjs-modules/mailer';
import { UserDocument } from '../user/schemas/user.schema';
import { EmailMetrics, QueueMetrics } from './interfaces/email-metrics.interface';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private useQueue: boolean;
  private queueAvailable: boolean = false;
  private metrics: EmailMetrics = {
    totalSent: 0,
    totalFailed: 0,
    averageDeliveryTime: 0,
  };
  private deliveryTimes: number[] = [];

  constructor(
    @InjectQueue('email') private readonly emailQueue: Queue,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {
    this.useQueue = this.configService.get<boolean>('USE_EMAIL_QUEUE', false);
  }

  async onModuleInit() {
    await this.validateConfiguration();
    if (this.useQueue) {
      await this.checkQueueAvailability();
    }
  }

  private async validateConfiguration() {
    const requiredConfigs = [
      'SMTP_HOST',
      'SMTP_PORT',
      'SMTP_USER',
      'SMTP_PASSWORD',
      'SMTP_FROM',
      'BASE_URL',
    ];

    const missingConfigs = requiredConfigs.filter(
      config => !this.configService.get(config),
    );

    if (missingConfigs.length > 0) {
      throw new Error(
        `Missing required email configurations: ${missingConfigs.join(', ')}`,
      );
    }

    if (this.useQueue) {
      const requiredRedisConfigs = ['REDIS_HOST', 'REDIS_PORT'];
      const missingRedisConfigs = requiredRedisConfigs.filter(
        config => !this.configService.get(config),
      );

      if (missingRedisConfigs.length > 0) {
        throw new Error(
          `Queue is enabled but missing Redis configurations: ${missingRedisConfigs.join(
            ', ',
          )}`,
        );
      }
    }
  }

  private async checkQueueAvailability() {
    try {
      await this.emailQueue.isReady();
      this.queueAvailable = true;
      this.logger.log('Email queue is available and connected');
    } catch (error) {
      this.queueAvailable = false;
      this.logger.warn(
        'Email queue is not available, falling back to direct email sending',
        error.stack,
      );
    }
  }

  private getBaseUrl(): string {
    return this.configService.get<string>('BASE_URL') || 'http://localhost:3000';
  }

  private getSocialUrls() {
    const baseUrl = this.getBaseUrl();
    return {
      instagramUrl: this.configService.get<string>('INSTAGRAM_URL') || 'https://instagram.com/nairaraid',
      tiktokUrl: this.configService.get<string>('TIKTOK_URL') || 'https://tiktok.com/@nairaraid',
      tutorialUrl: `${baseUrl}/tutorial`,
      faqUrl: `${baseUrl}/faq`,
      supportUrl: `${baseUrl}/support`,
      gameUrl: `${baseUrl}/play`,
    };
  }

  async getMetrics(): Promise<EmailMetrics> {
    const metrics = { ...this.metrics };
    if (this.useQueue && this.queueAvailable) {
      metrics.queueLength = await this.emailQueue.count();
    }
    return metrics;
  }

  async getQueueMetrics(): Promise<QueueMetrics | null> {
    if (!this.useQueue || !this.queueAvailable) {
      return null;
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.emailQueue.getWaitingCount(),
      this.emailQueue.getActiveCount(),
      this.emailQueue.getCompletedCount(),
      this.emailQueue.getFailedCount(),
      this.emailQueue.getDelayedCount(),
    ]);

    const jobs = await this.emailQueue.getJobs(['completed']);
    const processingTimes = jobs.map(job => job.processedOn! - job.timestamp);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      processingTime: {
        avg: this.calculateAverage(processingTimes),
        min: Math.min(...processingTimes),
        max: Math.max(...processingTimes),
      },
    };
  }

  async checkHealth(): Promise<{ mailer: boolean; queue?: boolean }> {
    const health = {
      mailer: await this.checkMailerHealth(),
    };

    if (this.useQueue) {
      health['queue'] = await this.checkQueueHealth();
    }

    return health;
  }

  private async checkMailerHealth(): Promise<boolean> {
    try {
      // Check if required SMTP configuration is available
      const requiredConfigs = [
        'SMTP_HOST',
        'SMTP_PORT',
        'SMTP_USER',
        'SMTP_PASSWORD',
        'SMTP_FROM'
      ];

      const missingConfigs = requiredConfigs.filter(
        config => !this.configService.get(config),
      );

      if (missingConfigs.length > 0) {
        throw new Error(`Missing SMTP configurations: ${missingConfigs.join(', ')}`);
      }

      return true;
    } catch (error) {
      this.logger.error('Mailer health check failed', error.stack);
      return false;
    }
  }

  private async checkQueueHealth(): Promise<boolean> {
    try {
      await this.emailQueue.isReady();
      return true;
    } catch (error) {
      this.logger.error('Queue health check failed', error.stack);
      return false;
    }
  }

  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  private async updateMetrics(startTime: number, success: boolean): Promise<void> {
    if (success) {
      this.metrics.totalSent++;
      const deliveryTime = Date.now() - startTime;
      this.deliveryTimes.push(deliveryTime);
      
      // Keep only last 100 delivery times for average calculation
      if (this.deliveryTimes.length > 100) {
        this.deliveryTimes.shift();
      }
      
      this.metrics.averageDeliveryTime = this.calculateAverage(this.deliveryTimes);
    } else {
      this.metrics.totalFailed++;
    }
  }

  private async sendEmail(options: {
    to: string;
    subject: string;
    template: string;
    context: Record<string, any>;
  }): Promise<void> {
    const startTime = Date.now();
    const emailData = {
      ...options,
      context: {
        ...options.context,
        year: new Date().getFullYear(),
      },
    };

    try {
      if (this.useQueue && this.queueAvailable) {
        await this.emailQueue.add('send', emailData);
        this.logger.debug(`Email queued successfully to: ${options.to}`);
      } else {
        await this.mailerService.sendMail(emailData);
        this.logger.debug(`Email sent directly to: ${options.to}`);
      }
      await this.updateMetrics(startTime, true);
    } catch (error) {
      await this.updateMetrics(startTime, false);
      this.metrics.lastError = {
        timestamp: new Date(),
        error: error.message,
      };
      this.logger.error(
        `Failed to send email to ${options.to}`,
        error.stack,
      );
      throw error;
    }
  }

  async sendVerificationEmail(user: UserDocument, token: string): Promise<void> {
    const verificationUrl = `${this.getBaseUrl()}/auth/verify-email?token=${token}`;

    await this.sendEmail({
      to: user.email,
      subject: 'Verify your email address',
      template: 'verify-email',
      context: {
        name: user.firstName,
        verificationUrl,
      },
    });
  }

  async sendPasswordResetEmail(user: UserDocument, token: string): Promise<void> {
    const resetUrl = `${this.getBaseUrl()}/auth/reset-password?token=${token}`;

    await this.sendEmail({
      to: user.email,
      subject: 'Reset your password',
      template: 'reset-password',
      context: {
        name: user.firstName,
        resetUrl,
      },
    });
  }

  async sendWelcomeEmail(user: UserDocument): Promise<void> {
    await this.sendEmail({
      to: user.email,
      subject: 'Welcome to Naira Raid! 🎮',
      template: 'welcome',
      context: {
        name: user.firstName,
        ...this.getSocialUrls(),
      },
    });
  }

  async sendAchievementEmail(
    user: UserDocument,
    achievement: {
      name: string;
      description: string;
      reward: string;
      points: number;
    },
  ): Promise<void> {
    const baseUrl = this.getBaseUrl();
    const profileUrl = `${baseUrl}/profile/${user._id}`;
    const achievementId = achievement.name.toLowerCase().replace(/\s+/g, '-');

    await this.sendEmail({
      to: user.email,
      subject: `Achievement Unlocked: ${achievement.name} 🏆`,
      template: 'achievement-unlocked',
      context: {
        name: user.firstName,
        achievementName: achievement.name,
        achievementDescription: achievement.description,
        rewardDescription: achievement.reward,
        points: achievement.points,
        profileUrl,
        shareTwitterUrl: `https://twitter.com/intent/tweet?text=I just unlocked ${achievement.name} in Naira Raid!&url=${baseUrl}/achievements/${achievementId}`,
        shareFacebookUrl: `https://www.facebook.com/sharer/sharer.php?u=${baseUrl}/achievements/${achievementId}`,
        shareInstagramUrl: `${baseUrl}/achievements/${achievementId}`,
      },
    });
  }
}
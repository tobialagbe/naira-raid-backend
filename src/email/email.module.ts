import { Module, DynamicModule } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { EmailService } from './email.service';
import { EmailProcessor } from './email.processor';
import { EmailHealthIndicator } from './email.health';
import { EmailMonitoringController } from './email.controller';

@Module({})
export class EmailModule {
  static register(): DynamicModule {
    return {
      module: EmailModule,
      imports: [
        MailerModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: async (configService: ConfigService) => ({
            transport: {
              host: configService.get('SMTP_HOST'),
              port: configService.get('SMTP_PORT'),
              secure: configService.get('SMTP_SECURE', false),
              auth: {
                user: configService.get('SMTP_USER'),
                pass: configService.get('SMTP_PASSWORD'),
              },
            },
            defaults: {
              from: `"Naira Raid" <${configService.get('SMTP_FROM')}>`,
            },
            template: {
              dir: join(__dirname, 'templates'),
              adapter: new HandlebarsAdapter(),
              options: {
                strict: true,
              },
            },
          }),
          inject: [ConfigService],
        }),
        ...this.getQueueImports(),
      ],
      providers: [EmailService, EmailProcessor, EmailHealthIndicator],
      controllers: [EmailMonitoringController],
      exports: [EmailService, EmailHealthIndicator],
    };
  }

  private static getQueueImports() {
    const configService = new ConfigService();
    const useQueue = configService.get<boolean>('USE_EMAIL_QUEUE', false);

    if (!useQueue) {
      return [];
    }

    return [
      BullModule.forRootAsync({
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          redis: {
            host: configService.get('REDIS_HOST', 'localhost'),
            port: configService.get('REDIS_PORT', 6379),
            password: configService.get('REDIS_PASSWORD'),
          },
        }),
        inject: [ConfigService],
      }),
      BullModule.registerQueue({
        name: 'email',
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: true,
        },
      }),
    ];
  }
} 
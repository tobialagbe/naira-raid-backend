import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EmailService } from './email.service';
import { EmailHealthIndicator } from './email.health';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EmailMetrics, QueueMetrics, EmailHealthStatus } from './interfaces/email-metrics.interface';

@ApiTags('email-monitoring')
@Controller('email/monitoring')
@UseGuards(JwtAuthGuard)
export class EmailMonitoringController {
  constructor(
    private readonly emailService: EmailService,
    private readonly healthIndicator: EmailHealthIndicator,
  ) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get email metrics' })
  @ApiResponse({
    status: 200,
    description: 'Returns email sending metrics',
    type: 'object',
  })
  async getMetrics(): Promise<EmailMetrics> {
    return this.emailService.getMetrics();
  }

  @Get('queue')
  @ApiOperation({ summary: 'Get queue metrics' })
  @ApiResponse({
    status: 200,
    description: 'Returns queue metrics if queue is enabled, null otherwise',
    type: 'object',
  })
  async getQueueMetrics(): Promise<QueueMetrics | null> {
    return this.emailService.getQueueMetrics();
  }

  @Get('health')
  @ApiOperation({ summary: 'Get email service health status' })
  @ApiResponse({
    status: 200,
    description: 'Returns health status of email service components',
    type: 'object',
  })
  async getHealth(): Promise<EmailHealthStatus> {
    return this.healthIndicator.check();
  }
} 
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CheckTokenDto {
  @ApiProperty({ description: 'Current JWT access token' })
  @IsString()
  accessToken: string;

  @ApiProperty({ description: 'Refresh token associated with the user' })
  @IsString()
  refreshToken: string;
} 
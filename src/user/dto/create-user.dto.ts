import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsBoolean } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'User\'s first name',
    example: 'John',
  })
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty({
    description: 'User\'s last name',
    example: 'Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({
    description: 'User\'s unique username',
    example: 'johndoe123',
  })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty({
    description: 'User\'s email address',
    example: 'john.doe@example.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User\'s phone number',
    example: '+1234567890',
    required: false,
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({
    description: 'User\'s password (minimum 8 characters)',
    example: 'securePassword123',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    description: 'Whether the user\'s email is verified',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isEmailVerified?: boolean = false;

  @ApiProperty({
    description: 'User\'s Instagram handle',
    example: '@johndoe',
    required: false,
  })
  @IsOptional()
  @IsString()
  instagram?: string;

  @ApiProperty({
    description: 'User\'s TikTok handle',
    example: '@johndoe',
    required: false,
  })
  @IsOptional()
  @IsString()
  tiktok?: string;
} 
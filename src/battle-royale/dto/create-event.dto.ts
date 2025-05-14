import { IsArray, IsBoolean, IsDate, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Max, Min, MaxLength, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEventDto {
  @ApiProperty({ description: 'Event title' })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  title: string;

  @ApiProperty({ description: 'Event description' })
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  description: string;

  @ApiProperty({ description: 'Event date (ISO format)' })
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  eventDate: Date;

  @ApiProperty({ description: 'Start time in 24-hour format (HH:MM)' })
  @IsNotEmpty()
  @IsString()
  startTime: string; // Format: "HH:MM" (24-hour format)

  @ApiProperty({ description: 'Entry fee amount (0 for free events)', default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  entryFee?: number = 0;

  @ApiProperty({ description: 'Prize pool amounts for different positions', example: [10000, 5000, 2500] })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsPositive({ each: true })
  prizePools: number[];

  @ApiProperty({ description: 'Whether the event is active', default: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = false;

  @ApiProperty({ description: 'Maximum number of players', default: 120 })
  @IsNumber()
  @Min(10)
  @Max(1000)
  @IsOptional()
  maxPlayers?: number = 120;

  @ApiProperty({ description: 'Amount of cash spawned per kill', default: 300 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  amountPerKill?: number = 300;
} 
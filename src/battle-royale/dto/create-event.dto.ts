import { IsArray, IsBoolean, IsDate, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEventDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  eventDate: Date;

  @IsNotEmpty()
  @IsString()
  startTime: string; // Format: "HH:MM" (24-hour format)

  @IsNumber()
  @Min(0)
  @IsOptional()
  entryFee: number = 0;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsPositive({ each: true })
  prizePools: number[];

  @IsBoolean()
  @IsOptional()
  isActive: boolean = false;

  @IsNumber()
  @Min(10)
  @Max(1000)
  @IsOptional()
  maxPlayers: number = 100;
} 
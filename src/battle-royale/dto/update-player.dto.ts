import { IsBoolean, IsIn, IsMongoId, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { Types } from 'mongoose';

export class UpdatePlayerDto {
  @IsNotEmpty()
  @IsMongoId()
  eventId: Types.ObjectId;

  @IsOptional()
  @IsString()
  roomId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  position?: number;

  @IsOptional()
  @IsBoolean()
  entryFeePaid?: boolean;

  @IsOptional()
  @IsIn(['registered', 'active', 'eliminated', 'winner'])
  status?: string;

  @IsOptional()
  @IsObject()
  lastPosition?: {
    x: number;
    y: number;
    z: number;
  };

  @IsOptional()
  @IsObject()
  flip?: {
    x: number;
    y: number;
    z: number;
  };

  @IsOptional()
  @IsNumber()
  rotation?: number;

  @IsOptional()
  @IsBoolean()
  isAlive?: boolean;
} 
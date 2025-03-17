import { IsMongoId, IsNotEmpty } from 'class-validator';
import { Types } from 'mongoose';

export class RegisterPlayerDto {
  @IsNotEmpty()
  @IsMongoId()
  eventId: Types.ObjectId;
} 
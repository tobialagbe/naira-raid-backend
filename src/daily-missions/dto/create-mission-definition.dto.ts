import { IsEnum, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MissionType, MissionRequirementType } from '../schemas/mission-definition.schema';

export class ColorRequirementDto {
  @ApiProperty({ description: 'Color identifier from the client' })
  @IsString()
  colorId: string;

  @ApiProperty({ description: 'Color name from the client' })
  @IsString()
  colorName: string;
}

export class SpecialPrizeDto {
  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  limitedToFirst: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  remaining: number;
}

export class CreateMissionDefinitionDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty({ enum: MissionType })
  @IsEnum(MissionType)
  type: MissionType;

  @ApiProperty({ enum: MissionRequirementType })
  @IsEnum(MissionRequirementType)
  requirementType: MissionRequirementType;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  requirementValue: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  points: number;

  @ApiProperty({ type: ColorRequirementDto, required: false })
  @IsObject()
  @IsOptional()
  colorRequirement?: ColorRequirementDto;

  @ApiProperty({ type: SpecialPrizeDto, required: false })
  @IsObject()
  @IsOptional()
  specialPrize?: SpecialPrizeDto;
} 
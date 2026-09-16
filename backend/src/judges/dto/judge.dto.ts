import { IsEmail, IsNotEmpty, IsOptional, IsUUID, MinLength } from 'class-validator';

export class CreateJudgeDto {
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @MinLength(6)
  password!: string;

  @IsUUID()
  club_id!: string;
}

export class UpdateJudgeDto {
  @IsOptional()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsUUID()
  club_id?: string;
}

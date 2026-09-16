import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateClubDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class UpdateClubDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}

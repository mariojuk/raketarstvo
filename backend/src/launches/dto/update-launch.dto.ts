import { IsBoolean, IsNumber, Min } from 'class-validator';

export class UpdateLaunchDto {
  @IsNumber()
  @Min(0)
  duration_seconds!: number;

  @IsBoolean()
  failed!: boolean;
}

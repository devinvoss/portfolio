import { IsArray, IsInt, IsMongoId, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

// Only these fields can be written through the API; anything else in the body is stripped.
export class MovieDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsInt()
  @Min(1870)
  @Max(3000)
  year?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  genre?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  synopsis?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  imageUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  actors?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  director?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  runtimeMinutes?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  mpaaRating?: string;
}

export class UpdateMovieDto extends MovieDto {
  @IsMongoId()
  id: string;
}

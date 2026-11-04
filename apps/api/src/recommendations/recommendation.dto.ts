import { COMMENT_MAX_LENGTH } from '@portfolio/models';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class RecommendDto {
  @IsInt()
  @Min(1)
  tmdbId: number;

  // Checked against the movie's TMDB posters, so only those can be used
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  imageUrl?: string;

  // Becomes the recommender's comment; same cleanup and limit as any comment
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\r\n?/g, '\n').trim() : value))
  @IsString()
  @MaxLength(COMMENT_MAX_LENGTH)
  note?: string;
}

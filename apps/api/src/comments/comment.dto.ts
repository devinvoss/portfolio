import { COMMENT_MAX_LENGTH } from '@portfolio/models';
import { Transform } from 'class-transformer';
import { IsMongoId, IsOptional, IsString, Length } from 'class-validator';

// Comments are plain text. Line endings are normalized and the ends trimmed before the length check.
const cleanBody = ({ value }) => (typeof value === 'string' ? value.replace(/\r\n?/g, '\n').trim() : value);

export class CreateCommentDto {
  @Transform(cleanBody)
  @IsString()
  @Length(1, COMMENT_MAX_LENGTH)
  body: string;

  @IsOptional()
  @IsMongoId()
  replyToCommentId?: string;
}

export class UpdateCommentDto {
  @Transform(cleanBody)
  @IsString()
  @Length(1, COMMENT_MAX_LENGTH)
  body: string;
}

export class CommentPageQuery {
  @IsOptional()
  @IsMongoId()
  before?: string;
}

export class ReplyPageQuery {
  @IsOptional()
  @IsMongoId()
  after?: string;
}

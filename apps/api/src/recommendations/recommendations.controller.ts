import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ParseObjectIdPipe } from '@nestjs/mongoose';
import { SkipThrottle, Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { CommentPage, GenreCount, Movie, MovieComment, Recommendation, RecommendationSearch, RecommendResult, SessionUser } from '@portfolio/models';
import { Types } from 'mongoose';
import { Auth } from '../auth/auth.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { OptionalJwtAuthGuard } from '../auth/jwt-auth.guard';
import { CommentPageQuery, CreateCommentDto } from '../comments/comment.dto';
import { MovieDto } from '../movie/movie.dto';
import { RecommendDto } from './recommendation.dto';
import { RecommendationsService } from './recommendations.service';

@Controller('recommendation')
@UseGuards(ThrottlerGuard)
export class RecommendationsController {

  constructor(private recommendationsService: RecommendationsService) {}

  // Declared before ':id' so "genres" isn't treated as an id
  @SkipThrottle()
  @Get('genres')
  getGenreCounts(): Promise<GenreCount[]> {
    return this.recommendationsService.getGenreCounts();
  }

  @SkipThrottle()
  @Post('search')
  search(@Body() search: RecommendationSearch): Promise<RecommendationSearch> {
    return this.recommendationsService.search(search);
  }

  // Lets the editor say a movie was already recommended before anyone writes a note
  @SkipThrottle()
  @Get('tmdb/:tmdbId')
  findByTmdbId(@Param('tmdbId', ParseIntPipe) tmdbId: number): Promise<Recommendation | null> {
    return this.recommendationsService.findByTmdbId(tmdbId);
  }

  @SkipThrottle()
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  get(@Param('id', ParseObjectIdPipe) id: Types.ObjectId, @CurrentUser() user: SessionUser | null): Promise<Recommendation> {
    return this.recommendationsService.get(id, user);
  }

  // Each recommendation looks the movie up on TMDB and may post a comment, so it's limited like commenting
  @Auth()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post()
  recommend(@Body() dto: RecommendDto, @CurrentUser() user: SessionUser): Promise<RecommendResult> {
    return this.recommendationsService.recommend(user, dto);
  }

  @Auth()
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseObjectIdPipe) id: Types.ObjectId, @CurrentUser() user: SessionUser): Promise<void> {
    return this.recommendationsService.remove(id, user);
  }

  @Auth('admin')
  @Post(':id/convert')
  convert(@Param('id', ParseObjectIdPipe) id: Types.ObjectId, @Body() movie: MovieDto): Promise<Movie> {
    return this.recommendationsService.convert(id, movie);
  }

  @SkipThrottle()
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id/comments')
  listComments(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Query() query: CommentPageQuery,
    @CurrentUser() user: SessionUser | null
  ): Promise<CommentPage> {
    return this.recommendationsService.listComments(id, user, query.before);
  }

  // Same limit as commenting on a watched movie
  @Auth()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post(':id/comments')
  addComment(
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: SessionUser
  ): Promise<MovieComment> {
    return this.recommendationsService.addComment(id, user, dto);
  }
}

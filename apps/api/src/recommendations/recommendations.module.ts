import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommentsModule } from '../comments/comments.module';
import { MovieModule } from '../movie/movie.module';
import { TmdbModule } from '../tmdb/tmdb.module';
import { RecommendationSchema } from './recommendation.schema';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Recommendation', schema: RecommendationSchema }]),
    MovieModule,
    TmdbModule,
    CommentsModule
  ],
  providers: [RecommendationsService],
  controllers: [RecommendationsController]
})
export class RecommendationsModule {}

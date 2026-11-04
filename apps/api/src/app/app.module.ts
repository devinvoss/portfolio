import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { AccountsModule } from '../accounts/accounts.module';
import { AuthModule } from '../auth/auth.module';
import { CommentsModule } from '../comments/comments.module';
import { environment } from '../environments/environment';
import { MovieModule } from '../movie/movie.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RecommendationsModule } from '../recommendations/recommendations.module';
import { TmdbModule } from '../tmdb/tmdb.module';
import { UsersModule } from '../users/users.module';

import { AppController } from './app.controller';

@Module({
  imports: [
    MongooseModule.forRoot(environment.dbConnection),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 30 }]),
    MovieModule,
    TmdbModule,
    UsersModule,
    AccountsModule,
    AuthModule,
    CommentsModule,
    NotificationsModule,
    RecommendationsModule
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}

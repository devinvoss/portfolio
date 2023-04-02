import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { environment } from '../environments/environment';
import { MovieModule } from '../movie/movie.module';
import { UsersModule } from '../users/users.module';

import { AppController } from './app.controller';

@Module({
  imports: [
    MongooseModule.forRoot(environment.dbConnection),
    MovieModule,
    UsersModule,
    AuthModule
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}

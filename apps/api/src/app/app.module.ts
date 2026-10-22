import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { AccountsModule } from '../accounts/accounts.module';
import { AuthModule } from '../auth/auth.module';
import { environment } from '../environments/environment';
import { MovieModule } from '../movie/movie.module';
import { UsersModule } from '../users/users.module';

import { AppController } from './app.controller';

@Module({
  imports: [
    MongooseModule.forRoot(environment.dbConnection),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 30 }]),
    MovieModule,
    UsersModule,
    AccountsModule,
    AuthModule
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}

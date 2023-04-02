import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { LocalStrategy } from './local.strategy';
import { environment } from '../environments/environment';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret: environment.secretKey,
      signOptions: {
        expiresIn: '24h'
      }
    })
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  exports: [AuthService]
})
export class AuthModule {}

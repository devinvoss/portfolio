import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AccountsModule } from '../accounts/accounts.module';
import { SessionModule } from '../session/session.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { LocalStrategy } from './local.strategy';
import { GithubStrategy } from './oauth/github.strategy';
import { GoogleStrategy } from './oauth/google.strategy';
import { OAuthLoginService } from './oauth/oauth-login.service';
import { enabledProviders } from './oauth/providers';

// A provider's strategy is only registered once its client id and secret are configured.
const providerStrategies = [
  ...(enabledProviders.includes('google') ? [GoogleStrategy] : []),
  ...(enabledProviders.includes('github') ? [GithubStrategy] : [])
];

@Module({
  imports: [
    UsersModule,
    AccountsModule,
    SessionModule,
    PassportModule
  ],
  providers: [AuthService, LocalStrategy, JwtStrategy, OAuthLoginService, ...providerStrategies],
  controllers: [AuthController]
})
export class AuthModule {}

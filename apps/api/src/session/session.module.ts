import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { environment } from '../environments/environment';
import { SessionService } from './session.service';

@Module({
  imports: [
    JwtModule.register({
      secret: environment.secretKey
    })
  ],
  providers: [SessionService],
  exports: [SessionService]
})
export class SessionModule {}

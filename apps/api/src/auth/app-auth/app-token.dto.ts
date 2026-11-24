import { IsString, Length, Matches } from 'class-validator';

export class AppTokenDto {
  @IsString()
  @Length(10, 100)
  code: string;

  // RFC 7636: 43 to 128 unreserved characters
  @IsString()
  @Matches(/^[A-Za-z0-9._~-]{43,128}$/)
  codeVerifier: string;
}

import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { UserService } from '@app/services';
import { SsoProvider } from '@portfolio/models';
import { ButtonComponent } from '../shared/components/button/button.component';

const PROVIDER_NAMES: Record<SsoProvider, string> = {
  google: 'Google',
  github: 'GitHub'
};

const ERROR_MESSAGES: Record<string, string> = {
  cancelled: 'Sign-in was cancelled.',
  suspended: 'This account has been suspended.',
  failed: 'Sign-in failed. Please try again.'
};

@Component({
  selector: 'dvoss-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  imports: [ButtonComponent]
})
export class LoginComponent {
  private route = inject(ActivatedRoute);
  private userService = inject(UserService);

  readonly providerNames = PROVIDER_NAMES;
  providers = toSignal(this.userService.getProviders());

  private queryParams = this.route.snapshot.queryParamMap;
  errorMessage = ERROR_MESSAGES[this.queryParams.get('error') ?? ''] ?? '';

  signIn(provider: SsoProvider) {
    const returnTo = this.queryParams.get('returnTo');
    this.userService.signIn(provider, returnTo && !returnTo.startsWith('/login') ? returnTo : '/');
  }
}

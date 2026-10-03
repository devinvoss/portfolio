import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DestroyableComponent } from '@app/core/components';
import { UserService } from '@app/services';
import { MatFormField, MatLabel, MatInput, MatError } from '@angular/material/input';
import { ButtonComponent } from '../shared/components/button/button.component';

@Component({
  selector: 'dvoss-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatError, ButtonComponent]
})
export class LoginComponent extends DestroyableComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private userService = inject(UserService);

  loginForm: FormGroup = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]]
  })
  submitting = signal(false);
  errorMessage = signal('');

  login() {
    this.errorMessage.set('');
    if (!this.submitting()) {
      this.userService.login(this.loginForm.get('username')?.value, this.loginForm.get('password')?.value).pipe(
      ).subscribe({
        next: () => {
          this.router.navigate(['/dashboard']);
          this.submitting.set(false);
        },
        error: () => {
          this.errorMessage.set('Invalid Username or Password combination.');
          this.submitting.set(false);
        }
      })
    }

    this.submitting.set(true);
    
  }

}

import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '@app/services';
import { MatFormField, MatLabel, MatInput, MatError } from '@angular/material/input';
import { ButtonComponent } from '../shared/components/button/button.component';

// Password login for the site admin only; it isn't linked from the app.
@Component({
  selector: 'dvoss-admin-login',
  templateUrl: './admin-login.component.html',
  styleUrls: ['./admin-login.component.scss'],
  imports: [FormsModule, ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatError, ButtonComponent]
})
export class AdminLoginComponent {
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
    if (this.submitting()) {
      return;
    }

    this.errorMessage.set('');
    this.submitting.set(true);
    this.userService.adminLogin(this.loginForm.get('username')?.value, this.loginForm.get('password')?.value).subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigate(['/movie']);
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(err.status === 429
          ? 'Too many attempts. Please wait a minute and try again.'
          : 'Invalid Username or Password combination.');
        this.submitting.set(false);
      }
    });
  }

}

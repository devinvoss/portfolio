import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.Eager,
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
  submitting = false;
  errorMessage = '';

  login() {
    this.errorMessage = '';
    if (!this.submitting) {
      this.userService.login(this.loginForm.get('username')?.value, this.loginForm.get('password')?.value).pipe(
      ).subscribe({
        next: () => {
          this.router.navigate(['/dashboard']);
          this.submitting = false;
        },
        error: () => {
          this.errorMessage = 'Invalid Username or Password combination.';
          this.submitting = false;
        }
      })
    }

    this.submitting = true;
    
  }

}

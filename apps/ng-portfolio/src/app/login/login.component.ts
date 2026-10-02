import { Component, ChangeDetectionStrategy } from '@angular/core';
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

  loginForm: FormGroup = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]]
  })
  submitting = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private userService: UserService) {
      super();
  }

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

import { Component } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { DestroyableComponent } from '@app/core/components';
import { ToastService, UserService } from '@app/services';

@Component({
  selector: 'dvoss-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent extends DestroyableComponent {

  loginForm: FormGroup = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]]
  })
  submitting: boolean = false;
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

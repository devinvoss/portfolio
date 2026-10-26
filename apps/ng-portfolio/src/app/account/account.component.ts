import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastService, UserService } from '@app/services';
import { ButtonComponent } from '../shared/components/button/button.component';

const DISPLAY_NAME_MAX_LENGTH = 40;

@Component({
  selector: 'dvoss-account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.scss'],
  imports: [ReactiveFormsModule, ButtonComponent]
})
export class AccountComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private userService = inject(UserService);
  private toastService = inject(ToastService);

  readonly maxLength = DISPLAY_NAME_MAX_LENGTH;
  user = toSignal(this.userService.user$);

  accountForm = this.fb.nonNullable.group({
    displayName: [this.userService.user$.value?.displayName ?? '', [Validators.required, Validators.minLength(2), Validators.maxLength(DISPLAY_NAME_MAX_LENGTH)]]
  });
  saving = signal(false);
  confirmingDelete = signal(false);
  deleting = signal(false);

  save() {
    if (this.saving() || this.accountForm.invalid) {
      return;
    }

    this.saving.set(true);
    this.userService.updateDisplayName(this.accountForm.getRawValue().displayName.trim()).subscribe({
      next: user => {
        this.saving.set(false);
        this.accountForm.reset({ displayName: user.displayName });
        this.toastService.success('Your display name was updated.');
      },
      error: () => {
        this.saving.set(false);
        this.toastService.error('Your display name could not be updated.');
      }
    });
  }

  deleteAccount() {
    if (!this.confirmingDelete()) {
      this.confirmingDelete.set(true);
      return;
    }

    this.deleting.set(true);
    this.userService.deleteAccount().subscribe({
      next: () => {
        this.toastService.success('Your account was deleted.');
        this.router.navigate(['home']);
      },
      error: () => {
        this.deleting.set(false);
        this.toastService.error('Your account could not be deleted.');
      }
    });
  }
}

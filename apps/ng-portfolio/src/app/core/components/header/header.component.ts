import { Component, EventEmitter, Output } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '@app/services';

@Component({
  selector: 'dvoss-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {

  @Output() toggleSideNav: EventEmitter<any> = new EventEmitter<any>();

  user$ = this.userService.user$;

  constructor(private router: Router, private userService: UserService) { }

  toggleNav() {
    this.toggleSideNav.emit();
  }

  login() {
    this.router.navigate(['/login']);
  }

  logout() {
    this.userService.logout();
  }

  goHome() {
    this.router.navigate(['home']);
  }
}

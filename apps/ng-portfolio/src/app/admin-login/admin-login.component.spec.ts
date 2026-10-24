import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { AdminLoginComponent } from './admin-login.component';

describe('AdminLoginComponent', () => {
  let component: AdminLoginComponent;
  let fixture: ComponentFixture<AdminLoginComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminLoginComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminLoginComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    component.loginForm.setValue({ username: 'devin', password: 'secret' });
  });

  it('goes to the movies page after logging in', () => {
    const navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.login();
    http.expectOne('api/auth/admin/login').flush({ user: { id: 'a', role: 'admin', displayName: 'Devin' } });
    expect(navigate).toHaveBeenCalledWith(['/movie']);
  });

  it('shows an error for bad credentials', () => {
    component.login();
    http.expectOne('api/auth/admin/login').flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(component.errorMessage()).toBe('Invalid Username or Password combination.');
    expect(component.submitting()).toBe(false);
  });

  it('explains rate limiting', () => {
    component.login();
    http.expectOne('api/auth/admin/login').flush(null, { status: 429, statusText: 'Too Many Requests' });
    expect(component.errorMessage()).toContain('Too many attempts');
  });
});

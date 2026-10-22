import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { UserService } from '@app/services';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  const signIn = jest.fn();

  async function create(queryParams: Record<string, string>) {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } } },
        { provide: UserService, useValue: { getProviders: () => of(['google', 'github']), signIn } }
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
  }

  beforeEach(() => signIn.mockReset());

  it('shows a button for each enabled provider', async () => {
    await create({});
    const buttons = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('button')).map(button => button.textContent?.trim());
    expect(buttons).toEqual(['Continue with Google', 'Continue with GitHub']);
  });

  it('signs in and returns to the page the visitor came from', async () => {
    await create({ returnTo: '/movie/detail/1' });
    fixture.componentInstance.signIn('google');
    expect(signIn).toHaveBeenCalledWith('google', '/movie/detail/1');
  });

  it('does not return to the login page itself', async () => {
    await create({ returnTo: '/login?error=failed' });
    fixture.componentInstance.signIn('github');
    expect(signIn).toHaveBeenCalledWith('github', '/');
  });

  it('explains why the last sign-in failed', async () => {
    await create({ error: 'cancelled' });
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Sign-in was cancelled.');
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { UserService } from '@app/services';
import { AccountComponent } from './account.component';

describe('AccountComponent', () => {
  let component: AccountComponent;
  let fixture: ComponentFixture<AccountComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountComponent],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), provideRouter([{ path: 'home', children: [] }])],
    }).compileComponents();

    TestBed.inject(UserService).user$.next({ id: 'm', role: 'member', displayName: 'Sam' });
    fixture = TestBed.createComponent(AccountComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  it('starts with the current display name', () => {
    expect(component.accountForm.getRawValue().displayName).toBe('Sam');
  });

  it('saves a trimmed display name', () => {
    component.accountForm.setValue({ displayName: '  Samantha ' });
    component.save();
    const req = http.expectOne({ method: 'PATCH', url: 'api/account/me' });
    expect(req.request.body).toEqual({ displayName: 'Samantha' });
    req.flush({ id: 'm', role: 'member', displayName: 'Samantha' });
    expect(TestBed.inject(UserService).user$.value?.displayName).toBe('Samantha');
  });

  it('asks for confirmation before deleting the account', () => {
    component.deleteAccount();
    http.expectNone('api/account/me');
    expect(component.confirmingDelete()).toBe(true);

    component.deleteAccount();
    http.expectOne({ method: 'DELETE', url: 'api/account/me' }).flush(null);
    expect(TestBed.inject(UserService).user$.value).toBeNull();
  });
});

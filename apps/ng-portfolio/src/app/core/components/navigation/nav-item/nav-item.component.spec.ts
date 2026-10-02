import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NavItemComponent } from './nav-item.component';
import { INavigation, NavigationType } from '@app/models';

describe('NavItemComponent', () => {
  let component: NavItemComponent;
  let fixture: ComponentFixture<NavItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavItemComponent, NoopAnimationsModule],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(NavItemComponent);
    component = fixture.componentInstance;
    component.navItem = { name: 'Home', route: 'home', type: NavigationType.Internal } as INavigation;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

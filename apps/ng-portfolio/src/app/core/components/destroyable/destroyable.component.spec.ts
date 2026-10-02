import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DestroyableComponent } from './destroyable.component';

describe('DestroyableComponent', () => {
  let component: DestroyableComponent;
  let fixture: ComponentFixture<DestroyableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DestroyableComponent, NoopAnimationsModule],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(DestroyableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

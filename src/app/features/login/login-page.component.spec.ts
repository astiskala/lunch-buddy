import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';
import { LoginPageComponent } from './login-page.component';
import { AuthService } from '../../core/services/auth.service';

describe('LoginPageComponent', () => {
  let component: LoginPageComponent;
  let fixture: ComponentFixture<LoginPageComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['setApiKey']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    fixture = TestBed.createComponent(LoginPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render login form', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('input[type="password"]')).toBeTruthy();
    expect(compiled.querySelector('button[type="submit"]')).toBeTruthy();
  });

  it('should show error when submitting empty API key', () => {
    component['onSubmit']();
    expect(component['errorMessage']()).toBe('Please enter your API key');
  });

  it('should show error when API key is too short', () => {
    component['onApiKeyChange']('short');
    component['onSubmit']();
    expect(component['errorMessage']()).toBe('API key appears to be invalid');
  });

  it('should accept valid API key and navigate to dashboard', () => {
    const validKey = 'a'.repeat(30);
    component['onApiKeyChange'](validKey);
    component['onSubmit']();

    expect(authService.setApiKey).toHaveBeenCalledWith(validKey);
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should clear error message when API key changes', () => {
    component['onSubmit'](); // Trigger error
    expect(component['errorMessage']()).toBeTruthy();

    component['onApiKeyChange']('new-key');
    expect(component['errorMessage']()).toBe('');
  });

  it('should trim whitespace from API key', () => {
    const key = 'a'.repeat(30);
    component['onApiKeyChange'](`  ${key}  `);
    component['onSubmit']();

    expect(authService.setApiKey).toHaveBeenCalledWith(key);
  });
});

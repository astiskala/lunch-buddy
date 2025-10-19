import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';
import { LoginPageComponent } from './login-page.component';
import { AuthService } from '../../core/services/auth.service';

describe('LoginPageComponent', () => {
  let component: LoginPageComponent;
  let fixture: ComponentFixture<LoginPageComponent>;
  type AuthServiceStub = {
    setApiKey: (key: string) => void;
  };

  type RouterStub = {
    navigate: (commands: unknown[]) => Promise<boolean>;
  };

  let authService: jasmine.SpyObj<AuthServiceStub>;
  let router: jasmine.SpyObj<RouterStub>;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj<AuthServiceStub>('AuthService', ['setApiKey']);
    authServiceSpy.setApiKey.and.stub();
    const routerSpy = jasmine.createSpyObj<RouterStub>('Router', ['navigate']);
    routerSpy.navigate.and.resolveTo(true);

    await TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    authService = authServiceSpy;
    router = routerSpy;

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

  it('should show error when submitting empty API key', async () => {
    await component['onSubmit']();
    expect(component['errorMessage']()).toBe('Please enter your API key');
  });

  it('should show error when API key is too short', async () => {
    component['onApiKeyChange']('short');
    await component['onSubmit']();
    expect(component['errorMessage']()).toBe('API key appears to be invalid');
  });

  it('should show error when API key contains invalid characters', async () => {
    component['onApiKeyChange']('a'.repeat(29) + '!');
    await component['onSubmit']();
    expect(component['errorMessage']()).toBe('API key appears to be invalid');
  });

  it('should accept valid API key and navigate to dashboard', async () => {
    const validKey = 'a'.repeat(30);
    component['onApiKeyChange'](validKey);
    await component['onSubmit']();

    expect(authService.setApiKey).toHaveBeenCalledWith(validKey);
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should clear error message when API key changes', async () => {
    await component['onSubmit'](); // Trigger error
    expect(component['errorMessage']()).toBeTruthy();

    component['onApiKeyChange']('new-key');
    expect(component['errorMessage']()).toBe('');
  });

  it('should trim whitespace from API key', async () => {
    const key = 'a'.repeat(30);
    component['onApiKeyChange'](`  ${key}  `);
    await component['onSubmit']();

    expect(authService.setApiKey).toHaveBeenCalledWith(key);
  });
});

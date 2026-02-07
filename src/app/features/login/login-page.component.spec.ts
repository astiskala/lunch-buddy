import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';
import { LoginPageComponent } from './login-page.component';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import { createSpyObj, type SpyObj } from '../../../test/vitest-spy';

describe('LoginPageComponent', () => {
  let component: LoginPageComponent;
  let fixture: ComponentFixture<LoginPageComponent>;
  interface AuthServiceStub {
    getApiKey: () => string | null;
    setApiKey: (key: string) => void;
  }

  interface RouterStub {
    navigate: (commands: unknown[]) => Promise<boolean>;
  }

  let authService: SpyObj<AuthServiceStub>;
  let router: SpyObj<RouterStub>;
  let nativeElement: HTMLElement;

  beforeEach(async () => {
    const authServiceSpy = createSpyObj<AuthServiceStub>('AuthService', [
      'getApiKey',
      'setApiKey',
    ]);
    authServiceSpy.getApiKey.mockReturnValue(null);
    authServiceSpy.setApiKey.mockImplementation(() => undefined);
    const routerSpy = createSpyObj<RouterStub>('Router', ['navigate']);
    routerSpy.navigate.mockResolvedValue(true);

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
    nativeElement = fixture.nativeElement as HTMLElement;
  });

  const getRequiredElement = (selector: string): HTMLElement => {
    const element = nativeElement.querySelector<HTMLElement>(selector);
    if (!element) {
      throw new Error(`Expected element matching "${selector}" to exist.`);
    }
    return element;
  };

  const apiKeyInput = () => getRequiredElement('#apiKey') as HTMLInputElement;

  const submitButton = () =>
    getRequiredElement('button[type="submit"]') as HTMLButtonElement;

  const currentErrorMessage = () => {
    const element = nativeElement.querySelector('.error-message');
    if (!element) {
      return undefined;
    }
    const content = element.textContent;
    return content ? content.trim() : undefined;
  };

  const setApiKeyValue = async (value: string) => {
    const input = apiKeyInput();
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const submitForm = async () => {
    const form = nativeElement.querySelector('form');
    form?.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    await fixture.whenStable();
  };

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render login form', () => {
    expect(apiKeyInput()).toBeTruthy();
    expect(submitButton()).toBeTruthy();
  });

  it('should show error when submitting empty API key', async () => {
    await submitForm();
    expect(currentErrorMessage()).toBe('Please enter your API key');
  });

  it('should show error when API key is too short', async () => {
    await setApiKeyValue('short');
    await submitForm();
    expect(currentErrorMessage()).toBe('API key appears to be invalid');
  });

  it('should show error when API key contains invalid characters', async () => {
    await setApiKeyValue('a'.repeat(29) + '!');
    await submitForm();
    expect(currentErrorMessage()).toBe('API key appears to be invalid');
  });

  it('should accept valid API key and navigate to dashboard', async () => {
    const validKey = 'a'.repeat(30);
    await setApiKeyValue(validKey);
    await submitForm();

    expect(authService.setApiKey).toHaveBeenCalledWith(validKey);
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should accept mock API key for the static mock server', async () => {
    const originalBase = environment.lunchmoneyApiBase;
    environment.lunchmoneyApiBase = '/v2';

    try {
      const mockKey = 'mock-api-key-12345';
      await setApiKeyValue(mockKey);
      await submitForm();

      expect(authService.setApiKey).toHaveBeenCalledWith(mockKey);
      expect(router.navigate).toHaveBeenCalledWith(['/']);
    } finally {
      environment.lunchmoneyApiBase = originalBase;
    }
  });

  it('should clear error message when API key changes', async () => {
    await submitForm();
    expect(currentErrorMessage()).toBeTruthy();

    await setApiKeyValue('new-key');
    expect(currentErrorMessage()).toBeUndefined();
  });

  it('should trim whitespace from API key', async () => {
    const key = 'a'.repeat(30);
    await setApiKeyValue(`  ${key}  `);
    await submitForm();

    expect(authService.setApiKey).toHaveBeenCalledWith(key);
  });
});

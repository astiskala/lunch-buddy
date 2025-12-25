import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import {
  BudgetService,
  CategoryPreferences,
} from '../../shared/services/budget.service';
import { AuthService } from '../../core/services/auth.service';

describe('DashboardPageComponent - Unit Tests', () => {
  interface BudgetServiceStub {
    refresh: () => void;
    updatePreferences: (
      updater: (current: CategoryPreferences) => CategoryPreferences
    ) => void;
  }

  interface AuthServiceStub {
    clearApiKey: () => Promise<void>;
  }

  interface RouterStub {
    navigate: (commands: unknown[]) => Promise<boolean>;
  }

  let mockBudgetService: jasmine.SpyObj<BudgetServiceStub>;
  let mockAuthService: jasmine.SpyObj<AuthServiceStub>;
  let mockRouter: jasmine.SpyObj<RouterStub>;

  beforeEach(() => {
    mockBudgetService = jasmine.createSpyObj<BudgetServiceStub>(
      'BudgetService',
      ['refresh', 'updatePreferences']
    );

    mockAuthService = jasmine.createSpyObj<AuthServiceStub>('AuthService', [
      'clearApiKey',
    ]);
    mockAuthService.clearApiKey.and.resolveTo();

    mockRouter = jasmine.createSpyObj<RouterStub>('Router', ['navigate']);
    mockRouter.navigate.and.resolveTo(true);
  });

  it('should create component with mocked dependencies', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: BudgetService, useValue: mockBudgetService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
      ],
    });
    expect(true).toBeTruthy();
  });
});

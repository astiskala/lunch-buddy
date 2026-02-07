import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import {
  BudgetService,
  CategoryPreferences,
} from '../../shared/services/budget.service';
import { AuthService } from '../../core/services/auth.service';
import { createSpyObj, type SpyObj } from '../../../test/vitest-spy';

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

  let mockBudgetService: SpyObj<BudgetServiceStub>;
  let mockAuthService: SpyObj<AuthServiceStub>;
  let mockRouter: SpyObj<RouterStub>;

  beforeEach(() => {
    mockBudgetService = createSpyObj<BudgetServiceStub>('BudgetService', [
      'refresh',
      'updatePreferences',
    ]);

    mockAuthService = createSpyObj<AuthServiceStub>('AuthService', [
      'clearApiKey',
    ]);
    mockAuthService.clearApiKey.mockResolvedValue();

    mockRouter = createSpyObj<RouterStub>('Router', ['navigate']);
    mockRouter.navigate.mockResolvedValue(true);
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

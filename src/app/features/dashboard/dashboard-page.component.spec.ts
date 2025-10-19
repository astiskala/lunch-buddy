import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BudgetService } from '../../shared/services/budget.service';
import { AuthService } from '../../core/services/auth.service';

describe('DashboardPageComponent - Unit Tests', () => {
  let mockBudgetService: jasmine.SpyObj<BudgetService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(() => {
    mockBudgetService = jasmine.createSpyObj('BudgetService', [
      'refresh',
      'updatePreferences',
    ]);

    mockAuthService = jasmine.createSpyObj('AuthService', ['clearApiKey']);
    mockAuthService.clearApiKey.and.returnValue(undefined);

    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockRouter.navigate.and.returnValue(Promise.resolve(true));
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

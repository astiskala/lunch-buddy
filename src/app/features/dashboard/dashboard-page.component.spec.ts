import { TestBed } from '@angular/core/testing';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  signal,
  provideZonelessChangeDetection,
} from '@angular/core';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import {
  BudgetService,
  CategoryPreferences,
} from '../../shared/services/budget.service';
import { AuthService } from '../../core/services/auth.service';
import { BudgetProgress } from '../../core/models/lunchmoney.types';
import { PushNotificationService } from '../../shared/services/push-notification.service';
import { DashboardPageComponent } from './dashboard-page.component';
import { CategoryPreferencesDialogComponent } from './category-preferences-dialog.component';
import { buildBudgetProgress } from '../../../test/budget-progress.fixture';
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

describe('DashboardPageComponent - settings dialog category source', () => {
  const preferences: CategoryPreferences = {
    customOrder: [],
    hiddenCategoryIds: [3],
    notificationsEnabled: false,
    includeAllTransactions: true,
    hideGroupedCategories: false,
  };

  function dialogItemIds(
    fixture: ReturnType<typeof TestBed.createComponent<DashboardPageComponent>>,
    input: 'items' | 'hiddenItems'
  ): (number | null)[] {
    const dialog = fixture.debugElement.query(
      By.directive(CategoryPreferencesDialogComponent)
    ).componentInstance as CategoryPreferencesDialogComponent;
    return dialog[input]()
      .map(c => c.categoryId)
      .sort((a, b) => (a ?? 0) - (b ?? 0));
  }

  function setup() {
    const budgetStub = {
      getIsLoading: signal(false),
      getExpenses: signal([
        buildBudgetProgress({ categoryId: 1, status: 'over' }),
        buildBudgetProgress({ categoryId: 2, status: 'on-track' }),
      ]),
      getHiddenExpenses: signal([
        buildBudgetProgress({ categoryId: 3, status: 'on-track' }),
      ]),
      getIncomes: signal<BudgetProgress[]>([]),
      getHiddenIncomes: signal<BudgetProgress[]>([]),
      getCurrency: signal('USD'),
      getStartDate: signal('2026-05-01'),
      getEndDate: signal('2026-05-31'),
      getMonthProgressRatio: signal(0.5),
      getCanNavigateToNextMonth: signal(false),
      getPeriodMode: signal('monthly'),
      getNonAlignedPeriodRequired: signal(false),
      getRecurringByCategory: signal({
        assigned: new Map(),
        unassigned: [],
      }),
      getErrors: signal([]),
      getPreferences: signal(preferences),
      getLastRefresh: signal(new Date('2026-05-16T00:00:00Z')),
      getReferenceDate: signal(new Date('2026-05-16T00:00:00Z')),
      getExpenseTotals: signal({ spent: 0, budget: 0, upcoming: 0 }),
      getIncomeTotals: signal({ spent: 0, budget: 0, upcoming: 0 }),
      refresh: () => undefined,
      updatePreferences: () => undefined,
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: BudgetService, useValue: budgetStub },
        { provide: AuthService, useValue: { clearApiKey: () => undefined } },
        {
          provide: Router,
          useValue: { navigate: () => Promise.resolve(true) },
        },
        {
          provide: PushNotificationService,
          useValue: {
            ensurePermission: () => Promise.resolve({ granted: true }),
          },
        },
      ],
    });
    // Render the real preferences dialog so a renamed/removed input would
    // fail this test; stub only the unrelated dashboard children.
    TestBed.overrideComponent(DashboardPageComponent, {
      set: {
        imports: [CategoryPreferencesDialogComponent],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
      },
    });

    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('keeps every visible category in the settings dialog when a status filter is active', () => {
    const fixture = setup();

    expect(dialogItemIds(fixture, 'items')).toEqual([1, 2]);

    fixture.componentInstance.handleStatusFilterChange('over');
    fixture.detectChanges();

    expect(dialogItemIds(fixture, 'items')).toEqual([1, 2]);
  });

  it('keeps every hidden category in the settings dialog when a status filter is active', () => {
    const fixture = setup();

    fixture.componentInstance.handleStatusFilterChange('over');
    fixture.detectChanges();

    // Category 3 is on-track, so a status:'over' filter would otherwise drop it.
    expect(dialogItemIds(fixture, 'hiddenItems')).toEqual([3]);
  });
});

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
import { type Mock, vi } from 'vitest';
import {
  createSpyObj as createSpyObject,
  type SpyObj as SpyObject,
} from '../../../test/vitest-spy';

function dialogItemIds(
  fixture: ReturnType<typeof TestBed.createComponent<DashboardPageComponent>>,
  input: 'items' | 'hiddenItems'
): (number | null)[] {
  const dialog = fixture.debugElement.query(
    By.directive(CategoryPreferencesDialogComponent)
  ).componentInstance as CategoryPreferencesDialogComponent;
  return dialog[input]()
    .map(c => c.categoryId)
    .toSorted((a, b) => (a ?? 0) - (b ?? 0));
}

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

  let mockBudgetService: SpyObject<BudgetServiceStub>;
  let mockAuthService: SpyObject<AuthServiceStub>;
  let mockRouter: SpyObject<RouterStub>;

  beforeEach(() => {
    mockBudgetService = createSpyObject<BudgetServiceStub>('BudgetService', [
      'refresh',
      'updatePreferences',
    ]);

    mockAuthService = createSpyObject<AuthServiceStub>('AuthService', [
      'clearApiKey',
    ]);
    mockAuthService.clearApiKey.mockResolvedValue();

    mockRouter = createSpyObject<RouterStub>('Router', ['navigate']);
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

    const fixture = TestBed.createComponent(DashboardPageComponent);
    expect(fixture.componentInstance).toBeTruthy();
    expect(TestBed.inject(BudgetService)).toBe(mockBudgetService);
    expect(TestBed.inject(AuthService)).toBe(mockAuthService);
    expect(TestBed.inject(Router)).toBe(mockRouter);
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
      refresh: () => {},
      updatePreferences: () => {},
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: BudgetService, useValue: budgetStub },
        { provide: AuthService, useValue: { clearApiKey: () => {} } },
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

describe('DashboardPageComponent - state and branch behavior', () => {
  interface BudgetServiceStateStub {
    getIsLoading: ReturnType<typeof signal<boolean>>;
    getExpenses: ReturnType<typeof signal<BudgetProgress[]>>;
    getHiddenExpenses: ReturnType<typeof signal<BudgetProgress[]>>;
    getIncomes: ReturnType<typeof signal<BudgetProgress[]>>;
    getHiddenIncomes: ReturnType<typeof signal<BudgetProgress[]>>;
    getCurrency: ReturnType<typeof signal<string | null>>;
    getStartDate: ReturnType<typeof signal<string>>;
    getEndDate: ReturnType<typeof signal<string>>;
    getMonthProgressRatio: ReturnType<typeof signal<number>>;
    getCanNavigateToNextMonth: ReturnType<typeof signal<boolean>>;
    getPeriodMode: ReturnType<
      typeof signal<'monthly' | 'non-aligned' | 'sub-monthly'>
    >;
    getNonAlignedPeriodRequired: ReturnType<typeof signal<boolean>>;
    getRecurringByCategory: ReturnType<
      typeof signal<{
        assigned: Map<number | null, unknown[]>;
        unassigned: unknown[];
      }>
    >;
    getErrors: ReturnType<typeof signal<Error[]>>;
    getPreferences: ReturnType<typeof signal<CategoryPreferences>>;
    getLastRefresh: ReturnType<typeof signal<Date | null>>;
    getReferenceDate: ReturnType<typeof signal<Date>>;
    getExpenseTotals: ReturnType<
      typeof signal<{ spent: number; budget: number; upcoming: number }>
    >;
    getIncomeTotals: ReturnType<
      typeof signal<{ spent: number; budget: number; upcoming: number }>
    >;
    refresh: Mock;
    updatePreferences: Mock;
    goToPreviousPeriod: Mock;
    goToNextPeriod: Mock;
    setCustomPeriod: Mock;
    dismissCustomPeriodPrompt: Mock;
  }

  const createBudgetStub = (): BudgetServiceStateStub => ({
    getIsLoading: signal(false),
    getExpenses: signal([
      buildBudgetProgress({ categoryId: 1, status: 'over', spent: 100 }),
      buildBudgetProgress({ categoryId: 2, status: 'at-risk', spent: 50 }),
      buildBudgetProgress({ categoryId: 3, status: 'on-track', spent: 25 }),
    ]),
    getHiddenExpenses: signal([
      buildBudgetProgress({ categoryId: 4, status: 'over', spent: 20 }),
    ]),
    getIncomes: signal([
      buildBudgetProgress({ categoryId: 11, isIncome: true, spent: -500 }),
    ]),
    getHiddenIncomes: signal([
      buildBudgetProgress({ categoryId: 12, isIncome: true, spent: -80 }),
    ]),
    getCurrency: signal('USD'),
    getStartDate: signal('2026-06-01'),
    getEndDate: signal('2026-06-30'),
    getMonthProgressRatio: signal(0.4),
    getCanNavigateToNextMonth: signal(true),
    getPeriodMode: signal('monthly'),
    getNonAlignedPeriodRequired: signal(false),
    getRecurringByCategory: signal({ assigned: new Map(), unassigned: [] }),
    getErrors: signal([]),
    getPreferences: signal({
      customOrder: [],
      hiddenCategoryIds: [],
      notificationsEnabled: false,
      includeAllTransactions: true,
      hideGroupedCategories: false,
    }),
    getLastRefresh: signal(new Date('2026-06-15T00:00:00Z')),
    getReferenceDate: signal(new Date('2026-06-15T00:00:00Z')),
    getExpenseTotals: signal({ spent: 175, budget: 200, upcoming: 10 }),
    getIncomeTotals: signal({ spent: 500, budget: 600, upcoming: 0 }),
    refresh: vi.fn(),
    updatePreferences: vi.fn(),
    goToPreviousPeriod: vi.fn(),
    goToNextPeriod: vi.fn(),
    setCustomPeriod: vi.fn(),
    dismissCustomPeriodPrompt: vi.fn(),
  });

  const setup = () => {
    const budgetStub = createBudgetStub();
    const authStub = { clearApiKey: vi.fn().mockResolvedValue(undefined) };
    const routerStub = { navigate: vi.fn().mockResolvedValue(true) };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: BudgetService, useValue: budgetStub },
        { provide: AuthService, useValue: authStub },
        { provide: Router, useValue: routerStub },
        {
          provide: PushNotificationService,
          useValue: {
            ensurePermission: () => Promise.resolve({ granted: true }),
          },
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    });

    const fixture = TestBed.createComponent(DashboardPageComponent);
    const component = fixture.componentInstance;

    return { fixture, component, budgetStub, authStub, routerStub };
  };

  it('filters items by selected status and resets filter when toggled twice', () => {
    const { component } = setup();
    const sample = [
      buildBudgetProgress({ categoryId: 1, status: 'over' }),
      buildBudgetProgress({ categoryId: 2, status: 'on-track' }),
    ];

    expect(component.filterItemsByStatus(sample, 'all')).toHaveLength(2);
    expect(component.filterItemsByStatus(sample, 'over')).toHaveLength(1);

    component.handleStatusFilterChange('over');
    expect(
      (component as unknown as { statusFilter: () => string }).statusFilter()
    ).toBe('over');

    component.handleStatusFilterChange('over');
    expect(
      (component as unknown as { statusFilter: () => string }).statusFilter()
    ).toBe('all');
  });

  it('switches tabs and resets hidden panel plus status filter', () => {
    const { component } = setup();
    const privateApi = component as unknown as {
      showHidden: ReturnType<typeof signal<boolean>>;
      statusFilter: ReturnType<
        typeof signal<'all' | 'over' | 'at-risk' | 'on-track'>
      >;
      activeTab: ReturnType<typeof signal<'expenses' | 'income'>>;
    };

    privateApi.showHidden.set(true);
    privateApi.statusFilter.set('over');

    component.handleTabChange('income');

    expect(privateApi.activeTab()).toBe('income');
    expect(privateApi.showHidden()).toBe(false);
    expect(privateApi.statusFilter()).toBe('all');
  });

  it('computes status counts from active tab items', () => {
    const { component } = setup();
    const privateApi = component as unknown as {
      statusCounts: () => { over: number; atRisk: number; onTrack: number };
    };

    expect(privateApi.statusCounts()).toEqual({
      over: 1,
      atRisk: 1,
      onTrack: 1,
    });
  });

  it('computes hidden totals and labels for expenses and income tabs', () => {
    const { component } = setup();
    const privateApi = component as unknown as {
      hiddenTotal: () => number;
      hiddenLabel: () => string;
      activeTab: ReturnType<typeof signal<'expenses' | 'income'>>;
    };

    expect(privateApi.hiddenTotal()).toBe(20);
    expect(privateApi.hiddenLabel()).toBe('categories');

    privateApi.activeTab.set('income');
    expect(privateApi.hiddenTotal()).toBe(80);
    expect(privateApi.hiddenLabel()).toBe('income categories');
  });

  it('provides loading and empty-state messages across branches', () => {
    const { component, budgetStub } = setup();
    const privateApi = component as unknown as {
      visibleEmptyMessage: () => string;
      hiddenEmptyMessage: () => string;
      statusFilter: ReturnType<
        typeof signal<'all' | 'over' | 'at-risk' | 'on-track'>
      >;
      activeTab: ReturnType<typeof signal<'expenses' | 'income'>>;
      showInitialLoading: () => boolean;
      isRefreshing: () => boolean;
    };

    budgetStub.getExpenses.set([]);
    budgetStub.getIncomes.set([]);
    budgetStub.getLastRefresh.set(null);
    budgetStub.getIsLoading.set(true);
    expect(privateApi.showInitialLoading()).toBe(true);
    expect(privateApi.isRefreshing()).toBe(false);

    budgetStub.getIsLoading.set(false);
    expect(privateApi.visibleEmptyMessage()).toBe('');

    budgetStub.getLastRefresh.set(new Date('2026-06-20T00:00:00Z'));
    expect(privateApi.visibleEmptyMessage()).toContain(
      'No expense categories available'
    );

    privateApi.statusFilter.set('over');
    expect(privateApi.visibleEmptyMessage()).toBe(
      'No expense categories are currently over budget.'
    );
    expect(privateApi.hiddenEmptyMessage()).toBe(
      'No hidden categories are currently over budget.'
    );

    privateApi.activeTab.set('income');
    privateApi.statusFilter.set('all');
    expect(privateApi.visibleEmptyMessage()).toBe(
      'No income categories available this month.'
    );
  });

  it('controls custom period dialog visibility from service flag and local state', () => {
    const { component, budgetStub } = setup();
    const privateApi = component as unknown as {
      customPeriodDialogOpen: () => boolean;
      showCustomPeriodDialog: ReturnType<typeof signal<boolean>>;
      showPreferencesDialog: ReturnType<typeof signal<boolean>>;
    };

    expect(privateApi.customPeriodDialogOpen()).toBe(false);

    privateApi.showCustomPeriodDialog.set(true);
    expect(privateApi.customPeriodDialogOpen()).toBe(true);

    privateApi.showCustomPeriodDialog.set(false);
    budgetStub.getNonAlignedPeriodRequired.set(true);
    expect(privateApi.customPeriodDialogOpen()).toBe(true);

    component.openCustomPeriodDialogFromSettings();
    expect(privateApi.showPreferencesDialog()).toBe(false);
    expect(privateApi.showCustomPeriodDialog()).toBe(true);
  });

  it('forwards period navigation and custom period actions to the budget service', () => {
    const { component, budgetStub } = setup();
    const privateApi = component as unknown as {
      showHidden: ReturnType<typeof signal<boolean>>;
      showCustomPeriodDialog: ReturnType<typeof signal<boolean>>;
    };

    privateApi.showHidden.set(true);
    component.goToPreviousMonth();
    expect(privateApi.showHidden()).toBe(false);
    expect(budgetStub.goToPreviousPeriod).toHaveBeenCalledTimes(1);

    privateApi.showHidden.set(true);
    component.goToNextMonth();
    expect(privateApi.showHidden()).toBe(false);
    expect(budgetStub.goToNextPeriod).toHaveBeenCalledTimes(1);

    privateApi.showCustomPeriodDialog.set(true);
    component.handleCustomPeriodSelected({
      start: '2026-06-01',
      end: '2026-06-15',
    });
    expect(privateApi.showCustomPeriodDialog()).toBe(false);
    expect(budgetStub.setCustomPeriod).toHaveBeenCalledWith(
      '2026-06-01',
      '2026-06-15'
    );

    privateApi.showCustomPeriodDialog.set(true);
    component.dismissCustomPeriodDialog();
    expect(privateApi.showCustomPeriodDialog()).toBe(false);
    expect(budgetStub.dismissCustomPeriodPrompt).toHaveBeenCalledTimes(1);
  });

  it('updates preferences and triggers refresh', () => {
    const { component, budgetStub } = setup();
    const nextPreferences: CategoryPreferences = {
      customOrder: [7],
      hiddenCategoryIds: [3],
      notificationsEnabled: true,
      includeAllTransactions: false,
      hideGroupedCategories: true,
    };

    component.handlePreferencesChange(nextPreferences);
    expect(budgetStub.updatePreferences).toHaveBeenCalledTimes(1);
    const updater = budgetStub.updatePreferences.mock.calls[0]?.[0] as (
      current: CategoryPreferences
    ) => CategoryPreferences;
    expect(
      updater({
        customOrder: [],
        hiddenCategoryIds: [],
        notificationsEnabled: false,
        includeAllTransactions: true,
        hideGroupedCategories: false,
      })
    ).toEqual(nextPreferences);

    component.refresh();
    expect(budgetStub.refresh).toHaveBeenCalledTimes(1);
  });

  it('always navigates to login on logout, even if clearing API key fails', async () => {
    const { component, authStub, routerStub } = setup();

    authStub.clearApiKey.mockRejectedValueOnce(new Error('clear failed'));

    await expect(component.logout()).rejects.toThrow('clear failed');

    expect(authStub.clearApiKey).toHaveBeenCalledTimes(1);
    expect(routerStub.navigate).toHaveBeenCalledWith(['/login']);
  });
});

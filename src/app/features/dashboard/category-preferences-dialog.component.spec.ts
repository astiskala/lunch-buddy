import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { CategoryPreferencesDialogComponent } from './category-preferences-dialog.component';
import { BudgetProgress } from '../../core/models/lunchmoney.types';
import { CategoryPreferences } from '../../shared/services/budget.service';
import { PushNotificationService } from '../../shared/services/push-notification.service';
import { vi, type Mock } from 'vitest';

const createToggleEvent = (checked: boolean): Event =>
  ({
    target: Object.assign(document.createElement('input'), {
      type: 'checkbox',
      checked,
    }),
  }) as unknown as Event;

const buildCategory = (id: number, name: string): BudgetProgress => ({
  categoryId: id,
  categoryName: name,
  categoryGroupName: null,
  groupId: null,
  isGroup: false,
  isIncome: false,
  excludeFromBudget: false,
  budgetAmount: 100,
  budgetCurrency: 'USD',
  spent: 0,
  remaining: 100,
  monthKey: '2025-10',
  numTransactions: 0,
  isAutomated: false,
  recurringTotal: 0,
  recurringItems: [],
  status: 'on-track',
  progressRatio: 0,
});

describe('CategoryPreferencesDialogComponent notifications', () => {
  let fixture: ComponentFixture<CategoryPreferencesDialogComponent>;
  let component: CategoryPreferencesDialogComponent;
  let ensurePermissionSpy: Mock;

  beforeEach(async () => {
    ensurePermissionSpy = vi.fn().mockResolvedValue({ granted: true });

    await TestBed.configureTestingModule({
      imports: [CategoryPreferencesDialogComponent],
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: PushNotificationService,
          useValue: {
            ensurePermission: ensurePermissionSpy,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryPreferencesDialogComponent);
    component = fixture.componentInstance;
  });

  it('requests permission when enabling notifications', async () => {
    const event = createToggleEvent(true);

    await component.handleNotificationsChange(event);

    expect(ensurePermissionSpy).toHaveBeenCalled();
    expect(component.notificationsEnabled()).toBe(true);
    expect(component.notificationError()).toBeNull();
  });

  it('reverts the toggle when permission is denied', async () => {
    ensurePermissionSpy.mockResolvedValue({
      granted: false,
      denialReason: 'denied-by-browser',
    });
    const event = createToggleEvent(true);
    const input = event.target as HTMLInputElement;

    await component.handleNotificationsChange(event);

    expect(ensurePermissionSpy).toHaveBeenCalled();
    expect(component.notificationsEnabled()).toBe(false);
    expect(input.checked).toBe(false);
    expect(component.notificationError()?.message).toContain(
      'blocked this notification request'
    );
    expect(component.notificationError()?.links.length).toBeGreaterThan(0);
  });

  it('shows user-denied message when permission denied by user', async () => {
    ensurePermissionSpy.mockResolvedValue({
      granted: false,
      denialReason: 'denied-by-user',
    });
    const event = createToggleEvent(true);

    await component.handleNotificationsChange(event);

    expect(component.notificationError()?.message).toContain(
      'You denied the notification permission'
    );
    expect(component.notificationError()?.links.length).toBeGreaterThan(0);
  });

  it('clears error message when disabling notifications', async () => {
    component.notificationError.set({
      message: 'Some previous error',
      links: [],
    });
    component.notificationsEnabled.set(true);
    const event = createToggleEvent(false);

    await component.handleNotificationsChange(event);

    expect(component.notificationError()).toBeNull();
  });

  it('does not request permission when disabling notifications', async () => {
    component.notificationsEnabled.set(true);
    const event = createToggleEvent(false);

    await component.handleNotificationsChange(event);

    expect(ensurePermissionSpy).not.toHaveBeenCalled();
    expect(component.notificationsEnabled()).toBe(false);
  });
});

describe('CategoryPreferencesDialogComponent', () => {
  let fixture: ComponentFixture<CategoryPreferencesDialogComponent>;
  let component: CategoryPreferencesDialogComponent;
  let ensurePermissionSpy: Mock;

  const basePreferences: CategoryPreferences = {
    customOrder: [1],
    hiddenCategoryIds: [2],
    notificationsEnabled: true,
    includeAllTransactions: false,
    hideGroupedCategories: true,
  };

  const setRequiredInputs = (): void => {
    fixture.componentRef.setInput('open', false);
    fixture.componentRef.setInput('items', [buildCategory(1, 'Food')]);
    fixture.componentRef.setInput('hiddenItems', [buildCategory(2, 'Rent')]);
    fixture.componentRef.setInput('preferences', basePreferences);
  };

  beforeEach(async () => {
    ensurePermissionSpy = vi.fn().mockResolvedValue({ granted: true });

    await TestBed.configureTestingModule({
      imports: [CategoryPreferencesDialogComponent],
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: PushNotificationService,
          useValue: {
            ensurePermission: ensurePermissionSpy,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryPreferencesDialogComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    delete document.body.dataset['dialogScrollLockCount'];
    delete document.body.dataset['dialogOriginalOverflow'];
    delete document.body.dataset['dialogOriginalTouchAction'];
  });

  it('initializes local state from preferences on init', () => {
    setRequiredInputs();

    component.ngOnInit();

    expect(component.orderedIds()).toEqual(basePreferences.customOrder);
    expect(Array.from(component.hiddenIds())).toEqual(
      basePreferences.hiddenCategoryIds
    );
    expect(component.notificationsEnabled()).toBe(true);
    expect(component.includeAllTransactions()).toBe(false);
    expect(component.hideGroupedCategories()).toBe(true);
  });

  it('emits normalized preferences on save', () => {
    fixture.componentRef.setInput('open', false);
    fixture.componentRef.setInput('items', [
      buildCategory(1, 'Food'),
      buildCategory(2, 'Travel'),
    ]);
    fixture.componentRef.setInput('hiddenItems', [buildCategory(3, 'Rent')]);
    fixture.componentRef.setInput('preferences', basePreferences);

    component.orderedIds.set([2]);
    component.hiddenIds.set(new Set([3]));
    component.notificationsEnabled.set(true);
    component.includeAllTransactions.set(false);
    component.hideGroupedCategories.set(true);

    const preferencesSpy = vi.spyOn(component.preferencesChange, 'emit');
    const closeSpy = vi.spyOn(component.dialogClose, 'emit');

    component.handleSave();

    expect(preferencesSpy).toHaveBeenCalledWith({
      customOrder: [2, 1, 3],
      hiddenCategoryIds: [3],
      notificationsEnabled: true,
      includeAllTransactions: false,
      hideGroupedCategories: true,
    });
    expect(closeSpy).toHaveBeenCalled();
  });

  it('resets preferences to defaults', () => {
    component.orderedIds.set([1]);
    component.hiddenIds.set(new Set([2]));
    component.notificationsEnabled.set(true);
    component.includeAllTransactions.set(false);
    component.hideGroupedCategories.set(true);

    component.resetPreferences();

    expect(component.orderedIds()).toEqual([]);
    expect(component.hiddenIds().size).toBe(0);
    expect(component.notificationsEnabled()).toBe(false);
    expect(component.includeAllTransactions()).toBe(true);
    expect(component.hideGroupedCategories()).toBe(false);
  });

  it('keeps visible categories collapsed by default and toggles open state', () => {
    expect(component.visibleCategoriesExpanded()).toBe(false);

    component.toggleVisibleCategoriesSection();
    expect(component.visibleCategoriesExpanded()).toBe(true);

    component.toggleVisibleCategoriesSection();
    expect(component.visibleCategoriesExpanded()).toBe(false);
  });

  it('locks body scroll while the dialog is open and restores it when closed', () => {
    document.body.style.overflow = 'auto';
    document.body.style.touchAction = 'pan-y';
    setRequiredInputs();

    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();

    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.style.touchAction).toBe('none');
    expect(document.body.dataset['dialogScrollLockCount']).toBe('1');

    fixture.componentRef.setInput('open', false);
    fixture.detectChanges();

    expect(document.body.style.overflow).toBe('auto');
    expect(document.body.style.touchAction).toBe('pan-y');
    expect(Object.hasOwn(document.body.dataset, 'dialogScrollLockCount')).toBe(
      false
    );
  });

  it('releases body scroll lock when destroyed while open', () => {
    document.body.style.overflow = 'visible';
    document.body.style.touchAction = 'auto';
    setRequiredInputs();

    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    expect(document.body.style.overflow).toBe('hidden');

    fixture.destroy();

    expect(document.body.style.overflow).toBe('visible');
    expect(document.body.style.touchAction).toBe('auto');
    expect(Object.hasOwn(document.body.dataset, 'dialogScrollLockCount')).toBe(
      false
    );
  });
});

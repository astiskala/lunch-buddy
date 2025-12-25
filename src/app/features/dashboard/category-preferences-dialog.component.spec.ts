import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { CategoryPreferencesDialogComponent } from './category-preferences-dialog.component';
import { BudgetProgress } from '../../core/models/lunchmoney.types';
import { CategoryPreferences } from '../../shared/services/budget.service';
import { PushNotificationService } from '../../shared/services/push-notification.service';

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
  let ensurePermissionSpy: jasmine.Spy;

  beforeEach(async () => {
    ensurePermissionSpy = jasmine
      .createSpy('ensurePermission')
      .and.resolveTo(true);

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
    expect(component.notificationsEnabled()).toBeTrue();
  });

  it('reverts the toggle when permission is denied', async () => {
    ensurePermissionSpy.and.resolveTo(false);
    const event = createToggleEvent(true);
    const input = event.target as HTMLInputElement;

    await component.handleNotificationsChange(event);

    expect(ensurePermissionSpy).toHaveBeenCalled();
    expect(component.notificationsEnabled()).toBeFalse();
    expect(input.checked).toBeFalse();
  });

  it('does not request permission when disabling notifications', async () => {
    component.notificationsEnabled.set(true);
    const event = createToggleEvent(false);

    await component.handleNotificationsChange(event);

    expect(ensurePermissionSpy).not.toHaveBeenCalled();
    expect(component.notificationsEnabled()).toBeFalse();
  });
});

describe('CategoryPreferencesDialogComponent', () => {
  let fixture: ComponentFixture<CategoryPreferencesDialogComponent>;
  let component: CategoryPreferencesDialogComponent;
  let ensurePermissionSpy: jasmine.Spy;

  const basePreferences: CategoryPreferences = {
    customOrder: [1],
    hiddenCategoryIds: [2],
    warnAtRatio: 0.9,
    notificationsEnabled: true,
    includeAllTransactions: false,
  };

  const setRequiredInputs = (): void => {
    fixture.componentRef.setInput('open', false);
    fixture.componentRef.setInput('items', [buildCategory(1, 'Food')]);
    fixture.componentRef.setInput('hiddenItems', [buildCategory(2, 'Rent')]);
    fixture.componentRef.setInput('preferences', basePreferences);
  };

  beforeEach(async () => {
    ensurePermissionSpy = jasmine
      .createSpy('ensurePermission')
      .and.resolveTo(true);

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

  it('initializes local state from preferences on init', () => {
    setRequiredInputs();

    component.ngOnInit();

    expect(component.orderedIds()).toEqual(basePreferences.customOrder);
    expect(Array.from(component.hiddenIds())).toEqual(
      basePreferences.hiddenCategoryIds
    );
    expect(component.warnAtRatio()).toBe(basePreferences.warnAtRatio);
    expect(component.notificationsEnabled()).toBeTrue();
    expect(component.includeAllTransactions()).toBeFalse();
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
    component.warnAtRatio.set(0.2);
    component.notificationsEnabled.set(true);
    component.includeAllTransactions.set(false);

    const preferencesSpy = spyOn(component.preferencesChange, 'emit');
    const closeSpy = spyOn(component.dialogClose, 'emit');

    component.handleSave();

    expect(preferencesSpy).toHaveBeenCalledWith({
      customOrder: [2, 1, 3],
      hiddenCategoryIds: [3],
      warnAtRatio: 0.5,
      notificationsEnabled: true,
      includeAllTransactions: false,
    });
    expect(closeSpy).toHaveBeenCalled();
  });

  it('resets preferences to defaults', () => {
    component.orderedIds.set([1]);
    component.hiddenIds.set(new Set([2]));
    component.warnAtRatio.set(0.7);
    component.notificationsEnabled.set(true);
    component.includeAllTransactions.set(false);

    component.resetPreferences();

    expect(component.orderedIds()).toEqual([]);
    expect(component.hiddenIds().size).toBe(0);
    expect(component.warnAtRatio()).toBe(0.85);
    expect(component.notificationsEnabled()).toBeFalse();
    expect(component.includeAllTransactions()).toBeTrue();
  });
});

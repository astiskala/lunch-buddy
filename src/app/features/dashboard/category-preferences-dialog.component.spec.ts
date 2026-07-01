import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { CategoryPreferencesDialogComponent } from './category-preferences-dialog.component';
import { BudgetProgress } from '../../core/models/lunchmoney.types';
import { CategoryPreferences } from '../../shared/services/budget.service';
import { PushNotificationService } from '../../shared/services/push-notification.service';
import { vi, type Mock } from 'vitest';
import { buildBudgetProgress } from '../../../test/budget-progress.fixture';
import { LoggerService } from '../../core/services/logger.service';
import { VersionService } from '../../core/services/version.service';
import { DiagnosticsService } from '../../core/services/diagnostics.service';

const createToggleEvent = (checked: boolean): Event =>
  ({
    target: Object.assign(document.createElement('input'), {
      type: 'checkbox',
      checked,
    }),
  }) as unknown as Event;

const buildCategory = (id: number, name: string): BudgetProgress =>
  buildBudgetProgress({ categoryId: id, categoryName: name });

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
  let loggerSpy: {
    info: Mock;
    error: Mock;
    debug: Mock;
    warn: Mock;
  };
  let diagnosticsStub: {
    isEnabled: ReturnType<typeof signal<boolean>>;
    session: ReturnType<
      typeof signal<{
        supportCode: string;
        sessionId: string;
        writeKey: string;
        expiresAt: number;
      } | null>
    >;
    enable: Mock;
    disable: Mock;
    flush: Mock;
    log: Mock;
  };

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
    loggerSpy = {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
    };
    diagnosticsStub = {
      isEnabled: signal(false),
      session: signal(null),
      enable: vi.fn().mockResolvedValue(undefined),
      disable: vi.fn().mockResolvedValue(undefined),
      flush: vi.fn().mockResolvedValue(undefined),
      log: vi.fn(),
    };

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
        { provide: LoggerService, useValue: loggerSpy },
        { provide: VersionService, useValue: { getVersion: () => 'test' } },
        { provide: DiagnosticsService, useValue: diagnosticsStub },
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
    expect([...component.hiddenIds()]).toEqual(
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

  it('emits custom period request and closes dialog', () => {
    const closeSpy = vi.spyOn(component.dialogClose, 'emit');
    const customPeriodSpy = vi.spyOn(component.customPeriodRequested, 'emit');

    component.handleCustomPeriodRequest();

    expect(closeSpy).toHaveBeenCalledTimes(1);
    expect(customPeriodSpy).toHaveBeenCalledTimes(1);
  });

  it('hides custom period setting when not applicable', () => {
    setRequiredInputs();
    fixture.componentRef.setInput('showCustomPeriodSetting', false);

    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).not.toContain('Custom budget period');
    expect(host.querySelector('.custom-period-button')).toBeNull();
  });

  it('shows custom period setting when applicable', () => {
    setRequiredInputs();
    fixture.componentRef.setInput('showCustomPeriodSetting', true);

    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Custom budget period');
    expect(host.querySelector('.custom-period-button')).not.toBeNull();
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

  it('moves visible category ordering in both directions and clamps at boundaries', () => {
    setRequiredInputs();
    component.ngOnInit();

    expect(component.visibleCategories().map(item => item.categoryId)).toEqual([
      1,
    ]);

    component.moveCategory(2, -1);
    expect(component.visibleCategories().map(item => item.categoryId)).toEqual([
      1,
    ]);

    component.toggleVisibility(2);
    expect(component.visibleCategories().map(item => item.categoryId)).toEqual([
      2, 1,
    ]);

    component.moveCategory(2, -1);
    expect(component.visibleCategories().map(item => item.categoryId)).toEqual([
      2, 1,
    ]);

    component.moveCategory(2, -1);
    expect(component.visibleCategories().map(item => item.categoryId)).toEqual([
      2, 1,
    ]);

    component.moveCategory(2, 1);
    expect(component.visibleCategories().map(item => item.categoryId)).toEqual([
      1, 2,
    ]);
  });

  it('toggles category visibility in and out of hidden set', () => {
    component.hiddenIds.set(new Set());

    component.toggleVisibility(1);
    expect(component.hiddenIds().has(1)).toBe(true);

    component.toggleVisibility(1);
    expect(component.hiddenIds().has(1)).toBe(false);
  });

  it('emits close without saving when handleClose is called', () => {
    const closeSpy = vi.spyOn(component.dialogClose, 'emit');

    component.handleClose();

    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('updates include-all-transactions and hide-grouped toggles from events', () => {
    component.handleIncludeAllTransactionsChange(createToggleEvent(false));
    expect(component.includeAllTransactions()).toBe(false);

    component.handleHideGroupedCategoriesChange(createToggleEvent(true));
    expect(component.hideGroupedCategories()).toBe(true);
  });

  it('reports move eligibility from list indexes', () => {
    setRequiredInputs();
    component.ngOnInit();
    component.toggleVisibility(2);

    expect(component.canMoveUp(0)).toBe(false);
    expect(component.canMoveUp(1)).toBe(true);
    expect(component.canMoveDown(0)).toBe(true);
    expect(component.canMoveDown(1)).toBe(false);
  });

  it('enables diagnostics when diagnostics toggle is checked', async () => {
    await component.toggleDiagnostics(createToggleEvent(true));

    expect(diagnosticsStub.enable).toHaveBeenCalledTimes(1);
    expect(diagnosticsStub.disable).not.toHaveBeenCalled();
  });

  it('disables diagnostics when diagnostics toggle is unchecked', async () => {
    await component.toggleDiagnostics(createToggleEvent(false));

    expect(diagnosticsStub.disable).toHaveBeenCalledTimes(1);
    expect(diagnosticsStub.enable).not.toHaveBeenCalled();
  });

  it('copies support code to clipboard when a diagnostics session exists', async () => {
    diagnosticsStub.session.set({
      supportCode: 'SUP-123',
      sessionId: 'session',
      writeKey: 'write',
      expiresAt: Date.now() + 1000,
    });
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText: writeTextSpy },
      configurable: true,
    });

    await component.copySupportCode();

    expect(writeTextSpy).toHaveBeenCalledWith('SUP-123');
    expect(loggerSpy.info).toHaveBeenCalledWith(
      'Support code copied to clipboard'
    );
  });

  it('does not attempt clipboard write when there is no diagnostics session', async () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText: writeTextSpy },
      configurable: true,
    });

    await component.copySupportCode();

    expect(writeTextSpy).not.toHaveBeenCalled();
  });

  it('logs clipboard failures while copying support code', async () => {
    diagnosticsStub.session.set({
      supportCode: 'SUP-456',
      sessionId: 'session',
      writeKey: 'write',
      expiresAt: Date.now() + 1000,
    });
    const writeTextSpy = vi
      .fn()
      .mockRejectedValue(new Error('clipboard not available'));
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: { writeText: writeTextSpy },
      configurable: true,
    });

    await component.copySupportCode();

    expect(loggerSpy.error).toHaveBeenCalledWith(
      'Failed to copy support code',
      expect.any(Error)
    );
  });

  it('flushes logs and logs success', async () => {
    await component.flushLogs();

    expect(diagnosticsStub.flush).toHaveBeenCalledTimes(1);
    expect(loggerSpy.info).toHaveBeenCalledWith('Logs sent successfully');
  });

  it('disables diagnostics and deletes logs when user confirms', async () => {
    const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(true);

    await component.disableAndDeleteLogs();

    expect(confirmSpy).toHaveBeenCalled();
    expect(diagnosticsStub.disable).toHaveBeenCalledWith(true);
    expect(loggerSpy.info).toHaveBeenCalledWith(
      'Diagnostics disabled and logs deleted'
    );
  });

  it('does not disable diagnostics when user cancels delete confirmation', async () => {
    const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(false);

    await component.disableAndDeleteLogs();

    expect(confirmSpy).toHaveBeenCalled();
    expect(diagnosticsStub.disable).not.toHaveBeenCalled();
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

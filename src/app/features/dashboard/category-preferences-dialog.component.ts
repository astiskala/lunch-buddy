import {
  ChangeDetectionStrategy,
  Component,
  signal,
  computed,
  output,
  input,
  OnInit,
  inject,
  viewChild,
  ElementRef,
  effect,
  OnDestroy,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BudgetProgress } from '../../core/models/lunchmoney.types';
import { CategoryPreferences } from '../../shared/services/budget.service';
import {
  PermissionDenialReason,
  PushNotificationService,
} from '../../shared/services/push-notification.service';
import { LoggerService } from '../../core/services/logger.service';
import { VersionService } from '../../core/services/version.service';
import { DiagnosticsService } from '../../core/services/diagnostics.service';
import {
  buildBlockedNotificationGuidance,
  NotificationHelpLink,
} from '../../shared/utils/notification-guidance.util';

interface NotificationErrorDetails {
  message: string;
  links: NotificationHelpLink[];
}

const DENIAL_MESSAGES: Record<
  Exclude<PermissionDenialReason, 'denied-by-browser'>,
  string
> = {
  'not-supported': 'Push notifications are not supported in this browser.',
  'denied-by-user':
    'You denied the notification permission. To enable notifications, please allow them in your browser settings.',
  'request-failed':
    'Failed to request notification permission. Please try again.',
};

@Component({
  selector: 'category-preferences-dialog',
  imports: [FormsModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './category-preferences-dialog.component.html',
  styleUrls: ['./category-preferences-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryPreferencesDialogComponent implements OnInit, OnDestroy {
  private readonly pushNotificationService = inject(PushNotificationService);
  private readonly logger = inject(LoggerService);
  private readonly versionService = inject(VersionService);
  private readonly document = inject(DOCUMENT);
  protected readonly diagnostics = inject(DiagnosticsService);
  private readonly bodyScrollLockCountAttribute =
    'data-dialog-scroll-lock-count';
  private readonly bodyOverflowAttribute = 'data-dialog-original-overflow';
  private readonly bodyTouchActionAttribute =
    'data-dialog-original-touch-action';
  private isBodyScrollLocked = false;

  readonly dialogElement =
    viewChild.required<ElementRef<HTMLDialogElement>>('dialogElement');
  readonly version = this.versionService.getVersion();
  readonly open = input.required<boolean>();
  readonly items = input.required<BudgetProgress[]>();
  readonly hiddenItems = input.required<BudgetProgress[]>();
  readonly preferences = input.required<CategoryPreferences>();

  readonly dialogClose = output();
  readonly preferencesChange = output<CategoryPreferences>();

  readonly orderedIds = signal<(number | null)[]>([]);
  readonly hiddenIds = signal<Set<number | null>>(new Set());
  readonly notificationsEnabled = signal(false);
  readonly notificationError = signal<NotificationErrorDetails | null>(null);
  readonly includeAllTransactions = signal(true);
  readonly hideGroupedCategories = signal(false);
  readonly visibleCategoriesExpanded = signal(false);

  readonly allCategories = computed(() => [
    ...this.items(),
    ...this.hiddenItems(),
  ]);

  readonly visibleCategories = computed(() => {
    const order = this.ensureOrderContains(this.orderedIds());
    const hidden = this.hiddenIds();
    const all = this.allCategories();

    return order
      .map(id => all.find(cat => cat.categoryId === id))
      .filter(
        (cat): cat is BudgetProgress => !!cat && !hidden.has(cat.categoryId)
      );
  });

  readonly hiddenCategories = computed(() => {
    const hidden = this.hiddenIds();
    return this.allCategories().filter(cat => hidden.has(cat.categoryId));
  });

  constructor() {
    // Keep dialog visibility synchronized with the open input signal.
    effect(() => {
      const dialog = this.dialogElement().nativeElement;
      const shouldOpen = this.open();

      if (!shouldOpen) {
        this.unlockBodyScroll();
        this.visibleCategoriesExpanded.set(false);
        if (dialog.open && typeof dialog.close === 'function') {
          dialog.close();
        }

        dialog.removeAttribute('open');
        return;
      }

      this.lockBodyScroll();
      if (!dialog.open) {
        if (typeof dialog.showModal === 'function') {
          try {
            dialog.showModal();
            return;
          } catch (error) {
            this.logger.error('Failed to open dialog with showModal', error);
          }
        }

        dialog.setAttribute('open', '');
      }
    });
  }

  ngOnInit() {
    // Initialize local state from persisted preferences.
    const prefs = this.preferences();
    this.orderedIds.set([...prefs.customOrder]);
    this.hiddenIds.set(new Set(prefs.hiddenCategoryIds));
    this.notificationsEnabled.set(prefs.notificationsEnabled);
    this.includeAllTransactions.set(prefs.includeAllTransactions);
    this.hideGroupedCategories.set(prefs.hideGroupedCategories);
  }

  ngOnDestroy(): void {
    this.unlockBodyScroll();
  }

  private ensureOrderContains(current: (number | null)[]): (number | null)[] {
    const existing = new Set(current);
    const appended = [...current];
    for (const category of this.allCategories()) {
      if (!existing.has(category.categoryId)) {
        appended.push(category.categoryId);
      }
    }
    return appended;
  }

  moveCategory(categoryId: number | null, direction: -1 | 1): void {
    this.orderedIds.update(previous => {
      const order = this.ensureOrderContains(previous);
      const index = order.indexOf(categoryId);
      if (index === -1) return order;

      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= order.length) return order;

      const copy = [...order];
      const [removed] = copy.splice(index, 1);
      copy.splice(nextIndex, 0, removed);
      return copy;
    });
  }

  toggleVisibility(categoryId: number | null): void {
    this.hiddenIds.update(previous => {
      const next = new Set(previous);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }

  resetPreferences(): void {
    this.orderedIds.set([]);
    this.hiddenIds.set(new Set());
    this.notificationsEnabled.set(false);
    this.includeAllTransactions.set(true);
    this.hideGroupedCategories.set(false);
  }

  handleSave(): void {
    const newPreferences: CategoryPreferences = {
      customOrder: this.ensureOrderContains(this.orderedIds()),
      hiddenCategoryIds: Array.from(this.hiddenIds()),
      notificationsEnabled: this.notificationsEnabled(),
      includeAllTransactions: this.includeAllTransactions(),
      hideGroupedCategories: this.hideGroupedCategories(),
    };

    this.preferencesChange.emit(newPreferences);
    this.dialogClose.emit();
  }

  handleClose(): void {
    this.dialogClose.emit();
  }

  async handleNotificationsChange(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    if (!target.checked) {
      this.notificationsEnabled.set(false);
      this.notificationError.set(null);
      return;
    }

    try {
      const result = await this.pushNotificationService.ensurePermission();
      if (result.granted) {
        this.notificationsEnabled.set(true);
        this.notificationError.set(null);
      } else {
        const notificationError = this.resolveNotificationError(
          result.denialReason
        );
        this.notificationsEnabled.set(false);
        target.checked = false;
        this.notificationError.set(notificationError);
        this.diagnostics.log(
          'warn',
          'push',
          'Push notification permission denied in settings',
          {
            denialReason: result.denialReason ?? 'unknown',
            userAgent: this.readUserAgent(),
            links: notificationError.links.map(link => link.url),
            notificationPermission:
              typeof Notification === 'undefined'
                ? 'unsupported'
                : Notification.permission,
          }
        );
      }
    } catch (error) {
      this.logger.error('Failed to enable push notifications', error);
      this.notificationsEnabled.set(false);
      this.notificationError.set({
        message: 'An unexpected error occurred. Please try again.',
        links: [],
      });
      target.checked = false;
    }
  }

  handleIncludeAllTransactionsChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.includeAllTransactions.set(target.checked);
  }

  handleHideGroupedCategoriesChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.hideGroupedCategories.set(target.checked);
  }

  toggleVisibleCategoriesSection(): void {
    this.visibleCategoriesExpanded.update(expanded => !expanded);
  }

  canMoveUp(index: number): boolean {
    return index > 0;
  }

  canMoveDown(index: number): boolean {
    return index < this.visibleCategories().length - 1;
  }

  async toggleDiagnostics(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    if (target.checked) {
      await this.diagnostics.enable();
    } else {
      await this.diagnostics.disable();
    }
  }

  async copySupportCode(): Promise<void> {
    const session = this.diagnostics.session();
    if (session) {
      try {
        await navigator.clipboard.writeText(session.supportCode);
        this.logger.info('Support code copied to clipboard');
      } catch (err) {
        this.logger.error('Failed to copy support code', err);
      }
    }
  }

  async flushLogs(): Promise<void> {
    await this.diagnostics.flush();
    this.logger.info('Logs sent successfully');
  }

  async disableAndDeleteLogs(): Promise<void> {
    if (
      confirm(
        'Are you sure you want to disable diagnostics and delete all server-side logs for this session?'
      )
    ) {
      await this.diagnostics.disable(true);
      this.logger.info('Diagnostics disabled and logs deleted');
    }
  }

  private resolveNotificationError(
    denialReason: PermissionDenialReason | undefined
  ): NotificationErrorDetails {
    if (denialReason === 'denied-by-browser') {
      return buildBlockedNotificationGuidance(this.readUserAgent());
    }

    if (denialReason === 'denied-by-user') {
      const guidance = buildBlockedNotificationGuidance(this.readUserAgent());
      return {
        message: DENIAL_MESSAGES['denied-by-user'],
        links: guidance.links,
      };
    }

    if (denialReason) {
      return {
        message: DENIAL_MESSAGES[denialReason],
        links: [],
      };
    }

    return {
      message: 'Notifications could not be enabled.',
      links: [],
    };
  }

  private readUserAgent(): string {
    if (typeof navigator === 'undefined') {
      return '';
    }

    return navigator.userAgent;
  }

  private lockBodyScroll(): void {
    if (this.isBodyScrollLocked) {
      return;
    }

    const body = this.document.body;

    const rawLockCount = Number.parseInt(
      body.getAttribute(this.bodyScrollLockCountAttribute) ?? '0',
      10
    );
    const lockCount =
      Number.isFinite(rawLockCount) && rawLockCount > 0 ? rawLockCount : 0;
    if (lockCount === 0) {
      body.setAttribute(this.bodyOverflowAttribute, body.style.overflow);
      body.setAttribute(this.bodyTouchActionAttribute, body.style.touchAction);
      body.style.overflow = 'hidden';
      body.style.touchAction = 'none';
    }

    body.setAttribute(this.bodyScrollLockCountAttribute, String(lockCount + 1));
    this.isBodyScrollLocked = true;
  }

  private unlockBodyScroll(): void {
    if (!this.isBodyScrollLocked) {
      return;
    }

    const body = this.document.body;

    const lockCount = Number.parseInt(
      body.getAttribute(this.bodyScrollLockCountAttribute) ?? '0',
      10
    );
    const nextCount =
      Number.isFinite(lockCount) && lockCount > 0 ? lockCount - 1 : 0;

    if (nextCount === 0) {
      const previousOverflow =
        body.getAttribute(this.bodyOverflowAttribute) ?? '';
      const previousTouchAction =
        body.getAttribute(this.bodyTouchActionAttribute) ?? '';

      body.style.overflow = previousOverflow;
      body.style.touchAction = previousTouchAction;
      body.removeAttribute(this.bodyScrollLockCountAttribute);
      body.removeAttribute(this.bodyOverflowAttribute);
      body.removeAttribute(this.bodyTouchActionAttribute);
    } else {
      body.setAttribute(this.bodyScrollLockCountAttribute, String(nextCount));
    }

    this.isBodyScrollLocked = false;
  }
}

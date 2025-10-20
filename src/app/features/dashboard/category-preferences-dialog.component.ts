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
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BudgetProgress } from '../../core/models/lunchmoney.types';
import { CategoryPreferences } from '../../shared/services/budget.service';
import { PushNotificationService } from '../../shared/services/push-notification.service';
import { LoggerService } from '../../core/services/logger.service';
import { VersionService } from '../../core/services/version.service';

@Component({
  selector: 'category-preferences-dialog',
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './category-preferences-dialog.component.html',
  styleUrls: ['./category-preferences-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryPreferencesDialogComponent implements OnInit {
  private readonly pushNotificationService = inject(PushNotificationService);
  private readonly logger = inject(LoggerService);
  private readonly versionService = inject(VersionService);

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
  readonly warnAtRatio = signal(0.85);
  readonly notificationsEnabled = signal(false);
  readonly includeAllTransactions = signal(true);

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

  readonly warnAtPercent = computed(() => Math.round(this.warnAtRatio() * 100));

  constructor() {
    // Handle dialog open/close based on input signal
    effect(() => {
      const dialog = this.dialogElement().nativeElement;

      if (this.open()) {
        if (!dialog.open) {
          dialog.showModal();
        }
      } else if (dialog.open) {
        dialog.close();
      }
    });
  }

  ngOnInit() {
    // Initialize local state from preferences
    const prefs = this.preferences();
    this.orderedIds.set([...prefs.customOrder]);
    this.hiddenIds.set(new Set(prefs.hiddenCategoryIds));
    this.warnAtRatio.set(prefs.warnAtRatio);
    this.notificationsEnabled.set(prefs.notificationsEnabled);
    this.includeAllTransactions.set(prefs.includeAllTransactions);
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
    this.warnAtRatio.set(0.85);
    this.notificationsEnabled.set(false);
    this.includeAllTransactions.set(true);
  }

  handleSave(): void {
    const newPreferences: CategoryPreferences = {
      customOrder: this.ensureOrderContains(this.orderedIds()),
      hiddenCategoryIds: Array.from(this.hiddenIds()),
      warnAtRatio: Math.min(0.95, Math.max(0.5, this.warnAtRatio())),
      notificationsEnabled: this.notificationsEnabled(),
      includeAllTransactions: this.includeAllTransactions(),
    };

    this.preferencesChange.emit(newPreferences);
    this.dialogClose.emit();
  }

  handleClose(): void {
    this.dialogClose.emit();
  }

  handleWarnRatioChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.warnAtRatio.set(Number.parseInt(target.value) / 100);
  }

  async handleNotificationsChange(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    if (!target.checked) {
      this.notificationsEnabled.set(false);
      return;
    }

    try {
      const granted = await this.pushNotificationService.ensurePermission();
      this.notificationsEnabled.set(granted);
      if (!granted) {
        target.checked = false;
      }
    } catch (error) {
      this.logger.error('Failed to enable push notifications', error);
      this.notificationsEnabled.set(false);
      target.checked = false;
    }
  }

  handleIncludeAllTransactionsChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.includeAllTransactions.set(target.checked);
  }

  canMoveUp(index: number): boolean {
    return index > 0;
  }

  canMoveDown(index: number): boolean {
    return index < this.visibleCategories().length - 1;
  }
}

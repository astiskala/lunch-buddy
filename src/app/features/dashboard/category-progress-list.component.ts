import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoryCardComponent } from './category-card.component';
import {
  BudgetProgress,
  RecurringInstance,
} from '../../core/models/lunchmoney.types';

@Component({
  selector: 'category-progress-list',
  imports: [CommonModule, CategoryCardComponent],
  template: `
    @if (items().length === 0) {
      <p class="empty-message">{{ emptyMessage() }}</p>
    } @else {
      <div class="category-list">
        @for (item of items(); track item.categoryId) {
          <category-card
            [item]="item"
            [defaultCurrency]="defaultCurrency()"
            [recurringExpenses]="
              recurringByCategory()?.get(item.categoryId) ?? []
            "
            [startDate]="startDate()"
            [endDate]="endDate()"
            [monthProgressRatio]="monthProgressRatio()"
            [referenceDate]="referenceDate()"
            [includeAllTransactions]="includeAllTransactions()"></category-card>
        }
      </div>
    }
  `,
  styleUrls: ['./category-progress-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryProgressListComponent {
  readonly items = input.required<BudgetProgress[]>();
  readonly defaultCurrency = input.required<string>();
  readonly recurringByCategory =
    input<Map<number | null, RecurringInstance[]>>();
  readonly emptyMessage = input<string>(
    'No categories available. Adjust your filters or configure your budgets in Lunch Money.'
  );
  readonly startDate = input.required<string>();
  readonly endDate = input.required<string>();
  readonly monthProgressRatio = input<number>(0);
  readonly referenceDate = input.required<Date>();
  readonly includeAllTransactions = input(true);
}

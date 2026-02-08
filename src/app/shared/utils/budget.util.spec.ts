import { describe, it, expect } from 'vitest';
import {
  calculateBudgetStatus,
  mergeSummaryWithCategories,
  pickOccurrence,
} from './budget.util';
import {
  LunchMoneyCategory,
  SummaryCategoryOccurrence,
  SummaryResponse,
} from '../../core/models/lunchmoney.types';

describe('Budget Utilities', () => {
  describe('calculateBudgetStatus', () => {
    it('should return on-track if budget is 0 or negative', () => {
      expect(calculateBudgetStatus(100, 0, 0.5, false)).toBe('on-track');
      expect(calculateBudgetStatus(100, -10, 0.5, false)).toBe('on-track');
    });

    it('should calculate status for expenses correctly', () => {
      // Budget: 100, Progress through month: 50%
      expect(calculateBudgetStatus(40, 100, 0.5, false)).toBe('on-track');
      expect(calculateBudgetStatus(60, 100, 0.5, false)).toBe('at-risk');
      expect(calculateBudgetStatus(110, 100, 0.5, false)).toBe('over');
    });

    it('should calculate status for income correctly', () => {
      // Budget: 1000, Progress through month: 50%
      // Income is "on-track" if we received >= expected for progress
      expect(calculateBudgetStatus(-600, 1000, 0.5, true)).toBe('on-track');
      expect(calculateBudgetStatus(-400, 1000, 0.5, true)).toBe('at-risk');
    });
  });

  describe('mergeSummaryWithCategories', () => {
    const mockCategories: LunchMoneyCategory[] = [
      {
        id: 1,
        name: 'Groceries',
        is_income: false,
        exclude_from_budget: false,
        exclude_from_totals: false,
        archived: false,
        updated_at: '',
        created_at: '',
        is_group: false,
        group_id: 10,
        description: null,
        archived_at: null,
        order: 1,
        collapsed: false,
      },
      {
        id: 10,
        name: 'Food',
        is_income: false,
        exclude_from_budget: false,
        exclude_from_totals: false,
        archived: false,
        updated_at: '',
        created_at: '',
        is_group: true,
        group_id: null,
        description: null,
        archived_at: null,
        order: 0,
        collapsed: false,
      },
    ];

    const mockSummary: SummaryResponse = {
      aligned: true,
      categories: [
        {
          category_id: 1,
          totals: {
            other_activity: 50,
            recurring_activity: 0,
            budgeted: 100,
            available: 50,
            recurring_remaining: 0,
            recurring_expected: 0,
          },
        },
      ],
    };

    it('should merge summary and category data', () => {
      const result = mergeSummaryWithCategories(mockSummary, mockCategories);

      expect(result.length).toBe(2);

      const groceries = result.find(i => i.category_id === 1);
      expect(groceries?.category_name).toBe('Groceries');
      expect(groceries?.category_group_name).toBe('Food');
      expect(groceries?.totals.other_activity).toBe(50);

      const foodGroup = result.find(i => i.category_id === 10);
      expect(foodGroup?.is_group).toBe(true);
      expect(foodGroup?.totals.other_activity).toBe(0); // Default empty totals
    });

    it('should handle null summary or categories', () => {
      expect(mergeSummaryWithCategories(null, [])).toEqual([]);
      expect(mergeSummaryWithCategories(undefined, null)).toEqual([]);
    });

    it('should include categories not present in summary', () => {
      const result = mergeSummaryWithCategories(
        { aligned: true, categories: [] },
        mockCategories
      );
      expect(result.length).toBe(2);
      expect(result.every(i => i.totals.other_activity === 0)).toBe(true);
    });
  });

  describe('pickOccurrence', () => {
    it('should pick current occurrence if available', () => {
      const occurrences: Partial<SummaryCategoryOccurrence>[] = [
        {
          current: false,
          start_date: '2025-01-01',
          end_date: '2025-01-31',
        },
        {
          current: true,
          start_date: '2025-02-01',
          end_date: '2025-02-28',
        },
      ];
      expect(
        pickOccurrence(occurrences as SummaryCategoryOccurrence[])?.start_date
      ).toBe('2025-02-01');
    });

    it('should pick first occurrence if no current', () => {
      const occurrences: Partial<SummaryCategoryOccurrence>[] = [
        {
          current: false,
          start_date: '2025-01-01',
          end_date: '2025-01-31',
        },
      ];
      expect(
        pickOccurrence(occurrences as SummaryCategoryOccurrence[])?.start_date
      ).toBe('2025-01-01');
    });

    it('should return undefined for empty or null input', () => {
      expect(pickOccurrence([])).toBeUndefined();
      expect(pickOccurrence()).toBeUndefined();
    });
  });
});

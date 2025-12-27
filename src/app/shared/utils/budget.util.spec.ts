import {
  BudgetProgress,
  BudgetSummaryItem,
} from '../../core/models/lunchmoney.types';
import { buildBudgetProgress, rankBudgetProgress } from './budget.util';

describe('Budget Utils', () => {
  describe('rankBudgetProgress', () => {
    const createItem = (categoryId: number, name: string): BudgetProgress => ({
      categoryId,
      categoryName: name,
      categoryGroupName: null,
      groupId: null,
      isGroup: false,
      isIncome: false,
      excludeFromBudget: false,
      budgetAmount: 1000,
      budgetCurrency: 'USD',
      spent: 500,
      remaining: 500,
      monthKey: '2025-10',
      numTransactions: 5,
      isAutomated: false,
      recurringTotal: 0,
      recurringItems: [],
      progressRatio: 0.5,
      status: 'on-track',
    });

    it('should preserve API order when no custom order provided', () => {
      const items = [
        createItem(1, 'A'),
        createItem(2, 'B'),
        createItem(3, 'C'),
      ];

      const ranked = rankBudgetProgress(items, []);

      expect(ranked).toEqual(items);
      expect(ranked[0].categoryId).toBe(1);
      expect(ranked[1].categoryId).toBe(2);
      expect(ranked[2].categoryId).toBe(3);
    });

    it('should apply custom order when provided', () => {
      const items = [
        createItem(1, 'A'),
        createItem(2, 'B'),
        createItem(3, 'C'),
      ];

      const ranked = rankBudgetProgress(items, [3, 1, 2]);

      expect(ranked[0].categoryId).toBe(3);
      expect(ranked[1].categoryId).toBe(1);
      expect(ranked[2].categoryId).toBe(2);
    });

    it('should handle items not in custom order', () => {
      const items = [
        createItem(1, 'A'),
        createItem(2, 'B'),
        createItem(3, 'C'),
      ];

      const ranked = rankBudgetProgress(items, [3]);

      expect(ranked[0].categoryId).toBe(3);
    });
  });
});

describe('buildBudgetProgress status evaluation', () => {
  const monthKey = '2025-10';
  const createSummary = ({
    spent,
    budget,
    isIncome = false,
    recurring = [],
  }: {
    spent: number;
    budget: number;
    isIncome?: boolean;
    recurring?: number[];
  }): BudgetSummaryItem => ({
    category_name: 'Test',
    category_id: 1,
    category_group_name: null,
    group_id: null,
    is_group: false,
    is_income: isIncome,
    exclude_from_budget: false,
    exclude_from_totals: false,
    order: 0,
    archived: false,
    totals: {
      other_activity: spent,
      recurring_activity: 0,
      budgeted: budget,
      available: null,
      recurring_remaining: 0,
      recurring_expected: recurring.reduce((total, value) => total + value, 0),
    },
    occurrence: {
      current: true,
      start_date: '2025-10-01',
      end_date: '2025-10-31',
      other_activity: 0,
      recurring_activity: 0,
      budgeted: budget,
      budgeted_amount: budget.toString(),
      budgeted_currency: 'USD',
      notes: null,
    },
  });

  it('treats equal spending and budget as on track', () => {
    const summary = createSummary({ spent: 1000, budget: 1000 });
    const result = buildBudgetProgress(summary, monthKey, 0.5);

    expect(result.status).toBe('on-track');
  });

  it('treats minor rounding differences as on track', () => {
    const summary = createSummary({ spent: 1005, budget: 1000 });
    const result = buildBudgetProgress(summary, monthKey, 0.5);

    expect(result.status).toBe('on-track');
  });

  it('marks meaningfully overspent categories as over', () => {
    const summary = createSummary({ spent: 1055, budget: 1000 });
    const result = buildBudgetProgress(summary, monthKey, 0.5);

    expect(result.status).toBe('over');
  });

  it('marks high spending versus progress as at risk', () => {
    const summary = createSummary({ spent: 650, budget: 1000 });
    const result = buildBudgetProgress(summary, monthKey, 0.4);

    expect(result.status).toBe('at-risk');
  });

  it('marks income categories on track when received meets the budget', () => {
    const summary = createSummary({
      spent: -1000,
      budget: 1000,
      isIncome: true,
    });
    const result = buildBudgetProgress(summary, monthKey, 0.5);

    expect(result.status).toBe('on-track');
    expect(result.progressRatio).toBe(1);
    expect(result.remaining).toBeCloseTo(0, 5);
  });

  it('marks income categories at risk when received is behind month progress', () => {
    const summary = createSummary({
      spent: -450,
      budget: 1000,
      isIncome: true,
    });
    const result = buildBudgetProgress(summary, monthKey, 0.5);

    expect(result.status).toBe('at-risk');
    expect(result.progressRatio).toBeCloseTo(0.45, 5);
    expect(result.remaining).toBeCloseTo(550, 5);
  });

  it('keeps income on track when received keeps pace with the month', () => {
    const summary = createSummary({
      spent: -600,
      budget: 1000,
      isIncome: true,
    });
    const result = buildBudgetProgress(summary, monthKey, 0.5);

    expect(result.status).toBe('on-track');
    expect(result.remaining).toBeCloseTo(400, 5);
  });

  it('marks income at risk when income lags the month progress', () => {
    const summary = createSummary({
      spent: -500,
      budget: 1000,
      isIncome: true,
    });
    const result = buildBudgetProgress(summary, monthKey, 0.6);

    expect(result.status).toBe('at-risk');
  });
});

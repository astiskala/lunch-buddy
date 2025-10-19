import { BudgetProgress, BudgetSummaryItem } from '../../core/models/lunchmoney.types';
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
      const items = [createItem(1, 'A'), createItem(2, 'B'), createItem(3, 'C')];

      const ranked = rankBudgetProgress(items, []);

      expect(ranked).toEqual(items);
      expect(ranked[0].categoryId).toBe(1);
      expect(ranked[1].categoryId).toBe(2);
      expect(ranked[2].categoryId).toBe(3);
    });

    it('should apply custom order when provided', () => {
      const items = [createItem(1, 'A'), createItem(2, 'B'), createItem(3, 'C')];

      const ranked = rankBudgetProgress(items, [3, 1, 2]);

      expect(ranked[0].categoryId).toBe(3);
      expect(ranked[1].categoryId).toBe(1);
      expect(ranked[2].categoryId).toBe(2);
    });

    it('should handle items not in custom order', () => {
      const items = [createItem(1, 'A'), createItem(2, 'B'), createItem(3, 'C')];

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
    data: {
      [monthKey]: {
        num_transactions: 0,
        spending_to_base: spent,
        budget_to_base: budget,
        budget_amount: budget,
        budget_currency: 'USD',
        is_automated: false,
      },
    },
    config: null,
    recurring: {
      data: recurring.map((amount, index) => ({
        payee: `Recurring ${index + 1}`,
        amount,
        currency: 'USD',
        to_base: amount,
      })),
    },
  });

  it('treats equal spending and budget as on track', () => {
    const summary = createSummary({ spent: 1000, budget: 1000 });
    const result = buildBudgetProgress(summary, monthKey, 0.5, 0.8);

    expect(result.status).toBe('on-track');
  });

  it('treats minor rounding differences as on track', () => {
    const summary = createSummary({ spent: 1005, budget: 1000 });
    const result = buildBudgetProgress(summary, monthKey, 0.5, 0.8);

    expect(result.status).toBe('on-track');
  });

  it('marks meaningfully overspent categories as over', () => {
    const summary = createSummary({ spent: 1055, budget: 1000 });
    const result = buildBudgetProgress(summary, monthKey, 0.5, 0.8);

    expect(result.status).toBe('over');
  });

  it('marks high spending versus progress as at risk', () => {
    const summary = createSummary({ spent: 650, budget: 1000 });
    const result = buildBudgetProgress(summary, monthKey, 0.4, 0.7);

    expect(result.status).toBe('at-risk');
  });

  it('marks income categories on track when received meets the budget', () => {
    const summary = createSummary({ spent: -1000, budget: 1000, isIncome: true });
    const result = buildBudgetProgress(summary, monthKey, 0.5, 0.8);

    expect(result.status).toBe('on-track');
    expect(result.progressRatio).toBe(1);
    expect(result.remaining).toBeCloseTo(0, 5);
  });

  it('marks income categories at risk when received is below the budget', () => {
    const summary = createSummary({ spent: -450, budget: 1000, isIncome: true });
    const result = buildBudgetProgress(summary, monthKey, 0.5, 0.8);

    expect(result.status).toBe('at-risk');
    expect(result.progressRatio).toBeCloseTo(0.45, 5);
    expect(result.remaining).toBeCloseTo(550, 5);
  });

  it('keeps income on track when upcoming payments close the shortfall', () => {
    const summary = createSummary({ spent: -200, budget: 1000, isIncome: true, recurring: [800] });
    const result = buildBudgetProgress(summary, monthKey, 0.5, 0.9);

    expect(result.status).toBe('on-track');
    expect(result.remaining).toBeCloseTo(800, 5);
  });

  it('marks income at risk when projected total stays below the threshold', () => {
    const summary = createSummary({ spent: -600, budget: 1000, isIncome: true, recurring: [120] });
    const result = buildBudgetProgress(summary, monthKey, 0.6, 0.9);

    expect(result.status).toBe('at-risk');
  });
});

import { BudgetProgress } from '../../core/models/lunchmoney.types';
import { rankBudgetProgress } from './budget.util';

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
      status: 'on-track'
    });

    it('should preserve API order when no custom order provided', () => {
      const items = [
        createItem(1, 'A'),
        createItem(2, 'B'),
        createItem(3, 'C')
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
        createItem(3, 'C')
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
        createItem(3, 'C')
      ];

      const ranked = rankBudgetProgress(items, [3]);

      expect(ranked[0].categoryId).toBe(3);
    });
  });
});

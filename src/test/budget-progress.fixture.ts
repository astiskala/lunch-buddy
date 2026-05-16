import { BudgetProgress } from '../app/core/models/lunchmoney.types';

export function buildBudgetProgress(
  overrides: Partial<BudgetProgress> = {}
): BudgetProgress {
  return {
    categoryId: 1,
    categoryName: 'Category',
    categoryGroupName: null,
    groupId: null,
    isGroup: false,
    isIncome: false,
    excludeFromBudget: false,
    budgetAmount: 100,
    budgetCurrency: 'USD',
    spent: 0,
    remaining: 100,
    monthKey: '2026-05',
    numTransactions: 0,
    isAutomated: false,
    recurringTotal: 0,
    recurringItems: [],
    status: 'on-track',
    progressRatio: 0,
    ...overrides,
  };
}

import { BudgetMonthData, BudgetSummaryItem, BudgetProgress, BudgetRecurringItem } from '../../core/models/lunchmoney.types';
import { decodeHtmlEntities } from './text.util';

const pickMonthData = (summary: BudgetSummaryItem, monthKey: string): BudgetMonthData | null =>
  summary.data[monthKey] ?? null;

const calculateStatus = (
  spent: number,
  budget: number,
  monthProgress: number,
  warnAtRatio: number,
): BudgetProgress['status'] => {
  if (budget <= 0) {
    return 'on-track';
  }

  const spendingRatio = spent / budget;

  if (spendingRatio >= 1) {
    return 'over';
  }

  if (spendingRatio >= warnAtRatio || spendingRatio >= monthProgress + 0.1) {
    return 'at-risk';
  }

  return 'on-track';
};

const parseBudgetAmount = (data: BudgetMonthData | null | undefined): number =>
  data?.budget_to_base ?? data?.budget_amount ?? 0;

const parseSpentAmount = (data: BudgetMonthData | null | undefined): number =>
  data?.spending_to_base ?? 0;

export const buildBudgetProgress = (
  summary: BudgetSummaryItem,
  monthKey: string,
  monthProgress: number,
  warnAtRatio: number,
): BudgetProgress => {
  const monthData = pickMonthData(summary, monthKey);
  const budgetAmount = parseBudgetAmount(monthData);
  const spent = parseSpentAmount(monthData);
  const remaining = budgetAmount - spent;
  const numTransactions = monthData?.num_transactions ?? 0;
  const isAutomated = Boolean(monthData?.is_automated);
  const recurringItems: BudgetRecurringItem[] = summary.recurring?.data ?? [];
  const recurringTotal = recurringItems.reduce((total, item) => {
    const amount = item.to_base ?? item.amount ?? 0;
    return total + amount;
  }, 0);
  const progressRatio =
    budgetAmount > 0 ? Math.min(1, Math.max(0, spent / budgetAmount)) : 0;
  const budgetCurrency =
    monthData?.budget_currency ?? summary.config?.currency ?? null;

  return {
    categoryId: summary.category_id,
    categoryName: decodeHtmlEntities(summary.category_name),
    categoryGroupName: decodeHtmlEntities(summary.category_group_name),
    groupId: summary.group_id,
    isGroup: Boolean(summary.is_group),
    isIncome: summary.is_income,
    excludeFromBudget: summary.exclude_from_budget,
    budgetAmount,
    budgetCurrency,
    spent,
    remaining,
    monthKey,
    numTransactions,
    isAutomated,
    recurringTotal,
    recurringItems,
    status: calculateStatus(spent, budgetAmount, monthProgress, warnAtRatio),
    progressRatio,
  };
};

export const rankBudgetProgress = (
  items: BudgetProgress[],
  customOrder: number[] = [],
): BudgetProgress[] => {
  // If no custom order is specified, preserve the original API order
  if (customOrder.length === 0) {
    return [...items];
  }

  const orderMap = new Map(customOrder.map((categoryId, index) => [categoryId, index]));

  return [...items].sort((a, b) => {
    const orderA = orderMap.get(a.categoryId);
    const orderB = orderMap.get(b.categoryId);

    if (orderA !== undefined && orderB !== undefined) {
      return orderA - orderB;
    }
    if (orderA !== undefined) {
      return -1;
    }
    if (orderB !== undefined) {
      return 1;
    }

    // For items not in custom order, maintain their relative position
    // (this shouldn't happen if customOrder is complete, but provides a fallback)
    return 0;
  });
};

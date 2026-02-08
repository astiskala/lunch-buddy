import {
  BudgetProgress,
  BudgetSummaryItem,
  LunchMoneyCategory,
  SummaryCategoryOccurrence,
  SummaryCategoryTotals,
  SummaryResponse,
} from '../../core/models/lunchmoney.types';
import { decodeHtmlEntities } from './text.util';

const emptyTotals = (): SummaryCategoryTotals => ({
  other_activity: 0,
  recurring_activity: 0,
  budgeted: null,
  available: null,
  recurring_remaining: 0,
  recurring_expected: 0,
});

export const pickOccurrence = (
  occurrences?: SummaryCategoryOccurrence[]
): SummaryCategoryOccurrence | undefined => {
  if (!occurrences || occurrences.length === 0) {
    return undefined;
  }
  return occurrences.find(item => item.current) ?? occurrences[0];
};

const resolveCategoryGroupName = (
  groupId: number | null,
  groupNameMap: Map<number, string>
): string | null =>
  groupId === null ? null : (groupNameMap.get(groupId) ?? null);

const buildSummaryItem = (item: {
  categoryId: number;
  categoryName: string;
  categoryGroupName: string | null;
  groupId: number | null;
  isGroup: boolean;
  isIncome: boolean;
  excludeFromBudget: boolean;
  excludeFromTotals: boolean;
  totals: SummaryCategoryTotals;
  occurrence?: SummaryCategoryOccurrence;
  order: number | null;
  archived: boolean;
}): BudgetSummaryItem => ({
  category_id: item.categoryId,
  category_name: item.categoryName,
  category_group_name: item.categoryGroupName,
  group_id: item.groupId,
  is_group: item.isGroup,
  is_income: item.isIncome,
  exclude_from_budget: item.excludeFromBudget,
  exclude_from_totals: item.excludeFromTotals,
  totals: item.totals,
  occurrence: item.occurrence,
  order: item.order,
  archived: item.archived,
});

export const mergeSummaryWithCategories = (
  summary: SummaryResponse | null | undefined,
  categories: LunchMoneyCategory[] | null | undefined
): BudgetSummaryItem[] => {
  const categoryMap = new Map<number, LunchMoneyCategory>();
  const groupNameMap = new Map<number, string>();

  for (const category of categories ?? []) {
    categoryMap.set(category.id, category);
    if (category.is_group) {
      groupNameMap.set(category.id, category.name);
    }
  }

  const seen = new Set<number>();
  const summaries = summary?.categories ?? [];
  const items: BudgetSummaryItem[] = summaries.map(entry => {
    const metadata = categoryMap.get(entry.category_id);
    seen.add(entry.category_id);

    const occurrence = pickOccurrence(entry.occurrences);
    const groupId = metadata?.group_id ?? null;
    const categoryGroupName = resolveCategoryGroupName(groupId, groupNameMap);

    return buildSummaryItem({
      categoryId: entry.category_id,
      categoryName: metadata?.name ?? 'Uncategorized',
      categoryGroupName,
      groupId,
      isGroup: metadata?.is_group ?? false,
      isIncome: metadata?.is_income ?? false,
      excludeFromBudget: metadata?.exclude_from_budget ?? false,
      excludeFromTotals: metadata?.exclude_from_totals ?? false,
      totals: entry.totals,
      occurrence,
      order: metadata?.order ?? null,
      archived: metadata?.archived ?? false,
    });
  });

  for (const category of categories ?? []) {
    if (seen.has(category.id)) {
      continue;
    }
    const groupId = category.group_id;
    const categoryGroupName = resolveCategoryGroupName(groupId, groupNameMap);

    items.push(
      buildSummaryItem({
        categoryId: category.id,
        categoryName: category.name,
        categoryGroupName,
        groupId,
        isGroup: category.is_group,
        isIncome: category.is_income,
        excludeFromBudget: category.exclude_from_budget,
        excludeFromTotals: category.exclude_from_totals,
        totals: emptyTotals(),
        order: category.order ?? null,
        archived: category.archived,
      })
    );
  }

  return items;
};

export const calculateBudgetStatus = (
  spent: number,
  budget: number,
  monthProgress: number,
  isIncome: boolean
): BudgetProgress['status'] => {
  if (budget <= 0) {
    return 'on-track';
  }

  const epsilon = 0.005;
  const normalizedProgress = Math.min(Math.max(monthProgress, 0), 1);

  if (isIncome) {
    const received = Math.max(0, Math.abs(spent));
    const receivedRatio = budget > 0 ? received / budget : 1;

    return receivedRatio + epsilon < normalizedProgress
      ? 'at-risk'
      : 'on-track';
  }

  const spendingRatio = spent / budget;

  if (spendingRatio > 1 + epsilon) {
    return 'over';
  }

  if (Math.abs(spendingRatio - 1) <= epsilon) {
    return 'on-track';
  }

  if (spendingRatio > normalizedProgress + epsilon) {
    return 'at-risk';
  }

  return 'on-track';
};

export const buildBudgetProgress = (
  summary: BudgetSummaryItem,
  monthKey: string,
  monthProgress: number
): BudgetProgress => {
  const totals = summary.totals;
  const occurrence = summary.occurrence;
  const budgetAmount = occurrence?.budgeted ?? totals.budgeted ?? 0;
  const spent = totals.other_activity + totals.recurring_activity;
  const recurringTotal = totals.recurring_expected;
  const actualValue = summary.is_income ? Math.abs(spent) : spent;
  const remaining = budgetAmount - actualValue;
  const numTransactions = occurrence?.num_transactions ?? 0;
  const isAutomated = occurrence?.is_automated ?? false;
  const progressRatio =
    budgetAmount > 0 ? Math.min(1, Math.max(0, actualValue / budgetAmount)) : 0;
  const budgetCurrency = occurrence?.budgeted_currency ?? null;

  return {
    categoryId: summary.category_id,
    categoryName: decodeHtmlEntities(summary.category_name),
    categoryGroupName: decodeHtmlEntities(summary.category_group_name),
    groupId: summary.group_id,
    isGroup: summary.is_group,
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
    recurringItems: [],
    status: calculateBudgetStatus(
      spent,
      budgetAmount,
      monthProgress,
      summary.is_income
    ),
    progressRatio,
  };
};

export const rankBudgetProgress = (
  items: BudgetProgress[],
  customOrder: (number | null)[] = []
): BudgetProgress[] => {
  // Preserve the original API order when no custom order is configured.
  if (customOrder.length === 0) {
    return [...items];
  }

  const orderMap = new Map(
    customOrder.map((categoryId, index) => [categoryId, index])
  );

  return [...items].sort((a, b) => {
    const orderA =
      a.categoryId === null ? undefined : orderMap.get(a.categoryId);
    const orderB =
      b.categoryId === null ? undefined : orderMap.get(b.categoryId);

    if (orderA !== undefined && orderB !== undefined) {
      return orderA - orderB;
    }
    if (orderA !== undefined) {
      return -1;
    }
    if (orderB !== undefined) {
      return 1;
    }

    // Keep relative order for items missing from customOrder as a safe fallback.
    return 0;
  });
};

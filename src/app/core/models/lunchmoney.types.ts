/**
 * Lunch Money API Types
 * Based on the official Lunch Money API documentation
 */

export interface LunchMoneyUser {
  user_id: number;
  user_name: string | null;
  user_email: string;
  api_key_label: string | null;
  account_id: number;
  default_currency: string;
}

export interface LunchMoneyCategory {
  id: number;
  name: string;
  description: string | null;
  is_income: boolean;
  exclude_from_budget: boolean;
  exclude_from_totals: boolean;
  archived: boolean | null;
  archived_on: string | null;
  updated_at: string | null;
  created_at: string | null;
  is_group: boolean;
  group_id: number | null;
  group_category_name?: string | null;
  order: number | null;
}

export interface BudgetMonthData {
  num_transactions: number;
  spending_to_base: number;
  budget_to_base: number | null;
  budget_amount: number | null;
  budget_currency: string | null;
  is_automated?: boolean | null;
}

export interface BudgetConfig {
  config_id: number;
  cadence: string;
  amount: number;
  currency: string;
  to_base: number;
  auto_suggest: 'budgeted' | 'fixed' | 'fixed-rollover' | 'spent';
}

export interface BudgetRecurringItem {
  payee: string;
  amount: number;
  currency: string;
  to_base: number;
}

export interface BudgetSummaryItem {
  category_name: string;
  category_id: number | null;
  category_group_name: string | null;
  group_id: number | null;
  is_group: boolean | null;
  is_income: boolean;
  exclude_from_budget: boolean;
  exclude_from_totals: boolean;
  order: number;
  archived: boolean;
  data: Record<string, BudgetMonthData>;
  config: BudgetConfig | null;
  recurring: {
    data: BudgetRecurringItem[];
  } | null;
}

export interface RecurringExpense {
  id: number;
  start_date: string | null;
  end_date: string | null;
  cadence: string;
  payee: string;
  amount: string;
  currency: string;
  description: string | null;
  billing_date: string;
  next_occurrence?: string | null;
  type: 'cleared' | 'suggested';
  original_name: string | null;
  source: 'manual' | 'transaction' | 'system' | null;
  plaid_account_id: number | null;
  asset_id: number | null;
  category_id: number | null;
  created_at: string;
}

export interface Transaction {
  id: number;
  date: string;
  amount: string;
  currency: string;
  payee: string | null;
  display_name?: string | null;
  category_id: number | null;
  category_name?: string | null;
  notes: string | null;
  recurring_id: number | null;
  recurring_payee: string | null;
  recurring_description: string | null;
  tags: Array<{
    id: number;
    name: string;
    description: string | null;
    archived: boolean;
  }>;
  is_group?: boolean;
  group_id?: number | null;
  to_base?: number | string | null;
}

export interface TransactionsResponse {
  transactions: Transaction[];
  has_more: boolean;
}

export interface RecurringInstance {
  expense: RecurringExpense;
  occurrenceDate: Date;
}

export type BudgetStatus = 'over' | 'at-risk' | 'on-track';

export interface BudgetProgress {
  categoryId: number | null;
  categoryName: string;
  categoryGroupName: string | null;
  groupId: number | null;
  isGroup: boolean;
  isIncome: boolean;
  excludeFromBudget: boolean;
  budgetAmount: number;
  budgetCurrency: string | null;
  spent: number;
  remaining: number;
  monthKey: string;
  numTransactions: number;
  isAutomated: boolean;
  recurringTotal: number;
  recurringItems: BudgetRecurringItem[];
  status: BudgetStatus;
  progressRatio: number;
  transactionList?: Transaction[];
}

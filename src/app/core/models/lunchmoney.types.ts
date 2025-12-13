/**
 * Lunch Money API Types
 * Based on the official Lunch Money API documentation
 */

export interface LunchMoneyUser {
  id: number;
  name: string | null;
  email: string;
  api_key_label: string | null;
  account_id: number;
  budget_name: string;
  primary_currency: string;
  debits_as_negative?: boolean;
}

export interface LunchMoneyCategory {
  id: number;
  name: string;
  description: string | null;
  is_income: boolean;
  exclude_from_budget: boolean;
  exclude_from_totals: boolean;
  archived: boolean;
  archived_at: string | null;
  updated_at: string;
  created_at: string;
  is_group: boolean;
  group_id: number | null;
  order: number | null;
  collapsed: boolean;
  children?: LunchMoneyChildCategory[];
}

export type LunchMoneyChildCategory = Omit<LunchMoneyCategory, 'children'>;

export interface SummaryCategoryTotals {
  other_activity: number;
  recurring_activity: number;
  budgeted?: number | null;
  available?: number | null;
  recurring_remaining: number;
  recurring_expected: number;
}

export interface SummaryCategoryOccurrence {
  current: boolean;
  start_date: string;
  end_date: string;
  other_activity: number;
  recurring_activity: number;
  budgeted: number | null;
  budgeted_amount: string | null;
  budgeted_currency: string | null;
  notes: string | null;
  num_transactions?: number;
  is_automated?: boolean;
}

export interface SummaryCategory {
  category_id: number;
  totals: SummaryCategoryTotals;
  occurrences?: SummaryCategoryOccurrence[];
}

export interface SummaryResponse {
  aligned: boolean;
  categories: SummaryCategory[];
}

export interface BudgetSummaryItem {
  category_id: number | null;
  category_name: string;
  category_group_name: string | null;
  group_id: number | null;
  is_group: boolean;
  is_income: boolean;
  exclude_from_budget: boolean;
  exclude_from_totals: boolean;
  totals: SummaryCategoryTotals;
  occurrence?: SummaryCategoryOccurrence;
  order: number | null;
  archived: boolean;
}

export interface BudgetRecurringItem {
  payee: string | null;
  amount: number | null;
  currency: string | null;
}

export interface RecurringExpense {
  id: number;
  start_date: string | null;
  end_date: string | null;
  cadence: string;
  status: 'reviewed' | 'suggested';
  payee: string;
  amount: string;
  currency: string;
  description: string | null;
  anchor_date: string | null;
  next_occurrence?: string | null;
  type: 'cleared' | 'suggested';
  category_id: number | null;
}

export interface RecurringItemResponse {
  id: number;
  description: string | null;
  status: 'suggested' | 'reviewed';
  transaction_criteria: {
    start_date: string | null;
    end_date: string | null;
    granularity: 'day' | 'week' | 'month' | 'year';
    quantity: number;
    anchor_date: string | null;
    payee: string | null;
    amount: string;
    to_base: number;
    currency: string;
    plaid_account_id: number | null;
    manual_account_id: number | null;
  };
  overrides?: {
    payee?: string | null;
    notes?: string | null;
    category_id?: number | null;
  };
  matches?: {
    expected_occurrence_dates?: string[];
  };
}

export interface Transaction {
  id: number;
  date: string;
  amount: string;
  currency: string;
  to_base: number | null;
  recurring_id: number | null;
  payee: string;
  category_id: number | null;
  plaid_account_id: number | null;
  manual_account_id: number | null;
  external_id: string | null;
  tag_ids: number[];
  notes: string | null;
  status: 'reviewed' | 'unreviewed' | 'delete_pending';
  is_pending: boolean;
  created_at: string;
  updated_at: string;
  is_parent: boolean;
  parent_id: number | null;
  is_group: boolean;
  group_id: number | null;
  children: Transaction[];
  plaid_metadata?: Record<string, unknown> | null;
  custom_metadata?: Record<string, unknown> | null;
  files: unknown[];
  source: string | null;
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

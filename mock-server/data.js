const currency = 'USD';

const user = {
  user_id: 101,
  user_name: 'Alex Martin',
  user_email: 'alex.martin@example.com',
  api_key_label: 'Mock Developer Key',
  account_id: 55501,
  default_currency: currency,
};

const categories = [
  {
    id: 201,
    name: 'Groceries',
    description: 'Supermarkets, farmers markets, and meal kits',
    is_income: false,
    exclude_from_budget: false,
    exclude_from_totals: false,
    archived: false,
    archived_on: null,
    updated_at: '2024-11-01T10:00:00Z',
    created_at: '2021-01-12T18:45:00Z',
    is_group: false,
    group_id: 9001,
    group_category_name: 'Household',
    order: 1,
  },
  {
    id: 202,
    name: 'Dining Out',
    description: 'Restaurants, coffee shops, and takeout',
    is_income: false,
    exclude_from_budget: false,
    exclude_from_totals: false,
    archived: false,
    archived_on: null,
    updated_at: '2024-11-01T10:00:00Z',
    created_at: '2021-08-04T14:20:00Z',
    is_group: false,
    group_id: 9001,
    group_category_name: 'Household',
    order: 2,
  },
  {
    id: 203,
    name: 'Utilities',
    description: 'Electric, water, internet, and gas bills',
    is_income: false,
    exclude_from_budget: false,
    exclude_from_totals: false,
    archived: false,
    archived_on: null,
    updated_at: '2024-11-01T10:00:00Z',
    created_at: '2020-05-10T13:00:00Z',
    is_group: false,
    group_id: 9002,
    group_category_name: 'Monthly Bills',
    order: 3,
  },
  {
    id: 204,
    name: 'Transportation',
    description: 'Fuel, rideshare, public transportation, parking',
    is_income: false,
    exclude_from_budget: false,
    exclude_from_totals: false,
    archived: false,
    archived_on: null,
    updated_at: '2024-11-01T10:00:00Z',
    created_at: '2021-04-21T12:30:00Z',
    is_group: false,
    group_id: 9003,
    group_category_name: 'Transportation',
    order: 4,
  },
  {
    id: 301,
    name: 'Paycheck',
    description: 'Primary salary deposits',
    is_income: true,
    exclude_from_budget: false,
    exclude_from_totals: false,
    archived: false,
    archived_on: null,
    updated_at: '2024-11-01T10:00:00Z',
    created_at: '2019-11-01T10:00:00Z',
    is_group: false,
    group_id: 9004,
    group_category_name: 'Income',
    order: 1,
  },
];

const categorySettings = {
  201: {
    monthlyBudget: 650,
    config: {
      config_id: 5101,
      cadence: 'monthly',
      amount: 650,
      currency,
      to_base: 650,
      auto_suggest: 'budgeted',
    },
    recurringSummary: [
      {
        payee: 'HelloFresh Meal Kit',
        amount: 94.99,
        currency,
        to_base: 94.99,
      },
    ],
    transactionTemplates: [
      {
        sequence: 1,
        day: 3,
        amount: -145.72,
        payee: 'Whole Foods Market',
        notes: 'Weekly groceries',
      },
      {
        sequence: 2,
        day: 6,
        amount: -94.99,
        payee: 'HelloFresh',
        notes: 'Meal kit delivery',
        recurringId: 7005,
        recurringPayee: 'HelloFresh',
        recurringDescription: 'Meal kit subscription',
      },
      {
        sequence: 3,
        day: 10,
        amount: -96.48,
        payee: "Trader Joe's",
        notes: 'Pantry restock',
      },
      {
        sequence: 4,
        day: 17,
        amount: -58.21,
        payee: 'Local Farmers Market',
        notes: 'Seasonal produce',
      },
      {
        sequence: 5,
        day: 24,
        amount: -132.9,
        payee: 'Costco Wholesale',
        notes: 'Bulk essentials',
      },
    ],
  },
  202: {
    monthlyBudget: 240,
    config: {
      config_id: 5201,
      cadence: 'monthly',
      amount: 240,
      currency,
      to_base: 240,
      auto_suggest: 'budgeted',
    },
    recurringSummary: [
      {
        payee: 'Midweek Lunch Meetup',
        amount: 40,
        currency,
        to_base: 40,
      },
    ],
    transactionTemplates: [
      {
        sequence: 1,
        day: 4,
        amount: -42.5,
        payee: 'Sushi House',
        notes: 'Team dinner',
      },
      {
        sequence: 2,
        day: 11,
        amount: -18.75,
        payee: 'Daily Grind Coffee',
        notes: 'Client catch-up',
      },
      {
        sequence: 3,
        day: 18,
        amount: -52.3,
        payee: 'Burger Joint',
        notes: 'Family night out',
      },
      {
        sequence: 4,
        day: 26,
        amount: -36.8,
        payee: 'Neighborhood Bistro',
        notes: 'Date night',
      },
    ],
  },
  203: {
    monthlyBudget: 285,
    config: {
      config_id: 5301,
      cadence: 'monthly',
      amount: 285,
      currency,
      to_base: 285,
      auto_suggest: 'fixed-rollover',
    },
    recurringSummary: [
      {
        payee: 'Evergreen Power & Light',
        amount: 112.4,
        currency,
        to_base: 112.4,
      },
      {
        payee: 'City Water & Sewer',
        amount: 58.75,
        currency,
        to_base: 58.75,
      },
    ],
    transactionTemplates: [
      {
        sequence: 1,
        day: 2,
        amount: -112.4,
        payee: 'Evergreen Power & Light',
        notes: 'Monthly electric bill',
        recurringId: 7001,
        recurringPayee: 'Evergreen Power & Light',
        recurringDescription: 'Electric service for the apartment',
      },
      {
        sequence: 2,
        day: 8,
        amount: -89.99,
        payee: 'Cascade Internet',
        notes: 'Fiber internet service',
        recurringId: 7002,
        recurringPayee: 'Cascade Internet',
        recurringDescription: 'Gigabit fiber internet',
      },
      {
        sequence: 3,
        day: 15,
        amount: -58.75,
        payee: 'City Water & Sewer',
        notes: 'Bimonthly water bill',
        recurringId: 7006,
        recurringPayee: 'City Water & Sewer',
        recurringDescription: 'Water and sewer service',
      },
    ],
  },
  204: {
    monthlyBudget: 210,
    config: {
      config_id: 5401,
      cadence: 'monthly',
      amount: 210,
      currency,
      to_base: 210,
      auto_suggest: 'fixed',
    },
    transactionTemplates: [
      {
        sequence: 1,
        day: 4,
        amount: -44.5,
        payee: 'Shell Fuel Station',
        notes: 'Fuel fill-up',
      },
      {
        sequence: 2,
        day: 11,
        amount: -18.25,
        payee: 'Metro Transit',
        notes: 'Commuter rail tickets',
      },
      {
        sequence: 3,
        day: 17,
        amount: -12.5,
        payee: 'City Bike Share',
        notes: 'Weekly pass',
        recurringId: 7003,
        recurringPayee: 'City Bike Share',
        recurringDescription: 'Unlimited MetroBike pass',
      },
      {
        sequence: 4,
        day: 25,
        amount: -22.4,
        payee: 'Lyft',
        notes: 'Weekend rideshare',
      },
    ],
  },
  301: {
    monthlyIncome: 7400,
    transactionTemplates: [
      {
        sequence: 1,
        day: 1,
        amount: 3700,
        payee: 'Acme Corp Payroll',
        notes: 'Bi-weekly salary deposit',
      },
      {
        sequence: 2,
        day: 15,
        amount: 3700,
        payee: 'Acme Corp Payroll',
        notes: 'Bi-weekly salary deposit',
      },
    ],
  },
};

const recurringExpenseTemplates = [
  {
    id: 7001,
    startDate: '2023-01-01',
    endDate: null,
    cadence: 'monthly',
    payee: 'Evergreen Power & Light',
    amount: 112.4,
    currency,
    description: 'Electric service for the apartment',
    billingDay: 14,
    type: 'cleared',
    originalName: 'Evergreen Power & Light',
    source: 'transaction',
    plaidAccountId: null,
    assetId: null,
    categoryId: 203,
    createdAt: '2022-12-15T10:25:00Z',
  },
  {
    id: 7002,
    startDate: '2022-06-01',
    endDate: null,
    cadence: 'monthly',
    payee: 'Cascade Internet',
    amount: 89.99,
    currency,
    description: 'Gigabit fiber internet',
    billingDay: 8,
    type: 'cleared',
    originalName: 'Cascade Internet',
    source: 'transaction',
    plaidAccountId: null,
    assetId: null,
    categoryId: 203,
    createdAt: '2022-05-12T16:32:00Z',
  },
  {
    id: 7003,
    startDate: '2024-03-01',
    endDate: null,
    cadence: 'weekly',
    payee: 'City Bike Share',
    amount: 12.5,
    currency,
    description: 'Unlimited MetroBike pass',
    billingDay: 11,
    type: 'suggested',
    originalName: 'City Bike Share',
    source: 'system',
    plaidAccountId: null,
    assetId: null,
    categoryId: 204,
    createdAt: '2024-02-20T09:12:00Z',
  },
  {
    id: 7004,
    startDate: '2021-09-01',
    endDate: null,
    cadence: 'monthly',
    payee: 'Downtown Lofts',
    amount: 1825,
    currency,
    description: 'Apartment rent',
    billingDay: 1,
    type: 'cleared',
    originalName: 'Downtown Lofts Rent',
    source: 'manual',
    plaidAccountId: null,
    assetId: null,
    categoryId: null,
    createdAt: '2021-08-15T12:00:00Z',
  },
  {
    id: 7005,
    startDate: '2023-02-01',
    endDate: null,
    cadence: 'weekly',
    payee: 'HelloFresh',
    amount: 94.99,
    currency,
    description: 'Meal kit subscription',
    billingDay: 6,
    type: 'cleared',
    originalName: 'HelloFresh',
    source: 'transaction',
    plaidAccountId: null,
    assetId: null,
    categoryId: 201,
    createdAt: '2023-01-20T12:00:00Z',
  },
  {
    id: 7006,
    startDate: '2022-02-01',
    endDate: null,
    cadence: 'monthly',
    payee: 'City Water & Sewer',
    amount: 58.75,
    currency,
    description: 'Water and sewer service',
    billingDay: 15,
    type: 'cleared',
    originalName: 'City Water & Sewer',
    source: 'transaction',
    plaidAccountId: null,
    assetId: null,
    categoryId: 203,
    createdAt: '2022-01-15T12:00:00Z',
  },
];

const categoriesById = new Map(categories.map((category) => [category.id, category]));

const toDate = (value) => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  parsed.setHours(0, 0, 0, 0);
  return parsed;
};

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

const endOfMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);

const daysInMonth = (date) => endOfMonth(date).getDate();

const monthKey = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  return `${year}-${month}-01`;
};

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const clampDayToMonth = (monthStart, day) => {
  const cappedDay = Math.min(day, daysInMonth(monthStart));
  const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), cappedDay);
  date.setHours(0, 0, 0, 0);
  return date;
};

const differenceInDays = (a, b) => {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((a.getTime() - b.getTime()) / millisecondsPerDay);
};

const computeMonthProgress = (monthStart, monthEnd, now) => {
  if (monthEnd.getTime() < now.getTime()) {
    return 1;
  }
  if (monthStart.getTime() > now.getTime()) {
    return 0;
  }
  const totalDays = daysInMonth(monthStart);
  const elapsed = Math.min(differenceInDays(now, monthStart) + 1, totalDays);
  return Math.max(0, Math.min(1, elapsed / totalDays));
};

const formatAmount = (value) => {
  const rounded = Math.round(value * 100) / 100;
  const normalized = Math.abs(rounded) < 0.005 ? 0 : rounded;
  return normalized.toFixed(2);
};

const createTransactionId = (categoryId, monthStart, sequence) => {
  const year = monthStart.getFullYear();
  const month = `${monthStart.getMonth() + 1}`.padStart(2, '0');
  const seq = `${sequence}`.padStart(2, '0');
  return Number(`${categoryId}${year}${month}${seq}`);
};

const scaleExpenseAmounts = (templates, target) => {
  if (!templates.length || target <= 0) {
    return [];
  }

  const baseTotal = templates.reduce((sum, template) => sum + Math.abs(template.amount), 0);
  if (baseTotal === 0) {
    return templates.map(() => 0);
  }

  const factor = target / baseTotal;
  const scaled = templates.map((template) => template.amount * factor);
  const rounded = scaled.map((value) => Math.round(value * 100) / 100);

  const total = rounded.reduce((sum, value) => sum + Math.abs(value), 0);
  const delta = Number((target - total).toFixed(2));

  if (Math.abs(delta) >= 0.01) {
    const lastIndex = rounded.length - 1;
    const sign = rounded[lastIndex] >= 0 ? 1 : -1;
    rounded[lastIndex] = Number((rounded[lastIndex] + delta * (sign >= 0 ? 1 : -1)).toFixed(2));
  }

  return rounded;
};

const buildTransaction = (template, amountValue, monthStart, category) => {
  const transactionDate = clampDayToMonth(monthStart, template.day);
  const amount = formatAmount(amountValue);
  return {
    id: createTransactionId(category.id, monthStart, template.sequence),
    date: formatDate(transactionDate),
    amount,
    currency,
    payee: template.payee,
    display_name: null,
    category_id: category.id,
    category_name: category.name,
    notes: template.notes ?? null,
    recurring_id: template.recurringId ?? null,
    recurring_payee: template.recurringPayee ?? null,
    recurring_description: template.recurringDescription ?? null,
    tags: [],
  };
};

const generateExpenseTransactions = (category, settings, monthStart, now) => {
  const monthEnd = endOfMonth(monthStart);
  const progress = computeMonthProgress(monthStart, monthEnd, now);

  if (progress <= 0) {
    return { transactions: [], total: 0 };
  }

  const totalDays = daysInMonth(monthStart);
  const limitDay = Math.max(1, Math.floor(progress * totalDays));
  const activeTemplates = settings.transactionTemplates
    .filter((template) => template.day <= limitDay)
    .sort((a, b) => a.sequence - b.sequence);

  if (!activeTemplates.length) {
    return { transactions: [], total: 0 };
  }

  const target = Number((settings.monthlyBudget * progress).toFixed(2));
  if (target <= 0) {
    return { transactions: [], total: 0 };
  }

  const scaledAmounts = scaleExpenseAmounts(activeTemplates, target);
  const transactions = activeTemplates.map((template, index) =>
    buildTransaction(template, scaledAmounts[index], monthStart, category),
  );

  const total = transactions.reduce((sum, txn) => sum + Math.abs(Number(txn.amount)), 0);
  return { transactions, total: Number(total.toFixed(2)) };
};

const generateIncomeTransactions = (category, settings, monthStart, now) => {
  const monthEnd = endOfMonth(monthStart);
  const progress = computeMonthProgress(monthStart, monthEnd, now);

  if (progress <= 0) {
    return { transactions: [], total: 0 };
  }

  const totalDays = daysInMonth(monthStart);
  const limitDay = Math.max(1, Math.floor(progress * totalDays));
  const activeTemplates = settings.transactionTemplates
    .filter((template) => template.day <= limitDay)
    .sort((a, b) => a.sequence - b.sequence);

  if (!activeTemplates.length) {
    return { transactions: [], total: 0 };
  }

  const transactions = activeTemplates.map((template) =>
    buildTransaction(template, template.amount, monthStart, category),
  );
  const total = transactions.reduce((sum, txn) => sum + Number(txn.amount), 0);
  return { transactions, total: Number(total.toFixed(2)) };
};

const generateMonthSnapshot = (category, monthStart, now) => {
  const settings = categorySettings[category.id];
  let transactions = [];
  let total = 0;

  if (settings) {
    if (category.is_income) {
      const generated = generateIncomeTransactions(category, settings, monthStart, now);
      transactions = generated.transactions;
      total = generated.total;
    } else {
      const generated = generateExpenseTransactions(category, settings, monthStart, now);
      transactions = generated.transactions;
      total = generated.total;
    }
  }

  const monthData = {
    num_transactions: transactions.length,
    spending_to_base: Number(total.toFixed(2)),
    budget_to_base: category.is_income ? 0 : settings?.monthlyBudget ?? 0,
    budget_amount: category.is_income ? 0 : settings?.monthlyBudget ?? 0,
    budget_currency: currency,
    is_automated: true,
  };

  return {
    monthKey: monthKey(monthStart),
    data: monthData,
    transactions,
  };
};

const enumerateMonths = (start, end) => {
  const months = [];
  let pointer = startOfMonth(start);
  const limit = endOfMonth(end);

  while (pointer.getTime() <= limit.getTime()) {
    months.push(new Date(pointer));
    pointer = new Date(pointer.getFullYear(), pointer.getMonth() + 1, 1);
  }

  return months;
};

const buildBudgetSummaries = ({ startDate, endDate }) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const rangeStart = toDate(startDate) ?? startOfMonth(now);
  const rangeEnd = toDate(endDate) ?? endOfMonth(rangeStart);
  const months = enumerateMonths(rangeStart, rangeEnd);

  return categories.map((category) => {
    const settings = categorySettings[category.id];
    const data = months.reduce((acc, monthStart) => {
      const snapshot = generateMonthSnapshot(category, monthStart, now);
      acc[snapshot.monthKey] = snapshot.data;
      return acc;
    }, {});

    const recurring =
      settings?.recurringSummary?.length > 0
        ? {
            data: settings.recurringSummary.map((item) => ({
              payee: item.payee,
              amount: item.amount,
              currency: item.currency,
              to_base: item.to_base ?? item.amount,
            })),
          }
        : null;

    return {
      category_name: category.name,
      category_id: category.id,
      category_group_name: category.group_category_name,
      group_id: category.group_id,
      is_group: category.is_group,
      is_income: category.is_income,
      exclude_from_budget: category.exclude_from_budget,
      exclude_from_totals: category.exclude_from_totals,
      order: category.order ?? 0,
      archived: category.archived ?? false,
      data,
      config: settings?.config ?? null,
      recurring,
    };
  });
};

const addMonths = (date, count) => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + count);
  return result;
};

const addDays = (date, count) => {
  const result = new Date(date);
  result.setDate(result.getDate() + count);
  return result;
};

const buildRecurringExpenses = ({ startDate }) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const monthStart = startOfMonth(toDate(startDate) ?? now);

  const expenses = recurringExpenseTemplates.map((template) => {
    const billingDate = clampDayToMonth(monthStart, template.billingDay ?? 1);

    const nextOccurrence =
      template.cadence === 'weekly'
        ? addDays(billingDate, 7)
        : addMonths(billingDate, 1);

    return {
      id: template.id,
      start_date: template.startDate,
      end_date: template.endDate,
      cadence: template.cadence,
      payee: template.payee,
      amount: formatAmount(template.amount),
      currency: template.currency ?? currency,
      description: template.description ?? null,
      billing_date: formatDate(billingDate),
      next_occurrence: formatDate(nextOccurrence),
      type: template.type ?? 'cleared',
      original_name: template.originalName ?? template.payee,
      source: template.source ?? null,
      plaid_account_id: template.plaidAccountId ?? null,
      asset_id: template.assetId ?? null,
      category_id: template.categoryId ?? null,
      created_at: template.createdAt ?? '2024-01-01T00:00:00Z',
    };
  });

  return expenses.sort((a, b) => (a.billing_date < b.billing_date ? -1 : 1));
};

const buildTransactions = ({ categoryId, startDate, endDate }) => {
  const category = categoriesById.get(categoryId);
  if (!category) {
    return [];
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const rangeStart = toDate(startDate) ?? startOfMonth(now);
  const rangeEnd = toDate(endDate) ?? endOfMonth(rangeStart);
  const months = enumerateMonths(rangeStart, rangeEnd);

  const transactions = [];

  for (const monthStart of months) {
    const snapshot = generateMonthSnapshot(category, monthStart, now);
    for (const transaction of snapshot.transactions) {
      const transactionDate = toDate(transaction.date);
      if (!transactionDate) {
        continue;
      }
      if (transactionDate.getTime() < rangeStart.getTime()) {
        continue;
      }
      if (transactionDate.getTime() > rangeEnd.getTime()) {
        continue;
      }
      transactions.push(transaction);
    }
  }

  return transactions.sort((a, b) => {
    if (a.date === b.date) {
      return a.id - b.id;
    }
    return a.date < b.date ? -1 : 1;
  });
};

module.exports = {
  user,
  categories,
  buildBudgetSummaries,
  buildRecurringExpenses,
  buildTransactions,
};

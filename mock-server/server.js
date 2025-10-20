const express = require('express');
const cors = require('cors');
const {
  user,
  categories,
  buildBudgetSummaries,
  buildRecurringExpenses,
  buildTransactions,
} = require('./data');

const DEFAULT_PORT = Number(process.env.MOCK_API_PORT) || 4600;
const API_PREFIX = '/v1';

const app = express();

// Configure CORS to only allow requests from localhost (where the dev server runs)
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests) in development
    if (!origin) {
      return callback(null, true);
    }
    
    // Allow only localhost origins on various ports (common dev server ports)
    const allowedOrigins = [
      'http://localhost:4200',  // Default Angular dev server
      'http://127.0.0.1:4200'
    ];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    }
  },
};

app.use(cors(corsOptions));
app.use(express.json());
app.set('json spaces', 2);

app.use((req, _res, next) => {
  const now = new Date().toISOString();
  console.info(`[Mock Lunch Money] ${now} ${req.method} ${req.originalUrl}`);
  next();
});

app.get('/health', (_req, res) => {
  res.json({
    name: 'Lunch Money Mock API',
    status: 'ok',
    endpoints: [
      `${API_PREFIX}/me`,
      `${API_PREFIX}/categories`,
      `${API_PREFIX}/budgets`,
      `${API_PREFIX}/recurring_expenses`,
      `${API_PREFIX}/transactions`,
    ],
  });
});

app.get(`${API_PREFIX}/me`, (_req, res) => {
  res.json({ ...user });
});

app.get(`${API_PREFIX}/categories`, (_req, res) => {
  res.json({ categories: categories.map((category) => ({ ...category })) });
});

app.get(`${API_PREFIX}/budgets`, (req, res) => {
  const { start_date: startDate, end_date: endDate } = req.query;
  const summaries = buildBudgetSummaries({ startDate, endDate });

  res.json(summaries);
});

app.get(`${API_PREFIX}/recurring_expenses`, (req, res) => {
  const { start_date: startDate } = req.query;
  const recurringExpenses = buildRecurringExpenses({ startDate });
  res.json({ recurring_expenses: recurringExpenses });
});

app.get(`${API_PREFIX}/transactions`, (req, res) => {
  const { category_id: categoryIdParam, start_date: startDate, end_date: endDate } = req.query;
  const categoryId = Number(categoryIdParam);

  if (!categoryIdParam || Number.isNaN(categoryId)) {
    return res.status(400).json({
      error: 'Missing or invalid category_id query parameter',
    });
  }

  const transactions = buildTransactions({ categoryId, startDate, endDate });

  res.json({
    transactions,
    has_more: false,
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: `No mock handler for ${req.method} ${req.originalUrl}`,
  });
});

if (require.main === module) {
  app.listen(DEFAULT_PORT, () => {
    console.info(
      `Mock Lunch Money API listening on http://localhost:${DEFAULT_PORT}${API_PREFIX}`,
    );
  });
}

module.exports = { app };

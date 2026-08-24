import crypto from 'crypto';
import { getItem, putItem, deleteItem, queryItems, scanItems } from './dynamoHelper';
import { ExpenseModel } from '../types/models';

/**
 * Create Expense
 */
export const createExpense = async (data: Partial<ExpenseModel>): Promise<ExpenseModel> => {
  const id = data.id || crypto.randomUUID();
  const now = new Date().toISOString();
  const expenseDate = data.expenseDate || now;
  const category = (data.category || 'General').trim();

  const newExpense: ExpenseModel & Record<string, any> = {
    PK: `EXPENSE#${id}`,
    SK: 'METADATA',
    GSI1PK: 'EXPENSES',
    GSI1SK: `${expenseDate}#${id}`,
    GSI2PK: `EXPENSE_CATEGORY#${category}`,
    GSI2SK: `${expenseDate}#${id}`,
    id,
    _id: id,
    expenseDate,
    category,
    expenseName: (data.expenseName || '').trim(),
    amount: Number(data.amount) || 0,
    vendor: data.vendor ? data.vendor.trim() : '',
    createdBy: data.createdBy,
    createdAt: now,
    updatedAt: now,
  };

  return putItem<ExpenseModel>(newExpense);
};

/**
 * Find Expense by ID
 */
export const findExpenseById = async (id: string): Promise<ExpenseModel | null> => {
  return getItem<ExpenseModel>(`EXPENSE#${id}`, 'METADATA');
};

/**
 * Find all expenses
 */
export const findAllExpenses = async (): Promise<ExpenseModel[]> => {
  const expenses = await queryItems<ExpenseModel>({
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :gsi1pk',
    ExpressionAttributeValues: {
      ':gsi1pk': 'EXPENSES',
    },
    ScanIndexForward: false, // Descending by expenseDate
  });

  if (expenses.length > 0) return expenses;

  return scanItems<ExpenseModel>({
    FilterExpression: 'begins_with(PK, :prefix) AND SK = :sk',
    ExpressionAttributeValues: {
      ':prefix': 'EXPENSE#',
      ':sk': 'METADATA',
    },
  });
};

/**
 * Update Expense
 */
export const updateExpense = async (id: string, updates: Partial<ExpenseModel>): Promise<ExpenseModel | null> => {
  const existing = await findExpenseById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const expenseDate = updates.expenseDate !== undefined ? updates.expenseDate : existing.expenseDate;
  const category = updates.category !== undefined ? updates.category.trim() : existing.category;

  const updated: ExpenseModel & Record<string, any> = {
    ...existing,
    PK: `EXPENSE#${id}`,
    SK: 'METADATA',
    GSI1PK: 'EXPENSES',
    GSI1SK: `${expenseDate}#${id}`,
    GSI2PK: `EXPENSE_CATEGORY#${category}`,
    GSI2SK: `${expenseDate}#${id}`,
    expenseDate,
    category,
    expenseName: updates.expenseName !== undefined ? updates.expenseName.trim() : existing.expenseName,
    amount: updates.amount !== undefined ? Number(updates.amount) : existing.amount,
    vendor: updates.vendor !== undefined ? updates.vendor.trim() : existing.vendor,
    updatedAt: now,
  };

  return putItem<ExpenseModel>(updated);
};

/**
 * Delete Expense
 */
export const deleteExpense = async (id: string): Promise<void> => {
  await deleteItem(`EXPENSE#${id}`, 'METADATA');
};

/**
 * Find Expenses with pagination and filtering
 */
export const findExpensesPaginated = async (params: {
  page: number;
  limit: number;
  category?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}): Promise<{ total: number; page: number; pages: number; expenses: ExpenseModel[] }> => {
  const { page, limit, category, search, startDate, endDate } = params;

  let allExpenses = await findAllExpenses();

  if (category) {
    allExpenses = allExpenses.filter((e) => e.category && e.category.toLowerCase() === category.toLowerCase());
  }

  if (search && search.trim()) {
    const s = search.trim().toLowerCase();
    allExpenses = allExpenses.filter(
      (e) =>
        (e.expenseName && e.expenseName.toLowerCase().includes(s)) ||
        (e.vendor && e.vendor.toLowerCase().includes(s))
    );
  }

  if (startDate || endDate) {
    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date(8640000000000000);
    if (endDate) end.setHours(23, 59, 59, 999);

    allExpenses = allExpenses.filter((e) => {
      const d = new Date(e.expenseDate);
      return d >= start && d <= end;
    });
  }

  // Sort descending by expenseDate
  allExpenses.sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime());

  const total = allExpenses.length;
  const skip = (page - 1) * limit;
  const paginated = allExpenses.slice(skip, skip + limit);

  return {
    total,
    page,
    pages: Math.ceil(total / limit) || 1,
    expenses: paginated,
  };
};

/**
 * Calculate Dashboard Summary Metrics for Expenses
 */
export const getExpenseDashboardMetrics = async (): Promise<any> => {
  const allExpenses = await findAllExpenses();

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLast3Months = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const startOfLast6Months = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  let todayTotal = 0;
  let monthTotal = 0;
  let last3MonthsTotal = 0;
  let last6MonthsTotal = 0;
  let thisYearTotal = 0;
  let grandTotal = 0;

  const monthlyTotals: Record<number, number> = {};
  const categoryTotalsMonth: Record<string, number> = {};

  allExpenses.forEach((exp) => {
    const d = new Date(exp.expenseDate);
    const amt = Number(exp.amount) || 0;

    grandTotal += amt;

    if (d >= startOfToday) todayTotal += amt;
    if (d >= startOfMonth) {
      monthTotal += amt;
      const cat = exp.category || 'General';
      categoryTotalsMonth[cat] = (categoryTotalsMonth[cat] || 0) + amt;
    }
    if (d >= startOfLast3Months) last3MonthsTotal += amt;
    if (d >= startOfLast6Months) last6MonthsTotal += amt;
    if (d >= startOfYear) {
      thisYearTotal += amt;
      const monthIdx = d.getMonth();
      monthlyTotals[monthIdx] = (monthlyTotals[monthIdx] || 0) + amt;
    }
  });

  // Recent 5 transactions
  allExpenses.sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime());
  const recentTransactions = allExpenses.slice(0, 5);

  // Format monthly graph
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const formattedMonthlyGraph: { name: string; total: number }[] = [];
  const currentMonth = now.getMonth();
  for (let i = 0; i <= currentMonth; i++) {
    formattedMonthlyGraph.push({ name: monthNames[i], total: monthlyTotals[i] || 0 });
  }

  // Format category pie (top 5 by amount)
  const formattedCategoryPie = Object.entries(categoryTotalsMonth)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return {
    summary: {
      today: todayTotal,
      thisMonth: monthTotal,
      last3Months: last3MonthsTotal,
      last6Months: last6MonthsTotal,
      thisYear: thisYearTotal,
      total: grandTotal,
      count: allExpenses.length,
    },
    recentTransactions,
    monthlyGraph: formattedMonthlyGraph,
    categoryPie: formattedCategoryPie,
  };
};

/**
 * Calculate Detailed Report Metrics for Expenses
 */
export const getExpenseDetailedReportMetrics = async (params: {
  range?: string;
  startDate?: string;
  endDate?: string;
}): Promise<any> => {
  const { range, startDate, endDate } = params;
  let allExpenses = await findAllExpenses();

  const now = new Date();
  let filterStart = new Date(now.getFullYear(), now.getMonth(), 1);
  let filterEnd = new Date();

  if (range === 'monthly') {
    filterStart = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (range === '3months') {
    filterStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  } else if (range === '6months') {
    filterStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  } else if (range === 'yearly') {
    filterStart = new Date(now.getFullYear(), 0, 1);
  } else if (range === 'custom' && startDate && endDate) {
    filterStart = new Date(startDate);
    filterEnd = new Date(endDate);
    filterEnd.setHours(23, 59, 59, 999);
  }

  const filtered = allExpenses.filter((e) => {
    const d = new Date(e.expenseDate);
    return d >= filterStart && d <= filterEnd;
  });

  filtered.sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime());

  let total = 0;
  const categoryMap: Record<string, { total: number; count: number }> = {};
  let highest: ExpenseModel | null = null;
  let lowest: ExpenseModel | null = null;

  filtered.forEach((e) => {
    const amt = Number(e.amount) || 0;
    total += amt;

    const cat = e.category || 'General';
    if (!categoryMap[cat]) categoryMap[cat] = { total: 0, count: 0 };
    categoryMap[cat].total += amt;
    categoryMap[cat].count += 1;

    if (!highest || amt > highest.amount) highest = e;
    if (!lowest || amt < lowest.amount) lowest = e;
  });

  const count = filtered.length;
  const average = count > 0 ? Number((total / count).toFixed(2)) : 0;

  const categories = Object.entries(categoryMap)
    .map(([name, val]) => ({
      _id: name,
      total: val.total,
      count: val.count,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    total,
    average,
    count,
    highest,
    lowest,
    categories,
    expenses: filtered,
  };
};

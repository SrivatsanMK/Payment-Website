import { Request, Response, NextFunction } from 'express';
import {
  createExpense as repoCreateExpense,
  findExpenseById,
  findExpensesPaginated,
  updateExpense as repoUpdateExpense,
  deleteExpense as repoDeleteExpense,
  getExpenseDashboardMetrics,
  getExpenseDetailedReportMetrics,
} from '../repositories/expenseRepository';

export interface AuthRequest extends Request {
  user?: any;
}

/**
 * @desc    Create new expense
 * @route   POST /api/expenses
 * @access  Private/Admin
 */
export const createExpense = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      expenseDate,
      category,
      expenseName,
      amount,
      vendor
    } = req.body;

    const expense = await repoCreateExpense({
      expenseDate,
      category,
      expenseName,
      amount: Number(amount) || 0,
      vendor,
      createdBy: req.user?.id
    });

    req.app.get('io')?.emit('DATA_UPDATED');
    res.status(200).json({
      success: true,
      expense
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all expenses (with filtering and pagination)
 * @route   GET /api/expenses
 * @access  Private/Admin
 */
export const getExpenses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const category = req.query.category as string;
    const search = req.query.search as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const result = await findExpensesPaginated({
      page,
      limit,
      category,
      search,
      startDate,
      endDate,
    });

    res.status(200).json({
      success: true,
      count: result.expenses.length,
      total: result.total,
      page: result.page,
      pages: result.pages,
      expenses: result.expenses
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single expense by ID
 * @route   GET /api/expenses/:id
 * @access  Private/Admin
 */
export const getExpenseById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const expense = await findExpenseById(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }
    res.status(200).json({
      success: true,
      expense
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update expense
 * @route   PUT /api/expenses/:id
 * @access  Private/Admin
 */
export const updateExpense = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const expense = await findExpenseById(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    const updated = await repoUpdateExpense(req.params.id, req.body);

    req.app.get('io')?.emit('DATA_UPDATED');
    res.status(200).json({
      success: true,
      expense: updated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete expense
 * @route   DELETE /api/expenses/:id
 * @access  Private/Admin
 */
export const deleteExpense = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const expense = await findExpenseById(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    await repoDeleteExpense(req.params.id);
    req.app.get('io')?.emit('DATA_UPDATED');
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Dashboard Summary
 * @route   GET /api/expenses/summary/dashboard
 * @access  Private/Admin
 */
export const getDashboardSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getExpenseDashboardMetrics();
    res.status(200).json({
      success: true,
      summary: data.summary,
      recentTransactions: data.recentTransactions,
      monthlyGraph: data.monthlyGraph,
      categoryPie: data.categoryPie
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Detailed Report
 * @route   GET /api/expenses/reports/detailed
 * @access  Private/Admin
 */
export const getDetailedReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { range, startDate, endDate } = req.query;
    const data = await getExpenseDetailedReportMetrics({
      range: range as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

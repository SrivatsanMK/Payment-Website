import { Request, Response, NextFunction } from 'express';
import Expense from '../models/Expense';

export interface AuthRequest extends Request {
  user?: any; // Assumes auth middleware populates req.user
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

    const expense = await Expense.create({
      expenseDate,
      category,
      expenseName,
      amount,
      vendor,
      createdBy: req.user.id
    });

    req.app.get('io').emit('DATA_UPDATED');
    res.status(200).json({
      success: true, expense });
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
    const startIndex = (page - 1) * limit;

    const query: any = {};

    // Filters
    if (req.query.category) query.category = req.query.category;
    if (req.query.search) {
      query.$or = [
        { expenseName: { $regex: req.query.search, $options: 'i' } },
        { vendor: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    // Date Range filtering
    if (req.query.startDate || req.query.endDate) {
      query.expenseDate = {};
      if (req.query.startDate) query.expenseDate.$gte = new Date(req.query.startDate as string);
      if (req.query.endDate) query.expenseDate.$lte = new Date(req.query.endDate as string);
    }

    const total = await Expense.countDocuments(query);
    const expenses = await Expense.find(query)
      .sort({ expenseDate: -1 })
      .skip(startIndex)
      .limit(limit)
      .populate('createdBy', 'name email');

    res.status(200).json({
      success: true,
      count: expenses.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      expenses
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
    const expense = await Expense.findById(req.params.id).populate('createdBy', 'name email');
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }
    res.status(200).json({
      success: true, expense });
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
    let expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    const updateData = { ...req.body };

    expense = await Expense.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });

    req.app.get('io').emit('DATA_UPDATED');
    res.status(200).json({
      success: true, expense });
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
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    await expense.deleteOne();
    req.app.get('io').emit('DATA_UPDATED');
    res.status(200).json({
      success: true, data: {} });
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
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLast3Months = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const startOfLast6Months = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      todayResult,
      monthResult,
      last3MonthsResult,
      last6MonthsResult,
      yearResult,
      totalResult,
      recentTransactions,
      monthlyGraphData,
      categoryPieData
    ] = await Promise.all([
      Expense.aggregate([{ $match: { expenseDate: { $gte: startOfToday } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Expense.aggregate([{ $match: { expenseDate: { $gte: startOfMonth } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Expense.aggregate([{ $match: { expenseDate: { $gte: startOfLast3Months } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Expense.aggregate([{ $match: { expenseDate: { $gte: startOfLast6Months } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Expense.aggregate([{ $match: { expenseDate: { $gte: startOfYear } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Expense.aggregate([{ $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
      Expense.find().sort({ expenseDate: -1 }).limit(5),
      Expense.aggregate([
        { $match: { expenseDate: { $gte: startOfYear } } },
        { 
          $group: { 
            _id: { month: { $month: "$expenseDate" }, year: { $year: "$expenseDate" } },
            total: { $sum: "$amount" }
          }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
      ]),
      Expense.aggregate([
        { $match: { expenseDate: { $gte: startOfMonth } } },
        { $group: { _id: "$category", total: { $sum: "$amount" } } },
        { $sort: { total: -1 } },
        { $limit: 5 }
      ])
    ]);

    const summary = {
      today: todayResult[0]?.total || 0,
      thisMonth: monthResult[0]?.total || 0,
      last3Months: last3MonthsResult[0]?.total || 0,
      last6Months: last6MonthsResult[0]?.total || 0,
      thisYear: yearResult[0]?.total || 0,
      total: totalResult[0]?.total || 0,
      count: totalResult[0]?.count || 0
    };

    // Format graph data
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    const formattedMonthlyGraph: { name: string; total: number }[] = [];
    const currentMonth = now.getMonth();
    for (let i = 0; i <= currentMonth; i++) {
      formattedMonthlyGraph.push({ name: monthNames[i], total: 0 });
    }

    monthlyGraphData.forEach(item => {
      const idx = item._id.month - 1;
      if (idx >= 0 && idx <= currentMonth) {
        formattedMonthlyGraph[idx].total = item.total;
      }
    });

    const formattedCategoryPie = categoryPieData.map(item => ({
      name: item._id,
      value: item.total
    }));

    res.status(200).json({
      success: true,
      summary,
      recentTransactions,
      monthlyGraph: formattedMonthlyGraph,
      categoryPie: formattedCategoryPie
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
    
    let matchQuery: any = {};
    const now = new Date();
    
    if (range === 'monthly') {
      matchQuery.expenseDate = { $gte: new Date(now.getFullYear(), now.getMonth(), 1) };
    } else if (range === '3months') {
      matchQuery.expenseDate = { $gte: new Date(now.getFullYear(), now.getMonth() - 2, 1) };
    } else if (range === '6months') {
      matchQuery.expenseDate = { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) };
    } else if (range === 'yearly') {
      matchQuery.expenseDate = { $gte: new Date(now.getFullYear(), 0, 1) };
    } else if (range === 'custom' && startDate && endDate) {
      matchQuery.expenseDate = { 
        $gte: new Date(startDate as string), 
        $lte: new Date(endDate as string) 
      };
    }

    const [totalAgg, categoryAgg, highestExpense, lowestExpense, allExpenses] = await Promise.all([
      Expense.aggregate([
        { $match: matchQuery },
        { $group: { _id: null, total: { $sum: '$amount' }, avg: { $avg: '$amount' }, count: { $sum: 1 } } }
      ]),
      Expense.aggregate([
        { $match: matchQuery },
        { $group: { _id: "$category", total: { $sum: "$amount" }, count: { $sum: 1 } } },
        { $sort: { total: -1 } }
      ]),
      Expense.find(matchQuery).sort({ amount: -1 }).limit(1),
      Expense.find(matchQuery).sort({ amount: 1 }).limit(1),
      Expense.find(matchQuery).sort({ expenseDate: -1 })
    ]);

    res.status(200).json({
      success: true,
      data: {
        total: totalAgg[0]?.total || 0,
        average: totalAgg[0]?.avg || 0,
        count: totalAgg[0]?.count || 0,
        highest: highestExpense[0] || null,
        lowest: lowestExpense[0] || null,
        categories: categoryAgg,
        expenses: allExpenses
      }
    });
  } catch (error) {
    next(error);
  }
};

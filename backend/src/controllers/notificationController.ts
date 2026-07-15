import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import Notification from '../models/Notification';

/**
 * Get Customer Notifications (Customer Only)
 */
export const getCustomerNotifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const role = req.user?.role;
    if (role && ['ADMIN_1', 'ADMIN_2'].includes(role)) {
      const notifications = await Notification.find()
        .populate('customer', 'name customerId')
        .sort({ createdAt: -1 })
        .limit(30);

      const unreadCount = await Notification.countDocuments({ isRead: false });

      return res.status(200).json({
        success: true,
        unreadCount,
        notifications
      });
    }

    const notifications = await Notification.find({ customer: req.user?.id })
      .sort({ createdAt: -1 })
      .limit(30);

    const unreadCount = await Notification.countDocuments({ customer: req.user?.id, isRead: false });

    res.status(200).json({
      success: true,
      unreadCount,
      notifications
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark All Customer Notifications as Read (Customer Only)
 */
export const markNotificationsAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await Notification.updateMany(
      { customer: req.user?.id, isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    next(error);
  }
};

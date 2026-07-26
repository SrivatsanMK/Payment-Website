import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import Notification from '../models/Notification';

/**
 * Get Notifications (Admin sees all, Customer sees their own)
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
 * Mark All Notifications as Read (Admin updates all, Customer updates their own)
 */
export const markNotificationsAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const role = req.user?.role;
    if (role && ['ADMIN_1', 'ADMIN_2'].includes(role)) {
      await Notification.updateMany(
        { isRead: false },
        { $set: { isRead: true } }
      );
      return res.status(200).json({
        success: true,
        message: 'All admin notifications marked as read'
      });
    }

    await Notification.updateMany(
      { customer: req.user?.id, isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({
      success: true,
      message: 'All customer notifications marked as read'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark Single Notification as Read
 */
export const markSingleNotificationAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await Notification.findByIdAndUpdate(id, { $set: { isRead: true } });
    res.status(200).json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    next(error);
  }
};

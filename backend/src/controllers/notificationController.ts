import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import {
  getAdminNotifications as repoGetAdminNotifications,
  getCustomerNotifications as repoGetCustomerNotifications,
  markAllAdminAsRead,
  markAllCustomerAsRead,
  markSingleNotificationAsRead as repoMarkSingleNotificationAsRead,
} from '../repositories/notificationRepository';

/**
 * Get Notifications (Admin sees all, Customer sees their own)
 */
export const getCustomerNotifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const role = req.user?.role;
    const adminId = req.user?.id;

    if (role && ['ADMIN_1', 'ADMIN_2'].includes(role)) {
      const result = await repoGetAdminNotifications(adminId);
      return res.status(200).json({
        success: true,
        unreadCount: result.unreadCount,
        notifications: result.notifications
      });
    }

    const result = await repoGetCustomerNotifications(req.user?.id || '');
    res.status(200).json({
      success: true,
      unreadCount: result.unreadCount,
      notifications: result.notifications
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark All Notifications as Read
 */
export const markNotificationsAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const role = req.user?.role;
    const adminId = req.user?.id;

    if (role && ['ADMIN_1', 'ADMIN_2'].includes(role) && adminId) {
      await markAllAdminAsRead(adminId);
      return res.status(200).json({
        success: true,
        message: 'All admin notifications marked as read'
      });
    }

    if (req.user?.id) {
      await markAllCustomerAsRead(req.user.id);
    }

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
    const role = req.user?.role;
    const adminId = req.user?.id;

    await repoMarkSingleNotificationAsRead(id, (role && ['ADMIN_1', 'ADMIN_2'].includes(role)) ? adminId : undefined);

    res.status(200).json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    next(error);
  }
};

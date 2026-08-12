import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import Notification from '../models/Notification';

/**
 * Get Notifications (Admin sees all, Customer sees their own)
 * Admin read/unread state is tracked independently per admin ID
 */
export const getCustomerNotifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const role = req.user?.role;
    const adminId = req.user?.id;

    if (role && ['ADMIN_1', 'ADMIN_2'].includes(role)) {
      const rawNotifications = await Notification.find()
        .populate('customer', 'name customerId')
        .sort({ createdAt: -1 })
        .limit(30);

      // Map read state per-admin: isRead is true if global isRead OR adminId is in readByAdmins
      const notifications = rawNotifications.map((n: any) => {
        const doc = n.toObject ? n.toObject() : n;
        const readByArray = (doc.readByAdmins || []).map((id: any) => id.toString());
        const isReadForThisAdmin = doc.isRead || (adminId && readByArray.includes(adminId.toString()));
        return {
          ...doc,
          isRead: isReadForThisAdmin
        };
      });

      const unreadCount = notifications.filter(n => !n.isRead).length;

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
 * Mark All Notifications as Read (Admin updates their own read array, Customer updates their own)
 */
export const markNotificationsAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const role = req.user?.role;
    const adminId = req.user?.id;

    if (role && ['ADMIN_1', 'ADMIN_2'].includes(role) && adminId) {
      await Notification.updateMany(
        { readByAdmins: { $ne: adminId } },
        { $addToSet: { readByAdmins: adminId } }
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
    const role = req.user?.role;
    const adminId = req.user?.id;

    if (role && ['ADMIN_1', 'ADMIN_2'].includes(role) && adminId) {
      await Notification.findByIdAndUpdate(id, { $addToSet: { readByAdmins: adminId } });
    } else {
      await Notification.findByIdAndUpdate(id, { $set: { isRead: true } });
    }

    res.status(200).json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    next(error);
  }
};

import crypto from 'crypto';
import { getItem, putItem, queryItems, scanItems, updateItem } from './dynamoHelper';
import { NotificationModel } from '../types/models';

/**
 * Create Notification
 */
export const createNotification = async (data: Partial<NotificationModel>): Promise<NotificationModel> => {
  const id = data.id || crypto.randomUUID();
  const now = new Date();
  const nowIso = now.toISOString();
  // 30 days TTL (in seconds)
  const expiresAt = Math.floor(now.getTime() / 1000) + 30 * 24 * 60 * 60;

  const isAdminNotification = !!data.isAdminNotification;
  const gsi1pk = isAdminNotification ? 'NOTIFICATIONS#ADMIN' : (data.customerId ? `CUSTOMER#${data.customerId}#NOTIFICATIONS` : 'NOTIFICATIONS#ADMIN');

  const newNotif: NotificationModel & Record<string, any> = {
    PK: `NOTIFICATION#${id}`,
    SK: 'METADATA',
    GSI1PK: gsi1pk,
    GSI1SK: `${nowIso}#${id}`,
    id,
    _id: id,
    customerId: data.customerId,
    customer: data.customer,
    title: data.title || '',
    message: data.message || '',
    isRead: !!data.isRead,
    isAdminNotification,
    readByAdmins: data.readByAdmins || [],
    expiresAt,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  return putItem<NotificationModel>(newNotif);
};

/**
 * Find all Admin notifications (up to 30)
 */
export const getAdminNotifications = async (adminId?: string): Promise<{ notifications: any[]; unreadCount: number }> => {
  let notifs = await queryItems<NotificationModel>({
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :gsi1pk',
    ExpressionAttributeValues: {
      ':gsi1pk': 'NOTIFICATIONS#ADMIN',
    },
    ScanIndexForward: false, // Descending by createdAt
    Limit: 30,
  });

  if (notifs.length === 0) {
    const all = await scanItems<NotificationModel>({
      FilterExpression: 'begins_with(PK, :prefix) AND (isAdminNotification = :trueVal OR attribute_not_exists(customerId))',
      ExpressionAttributeValues: {
        ':prefix': 'NOTIFICATION#',
        ':trueVal': true,
      },
    });
    all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    notifs = all.slice(0, 30);
  }

  // Map per-admin read state
  const mapped = notifs.map((n: any) => {
    const readBy = (n.readByAdmins || []).map((id: any) => id.toString());
    const isReadForThisAdmin = n.isRead || (adminId && readBy.includes(adminId.toString()));
    return {
      ...n,
      isRead: isReadForThisAdmin,
    };
  });

  const unreadCount = mapped.filter((n) => !n.isRead).length;

  return {
    notifications: mapped,
    unreadCount,
  };
};

/**
 * Find Customer notifications
 */
export const getCustomerNotifications = async (customerId: string): Promise<{ notifications: NotificationModel[]; unreadCount: number }> => {
  if (!customerId) return { notifications: [], unreadCount: 0 };

  let notifs = await queryItems<NotificationModel>({
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :gsi1pk',
    ExpressionAttributeValues: {
      ':gsi1pk': `CUSTOMER#${customerId}#NOTIFICATIONS`,
    },
    ScanIndexForward: false,
    Limit: 30,
  });

  if (notifs.length === 0) {
    const all = await scanItems<NotificationModel>({
      FilterExpression: 'begins_with(PK, :prefix) AND customerId = :cId',
      ExpressionAttributeValues: {
        ':prefix': 'NOTIFICATION#',
        ':cId': customerId,
      },
    });
    all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    notifs = all.slice(0, 30);
  }

  const unreadCount = notifs.filter((n) => !n.isRead).length;

  return {
    notifications: notifs,
    unreadCount,
  };
};

/**
 * Mark all admin notifications as read for a given adminId
 */
export const markAllAdminAsRead = async (adminId: string): Promise<void> => {
  const { notifications } = await getAdminNotifications(adminId);
  const now = new Date().toISOString();
  for (const n of notifications) {
    const readBy = new Set(n.readByAdmins || []);
    if (adminId && !readBy.has(adminId)) {
      readBy.add(adminId);
      const updated: any = {
        ...n,
        PK: `NOTIFICATION#${n.id}`,
        SK: 'METADATA',
        readByAdmins: Array.from(readBy),
        updatedAt: now,
      };
      await putItem(updated);
    }
  }
};

/**
 * Mark all customer notifications as read
 */
export const markAllCustomerAsRead = async (customerId: string): Promise<void> => {
  const { notifications } = await getCustomerNotifications(customerId);
  const now = new Date().toISOString();
  for (const n of notifications) {
    if (!n.isRead) {
      const updated: any = {
        ...n,
        PK: `NOTIFICATION#${n.id}`,
        SK: 'METADATA',
        isRead: true,
        updatedAt: now,
      };
      await putItem(updated);
    }
  }
};

/**
 * Mark single notification as read
 */
export const markSingleNotificationAsRead = async (id: string, adminId?: string): Promise<void> => {
  const notif = await getItem<NotificationModel>(`NOTIFICATION#${id}`, 'METADATA');
  if (!notif) return;

  const now = new Date().toISOString();
  if (adminId && notif.isAdminNotification) {
    const readBy = new Set(notif.readByAdmins || []);
    readBy.add(adminId);
    const updated: any = {
      ...notif,
      PK: `NOTIFICATION#${id}`,
      SK: 'METADATA',
      readByAdmins: Array.from(readBy),
      updatedAt: now,
    };
    await putItem(updated);
  } else {
    const updated: any = {
      ...notif,
      PK: `NOTIFICATION#${id}`,
      SK: 'METADATA',
      isRead: true,
      updatedAt: now,
    };
    await putItem(updated);
  }
};

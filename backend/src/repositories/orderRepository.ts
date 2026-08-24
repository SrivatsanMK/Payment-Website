import crypto from 'crypto';
import { getItem, putItem, deleteItem, queryItems, scanItems, batchWriteItems } from './dynamoHelper';
import { OrderModel } from '../types/models';

/**
 * Create Order
 */
export const createOrder = async (data: Partial<OrderModel>): Promise<OrderModel> => {
  const id = data.id || crypto.randomUUID();
  const now = new Date().toISOString();
  const purchaseDate = data.purchaseDate || now;
  const orderNumber = data.orderNumber || `ORD-${Math.floor(100000 + Math.random() * 900000)}`;

  const newOrder: OrderModel & Record<string, any> = {
    PK: `ORDER#${id}`,
    SK: 'METADATA',
    GSI1PK: 'ORDERS',
    GSI1SK: `${purchaseDate}#${orderNumber}`,
    GSI2PK: `CUSTOMER#${data.customerId}#ORDERS`,
    GSI2SK: `${purchaseDate}#${orderNumber}`,
    GSI3PK: `INVOICE#${data.invoiceNumber}#ORDERS`,
    GSI3SK: `ORDER#${id}`,
    id,
    _id: id,
    orderNumber,
    invoiceNumber: data.invoiceNumber || '',
    customerId: data.customerId || '',
    customer: data.customer,
    productName: data.productName || '',
    category: data.category || '',
    quantity: Number(data.quantity) || 0,
    price: Number(data.price) || 0,
    discount: Number(data.discount) || 0,
    gst: Number(data.gst) || 0,
    grandTotal: Number(data.grandTotal) || 0,
    purchaseDate,
    invoiceStatus: data.invoiceStatus || 'Pending',
    createdAt: now,
    updatedAt: now,
  };

  return putItem<OrderModel>(newOrder);
};

/**
 * Bulk create orders using batchWrite
 */
export const createOrdersBulk = async (orders: Partial<OrderModel>[]): Promise<OrderModel[]> => {
  const createdList: OrderModel[] = [];
  const putItems: any[] = [];
  const now = new Date().toISOString();

  for (const data of orders) {
    const id = data.id || crypto.randomUUID();
    const purchaseDate = data.purchaseDate || now;
    const orderNumber = data.orderNumber || `ORD-${Math.floor(100000 + Math.random() * 900000)}`;

    const orderDoc: OrderModel & Record<string, any> = {
      PK: `ORDER#${id}`,
      SK: 'METADATA',
      GSI1PK: 'ORDERS',
      GSI1SK: `${purchaseDate}#${orderNumber}`,
      GSI2PK: `CUSTOMER#${data.customerId}#ORDERS`,
      GSI2SK: `${purchaseDate}#${orderNumber}`,
      GSI3PK: `INVOICE#${data.invoiceNumber}#ORDERS`,
      GSI3SK: `ORDER#${id}`,
      id,
      _id: id,
      orderNumber,
      invoiceNumber: data.invoiceNumber || '',
      customerId: data.customerId || '',
      customer: data.customer,
      productName: data.productName || '',
      category: data.category || '',
      quantity: Number(data.quantity) || 0,
      price: Number(data.price) || 0,
      discount: Number(data.discount) || 0,
      gst: Number(data.gst) || 0,
      grandTotal: Number(data.grandTotal) || 0,
      purchaseDate,
      invoiceStatus: data.invoiceStatus || 'Pending',
      createdAt: now,
      updatedAt: now,
    };

    putItems.push(orderDoc);
    createdList.push(orderDoc);
  }

  if (putItems.length > 0) {
    await batchWriteItems(putItems, []);
  }

  return createdList;
};

/**
 * Find all orders (Admin)
 */
export const findAllOrders = async (): Promise<OrderModel[]> => {
  const orders = await queryItems<OrderModel>({
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :gsi1pk',
    ExpressionAttributeValues: {
      ':gsi1pk': 'ORDERS',
    },
    ScanIndexForward: false, // Descending by purchaseDate
  });

  if (orders.length > 0) return orders;

  return scanItems<OrderModel>({
    FilterExpression: 'begins_with(PK, :prefix) AND SK = :sk',
    ExpressionAttributeValues: {
      ':prefix': 'ORDER#',
      ':sk': 'METADATA',
    },
  });
};

/**
 * Find orders by Customer ID
 */
export const findOrdersByCustomerId = async (customerId: string): Promise<OrderModel[]> => {
  if (!customerId) return [];
  const orders = await queryItems<OrderModel>({
    IndexName: 'GSI2',
    KeyConditionExpression: 'GSI2PK = :gsi2pk',
    ExpressionAttributeValues: {
      ':gsi2pk': `CUSTOMER#${customerId}#ORDERS`,
    },
    ScanIndexForward: false,
  });

  if (orders.length > 0) return orders;

  const all = await findAllOrders();
  return all.filter((o) => o.customerId === customerId);
};

/**
 * Find orders by Invoice Number
 */
export const findOrdersByInvoiceNumber = async (invoiceNumber: string): Promise<OrderModel[]> => {
  if (!invoiceNumber) return [];
  const orders = await queryItems<OrderModel>({
    IndexName: 'GSI3',
    KeyConditionExpression: 'GSI3PK = :gsi3pk',
    ExpressionAttributeValues: {
      ':gsi3pk': `INVOICE#${invoiceNumber}#ORDERS`,
    },
  });

  if (orders.length > 0) return orders;

  const all = await findAllOrders();
  return all.filter((o) => o.invoiceNumber === invoiceNumber);
};

/**
 * Update invoiceStatus for all orders belonging to an invoiceNumber
 */
export const updateOrderStatusByInvoiceNumber = async (
  invoiceNumber: string,
  invoiceStatus: 'Paid' | 'Pending'
): Promise<void> => {
  const orders = await findOrdersByInvoiceNumber(invoiceNumber);
  const now = new Date().toISOString();
  for (const order of orders) {
    const updatedOrder: any = {
      ...order,
      PK: `ORDER#${order.id}`,
      SK: 'METADATA',
      GSI1PK: 'ORDERS',
      GSI1SK: `${order.purchaseDate}#${order.orderNumber}`,
      GSI2PK: `CUSTOMER#${order.customerId}#ORDERS`,
      GSI2SK: `${order.purchaseDate}#${order.orderNumber}`,
      GSI3PK: `INVOICE#${invoiceNumber}#ORDERS`,
      GSI3SK: `ORDER#${order.id}`,
      invoiceStatus,
      updatedAt: now,
    };
    await putItem(updatedOrder);
  }
};

/**
 * Delete all orders for an invoiceNumber
 */
export const deleteOrdersByInvoiceNumber = async (invoiceNumber: string): Promise<void> => {
  const orders = await findOrdersByInvoiceNumber(invoiceNumber);
  const deleteKeys = orders.map((o) => ({
    PK: `ORDER#${o.id}`,
    SK: 'METADATA',
  }));
  if (deleteKeys.length > 0) {
    await batchWriteItems([], deleteKeys);
  }
};

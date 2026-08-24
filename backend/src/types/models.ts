/**
 * models.ts
 * Domain model interfaces and DynamoDB Item mapping definitions.
 */

export type UserRole = 'ADMIN_1' | 'ADMIN_2' | 'Customer';

export interface AdminModel {
  id: string;
  _id?: string;
  adminId: string;
  username: string;
  displayName: string;
  email: string;
  phone?: string;
  password?: string;
  role: 'ADMIN_1' | 'ADMIN_2';
  profilePicture?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerModel {
  id: string;
  _id?: string;
  customerId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  gstNumber?: string;
  password?: string;
  role: 'Customer';
  status: 'Active' | 'Suspended';
  joiningDate?: string;
  profilePicture?: string;
  lastPasswordChangeDate?: string;
  forcedPasswordReset?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceProduct {
  name: string;
  category?: string;
  quantity: number;
  price: number;
}

export interface InvoiceModel {
  id: string;
  _id?: string;
  invoiceNumber: string;
  customerId: string;
  customer?: {
    _id?: string;
    id?: string;
    customerId?: string;
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    gstNumber?: string;
  };
  products: InvoiceProduct[];
  discount: number;
  gst: number;
  finalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  qrCodeImage?: string;
  deliveryAddress?: string;
  shippedAddress?: string;
  vehicleNumber?: string;
  transportMode?: string;
  dueDate?: string;
  createdBy?: any;
  approvedBy?: any;
  approvedAt?: string;
  paymentApprovedAt?: string;
  status?: 'Paid' | 'Unpaid';
  createdAt: string;
  updatedAt: string;
}

export interface OrderModel {
  id: string;
  _id?: string;
  orderNumber: string;
  invoiceNumber: string;
  customerId: string;
  customer?: any;
  productName: string;
  category?: string;
  quantity: number;
  price: number;
  discount: number;
  gst: number;
  grandTotal: number;
  purchaseDate: string;
  invoiceStatus?: 'Paid' | 'Pending';
  createdBy?: any;
  approvedBy?: any;
  approvedAt?: string;
  paymentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentModel {
  id: string;
  _id?: string;
  invoiceNumber: string;
  customerId: string;
  customer?: any;
  amount: number;
  date: string;
  time?: string;
  transactionId: string;
  paymentMethod: string;
  status: 'Pending' | 'Completed' | 'Received' | 'Settled';
  approvedBy?: any;
  approvedAt?: string;
  createdBy?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseModel {
  id: string;
  _id?: string;
  expenseDate: string;
  category: string;
  expenseName: string;
  amount: number;
  vendor?: string;
  createdBy?: any;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationModel {
  id: string;
  _id?: string;
  customerId?: string;
  customer?: any;
  title: string;
  message: string;
  isRead: boolean;
  isAdminNotification?: boolean;
  readByAdmins?: string[];
  expiresAt?: number;
  createdAt: string;
  updatedAt: string;
}

export interface OTPModel {
  email: string;
  otp: string;
  purpose: 'forgot_password' | 'profile_update' | 'forgot_admin_id' | 'forgot_customer_id' | 'customer_profile_update';
  attempts: number;
  expiresAt: number; // Unix timestamp in seconds for DynamoDB TTL
  createdAt: string;
}

export interface CategoryItem {
  _id?: string;
  id?: string;
  name: string;
  colors?: string[];
  unit?: string;
  isActive: boolean;
}

export interface ProductCategoryModel {
  id: string;
  _id?: string;
  name: string;
  isActive: boolean;
  items: CategoryItem[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierModel {
  id: string;
  _id?: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  marketLocation?: string;
  gstNumber?: string;
  notes?: string;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VegetableModel {
  id: string;
  _id?: string;
  name: string;
  category: string;
  defaultUnit: string;
  notes?: string;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VegetablePurchaseItem {
  vegetable: string;
  vegetableName: string;
  quantity: number;
  unit: string;
  ratePerUnit: number;
  itemTotal: number;
}

export interface VegetablePurchaseCharges {
  transportation: number;
  loadingUnloading: number;
  commission: number;
  other: number;
}

export interface VegetablePurchaseModel {
  id: string;
  _id?: string;
  purchaseId: string;
  purchaseDate: string;
  purchaseTime?: string;
  supplier: string;
  supplierName: string;
  items: VegetablePurchaseItem[];
  vegetableSubtotal: number;
  charges: VegetablePurchaseCharges;
  additionalChargesTotal: number;
  grandTotal: number;
  paymentMethod: string;
  paymentStatus: 'Paid' | 'Partially Paid' | 'Pending';
  paidAmount: number;
  balanceAmount: number;
  billNumber?: string;
  vehicleNumber?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SettingModel {
  companyName: string;
  companyLogo?: string;
  upiId: string;
  supportPhone?: string;
  gmailAddress?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PrivateBusinessSettingModel {
  id?: string;
  _id?: string;
  businessName: string;
  ownerName: string;
  currency: string;
  defaultUnit: string;
  defaultPaymentMethod: string;
  address?: string;
  phone?: string;
  email?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

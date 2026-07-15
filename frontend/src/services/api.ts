// Typed API contracts and query endpoints

export interface CustomerInput {
  name: string;
  email: string;
  phone: string;
  address: string;
  gstNumber?: string;
  password?: string;
}

export interface InvoiceInput {
  customerId: string;
  products: { name: string; quantity: number; price: number }[];
  discount: number;
  gst: number;
  dueDate: string;
}

export interface PaymentInput {
  invoiceNumber: string;
  amount: number;
  transactionId?: string;
  paymentMethod: string;
}

export const endpoints = {
  auth: {
    login: '/auth/login',
    forgotPassword: '/auth/forgot-password',
    verifyOtp: '/auth/verify-otp',
    resetPassword: '/auth/reset-password',
  },
  customers: {
    base: '/customers',
    single: (id: string) => `/customers/${id}`,
    status: (id: string) => `/customers/${id}/status`,
    resetPassword: (id: string) => `/customers/${id}/reset-password`,
  },
  invoices: {
    base: '/invoices',
    single: (id: string) => `/invoices/${id}`,
    markPaid: (id: string) => `/invoices/${id}/mark-paid`,
  },
  payments: {
    history: '/payments/history',
    record: '/payments/record',
    upiDetails: (id: string) => `/payments/upi-details/${id}`,
  },
  reports: {
    dashboard: '/reports/dashboard',
    invoicesCSV: '/reports/invoices/csv',
    customersCSV: '/reports/customers/csv',
    paymentsCSV: '/reports/payments/csv',
  },
  settings: {
    base: '/settings',
    backup: '/settings/backup',
  },
  notifications: {
    base: '/notifications',
    read: '/notifications/read',
  },
  expenses: {
    base: '/expenses',
    single: (id: string) => `/expenses/${id}`,
    dashboard: '/expenses/summary/dashboard',
    detailedReport: '/expenses/reports/detailed',
  }
};

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
    adminLogin: '/auth/admin/login',
    adminForgotPassword: '/auth/admin/forgot-password',
    adminVerifyOtp: '/auth/admin/verify-otp',
    adminResetPassword: '/auth/admin/reset-password',
    adminProfile: '/auth/admin/profile',
    adminProfileRequestOtp: '/auth/admin/profile/request-update-otp',
    adminProfileVerifyOtp:  '/auth/admin/profile/verify-update-otp',
    adminProfileNotifyIssue: '/auth/admin/profile/notify-otp-issue',
    adminForgotIdRequestOtp: '/auth/admin/forgot-id/request-otp',
    adminForgotIdVerifyOtp:  '/auth/admin/forgot-id/verify-otp',
    customerProfileRequestOtp: '/auth/customer/profile/request-update-otp',
    customerProfileVerifyOtp:  '/auth/customer/profile/verify-update-otp',
    customerForgotIdRequestOtp: '/auth/customer/forgot-id/request-otp',
    customerForgotIdVerifyOtp:  '/auth/customer/forgot-id/verify-otp',
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
    approve: (id: string) => `/payments/${id}/approve`,
  },
  reports: {
    dashboard: '/reports/dashboard',
    invoicesCSV: '/reports/invoices/csv',
    customersCSV: '/reports/customers/csv',
    paymentsCSV: '/reports/payments/csv',
  },
  settings: {
    base: '/settings',
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
  },
  privateBusiness: {
    dashboard: '/private-business/dashboard',
    reports: '/private-business/reports',
    vegetables: {
      base: '/private-business/vegetables',
      single: (id: string) => `/private-business/vegetables/${id}`,
    },
    suppliers: {
      base: '/private-business/suppliers',
      single: (id: string) => `/private-business/suppliers/${id}`,
    },
    purchases: {
      base: '/private-business/purchases',
      single: (id: string) => `/private-business/purchases/${id}`,
    },
    settings: '/private-business/settings',
  }
};


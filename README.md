# Dealer Payment Management System

A production-ready, full-stack Dealer Payment Management System designed for business operations. This system allows the Dealer (Admin) to manage customers, issue invoices, track orders, audit logs, and trigger database backups. Customers can log in, view their specific transactions, profile details, and settle payments instantly using dynamically generated UPI QR codes and deep links.

---

## 🛠 Tech Stack

- **Frontend**: React.js (Vite), TypeScript, Tailwind CSS, Framer Motion, Recharts, Axios, React Hook Form, Zod.
- **Backend**: Node.js, Express.js, TypeScript.
- **Database**: MongoDB & Mongoose.
- **Authentication**: JWT Access Tokens, Refresh Tokens, and Role-Based Authorization.
- **QR Generation**: Dynamic UPI QR Codes generated locally on backend via `qrcode`.
- **Email Notifications**: Nodemailer (supporting Gmail/SMTP and Console Logger fallback).

---

## 📁 Project Structure

```
Payment Website/
├── README.md
├── backups/               # Target folder for JSON database backups
├── uploads/               # Saved profile pictures & business logos
├── backend/               # Node Express TypeScript Backend
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env
│   ├── src/
│   │   ├── server.ts
│   │   ├── config/       # db, mail transporters
│   │   ├── models/       # Admin, Customer, Invoice, Order, Payment, OTP, Notification, Settings, Logs
│   │   ├── middleware/   # JWT verification, Role guards, Multer upload
│   │   ├── controllers/  # Auth, CRUD endpoints, UPI link calculations
│   │   └── utils/        # Email, UPI links, Backup routines
│   └── scripts/
│       └── seed.ts       # Database seeder script
└── frontend/              # React Vite Tailwind CSS Frontend
    ├── package.json
    ├── vite.config.ts
    ├── src/
    │   ├── App.tsx
    │   ├── main.tsx
    │   ├── index.css
    │   ├── context/      # AuthState, Theme toggler
    │   ├── hooks/        # Intercepted custom Axios
    │   ├── components/   # UI inputs, Tables, Modals, Cards, Sidebar, Navbar
    │   └── pages/        # Unified Login, Admin views, Customer UPI payment screens
    └── index.html
```

---

## 🚀 Getting Started & Installation

### Prerequisites
- Node.js (v18 or above recommended)
- MongoDB running locally on `mongodb://127.0.0.1:27017/` (or a remote URI)

### Step 1: Set Up Backend

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Copy the `.env.example` file to `.env` and fill in details (a fallback mock is preset if SMTP credentials are left empty):
   ```bash
   cp .env.example .env
   ```
3. Run the database seed script to initialize an admin account and add mock customers, invoices, and payments:
   ```bash
   npm run seed
   ```
4. Start the backend developer server:
   ```bash
   npm run dev
   ```
   *The server will start listening at `http://localhost:5000`*

### Step 2: Set Up Frontend

1. Navigate to the frontend folder:
   ```bash
   cd ../frontend
   ```
2. Start the Vite developer server:
   ```bash
   npm run dev
   ```
   *The client interface will open at `http://localhost:5173`*

---

## 🔑 Default Test Credentials

You can test the application immediately using the seeded mock accounts:

### 1. Dealer (Admin) Login
- **Username**: `admin`
- **Email**: `admin@dealer.com`
- **Password**: `AdminPassword123`

### 2. Customer Login
- **Customer ID**: `CUST88102`
- **Email**: `rohan.sharma@example.com`
- **Password**: `CustomerPassword123`
- **Status**: Active (with 1 settled invoice and 1 pending invoice)

- **Customer ID**: `CUST45218`
- **Email**: `contact@monaind.com`
- **Password**: `CustomerPassword123`
- **Status**: Active (with 1 partially paid invoice and 1 overdue invoice)

- **Customer ID**: `CUST11295`
- **Email**: `vikas.traders@example.com`
- **Password**: `CustomerPassword123`
- **Status**: Suspended (requires password reset)

---

## 🔒 Security Features Implemented

- **Password Hashing**: Standard password salting via `bcryptjs`. Original passwords are never stored in plaintext or readable by Admin.
- **Helmet Headers**: Configured with security policies to block unauthorized script execution.
- **Rate Limiting**: Custom limits on API routes to prevent brute-force attacks on login/OTP endpoints.
- **CORS Protection**: Access control restricts API consumption to authorized frontend origins.
- **Access Guarding**: Access Tokens verified on request, with Refresh Tokens enabling seamless authorization.
- **TTL Indexing**: OTP records automatically purge from the database after 5 minutes.
- **Forced Password Reset**: Enables Admin to trigger temporary credential updates and prompt Customers to reset details immediately on login.

import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../types';
import Admin from '../models/Admin';
import Customer from '../models/Customer';

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkeyforaccess123456');

      if (['ADMIN_1', 'ADMIN_2'].includes(decoded.role)) {
        const admin = await Admin.findById(decoded.id).select('-password');
        if (!admin) {
          return res.status(401).json({ success: false, message: 'Not authorized, admin user not found' });
        }
        req.user = {
          id: admin._id.toString(),
          role: admin.role,
          email: admin.email,
          username: admin.username
        };
      } else if (decoded.role === 'Customer') {
        const customer = await Customer.findById(decoded.id).select('-password');
        if (!customer) {
          return res.status(401).json({ success: false, message: 'Not authorized, customer not found' });
        }
        req.user = {
          id: customer._id.toString(),
          role: 'Customer',
          email: customer.email,
          name: customer.name
        };
      } else {
        return res.status(401).json({ success: false, message: 'Not authorized, invalid token role' });
      }

      next();
    } catch (error) {
      console.error('JWT Token Verification Error:', error);
      res.status(401).json({ success: false, message: 'Not authorized, token verification failed' });
    }
  } else {
    res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }
};

export const adminOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && ['ADMIN_1', 'ADMIN_2'].includes(req.user.role)) {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Access denied. Admins only.' });
  }
};

export const admin1Only = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === 'ADMIN_1') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Access denied. Owner Admin only.' });
  }
};

export const customerOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === 'Customer') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Access denied. Customers only.' });
  }
};

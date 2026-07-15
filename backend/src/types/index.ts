import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: 'ADMIN_1' | 'ADMIN_2' | 'Customer';
    email: string;
    username?: string;
    name?: string;
  };
}

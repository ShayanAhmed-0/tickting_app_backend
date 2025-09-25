import { Request } from "express";
import { UserRole } from "../../models";

export interface CustomRequest extends Request {
  authId?: string;
  email?: string;
  role?: UserRole
}

export interface JwtPayload {
  authId: string;
  role: UserRole
  profileId?: string;
  email: string;
}

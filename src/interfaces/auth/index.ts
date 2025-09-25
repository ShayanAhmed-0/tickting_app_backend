import { Request } from "express";
import { RoleEnums } from "../../constants/enums";

export interface CustomRequest extends Request {
  authId?: string;
  email?: string;
  role?: keyof typeof RoleEnums
}

export interface JwtPayload {
  authId: string;
  role: keyof typeof RoleEnums
  profileId?: string;
  email: string;
}

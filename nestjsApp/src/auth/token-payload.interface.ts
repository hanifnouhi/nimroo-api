import { UserRole } from "../user/user.enums"

export interface TokenPayload {
    userId: string;
    username: string;
    role: UserRole;
}
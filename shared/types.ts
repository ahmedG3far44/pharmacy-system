export type Role = 'admin' | 'pharmacist' | 'cashier';

export interface UserType {
    id: string;
    name: string;
    phone: string;
    role: Role;
}

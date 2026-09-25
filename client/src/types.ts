export type Role = 'ADMIN'|'PHARMACIST'|'CASHIER';
export interface User { id: string; name: string; phone: string; role: Role; permissions: string[] }
export interface Product { id: string; name: string; genericName?: string; barcode: string; sku: string; sellingPrice: string; defaultPurchasePrice: string; minimumStock: number; availableQuantity: number; prescriptionRequired: boolean; isActive: boolean; categoryId: string; manufacturerId?: string; category: { id: string; name: string }; manufacturer?: { id: string; name: string } }
export interface Paged<T> { items: T[]; pagination: { page: number; limit: number; total: number; pages: number } }


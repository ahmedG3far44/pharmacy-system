const labels: Record<string, string> = {
  ADMIN: 'مدير النظام', PHARMACIST: 'صيدلي', CASHIER: 'أمين صندوق',
  ACTIVE: 'نشط', DISABLED: 'معطّل', DRAFT: 'مسودة', RECEIVED: 'مستلمة', CANCELLED: 'ملغاة',
  COMPLETED: 'مكتملة', PARTIALLY_RETURNED: 'مرتجع جزئي', RETURNED: 'مرتجعة', VOIDED: 'ملغاة',
  IN_STOCK: 'متوفر', LOW_STOCK: 'مخزون منخفض', OUT_OF_STOCK: 'غير متوفر',
  EXPIRED: 'منتهي الصلاحية', DEPLETED: 'نفد المخزون', DAMAGED: 'تالف',
  CASH: 'نقدي', CARD: 'بطاقة', MOBILE_WALLET: 'محفظة إلكترونية',
  PURCHASE: 'شراء', SALE: 'بيع', SALE_RETURN: 'مرتجع بيع', PURCHASE_RETURN: 'مرتجع شراء',
  ADJUSTMENT_IN: 'إضافة يدوية', ADJUSTMENT_OUT: 'خصم يدوي', VOID: 'إلغاء',
};

export function arabicLabel(value: string | null | undefined) {
  if (!value) return '—';
  return labels[value] ?? value.replaceAll('_', ' ');
}

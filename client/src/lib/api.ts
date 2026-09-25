export class ApiError extends Error { constructor(public code: string, message: string, public status: number) { super(message); } }
type ApiResult<T> = { success: true; data: T } | { success: false; error: { code: string; message: string } };

const arabicErrors: Record<string, string> = {
  INVALID_RESPONSE: 'أعاد الخادم استجابة غير قابلة للقراءة.', REQUEST_FAILED: 'فشل الطلب. حاول مرة أخرى.',
  AUTH_REQUIRED: 'يرجى تسجيل الدخول للمتابعة.', SESSION_EXPIRED: 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مجددًا.', INVALID_SESSION: 'جلسة الدخول غير صالحة.',
  INVALID_CREDENTIALS: 'رقم الهاتف أو كلمة المرور غير صحيحة.', USER_INACTIVE: 'حساب الموظف معطّل.', FORBIDDEN: 'ليست لديك صلاحية لتنفيذ هذا الإجراء.',
  VALIDATION_ERROR: 'تحقق من البيانات المدخلة وحاول مرة أخرى.', DUPLICATE_VALUE: 'توجد بالفعل بيانات بالقيمة نفسها.', NOT_FOUND: 'السجل المطلوب غير موجود.',
  BATCH_NOT_FOUND: 'دفعة المخزون غير موجودة.', INSUFFICIENT_STOCK: 'الكمية المتاحة في المخزون غير كافية.', PRODUCT_UNAVAILABLE: 'منتج واحد أو أكثر غير متاح.',
  PAYMENT_TOO_SMALL: 'المبلغ المدفوع أقل من إجمالي الفاتورة.', PURCHASE_NOT_FOUND: 'طلب الشراء غير موجود.', PURCHASE_ALREADY_RECEIVED: 'يمكن استلام طلبات الشراء المسودة فقط.',
  PURCHASE_NOT_DRAFT: 'يمكن إلغاء طلبات الشراء المسودة فقط.', SALE_NOT_FOUND: 'عملية البيع غير موجودة.', SALE_NOT_VOIDABLE: 'لا يمكن إلغاء عملية البيع هذه.',
  SALE_NOT_RETURNABLE: 'عملية البيع غير موجودة أو لا يمكن إرجاعها.', DUPLICATE_RETURN_ITEM: 'لا يمكن تكرار الصنف نفسه في المرتجع.', INVALID_RETURN_ITEM: 'الصنف المرتجع لا ينتمي إلى عملية البيع هذه.',
  RETURN_QUANTITY_EXCEEDED: 'الكمية المرتجعة أكبر من الكمية المتبقية المباعة.', RETURN_ALLOCATION_ERROR: 'تعذر ربط الكمية المرتجعة بدفعات المخزون الأصلية.', INVALID_DATE: 'التاريخ المحدد غير صالح.',
};

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, { ...options, credentials: 'include', headers: { 'Content-Type': 'application/json', ...options.headers } });
  const payload = await response.json().catch(() => ({ success: false, error: { code: 'INVALID_RESPONSE', message: arabicErrors.INVALID_RESPONSE } })) as ApiResult<T>;
  if (!response.ok || !payload.success) {
    const error = !payload.success ? payload.error : { code: 'REQUEST_FAILED', message: arabicErrors.REQUEST_FAILED };
    if (response.status === 401 && path !== '/auth/me' && path !== '/auth/login') window.dispatchEvent(new Event('pharmacy:unauthorized'));
    throw new ApiError(error.code, arabicErrors[error.code] ?? error.message, response.status);
  }
  return payload.data;
}

export const apiGet = <T>(path: string) => api<T>(path);
export const apiPost = <T>(path: string, data?: unknown) => api<T>(path, { method: 'POST', body: data === undefined ? undefined : JSON.stringify(data) });
export const apiPatch = <T>(path: string, data: unknown) => api<T>(path, { method: 'PATCH', body: JSON.stringify(data) });
export const apiPut = <T>(path: string, data: unknown) => api<T>(path, { method: 'PUT', body: JSON.stringify(data) });

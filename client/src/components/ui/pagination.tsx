import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Paged } from '../../types';
import { cn } from '../../lib/utils';
import { Button } from './button';
import { Select } from './core';

type PaginationData = Paged<unknown>['pagination'];

function visiblePages(current: number, total: number) {
  const start = Math.max(1, Math.min(current - 2, total - 4));
  const end = Math.min(total, Math.max(current + 2, 5));
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
}

export function Pagination({ pagination, onPageChange, onLimitChange }: {
  pagination: PaginationData;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}) {
  const { page, limit, total, pages } = pagination;
  const firstItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const lastItem = Math.min(page * limit, total);

  return <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      <span><bdi>{firstItem.toLocaleString('en-EG')}–{lastItem.toLocaleString('en-EG')}</bdi> من <bdi>{total.toLocaleString('en-EG')}</bdi></span>
      <label className="flex items-center gap-2">
        <span className="sr-only sm:not-sr-only">صفوف</span>
        <Select className="h-8 w-20" value={limit} onChange={(event) => onLimitChange(Number(event.target.value))} aria-label="عدد الصفوف في الصفحة">
          {[10, 20, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
        </Select>
      </label>
    </div>
    <nav className="flex items-center gap-1" aria-label="التنقل بين الصفحات">
      <Button type="button" variant="outline" size="sm" className="px-2" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="الصفحة السابقة"><ChevronRight className="size-4" /><span className="hidden sm:inline">السابق</span></Button>
      <div className="hidden items-center gap-1 sm:flex">
        {visiblePages(page, pages).map((pageNumber) => <button type="button" key={pageNumber} aria-current={pageNumber === page ? 'page' : undefined} onClick={() => onPageChange(pageNumber)} className={cn('grid size-8 place-items-center rounded-md text-xs font-semibold transition-colors', pageNumber === page ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>{pageNumber}</button>)}
      </div>
      <span className="px-2 text-xs text-muted-foreground sm:hidden">صفحة <bdi>{page}</bdi> من <bdi>{Math.max(1, pages)}</bdi></span>
      <Button type="button" variant="outline" size="sm" className="px-2" disabled={page >= pages} onClick={() => onPageChange(page + 1)} aria-label="الصفحة التالية"><span className="hidden sm:inline">التالي</span><ChevronLeft className="size-4" /></Button>
    </nav>
  </div>;
}

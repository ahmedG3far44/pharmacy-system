import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Boxes, ChevronDown, ClipboardList, Gauge, LogOut, Menu, PackagePlus, Pill, ReceiptText, RotateCcw, Settings, ShoppingCart, Truck, Users, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/auth-context';
import { Button } from './ui/button';
import { usePharmacySettings } from '../context/settings-context';
import { arabicLabel } from '../lib/i18n';

const links = [
  { to: '/dashboard', label: 'لوحة التحكم', icon: Gauge, permission: 'dashboard:view' },
  { to: '/pos', label: 'نقطة البيع', icon: ShoppingCart, permission: 'sale:create' },
  { to: '/products', label: 'المنتجات', icon: Pill, permission: 'product:view' },
  { to: '/inventory', label: 'المخزون', icon: Boxes, permission: 'inventory:view', alternate: 'inventory:availability' },
  { to: '/purchases', label: 'المشتريات', icon: PackagePlus, permission: 'purchase:view' },
  { to: '/suppliers', label: 'الموردون', icon: Truck, permission: 'supplier:view' },
  { to: '/sales', label: 'المبيعات', icon: ReceiptText, permission: 'sale:view:own', alternate: 'sale:view:any' },
  { to: '/returns', label: 'المرتجعات', icon: RotateCcw, permission: 'return:create' },
  { to: '/reports', label: 'التقارير', icon: ClipboardList, permission: 'report:sales', alternate: 'report:inventory' },
  { to: '/users', label: 'الموظفون', icon: Users, permission: 'user:manage' },
  { to: '/settings', label: 'الإعدادات', icon: Settings, permission: 'settings:manage' },
];

export function AppShell() {
  const { user, logout, can } = useAuth(); 
  const { settings } = usePharmacySettings();
  const [open, setOpen] = useState(false); 
  const location = useLocation();
  const allowed = links.filter((item) => can(item.permission, ...(item.alternate ? [item.alternate] : [])));

  const pageName = allowed.find((item) => location.pathname.startsWith(item.to))?.label ?? 'الصيدلية';

  return <div className="min-h-screen bg-background text-foreground">

    <aside className={cn('no-print fixed inset-y-0 right-0 z-40 flex w-64 flex-col border-l border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform lg:translate-x-0', open ? 'translate-x-0' : 'translate-x-full')}>
      <div className="flex h-17 items-center gap-3 border-b border-sidebar-border px-5">

        <div className="grid size-9 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
          <Pill className="size-5" />
        </div>

        <div>
          <div className="truncate font-bold tracking-tight">{settings.pharmacyName}</div>
          <div className="text-[11px] text-muted-foreground">نظام إدارة الصيدلية</div>

        </div>
        
        <button className="mr-auto lg:hidden" aria-label="إغلاق القائمة" onClick={() => setOpen(false)}><X className="size-5" /></button>
      </div>
      
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        
        {allowed.map((item) => <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)} className={({ isActive }) => cn('flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground', 
        
        isActive && 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm')}>
          
          <item.icon className="size-4.5" /><span>{item.label}</span>
          
        </NavLink>)}
        
      </nav>
        
      <div className="border-t border-sidebar-border p-3">
        <div className="mb-2 flex items-center gap-3 rounded-lg px-2 py-2">
          
          <div className="grid size-9 place-items-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
            
            {user?.name.split(' ').map((x) => x[0]).slice(0, 2).join('')}
          
          </div>

          <div className="min-w-0 flex-1">

            <div className="truncate text-sm font-semibold">{user?.name}</div>
            <div className="text-[11px] text-muted-foreground">{arabicLabel(user?.role)}</div>

          </div>

        </div>

        <Button variant="ghost" className="w-full justify-start" 
        
        onClick={() => void logout()}>
          
          <LogOut className="size-4" /> تسجيل الخروج

        </Button>
      </div>
      
    </aside>

    {open && <button aria-label="إغلاق القائمة" className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" onClick={() => setOpen(false)} />}

    <div className="relative lg:pr-64">
      <header className="no-print sticky top-0 z-20 flex h-17 items-center border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6">
        
        <button className="ml-3 rounded-md p-2 text-muted-foreground hover:bg-secondary lg:hidden" aria-label="فتح القائمة" onClick={() => setOpen(true)}><Menu className="size-5" />
        </button>

        <div className="font-semibold text-foreground">{pageName}</div>
        
        <div className="mr-auto flex items-center gap-2 text-xs text-muted-foreground">
          <span className="hidden sm:inline">فرع واحد</span><ChevronDown className="size-4" />
        </div>

      </header>

      <main className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main> 
      
    </div>
  </div>;
}

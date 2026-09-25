import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/app-shell';
import { useAuth } from './context/auth-context';
import { DashboardPage } from './pages/dashboard';
import { InventoryPage } from './pages/inventory';
import { LoginPage } from './pages/login';
import { PosPage } from './pages/pos';
import { ProductsPage } from './pages/products';
import { PurchasesPage } from './pages/purchases';
import { ReportsPage } from './pages/reports';
import { ReturnsPage } from './pages/returns';
import { SalesPage } from './pages/sales';
import { SettingsPage } from './pages/settings';
import { SuppliersPage } from './pages/suppliers';
import { UsersPage } from './pages/users';
import { PharmacySettingsProvider } from './context/settings-context';

function Protected() { 
    const { user, loading } = useAuth(); 

    if (loading) return <div className="grid min-h-screen place-items-center bg-primary text-sm font-medium text-primary-foreground">
        جارٍ فتح مساحة عمل الصيدلية…
    </div>; 
    
    return user ? <PharmacySettingsProvider><AppShell/></PharmacySettingsProvider> : <Navigate to="/login" replace/>; 
}

function Allowed({ permissions, children }: { permissions: string[]; children: React.ReactNode }) { 

    const { can } = useAuth(); return can(...permissions) ? <>{children}</> : <Navigate to="/dashboard" replace/>;

 }
export default function App() { 
    return <Routes>
    <Route path="/login" element={<LoginPage/>}/>
    <Route element={<Protected/>}>
        <Route index element={<Navigate to="/dashboard" replace/>}/>
        <Route path="/dashboard" element={<DashboardPage/>}/>
        <Route path="/pos" element={<Allowed permissions={['sale:create']}><PosPage/></Allowed>}/>
        <Route path="/products" element={<Allowed permissions={['product:view']}><ProductsPage/></Allowed>}/>
        <Route path="/inventory" element={<Allowed permissions={['inventory:view','inventory:availability']}><InventoryPage/></Allowed>}/>
        <Route path="/purchases" element={<Allowed permissions={['purchase:view']}><PurchasesPage/></Allowed>}/>
        <Route path="/suppliers" element={<Allowed permissions={['supplier:view']}><SuppliersPage/></Allowed>}/>
        <Route path="/sales" element={<Allowed permissions={['sale:view:own','sale:view:any']}><SalesPage/></Allowed>}/>
        <Route path="/returns" element={<Allowed permissions={['return:create']}><ReturnsPage/></Allowed>}/>
        <Route path="/reports" element={<Allowed permissions={['report:sales','report:inventory']}><ReportsPage/></Allowed>}/>
        <Route path="/users" element={<Allowed permissions={['user:manage']}><UsersPage/></Allowed>}/>
        <Route path="/settings" element={<Allowed permissions={['settings:manage']}><SettingsPage/></Allowed>}/>
    </Route>
    <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
</Routes>; 
}

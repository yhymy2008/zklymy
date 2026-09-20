import { useEffect, type ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import CartPage from './pages/CartPage';
import Checkout from './pages/Checkout';
import Payment from './pages/Payment';
import Orders from './pages/Orders';
import Login from './pages/Login';
import Register from './pages/Register';
import Account from './pages/Account';
import NotFound from './pages/NotFound';

import AdminLayout from './admin/AdminLayout';
import Dashboard from './admin/Dashboard';
import AdminProducts from './admin/AdminProducts';
import AdminOrders from './admin/AdminOrders';
import AdminUsers from './admin/AdminUsers';
import AdminProviders from './admin/AdminProviders';
import AdminSettings from './admin/AdminSettings';
import { useI18n } from './i18n';
import { useSettings } from './lib/useSettings';

/** 跟随语言更新 <title> 与 description。 */
function SiteMeta() {
  const { t, pick } = useI18n();
  const settings = useSettings();
  const slogan = pick(settings, 'slogan');

  useEffect(() => {
    document.title = t('meta.title', { site: settings.siteName, slogan });
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content', t('meta.description', { site: settings.siteName }));
    }
  }, [t, settings.siteName, slogan]);

  return null;
}

function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <>
      <SiteMeta />
      <Routes>
      <Route
        element={
          <PublicLayout>
            <ProtectedRoute />
          </PublicLayout>
        }
      >
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/pay/:orderId" element={<Payment />} />
        <Route path="/account" element={<Account />} />
      </Route>

      <Route
        path="/admin"
        element={
          <ProtectedRoute adminOnly>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="providers" element={<AdminProviders />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      <Route
        path="/*"
        element={
          <PublicLayout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/:id" element={<ProductDetail />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/orders/:id" element={<Orders />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </PublicLayout>
        }
      />
      </Routes>
    </>
  );
}

import { Routes, Route } from 'react-router-dom';
import StoreLayout from './layouts/StoreLayout';
import AdminLayout from './layouts/AdminLayout';

// Store Pages
import HomePage from './pages/store/HomePage';
import ShopPage from './pages/store/ShopPage';
import ProductDetailPage from './pages/store/ProductDetailPage';
import OrderDetailPage from './pages/store/OrderDetailPage';
import CartPage from './pages/store/CartPage';
import CheckoutPage from './pages/store/CheckoutPage';
import OrderConfirmationPage from './pages/store/OrderConfirmationPage';
import OrdersPage from './pages/store/OrdersPage';
import CustomerLoginPage from './pages/store/CustomerLoginPage';
import RegisterPage from './pages/store/RegisterPage';
import AccountPage from './pages/store/AccountPage';
import WishlistPage from './pages/store/WishlistPage';

// Policy & Info Pages
import TermsPage from './pages/store/TermsPage';
import PrivacyPage from './pages/store/PrivacyPage';
import CancellationRefundPage from './pages/store/CancellationRefundPage';
import ShippingExchangePage from './pages/store/ShippingExchangePage';
import ContactPage from './pages/store/ContactPage';
import AboutPage from './pages/store/AboutPage';
import FAQPage from './pages/store/FAQPage';

// Admin Pages
import AdminLoginPage from './pages/admin/AdminLoginPage';
import DashboardPage from './pages/admin/DashboardPage';
import AdminProductsPage from './pages/admin/AdminProductsPage';
import AdminCategoriesPage from './pages/admin/AdminCategoriesPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminCustomersPage from './pages/admin/AdminCustomersPage';
import AdminStaffPage from './pages/admin/AdminStaffPage';
import AdminCouponsPage from './pages/admin/AdminCouponsPage';
import AdminBannersPage from './pages/admin/AdminBannersPage';
import AdminReviewsPage from './pages/admin/AdminReviewsPage';
import AdminInventoryPage from './pages/admin/AdminInventoryPage';
import AdminInwardsOutwardsPage from './pages/admin/AdminInwardsOutwardsPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import AdminReportsPage from './pages/admin/AdminReportsPage';

// Inventory Management Pages
import AdminSuppliersPage from './pages/admin/AdminSuppliersPage';
import AdminB2BCustomersPage from './pages/admin/AdminB2BCustomersPage';
import AdminWarehousesPage from './pages/admin/AdminWarehousesPage';
import AdminPurchaseOrdersPage from './pages/admin/AdminPurchaseOrdersPage';
import AdminGRNPage from './pages/admin/AdminGRNPage';
import AdminPurchaseInvoicesPage from './pages/admin/AdminPurchaseInvoicesPage';
import AdminSalesQuotationsPage from './pages/admin/AdminSalesQuotationsPage';
import AdminSalesOrdersPage from './pages/admin/AdminSalesOrdersPage';
import AdminSalesInvoicesPage from './pages/admin/AdminSalesInvoicesPage';

export default function App() {
  return (
    <Routes>
      {/* Storefront Routes (with Navbar/Footer) */}
      <Route path="/" element={<StoreLayout><HomePage /></StoreLayout>} />
      <Route path="/shop" element={<StoreLayout><ShopPage /></StoreLayout>} />
      <Route path="/shop/:category" element={<StoreLayout><ShopPage /></StoreLayout>} />
      <Route path="/product/:slug" element={<StoreLayout><ProductDetailPage /></StoreLayout>} />
      <Route path="/cart" element={<StoreLayout><CartPage /></StoreLayout>} />
      <Route path="/checkout" element={<StoreLayout><CheckoutPage /></StoreLayout>} />
      <Route path="/order-confirmation/:id" element={<StoreLayout><OrderConfirmationPage /></StoreLayout>} />
      <Route path="/orders" element={<StoreLayout><OrdersPage /></StoreLayout>} />
      <Route path="/orders/:id" element={<StoreLayout><OrderDetailPage /></StoreLayout>} />
      <Route path="/login" element={<StoreLayout><CustomerLoginPage /></StoreLayout>} />
      <Route path="/register" element={<StoreLayout><RegisterPage /></StoreLayout>} />
      <Route path="/account" element={<StoreLayout><AccountPage /></StoreLayout>} />
      <Route path="/wishlist" element={<StoreLayout><WishlistPage /></StoreLayout>} />

      {/* Policy & Info Routes */}
      <Route path="/terms" element={<StoreLayout><TermsPage /></StoreLayout>} />
      <Route path="/privacy" element={<StoreLayout><PrivacyPage /></StoreLayout>} />
      <Route path="/cancellation-refund" element={<StoreLayout><CancellationRefundPage /></StoreLayout>} />
      <Route path="/shipping-exchange" element={<StoreLayout><ShippingExchangePage /></StoreLayout>} />
      <Route path="/contact" element={<StoreLayout><ContactPage /></StoreLayout>} />
      <Route path="/about" element={<StoreLayout><AboutPage /></StoreLayout>} />
      <Route path="/faq" element={<StoreLayout><FAQPage /></StoreLayout>} />

      {/* Admin Portal Specific Login (No Store Layout) */}
      <Route path="/admin/login" element={<AdminLoginPage />} />

      {/* Admin Portal Routes (with Sidebar) */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="products" element={<AdminProductsPage />} />
        <Route path="categories" element={<AdminCategoriesPage />} />
        <Route path="orders" element={<AdminOrdersPage />} />
        <Route path="customers" element={<AdminCustomersPage />} />
        <Route path="staff" element={<AdminStaffPage />} />
        <Route path="coupons" element={<AdminCouponsPage />} />
        <Route path="banners" element={<AdminBannersPage />} />
        <Route path="reviews" element={<AdminReviewsPage />} />
        <Route path="inventory" element={<AdminInventoryPage />} />
        <Route path="inventory-transactions" element={<AdminInwardsOutwardsPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
        <Route path="reports" element={<AdminReportsPage />} />
        {/* Inventory Management Routes */}
        <Route path="suppliers" element={<AdminSuppliersPage />} />
        <Route path="b2b-customers" element={<AdminB2BCustomersPage />} />
        <Route path="warehouses" element={<AdminWarehousesPage />} />
        <Route path="purchase-orders" element={<AdminPurchaseOrdersPage />} />
        <Route path="grn" element={<AdminGRNPage />} />
        <Route path="purchase-invoices" element={<AdminPurchaseInvoicesPage />} />
        <Route path="sales-quotations" element={<AdminSalesQuotationsPage />} />
        <Route path="sales-orders" element={<AdminSalesOrdersPage />} />
        <Route path="sales-invoices" element={<AdminSalesInvoicesPage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={
        <StoreLayout>
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-6xl font-bold text-gray-200">404</h1>
              <p className="text-xl font-medium text-gray-600 mt-4">Page Not Found</p>
              <a href="/" className="btn-primary inline-block mt-6">Go Home</a>
            </div>
          </div>
        </StoreLayout>
      } />
    </Routes>
  );
}

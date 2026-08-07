import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';

import { Community } from './pages/Community';
import { Store } from './pages/Store';
import { Cart } from './pages/Cart';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Admin } from './pages/Admin';
import { Settings } from './pages/Settings';
import { ProductDetail } from './pages/ProductDetail';
import { PurchaseHistory } from './pages/PurchaseHistory';
import { Support } from './pages/Support';
import { ShopOwner } from './pages/ShopOwner';
import { VisionPage } from './pages/VisionPage';
import { Analytics } from './pages/Analytics';
import { TopUp } from './pages/TopUp';
import { SkinTester } from './pages/SkinTester';

export const router = createBrowserRouter([
  // Auth + fullscreen tools (no Layout shell)
  { path: '/login', Component: Login },
  { path: '/register', Component: Register },
  { path: '/skin-tester', Component: SkinTester },
  // Main app shell
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },

      { path: 'community', Component: Community },
      { path: 'store', Component: Store },
      { path: 'cart', Component: Cart },
      { path: 'admin', Component: Admin },
      { path: 'settings', Component: Settings },
      { path: 'product/:id', Component: ProductDetail },
      { path: 'purchase-history', Component: PurchaseHistory },
      { path: 'support', Component: Support },
      { path: 'shop-owner',       Component: ShopOwner },
      { path: 'vision',            Component: VisionPage },
      { path: 'analytics',         Component: Analytics },
      { path: 'top-up',            Component: TopUp },
    ],
  },
]);

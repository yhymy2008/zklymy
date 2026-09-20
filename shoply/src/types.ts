export type Locale = 'zh' | 'en' | 'ja';

/**
 * 多语言字段：{ en: { name, subtitle }, ja: { name, subtitle } }
 * 缺省时回落到实体本身的同名字段（中文）。
 */
export type Translations = Partial<Record<Locale, Record<string, string>>>;

/** 带有多语言文案的实体。 */
export type Localized = { translations?: Translations };

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: 'customer' | 'admin';
  status: 'active' | 'disabled';
  createdAt: string;
  lastLoginAt?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  translations?: Translations;
}

export interface Product {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  categoryId: string;
  price: number;
  originalPrice: number;
  stock: number;
  sales: number;
  rating: number;
  hue: number;
  icon: string;
  status: 'on' | 'off';
  featured: boolean;
  createdAt: string;
  translations?: Translations;
}

export interface CartItem {
  productId: string;
  qty: number;
  product: Product;
}

export interface Cart {
  items: CartItem[];
  totalQty: number;
  totalAmount: number;
}

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'shipped'
  | 'completed'
  | 'cancelled';

export interface OrderGoods {
  productId: string;
  name: string;
  price: number;
  qty: number;
  hue: number;
  icon: string;
  translations?: Translations;
}

export interface OrderTimeline {
  at: string;
  /** 事件码，前端按当前语言渲染；旧数据可能只有 text。 */
  code?: string;
  /** 事件参数，如 { provider, carrier, trackingNo }。 */
  params?: Record<string, string | number>;
  /** 服务端兜底文案（中文），code 无对应词条时使用。 */
  text?: string;
}

export interface Order {
  id: string;
  orderNo: string;
  userId: string;
  userName: string;
  goods: OrderGoods[];
  amount: number;
  discount: number;
  shippingFee: number;
  payAmount: number;
  status: OrderStatus;
  couponCode?: string;
  address: {
    name: string;
    phone: string;
    detail: string;
  };
  providerId: string;
  providerName: string;
  payNo?: string;
  timeline: OrderTimeline[];
  createdAt: string;
  paidAt?: string;
  shippedAt?: string;
  completedAt?: string;
}

export interface PaymentProvider {
  id: string;
  name: string;
  code: string;
  enabled: boolean;
  mode: 'sandbox' | 'live';
  appId: string;
  merchantId: string;
  secret: string;
  feeRate: number;
  sort: number;
  description: string;
  updatedAt: string;
  /** 渠道专属参数（PayPay 的 API 版本 / Webhook 地址 / merchantPaymentId 前缀等）。 */
  extra?: Record<string, string>;
  translations?: Translations;
}

export interface Settings {
  siteName: string;
  slogan: string;
  currency: string;
  shippingFee: number;
  freeShippingThreshold: number;
  supportPhone: string;
  supportEmail: string;
  /** 前台默认语言，未手动切换过时生效。 */
  defaultLocale?: Locale;
  translations?: Translations;
}

export interface Stats {
  userCount: number;
  productCount: number;
  orderCount: number;
  gmv: number;
  pendingOrderCount: number;
  todayOrderCount: number;
  todayGmv: number;
  lowStockCount: number;
  statusCount: Record<OrderStatus, number>;
  recentOrders: Order[];
}

export interface CouponResult {
  valid: boolean;
  message: string;
  code?: string;
  discount?: number;
  label?: string;
  translations?: Translations;
}

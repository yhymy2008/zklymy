import type {
  Cart,
  Category,
  CouponResult,
  Order,
  PaymentProvider,
  Product,
  Settings,
  Stats,
  User,
} from '../types';

const TOKEN_KEY = 'shoply.token';

/**
 * 由 <I18nProvider> 注入：把服务端返回的错误码翻译成当前语言。
 * 返回 undefined 表示没有对应词条，调用方回落到服务端 message。
 */
type ErrorTranslator = (
  code: string,
  params?: Record<string, unknown>
) => string | undefined;

let translateError: ErrorTranslator | null = null;

export function setApiErrorTranslator(fn: ErrorTranslator | null) {
  translateError = fn;
}

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, { ...options, headers });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const code: string | undefined = data?.code;
    const localized = code && translateError ? translateError(code, data?.params) : undefined;
    const message = localized || data?.message || `Request failed (${res.status})`;
    const error = new Error(message) as Error & { code?: string };
    if (code) error.code = code;
    throw error;
  }
  return data as T;
}

const get = <T,>(p: string) => request<T>(p);
const post = <T,>(p: string, body?: unknown) =>
  request<T>(p, { method: 'POST', body: JSON.stringify(body ?? {}) });
const put = <T,>(p: string, body?: unknown) =>
  request<T>(p, { method: 'PUT', body: JSON.stringify(body ?? {}) });
const del = <T,>(p: string, body?: unknown) =>
  request<T>(p, { method: 'DELETE', body: JSON.stringify(body ?? {}) });

export interface ProductQuery {
  keyword?: string;
  categoryId?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export interface Paged<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const api = {
  // ---------- 认证 ----------
  login: (email: string, password: string) =>
    post<{ token: string; user: User }>('/auth/login', { email, password }),
  register: (payload: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }) => post<{ token: string; user: User }>('/auth/register', payload),
  me: () => get<{ user: User }>('/auth/me'),
  updateProfile: (payload: { name?: string; phone?: string }) =>
    put<{ user: User }>('/auth/profile', payload),
  changePassword: (payload: { oldPassword: string; newPassword: string }) =>
    post<{ ok: boolean }>('/auth/password', payload),

  // ---------- 商城 ----------
  settings: () => get<Settings>('/settings'),
  categories: () => get<Category[]>('/categories'),
  products: (q: ProductQuery = {}) => {
    const params = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.set(k, String(v));
    });
    return get<Paged<Product>>(`/products?${params.toString()}`);
  },
  product: (id: string) => get<Product>(`/products/${id}`),

  // ---------- 购物车 ----------
  cart: () => get<Cart>('/cart'),
  addToCart: (productId: string, qty = 1) =>
    post<Cart>('/cart', { productId, qty }),
  updateCart: (productId: string, qty: number) =>
    put<Cart>(`/cart/${productId}`, { qty }),
  removeFromCart: (productId: string) => del<Cart>(`/cart/${productId}`),
  syncCart: (items: { productId: string; qty: number }[]) =>
    post<Cart>('/cart/sync', { items }),

  // ---------- 订单 / 支付 ----------
  providers: () => get<PaymentProvider[]>('/payment-providers'),
  validateCoupon: (code: string, amount: number) =>
    post<CouponResult>('/coupons/validate', { code, amount }),
  checkout: (payload: {
    address: { name: string; phone: string; detail: string };
    providerId: string;
    couponCode?: string;
  }) => post<Order>('/orders/checkout', payload),
  orders: () => get<Order[]>('/orders'),
  order: (id: string) => get<Order>(`/orders/${id}`),
  pay: (id: string) => post<Order>(`/orders/${id}/pay`),
  cancelOrder: (id: string) => post<Order>(`/orders/${id}/cancel`),
  confirmOrder: (id: string) => post<Order>(`/orders/${id}/confirm`),

  // ---------- 后台管理 ----------
  admin: {
    stats: () => get<Stats>('/admin/stats'),
    products: () => get<Product[]>('/admin/products'),
    createProduct: (payload: Partial<Product>) =>
      post<Product>('/admin/products', payload),
    updateProduct: (id: string, payload: Partial<Product>) =>
      put<Product>(`/admin/products/${id}`, payload),
    deleteProduct: (id: string) => del<{ ok: boolean }>(`/admin/products/${id}`),

    orders: (status?: string) =>
      get<Order[]>(`/admin/orders${status ? `?status=${status}` : ''}`),
    updateOrderStatus: (id: string, status: Order['status']) =>
      put<Order>(`/admin/orders/${id}`, { status }),

    users: () => get<User[]>('/admin/users'),
    updateUser: (
      id: string,
      payload: { role?: User['role']; status?: User['status']; name?: string }
    ) => put<User>(`/admin/users/${id}`, payload),
    resetPassword: (id: string, password: string) =>
      post<{ ok: boolean }>(`/admin/users/${id}/password`, { password }),

    providers: () => get<PaymentProvider[]>('/admin/providers'),
    updateProvider: (id: string, payload: Partial<PaymentProvider>) =>
      put<PaymentProvider>(`/admin/providers/${id}`, payload),
    testProvider: (id: string) => post<{ ok: boolean; message: string }>(`/admin/providers/${id}/test`),

    settings: () => get<Settings>('/admin/settings'),
    updateSettings: (payload: Partial<Settings>) =>
      put<Settings>('/admin/settings', payload),
  },
};

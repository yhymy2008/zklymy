import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';
import type { Cart, CartItem, Product } from '../types';

const GUEST_KEY = 'shoply.guestCart';

const readGuest = (): CartItem[] => {
  try {
    return JSON.parse(localStorage.getItem(GUEST_KEY) || '[]');
  } catch {
    return [];
  }
};

function toCart(items: CartItem[]): Cart {
  const totalQty = items.reduce((s, i) => s + i.qty, 0);
  const totalAmount = items.reduce((s, i) => s + i.qty * i.product.price, 0);
  return { items, totalQty, totalAmount };
}

interface CartValue {
  cart: Cart;
  loading: boolean;
  add: (product: Product, qty?: number) => Promise<void>;
  setQty: (productId: string, qty: number) => Promise<void>;
  remove: (productId: string) => Promise<void>;
  clear: () => Promise<void>;
  refresh: () => Promise<void>;
}

const CartCtx = createContext<CartValue>(null as unknown as CartValue);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [serverCart, setServerCart] = useState<Cart>({
    items: [],
    totalQty: 0,
    totalAmount: 0,
  });
  const [guestCart, setGuestCart] = useState<CartItem[]>(readGuest);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setGuestCart(readGuest());
      return;
    }
    setLoading(true);
    try {
      setServerCart(await api.cart());
    } catch {
      setServerCart({ items: [], totalQty: 0, totalAmount: 0 });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // 登录后把游客购物车合并到服务端
  useEffect(() => {
    if (!user) return;
    const guest = readGuest();
    if (!guest.length) return;
    api
      .syncCart(guest.map((i) => ({ productId: i.productId, qty: i.qty })))
      .then((c) => {
        setServerCart(c);
        localStorage.removeItem(GUEST_KEY);
        setGuestCart([]);
      })
      .catch(() => {});
  }, [user]);

  const writeGuest = (items: CartItem[]) => {
    localStorage.setItem(GUEST_KEY, JSON.stringify(items));
    setGuestCart(items);
  };

  const cart = useMemo(
    () => (user ? serverCart : toCart(guestCart)),
    [user, serverCart, guestCart]
  );

  const add = async (product: Product, qty = 1) => {
    if (user) {
      setServerCart(await api.addToCart(product.id, qty));
      return;
    }
    const items = readGuest();
    const hit = items.find((i) => i.productId === product.id);
    if (hit) hit.qty += qty;
    else items.push({ productId: product.id, qty, product });
    writeGuest(items);
  };

  const setQty = async (productId: string, qty: number) => {
    if (user) {
      setServerCart(await api.updateCart(productId, qty));
      return;
    }
    const items = readGuest()
      .map((i) => (i.productId === productId ? { ...i, qty } : i))
      .filter((i) => i.qty > 0);
    writeGuest(items);
  };

  const remove = async (productId: string) => {
    if (user) {
      setServerCart(await api.removeFromCart(productId));
      return;
    }
    writeGuest(readGuest().filter((i) => i.productId !== productId));
  };

  const clear = async () => {
    if (user) {
      const c = await api.cart();
      for (const i of c.items) {
        await api.removeFromCart(i.productId);
      }
      await refresh();
      return;
    }
    writeGuest([]);
  };

  const value = useMemo<CartValue>(
    () => ({ cart, loading, add, setQty, remove, clear, refresh }),
    [cart, loading, add, setQty, remove, clear, refresh]
  );

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export const useCart = () => useContext(CartCtx);

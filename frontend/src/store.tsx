import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, Cart, Product, User, Order } from "./api";
import { storage } from "./utils/storage";

type Store = { user: User | null; token: string | null; cart: Cart; loading: boolean; wishlist: string[]; orders: Order[]; refresh: () => Promise<void>; login: (email: string, password: string) => Promise<void>; register: (name: string, email: string, password: string) => Promise<void>; logout: () => Promise<void>; addToCart: (product: Product, size: string, color: string) => Promise<void>; updateQuantity: (id: string, quantity: number) => Promise<void>; removeItem: (id: string) => Promise<void>; toggleWishlist: (id: string) => Promise<void>; createOrder: (address: Record<string, string>) => Promise<Order>; loadOrders: () => Promise<void> };
const emptyCart: Cart = { items: [], subtotal: 0, shipping: 0, total: 0 };
const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState(emptyCart);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!token) return;
    const [nextCart, nextWishlist] = await Promise.all([api<Cart>("/cart", {}, token), api<Product[]>("/wishlist", {}, token)]);
    setCart(nextCart); setWishlist(nextWishlist.map((item) => item.id));
  }, [token]);

  useEffect(() => { storage.secureGet<string | null>("auth_token", null).then(async (saved) => { if (saved) { setToken(saved); try { const me = await api<User>("/auth/me", {}, saved); setUser(me); } catch { await storage.secureRemove("auth_token"); } } setLoading(false); }); }, []);
  useEffect(() => { if (token) refresh().catch(() => undefined); }, [token, refresh]);

  const completeAuth = async (result: { token: string; user: User }) => { setToken(result.token); setUser(result.user); await storage.secureSet("auth_token", result.token); };
  const login = async (email: string, password: string) => completeAuth(await api("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }));
  const register = async (name: string, email: string, password: string) => completeAuth(await api("/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) }));
  const logout = async () => { await storage.secureRemove("auth_token"); setToken(null); setUser(null); setCart(emptyCart); setWishlist([]); setOrders([]); };
  const addToCart = async (product: Product, size: string, color: string) => setCart(await api("/cart/items", { method: "POST", body: JSON.stringify({ product_id: product.id, size, color, quantity: 1 }) }, token ?? undefined));
  const updateQuantity = async (id: string, quantity: number) => setCart(await api(`/cart/items/${id}?quantity=${quantity}`, { method: "PATCH" }, token ?? undefined));
  const removeItem = async (id: string) => setCart(await api(`/cart/items/${id}`, { method: "DELETE" }, token ?? undefined));
  const toggleWishlist = async (id: string) => { const result = await api<{ saved: boolean }>("/wishlist/toggle", { method: "POST", body: JSON.stringify({ product_id: id }) }, token ?? undefined); setWishlist((current) => result.saved ? [...current, id] : current.filter((item) => item !== id)); };
  const createOrder = async (address: Record<string, string>) => { const order = await api<Order>("/orders", { method: "POST", body: JSON.stringify({ address, payment_method: "cod" }) }, token ?? undefined); setCart(emptyCart); setOrders((current) => [order, ...current]); return order; };
  const loadOrders = async () => { if (token) setOrders(await api<Order[]>("/orders", {}, token)); };
  const value = useMemo(() => ({ user, token, cart, loading, wishlist, orders, refresh, login, register, logout, addToCart, updateQuantity, removeItem, toggleWishlist, createOrder, loadOrders }), [user, token, cart, loading, wishlist, orders, refresh]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() { const value = useContext(StoreContext); if (!value) throw new Error("useStore must be used inside StoreProvider"); return value; }
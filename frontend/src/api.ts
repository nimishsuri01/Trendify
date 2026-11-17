import Constants from "expo-constants";

const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.backendUrl || "http://localhost:8000";
export const API_BASE = `${baseUrl.replace(/\/$/, "")}/api`;

export async function api<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers ?? {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail ?? "Something went wrong");
  return data as T;
}

export type Product = { id: string; name: string; category: string; gender: string; price: number; original_price?: number; image_key: string; description: string; sizes: string[]; colors: string[]; rating: number; reviews: number; badge?: string };
export type User = { id: string; name: string; email: string; role: "customer" | "admin" };
export type CartItem = { id: string; product_id: string; name: string; price: number; image_key: string; size: string; color: string; quantity: number };
export type Cart = { items: CartItem[]; subtotal: number; shipping: number; total: number };
export type Order = { id: string; items: CartItem[]; address: Record<string, string>; subtotal: number; shipping: number; total: number; payment_method: string; status: string; created_at: string; timeline: { label: string; done: boolean; date?: string }[] };

export const money = (value: number) => `₹${value.toLocaleString("en-IN")}`;
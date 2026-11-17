import asyncio
import hashlib
import hmac
import json
import logging
import os
import socket
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal, Optional

import bcrypt
import jwt
import requests
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from pymongo import ASCENDING, DESCENDING, IndexModel

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
JWT_SECRET = os.environ.get("JWT_SECRET", "trendify-development-secret-change-me")
JWT_ALGORITHM = "HS256"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("trendify")

# ---------------------------------------------------------------------------
# Fallback Local Persistent Storage (when MongoDB is not running)
# ---------------------------------------------------------------------------
class LocalCursor:
    def __init__(self, collection: "LocalCollection", filter_doc: Optional[dict[str, Any]] = None, projection: Optional[dict[str, Any]] = None):
        self.collection = collection
        self.filter = filter_doc or {}
        self.projection = projection or {}
        self._sort_key = None
        self._sort_dir = 1

    def sort(self, key_or_list: Any, direction: int = 1) -> "LocalCursor":
        if isinstance(key_or_list, list):
            self._sort_key, self._sort_dir = key_or_list[0]
        else:
            self._sort_key = key_or_list
            self._sort_dir = direction
        return self

    async def to_list(self, limit: int = 100) -> list[dict[str, Any]]:
        items = [dict(i) for i in self.collection.db._get_items(self.collection.name) if self.collection._matches(i, self.filter)]
        if self._sort_key:
            rev = (self._sort_dir == -1 or str(self._sort_dir).lower() in ["descending", "-1"])
            items.sort(
                key=lambda x: x.get(self._sort_key, 0) if isinstance(x.get(self._sort_key), (int, float)) else str(x.get(self._sort_key, "")),
                reverse=rev,
            )
        if self.projection:
            for item in items:
                if self.projection.get("_id") == 0:
                    item.pop("_id", None)
                if self.projection.get("user_id") == 0:
                    item.pop("user_id", None)
        return items[:limit]


class LocalCollection:
    def __init__(self, name: str, db: "LocalDatabase"):
        self.name = name
        self.db = db

    def _matches(self, item: dict[str, Any], filter_doc: Optional[dict[str, Any]]) -> bool:
        if not filter_doc:
            return True
        for k, v in filter_doc.items():
            if k == "$or":
                if not any(self._matches(item, sub) for sub in v):
                    return False
            elif isinstance(v, dict):
                if "$regex" in v:
                    pattern = str(v["$regex"])
                    ignore_case = v.get("$options") == "i"
                    val = str(item.get(k, ""))
                    if ignore_case:
                        if pattern.lower() not in val.lower():
                            return False
                    elif pattern not in val:
                        return False
            else:
                if item.get(k) != v:
                    return False
        return True

    async def find_one(self, filter_doc: Optional[dict[str, Any]] = None, projection: Optional[dict[str, Any]] = None) -> Optional[dict[str, Any]]:
        items = self.db._get_items(self.name)
        for item in items:
            if self._matches(item, filter_doc):
                res = dict(item)
                if projection:
                    if projection.get("_id") == 0:
                        res.pop("_id", None)
                    if projection.get("user_id") == 0:
                        res.pop("user_id", None)
                return res
        return None

    async def insert_one(self, doc: dict[str, Any]) -> Any:
        d = dict(doc)
        if "_id" not in d:
            d["_id"] = str(uuid.uuid4())
        self.db._add_item(self.name, d)
        return True

    async def insert_many(self, docs: list[dict[str, Any]]) -> Any:
        for doc in docs:
            await self.insert_one(doc)
        return True

    async def count_documents(self, filter_doc: Optional[dict[str, Any]] = None) -> int:
        items = self.db._get_items(self.name)
        return len([i for i in items if self._matches(i, filter_doc)])

    async def delete_one(self, filter_doc: dict[str, Any]) -> Any:
        items = self.db._get_items(self.name)
        for idx, item in enumerate(items):
            if self._matches(item, filter_doc):
                items.pop(idx)
                self.db._save()
                class Res:
                    deleted_count = 1
                return Res()
        class Res:
            deleted_count = 0
        return Res()

    async def replace_one(self, filter_doc: dict[str, Any], replacement: dict[str, Any], upsert: bool = False) -> Any:
        items = self.db._get_items(self.name)
        for idx, item in enumerate(items):
            if self._matches(item, filter_doc):
                d = dict(replacement)
                if "_id" not in d and "_id" in item:
                    d["_id"] = item["_id"]
                items[idx] = d
                self.db._save()
                return True
        if upsert:
            await self.insert_one(replacement)
        return True

    async def update_one(self, filter_doc: dict[str, Any], update_doc: dict[str, Any]) -> Any:
        items = self.db._get_items(self.name)
        set_vals = update_doc.get("$set", {})
        for idx, item in enumerate(items):
            if self._matches(item, filter_doc):
                item.update(set_vals)
                self.db._save()
                class Res:
                    matched_count = 1
                return Res()
        class Res:
            matched_count = 0
        return Res()

    def find(self, filter_doc: Optional[dict[str, Any]] = None, projection: Optional[dict[str, Any]] = None) -> LocalCursor:
        return LocalCursor(self, filter_doc, projection)

    async def create_indexes(self, models: list[Any]) -> bool:
        return True


class LocalDatabase:
    def __init__(self, filepath: Path):
        self.filepath = filepath
        self.data: dict[str, list[dict[str, Any]]] = {"users": [], "products": [], "orders": [], "carts": []}
        self._load()

    def _load(self) -> None:
        if self.filepath.exists():
            try:
                with open(self.filepath, "r", encoding="utf-8") as f:
                    self.data = json.load(f)
            except Exception:
                pass
        else:
            self._save()

    def _save(self) -> None:
        self.filepath.parent.mkdir(parents=True, exist_ok=True)
        with open(self.filepath, "w", encoding="utf-8") as f:
            json.dump(self.data, f, indent=2, default=str)

    def _get_items(self, collection_name: str) -> list[dict[str, Any]]:
        if collection_name not in self.data:
            self.data[collection_name] = []
        return self.data[collection_name]

    def _add_item(self, collection_name: str, item: dict[str, Any]) -> None:
        self._get_items(collection_name).append(item)
        self._save()

    def __getitem__(self, collection_name: str) -> LocalCollection:
        return LocalCollection(collection_name, self)

    @property
    def users(self) -> LocalCollection:
        return self["users"]

    @property
    def products(self) -> LocalCollection:
        return self["products"]

    @property
    def orders(self) -> LocalCollection:
        return self["orders"]

    @property
    def carts(self) -> LocalCollection:
        return self["carts"]


class DatabaseProxy:
    def __init__(self) -> None:
        self._instance: Any = None
        self._mode: str = "local"
        self._motor_client: Optional[AsyncIOMotorClient] = None

    def ensure_init(self) -> None:
        if self._instance is None:
            self._instance = LocalDatabase(ROOT_DIR / "data" / "db.json")
            self._mode = "local"

    def set_mongo(self, motor_db: Any, client: AsyncIOMotorClient) -> None:
        self._instance = motor_db
        self._motor_client = client
        self._mode = "mongo"

    def set_local(self) -> None:
        self._instance = LocalDatabase(ROOT_DIR / "data" / "db.json")
        self._mode = "local"

    def __getattr__(self, name: str) -> Any:
        self.ensure_init()
        return getattr(self._instance, name)

    def __getitem__(self, name: str) -> Any:
        self.ensure_init()
        return self._instance[name]


db = DatabaseProxy()

app = FastAPI(title="TRENDIFY API", version="1.0.0")
api_router = APIRouter(prefix="/api")

INDEXES = {
    "users": [IndexModel([("email", ASCENDING)], name="email_unique", unique=True)],
    "products": [IndexModel([("category", ASCENDING)], name="category_idx")],
    "orders": [IndexModel([("user_id", ASCENDING)], name="user_orders_idx")],
}


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def clean_doc(doc: Optional[dict[str, Any]]) -> Optional[dict[str, Any]]:
    if not doc:
        return None
    doc.pop("_id", None)
    return doc


def public_product(product: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in product.items() if key not in {"_id", "stock_count"}}


def create_token(user: dict[str, Any]) -> str:
    return jwt.encode(
        {"sub": user["id"], "email": user["email"], "role": user["role"], "exp": int(datetime.now(timezone.utc).timestamp()) + 60 * 60 * 24 * 7},
        JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )


async def current_user(authorization: Optional[str] = Header(default=None)) -> dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Please sign in to continue")
    try:
        payload = jwt.decode(authorization.split(" ", 1)[1], JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Your session has expired") from exc
    user = await db.users.find_one({"id": payload.get("sub")}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Account not found")
    return user


async def admin_user(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


class RegisterInput(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class CartItemInput(BaseModel):
    product_id: str
    size: str = Field(min_length=1, max_length=12)
    color: str = Field(min_length=1, max_length=30)
    quantity: int = Field(default=1, ge=1, le=10)


class AddressInput(BaseModel):
    full_name: str = Field(min_length=2, max_length=80)
    phone: str = Field(min_length=8, max_length=20)
    email: EmailStr
    line1: str = Field(min_length=4, max_length=120)
    city: str = Field(min_length=2, max_length=60)
    state: str = Field(min_length=2, max_length=60)
    pincode: str = Field(min_length=4, max_length=12)


class OrderInput(BaseModel):
    address: AddressInput
    payment_method: Literal["cod", "razorpay"] = "cod"


class WishlistInput(BaseModel):
    product_id: str


class ProductInput(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    category: str
    gender: str
    price: int = Field(gt=0)
    original_price: Optional[int] = None
    image_key: str
    description: str = Field(min_length=10)
    sizes: list[str] = Field(min_length=1)
    colors: list[str] = Field(min_length=1)
    stock_count: int = Field(default=20, ge=0)


class StatusInput(BaseModel):
    status: str


PRODUCTS = [
    {"id": "p1", "name": "Essential Oversized Tee", "category": "T-Shirts", "gender": "Unisex", "price": 1299, "original_price": 1799, "image_key": "tee", "description": "A heavyweight cotton tee with a relaxed silhouette and clean, everyday finish.", "sizes": ["S", "M", "L", "XL"], "colors": ["Jet Black", "Cloud White"], "rating": 4.8, "reviews": 124, "stock_count": 32, "badge": "Bestseller"},
    {"id": "p2", "name": "Studio Utility Jacket", "category": "Jackets", "gender": "Men", "price": 3499, "original_price": 4299, "image_key": "jacket", "description": "A structured utility layer cut from durable cotton twill with considered pocket details.", "sizes": ["S", "M", "L", "XL"], "colors": ["Stone", "Ink"], "rating": 4.7, "reviews": 86, "stock_count": 14, "badge": "New"},
    {"id": "p3", "name": "Relaxed Straight Denim", "category": "Jeans", "gender": "Women", "price": 2899, "original_price": 3499, "image_key": "denim", "description": "A softly structured straight-leg jean designed to sit comfortably from day to night.", "sizes": ["26", "28", "30", "32"], "colors": ["Washed Blue", "Deep Indigo"], "rating": 4.9, "reviews": 210, "stock_count": 21, "badge": "Trending"},
    {"id": "p4", "name": "Tailored Wide Trousers", "category": "Trousers", "gender": "Women", "price": 2399, "original_price": 2999, "image_key": "trousers", "description": "High-rise tailored trousers with a wide leg and fluid drape for polished movement.", "sizes": ["26", "28", "30", "32"], "colors": ["Oat", "Black"], "rating": 4.6, "reviews": 64, "stock_count": 18, "badge": "New"},
    {"id": "p5", "name": "Cloudline Hoodie", "category": "Hoodies", "gender": "Unisex", "price": 2199, "original_price": 2799, "image_key": "hoodie", "description": "Brushed fleece, dropped shoulders and a clean embroidered mark make this a daily essential.", "sizes": ["S", "M", "L", "XL"], "colors": ["Heather Grey", "Black"], "rating": 4.8, "reviews": 152, "stock_count": 27, "badge": "Bestseller"},
    {"id": "p6", "name": "Satin Slip Dress", "category": "Dresses", "gender": "Women", "price": 2699, "original_price": 3299, "image_key": "dress", "description": "A fluid satin slip dress with a softly cowl neckline and adjustable straps.", "sizes": ["XS", "S", "M", "L"], "colors": ["Moss", "Black"], "rating": 4.7, "reviews": 91, "stock_count": 11, "badge": "Limited"},
    {"id": "p7", "name": "Everyday Canvas Cap", "category": "Accessories", "gender": "Unisex", "price": 799, "original_price": 999, "image_key": "cap", "description": "A six-panel canvas cap finished with an understated tonal TRENDIFY mark.", "sizes": ["One Size"], "colors": ["Black", "Cream"], "rating": 4.5, "reviews": 42, "stock_count": 48, "badge": "Essential"},
    {"id": "p8", "name": "Linen Overshirt", "category": "Shirts", "gender": "Men", "price": 1999, "original_price": 2499, "image_key": "shirt", "description": "An airy linen-cotton overshirt that layers easily through warmer days and cooler nights.", "sizes": ["S", "M", "L", "XL"], "colors": ["Ecru", "Olive"], "rating": 4.6, "reviews": 72, "stock_count": 25, "badge": "New"},
]


async def seed_data() -> None:
    if await db.products.count_documents({}) == 0:
        await db.products.insert_many(PRODUCTS)
    admin_email = "admin@trendify.com"
    if not await db.users.find_one({"email": admin_email}):
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "name": "TRENDIFY Admin",
            "email": admin_email,
            "password_hash": bcrypt.hashpw(b"TrendifyAdmin!2026", bcrypt.gensalt()).decode(),
            "role": "admin",
            "wishlist": [],
            "created_at": now(),
        })


async def ensure_indexes() -> None:
    if db._mode == "mongo":
        for collection, models in INDEXES.items():
            for model in models:
                try:
                    await db[collection].create_indexes([model])
                except Exception as exc:
                    logger.warning("index %s skipped: %s", model.document.get("name"), exc)


@app.get("/health", include_in_schema=False)
@app.head("/health", include_in_schema=False)
async def health() -> dict[str, str]:
    return {"status": "ok", "mode": db._mode}


@api_router.get("/")
async def root() -> dict[str, str]:
    return {"message": "TRENDIFY API", "storage": db._mode}


@api_router.post("/auth/register")
async def register(body: RegisterInput) -> dict[str, Any]:
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(409, "An account with this email already exists")
    user = {
        "id": str(uuid.uuid4()),
        "name": body.name.strip(),
        "email": email,
        "password_hash": bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode(),
        "role": "customer",
        "wishlist": [],
        "created_at": now(),
    }
    await db.users.insert_one(user)
    return {"token": create_token(user), "user": {"id": user["id"], "name": user["name"], "email": user["email"], "role": user["role"]}}


@api_router.post("/auth/login")
async def login(body: LoginInput) -> dict[str, Any]:
    user = await db.users.find_one({"email": body.email.lower()})
    if not user or not bcrypt.checkpw(body.password.encode(), user["password_hash"].encode()):
        raise HTTPException(401, "Email or password is incorrect")
    return {"token": create_token(user), "user": {"id": user["id"], "name": user["name"], "email": user["email"], "role": user["role"]}}


@api_router.get("/auth/me")
async def me(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    return {"id": user["id"], "name": user["name"], "email": user["email"], "role": user["role"]}


@api_router.get("/products")
async def list_products(
    category: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    sort: str = Query(default="newest"),
    limit: int = Query(default=30, ge=1, le=100),
) -> list[dict[str, Any]]:
    query: dict[str, Any] = {}
    if category and category.lower() not in {"all", "new arrivals", ""}:
        query["category"] = category
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
        ]
    sort_field = "created_at"
    sort_dir = DESCENDING
    if sort == "price_low":
        sort_field = "price"
        sort_dir = ASCENDING
    elif sort == "price_high":
        sort_field = "price"
        sort_dir = DESCENDING
    products = await db.products.find(query, {"_id": 0}).sort(sort_field, sort_dir).to_list(limit)
    return [public_product(p) for p in products]


@api_router.get("/products/{product_id}")
async def get_product(product_id: str) -> dict[str, Any]:
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(404, "Product not found")
    return public_product(product)


@api_router.get("/wishlist")
async def get_wishlist(user: dict[str, Any] = Depends(current_user)) -> list[dict[str, Any]]:
    user_doc = await db.users.find_one({"id": user["id"]}) or {}
    ids = user_doc.get("wishlist", [])
    if not ids:
        return []
    products = await db.products.find({"id": {"$in": ids}}, {"_id": 0}).to_list(100)
    return [public_product(p) for p in products]


@api_router.post("/wishlist/toggle")
async def toggle_wishlist(body: WishlistInput, user: dict[str, Any] = Depends(current_user)) -> dict[str, bool]:
    user_doc = await db.users.find_one({"id": user["id"]}) or {}
    wishlist = list(user_doc.get("wishlist", []))
    saved = body.product_id not in wishlist
    if saved:
        wishlist.append(body.product_id)
    else:
        wishlist = [p for p in wishlist if p != body.product_id]
    await db.users.update_one({"id": user["id"]}, {"$set": {"wishlist": wishlist}})
    return {"saved": saved}


@api_router.get("/cart")
async def get_cart(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    cart = await db.carts.find_one({"user_id": user["id"]}, {"_id": 0})
    if not cart:
        return {"items": [], "subtotal": 0, "shipping": 0, "total": 0}
    items = cart.get("items", [])
    subtotal = sum(item["price"] * item["quantity"] for item in items)
    shipping = 0 if subtotal == 0 or subtotal >= 2500 else 99
    return {"items": items, "subtotal": subtotal, "shipping": shipping, "total": subtotal + shipping}


@api_router.post("/cart/items")
async def add_to_cart(body: CartItemInput, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    product = await db.products.find_one({"id": body.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(404, "Product not found")
    cart = await db.carts.find_one({"user_id": user["id"]}) or {"user_id": user["id"], "items": []}
    items = list(cart.get("items", []))
    existing = next((i for i in items if i["product_id"] == body.product_id and i["size"] == body.size and i["color"] == body.color), None)
    if existing:
        existing["quantity"] = min(existing["quantity"] + body.quantity, 10)
    else:
        items.append({
            "id": f"ci-{uuid.uuid4().hex[:8]}",
            "product_id": body.product_id,
            "name": product["name"],
            "price": product["price"],
            "image_key": product["image_key"],
            "size": body.size,
            "color": body.color,
            "quantity": body.quantity,
        })
    subtotal = sum(i["price"] * i["quantity"] for i in items)
    shipping = 0 if subtotal >= 2500 else 99
    cart_doc = {"user_id": user["id"], "items": items, "subtotal": subtotal, "shipping": shipping, "total": subtotal + shipping}
    await db.carts.replace_one({"user_id": user["id"]}, cart_doc, upsert=True)
    return clean_doc(cart_doc) or {}


@api_router.patch("/cart/items/{item_id}")
async def update_cart_item(item_id: str, quantity: int = Query(ge=1, le=10), user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    cart = await db.carts.find_one({"user_id": user["id"]})
    if not cart:
        raise HTTPException(404, "Cart not found")
    items = list(cart.get("items", []))
    target = next((i for i in items if i["id"] == item_id), None)
    if not target:
        raise HTTPException(404, "Item not found in bag")
    target["quantity"] = quantity
    subtotal = sum(i["price"] * i["quantity"] for i in items)
    shipping = 0 if subtotal >= 2500 else 99
    cart_doc = {"user_id": user["id"], "items": items, "subtotal": subtotal, "shipping": shipping, "total": subtotal + shipping}
    await db.carts.replace_one({"user_id": user["id"]}, cart_doc, upsert=True)
    return clean_doc(cart_doc) or {}


@api_router.delete("/cart/items/{item_id}")
async def delete_cart_item(item_id: str, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    cart = await db.carts.find_one({"user_id": user["id"]})
    if not cart:
        raise HTTPException(404, "Cart not found")
    items = [i for i in cart.get("items", []) if i["id"] != item_id]
    subtotal = sum(i["price"] * i["quantity"] for i in items)
    shipping = 0 if subtotal >= 2500 or subtotal == 0 else 99
    cart_doc = {"user_id": user["id"], "items": items, "subtotal": subtotal, "shipping": shipping, "total": subtotal + shipping}
    await db.carts.replace_one({"user_id": user["id"]}, cart_doc, upsert=True)
    return clean_doc(cart_doc) or {}


@api_router.post("/orders")
async def create_order(body: OrderInput, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    cart = await db.carts.find_one({"user_id": user["id"]}, {"_id": 0})
    if not cart or not cart.get("items"):
        raise HTTPException(400, "Your bag is empty")
    subtotal = sum(item["price"] * item["quantity"] for item in cart["items"])
    shipping = 0 if subtotal >= 2500 else 99
    order = {
        "id": f"TRD-{uuid.uuid4().hex[:8].upper()}",
        "user_id": user["id"],
        "items": cart["items"],
        "address": body.address.model_dump(),
        "subtotal": subtotal,
        "shipping": shipping,
        "total": subtotal + shipping,
        "payment_method": "cod",
        "status": "Order Placed",
        "created_at": now(),
        "timeline": [
            {"label": "Order Placed", "done": True, "date": now()},
            {"label": "Confirmed", "done": False},
            {"label": "Shipped", "done": False},
            {"label": "Delivered", "done": False},
        ],
    }
    await db.orders.insert_one(order)
    await db.carts.replace_one({"user_id": user["id"]}, {"user_id": user["id"], "items": []}, upsert=True)
    return clean_doc(order) or {}


@api_router.get("/orders")
async def list_orders(user: dict[str, Any] = Depends(current_user)) -> list[dict[str, Any]]:
    return await db.orders.find({"user_id": user["id"]}, {"_id": 0, "user_id": 0}).sort("created_at", DESCENDING).to_list(100)


@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    order = await db.orders.find_one({"id": order_id, "user_id": user["id"]}, {"_id": 0, "user_id": 0})
    if not order:
        raise HTTPException(404, "Order not found")
    return order


@api_router.get("/admin/overview")
async def admin_overview(_: dict[str, Any] = Depends(admin_user)) -> dict[str, Any]:
    orders = await db.orders.find({}, {"_id": 0}).to_list(1000)
    return {
        "revenue": sum(order.get("total", 0) for order in orders if order.get("status") != "Cancelled"),
        "orders": len(orders),
        "customers": await db.users.count_documents({"role": "customer"}),
        "products": await db.products.count_documents({}),
        "pending": len([order for order in orders if order.get("status") == "Order Placed"]),
    }


@api_router.get("/admin/products")
async def admin_products(_: dict[str, Any] = Depends(admin_user)) -> list[dict[str, Any]]:
    return await db.products.find({}, {"_id": 0}).sort("name", ASCENDING).to_list(200)


@api_router.post("/admin/products")
async def admin_create_product(body: ProductInput, _: dict[str, Any] = Depends(admin_user)) -> dict[str, Any]:
    product = {"id": f"p-{uuid.uuid4().hex[:8]}", **body.model_dump(), "rating": 0, "reviews": 0, "badge": "New"}
    await db.products.insert_one(product)
    return clean_doc(product) or {}


@api_router.delete("/admin/products/{product_id}")
async def admin_delete_product(product_id: str, _: dict[str, Any] = Depends(admin_user)) -> dict[str, bool]:
    result = await db.products.delete_one({"id": product_id})
    if not result.deleted_count:
        raise HTTPException(404, "Product not found")
    return {"deleted": True}


@api_router.get("/admin/orders")
async def admin_orders(_: dict[str, Any] = Depends(admin_user)) -> list[dict[str, Any]]:
    return await db.orders.find({}, {"_id": 0}).sort("created_at", DESCENDING).to_list(200)


@api_router.patch("/admin/orders/{order_id}")
async def admin_update_order(order_id: str, body: StatusInput, _: dict[str, Any] = Depends(admin_user)) -> dict[str, Any]:
    allowed = {"Order Placed", "Confirmed", "Processing", "Shipped", "Out for Delivery", "Delivered", "Cancelled", "Return Requested", "Refunded"}
    if body.status not in allowed:
        raise HTTPException(400, "Unsupported order status")
    progress = {"Order Placed": 0, "Confirmed": 1, "Processing": 1, "Shipped": 2, "Out for Delivery": 2, "Delivered": 3}
    progress_index = progress.get(body.status, 0)
    timeline = [
        {"label": "Order Placed", "done": True},
        {"label": "Confirmed", "done": progress_index >= 1},
        {"label": "Shipped", "done": progress_index >= 2},
        {"label": "Delivered", "done": progress_index >= 3},
    ]
    result = await db.orders.update_one({"id": order_id}, {"$set": {"status": body.status, "timeline": timeline}})
    if not result.matched_count:
        raise HTTPException(404, "Order not found")
    return {"updated": True}


app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


def check_mongo_alive(url: str) -> bool:
    try:
        host, port = "127.0.0.1", 27017
        if "://" in url:
            part = url.split("://", 1)[1].split("/", 1)[0].split("@")[-1]
            if ":" in part:
                h, p = part.split(":", 1)
                host = "127.0.0.1" if h in ("localhost", "127.0.0.1") else h
                port = int(p.split("?")[0])
            else:
                h = part.split("?")[0]
                host = "127.0.0.1" if h in ("localhost", "127.0.0.1") else h
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(0.1)
        res = s.connect_ex((host, port))
        s.close()
        return res == 0
    except Exception:
        return False


@app.on_event("startup")
async def startup() -> None:
    if check_mongo_alive(mongo_url):
        try:
            motor_client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=2000)
            await motor_client.admin.command("ping")
            db.set_mongo(motor_client[os.environ.get("DB_NAME", "trendify")], motor_client)
            logger.info("Connected to MongoDB successfully.")
        except Exception as exc:
            logger.warning("MongoDB ping failed (%s). Using local persistent JSON storage.", exc)
            db.set_local()
    else:
        logger.info("MongoDB not running on %s. Using local persistent JSON storage (data/db.json).", mongo_url)
        db.set_local()
    await ensure_indexes()
    await seed_data()


@app.on_event("shutdown")
async def shutdown() -> None:
    if db._motor_client:
        db._motor_client.close()

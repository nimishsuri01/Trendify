import asyncio
from server import startup, db

async def main():
    await startup()
    count = await db.products.count_documents({})
    users = await db.users.count_documents({})
    print(f"Database initialized! Mode: {db._mode}, Products: {count}, Users: {users}")

if __name__ == "__main__":
    asyncio.run(main())

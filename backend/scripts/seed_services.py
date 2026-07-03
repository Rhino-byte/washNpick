"""Seed services from env. Also runs automatically on API startup."""
import asyncio

from app.core.database import AsyncSessionLocal
from app.services.pricing import seed_services_from_env


async def main() -> None:
    async with AsyncSessionLocal() as db:
        await seed_services_from_env(db)
        await db.commit()
    print("Services seeded from environment.")


if __name__ == "__main__":
    asyncio.run(main())

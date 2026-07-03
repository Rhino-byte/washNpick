from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import admin, auth, health, locations, orders, payments, services, users
from app.core.config import get_settings
from app.core.database import AsyncSessionLocal
from app.core.deps import init_firebase
from app.services.pricing import seed_services_from_env


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_firebase()
    async with AsyncSessionLocal() as db:
        await seed_services_from_env(db)
        await db.commit()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="WashnPick API", version="1.0.0", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    prefix = settings.api_prefix
    app.include_router(health.router)
    app.include_router(auth.router, prefix=prefix)
    app.include_router(users.router, prefix=prefix)
    app.include_router(services.router, prefix=prefix)
    app.include_router(locations.service_areas_router, prefix=prefix)
    app.include_router(locations.locations_router, prefix=prefix)
    app.include_router(orders.router, prefix=prefix)
    app.include_router(payments.router, prefix=prefix)
    app.include_router(admin.router, prefix=prefix)

    return app


app = create_app()

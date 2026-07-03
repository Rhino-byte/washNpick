import re
from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def normalize_database_url(url: str) -> str:
    """Neon gives postgresql:// (psycopg2); this app requires postgresql+asyncpg://."""
    if url.startswith("postgres://"):
        url = "postgresql+asyncpg://" + url.removeprefix("postgres://")
    elif url.startswith("postgresql://"):
        url = "postgresql+asyncpg://" + url.removeprefix("postgresql://")

    url = url.replace("sslmode=require", "ssl=require")
    url = url.replace("sslmode=prefer", "ssl=prefer")
    url = re.sub(r"[&?]channel_binding=[^&]*", "", url)
    return url.rstrip("?&")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = "development"
    api_prefix: str = "/api/v1"
    cors_origins: str = "http://localhost:3000"

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/washnpick"

    firebase_project_id: str = ""
    firebase_client_email: str = ""
    firebase_private_key: str = ""

    price_wash_fold_per_kg: int = 50
    price_duvet_king_queen: int = 700
    price_double_duvet: int = 500
    burned_user_deposit_percent: int = 50
    currency: str = "KES"
    min_weight_kg: int = 1
    max_weight_kg: int = 50

    mpesa_consumer_key: str = ""
    mpesa_consumer_secret: str = ""
    mpesa_shortcode: str = ""
    mpesa_passkey: str = ""
    mpesa_callback_url: str = ""
    mpesa_env: str = "sandbox"

    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_whatsapp_from: str = ""

    google_maps_api_key: str = ""

    service_area_lat: float = -0.75
    service_area_lng: float = 35.25
    service_area_radius_km: float = 15.0

    admin_api_secret: str = ""

    staff_firebase_uids: str = ""

    @field_validator("database_url", mode="before")
    @classmethod
    def _normalize_db_url(cls, value: str) -> str:
        return normalize_database_url(value)

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def staff_uid_list(self) -> list[str]:
        return [u.strip() for u in self.staff_firebase_uids.split(",") if u.strip()]

    @property
    def mpesa_base_url(self) -> str:
        if self.mpesa_env == "production":
            return "https://api.safaricom.co.ke"
        return "https://sandbox.safaricom.co.ke"

    @property
    def firebase_configured(self) -> bool:
        return bool(
            self.firebase_project_id
            and self.firebase_client_email
            and self.firebase_private_key
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()

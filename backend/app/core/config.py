import os
from pathlib import Path
from dotenv import load_dotenv

# Ruta raíz del backend (donde reside el archivo .env)
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Cargar variables de entorno desde el archivo .env
load_dotenv(BASE_DIR / ".env")


def normalize_database_url(url: str) -> str:
    """Asegura que el esquema use el driver asincrónico asyncpg."""
    if not url:
        return url
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    if url.startswith("postgresql://") and not url.startswith("postgresql+"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


class Settings:
    PROJECT_NAME: str = "Librería API"
    VERSION: str = "1.0.0"
    raw_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/libreria_db"
    )
    DATABASE_URL: str = normalize_database_url(raw_url)


settings = Settings()
DATABASE_URL = settings.DATABASE_URL

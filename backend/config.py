from pydantic_settings import BaseSettings
from typing import Optional, List

class Settings(BaseSettings):
    # LLM
    LLM_PROVIDER: str = "google"
    LLM_MODEL: str = "gemini-2.5-flash"
    LLM_API_KEY: str = ""

    # Database
    DB_TYPE: str = "postgresql"
    DB_URI: Optional[str] = None
    MONGO_URI: Optional[str] = None
    MONGO_DB_NAME: Optional[str] = None

    # Privacy
    MAX_ROWS: int = 100
    SENSITIVE_COLUMNS: str = "password,ssn,credit_card,secret,token,api_key"

    # App
    APP_NAME: str = "DB AI Agent"
    DEBUG: bool = False

    @property
    def sensitive_columns_list(self) -> List[str]:
        return [c.strip().lower() for c in self.SENSITIVE_COLUMNS.split(",") if c.strip()]

    @property
    def is_mongo(self) -> bool:
        return self.DB_TYPE.lower() == "mongodb"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

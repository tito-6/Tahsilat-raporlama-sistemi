from fastapi import FastAPI
from api.settings import router as settings_router

app = FastAPI()

app.include_router(settings_router, prefix="/api/settings", tags=["settings"])
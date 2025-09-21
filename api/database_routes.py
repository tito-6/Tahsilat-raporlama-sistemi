from fastapi import FastAPI
from api.database import router as database_router

app = FastAPI()

app.include_router(database_router, prefix="/api/database", tags=["database"])
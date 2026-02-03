
print("Starting debug import...")
print("Importing FastAPI...")
from fastapi import FastAPI
print("Importing StaticFiles...")
from fastapi.staticfiles import StaticFiles
print("Importing os...")
import os
print("Importing database stuff...")
from database import engine, Base
print("Connecting to DB for table creation (Base.metadata.create_all)...")
Base.metadata.create_all(bind=engine)
print("Importing routers...")
from routers import auth_router, events_router, users_router, projects_router, uploads_router, sponsors_router, members_router
print("Debug import finished successfully!")


import sqlalchemy
from sqlalchemy import create_engine
import os
from dotenv import load_dotenv

load_dotenv()

def test_conn(url, name):
    print(f"Testing {name} connection...", flush=True)
    try:
        engine = create_engine(url, connect_args={"connect_timeout": 5})
        with engine.connect() as conn:
            print(f"Successfully connected to {name}!", flush=True)
    except Exception as e:
        print(f"Failed to connect to {name}: {e}", flush=True)

local_url = "postgresql://postgres:kopekbal123@localhost:5432/macs_db"
railway_url = os.getenv("DATABASE_URL")

test_conn(local_url, "Local")
test_conn(railway_url, "Railway")

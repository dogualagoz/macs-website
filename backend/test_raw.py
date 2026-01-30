
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("DATABASE_URL")
print(f"Connecting to: {url.split('@')[-1]}") # Sadece adresi yazdıralım

try:
    conn = psycopg2.connect(url, connect_timeout=5)
    print("Connection successful!")
    conn.close()
except Exception as e:
    print(f"Connection failed: {e}")

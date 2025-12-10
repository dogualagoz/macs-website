# Gerekli importlar

from sqlalchemy import create_engine                    # Database engine oluşturmak için
from sqlalchemy.ext.declarative import declarative_base # Model sınıfları için base class
from sqlalchemy.orm import sessionmaker                 # Database oturumları oluşturmak için
from dotenv import load_dotenv                         # .env dosyasını okumak için
import os 

#! environment variables'ı yükle
load_dotenv()


#! Databse URL'ini al
DATABASE_URL = os.getenv("DATABASE_URL")

#! Database engine'i oluştur
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    connect_args={
        "connect_timeout": 5,
        "options": "-c statement_timeout=10000"
    }
)

#! Sessionlocal sınıfını oluştur
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

#! Base sınıfını oluştur
Base = declarative_base()

#! Database bağlantısını oluştur
def get_db():
    db = SessionLocal()
    try: 
        yield db
    finally:
        db.close()

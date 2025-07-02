from sqlalchemy import create_engine                    # Database engine oluşturmak için
from sqlalchemy.ext.declarative import declarative_base # Model sınıfları için base class
from sqlalchemy.orm import sessionmaker                 # Database oturumları oluşturmak için
from dotenv import load_dotenv                         # .env dosyasını okumak için
import os 

load_dotenv()


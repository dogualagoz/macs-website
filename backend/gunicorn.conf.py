"""
Gunicorn production konfigürasyonu - MACS Backend (FastAPI)
VPS / Plesk ortamı için optimize edilmiştir.
"""
import multiprocessing
import os

# Bağlantı: Nginx proxy bu porta yönlendirecek
bind = "127.0.0.1:8001"

# Worker sayısı: (2 × CPU çekirdeği) + 1  — genel kural
workers = multiprocessing.cpu_count() * 2 + 1

# FastAPI için Uvicorn worker kullan (async desteği)
worker_class = "uvicorn.workers.UvicornWorker"

# Zaman aşımı (saniye)
timeout = 120
keepalive = 5

# Log klasörü yoksa oluştur
log_dir = "/var/log/macs"
os.makedirs(log_dir, exist_ok=True)

accesslog = f"{log_dir}/access.log"
errorlog  = f"{log_dir}/error.log"
loglevel  = "info"

# Process ID dosyası
pidfile = "/var/run/macs-backend.pid"

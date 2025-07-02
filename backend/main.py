from fastapi import FastAPI

app = FastAPI(
    title = "MACS API",
    description = "MACS Kulübü Web Sitesi Backend API",
    version = "1.0.0",
)

@app.get("/")
def root():
    return {"message": "MACS Kulübü Web Sitesine hoşgeldiniz!"}

@app.get("/health")
def health_check():
    return {"status": "ok"}


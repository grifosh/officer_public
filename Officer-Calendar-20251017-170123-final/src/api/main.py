"""
Основной файл FastAPI приложения
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

# Импорт утилит для работы с БД
from src.utils.db_utils import DatabaseManager

# Импорт роутов
from src.api.routes.attendees import router as attendees_router, init_attendee_service
from src.api.routes.streams import router as streams_router, init_stream_service
from src.api.routes.open_questions import router as open_questions_router, init_open_questions_service
from src.api.routes.events import router as events_router, init_events_service
from src.api.routes.auto_sync import router as auto_sync_router, init_auto_sync_service
from src.api.routes.morning_evening import router as morning_evening_router

# Импорт системы логирования
from src.core.logging_config import setup_logging

# Конфигурация базы данных
DB_CONFIG = {
    "dbname": os.getenv("DB_NAME", "officer"),
    "user": os.getenv("DB_USER", os.getenv("USER", "officer")),
    "password": os.getenv("DB_PASSWORD", "officer_pwd"),
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "5432"))
}

# Глобальный менеджер базы данных с connection pool
db_manager = DatabaseManager(DB_CONFIG, min_connections=2, max_connections=10)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager для управления жизненным циклом приложения"""
    # Startup
    print("🚀 Запуск FastAPI сервера...")
    print("📡 API доступен по адресу http://localhost:5001/api/events")
    print("🌐 Интерфейс доступен по адресу http://localhost:5001")
    
    # Инициализация системы логирования
    setup_logging()
    
    # Инициализация сервисов
    init_attendee_service(db_manager)
    init_stream_service(db_manager)
    init_open_questions_service(db_manager)
    init_events_service(db_manager)
    init_auto_sync_service(db_manager)
    
    yield
    
    # Shutdown
    print("🛑 Остановка сервера...")
    db_manager.close_pool()

# Создание приложения
app = FastAPI(title="Officer Calendar API", lifespan=lifespan)

# CORS настройки
cors_origins = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware для отключения кэширования статических файлов
from fastapi import Request
from fastapi.responses import Response

@app.middleware("http")
async def add_no_cache_headers(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.endswith(('.css', '.js', '.html')):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

# Подключение роутов
app.include_router(attendees_router)
app.include_router(streams_router)
app.include_router(open_questions_router)
app.include_router(events_router)
app.include_router(auto_sync_router)
app.include_router(morning_evening_router)

# Статические файлы
app.mount("/", StaticFiles(directory=".", html=True), name="static")

# Endpoint для мониторинга connection pool
@app.get("/api/db-pool-status")
async def get_db_pool_status():
    """Получить статус connection pool"""
    return db_manager.get_pool_status()

# Основной endpoint
@app.get("/")
async def root():
    return {"message": "Officer Calendar API", "version": "2.0"}

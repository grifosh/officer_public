"""
API роуты для управления автоматической синхронизацией
"""
from fastapi import APIRouter, HTTPException
from src.api.services.auto_sync_service import AutoSyncService
from src.utils.db_utils import handle_db_errors

router = APIRouter()

# Глобальный сервис
auto_sync_service: AutoSyncService = None

def init_auto_sync_service(db_manager):
    """Инициализация сервиса автоматической синхронизации"""
    global auto_sync_service
    auto_sync_service = AutoSyncService(db_manager)

@router.get("/api/auto-sync/status")
@handle_db_errors("Ошибка получения статуса автоматической синхронизации")
async def get_auto_sync_status():
    """Получить статус автоматической синхронизации"""
    if not auto_sync_service:
        raise HTTPException(status_code=500, detail="Сервис автоматической синхронизации не инициализирован")
    
    return auto_sync_service.get_status()

@router.post("/api/auto-sync/start")
@handle_db_errors("Ошибка запуска автоматической синхронизации")
async def start_auto_sync():
    """Запустить автоматическую синхронизацию"""
    if not auto_sync_service:
        raise HTTPException(status_code=500, detail="Сервис автоматической синхронизации не инициализирован")
    
    try:
        return auto_sync_service.start_auto_sync()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/api/auto-sync/stop")
@handle_db_errors("Ошибка остановки автоматической синхронизации")
async def stop_auto_sync():
    """Остановить автоматическую синхронизацию"""
    if not auto_sync_service:
        raise HTTPException(status_code=500, detail="Сервис автоматической синхронизации не инициализирован")
    
    try:
        return auto_sync_service.stop_auto_sync()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/api/auto-sync/sync-now")
@handle_db_errors("Ошибка выполнения синхронизации")
async def sync_now():
    """Выполнить синхронизацию прямо сейчас"""
    if not auto_sync_service:
        raise HTTPException(status_code=500, detail="Сервис автоматической синхронизации не инициализирован")
    
    try:
        return auto_sync_service.sync_now()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

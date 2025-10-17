"""
API роуты для работы с событиями календаря
"""
from fastapi import APIRouter, HTTPException, Path, Query
from src.api.services.events_service import EventsService
from src.api.models.schemas import EventCreate, EventUpdate
from src.utils.db_utils import handle_db_errors
from typing import List, Optional

router = APIRouter(prefix="/api/events", tags=["events"])

# Инициализация сервиса будет происходить в main.py
events_service = None

def init_events_service(db_manager):
    """Инициализация сервиса событий"""
    global events_service
    events_service = EventsService(db_manager)

@router.get("/", response_model=List[dict])
@router.get("", response_model=List[dict])  # Дублируем без слеша для совместимости
@handle_db_errors("Ошибка получения событий")
async def get_events(
    start_date: Optional[str] = Query(None, description="Начальная дата (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Конечная дата (YYYY-MM-DD)")
):
    """Получить события за период"""
    if not events_service:
        raise HTTPException(status_code=500, detail="Сервис событий не инициализирован")
    
    return events_service.get_events(start_date, end_date)

@router.get("/range", response_model=List[dict])
@handle_db_errors("Ошибка получения событий за период")
async def get_events_range(
    start_date: str = Query(..., description="Начальная дата (YYYY-MM-DD)"),
    end_date: str = Query(..., description="Конечная дата (YYYY-MM-DD)")
):
    """Получить события за указанный период"""
    if not events_service:
        raise HTTPException(status_code=500, detail="Сервис событий не инициализирован")
    
    return events_service.get_events(start_date, end_date)

@router.get("/{event_id}")
@handle_db_errors("Ошибка получения события")
async def get_event_by_id(
    event_id: int = Path(..., description="ID события")
):
    """Получить событие по ID"""
    if not events_service:
        raise HTTPException(status_code=500, detail="Сервис событий не инициализирован")
    
    event = events_service.get_event_by_id(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Событие не найдено")
    
    return event

@router.post("/", status_code=201)
@handle_db_errors("Ошибка создания события")
async def create_event(request: EventCreate):
    """Создать новое событие"""
    if not events_service:
        raise HTTPException(status_code=500, detail="Сервис событий не инициализирован")
    
    return events_service.create_event(request)

@router.put("/{event_id}")
@handle_db_errors("Ошибка обновления события")
async def update_event(
    event_id: int = Path(..., description="ID события"),
    request: EventUpdate = None
):
    """Обновить событие"""
    if not events_service:
        raise HTTPException(status_code=500, detail="Сервис событий не инициализирован")
    
    return events_service.update_event(event_id, request)

@router.delete("/{event_id}")
@handle_db_errors("Ошибка удаления события")
async def delete_event(
    event_id: int = Path(..., description="ID события")
):
    """Удалить событие"""
    if not events_service:
        raise HTTPException(status_code=500, detail="Сервис событий не инициализирован")
    
    return events_service.delete_event(event_id)

"""
API роуты для работы с участниками
"""
from fastapi import APIRouter, HTTPException
from src.api.services.attendee_service import AttendeeService
from src.api.models.schemas import AttendeeResponse
from src.utils.db_utils import handle_db_errors
from typing import List

router = APIRouter(prefix="/api/attendees", tags=["attendees"])

# Инициализация сервиса будет происходить в main.py
attendee_service = None

def init_attendee_service(db_manager):
    """Инициализация сервиса участников"""
    global attendee_service
    attendee_service = AttendeeService(db_manager)

@router.get("/", response_model=List[AttendeeResponse])
@handle_db_errors("Ошибка получения участников")
async def get_attendees(search: str = ""):
    """Получить список участников с поиском"""
    if not attendee_service:
        raise HTTPException(status_code=500, detail="Сервис участников не инициализирован")
    
    return attendee_service.get_attendees(search)

@router.post("/")
@handle_db_errors("Ошибка создания участника")
async def create_attendee(email: str = "", name: str = "", surname: str = ""):
    """Создать нового участника"""
    if not attendee_service:
        raise HTTPException(status_code=500, detail="Сервис участников не инициализирован")
    
    return attendee_service.create_attendee(email, name, surname)

@router.put("/{attendee_id}/usage")
@handle_db_errors("Ошибка обновления статистики участника")
async def update_attendee_usage(attendee_id: int):
    """Обновить статистику использования участника"""
    if not attendee_service:
        raise HTTPException(status_code=500, detail="Сервис участников не инициализирован")
    
    attendee_service.update_attendee_usage(attendee_id)
    return {"message": "Статистика обновлена"}

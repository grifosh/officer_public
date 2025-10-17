"""
API роуты для работы со стримами
"""
from fastapi import APIRouter, HTTPException
from src.api.services.attendee_service import StreamService
from src.api.models.schemas import StreamResponse
from src.utils.db_utils import handle_db_errors
from typing import List

router = APIRouter(prefix="/api/streams", tags=["streams"])

# Инициализация сервиса будет происходить в main.py
stream_service = None

def init_stream_service(db_manager):
    """Инициализация сервиса стримов"""
    global stream_service
    stream_service = StreamService(db_manager)

@router.get("/", response_model=List[StreamResponse])
@handle_db_errors("Ошибка получения стримов")
async def get_streams(search: str = ""):
    """Получить список стримов с поиском"""
    if not stream_service:
        raise HTTPException(status_code=500, detail="Сервис стримов не инициализирован")
    
    return stream_service.get_streams(search)

@router.post("/")
@handle_db_errors("Ошибка создания стрима")
async def create_stream(name: str):
    """Создать новый стрим"""
    if not stream_service:
        raise HTTPException(status_code=500, detail="Сервис стримов не инициализирован")
    
    return stream_service.create_stream(name)

@router.put("/{stream_id}/usage")
@handle_db_errors("Ошибка обновления статистики стрима")
async def update_stream_usage(stream_id: int):
    """Обновить статистику использования стрима"""
    if not stream_service:
        raise HTTPException(status_code=500, detail="Сервис стримов не инициализирован")
    
    stream_service.update_stream_usage(stream_id)
    return {"message": "Статистика обновлена"}

@router.delete("/{stream_id}")
@handle_db_errors("Ошибка удаления стрима")
async def delete_stream(stream_id: int):
    """Удалить стрим"""
    if not stream_service:
        raise HTTPException(status_code=500, detail="Сервис стримов не инициализирован")
    
    # Проверяем, используется ли стрим в событиях
    conn = stream_service.db_manager.get_connection(use_dict_cursor=True)
    cur = conn.cursor()
    
    try:
        cur.execute("""
            SELECT COUNT(*) as count
            FROM events 
            WHERE streams @> %s::jsonb
        """, (f'["{stream_id}"]',))
        
        usage_count = cur.fetchone()["count"]
        
        if usage_count > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Стрим используется в {usage_count} событиях. Сначала удалите события."
            )
        
        # Удаляем стрим
        cur.execute("DELETE FROM streams WHERE id = %s", (stream_id,))
        conn.commit()
        
        return {"message": "Стрим удален успешно"}
    finally:
        cur.close()
        stream_service.db_manager.return_connection(conn)

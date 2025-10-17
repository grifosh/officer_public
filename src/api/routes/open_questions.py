"""
API роуты для работы с Open Questions
"""
from fastapi import APIRouter, HTTPException, Path
from src.api.services.open_questions_service import OpenQuestionsService
from src.api.models.schemas import QuestionCreateRequest, QuestionResolveRequest, CommentCreateRequest, CommentResponse
from src.utils.db_utils import handle_db_errors
from typing import List

router = APIRouter(prefix="/api/open-questions", tags=["open-questions"])

# Инициализация сервиса будет происходить в main.py
open_questions_service = None

def init_open_questions_service(db_manager):
    """Инициализация сервиса Open Questions"""
    global open_questions_service
    open_questions_service = OpenQuestionsService(db_manager)

@router.get("/")
@handle_db_errors("Ошибка получения Open Questions")
async def get_open_questions():
    """Получить все Open Questions"""
    if not open_questions_service:
        raise HTTPException(status_code=500, detail="Сервис Open Questions не инициализирован")
    
    return open_questions_service.get_all_questions()

@router.post("/create")
@handle_db_errors("Ошибка создания Open Question")
async def create_open_question(request: QuestionCreateRequest):
    """Создать новый Open Question"""
    if not open_questions_service:
        raise HTTPException(status_code=500, detail="Сервис Open Questions не инициализирован")
    
    return open_questions_service.create_question(request)

@router.put("/{question_id}/update")
@handle_db_errors("Ошибка обновления Open Question")
async def update_open_question(
    question_id: int = Path(..., description="ID вопроса"),
    request: QuestionCreateRequest = None
):
    """Обновить существующий Open Question"""
    if not open_questions_service:
        raise HTTPException(status_code=500, detail="Сервис Open Questions не инициализирован")
    
    return open_questions_service.update_question(question_id, request)

@router.put("/{question_id}/resolve")
@handle_db_errors("Ошибка решения Open Question")
async def resolve_open_question(
    question_id: int = Path(..., description="ID вопроса"),
    request: QuestionResolveRequest = None
):
    """Решить Open Question"""
    if not open_questions_service:
        raise HTTPException(status_code=500, detail="Сервис Open Questions не инициализирован")
    
    return open_questions_service.resolve_question(question_id, request)

@router.get("/{question_id}/comments", response_model=List[CommentResponse])
@handle_db_errors("Ошибка получения комментариев")
async def get_question_comments(
    question_id: int = Path(..., description="ID вопроса")
):
    """Получить комментарии к вопросу"""
    if not open_questions_service:
        raise HTTPException(status_code=500, detail="Сервис Open Questions не инициализирован")
    
    return open_questions_service.get_question_comments(question_id)

@router.post("/{question_id}/comments")
@handle_db_errors("Ошибка создания комментария")
async def create_comment(
    question_id: int = Path(..., description="ID вопроса"),
    request: CommentCreateRequest = None
):
    """Создать комментарий к вопросу"""
    if not open_questions_service:
        raise HTTPException(status_code=500, detail="Сервис Open Questions не инициализирован")
    
    return open_questions_service.create_comment(question_id, request)

@router.delete("/{question_id}/comments/{comment_id}")
@handle_db_errors("Ошибка удаления комментария")
async def delete_comment(
    question_id: int = Path(..., description="ID вопроса"),
    comment_id: int = Path(..., description="ID комментария")
):
    """Удалить комментарий"""
    if not open_questions_service:
        raise HTTPException(status_code=500, detail="Сервис Open Questions не инициализирован")
    
    return open_questions_service.delete_comment(question_id, comment_id)

@router.get("/history")
@handle_db_errors("Ошибка получения истории")
async def get_question_history():
    """Получить историю изменений вопросов"""
    if not open_questions_service:
        raise HTTPException(status_code=500, detail="Сервис Open Questions не инициализирован")
    
    return open_questions_service.get_question_history()

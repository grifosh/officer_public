"""
Сервис для работы с Open Questions
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from src.utils.db_utils import DatabaseManager
from src.api.models.schemas import QuestionCreateRequest, QuestionResolveRequest, CommentCreateRequest, CommentResponse
import logging

logger = logging.getLogger(__name__)

class OpenQuestionsService:
    """Сервис для работы с открытыми вопросами"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager
    
    def get_all_questions(self) -> List[Dict[str, Any]]:
        """Получить все Open Questions"""
        conn = self.db_manager.get_connection(use_dict_cursor=False)
        cur = conn.cursor()
        
        try:
            cur.execute("""
                SELECT oq.id, oq.question_text, oq.time, oq.person, oq.topic as stream, 
                       oq.important, oq.asap, oq.is_resolved, oq.created_at, oq.resolved_at,
                       oq.event_id, e.subject as event_subject
                FROM open_questions oq
                LEFT JOIN events e ON oq.event_id = e.id
                ORDER BY oq.created_at DESC
            """)
            
            questions = cur.fetchall()
            
            # Преобразуем результаты в словари
            result = []
            for q in questions:
                result.append({
                    "id": q[0],
                    "question_text": q[1],
                    "time": q[2],
                    "person": q[3],
                    "stream": q[4],
                    "important": q[5],
                    "asap": q[6],
                    "is_resolved": q[7],
                    "created_at": q[8].isoformat() if q[8] else None,
                    "resolved_at": q[9].isoformat() if q[9] else None,
                    "event_id": q[10],
                    "event_subject": q[11]
                })
            
            return result
            
        finally:
            cur.close()
            self.db_manager.return_connection(conn)
    
    def create_question(self, request: QuestionCreateRequest) -> Dict[str, Any]:
        """Создать новый Open Question"""
        conn = self.db_manager.get_connection(use_dict_cursor=True)
        cur = conn.cursor()
        
        try:
            # Проверяем существующий вопрос
            if request.event_id:
                cur.execute("""
                    SELECT id FROM events WHERE id = %s
                """, (request.event_id,))
                event = cur.fetchone()
                
                if not event:
                    raise ValueError(f"Событие с ID {request.event_id} не найдено")
            
            # Проверяем, не существует ли уже такой вопрос
            cur.execute("""
                SELECT id FROM open_questions 
                WHERE question_text = %s AND person = %s AND event_id = %s
            """, (request.question_text, request.person, request.event_id))
            
            existing = cur.fetchone()
            if existing:
                raise ValueError("Такой вопрос уже существует")
            
            # Создаем новый вопрос
            cur.execute("""
                INSERT INTO open_questions (
                    event_id, question_text, time, person, topic, 
                    important, asap, is_resolved, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, false, NOW())
                RETURNING id, created_at
            """, (
                request.event_id,
                request.question_text,
                request.time,
                request.person,
                request.stream,
                request.important or False,
                request.asap or False
            ))
            
            new_question = cur.fetchone()
            
            # Создаем запись в истории
            cur.execute("""
                INSERT INTO question_history (
                    question_id, action, details, timestamp
                ) VALUES (%s, %s, %s, NOW())
            """, (
                new_question["id"],
                "created",
                f"Question created: {request.question_text[:100]}..."
            ))
            
            conn.commit()
            
            return {
                "id": new_question["id"],
                "message": "Question added to Open Questions",
                "created_at": new_question["created_at"].isoformat()
            }
            
        finally:
            cur.close()
            self.db_manager.return_connection(conn)
    
    def update_question(self, question_id: int, request: QuestionCreateRequest) -> Dict[str, Any]:
        """Обновить существующий Open Question"""
        conn = self.db_manager.get_connection(use_dict_cursor=True)
        cur = conn.cursor()
        
        try:
            # Получаем текущие данные вопроса
            cur.execute("""
                SELECT * FROM open_questions WHERE id = %s
            """, (question_id,))
            
            question_data = cur.fetchone()
            if not question_data:
                raise ValueError(f"Вопрос с ID {question_id} не найден")
            
            # Обновляем вопрос
            cur.execute("""
                UPDATE open_questions SET
                    question_text = %s,
                    time = %s,
                    person = %s,
                    topic = %s,
                    important = %s,
                    asap = %s,
                    updated_at = NOW()
                WHERE id = %s
                RETURNING id, updated_at
            """, (
                request.question_text,
                request.time,
                request.person,
                request.stream,
                request.important or False,
                request.asap or False,
                question_id
            ))
            
            updated_question = cur.fetchone()
            
            # Создаем запись в истории
            cur.execute("""
                INSERT INTO question_history (
                    question_id, action, details, timestamp
                ) VALUES (%s, %s, %s, NOW())
            """, (
                question_id,
                "updated",
                f"Question updated: {request.question_text[:100]}..."
            ))
            
            conn.commit()
            
            return {
                "id": updated_question["id"],
                "message": "Open Question data updated",
                "updated_at": updated_question["updated_at"].isoformat()
            }
            
        finally:
            cur.close()
            self.db_manager.return_connection(conn)
    
    def resolve_question(self, question_id: int, request: QuestionResolveRequest) -> Dict[str, Any]:
        """Решить Open Question"""
        conn = self.db_manager.get_connection(use_dict_cursor=True)
        cur = conn.cursor()
        
        try:
            # Получаем данные вопроса
            cur.execute("""
                SELECT oq.*, e.subject as event_subject
                FROM open_questions oq
                LEFT JOIN events e ON oq.event_id = e.id
                WHERE oq.id = %s
            """, (question_id,))
            
            question_data = cur.fetchone()
            if not question_data:
                raise ValueError(f"Вопрос с ID {question_id} не найден")
            
            # Обновляем статус вопроса
            cur.execute("""
                UPDATE open_questions SET
                    is_resolved = %s,
                    resolved_at = %s,
                    updated_at = NOW()
                WHERE id = %s
                RETURNING id, resolved_at
            """, (
                request.is_resolved,
                datetime.now() if request.is_resolved else None,
                question_id
            ))
            
            resolved_question = cur.fetchone()
            
            # Создаем запись в истории
            action = "resolved" if request.is_resolved else "unresolved"
            details = f"Question {action}"
            if request.resolution_notes:
                details += f": {request.resolution_notes}"
            
            cur.execute("""
                INSERT INTO question_history (
                    question_id, action, details, timestamp
                ) VALUES (%s, %s, %s, NOW())
            """, (question_id, action, details))
            
            conn.commit()
            
            return {
                "id": resolved_question["id"],
                "message": f"Question {action}",
                "resolved_at": resolved_question["resolved_at"].isoformat() if resolved_question["resolved_at"] else None
            }
            
        finally:
            cur.close()
            self.db_manager.return_connection(conn)
    
    def get_question_comments(self, question_id: int) -> List[CommentResponse]:
        """Получить комментарии к вопросу"""
        conn = self.db_manager.get_connection(use_dict_cursor=True)
        cur = conn.cursor()
        
        try:
            cur.execute("""
                SELECT id, question_id, comment_text, author, created_at
                FROM question_comments
                WHERE question_id = %s
                ORDER BY created_at DESC
            """, (question_id,))
            
            comments = cur.fetchall()
            
            return [
                CommentResponse(
                    id=c["id"],
                    question_id=c["question_id"],
                    content=c["comment_text"],
                    author=c["author"],
                    created_at=c["created_at"]
                )
                for c in comments
            ]
            
        finally:
            cur.close()
            self.db_manager.return_connection(conn)
    
    def create_comment(self, question_id: int, request: CommentCreateRequest) -> Dict[str, Any]:
        """Создать комментарий к вопросу"""
        conn = self.db_manager.get_connection(use_dict_cursor=True)
        cur = conn.cursor()
        
        try:
            # Проверяем существование вопроса
            cur.execute("SELECT id FROM open_questions WHERE id = %s", (question_id,))
            if not cur.fetchone():
                raise ValueError(f"Вопрос с ID {question_id} не найден")
            
            # Создаем комментарий
            cur.execute("""
                INSERT INTO question_comments (
                    question_id, comment_text, author, created_at
                ) VALUES (%s, %s, %s, NOW())
                RETURNING id, created_at
            """, (question_id, request.content, request.author))
            
            new_comment = cur.fetchone()
            conn.commit()
            
            return {
                "id": new_comment["id"],
                "message": "Comment created successfully",
                "created_at": new_comment["created_at"].isoformat()
            }
            
        finally:
            cur.close()
            self.db_manager.return_connection(conn)
    
    def delete_comment(self, question_id: int, comment_id: int) -> Dict[str, Any]:
        """Удалить комментарий"""
        conn = self.db_manager.get_connection()
        cur = conn.cursor()
        
        try:
            cur.execute("""
                DELETE FROM question_comments 
                WHERE id = %s AND question_id = %s
            """, (comment_id, question_id))
            
            if cur.rowcount == 0:
                raise ValueError("Комментарий не найден")
            
            conn.commit()
            
            return {"message": "Comment deleted successfully"}
            
        finally:
            cur.close()
            self.db_manager.return_connection(conn)
    
    def get_question_history(self) -> List[Dict[str, Any]]:
        """Получить историю изменений вопросов"""
        conn = self.db_manager.get_connection(use_dict_cursor=True)
        cur = conn.cursor()
        
        try:
            cur.execute("""
                SELECT qh.id, qh.question_id, qh.action, qh.details, qh.timestamp,
                       oq.question_text, oq.person, oq.topic
                FROM question_history qh
                LEFT JOIN open_questions oq ON qh.question_id = oq.id
                ORDER BY qh.timestamp DESC
                LIMIT 100
            """)
            
            history = cur.fetchall()
            
            return [
                {
                    "id": h["id"],
                    "question_id": h["question_id"],
                    "action": h["action"],
                    "details": h["details"],
                    "timestamp": h["timestamp"].isoformat(),
                    "question_text": h["question_text"],
                    "person": h["person"],
                    "topic": h["topic"]
                }
                for h in history
            ]
            
        finally:
            cur.close()
            self.db_manager.return_connection(conn)

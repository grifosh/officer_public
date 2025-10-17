"""
Сервисы для работы с базой данных
"""
from typing import List, Optional, Dict, Any
from src.utils.db_utils import DatabaseManager
from src.api.models.schemas import AttendeeResponse, StreamResponse
import logging

logger = logging.getLogger(__name__)

class AttendeeService:
    """Сервис для работы с участниками"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager
    
    def get_attendees(self, search: str = "") -> List[AttendeeResponse]:
        """Получить список участников с поиском"""
        conn = self.db_manager.get_connection(use_dict_cursor=True)
        cur = conn.cursor()
        
        try:
            if search:
                cur.execute("""
                    SELECT id, email, name, surname, use_count, last_used, last_searched_at
                    FROM attendees
                    WHERE email ILIKE %s OR name ILIKE %s OR surname ILIKE %s
                    ORDER BY use_count DESC, last_used DESC
                    LIMIT 20
                """, (f"{search}%", f"{search}%", f"{search}%"))
            else:
                cur.execute("""
                    SELECT id, email, name, surname, use_count, last_used, last_searched_at
                    FROM attendees
                    ORDER BY use_count DESC, last_used DESC
                """)
            
            attendees = cur.fetchall()
            
            return [
                AttendeeResponse(
                    id=a["id"],
                    email=a["email"] if a["email"] and a["email"] != "None" else None,
                    name=a["name"] if a["name"] and a["name"] != "None" else None,
                    surname=a["surname"] if a["surname"] and a["surname"] != "None" else None,
                    use_count=a["use_count"],
                    last_used=a["last_used"].isoformat() if a["last_used"] else None,
                    last_searched_at=a["last_searched_at"].isoformat() if a["last_searched_at"] else None
                )
                for a in attendees
            ]
        finally:
            cur.close()
            self.db_manager.return_connection(conn)
    
    def create_attendee(self, email: str = "", name: str = "", surname: str = "") -> Dict[str, Any]:
        """Создать нового участника"""
        conn = self.db_manager.get_connection(use_dict_cursor=True)
        cur = conn.cursor()
        
        try:
            cur.execute("""
                INSERT INTO attendees (email, name, surname, use_count, last_used)
                VALUES (%s, %s, %s, 0, NOW())
                RETURNING id
            """, (email if email else None, name if name else None, surname if surname else None))
            
            attendee_id = cur.fetchone()["id"]
            conn.commit()
            
            return {"id": attendee_id, "message": "Участник создан успешно"}
        finally:
            cur.close()
            self.db_manager.return_connection(conn)
    
    def update_attendee_usage(self, attendee_id: int):
        """Обновить статистику использования участника"""
        conn = self.db_manager.get_connection()
        cur = conn.cursor()
        
        try:
            cur.execute("""
                UPDATE attendees 
                SET use_count = use_count + 1, last_used = NOW()
                WHERE id = %s
            """, (attendee_id,))
            conn.commit()
        finally:
            cur.close()
            self.db_manager.return_connection(conn)

class StreamService:
    """Сервис для работы со стримами"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager
    
    def get_streams(self, search: str = "") -> List[StreamResponse]:
        """Получить список стримов с поиском"""
        conn = self.db_manager.get_connection(use_dict_cursor=True)
        cur = conn.cursor()
        
        try:
            if search:
                cur.execute("""
                    SELECT id, name, use_count, last_used
                    FROM streams
                    WHERE name ILIKE %s
                    ORDER BY use_count DESC, last_used DESC
                    LIMIT 20
                """, (f"{search}%",))
            else:
                cur.execute("""
                    SELECT id, name, use_count, last_used
                    FROM streams
                    ORDER BY use_count DESC, last_used DESC
                """)
            
            streams = cur.fetchall()
            
            return [
                StreamResponse(
                    id=s["id"],
                    name=s["name"],
                    use_count=s["use_count"],
                    last_used=s["last_used"].isoformat() if s["last_used"] else None
                )
                for s in streams
            ]
        finally:
            cur.close()
            self.db_manager.return_connection(conn)
    
    def create_stream(self, name: str) -> Dict[str, Any]:
        """Создать новый стрим"""
        conn = self.db_manager.get_connection(use_dict_cursor=True)
        cur = conn.cursor()
        
        try:
            cur.execute("""
                INSERT INTO streams (name, use_count, last_used)
                VALUES (%s, 0, NOW())
                RETURNING id
            """, (name,))
            
            stream_id = cur.fetchone()["id"]
            conn.commit()
            
            return {"id": stream_id, "message": "Стрим создан успешно"}
        finally:
            cur.close()
            self.db_manager.return_connection(conn)
    
    def update_stream_usage(self, stream_id: int):
        """Обновить статистику использования стрима"""
        conn = self.db_manager.get_connection()
        cur = conn.cursor()
        
        try:
            cur.execute("""
                UPDATE streams 
                SET use_count = use_count + 1, last_used = NOW()
                WHERE id = %s
            """, (stream_id,))
            conn.commit()
        finally:
            cur.close()
            self.db_manager.return_connection(conn)

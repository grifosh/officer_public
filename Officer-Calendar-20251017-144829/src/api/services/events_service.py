"""
Сервис для работы с событиями календаря
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from src.utils.db_utils import DatabaseManager
from src.api.models.schemas import EventCreate, EventUpdate
import logging
import json

logger = logging.getLogger(__name__)

class EventsService:
    """Сервис для работы с событиями календаря"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager
    
    def get_events(self, start_date: Optional[str] = None, end_date: Optional[str] = None) -> List[Dict[str, Any]]:
        """Получить события за период"""
        conn = self.db_manager.get_connection(use_dict_cursor=True)
        cur = conn.cursor()
        
        try:
            if start_date and end_date:
                cur.execute("""
                    SELECT id, subject, start_time, end_time, attendees, stream, notes, 
                           description, location, google_event_id, google_calendar_link,
                           last_google_sync, last_local_update, sync_source
                    FROM events 
                    WHERE start_time >= %s AND end_time <= %s
                    ORDER BY start_time ASC
                """, (start_date, end_date))
            else:
                cur.execute("""
                    SELECT id, subject, start_time, end_time, attendees, stream, notes, 
                           description, location, google_event_id, google_calendar_link,
                           last_google_sync, last_local_update, sync_source
                    FROM events 
                    ORDER BY start_time ASC
                """)
            
            events = cur.fetchall()
            
            result = []
            for event in events:
                # Парсим JSON поля
                attendees = []
                streams = []
                notes = []
                
                if event['attendees']:
                    try:
                        attendees = json.loads(event['attendees']) if isinstance(event['attendees'], str) else event['attendees']
                    except:
                        attendees = []
                
                if event['stream']:
                    try:
                        streams = json.loads(event['stream']) if isinstance(event['stream'], str) else [event['stream']]
                    except:
                        streams = []
                
                if event['notes']:
                    try:
                        notes = json.loads(event['notes']) if isinstance(event['notes'], str) else event['notes']
                    except:
                        notes = []
                
                result.append({
                    "id": event['id'],
                    "subject": event['subject'],
                    "start_time": event['start_time'].isoformat(),
                    "end_time": event['end_time'].isoformat(),
                    "attendees": attendees,
                    "streams": streams,  # Оставляем как streams для совместимости с фронтендом
                    "notes": notes,
                    "description": event['description'],
                    "location": event['location'],
                    "google_event_id": event['google_event_id'],
                    "google_calendar_link": event['google_calendar_link'],
                    "last_google_sync": event['last_google_sync'].isoformat() if event['last_google_sync'] else None,
                    "last_local_update": event['last_local_update'].isoformat() if event['last_local_update'] else None,
                    "sync_source": event['sync_source']
                })
            
            return result
            
        finally:
            cur.close()
            self.db_manager.return_connection(conn)
    
    def get_event_by_id(self, event_id: int) -> Optional[Dict[str, Any]]:
        """Получить событие по ID"""
        conn = self.db_manager.get_connection(use_dict_cursor=True)
        cur = conn.cursor()
        
        try:
            cur.execute("""
                SELECT id, subject, start_time, end_time, attendees, stream, notes, 
                       description, location, google_event_id, google_calendar_link,
                       last_google_sync, last_local_update, sync_source
                FROM events 
                WHERE id = %s
            """, (event_id,))
            
            event = cur.fetchone()
            if not event:
                return None
            
            # Парсим JSON поля
            attendees = []
            streams = []
            notes = []
            
            if event['attendees']:
                try:
                    attendees = json.loads(event['attendees']) if isinstance(event['attendees'], str) else event['attendees']
                except:
                    attendees = []
            
            if event['stream']:
                try:
                    streams = json.loads(event['stream']) if isinstance(event['stream'], str) else [event['stream']]
                except:
                    streams = []
            
            if event['notes']:
                try:
                    notes = json.loads(event['notes']) if isinstance(event['notes'], str) else event['notes']
                except:
                    notes = []
            
            return {
                "id": event['id'],
                "subject": event['subject'],
                "start_time": event['start_time'].isoformat(),
                "end_time": event['end_time'].isoformat(),
                "attendees": attendees,
                "streams": streams,
                "notes": notes,
                "description": event['description'],
                "location": event['location'],
                "google_event_id": event['google_event_id'],
                "google_calendar_link": event['google_calendar_link'],
                "last_google_sync": event['last_google_sync'].isoformat() if event['last_google_sync'] else None,
                "last_local_update": event['last_local_update'].isoformat() if event['last_local_update'] else None,
                "sync_source": event['sync_source']
            }
            
        finally:
            cur.close()
            self.db_manager.return_connection(conn)
    
    def create_event(self, request: EventCreate) -> Dict[str, Any]:
        """Создать новое событие"""
        conn = self.db_manager.get_connection(use_dict_cursor=True)
        cur = conn.cursor()
        
        try:
            # Сохраняем участников и стримы
            attendee_ids = self._save_attendees_to_table(request.attendees or [])
            stream_ids = self._save_streams_to_table(request.streams or [])
            
            # Создаем событие
            cur.execute("""
                INSERT INTO events (
                    subject, start_time, end_time, attendees, stream, notes,
                    description, location, last_local_update, sync_source
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), 'local')
                RETURNING id, subject, start_time, end_time
            """, (
                request.subject,
                request.start_time,
                request.end_time,
                json.dumps(request.attendees or []),
                json.dumps(stream_ids),
                json.dumps(request.notes or []),
                request.description,
                request.location
            ))
            
            new_event = cur.fetchone()
            
            # Обновляем статистику использования участников и стримов
            self._update_usage_stats(attendee_ids, stream_ids)
            
            conn.commit()
            
            return {
                "id": new_event["id"],
                "subject": new_event["subject"],
                "start_time": new_event["start_time"].isoformat(),
                "end_time": new_event["end_time"].isoformat(),
                "message": "Event created successfully"
            }
            
        finally:
            cur.close()
            self.db_manager.return_connection(conn)
    
    def update_event(self, event_id: int, request: EventUpdate) -> Dict[str, Any]:
        """Обновить событие"""
        conn = self.db_manager.get_connection(use_dict_cursor=True)
        cur = conn.cursor()
        
        try:
            # Получаем текущие данные события
            cur.execute("SELECT * FROM events WHERE id = %s", (event_id,))
            current_event = cur.fetchone()
            
            if not current_event:
                raise ValueError(f"Событие с ID {event_id} не найдено")
            
            # Подготавливаем данные для обновления
            update_data = {}
            
            if request.subject is not None:
                update_data['subject'] = request.subject
            if request.start_time is not None:
                update_data['start_time'] = request.start_time
            if request.end_time is not None:
                update_data['end_time'] = request.end_time
            if request.attendees is not None:
                attendee_ids = self._save_attendees_to_table(request.attendees)
                update_data['attendees'] = json.dumps(request.attendees)
            if request.streams is not None:
                stream_ids = self._save_streams_to_table(request.streams)
                update_data['stream'] = json.dumps(stream_ids)
            if request.notes is not None:
                update_data['notes'] = json.dumps(request.notes)
            if request.description is not None:
                update_data['description'] = request.description
            if request.location is not None:
                update_data['location'] = request.location
            
            if not update_data:
                raise ValueError("Нет данных для обновления")
            
            # Добавляем время обновления
            update_data['last_local_update'] = datetime.now()
            
            # Формируем SQL запрос
            set_clause = ", ".join([f"{key} = %s" for key in update_data.keys()])
            values = list(update_data.values()) + [event_id]
            
            cur.execute(f"""
                UPDATE events SET {set_clause}
                WHERE id = %s
                RETURNING id, subject, start_time, end_time
            """, values)
            
            updated_event = cur.fetchone()
            
            # Обновляем статистику использования
            if request.attendees is not None or request.streams is not None:
                attendee_ids = self._save_attendees_to_table(request.attendees or [])
                stream_ids = self._save_streams_to_table(request.streams or [])
                self._update_usage_stats(attendee_ids, stream_ids)
            
            conn.commit()
            
            return {
                "id": updated_event["id"],
                "subject": updated_event["subject"],
                "start_time": updated_event["start_time"].isoformat(),
                "end_time": updated_event["end_time"].isoformat(),
                "message": "Event updated successfully"
            }
            
        finally:
            cur.close()
            self.db_manager.return_connection(conn)
    
    def delete_event(self, event_id: int) -> Dict[str, Any]:
        """Удалить событие"""
        conn = self.db_manager.get_connection()
        cur = conn.cursor()
        
        try:
            # Проверяем существование события
            cur.execute("SELECT id FROM events WHERE id = %s", (event_id,))
            if not cur.fetchone():
                raise ValueError(f"Событие с ID {event_id} не найдено")
            
            # Удаляем событие
            cur.execute("DELETE FROM events WHERE id = %s", (event_id,))
            
            if cur.rowcount == 0:
                raise ValueError("Событие не найдено")
            
            conn.commit()
            
            return {"message": "Event deleted successfully"}
            
        finally:
            cur.close()
            self.db_manager.return_connection(conn)
    
    def _save_attendees_to_table(self, attendees: List[str]) -> List[int]:
        """Сохранить участников в таблицу и вернуть их ID"""
        if not attendees:
            return []
        
        conn = self.db_manager.get_connection(use_dict_cursor=True)
        cur = conn.cursor()
        
        try:
            attendee_ids = []
            for attendee_str in attendees:
                if attendee_str and attendee_str.strip():
                    # Парсим участника
                    parsed = self._parse_attendee_string(attendee_str)
                    if not parsed:
                        continue
                    
                    # Ищем существующего участника
                    existing = None
                    
                    if parsed['email']:
                        cur.execute('SELECT id FROM attendees WHERE email = %s', (parsed['email'],))
                        existing = cur.fetchone()
                    elif parsed['name'] and parsed['surname']:
                        cur.execute('SELECT id FROM attendees WHERE name = %s AND surname = %s', 
                                  (parsed['name'], parsed['surname']))
                        existing = cur.fetchone()
                    elif parsed['name']:
                        cur.execute('SELECT id FROM attendees WHERE name = %s AND surname IS NULL', 
                                  (parsed['name'],))
                        existing = cur.fetchone()
                    
                    if existing:
                        attendee_ids.append(existing['id'])
                    else:
                        # Создаем нового участника
                        cur.execute("""
                            INSERT INTO attendees (email, name, surname, use_count, last_used)
                            VALUES (%s, %s, %s, 0, NOW())
                            RETURNING id
                        """, (parsed['email'], parsed['name'], parsed['surname']))
                        
                        new_attendee = cur.fetchone()
                        attendee_ids.append(new_attendee['id'])
            
            return attendee_ids
            
        finally:
            cur.close()
            self.db_manager.return_connection(conn)
    
    def _save_streams_to_table(self, streams: List[str]) -> List[int]:
        """Сохранить стримы в таблицу и вернуть их ID"""
        if not streams:
            return []
        
        conn = self.db_manager.get_connection(use_dict_cursor=True)
        cur = conn.cursor()
        
        try:
            stream_ids = []
            for stream_name in streams:
                if stream_name and stream_name.strip():
                    # Ищем существующий стрим
                    cur.execute('SELECT id FROM streams WHERE name = %s', (stream_name.strip(),))
                    existing = cur.fetchone()
                    
                    if existing:
                        stream_ids.append(existing['id'])
                    else:
                        # Создаем новый стрим
                        cur.execute("""
                            INSERT INTO streams (name, use_count, last_used)
                            VALUES (%s, 0, NOW())
                            RETURNING id
                        """, (stream_name.strip(),))
                        
                        new_stream = cur.fetchone()
                        stream_ids.append(new_stream['id'])
            
            return stream_ids
            
        finally:
            cur.close()
            self.db_manager.return_connection(conn)
    
    def _parse_attendee_string(self, attendee_str: str) -> Optional[Dict[str, str]]:
        """Парсить строку участника"""
        if not attendee_str or not attendee_str.strip():
            return None
        
        attendee_str = attendee_str.strip()
        
        # Проверяем, есть ли email
        if '@' in attendee_str:
            parts = attendee_str.split(' ')
            email = None
            name_parts = []
            
            for part in parts:
                if '@' in part:
                    email = part
                else:
                    name_parts.append(part)
            
            return {
                'email': email,
                'name': name_parts[0] if name_parts else None,
                'surname': ' '.join(name_parts[1:]) if len(name_parts) > 1 else None
            }
        else:
            # Только имя и фамилия
            parts = attendee_str.split(' ', 1)
            return {
                'email': None,
                'name': parts[0],
                'surname': parts[1] if len(parts) > 1 else None
            }
    
    def _update_usage_stats(self, attendee_ids: List[int], stream_ids: List[int]):
        """Обновить статистику использования"""
        conn = self.db_manager.get_connection()
        cur = conn.cursor()
        
        try:
            # Обновляем статистику участников
            for attendee_id in attendee_ids:
                cur.execute("""
                    UPDATE attendees 
                    SET use_count = use_count + 1, last_used = NOW()
                    WHERE id = %s
                """, (attendee_id,))
            
            # Обновляем статистику стримов
            for stream_id in stream_ids:
                cur.execute("""
                    UPDATE streams 
                    SET use_count = use_count + 1, last_used = NOW()
                    WHERE id = %s
                """, (stream_id,))
            
        finally:
            cur.close()
            self.db_manager.return_connection(conn)

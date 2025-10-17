#!/usr/bin/env python3
"""
Скрипт для восстановления события RPS Daily Connect: Open POs screening - Development discussion
из backup'а с ID update_550_20251016_102514
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import json
import os
from datetime import datetime

def get_db_connection():
    """Получить подключение к базе данных"""
    return psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        database=os.getenv('DB_NAME', 'officer'),
        user=os.getenv('DB_USER', 'grifosh'),
        password=os.getenv('DB_PASSWORD', 'grifosh')
    )

def restore_event_from_backup():
    """Восстановить событие из backup'а"""
    
    # Данные из backup'а update_550_20251016_102514
    event_data = {
        "id": 550,
        "subject": "RPS Daily Connect: Open POs screening - Development discussion",
        "description": "",
        "location": "Teams: https://teams.microsoft.com/l/meetup-join/19%3ameeting_OTAzYzYyZmQtYTgwMS00NzMwLWE0YTQtOGEzMWYwYTVhODk0%40thread.v2/0?context=%7b%22Tid%22%3a%22a00de4ec-48a8-43a6-be74-e31274e2060d%22%2c%22Oid%22%3a%22cfcbe14c-1367-46b5-b4a5-7bdc86c6fbdd%22%7d",
        "attendees": ["Shankar Reddy", "Kiran Kimar", "Abishek"],
        "start_time": "2025-10-16 10:00:00",
        "end_time": "2025-10-16 10:30:00",
        "notes": [
            {
                "text": "Структура ответа с ошибкой и success - должна быть одинаковая, сейчас отличается",
                "time": None,
                "person": None,
                "stream": None,
                "isASAP": False,
                "isIMP": False
            },
            {
                "text": "PostalCode redeploy - все еще есть ошибка",
                "time": None,
                "person": None,
                "stream": None,
                "isASAP": False,
                "isIMP": False
            },
            {
                "text": "Блок адреса - исправлено ли?",
                "time": None,
                "person": None,
                "stream": None,
                "isASAP": False,
                "isIMP": False
            }
        ],
        "recording_url": "",
        "created_at": "2025-10-09 11:34:46.123177",
        "updated_at": "2025-10-16 10:25:14.422803",
        "stream": ["RPS"],
        "actual_open_questions": "",
        "google_event_id": "1h5a7116enuf8hneoup0d1kpno",
        "google_calendar_link": "https://www.google.com/calendar/event?eid=MWg1YTcxMTZlbnVmOGhuZW91cDBkMWtwbm8gYWxpaGFub3ZAbQ",
        "last_google_sync": "2025-10-15 14:59:31.103798",
        "last_local_update": "2025-10-16 10:25:14.422803",
        "sync_source": "local",
        "google_updated_at": "2025-10-14 20:45:13.341000",
        "microsoft_event_id": None,
        "microsoft_calendar_link": None,
        "last_microsoft_sync": None,
        "microsoft_updated_at": None,
        "stream_ids": [10],
        "attendee_ids": [334, 313, 357],
        "start": "2025-10-16 10:00:00",
        "end": "2025-10-16 10:30:00",
        "stream_names": ["RPS"],
        "attendee_names": ["Abishek", "Kiran", "Shankar"]
    }
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        print("🔄 Восстанавливаем событие RPS Daily Connect: Open POs screening - Development discussion...")
        
        # Вставляем событие
        cur.execute("""
            INSERT INTO events (
                id, subject, description, location, start_time, end_time, 
                recording_url, created_at, updated_at, actual_open_questions,
                google_event_id, google_calendar_link, last_google_sync, last_local_update,
                sync_source, google_updated_at, microsoft_event_id, microsoft_calendar_link,
                last_microsoft_sync, microsoft_updated_at, stream_ids, attendee_ids
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
        """, (
            event_data["id"],
            event_data["subject"],
            event_data["description"],
            event_data["location"],
            event_data["start_time"],
            event_data["end_time"],
            event_data["recording_url"],
            event_data["created_at"],
            event_data["updated_at"],
            event_data["actual_open_questions"],
            event_data["google_event_id"],
            event_data["google_calendar_link"],
            event_data["last_google_sync"],
            event_data["last_local_update"],
            event_data["sync_source"],
            event_data["google_updated_at"],
            event_data["microsoft_event_id"],
            event_data["microsoft_calendar_link"],
            event_data["last_microsoft_sync"],
            event_data["microsoft_updated_at"],
            event_data["stream_ids"],
            event_data["attendee_ids"]
        ))
        
        print("✅ Событие восстановлено!")
        
        # Теперь создаем записки в таблице meeting_notes
        note_ids = []
        for i, note in enumerate(event_data["notes"]):
            cur.execute("""
                INSERT INTO meeting_notes (
                    event_id, note_text, time, person, is_question, resolved, resolved_at, created_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s
                ) RETURNING id
            """, (
                event_data["id"],
                note["text"],
                note["time"],
                note["person"],
                note["isASAP"],
                False,  # resolved
                None,    # resolved_at
                datetime.now()
            ))
            
            note_id = cur.fetchone()["id"]
            note_ids.append(note_id)
            print(f"✅ Записка {i+1} создана с ID: {note_id}")
        
        # Обновляем поле notes в событии с ID записок
        notes_field = ",".join(map(str, note_ids))
        cur.execute("""
            UPDATE events SET notes = %s WHERE id = %s
        """, (notes_field, event_data["id"]))
        
        print(f"✅ Поле notes обновлено: {notes_field}")
        
        conn.commit()
        print("🎉 Восстановление завершено успешно!")
        
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Ошибка восстановления: {e}")
        return False
        
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    restore_event_from_backup()

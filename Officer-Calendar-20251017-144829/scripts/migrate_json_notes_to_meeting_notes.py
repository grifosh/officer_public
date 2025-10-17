#!/usr/bin/env python3
"""
Скрипт для миграции заметок из JSON-массива в таблицу meeting_notes
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import os
import json
from datetime import datetime

def get_db_connection():
    """Получить подключение к базе данных"""
    return psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        port=int(os.getenv('DB_PORT', '5432')),
        dbname=os.getenv('DB_NAME', 'officer'),
        user=os.getenv('DB_USER', 'grifosh'),
        password=os.getenv('DB_PASSWORD', '')
    )

def migrate_json_notes_to_meeting_notes():
    """Мигрировать заметки из JSON-массива в таблицу meeting_notes"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        print("🔍 Поиск событий с JSON-массивами в поле notes...")
        
        # Находим события с JSON-массивами в поле notes
        cur.execute("""
            SELECT id, subject, notes, start_time
            FROM events 
            WHERE notes IS NOT NULL 
            AND notes != '[]' 
            AND notes LIKE '[%'
            ORDER BY start_time DESC
        """)
        
        events_with_json_notes = cur.fetchall()
        
        if not events_with_json_notes:
            print("✅ Событий с JSON-массивами в поле notes не найдено")
            return
        
        print(f"📝 Найдено {len(events_with_json_notes)} событий с JSON-массивами:")
        for event in events_with_json_notes:
            print(f"  - ID: {event['id']}, Название: {event['subject']}, Время: {event['start_time']}")
        
        # Обрабатываем каждое событие
        for event in events_with_json_notes:
            event_id = event['id']
            event_subject = event['subject']
            notes_json = event['notes']
            
            print(f"\n🔄 Обрабатываем событие {event_id}: {event_subject}")
            
            try:
                # Парсим JSON
                notes_data = json.loads(notes_json)
                print(f"  📝 Найдено {len(notes_data)} заметок в JSON")
                
                # Проверяем, есть ли уже заметки в таблице meeting_notes для этого события
                cur.execute("SELECT COUNT(*) as count FROM meeting_notes WHERE event_id = %s", (event_id,))
                existing_count = cur.fetchone()['count']
                
                if existing_count > 0:
                    print(f"  ⚠️ В таблице meeting_notes уже есть {existing_count} заметок для события {event_id}")
                    continue
                
                # Создаем заметки в таблице meeting_notes
                note_ids = []
                for note in notes_data:
                    note_text = note.get('text', '')
                    time = note.get('time', '')
                    person = note.get('person', '')
                    is_question = note.get('isASAP', False)  # Маппинг старых полей
                    
                    cur.execute("""
                        INSERT INTO meeting_notes (event_id, note_text, time, person, is_question, resolved, resolved_at, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING id
                    """, (event_id, note_text, time, person, is_question, False, None, datetime.now()))
                    
                    note_id = cur.fetchone()['id']
                    note_ids.append(note_id)
                    print(f"    ✅ Создана заметка ID {note_id}: {note_text[:50]}...")
                
                # Обновляем поле notes события на строку с ID заметок
                notes_ids_str = ','.join(map(str, note_ids))
                cur.execute("""
                    UPDATE events 
                    SET notes = %s 
                    WHERE id = %s
                """, (notes_ids_str, event_id))
                
                print(f"  ✅ Поле notes события {event_id} обновлено на: {notes_ids_str}")
                
            except json.JSONDecodeError as e:
                print(f"  ❌ Ошибка парсинга JSON для события {event_id}: {e}")
                continue
            except Exception as e:
                print(f"  ❌ Ошибка обработки события {event_id}: {e}")
                continue
        
        # Коммитим изменения
        conn.commit()
        print(f"\n✅ Миграция завершена. Изменения сохранены в базе данных")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    migrate_json_notes_to_meeting_notes()

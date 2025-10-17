#!/usr/bin/env python3
"""
Скрипт для исправления event_id в таблице meeting_notes
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import os
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

def fix_meeting_notes_event_id():
    """Исправить event_id для заметок с event_id = null"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        print("🔍 Поиск заметок с event_id = null...")
        
        # Сначала посмотрим на все заметки
        cur.execute("SELECT id, note_text, event_id FROM meeting_notes ORDER BY id DESC LIMIT 10")
        all_notes = cur.fetchall()
        print("📝 Последние 10 заметок:")
        for note in all_notes:
            print(f"  - ID: {note['id']}, event_id: {note['event_id']}, Текст: {note['note_text'][:30]}...")
        
        # Проверим поле notes события 681
        cur.execute("SELECT id, subject, notes FROM events WHERE id = 681")
        event_681 = cur.fetchone()
        print("🔍 Событие 681:")
        print(f"  - ID: {event_681['id']}")
        print(f"  - Название: {event_681['subject']}")
        print(f"  - Поле notes: '{event_681['notes']}'")
        
        # Проверим конкретные заметки 31 и 32
        cur.execute("SELECT id, note_text, event_id FROM meeting_notes WHERE id IN (31, 32)")
        specific_notes = cur.fetchall()
        print("🔍 Проверяем заметки 31 и 32:")
        for note in specific_notes:
            print(f"  - ID: {note['id']}, event_id: {note['event_id']}, Текст: {note['note_text'][:50]}...")
        
        # Находим заметки с event_id = null
        cur.execute("""
            SELECT id, note_text, created_at, event_id
            FROM meeting_notes 
            WHERE event_id IS NULL
            ORDER BY created_at ASC
        """)
        
        notes_with_null_event_id = cur.fetchall()
        
        if not notes_with_null_event_id:
            print("✅ Заметок с event_id = null не найдено")
            return
        
        print(f"📝 Найдено {len(notes_with_null_event_id)} заметок с event_id = null:")
        for note in notes_with_null_event_id:
            print(f"  - ID: {note['id']}, Текст: {note['note_text'][:50]}..., Создано: {note['created_at']}")
        
        # Для каждой заметки пытаемся найти подходящее событие
        for note in notes_with_null_event_id:
            note_id = note['id']
            note_text = note['note_text']
            created_at = note['created_at']
            
            print(f"\n🔍 Обрабатываем заметку ID {note_id}: {note_text[:50]}...")
            
            # Ищем события, созданные в тот же день
            event_date = created_at.date()
            
            cur.execute("""
                SELECT id, subject, start_time, end_time
                FROM events 
                WHERE DATE(start_time) = %s
                ORDER BY start_time ASC
            """, (event_date,))
            
            events_same_day = cur.fetchall()
            
            if not events_same_day:
                print(f"  ❌ События на дату {event_date} не найдены")
                continue
            
            print(f"  📅 Найдено {len(events_same_day)} событий на дату {event_date}:")
            for event in events_same_day:
                print(f"    - ID: {event['id']}, Название: {event['subject']}, Время: {event['start_time']} - {event['end_time']}")
            
            # Если есть только одно событие, привязываем к нему
            if len(events_same_day) == 1:
                event_id = events_same_day[0]['id']
                cur.execute("""
                    UPDATE meeting_notes 
                    SET event_id = %s 
                    WHERE id = %s
                """, (event_id, note_id))
                
                print(f"  ✅ Заметка {note_id} привязана к событию {event_id} ({events_same_day[0]['subject']})")
            else:
                # Если несколько событий, ищем по ключевым словам
                print(f"  🤔 Несколько событий найдено. Требуется ручной выбор.")
                print(f"  💡 Рекомендация: привязать к событию с наиболее подходящим названием")
                
                # Показываем варианты для ручного выбора
                for i, event in enumerate(events_same_day):
                    print(f"    {i+1}. ID: {event['id']}, Название: {event['subject']}")
        
        # Коммитим изменения
        conn.commit()
        print(f"\n✅ Изменения сохранены в базе данных")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    fix_meeting_notes_event_id()

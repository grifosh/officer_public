#!/usr/bin/env python3
"""
Умный скрипт очистки дубликатов в open_questions
Считает дубликатами тексты, которые начинаются одинаково
"""

import psycopg2
import os
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

# Подключение к базе данных
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5432'),
    'database': os.getenv('DB_NAME', 'officer'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'password')
}

def clean_duplicates_smart():
    """Умная очистка дубликатов по началу текста"""
    print("🧹 Умная очистка дубликатов в open_questions")
    print("=" * 50)
    
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    
    try:
        # Получаем статистику до очистки
        cur.execute("SELECT COUNT(*) FROM open_questions")
        total_before = cur.fetchone()[0]
        print(f"📊 Вопросов до очистки: {total_before}")
        
        # Находим дубликаты по началу текста (первые 200 символов) и событию
        cur.execute("""
            SELECT 
                COALESCE(event_id, -1) as event_id_group,
                LEFT(LOWER(TRIM(question_text)), 200) as text_start,
                COUNT(*) as count,
                ARRAY_AGG(id ORDER BY created_at DESC) as ids,
                ARRAY_AGG(created_at ORDER BY created_at DESC) as created_dates,
                ARRAY_AGG(event_id ORDER BY created_at DESC) as event_ids
            FROM open_questions 
            GROUP BY COALESCE(event_id, -1), LEFT(LOWER(TRIM(question_text)), 200)
            HAVING COUNT(*) > 1
            ORDER BY event_id_group, count DESC
        """)
        
        duplicates = cur.fetchall()
        
        if not duplicates:
            print("✅ Дубликатов не найдено")
            return
        
        print(f"📊 Найдено {len(duplicates)} групп дубликатов")
        print()
        
        total_deleted = 0
        
        for event_id_group, text_start, count, ids, created_dates, event_ids in duplicates:
            event_display = event_id_group if event_id_group != -1 else 'NULL'
            print(f"🔍 Группа дубликатов для события {event_display}:")
            print(f"   Начало текста: \"{text_start[:100]}...\"")
            print(f"   Количество: {count}")
            print(f"   ID: {ids}")
            print(f"   Event IDs: {event_ids}")
            print(f"   Даты создания: {created_dates}")
            
            # Оставляем самый новый (первый в отсортированном массиве)
            keep_id = ids[0]
            delete_ids = ids[1:]
            
            print(f"   ✅ Оставляем ID {keep_id} (самый новый)")
            print(f"   🗑️ Удаляем ID: {delete_ids}")
            
            # Удаляем дубликаты
            for delete_id in delete_ids:
                cur.execute("DELETE FROM open_questions WHERE id = %s", (delete_id,))
                total_deleted += 1
            
            print()
        
        # Подтверждаем изменения
        conn.commit()
        print(f"✅ Успешно удалено {total_deleted} дубликатов")
        
        # Получаем статистику после очистки
        cur.execute("SELECT COUNT(*) FROM open_questions")
        total_after = cur.fetchone()[0]
        print(f"📊 Вопросов после очистки: {total_after}")
        print(f"📉 Удалено: {total_before - total_after}")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    clean_duplicates_smart()

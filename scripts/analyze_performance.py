"""
Скрипт для анализа производительности SQL запросов
"""
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv
import time

load_dotenv()

# Конфигурация базы данных
DB_CONFIG = {
    "dbname": os.getenv("DB_NAME", "officer"),
    "user": os.getenv("DB_USER", "grifosh"),
    "password": os.getenv("DB_PASSWORD", ""),
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "5432"))
}

def get_db_connection():
    """Получить подключение к БД"""
    return psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)

def analyze_query_performance():
    """Анализ производительности запросов"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    print("⚡ Анализ производительности запросов:")
    print("=" * 50)
    
    # Тестовые запросы для анализа
    test_queries = [
        {
            "name": "Получение событий за период",
            "query": "SELECT id, subject, start_time, end_time FROM events WHERE start_time >= '2025-10-15' AND end_time <= '2025-10-16' ORDER BY start_time LIMIT 10;"
        },
        {
            "name": "Поиск участников по имени",
            "query": "SELECT id, name, email, use_count FROM attendees WHERE name ILIKE '%Greg%' ORDER BY use_count DESC LIMIT 10;"
        },
        {
            "name": "Получение нерешенных вопросов",
            "query": "SELECT id, question_text, person, topic, created_at FROM open_questions WHERE is_resolved = false ORDER BY created_at DESC LIMIT 10;"
        },
        {
            "name": "Статистика использования участников",
            "query": "SELECT id, name, email, use_count, last_used FROM attendees ORDER BY use_count DESC, last_used DESC LIMIT 10;"
        },
        {
            "name": "Поиск стримов по имени",
            "query": "SELECT id, name, created_at FROM streams WHERE name ILIKE '%RPS%' ORDER BY created_at DESC LIMIT 10;"
        }
    ]
    
    for test in test_queries:
        print(f"\n🔍 Тест: {test['name']}")
        
        try:
            # Простое измерение времени выполнения
            start_time = time.time()
            cur.execute(test['query'])
            results = cur.fetchall()
            execution_time = (time.time() - start_time) * 1000  # в миллисекундах
            
            print(f"Время выполнения: {execution_time:.2f}ms")
            print(f"Найдено строк: {len(results)}")
            
            # Показываем первые несколько результатов
            if results:
                print("Примеры результатов:")
                for i, row in enumerate(results[:3]):
                    print(f"  {i+1}. {dict(row)}")
                if len(results) > 3:
                    print(f"  ... и еще {len(results) - 3} строк")
            
        except Exception as e:
            print(f"❌ Ошибка выполнения: {e}")
    
    cur.close()
    conn.close()

def analyze_index_usage():
    """Анализ использования индексов"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    print("\n📇 Анализ использования индексов:")
    print("=" * 50)
    
    try:
        # Получаем статистику по индексам
        cur.execute("""
            SELECT 
                schemaname,
                tablename,
                indexname,
                idx_tup_read,
                idx_tup_fetch,
                idx_scan
            FROM pg_stat_user_indexes 
            WHERE schemaname = 'public'
            ORDER BY idx_scan DESC
            LIMIT 15;
        """)
        
        index_stats = cur.fetchall()
        
        print("Топ-15 наиболее используемых индексов:")
        for stat in index_stats:
            scans = stat['idx_scan'] or 0
            reads = stat['idx_tup_read'] or 0
            fetches = stat['idx_tup_fetch'] or 0
            
            print(f"  {stat['tablename']}.{stat['indexname']}")
            print(f"    Сканирований: {scans}")
            print(f"    Прочитано кортежей: {reads}")
            print(f"    Получено кортежей: {fetches}")
            print()
            
    except Exception as e:
        print(f"❌ Ошибка анализа индексов: {e}")
    
    cur.close()
    conn.close()

def analyze_table_statistics():
    """Анализ статистики таблиц"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    print("\n📊 Статистика таблиц:")
    print("=" * 50)
    
    try:
        cur.execute("""
            SELECT 
                schemaname,
                tablename,
                n_tup_ins as inserts,
                n_tup_upd as updates,
                n_tup_del as deletes,
                n_live_tup as live_tuples,
                n_dead_tup as dead_tuples,
                last_vacuum,
                last_autovacuum,
                last_analyze,
                last_autoanalyze
            FROM pg_stat_user_tables 
            WHERE schemaname = 'public'
            ORDER BY n_live_tup DESC;
        """)
        
        table_stats = cur.fetchall()
        
        print("Статистика таблиц:")
        for stat in table_stats:
            print(f"  {stat['tablename']}:")
            print(f"    Живых строк: {stat['live_tuples']}")
            print(f"    Мертвых строк: {stat['dead_tuples']}")
            print(f"    Вставок: {stat['inserts']}")
            print(f"    Обновлений: {stat['updates']}")
            print(f"    Удалений: {stat['deletes']}")
            print(f"    Последний анализ: {stat['last_analyze']}")
            print()
            
    except Exception as e:
        print(f"❌ Ошибка анализа статистики: {e}")
    
    cur.close()
    conn.close()

def suggest_optimizations():
    """Предложения по оптимизации"""
    print("\n💡 Предложения по оптимизации:")
    print("=" * 50)
    
    suggestions = [
        "1. Регулярно запускайте VACUUM ANALYZE для обновления статистики",
        "2. Настройте autovacuum для автоматической очистки",
        "3. Рассмотрите партиционирование больших таблиц",
        "4. Используйте EXPLAIN ANALYZE для анализа медленных запросов",
        "5. Мониторьте использование индексов и удаляйте неиспользуемые",
        "6. Рассмотрите создание составных индексов для частых комбинаций WHERE",
        "7. Используйте LIMIT для больших выборок",
        "8. Оптимизируйте запросы с JOIN'ами",
        "9. Рассмотрите материализованные представления для сложных запросов",
        "10. Настройте connection pooling (уже реализовано!)"
    ]
    
    for suggestion in suggestions:
        print(f"  {suggestion}")
    
    print("\n🔧 Команды для оптимизации:")
    print("  VACUUM ANALYZE;  -- Обновить статистику всех таблиц")
    print("  REINDEX DATABASE officer;  -- Пересоздать все индексы")
    print("  SELECT pg_stat_reset();  -- Сбросить статистику")

def main():
    """Основная функция"""
    print("🚀 Анализ производительности SQL запросов")
    print("=" * 60)
    
    try:
        # Анализ производительности запросов
        analyze_query_performance()
        
        # Анализ использования индексов
        analyze_index_usage()
        
        # Анализ статистики таблиц
        analyze_table_statistics()
        
        # Предложения по оптимизации
        suggest_optimizations()
        
        print("\n✅ Анализ производительности завершен!")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")

if __name__ == "__main__":
    main()

"""
Скрипт для анализа и оптимизации SQL запросов
"""
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

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

def analyze_table_sizes():
    """Анализ размеров таблиц"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    print("📊 Анализ размеров таблиц:")
    print("=" * 50)
    
    cur.execute("""
        SELECT 
            schemaname,
            tablename,
            attname,
            n_distinct,
            correlation,
            most_common_vals,
            most_common_freqs
        FROM pg_stats 
        WHERE schemaname = 'public'
        ORDER BY tablename, attname;
    """)
    
    stats = cur.fetchall()
    
    cur.execute("""
        SELECT 
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
            pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
    """)
    
    sizes = cur.fetchall()
    
    print("Размеры таблиц:")
    for size in sizes:
        print(f"  {size['tablename']}: {size['size']}")
    
    cur.close()
    conn.close()
    
    return sizes

def analyze_slow_queries():
    """Анализ медленных запросов"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    print("\n🐌 Анализ медленных запросов:")
    print("=" * 50)
    
    # Проверяем, включен ли pg_stat_statements
    cur.execute("""
        SELECT EXISTS(
            SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
        );
    """)
    
    if cur.fetchone()[0]:
        cur.execute("""
            SELECT 
                query,
                calls,
                total_time,
                mean_time,
                rows,
                100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
            FROM pg_stat_statements 
            ORDER BY mean_time DESC 
            LIMIT 10;
        """)
        
        slow_queries = cur.fetchall()
        
        print("Топ-10 медленных запросов:")
        for i, query in enumerate(slow_queries, 1):
            print(f"{i}. Среднее время: {query['mean_time']:.2f}ms")
            print(f"   Вызовов: {query['calls']}")
            print(f"   Строк: {query['rows']}")
            print(f"   Hit %: {query['hit_percent']:.1f}%")
            print(f"   Запрос: {query['query'][:100]}...")
            print()
    else:
        print("pg_stat_statements не включен. Включите для анализа производительности.")
    
    cur.close()
    conn.close()

def analyze_indexes():
    """Анализ существующих индексов"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    print("\n📇 Анализ индексов:")
    print("=" * 50)
    
    cur.execute("""
        SELECT 
            schemaname,
            tablename,
            indexname,
            indexdef,
            pg_size_pretty(pg_relation_size(indexname::regclass)) as size
        FROM pg_indexes 
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname;
    """)
    
    indexes = cur.fetchall()
    
    print("Существующие индексы:")
    for idx in indexes:
        print(f"  {idx['tablename']}.{idx['indexname']}: {idx['size']}")
        print(f"    {idx['indexdef']}")
        print()
    
    cur.close()
    conn.close()
    
    return indexes

def suggest_indexes():
    """Предложения по созданию индексов"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    print("\n💡 Предложения по индексам:")
    print("=" * 50)
    
    # Анализируем часто используемые колонки в WHERE и ORDER BY
    suggestions = []
    
    # События - часто ищем по датам
    suggestions.append({
        "table": "events",
        "columns": ["start_time"],
        "type": "btree",
        "reason": "Частые запросы по датам для календаря"
    })
    
    suggestions.append({
        "table": "events", 
        "columns": ["end_time"],
        "type": "btree",
        "reason": "Поиск событий по времени окончания"
    })
    
    # Участники - поиск по email и имени
    suggestions.append({
        "table": "attendees",
        "columns": ["email"],
        "type": "btree",
        "reason": "Быстрый поиск участников по email"
    })
    
    suggestions.append({
        "table": "attendees",
        "columns": ["name"],
        "type": "btree", 
        "reason": "Поиск участников по имени"
    })
    
    # Стримы - поиск по имени
    suggestions.append({
        "table": "streams",
        "columns": ["name"],
        "type": "btree",
        "reason": "Поиск стримов по имени"
    })
    
    # Open questions - часто ищем по статусу
    suggestions.append({
        "table": "open_questions",
        "columns": ["is_resolved"],
        "type": "btree",
        "reason": "Фильтрация решенных/нерешенных вопросов"
    })
    
    suggestions.append({
        "table": "open_questions",
        "columns": ["created_at"],
        "type": "btree",
        "reason": "Сортировка вопросов по дате создания"
    })
    
    # Составные индексы для частых комбинаций
    suggestions.append({
        "table": "events",
        "columns": ["start_time", "end_time"],
        "type": "btree",
        "reason": "Поиск событий в временном диапазоне"
    })
    
    suggestions.append({
        "table": "attendees",
        "columns": ["use_count", "last_used"],
        "type": "btree",
        "reason": "Сортировка по популярности и последнему использованию"
    })
    
    print("Рекомендуемые индексы:")
    for i, suggestion in enumerate(suggestions, 1):
        columns_str = ", ".join(suggestion["columns"])
        print(f"{i}. CREATE INDEX idx_{suggestion['table']}_{'_'.join(suggestion['columns'])} ON {suggestion['table']} ({columns_str});")
        print(f"   Причина: {suggestion['reason']}")
        print()
    
    cur.close()
    conn.close()
    
    return suggestions

def create_optimization_indexes():
    """Создание индексов для оптимизации"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    print("\n🔧 Создание индексов:")
    print("=" * 50)
    
    indexes_to_create = [
        # События
        "CREATE INDEX IF NOT EXISTS idx_events_start_time ON events (start_time);",
        "CREATE INDEX IF NOT EXISTS idx_events_end_time ON events (end_time);",
        "CREATE INDEX IF NOT EXISTS idx_events_start_end ON events (start_time, end_time);",
        "CREATE INDEX IF NOT EXISTS idx_events_subject ON events (subject);",
        
        # Участники
        "CREATE INDEX IF NOT EXISTS idx_attendees_email ON attendees (email);",
        "CREATE INDEX IF NOT EXISTS idx_attendees_name ON attendees (name);",
        "CREATE INDEX IF NOT EXISTS idx_attendees_use_count ON attendees (use_count DESC, last_used DESC);",
        
        # Стримы
        "CREATE INDEX IF NOT EXISTS idx_streams_name ON streams (name);",
        "CREATE INDEX IF NOT EXISTS idx_streams_use_count ON streams (use_count DESC, last_used DESC);",
        
        # Open questions
        "CREATE INDEX IF NOT EXISTS idx_open_questions_resolved ON open_questions (is_resolved);",
        "CREATE INDEX IF NOT EXISTS idx_open_questions_created ON open_questions (created_at DESC);",
        "CREATE INDEX IF NOT EXISTS idx_open_questions_event_id ON open_questions (event_id);",
        
        # Комментарии
        "CREATE INDEX IF NOT EXISTS idx_question_comments_question_id ON question_comments (question_id);",
        "CREATE INDEX IF NOT EXISTS idx_question_comments_created ON question_comments (created_at DESC);",
    ]
    
    created_count = 0
    for index_sql in indexes_to_create:
        try:
            cur.execute(index_sql)
            created_count += 1
            print(f"✅ {index_sql}")
        except Exception as e:
            print(f"❌ Ошибка создания индекса: {e}")
    
    conn.commit()
    print(f"\nСоздано индексов: {created_count}")
    
    cur.close()
    conn.close()

def analyze_query_performance():
    """Анализ производительности запросов"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    print("\n⚡ Анализ производительности запросов:")
    print("=" * 50)
    
    # Тестовые запросы для анализа
    test_queries = [
        {
            "name": "Получение событий за период",
            "query": "SELECT * FROM events WHERE start_time >= '2025-10-15' AND end_time <= '2025-10-16' ORDER BY start_time;"
        },
        {
            "name": "Поиск участников",
            "query": "SELECT * FROM attendees WHERE name ILIKE '%Greg%' ORDER BY use_count DESC;"
        },
        {
            "name": "Получение нерешенных вопросов",
            "query": "SELECT * FROM open_questions WHERE is_resolved = false ORDER BY created_at DESC;"
        },
        {
            "name": "Статистика использования участников",
            "query": "SELECT * FROM attendees ORDER BY use_count DESC, last_used DESC LIMIT 20;"
        }
    ]
    
    for test in test_queries:
        print(f"\n🔍 Тест: {test['name']}")
        
        # Включаем EXPLAIN ANALYZE
        cur.execute(f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {test['query']}")
        result = cur.fetchone()[0]
        
        plan = result[0]
        print(f"Время выполнения: {plan['Execution Time']:.2f}ms")
        print(f"Планирование: {plan['Planning Time']:.2f}ms")
        print(f"Строк: {plan['Plan']['Actual Rows']}")
        
        # Анализируем узлы плана
        def analyze_plan_node(node, level=0):
            indent = "  " * level
            node_type = node.get('Node Type', 'Unknown')
            cost = node.get('Total Cost', 0)
            rows = node.get('Actual Rows', 0)
            
            print(f"{indent}{node_type}: cost={cost:.2f}, rows={rows}")
            
            if 'Index Name' in node:
                print(f"{indent}  📇 Индекс: {node['Index Name']}")
            
            if 'Filter' in node:
                print(f"{indent}  🔍 Фильтр: {node['Filter']}")
            
            if 'Plans' in node:
                for child in node['Plans']:
                    analyze_plan_node(child, level + 1)
        
        analyze_plan_node(plan['Plan'])
    
    cur.close()
    conn.close()

def main():
    """Основная функция"""
    print("🚀 Анализ и оптимизация SQL запросов")
    print("=" * 60)
    
    try:
        # Анализ размеров таблиц
        sizes = analyze_table_sizes()
        
        # Анализ индексов
        indexes = analyze_indexes()
        
        # Предложения по индексам
        suggestions = suggest_indexes()
        
        # Создание индексов
        create_optimization_indexes()
        
        # Анализ производительности
        analyze_query_performance()
        
        # Анализ медленных запросов
        analyze_slow_queries()
        
        print("\n✅ Анализ завершен!")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")

if __name__ == "__main__":
    main()

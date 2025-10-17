"""
Скрипт для создания недостающих индексов
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

def check_table_structure():
    """Проверить структуру таблиц"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    print("🔍 Проверка структуры таблиц:")
    print("=" * 50)
    
    tables = ['streams', 'attendees', 'open_questions', 'question_comments']
    
    for table in tables:
        print(f"\n📋 Таблица {table}:")
        cur.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = %s 
            ORDER BY ordinal_position
        """, (table,))
        
        columns = cur.fetchall()
        for col in columns:
            nullable = "NULL" if col['is_nullable'] == 'YES' else "NOT NULL"
            print(f"  {col['column_name']}: {col['data_type']} ({nullable})")
    
    cur.close()
    conn.close()

def create_missing_indexes():
    """Создать недостающие индексы"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    print("\n🔧 Создание недостающих индексов:")
    print("=" * 50)
    
    # Проверяем существующие индексы
    cur.execute("""
        SELECT indexname, tablename, indexdef
        FROM pg_indexes 
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname
    """)
    
    existing_indexes = cur.fetchall()
    existing_names = {idx['indexname'] for idx in existing_indexes}
    
    print("Существующие индексы:")
    for idx in existing_indexes:
        print(f"  ✅ {idx['tablename']}.{idx['indexname']}")
    
    # Индексы для создания (только те, которых нет)
    indexes_to_create = [
        # Стримы - проверяем наличие use_count и last_used
        {
            "name": "idx_streams_use_count",
            "sql": "CREATE INDEX IF NOT EXISTS idx_streams_use_count ON streams (use_count DESC, last_used DESC);",
            "check": "SELECT column_name FROM information_schema.columns WHERE table_name = 'streams' AND column_name = 'use_count'"
        },
        
        # Open questions
        {
            "name": "idx_open_questions_resolved",
            "sql": "CREATE INDEX IF NOT EXISTS idx_open_questions_resolved ON open_questions (is_resolved);",
            "check": None
        },
        
        {
            "name": "idx_open_questions_created",
            "sql": "CREATE INDEX IF NOT EXISTS idx_open_questions_created ON open_questions (created_at DESC);",
            "check": None
        },
        
        {
            "name": "idx_open_questions_event_id",
            "sql": "CREATE INDEX IF NOT EXISTS idx_open_questions_event_id ON open_questions (event_id);",
            "check": None
        },
        
        # Комментарии
        {
            "name": "idx_question_comments_question_id",
            "sql": "CREATE INDEX IF NOT EXISTS idx_question_comments_question_id ON question_comments (question_id);",
            "check": None
        },
        
        {
            "name": "idx_question_comments_created",
            "sql": "CREATE INDEX IF NOT EXISTS idx_question_comments_created ON question_comments (created_at DESC);",
            "check": None
        },
    ]
    
    created_count = 0
    for index_info in indexes_to_create:
        index_name = index_info["name"]
        
        # Проверяем, существует ли индекс
        if index_name in existing_names:
            print(f"⏭️  {index_name} уже существует")
            continue
        
        # Проверяем наличие колонок (если нужно)
        if index_info["check"]:
            try:
                cur.execute(index_info["check"])
                if not cur.fetchone():
                    print(f"⏭️  {index_name} - колонка не найдена")
                    continue
            except Exception as e:
                print(f"❌ Ошибка проверки для {index_name}: {e}")
                continue
        
        # Создаем индекс
        try:
            cur.execute(index_info["sql"])
            created_count += 1
            print(f"✅ {index_name} создан")
        except Exception as e:
            print(f"❌ Ошибка создания {index_name}: {e}")
    
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
            "query": "SELECT * FROM events WHERE start_time >= '2025-10-15' AND end_time <= '2025-10-16' ORDER BY start_time LIMIT 10;"
        },
        {
            "name": "Поиск участников по имени",
            "query": "SELECT * FROM attendees WHERE name ILIKE '%Greg%' ORDER BY use_count DESC LIMIT 10;"
        },
        {
            "name": "Получение нерешенных вопросов",
            "query": "SELECT * FROM open_questions WHERE is_resolved = false ORDER BY created_at DESC LIMIT 10;"
        },
        {
            "name": "Статистика использования участников",
            "query": "SELECT * FROM attendees ORDER BY use_count DESC, last_used DESC LIMIT 10;"
        }
    ]
    
    for test in test_queries:
        print(f"\n🔍 Тест: {test['name']}")
        
        try:
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
            
        except Exception as e:
            print(f"❌ Ошибка анализа: {e}")
    
    cur.close()
    conn.close()

def main():
    """Основная функция"""
    print("🚀 Создание недостающих индексов и анализ производительности")
    print("=" * 70)
    
    try:
        # Проверка структуры таблиц
        check_table_structure()
        
        # Создание недостающих индексов
        create_missing_indexes()
        
        # Анализ производительности
        analyze_query_performance()
        
        print("\n✅ Оптимизация завершена!")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")

if __name__ == "__main__":
    main()

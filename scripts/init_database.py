#!/usr/bin/env python3
"""
Скрипт автоматической инициализации базы данных Officer Calendar
"""

import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

# Конфигурация базы данных
DB_CONFIG = {
    "dbname": os.getenv("DB_NAME", "officer"),
    "user": os.getenv("DB_USER", "officer"),
    "password": os.getenv("DB_PASSWORD", "officer_pwd"),
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "5432"))
}

def get_db_connection():
    """Получить подключение к БД"""
    try:
        return psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)
    except psycopg2.Error as e:
        print(f"❌ Ошибка подключения к базе данных: {e}")
        return None

def check_database_exists():
    """Проверить, существует ли база данных"""
    try:
        # Подключаемся к postgres для проверки существования БД
        config = DB_CONFIG.copy()
        config["dbname"] = "postgres"
        conn = psycopg2.connect(**config)
        cur = conn.cursor()
        
        cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (DB_CONFIG["dbname"],))
        exists = cur.fetchone() is not None
        
        cur.close()
        conn.close()
        
        return exists
    except Exception as e:
        print(f"❌ Ошибка проверки базы данных: {e}")
        return False

def create_database():
    """Создать базу данных"""
    try:
        # Подключаемся к postgres для создания БД
        config = DB_CONFIG.copy()
        config["dbname"] = "postgres"
        conn = psycopg2.connect(**config)
        conn.autocommit = True
        cur = conn.cursor()
        
        print(f"📦 Создание базы данных '{DB_CONFIG['dbname']}'...")
        cur.execute(f"CREATE DATABASE {DB_CONFIG['dbname']}")
        
        cur.close()
        conn.close()
        
        print("✅ База данных создана")
        return True
    except psycopg2.Error as e:
        if "already exists" in str(e):
            print("✅ База данных уже существует")
            return True
        else:
            print(f"❌ Ошибка создания базы данных: {e}")
            return False

def create_user():
    """Создать пользователя базы данных"""
    try:
        # Подключаемся к postgres для создания пользователя
        config = DB_CONFIG.copy()
        config["dbname"] = "postgres"
        conn = psycopg2.connect(**config)
        conn.autocommit = True
        cur = conn.cursor()
        
        print(f"👤 Создание пользователя '{DB_CONFIG['user']}'...")
        
        # Проверяем, существует ли пользователь
        cur.execute("SELECT 1 FROM pg_roles WHERE rolname = %s", (DB_CONFIG["user"],))
        if cur.fetchone():
            print("✅ Пользователь уже существует")
        else:
            cur.execute(f"CREATE USER {DB_CONFIG['user']} WITH PASSWORD %s", (DB_CONFIG["password"],))
            print("✅ Пользователь создан")
        
        # Предоставляем права
        cur.execute(f"GRANT ALL PRIVILEGES ON DATABASE {DB_CONFIG['dbname']} TO {DB_CONFIG['user']}")
        print("✅ Права предоставлены")
        
        cur.close()
        conn.close()
        
        return True
    except psycopg2.Error as e:
        print(f"❌ Ошибка создания пользователя: {e}")
        return False

def execute_sql_file(file_path):
    """Выполнить SQL файл"""
    try:
        conn = get_db_connection()
        if not conn:
            return False
            
        cur = conn.cursor()
        
        print(f"📄 Выполнение SQL файла: {file_path}")
        
        with open(file_path, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        # Разделяем на отдельные команды
        commands = [cmd.strip() for cmd in sql_content.split(';') if cmd.strip()]
        
        executed_count = 0
        for command in commands:
            if command and not command.startswith('--'):
                try:
                    cur.execute(command)
                    executed_count += 1
                except psycopg2.Error as e:
                    if "already exists" not in str(e) and "duplicate key" not in str(e):
                        print(f"⚠️  Предупреждение при выполнении команды: {e}")
        
        conn.commit()
        cur.close()
        conn.close()
        
        print(f"✅ Выполнено команд: {executed_count}")
        return True
        
    except Exception as e:
        print(f"❌ Ошибка выполнения SQL файла: {e}")
        return False

def check_tables():
    """Проверить созданные таблицы"""
    try:
        conn = get_db_connection()
        if not conn:
            return False
            
        cur = conn.cursor()
        
        print("\n🔍 Проверка созданных таблиц:")
        print("=" * 50)
        
        cur.execute("""
            SELECT table_name, 
                   (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
            FROM information_schema.tables t
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        """)
        
        tables = cur.fetchall()
        
        for table in tables:
            print(f"✅ {table['table_name']} ({table['column_count']} колонок)")
        
        cur.close()
        conn.close()
        
        print(f"\n📊 Всего таблиц: {len(tables)}")
        return True
        
    except Exception as e:
        print(f"❌ Ошибка проверки таблиц: {e}")
        return False

def main():
    """Основная функция инициализации"""
    print("🚀 Инициализация базы данных Officer Calendar")
    print("=" * 60)
    
    # Проверка переменных окружения
    print("🔧 Проверка конфигурации...")
    print(f"   База данных: {DB_CONFIG['dbname']}")
    print(f"   Пользователь: {DB_CONFIG['user']}")
    print(f"   Хост: {DB_CONFIG['host']}")
    print(f"   Порт: {DB_CONFIG['port']}")
    
    # Создание базы данных
    if not check_database_exists():
        if not create_database():
            print("❌ Не удалось создать базу данных")
            sys.exit(1)
    else:
        print("✅ База данных уже существует")
    
    # Создание пользователя
    if not create_user():
        print("❌ Не удалось создать пользователя")
        sys.exit(1)
    
    # Выполнение SQL скрипта создания схемы
    schema_file = "scripts/create_database_schema.sql"
    if os.path.exists(schema_file):
        if not execute_sql_file(schema_file):
            print("❌ Не удалось выполнить скрипт создания схемы")
            sys.exit(1)
    else:
        print(f"❌ Файл схемы не найден: {schema_file}")
        sys.exit(1)
    
    # Проверка созданных таблиц
    if not check_tables():
        print("❌ Не удалось проверить таблицы")
        sys.exit(1)
    
    print("\n🎉 Инициализация базы данных завершена успешно!")
    print("🌐 База данных готова для работы приложения")

if __name__ == "__main__":
    main()

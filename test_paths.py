#!/usr/bin/env python3
"""
Тестовый скрипт для проверки путей и импортов
"""

import os
import sys
from pathlib import Path

def test_paths():
    """Тестирование путей и импортов"""
    print("🔍 Тестирование путей и импортов...")
    
    # Проверка текущего рабочего каталога
    current_dir = os.getcwd()
    print(f"📁 Текущий каталог: {current_dir}")
    
    # Проверка PYTHONPATH
    pythonpath = os.environ.get('PYTHONPATH', '')
    print(f"🐍 PYTHONPATH: {pythonpath}")
    
    # Проверка существования ключевых директорий
    key_dirs = ['src', 'logs', 'venv']
    for dir_name in key_dirs:
        if os.path.exists(dir_name):
            print(f"✅ Директория {dir_name} существует")
        else:
            print(f"❌ Директория {dir_name} не найдена")
    
    # Проверка существования ключевых файлов
    key_files = ['src/api/main.py', 'requirements.txt', 'env.example.txt']
    for file_name in key_files:
        if os.path.exists(file_name):
            print(f"✅ Файл {file_name} существует")
        else:
            print(f"❌ Файл {file_name} не найден")
    
    # Тест импорта модулей
    print("\n🔧 Тестирование импортов...")
    
    # Добавляем текущий каталог в sys.path если его там нет
    if current_dir not in sys.path:
        sys.path.insert(0, current_dir)
        print(f"➕ Добавлен {current_dir} в sys.path")
    
    try:
        from src.utils.db_utils import DatabaseManager
        print("✅ Импорт DatabaseManager успешен")
    except ImportError as e:
        print(f"❌ Ошибка импорта DatabaseManager: {e}")
    
    try:
        from src.core.logging_config import setup_logging
        print("✅ Импорт setup_logging успешен")
    except ImportError as e:
        print(f"❌ Ошибка импорта setup_logging: {e}")
    
    # Тест создания директории логов
    print("\n📝 Тестирование создания директорий...")
    try:
        os.makedirs("logs", exist_ok=True)
        print("✅ Директория logs создана/существует")
        
        # Тест записи в лог
        test_log_file = "logs/test.log"
        with open(test_log_file, "w") as f:
            f.write("Test log entry\n")
        print("✅ Тестовая запись в лог успешна")
        
        # Удаляем тестовый файл
        os.remove(test_log_file)
        print("✅ Тестовый лог файл удален")
        
    except Exception as e:
        print(f"❌ Ошибка работы с логами: {e}")
    
    # Проверка переменных окружения
    print("\n🌍 Проверка переменных окружения...")
    env_vars = ['DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_PORT']
    for var in env_vars:
        value = os.environ.get(var, 'НЕ УСТАНОВЛЕНО')
        print(f"   {var}: {value}")
    
    print("\n🎉 Тестирование завершено!")

if __name__ == "__main__":
    test_paths()

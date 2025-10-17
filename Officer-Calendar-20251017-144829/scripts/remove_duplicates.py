#!/usr/bin/env python3
"""
Скрипт для удаления дублирующихся endpoints из server.py
"""

def remove_duplicates():
    with open('src/api/server.py', 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Находим дублирующиеся секции
    morning_todos_start = None
    morning_todos_end = None
    evening_conclusions_start = None
    evening_conclusions_end = None
    
    for i, line in enumerate(lines):
        if '# API endpoints для Morning ToDos' in line and morning_todos_start is None:
            morning_todos_start = i
        elif '# API endpoints для Evening Conclusions' in line and morning_todos_end is None:
            morning_todos_end = i
        elif '# API endpoints для Evening Conclusions' in line and evening_conclusions_start is None:
            evening_conclusions_start = i
        elif '# API endpoints для' in line and evening_conclusions_start is not None and evening_conclusions_end is None:
            evening_conclusions_end = i
            break
    
    # Если не нашли конец evening_conclusions, ищем до конца файла
    if evening_conclusions_start is not None and evening_conclusions_end is None:
        evening_conclusions_end = len(lines)
    
    print(f"Morning ToDos: {morning_todos_start}-{morning_todos_end}")
    print(f"Evening Conclusions: {evening_conclusions_start}-{evening_conclusions_end}")
    
    # Удаляем дублирующиеся секции
    if morning_todos_start is not None and morning_todos_end is not None:
        print(f"Удаляем дублирующуюся секцию Morning ToDos: строки {morning_todos_start}-{morning_todos_end}")
        lines = lines[:morning_todos_start] + lines[morning_todos_end:]
    
    if evening_conclusions_start is not None and evening_conclusions_end is not None:
        print(f"Удаляем дублирующуюся секцию Evening Conclusions: строки {evening_conclusions_start}-{evening_conclusions_end}")
        lines = lines[:evening_conclusions_start] + lines[evening_conclusions_end:]
    
    # Сохраняем обновленный файл
    with open('src/api/server.py', 'w', encoding='utf-8') as f:
        f.writelines(lines)
    
    print("✅ Дублирующиеся endpoints удалены!")

if __name__ == "__main__":
    remove_duplicates()

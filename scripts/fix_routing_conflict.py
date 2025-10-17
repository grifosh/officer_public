#!/usr/bin/env python3
"""
Скрипт для исправления конфликта маршрутизации в server.py
Перемещает /api/events/backups перед /api/events/{event_id}
"""

import re

def fix_routing_conflict():
    with open('src/api/server.py', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Найдем блок кода для /api/events/backups
    backups_pattern = r'@app\.get\("/api/events/backups"\).*?(?=# Модели для Meeting Notes|@app\.|$)'
    backups_match = re.search(backups_pattern, content, re.DOTALL)
    
    if not backups_match:
        print("❌ Не найден блок /api/events/backups")
        return False
    
    backups_code = backups_match.group(0)
    print(f"✅ Найден блок /api/events/backups ({len(backups_code)} символов)")
    
    # Найдем блок кода для /api/events/{event_id}
    event_id_pattern = r'@app\.get\("/api/events/\{event_id\}"\).*?(?=@app\.get\("/api/meeting-notes/event/\{event_id\}"\)|@app\.|$)'
    event_id_match = re.search(event_id_pattern, content, re.DOTALL)
    
    if not event_id_match:
        print("❌ Не найден блок /api/events/{event_id}")
        return False
    
    event_id_code = event_id_match.group(0)
    print(f"✅ Найден блок /api/events/{{event_id}} ({len(event_id_code)} символов)")
    
    # Удалим блок backups из текущего места
    content_without_backups = re.sub(backups_pattern, '', content, flags=re.DOTALL)
    
    # Найдем место для вставки (перед /api/events/{event_id})
    insert_pattern = r'(@app\.get\("/api/events/\{event_id\}"\))'
    insert_match = re.search(insert_pattern, content_without_backups)
    
    if not insert_match:
        print("❌ Не найдено место для вставки")
        return False
    
    # Вставим блок backups перед /api/events/{event_id}
    new_content = content_without_backups.replace(
        insert_match.group(1),
        backups_code + '\n' + insert_match.group(1)
    )
    
    # Сохраним изменения
    with open('src/api/server.py', 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print("✅ Конфликт маршрутизации исправлен!")
    print("   /api/events/backups перемещен перед /api/events/{event_id}")
    
    return True

if __name__ == "__main__":
    fix_routing_conflict()

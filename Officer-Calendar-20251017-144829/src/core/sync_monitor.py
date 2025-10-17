#!/usr/bin/env python3
"""
Скрипт мониторинга синхронизации удалений
Позволяет отслеживать состояние синхронизации и быстро обнаруживать проблемы
"""

import os
import time
import json
import requests
from datetime import datetime, timedelta
import argparse

class SyncDeletionMonitor:
    """Монитор синхронизации удалений"""
    
    def __init__(self, base_url="http://localhost:5001"):
        self.base_url = base_url
        self.log_files = [
            "logs/auto_sync.log",
            "logs/sync_deletions.log", 
            "logs/officer.log"
        ]
    
    def check_server_status(self):
        """Проверка статуса сервера"""
        try:
            response = requests.get(f"{self.base_url}/api/auto-sync/status", timeout=5)
            if response.status_code == 200:
                status = response.json()
                return True, status
            else:
                return False, f"HTTP {response.status_code}"
        except Exception as e:
            return False, str(e)
    
    def get_recent_deletions(self, hours=24):
        """Получение недавних удалений"""
        deletions = []
        
        for log_file in self.log_files:
            if not os.path.exists(log_file):
                continue
                
            try:
                with open(log_file, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                    
                # Ищем записи об удалениях за последние N часов
                cutoff_time = datetime.now() - timedelta(hours=hours)
                
                for line in lines:
                    if '🗑️ УДАЛЕНО:' in line or 'SYNC_DELETION' in line:
                        # Пытаемся извлечь время из лога
                        try:
                            # Простой парсинг времени из лога
                            if '|' in line:
                                time_part = line.split('|')[0].strip()
                                log_time = datetime.strptime(time_part, '%Y-%m-%d %H:%M:%S.%f')
                                
                                if log_time >= cutoff_time:
                                    deletions.append({
                                        'file': log_file,
                                        'time': log_time,
                                        'line': line.strip()
                                    })
                        except:
                            # Если не можем распарсить время, добавляем все равно
                            deletions.append({
                                'file': log_file,
                                'time': datetime.now(),
                                'line': line.strip()
                            })
                            
            except Exception as e:
                print(f"❌ Ошибка чтения {log_file}: {e}")
        
        return sorted(deletions, key=lambda x: x['time'], reverse=True)
    
    def check_sync_health(self):
        """Проверка здоровья синхронизации"""
        print("🔍 ПРОВЕРКА ЗДОРОВЬЯ СИНХРОНИЗАЦИИ")
        print("=" * 50)
        
        # 1. Проверка сервера
        server_ok, server_info = self.check_server_status()
        if server_ok:
            print(f"✅ Сервер работает: {server_info}")
        else:
            print(f"❌ Сервер недоступен: {server_info}")
            return False
        
        # 2. Проверка лог-файлов
        print("\n📁 ПРОВЕРКА ЛОГ-ФАЙЛОВ:")
        for log_file in self.log_files:
            if os.path.exists(log_file):
                size = os.path.getsize(log_file)
                mtime = datetime.fromtimestamp(os.path.getmtime(log_file))
                print(f"✅ {log_file}: {size} байт, изменен: {mtime.strftime('%H:%M:%S')}")
            else:
                print(f"❌ {log_file}: не найден")
        
        # 3. Проверка недавних удалений
        print("\n🗑️ НЕДАВНИЕ УДАЛЕНИЯ (последние 24 часа):")
        recent_deletions = self.get_recent_deletions(24)
        
        if recent_deletions:
            print(f"📊 Найдено {len(recent_deletions)} удалений:")
            for deletion in recent_deletions[:5]:  # Показываем последние 5
                print(f"  🕐 {deletion['time'].strftime('%H:%M:%S')} | {deletion['line']}")
        else:
            print("ℹ️ Удалений за последние 24 часа не найдено")
        
        # 4. Проверка событий в БД
        print("\n📊 СОБЫТИЯ В БД:")
        try:
            response = requests.get(f"{self.base_url}/api/events?date=2025-10-13")
            if response.status_code == 200:
                events = response.json()
                print(f"📅 Всего событий на сегодня: {len(events)}")
                
                # События с Google ID
                with_google_id = [e for e in events if e.get('google_event_id')]
                print(f"🔗 С событий с Google ID: {len(with_google_id)}")
                
                # Дубликаты
                time_groups = {}
                for event in events:
                    start_time = event['start'].split('T')[1][:5] if 'T' in event['start'] else event['start']
                    end_time = event['end'].split('T')[1][:5] if 'T' in event['end'] else event['end']
                    time_key = f'{start_time}-{end_time}'
                    if time_key not in time_groups:
                        time_groups[time_key] = []
                    time_groups[time_key].append(event)
                
                duplicates = {k: v for k, v in time_groups.items() if len(v) > 1}
                if duplicates:
                    print(f"⚠️ Дубликатов по времени: {len(duplicates)}")
                else:
                    print("✅ Дубликатов не найдено")
                    
            else:
                print(f"❌ Ошибка получения событий: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Ошибка проверки БД: {e}")
        
        return True
    
    def monitor_continuously(self, interval=60):
        """Непрерывный мониторинг"""
        print(f"🔄 Запуск непрерывного мониторинга (интервал: {interval} сек)")
        print("Нажмите Ctrl+C для остановки")
        
        try:
            while True:
                print(f"\n⏰ {datetime.now().strftime('%H:%M:%S')} - Проверка синхронизации")
                self.check_sync_health()
                time.sleep(interval)
                
        except KeyboardInterrupt:
            print("\n🛑 Мониторинг остановлен")
    
    def test_sync_deletion(self):
        """Тест синхронизации удалений"""
        print("🧪 ТЕСТ СИНХРОНИЗАЦИИ УДАЛЕНИЙ")
        print("=" * 40)
        
        # Получаем текущее состояние
        try:
            response = requests.get(f"{self.base_url}/api/events?date=2025-10-13")
            if response.status_code == 200:
                events_before = response.json()
                print(f"📊 Событий до теста: {len(events_before)}")
                
                # Ждем следующую синхронизацию
                print("⏳ Ожидание следующей синхронизации (5 минут)...")
                time.sleep(300)  # 5 минут
                
                # Проверяем состояние после
                response = requests.get(f"{self.base_url}/api/events?date=2025-10-13")
                if response.status_code == 200:
                    events_after = response.json()
                    print(f"📊 Событий после теста: {len(events_after)}")
                    
                    if len(events_after) != len(events_before):
                        print(f"🔄 Изменение количества событий: {len(events_after) - len(events_before)}")
                    else:
                        print("ℹ️ Количество событий не изменилось")
                        
            else:
                print(f"❌ Ошибка получения событий: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Ошибка теста: {e}")

def main():
    """Главная функция"""
    parser = argparse.ArgumentParser(description='Монитор синхронизации удалений')
    parser.add_argument('--check', action='store_true', help='Одноразовая проверка')
    parser.add_argument('--monitor', action='store_true', help='Непрерывный мониторинг')
    parser.add_argument('--test', action='store_true', help='Тест синхронизации')
    parser.add_argument('--interval', type=int, default=60, help='Интервал мониторинга в секундах')
    
    args = parser.parse_args()
    
    monitor = SyncDeletionMonitor()
    
    if args.check:
        monitor.check_sync_health()
    elif args.monitor:
        monitor.monitor_continuously(args.interval)
    elif args.test:
        monitor.test_sync_deletion()
    else:
        # По умолчанию - одноразовая проверка
        monitor.check_sync_health()

if __name__ == "__main__":
    main()

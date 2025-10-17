#!/usr/bin/env python3
"""
Логика определения направления синхронизации на основе времени изменений
"""

from datetime import datetime
from typing import Dict, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

class SyncDirectionDetector:
    """Детектор направления синхронизации"""
    
    @staticmethod
    def determine_sync_direction(local_event: Dict, google_event: Dict) -> Tuple[str, str]:
        """
        Определяет направление синхронизации на основе времени изменений
        
        Args:
            local_event: Событие из локальной БД
            google_event: Событие из Google Calendar
            
        Returns:
            Tuple[str, str]: (направление, причина)
            - направление: 'local_to_google', 'google_to_local', 'conflict', 'no_change'
            - причина: описание решения
        """
        
        # Извлекаем времена изменений
        local_updated = None
        google_updated = None
        last_google_sync = None
        
        if local_event:
            local_updated = SyncDirectionDetector._parse_timestamp(local_event.get('last_local_update'))
            last_google_sync = SyncDirectionDetector._parse_timestamp(local_event.get('last_google_sync'))
        
        if google_event:
            google_updated = SyncDirectionDetector._parse_timestamp(google_event.get('updated'))
        
        logger.debug(f"🔍 Анализ синхронизации события: {local_event.get('subject', 'Unknown') if local_event else 'Google Only'}")
        logger.debug(f"  📅 Локальное обновление: {local_updated}")
        logger.debug(f"  📅 Google обновление: {google_updated}")
        logger.debug(f"  📅 Последняя синхронизация: {last_google_sync}")
        
        # Случай 1: Событие есть только локально
        if not google_event:
            return 'local_to_google', 'Событие существует только локально'
        
        # Случай 2: Событие есть только в Google Calendar
        if not local_event:
            return 'google_to_local', 'Событие существует только в Google Calendar'
        
        # Случай 3: Нет информации о времени изменений
        if not local_updated and not google_updated:
            return 'conflict', 'Недостаточно информации о времени изменений'
        
        # Случай 4: Только локальное время известно
        if not google_updated:
            return 'local_to_google', 'Локальное событие изменено, Google время неизвестно'
        
        # Случай 5: Только Google время известно
        if not local_updated:
            return 'google_to_local', 'Google событие изменено, локальное время неизвестно'
        
        # Случай 6: Оба времени известны - сравниваем
        time_diff = abs((local_updated - google_updated).total_seconds())
        
        # Если времена одинаковые (разница менее 1 секунды) - нет изменений
        if time_diff < 1:
            return 'no_change', 'Изменений нет'
        
        # Если разница менее 5 секунд - считаем одновременными изменениями
        if time_diff < 5:
            return 'conflict', f'Одновременные изменения (разница: {time_diff:.1f}с)'
        
        # Определяем, какое событие новее
        if local_updated > google_updated:
            return 'local_to_google', f'Локальное событие новее на {time_diff:.1f}с'
        else:
            return 'google_to_local', f'Google событие новее на {time_diff:.1f}с'
    
    @staticmethod
    def _parse_timestamp(timestamp_str: Optional[str]) -> Optional[datetime]:
        """Парсит строку времени в datetime объект"""
        if not timestamp_str:
            return None
        
        # Если уже datetime объект - возвращаем как есть
        if isinstance(timestamp_str, datetime):
            return timestamp_str
        
        try:
            # Пробуем разные форматы
            formats = [
                '%Y-%m-%dT%H:%M:%S.%fZ',  # ISO с микросекундами и Z
                '%Y-%m-%dT%H:%M:%SZ',     # ISO без микросекунд и Z
                '%Y-%m-%dT%H:%M:%S.%f',   # ISO с микросекундами
                '%Y-%m-%dT%H:%M:%S',      # ISO без микросекунд
                '%Y-%m-%d %H:%M:%S.%f',   # PostgreSQL формат
                '%Y-%m-%d %H:%M:%S',      # Простой формат
            ]
            
            for fmt in formats:
                try:
                    return datetime.strptime(timestamp_str, fmt)
                except ValueError:
                    continue
            
            # Если ничего не подошло, пробуем парсить как ISO
            return datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
            
        except Exception as e:
            logger.warning(f"⚠️ Не удалось распарсить время '{timestamp_str}': {e}")
            return None
    
    @staticmethod
    def get_sync_priority(local_event: Dict, google_event: Dict) -> str:
        """
        Определяет приоритет синхронизации при конфликте
        
        Returns:
            str: 'local', 'google', или 'manual'
        """
        
        # Приоритеты:
        # 1. События с важными локальными данными (notes, questions)
        local_has_important_data = bool(
            local_event.get('notes') or 
            local_event.get('actual_open_questions') or
            local_event.get('recording_url')
        )
        
        # 2. События с Google ID (уже синхронизированные)
        has_google_id = bool(local_event.get('google_event_id'))
        
        # 3. Время последнего изменения
        local_updated = SyncDirectionDetector._parse_timestamp(local_event.get('last_local_update'))
        google_updated = SyncDirectionDetector._parse_timestamp(google_event.get('updated'))
        
        if local_has_important_data:
            return 'local'
        elif has_google_id and google_updated and local_updated and google_updated > local_updated:
            return 'google'
        else:
            return 'local'  # По умолчанию приоритет локальным данным
    
    @staticmethod
    def log_sync_decision(event_subject: str, direction: str, reason: str, 
                         local_time: Optional[datetime] = None, 
                         google_time: Optional[datetime] = None):
        """Логирует решение о направлении синхронизации"""
        
        logger.info(f"🔄 СИНХРОНИЗАЦИЯ: {event_subject}")
        logger.info(f"   📍 Направление: {direction}")
        logger.info(f"   💭 Причина: {reason}")
        
        if local_time:
            logger.info(f"   📅 Локальное время: {local_time.strftime('%H:%M:%S')}")
        if google_time:
            logger.info(f"   📅 Google время: {google_time.strftime('%H:%M:%S')}")

def test_sync_direction():
    """Тестирование логики определения направления"""
    
    print("🧪 ТЕСТИРОВАНИЕ ЛОГИКИ СИНХРОНИЗАЦИИ")
    print("=" * 50)
    
    # Тест 1: Локальное событие новее
    local_event = {
        'subject': 'Test Event 1',
        'last_local_update': '2025-10-13T17:00:00',
        'last_google_sync': '2025-10-13T16:00:00',
        'notes': 'Important notes'
    }
    google_event = {
        'summary': 'Test Event 1',
        'updated': '2025-10-13T16:30:00'
    }
    
    direction, reason = SyncDirectionDetector.determine_sync_direction(local_event, google_event)
    print(f"✅ Тест 1: {direction} - {reason}")
    
    # Тест 2: Google событие новее
    local_event = {
        'subject': 'Test Event 2',
        'last_local_update': '2025-10-13T16:00:00',
        'last_google_sync': '2025-10-13T16:00:00'
    }
    google_event = {
        'summary': 'Test Event 2',
        'updated': '2025-10-13T17:00:00'
    }
    
    direction, reason = SyncDirectionDetector.determine_sync_direction(local_event, google_event)
    print(f"✅ Тест 2: {direction} - {reason}")
    
    # Тест 3: Конфликт
    local_event = {
        'subject': 'Test Event 3',
        'last_local_update': '2025-10-13T17:00:00',
        'last_google_sync': '2025-10-13T16:00:00'
    }
    google_event = {
        'summary': 'Test Event 3',
        'updated': '2025-10-13T17:00:02'
    }
    
    direction, reason = SyncDirectionDetector.determine_sync_direction(local_event, google_event)
    print(f"✅ Тест 3: {direction} - {reason}")

if __name__ == "__main__":
    test_sync_direction()

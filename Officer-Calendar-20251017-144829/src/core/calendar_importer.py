"""
Calendar Import Module
Модуль для импорта событий из файлов календаря
"""

import csv
import json
from datetime import datetime
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)

class CalendarImporter:
    """Класс для импорта событий из файлов"""
    
    def import_from_csv(self, file_path: str) -> List[Dict]:
        """Импорт событий из CSV файла"""
        events = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                
                for row in reader:
                    event = {
                        'title': row.get('title', ''),
                        'start_time': row.get('start_time', ''),
                        'end_time': row.get('end_time', ''),
                        'description': row.get('description', ''),
                        'location': row.get('location', ''),
                        'attendees': row.get('attendees', '').split(',') if row.get('attendees') else [],
                        'source': 'csv_import'
                    }
                    events.append(event)
                    
            logger.info(f"✅ Импортировано {len(events)} событий из CSV")
            return events
            
        except Exception as e:
            logger.error(f"❌ Ошибка импорта CSV: {str(e)}")
            return []
    
    def import_from_ics(self, file_path: str) -> List[Dict]:
        """Импорт событий из ICS файла (iCalendar)"""
        events = []
        
        try:
            # Простой парсер ICS файла
            with open(file_path, 'r', encoding='utf-8') as file:
                content = file.read()
                
            # Разделяем события
            event_blocks = content.split('BEGIN:VEVENT')
            
            for block in event_blocks[1:]:  # Пропускаем первый пустой блок
                event = self._parse_ics_event(block)
                if event:
                    events.append(event)
                    
            logger.info(f"✅ Импортировано {len(events)} событий из ICS")
            return events
            
        except Exception as e:
            logger.error(f"❌ Ошибка импорта ICS: {str(e)}")
            return []
    
    def _parse_ics_event(self, block: str) -> Dict:
        """Парсинг одного события из ICS блока"""
        try:
            lines = block.split('\n')
            event = {}
            
            for line in lines:
                line = line.strip()
                if line.startswith('SUMMARY:'):
                    event['title'] = line[8:]
                elif line.startswith('DTSTART:'):
                    event['start_time'] = self._parse_ics_datetime(line[8:])
                elif line.startswith('DTEND:'):
                    event['end_time'] = self._parse_ics_datetime(line[6:])
                elif line.startswith('DESCRIPTION:'):
                    event['description'] = line[12:]
                elif line.startswith('LOCATION:'):
                    event['location'] = line[9:]
                elif line.startswith('ATTENDEE:'):
                    if 'attendees' not in event:
                        event['attendees'] = []
                    # Извлекаем email из строки ATTENDEE
                    email = line.split('mailto:')[1].split(';')[0] if 'mailto:' in line else line[9:]
                    event['attendees'].append(email)
            
            event['source'] = 'ics_import'
            return event if event.get('title') else None
            
        except Exception as e:
            logger.error(f"❌ Ошибка парсинга ICS события: {str(e)}")
            return None
    
    def _parse_ics_datetime(self, dt_string: str) -> str:
        """Парсинг даты и времени из ICS формата"""
        try:
            # Убираем возможные параметры
            dt_string = dt_string.split(';')[0]
            
            # Формат: YYYYMMDDTHHMMSSZ или YYYYMMDDTHHMMSS
            if len(dt_string) >= 15:
                year = dt_string[:4]
                month = dt_string[4:6]
                day = dt_string[6:8]
                hour = dt_string[9:11]
                minute = dt_string[11:13]
                second = dt_string[13:15]
                
                # Создаем ISO строку
                iso_string = f"{year}-{month}-{day}T{hour}:{minute}:{second}"
                return iso_string
                
        except Exception as e:
            logger.error(f"❌ Ошибка парсинга даты: {str(e)}")
            
        return dt_string

def create_sample_csv():
    """Создать пример CSV файла для импорта"""
    sample_data = [
        {
            'title': 'Встреча с командой',
            'start_time': '2025-01-15T10:00:00',
            'end_time': '2025-01-15T11:00:00',
            'description': 'Еженедельная встреча команды',
            'location': 'Конференц-зал A',
            'attendees': 'ivan@company.com,maria@company.com'
        },
        {
            'title': 'Презентация проекта',
            'start_time': '2025-01-15T14:00:00',
            'end_time': '2025-01-15T15:30:00',
            'description': 'Демонстрация нового проекта',
            'location': 'Офис',
            'attendees': 'team@company.com'
        }
    ]
    
    with open('sample_events.csv', 'w', newline='', encoding='utf-8') as file:
        fieldnames = ['title', 'start_time', 'end_time', 'description', 'location', 'attendees']
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(sample_data)
    
    logger.info("📄 Создан пример файла sample_events.csv")

if __name__ == "__main__":
    # Тестирование модуля
    logger.info("🧪 Тестирование импорта календаря")
    
    # Создаем пример файла
    create_sample_csv()
    
    # Тестируем импорт
    importer = CalendarImporter()
    events = importer.import_from_csv('sample_events.csv')
    
    if events:
        logger.info(f"📅 Импортировано событий: {len(events)}")
        for event in events:
            logger.info(f"  - {event['title']} ({event['start_time']} - {event['end_time']})")
    else:
        logger.error("❌ Импорт не удался")


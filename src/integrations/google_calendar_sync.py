"""
Google Calendar Integration Module
Модуль для интеграции с Google Calendar API
"""

import os
import json
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import logging

try:
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from google.auth.transport.requests import Request
    from googleapiclient.discovery import build
    import pickle
except ImportError:
    print("⚠️ Google Calendar API не установлен. Установите: pip install google-api-python-client google-auth-oauthlib")
    Credentials = None
    InstalledAppFlow = None
    Request = None
    build = None
    pickle = None

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Области доступа для Google Calendar API
SCOPES = ['https://www.googleapis.com/auth/calendar']

class GoogleCalendarSync:
    """Класс для синхронизации с Google Calendar"""
    
    def __init__(self, credentials_file: str = "credentials.json", token_file: str = "token.pickle"):
        self.credentials_file = credentials_file
        self.token_file = token_file
        self.service = None
        self.credentials = None
        
    def authenticate(self) -> bool:
        """Аутентификация с Google Calendar API"""
        try:
            if not os.path.exists(self.credentials_file):
                logger.error(f"❌ Файл учетных данных не найден: {self.credentials_file}")
                logger.info("💡 Создайте файл credentials.json в Google Cloud Console")
                return False
            
            # Загружаем сохраненные учетные данные
            if os.path.exists(self.token_file):
                with open(self.token_file, 'rb') as token:
                    self.credentials = pickle.load(token)
            
            # Если нет действительных учетных данных, запрашиваем авторизацию
            if not self.credentials or not self.credentials.valid:
                if self.credentials and self.credentials.expired and self.credentials.refresh_token:
                    self.credentials.refresh(Request())
                else:
                    flow = InstalledAppFlow.from_client_secrets_file(
                        self.credentials_file, SCOPES)
                    self.credentials = flow.run_local_server(port=0)
                
                # Сохраняем учетные данные для следующего запуска
                with open(self.token_file, 'wb') as token:
                    pickle.dump(self.credentials, token)
            
            # Создаем сервис Google Calendar
            self.service = build('calendar', 'v3', credentials=self.credentials)
            logger.info("✅ Успешная аутентификация с Google Calendar")
            return True
            
        except Exception as e:
            logger.error(f"❌ Ошибка аутентификации: {str(e)}")
            return False
    
    def get_today_events(self, calendar_id: str = 'primary') -> List[Dict]:
        """Получить события на сегодняшний день"""
        return self.get_events_for_period(days_ahead=0, calendar_id=calendar_id)
    
    def get_events_for_period(self, days_ahead: int = 7, calendar_id: str = 'primary') -> List[Dict]:
        """Получить события на несколько дней вперед"""
        try:
            if not self.service:
                logger.error("❌ Сервис Google Calendar не инициализирован")
                return []
            
            # Получаем текущую дату и дату окончания периода
            now = datetime.now()
            start_of_period = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end_of_period = now + timedelta(days=days_ahead)
            end_of_period = end_of_period.replace(hour=23, minute=59, second=59, microsecond=999999)
            
            # Форматируем даты для API
            time_min = start_of_period.isoformat() + 'Z'
            time_max = end_of_period.isoformat() + 'Z'
            
            logger.info(f"📅 Получение событий с {time_min} по {time_max}")
            logger.info(f"🕐 Текущее время системы: {now}")
            logger.info(f"📅 Начало периода: {start_of_period}")
            logger.info(f"📅 Конец периода: {end_of_period}")
            logger.info(f"📊 Период: {days_ahead} дней вперед")
            logger.info(f"🌍 Calendar ID: {calendar_id}")
            
            # Запрашиваем события
            logger.info("🌐 Отправка запроса к Google Calendar API...")
            events_result = self.service.events().list(
                calendarId=calendar_id,
                timeMin=time_min,
                timeMax=time_max,
                singleEvents=True,
                orderBy='startTime'
            ).execute()
            
            logger.info(f"📡 Ответ от Google Calendar API получен")
            logger.info(f"📊 Сырые данные: {json.dumps(events_result, indent=2, default=str)}")
            
            events = events_result.get('items', [])
            logger.info(f"📊 Найдено {len(events)} событий за период ({days_ahead} дней)")
            
            # Логируем каждое событие
            for i, event in enumerate(events):
                logger.info(f"📅 Событие {i+1}:")
                logger.info(f"   ID: {event.get('id', 'N/A')}")
                logger.info(f"   Название: {event.get('summary', 'N/A')}")
                logger.info(f"   Начало: {event.get('start', {})}")
                logger.info(f"   Окончание: {event.get('end', {})}")
                logger.info(f"   Описание: {event.get('description', 'N/A')}")
                logger.info(f"   Местоположение: {event.get('location', 'N/A')}")
                logger.info(f"   Участники: {len(event.get('attendees', []))}")
                logger.info(f"   Статус: {event.get('status', 'N/A')}")
                logger.info(f"   Полные данные: {json.dumps(event, indent=2, default=str)}")
            
            # Обрабатываем события
            processed_events = []
            for i, event in enumerate(events):
                logger.info(f"🔄 Обработка события {i+1}: {event.get('summary', 'Без названия')}")
                processed_event = self._process_event(event)
                if processed_event:
                    processed_events.append(processed_event)
                    logger.info(f"✅ Событие {i+1} успешно обработано")
                else:
                    logger.warning(f"⚠️ Событие {i+1} не удалось обработать")
            
            logger.info(f"🎯 Итого обработано событий за период: {len(processed_events)}")
            return processed_events
            
        except Exception as e:
            logger.error(f"❌ Ошибка получения событий: {str(e)}")
            logger.error(f"❌ Тип ошибки: {type(e).__name__}")
            logger.error(f"❌ Детали ошибки: {str(e)}")
            import traceback
            logger.error(f"❌ Traceback: {traceback.format_exc()}")
            return []
    
    def create_event_in_google_calendar(self, event_data: Dict) -> Optional[str]:
        """Создать событие в Google Calendar"""
        try:
            if not self.service:
                logger.error("❌ Сервис Google Calendar не инициализирован")
                return None
            
            logger.info(f"📝 Создание события в Google Calendar: {event_data.get('title', 'Без названия')}")
            
            # Убеждаемся, что время передается как строка
            start_time = event_data.get('start_time')
            end_time = event_data.get('end_time')
            
            # Если время пришло как объект datetime, конвертируем в строку
            if hasattr(start_time, 'strftime'):
                start_time = start_time.strftime('%Y-%m-%dT%H:%M:%S')
            elif isinstance(start_time, str) and ' ' in start_time:
                # Конвертируем формат "2025-10-09 16:45:00" в "2025-10-09T16:45:00"
                start_time = start_time.replace(' ', 'T')
            
            if hasattr(end_time, 'strftime'):
                end_time = end_time.strftime('%Y-%m-%dT%H:%M:%S')
            elif isinstance(end_time, str) and ' ' in end_time:
                # Конвертируем формат "2025-10-09 17:00:00" в "2025-10-09T17:00:00"
                end_time = end_time.replace(' ', 'T')
            
            # Подготавливаем данные события для Google Calendar API
            google_event = {
                'summary': event_data.get('title', 'Без названия'),
                'description': event_data.get('description', ''),
                'location': event_data.get('location', ''),
                'start': {
                    'dateTime': start_time,
                    'timeZone': 'Europe/Moscow'
                },
                'end': {
                    'dateTime': end_time,
                    'timeZone': 'Europe/Moscow'
                }
            }
            
            # Добавляем участников если есть
            if event_data.get('attendees'):
                google_event['attendees'] = []
                for attendee in event_data['attendees']:
                    if attendee.strip():  # Проверяем, что участник не пустой
                        # Проверяем, является ли строка валидным email
                        if '@' in attendee and '.' in attendee.split('@')[1]:
                            # Это email адрес
                            google_event['attendees'].append({
                                'email': attendee.strip(),
                                'displayName': attendee.strip()
                            })
                        else:
                            # Это имя, не добавляем в участники Google Calendar
                            logger.debug(f"⚠️ Пропускаем участника '{attendee}' - не является email адресом")
            
            logger.info(f"📊 Данные для Google Calendar: {json.dumps(google_event, indent=2, default=str)}")
            
            # Создаем событие
            created_event = self.service.events().insert(
                calendarId='primary',
                body=google_event
            ).execute()
            
            event_id = created_event.get('id')
            event_link = created_event.get('htmlLink')
            
            logger.info(f"✅ Событие создано в Google Calendar")
            logger.info(f"🆔 ID события: {event_id}")
            logger.info(f"🔗 Ссылка: {event_link}")
            
            return event_id
            
        except Exception as e:
            logger.error(f"❌ Ошибка создания события в Google Calendar: {str(e)}")
            logger.error(f"❌ Тип ошибки: {type(e).__name__}")
            logger.error(f"❌ Данные события: {json.dumps(event_data, indent=2, default=str)}")
            import traceback
            logger.error(f"❌ Traceback: {traceback.format_exc()}")
            return None
    
    def update_event_in_google_calendar(self, event_id: str, event_data: Dict) -> bool:
        """Обновить событие в Google Calendar"""
        try:
            if not self.service:
                logger.error("❌ Сервис Google Calendar не инициализирован")
                return False
            
            logger.info(f"📝 Обновление события в Google Calendar: {event_id}")
            
            # Убеждаемся, что время передается как строка
            start_time = event_data.get('start_time')
            end_time = event_data.get('end_time')
            
            # Если время пришло как объект datetime, конвертируем в строку
            if hasattr(start_time, 'strftime'):
                start_time = start_time.strftime('%Y-%m-%dT%H:%M:%S')
            elif isinstance(start_time, str) and ' ' in start_time:
                # Конвертируем формат "2025-10-09 16:45:00" в "2025-10-09T16:45:00"
                start_time = start_time.replace(' ', 'T')
            
            if hasattr(end_time, 'strftime'):
                end_time = end_time.strftime('%Y-%m-%dT%H:%M:%S')
            elif isinstance(end_time, str) and ' ' in end_time:
                # Конвертируем формат "2025-10-09 17:00:00" в "2025-10-09T17:00:00"
                end_time = end_time.replace(' ', 'T')
            
            # Подготавливаем данные события для Google Calendar API
            google_event = {
                'summary': event_data.get('title', 'Без названия'),
                'description': event_data.get('description', ''),
                'location': event_data.get('location', ''),
                'start': {
                    'dateTime': start_time,
                    'timeZone': 'Europe/Moscow'
                },
                'end': {
                    'dateTime': end_time,
                    'timeZone': 'Europe/Moscow'
                }
            }
            
            # Добавляем участников если есть
            if event_data.get('attendees'):
                google_event['attendees'] = []
                for attendee in event_data['attendees']:
                    if attendee.strip():  # Проверяем, что участник не пустой
                        # Проверяем, является ли строка валидным email
                        if '@' in attendee and '.' in attendee.split('@')[1]:
                            # Это email адрес
                            google_event['attendees'].append({
                                'email': attendee.strip(),
                                'displayName': attendee.strip()
                            })
                        else:
                            # Это имя, не добавляем в участники Google Calendar
                            logger.debug(f"⚠️ Пропускаем участника '{attendee}' - не является email адресом")
            
            logger.info(f"📊 Данные для обновления: {json.dumps(google_event, indent=2, default=str)}")
            
            # Обновляем событие
            updated_event = self.service.events().update(
                calendarId='primary',
                eventId=event_id,
                body=google_event
            ).execute()
            
            logger.info(f"✅ Событие обновлено в Google Calendar")
            logger.info(f"🆔 ID события: {updated_event.get('id')}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Ошибка обновления события в Google Calendar: {str(e)}")
            logger.error(f"❌ Тип ошибки: {type(e).__name__}")
            logger.error(f"❌ Данные события: {json.dumps(event_data, indent=2, default=str)}")
            import traceback
            logger.error(f"❌ Traceback: {traceback.format_exc()}")
            return False
    
    def delete_event_from_google_calendar(self, event_id: str) -> bool:
        """Удалить событие из Google Calendar"""
        try:
            if not self.service:
                logger.error("❌ Сервис Google Calendar не инициализирован")
                return False
            
            logger.info(f"🗑️ Удаление события из Google Calendar: {event_id}")
            
            # Удаляем событие
            self.service.events().delete(
                calendarId='primary',
                eventId=event_id
            ).execute()
            
            logger.info(f"✅ Событие удалено из Google Calendar")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Ошибка удаления события из Google Calendar: {str(e)}")
            logger.error(f"❌ Тип ошибки: {type(e).__name__}")
            import traceback
            logger.error(f"❌ Traceback: {traceback.format_exc()}")
            return False
    
    def _process_event(self, event: Dict) -> Optional[Dict]:
        """Обработка события из Google Calendar"""
        try:
            logger.info(f"🔍 Начинаем обработку события: {event.get('summary', 'Без названия')}")
            
            # Получаем время начала и окончания
            start = event.get('start', {})
            end = event.get('end', {})
            
            logger.info(f"📅 Начало события: {start}")
            logger.info(f"📅 Окончание события: {end}")
            
            # Обрабатываем время (может быть dateTime или date)
            if 'dateTime' in start:
                logger.info("🕐 Событие с конкретным временем (dateTime)")
                start_time = datetime.fromisoformat(start['dateTime'].replace('Z', '+00:00'))
                end_time = datetime.fromisoformat(end['dateTime'].replace('Z', '+00:00'))
                logger.info(f"🕐 Время начала: {start_time}")
                logger.info(f"🕐 Время окончания: {end_time}")
            elif 'date' in start:
                logger.info("📅 Событие на весь день (date)")
                start_time = datetime.fromisoformat(start['date'])
                end_time = datetime.fromisoformat(end['date'])
                logger.info(f"📅 Дата начала: {start_time}")
                logger.info(f"📅 Дата окончания: {end_time}")
            else:
                logger.warning(f"⚠️ Неизвестный формат времени для события: {event.get('summary', 'Без названия')}")
                logger.warning(f"⚠️ Данные времени: start={start}, end={end}")
                return None
            
            # Конвертируем в московское время (если нужно)
            # Здесь можно добавить логику конвертации часовых поясов
            logger.info("🌍 Конвертация времени (если необходимо)")
            
            # Извлекаем информацию о событии
            summary = event.get('summary', 'Без названия')
            description = event.get('description', '')
            location = event.get('location', '')
            
            logger.info(f"📝 Название: {summary}")
            logger.info(f"📄 Описание: {description}")
            logger.info(f"📍 Местоположение: {location}")
            
            # Извлекаем участников
            attendees = []
            if 'attendees' in event:
                logger.info(f"👥 Найдено участников: {len(event['attendees'])}")
                for i, attendee in enumerate(event['attendees']):
                    email = attendee.get('email', '')
                    name = attendee.get('displayName', '')
                    logger.info(f"👤 Участник {i+1}: email={email}, name={name}")
                    if email:
                        attendees.append(email)
                    elif name:
                        attendees.append(name)
            else:
                logger.info("👥 Участники не найдены")
            
            # Создаем объект события в формате нашего приложения
            processed_event = {
                'title': summary,
                'start_time': start_time.isoformat(),
                'end_time': end_time.isoformat(),
                'description': description,
                'location': location,
                'attendees': attendees,
                'source': 'google_calendar',
                'google_event_id': event.get('id'),
                'google_calendar_link': event.get('htmlLink', ''),
                'updated': event.get('updated')  # Добавляем время последнего обновления
            }
            
            logger.info(f"✅ Обработано событие: {summary} ({start_time.strftime('%H:%M')} - {end_time.strftime('%H:%M')})")
            logger.info(f"📊 Итоговый объект: {json.dumps(processed_event, indent=2, default=str)}")
            return processed_event
            
        except Exception as e:
            logger.error(f"❌ Ошибка обработки события: {str(e)}")
            logger.error(f"❌ Тип ошибки: {type(e).__name__}")
            logger.error(f"❌ Данные события: {json.dumps(event, indent=2, default=str)}")
            import traceback
            logger.error(f"❌ Traceback: {traceback.format_exc()}")
            return None
    
    def sync_to_local_database(self, events: List[Dict]) -> Dict:
        """Синхронизация событий с локальной базой данных"""
        try:
            synced_count = 0
            skipped_count = 0
            error_count = 0
            
            for event in events:
                try:
                    # Здесь можно добавить логику сохранения в локальную БД
                    # Пока просто логируем
                    logger.info(f"📝 Событие для синхронизации: {event['title']}")
                    synced_count += 1
                    
                except Exception as e:
                    logger.error(f"❌ Ошибка синхронизации события {event.get('title', 'Unknown')}: {str(e)}")
                    error_count += 1
            
            result = {
                'synced': synced_count,
                'skipped': skipped_count,
                'errors': error_count,
                'total': len(events)
            }
            
            logger.info(f"📊 Результат синхронизации: {result}")
            return result
            
        except Exception as e:
            logger.error(f"❌ Ошибка синхронизации: {str(e)}")
            return {'synced': 0, 'skipped': 0, 'errors': len(events), 'total': len(events)}

def create_sample_credentials_file():
    """Создать пример файла credentials.json"""
    sample_credentials = {
        "installed": {
            "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
            "project_id": "your-project-id",
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_secret": "YOUR_CLIENT_SECRET",
            "redirect_uris": ["http://localhost"]
        }
    }
    
    with open("credentials.json.example", "w") as f:
        json.dump(sample_credentials, f, indent=2)
    
    logger.info("📄 Создан пример файла credentials.json.example")
    logger.info("💡 Скопируйте его в credentials.json и заполните своими данными")

if __name__ == "__main__":
    # Тестирование модуля
    logger.info("🧪 Тестирование Google Calendar интеграции")
    
    # Создаем пример файла credentials
    create_sample_credentials_file()
    
    # Инициализируем синхронизатор
    sync = GoogleCalendarSync()
    
    # Пытаемся аутентифицироваться
    if sync.authenticate():
        logger.info("✅ Аутентификация успешна")
        
        # Получаем события на сегодня
        events = sync.get_today_events()
        
        if events:
            logger.info(f"📅 Найдено {len(events)} событий:")
            for event in events:
                logger.info(f"  - {event['title']} ({event['start_time']} - {event['end_time']})")
        else:
            logger.info("📅 Событий на сегодня не найдено")
    else:
        logger.error("❌ Аутентификация не удалась")

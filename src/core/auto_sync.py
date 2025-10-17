import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import psycopg2
from psycopg2.extras import RealDictCursor

# Импорт системы логирования
try:
    from src.core.logging_config import log_auto_sync_operation, log_database_operation, log_google_calendar_operation
    DETAILED_LOGGING_AVAILABLE = True
except ImportError:
    DETAILED_LOGGING_AVAILABLE = False

# Импорт Microsoft Graph синхронизации
try:
    from src.integrations.MS_graph_sync import microsoft_graph_sync
    MICROSOFT_GRAPH_AVAILABLE = True
except ImportError:
    MICROSOFT_GRAPH_AVAILABLE = False

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('auto_sync')

# Конфигурация базы данных
DB_CONFIG = {
    'dbname': 'officer',
    'user': 'grifosh',
    'host': 'localhost',
    'port': 5432
}

class AutoSyncManager:
    """Менеджер автоматической синхронизации с Google Calendar и Microsoft Graph"""
    
    def __init__(self):
        self.is_running = False
        self.sync_interval = 300  # 5 минут в секундах
        
    def get_db_connection(self):
        """Получить соединение с базой данных"""
        return psycopg2.connect(**DB_CONFIG)
    
    async def start_auto_sync(self):
        """Запустить автоматическую синхронизацию"""
        if self.is_running:
            logger.warning("⚠️ Автоматическая синхронизация уже запущена")
            return
            
        self.is_running = True
        logger.info("🚀 Запуск автоматической синхронизации с Google Calendar")
        logger.info(f"⏰ Интервал синхронизации: {self.sync_interval} секунд")
        
        try:
            while self.is_running:
                await self.perform_sync_cycle()
                await asyncio.sleep(self.sync_interval)
        except Exception as e:
            logger.error(f"❌ Ошибка в автоматической синхронизации: {str(e)}")
        finally:
            self.is_running = False
            logger.info("🛑 Автоматическая синхронизация остановлена")
    
    async def perform_sync_cycle(self):
        """Выполнить один цикл синхронизации"""
        try:
            logger.info("🔄 Начинаем цикл автоматической синхронизации...")
            if DETAILED_LOGGING_AVAILABLE:
                log_auto_sync_operation("sync_cycle_start", success=True)
            
            # Синхронизируем события на 7 дней вперед
            sync_days = 7
            logger.info(f"📅 Синхронизация на {sync_days} дней вперед")
            
            # 1. Синхронизируем события из Google Calendar в локальную БД
            print(f"🔍 DEBUG: Вызываем sync_from_google_to_local для периода {sync_days} дней")
            await self.sync_from_google_to_local_period(sync_days)
            print(f"🔍 DEBUG: sync_from_google_to_local завершена")
            
            # 2. Синхронизируем события из Microsoft Graph в локальную БД
            if MICROSOFT_GRAPH_AVAILABLE:
                print(f"🔍 DEBUG: Вызываем sync_from_microsoft_to_local для периода {sync_days} дней")
                await self.sync_from_microsoft_to_local_period(sync_days)
                print(f"🔍 DEBUG: sync_from_microsoft_to_local завершена")
            else:
                print("🔍 DEBUG: Microsoft Graph недоступен, пропускаем синхронизацию")
            
            # 3. Синхронизируем события из локальной БД в Google Calendar
            print(f"🔍 DEBUG: Вызываем sync_from_local_to_google для периода {sync_days} дней")
            await self.sync_from_local_to_google_period(sync_days)
            print(f"🔍 DEBUG: sync_from_local_to_google завершена")
            
            # 4. Синхронизируем события из локальной БД в Microsoft Graph
            if MICROSOFT_GRAPH_AVAILABLE:
                print(f"🔍 DEBUG: Вызываем sync_from_local_to_microsoft для периода {sync_days} дней")
                await self.sync_from_local_to_microsoft_period(sync_days)
                print(f"🔍 DEBUG: sync_from_local_to_microsoft завершена")
            else:
                print("🔍 DEBUG: Microsoft Graph недоступен, пропускаем синхронизацию")
            
            logger.info("✅ Цикл автоматической синхронизации завершен")
            if DETAILED_LOGGING_AVAILABLE:
                log_auto_sync_operation("sync_cycle_complete", success=True)
            
        except Exception as e:
            logger.error(f"❌ Ошибка в цикле синхронизации: {str(e)}")
            if DETAILED_LOGGING_AVAILABLE:
                log_auto_sync_operation("sync_cycle_error", success=False, error=str(e))
    
    async def sync_from_google_to_local(self, date: str):
        """Синхронизация из Google Calendar в локальную БД"""
        try:
            logger.info("📥 Синхронизация из Google Calendar в локальную БД...")
            print(f"🔍 DEBUG: Начинаем sync_from_google_to_local для даты {date}")
            
            # Импортируем GoogleCalendarSync только здесь, чтобы избежать ошибок при отсутствии модуля
            try:
                from src.integrations.google_calendar_sync import GoogleCalendarSync
                print("🔍 DEBUG: GoogleCalendarSync импортирован успешно")
            except ImportError as e:
                logger.warning(f"⚠️ Google Calendar модуль не доступен: {e}")
                print(f"🔍 DEBUG: Ошибка импорта GoogleCalendarSync: {e}")
                return
            
            # Создаем экземпляр синхронизации
            sync = GoogleCalendarSync()
            print("🔍 DEBUG: Экземпляр GoogleCalendarSync создан")
            
            # Аутентификация
            if not sync.authenticate():
                logger.warning("⚠️ Не удалось аутентифицироваться с Google Calendar")
                print("🔍 DEBUG: Ошибка аутентификации с Google Calendar")
                return
            
            print("🔍 DEBUG: Аутентификация с Google Calendar успешна")
            
            # Получаем события на сегодня
            events = sync.get_today_events()
            logger.info(f"📊 Получено {len(events)} событий из Google Calendar")
            print(f"🔍 DEBUG: Получено {len(events)} событий из Google Calendar")
            
            # Сохраняем события в локальную БД с умной синхронизацией
            synced_count = await self.save_events_to_local_db_smart(events, date)
            logger.info(f"✅ Синхронизировано {synced_count} событий из Google Calendar")
            print(f"🔍 DEBUG: Синхронизировано {synced_count} событий из Google Calendar")
            
            # Удаляем события, которых больше нет в Google Calendar
            deleted_count = await self.delete_missing_events(events, date)
            logger.info(f"🗑️ Удалено {deleted_count} событий, которых больше нет в Google Calendar")
            
        except Exception as e:
            logger.error(f"❌ Ошибка синхронизации из Google Calendar: {str(e)}")
    
    async def sync_from_local_to_google(self, date: str):
        """Синхронизация из локальной БД в Google Calendar"""
        try:
            logger.info("📤 Синхронизация из локальной БД в Google Calendar...")
            
            # Получаем события из локальной БД
            local_events = await self.get_local_events_for_date(date)
            logger.info(f"📊 Найдено {len(local_events)} событий в локальной БД")
            
            # Импортируем GoogleCalendarSync
            try:
                from src.integrations.google_calendar_sync import GoogleCalendarSync
            except ImportError:
                logger.warning("⚠️ Google Calendar модуль не доступен")
                return
            
            # Создаем экземпляр синхронизации
            sync = GoogleCalendarSync()
            
            # Аутентификация
            if not sync.authenticate():
                logger.warning("⚠️ Не удалось аутентифицироваться с Google Calendar")
                return
            
            # Синхронизируем каждое событие
            synced_count = 0
            for event in local_events:
                if await self.sync_single_event_to_google(event, sync):
                    synced_count += 1
            
            logger.info(f"✅ Синхронизировано {synced_count} событий в Google Calendar")
            
        except Exception as e:
            logger.error(f"❌ Ошибка синхронизации в Google Calendar: {str(e)}")
    
    async def save_events_to_local_db(self, events: List[Dict], date: str) -> int:
        """Сохранить события в локальную БД"""
        synced_count = 0
        
        try:
            conn = self.get_db_connection()
            cur = conn.cursor(cursor_factory=RealDictCursor)
            
            for event in events:
                try:
                    # Проверяем, существует ли событие с таким google_event_id
                    existing_event_id = None
                    if event.get('google_event_id'):
                        cur.execute("""
                            SELECT id FROM events 
                            WHERE google_event_id = %s
                        """, (event['google_event_id'],))
                        
                        result = cur.fetchone()
                        if result:
                            existing_event_id = result['id']
                            logger.debug(f"📋 Событие {event['title']} уже существует (ID: {existing_event_id}), обновляем")
                    
                    if existing_event_id:
                        # Обновляем существующее событие
                        cur.execute("""
                            UPDATE events 
                            SET subject = %s, start_time = %s, end_time = %s, location = %s, 
                                attendees = %s, description = %s, google_calendar_link = %s,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id = %s
                        """, (
                            event.get('title', ''),
                            event.get('start_time', ''),
                            event.get('end_time', ''),
                            event.get('location', ''),
                            event.get('attendees', []),
                            event.get('description', ''),
                            event.get('google_calendar_link'),
                            existing_event_id
                        ))
                        logger.debug(f"✅ Обновлено событие {event['title']} (ID: {existing_event_id})")
                    else:
                        # Вставляем новое событие
                        cur.execute("""
                            INSERT INTO events (subject, start_time, end_time, location, attendees, stream, notes, recording_url, actual_open_questions, google_event_id, google_calendar_link, description)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """, (
                            event.get('title', ''),
                            event.get('start_time', ''),
                            event.get('end_time', ''),
                            event.get('location', ''),
                            event.get('attendees', []),
                            event.get('stream', []),
                            event.get('notes', ''),
                            event.get('recording_url', ''),
                            event.get('actual_open_questions', ''),
                            event.get('google_event_id'),
                            event.get('google_calendar_link'),
                            event.get('description', '')
                        ))
                        logger.debug(f"✅ Создано новое событие {event['title']}")
                    
                    # Логируем создание нового события
                    logger.info(f"📝 AUTO_SYNC: Создано новое событие из Google Calendar: {event.get('title', 'Без названия')}")
                    
                    synced_count += 1
                    logger.debug(f"✅ Сохранено событие: {event['title']}")
                    
                except Exception as e:
                    logger.error(f"❌ Ошибка сохранения события {event.get('title', 'Unknown')}: {str(e)}")
            
            conn.commit()
            
        except Exception as e:
            logger.error(f"❌ Ошибка работы с БД: {str(e)}")
            if 'conn' in locals():
                conn.rollback()
        finally:
            if 'cur' in locals():
                cur.close()
            if 'conn' in locals():
                conn.close()
        
        return synced_count
    
    async def save_events_to_local_db_smart(self, events: List[Dict], date: str) -> int:
        """Умное сохранение событий с определением направления синхронизации"""
        synced_count = 0
        
        try:
            print(f"🔍 DEBUG: Начинаем save_events_to_local_db_smart с {len(events)} событиями")
            from src.core.sync_direction import SyncDirectionDetector
            print("🔍 DEBUG: SyncDirectionDetector импортирован успешно")
            
            conn = self.get_db_connection()
            cur = conn.cursor(cursor_factory=RealDictCursor)
            
            for event in events:
                try:
                    print(f"🔍 DEBUG: Обрабатываем событие {event.get('title', 'Unknown')}")
                    # Ищем существующее событие по google_event_id
                    existing_event_id = None
                    existing_event = None
                    
                    if event.get('google_event_id'):
                        print(f"🔍 DEBUG: Ищем событие с google_event_id={event['google_event_id']}")
                        cur.execute("""
                            SELECT id, subject, last_local_update, last_google_sync, sync_source,
                                   notes, actual_open_questions, recording_url
                            FROM events
                            WHERE google_event_id = %s
                        """, (event['google_event_id'],))
                        existing_event = cur.fetchone()
                        if existing_event:
                            existing_event_id = existing_event['id']
                            print(f"🔍 DEBUG: Найдено существующее событие ID={existing_event_id}")
                        else:
                            print(f"🔍 DEBUG: Существующее событие НЕ найдено")
                    
                    if existing_event:
                        # Определяем направление синхронизации
                        print(f"🔍 DEBUG: Определяем направление синхронизации")
                        direction, reason = SyncDirectionDetector.determine_sync_direction(
                            existing_event, event
                        )
                        
                        print(f"🔍 DEBUG: Направление: {direction}, причина: {reason}")
                        logger.info(f"🔄 Событие {event['title']}: {direction} - {reason}")
                        
                        if direction == 'google_to_local':
                            # Обновляем локальное событие данными из Google
                            cur.execute("""
                                UPDATE events
                                SET subject = %s, start_time = %s, end_time = %s, location = %s,
                                    attendees = %s, description = %s, google_calendar_link = %s,
                                    last_google_sync = CURRENT_TIMESTAMP, sync_source = 'google',
                                    google_updated_at = %s, updated_at = CURRENT_TIMESTAMP
                                WHERE id = %s
                            """, (
                                event.get('title', ''),
                                event.get('start_time', ''),
                                event.get('end_time', ''),
                                event.get('location', ''),
                                event.get('attendees', []),
                                event.get('description', ''),
                                event.get('google_calendar_link'),
                                event.get('updated'),
                                existing_event_id
                            ))
                            logger.info(f"✅ Обновлено из Google: {event['title']} (ID: {existing_event_id})")
                            synced_count += 1
                            
                        elif direction == 'local_to_google':
                            # Локальное событие новее - не обновляем, только обновляем время синхронизации
                            cur.execute("""
                                UPDATE events
                                SET last_google_sync = CURRENT_TIMESTAMP
                                WHERE id = %s
                            """, (existing_event_id,))
                            logger.info(f"ℹ️ Локальное событие новее: {event['title']} (ID: {existing_event_id})")
                            
                        elif direction == 'conflict':
                            # Конфликт - определяем приоритет
                            priority = SyncDirectionDetector.get_sync_priority(existing_event, event)
                            logger.warning(f"⚠️ Конфликт синхронизации: {event['title']} - приоритет: {priority}")
                            
                            if priority == 'google':
                                # Обновляем из Google, но сохраняем важные локальные данные
                                cur.execute("""
                                    UPDATE events
                                    SET subject = %s, start_time = %s, end_time = %s, location = %s,
                                        attendees = %s, description = %s, google_calendar_link = %s,
                                        last_google_sync = CURRENT_TIMESTAMP, sync_source = 'google',
                                        google_updated_at = %s, updated_at = CURRENT_TIMESTAMP
                                    WHERE id = %s
                                """, (
                                    event.get('title', ''),
                                    event.get('start_time', ''),
                                    event.get('end_time', ''),
                                    event.get('location', ''),
                                    event.get('attendees', []),
                                    event.get('description', ''),
                                    event.get('google_calendar_link'),
                                    event.get('updated'),
                                    existing_event_id
                                ))
                                logger.info(f"✅ Разрешен конфликт в пользу Google: {event['title']}")
                                synced_count += 1
                            else:
                                # Сохраняем локальную версию
                                cur.execute("""
                                    UPDATE events
                                    SET last_google_sync = CURRENT_TIMESTAMP
                                    WHERE id = %s
                                """, (existing_event_id,))
                                logger.info(f"ℹ️ Сохранена локальная версия: {event['title']}")
                        
                        else:  # no_change
                            logger.debug(f"ℹ️ Изменений нет: {event['title']}")
                    
                    else:
                        # Новое событие - создаем
                        print(f"🔍 DEBUG: Создаем новое событие {event.get('title', 'Unknown')}")
                        cur.execute("""
                            INSERT INTO events (subject, start_time, end_time, location, attendees, stream, notes, recording_url, actual_open_questions, google_event_id, google_calendar_link, description, last_google_sync, sync_source, google_updated_at)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, 'google', %s)
                        """, (
                            event.get('title', ''),
                            event.get('start_time', ''),
                            event.get('end_time', ''),
                            event.get('location', ''),
                            event.get('attendees', []),
                            event.get('stream', []),
                            event.get('notes', ''),
                            event.get('recording_url', ''),
                            event.get('actual_open_questions', ''),
                            event.get('google_event_id'),
                            event.get('google_calendar_link'),
                            event.get('description', ''),
                            event.get('updated')
                        ))
                        logger.info(f"✅ Создано новое событие: {event['title']}")
                        print(f"🔍 DEBUG: Новое событие создано успешно")
                        synced_count += 1
                        
                except Exception as e:
                    logger.error(f"❌ Ошибка обработки события {event.get('title', 'Unknown')}: {str(e)}")
            
            conn.commit()
            
        except Exception as e:
            logger.error(f"❌ Ошибка умной синхронизации: {str(e)}")
            if 'conn' in locals():
                conn.rollback()
        finally:
            if 'cur' in locals():
                cur.close()
            if 'conn' in locals():
                conn.close()
        
        return synced_count
    
    async def delete_missing_events(self, google_events: List[Dict], date: str) -> int:
        """Удалить события, которых больше нет в Google Calendar"""
        deleted_count = 0
        
        try:
            conn = self.get_db_connection()
            cur = conn.cursor(cursor_factory=RealDictCursor)
            
            # Получаем все события на сегодня из локальной БД, которые имеют google_event_id
            cur.execute("""
                SELECT id, subject, google_event_id, start_time, end_time
                FROM events
                WHERE DATE(start_time) = %s 
                AND google_event_id IS NOT NULL
                AND google_event_id != ''
            """, (date,))
            
            local_events = cur.fetchall()
            logger.info(f"📋 Найдено {len(local_events)} локальных событий с google_event_id")
            
            # Логируем все локальные события с google_event_id
            for event in local_events:
                start_time = event['start_time'].strftime('%H:%M') if event['start_time'] else 'N/A'
                end_time = event['end_time'].strftime('%H:%M') if event['end_time'] else 'N/A'
                logger.debug(f"📋 Локальное событие: ID:{event['id']} | {event['subject']} | {start_time}-{end_time} | Google ID: {event['google_event_id']}")
            
            # Создаем множество google_event_id из Google Calendar
            google_event_ids = set()
            for event in google_events:
                if event.get('google_event_id'):
                    google_event_ids.add(event['google_event_id'])
                    logger.debug(f"📋 Google событие: {event['title']} | Google ID: {event['google_event_id']}")
            
            logger.info(f"📋 Найдено {len(google_event_ids)} событий в Google Calendar")
            
            # Находим события для удаления
            events_to_delete = []
            for local_event in local_events:
                if local_event['google_event_id'] not in google_event_ids:
                    events_to_delete.append(local_event)
                    logger.warning(f"⚠️ Событие для удаления: {local_event['subject']} (ID: {local_event['id']}) | Google ID: {local_event['google_event_id']}")
            
            logger.info(f"🗑️ Найдено {len(events_to_delete)} событий для удаления")
            
            # Удаляем события
            for event in events_to_delete:
                try:
                    # Логируем детали перед удалением
                    start_time = event['start_time'].strftime('%H:%M') if event['start_time'] else 'N/A'
                    end_time = event['end_time'].strftime('%H:%M') if event['end_time'] else 'N/A'
                    logger.info(f"🗑️ УДАЛЕНИЕ: {event['subject']} (ID: {event['id']}) | {start_time}-{end_time} | Google ID: {event['google_event_id']}")
                    
                    # Логируем в специальный логгер синхронизации удалений
                    from src.core.logging_config import log_sync_deletion
                    log_sync_deletion(event, "delete_from_local", True)
                    
                    cur.execute("DELETE FROM events WHERE id = %s", (event['id'],))
                    logger.info(f"✅ УДАЛЕНО: {event['subject']} (ID: {event['id']})")
                    deleted_count += 1
                except Exception as e:
                    logger.error(f"❌ Ошибка удаления события {event['subject']} (ID: {event['id']}): {str(e)}")
            
            conn.commit()
            logger.info(f"🗑️ СИНХРОНИЗАЦИЯ УДАЛЕНИЙ ЗАВЕРШЕНА: удалено {deleted_count} событий")
            
        except Exception as e:
            logger.error(f"❌ Ошибка удаления событий: {str(e)}")
            if 'conn' in locals():
                conn.rollback()
        finally:
            if 'cur' in locals():
                cur.close()
            if 'conn' in locals():
                conn.close()
        
        return deleted_count
    
    async def get_local_events_for_date(self, date: str) -> List[Dict]:
        """Получить события из локальной БД для указанной даты"""
        events = []
        
        try:
            conn = self.get_db_connection()
            cur = conn.cursor(cursor_factory=RealDictCursor)
            
            # Получаем события на указанную дату
            cur.execute("""
                SELECT * FROM events 
                WHERE DATE(start_time) = %s
                ORDER BY start_time
            """, (date,))
            
            events = cur.fetchall()
            
        except Exception as e:
            logger.error(f"❌ Ошибка получения событий из БД: {str(e)}")
        finally:
            if 'cur' in locals():
                cur.close()
            if 'conn' in locals():
                conn.close()
        
        return events
    
    async def sync_single_event_to_google(self, event: Dict, sync) -> bool:
        """Синхронизировать одно событие в Google Calendar"""
        try:
            event_id = event.get('id')
            event_subject = event.get('subject', 'Без названия')
            
            # Если у события уже есть google_event_id, обновляем его
            if event.get('google_event_id'):
                logger.info(f"🔄 AUTO_SYNC: Обновление события в Google Calendar (ID: {event_id}): {event_subject}")
                
                event_data = {
                    'title': event['subject'],
                    'start_time': str(event['start_time']) if event['start_time'] else '',
                    'end_time': str(event['end_time']) if event['end_time'] else '',
                    'description': event.get('description', ''),
                    'location': event.get('location', ''),
                    'attendees': event.get('attendees', [])
                }
                
                success = sync.update_event_in_google_calendar(event['google_event_id'], event_data)
                
                if success:
                    logger.info(f"✅ AUTO_SYNC: Событие успешно обновлено в Google Calendar (ID: {event_id}): {event_subject}")
                else:
                    logger.error(f"❌ AUTO_SYNC: Ошибка обновления события в Google Calendar (ID: {event_id}): {event_subject}")
                
                return success
            
            # Если у события нет google_event_id, создаем новое
            else:
                logger.info(f"📝 AUTO_SYNC: Создание события в Google Calendar (ID: {event_id}): {event_subject}")
                
                event_data = {
                    'title': event['subject'],
                    'start_time': str(event['start_time']) if event['start_time'] else '',
                    'end_time': str(event['end_time']) if event['end_time'] else '',
                    'description': event.get('description', ''),
                    'location': event.get('location', ''),
                    'attendees': event.get('attendees', [])
                }
                
                google_event_id = sync.create_event_in_google_calendar(event_data)
                
                if google_event_id:
                    # Обновляем локальную БД с google_event_id
                    await self.update_local_event_with_google_id(event['id'], google_event_id)
                    return True
                
                return False
                
        except Exception as e:
            logger.error(f"❌ Ошибка синхронизации события {event.get('subject', 'Unknown')}: {str(e)}")
            return False
    
    async def update_local_event_with_google_id(self, event_id: int, google_event_id: str):
        """Обновить локальное событие с google_event_id"""
        try:
            conn = self.get_db_connection()
            cur = conn.cursor()
            
            cur.execute("""
                UPDATE events 
                SET google_event_id = %s
                WHERE id = %s
            """, (google_event_id, event_id))
            
            conn.commit()
            logger.debug(f"✅ Обновлен google_event_id для события {event_id}")
            
        except Exception as e:
            logger.error(f"❌ Ошибка обновления google_event_id: {str(e)}")
            if 'conn' in locals():
                conn.rollback()
        finally:
            if 'cur' in locals():
                cur.close()
            if 'conn' in locals():
                conn.close()
    
    async def sync_from_microsoft_to_local(self, date: str):
        """Синхронизация из Microsoft Graph в локальную БД"""
        try:
            logger.info("📥 Синхронизация из Microsoft Graph в локальную БД...")
            print(f"🔍 DEBUG: Начинаем sync_from_microsoft_to_local для даты {date}")
            
            if not MICROSOFT_GRAPH_AVAILABLE:
                logger.warning("⚠️ Microsoft Graph модуль не доступен")
                print("🔍 DEBUG: Microsoft Graph модуль не доступен")
                return
            
            # Аутентификация
            if not microsoft_graph_sync.authenticate():
                logger.warning("⚠️ Не удалось аутентифицироваться с Microsoft Graph")
                print("🔍 DEBUG: Ошибка аутентификации с Microsoft Graph")
                return
            
            print("🔍 DEBUG: Аутентификация с Microsoft Graph успешна")
            
            # Получаем события на сегодня
            events = microsoft_graph_sync.get_today_events()
            logger.info(f"📊 Получено {len(events)} событий из Microsoft Graph")
            print(f"🔍 DEBUG: Получено {len(events)} событий из Microsoft Graph")
            
            # Сохраняем события в локальную БД с умной синхронизацией
            synced_count = await self.save_microsoft_events_to_local_db_smart(events, date)
            logger.info(f"✅ Синхронизировано {synced_count} событий из Microsoft Graph")
            print(f"🔍 DEBUG: Синхронизировано {synced_count} событий из Microsoft Graph")
            
        except Exception as e:
            logger.error(f"❌ Ошибка синхронизации из Microsoft Graph: {str(e)}")
    
    async def sync_from_local_to_microsoft(self, date: str):
        """Синхронизация из локальной БД в Microsoft Graph"""
        try:
            logger.info("📤 Синхронизация из локальной БД в Microsoft Graph...")
            print(f"🔍 DEBUG: Начинаем sync_from_local_to_microsoft для даты {date}")
            
            if not MICROSOFT_GRAPH_AVAILABLE:
                logger.warning("⚠️ Microsoft Graph модуль не доступен")
                print("🔍 DEBUG: Microsoft Graph модуль не доступен")
                return
            
            # Аутентификация
            if not microsoft_graph_sync.authenticate():
                logger.warning("⚠️ Не удалось аутентифицироваться с Microsoft Graph")
                print("🔍 DEBUG: Ошибка аутентификации с Microsoft Graph")
                return
            
            print("🔍 DEBUG: Аутентификация с Microsoft Graph успешна")
            
            # Получаем события из локальной БД
            conn = self.get_db_connection()
            cur = conn.cursor(cursor_factory=RealDictCursor)
            
            cur.execute("""
                SELECT id, subject, start_time, end_time, location, attendees, 
                       stream, notes, recording_url, actual_open_questions,
                       microsoft_event_id, last_local_update, last_microsoft_sync
                FROM events
                WHERE DATE(start_time) = %s
                AND (microsoft_event_id IS NULL OR last_local_update > last_microsoft_sync)
            """, (date,))
            
            local_events = cur.fetchall()
            logger.info(f"📊 Найдено {len(local_events)} событий для синхронизации в Microsoft Graph")
            print(f"🔍 DEBUG: Найдено {len(local_events)} событий для синхронизации в Microsoft Graph")
            
            synced_count = 0
            for event in local_events:
                try:
                    # Подготавливаем данные события
                    event_data = {
                        'title': event['subject'],
                        'start_time': event['start_time'].strftime('%Y-%m-%dT%H:%M:%S'),
                        'end_time': event['end_time'].strftime('%Y-%m-%dT%H:%M:%S'),
                        'location': event['location'] or '',
                        'description': f"{event['notes'] or ''}\n\nOpen Questions: {event['actual_open_questions'] or ''}".strip(),
                        'attendees': event['attendees'] or []
                    }
                    
                    if event['microsoft_event_id']:
                        # Обновляем существующее событие
                        success = microsoft_graph_sync.update_event_in_microsoft_graph(
                            event['microsoft_event_id'], event_data
                        )
                        if success:
                            logger.info(f"✅ Обновлено событие в Microsoft Graph: {event['subject']}")
                            synced_count += 1
                    else:
                        # Создаем новое событие
                        microsoft_event_id = microsoft_graph_sync.create_event_in_microsoft_graph(event_data)
                        if microsoft_event_id:
                            # Обновляем локальную БД с Microsoft Event ID
                            cur.execute("""
                                UPDATE events 
                                SET microsoft_event_id = %s, last_microsoft_sync = CURRENT_TIMESTAMP
                                WHERE id = %s
                            """, (microsoft_event_id, event['id']))
                            logger.info(f"✅ Создано событие в Microsoft Graph: {event['subject']}")
                            synced_count += 1
                    
                except Exception as e:
                    logger.error(f"❌ Ошибка синхронизации события {event['subject']}: {str(e)}")
            
            conn.commit()
            logger.info(f"✅ Синхронизировано {synced_count} событий в Microsoft Graph")
            print(f"🔍 DEBUG: Синхронизировано {synced_count} событий в Microsoft Graph")
            
        except Exception as e:
            logger.error(f"❌ Ошибка синхронизации в Microsoft Graph: {str(e)}")
            if 'conn' in locals():
                conn.rollback()
        finally:
            if 'cur' in locals():
                cur.close()
            if 'conn' in locals():
                conn.close()
    
    async def save_microsoft_events_to_local_db_smart(self, events: List[Dict], date: str) -> int:
        """Умное сохранение событий Microsoft Graph с определением направления синхронизации"""
        synced_count = 0
        
        try:
            print(f"🔍 DEBUG: Начинаем save_microsoft_events_to_local_db_smart с {len(events)} событиями")
            from src.core.sync_direction import SyncDirectionDetector
            print("🔍 DEBUG: SyncDirectionDetector импортирован успешно")
            
            conn = self.get_db_connection()
            cur = conn.cursor(cursor_factory=RealDictCursor)
            
            for event in events:
                try:
                    print(f"🔍 DEBUG: Обрабатываем событие {event.get('title', 'Unknown')}")
                    # Ищем существующее событие по microsoft_event_id
                    existing_event_id = None
                    existing_event = None
                    
                    if event.get('microsoft_event_id'):
                        print(f"🔍 DEBUG: Ищем событие с microsoft_event_id={event['microsoft_event_id']}")
                        cur.execute("""
                            SELECT id, subject, last_local_update, last_microsoft_sync, sync_source,
                                   notes, actual_open_questions, recording_url
                            FROM events
                            WHERE microsoft_event_id = %s
                        """, (event['microsoft_event_id'],))
                        existing_event = cur.fetchone()
                        if existing_event:
                            existing_event_id = existing_event['id']
                            print(f"🔍 DEBUG: Найдено существующее событие ID={existing_event_id}")
                        else:
                            print(f"🔍 DEBUG: Существующее событие НЕ найдено")
                    
                    if existing_event:
                        # Определяем направление синхронизации
                        print(f"🔍 DEBUG: Определяем направление синхронизации")
                        direction, reason = SyncDirectionDetector.determine_sync_direction(
                            existing_event, event
                        )
                        
                        print(f"🔍 DEBUG: Направление: {direction}, причина: {reason}")
                        logger.info(f"🔄 Событие {event['title']}: {direction} - {reason}")
                        
                        if direction == 'microsoft_to_local':
                            # Обновляем локальное событие данными из Microsoft Graph
                            cur.execute("""
                                UPDATE events
                                SET subject = %s, start_time = %s, end_time = %s, location = %s,
                                    attendees = %s, description = %s, microsoft_calendar_link = %s,
                                    last_microsoft_sync = CURRENT_TIMESTAMP, sync_source = 'microsoft',
                                    microsoft_updated_at = %s, updated_at = CURRENT_TIMESTAMP
                                WHERE id = %s
                            """, (
                                event.get('title', ''),
                                event.get('start_time', ''),
                                event.get('end_time', ''),
                                event.get('location', ''),
                                event.get('attendees', []),
                                event.get('description', ''),
                                event.get('microsoft_calendar_link'),
                                event.get('updated_at'),
                                existing_event_id
                            ))
                            logger.info(f"✅ Обновлено из Microsoft Graph: {event['title']} (ID: {existing_event_id})")
                            synced_count += 1
                            
                        elif direction == 'local_to_microsoft':
                            # Локальное событие новее - не обновляем, только обновляем время синхронизации
                            cur.execute("""
                                UPDATE events
                                SET last_microsoft_sync = CURRENT_TIMESTAMP
                                WHERE id = %s
                            """, (existing_event_id,))
                            logger.info(f"ℹ️ Локальное событие новее: {event['title']} (ID: {existing_event_id})")
                            
                        elif direction == 'conflict':
                            # Конфликт - определяем приоритет
                            priority = SyncDirectionDetector.get_sync_priority(existing_event, event)
                            logger.warning(f"⚠️ Конфликт синхронизации: {event['title']} - приоритет: {priority}")
                            
                            if priority == 'microsoft':
                                # Обновляем из Microsoft Graph, но сохраняем важные локальные данные
                                cur.execute("""
                                    UPDATE events
                                    SET subject = %s, start_time = %s, end_time = %s, location = %s,
                                        attendees = %s, description = %s, microsoft_calendar_link = %s,
                                        last_microsoft_sync = CURRENT_TIMESTAMP, sync_source = 'microsoft',
                                        microsoft_updated_at = %s, updated_at = CURRENT_TIMESTAMP
                                    WHERE id = %s
                                """, (
                                    event.get('title', ''),
                                    event.get('start_time', ''),
                                    event.get('end_time', ''),
                                    event.get('location', ''),
                                    event.get('attendees', []),
                                    event.get('description', ''),
                                    event.get('microsoft_calendar_link'),
                                    event.get('updated_at'),
                                    existing_event_id
                                ))
                                logger.info(f"✅ Разрешен конфликт в пользу Microsoft Graph: {event['title']}")
                                synced_count += 1
                            else:
                                # Сохраняем локальную версию
                                cur.execute("""
                                    UPDATE events
                                    SET last_microsoft_sync = CURRENT_TIMESTAMP
                                    WHERE id = %s
                                """, (existing_event_id,))
                                logger.info(f"ℹ️ Сохранена локальная версия: {event['title']}")
                        
                        else:  # no_change
                            logger.debug(f"ℹ️ Изменений нет: {event['title']}")
                    
                    else:
                        # Новое событие - создаем
                        print(f"🔍 DEBUG: Создаем новое событие {event.get('title', 'Unknown')}")
                        cur.execute("""
                            INSERT INTO events (subject, start_time, end_time, location, attendees, stream, notes, recording_url, actual_open_questions, microsoft_event_id, microsoft_calendar_link, description, last_microsoft_sync, sync_source, microsoft_updated_at)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, 'microsoft', %s)
                        """, (
                            event.get('title', ''),
                            event.get('start_time', ''),
                            event.get('end_time', ''),
                            event.get('location', ''),
                            event.get('attendees', []),
                            event.get('stream', []),
                            event.get('notes', ''),
                            event.get('recording_url', ''),
                            event.get('actual_open_questions', ''),
                            event.get('microsoft_event_id'),
                            event.get('microsoft_calendar_link'),
                            event.get('description', ''),
                            event.get('updated_at')
                        ))
                        logger.info(f"✅ Создано новое событие: {event['title']}")
                        print(f"🔍 DEBUG: Новое событие создано успешно")
                        synced_count += 1
                        
                except Exception as e:
                    logger.error(f"❌ Ошибка обработки события {event.get('title', 'Unknown')}: {str(e)}")
            
            conn.commit()
            
        except Exception as e:
            logger.error(f"❌ Ошибка умной синхронизации Microsoft Graph: {str(e)}")
            if 'conn' in locals():
                conn.rollback()
        finally:
            if 'cur' in locals():
                cur.close()
            if 'conn' in locals():
                conn.close()
                
        return synced_count

    def stop_auto_sync(self):
        """Остановить автоматическую синхронизацию"""
        logger.info("🛑 Остановка автоматической синхронизации...")
        self.is_running = False
    
    async def sync_from_google_to_local_period(self, days_ahead: int):
        """Синхронизация из Google Calendar в локальную БД за период"""
        try:
            logger.info(f"📥 Синхронизация из Google Calendar в локальную БД за {days_ahead} дней...")
            
            # Импортируем GoogleCalendarSync
            try:
                from src.integrations.google_calendar_sync import GoogleCalendarSync
            except ImportError as e:
                logger.warning(f"⚠️ Google Calendar модуль не доступен: {e}")
                return
            
            # Создаем экземпляр синхронизации
            sync = GoogleCalendarSync()
            
            # Аутентификация
            if not sync.authenticate():
                logger.warning("⚠️ Не удалось аутентифицироваться с Google Calendar")
                return
            
            # Получаем события за период
            events = sync.get_events_for_period(days_ahead)
            logger.info(f"📊 Получено {len(events)} событий из Google Calendar за {days_ahead} дней")
            
            # Сохраняем события в локальную БД с умной синхронизацией
            synced_count = await self.save_events_to_local_db_smart_period(events)
            logger.info(f"✅ Синхронизировано {synced_count} событий из Google Calendar за {days_ahead} дней")
            
        except Exception as e:
            logger.error(f"❌ Ошибка синхронизации из Google Calendar за период: {str(e)}")
    
    async def sync_from_microsoft_to_local_period(self, days_ahead: int):
        """Синхронизация из Microsoft Graph в локальную БД за период"""
        try:
            logger.info(f"📥 Синхронизация из Microsoft Graph в локальную БД за {days_ahead} дней...")
            
            if not MICROSOFT_GRAPH_AVAILABLE:
                logger.warning("⚠️ Microsoft Graph модуль не доступен")
                return
            
            # Аутентификация
            if not microsoft_graph_sync.authenticate():
                logger.warning("⚠️ Не удалось аутентифицироваться с Microsoft Graph")
                return
            
            # Получаем события за период
            events = microsoft_graph_sync.get_events_for_period(days_ahead)
            logger.info(f"📊 Получено {len(events)} событий из Microsoft Graph за {days_ahead} дней")
            
            # Сохраняем события в локальную БД с умной синхронизацией
            synced_count = await self.save_microsoft_events_to_local_db_smart_period(events)
            logger.info(f"✅ Синхронизировано {synced_count} событий из Microsoft Graph за {days_ahead} дней")
            
        except Exception as e:
            logger.error(f"❌ Ошибка синхронизации из Microsoft Graph за период: {str(e)}")
    
    async def sync_from_local_to_google_period(self, days_ahead: int):
        """Синхронизация из локальной БД в Google Calendar за период"""
        try:
            logger.info(f"📤 Синхронизация из локальной БД в Google Calendar за {days_ahead} дней...")
            
            # Получаем события из локальной БД за период
            local_events = await self.get_local_events_for_period(days_ahead)
            logger.info(f"📊 Найдено {len(local_events)} событий в локальной БД за {days_ahead} дней")
            
            # Импортируем GoogleCalendarSync
            try:
                from src.integrations.google_calendar_sync import GoogleCalendarSync
            except ImportError:
                logger.warning("⚠️ Google Calendar модуль не доступен")
                return
            
            # Создаем экземпляр синхронизации
            sync = GoogleCalendarSync()
            
            # Аутентификация
            if not sync.authenticate():
                logger.warning("⚠️ Не удалось аутентифицироваться с Google Calendar")
                return
            
            # Синхронизируем каждое событие
            synced_count = 0
            for event in local_events:
                if await self.sync_single_event_to_google(event, sync):
                    synced_count += 1
            
            logger.info(f"✅ Синхронизировано {synced_count} событий в Google Calendar за {days_ahead} дней")
            
        except Exception as e:
            logger.error(f"❌ Ошибка синхронизации в Google Calendar за период: {str(e)}")
    
    async def sync_from_local_to_microsoft_period(self, days_ahead: int):
        """Синхронизация из локальной БД в Microsoft Graph за период"""
        try:
            logger.info(f"📤 Синхронизация из локальной БД в Microsoft Graph за {days_ahead} дней...")
            
            if not MICROSOFT_GRAPH_AVAILABLE:
                logger.warning("⚠️ Microsoft Graph модуль не доступен")
                return
            
            # Аутентификация
            if not microsoft_graph_sync.authenticate():
                logger.warning("⚠️ Не удалось аутентифицироваться с Microsoft Graph")
                return
            
            # Получаем события из локальной БД за период
            conn = self.get_db_connection()
            cur = conn.cursor(cursor_factory=RealDictCursor)
            
            # Получаем события за период
            today = datetime.now().date()
            end_date = today + timedelta(days=days_ahead)
            
            cur.execute("""
                SELECT id, subject, start_time, end_time, location, attendees, 
                       stream, notes, recording_url, actual_open_questions,
                       microsoft_event_id, last_local_update, last_microsoft_sync
                FROM events
                WHERE DATE(start_time) BETWEEN %s AND %s
                AND (microsoft_event_id IS NULL OR last_local_update > last_microsoft_sync)
            """, (today, end_date))
            
            local_events = cur.fetchall()
            logger.info(f"📊 Найдено {len(local_events)} событий для синхронизации в Microsoft Graph за {days_ahead} дней")
            
            synced_count = 0
            for event in local_events:
                try:
                    # Подготавливаем данные события
                    event_data = {
                        'title': event['subject'],
                        'start_time': event['start_time'].strftime('%Y-%m-%dT%H:%M:%S'),
                        'end_time': event['end_time'].strftime('%Y-%m-%dT%H:%M:%S'),
                        'location': event['location'] or '',
                        'description': f"{event['notes'] or ''}\n\nOpen Questions: {event['actual_open_questions'] or ''}".strip(),
                        'attendees': event['attendees'] or []
                    }
                    
                    if event['microsoft_event_id']:
                        # Обновляем существующее событие
                        success = microsoft_graph_sync.update_event_in_microsoft_graph(
                            event['microsoft_event_id'], event_data
                        )
                        if success:
                            logger.info(f"✅ Обновлено событие в Microsoft Graph: {event['subject']}")
                            synced_count += 1
                    else:
                        # Создаем новое событие
                        microsoft_event_id = microsoft_graph_sync.create_event_in_microsoft_graph(event_data)
                        if microsoft_event_id:
                            # Обновляем локальную БД с Microsoft Event ID
                            cur.execute("""
                                UPDATE events 
                                SET microsoft_event_id = %s, last_microsoft_sync = CURRENT_TIMESTAMP
                                WHERE id = %s
                            """, (microsoft_event_id, event['id']))
                            logger.info(f"✅ Создано событие в Microsoft Graph: {event['subject']}")
                            synced_count += 1
                    
                except Exception as e:
                    logger.error(f"❌ Ошибка синхронизации события {event['subject']}: {str(e)}")
            
            conn.commit()
            logger.info(f"✅ Синхронизировано {synced_count} событий в Microsoft Graph за {days_ahead} дней")
            
        except Exception as e:
            logger.error(f"❌ Ошибка синхронизации в Microsoft Graph за период: {str(e)}")
            if 'conn' in locals():
                conn.rollback()
        finally:
            if 'cur' in locals():
                cur.close()
            if 'conn' in locals():
                conn.close()
    
    async def get_local_events_for_period(self, days_ahead: int) -> List[Dict]:
        """Получить события из локальной БД за период"""
        events = []
        
        try:
            conn = self.get_db_connection()
            cur = conn.cursor(cursor_factory=RealDictCursor)
            
            # Получаем события за период
            today = datetime.now().date()
            end_date = today + timedelta(days=days_ahead)
            
            cur.execute("""
                SELECT * FROM events 
                WHERE DATE(start_time) BETWEEN %s AND %s
                ORDER BY start_time
            """, (today, end_date))
            
            events = cur.fetchall()
            
        except Exception as e:
            logger.error(f"❌ Ошибка получения событий из БД за период: {str(e)}")
        finally:
            if 'cur' in locals():
                cur.close()
            if 'conn' in locals():
                conn.close()
        
        return events
    
    async def save_events_to_local_db_smart_period(self, events: List[Dict]) -> int:
        """Умное сохранение событий за период с определением направления синхронизации"""
        synced_count = 0
        
        try:
            logger.info(f"🔍 DEBUG: Начинаем save_events_to_local_db_smart_period с {len(events)} событиями")
            from src.core.sync_direction import SyncDirectionDetector
            
            conn = self.get_db_connection()
            cur = conn.cursor(cursor_factory=RealDictCursor)
            
            for event in events:
                try:
                    logger.info(f"🔍 DEBUG: Обрабатываем событие {event.get('title', 'Unknown')}")
                    # Ищем существующее событие по google_event_id
                    existing_event_id = None
                    existing_event = None
                    
                    if event.get('google_event_id'):
                        logger.info(f"🔍 DEBUG: Ищем событие с google_event_id={event['google_event_id']}")
                        cur.execute("""
                            SELECT id, subject, last_local_update, last_google_sync, sync_source,
                                   notes, actual_open_questions, recording_url
                            FROM events
                            WHERE google_event_id = %s
                        """, (event['google_event_id'],))
                        existing_event = cur.fetchone()
                        if existing_event:
                            existing_event_id = existing_event['id']
                            logger.info(f"🔍 DEBUG: Найдено существующее событие ID={existing_event_id}")
                        else:
                            logger.info(f"🔍 DEBUG: Существующее событие НЕ найдено")
                    
                    if existing_event:
                        # Определяем направление синхронизации
                        logger.info(f"🔍 DEBUG: Определяем направление синхронизации")
                        direction, reason = SyncDirectionDetector.determine_sync_direction(
                            existing_event, event
                        )
                        
                        logger.info(f"🔍 DEBUG: Направление: {direction}, причина: {reason}")
                        logger.info(f"🔄 Событие {event['title']}: {direction} - {reason}")
                        
                        if direction == 'google_to_local':
                            # Обновляем локальное событие данными из Google
                            cur.execute("""
                                UPDATE events
                                SET subject = %s, start_time = %s, end_time = %s, location = %s,
                                    attendees = %s, description = %s, google_calendar_link = %s,
                                    last_google_sync = CURRENT_TIMESTAMP, sync_source = 'google',
                                    google_updated_at = %s, updated_at = CURRENT_TIMESTAMP
                                WHERE id = %s
                            """, (
                                event.get('title', ''),
                                event.get('start_time', ''),
                                event.get('end_time', ''),
                                event.get('location', ''),
                                event.get('attendees', []),
                                event.get('description', ''),
                                event.get('google_calendar_link'),
                                event.get('updated'),
                                existing_event_id
                            ))
                            logger.info(f"✅ Обновлено из Google: {event['title']} (ID: {existing_event_id})")
                            synced_count += 1
                            
                        elif direction == 'local_to_google':
                            # Локальное событие новее - не обновляем, только обновляем время синхронизации
                            cur.execute("""
                                UPDATE events
                                SET last_google_sync = CURRENT_TIMESTAMP
                                WHERE id = %s
                            """, (existing_event_id,))
                            logger.info(f"ℹ️ Локальное событие новее: {event['title']} (ID: {existing_event_id})")
                            
                        elif direction == 'conflict':
                            # Конфликт - определяем приоритет
                            priority = SyncDirectionDetector.get_sync_priority(existing_event, event)
                            logger.warning(f"⚠️ Конфликт синхронизации: {event['title']} - приоритет: {priority}")
                            
                            if priority == 'google':
                                # Обновляем из Google, но сохраняем важные локальные данные
                                cur.execute("""
                                    UPDATE events
                                    SET subject = %s, start_time = %s, end_time = %s, location = %s,
                                        attendees = %s, description = %s, google_calendar_link = %s,
                                        last_google_sync = CURRENT_TIMESTAMP, sync_source = 'google',
                                        google_updated_at = %s, updated_at = CURRENT_TIMESTAMP
                                    WHERE id = %s
                                """, (
                                    event.get('title', ''),
                                    event.get('start_time', ''),
                                    event.get('end_time', ''),
                                    event.get('location', ''),
                                    event.get('attendees', []),
                                    event.get('description', ''),
                                    event.get('google_calendar_link'),
                                    event.get('updated'),
                                    existing_event_id
                                ))
                                logger.info(f"✅ Разрешен конфликт в пользу Google: {event['title']}")
                                synced_count += 1
                            else:
                                # Сохраняем локальную версию
                                cur.execute("""
                                    UPDATE events
                                    SET last_google_sync = CURRENT_TIMESTAMP
                                    WHERE id = %s
                                """, (existing_event_id,))
                                logger.info(f"ℹ️ Сохранена локальная версия: {event['title']}")
                        
                        else:  # no_change
                            logger.debug(f"ℹ️ Изменений нет: {event['title']}")
                    
                    else:
                        # Новое событие - создаем
                        logger.info(f"🔍 DEBUG: Создаем новое событие {event.get('title', 'Unknown')}")
                        cur.execute("""
                            INSERT INTO events (subject, start_time, end_time, location, attendees, stream, notes, recording_url, actual_open_questions, google_event_id, google_calendar_link, description, last_google_sync, sync_source, google_updated_at)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, 'google', %s)
                        """, (
                            event.get('title', ''),
                            event.get('start_time', ''),
                            event.get('end_time', ''),
                            event.get('location', ''),
                            event.get('attendees', []),
                            event.get('stream', []),
                            event.get('notes', ''),
                            event.get('recording_url', ''),
                            event.get('actual_open_questions', ''),
                            event.get('google_event_id'),
                            event.get('google_calendar_link'),
                            event.get('description', ''),
                            event.get('updated')
                        ))
                        logger.info(f"✅ Создано новое событие: {event['title']}")
                        logger.info(f"🔍 DEBUG: Новое событие создано успешно")
                        synced_count += 1
                        
                except Exception as e:
                    logger.error(f"❌ Ошибка обработки события {event.get('title', 'Unknown')}: {str(e)}")
            
            conn.commit()
            
        except Exception as e:
            logger.error(f"❌ Ошибка умной синхронизации за период: {str(e)}")
            if 'conn' in locals():
                conn.rollback()
        finally:
            if 'cur' in locals():
                cur.close()
            if 'conn' in locals():
                conn.close()
        
        return synced_count
    
    async def save_microsoft_events_to_local_db_smart_period(self, events: List[Dict]) -> int:
        """Умное сохранение событий Microsoft Graph за период с определением направления синхронизации"""
        synced_count = 0
        
        try:
            logger.info(f"🔍 DEBUG: Начинаем save_microsoft_events_to_local_db_smart_period с {len(events)} событиями")
            from src.core.sync_direction import SyncDirectionDetector
            
            conn = self.get_db_connection()
            cur = conn.cursor(cursor_factory=RealDictCursor)
            
            for event in events:
                try:
                    logger.info(f"🔍 DEBUG: Обрабатываем событие {event.get('title', 'Unknown')}")
                    # Ищем существующее событие по microsoft_event_id
                    existing_event_id = None
                    existing_event = None
                    
                    if event.get('microsoft_event_id'):
                        logger.info(f"🔍 DEBUG: Ищем событие с microsoft_event_id={event['microsoft_event_id']}")
                        cur.execute("""
                            SELECT id, subject, last_local_update, last_microsoft_sync, sync_source,
                                   notes, actual_open_questions, recording_url
                            FROM events
                            WHERE microsoft_event_id = %s
                        """, (event['microsoft_event_id'],))
                        existing_event = cur.fetchone()
                        if existing_event:
                            existing_event_id = existing_event['id']
                            logger.info(f"🔍 DEBUG: Найдено существующее событие ID={existing_event_id}")
                        else:
                            logger.info(f"🔍 DEBUG: Существующее событие НЕ найдено")
                    
                    if existing_event:
                        # Определяем направление синхронизации
                        logger.info(f"🔍 DEBUG: Определяем направление синхронизации")
                        direction, reason = SyncDirectionDetector.determine_sync_direction(
                            existing_event, event
                        )
                        
                        logger.info(f"🔍 DEBUG: Направление: {direction}, причина: {reason}")
                        logger.info(f"🔄 Событие {event['title']}: {direction} - {reason}")
                        
                        if direction == 'microsoft_to_local':
                            # Обновляем локальное событие данными из Microsoft Graph
                            cur.execute("""
                                UPDATE events
                                SET subject = %s, start_time = %s, end_time = %s, location = %s,
                                    attendees = %s, description = %s, microsoft_calendar_link = %s,
                                    last_microsoft_sync = CURRENT_TIMESTAMP, sync_source = 'microsoft',
                                    microsoft_updated_at = %s, updated_at = CURRENT_TIMESTAMP
                                WHERE id = %s
                            """, (
                                event.get('title', ''),
                                event.get('start_time', ''),
                                event.get('end_time', ''),
                                event.get('location', ''),
                                event.get('attendees', []),
                                event.get('description', ''),
                                event.get('microsoft_calendar_link'),
                                event.get('updated_at'),
                                existing_event_id
                            ))
                            logger.info(f"✅ Обновлено из Microsoft Graph: {event['title']} (ID: {existing_event_id})")
                            synced_count += 1
                            
                        elif direction == 'local_to_microsoft':
                            # Локальное событие новее - не обновляем, только обновляем время синхронизации
                            cur.execute("""
                                UPDATE events
                                SET last_microsoft_sync = CURRENT_TIMESTAMP
                                WHERE id = %s
                            """, (existing_event_id,))
                            logger.info(f"ℹ️ Локальное событие новее: {event['title']} (ID: {existing_event_id})")
                            
                        elif direction == 'conflict':
                            # Конфликт - определяем приоритет
                            priority = SyncDirectionDetector.get_sync_priority(existing_event, event)
                            logger.warning(f"⚠️ Конфликт синхронизации: {event['title']} - приоритет: {priority}")
                            
                            if priority == 'microsoft':
                                # Обновляем из Microsoft Graph, но сохраняем важные локальные данные
                                cur.execute("""
                                    UPDATE events
                                    SET subject = %s, start_time = %s, end_time = %s, location = %s,
                                        attendees = %s, description = %s, microsoft_calendar_link = %s,
                                        last_microsoft_sync = CURRENT_TIMESTAMP, sync_source = 'microsoft',
                                        microsoft_updated_at = %s, updated_at = CURRENT_TIMESTAMP
                                    WHERE id = %s
                                """, (
                                    event.get('title', ''),
                                    event.get('start_time', ''),
                                    event.get('end_time', ''),
                                    event.get('location', ''),
                                    event.get('attendees', []),
                                    event.get('description', ''),
                                    event.get('microsoft_calendar_link'),
                                    event.get('updated_at'),
                                    existing_event_id
                                ))
                                logger.info(f"✅ Разрешен конфликт в пользу Microsoft Graph: {event['title']}")
                                synced_count += 1
                            else:
                                # Сохраняем локальную версию
                                cur.execute("""
                                    UPDATE events
                                    SET last_microsoft_sync = CURRENT_TIMESTAMP
                                    WHERE id = %s
                                """, (existing_event_id,))
                                logger.info(f"ℹ️ Сохранена локальная версия: {event['title']}")
                        
                        else:  # no_change
                            logger.debug(f"ℹ️ Изменений нет: {event['title']}")
                    
                    else:
                        # Новое событие - создаем
                        logger.info(f"🔍 DEBUG: Создаем новое событие {event.get('title', 'Unknown')}")
                        cur.execute("""
                            INSERT INTO events (subject, start_time, end_time, location, attendees, stream, notes, recording_url, actual_open_questions, microsoft_event_id, microsoft_calendar_link, description, last_microsoft_sync, sync_source, microsoft_updated_at)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, 'microsoft', %s)
                        """, (
                            event.get('title', ''),
                            event.get('start_time', ''),
                            event.get('end_time', ''),
                            event.get('location', ''),
                            event.get('attendees', []),
                            event.get('stream', []),
                            event.get('notes', ''),
                            event.get('recording_url', ''),
                            event.get('actual_open_questions', ''),
                            event.get('microsoft_event_id'),
                            event.get('microsoft_calendar_link'),
                            event.get('description', ''),
                            event.get('updated_at')
                        ))
                        logger.info(f"✅ Создано новое событие: {event['title']}")
                        logger.info(f"🔍 DEBUG: Новое событие создано успешно")
                        synced_count += 1
                        
                except Exception as e:
                    logger.error(f"❌ Ошибка обработки события {event.get('title', 'Unknown')}: {str(e)}")
            
            conn.commit()
            
        except Exception as e:
            logger.error(f"❌ Ошибка умной синхронизации Microsoft Graph за период: {str(e)}")
            if 'conn' in locals():
                conn.rollback()
        finally:
            if 'cur' in locals():
                cur.close()
            if 'conn' in locals():
                conn.close()
                
        return synced_count

# Глобальный экземпляр менеджера синхронизации
auto_sync_manager = AutoSyncManager()

async def start_background_sync():
    """Запустить фоновую синхронизацию"""
    await auto_sync_manager.start_auto_sync()

def stop_background_sync():
    """Остановить фоновую синхронизацию"""
    auto_sync_manager.stop_auto_sync()

import logging
import logging.handlers
from logging.handlers import RotatingFileHandler, TimedRotatingFileHandler
import os
from datetime import datetime
import json

class DetailedFormatter(logging.Formatter):
    """Кастомный форматтер для детального логирования"""
    
    def format(self, record):
        # Базовое форматирование
        timestamp = datetime.fromtimestamp(record.created).strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
        level = record.levelname
        logger_name = record.name
        message = record.getMessage()
        
        # Добавляем дополнительную информацию
        extra_info = []
        
        # Информация о функции и строке
        if hasattr(record, 'funcName') and record.funcName:
            extra_info.append(f"func={record.funcName}")
        
        if hasattr(record, 'lineno') and record.lineno:
            extra_info.append(f"line={record.lineno}")
        
        # Информация о процессе и потоке
        if hasattr(record, 'process') and record.process:
            extra_info.append(f"pid={record.process}")
        
        if hasattr(record, 'thread') and record.thread:
            extra_info.append(f"tid={record.thread}")
        
        # Дополнительные поля из record
        if hasattr(record, 'user_id'):
            extra_info.append(f"user={record.user_id}")
        
        if hasattr(record, 'request_id'):
            extra_info.append(f"req={record.request_id}")
        
        if hasattr(record, 'event_id'):
            extra_info.append(f"event={record.event_id}")
        
        if hasattr(record, 'operation'):
            extra_info.append(f"op={record.operation}")
        
        # Формируем итоговую строку
        extra_str = " | ".join(extra_info) if extra_info else ""
        if extra_str:
            extra_str = f" | {extra_str}"
        
        return f"{timestamp} | {level:8} | {logger_name:20} | {message}{extra_str}"

def setup_logging():
    """Настройка системы логирования"""
    
    # Создаем директорию для логов
    log_dir = "logs"
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
    
    # Настройка корневого логгера
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.DEBUG)
    
    # Очищаем существующие обработчики
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # 1. Консольный вывод (INFO и выше)
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_formatter = logging.Formatter(
        '%(asctime)s | %(levelname)-8s | %(name)-20s | %(message)s',
        datefmt='%H:%M:%S'
    )
    console_handler.setFormatter(console_formatter)
    root_logger.addHandler(console_handler)
    
    # 2. Общий лог файл (DEBUG и выше, ротация по размеру)
    general_handler = logging.handlers.RotatingFileHandler(
        os.path.join(log_dir, 'officer.log'),
        maxBytes=10*1024*1024,  # 10MB
        backupCount=7,  # 7 файлов = неделя
        encoding='utf-8'
    )
    general_handler.setLevel(logging.DEBUG)
    general_handler.setFormatter(DetailedFormatter())
    root_logger.addHandler(general_handler)
    
    # 3. Лог ошибок (ERROR и выше, ротация по размеру)
    error_handler = logging.handlers.RotatingFileHandler(
        os.path.join(log_dir, 'errors.log'),
        maxBytes=5*1024*1024,  # 5MB
        backupCount=14,  # 14 файлов = 2 недели
        encoding='utf-8'
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(DetailedFormatter())
    root_logger.addHandler(error_handler)
    
    # 4. Лог API запросов (ротация по времени)
    api_handler = logging.handlers.TimedRotatingFileHandler(
        os.path.join(log_dir, 'api.log'),
        when='midnight',
        interval=1,
        backupCount=7,  # 7 дней
        encoding='utf-8'
    )
    api_handler.setLevel(logging.INFO)
    api_handler.setFormatter(DetailedFormatter())
    
    # Создаем отдельный логгер для API
    api_logger = logging.getLogger('api')
    api_logger.addHandler(api_handler)
    api_logger.setLevel(logging.INFO)
    api_logger.propagate = False  # Не дублируем в корневой логгер
    
    # 5. Лог базы данных (ротация по времени)
    db_handler = logging.handlers.TimedRotatingFileHandler(
        os.path.join(log_dir, 'database.log'),
        when='midnight',
        interval=1,
        backupCount=7,  # 7 дней
        encoding='utf-8'
    )
    db_handler.setLevel(logging.DEBUG)
    db_handler.setFormatter(DetailedFormatter())
    
    # Создаем отдельный логгер для БД
    db_logger = logging.getLogger('database')
    db_logger.addHandler(db_handler)
    db_logger.setLevel(logging.DEBUG)
    db_logger.propagate = False
    
    # 6. Лог Google Calendar (ротация по времени)
    gc_handler = logging.handlers.TimedRotatingFileHandler(
        os.path.join(log_dir, 'google_calendar.log'),
        when='midnight',
        interval=1,
        backupCount=7,  # 7 дней
        encoding='utf-8'
    )
    gc_handler.setLevel(logging.DEBUG)
    gc_handler.setFormatter(DetailedFormatter())
    
    # Создаем отдельный логгер для Google Calendar
    gc_logger = logging.getLogger('google_calendar')
    gc_logger.addHandler(gc_handler)
    gc_logger.setLevel(logging.DEBUG)
    gc_logger.propagate = False
    
    # 7. Лог автоматической синхронизации (ротация по времени)
    sync_handler = logging.handlers.TimedRotatingFileHandler(
        os.path.join(log_dir, 'auto_sync.log'),
        when='midnight',
        interval=1,
        backupCount=7,  # 7 дней
        encoding='utf-8'
    )
    sync_handler.setLevel(logging.DEBUG)
    sync_handler.setFormatter(DetailedFormatter())
    
    # Создаем отдельный логгер для автосинхронизации
    sync_logger = logging.getLogger('auto_sync')
    sync_logger.addHandler(sync_handler)
    sync_logger.setLevel(logging.DEBUG)
    sync_logger.propagate = False
    
    # 7. Лог backup'ов событий (для восстановления)
    backup_handler = logging.handlers.RotatingFileHandler(
        os.path.join(log_dir, 'event_backups.log'),
        maxBytes=50*1024*1024,  # 50MB
        backupCount=30,  # 30 файлов = месяц
        encoding='utf-8'
    )
    backup_handler.setLevel(logging.INFO)
    backup_handler.setFormatter(DetailedFormatter())
    
    # Создаем отдельный логгер для backup'ов
    backup_logger = logging.getLogger('event_backups')
    backup_logger.addHandler(backup_handler)
    backup_logger.setLevel(logging.INFO)
    backup_logger.propagate = False
    
    # 8. Лог восстановления событий
    restore_handler = logging.handlers.RotatingFileHandler(
        os.path.join(log_dir, 'event_restores.log'),
        maxBytes=10*1024*1024,  # 10MB
        backupCount=14,  # 14 файлов = 2 недели
        encoding='utf-8'
    )
    restore_handler.setLevel(logging.INFO)
    restore_handler.setFormatter(DetailedFormatter())
    
    # Создаем отдельный логгер для восстановления
    restore_logger = logging.getLogger('event_restores')
    restore_logger.addHandler(restore_handler)
    restore_logger.setLevel(logging.INFO)
    restore_logger.propagate = False
    
    # Создаем логгер для синхронизации удалений
    sync_deletion_handler = logging.handlers.TimedRotatingFileHandler(
        'logs/sync_deletions.log',
        when='midnight',
        interval=1,
        backupCount=7,  # Храним неделю
        encoding='utf-8'
    )
    sync_deletion_handler.setLevel(logging.INFO)
    sync_deletion_handler.setFormatter(DetailedFormatter())
    
    sync_deletion_logger = logging.getLogger('sync_deletions')
    sync_deletion_logger.addHandler(sync_deletion_handler)
    sync_deletion_logger.setLevel(logging.INFO)
    sync_deletion_logger.propagate = False
    
    # Настройка уровней для внешних библиотек
    logging.getLogger('googleapiclient').setLevel(logging.WARNING)
    logging.getLogger('google_auth_oauthlib').setLevel(logging.WARNING)
    logging.getLogger('urllib3').setLevel(logging.WARNING)
    logging.getLogger('httpx').setLevel(logging.WARNING)
    
    # Логируем начало работы
    logger = logging.getLogger(__name__)
    logger.info("🚀 Система логирования инициализирована")
    logger.info(f"📁 Логи сохраняются в директории: {os.path.abspath(log_dir)}")
    logger.info("📊 Настроены следующие логгеры:")
    logger.info("   • officer.log - общий лог (10MB, 7 файлов)")
    logger.info("   • errors.log - ошибки (5MB, 14 файлов)")
    logger.info("   • api.log - API запросы (ежедневно, 7 дней)")
    logger.info("   • database.log - операции с БД (ежедневно, 7 дней)")
    logger.info("   • google_calendar.log - Google Calendar (ежедневно, 7 дней)")
    logger.info("   • auto_sync.log - автосинхронизация (ежедневно, 7 дней)")
    logger.info("   • event_backups.log - backup'ы событий (50MB, 30 файлов)")
    logger.info("   • event_restores.log - восстановление событий (10MB, 14 файлов)")

def log_api_request(method: str, path: str, status_code: int, response_time: float, 
                   user_id: str = None, request_id: str = None, **kwargs):
    """Логирование API запроса"""
    api_logger = logging.getLogger('api')
    
    extra = {
        'operation': 'api_request',
        'method': method,
        'path': path,
        'status_code': status_code,
        'response_time': response_time
    }
    
    if user_id:
        extra['user_id'] = user_id
    if request_id:
        extra['request_id'] = request_id
    
    # Добавляем дополнительные параметры
    extra.update(kwargs)
    
    level = logging.INFO if status_code < 400 else logging.WARNING if status_code < 500 else logging.ERROR
    
    api_logger.log(level, f"{method} {path} -> {status_code} ({response_time:.3f}s)", extra=extra)

def log_database_operation(operation: str, table: str, record_id: int = None, 
                          success: bool = True, **kwargs):
    """Логирование операции с базой данных"""
    db_logger = logging.getLogger('database')
    
    extra = {
        'operation': operation,
        'table': table,
        'success': success
    }
    
    if record_id:
        extra['record_id'] = record_id
    
    # Добавляем дополнительные параметры
    extra.update(kwargs)
    
    level = logging.INFO if success else logging.ERROR
    
    db_logger.log(level, f"DB {operation} on {table}" + (f" (ID: {record_id})" if record_id else ""), extra=extra)

def log_google_calendar_operation(operation: str, event_id: str = None, 
                                success: bool = True, **kwargs):
    """Логирование операции с Google Calendar"""
    gc_logger = logging.getLogger('google_calendar')
    
    extra = {
        'operation': operation,
        'success': success
    }
    
    if event_id:
        extra['event_id'] = event_id
    
    # Добавляем дополнительные параметры
    extra.update(kwargs)
    
    level = logging.INFO if success else logging.ERROR
    
    gc_logger.log(level, f"GC {operation}" + (f" (Event: {event_id})" if event_id else ""), extra=extra)

def log_auto_sync_operation(operation: str, sync_type: str = None, 
                           events_count: int = None, success: bool = True, **kwargs):
    """Логирование операции автоматической синхронизации"""
    sync_logger = logging.getLogger('auto_sync')
    
    extra = {
        'operation': operation,
        'success': success
    }
    
    if sync_type:
        extra['sync_type'] = sync_type
    if events_count is not None:
        extra['events_count'] = events_count
    
    # Добавляем дополнительные параметры
    extra.update(kwargs)
    
    level = logging.INFO if success else logging.ERROR
    
    sync_logger.log(level, f"SYNC {operation}" + 
                   (f" ({sync_type})" if sync_type else "") + 
                   (f" [{events_count} events]" if events_count is not None else ""), extra=extra)

def log_event_operation(operation: str, event_id: int, event_subject: str = None, 
                       success: bool = True, **kwargs):
    """Логирование операции с событием"""
    logger = logging.getLogger('events')
    
    extra = {
        'operation': operation,
        'event_id': event_id,
        'success': success
    }
    
    if event_subject:
        extra['event_subject'] = event_subject
    
    # Добавляем дополнительные параметры
    extra.update(kwargs)
    
    level = logging.INFO if success else logging.ERROR
    
    logger.log(level, f"EVENT {operation} (ID: {event_id})" + 
              (f" - {event_subject}" if event_subject else ""), extra=extra)

def log_user_action(action: str, user_id: str = None, details: str = None, **kwargs):
    """Логирование действий пользователя"""
    logger = logging.getLogger('user_actions')
    
    extra = {
        'operation': 'user_action',
        'action': action
    }
    
    if user_id:
        extra['user_id'] = user_id
    if details:
        extra['details'] = details
    
    # Добавляем дополнительные параметры
    extra.update(kwargs)
    
    logger.info(f"USER {action}" + (f" - {details}" if details else ""), extra=extra)

def log_performance(operation: str, duration: float, **kwargs):
    """Логирование производительности"""
    logger = logging.getLogger('performance')
    
    extra = {
        'operation': operation,
        'duration': duration
    }
    
    # Добавляем дополнительные параметры
    extra.update(kwargs)
    
    level = logging.WARNING if duration > 1.0 else logging.INFO
    
    logger.log(level, f"PERF {operation} took {duration:.3f}s", extra=extra)

def log_detailed_event_backup(event_data: dict, operation: str, event_id: int = None):
    """Детальное логирование события для возможности восстановления с защитой от переполнения"""
    import json
    from datetime import datetime
    import os
    import threading
    
    logger = logging.getLogger('event_backups')
    
    # Проверяем размер лог-файла перед записью
    backup_file = "logs/event_backups.log"
    if os.path.exists(backup_file):
        file_size_mb = os.path.getsize(backup_file) / (1024 * 1024)
        if file_size_mb > 45:  # Близко к лимиту в 50MB
            logger.warning(f"⚠️ Файл backup логов близок к переполнению: {file_size_mb:.1f}MB")
    
    # Ограничиваем размер данных события для предотвращения переполнения
    sanitized_event_data = sanitize_event_data_for_logging(event_data)
    
    backup_data = {
        "timestamp": datetime.now().isoformat(),
        "operation": operation,
        "event_id": event_id,
        "event_data": sanitized_event_data,
        "backup_id": f"{operation}_{event_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    }
    
    # Логируем только краткую информацию в основной лог
    logger.info(f"BACKUP {operation.upper()} - ID: {event_id} - {operation}_{event_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
    
    # Асинхронно записываем в отдельный файл для восстановления
    def write_backup_async():
        try:
            os.makedirs("logs", exist_ok=True)
            with open(backup_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(backup_data, ensure_ascii=False, default=str) + "\n")
        except Exception as e:
            logger.error(f"❌ Ошибка записи backup: {e}")
    
    # Запускаем запись в отдельном потоке
    threading.Thread(target=write_backup_async, daemon=True).start()

def sanitize_event_data_for_logging(event_data: dict) -> dict:
    """Санитизация данных события для логирования"""
    sanitized = {}
    
    # Ограничиваем размер текстовых полей
    text_fields = ['subject', 'description', 'location']
    for field in text_fields:
        value = event_data.get(field, '')
        if isinstance(value, str):
            sanitized[field] = value[:1000]  # Ограничиваем до 1000 символов
        else:
            sanitized[field] = str(value)[:1000] if value else ''
    
    # Ограничиваем количество участников
    attendees = event_data.get('attendees', [])
    if isinstance(attendees, list):
        sanitized['attendees'] = attendees[:20]  # Максимум 20 участников
    else:
        sanitized['attendees'] = []
    
    # Сохраняем остальные поля
    for key, value in event_data.items():
        if key not in sanitized:
            sanitized[key] = value
    
    return sanitized

def log_sync_deletion(event_data: dict, operation: str, success: bool, error: str = None):
    """Логирование операций синхронизации удалений"""
    sync_deletion_logger = logging.getLogger('sync_deletions')
    
    log_data = {
        'timestamp': datetime.now().isoformat(),
        'operation': operation,
        'event_id': event_data.get('id'),
        'event_subject': event_data.get('subject'),
        'google_event_id': event_data.get('google_event_id'),
        'start_time': event_data.get('start_time'),
        'end_time': event_data.get('end_time'),
        'success': success,
        'error': error
    }
    
    if success:
        sync_deletion_logger.info(f"SYNC_DELETION {operation} | Event: {event_data.get('subject')} (ID: {event_data.get('id')}) | Google ID: {event_data.get('google_event_id')}")
    else:
        sync_deletion_logger.error(f"SYNC_DELETION {operation}_FAILED | Event: {event_data.get('subject')} (ID: {event_data.get('id')}) | Error: {error}")

def log_event_restore(restore_data: dict, success: bool, error: str = None):
    """Логирование восстановления события"""
    logger = logging.getLogger('event_restores')
    
    status = "SUCCESS" if success else "FAILED"
    logger.info(f"RESTORE {status} - {json.dumps(restore_data, default=str)}" + (f" - Error: {error}" if error else ""))

# Инициализация при импорте модуля
if __name__ != "__main__":
    setup_logging()


"""
Сервис для управления автоматической синхронизацией
"""
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

class AutoSyncService:
    """Сервис для управления автоматической синхронизацией"""
    
    def __init__(self, db_manager):
        self.db_manager = db_manager
        self.is_running = False
        self.sync_interval = 300  # 5 минут по умолчанию
        self.google_calendar_available = False
        self.auto_sync_available = False
    
    def get_status(self) -> Dict[str, Any]:
        """Получить статус автоматической синхронизации"""
        return {
            "available": self.auto_sync_available and self.google_calendar_available,
            "running": self.is_running,
            "sync_interval": self.sync_interval,
            "google_calendar_available": self.google_calendar_available,
            "auto_sync_available": self.auto_sync_available,
            "message": "Автоматическая синхронизация активна" if (self.auto_sync_available and self.is_running) else "Автоматическая синхронизация неактивна"
        }
    
    def start_auto_sync(self) -> Dict[str, str]:
        """Запустить автоматическую синхронизацию"""
        if not self.auto_sync_available:
            raise Exception("Модуль автоматической синхронизации недоступен")
        
        if not self.google_calendar_available:
            raise Exception("Google Calendar API не настроен")
        
        if self.is_running:
            return {"message": "Автоматическая синхронизация уже запущена"}
        
        # Здесь должна быть логика запуска синхронизации
        self.is_running = True
        logger.info("Автоматическая синхронизация запущена")
        
        return {"message": "Автоматическая синхронизация запущена"}
    
    def stop_auto_sync(self) -> Dict[str, str]:
        """Остановить автоматическую синхронизацию"""
        if not self.auto_sync_available:
            raise Exception("Модуль автоматической синхронизации недоступен")
        
        self.is_running = False
        logger.info("Автоматическая синхронизация остановлена")
        
        return {"message": "Автоматическая синхронизация остановлена"}
    
    def sync_now(self) -> Dict[str, str]:
        """Выполнить синхронизацию прямо сейчас"""
        if not self.auto_sync_available:
            raise Exception("Модуль автоматической синхронизации недоступен")
        
        if not self.google_calendar_available:
            raise Exception("Google Calendar API не настроен")
        
        # Здесь должна быть логика немедленной синхронизации
        logger.info("Выполняется немедленная синхронизация")
        
        return {"message": "Синхронизация выполнена"}

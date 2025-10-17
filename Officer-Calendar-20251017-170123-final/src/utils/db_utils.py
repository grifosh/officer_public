"""
Утилиты для работы с базой данных и обработки ошибок
"""
from functools import wraps
from fastapi import HTTPException
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2 import pool
from typing import Optional, Callable, Any
import logging
import threading
import time

logger = logging.getLogger(__name__)

def handle_db_errors(error_message: str = "Ошибка базы данных"):
    """
    Декоратор для унифицированной обработки ошибок базы данных
    
    Args:
        error_message: Сообщение об ошибке для пользователя
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs)
            except HTTPException:
                # Пробрасываем HTTPException как есть
                raise
            except Exception as e:
                # Логируем ошибку
                logger.error(f"Database error in {func.__name__}: {str(e)}")
                
                # Возвращаем HTTPException с понятным сообщением
                raise HTTPException(
                    status_code=500, 
                    detail=f"{error_message}: {str(e)}"
                )
        
        return wrapper
    return decorator

def handle_db_errors_sync(error_message: str = "Ошибка базы данных"):
    """
    Синхронная версия декоратора для обработки ошибок БД
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            conn = None
            cur = None
            try:
                return func(*args, **kwargs)
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Database error in {func.__name__}: {str(e)}")
                
                if conn:
                    try:
                        conn.rollback()
                    except:
                        pass
                
                raise HTTPException(
                    status_code=500, 
                    detail=f"{error_message}: {str(e)}"
                )
            finally:
                if cur:
                    try:
                        cur.close()
                    except:
                        pass
                if conn:
                    try:
                        conn.close()
                    except:
                        pass
        
        return wrapper
    return decorator

class DatabaseManager:
    """
    Менеджер для работы с подключениями к базе данных с поддержкой connection pool
    """
    
    def __init__(self, db_config: dict, min_connections: int = 2, max_connections: int = 10):
        self.db_config = db_config
        self.min_connections = min_connections
        self.max_connections = max_connections
        self._connection_pool = None
        self._lock = threading.Lock()
        self._initialized = False
    
    def _initialize_pool(self):
        """Инициализация connection pool"""
        if self._initialized:
            return
            
        with self._lock:
            if self._initialized:
                return
                
            try:
                # Создаем connection pool
                self._connection_pool = psycopg2.pool.ThreadedConnectionPool(
                    minconn=self.min_connections,
                    maxconn=self.max_connections,
                    **self.db_config
                )
                self._initialized = True
                logger.info(f"Connection pool инициализирован: {self.min_connections}-{self.max_connections} соединений")
            except Exception as e:
                logger.error(f"Ошибка инициализации connection pool: {str(e)}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Ошибка инициализации connection pool: {str(e)}"
                )
    
    def get_connection(self, use_dict_cursor: bool = True):
        """
        Получить подключение к базе данных из pool
        
        Args:
            use_dict_cursor: Использовать RealDictCursor или обычный cursor
        """
        if not self._initialized:
            self._initialize_pool()
            
        try:
            conn = self._connection_pool.getconn()
            if use_dict_cursor:
                conn.cursor_factory = RealDictCursor
            
            logger.debug("Database connection получено из pool")
            return conn
        except Exception as e:
            logger.error(f"Ошибка получения соединения из pool: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Ошибка получения соединения: {str(e)}"
            )
    
    def return_connection(self, conn):
        """
        Вернуть соединение в pool
        
        Args:
            conn: Соединение для возврата
        """
        if conn and self._connection_pool:
            try:
                self._connection_pool.putconn(conn)
                logger.debug("Database connection возвращено в pool")
            except Exception as e:
                logger.error(f"Ошибка возврата соединения в pool: {str(e)}")
    
    def execute_query(self, query: str, params: tuple = None, fetch_one: bool = False, fetch_all: bool = True):
        """
        Выполнить SQL запрос с автоматическим управлением соединением из pool
        
        Args:
            query: SQL запрос
            params: Параметры для запроса
            fetch_one: Вернуть только одну запись
            fetch_all: Вернуть все записи
        """
        conn = None
        cur = None
        try:
            conn = self.get_connection()
            cur = conn.cursor()
            
            cur.execute(query, params)
            
            if fetch_one:
                return cur.fetchone()
            elif fetch_all:
                return cur.fetchall()
            else:
                conn.commit()
                return cur.rowcount
                
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Query execution failed: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Ошибка выполнения запроса: {str(e)}"
            )
        finally:
            if cur:
                cur.close()
            if conn:
                self.return_connection(conn)
    
    def execute_transaction(self, queries: list):
        """
        Выполнить несколько запросов в одной транзакции
        
        Args:
            queries: Список кортежей (query, params)
        """
        conn = None
        cur = None
        try:
            conn = self.get_connection()
            cur = conn.cursor()
            
            for query, params in queries:
                cur.execute(query, params)
            
            conn.commit()
            return True
            
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Transaction failed: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Ошибка выполнения транзакции: {str(e)}"
            )
        finally:
            if cur:
                cur.close()
            if conn:
                self.return_connection(conn)
    
    def close_pool(self):
        """Закрыть connection pool"""
        if self._connection_pool:
            try:
                self._connection_pool.closeall()
                logger.info("Connection pool закрыт")
            except Exception as e:
                logger.error(f"Ошибка закрытия connection pool: {str(e)}")
    
    def get_pool_status(self):
        """Получить статус connection pool"""
        if not self._connection_pool:
            return {"status": "not_initialized"}
        
        return {
            "status": "active",
            "min_connections": self.min_connections,
            "max_connections": self.max_connections,
            "closed": self._connection_pool.closed
        }

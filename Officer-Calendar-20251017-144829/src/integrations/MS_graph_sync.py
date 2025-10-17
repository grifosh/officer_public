import logging
import json
import pickle
import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import requests
from msal import ConfidentialClientApplication, PublicClientApplication

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('MS_graph_sync')

class MicrosoftGraphSync:
    """Синхронизация с Microsoft Graph API (Outlook/Teams)"""
    
    def __init__(self):
        self.client_id = os.getenv('MICROSOFT_CLIENT_ID')
        self.client_secret = os.getenv('MICROSOFT_CLIENT_SECRET')
        self.tenant_id = os.getenv('MICROSOFT_TENANT_ID')
        self.authority = f"https://login.microsoftonline.com/{self.tenant_id}"
        self.scope = ["https://graph.microsoft.com/Calendars.ReadWrite"]
        self.graph_endpoint = "https://graph.microsoft.com/v1.0"
        
        self.token_cache_file = "microsoft_token.pickle"
        self.app = None
        self.access_token = None
        
        logger.info("🔧 Инициализация Microsoft Graph Sync")
        
    def authenticate(self) -> bool:
        """Аутентификация с Microsoft Graph API"""
        try:
            logger.info("🔐 Начало аутентификации с Microsoft Graph...")
            
            # Проверяем наличие кэшированного токена
            if os.path.exists(self.token_cache_file):
                try:
                    with open(self.token_cache_file, 'rb') as f:
                        token_cache = pickle.load(f)
                    logger.info("📁 Загружен кэшированный токен")
                except Exception as e:
                    logger.warning(f"⚠️ Ошибка загрузки кэша токена: {e}")
                    token_cache = None
            else:
                token_cache = None
            
            # Создаем приложение
            if self.client_secret:
                # Confidential Client (для серверных приложений)
                self.app = ConfidentialClientApplication(
                    client_id=self.client_id,
                    client_credential=self.client_secret,
                    authority=self.authority,
                    token_cache=token_cache
                )
                logger.info("🔒 Используем Confidential Client Application")
            else:
                # Public Client (для настольных приложений)
                self.app = PublicClientApplication(
                    client_id=self.client_id,
                    authority=self.authority,
                    token_cache=token_cache
                )
                logger.info("🔓 Используем Public Client Application")
            
            # Получаем токен
            accounts = self.app.get_accounts()
            if accounts:
                logger.info(f"👤 Найдено {len(accounts)} аккаунтов")
                result = self.app.acquire_token_silent(self.scope, account=accounts[0])
            else:
                logger.info("🔄 Нет кэшированных аккаунтов, требуется интерактивная аутентификация")
                if self.client_secret:
                    # Попробуем сначала client credentials flow
                    try:
                        result = self.app.acquire_token_for_client(scopes=["https://graph.microsoft.com/.default"])
                        logger.info("🔒 Используем Client Credentials Flow")
                    except Exception as e:
                        logger.warning(f"⚠️ Client Credentials Flow не удался: {e}")
                        # Fallback к device code flow
                        logger.info("🔄 Переключаемся на Device Code Flow")
                        result = self.app.acquire_token_by_device_flow(
                            self.app.initiate_device_flow(scopes=self.scope)
                        )
                else:
                    # Для настольных приложений используем device code flow
                    result = self.app.acquire_token_by_device_flow(
                        self.app.initiate_device_flow(scopes=self.scope)
                    )
            
            if "access_token" in result:
                self.access_token = result["access_token"]
                logger.info("✅ Успешная аутентификация с Microsoft Graph")
                
                # Сохраняем кэш токена
                try:
                    with open(self.token_cache_file, 'wb') as f:
                        pickle.dump(self.app.token_cache, f)
                    logger.info("💾 Токен сохранен в кэш")
                except Exception as e:
                    logger.warning(f"⚠️ Ошибка сохранения кэша токена: {e}")
                
                return True
            else:
                logger.error(f"❌ Ошибка аутентификации: {result.get('error_description', 'Unknown error')}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Ошибка аутентификации с Microsoft Graph: {str(e)}")
            return False
    
    def _make_request(self, method: str, endpoint: str, data: dict = None) -> Optional[dict]:
        """Выполнить запрос к Microsoft Graph API"""
        if not self.access_token:
            logger.error("❌ Нет токена доступа")
            return None
        
        url = f"{self.graph_endpoint}{endpoint}"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        try:
            logger.debug(f"🌐 {method} запрос к: {url}")
            
            if method.upper() == "GET":
                response = requests.get(url, headers=headers)
            elif method.upper() == "POST":
                response = requests.post(url, headers=headers, json=data)
            elif method.upper() == "PUT":
                response = requests.put(url, headers=headers, json=data)
            elif method.upper() == "PATCH":
                response = requests.patch(url, headers=headers, json=data)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=headers)
            else:
                logger.error(f"❌ Неподдерживаемый HTTP метод: {method}")
                return None
            
            logger.debug(f"📡 Ответ: {response.status_code}")
            
            if response.status_code in [200, 201, 204]:
                if response.content:
                    return response.json()
                return {"success": True}
            else:
                logger.error(f"❌ Ошибка API: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Ошибка запроса к Microsoft Graph: {str(e)}")
            return None
    
    def get_today_events(self, calendar_id: str = None) -> List[Dict]:
        """Получить события на сегодня из Outlook календаря"""
        return self.get_events_for_period(days_ahead=0, calendar_id=calendar_id)
    
    def get_events_for_period(self, days_ahead: int = 7, calendar_id: str = None) -> List[Dict]:
        """Получить события на несколько дней вперед из Outlook календаря"""
        try:
            logger.info(f"📅 Получение событий на {days_ahead} дней вперед из Microsoft Graph...")
            
            # Для Application permissions получаем список пользователей сначала
            users_result = self._make_request("GET", "/users")
            
            if not users_result or "value" not in users_result:
                logger.warning("⚠️ Не удалось получить список пользователей")
                return []
            
            # Используем первого пользователя
            users = users_result["value"]
            if not users:
                logger.warning("⚠️ Пользователи не найдены")
                return []
            
            user_id = users[0]["id"]
            logger.info(f"👤 Используем пользователя: {user_id}")
            
            # Определяем календарь
            if calendar_id:
                calendar_endpoint = f"/users/{user_id}/calendars/{calendar_id}/events"
            else:
                calendar_endpoint = f"/users/{user_id}/events"
            
            # Получаем события за период
            today = datetime.now().date()
            end_date = today + timedelta(days=days_ahead)
            start_time = datetime.combine(today, datetime.min.time())
            end_time = datetime.combine(end_date, datetime.max.time())
            
            # Форматируем время в ISO 8601
            start_time_str = start_time.isoformat() + "Z"
            end_time_str = end_time.isoformat() + "Z"
            
            endpoint = f"{calendar_endpoint}?$filter=start/dateTime ge '{start_time_str}' and end/dateTime le '{end_time_str}'&$orderby=start/dateTime"
            
            result = self._make_request("GET", endpoint)
            
            if result and "value" in result:
                events = result["value"]
                logger.info(f"📊 Получено {len(events)} событий за период ({days_ahead} дней) из Microsoft Graph")
                
                processed_events = []
                for event in events:
                    processed_event = self._process_event(event)
                    if processed_event:
                        processed_events.append(processed_event)
                
                logger.info(f"✅ Обработано {len(processed_events)} событий")
                return processed_events
            else:
                logger.warning("⚠️ Не удалось получить события из Microsoft Graph")
                return []
                
        except Exception as e:
            logger.error(f"❌ Ошибка получения событий из Microsoft Graph: {str(e)}")
            return []
    
    def _process_event(self, event: Dict) -> Optional[Dict]:
        """Обработать событие из Microsoft Graph в стандартный формат"""
        try:
            # Извлекаем основную информацию
            subject = event.get("subject", "")
            start_time = event.get("start", {}).get("dateTime")
            end_time = event.get("end", {}).get("dateTime")
            location = event.get("location", {}).get("displayName", "")
            description = event.get("body", {}).get("content", "")
            
            # Обрабатываем участников
            attendees = []
            if "attendees" in event:
                for attendee in event["attendees"]:
                    email = attendee.get("emailAddress", {}).get("address", "")
                    name = attendee.get("emailAddress", {}).get("name", "")
                    if email:
                        attendees.append(email)
                    elif name:
                        attendees.append(name)
            
            # Обрабатываем время
            if start_time and end_time:
                # Конвертируем в локальное время (если необходимо)
                start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
                
                # Форматируем для нашего API
                start_formatted = start_dt.strftime("%Y-%m-%d %H:%M:%S")
                end_formatted = end_dt.strftime("%Y-%m-%d %H:%M:%S")
            else:
                logger.warning(f"⚠️ Событие без времени: {subject}")
                return None
            
            processed_event = {
                "title": subject,
                "start_time": start_formatted,
                "end_time": end_formatted,
                "description": description,
                "location": location,
                "attendees": attendees,
                "source": "microsoft_graph",
                "microsoft_event_id": event.get("id"),
                "microsoft_calendar_link": event.get("webLink", ""),
                "created_at": event.get("createdDateTime"),
                "updated_at": event.get("lastModifiedDateTime")
            }
            
            logger.debug(f"✅ Обработано событие: {subject} ({start_formatted} - {end_formatted})")
            return processed_event
            
        except Exception as e:
            logger.error(f"❌ Ошибка обработки события: {str(e)}")
            return None
    
    def create_event_in_microsoft_graph(self, event_data: Dict) -> Optional[str]:
        """Создать событие в Microsoft Graph (Outlook)"""
        try:
            logger.info(f"📝 Создание события в Microsoft Graph: {event_data.get('title', 'Без названия')}")
            
            # Подготавливаем данные для Microsoft Graph
            microsoft_event = {
                "subject": event_data.get("title", ""),
                "body": {
                    "contentType": "text",
                    "content": event_data.get("description", "")
                },
                "start": {
                    "dateTime": event_data.get("start_time"),
                    "timeZone": "UTC"
                },
                "end": {
                    "dateTime": event_data.get("end_time"),
                    "timeZone": "UTC"
                },
                "location": {
                    "displayName": event_data.get("location", "")
                }
            }
            
            # Добавляем участников, если они есть
            if event_data.get("attendees"):
                microsoft_event["attendees"] = []
                for attendee in event_data["attendees"]:
                    if attendee.strip():
                        # Проверяем, является ли участник email адресом
                        if "@" in attendee and "." in attendee.split("@")[1]:
                            microsoft_event["attendees"].append({
                                "emailAddress": {
                                    "address": attendee.strip(),
                                    "name": attendee.strip()
                                },
                                "type": "required"
                            })
                        else:
                            logger.debug(f"⚠️ Пропускаем участника '{attendee}' - не является email адресом")
            
            result = self._make_request("POST", "/me/events", microsoft_event)
            
            if result and "id" in result:
                event_id = result["id"]
                logger.info(f"✅ Событие создано в Microsoft Graph с ID: {event_id}")
                return event_id
            else:
                logger.error("❌ Не удалось создать событие в Microsoft Graph")
                return None
                
        except Exception as e:
            logger.error(f"❌ Ошибка создания события в Microsoft Graph: {str(e)}")
            return None
    
    def update_event_in_microsoft_graph(self, event_id: str, event_data: Dict) -> bool:
        """Обновить событие в Microsoft Graph"""
        try:
            logger.info(f"📝 Обновление события в Microsoft Graph: {event_id}")
            
            # Подготавливаем данные для обновления
            update_data = {}
            
            if "title" in event_data:
                update_data["subject"] = event_data["title"]
            
            if "description" in event_data:
                update_data["body"] = {
                    "contentType": "text",
                    "content": event_data["description"]
                }
            
            if "start_time" in event_data:
                update_data["start"] = {
                    "dateTime": event_data["start_time"],
                    "timeZone": "UTC"
                }
            
            if "end_time" in event_data:
                update_data["end"] = {
                    "dateTime": event_data["end_time"],
                    "timeZone": "UTC"
                }
            
            if "location" in event_data:
                update_data["location"] = {
                    "displayName": event_data["location"]
                }
            
            if "attendees" in event_data:
                update_data["attendees"] = []
                for attendee in event_data["attendees"]:
                    if attendee.strip():
                        if "@" in attendee and "." in attendee.split("@")[1]:
                            update_data["attendees"].append({
                                "emailAddress": {
                                    "address": attendee.strip(),
                                    "name": attendee.strip()
                                },
                                "type": "required"
                            })
            
            result = self._make_request("PATCH", f"/me/events/{event_id}", update_data)
            
            if result:
                logger.info(f"✅ Событие {event_id} обновлено в Microsoft Graph")
                return True
            else:
                logger.error(f"❌ Не удалось обновить событие {event_id} в Microsoft Graph")
                return False
                
        except Exception as e:
            logger.error(f"❌ Ошибка обновления события в Microsoft Graph: {str(e)}")
            return False
    
    def delete_event_from_microsoft_graph(self, event_id: str) -> bool:
        """Удалить событие из Microsoft Graph"""
        try:
            logger.info(f"🗑️ Удаление события из Microsoft Graph: {event_id}")
            
            result = self._make_request("DELETE", f"/me/events/{event_id}")
            
            if result:
                logger.info(f"✅ Событие {event_id} удалено из Microsoft Graph")
                return True
            else:
                logger.error(f"❌ Не удалось удалить событие {event_id} из Microsoft Graph")
                return False
                
        except Exception as e:
            logger.error(f"❌ Ошибка удаления события из Microsoft Graph: {str(e)}")
            return False
    
    def get_calendars(self) -> List[Dict]:
        """Получить список календарей пользователя"""
        try:
            logger.info("📅 Получение списка календарей из Microsoft Graph...")
            
            # Для Application permissions получаем список пользователей сначала
            users_result = self._make_request("GET", "/users")
            
            if not users_result or "value" not in users_result:
                logger.warning("⚠️ Не удалось получить список пользователей")
                return []
            
            # Используем первого пользователя
            users = users_result["value"]
            if not users:
                logger.warning("⚠️ Пользователи не найдены")
                return []
            
            user_id = users[0]["id"]
            logger.info(f"👤 Используем пользователя: {user_id}")
            
            result = self._make_request("GET", f"/users/{user_id}/calendars")
            
            if result and "value" in result:
                calendars = result["value"]
                logger.info(f"📊 Получено {len(calendars)} календарей")
                
                processed_calendars = []
                for calendar in calendars:
                    processed_calendars.append({
                        "id": calendar.get("id"),
                        "name": calendar.get("name"),
                        "color": calendar.get("color"),
                        "is_default": calendar.get("isDefaultCalendar", False),
                        "can_edit": calendar.get("canEdit", False)
                    })
                
                return processed_calendars
            else:
                logger.warning("⚠️ Не удалось получить календари из Microsoft Graph")
                return []
                
        except Exception as e:
            logger.error(f"❌ Ошибка получения календарей из Microsoft Graph: {str(e)}")
            return []

# Создаем глобальный экземпляр
microsoft_graph_sync = MicrosoftGraphSync()

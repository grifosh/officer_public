# Microsoft Graph Integration

## Обзор

Microsoft Graph интеграция позволяет синхронизировать события календаря между локальным приложением и Microsoft Outlook/Teams календарями.

## Возможности

### 🔄 Двусторонняя синхронизация
- **Microsoft Graph → Локальная БД**: Импорт событий из Outlook/Teams
- **Локальная БД → Microsoft Graph**: Экспорт событий в Outlook/Teams

### 📅 CRUD операции
- **Создание**: Создание новых событий в Microsoft Graph
- **Чтение**: Получение событий из Microsoft Graph
- **Обновление**: Обновление существующих событий
- **Удаление**: Удаление событий из Microsoft Graph

### 🎯 Умная синхронизация
- Определение направления синхронизации на основе времени изменений
- Обработка конфликтов при одновременных изменениях
- Сохранение важных локальных данных (заметки, вопросы)

## Архитектура

### Компоненты

1. **`MS_graph_sync.py`** - Основной модуль синхронизации
2. **API Endpoints** - REST API для взаимодействия с Microsoft Graph
3. **Auto Sync Integration** - Автоматическая синхронизация каждые 5 минут
4. **Database Fields** - Поля для хранения Microsoft Graph данных

### Поля базы данных

```sql
-- Microsoft Graph поля в таблице events
microsoft_event_id        VARCHAR(255)    -- ID события в Microsoft Graph
microsoft_calendar_link   TEXT            -- Ссылка на событие в Microsoft Graph
last_microsoft_sync       TIMESTAMP       -- Время последней синхронизации
microsoft_updated_at      TIMESTAMP       -- Время последнего обновления в Microsoft Graph
```

## API Endpoints

### Статус интеграции
```http
GET /api/microsoft-graph/status
```

**Ответ:**
```json
{
  "available": true,
  "authenticated": false,
  "message": "Требуется аутентификация"
}
```

### Получение событий
```http
GET /api/microsoft-graph/events
```

**Ответ:**
```json
{
  "events": [
    {
      "title": "Meeting with Team",
      "start_time": "2025-10-13T10:00:00",
      "end_time": "2025-10-13T11:00:00",
      "location": "Conference Room A",
      "description": "Weekly team meeting",
      "attendees": ["user@company.com"],
      "microsoft_event_id": "event_id_123",
      "microsoft_calendar_link": "https://outlook.live.com/calendar/item/...",
      "created_at": "2025-10-13T09:00:00.000Z",
      "updated_at": "2025-10-13T09:30:00.000Z"
    }
  ],
  "count": 1
}
```

### Получение календарей
```http
GET /api/microsoft-graph/calendars
```

**Ответ:**
```json
{
  "calendars": [
    {
      "id": "calendar_id_123",
      "name": "Primary Calendar",
      "color": "auto",
      "is_default": true,
      "can_edit": true
    }
  ],
  "count": 1
}
```

### Создание события
```http
POST /api/microsoft-graph/create-event
Content-Type: application/json

{
  "title": "New Meeting",
  "start_time": "2025-10-13T14:00:00",
  "end_time": "2025-10-13T15:00:00",
  "location": "Office",
  "description": "Important meeting",
  "attendees": ["colleague@company.com"]
}
```

### Обновление события
```http
PUT /api/microsoft-graph/update-event/{event_id}
Content-Type: application/json

{
  "title": "Updated Meeting",
  "location": "New Location"
}
```

### Удаление события
```http
DELETE /api/microsoft-graph/delete-event/{event_id}
```

## Настройка

### 1. Azure App Registration

1. Перейдите на [Azure Portal](https://portal.azure.com)
2. **Azure Active Directory** > **App registrations**
3. **New registration**
4. Заполните форму:
   - **Name**: Officer Calendar App
   - **Supported account types**: Accounts in this organizational directory only
   - **Redirect URI**: `http://localhost:8080/auth/callback`

### 2. API Permissions

1. **API permissions** > **Add a permission**
2. **Microsoft Graph** > **Application permissions**
3. Добавьте: **Calendars.ReadWrite**
4. **Grant admin consent**

### 3. Client Secret

1. **Certificates & secrets** > **New client secret**
2. **Description**: Officer Calendar Secret
3. **Expires**: 24 months
4. Скопируйте **Value** (он больше не будет показан!)

### 4. Переменные окружения

Создайте файл `.env`:

```env
MICROSOFT_CLIENT_ID=your_client_id_from_azure
MICROSOFT_CLIENT_SECRET=your_client_secret_value
MICROSOFT_TENANT_ID=your_tenant_id_from_azure
```

## Использование

### Автоматическая синхронизация

Система автоматически синхронизирует события каждые 5 минут:

1. **Microsoft Graph → Локальная БД**: Импорт новых/обновленных событий
2. **Локальная БД → Microsoft Graph**: Экспорт локальных изменений

### Ручная синхронизация

```python
from src.integrations.MS_graph_sync import microsoft_graph_sync

# Аутентификация
if microsoft_graph_sync.authenticate():
    # Получение событий
    events = microsoft_graph_sync.get_today_events()
    
    # Создание события
    event_data = {
        'title': 'Test Meeting',
        'start_time': '2025-10-13T10:00:00',
        'end_time': '2025-10-13T11:00:00',
        'location': 'Office',
        'description': 'Test meeting description'
    }
    
    event_id = microsoft_graph_sync.create_event_in_microsoft_graph(event_data)
```

## Логика синхронизации

### Определение направления

Система использует временные метки для определения направления синхронизации:

```python
# Сравнение времени изменений
if microsoft_updated_at > last_local_update:
    direction = 'microsoft_to_local'
elif last_local_update > microsoft_updated_at:
    direction = 'local_to_microsoft'
else:
    direction = 'no_change'
```

### Обработка конфликтов

При одновременных изменениях (< 5 секунд):

1. **Приоритет локальным данным** если есть важная информация (заметки, вопросы)
2. **Приоритет Microsoft Graph** если локальные данные не важны
3. **Логирование конфликта** для ручного разрешения

## Тестирование

### Тест аутентификации
```bash
python3 scripts/MS_test_auth.py
```

### Тест интеграции
```bash
python3 scripts/MS_test_integration.py
```

### Тест API endpoints
```bash
# Статус
curl http://localhost:5001/api/microsoft-graph/status

# События (требует аутентификации)
curl http://localhost:5001/api/microsoft-graph/events

# Календари (требует аутентификации)
curl http://localhost:5001/api/microsoft-graph/calendars
```

## Мониторинг

### Логи

- **`logs/officer.log`** - Общие логи системы
- **`logs/auto_sync.log`** - Логи автоматической синхронизации
- **`logs/errors.log`** - Логи ошибок

### Статистика

```sql
-- Статистика синхронизации
SELECT 
    COUNT(*) as total_events,
    COUNT(microsoft_event_id) as microsoft_synced,
    COUNT(google_event_id) as google_synced
FROM events;

-- События, требующие синхронизации
SELECT subject, last_local_update, last_microsoft_sync
FROM events
WHERE last_local_update > last_microsoft_sync;
```

## Расширенные возможности

### Множественные календари
- Поддержка нескольких календарей пользователя
- Выбор календаря для создания событий
- Синхронизация с Teams календарями

### SharePoint интеграция
- Синхронизация с SharePoint календарями
- Поддержка групповых календарей
- Интеграция с Microsoft Teams

### Уведомления
- Уведомления о конфликтах синхронизации
- Алерты о проблемах аутентификации
- Статистика синхронизации

## Устранение неполадок

### Ошибки аутентификации
1. Проверьте переменные окружения
2. Убедитесь что Client Secret не истек
3. Проверьте API permissions

### Ошибки синхронизации
1. Проверьте логи в `logs/auto_sync.log`
2. Убедитесь что Microsoft Graph API доступен
3. Проверьте права доступа к календарю

### Проблемы с данными
1. Проверьте формат времени событий
2. Убедитесь что участники имеют email адреса
3. Проверьте ограничения Microsoft Graph API

## Безопасность

### Хранение credentials
- Client Secret хранится в переменных окружения
- Токены кэшируются локально
- Автоматическое обновление токенов

### Права доступа
- Минимальные необходимые права (Calendars.ReadWrite)
- Административное согласие для приложения
- Пользовательское согласие для персональных данных

### Аудит
- Логирование всех операций синхронизации
- Отслеживание изменений событий
- Мониторинг ошибок и конфликтов

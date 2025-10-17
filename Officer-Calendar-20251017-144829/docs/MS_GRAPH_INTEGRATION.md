# Microsoft Graph API Integration

## Обзор
Интеграция с Microsoft Graph API для синхронизации календарей Outlook/Teams.

## Установка зависимостей

```bash
pip install msal requests
```

## Настройка

### 1. Создание приложения в Azure Portal

1. Перейдите в [Azure Portal](https://portal.azure.com)
2. Создайте новое приложение в "App registrations"
3. Получите:
   - `Client ID`
   - `Client Secret` (если используете Confidential Client)
   - `Tenant ID`

### 2. Настройка разрешений

Добавьте следующие разрешения:
- `Calendars.ReadWrite` - чтение и запись календарей
- `User.Read` - чтение профиля пользователя

### 3. Конфигурация

Создайте файл `.env` на основе `microsoft_config.env.example`:

```env
MICROSOFT_CLIENT_ID=your_client_id_here
MICROSOFT_CLIENT_SECRET=your_client_secret_here
MICROSOFT_TENANT_ID=your_tenant_id_here
MICROSOFT_SYNC_ENABLED=true
MICROSOFT_SYNC_INTERVAL=300
```

## API Endpoints

### Статус Microsoft Graph
```
GET /api/microsoft-graph/status
```

### Получение событий
```
GET /api/microsoft-graph/events
```

### Получение календарей
```
GET /api/microsoft-graph/calendars
```

### Создание события
```
POST /api/microsoft-graph/create-event
Content-Type: application/json

{
  "title": "Название события",
  "start_time": "2025-10-13T10:00:00",
  "end_time": "2025-10-13T11:00:00",
  "description": "Описание события",
  "location": "Местоположение",
  "attendees": ["user@example.com"]
}
```

### Обновление события
```
PUT /api/microsoft-graph/update-event/{event_id}
Content-Type: application/json

{
  "title": "Обновленное название",
  "description": "Обновленное описание"
}
```

### Удаление события
```
DELETE /api/microsoft-graph/delete-event/{event_id}
```

## Аутентификация

### Device Code Flow (для настольных приложений)
1. При первом запуске система покажет код
2. Перейдите по ссылке и введите код
3. Войдите в свой Microsoft аккаунт
4. Токен сохранится в `microsoft_token.pickle`

### Client Credentials Flow (для серверных приложений)
1. Укажите `MICROSOFT_CLIENT_SECRET` в конфигурации
2. Система автоматически аутентифицируется

## Особенности

### Поддерживаемые поля событий:
- `title` - название события
- `start_time` - время начала (ISO 8601)
- `end_time` - время окончания (ISO 8601)
- `description` - описание события
- `location` - местоположение
- `attendees` - список участников (email адреса)

### Валидация участников:
- Только email адреса добавляются как участники
- Обычные имена игнорируются

### Обработка времени:
- Время конвертируется в UTC для Microsoft Graph
- Поддерживается автоматическое определение временной зоны

## Логирование

Все операции логируются в:
- `logs/officer.log` - основные операции
- `logs/microsoft_graph.log` - специфичные для Microsoft Graph операции

## Обработка ошибок

- Автоматические retry с экспоненциальной задержкой
- Валидация данных перед отправкой
- Детальное логирование ошибок
- Graceful fallback при недоступности API

## Безопасность

- Токены сохраняются в зашифрованном виде
- Автоматическое обновление токенов
- Валидация всех входящих данных
- Защита от SQL injection

## Тестирование

```bash
# Проверка статуса
curl http://localhost:5001/api/microsoft-graph/status

# Получение событий
curl http://localhost:5001/api/microsoft-graph/events

# Получение календарей
curl http://localhost:5001/api/microsoft-graph/calendars
```

## Устранение неполадок

### Ошибка аутентификации
1. Проверьте правильность Client ID и Tenant ID
2. Убедитесь, что разрешения настроены корректно
3. Удалите `microsoft_token.pickle` и повторите аутентификацию

### Ошибка создания события
1. Проверьте формат времени (должен быть ISO 8601)
2. Убедитесь, что участники - это email адреса
3. Проверьте логи для детальной информации

### Проблемы с синхронизацией
1. Проверьте интернет-соединение
2. Убедитесь, что Microsoft Graph API доступен
3. Проверьте статус сервисов Microsoft

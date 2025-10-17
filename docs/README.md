# Officer Calendar Application

Современное веб-приложение для управления календарем встреч с интеграцией Google Calendar и Microsoft Graph API.

## 🚀 Основные возможности

- **Управление событиями**: создание, редактирование, удаление встреч
- **Интеграция с Google Calendar**: автоматическая синхронизация
- **Интеграция с Microsoft Graph**: синхронизация с Outlook/Teams
- **Система уведомлений**: красивые всплывающие уведомления с ограничением до 5 штук
- **Умные подсказки**: автокомплит для участников, копирование ссылок и участников из прошлых встреч
- **Открытые вопросы**: управление вопросами и заметками
- **Потоки (Streams)**: категоризация событий
- **Автоматическая синхронизация**: каждые 5 минут
- **Детальное логирование**: полное восстановление данных
- **Система резервного копирования**: автоматические бэкапы всех операций

## 📁 Структура проекта

```
Officer/
├── server.py                # FastAPI сервер
├── index.html               # Главная страница
├── script.js                # Frontend логика
├── style.css                # Стили
├── requirements.txt         # Python зависимости
├── MS_requirements.txt # Microsoft Graph зависимости
├── auto_sync.py             # Автосинхронизация
├── google_calendar_sync.py  # Google Calendar API
├── MS_graph_sync.py  # Microsoft Graph API
├── calendar_importer.py     # Импорт календарей
├── logging_config.py        # Конфигурация логирования
├── sync_direction.py        # Логика синхронизации
├── credentials.json.example # Пример Google Calendar конфигурации
├── MS_config.env.example # Пример Microsoft Graph конфигурации
├── test_notifications.html  # Тест системы уведомлений
├── NOTIFICATION_SYSTEM.md   # Документация уведомлений
├── MS_GRAPH_INTEGRATION.md # Документация Microsoft Graph
├── SMART_SYNC_SYSTEM.md     # Документация синхронизации
├── RESTORE_SYSTEM.md        # Документация восстановления
├── logs/                    # Логи приложения
├── deploy-package/          # Пакет для развертывания
├── tests/                   # Тесты
├── venv/                    # Виртуальное окружение
└── README.md               # Этот файл
```

## 🛠️ Быстрый старт

### ⚡ Автоматическая установка

#### Linux/macOS:
```bash
git clone <repository-url> officer-calendar
cd officer-calendar
chmod +x setup.sh
./setup.sh
```

#### Windows:
```cmd
git clone <repository-url> officer-calendar
cd officer-calendar
setup.bat
```

### 🐳 Docker развертывание

```bash
git clone <repository-url> officer-calendar
cd officer-calendar
docker-compose up -d
```

### 🔧 Ручная установка

1. **Системные требования:**
   - Python 3.8+
   - PostgreSQL 12+
   - Git

2. **Установка зависимостей:**
   ```bash
   # Ubuntu/Debian
   sudo apt install python3 python3-pip python3-venv postgresql postgresql-contrib
   
   # macOS
   brew install python3 postgresql
   ```

3. **Настройка базы данных:**
   ```bash
   sudo -u postgres psql
   CREATE DATABASE officer;
   CREATE USER officer WITH PASSWORD 'officer_pwd';
   GRANT ALL PRIVILEGES ON DATABASE officer TO officer;
   \q
   ```

4. **Установка проекта:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   cp env.example.txt .env
   python src/api/main.py
   ```

5. **Откройте браузер:**
   ```
   http://localhost:5001
   ```

### 📚 Документация по развертыванию

- **Быстрый старт**: `QUICK_START.md`
- **Полное руководство**: `DEPLOYMENT_GUIDE.md`
- **Docker**: `docker-compose.yml`, `Dockerfile`

## 🔧 Настройка Google Calendar

1. Создайте проект в Google Cloud Console
2. Включите Google Calendar API
3. Создайте OAuth 2.0 credentials
4. Скопируйте `credentials.json` в корень проекта
5. При первом запуске пройдите авторизацию

## 📊 Мониторинг

- **Логи**: `logs/`
- **Статус сервера**: `http://localhost:5001/api/status`
- **Статус синхронизации**: `http://localhost:5001/api/auto-sync/status`

## 🧪 Тестирование

```bash
cd tests
npm install
npm test
```

## 📝 API Endpoints

- `GET /api/events` - получить все события
- `POST /api/events` - создать событие
- `PUT /api/events/{id}` - обновить событие
- `DELETE /api/events/{id}` - удалить событие
- `GET /api/attendees` - получить участников
- `GET /api/streams` - получить потоки

## 🔄 Версионирование

Проект использует плоскую структуру - все файлы находятся в корне для удобства разработки.

## 📞 Поддержка

При возникновении проблем проверьте логи в папке `logs/` или создайте issue в репозитории.
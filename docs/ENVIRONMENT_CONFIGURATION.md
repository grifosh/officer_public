# Конфигурация переменных окружения для Officer Calendar

## 📋 Обзор

Проект Officer Calendar теперь поддерживает конфигурацию через переменные окружения для удобного развертывания в различных средах (разработка, тестирование, продакшен).

## 🔧 Основные файлы конфигурации

### 1. `env.example` - Шаблон конфигурации
Содержит все доступные переменные окружения с примерами значений.

### 2. `.env` - Локальная конфигурация (НЕ коммитится в git)
Создайте этот файл на основе `env.example` для локальной разработки.

### 3. `MS_config.env` - Конфигурация Microsoft Graph
Настройки для интеграции с Microsoft Graph API.

## 🌍 Переменные окружения

### База данных
```env
DB_NAME=officer              # Имя базы данных
DB_USER=grifosh              # Пользователь БД
DB_PASSWORD=                  # Пароль БД
DB_HOST=localhost            # Хост БД
DB_PORT=5432                # Порт БД
```

### Сервер
```env
SERVER_HOST=0.0.0.0         # Хост сервера (0.0.0.0 для всех интерфейсов)
SERVER_PORT=5001            # Порт сервера
SERVER_URL=http://localhost:5001  # Базовый URL сервера
```

### Окружение
```env
ENVIRONMENT=development     # development, staging, production
DEBUG=true                  # Включить/выключить debug режим
```

### CORS
```env
CORS_ORIGINS=http://localhost:5001,http://127.0.0.1:5001  # Разрешенные домены
```

### Логирование
```env
LOG_LEVEL=INFO              # Уровень логирования
LOG_FILE=logs/officer.log   # Файл логов
```

## 🚀 Быстрый старт

### Для разработки:
1. Скопируйте `env.example` в `.env`:
   ```bash
   cp env.example .env
   ```

2. Отредактируйте `.env` под ваши нужды

3. Запустите сервер:
   ```bash
   python src/api/server.py
   ```

### Для продакшена:
1. Установите переменные окружения в системе
2. Или создайте `.env` файл на сервере
3. Установите `ENVIRONMENT=production` и `DEBUG=false`

## 🔒 Безопасность

- **НИКОГДА** не коммитьте файл `.env` в git
- Используйте сильные пароли в продакшене
- Ограничьте `CORS_ORIGINS` только необходимыми доменами
- Установите `DEBUG=false` в продакшене

## 📝 Примеры конфигураций

### Разработка
```env
ENVIRONMENT=development
DEBUG=true
SERVER_HOST=0.0.0.0
SERVER_PORT=5001
CORS_ORIGINS=http://localhost:5001,http://127.0.0.1:5001
```

### Продакшен
```env
ENVIRONMENT=production
DEBUG=false
SERVER_HOST=0.0.0.0
SERVER_PORT=80
SERVER_URL=https://yourdomain.com
CORS_ORIGINS=https://yourdomain.com
DB_HOST=your-db-server.com
DB_PASSWORD=strong_password_here
```

## 🔄 Миграция с жестко заданных значений

Все жестко заданные значения в коде заменены на переменные окружения:
- ✅ База данных: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- ✅ Сервер: `SERVER_HOST`, `SERVER_PORT`, `SERVER_URL`
- ✅ CORS: `CORS_ORIGINS`
- ✅ Окружение: `ENVIRONMENT`, `DEBUG`

## 🆘 Поддержка

При возникновении проблем проверьте:
1. Правильность значений в `.env`
2. Доступность базы данных
3. Отсутствие конфликтов портов
4. Права доступа к файлам логов

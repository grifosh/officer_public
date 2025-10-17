# 🚀 Officer Calendar - Инструкция по развертыванию

## Быстрое развертывание

### Для macOS (рекомендуется):

```bash
# Клонирование репозитория
git clone https://github.com/grifosh/officer_public.git
cd officer_public

# Быстрое развертывание одной командой
./deploy.sh
```

### Альтернативные способы:

#### 1. Полная установка через install-macos.sh:
```bash
./install-macos.sh
```

#### 2. Ручная установка:
```bash
# Установка зависимостей
brew install python3 postgresql@15

# Запуск PostgreSQL
brew services start postgresql@15

# Создание БД
createdb officer

# Настройка проекта
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Копирование конфигурации
cp env.example.txt .env

# Запуск приложения
./start.sh
```

## Управление приложением

```bash
# Запуск
./start.sh

# Остановка
./stop.sh

# Удаление
./uninstall.sh
```

## Доступ к приложению

После установки приложение будет доступно по адресу:
- **Веб-интерфейс**: http://localhost:5001
- **API**: http://localhost:5001/api/

## Что исправлено в deploy.sh

- ✅ Удалена зависимость от архива
- ✅ Добавлена проверка структуры проекта
- ✅ Скрипт работает напрямую с файлами репозитория
- ✅ Совместим с новой структурой проекта

## Требования

- macOS (тестировано на macOS 15.7.1)
- Homebrew
- Python 3.13+
- PostgreSQL 14+

## Поддержка

При возникновении проблем проверьте:
1. Запущен ли PostgreSQL: `brew services list | grep postgresql`
2. Свободен ли порт 5001: `lsof -i :5001`
3. Корректность файла .env
4. Логи в директории `logs/`

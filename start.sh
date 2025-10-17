#!/bin/bash

# 🚀 Officer Calendar - Скрипт запуска
# Правильный запуск через uvicorn с reload режимом

set -e

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Проверка, что скрипт запущен из корня проекта
if [ ! -f "requirements.txt" ] || [ ! -f "src/api/main.py" ]; then
    print_error "Запустите скрипт из корня проекта Officer Calendar"
    exit 1
fi

# Проверка виртуального окружения
if [ ! -d "venv" ]; then
    print_error "Виртуальное окружение не найдено. Запустите install-macos.sh"
    exit 1
fi

# Проверка .env файла
if [ ! -f ".env" ]; then
    print_warning "Файл .env не найден. Создаю из шаблона..."
    if [ -f "env.example.txt" ]; then
        cp env.example.txt .env
        print_success "Файл .env создан из шаблона"
    else
        print_error "Шаблон env.example.txt не найден"
        exit 1
    fi
fi

# Активация виртуального окружения
print_info "Активация виртуального окружения..."
source venv/bin/activate

# Установка PYTHONPATH
export PYTHONPATH=$(pwd):${PYTHONPATH:-}

# Загрузка переменных окружения
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Проверка порта
SERVER_PORT=${SERVER_PORT:-5001}
if lsof -i :$SERVER_PORT > /dev/null 2>&1; then
    print_warning "Порт $SERVER_PORT занят"
    PID=$(lsof -ti :$SERVER_PORT)
    print_info "Процесс, использующий порт: PID $PID"
    
    read -p "Остановить процесс и продолжить? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill -9 $PID 2>/dev/null || true
        sleep 2
        print_success "Процесс остановлен"
    else
        print_error "Запуск прерван"
        exit 1
    fi
fi

# Создание директории логов
mkdir -p logs

print_info "Запуск Officer Calendar..."
print_info "Режим: ${ENVIRONMENT:-development}"
print_info "Debug: ${DEBUG:-true}"
print_info "Порт: $SERVER_PORT"

# Правильный запуск через uvicorn
print_success "🚀 Запуск через uvicorn с reload режимом..."

uvicorn src.api.main:app \
    --host 0.0.0.0 \
    --port $SERVER_PORT \
    --reload \
    --log-level info
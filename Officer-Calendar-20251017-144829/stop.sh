#!/bin/bash

# 🛑 Officer Calendar - Скрипт остановки

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

print_info "Остановка Officer Calendar..."

# Остановка через launchd
if launchctl list | grep -q "com.officer.calendar"; then
    print_info "Остановка launchd сервиса..."
    launchctl stop com.officer.calendar
    print_success "Launchd сервис остановлен"
fi

# Остановка процессов uvicorn
print_info "Поиск процессов uvicorn..."
UVICORN_PIDS=$(pgrep -f "uvicorn.*src.api.main:app" || true)

if [ -n "$UVICORN_PIDS" ]; then
    print_info "Найдены процессы uvicorn: $UVICORN_PIDS"
    echo "$UVICORN_PIDS" | xargs kill -TERM
    sleep 2
    
    # Проверка, что процессы остановлены
    REMAINING_PIDS=$(pgrep -f "uvicorn.*src.api.main:app" || true)
    if [ -n "$REMAINING_PIDS" ]; then
        print_warning "Принудительная остановка процессов..."
        echo "$REMAINING_PIDS" | xargs kill -KILL
    fi
    
    print_success "Процессы uvicorn остановлены"
else
    print_info "Процессы uvicorn не найдены"
fi

# Остановка процессов python с main.py
print_info "Поиск процессов python..."
PYTHON_PIDS=$(pgrep -f "python.*src/api/main.py" || true)

if [ -n "$PYTHON_PIDS" ]; then
    print_info "Найдены процессы python: $PYTHON_PIDS"
    echo "$PYTHON_PIDS" | xargs kill -TERM
    sleep 2
    
    # Проверка, что процессы остановлены
    REMAINING_PIDS=$(pgrep -f "python.*src/api/main.py" || true)
    if [ -n "$REMAINING_PIDS" ]; then
        print_warning "Принудительная остановка процессов..."
        echo "$REMAINING_PIDS" | xargs kill -KILL
    fi
    
    print_success "Процессы python остановлены"
else
    print_info "Процессы python не найдены"
fi

# Проверка портов
SERVER_PORT=${SERVER_PORT:-5001}
if lsof -i :$SERVER_PORT > /dev/null 2>&1; then
    print_warning "Порт $SERVER_PORT все еще занят"
    PID=$(lsof -ti :$SERVER_PORT)
    print_info "Процесс на порту: PID $PID"
    
    read -p "Остановить процесс на порту? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill -9 $PID 2>/dev/null || true
        print_success "Процесс остановлен"
    fi
else
    print_success "Порт $SERVER_PORT свободен"
fi

print_success "🎉 Officer Calendar остановлен!"
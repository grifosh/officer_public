#!/bin/bash

# 🗑️ Officer Calendar - Скрипт удаления

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

print_warning "⚠️  ВНИМАНИЕ: Это действие удалит Officer Calendar и все данные!"
echo
read -p "Вы уверены, что хотите удалить приложение? (yes/NO): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    print_info "Удаление отменено"
    exit 0
fi

print_info "Начинаю удаление Officer Calendar..."

# Остановка приложения
print_info "Остановка приложения..."
if [ -f "stop.sh" ]; then
    ./stop.sh
else
    # Остановка процессов
    pkill -f "uvicorn.*src.api.main:app" 2>/dev/null || true
    pkill -f "python.*src/api/main.py" 2>/dev/null || true
fi

# Удаление launchd сервиса
if launchctl list | grep -q "com.officer.calendar"; then
    print_info "Удаление launchd сервиса..."
    launchctl unload ~/Library/LaunchAgents/com.officer.calendar.plist 2>/dev/null || true
    rm -f ~/Library/LaunchAgents/com.officer.calendar.plist
    print_success "Launchd сервис удален"
fi

# Удаление виртуального окружения
if [ -d "venv" ]; then
    print_info "Удаление виртуального окружения..."
    rm -rf venv
    print_success "Виртуальное окружение удалено"
fi

# Удаление логов
if [ -d "logs" ]; then
    print_info "Удаление логов..."
    rm -rf logs
    print_success "Логи удалены"
fi

# Удаление конфигурации
if [ -f ".env" ]; then
    print_info "Удаление конфигурации..."
    rm -f .env
    print_success "Конфигурация удалена"
fi

# Удаление базы данных (опционально)
print_warning "Удаление базы данных PostgreSQL..."
read -p "Удалить базу данных 'officer'? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v psql &> /dev/null; then
        dropdb officer 2>/dev/null || true
        print_success "База данных удалена"
    else
        print_warning "PostgreSQL не найден, база данных не удалена"
    fi
fi

# Удаление пользователя PostgreSQL (опционально)
print_warning "Удаление пользователя PostgreSQL..."
read -p "Удалить пользователя 'officer'? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v psql &> /dev/null; then
        psql -d postgres -c "DROP USER IF EXISTS officer;" 2>/dev/null || true
        print_success "Пользователь удален"
    else
        print_warning "PostgreSQL не найден, пользователь не удален"
    fi
fi

# Удаление скриптов управления
print_info "Удаление скриптов управления..."
rm -f start.sh stop.sh uninstall.sh
print_success "Скрипты управления удалены"

# Удаление архива (если есть)
if [ -f "Officer-Calendar-*.tar.gz" ]; then
    print_info "Удаление архива..."
    rm -f Officer-Calendar-*.tar.gz Officer-Calendar-*.tar.gz.sha256
    print_success "Архив удален"
fi

print_success "🎉 Officer Calendar полностью удален!"
print_info "Исходный код остался в текущей директории"
print_info "Для полного удаления удалите директорию проекта вручную"
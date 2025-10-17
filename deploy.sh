#!/bin/bash

# 🚀 Officer Calendar - Быстрое развертывание
# Простая команда для установки приложения

set -e

# Цвета
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🍎 Officer Calendar - Быстрое развертывание${NC}"
echo

# Проверка macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${YELLOW}⚠️  Этот скрипт предназначен только для macOS${NC}"
    exit 1
fi

# Проверка структуры проекта
if [ ! -f "requirements.txt" ] || [ ! -f "src/api/main.py" ]; then
    echo -e "${YELLOW}❌ Файлы проекта не найдены. Убедитесь, что вы находитесь в корне проекта Officer Calendar.${NC}"
    echo -e "${BLUE}💡 Ожидаемые файлы: requirements.txt, src/api/main.py${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Структура проекта найдена${NC}"

# Запуск установки
echo -e "${BLUE}🔧 Запуск автоматической установки...${NC}"
chmod +x install-macos.sh
./install-macos.sh

echo
echo -e "${GREEN}🎉 Установка завершена!${NC}"
echo -e "${BLUE}🌐 Приложение доступно по адресу: http://localhost:5001${NC}"
echo
echo -e "${YELLOW}💡 Для управления приложением:${NC}"
echo -e "   Запуск: ./start.sh"
echo -e "   Остановка: ./stop.sh"
echo -e "   Удаление: ./uninstall.sh"

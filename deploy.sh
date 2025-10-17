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

# Проверка наличия архива
if [ ! -f "Officer-Calendar-20251017-140345.tar.gz" ]; then
    echo -e "${YELLOW}❌ Архив не найден. Убедитесь, что вы в правильной директории.${NC}"
    exit 1
fi

# Проверка checksum
echo -e "${BLUE}🔍 Проверка целостности архива...${NC}"
if shasum -a 256 -c Officer-Calendar-20251017-140345.tar.gz.sha256 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Архив проверен${NC}"
else
    echo -e "${YELLOW}⚠️  Ошибка проверки checksum${NC}"
    read -p "Продолжить? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Распаковка архива
echo -e "${BLUE}📦 Распаковка архива...${NC}"
tar -xzf Officer-Calendar-20251017-140345.tar.gz
cd Officer-Calendar-20251017-140345

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

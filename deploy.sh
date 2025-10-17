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

# Проверка наличия архива или структуры проекта
ARCHIVE_NAME=$(ls Officer-Calendar-*.tar.gz 2>/dev/null | head -n 1)

if [ -n "$ARCHIVE_NAME" ]; then
    echo -e "${BLUE}📦 Найден архив: $ARCHIVE_NAME${NC}"
    
    # Проверка checksum файла
    CHECKSUM_FILE="$ARCHIVE_NAME.sha256"
    if [ ! -f "$CHECKSUM_FILE" ]; then
        echo -e "${YELLOW}⚠️  Checksum файл ($CHECKSUM_FILE) не найден. Проверка целостности архива будет пропущена.${NC}"
    else
        echo -e "${BLUE}🔍 Проверка целостности архива...${NC}"
        if shasum -a 256 -c "$CHECKSUM_FILE" --status; then
            echo -e "${GREEN}✅ Целостность архива подтверждена.${NC}"
        else
            echo -e "${YELLOW}⚠️  Ошибка проверки целостности архива! Возможно, файл поврежден или изменен.${NC}"
            read -p "Продолжить? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    fi
    
    # Распаковка архива
    echo -e "${BLUE}📦 Распаковка архива: $ARCHIVE_NAME...${NC}"
    
    # Определение имени директории для распаковки
    EXTRACTED_DIR=$(basename "$ARCHIVE_NAME" .tar.gz)
    
    # Создаем директорию и распаковываем туда файлы
    mkdir -p "$EXTRACTED_DIR"
    tar -xzf "$ARCHIVE_NAME" -C "$EXTRACTED_DIR"
    
    if [ ! -d "$EXTRACTED_DIR" ]; then
        echo -e "${YELLOW}❌ Не удалось создать распакованную директорию: $EXTRACTED_DIR${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Архив успешно распакован в $EXTRACTED_DIR${NC}"
    cd "$EXTRACTED_DIR"
    
    # Проверяем структуру распакованной директории
    if [ -d "officer_deployment" ]; then
        echo -e "${BLUE}📁 Переход в директорию проекта: officer_deployment${NC}"
        cd officer_deployment
    elif [ -d "$EXTRACTED_DIR" ]; then
        echo -e "${BLUE}📁 Переход во вложенную папку: $EXTRACTED_DIR${NC}"
        cd "$EXTRACTED_DIR"
    fi
    
elif [ -f "requirements.txt" ] && [ -f "src/api/main.py" ]; then
    echo -e "${GREEN}✅ Структура проекта найдена${NC}"
else
    echo -e "${YELLOW}❌ Не найден архив Officer-Calendar-*.tar.gz и файлы проекта не найдены.${NC}"
    echo -e "${BLUE}💡 Ожидаемые файлы: requirements.txt, src/api/main.py${NC}"
    echo -e "${BLUE}💡 Или архив: Officer-Calendar-*.tar.gz${NC}"
    exit 1
fi

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

#!/bin/bash

# 📦 Officer Calendar - Создание архива для развертывания
# Создает tar.gz архив с приложением для распространения

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

# Генерация имени архива с временной меткой
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
ARCHIVE_NAME="Officer-Calendar-$TIMESTAMP"
TEMP_DIR="/tmp/officer_archive_$$"
ORIGINAL_DIR=$(pwd)

print_info "Создание архива: $ARCHIVE_NAME"

# Создание временной директории
mkdir -p "$TEMP_DIR/$ARCHIVE_NAME"

# Копирование файлов проекта
print_info "Копирование файлов проекта..."

# Основные файлы и директории
cp -r src "$TEMP_DIR/$ARCHIVE_NAME/"
cp -r docs "$TEMP_DIR/$ARCHIVE_NAME/"
cp -r scripts "$TEMP_DIR/$ARCHIVE_NAME/"
cp -r logos_pics "$TEMP_DIR/$ARCHIVE_NAME/"
cp -r logs "$TEMP_DIR/$ARCHIVE_NAME/" 2>/dev/null || mkdir -p "$TEMP_DIR/$ARCHIVE_NAME/logs"

# Конфигурационные файлы
cp requirements.txt "$TEMP_DIR/$ARCHIVE_NAME/"
cp env.example.txt "$TEMP_DIR/$ARCHIVE_NAME/"
cp index.html "$TEMP_DIR/$ARCHIVE_NAME/"
cp script.js "$TEMP_DIR/$ARCHIVE_NAME/"
cp style.css "$TEMP_DIR/$ARCHIVE_NAME/"

# Docker файлы
cp Dockerfile "$TEMP_DIR/$ARCHIVE_NAME/" 2>/dev/null || true
cp docker-compose.yml "$TEMP_DIR/$ARCHIVE_NAME/" 2>/dev/null || true
cp nginx.conf "$TEMP_DIR/$ARCHIVE_NAME/" 2>/dev/null || true
cp .dockerignore "$TEMP_DIR/$ARCHIVE_NAME/" 2>/dev/null || true

# Скрипты установки и управления
cp install-macos.sh "$TEMP_DIR/$ARCHIVE_NAME/"
cp start.sh "$TEMP_DIR/$ARCHIVE_NAME/"
cp stop.sh "$TEMP_DIR/$ARCHIVE_NAME/"
cp uninstall.sh "$TEMP_DIR/$ARCHIVE_NAME/"

# Документация
cp docs/README.md "$TEMP_DIR/$ARCHIVE_NAME/" 2>/dev/null || true

# Создание архива
print_info "Создание tar.gz архива..."
cd "$TEMP_DIR"
tar -czf "$ARCHIVE_NAME.tar.gz" "$ARCHIVE_NAME"

# Перемещение архива в оригинальную директорию
mv "$ARCHIVE_NAME.tar.gz" "$ORIGINAL_DIR/"

# Очистка временной директории
rm -rf "$TEMP_DIR"

# Получение размера архива
ARCHIVE_SIZE=$(du -h "$ORIGINAL_DIR/$ARCHIVE_NAME.tar.gz" | cut -f1)

print_success "Архив создан: $ARCHIVE_NAME.tar.gz"
print_success "Размер архива: $ARCHIVE_SIZE"
print_info "Архив готов для распространения!"

# Создание checksum файла
print_info "Создание checksum файла..."
shasum -a 256 "$ORIGINAL_DIR/$ARCHIVE_NAME.tar.gz" > "$ORIGINAL_DIR/$ARCHIVE_NAME.tar.gz.sha256"

print_success "Checksum создан: $ARCHIVE_NAME.tar.gz.sha256"

echo
print_info "📦 Архив содержит:"
echo "  • Полный исходный код приложения"
echo "  • Автоматический установщик для macOS"
echo "  • Документацию и руководства"
echo "  • Скрипты управления (start.sh, stop.sh, uninstall.sh)"

echo
print_info "🚀 Для установки на другом Mac:"
echo "  1. Распакуйте архив: tar -xzf $ARCHIVE_NAME.tar.gz"
echo "  2. Перейдите в папку: cd $ARCHIVE_NAME"
echo "  3. Запустите установку: ./install-macos.sh"

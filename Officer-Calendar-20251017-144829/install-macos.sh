#!/bin/bash

# 🍎 Officer Calendar - Улучшенный установщик для macOS
# Полная установка приложения с нуля на macOS

set -euo pipefail  # Строгий режим с обработкой ошибок

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Глобальные переменные
CURRENT_USER=$(whoami)
CURRENT_DIR=$(pwd)
DB_USER="${DB_USER:-$CURRENT_USER}"
DB_NAME="${DB_NAME:-officer}"
DB_PASSWORD="${DB_PASSWORD:-officer_pwd}"
SERVER_PORT="${SERVER_PORT:-5001}"
BACKUP_DIR="/tmp/officer_backup_$(date +%Y%m%d_%H%M%S)"

# Функции для вывода
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo -e "${PURPLE}"
    echo "=========================================="
    echo "🍎 Officer Calendar - Улучшенная установка"
    echo "=========================================="
    echo -e "${NC}"
}

# Обработка ошибок и откат
cleanup() {
    print_warning "Выполняется откат изменений..."
    
    # Остановка процессов
    pkill -f "python src/api/main.py" 2>/dev/null || true
    
    # Удаление временных файлов
    rm -rf "$BACKUP_DIR" 2>/dev/null || true
    
    # Откат изменений в .env если есть бэкап
    if [ -f "${BACKUP_DIR}/.env" ]; then
        cp "${BACKUP_DIR}/.env" .env
        print_info "Восстановлен файл .env"
    fi
    
    print_error "Установка прервана. Выполнен откат изменений."
    exit 1
}

# Установка обработчика ошибок
trap cleanup ERR INT TERM

# Проверка macOS
check_macos() {
    if [[ "$OSTYPE" != "darwin"* ]]; then
        print_error "Этот скрипт предназначен только для macOS"
        exit 1
    fi
    
    MACOS_VERSION=$(sw_vers -productVersion)
    print_info "macOS версия: $MACOS_VERSION"
}

# Проверка Homebrew
check_homebrew() {
    print_info "Проверка Homebrew..."
    
    if command -v brew &> /dev/null; then
        BREW_VERSION=$(brew --version | head -n1)
        print_success "Homebrew найден: $BREW_VERSION"
        return 0
    else
        print_warning "Homebrew не найден"
        return 1
    fi
}

# Установка Homebrew
install_homebrew() {
    print_info "Установка Homebrew..."
    
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Добавление Homebrew в PATH для Apple Silicon Mac
    if [[ $(uname -m) == "arm64" ]]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zshrc
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
    
    print_success "Homebrew установлен"
}

# Установка Python
install_python() {
    print_info "Проверка Python..."
    
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version 2>&1 | cut -d' ' -f2)
        print_success "Python $PYTHON_VERSION уже установлен"
    else
        print_info "Установка Python через Homebrew..."
        brew install python3
        print_success "Python установлен"
    fi
}

# Установка PostgreSQL
install_postgresql() {
    print_info "Проверка PostgreSQL..."
    
    if command -v psql &> /dev/null; then
        PSQL_VERSION=$(psql --version | cut -d' ' -f3)
        print_success "PostgreSQL $PSQL_VERSION уже установлен"
    else
        print_info "Установка PostgreSQL через Homebrew..."
        brew install postgresql@15
        brew services start postgresql@15
        
        # Добавление PostgreSQL в PATH
        echo 'export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"' >> ~/.zshrc
        export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
        
        print_success "PostgreSQL установлен и запущен"
    fi
}

# Проверка статуса PostgreSQL
check_postgresql_status() {
    print_info "Проверка статуса PostgreSQL..."
    
    if brew services list | grep postgresql | grep started > /dev/null; then
        print_success "PostgreSQL запущен"
        return 0
    else
        print_warning "PostgreSQL не запущен, пытаемся запустить..."
        brew services start postgresql@15
        sleep 3
        
        if brew services list | grep postgresql | grep started > /dev/null; then
            print_success "PostgreSQL запущен"
            return 0
        else
            print_error "Не удалось запустить PostgreSQL"
            return 1
        fi
    fi
}

# Проверка доступности порта
check_port_availability() {
    local port=$1
    print_info "Проверка доступности порта $port..."
    
    if lsof -i :$port > /dev/null 2>&1; then
        print_warning "Порт $port занят"
        local pid=$(lsof -ti :$port)
        print_info "Процесс, использующий порт: PID $pid"
        
        read -p "Остановить процесс и продолжить? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            kill -9 $pid 2>/dev/null || true
            sleep 2
            print_success "Процесс остановлен"
        else
            print_error "Установка прервана"
            exit 1
        fi
    else
        print_success "Порт $port свободен"
    fi
}

# Создание базы данных
create_database() {
    print_info "Создание базы данных..."
    
    # Проверка, существует ли уже база данных
    if psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        print_success "База данных '$DB_NAME' уже существует"
    else
        print_info "Создание базы данных '$DB_NAME'..."
        createdb "$DB_NAME"
        print_success "База данных создана"
    fi
    
    # Создание пользователя (используем текущего пользователя)
    print_info "Настройка пользователя базы данных '$DB_USER'..."
    
    # Проверяем, существует ли пользователь
    if psql -d "$DB_NAME" -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER';" | grep -q 1; then
        print_success "Пользователь '$DB_USER' уже существует"
    else
        psql -d "$DB_NAME" -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
        print_success "Пользователь создан"
    fi
    
    # Предоставление прав
    psql -d "$DB_NAME" -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
    psql -d "$DB_NAME" -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;"
    psql -d "$DB_NAME" -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;"
    psql -d "$DB_NAME" -c "GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO $DB_USER;"
    
    print_success "Права предоставлены"
}

# Проверка подключения к БД
test_database_connection() {
    print_info "Тестирование подключения к базе данных..."
    
    local test_config="dbname=$DB_NAME user=$DB_USER password=$DB_PASSWORD host=localhost port=5432"
    
    if psql "$test_config" -c "SELECT 1;" > /dev/null 2>&1; then
        print_success "Подключение к базе данных успешно"
        return 0
    else
        print_error "Не удалось подключиться к базе данных"
        return 1
    fi
}

# Проверка существующих таблиц
check_existing_tables() {
    print_info "Проверка существующих таблиц..."
    
    local table_count=$(psql -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")
    
    if [ "$table_count" -gt 0 ]; then
        print_warning "Найдено $table_count существующих таблиц"
        psql -d "$DB_NAME" -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;"
        
        read -p "Продолжить с существующими таблицами? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_error "Установка прервана"
            exit 1
        fi
    else
        print_info "Таблицы не найдены, будет создана новая схема"
    fi
}

# Создание таблиц базы данных
init_database_tables() {
    print_info "Инициализация таблиц базы данных..."
    
    # SQL для создания основных таблиц
    local sql_script="
-- Создание основных таблиц
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    subject VARCHAR(500) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    attendees JSONB DEFAULT '[]'::jsonb,
    stream VARCHAR(100),
    notes TEXT,
    description TEXT,
    location VARCHAR(500),
    google_event_id VARCHAR(255),
    google_calendar_link TEXT,
    last_google_sync TIMESTAMP WITH TIME ZONE,
    last_local_update TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sync_source VARCHAR(50) DEFAULT 'local' CHECK (sync_source IN ('local', 'google', 'microsoft')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255),
    use_count INTEGER DEFAULT 1,
    last_used TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS streams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7) DEFAULT '#007bff',
    use_count INTEGER DEFAULT 1,
    last_used TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS open_questions (
    id SERIAL PRIMARY KEY,
    question_text TEXT NOT NULL,
    event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS question_comments (
    id SERIAL PRIMARY KEY,
    question_id INTEGER REFERENCES open_questions(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS meeting_notes (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    note_text TEXT NOT NULL,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_end_time ON events(end_time);
CREATE INDEX IF NOT EXISTS idx_events_google_event_id ON events(google_event_id);
CREATE INDEX IF NOT EXISTS idx_events_sync_source ON events(sync_source);
CREATE INDEX IF NOT EXISTS idx_events_stream ON events(stream);

CREATE INDEX IF NOT EXISTS idx_attendees_name ON attendees(name);
CREATE INDEX IF NOT EXISTS idx_attendees_email ON attendees(email);
CREATE INDEX IF NOT EXISTS idx_attendees_use_count ON attendees(use_count DESC);
CREATE INDEX IF NOT EXISTS idx_attendees_last_used ON attendees(last_used DESC);

CREATE INDEX IF NOT EXISTS idx_streams_name ON streams(name);
CREATE INDEX IF NOT EXISTS idx_streams_use_count ON streams(use_count DESC);
CREATE INDEX IF NOT EXISTS idx_streams_last_used ON streams(last_used DESC);

CREATE INDEX IF NOT EXISTS idx_open_questions_event_id ON open_questions(event_id);
CREATE INDEX IF NOT EXISTS idx_open_questions_resolved ON open_questions(is_resolved);
CREATE INDEX IF NOT EXISTS idx_open_questions_created ON open_questions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_question_comments_question_id ON question_comments(question_id);
CREATE INDEX IF NOT EXISTS idx_question_comments_created ON question_comments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_meeting_notes_event_id ON meeting_notes(event_id);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_resolved ON meeting_notes(resolved);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_created ON meeting_notes(created_at DESC);

-- Вставка начальных данных
INSERT INTO streams (name, color) VALUES 
    ('Работа', '#007bff'),
    ('Личное', '#28a745'),
    ('Встречи', '#ffc107'),
    ('Проекты', '#dc3545'),
    ('Обучение', '#6f42c1')
ON CONFLICT (name) DO NOTHING;

INSERT INTO attendees (name, email) VALUES 
    ('Я', 'me@example.com'),
    ('Команда', 'team@example.com'),
    ('Клиент', 'client@example.com')
ON CONFLICT (name) DO NOTHING;

-- Создание функции для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS \$\$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
\$\$ language 'plpgsql';

-- Создание триггеров
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attendees_updated_at BEFORE UPDATE ON attendees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_streams_updated_at BEFORE UPDATE ON streams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_open_questions_updated_at BEFORE UPDATE ON open_questions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_question_comments_updated_at BEFORE UPDATE ON question_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_meeting_notes_updated_at BEFORE UPDATE ON meeting_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
"
    
    # Выполнение SQL скрипта
    echo "$sql_script" | psql -d "$DB_NAME" -v ON_ERROR_STOP=1
    
    print_success "Таблицы базы данных созданы"
}

# Создание виртуального окружения
create_venv() {
    print_info "Создание виртуального окружения..."
    
    if [ -d "venv" ]; then
        print_warning "Виртуальное окружение уже существует"
        read -p "Пересоздать? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf venv
        else
            print_info "Используем существующее виртуальное окружение"
            return 0
        fi
    fi
    
    python3 -m venv venv
    print_success "Виртуальное окружение создано"
}

# Активация виртуального окружения
activate_venv() {
    print_info "Активация виртуального окружения..."
    source venv/bin/activate
    print_success "Виртуальное окружение активировано"
}

# Установка зависимостей
install_dependencies() {
    print_info "Установка зависимостей Python..."
    
    # Обновление pip
    pip install --upgrade pip
    
    # Установка зависимостей
    pip install -r requirements.txt
    
    print_success "Зависимости установлены"
}

# Настройка переменных окружения
setup_environment() {
    print_info "Настройка переменных окружения..."
    
    # Создание бэкапа существующего .env
    if [ -f ".env" ]; then
        mkdir -p "$BACKUP_DIR"
        cp .env "$BACKUP_DIR/"
        print_warning "Файл .env уже существует, создан бэкап"
        print_info "Автоматически обновляем настройки для текущего пользователя"
    fi
    
    # Проверка наличия шаблона
    if [ ! -f "env.example.txt" ]; then
        print_error "Файл env.example.txt не найден"
        return 1
    fi
    
    # Копирование примера конфигурации
    cp env.example.txt .env
    
    # Автоматическая настройка конфигурации
    print_info "Автоматическая настройка конфигурации..."
    
    # Используем значения по умолчанию
    DB_HOST="localhost"
    DB_PORT="5432"
    ENVIRONMENT="development"
    
    # Обновление .env файла
    sed -i '' "s/DB_NAME=.*/DB_NAME=$DB_NAME/" .env
    sed -i '' "s/DB_USER=.*/DB_USER=$DB_USER/" .env
    sed -i '' "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" .env
    sed -i '' "s/DB_HOST=.*/DB_HOST=$DB_HOST/" .env
    sed -i '' "s/DB_PORT=.*/DB_PORT=$DB_PORT/" .env
    sed -i '' "s/SERVER_PORT=.*/SERVER_PORT=$SERVER_PORT/" .env
    sed -i '' "s/ENVIRONMENT=.*/ENVIRONMENT=$ENVIRONMENT/" .env
    
    print_success "Переменные окружения настроены"
}

# Валидация конфигурации
validate_configuration() {
    print_info "Валидация конфигурации..."
    
    # Проверка .env файла
    if [ ! -f ".env" ]; then
        print_error "Файл .env не найден"
        return 1
    fi
    
    # Проверка подключения с новыми настройками
    if ! test_database_connection; then
        print_error "Не удалось подключиться к базе данных с новыми настройками"
        return 1
    fi
    
    print_success "Конфигурация валидна"
    return 0
}

# Создание директории логов
create_logs_dir() {
    print_info "Создание директории логов..."
    mkdir -p logs
    print_success "Директория логов создана"
}

# Проверка установки
verify_installation() {
    print_info "Проверка установки..."
    
    # Проверка Python
    if ! python3 --version &> /dev/null; then
        print_error "Python не найден"
        return 1
    fi
    
    # Проверка PostgreSQL
    if ! psql --version &> /dev/null; then
        print_error "PostgreSQL не найден"
        return 1
    fi
    
    # Проверка виртуального окружения
    if [ ! -d "venv" ]; then
        print_error "Виртуальное окружение не найдено"
        return 1
    fi
    
    # Проверка зависимостей
    source venv/bin/activate
    if ! python -c "import fastapi" &> /dev/null; then
        print_error "Зависимости не установлены"
        return 1
    fi
    
    print_success "Установка проверена успешно"
    return 0
}

# Тестовый запуск
test_run() {
    print_info "Тестовый запуск приложения..."
    
    # Проверка доступности порта
    check_port_availability "$SERVER_PORT"
    
    # Проверка подключения к БД
    if ! test_database_connection; then
        print_error "Не удалось подключиться к базе данных"
        return 1
    fi
    
    source venv/bin/activate
    
    # Установка PYTHONPATH
    export PYTHONPATH=$(pwd):${PYTHONPATH:-}
    
    # Загрузка переменных окружения
    if [ -f ".env" ]; then
        export $(cat .env | grep -v '^#' | xargs)
    fi
    
    # Правильный запуск через uvicorn
    print_info "Запуск через uvicorn..."
    uvicorn src.api.main:app --host 0.0.0.0 --port $SERVER_PORT --reload &
    APP_PID=$!
    
    # Ожидание запуска
    sleep 5
    
    # Проверка доступности
    if curl -s http://localhost:$SERVER_PORT > /dev/null; then
        print_success "Приложение запущено успешно"
        
        # Остановка тестового процесса
        kill $APP_PID
        wait $APP_PID 2>/dev/null || true
        
        return 0
    else
        print_error "Приложение не запустилось"
        kill $APP_PID 2>/dev/null || true
        return 1
    fi
}

# Создание launchd сервиса
create_launchd_service() {
    print_info "Создание launchd сервиса..."
    
    read -p "Создать launchd сервис для автозапуска? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        return 0
    fi
    
    # Создание plist файла
    cat > ~/Library/LaunchAgents/com.officer.calendar.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.officer.calendar</string>
    <key>ProgramArguments</key>
    <array>
        <string>$CURRENT_DIR/venv/bin/uvicorn</string>
        <string>src.api.main:app</string>
        <string>--host</string>
        <string>0.0.0.0</string>
        <string>--port</string>
        <string>$SERVER_PORT</string>
        <string>--reload</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$CURRENT_DIR</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PYTHONPATH</key>
        <string>$CURRENT_DIR</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$CURRENT_DIR/logs/officer.out.log</string>
    <key>StandardErrorPath</key>
    <string>$CURRENT_DIR/logs/officer.err.log</string>
</dict>
</plist>
EOF
    
    # Загрузка сервиса
    launchctl load ~/Library/LaunchAgents/com.officer.calendar.plist
    
    print_success "Launchd сервис создан и загружен"
    print_info "Для управления сервисом:"
    print_info "  Запуск: launchctl start com.officer.calendar"
    print_info "  Остановка: launchctl stop com.officer.calendar"
    print_info "  Статус: launchctl list | grep officer"
}

# Основная функция
main() {
    print_header
    
    # Проверка macOS
    check_macos
    
    # Проверка, что скрипт запущен из корня проекта
    if [ ! -f "requirements.txt" ] || [ ! -f "src/api/main.py" ]; then
        print_error "Запустите скрипт из корня проекта Officer Calendar"
        exit 1
    fi
    
    # Создание директории для бэкапов
    mkdir -p "$BACKUP_DIR"
    
    # Установка зависимостей
    if ! check_homebrew; then
        install_homebrew
    fi
    
    install_python
    install_postgresql
    
    # Проверка статуса PostgreSQL
    if ! check_postgresql_status; then
        print_error "PostgreSQL недоступен"
        exit 1
    fi
    
    # Настройка базы данных
    create_database
    
    # Проверка подключения к БД
    if ! test_database_connection; then
        print_error "Не удалось подключиться к базе данных"
        exit 1
    fi
    
    # Проверка существующих таблиц
    check_existing_tables
    
    # Создание таблиц
    init_database_tables
    
    # Настройка проекта
    create_venv
    activate_venv
    install_dependencies
    setup_environment
    
    # Валидация конфигурации
    if ! validate_configuration; then
        print_error "Конфигурация невалидна"
        exit 1
    fi
    
    create_logs_dir
    
    # Проверка установки
    if ! verify_installation; then
        print_error "Установка не удалась"
        exit 1
    fi
    
    # Тестовый запуск
    if test_run; then
        print_success "Тестовый запуск прошел успешно"
    else
        print_warning "Тестовый запуск не удался, но установка завершена"
    fi
    
    # Создание сервиса
    create_launchd_service
    
    # Очистка временных файлов
    rm -rf "$BACKUP_DIR"
    
    # Финальное сообщение
    echo
    print_success "🎉 Установка завершена успешно!"
    echo
    print_info "Для запуска приложения:"
    echo "  ./start.sh"
    echo
    print_info "Или вручную:"
    echo "  source venv/bin/activate"
    echo "  export PYTHONPATH=\$(pwd):\${PYTHONPATH:-}"
    echo "  uvicorn src.api.main:app --host 0.0.0.0 --port $SERVER_PORT --reload"
    echo
    print_info "Или через launchd (если создан):"
    echo "  launchctl start com.officer.calendar"
    echo
    print_info "Приложение будет доступно по адресу: http://localhost:$SERVER_PORT"
    echo
    print_warning "Не забудьте настроить интеграции:"
    echo "  - Google Calendar API (файл credentials.json)"
    echo "  - Microsoft Graph API (переменные в .env)"
    echo
    print_info "Подробная документация: DEPLOYMENT_GUIDE.md"
}

# Обработка аргументов командной строки
case "${1:-}" in
    --help|-h)
        echo "Использование: $0 [опции]"
        echo
        echo "Опции:"
        echo "  --help, -h     Показать эту справку"
        echo "  --test         Только тестовый запуск"
        echo "  --service      Только создание launchd сервиса"
        echo
        exit 0
        ;;
    --test)
        print_header
        test_run
        exit $?
        ;;
    --service)
        print_header
        create_launchd_service
        exit 0
        ;;
    *)
        main
        ;;
esac

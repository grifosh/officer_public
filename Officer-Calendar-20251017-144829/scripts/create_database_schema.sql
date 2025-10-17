-- Скрипт создания основной схемы базы данных Officer Calendar
-- Выполнить в PostgreSQL

-- Создание основных таблиц

-- Таблица событий (основная таблица)
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

-- Таблица участников
CREATE TABLE IF NOT EXISTS attendees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255),
    use_count INTEGER DEFAULT 1,
    last_used TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Таблица потоков (категорий событий)
CREATE TABLE IF NOT EXISTS streams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7) DEFAULT '#007bff',
    use_count INTEGER DEFAULT 1,
    last_used TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Таблица открытых вопросов
CREATE TABLE IF NOT EXISTS open_questions (
    id SERIAL PRIMARY KEY,
    question_text TEXT NOT NULL,
    event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Таблица комментариев к вопросам
CREATE TABLE IF NOT EXISTS question_comments (
    id SERIAL PRIMARY KEY,
    question_id INTEGER REFERENCES open_questions(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Таблица заметок встреч
CREATE TABLE IF NOT EXISTS meeting_notes (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    note_text TEXT NOT NULL,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Таблица утренних задач
CREATE TABLE IF NOT EXISTS morning_todos (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    todo_text TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Таблица вечерних выводов
CREATE TABLE IF NOT EXISTS evening_conclusions (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    conclusion_text TEXT NOT NULL,
    mood VARCHAR(20) DEFAULT 'neutral' CHECK (mood IN ('positive', 'neutral', 'negative')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Создание индексов для оптимизации

-- Индексы для таблицы events
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_end_time ON events(end_time);
CREATE INDEX IF NOT EXISTS idx_events_google_event_id ON events(google_event_id);
CREATE INDEX IF NOT EXISTS idx_events_sync_source ON events(sync_source);
CREATE INDEX IF NOT EXISTS idx_events_stream ON events(stream);

-- Индексы для таблицы attendees
CREATE INDEX IF NOT EXISTS idx_attendees_name ON attendees(name);
CREATE INDEX IF NOT EXISTS idx_attendees_email ON attendees(email);
CREATE INDEX IF NOT EXISTS idx_attendees_use_count ON attendees(use_count DESC);
CREATE INDEX IF NOT EXISTS idx_attendees_last_used ON attendees(last_used DESC);

-- Индексы для таблицы streams
CREATE INDEX IF NOT EXISTS idx_streams_name ON streams(name);
CREATE INDEX IF NOT EXISTS idx_streams_use_count ON streams(use_count DESC);
CREATE INDEX IF NOT EXISTS idx_streams_last_used ON streams(last_used DESC);

-- Индексы для таблицы open_questions
CREATE INDEX IF NOT EXISTS idx_open_questions_event_id ON open_questions(event_id);
CREATE INDEX IF NOT EXISTS idx_open_questions_resolved ON open_questions(is_resolved);
CREATE INDEX IF NOT EXISTS idx_open_questions_created ON open_questions(created_at DESC);

-- Индексы для таблицы question_comments
CREATE INDEX IF NOT EXISTS idx_question_comments_question_id ON question_comments(question_id);
CREATE INDEX IF NOT EXISTS idx_question_comments_created ON question_comments(created_at DESC);

-- Индексы для таблицы meeting_notes
CREATE INDEX IF NOT EXISTS idx_meeting_notes_event_id ON meeting_notes(event_id);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_resolved ON meeting_notes(resolved);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_created ON meeting_notes(created_at DESC);

-- Индексы для таблицы morning_todos
CREATE INDEX IF NOT EXISTS idx_morning_todos_date ON morning_todos(date);
CREATE INDEX IF NOT EXISTS idx_morning_todos_completed ON morning_todos(completed);

-- Индексы для таблицы evening_conclusions
CREATE INDEX IF NOT EXISTS idx_evening_conclusions_date ON evening_conclusions(date);

-- Комментарии к таблицам
COMMENT ON TABLE events IS 'Основная таблица событий календаря';
COMMENT ON TABLE attendees IS 'Участники встреч с статистикой использования';
COMMENT ON TABLE streams IS 'Потоки (категории) событий';
COMMENT ON TABLE open_questions IS 'Открытые вопросы по событиям';
COMMENT ON TABLE question_comments IS 'Комментарии к открытым вопросам';
COMMENT ON TABLE meeting_notes IS 'Заметки к встречам';
COMMENT ON TABLE morning_todos IS 'Утренние задачи на день';
COMMENT ON TABLE evening_conclusions IS 'Вечерние выводы и размышления';

-- Комментарии к ключевым полям
COMMENT ON COLUMN events.google_event_id IS 'ID события в Google Calendar';
COMMENT ON COLUMN events.sync_source IS 'Источник синхронизации: local, google, microsoft';
COMMENT ON COLUMN events.attendees IS 'JSON массив участников';
COMMENT ON COLUMN attendees.use_count IS 'Количество использований участника';
COMMENT ON COLUMN streams.use_count IS 'Количество использований потока';
COMMENT ON COLUMN open_questions.is_resolved IS 'Решен ли вопрос';
COMMENT ON COLUMN meeting_notes.resolved IS 'Решена ли заметка';

-- Вставка начальных данных

-- Добавляем базовые потоки
INSERT INTO streams (name, color) VALUES 
    ('Работа', '#007bff'),
    ('Личное', '#28a745'),
    ('Встречи', '#ffc107'),
    ('Проекты', '#dc3545'),
    ('Обучение', '#6f42c1')
ON CONFLICT (name) DO NOTHING;

-- Добавляем базовых участников
INSERT INTO attendees (name, email) VALUES 
    ('Я', 'me@example.com'),
    ('Команда', 'team@example.com'),
    ('Клиент', 'client@example.com')
ON CONFLICT (name) DO NOTHING;

-- Создание функции для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Создание триггеров для автоматического обновления updated_at
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attendees_updated_at BEFORE UPDATE ON attendees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_streams_updated_at BEFORE UPDATE ON streams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_open_questions_updated_at BEFORE UPDATE ON open_questions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_question_comments_updated_at BEFORE UPDATE ON question_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_meeting_notes_updated_at BEFORE UPDATE ON meeting_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_morning_todos_updated_at BEFORE UPDATE ON morning_todos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_evening_conclusions_updated_at BEFORE UPDATE ON evening_conclusions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Предоставление прав пользователю officer
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO officer;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO officer;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO officer;

-- Сообщение об успешном завершении
DO $$
BEGIN
    RAISE NOTICE '✅ Схема базы данных Officer Calendar создана успешно!';
    RAISE NOTICE '📊 Создано таблиц: 8';
    RAISE NOTICE '📇 Создано индексов: 20+';
    RAISE NOTICE '🔧 Создано функций и триггеров: 9';
    RAISE NOTICE '🎯 База данных готова к работе!';
END $$;

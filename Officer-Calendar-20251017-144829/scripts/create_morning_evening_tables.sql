-- Скрипт для создания таблиц Morning ToDos и Evening Conclusions
-- Выполнить в PostgreSQL

-- Таблица для Morning ToDos
CREATE TABLE IF NOT EXISTS morning_todos (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    todo_text TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица для Evening Conclusions
CREATE TABLE IF NOT EXISTS evening_conclusions (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    conclusion_text TEXT NOT NULL,
    mood VARCHAR(20) DEFAULT 'neutral' CHECK (mood IN ('positive', 'neutral', 'negative')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_morning_todos_date ON morning_todos(date);
CREATE INDEX IF NOT EXISTS idx_morning_todos_completed ON morning_todos(completed);
CREATE INDEX IF NOT EXISTS idx_evening_conclusions_date ON evening_conclusions(date);

-- Комментарии к таблицам
COMMENT ON TABLE morning_todos IS 'Утренние задачи на день';
COMMENT ON TABLE evening_conclusions IS 'Вечерние выводы и размышления';

COMMENT ON COLUMN morning_todos.date IS 'Дата для которой создана задача';
COMMENT ON COLUMN morning_todos.todo_text IS 'Текст задачи';
COMMENT ON COLUMN morning_todos.completed IS 'Выполнена ли задача';
COMMENT ON COLUMN morning_todos.priority IS 'Приоритет задачи: low, normal, high';

COMMENT ON COLUMN evening_conclusions.date IS 'Дата для которой создан вывод';
COMMENT ON COLUMN evening_conclusions.conclusion_text IS 'Текст вывода/размышления';
COMMENT ON COLUMN evening_conclusions.mood IS 'Настроение: positive, neutral, negative';

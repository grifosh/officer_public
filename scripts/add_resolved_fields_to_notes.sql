-- Добавляем поля для отслеживания отметки checkbox в таблицу meeting_notes
ALTER TABLE meeting_notes 
ADD COLUMN resolved BOOLEAN DEFAULT FALSE,
ADD COLUMN resolved_at TIMESTAMP WITH TIME ZONE;

-- Добавляем комментарии к полям
COMMENT ON COLUMN meeting_notes.resolved IS 'Отметка checkbox - решена ли заметка';
COMMENT ON COLUMN meeting_notes.resolved_at IS 'Время когда была отмечена заметка как решенная';

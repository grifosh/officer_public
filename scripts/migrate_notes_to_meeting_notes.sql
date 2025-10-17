-- Миграция заметок из поля notes таблицы events в таблицу meeting_notes
-- и обновление поля notes для хранения note_ids

-- Создаем временную таблицу для хранения результатов миграции
CREATE TEMP TABLE migration_results (
    event_id INTEGER,
    old_notes TEXT,
    new_note_ids INTEGER[],
    notes_count INTEGER
);

-- Функция для извлечения заметок из JSON и создания записей в meeting_notes
DO $$
DECLARE
    event_record RECORD;
    note_item JSONB;
    note_id INTEGER;
    note_ids INTEGER[];
    notes_array JSONB;
BEGIN
    -- Проходим по всем событиям, у которых есть заметки
    FOR event_record IN 
        SELECT id, notes 
        FROM events 
        WHERE notes IS NOT NULL 
        AND notes != '' 
        AND notes != '[]'
    LOOP
        -- Инициализируем массив note_ids для текущего события
        note_ids := ARRAY[]::INTEGER[];
        
        -- Пытаемся распарсить notes как JSON
        BEGIN
            notes_array := event_record.notes::JSONB;
            
            -- Проверяем, что это массив
            IF jsonb_typeof(notes_array) = 'array' THEN
                -- Проходим по каждой заметке в массиве
                FOR note_item IN SELECT * FROM jsonb_array_elements(notes_array)
                LOOP
                    -- Извлекаем данные из заметки
                    INSERT INTO meeting_notes (
                        event_id, 
                        note_text, 
                        time, 
                        person, 
                        is_question,
                        resolved,
                        resolved_at
                    ) VALUES (
                        event_record.id,
                        COALESCE(note_item->>'text', ''),
                        COALESCE(note_item->>'time', ''),
                        COALESCE(note_item->>'person', ''),
                        COALESCE((note_item->>'is_question')::BOOLEAN, FALSE),
                        FALSE,
                        NULL
                    ) RETURNING id INTO note_id;
                    
                    -- Добавляем ID заметки в массив
                    note_ids := array_append(note_ids, note_id);
                END LOOP;
                
                -- Обновляем поле notes в таблице events на массив note_ids
                UPDATE events 
                SET notes = array_to_string(note_ids, ',')
                WHERE id = event_record.id;
                
                -- Записываем результат миграции
                INSERT INTO migration_results (event_id, old_notes, new_note_ids, notes_count)
                VALUES (event_record.id, event_record.notes, note_ids, array_length(note_ids, 1));
                
                RAISE NOTICE 'Мигрировано событие %: % заметок', event_record.id, array_length(note_ids, 1);
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Ошибка обработки события %: %', event_record.id, SQLERRM;
        END;
    END LOOP;
END $$;

-- Показываем результаты миграции
SELECT 
    event_id,
    notes_count,
    new_note_ids,
    LEFT(old_notes, 100) as old_notes_preview
FROM migration_results 
ORDER BY event_id;

-- Показываем общую статистику
SELECT 
    COUNT(*) as total_events_migrated,
    SUM(notes_count) as total_notes_migrated,
    AVG(notes_count) as avg_notes_per_event
FROM migration_results;

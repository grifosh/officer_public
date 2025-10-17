// Массив событий (загружается из API)
let mockEvents = [];

// Глобальный автокомплит для Notes
let globalSuggestionsBox = null;

function createGlobalSuggestionsBox() {
  if (globalSuggestionsBox) {
    globalSuggestionsBox.remove();
  }
  
  globalSuggestionsBox = document.createElement('div');
  globalSuggestionsBox.className = 'global-suggestions-box';
  globalSuggestionsBox.id = 'global-suggestions-box';
  document.body.appendChild(globalSuggestionsBox);
  
  return globalSuggestionsBox;
}

function hideGlobalSuggestionsBox() {
  if (globalSuggestionsBox) {
    globalSuggestionsBox.style.display = 'none';
  }
}

// ===== СИСТЕМА ОБРАБОТКИ ОШИБОК =====

/**
 * Показывает уведомление об ошибке
 * @param {string} message - Сообщение об ошибке
 * @param {string} type - Тип уведомления (error, warning, info, success)
 * @param {number} duration - Длительность показа в миллисекундах (по умолчанию 5000)
 */
function showNotification(message, type = 'error', duration = 5000) {
    // Создаем контейнер для уведомлений, если его нет
    let notificationContainer = document.querySelector('.notification-container');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.className = 'notification-container';
        notificationContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
        `;
        document.body.appendChild(notificationContainer);
    }

    // Ограничиваем количество уведомлений до 5
    const existingNotifications = notificationContainer.querySelectorAll('.notification');
    if (existingNotifications.length >= 5) {
        // Удаляем самое старое уведомление (первое в списке) СРАЗУ
        const oldestNotification = existingNotifications[0];
        oldestNotification.remove(); // Удаляем сразу, без анимации
    }

    // Показываем кнопку "Очистить все" если уведомлений больше 3
    if (existingNotifications.length >= 3) {
        let clearAllButton = notificationContainer.querySelector('.clear-all-button');
        if (!clearAllButton) {
            clearAllButton = document.createElement('button');
            clearAllButton.className = 'clear-all-button';
            clearAllButton.textContent = 'Очистить все';
            clearAllButton.style.cssText = `
                position: absolute;
                top: -35px;
                right: 0;
                background: #ef4444;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 6px 12px;
                font-size: 12px;
                cursor: pointer;
                z-index: 10001;
            `;
            clearAllButton.onclick = clearAllNotifications;
            notificationContainer.appendChild(clearAllButton);
        }
    }

    // Создаем уведомление
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    // Определяем иконку и цвет в зависимости от типа
    let icon, bgColor, borderColor;
    switch (type) {
        case 'error':
            icon = '❌';
            bgColor = '#fee2e2';
            borderColor = '#fca5a5';
            break;
        case 'warning':
            icon = '⚠️';
            bgColor = '#fef3c7';
            borderColor = '#fbbf24';
            break;
        case 'info':
            icon = 'ℹ️';
            bgColor = '#dbeafe';
            borderColor = '#60a5fa';
            break;
        case 'success':
            icon = '✅';
            bgColor = '#dcfce7';
            borderColor = '#4ade80';
            break;
        default:
            icon = 'ℹ️';
            bgColor = '#f3f4f6';
            borderColor = '#9ca3af';
    }

    notification.style.cssText = `
        background: ${bgColor};
        border: 2px solid ${borderColor};
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 10px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        display: flex;
        align-items: center;
        gap: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.4;
        color: #374151;
        animation: slideIn 0.3s ease-out;
        cursor: pointer;
        transition: all 0.3s ease;
    `;

    notification.innerHTML = `
        <span style="font-size: 18px;">${icon}</span>
        <span style="flex: 1;">${message}</span>
        <button onclick="this.parentElement.remove()" style="
            background: none;
            border: none;
            font-size: 18px;
            cursor: pointer;
            color: #6b7280;
            padding: 0;
            margin-left: 8px;
        ">×</button>
    `;

    // Добавляем CSS анимацию, если её нет
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
            .notification:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 15px -3px rgba(0, 0, 0, 0.1);
            }
        `;
        document.head.appendChild(style);
    }

    notificationContainer.appendChild(notification);

    // Дополнительная проверка лимита после добавления
    const finalNotifications = notificationContainer.querySelectorAll('.notification');
    if (finalNotifications.length > 5) {
        // Удаляем лишние уведомления (самые старые)
        const excessCount = finalNotifications.length - 5;
        for (let i = 0; i < excessCount; i++) {
            finalNotifications[i].remove();
        }
    }

    // Логируем количество уведомлений
    const currentCount = getNotificationCount();
    console.log(`📢 Показано уведомление (${type}): "${message}". Всего уведомлений: ${currentCount}`);

    // Автоматическое удаление через указанное время
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }
    }, duration);

    // Удаление по клику
    notification.addEventListener('click', () => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 300);
    });
}

/**
 * Обрабатывает ответ API и показывает уведомления об ошибках
 * @param {Response} response - Ответ от fetch
 * @param {string} operation - Описание операции для логов
 * @returns {Promise<any>} - Данные ответа или null при ошибке
 */
async function handleApiResponse(response, operation = 'API запрос') {
    if (!response.ok) {
        let errorMessage = '';
        
        switch (response.status) {
            case 404:
                errorMessage = 'Событие не найдено. Возможно, оно было удалено.';
                break;
            case 409:
                errorMessage = 'Конфликт времени: событие пересекается с существующим.';
                break;
            case 500:
                errorMessage = 'Внутренняя ошибка сервера. Попробуйте позже.';
                break;
            case 400:
                errorMessage = 'Некорректные данные. Проверьте заполненные поля.';
                break;
            default:
                errorMessage = `Ошибка ${response.status}: ${response.statusText}`;
        }

        console.error(`❌ ${operation} failed:`, {
            status: response.status,
            statusText: response.statusText,
            url: response.url
        });

        showNotification(errorMessage, 'error');
        return null;
    }

    try {
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`❌ Ошибка парсинга JSON для ${operation}:`, error);
        showNotification('Ошибка обработки ответа сервера', 'error');
        return null;
    }
}

/**
 * Безопасный fetch с обработкой ошибок
 * @param {string} url - URL для запроса
 * @param {object} options - Опции для fetch
 * @param {string} operation - Описание операции
 * @returns {Promise<any>} - Данные ответа или null при ошибке
 */
async function safeFetch(url, options = {}, operation = 'API запрос') {
    try {
        console.log(`🔄 ${operation}:`, url);
        const response = await fetch(url, options);
        return await handleApiResponse(response, operation);
    } catch (error) {
        console.error(`❌ Сетевая ошибка для ${operation}:`, error);
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showNotification('Ошибка подключения к серверу. Проверьте интернет-соединение.', 'error');
        } else {
            showNotification(`Ошибка: ${error.message}`, 'error');
        }
        
        return null;
    }
}

/**
 * Очищает все уведомления
 */
function clearAllNotifications() {
    const notificationContainer = document.querySelector('.notification-container');
    if (notificationContainer) {
        // Удаляем все уведомления
        const notifications = notificationContainer.querySelectorAll('.notification');
        notifications.forEach(notification => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        });
        
        // Удаляем кнопку "Очистить все"
        const clearAllButton = notificationContainer.querySelector('.clear-all-button');
        if (clearAllButton) {
            clearAllButton.remove();
        }
    }
}

/**
 * Показывает количество активных уведомлений в консоли
 */
function getNotificationCount() {
    const notificationContainer = document.querySelector('.notification-container');
    if (notificationContainer) {
        return notificationContainer.querySelectorAll('.notification').length;
    }
    return 0;
}

/**
 * Принудительно проверяет и применяет лимит уведомлений
 */
function enforceNotificationLimit() {
    const notificationContainer = document.querySelector('.notification-container');
    if (notificationContainer) {
        const notifications = notificationContainer.querySelectorAll('.notification');
        if (notifications.length > 5) {
            const excessCount = notifications.length - 5;
            console.log(`🔧 Принудительно удаляем ${excessCount} лишних уведомлений`);
            for (let i = 0; i < excessCount; i++) {
                notifications[i].remove();
            }
        }
    }
}

// ===== КОНЕЦ СИСТЕМЫ ОБРАБОТКИ ОШИБОК =====

// =======================
// УНИВЕРСАЛЬНАЯ ФУНКЦИЯ ПАРСИНГА МЕТАДАННЫХ
// =======================

/**
 * Универсальная функция для парсинга метаданных из строки
 * Поддерживает форматы:
 * - [HH:MM] [Person | #topic] text
 * - [Person | #topic] text  
 * - [Person] text
 * - Person: text
 * - text #topic
 * - text Important ASAP
 */

// Функция для создания вопроса в базе данных из заметки
async function createQuestionFromNote(note, noteIndex, eventId) {
  try {
    
    // Парсим метаданные из текста заметки
    const parsed = parseQuestionMetadata(note.text);
    
    // Извлекаем теги из текста
    const extractedTags = extractTagsFromText(note.text, allStreamsData || []);
    const primaryTag = extractedTags.length > 0 ? extractedTags[0] : 'General';
    
    // Подготавливаем данные для API
    const questionData = {
      event_id: eventId,
      question_text: parsed.text || note.text,
      time: note.time || parsed.time,
      person: note.person || parsed.person,
      stream: primaryTag,
      important: note.isIMP || parsed.important,
      asap: note.isASAP || parsed.asap,
      note_index: noteIndex
    };
    
    
    // Сначала проверяем, есть ли уже вопрос для этой заметки
    const existingQuestionsResponse = await fetch('/api/open-questions');
    let existingQuestion = null;
    
    if (existingQuestionsResponse.ok) {
      const existingQuestions = await existingQuestionsResponse.json();
      // Более строгая проверка дубликатов - сравниваем по тексту вопроса и событию
      existingQuestion = existingQuestions.find(q => 
        q.event_id === eventId && 
        q.question_text.trim().toLowerCase() === questionData.question_text.trim().toLowerCase()
      );
      
      if (existingQuestion) {
      }
    }
    
    if (existingQuestion) {
      // Обновляем существующий вопрос
      
      const updateResponse = await fetch(`/api/open-questions/${existingQuestion.id}/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(questionData)
      });
      
      if (updateResponse.ok) {
        const result = await updateResponse.json();
        
        // Сохраняем ID вопроса в заметке для связи
        note.questionId = existingQuestion.id;
        
        // Показываем уведомление об обновлении
        showNotification('Open Question data updated', 'success');
      } else {
        const error = await updateResponse.json();
        console.error('❌ Ошибка обновления вопроса:', error);
        showNotification(`Error updating question: ${error.detail}`, 'error');
      }
    } else {
      // Создаем новый вопрос
      
      const response = await fetch('/api/open-questions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(questionData)
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Сохраняем ID вопроса в заметке для связи
        note.questionId = result.question_id;
        
        // Показываем уведомление о создании
        showNotification('Question added to Open Questions', 'success');
      } else {
        const error = await response.json();
        console.error('❌ Ошибка создания вопроса:', error);
        showNotification(`Error creating question: ${error.detail}`, 'error');
      }
    }
  } catch (error) {
    console.error('❌ Ошибка при создании/обновлении вопроса:', error);
    showNotification(`Error: ${error.message}`, 'error');
  }
}

// Функция для показа уведомлений
function showNotification(message, type = 'info') {
  // Создаем элемент уведомления
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 4px;
    color: white;
    font-weight: 500;
    z-index: 10000;
    max-width: 300px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    ${type === 'success' ? 'background-color: #4CAF50;' : ''}
    ${type === 'error' ? 'background-color: #f44336;' : ''}
    ${type === 'info' ? 'background-color: #2196F3;' : ''}
  `;
  
  document.body.appendChild(notification);
  
  // Удаляем уведомление через 3 секунды
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}

function parseQuestionMetadata(str) {
  // Проверяем, что входной параметр является строкой
  if (typeof str !== 'string') {
    str = str ? String(str) : '';
  }
  
  const result = { 
    text: str, 
    time: null, 
    person: null, 
    topic: null, 
    due: null, 
    important: false, 
    asap: false 
  };
  
  let remaining = str.trim();
  
  // 1. Время [HH:MM] в начале
  const timeMatch = remaining.match(/^\[(\d{1,2}:\d{2})\]\s*/);
  if (timeMatch) {
    result.time = timeMatch[1];
    remaining = remaining.replace(timeMatch[0], '').trim();
  }
  
  // 2. Блок с человеком и/или темой [Person | #topic] или [Person]
  const personBlockMatch = remaining.match(/^\[([^\]]+)\]\s*/);
  if (personBlockMatch) {
    const personBlock = personBlockMatch[1];
    
    // Проверяем, есть ли разделитель |
    if (personBlock.includes(' | ')) {
      const parts = personBlock.split(' | ');
      // Проверяем, что первая часть не является хештегом
      if (!parts[0].trim().startsWith('#')) {
        result.person = parts[0].trim();
      }
      
      // Ищем тему во второй части
      const topicPart = parts[1].trim();
      if (topicPart.startsWith('#')) {
        result.topic = topicPart.substring(1).trim();
      }
    } else {
      // Просто человек без темы - проверяем, что это не хештег
      if (!personBlock.startsWith('#')) {
        result.person = personBlock;
      }
    }
    
    remaining = remaining.replace(personBlockMatch[0], '').trim();
  }
  
  // 3. Тема #topic в оставшемся тексте (если еще не найдена)
  if (!result.topic) {
    const topicMatch = remaining.match(/#([A-Za-z][A-Za-z\s]{2,20}?)(?:\s|$)/);
    if (topicMatch) {
      result.topic = topicMatch[1];
      remaining = remaining.replace(topicMatch[0], '').trim();
    }
  }
  
  // 4. Флаги Important и ASAP
  if (remaining.toLowerCase().includes('important')) {
    result.important = true;
    remaining = remaining.replace(/important/gi, '').trim();
  }
  
  if (remaining.toLowerCase().includes('asap')) {
    result.asap = true;
    remaining = remaining.replace(/asap/gi, '').trim();
  }
  
  // 5. Оставшийся текст
  result.text = remaining;
  
  return result;
}

const eventDetails = document.getElementById("event-details");
const dateListEl = document.getElementById("date-list");
const allSlotsEl = document.getElementById("all-slots");
const sidebarEl = document.getElementById("sidebar");
const clockTimeEl = document.getElementById("clock-time");
const dateTopEl = document.getElementById("sidebar-date-top");
const dateBottomEl = document.getElementById("sidebar-date-bottom");

// Глобальная переменная для отслеживания времени начала встречи
let meetingStartTime = null;

// Глобальная переменная для результатов поиска
let searchResults = [];

// =======================
// Утилиты для работы с московским временем
// =======================

// Получить текущее московское время
function getMoscowTime() {
  // Просто возвращаем текущее время - все даты уже в московском времени
  return new Date();
}

// Получить текущую дату в начале дня (локальное время)
function getCurrentDateAtMidnight() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  return new Date(year, month, day, 0, 0, 0, 0);
}

// Создать дату из строки (все даты уже в московском времени)
function createMoscowDate(dateStr) {
  // Проверяем, что dateStr не undefined или null
  if (!dateStr) {
    console.warn('createMoscowDate: dateStr is undefined or null');
    return new Date();
  }
  
  // Просто создаем дату из строки - все даты уже в московском времени
  return new Date(dateStr);
}

// Конвертировать дату в строку для базы данных (московское время)
function toMoscowISOString(date) {
  // Создаем дату в московском timezone и возвращаем ISO строку с offset
  const moscowDate = new Date(date.getTime() + (3 * 60 * 60 * 1000));
  return moscowDate.toISOString().replace('Z', '+03:00');
}

// Создать дату для слота календаря (московское время)
function createSlotDate(year, month, day, hour, minute) {
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

// Проверить, является ли дата сегодняшней (московское время)
function isToday(date) {
  const today = getMoscowTime();
  return date.getDate() === today.getDate() && 
         date.getMonth() === today.getMonth() && 
         date.getFullYear() === today.getFullYear();
}

// Проверить, занят ли слот событием
function isSlotOccupied(slotDate, slotStart, slotEnd) {
  const slotStartTime = createSlotDate(
    parseInt(slotDate.split('-')[0]),
    parseInt(slotDate.split('-')[1]),
    parseInt(slotDate.split('-')[2]),
    parseInt(slotStart.split(':')[0]),
    parseInt(slotStart.split(':')[1])
  );
  
  const slotEndTime = createSlotDate(
    parseInt(slotDate.split('-')[0]),
    parseInt(slotDate.split('-')[1]),
    parseInt(slotDate.split('-')[2]),
    parseInt(slotEnd.split(':')[0]),
    parseInt(slotEnd.split(':')[1])
  );
  
  // Проверяем все события на эту дату (включая будущие)
  return mockEvents.some(event => {
    const eventStart = createMoscowDate(event.start);
    const eventEnd = createMoscowDate(event.end);
    
    // Проверяем, что событие на ту же дату
    const eventDate = eventStart.toISOString().slice(0, 10);
    if (eventDate !== slotDate) return false;
    
    // Проверяем пересечение времени
    return (eventStart < slotEndTime && eventEnd > slotStartTime);
  });
}

// Найти следующее событие
function findNextEvent(activeDateSlots, currentHour, currentMinute) {
  const currentMinutes = currentHour * 60 + currentMinute;
  
  
  // Ищем слоты с событиями
  const eventSlots = activeDateSlots.filter(slot => slot.classList.contains('event-slot'));
  
  if (eventSlots.length === 0) return null;
  
  // Проверяем, находимся ли мы в текущем событии
  let currentEvent = null;
  eventSlots.forEach(slot => {
    const slotStart = slot.dataset.start;
    const slotEnd = slot.dataset.end;
    const [startHour, startMinute] = slotStart.split(':').map(Number);
    const [endHour, endMinute] = slotEnd.split(':').map(Number);
    
    const slotStartMinutes = startHour * 60 + startMinute;
    const slotEndMinutes = endHour * 60 + endMinute;
    
    // Если мы находимся в текущем событии
    if (currentMinutes >= slotStartMinutes && currentMinutes < slotEndMinutes) {
      currentEvent = slot;
    }
  });
  
  // Если мы в текущем событии, проверяем последние 5 минут
  if (currentEvent) {
    const slotEnd = currentEvent.dataset.end;
    const [endHour, endMinute] = slotEnd.split(':').map(Number);
    const slotEndMinutes = endHour * 60 + endMinute;
    
    const minutesToEnd = slotEndMinutes - currentMinutes;
    
    // Если до окончания события больше 5 минут, не показываем следующее событие
    if (minutesToEnd > 5) {
      return null;
    }
  }
  
  // Находим ближайшее будущее событие (которое еще не началось)
  let nextEvent = null;
  let minTimeDiff = Infinity;
  
  eventSlots.forEach(slot => {
    const slotStart = slot.dataset.start;
    const [startHour, startMinute] = slotStart.split(':').map(Number);
    const slotStartMinutes = startHour * 60 + startMinute;
    
    // Ищем только события, которые еще не начались
    if (slotStartMinutes > currentMinutes) {
      const timeDiff = slotStartMinutes - currentMinutes;
      // console.log('DEBUG: Проверяем событие:', `${slotStart}-${slot.dataset.end}`, `время до начала: ${timeDiff}м`);
      if (timeDiff < minTimeDiff) {
        minTimeDiff = timeDiff;
        nextEvent = slot;
      }
    }
  });
  
  return nextEvent;
}

// Вычислить время до следующего события
function calculateTimeToNextEvent(nextEventSlot, currentHour, currentMinute) {
  if (!nextEventSlot) return '';
  
  const slotStart = nextEventSlot.dataset.start;
  const [startHour, startMinute] = slotStart.split(':').map(Number);
  
  const currentMinutes = currentHour * 60 + currentMinute;
  const slotStartMinutes = startHour * 60 + startMinute;
  const diffMinutes = slotStartMinutes - currentMinutes;
  
  if (diffMinutes <= 0) return '';
  
  // Получаем название события из текста слота
  const eventText = nextEventSlot.textContent;
  
  // Пробуем разные форматы: "время – время: название" или "время: название"
  let eventName = eventText.split(': ')[1] || eventText.split(' – ')[1];
  
  // Если не нашли через разделители, попробуем извлечь из полного текста
  if (!eventName) {
    // Ищем паттерн "время – время: название события"
    const timePattern = /^\d{2}:\d{2} – \d{2}:\d{2}: (.+)$/;
    const match = eventText.match(timePattern);
    eventName = match ? match[1] : 'событие';
  }
  
  
  // Формат: название_события in количество_минут (всегда до начала)
  return {
    text: `${eventName} in ${diffMinutes}м`,
    shortText: `Next in ${diffMinutes}м`,
    fullEventName: eventName
  };
}

// Создание интерактивного календаря для выбора даты
function showDatePicker() {
  console.log('Показываем календарь для выбора даты');
  
  // Создаем модальное окно
  const modal = document.createElement('div');
  modal.className = 'date-picker-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `;
  
  // Создаем контейнер календаря
  const calendarContainer = document.createElement('div');
  calendarContainer.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    max-width: 400px;
    width: 90%;
  `;
  
  // Заголовок
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 2px solid #f0f0f0;
  `;
  
  const title = document.createElement('h3');
  title.textContent = 'Выберите прошлую дату';
  title.style.cssText = 'margin: 0; color: #333; font-size: 18px;';
  
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '✕';
  closeBtn.style.cssText = `
    background: #ff4444;
    color: white;
    border: none;
    border-radius: 50%;
    width: 30px;
    height: 30px;
    cursor: pointer;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  
  header.appendChild(title);
  header.appendChild(closeBtn);
  
  // Навигация по месяцам
  const nav = document.createElement('div');
  nav.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
  `;
  
  const prevBtn = document.createElement('button');
  prevBtn.innerHTML = '‹';
  prevBtn.style.cssText = `
    background: #4aa3ff;
    color: white;
    border: none;
    border-radius: 6px;
    width: 40px;
    height: 40px;
    cursor: pointer;
    font-size: 20px;
    font-weight: bold;
  `;
  
  const monthYear = document.createElement('div');
  monthYear.style.cssText = `
    font-size: 18px;
    font-weight: 600;
    color: #333;
  `;
  
  const nextBtn = document.createElement('button');
  nextBtn.innerHTML = '›';
  nextBtn.style.cssText = prevBtn.style.cssText;
  
  nav.appendChild(prevBtn);
  nav.appendChild(monthYear);
  nav.appendChild(nextBtn);
  
  // Календарная сетка
  const calendarGrid = document.createElement('div');
  calendarGrid.className = 'date-picker-calendar-grid';
  calendarGrid.style.cssText = `
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
    margin-bottom: 15px;
  `;
  
  // Заголовки дней недели будут созданы в updateCalendar()
  
  // Кнопки действий
  const actions = document.createElement('div');
  actions.style.cssText = `
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  `;
  
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Отмена';
  cancelBtn.style.cssText = `
    background: #ccc;
    color: #333;
    border: none;
    border-radius: 6px;
    padding: 8px 16px;
    cursor: pointer;
    font-size: 14px;
  `;
  
  const todayBtn = document.createElement('button');
  todayBtn.textContent = 'Сегодня';
  todayBtn.style.cssText = `
    background: #4aa3ff;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 8px 16px;
    cursor: pointer;
    font-size: 14px;
  `;
  
  actions.appendChild(cancelBtn);
  actions.appendChild(todayBtn);
  
  calendarContainer.appendChild(header);
  calendarContainer.appendChild(nav);
  calendarContainer.appendChild(calendarGrid);
  calendarContainer.appendChild(actions);
  modal.appendChild(calendarContainer);
  document.body.appendChild(modal);
  
  // Текущая дата для календаря
  let currentDate = new Date();
  let selectedDate = null;
  
  // Функция обновления календаря
  function updateCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    monthYear.textContent = `${getMonthName(month)} ${year}`;
    
    // Обновляем состояние кнопки "Вперед"
    const today = new Date();
    const nextMonth = new Date(currentDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    if (nextMonth.getMonth() > today.getMonth() || nextMonth.getFullYear() > today.getFullYear()) {
      nextBtn.style.opacity = '0.5';
      nextBtn.style.cursor = 'not-allowed';
      nextBtn.disabled = true;
    } else {
      nextBtn.style.opacity = '1';
      nextBtn.style.cursor = 'pointer';
      nextBtn.disabled = false;
    }
    
    // Очищаем всю сетку (включая заголовки)
    calendarGrid.innerHTML = '';
    
    // Создаем заголовки дней недели каждый раз при обновлении
    const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    weekdays.forEach((day, index) => {
      const dayHeader = document.createElement('div');
      dayHeader.textContent = day;
      dayHeader.style.cssText = `
        text-align: center;
        font-weight: 600;
        color: #666;
        padding: 8px 4px;
        font-size: 14px;
      `;
      calendarGrid.appendChild(dayHeader);
    });
    
    // Первый день месяца и количество дней
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Находим день недели первого дня (0 = воскресенье, 1 = понедельник)
    let firstDayOfWeek = firstDay.getDay();
    firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Преобразуем в понедельник = 0
    
    // Пустые ячейки для начала месяца
    for (let i = 0; i < firstDayOfWeek; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.style.cssText = `
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      calendarGrid.appendChild(emptyCell);
    }
    
    // Дни месяца
    for (let day = 1; day <= daysInMonth; day++) {
      const dayCell = document.createElement('div');
      dayCell.className = 'calendar-day date-picker-calendar-day';
      dayCell.textContent = day;
      dayCell.style.cssText = `
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border-radius: 6px;
        font-size: 14px;
        transition: all 0.2s;
      `;
      
      const cellDate = new Date(year, month, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Стили для разных типов дней
      if (cellDate > today) {
        dayCell.style.color = '#ccc';
        dayCell.style.cursor = 'not-allowed';
      } else if (cellDate.getTime() === today.getTime()) {
        dayCell.style.background = '#4aa3ff';
        dayCell.style.color = 'white';
        dayCell.style.fontWeight = 'bold';
      } else {
        dayCell.style.color = '#333';
      }
      
      // Обработчик клика - разрешаем только прошлые даты
      if (cellDate <= today) {
        dayCell.addEventListener('click', () => {
          // Убираем выделение с предыдущего дня
          calendarGrid.querySelectorAll('.calendar-day').forEach(cell => {
            if (cell.style.background === '#ff4444') {
              cell.style.background = '';
              cell.style.color = '#333';
            }
          });
          
          // Выделяем выбранный день
          dayCell.style.background = '#ff4444';
          dayCell.style.color = 'white';
          selectedDate = cellDate;
          
          // Автоматически выбираем дату и закрываем календарь
          setTimeout(() => {
            console.log('Выбираем дату:', selectedDate);
            try {
              switchToDate(selectedDate);
              console.log('Дата успешно переключена');
            } catch (error) {
              console.error('Ошибка при переключении даты:', error);
            }
            modal.remove();
          }, 200);
        });
        
        dayCell.addEventListener('mouseenter', () => {
          if (dayCell.style.background !== '#ff4444') {
            dayCell.style.background = '#f0f0f0';
          }
        });
        
        dayCell.addEventListener('mouseleave', () => {
          if (dayCell.style.background === '#f0f0f0') {
            dayCell.style.background = '';
          }
        });
      }
      
      calendarGrid.appendChild(dayCell);
    }
  }
  
  // Функция получения названия месяца
  function getMonthName(month) {
    const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                   'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    return months[month];
  }
  
  // Обработчики событий
  prevBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    updateCalendar();
  });
  
  nextBtn.addEventListener('click', () => {
    if (!nextBtn.disabled) {
      const nextMonth = new Date(currentDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Не позволяем переходить к будущим месяцам
      if (nextMonth.getMonth() <= today.getMonth() && nextMonth.getFullYear() <= today.getFullYear()) {
        currentDate.setMonth(currentDate.getMonth() + 1);
        updateCalendar();
      }
    }
  });
  
  closeBtn.addEventListener('click', () => {
    modal.remove();
  });
  
  cancelBtn.addEventListener('click', () => {
    modal.remove();
  });
  
  todayBtn.addEventListener('click', () => {
    selectedDate = new Date();
    switchToDate(selectedDate);
    modal.remove();
  });
  
  // Клик вне календаря закрывает модальное окно
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
  
  // Инициализация календаря
  updateCalendar();
}

// Создание интерактивного календаря для выбора будущей даты
function showFutureDatePicker() {
  console.log('Показываем календарь для выбора будущей даты');
  
  // Создаем модальное окно
  const modal = document.createElement('div');
  modal.className = 'future-date-picker-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `;
  
  // Создаем контейнер календаря
  const calendarContainer = document.createElement('div');
  calendarContainer.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    max-width: 400px;
    width: 90%;
  `;
  
  // Заголовок
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 2px solid #f0f0f0;
  `;
  
  const title = document.createElement('h3');
  title.textContent = 'Выберите будущую дату';
  title.style.cssText = 'margin: 0; color: #333; font-size: 18px;';
  
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '✕';
  closeBtn.style.cssText = `
    background: #ff4444;
    color: white;
    border: none;
    border-radius: 50%;
    width: 30px;
    height: 30px;
    cursor: pointer;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  
  header.appendChild(title);
  header.appendChild(closeBtn);
  
  // Навигация по месяцам
  const nav = document.createElement('div');
  nav.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
  `;
  
  const prevBtn = document.createElement('button');
  prevBtn.innerHTML = '‹';
  prevBtn.style.cssText = `
    background: #4aa3ff;
    color: white;
    border: none;
    border-radius: 6px;
    width: 40px;
    height: 40px;
    cursor: pointer;
    font-size: 20px;
    font-weight: bold;
  `;
  
  const monthYear = document.createElement('div');
  monthYear.style.cssText = `
    font-size: 18px;
    font-weight: 600;
    color: #333;
  `;
  
  const nextBtn = document.createElement('button');
  nextBtn.innerHTML = '›';
  nextBtn.style.cssText = prevBtn.style.cssText;
  
  nav.appendChild(prevBtn);
  nav.appendChild(monthYear);
  nav.appendChild(nextBtn);
  
  // Сетка календаря
  const calendarGrid = document.createElement('div');
  calendarGrid.style.cssText = `
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
    margin-bottom: 20px;
  `;
  
  // Кнопки действий
  const actions = document.createElement('div');
  actions.style.cssText = `
    display: flex;
    justify-content: space-between;
    gap: 10px;
  `;
  
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Отмена';
  cancelBtn.style.cssText = `
    background: #ccc;
    color: #333;
    border: none;
    border-radius: 6px;
    padding: 10px 20px;
    cursor: pointer;
    font-size: 14px;
    flex: 1;
  `;
  
  const todayBtn = document.createElement('button');
  todayBtn.textContent = 'Сегодня';
  todayBtn.style.cssText = `
    background: #4aa3ff;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 10px 20px;
    cursor: pointer;
    font-size: 14px;
    flex: 1;
  `;
  
  actions.appendChild(cancelBtn);
  actions.appendChild(todayBtn);
  
  calendarContainer.appendChild(header);
  calendarContainer.appendChild(nav);
  calendarContainer.appendChild(calendarGrid);
  calendarContainer.appendChild(actions);
  modal.appendChild(calendarContainer);
  document.body.appendChild(modal);
  
  // Текущая дата для календаря (начинаем с завтрашнего дня)
  let currentDate = new Date();
  currentDate.setDate(currentDate.getDate() + 1); // Начинаем с завтра
  let selectedDate = null;
  
  // Функция обновления календаря
  function updateCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    monthYear.textContent = `${getMonthName(month)} ${year}`;
    
    // Обновляем состояние кнопки "Назад"
    const today = new Date();
    const prevMonth = new Date(currentDate);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    
    if (prevMonth.getMonth() < today.getMonth() || prevMonth.getFullYear() < today.getFullYear()) {
      prevBtn.style.opacity = '0.5';
      prevBtn.style.cursor = 'not-allowed';
      prevBtn.disabled = true;
    } else {
      prevBtn.style.opacity = '1';
      prevBtn.style.cursor = 'pointer';
      prevBtn.disabled = false;
    }
    
    // Очищаем всю сетку (включая заголовки)
    calendarGrid.innerHTML = '';
    
    // Создаем заголовки дней недели каждый раз при обновлении
    const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    weekdays.forEach((day, index) => {
      const dayHeader = document.createElement('div');
      dayHeader.textContent = day;
      dayHeader.style.cssText = `
        text-align: center;
        font-weight: 600;
        color: #666;
        padding: 8px 4px;
        font-size: 14px;
      `;
      calendarGrid.appendChild(dayHeader);
    });
    
    // Первый день месяца и количество дней
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Находим день недели первого дня (0 = воскресенье, 1 = понедельник)
    let firstDayOfWeek = firstDay.getDay();
    firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // Преобразуем в понедельник = 0
    
    // Пустые ячейки для начала месяца
    for (let i = 0; i < firstDayOfWeek; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.style.cssText = `
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      calendarGrid.appendChild(emptyCell);
    }
    
    // Дни месяца
    for (let day = 1; day <= daysInMonth; day++) {
      const dayCell = document.createElement('div');
      dayCell.className = 'calendar-day future-date-picker-calendar-day';
      dayCell.textContent = day;
      dayCell.style.cssText = `
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border-radius: 6px;
        font-size: 14px;
        transition: all 0.2s;
      `;
      
      const cellDate = new Date(year, month, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Стили для разных типов дней
      if (cellDate <= today) {
        dayCell.style.color = '#ccc';
        dayCell.style.cursor = 'not-allowed';
      } else if (cellDate.getTime() === today.getTime()) {
        dayCell.style.background = '#4aa3ff';
        dayCell.style.color = 'white';
        dayCell.style.fontWeight = 'bold';
      } else {
        dayCell.style.color = '#333';
      }
      
      // Обработчик клика - разрешаем только будущие даты
      if (cellDate > today) {
        dayCell.addEventListener('click', () => {
          // Убираем выделение с предыдущего дня
          calendarGrid.querySelectorAll('.calendar-day').forEach(cell => {
            if (cell.style.background === '#28a745') {
              cell.style.background = '';
              cell.style.color = '#333';
            }
          });
          
          // Выделяем выбранный день
          dayCell.style.background = '#28a745';
          dayCell.style.color = 'white';
          selectedDate = cellDate;
          
          // Автоматически выбираем дату и закрываем календарь
          setTimeout(() => {
            console.log('Выбираем будущую дату:', selectedDate);
            try {
              switchToDate(selectedDate);
              console.log('Будущая дата успешно переключена');
            } catch (error) {
              console.error('Ошибка при переключении будущей даты:', error);
            }
            modal.remove();
          }, 200);
        });
        
        dayCell.addEventListener('mouseenter', () => {
          if (dayCell.style.background !== '#28a745') {
            dayCell.style.background = '#f0f0f0';
          }
        });
        
        dayCell.addEventListener('mouseleave', () => {
          if (dayCell.style.background === '#f0f0f0') {
            dayCell.style.background = '';
          }
        });
      }
      
      calendarGrid.appendChild(dayCell);
    }
  }
  
  // Функция получения названия месяца
  function getMonthName(month) {
    const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                   'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    return months[month];
  }
  
  // Обработчики событий
  prevBtn.addEventListener('click', () => {
    if (!prevBtn.disabled) {
      const prevMonth = new Date(currentDate);
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Не позволяем переходить к прошлым месяцам
      if (prevMonth.getMonth() >= today.getMonth() && prevMonth.getFullYear() >= today.getFullYear()) {
        currentDate.setMonth(currentDate.getMonth() - 1);
        updateCalendar();
      }
    }
  });
  
  nextBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    updateCalendar();
  });
  
  closeBtn.addEventListener('click', () => {
    modal.remove();
  });
  
  cancelBtn.addEventListener('click', () => {
    modal.remove();
  });
  
  todayBtn.addEventListener('click', () => {
    selectedDate = new Date();
    switchToDate(selectedDate);
    modal.remove();
  });
  
  // Клик вне календаря закрывает модальное окно
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
  
  // Инициализация календаря
  updateCalendar();
}

// Добавить индикатор текущего времени
function addCurrentTimeIndicator() {
  // Убираем предыдущий индикатор
  const existingIndicator = document.querySelector('.current-time-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }
  
  // Используем московское время (вызываем только один раз)
  const moscowTime = getMoscowTime();
  const currentHour = moscowTime.getHours();
  const currentMinute = moscowTime.getMinutes();
  const currentMinutes = currentHour * 60 + currentMinute;
  
  // Скрываем красную полоску, если время больше 22:00
  if (currentHour >= 22) {
    return;
  }
  
  // Проверяем, что активная дата - это сегодняшний день (используем уже полученное московское время)
  const moscowToday = new Date(moscowTime);
  moscowToday.setHours(0, 0, 0, 0);
  
  // Используем локальную дату вместо UTC для сравнения
  const activeDate = new Date(currentDisplayDate);
  activeDate.setHours(0, 0, 0, 0);
  
  // console.log('DEBUG: Проверка дат (московское время):', {
  //   moscowToday: moscowToday.toLocaleDateString(),
  //   activeDate: activeDate.toLocaleDateString(),
  //   currentDisplayDate: currentDisplayDate.toLocaleDateString(),
  //   isToday: moscowToday.toDateString() === activeDate.toDateString()
  // });
  
  if (moscowToday.toDateString() !== activeDate.toDateString()) {
    return; // Не показываем индикатор для других дней
  }
  
  // Находим все слоты на активную дату (которая уже проверена как сегодняшняя)
  const slots = Array.from(allSlotsEl.querySelectorAll('li.slot'));
  const activeDateSlots = slots.filter(slot => {
    const slotDate = slot.dataset.date;
    const year = currentDisplayDate.getFullYear();
    const month = String(currentDisplayDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDisplayDate.getDate()).padStart(2, '0');
    const activeDateStr = `${year}-${month}-${day}`;
    return slotDate === activeDateStr;
  });
  
  // Фильтруем только видимые слоты
  const visibleSlots = activeDateSlots.filter(slot => {
    const computedStyle = window.getComputedStyle(slot);
    return computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden';
  });
  
  // console.log('DEBUG: Найдено слотов на активную дату:', activeDateSlots.length);
  // console.log('DEBUG: Видимых слотов:', visibleSlots.length);
  // console.log('DEBUG: Все слоты:', activeDateSlots.map(s => s.dataset.start + '-' + s.dataset.end));
  // console.log('DEBUG: Видимые слоты:', visibleSlots.map(s => s.dataset.start + '-' + s.dataset.end));
  
  // console.log('DEBUG: Найдено слотов на активную дату:', activeDateSlots.length);
  // console.log('DEBUG: Слоты:', activeDateSlots.map(slot => ({
  //   date: slot.dataset.date,
  //   start: slot.dataset.start,
  //   end: slot.dataset.end,
  //   isEventSlot: slot.classList.contains('event-slot'),
  //   subject: slot.textContent || 'Нет события'
  // })));
  
  if (activeDateSlots.length === 0) return;
  
  // Находим слот, который соответствует текущему времени
  let targetSlot = null;
  let insertAfter = null;
  
  for (let i = 0; i < visibleSlots.length; i++) {
    const slot = visibleSlots[i];
    const slotStart = slot.dataset.start;
    const slotEnd = slot.dataset.end;
    
    const [startHour, startMinute] = slotStart.split(':').map(Number);
    const [endHour, endMinute] = slotEnd.split(':').map(Number);
    
    const slotStartMinutes = startHour * 60 + startMinute;
    const slotEndMinutes = endHour * 60 + endMinute;
    
    // console.log('DEBUG: Проверяем слот:', {
    //   slot: `${slotStart}-${slotEnd}`,
    //   slotStartMinutes,
    //   slotEndMinutes,
    //   currentMinutes,
    //   isOccupied: slot.classList.contains('event-slot'),
    //   isInSlot: currentMinutes >= slotStartMinutes && currentMinutes < slotEndMinutes,
    //   slotStartParsed: `${startHour}:${startMinute}`,
    //   slotEndParsed: `${endHour}:${endMinute}`,
    //   currentTimeParsed: `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`
    // });
    
    // Если текущее время попадает в этот слот
    if (currentMinutes >= slotStartMinutes && currentMinutes < slotEndMinutes) {
      // Приоритизируем занятые слоты (события) над свободными
      if (slot.classList.contains('event-slot')) {
        targetSlot = slot;
        console.log('🎯 Выбран занятый слот (событие):', slot.dataset.start + '-' + slot.dataset.end);
        break;
      } else if (!targetSlot) {
        // Если это свободный слот и мы еще не нашли занятый
        targetSlot = slot;
        console.log('📅 Выбран свободный слот:', slot.dataset.start + '-' + slot.dataset.end);
      }
    }
    
    // Если текущее время еще не наступило
    if (currentMinutes < slotStartMinutes) {
      insertAfter = slot;
      break;
    }
  }
  
  // Если точного попадания нет, ищем ближайший слот для вставки
  if (!targetSlot && !insertAfter) {
    console.log('DEBUG: Точного попадания нет, ищем ближайший слот для вставки');
    
    // Находим ближайший слот по времени
    let closestSlot = null;
    let minDistance = Infinity;
    
    for (const slot of visibleSlots) {
      const slotStart = slot.dataset.start;
      const [startHour, startMinute] = slotStart.split(':').map(Number);
      const slotStartMinutes = startHour * 60 + startMinute;
      const distance = Math.abs(currentMinutes - slotStartMinutes);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestSlot = slot;
      }
    }
    
    if (closestSlot) {
      console.log('DEBUG: Найден ближайший слот:', closestSlot.dataset.start + '-' + closestSlot.dataset.end);
      targetSlot = closestSlot;
    }
  }
  
  console.log('DEBUG: Результат поиска слота:', {
    targetSlot: targetSlot ? `${targetSlot.dataset.start}-${targetSlot.dataset.end}` : 'null',
    insertAfter: insertAfter ? `${insertAfter.dataset.start}-${insertAfter.dataset.end}` : 'null',
    currentMinutes,
    totalSlots: activeDateSlots.length,
    targetSlotSubject: targetSlot ? (targetSlot.textContent || 'Нет события') : 'null'
  });
  
  // Создаем индикатор
  const indicator = document.createElement('div');
  indicator.className = 'current-time-indicator';
  indicator.style.cssText = `
    position: absolute;
    left: 0;
    right: 0;
    height: 2px;
    background: #ff4444;
    z-index: 1000;
    pointer-events: none;
    box-shadow: 0 0 4px rgba(255, 68, 68, 0.5);
  `;
  
  // Добавляем время к индикатору
  const timeLabel = document.createElement('span');
  const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
  
  // Определяем, что показывать в индикаторе
  let displayText = currentTimeStr;
  let hoverTitle = '';
  
  console.log('DEBUG: Логика отображения индикатора:', {
    targetSlot: targetSlot ? `${targetSlot.dataset.start}-${targetSlot.dataset.end}` : 'null',
    currentTimeStr,
    isInOccupiedSlot: targetSlot ? targetSlot.classList.contains('event-slot') : false
  });
  
  if (targetSlot && targetSlot.classList.contains('event-slot')) {
    // Если время попадает в занятый слот - показываем только время
    displayText = currentTimeStr;
    hoverTitle = 'Текущее время';
    console.log('DEBUG: В занятом слоте - показываем время:', displayText);
  } else if (targetSlot) {
    // Если время попадает в свободный слот - показываем время до следующего события
    // console.log('DEBUG: Поиск следующего события для свободного слота...');
    const nextEvent = findNextEvent(activeDateSlots, currentHour, currentMinute);
    // console.log('DEBUG: Найденное следующее событие:', nextEvent ? `${nextEvent.dataset.start}-${nextEvent.dataset.end}` : 'null');
    
    if (nextEvent) {
      const timeToNextData = calculateTimeToNextEvent(nextEvent, currentHour, currentMinute);
      console.log('DEBUG: Данные о времени до события:', timeToNextData);
      
      if (timeToNextData) {
        displayText = timeToNextData.shortText;
        hoverTitle = timeToNextData.fullEventName;
        console.log('DEBUG: В свободном слоте - показываем время до события:', displayText);
      } else {
        displayText = currentTimeStr;
        hoverTitle = 'Текущее время';
        console.log('DEBUG: В свободном слоте - нет данных о следующем событии');
      }
    } else {
      displayText = currentTimeStr;
      hoverTitle = 'Текущее время';
      console.log('DEBUG: В свободном слоте - нет следующего события');
    }
  }
  
  // Создаем и отображаем индикатор
  console.log('DEBUG: Финальный текст индикатора:', displayText);
  console.log('DEBUG: Hover title:', hoverTitle);
  
  timeLabel.textContent = displayText;
  timeLabel.title = hoverTitle;
  console.log('DEBUG: Установлен title атрибут:', timeLabel.title);
  timeLabel.style.cssText = `
    position: absolute;
    right: 8px;
    top: -8px;
    background: #ff4444;
    color: white;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 0.7em;
    font-weight: bold;
  `;
  indicator.appendChild(timeLabel);
  
  if (targetSlot) {
    // Если время попадает в существующий слот - позиционируем точно внутри слота
    const slotStart = targetSlot.dataset.start;
    const slotEnd = targetSlot.dataset.end;
    const [startHour, startMinute] = slotStart.split(':').map(Number);
    const [endHour, endMinute] = slotEnd.split(':').map(Number);
    
    const slotStartMinutes = startHour * 60 + startMinute;
    const slotEndMinutes = endHour * 60 + endMinute;
    const currentMinutes = currentHour * 60 + currentMinute;
    
    // Простое вычисление прогресса
    const elapsedMinutes = currentMinutes - slotStartMinutes;
    const totalMinutes = slotEndMinutes - slotStartMinutes;
    const progress = totalMinutes > 0 ? elapsedMinutes / totalMinutes : 0;
    
    console.log('🔍 ПРОСТОЕ ВЫЧИСЛЕНИЕ ПРОГРЕССА:', {
      slot: `${slotStart}-${slotEnd}`,
      currentTime: `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`,
      slotStartMinutes,
      slotEndMinutes,
      currentMinutes,
      elapsedMinutes,
      totalMinutes,
      progress: Math.round(progress * 100) + '%',
      progressDecimal: progress
    });
    
    // Проверяем корректность вычислений
    if (progress < 0 || progress > 1) {
      console.error('❌ ОШИБКА: Некорректный прогресс!', {
        progress,
        elapsedMinutes,
        totalMinutes,
        currentMinutes,
        slotStartMinutes,
        slotEndMinutes
      });
      return; // Не показываем индикатор при некорректных данных
    }
    
    const slotHeight = targetSlot.offsetHeight;
    const slotTop = targetSlot.offsetTop;
    const indicatorTop = slotTop + (progress * slotHeight);
    
    console.log('DEBUG: Точное позиционирование в слоте:', {
      targetSlot: targetSlot.dataset.start + '-' + targetSlot.dataset.end,
      currentMinutes,
      slotStartMinutes,
      slotEndMinutes,
      progress: Math.round(progress * 100) + '%',
      slotHeight,
      indicatorTop,
      currentTime: `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`,
      slotDuration: slotEndMinutes - slotStartMinutes,
      elapsedMinutes: currentMinutes - slotStartMinutes
    });
    
    indicator.style.top = `${indicatorTop}px`;
    indicator.style.position = 'absolute';
    allSlotsEl.appendChild(indicator);
    
    console.log('✅ ИНДИКАТОР ДОБАВЛЕН:', {
      targetSlot: `${targetSlot.dataset.start}-${targetSlot.dataset.end}`,
      indicatorTop: `${indicatorTop}px`,
      slotHeight: slotHeight,
      progress: Math.round(progress * 100) + '%',
      currentTime: currentTimeStr
    });
  } else if (insertAfter) {
    // Если время еще не наступило, вставляем перед первым будущим слотом
    console.log('DEBUG: Индикатор перед слотом:', insertAfter.dataset.start + '-' + insertAfter.dataset.end);
    insertAfter.parentNode.insertBefore(indicator, insertAfter);
    indicator.style.position = 'relative';
    indicator.style.marginBottom = '2px';
  } else {
    // Если время уже прошло, добавляем в конец
    console.log('DEBUG: Индикатор в конце');
    allSlotsEl.appendChild(indicator);
    indicator.style.position = 'relative';
    indicator.style.marginTop = '2px';
  }
}

// Скрыть занятые слоты
function hideOccupiedSlots() {
  const slots = Array.from(allSlotsEl.querySelectorAll('li.slot'));
  
  slots.forEach(slot => {
    const slotDate = slot.dataset.date;
    const slotStart = slot.dataset.start;
    const slotEnd = slot.dataset.end;
    
    // Не скрываем слоты, которые уже содержат события
    if (slot.classList.contains('event-slot')) {
      slot.style.display = '';
      slot.classList.remove('occupied-slot');
      return;
    }
    
    // Проверяем, занят ли слот событием (включая будущие)
    const isOccupied = isSlotOccupied(slotDate, slotStart, slotEnd);
    
    if (isOccupied) {
      slot.style.display = 'none';
      slot.classList.add('occupied-slot');
    } else {
      slot.style.display = '';
      slot.classList.remove('occupied-slot');
    }
  });
  
  // Дополнительно: убеждаемся, что все события отображаются с правильными размерами
  mockEvents.forEach(event => {
    const eventStart = createMoscowDate(event.start);
    const eventEnd = createMoscowDate(event.end);
    const eventDate = eventStart.toISOString().slice(0, 10);
    
    // Находим слоты для этого события
    const eventSlots = Array.from(allSlotsEl.querySelectorAll('li')).filter(slot => {
      const slotDate = slot.dataset.date;
      if (slotDate !== eventDate) return false;
      
      const [y, mo, d] = slotDate.split('-').map(Number);
      const [sh, sm] = slot.dataset.start.split(':').map(Number);
      const [eh, em] = slot.dataset.end.split(':').map(Number);
      
      const slotStart = new Date(y, mo-1, d, sh, sm, 0, 0);
      const slotEnd = new Date(y, mo-1, d, eh, em, 0, 0);
      
      return (slotEnd > eventStart && slotStart < eventEnd);
    });
    
    if (eventSlots.length > 0) {
      const firstSlot = eventSlots[0];
      
      // Убеждаемся, что слот отображается
      firstSlot.style.display = '';
      firstSlot.classList.remove('occupied-slot');
      
      // Применяем правильный класс длительности
      const durationMinutes = (eventEnd - eventStart) / (1000 * 60);
      
      // Убираем все классы длительности
      firstSlot.classList.remove('event-duration-15min', 'event-duration-30min', 'event-duration-45min', 'event-duration-60min', 'event-duration-long');
      
      // Добавляем правильный класс
      if (durationMinutes <= 15) {
        firstSlot.classList.add('event-duration-15min');
      } else if (durationMinutes <= 30) {
        firstSlot.classList.add('event-duration-30min');
      } else if (durationMinutes <= 45) {
        firstSlot.classList.add('event-duration-45min');
      } else if (durationMinutes <= 60) {
        firstSlot.classList.add('event-duration-60min');
      } else {
        firstSlot.classList.add('event-duration-long');
      }
    }
  });
}

// Функция для вычисления времени с начала встречи
function getTimeSinceMeetingStart() {
  if (!meetingStartTime) return '';
  const now = getMoscowTime();
  const diff = now - meetingStartTime; // миллисекунды
  const totalMinutes = Math.floor(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  // Всегда начинаем с 00:00 минут, независимо от времени начала встречи
  // Например, если встреча началась в 13:30, а прошло 15 минут, показываем 00:15
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  } else {
    return `00:${String(minutes).padStart(2, '0')}`;
  }
}

// =======================
// Функции для управления секциями
// =======================
function toggleSection(sectionId) {
  const section = document.getElementById(sectionId);
  const toggle = section.previousElementSibling.querySelector('.section-toggle');
  
  if (section.classList.contains('collapsed')) {
    section.classList.remove('collapsed');
    toggle.classList.remove('collapsed');
  } else {
    section.classList.add('collapsed');
    toggle.classList.add('collapsed');
  }
}

// =======================
// Функции для OpenQuestions
// =======================
function showOpenQuestionsModal() {
  const modal = document.createElement('div');
  modal.className = 'openquestions-modal';
  modal.innerHTML = `
    <div class="openquestions-modal-content" style="padding: 30px;">
      <h3>Open Questions</h3>
      <div id="openquestions-content"></div>
      <div class="openquestions-modal-buttons">
        <button class="openquestions-modal-btn secondary" onclick="closeOpenQuestionsModal()">Закрыть</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Собираем данные
  collectOpenQuestionsData();
  
  // Обработчик клика вне модального окна
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeOpenQuestionsModal();
    }
  });
}

// Функция для извлечения тегов из текста заметки
function extractTagsFromText(text, availableStreams) {
  if (!text || typeof text !== 'string') return [];
  
  const tags = [];
  const tagRegex = /#(\w+)/g;
  let match;
  
  while ((match = tagRegex.exec(text)) !== null) {
    const tagName = match[1];
    // Добавляем тег только если он существует в API streams
    if (availableStreams && availableStreams.includes(tagName)) {
      tags.push(tagName);
    }
  }
  
  return tags;
}

async function collectOpenQuestionsData() {
  console.log('🔄 Загружаем данные для модалки OPEN QUESTIONS: SUMMARY...');
  const contentEl = document.getElementById('openquestions-content');
  if (!contentEl) {
    console.error('❌ Элемент openquestions-content не найден!');
    return;
  }
  
  try {
    // Загружаем актуальный список streams из API
    console.log('📡 Загружаем актуальный список streams из API...');
    const streamsResponse = await fetch('/api/streams/stats');
    console.log('📡 Streams response status:', streamsResponse.status);
    const streamsData = streamsResponse.ok ? await streamsResponse.json() : { streams: [] };
    const allStreams = streamsData.streams || [];
    console.log('✅ Загружено streams для модалки:', allStreams.length, 'шт:', allStreams);
    
    // Получаем все события из API
    console.log('📡 Загружаем события из API...');
    const eventsResponse = await fetch('/api/events');
    console.log('📡 Events response status:', eventsResponse.status);
    const events = eventsResponse.ok ? await eventsResponse.json() : [];
    console.log('✅ Загружено событий:', events.length);
    
    const openQuestions = [];
    const notesQuestions = [];
    
    // Загружаем Open Questions из базы данных
    console.log('📡 Загружаем Open Questions из базы данных...');
    const questionsResponse = await fetch('/api/open-questions');
    console.log('📡 Questions response status:', questionsResponse.status);
    let dbQuestions = [];
    if (questionsResponse.ok) {
      dbQuestions = await questionsResponse.json();
      console.log('✅ Загружено вопросов из БД:', dbQuestions.length);
    } else {
      console.log('❌ Ошибка загрузки вопросов из БД:', questionsResponse.status);
    }
    
    // Добавляем вопросы из базы данных
    const addedQuestionIds = new Set(); // Отслеживаем добавленные ID
    console.log(`🔍 Обрабатываем ${dbQuestions.length} вопросов из базы данных`);
    dbQuestions.forEach(question => {
      console.log(`🔍 Проверяем вопрос из БД: ID=${question.id}, текст="${question.question_text}", stream="${question.stream}", person="${question.person}"`);
      console.log(`🔍 Полный объект вопроса:`, question);
      console.log(`🔍 Тип question.question_text: ${typeof question.question_text}, значение: "${question.question_text}"`);
      if (question.question_text && question.question_text.trim()) {
        // Используем stream (topic) если есть, иначе используем "General" как fallback
        console.log(`🔍 DEBUG: question.stream = "${question.stream}", question.topic = "${question.topic}"`);
        const stream = question.stream && question.stream.trim() && question.stream !== 'None' ? question.stream.trim() : 
                      (question.topic && question.topic.trim() && question.topic !== 'None' ? question.topic.trim() : 'General');
        console.log(`🔍 DEBUG: final stream = "${stream}"`);
        // Находим название встречи по event_id
        let eventName = 'Из базы данных';
        if (question.event_id) {
          const event = events.find(e => e.id === question.event_id);
          if (event && event.subject) {
            eventName = event.subject;
          }
        }
        
        // Находим событие для получения даты создания
        const event = events.find(e => e.id === question.event_id);
        const eventCreatedDate = event ? event.created_at : null;
        
        const questionData = {
          id: question.id,
          question: question.question_text.trim(),
          question_text: question.question_text.trim(), // Добавляем для совместимости с API
          event: eventName, // Используем название встречи вместо "Из базы данных"
          eventId: question.event_id,
          event_id: question.event_id, // Добавляем для совместимости с API
          date: eventCreatedDate ? new Date(eventCreatedDate).toLocaleDateString('ru-RU') : (question.created_at ? new Date(question.created_at).toLocaleDateString('ru-RU') : 'Дата не указана'),
          eventStart: eventCreatedDate || question.created_at,
          time: question.time,
          person: question.person,
          stream: stream,
          type: 'database',
          is_resolved: question.is_resolved || false,
          resolved_at: question.resolved_at,
          important: question.important || false,
          asap: question.asap || false
        };
        
        console.log(`🔍 Создан questionData:`, questionData);
        console.log(`🔍 questionData.question: "${questionData.question}", questionData.person: "${questionData.person}"`);
        notesQuestions.push(questionData);
        addedQuestionIds.add(question.id); // Запоминаем добавленный ID
        console.log(`✅ Добавлен вопрос из БД:`, questionData);
      } else {
        console.log(`❌ Пропускаем вопрос из БД: неполные данные`);
      }
    });
    console.log(`📊 Итого добавлено из БД: ${addedQuestionIds.size} вопросов`);
    
    // НОВАЯ ЛОГИКА: НЕ создаем вопросы из заметок - только загружаем из базы данных
    console.log('ℹ️ Пропускаем создание вопросов из заметок - теперь они создаются через API при нажатии ASAP/IMP');
    
    events.forEach(event => {
        
        // НЕ добавляем actual_open_questions - только явно созданные вопросы из базы данных
        console.log(`ℹ️ Пропускаем actual_open_questions для события "${event.subject}" - показываем только вопросы из базы данных`);
        
        // НЕ добавляем обычные заметки из open_questions - только явно созданные открытые вопросы
        // Обычные заметки должны становиться открытыми вопросами через кнопку
        console.log(`ℹ️ Пропускаем обычные заметки из event.open_questions для события "${event.subject}" - они не являются открытыми вопросами`);
    });
    
    // Отображаем собранные данные с актуальным списком streams
    console.log('📊 Собрано вопросов:', openQuestions.length, 'из actual_open_questions (исключены)');
    console.log('📊 Собрано вопросов:', notesQuestions.length, 'из базы данных (open_questions)');
    
    // Добавляем "General" в streams если его нет
    if (!allStreams.includes('General')) {
      allStreams.push('General');
    }
    
    console.log('📊 Всего streams для отображения:', allStreams.length);
    
    // Дополнительная проверка: сравниваем streams из API с streams из событий
    const eventStreams = new Set();
    events.forEach(event => {
      if (event.stream && Array.isArray(event.stream)) {
        event.stream.forEach(stream => {
          if (stream && stream.trim()) {
            eventStreams.add(stream.trim());
          }
        });
      }
    });
    
    const eventStreamsArray = Array.from(eventStreams);
    console.log('📊 Streams из событий:', eventStreamsArray.length, 'шт:', eventStreamsArray);
    console.log('📊 Streams из API:', allStreams.length, 'шт:', allStreams);
    
    // Проверяем, что все streams из событий есть в API
    const missingInAPI = eventStreamsArray.filter(stream => !allStreams.includes(stream));
    if (missingInAPI.length > 0) {
      console.warn('⚠️ Streams из событий отсутствуют в API:', missingInAPI);
    } else {
      console.log('✅ Все streams из событий присутствуют в API');
    }
    
    displayOpenQuestionsData(allStreams, openQuestions, notesQuestions, events);
    
  } catch (err) {
    console.error('❌ Ошибка при загрузке данных:', err);
    console.error('❌ Stack trace:', err.stack);
    contentEl.innerHTML = `<div class="openquestions-empty">Ошибка при загрузке данных: ${err.message}</div>`;
  }
}

function displayOpenQuestionsData(streams, openQuestions, notesQuestions, events = []) {
  console.log('🎨 Отображаем данные модалки OPEN QUESTIONS: SUMMARY...');
  console.log('📋 Streams для облака тегов:', streams);
  console.log('📋 Events для проверки использования тегов:', events.length);
  
  // Сохраняем данные в глобальные переменные для фильтрации
  // Сортируем streams по времени последнего поиска (самые недавние первыми)
  window.sortedStreams = streams
    .filter(s => s.name && s.name.trim())
    .sort((a, b) => {
      // Если у обоих есть last_searched_at, сортируем по убыванию (новые первыми)
      if (a.last_searched_at && b.last_searched_at) {
        return new Date(b.last_searched_at) - new Date(a.last_searched_at);
      }
      // Если только у одного есть last_searched_at, он идет первым
      if (a.last_searched_at && !b.last_searched_at) return -1;
      if (!a.last_searched_at && b.last_searched_at) return 1;
      // Если у обоих нет last_searched_at, сортируем по имени
      return a.name.localeCompare(b.name);
    });
  
  allStreamsData = window.sortedStreams.map(s => s.name); // Извлекаем названия в правильном порядке
  allStreamsMap = {}; // Создаем маппинг названий к ID
  window.sortedStreams.forEach(s => {
    allStreamsMap[s.name] = s.id;
  });
  
  console.log('🔍 DEBUG: allStreamsMap создан:', allStreamsMap);
  console.log('🔍 DEBUG: allStreamsData создан:', allStreamsData);
  allOpenQuestionsData = openQuestions;
  allNotesQuestionsData = notesQuestions;
  allEventsData = events; // Сохраняем события
  
  // Отображаем данные с учетом текущего фильтра
  renderOpenQuestionsModal();
}

// Функция для рендеринга модального окна с учетом фильтра
function renderOpenQuestionsModal() {
  console.log('🎨 Рендерим модальное окно с учетом фильтра...');
  const contentEl = document.getElementById('openquestions-content');
  if (!contentEl) {
    console.error('❌ Элемент openquestions-content не найден в renderOpenQuestionsModal!');
    return;
  }
  
  let html = '';
  
  // Объединенная секция вопросов в виде таблицы
  // Собираем все вопросы в один массив
  const allQuestions = [];
  
  // Применяем фильтр к данным
  let filteredOpenQuestions = allOpenQuestionsData;
  let filteredNotesQuestions = allNotesQuestionsData;
  
  if (currentStreamFilter) {
    console.log('🔍 Применяем фильтр по Stream:', currentStreamFilter);
    // Фильтруем вопросы из Actual open questions
    filteredOpenQuestions = allOpenQuestionsData.filter(q => {
      return q.stream === currentStreamFilter;
    });
    
    // Фильтруем вопросы из заметок
    filteredNotesQuestions = allNotesQuestionsData.filter(q => {
      return q.stream === currentStreamFilter;
    });
  }
  
  // Добавляем вопросы из Actual open questions
  filteredOpenQuestions.forEach(q => {
    // Пробуем сначала event.start, потом event.start_time
    let eventDate;
    if (q.eventStart && !isNaN(new Date(q.eventStart).getTime())) {
      eventDate = new Date(q.eventStart);
    } else if (q.date && !isNaN(new Date(q.date).getTime())) {
      eventDate = new Date(q.date);
    } else {
      eventDate = null;
    }
    
    const date = eventDate ? eventDate.toLocaleDateString('ru-RU') : 'Дата не указана';
    allQuestions.push({
      type: 'actual',
      stream: q.stream || q.event, // Используем stream из данных, fallback на название встречи
      meeting: q.event, // Название встречи
      eventId: q.eventId, // ID события для перехода
      question: q.text,
      date: date,
      resolved: false,
      id: null,
      important: false, // Actual questions пока не поддерживают important/asap
      asap: false
    });
  });
  
  // Добавляем вопросы из заметок
  filteredNotesQuestions.forEach(q => {
    // Пробуем сначала event.start, потом event.start_time
    let eventDate;
    if (q.eventStart && !isNaN(new Date(q.eventStart).getTime())) {
      eventDate = new Date(q.eventStart);
    } else if (q.date && !isNaN(new Date(q.date).getTime())) {
      eventDate = new Date(q.date);
    } else {
      eventDate = null;
    }
    
    const date = eventDate ? eventDate.toLocaleDateString('ru-RU') : 'Дата не указана';
    
    // Для вопросов из базы данных НЕ добавляем metadata, так как person и topic уже сохранены отдельно
    let questionText = q.question;
    if (q.type === 'database') {
      // Для вопросов из БД используем чистый текст без добавления person
      questionText = q.question;
    } else {
      // Для вопросов из заметок добавляем metadata
      let metadata = '';
      if (q.time) metadata += `[${q.time}] `;
      if (q.person) metadata += `${q.person} `;
      questionText = `${metadata}${q.question}`;
    }
    
    allQuestions.push({
      type: q.type || 'notes', // Используем тип из данных
      stream: q.stream || q.event, // Используем stream из базы данных, fallback на название встречи
      meeting: q.event, // Название встречи
      eventId: q.eventId, // ID события для перехода
      question: questionText,
      date: date,
      resolved: q.is_resolved || false,
      resolved_at: q.resolved_at,
      id: q.id,
      important: q.important || false,
      asap: q.asap || false,
      person: q.person // Добавляем person отдельно для отображения в колонке "Кто"
    });
  });
  
  // Разделяем на нерешенные и решенные
  const unresolvedQuestions = allQuestions.filter(q => !q.resolved);
  const resolvedQuestions = allQuestions.filter(q => q.resolved);
  
  // Сортируем решенные вопросы по дате решения (последние решенные сверху)
  resolvedQuestions.sort((a, b) => {
    // Используем resolved_at если есть, иначе created_at
    const dateA = a.resolved_at ? new Date(a.resolved_at) : new Date(a.date.split('.').reverse().join('-'));
    const dateB = b.resolved_at ? new Date(b.resolved_at) : new Date(b.date.split('.').reverse().join('-'));
    return dateB - dateA; // Новые даты сначала (последние решенные сверху)
  });
  
  // Сортируем нерешенные вопросы по приоритету:
  // 1. Оба флага (Important + ASAP)
  // 2. Только ASAP
  // 3. Только Important
  // 4. По дате (старые сначала)
  unresolvedQuestions.sort((a, b) => {
    // Приоритет 1: Оба флага (Important + ASAP)
    const aBothFlags = a.important && a.asap;
    const bBothFlags = b.important && b.asap;
    if (aBothFlags && !bBothFlags) return -1;
    if (!aBothFlags && bBothFlags) return 1;
    
    // Приоритет 2: Только ASAP
    const aAsapOnly = a.asap && !a.important;
    const bAsapOnly = b.asap && !b.important;
    if (aAsapOnly && !bAsapOnly) return -1;
    if (!aAsapOnly && bAsapOnly) return 1;
    
    // Приоритет 3: Только Important
    const aImportantOnly = a.important && !a.asap;
    const bImportantOnly = b.important && !b.asap;
    if (aImportantOnly && !bImportantOnly) return -1;
    if (!aImportantOnly && bImportantOnly) return 1;
    
    // Приоритет 4: По дате (старые сначала)
    return new Date(a.date.split('.').reverse().join('-')) - new Date(b.date.split('.').reverse().join('-'));
  });
  
  // Собираем уникальные streams из всех вопросов
  const usedStreams = [...new Set(allQuestions.map(q => q.stream).filter(Boolean))];
  
  // Секция Streams - показываем все теги из событий и открытых вопросов
  html += '<div class="openquestions-section">';
  html += '<h4>Streams: summary</h4>';
  if (allStreamsData && allStreamsData.length > 0) {
    console.log('🏷️ Создаем облако тегов streams:', allStreamsData);
    
    // Собираем все используемые теги из событий и заметок
    const usedStreams = new Set();
    
    // Добавляем теги из событий
    if (allEventsData && allEventsData.length > 0) {
      console.log('🔍 Проверяем использование тегов в событиях:', allEventsData.length);
      allEventsData.forEach(event => {
        if (event.stream && Array.isArray(event.stream)) {
          event.stream.forEach(stream => {
            if (stream && stream.trim()) {
              usedStreams.add(stream.trim());
              console.log('✅ Найден используемый тег в событии:', stream.trim(), 'в событии:', event.subject);
            }
          });
        }
      });
    }
    
    // Добавляем теги из заметок (из actual_open_questions)
    if (allEventsData && allEventsData.length > 0) {
      console.log('🔍 Проверяем использование тегов в actual_open_questions');
      allEventsData.forEach(event => {
        if (event.actual_open_questions && event.actual_open_questions.trim()) {
          const extractedTags = extractTagsFromText(event.actual_open_questions, allStreamsData);
          extractedTags.forEach(tag => {
            usedStreams.add(tag);
            console.log('✅ Найден используемый тег в actual_open_questions:', tag, 'в событии:', event.subject);
          });
        }
      });
    }
    
    // Добавляем теги из заметок с кнопками ASAP/IMP
    allNotesQuestionsData.forEach(question => {
      if (question.extractedTags && Array.isArray(question.extractedTags)) {
        question.extractedTags.forEach(tag => {
          usedStreams.add(tag);
        });
      }
      if (question.stream) {
        usedStreams.add(question.stream);
      }
    });
    
    console.log('🏷️ Используемые теги:', Array.from(usedStreams));
    console.log('🏷️ Всего тегов для проверки:', allStreamsData.length);
    
    html += '<div class="streams-tags">';
    (window.sortedStreams || []).forEach(stream => {
      console.log('🏷️ Добавляем stream в облако тегов:', stream.name);
      const isActive = currentStreamFilter === stream.name;
      const activeClass = isActive ? ' active' : '';
      const isUsed = usedStreams.has(stream.name);
      const unusedClass = !isUsed ? ' unused-tag' : '';
      
      // Проверяем, является ли тег устаревшим (не использовался больше 12 часов)
      let staleClass = '';
      if (stream.last_searched_at) {
        const lastSearchDate = new Date(stream.last_searched_at);
        const now = new Date();
        const diffMs = now - lastSearchDate;
        const diffHours = diffMs / (1000 * 60 * 60);
        
        if (diffHours > 12) {
          staleClass = ' stale-tag';
        }
      } else {
        // Если тег никогда не искался, считаем его устаревшим
        staleClass = ' stale-tag';
      }
      
      console.log(`🏷️ Тег "${stream.name}": используется=${isUsed}, класс=${unusedClass}, устаревший=${staleClass !== ''}`);
      const title = isActive ? 'Клик: сбросить фильтр, Двойной клик: все встречи' : 
                   !isUsed ? 'Тег не используется ни в одном событии или заметке' :
                   staleClass ? 'Тег не использовался больше 12 часов' :
                   'Клик: открытые вопросы, Двойной клик: все встречи';
      html += `<span class="stream-tag clickable${activeClass}${unusedClass}${staleClass}" onclick="handleStreamTagClick('${stream.name}')" ondblclick="handleStreamTagDoubleClick('${stream.name}')" oncontextmenu="handleStreamTagRightClick(event, '${stream.name}', ${isUsed})" title="${title}">${stream.name}</span>`;
    });
    html += '</div>';
  } else {
    console.log('⚠️ Нет streams для отображения в облаке тегов');
    html += '<div class="openquestions-empty">Нет активных Streams</div>';
  }
  html += '</div>';
  // Section for creating new Open Question
  html += '<div class="openquestions-section">';
  html += '<h4>Create open question</h4>';
  html += '<div class="new-question-form" style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin-bottom: 20px;">';
  html += '<div style="display: flex; flex-direction: column; gap: 12px;">';
  
  // Text input for question with checkboxes on the right
  html += '<div style="display: flex; gap: 12px; align-items: flex-start;">';
  html += '<div style="width: 60%;">';
  html += '<textarea id="new-question-text" placeholder="Введите ваш вопрос..." style="width: 100%; min-height: 60px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-family: inherit; resize: vertical;"></textarea>';
  html += '</div>';
  
  // Checkboxes on the right
  html += '<div style="display: flex; flex-direction: column; gap: 12px; justify-content: flex-start; margin-top: 24px; margin-left: 30px; width: 120px; flex-shrink: 0;">';
  html += '<label style="display: flex; align-items: center; gap: 6px; cursor: pointer; white-space: nowrap; flex-shrink: 0;">';
  html += '<input type="checkbox" id="new-question-important" style="width: 16px; height: 16px; flex-shrink: 0;">';
  html += '<span style="font-weight: 600; color: #d32f2f;">IMP</span>';
  html += '</label>';
  html += '<label style="display: flex; align-items: center; gap: 6px; cursor: pointer; white-space: nowrap; flex-shrink: 0;">';
  html += '<input type="checkbox" id="new-question-asap" style="width: 16px; height: 16px; flex-shrink: 0;">';
  html += '<span style="font-weight: 600; color: #f57c00;">ASAP</span>';
  html += '</label>';
  html += '</div>';
  html += '</div>';
  
  html += '</div>';
  html += '</div>';
  html += '</div>';

  html += '<div class="openquestions-section">';
  if (currentStreamFilter) {
    html += `<h4>Open questions: ${currentStreamFilter} <span style="color: #666; font-size: 12px; font-weight: normal;">(кликните по тегу для сброса фильтра)</span></h4>`;
  } else {
    html += '<h4>Open questions</h4>';
  }
  
  if (unresolvedQuestions.length > 0) {
    html += '<div class="questions-table-container">';
    html += '<table class="questions-table">';
    html += '<thead>';
    html += '<tr>';
    html += '<th></th>'; // Решено (без названия)
    html += '<th>Задача</th>';
    html += '<th>Кто</th>';
    html += '<th>Stream</th>';
    html += '<th>Встреча</th>';
    html += '<th>ASAP</th>';
    html += '<th>Imp</th>';
    html += '</tr>';
    html += '</thead>';
    html += '<tbody>';
    
    unresolvedQuestions.forEach((q, index) => {
      html += `<tr>`;
      
      // Колонка Checkbox (Решено)
      html += `<td class="checkbox-cell">`;
      if (q.id) {
        // Для вопросов из заметок - интерактивный checkbox
        html += `<input type="checkbox" onchange="resolveQuestion(${q.id})" class="question-checkbox">`;
      } else {
        // Для вопросов из Actual open questions - только отображение
        html += `<span class="question-status-display">○</span>`;
      }
      html += `</td>`;
      
      // Колонка Задача (с текстом, датой и кликабельными комментариями)
      html += `<td class="task-text">`;
      html += `<div class="question-header">`;
      if (q.id && typeof q.id === 'number') {
        console.log(`🔗 Создаем кликабельный вопрос с ID: ${q.id}, текст: "${q.question}"`);
        html += `<div class="question-text clickable-question" data-question-id="${q.id}" title="Клик: показать/скрыть комментарии, Двойной клик: редактировать">${q.question}</div>`;
      } else {
        console.log(`📝 Создаем обычный вопрос с ID: ${q.id}, текст: "${q.question}"`);
        html += `<div class="question-text">${q.question}</div>`;
      }
      html += `</div>`;
      html += `<div class="question-date">${q.date}</div>`;
      
      // Расширяемая область для комментариев
      if (q.id && typeof q.id === 'number') {
        console.log(`📦 Создаем область комментариев для ID: ${q.id}`);
        html += `<div class="comments-expandable" id="comments-expandable-${q.id}" style="display: none;">`;
        html += `<div class="comments-list-inline" id="comments-list-inline-${q.id}"></div>`;
        html += `<div class="add-comment-form-inline">`;
        html += `<textarea class="comment-input-inline" id="comment-input-inline-${q.id}" placeholder="Добавить комментарий..." rows="2"></textarea>`;
        html += `<button class="add-comment-btn-inline" onclick="addCommentInline(${q.id})">Добавить</button>`;
        html += `</div>`;
        html += `</div>`;
      }
      html += `</td>`;
      
      // Колонка Кто
      html += `<td class="person-cell">`;
      if (q.person && q.person.trim() && q.person !== 'None') {
        html += `<span class="person-text">${q.person}</span>`;
      } else {
        html += `<div class="person-input-container">`;
        html += `<input type="text" class="person-input" placeholder="Кто задал вопрос?" data-question-id="${q.id}" />`;
        html += `<div class="person-suggestions" id="person-suggestions-${q.id}"></div>`;
        html += `</div>`;
      }
      html += `</td>`;
      
      // Колонка Stream
      html += `<td class="stream-cell">`;
      html += `<div class="stream-input-container">`;
      html += `<input type="text" class="stream-input" value="${q.stream || 'General'}" placeholder="Stream" data-question-id="${q.id}" />`;
      html += `<div class="stream-suggestions" id="stream-suggestions-${q.id}"></div>`;
      html += `</div>`;
      html += `</td>`;
      
      // Колонка Встреча (с кнопкой перехода)
      html += `<td class="meeting-cell">`;
      if (q.eventId) {
        html += `<button class="meeting-link-btn" onclick="goToEventFromQuestion(${q.eventId})" title="Перейти к встрече">`;
        html += `<span class="meeting-link-text">${q.meeting}</span>`;
        html += `</button>`;
      } else {
        html += `<span class="meeting-text">${q.meeting}</span>`;
      }
      html += `</td>`;
      
      // Колонка ASAP
      html += `<td class="asap-cell">`;
      if (q.id && typeof q.id === 'number') {
        html += `<input type="checkbox" id="asap-${q.id}" ${q.asap ? 'checked' : ''} onchange="toggleQuestionFlag(${q.id}, 'asap', this.checked)" class="question-flag-checkbox" title="ASAP">`;
      } else {
        html += `<span class="flag-display">${q.asap ? '✓' : '○'}</span>`;
      }
      html += `</td>`;
      
      // Колонка Imp
      html += `<td class="imp-cell">`;
      if (q.id && typeof q.id === 'number') {
        html += `<input type="checkbox" id="imp-${q.id}" ${q.important ? 'checked' : ''} onchange="toggleQuestionFlag(${q.id}, 'imp', this.checked)" class="question-flag-checkbox" title="Important">`;
      } else {
        html += `<span class="flag-display">${q.important ? '✓' : '○'}</span>`;
      }
      html += `</td>`;
      
      html += '</tr>';
    });
    
    // Добавляем решенные вопросы в ту же таблицу
    resolvedQuestions.forEach((q, index) => {
      html += `<tr class="resolved-question-row">`;
      
      // Колонка Checkbox (Решено)
      html += `<td class="checkbox-cell">`;
      if (q.id) {
        // Для вопросов из заметок - интерактивный checkbox
        html += `<input type="checkbox" checked onchange="unresolveQuestion(${q.id})" class="question-checkbox">`;
      } else {
        // Для вопросов из Actual open questions - только отображение
        html += `<span class="question-status-display">✓</span>`;
      }
      html += `</td>`;
      
      // Колонка Задача (с текстом, датой и кликабельными комментариями)
      html += `<td class="task-text">`;
      html += `<div class="question-header">`;
      if (q.id && typeof q.id === 'number') {
        console.log(`🔗 Создаем кликабельный решенный вопрос с ID: ${q.id}, текст: "${q.question}"`);
        html += `<div class="question-text clickable-question" data-question-id="${q.id}" title="Клик: показать/скрыть комментарии, Двойной клик: редактировать">${q.question}</div>`;
      } else {
        console.log(`📝 Создаем обычный решенный вопрос с ID: ${q.id}, текст: "${q.question}"`);
        html += `<div class="question-text">${q.question}</div>`;
      }
      html += `</div>`;
      
      // Показываем дату создания и дату решения
      let dateInfo = `<div class="question-date">${q.date}</div>`;
      if (q.resolved_at) {
        const resolvedDate = new Date(q.resolved_at).toLocaleDateString('ru-RU');
        const resolvedTime = new Date(q.resolved_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        dateInfo += `<div class="question-resolved-date">Решено: ${resolvedDate} в ${resolvedTime}</div>`;
      }
      html += dateInfo;
      
      // Расширяемая область для комментариев
      if (q.id && typeof q.id === 'number') {
        console.log(`📦 Создаем область комментариев для решенного ID: ${q.id}`);
        html += `<div class="comments-expandable" id="comments-expandable-${q.id}" style="display: none;">`;
        html += `<div class="comments-list-inline" id="comments-list-inline-${q.id}"></div>`;
        html += `<div class="add-comment-form-inline">`;
        html += `<textarea class="comment-input-inline" id="comment-input-inline-${q.id}" placeholder="Добавить комментарий..." rows="2"></textarea>`;
        html += `<button class="add-comment-btn-inline" onclick="addCommentInline(${q.id})">Добавить</button>`;
        html += `</div>`;
        html += `</div>`;
      }
      
      html += `</td>`;
      
      // Колонка Кто
      html += `<td class="person-cell">`;
      html += `<div class="person-display">${q.person || 'Не указано'}</div>`;
      html += `</td>`;
      
      // Колонка Stream
      html += `<td class="stream-cell">`;
      html += `<div class="stream-display">${q.stream || 'Не указано'}</div>`;
      html += `</td>`;
      
      // Колонка Встреча
      html += `<td class="meeting-cell">`;
      if (q.eventId) {
        html += `<div class="meeting-link" onclick="showEventDetails(${q.eventId})" title="Клик: показать детали встречи">${q.meeting}</div>`;
      } else {
        html += `<div class="meeting-display">${q.meeting}</div>`;
      }
      html += `</td>`;
      
      // Колонка ASAP
      html += `<td class="asap-cell">`;
      if (q.id && typeof q.id === 'number') {
        html += `<input type="checkbox" id="asap-${q.id}" ${q.asap ? 'checked' : ''} onchange="toggleQuestionFlag(${q.id}, 'asap', this.checked)" class="question-flag-checkbox" title="ASAP">`;
      } else {
        html += `<span class="asap-badge">${q.asap ? 'ASAP' : ''}</span>`;
      }
      html += `</td>`;
      
      // Колонка Important
      html += `<td class="imp-cell">`;
      if (q.id && typeof q.id === 'number') {
        html += `<input type="checkbox" id="imp-${q.id}" ${q.important ? 'checked' : ''} onchange="toggleQuestionFlag(${q.id}, 'imp', this.checked)" class="question-flag-checkbox" title="Important">`;
      } else {
        html += `<span class="important-badge">${q.important ? 'Imp' : ''}</span>`;
      }
      html += `</td>`;
      
      html += '</tr>';
    });
    
    html += '</tbody>';
    html += '</table>';
    html += '</div>';
  } else {
    html += '<div class="openquestions-empty">Нет открытых вопросов</div>';
  }
  html += '</div>';
  
  // Убираем отдельную секцию решенных вопросов, так как они теперь в основной таблице
  
  // Секция истории изменений (свернутая по умолчанию)
  html += '<div class="openquestions-section collapsible">';
  html += '<h4 class="collapsible-header" onclick="toggleCollapsible(this)">';
  html += '<span class="collapsible-icon">▼</span>';
  html += 'Open questions history';
  html += '</h4>';
  html += '<div class="collapsible-content collapsed" id="question-history-content">';
  html += '<div class="loading">Загрузка истории...</div>';
  html += '</div>';
  html += '</div>';
  
  console.log('✅ Модалка OPEN QUESTIONS: SUMMARY готова к отображению');
  console.log('📊 Итого отображено streams:', allStreamsData ? allStreamsData.length : 0);
  contentEl.innerHTML = html;
  
  // Добавляем обработчик blur для создания вопроса
  setTimeout(() => {
    const textElement = document.getElementById('new-question-text');
    if (textElement) {
      textElement.addEventListener('blur', () => {
        const text = textElement.value.trim();
        if (text) {
          createNewOpenQuestion();
        }
      });
    }
  }, 100);
  
  // Добавляем обработчики событий для кликабельных вопросов
  setTimeout(() => {
    const clickableQuestions = contentEl.querySelectorAll('.clickable-question');
    clickableQuestions.forEach(questionEl => {
      const questionId = parseInt(questionEl.dataset.questionId);
      
      if (isNaN(questionId)) {
        console.error('❌ Неверный questionId:', questionEl.dataset.questionId);
        return;
      }
      
      let clickTimeout;
      
      // Обработчик одинарного клика
      questionEl.addEventListener('click', function(e) {
        clearTimeout(clickTimeout);
        clickTimeout = setTimeout(() => {
          console.log(`🖱️ Одинарный клик по вопросу ${questionId}`);
          toggleCommentsInline(questionId);
        }, 200); // Задержка для различения одинарного и двойного клика
      });
      
      // Обработчик двойного клика
      questionEl.addEventListener('dblclick', function(e) {
        e.preventDefault();
        e.stopPropagation();
        clearTimeout(clickTimeout);
        console.log(`🖱️🖱️ Двойной клик по вопросу ${questionId} - открываем редактирование!`);
        editQuestion(questionId);
      });
    });
  }, 100);
  
  // Инициализируем автокомплит для полей "Кто" и "Stream"
  setTimeout(() => {
    initializePersonAutocomplete();
    initializeStreamAutocomplete();
  }, 100);
  
  // Загружаем историю изменений
  loadQuestionHistory();
}

function closeOpenQuestionsModal() {
  const modal = document.querySelector('.openquestions-modal');
  if (modal) {
    modal.remove();
  }
}

function toggleCollapsible(header) {
  const content = header.nextElementSibling;
  const icon = header.querySelector('.collapsible-icon');
  
  if (content.classList.contains('collapsed')) {
    content.classList.remove('collapsed');
    icon.classList.remove('collapsed');
  } else {
    content.classList.add('collapsed');
    icon.classList.add('collapsed');
  }
}

async function loadQuestionHistory() {
  const contentEl = document.getElementById('question-history-content');
  if (!contentEl) return;
  
  try {
    const response = await fetch('/api/question-history');
    if (!response.ok) throw new Error('Ошибка загрузки истории');
    
    const history = await response.json();
    
    if (history.length === 0) {
      contentEl.innerHTML = '<div class="openquestions-empty">История изменений пуста</div>';
      return;
    }
    
    let html = '<ul class="question-history-list">';
    history.forEach(item => {
      const date = new Date(item.timestamp).toLocaleString('ru-RU');
      const actionClass = item.action === 'closed' ? 'action-closed' : 
                        item.action === 'reopened' ? 'action-reopened' : 'action-opened';
      
      html += `<li class="history-item ${actionClass}">`;
      html += `<div class="history-header">`;
      html += `<span class="history-action">${item.action_ru}</span>`;
      html += `<span class="history-date">${date}</span>`;
      html += `</div>`;
      html += `<div class="history-question">${item.question_text}</div>`;
      if (item.event_subject) {
        html += `<div class="history-event">Встреча: ${item.event_subject}</div>`;
      }
      html += `</li>`;
    });
    html += '</ul>';
    
    contentEl.innerHTML = html;
  } catch (err) {
    console.error('Ошибка загрузки истории:', err);
    contentEl.innerHTML = '<div class="openquestions-empty">Ошибка загрузки истории</div>';
  }
}

async function resolveQuestion(questionId) {
  try {
    const response = await fetch(`/api/open-questions/${questionId}/resolve`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_resolved: true })
    });
    
    if (response.ok) {
      console.log('✓ Вопрос отмечен как решенный');
      // Обновляем данные в модальном окне
      collectOpenQuestionsData();
      // Обновляем историю
      loadQuestionHistory();
    } else {
      alert('Ошибка при отметке вопроса как решенного');
    }
  } catch (err) {
    console.error('Ошибка при отметке вопроса:', err);
    alert('Ошибка при отметке вопроса как решенного');
  }
}

async function unresolveQuestion(questionId) {
  try {
    const response = await fetch(`/api/open-questions/${questionId}/resolve`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_resolved: false })
    });
    
    if (response.ok) {
      console.log('✗ Вопрос отмечен как нерешенный');
      // Обновляем данные в модальном окне
      collectOpenQuestionsData();
      // Обновляем историю
      loadQuestionHistory();
    } else {
      alert('Ошибка при отметке вопроса как нерешенного');
    }
  } catch (err) {
    console.error('Ошибка при отметке вопроса:', err);
    alert('Ошибка при отметке вопроса как нерешенного');
  }
}

// =======================
// Функции для переноса встречи
// =======================
function showRescheduleModal(event) {
  const modal = document.createElement('div');
  modal.className = 'reschedule-modal';
  modal.innerHTML = `
    <div class="reschedule-modal-content">
      <h3>Перенести встречу</h3>
      <div class="reschedule-current-info">
        <h4>Текущие дата и время:</h4>
        <div class="current-datetime">
          <strong>Дата:</strong> ${new Date(event.start).toLocaleDateString('ru-RU', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
        <div class="current-datetime">
          <strong>Время:</strong> ${new Date(event.start).toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })} - ${new Date(event.end).toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>
      <div class="reschedule-step">
        <h4>1. Выберите новую дату</h4>
        <div class="reschedule-calendar" id="reschedule-calendar"></div>
      </div>
      <div class="reschedule-step">
        <h4>2. Выберите новое время</h4>
        <div class="reschedule-time-slots" id="reschedule-time-slots"></div>
      </div>
      <div class="reschedule-modal-buttons">
        <button class="reschedule-modal-btn secondary" onclick="closeRescheduleModal()">Отмена</button>
        <button class="reschedule-modal-btn tomorrow" id="tomorrow-same-time-btn">Tomorrow, the same time</button>
        <button class="reschedule-modal-btn primary" id="confirm-reschedule-btn" disabled>Перенести</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Инициализируем календарь
  initRescheduleCalendar(event);
  
  // Обработчик кнопки "Tomorrow, the same time"
  const tomorrowBtn = document.getElementById('tomorrow-same-time-btn');
  tomorrowBtn.addEventListener('click', () => {
    rescheduleToTomorrowSameTime(event);
  });
  
  // Обработчик клика вне модального окна
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeRescheduleModal();
    }
  });
}

function initRescheduleCalendar(event) {
  const calendarEl = document.getElementById('reschedule-calendar');
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  // Заголовки дней недели
  const dayHeaders = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  dayHeaders.forEach(day => {
    const headerEl = document.createElement('div');
    headerEl.className = 'reschedule-calendar-header';
    headerEl.textContent = day;
    calendarEl.appendChild(headerEl);
  });
  
  // Генерируем дни месяца
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Понедельник = 0
  
  // Пустые ячейки для начала месяца
  for (let i = 0; i < adjustedFirstDay; i++) {
    const emptyEl = document.createElement('div');
    emptyEl.className = 'reschedule-calendar-day disabled';
    calendarEl.appendChild(emptyEl);
  }
  
  // Дни месяца
  for (let day = 1; day <= daysInMonth; day++) {
    const dayEl = document.createElement('div');
    dayEl.className = 'reschedule-calendar-day';
    dayEl.textContent = day;
    
    const dayDate = new Date(currentYear, currentMonth, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Отключаем прошедшие дни
    if (dayDate < today) {
      dayEl.classList.add('disabled');
    } else {
      dayEl.addEventListener('click', () => selectRescheduleDate(dayDate));
    }
    
    calendarEl.appendChild(dayEl);
  }
  
  // Инициализируем временные слоты
  initRescheduleTimeSlots(event);
}

function initRescheduleTimeSlots(event) {
  const timeSlotsEl = document.getElementById('reschedule-time-slots');
  timeSlotsEl.innerHTML = '';
  
  // Генерируем временные слоты с интервалом 30 минут
  const startHour = 8; // Начинаем с 8:00
  const endHour = 22; // Заканчиваем в 22:00
  
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeSlot = document.createElement('div');
      timeSlot.className = 'reschedule-time-slot';
      timeSlot.textContent = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      timeSlot.addEventListener('click', () => selectRescheduleTime(timeSlot));
      timeSlotsEl.appendChild(timeSlot);
    }
  }
}

function selectRescheduleDate(date) {
  // Убираем выделение с предыдущей даты
  document.querySelectorAll('.reschedule-calendar-day.selected').forEach(el => {
    el.classList.remove('selected');
  });
  
  // Выделяем выбранную дату
  event.target.classList.add('selected');
  
  // Сохраняем выбранную дату
  window.selectedRescheduleDate = date;
  
  // Проверяем, можно ли активировать кнопку "Перенести"
  checkRescheduleButton();
}

function selectRescheduleTime(timeSlotEl) {
  // Убираем выделение с предыдущего времени
  document.querySelectorAll('.reschedule-time-slot.selected').forEach(el => {
    el.classList.remove('selected');
  });
  
  // Выделяем выбранное время
  timeSlotEl.classList.add('selected');
  
  // Сохраняем выбранное время
  window.selectedRescheduleTime = timeSlotEl.textContent;
  
  // Проверяем, можно ли активировать кнопку "Перенести"
  checkRescheduleButton();
}

function checkRescheduleButton() {
  const confirmBtn = document.getElementById('confirm-reschedule-btn');
  if (window.selectedRescheduleDate && window.selectedRescheduleTime) {
    confirmBtn.disabled = false;
    confirmBtn.addEventListener('click', () => confirmReschedule());
  } else {
    confirmBtn.disabled = true;
  }
}

function closeRescheduleModal() {
  const modal = document.querySelector('.reschedule-modal');
  if (modal) {
    modal.remove();
  }
  // Очищаем глобальные переменные
  window.selectedRescheduleDate = null;
  window.selectedRescheduleTime = null;
}

function rescheduleToTomorrowSameTime(event) {
  // Получаем текущее событие
  const currentEvent = window.currentEvent;
  if (!currentEvent) {
    alert('Ошибка: не найдено текущее событие');
    return;
  }
  
  // Вычисляем завтрашнюю дату
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Получаем время начала и окончания текущего события
  const originalStart = utcToMoscow(currentEvent.start);
  const originalEnd = utcToMoscow(currentEvent.end);
  
  // Создаем новое время начала на завтра в то же время
  const newStartDate = new Date(tomorrow);
  newStartDate.setHours(originalStart.getHours(), originalStart.getMinutes(), 0, 0);
  
  // Вычисляем продолжительность встречи
  const duration = originalEnd.getTime() - originalStart.getTime();
  
  // Создаем новое время окончания
  const newEndDate = new Date(newStartDate.getTime() + duration);
  
  // Подтверждение
  const confirmMessage = `Перенести встречу "${currentEvent.subject}" на завтра (${tomorrow.toLocaleDateString('ru-RU')}) в то же время (${originalStart.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'})})?\n\nИсходная встреча будет удалена.`;
  
  if (confirm(confirmMessage)) {
    // Выполняем перенос с созданием нового события и удалением старого
    performRescheduleWithDeletion(currentEvent, newStartDate, newEndDate);
  }
}

async function performRescheduleWithDeletion(originalEvent, newStartDate, newEndDate) {
  try {
    // Конвертируем даты в правильный формат для сервера
    const startISO = formatDateToISO(newStartDate);
    const endISO = formatDateToISO(newEndDate);
    
    // Создаем новое событие на завтра с теми же данными
    const newEventPayload = {
      subject: originalEvent.subject,
      start: startISO,
      end: endISO,
      location: originalEvent.location || '',
      attendees: originalEvent.attendees || [],
      stream: originalEvent.stream || [],
      notes: originalEvent.notes || '',
      recording_url: originalEvent.recording_url || '',
      open_questions: originalEvent.open_questions || [],
      actual_open_questions: originalEvent.actual_open_questions || ''
    };
    
    console.log('Создание нового события:', newEventPayload);
    
    // Создаем новое событие
    const createResponse = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEventPayload)
    });
    
    if (!createResponse.ok) {
      throw new Error('Ошибка при создании нового события');
    }
    
    const newEvent = await createResponse.json();
    console.log('✓ Новое событие создано:', newEvent);
    
    // Удаляем исходное событие
    const deleteResponse = await fetch(`/api/events/${originalEvent.id}`, {
      method: 'DELETE'
    });
    
    if (!deleteResponse.ok) {
      throw new Error('Ошибка при удалении исходного события');
    }
    
    console.log('✓ Исходное событие удалено');
    
    // Показываем успешное сообщение
    alert(`Встреча "${originalEvent.subject}" успешно перенесена на завтра!\n\nИсходная встреча удалена.`);
    
    // Обновляем календарь
    await loadEventsFromAPI();
    
    // Закрываем модальное окно и форму просмотра
    closeRescheduleModal();
    document.getElementById('event-details').innerHTML = '';
    
  } catch (error) {
    console.error('Ошибка при переносе встречи:', error);
    alert('Ошибка при переносе встречи. Попробуйте еще раз.');
  }
}

function confirmReschedule() {
  if (!window.selectedRescheduleDate || !window.selectedRescheduleTime) return;
  
  // Получаем текущее событие из глобальной переменной
  const currentEvent = window.currentEvent;
  if (!currentEvent) {
    alert('Ошибка: не найдено текущее событие');
    return;
  }
  
  // Парсим выбранное время
  const [hours, minutes] = window.selectedRescheduleTime.split(':').map(Number);
  
  // Создаем новую дату и время
  const newStartDate = new Date(window.selectedRescheduleDate);
  newStartDate.setHours(hours, minutes, 0, 0);
  
  // Вычисляем продолжительность встречи
  const originalStart = utcToMoscow(currentEvent.start);
  const originalEnd = utcToMoscow(currentEvent.end);
  const duration = originalEnd.getTime() - originalStart.getTime();
  
  // Создаем новое время окончания
  const newEndDate = new Date(newStartDate.getTime() + duration);
  
  // Подтверждение переноса
  const confirmMessage = `Перенести встречу "${currentEvent.subject}" на ${newStartDate.toLocaleDateString('ru-RU')} в ${window.selectedRescheduleTime}?`;
  
  if (!confirm(confirmMessage)) {
    return;
  }
  
  // Обновляем событие
  updateEventTime(currentEvent.id, newStartDate, newEndDate);
  
  // Закрываем модальное окно
  closeRescheduleModal();
}

async function updateEventTime(eventId, newStart, newEnd) {
  try {
    // Конвертируем даты в правильный формат для сервера (московское время)
    const startISO = formatDateToISO(newStart);
    const endISO = formatDateToISO(newEnd);
    
    const response = await fetch(`/api/events/${eventId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start: startISO,
        end: endISO
      })
    });
    
    if (response.ok) {
      console.log('✓ Встреча успешно перенесена');
      alert('Встреча успешно перенесена!');
      
      // Обновляем календарь
      await loadEventsFromAPI();
      
      // Закрываем форму просмотра
      document.getElementById('event-details').innerHTML = '';
    } else {
      alert('Ошибка при переносе встречи');
    }
  } catch (err) {
    console.error('Ошибка при переносе:', err);
    alert('Ошибка при переносе встречи');
  }
}

// Функция для форматирования даты в ISO формат без конвертации в UTC
function formatDateToISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hour}:${minute}:00`;
}

// =======================
// Вспомогательные функции
// =======================
function autoResizeTextarea(textarea) {
  // Сбрасываем высоту для корректного расчета
  textarea.style.height = 'auto';
  
  // Получаем максимальную высоту из стилей или используем значение по умолчанию
  const maxHeight = parseInt(textarea.style.maxHeight) || 200;
  const minHeight = parseInt(textarea.style.minHeight) || 28;
  
  // Рассчитываем нужную высоту на основе содержимого
  const scrollHeight = textarea.scrollHeight;
  
  // Устанавливаем высоту с учетом ограничений
  const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
  textarea.style.height = newHeight + 'px';
  
  // Если содержимое превышает максимальную высоту, показываем скролл
  if (scrollHeight > maxHeight) {
    textarea.style.overflowY = 'auto';
  } else {
    textarea.style.overflowY = 'hidden';
  }
}

function autoResizeInput(input) {
  // Создаем временный элемент для измерения ширины текста
  const temp = document.createElement('span');
  temp.style.visibility = 'hidden';
  temp.style.position = 'absolute';
  temp.style.whiteSpace = 'nowrap';
  temp.style.font = window.getComputedStyle(input).font;
  temp.textContent = input.value || input.placeholder;
  
  document.body.appendChild(temp);
  
  // Получаем ширину текста
  const textWidth = temp.offsetWidth;
  document.body.removeChild(temp);
  
  // Устанавливаем минимальную и максимальную ширину
  const minWidth = 100;
  const maxWidth = 400;
  
  // Рассчитываем новую ширину
  const newWidth = Math.max(minWidth, Math.min(textWidth + 20, maxWidth));
  input.style.width = newWidth + 'px';
}

// Функция для автоматического изменения размера всех textarea на странице
function autoResizeAllTextareas() {
  const textareas = document.querySelectorAll('textarea.question-text, textarea.note-input');
  textareas.forEach(textarea => autoResizeTextarea(textarea));
}

// Обработчик изменения размера окна
window.addEventListener('resize', () => {
  setTimeout(autoResizeAllTextareas, 100);
});

// =======================
// Функции для отображения событий
// =======================
// ===== ГЛОБАЛЬНЫЕ ФУНКЦИИ ДЛЯ КОПИРОВАНИЯ ССЫЛОК =====

// Поиск предыдущего события с таким же названием для копирования ссылки
async function findPreviousEventWithSameName(subject) {
  try {
    console.log('🔍 Ищем события с названием:', subject);
    const response = await fetch(`/api/events`);
    if (response.ok) {
      const events = await response.json();
      
      // Ищем события с таким же названием
      const sameNameEvents = events.filter(event => 
        event.subject && event.subject.toLowerCase() === subject.toLowerCase()
      );
      
      console.log(`📋 Найдено событий с названием "${subject}":`, sameNameEvents.length);
      
      // Ищем первое событие с ссылкой
      for (const event of sameNameEvents) {
        if (event.location && event.location.trim()) {
          const urlRegex = /(https?:\/\/[^\s]+)/g;
          if (urlRegex.test(event.location)) {
            console.log('✅ Найдено событие с ссылкой:', event.id, event.start?.split('T')[0]);
            return event;
          }
        }
      }
      
      console.log('❌ События с ссылкой не найдены');
    }
  } catch (error) {
    console.error('❌ Ошибка поиска предыдущего события:', error);
  }
  return null;
}

// Проверка и показ кнопки копирования ссылки для модального окна просмотра
async function checkAndShowCopyLinkButtonForView() {
  console.log('🚀 Проверяем кнопку копирования ссылки');
  
  const subject = document.getElementById('ve-title')?.value.trim();
  const copyBtn = document.getElementById('ve-copy-link-btn');
  const addressInput = document.getElementById('ve-location-address');
  
  if (!subject || !copyBtn || !addressInput) {
    console.log('❌ Не найдены необходимые элементы');
    return;
  }
  
  // Проверяем, есть ли уже ссылка в текущем событии
  const currentAddress = addressInput.value.trim();
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const hasCurrentLink = urlRegex.test(currentAddress);
  
  console.log('🔗 Текущая ссылка:', hasCurrentLink ? 'Есть' : 'Нет', '- Содержимое поля:', currentAddress.substring(0, 50) + '...');
  
  // Если в текущем событии уже есть ссылка, скрываем кнопку
  if (hasCurrentLink) {
    console.log('✅ Скрываем кнопку - ссылка уже есть');
    copyBtn.style.display = 'none';
    return;
  }
  
  // Проверяем, есть ли предыдущие события с ссылкой
  const previousEvent = await findPreviousEventWithSameName(subject);
  
  if (previousEvent) {
    console.log('✅ Показываем кнопку - найдено предыдущее событие с ссылкой');
    copyBtn.style.display = 'block';
    copyBtn.title = `Получить ссылку из события "${subject}" (${previousEvent.start?.split('T')[0] || 'дата неизвестна'})`;
  } else {
    console.log('❌ Скрываем кнопку - предыдущие события с ссылкой не найдены');
    copyBtn.style.display = 'none';
  }
}

// Копирование ссылки из предыдущего события
async function copyLinkFromPreviousEvent(subject) {
  console.log('🔍 copyLinkFromPreviousEvent: ищем событие с названием:', subject);
  
  const previousEvent = await findPreviousEventWithSameName(subject);
  
  if (previousEvent && previousEvent.location) {
    console.log('📋 copyLinkFromPreviousEvent: найдено событие:', {
      id: previousEvent.id,
      date: previousEvent.start?.split('T')[0],
      location: previousEvent.location.substring(0, 100) + '...'
    });
    
    // Извлекаем ссылку из поля location
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = previousEvent.location.match(urlRegex);
    
    if (urls && urls.length > 0) {
      console.log('✅ copyLinkFromPreviousEvent: извлечена ссылка:', urls[0].substring(0, 100) + '...');
      return urls[0]; // Возвращаем первую найденную ссылку
    } else {
      console.log('❌ copyLinkFromPreviousEvent: ссылка не найдена в location');
    }
  } else {
    console.log('❌ copyLinkFromPreviousEvent: событие не найдено или нет location');
  }
  
  return null;
}

// Поиск предыдущего события с участниками для копирования
async function findPreviousEventWithAttendees(subject) {
  try {
    console.log('🔍 Ищем события с участниками для названия:', subject);
    const response = await fetch(`/api/events`);
    if (response.ok) {
      const events = await response.json();
      
      // Ищем события с таким же названием
      const sameNameEvents = events.filter(event => 
        event.subject && event.subject.toLowerCase() === subject.toLowerCase()
      );
      
      console.log(`📋 Найдено событий с названием "${subject}":`, sameNameEvents.length);
      
      // Ищем первое событие с участниками
      for (const event of sameNameEvents) {
        if (event.attendees && event.attendees.length > 0) {
          console.log('✅ Найдено событие с участниками:', event.id, event.start?.split('T')[0], 'Участников:', event.attendees.length);
          return event;
        }
      }
      
      console.log('❌ События с участниками не найдены');
    }
  } catch (error) {
    console.error('❌ Ошибка поиска предыдущего события с участниками:', error);
  }
  return null;
}

// Проверка и показ кнопки копирования участников для модального окна просмотра
async function checkAndShowCopyAttendeesButtonForView() {
  console.log('🚀 Проверяем кнопку копирования участников');
  
  const subject = document.getElementById('ve-title')?.value.trim();
  const copyBtn = document.getElementById('ve-copy-attendees-btn');
  const attendeesContainer = document.getElementById('ve-tags-container');
  
  if (!subject || !copyBtn || !attendeesContainer) {
    console.log('❌ Не найдены необходимые элементы для участников');
    return;
  }
  
    // Проверяем, есть ли уже участники в текущем событии
    const currentAttendees = attendeesContainer.querySelectorAll('.tag-chip, .tag');
    const hasCurrentAttendees = currentAttendees.length > 0;
  
  console.log('👥 Текущие участники:', hasCurrentAttendees ? `Есть (${currentAttendees.length})` : 'Нет');
  console.log('🔍 Найденные элементы .tag-chip:', currentAttendees.length);
  console.log('🔍 Содержимое attendeesContainer:', attendeesContainer.innerHTML);
  
  // Если в текущем событии уже есть участники, скрываем кнопку
  if (hasCurrentAttendees) {
    console.log('✅ Скрываем кнопку - участники уже есть');
    console.log('🔍 Найденные участники:', Array.from(currentAttendees).map(el => el.textContent));
    copyBtn.style.display = 'none';
    return;
  }
  
  // Проверяем, есть ли предыдущие события с участниками
  const previousEvent = await findPreviousEventWithAttendees(subject);
  
  if (previousEvent) {
    console.log('✅ Показываем кнопку - найдено предыдущее событие с участниками');
    copyBtn.style.display = 'block';
    copyBtn.title = `Получить участников из события "${subject}" (${previousEvent.start?.split('T')[0] || 'дата неизвестна'}) - ${previousEvent.attendees.length} участников`;
  } else {
    console.log('❌ Скрываем кнопку - предыдущие события с участниками не найдены');
    copyBtn.style.display = 'none';
  }
}

// Копирование участников из предыдущего события
async function copyAttendeesFromPreviousEvent(subject) {
  console.log('🔍 copyAttendeesFromPreviousEvent: ищем событие с участниками для названия:', subject);
  
  const previousEvent = await findPreviousEventWithAttendees(subject);
  
  if (previousEvent && previousEvent.attendees && previousEvent.attendees.length > 0) {
    console.log('📋 copyAttendeesFromPreviousEvent: найдено событие с участниками:', {
      id: previousEvent.id,
      date: previousEvent.start?.split('T')[0],
      attendees: previousEvent.attendees
    });
    
    console.log('✅ copyAttendeesFromPreviousEvent: возвращаем участников:', previousEvent.attendees);
    return previousEvent.attendees;
  } else {
    console.log('❌ copyAttendeesFromPreviousEvent: событие не найдено или нет участников');
  }
  
  return null;
}

// Функция для автоматического создания Open Questions из заметок с тегами
async function processEventsForAutoOpenQuestions(events) {
  console.log('🔄 processEventsForAutoOpenQuestions: начинаем обработку', events.length, 'событий');
  
  // Загружаем streams данные, если они еще не загружены
  if (!allStreamsData || allStreamsData.length === 0) {
    console.log('📡 Загружаем streams данные для автоматического создания Open Questions...');
    try {
      const streamsResponse = await fetch('/api/streams?search=');
      if (streamsResponse.ok) {
        allStreamsData = await streamsResponse.json();
        console.log('✅ Загружено streams для автоматического создания:', allStreamsData.length);
      } else {
        console.error('❌ Ошибка загрузки streams:', streamsResponse.status);
        return;
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки streams:', error);
      return;
    }
  }
  
  // Обрабатываем каждое событие
  for (const ev of events) {
    if (ev.notes && Array.isArray(ev.notes)) {
      console.log(`🔍 Проверяем событие "${ev.subject}" (ID: ${ev.id}) на наличие заметок с тегами`);
      
      for (let noteIndex = 0; noteIndex < ev.notes.length; noteIndex++) {
        const noteObj = ev.notes[noteIndex];
        const noteData = {
          text: noteObj.text || '',
          time: noteObj.time || '',
          person: noteObj.person || '',
          isQuestion: false,
          due: null,
          stream: noteObj.topic || null,
          important: false,
          asap: false
        };
        
        // Проверяем, есть ли теги в тексте заметки
        if (noteData.text && allStreamsData && allStreamsData.length > 0) {
          const extractedTags = extractTagsFromText(noteData.text, allStreamsData);
          if (extractedTags.length > 0) {
            console.log(`🏷️ Найдены теги в заметке "${noteData.text}" события "${ev.subject}":`, extractedTags);
            
            // Проверяем, не создан ли уже вопрос для этой заметки
            try {
              const existingQuestionsResponse = await fetch('/api/open-questions');
              if (existingQuestionsResponse.ok) {
                const existingQuestions = await existingQuestionsResponse.json();
                const existingQuestion = existingQuestions.find(q => 
                  q.event_id === ev.id && 
                  q.question_text === noteData.text &&
                  q.person === noteData.person
                );
                
                if (existingQuestion) {
                  console.log(`⚠️ Вопрос уже существует для заметки "${noteData.text}" события "${ev.subject}"`);
                  continue;
                }
              }
            } catch (error) {
              console.error('❌ Ошибка проверки существующих вопросов:', error);
            }
            
            // Автоматически создаем вопрос для заметки с тегами
            try {
              await createQuestionFromNote(noteData, noteIndex, ev.id);
              console.log(`✅ Автоматически создан вопрос из заметки "${noteData.text}" события "${ev.subject}"`);
            } catch (error) {
              console.error(`❌ Ошибка создания вопроса из заметки "${noteData.text}" события "${ev.subject}":`, error);
            }
          }
        }
      }
    }
  }
  
  console.log('✅ processEventsForAutoOpenQuestions: обработка завершена');
}

// Функция для автоматического создания Open Questions из заметок конкретного события
async function processEventNotesForAutoOpenQuestions(event) {
  console.log(`🔄 processEventNotesForAutoOpenQuestions: обрабатываем событие "${event.subject}" (ID: ${event.id})`);
  
  // Загружаем streams данные, если они еще не загружены
  if (!allStreamsData || allStreamsData.length === 0) {
    console.log('📡 Загружаем streams данные для автоматического создания Open Questions...');
    try {
      const streamsResponse = await fetch('/api/streams?search=');
      if (streamsResponse.ok) {
        allStreamsData = await streamsResponse.json();
        console.log('✅ Загружено streams для автоматического создания:', allStreamsData.length);
      } else {
        console.error('❌ Ошибка загрузки streams:', streamsResponse.status);
        return;
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки streams:', error);
      return;
    }
  }
  
  // Проверяем заметки события
  if (event.notes && Array.isArray(event.notes)) {
    console.log(`🔍 Проверяем ${event.notes.length} заметок события "${event.subject}" на наличие тегов`);
    
    for (let noteIndex = 0; noteIndex < event.notes.length; noteIndex++) {
      const noteObj = event.notes[noteIndex];
      const noteData = {
        text: noteObj.text || '',
        time: noteObj.time || '',
        person: noteObj.person || '',
        isQuestion: false,
        due: null,
        stream: noteObj.topic || null,
        important: false,
        asap: false
      };
      
      // Проверяем, есть ли теги в тексте заметки
      if (noteData.text && allStreamsData && allStreamsData.length > 0) {
        const extractedTags = extractTagsFromText(noteData.text, allStreamsData);
        if (extractedTags.length > 0) {
          console.log(`🏷️ Найдены теги в заметке "${noteData.text}" события "${event.subject}":`, extractedTags);
          
          // Проверяем, не создан ли уже вопрос для этой заметки
          try {
            const existingQuestionsResponse = await fetch('/api/open-questions');
            if (existingQuestionsResponse.ok) {
              const existingQuestions = await existingQuestionsResponse.json();
              const existingQuestion = existingQuestions.find(q => 
                q.event_id === event.id && 
                q.question_text === noteData.text &&
                q.person === noteData.person
              );
              
              if (existingQuestion) {
                console.log(`⚠️ Вопрос уже существует для заметки "${noteData.text}" события "${event.subject}"`);
                continue;
              }
            }
          } catch (error) {
            console.error('❌ Ошибка проверки существующих вопросов:', error);
          }
          
          // Автоматически создаем вопрос для заметки с тегами
          try {
            await createQuestionFromNote(noteData, noteIndex, event.id);
            console.log(`✅ Автоматически создан вопрос из заметки "${noteData.text}" события "${event.subject}"`);
          } catch (error) {
            console.error(`❌ Ошибка создания вопроса из заметки "${noteData.text}" события "${event.subject}":`, error);
          }
        }
      }
    }
  } else {
    console.log(`⚠️ У события "${event.subject}" нет заметок или они не в формате массива`);
  }
  
  console.log(`✅ processEventNotesForAutoOpenQuestions: обработка события "${event.subject}" завершена`);
}

// ===== КОНЕЦ ГЛОБАЛЬНЫХ ФУНКЦИЙ =====

// Функция для дедупликации участников по displayName
function deduplicateAttendees(attendees) {
  const unique = {};
  attendees.forEach(item => {
    const key = item.displayName;
    if (!unique[key] || item.useCount > unique[key].useCount) {
      unique[key] = item;
    }
  });
  return Object.values(unique);
}

function showEvent(ev) {
  
  // Сохраняем текущее событие в глобальной переменной для функции переноса
  window.currentEvent = ev;
  
  // Проверяем, нужно ли предложить продлить серию
  checkAndExtendSeries(ev);
  
  const attendees = ev.attendees || [];
  const streams = ev.stream ? (Array.isArray(ev.stream) ? ev.stream : [ev.stream]) : [];
  const openQuestions = ev.open_questions || [];
  
  // Конвертируем UTC в московское время для отображения
  const startMoscow = utcToMoscow(ev.start);
  const endMoscow = utcToMoscow(ev.end);
  
  // Парсим место (может быть формата "Type: Address")
  let chosenPlace = '';
  let locationAddress = ev.location || '';
  if (ev.location && ev.location.includes(':')) {
    const parts = ev.location.split(':');
    chosenPlace = parts[0].trim();
    locationAddress = parts.slice(1).join(':').trim();
  }
  
  eventDetails.innerHTML = `
    <div class="event-block" style="position:relative;">
      <button type="button" id="reschedule-event-btn">Reschedule</button>
      <button type="button" id="delete-event-btn" style="position:absolute; top:8px; right:8px; padding:4px 10px; background:#ffebee; color:#d32f2f; border:1px solid #d32f2f; border-radius:4px; cursor:pointer; font-size:11px; font-weight:600; transition:all 0.2s;">Delete</button>
      <form id="view-event-form">
        <input type="text" id="ve-title" value="${ev.subject}" required style="width:100%; font-size:1.1rem; padding:8px; border-radius:6px; border:1px solid #ccc; margin-bottom:10px;" />

        <div style="margin-top:10px; display:flex; align-items:center; gap:16px; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:16px;">
            <div class="calendar-card">
              <div class="calendar-month">${startMoscow.toLocaleString('ru', { month: 'short' }).toUpperCase()}</div>
              <div class="calendar-day">${startMoscow.getDate()}</div>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <input type="time" id="ve-start-time" value="${formatHM(startMoscow)}" style="padding:4px 8px; border-radius:4px; border:1px solid #ccc; font-size:0.9em;" />
              <span style="color:#666;">–</span>
              <input type="time" id="ve-end-time" value="${formatHM(endMoscow)}" style="padding:4px 8px; border-radius:4px; border:1px solid #ccc; font-size:0.9em;" />
            </div>
          </div>
          <div id="ve-location-buttons" style="display:flex; gap:6px; flex-wrap:wrap;">
            <button type="button" class="loc-btn" data-value="Zoom" title="Zoom - popular video conferencing platform">
              <img src="logos_pics/Zoom.svg?v=3" width="20" height="20" alt="Zoom" style="object-fit: contain;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
              <span style="display:none; font-size:12px;">Z</span>
            </button>
            <button type="button" class="loc-btn" data-value="Teams" title="Microsoft Teams - video conferencing and collaboration platform">
              <img src="logos_pics/teams.png?v=1" width="20" height="20" alt="Microsoft Teams" style="object-fit: contain;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
              <span style="display:none; font-size:12px;">T</span>
            </button>
            <button type="button" class="loc-btn" data-value="Google Meet" title="Google Meet - video conferencing by Google">
              <img src="logos_pics/meet.png?v=1" width="20" height="20" alt="Google Meet" style="object-fit: contain;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
              <span style="display:none; font-size:12px;">G</span>
            </button>
            <button type="button" class="loc-btn" data-value="Телемост" title="Yandex Telemost - video conferencing for large groups">
              <img src="logos_pics/telemost.jpeg?v=1" width="20" height="20" alt="Yandex Telemost" style="object-fit: contain;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
              <span style="display:none; font-size:12px;">Y</span>
            </button>
            <button type="button" class="loc-btn" data-value="Телеграм" title="Telegram - messenger for quick communication">
              <img src="logos_pics/telegram.png?v=1" width="20" height="20" alt="Telegram" style="object-fit: contain;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
              <span style="display:none; font-size:12px;">T</span>
            </button>
            <button type="button" class="loc-btn" data-value="Другое" title="Other - choose another way to conduct the meeting">Other</button>
          </div>
        </div>

        <div style="margin-top:8px; display: flex; gap: 8px; align-items: center;">
          <input type="text" id="ve-location-address" value="${locationAddress}" placeholder="Link for the meeting" style="flex: 1; padding:8px; border-radius:6px; border:1px solid #ccc;" />
          <button type="button" id="ve-copy-link-btn" title="Get link from previous event" style="padding: 8px 12px; background: #4285f4; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 11px; display: none;">🔗 Get link</button>
        </div>

        <div style="display:block; margin-top:10px;">
          <div style="margin-bottom:6px; font-weight:bold;">Participants</div>
          <div class="tag-input" id="ve-attendees-tags">
            <div class="tags" id="ve-tags-container"></div>
            <input type="text" id="ve-attendees-input" placeholder="Start to input name or e-mail..." />
            <div class="suggestions" id="ve-attendees-suggest"></div>
          </div>
          <div style="margin-top: 6px;">
            <button type="button" id="ve-copy-attendees-btn" title="Get participants from previous meeting" style="padding: 6px 10px; background: #4285f4; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; display: none; white-space: nowrap;">👥 Get participants</button>
          </div>
        </div>

        <div style="display:block; margin-top:10px;">
          <div style="margin-bottom:6px; font-weight:bold;">Stream</div>
          <div class="tag-input" id="ve-stream-tags">
            <div class="tags" id="ve-stream-container"></div>
            <input type="text" id="ve-stream-input" placeholder="Start to input tag or stream..." />
            <div class="suggestions" id="ve-stream-suggest"></div>
          </div>
        </div>

        <div class="section-box">
          <div class="section-title" onclick="toggleSection('ve-actual-questions-section')">
            <span class="section-toggle">▼</span>
            Actual open questions for the meeting
          </div>
          <div class="section-content actual-questions-section" id="ve-actual-questions-section">
            <button type="button" id="ve-add-actual-question" class="add-note-btn">Add question</button>
            <div id="ve-actual-questions-rows"></div>
          </div>
        </div>

        <div class="section-box">
          <div class="section-title" onclick="toggleSection('ve-notes-section')">
            <span class="section-toggle">▼</span>
            Notes
          </div>
          <div class="section-content notes-section" id="ve-notes-section">
            <button type="button" id="ve-add-note" class="add-note-btn">Add row</button>
            <div id="ve-notes-rows"></div>
          </div>
        </div>

        <div style="display:block; margin-top:12px;">
          <div style="margin-bottom:6px; font-weight:bold;">Meeting materials</div>
          <input type="url" id="ve-recording-url" value="${ev.recording_url || ''}" placeholder="Link to recording...." style="width:100%; padding:8px; border-radius:6px; border:1px solid #ccc;" />
        </div>

        <div style="margin-top:12px; display:flex; gap:8px; align-items:center;">
          <span id="ve-save-indicator" style="color:#999; font-size:0.9em;"></span>
        </div>
      </form>
    </div>
  `;

  // Проверяем через небольшую задержку, чтобы DOM успел обновиться
  setTimeout(() => {
    const deleteBtnAfterHTML = document.getElementById('delete-event-btn');
    
    if (deleteBtnAfterHTML) {
      
      // Добавляем дополнительный обработчик через setTimeout
      deleteBtnAfterHTML.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        
        const eventTitle = ev.subject;
        
        // Подтверждение с вводом текста
        const deletePhrase = prompt(
          `Для подтверждения удаления введите:\nDelete ${eventTitle}`
        );
        
        if (deletePhrase !== `Delete ${eventTitle}`) {
          alert('Удаление отменено. Текст не совпадает.');
          return;
        }
        
        // Удаляем событие
        try {
          const response = await fetch(`/api/events/${ev.id}`, {
            method: 'DELETE'
          });
          
          if (response.ok) {
            console.log(`✓ Событие "${eventTitle}" удалено`);
            alert(`Событие "${eventTitle}" успешно удалено`);
            
            // Закрываем форму и обновляем календарь
            eventDetails.innerHTML = '';
            await loadEventsFromAPI();
          } else {
            const errorText = await response.text();
            console.error('Ошибка удаления события:', response.status, errorText);
            alert(`Ошибка удаления события: ${response.status}`);
          }
        } catch (error) {
          console.error('Ошибка при удалении события:', error);
          alert('Ошибка при удалении события');
        }
      });
    }
  }, 100);

  // Функция определения платформы по ссылке
  function detectPlatform(url) {
    const urlLower = url.toLowerCase();
    if (urlLower.includes('zoom.us') || urlLower.includes('zoom.com')) {
      return 'Zoom';
    }
    if (urlLower.includes('teams.microsoft.com') || urlLower.includes('teams.live.com')) {
      return 'Teams';
    }
    if (urlLower.includes('meet.google.com') || urlLower.includes('google.com/meet')) {
      return 'Google Meet';
    }
    if (urlLower.includes('telemost') || urlLower.includes('telemost.ru') || urlLower.includes('telemost.by')) {
      return 'Телемост';
    }
    if (urlLower.includes('t.me') || urlLower.includes('telegram.me') || urlLower.includes('telegram.org')) {
      return 'Телеграм';
    }
    return 'Другое';
  }
  
  // Выбор места
  const locButtons = Array.from(document.querySelectorAll('#ve-location-buttons .loc-btn'));
  const addressInput = /** @type {HTMLInputElement} */(document.getElementById('ve-location-address'));
  let editBtn = null;
  
  function updateLocationButtons() {
    const address = addressInput?.value || '';
    const hasLink = address.trim().length > 0;
    
    // Автоопределение платформы
    if (hasLink && !chosenPlace) {
      chosenPlace = detectPlatform(address);
    } else if (hasLink) {
      // Проверяем, не поменялась ли платформа
      const detectedPlatform = detectPlatform(address);
      if (detectedPlatform !== chosenPlace && detectedPlatform !== 'Другое') {
        chosenPlace = detectedPlatform;
      }
    }
    
    locButtons.forEach(btn => {
      const btnType = btn.dataset.value;
      
      if (btnType === chosenPlace && hasLink) {
        // Активная кнопка с ссылкой - синяя с белым текстом
        btn.style.display = 'inline-block';
        btn.style.background = '#0078d4';
        btn.style.color = 'white';
        btn.style.fontWeight = 'bold';
        btn.style.cursor = 'pointer';
        btn.style.paddingRight = '8px';
      } else if (btnType === chosenPlace) {
        // Активная кнопка без ссылки - обычная активная
        btn.style.display = 'inline-block';
        btn.classList.add('active');
        btn.style.background = '';
        btn.style.color = '';
        btn.style.fontWeight = '';
        btn.style.cursor = '';
        btn.style.paddingRight = '';
      } else {
        // Неактивная кнопка - скрываем если есть ссылка и это коммуникационная платформа или Other
        const communicationPlatforms = ['Zoom', 'Teams', 'Google Meet', 'Телемост', 'Телеграм'];
        if (hasLink && (communicationPlatforms.includes(btnType) || btnType === 'Другое')) {
          btn.style.display = 'none';
        } else {
          btn.style.display = 'inline-block';
          btn.classList.remove('active');
          btn.style.background = '';
          btn.style.color = '';
          btn.style.fontWeight = '';
          btn.style.cursor = '';
          btn.style.paddingRight = '';
        }
      }
    });
    
    // Управление кнопкой Edit
    if (hasLink && chosenPlace) {
      if (!editBtn) {
        editBtn = document.createElement('span');
        editBtn.textContent = '✏️';
        editBtn.style.cssText = 'margin-left:8px; font-size:0.7em; cursor:pointer; margin-top:7px;';
        editBtn.addEventListener('click', ()=>{
          if (addressInput) {
            addressInput.style.display = 'block';
            addressInput.focus();
          }
        });
        document.getElementById('ve-location-buttons')?.appendChild(editBtn);
      }
      editBtn.style.display = 'inline';
    } else {
      if (editBtn) editBtn.style.display = 'none';
    }
    
    // Скрываем/показываем поле адреса
    if (addressInput) {
      if (chosenPlace && hasLink) {
        addressInput.style.display = 'none';
      } else {
        addressInput.style.display = 'block';
      }
    }
    
    // Проверяем видимость кнопки копирования ссылки
    setTimeout(() => {
      console.log('🚀 Вызываем checkAndShowCopyLinkButtonForView через setTimeout');
      checkAndShowCopyLinkButtonForView();
    }, 50);
    
    // Проверяем видимость кнопки копирования участников
    setTimeout(() => {
      console.log('🚀 Вызываем checkAndShowCopyAttendeesButtonForView через setTimeout');
      checkAndShowCopyAttendeesButtonForView();
    }, 100);
  }
  
  locButtons.forEach(btn => {
    if (btn.dataset.value === chosenPlace) {
      btn.classList.add('active');
    }
    btn.addEventListener('click', ()=>{
      const btnType = btn.dataset.value;
      const address = addressInput?.value || '';
      const hasLink = address.trim().length > 0;
      
      // Если кнопка уже активна и есть ссылка - открываем встречу
      if (btnType === chosenPlace && hasLink) {
        // Запускаем таймер встречи
        meetingStartTime = new Date();
        console.log('🚀 Встреча началась в', meetingStartTime.toLocaleTimeString());
        window.open(address, '_blank');
        return;
      }
      
      // Иначе делаем кнопку активной
      locButtons.forEach(b=> b.classList.remove('active'));
      btn.classList.add('active');
      chosenPlace = btn.dataset.value || '';
      
      // Скрываем остальные кнопки коммуникационных платформ
      hideOtherLocationButtons(btn);
      
      // Добавляем обработчик двойного клика для сброса выбора
      btn.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Сбрасываем выбор
        btn.classList.remove('active');
        chosenPlace = '';
        
        // Показываем все кнопки снова
        showAllLocationButtons();
        
        updateLocationButtons();
        triggerAutoSave();
      });
      
      updateLocationButtons();
      triggerAutoSave();
    });
  });
  
  // Обновляем кнопки при вводе адреса
  addressInput?.addEventListener('input', ()=>{
    updateLocationButtons();
    checkAndShowCopyLinkButtonForView(); // Проверяем видимость кнопки копирования ссылки
  });
  
  // При потере фокуса - сохраняем и проверяем платформу
  addressInput?.addEventListener('blur', ()=>{
    updateLocationButtons();
    triggerAutoSave();
    checkAndShowCopyLinkButtonForView(); // Проверяем видимость кнопки копирования ссылки
  });
  
  // Инициализация
  updateLocationButtons();

  // Участники как теги
  const tagsContainer = document.getElementById('ve-tags-container');
  const tagsInput = /** @type {HTMLInputElement} */(document.getElementById('ve-attendees-input'));
  const suggestBox = document.getElementById('ve-attendees-suggest');
  currentTags = [...attendees]; // Используем глобальную переменную
  let history = [];
  
  console.log('🔍 Инициализация currentTags в showEvent:', currentTags);
  
  // Загрузка участников из API
  async function loadAttendeesFromAPI(search = ''){
    try {
      const response = await fetch(`/api/attendees?search=${encodeURIComponent(search)}`);
      if (response.ok) {
        const attendees = await response.json();
        return attendees.map(a => {
          let displayName;
          if (a.name && a.surname) {
            displayName = `${a.name} ${a.surname}`;
          } else if (a.name) {
            displayName = a.name;
          } else {
            displayName = a.email;
          }
          
          // Добавляем информацию о последнем использовании
          return {
            displayName: displayName,
            email: a.email,
            lastUsed: a.last_used,
            useCount: a.use_count,
            id: a.id
          };
        });
        
        // Применяем дедупликацию
        return deduplicateAttendees(attendees);
      }
    } catch(err) {
      console.error('Ошибка загрузки участников:', err);
    }
    return [];
  }
  
  // Функция для умного парсинга вводимых данных участника
  function parseAttendeeInput(input) {
    const trimmed = input.trim();
    
    // Если содержит @ - это email
    if (trimmed.includes('@')) {
      return {
        email: trimmed,
        name: null,
        surname: null
      };
    }
    
    // Разбиваем по пробелам
    const parts = trimmed.split(/\s+/).filter(part => part.length > 0);
    
    if (parts.length === 1) {
      // Одно слово - это name
      return {
        email: trimmed, // Используем как email для поиска
        name: trimmed,
        surname: null
      };
    } else if (parts.length === 2) {
      // Два слова - name и surname
      return {
        email: trimmed, // Используем как email для поиска
        name: parts[0],
        surname: parts[1]
      };
    } else {
      // Больше двух слов - считаем все name
      return {
        email: trimmed, // Используем как email для поиска
        name: trimmed,
        surname: null
      };
    }
  }

  async function saveAttendeeToAPI(input){
    try {
      const parsed = parseAttendeeInput(input);
      console.log('🔍 Парсинг участника:', { input, parsed });
      
      const params = new URLSearchParams();
      params.append('email', parsed.email);
      if (parsed.name) params.append('name', parsed.name);
      if (parsed.surname) params.append('surname', parsed.surname);
      
      await fetch(`/api/attendees?${params.toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch(err) {
      console.error('Ошибка сохранения участника:', err);
    }
  }
  
  async function deleteAttendeeFromAPI(email){
    try {
      await fetch(`/api/attendees/${encodeURIComponent(email)}`, {
        method: 'DELETE'
      });
    } catch(err) {
      console.error('Ошибка удаления участника:', err);
    }
  }
  
  loadAttendeesFromAPI().then(list => { history = list; });

  function renderTags(){
    if (!tagsContainer) return;
    tagsContainer.innerHTML = '';
    currentTags.forEach(val => {
      const chip = document.createElement('span');
      chip.className = 'tag-chip';
      chip.textContent = val;
      chip.title = 'ПКМ — удалить';
      chip.addEventListener('contextmenu', (e)=>{
        e.preventDefault();
        currentTags = currentTags.filter(v => v !== val);
        renderTags();
        triggerAutoSave();
        checkAndShowCopyAttendeesButtonForView(); // Проверяем видимость кнопки после удаления участника
      });
      tagsContainer.appendChild(chip);
    });
    
    // Проверяем видимость кнопки после каждого обновления тегов
    checkAndShowCopyAttendeesButtonForView();
  }

  async function addTag(value){
    const v = (value||'').trim();
    if (!v) return;
    console.log('🔍 addTag вызвана с значением:', v);
    console.log('🔍 currentTags до добавления:', currentTags);
    
    if (!currentTags.includes(v)) {
      currentTags.push(v);
      console.log('🔍 currentTags после добавления:', currentTags);
      renderTags();
      triggerAutoSave();
      checkAndShowCopyAttendeesButtonForView(); // Проверяем видимость кнопки после добавления участника
    }
    await saveAttendeeToAPI(v);
    if (!history.includes(v)) {
      history = [v, ...history].slice(0, 200);
    }
  }

  function setSuggestionsVisible(visible){
    if (!suggestBox) return;
    suggestBox.classList.toggle('visible', !!visible);
  }

  async function renderSuggestions(query){
    console.log('DEBUG renderSuggestions: query =', query);
    if (!suggestBox) {
      console.log('DEBUG renderSuggestions: suggestBox не найден');
      return;
    }
    const q = (query||'').trim();
    console.log('DEBUG renderSuggestions: trimmed query =', q);
    const apiList = await loadAttendeesFromAPI(q);
    console.log('DEBUG renderSuggestions: apiList =', apiList);
    const list = apiList.filter(h => !currentTags.includes(h.displayName)).slice(0, 8);
    console.log('DEBUG renderSuggestions: filtered list =', list);
    
    if (list.length === 0) { 
      console.log('DEBUG renderSuggestions: список пуст, скрываем suggestions');
      suggestBox.innerHTML = ''; 
      setSuggestionsVisible(false); 
      return; 
    }
    console.log('DEBUG renderSuggestions: показываем suggestions');
    suggestBox.innerHTML = '';
    list.forEach((item, index) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:4px 8px;';
      
      const textSpan = document.createElement('span');
      textSpan.textContent = item.displayName;
      textSpan.style.flex = '1';
      textSpan.addEventListener('mousedown', (e)=>{
        e.preventDefault();
        addTag(item.displayName);
        if (tagsInput) tagsInput.value = '';
        setSuggestionsVisible(false);
      });
      
      // Добавляем информацию о последнем использовании
      const lastUsedSpan = document.createElement('span');
      if (item.lastUsed) {
        const lastUsedDate = new Date(item.lastUsed);
        const now = new Date();
        const diffDays = Math.floor((now - lastUsedDate) / (1000 * 60 * 60 * 24));
        
        let lastUsedText;
        if (diffDays === 0) {
          lastUsedText = 'сегодня';
        } else if (diffDays === 1) {
          lastUsedText = 'вчера';
        } else if (diffDays < 7) {
          lastUsedText = `${diffDays} дн. назад`;
        } else if (diffDays < 30) {
          lastUsedText = `${Math.floor(diffDays / 7)} нед. назад`;
        } else {
          lastUsedText = `${Math.floor(diffDays / 30)} мес. назад`;
        }
        
        lastUsedSpan.textContent = lastUsedText;
        lastUsedSpan.style.cssText = 'font-size:0.8em; color:#666; margin-left:8px;';
        lastUsedSpan.title = `Последний раз использован: ${lastUsedDate.toLocaleDateString('ru-RU')}`;
      }
      
      const deleteBtn = document.createElement('span');
      deleteBtn.textContent = '✕';
      deleteBtn.style.cssText = 'cursor:pointer; color:#999; padding:0 4px; display:none; font-weight:bold;';
      deleteBtn.title = 'Удалить из истории';
      deleteBtn.addEventListener('mousedown', async (e)=>{
        e.preventDefault();
        e.stopPropagation();
        await deleteAttendeeFromAPI(item.email);
        history = history.filter(h => h !== item.displayName);
        await renderSuggestions(query);
      });
      
      row.addEventListener('mouseenter', ()=> deleteBtn.style.display = 'inline');
      row.addEventListener('mouseleave', ()=> deleteBtn.style.display = 'none');
      
      row.appendChild(textSpan);
      if (lastUsedSpan.textContent) {
        row.appendChild(lastUsedSpan);
      }
      row.appendChild(deleteBtn);
      suggestBox.appendChild(row);
    });
    setSuggestionsVisible(true);
  }

  tagsInput?.addEventListener('keydown', (e)=>{
    if (e.key === 'Enter' || e.key === ','){
      e.preventDefault();
      // Если есть выбранный элемент в suggestions, добавляем его
      const selectedSuggestion = suggestBox?.querySelector('.suggestion-selected');
      if (selectedSuggestion) {
        const text = selectedSuggestion.querySelector('span').textContent;
        addTag(text);
        tagsInput.value = '';
        setSuggestionsVisible(false);
      } else {
        // Иначе добавляем то, что введено в поле
        addTag(tagsInput.value);
        tagsInput.value = '';
        setSuggestionsVisible(false);
      }
    } else if (e.key === 'ArrowDown'){
      e.preventDefault();
      const suggestions = suggestBox?.querySelectorAll('div');
      if (suggestions && suggestions.length > 0) {
        const currentSelected = suggestBox?.querySelector('.suggestion-selected');
        if (currentSelected) {
          currentSelected.classList.remove('suggestion-selected');
          const next = currentSelected.nextElementSibling;
          if (next) {
            next.classList.add('suggestion-selected');
          } else {
            suggestions[0].classList.add('suggestion-selected');
          }
        } else {
          suggestions[0].classList.add('suggestion-selected');
        }
      }
    } else if (e.key === 'ArrowUp'){
      e.preventDefault();
      const suggestions = suggestBox?.querySelectorAll('div');
      if (suggestions && suggestions.length > 0) {
        const currentSelected = suggestBox?.querySelector('.suggestion-selected');
        if (currentSelected) {
          currentSelected.classList.remove('suggestion-selected');
          const prev = currentSelected.previousElementSibling;
          if (prev) {
            prev.classList.add('suggestion-selected');
          } else {
            suggestions[suggestions.length - 1].classList.add('suggestion-selected');
          }
        } else {
          suggestions[suggestions.length - 1].classList.add('suggestion-selected');
        }
      }
    } else if (e.key === 'Escape'){
      setSuggestionsVisible(false);
    } else if (e.key === 'Backspace' && !tagsInput.value && currentTags.length){
      currentTags.pop();
      renderTags();
      triggerAutoSave();
    }
  });
  tagsInput?.addEventListener('input', ()=>{
    renderSuggestions(tagsInput.value);
    checkAndShowCopyAttendeesButtonForView(); // Проверяем видимость кнопки при вводе
  });
  tagsInput?.addEventListener('blur', ()=>{
    if (tagsInput.value.trim()) addTag(tagsInput.value);
    tagsInput.value = '';
    setSuggestionsVisible(false);
    checkAndShowCopyAttendeesButtonForView(); // Проверяем видимость кнопки после изменения участников
  });

  renderTags();

  // Stream как теги
  const streamContainer = document.getElementById('ve-stream-container');
  const streamInput = /** @type {HTMLInputElement} */(document.getElementById('ve-stream-input'));
  const streamSuggestBox = document.getElementById('ve-stream-suggest');
  let currentStreams = [...streams];
  let streamHistory = [];
  
  // Загрузка streams из API
  async function loadStreamsFromAPI(search = ''){
    try {
      const response = await fetch(`/api/streams?search=${encodeURIComponent(search)}`);
      if (response.ok) {
        const streams = await response.json();
        return streams;
      }
    } catch(err) {
      console.error('Ошибка загрузки streams:', err);
    }
    // Fallback к localStorage
    return await loadStreamsFromStorage();
  }
  
  // Загрузка streams из localStorage (fallback)
  async function loadStreamsFromStorage(){
    try {
      const stored = localStorage.getItem('stream_history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
  
  async function saveStreamToStorage(stream){
    try {
      const history = await loadStreamsFromStorage();
      if (!history.includes(stream)) {
        const updated = [stream, ...history].slice(0, 200);
        localStorage.setItem('stream_history', JSON.stringify(updated));
      }
    } catch(err) {
      console.error('Ошибка сохранения stream:', err);
    }
  }
  
  loadStreamsFromStorage().then(list => { streamHistory = list; });

  function renderStreams(){
    if (!streamContainer) return;
    streamContainer.innerHTML = '';
    currentStreams.forEach(val => {
      const chip = document.createElement('span');
      chip.className = 'tag-chip';
      chip.textContent = val;
      chip.title = 'ПКМ — удалить';
      chip.addEventListener('contextmenu', (e)=>{
        e.preventDefault();
        currentStreams = currentStreams.filter(v => v !== val);
        renderStreams();
        triggerAutoSave();
      });
      streamContainer.appendChild(chip);
    });
  }

  async function addStream(value){
    const v = (value||'').trim();
    if (!v) return;
    if (!currentStreams.includes(v)) {
      currentStreams.push(v);
      renderStreams();
      triggerAutoSave();
    }
    await saveStreamToStorage(v);
    if (!streamHistory.includes(v)) {
      streamHistory = [v, ...streamHistory].slice(0, 200);
    }
  }

  function setStreamSuggestionsVisible(visible){
    if (!streamSuggestBox) return;
    streamSuggestBox.classList.toggle('visible', !!visible);
  }

  async function renderStreamSuggestions(query){
    if (!streamSuggestBox) return;
    const q = (query||'').trim().toLowerCase();
    const apiList = await loadStreamsFromAPI(q);
    const list = apiList.filter(h => !currentStreams.includes(h)).slice(0, 8);
    
    if (list.length === 0) { streamSuggestBox.innerHTML = ''; setStreamSuggestionsVisible(false); return; }
    streamSuggestBox.innerHTML = '';
    list.forEach(item => {
      const row = document.createElement('div');
      row.className = 'suggestion-item'; // Используем стандартный класс для навигации стрелками
      row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:4px 8px;';
      
      const textSpan = document.createElement('span');
      textSpan.textContent = item;
      textSpan.style.flex = '1';
      
      // Функция для добавления stream
      const addStreamAction = (e) => {
        e.preventDefault();
        addStream(item);
        if (streamInput) streamInput.value = '';
        setStreamSuggestionsVisible(false);
      };
      
      // Обработчики на row для поддержки клика и Enter
      textSpan.addEventListener('mousedown', addStreamAction);
      row.addEventListener('click', addStreamAction);
      
      row.appendChild(textSpan);
      streamSuggestBox.appendChild(row);
    });
    setStreamSuggestionsVisible(true);
  }

  streamInput?.addEventListener('keydown', (e)=>{
    if (e.key === 'Enter' || e.key === ','){
      e.preventDefault();
      const selectedSuggestion = streamSuggestBox?.querySelector('.suggestion-selected');
      if (selectedSuggestion) {
        selectedSuggestion.click();
      } else {
        addStream(streamInput.value);
        streamInput.value = '';
        setStreamSuggestionsVisible(false);
      }
    } else if (e.key === 'ArrowDown'){
      e.preventDefault();
      const suggestions = streamSuggestBox?.querySelectorAll('div');
      if (suggestions && suggestions.length > 0) {
        const currentSelected = streamSuggestBox?.querySelector('.suggestion-selected');
        if (currentSelected) {
          currentSelected.classList.remove('suggestion-selected');
          const next = currentSelected.nextElementSibling;
          if (next) {
            next.classList.add('suggestion-selected');
          } else {
            suggestions[0].classList.add('suggestion-selected');
          }
        } else {
          suggestions[0].classList.add('suggestion-selected');
        }
      }
    } else if (e.key === 'ArrowUp'){
      e.preventDefault();
      const suggestions = streamSuggestBox?.querySelectorAll('div');
      if (suggestions && suggestions.length > 0) {
        const currentSelected = streamSuggestBox?.querySelector('.suggestion-selected');
        if (currentSelected) {
          currentSelected.classList.remove('suggestion-selected');
          const prev = currentSelected.previousElementSibling;
          if (prev) {
            prev.classList.add('suggestion-selected');
          } else {
            suggestions[suggestions.length - 1].classList.add('suggestion-selected');
          }
        } else {
          suggestions[suggestions.length - 1].classList.add('suggestion-selected');
        }
      }
    } else if (e.key === 'Escape'){
      setStreamSuggestionsVisible(false);
    } else if (e.key === 'Backspace' && !streamInput.value && currentStreams.length){
      currentStreams.pop();
      renderStreams();
      triggerAutoSave();
    }
  });
  streamInput?.addEventListener('input', ()=>{
    renderStreamSuggestions(streamInput.value);
  });
  streamInput?.addEventListener('blur', ()=>{
    if (streamInput.value.trim()) addStream(streamInput.value);
    streamInput.value = '';
    setStreamSuggestionsVisible(false);
  });

  renderStreams();

  // Заметки/открытые вопросы
  const notesRowsEl = document.getElementById('ve-notes-rows');
  const addNoteBtn = document.getElementById('ve-add-note');
  let noteItems = [];
  
  // Парсим существующие заметки из ev.notes
  if (ev.notes) {
    if (Array.isArray(ev.notes)) {
      // Если notes - это массив объектов (новый формат)
      for (let noteIndex = 0; noteIndex < ev.notes.length; noteIndex++) {
        const noteObj = ev.notes[noteIndex];
        const noteData = {
          text: noteObj.text || '',
          time: noteObj.time || '',
          person: noteObj.person || '',
          isQuestion: noteObj.is_question || false,
          due: null,
          stream: noteObj.topic || null,
          important: false,
          asap: false,
          resolved: noteObj.resolved || false,
          resolved_at: noteObj.resolved_at || null,
          id: noteObj.id || null
        };
        
        // Проверяем, есть ли теги в тексте заметки (только для логирования)
        console.log(`🔍 Проверяем заметку "${noteData.text}" на наличие тегов. allStreamsData:`, allStreamsData);
        if (noteData.text && allStreamsData && allStreamsData.length > 0) {
          const extractedTags = extractTagsFromText(noteData.text, allStreamsData);
          console.log(`🏷️ Извлечены теги из заметки "${noteData.text}":`, extractedTags);
          if (extractedTags.length > 0) {
            console.log(`🏷️ Найдены теги в заметке "${noteData.text}":`, extractedTags);
            console.log(`ℹ️ Автоматическое создание Open Questions будет выполнено при сохранении события`);
          } else {
            console.log(`⚠️ Теги не найдены в заметке "${noteData.text}"`);
          }
        } else {
          console.log(`⚠️ Пропускаем проверку тегов: allStreamsData не загружена или пуста`);
        }
        
        noteItems.push(noteData);
      }
    } else if (typeof ev.notes === 'string' && ev.notes.trim()) {
      // Если notes - это строка (старый формат)
      const notesLines = ev.notes.split('\n').filter(line => line.trim());
      notesLines.forEach(note => {
        // Проверяем, является ли строка уже отформатированной с метаданными
        const isFormattedWithMetadata = note.includes(' | ') && (note.includes('[') || note.includes(']'));
        
        if (isFormattedWithMetadata) {
          // Если строка уже содержит метаданные в формате [time | person | #topic], 
          // то это старая заметка, которую не нужно парсить повторно
          noteItems.push({
            text: note, // Сохраняем как есть
            time: '',
            person: '',
            isQuestion: false,
            due: null,
            topic: null,
            important: false,
            asap: false
          });
        } else {
          // Формат может быть: "[HH:MM] [Person] [#topic] Note text"
          const parsed = parseQuestionMetadata(note);
          noteItems.push({
            text: parsed.text || note,
            time: parsed.time || '',
            person: parsed.person || '',
            isQuestion: false, // Обычные заметки
            due: parsed.due || null,
            stream: parsed.stream || null,
            important: parsed.important || false,
            asap: parsed.asap || false
          });
        }
      });
    }
  }

  // Парсим существующие open_questions
  if (openQuestions && openQuestions.length > 0) {
    openQuestions.forEach(q => {
      // Проверяем, является ли строка уже отформатированной с метаданными
      const isFormattedWithMetadata = q.includes(' | ') && (q.includes('[') || q.includes(']'));
      
      if (isFormattedWithMetadata) {
        // Если строка уже содержит метаданные в формате [time | person | #topic], 
        // то это старая заметка, которую не нужно парсить повторно
        noteItems.push({
          text: q, // Сохраняем как есть
          time: '',
          person: '',
          isQuestion: false,
          due: null,
          topic: null,
          important: false,
          asap: false
        });
      } else {
        // Формат может быть: "[HH:MM] [Person] [#topic] Question text"
        const parsed = parseQuestionMetadata(q);
        noteItems.push({
          text: parsed.text || q,
          time: parsed.time || '',
          person: parsed.person || '',
          isQuestion: false, // По умолчанию обычные заметки, не вопросы
          due: parsed.due || null,
          stream: parsed.stream || null,
          important: parsed.important || false,
          asap: parsed.asap || false
        });
      }
    });
  }


  function renderNoteRows(){
    if (!notesRowsEl) return;
    notesRowsEl.innerHTML = '';
    noteItems.forEach((n, idx)=>{
      const row = document.createElement('div');
      row.className = 'note-row';

      // Выпадающий список с доступными минутами
      const timeSelect = document.createElement('select');
      
      // Парсим время начала и конца встречи
      const [startHour, startMin] = formatHM(startMoscow).split(':').map(Number);
      const [endHour, endMin] = formatHM(endMoscow).split(':').map(Number);
      
      // Генерируем список минут для диапазона встречи
      // Начинаем с 00:00, независимо от времени начала встречи
      const meetingDurationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
      
      // Добавляем опцию "не выбрано"
      const defaultOpt = document.createElement('option');
      defaultOpt.value = '';
      defaultOpt.textContent = '--:--';
      timeSelect.appendChild(defaultOpt);
      
      for (let minutesFromStart = 0; minutesFromStart <= meetingDurationMinutes; minutesFromStart += 5) {
        const h = Math.floor(minutesFromStart / 60);
        const m = minutesFromStart % 60;
        const timeValue = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const displayValue = timeValue; // Показываем полное время в формате HH:MM
        
        const opt = document.createElement('option');
        opt.value = timeValue;
        opt.textContent = displayValue;
        if (n.time === timeValue) opt.selected = true;
        timeSelect.appendChild(opt);
      }
      
      timeSelect.addEventListener('change', ()=>{ 
        n.time = timeSelect.value; 
        triggerAutoSave();
      });
      row.appendChild(timeSelect);

      // Поле ввода для персоны с автокомплитом
      const personContainer = document.createElement('div');
      personContainer.className = 'note-person-container';
      
      // Checkbox для персоны (resolved статус)
      const personCheckbox = document.createElement('input');
      personCheckbox.type = 'checkbox';
      personCheckbox.className = 'note-person-checkbox';
      personCheckbox.checked = n.resolved || false;
      personCheckbox.addEventListener('change', async () => {
        n.resolved = personCheckbox.checked;
        personCheckbox.title = n.resolved ? 'Отмечено как решенное' : 'Отметить как решенное';
        
        // Обновляем заметку в базе данных
        if (n.id) {
          try {
            const response = await safeFetch(`/api/meeting-notes/update/${n.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                resolved: n.resolved
              })
            });

            if (response) {
              console.log(`✅ Обновлен статус resolved для заметки ID ${n.id}: ${n.resolved}`);
              showNotification(`Статус заметки обновлен: ${n.resolved ? 'Решена' : 'Не решена'}`, 'success');
            } else {
              throw new Error('Не удалось обновить статус заметки');
            }
          } catch (error) {
            console.error(`❌ Ошибка обновления статуса resolved для заметки ID ${n.id}:`, error);
            alert('Ошибка при обновлении статуса заметки. Попробуйте еще раз.');
            // Откатываем состояние чекбокса в случае ошибки
            personCheckbox.checked = !n.resolved;
            n.resolved = !n.resolved;
          }
        } else {
          // Если заметка без ID, создаем её в базе данных
          console.log(`⚠️ Заметка без ID, создаем в базе данных: ${n.resolved}`);
          try {
            const response = await safeFetch('/api/meeting-notes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                event_id: ev.id,
                text: n.text,
                time: n.time,
                person: n.person,
                isQuestion: n.isQuestion,
                resolved: n.resolved
              })
            });

            if (response && response.id) {
              n.id = response.id;
              console.log(`✅ Заметка создана в базе данных с ID ${response.id}`);
              showNotification(`Статус заметки обновлен: ${n.resolved ? 'Решена' : 'Не решена'}`, 'success');
            } else {
              throw new Error('Не удалось создать заметку');
            }
          } catch (error) {
            console.error(`❌ Ошибка создания заметки:`, error);
            showNotification('Ошибка при создании заметки. Попробуйте еще раз.', 'error');
            // Откатываем состояние чекбокса в случае ошибки
            personCheckbox.checked = !n.resolved;
            n.resolved = !n.resolved;
          }
        }
        triggerAutoSave();
      });
      
      const personInput = document.createElement('input');
      personInput.type = 'text';
      personInput.className = 'note-person';
      personInput.placeholder = 'Who';
      personInput.value = n.person || '';
      
      // Обработчик клавиатуры для навигации по предложениям
      personInput.addEventListener('keydown', (e) => {
        // Сначала проверяем глобальный автокомплит
        let suggestionsBox = document.getElementById('global-suggestions-box');
        let suggestions = [];
        
        if (suggestionsBox && suggestionsBox.style.display !== 'none') {
          suggestions = suggestionsBox.querySelectorAll('.suggestion-item');
        } else {
          // Если глобального нет, проверяем локальный
          suggestionsBox = personSuggestBox;
          if (suggestionsBox && suggestionsBox.style.display !== 'none') {
            suggestions = suggestionsBox.querySelectorAll('.suggestion-item');
          }
        }
        
        if (suggestions.length === 0) return;
        
        let selectedIndex = -1;
        suggestions.forEach((item, index) => {
          if (item.classList.contains('suggestion-selected')) {
            selectedIndex = index;
          }
        });
        
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            // Убираем выделение с текущего элемента
            suggestions.forEach(item => item.classList.remove('suggestion-selected'));
            
            // Выделяем следующий элемент
            if (selectedIndex === -1 || selectedIndex === suggestions.length - 1) {
              selectedIndex = 0;
            } else {
              selectedIndex++;
            }
            suggestions[selectedIndex].classList.add('suggestion-selected');
            break;
            
          case 'ArrowUp':
            e.preventDefault();
            // Убираем выделение с текущего элемента
            suggestions.forEach(item => item.classList.remove('suggestion-selected'));
            
            // Выделяем предыдущий элемент
            if (selectedIndex === -1 || selectedIndex === 0) {
              selectedIndex = suggestions.length - 1;
            } else {
              selectedIndex--;
            }
            suggestions[selectedIndex].classList.add('suggestion-selected');
            break;
            
          case 'Enter':
            e.preventDefault();
            const selectedItem = suggestionsBox.querySelector('.suggestion-selected');
            if (selectedItem) {
              personInput.value = selectedItem.textContent;
              n.person = selectedItem.textContent;
              hideGlobalSuggestionsBox();
              if (personSuggestBox) {
                personSuggestBox.style.display = 'none';
              }
              triggerAutoSave();
            }
            break;
            
          case 'Escape':
            e.preventDefault();
            hideGlobalSuggestionsBox();
            if (personSuggestBox) {
              personSuggestBox.style.display = 'none';
            }
            break;
        }
      });
      
      const personSuggestBox = document.createElement('div');
      personSuggestBox.className = 'suggestions-box';
      
      personContainer.appendChild(personInput);
      personContainer.appendChild(personSuggestBox);
      row.appendChild(personContainer);
      
      // Функция для рендеринга предложений с использованием глобального автокомплита
      async function renderPersonSuggestions(query) {
        const q = (query || '').trim();
        
        try {
          const response = await fetch(`/api/attendees?search=${encodeURIComponent(q)}`);
          if (response.ok) {
            const attendees = await response.json();
            const list = attendees.map(a => {
              if (a.name && a.surname) {
                return `${a.name} ${a.surname}`;
              } else if (a.name) {
                return a.name;
              } else {
                return a.email;
              }
            }).slice(0, 8);
            
            if (list.length === 0) {
              hideGlobalSuggestionsBox();
              return;
            }
            
            // Создаем или получаем глобальный автокомплит
            const globalBox = createGlobalSuggestionsBox();
            globalBox.innerHTML = '';
            
            list.forEach((item) => {
              const row = document.createElement('div');
              row.className = 'suggestion-item';
              row.textContent = item;
              row.addEventListener('mousedown', (e) => {
                e.preventDefault();
                personInput.value = item;
                n.person = item;
                hideGlobalSuggestionsBox();
                triggerAutoSave();
              });
              globalBox.appendChild(row);
            });
            
            // Позиционируем глобальный автокомплит
            const rect = personInput.getBoundingClientRect();
            
            globalBox.style.top = (rect.bottom + window.scrollY) + 'px';
            globalBox.style.left = (rect.left + window.scrollX) + 'px';
            globalBox.style.width = rect.width + 'px';
            globalBox.style.display = 'block';
            
            console.log('🔍 Global suggestions box positioned and shown:', {
              top: globalBox.style.top,
              left: globalBox.style.left,
              width: globalBox.style.width,
              display: globalBox.style.display,
              itemsCount: list.length
            });
            
            // Проверяем, не выходит ли список за границы экрана
            const viewportHeight = window.innerHeight;
            const dropdownHeight = Math.min(200, list.length * 32);
            const bottomPosition = rect.bottom + dropdownHeight;
            
            if (bottomPosition > viewportHeight) {
              // Если не помещается снизу, показываем сверху
              globalBox.style.top = (rect.top + window.scrollY - dropdownHeight) + 'px';
            }
          }
        } catch (err) {
          console.error('Ошибка загрузки участников:', err);
        }
      }
      
      // Обработчики событий
      personInput.addEventListener('input', () => {
        // При вводе скрываем глобальный автокомплит перед показом нового
        hideGlobalSuggestionsBox();
        renderPersonSuggestions(personInput.value);
      });
      
      personInput.addEventListener('focus', () => {
        // При фокусе на поле скрываем глобальный автокомплит
        hideGlobalSuggestionsBox();
      });
      
      personInput.addEventListener('blur', () => {
        setTimeout(() => {
          hideGlobalSuggestionsBox();
        }, 200);
      });
      
      // Обновляем позицию глобального автокомплита при прокрутке или изменении размера окна
      window.addEventListener('scroll', () => {
        if (globalSuggestionsBox && globalSuggestionsBox.style.display === 'block') {
          const rect = personInput.getBoundingClientRect();
          globalSuggestionsBox.style.top = (rect.bottom + window.scrollY) + 'px';
          globalSuggestionsBox.style.left = (rect.left + window.scrollX) + 'px';
        }
      });
      
      window.addEventListener('resize', () => {
        if (globalSuggestionsBox && globalSuggestionsBox.style.display === 'block') {
          const rect = personInput.getBoundingClientRect();
          globalSuggestionsBox.style.top = (rect.bottom + window.scrollY) + 'px';
          globalSuggestionsBox.style.left = (rect.left + window.scrollX) + 'px';
          globalSuggestionsBox.style.width = rect.width + 'px';
        }
      });
      
      personInput.addEventListener('change', () => {
        n.person = personInput.value;
        triggerAutoSave();
      });

      // Поле для текста заметки (что сказал)
      const textInput = document.createElement('textarea');
      textInput.className = 'note-input';
      textInput.placeholder = 'Said ...';
      textInput.value = n.text;
      textInput.rows = 1;
      textInput.style.cssText = 'resize: vertical; min-height: 32px;';
      textInput.addEventListener('input', ()=>{ 
        n.text = textInput.value; 
        autoResizeTextarea(textInput);
        triggerAutoSave();
      });
      
      // Автоматическое изменение размера при вставке текста
      textInput.addEventListener('paste', () => {
        setTimeout(() => autoResizeTextarea(textInput), 0);
      });
      
      // Настраиваем автокомплит тегов
      setupTagAutocomplete(textInput);
      
      // Настраиваем автокомплит участников
      setupAttendeeAutocomplete(textInput);
      
      row.appendChild(textInput);

      // Создаем контейнер для кнопок ASAP и IMP
      const buttonsContainer = document.createElement('div');
      buttonsContainer.className = 'note-buttons-container';
      buttonsContainer.style.cssText = 'display:flex; align-items:center; gap:4px; white-space:nowrap;';
      
      // Добавляем checkbox для персоны в контейнер кнопок
      buttonsContainer.appendChild(personCheckbox);
      
      // Кнопка ASAP
      const asapBtn = document.createElement('button');
      asapBtn.type = 'button';
      asapBtn.className = 'note-asap-btn';
      asapBtn.textContent = 'ASAP';
      asapBtn.classList.toggle('active', !!n.isASAP);
      asapBtn.addEventListener('click', async () => {
        // Защита от множественных кликов
        if (asapBtn.disabled) {
          console.log('⚠️ Кнопка ASAP уже обрабатывается, пропускаем клик');
          return;
        }
        
        asapBtn.disabled = true;
        asapBtn.textContent = '⏳';
        
        try {
          n.isASAP = !n.isASAP;
          asapBtn.classList.toggle('active', n.isASAP);
          
          // Если включаем ASAP, создаем вопрос в базе данных
          if (n.isASAP) {
            await createQuestionFromNote(n, idx, ev.id);
          }
          
          triggerAutoSave();
        } finally {
          // Восстанавливаем кнопку
          asapBtn.disabled = false;
          asapBtn.textContent = 'ASAP';
        }
      });
      
      // Кнопка IMP
      const impBtn = document.createElement('button');
      impBtn.type = 'button';
      impBtn.className = 'note-imp-btn';
      impBtn.textContent = 'IMP';
      impBtn.classList.toggle('active', !!n.isIMP);
      impBtn.addEventListener('click', async () => {
        // Защита от множественных кликов
        if (impBtn.disabled) {
          console.log('⚠️ Кнопка IMP уже обрабатывается, пропускаем клик');
          return;
        }
        
        impBtn.disabled = true;
        impBtn.textContent = '⏳';
        
        try {
          n.isIMP = !n.isIMP;
          impBtn.classList.toggle('active', n.isIMP);
          
          // Если включаем IMP, создаем вопрос в базе данных
          if (n.isIMP) {
            await createQuestionFromNote(n, idx, ev.id);
          }
          
          triggerAutoSave();
        } finally {
          // Восстанавливаем кнопку
          impBtn.disabled = false;
          impBtn.textContent = 'IMP';
        }
      });
      
      buttonsContainer.appendChild(impBtn);
      buttonsContainer.appendChild(asapBtn);
      
      row.appendChild(buttonsContainer);
      notesRowsEl.appendChild(row);
      
      // Инициализируем размер textarea
      autoResizeTextarea(textInput);
    });
  }

  function addNoteRow(prefill = ''){
    // Автоматически подставляем время с начала встречи
    const autoTime = getTimeSinceMeetingStart();
    noteItems.push({ text: prefill, time: autoTime, person: '', isQuestion: false, due: null, stream: null, important: false, asap: false });
    renderNoteRows();
  }

  addNoteBtn?.addEventListener('click', ()=> addNoteRow(''));
  if (noteItems.length === 0) addNoteRow('');
  renderNoteRows();

  // Актуальные открытые вопросы для встречи
  const actualQuestionsRowsEl = document.getElementById('ve-actual-questions-rows');
  const addActualQuestionBtn = document.getElementById('ve-add-actual-question');
  let actualQuestions = [];
  
  console.log('🔍 DEBUG: Full event data from API:', ev);
  console.log('🔍 DEBUG: ev.actual_open_questions value:', ev.actual_open_questions);
  console.log('🔍 DEBUG: ev.actual_open_questions type:', typeof ev.actual_open_questions);
  
  if (ev.actual_open_questions && ev.actual_open_questions.trim()) {
    const lines = ev.actual_open_questions.split('\n').filter(l => l.trim());
    console.log('🔍 DEBUG: Parsed lines from actual_open_questions:', lines);
    lines.forEach(line => {
      const completed = line.startsWith('✓ ');
      const text = completed ? line.substring(2) : (line.startsWith('○ ') ? line.substring(2) : line);
      actualQuestions.push({ text, completed });
    });
  } else {
    console.log('🔍 DEBUG: No actual_open_questions found in event data');
  }
  
  console.log('🔍 DEBUG: Final actualQuestions after parsing:', actualQuestions);
  
  function renderActualQuestions() {
    if (!actualQuestionsRowsEl) return;
    actualQuestionsRowsEl.innerHTML = '';
    
    actualQuestions.forEach((q, idx) => {
      const row = document.createElement('div');
      row.className = 'actual-question-row';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'actual-question-checkbox';
      checkbox.checked = q.completed || false;
      checkbox.addEventListener('change', (e) => {
        console.log('🔍 DEBUG: Checkbox changed for question', idx, 'to', e.target.checked);
        actualQuestions[idx].completed = e.target.checked;
        console.log('🔍 DEBUG: actualQuestions after checkbox change:', actualQuestions);
        triggerAutoSave();
      });
      
      const textInput = document.createElement('textarea');
      textInput.className = 'actual-question-text';
      textInput.value = q.text;
      textInput.placeholder = 'Question ...';
      textInput.rows = 1;
      textInput.style.cssText = 'resize: vertical; min-height: 32px;';
      textInput.addEventListener('input', (e) => {
        console.log('🔍 DEBUG: Text changed for question', idx, 'to:', e.target.value);
        actualQuestions[idx].text = e.target.value;
        console.log('🔍 DEBUG: actualQuestions after text change:', actualQuestions);
        autoResizeTextarea(textInput);
        triggerAutoSave();
      });
      
      // Автоматическое изменение размера при вставке текста
      textInput.addEventListener('paste', () => {
        setTimeout(() => autoResizeTextarea(textInput), 0);
      });
      
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'actual-question-delete-btn';
      deleteBtn.textContent = '✕';
      deleteBtn.addEventListener('click', () => {
        actualQuestions.splice(idx, 1);
        renderActualQuestions();
        triggerAutoSave();
      });
      
      row.appendChild(checkbox);
      row.appendChild(textInput);
      row.appendChild(deleteBtn);
      actualQuestionsRowsEl.appendChild(row);
      
      // Инициализируем размер textarea
      autoResizeTextarea(textInput);
    });
  }
  
  function addActualQuestion(text = '') {
    console.log('🔍 DEBUG: Adding new actual question with text:', text);
    actualQuestions.push({ text, completed: false });
    console.log('🔍 DEBUG: actualQuestions after adding:', actualQuestions);
    renderActualQuestions();
  }
  
  // Автосохранение изменений
  let saveTimeout = null;
  let lastSavedData = null; // Сохраняем последние сохраненные данные для сравнения
  const saveIndicator = document.getElementById('ve-save-indicator');
  
  function triggerAutoSave() {
    clearTimeout(saveTimeout);
    
    if (!ev || !ev.id) {
      console.log('DEBUG: triggerAutoSave - нет события или ID');
      return;
    }
    
    console.log('DEBUG: triggerAutoSave вызван для события ID:', ev.id, 'subject:', ev.subject);
    
    if (saveIndicator) {
      saveIndicator.textContent = 'Изменяется...';
      saveIndicator.style.color = '#999';
    }
    
    // Увеличиваем задержку до 3 секунд для уменьшения частоты запросов
    saveTimeout = setTimeout(async () => {
      console.log('DEBUG: triggerAutoSave - выполняется автосохранение для события ID:', ev.id, 'subject:', ev.subject);
      
      const titleEl = /** @type {HTMLInputElement} */(document.getElementById('ve-title'));
      const addressEl = /** @type {HTMLInputElement} */(document.getElementById('ve-location-address'));
      const recUrlEl = /** @type {HTMLInputElement} */(document.getElementById('ve-recording-url'));
      const actualQuestionsEl = /** @type {HTMLTextAreaElement} */(document.getElementById('ve-actual-questions'));
      
      let fullLocation = '';
      if (chosenPlace) {
        fullLocation = addressEl?.value ? `${chosenPlace}: ${addressEl.value}` : chosenPlace;
      } else {
        fullLocation = addressEl?.value || '';
      }

      // Формируем open_questions из noteItems (только вопросы) как объекты с полями
      const questions = noteItems
        .filter(n => n.isQuestion && n.text.trim())
        .map(n => ({
          text: n.text.trim(),
          time: n.time || null,
          person: n.person || null,
          stream: n.stream || null,
          important: n.important || false,
          asap: n.asap || false
        }));
      
      console.log(`🔄 Создаем Open Questions из заметок:`, questions);
      
      console.log(`📝 Всего Open Questions из заметок: ${questions.length}`, questions);

      // Формируем все заметки как отдельные объекты с полями
      const allNotes = noteItems
        .filter(n => n.text.trim())
        .map(n => ({
          id: n.id || null,  // Включаем ID заметки для обновления существующих
          text: n.text.trim(),
          time: n.time || null,
          person: n.person || null,
          stream: n.stream || null,
          isASAP: n.isASAP || false,
          isIMP: n.isIMP || false
        }));
      
      // Если заметки были мигрированы из старого формата, логируем это
      if (allNotes.length > 0) {
        console.log('📝 Сохраняем заметки в новом формате:', allNotes);
      }

      console.log('DEBUG: noteItems:', noteItems);
      console.log('DEBUG: allNotes:', allNotes);
      console.log('DEBUG: recUrlEl?.value:', recUrlEl?.value);

      // Собираем актуальные вопросы в строку с маркером actual-question
      console.log('🔍 DEBUG: actualQuestions before processing:', actualQuestions);
      const actualQuestionsText = actualQuestions
        .filter(q => q.text.trim())
        .map(q => `${q.completed ? '✓ ' : '○ '}${q.text.trim()}`)
        .join('\n');
      console.log('🔍 DEBUG: actualQuestionsText:', actualQuestionsText);
      
      // Добавляем actual-question маркер в notes
      let notesWithActualQuestions = '';
      if (actualQuestionsText) {
        notesWithActualQuestions = `actual-question:${actualQuestionsText}`;
      }
      
      // Получаем новые значения времени
      const startTimeEl = document.getElementById('ve-start-time');
      const endTimeEl = document.getElementById('ve-end-time');
      
      // Проверяем, изменилось ли время
      console.log('🔍 DEBUG: ev.start =', ev.start, 'ev.end =', ev.end);
      const originalStartDate = utcToMoscow(ev.start);
      const originalEndDate = utcToMoscow(ev.end);
      const originalStartTime = formatHM(originalStartDate);
      const originalEndTime = formatHM(originalEndDate);
      
      const newStartTime = startTimeEl?.value || originalStartTime;
      const newEndTime = endTimeEl?.value || originalEndTime;
      
      let newStartDate = originalStartDate;
      let newEndDate = originalEndDate;
      
      // Обновляем время только если оно действительно изменилось
      const timeChanged = newStartTime !== originalStartTime || newEndTime !== originalEndTime;
      
      if (timeChanged) {
        console.log('DEBUG: Время изменилось, обновляем:', {
          originalStart: originalStartTime,
          originalEnd: originalEndTime,
          newStart: newStartTime,
          newEnd: newEndTime
        });
        
        const [startHour, startMinute] = newStartTime.split(':').map(Number);
        const [endHour, endMinute] = newEndTime.split(':').map(Number);
        
        // Создаем новые даты напрямую из компонентов даты
        // Используем utcToMoscow для правильной интерпретации московского времени
        const eventDate = utcToMoscow(ev.start);
        const year = eventDate.getFullYear();
        const month = eventDate.getMonth();
        const day = eventDate.getDate();
        
        newStartDate = new Date(year, month, day, startHour, startMinute, 0, 0);
        newEndDate = new Date(year, month, day, endHour, endMinute, 0, 0);
        
        console.log('DEBUG: Новые даты:', {
          newStartDate: newStartDate.toISOString(),
          newEndDate: newEndDate.toISOString()
        });
      } else {
        console.log('DEBUG: Время не изменилось, используем оригинальное');
      }
      
      const subject = titleEl?.value?.trim() || ev.subject;
      
      // Проверяем, что название события не пустое
      if (!subject) {
        console.log('DEBUG: Название события пустое, пропускаем сохранение');
        if (saveIndicator) {
          saveIndicator.textContent = 'Ошибка: название не может быть пустым';
          saveIndicator.style.color = '#ff4444';
        }
        return;
      }
      
      const updatedEvent = {
        subject: subject,
        start: toMoscowISOString(newStartDate),
        end: toMoscowISOString(newEndDate),
        location: fullLocation,
        attendees: currentTags.slice(),
        stream: currentStreams.slice(),
        notes: allNotes, // Теперь отправляем как массив объектов
        recording_url: recUrlEl?.value || '',
        open_questions: questions,
        actual_open_questions: actualQuestionsText
      };

      console.log('🔍 DEBUG: updatedEvent before API call:', updatedEvent);
      console.log('🔍 DEBUG: actual_open_questions in updatedEvent:', updatedEvent.actual_open_questions);
      console.log('DEBUG: recUrlEl?.value:', recUrlEl?.value);
      console.log('DEBUG: recording_url в updatedEvent:', updatedEvent.recording_url);
      console.log('🔍 DEBUG: timeChanged =', timeChanged, 'ev.start =', ev.start, 'updatedEvent.start =', updatedEvent.start);

      // Проверяем, есть ли реальные изменения
      const currentDataString = JSON.stringify(updatedEvent);
      if (lastSavedData === currentDataString) {
        console.log('🔍 DEBUG: Данные не изменились, пропускаем сохранение');
        if (saveIndicator) {
          saveIndicator.textContent = '✓ Сохранено';
          saveIndicator.style.color = '#28a745';
        }
        return;
      }

      try {
        const response = await fetch(`/api/events/${ev.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedEvent)
        });

        if (response.ok) {
          console.log('✓ Изменения сохранены');
          
          // Сохраняем данные для сравнения в следующий раз
          lastSavedData = currentDataString;
          
          if (saveIndicator) {
            saveIndicator.textContent = '✓ Сохранено';
            saveIndicator.style.color = '#4CAF50';
            setTimeout(() => {
              if (saveIndicator) saveIndicator.textContent = '';
            }, 2000);
          }
          
          Object.assign(ev, updatedEvent);
          
          // Обновляем noteItems с правильными ID из ответа API
          if (response.ok) {
            try {
              const responseData = await response.json();
              if (responseData && responseData.notes) {
                console.log('🔍 DEBUG: Обновляем noteItems с ID из API:', responseData.notes);
                
                // Обновляем noteItems с правильными ID
                noteItems.forEach((noteItem, index) => {
                  if (responseData.notes[index]) {
                    noteItem.id = responseData.notes[index].id;
                    noteItem.resolved = responseData.notes[index].resolved || false;
                    noteItem.resolved_at = responseData.notes[index].resolved_at || null;
                    console.log(`🔍 DEBUG: Обновлена заметка ${index} с ID ${noteItem.id}`);
                  }
                });
                
                // НЕ перерисовываем заметки, чтобы сохранить состояние чекбоксов
              }
            } catch (error) {
              console.error('❌ Ошибка при обновлении ID записок:', error);
            }
          }
          
          await loadEventsFromAPI();
          
          // Автоматически создаем Open Questions из заметок с тегами после сохранения
          console.log('🔄 Проверяем заметки события на наличие тегов для автоматического создания Open Questions...');
          await processEventNotesForAutoOpenQuestions(ev);
        } else {
          console.error('Ошибка сохранения изменений');
          
          // Показываем уведомление об ошибке
          const errorText = response.status === 409 
            ? 'Конфликт времени! Попробуйте изменить время события или обновите страницу.'
            : `Ошибка сохранения изменений (${response.status}). Попробуйте еще раз.`;
          showNotification(errorText, 'error');
          
          if (saveIndicator) {
            saveIndicator.textContent = '✗ Ошибка';
            saveIndicator.style.color = '#ff4444';
          }
        }
      } catch(err) {
        console.error('Ошибка автосохранения:', err);
        if (saveIndicator) {
          saveIndicator.textContent = '✗ Ошибка';
          saveIndicator.style.color = '#ff4444';
        }
      }
      
      // Проверяем видимость кнопки "Get participants" после сохранения
      checkAndShowCopyAttendeesButtonForView();
    }, 3000);
  }

  // Привязываем автосохранение к полям
  document.getElementById('ve-title')?.addEventListener('input', () => {
    triggerAutoSave();
    checkAndShowCopyLinkButtonForView();
  });
  document.getElementById('ve-location-address')?.addEventListener('input', triggerAutoSave);
  document.getElementById('ve-recording-url')?.addEventListener('input', triggerAutoSave);
  document.getElementById('ve-recording-url')?.addEventListener('blur', triggerAutoSave);
  document.getElementById('ve-start-time')?.addEventListener('change', triggerAutoSave);
  document.getElementById('ve-end-time')?.addEventListener('change', triggerAutoSave);
  // ve-actual-questions теперь обрабатываются через actualQuestions array
  
  // Обработчик кнопки Delete
  const deleteBtn = document.getElementById('delete-event-btn');
  if (deleteBtn) {
    // Добавляем обработчик с дополнительным логированием
    deleteBtn.addEventListener('click', async (event) => {
    
    const eventTitle = ev.subject;
    
    // Подтверждение с вводом текста
    const deletePhrase = prompt(
      `Для подтверждения удаления введите:\nDelete ${eventTitle}`
    );
    
    if (deletePhrase !== `Delete ${eventTitle}`) {
      alert('Удаление отменено. Текст не совпадает.');
      return;
    }
    
    // Удаляем событие
    try {
      const response = await fetch(`/api/events/${ev.id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        console.log(`✓ Событие "${eventTitle}" удалено`);
        alert(`Событие "${eventTitle}" успешно удалено`);
        
        // Закрываем форму и обновляем календарь
        eventDetails.innerHTML = '';
        await loadEventsFromAPI();
      } else {
        alert('Ошибка при удалении события');
      }
    } catch (err) {
      console.error('Ошибка при удалении:', err);
      alert('Ошибка при удалении события');
    }
  });
  } else {
    // Альтернативный способ - делегирование событий
    const eventBlock = document.querySelector('.event-block');
    if (eventBlock) {
      eventBlock.addEventListener('click', async (event) => {
        if (event.target && event.target.id === 'delete-event-btn') {
          
          const eventTitle = ev.subject;
          
          // Подтверждение с вводом текста
          const deletePhrase = prompt(
            `Для подтверждения удаления введите:\nDelete ${eventTitle}`
          );
          
          if (deletePhrase !== `Delete ${eventTitle}`) {
            alert('Удаление отменено. Текст не совпадает.');
            return;
          }
          
          // Удаляем событие
          try {
            const response = await fetch(`/api/events/${ev.id}`, {
              method: 'DELETE'
            });
            
            if (response.ok) {
              console.log(`✓ Событие "${eventTitle}" удалено`);
              alert(`Событие "${eventTitle}" успешно удалено`);
              
              // Закрываем форму и обновляем календарь
              eventDetails.innerHTML = '';
              await loadEventsFromAPI();
            } else {
              const errorText = await response.text();
              console.error('Ошибка удаления события:', response.status, errorText);
              alert(`Ошибка удаления события: ${response.status}`);
            }
          } catch (error) {
            console.error('Ошибка при удалении события:', error);
            alert('Ошибка при удалении события');
          }
        }
      });
    }
  }

  // Обработчик кнопки Reschedule
  document.getElementById('reschedule-event-btn')?.addEventListener('click', () => {
    showRescheduleModal(ev);
  });

  // Обработчик кнопки копирования участников в модальном окне просмотра
  document.getElementById('ve-copy-attendees-btn')?.addEventListener('click', async () => {
    console.log('🔘 НАЖАТИЕ НА КНОПКУ "Получить участников"');
    
    const subject = document.getElementById('ve-title')?.value.trim();
    if (!subject) {
      console.log('❌ ОШИБКА: Не найдено название события');
      alert('Сначала введите название события');
      return;
    }
    
    console.log('📝 Название события:', subject);
    
    const copyBtn = document.getElementById('ve-copy-attendees-btn');
    const originalText = copyBtn.textContent;
    copyBtn.textContent = '⏳';
    copyBtn.disabled = true;
    
    console.log('🔄 Ищем предыдущее событие с участниками...');
    
    try {
      const previousAttendees = await copyAttendeesFromPreviousEvent(subject);
      console.log('👥 Результат поиска участников:', previousAttendees ? `Найдено ${previousAttendees.length}` : 'Не найдено');
      
      if (previousAttendees && previousAttendees.length > 0) {
        console.log('📋 Найденные участники:', previousAttendees);
        
        // Добавляем участников в текущее событие
        const attendeesContainer = document.getElementById('ve-tags-container');
        if (attendeesContainer) {
          console.log('📝 Состояние участников ДО добавления:', attendeesContainer.querySelectorAll('.tag').length);
          
          // Очищаем текущих участников
          attendeesContainer.innerHTML = '';
          currentTags = []; // Очищаем массив currentTags
          
          // Добавляем участников из предыдущего события
          previousAttendees.forEach(attendee => {
            const tag = document.createElement('span');
            tag.className = 'tag';
            tag.textContent = attendee;
            tag.style.cssText = 'background: #e3f2fd; color: #1976d2; padding: 4px 8px; border-radius: 12px; margin: 2px; display: inline-block; font-size: 0.85em;';
            
            // Добавляем обработчик правой кнопки мыши для удаления
            tag.addEventListener('contextmenu', (e) => {
              e.preventDefault();
              tag.remove();
              // Удаляем из currentTags
              currentTags = currentTags.filter(t => t !== attendee);
              triggerAutoSave();
              checkAndShowCopyAttendeesButtonForView(); // Проверяем видимость кнопки после удаления
            });
            
            attendeesContainer.appendChild(tag);
            currentTags.push(attendee); // Добавляем в currentTags
          });
          
          console.log('📝 Состояние участников ПОСЛЕ добавления:', attendeesContainer.querySelectorAll('.tag').length);
          console.log('🔍 currentTags после копирования:', currentTags);
        }
        
        console.log('✅ Скопированы участники из предыдущего события:', previousAttendees);
        triggerAutoSave(); // Сохраняем изменения
        console.log('💾 Изменения сохранены в базу данных');
        
        console.log('🔍 Вызываем проверку видимости кнопки после копирования...');
        checkAndShowCopyAttendeesButtonForView(); // Проверяем видимость кнопки после копирования
      } else {
        console.log('❌ Предыдущее событие с таким названием не найдено или не содержит участников');
        alert('Предыдущее событие с таким названием не найдено или не содержит участников');
      }
    } catch (error) {
      console.error('❌ Ошибка копирования участников:', error);
      alert('Ошибка при копировании участников');
    } finally {
      copyBtn.textContent = originalText;
      copyBtn.disabled = false;
      console.log('🔘 Кнопка восстановлена');
    }
  });
  document.getElementById('ve-copy-link-btn')?.addEventListener('click', async () => {
    console.log('🔘 НАЖАТИЕ НА КНОПКУ "Получить ссылку"');
    
    const subject = document.getElementById('ve-title')?.value.trim();
    if (!subject) {
      console.log('❌ ОШИБКА: Не найдено название события');
      alert('Сначала введите название события');
      return;
    }
    
    console.log('📝 Название события:', subject);
    
    const copyBtn = document.getElementById('ve-copy-link-btn');
    const originalText = copyBtn.textContent;
    copyBtn.textContent = '⏳';
    copyBtn.disabled = true;
    
    console.log('🔄 Ищем предыдущее событие с ссылкой...');
    
    try {
      const previousLink = await copyLinkFromPreviousEvent(subject);
      console.log('🔗 Результат поиска ссылки:', previousLink ? 'Найдена' : 'Не найдена');
      
      if (previousLink) {
        console.log('📋 Найденная ссылка:', previousLink.substring(0, 100) + '...');
        
        const addressInput = document.getElementById('ve-location-address');
        if (addressInput) {
          console.log('📝 Состояние поля адреса ДО вставки:', addressInput.value.substring(0, 50) + '...');
          
          addressInput.value = previousLink;
          console.log('📝 Состояние поля адреса ПОСЛЕ вставки:', addressInput.value.substring(0, 50) + '...');
          
          addressInput.style.borderColor = '#4CAF50';
          setTimeout(() => {
            addressInput.style.borderColor = '#ccc';
          }, 2000);
        }
        
        console.log('✅ Скопирована ссылка из предыдущего события:', previousLink);
        triggerAutoSave(); // Сохраняем изменения
        console.log('💾 Изменения сохранены в базу данных');
        
        console.log('🔍 Вызываем проверку видимости кнопки после копирования...');
        checkAndShowCopyLinkButtonForView(); // Проверяем видимость кнопки после копирования
      } else {
        console.log('❌ Предыдущее событие с таким названием не найдено или не содержит ссылку');
        alert('Предыдущее событие с таким названием не найдено или не содержит ссылку');
      }
    } catch (error) {
      console.error('❌ Ошибка копирования ссылки:', error);
      alert('Ошибка при копировании ссылки');
    } finally {
      copyBtn.textContent = originalText;
      copyBtn.disabled = false;
      console.log('🔘 Кнопка восстановлена');
    }
  });

  // Инициализация кнопки копирования ссылки для модального окна просмотра
  setTimeout(() => {
    console.log('🚀 ИНИЦИАЛИЗАЦИЯ КНОПКИ КОПИРОВАНИЯ ДЛЯ МОДАЛЬНОГО ОКНА ПРОСМОТРА');
    checkAndShowCopyLinkButtonForView();
  }, 100);

  // Добавляем обработчик для кнопки "Add question" в секции Actual Open Questions
  if (addActualQuestionBtn) {
    addActualQuestionBtn.addEventListener('click', () => {
      addActualQuestion('');
    });
  }

  // Инициализируем отображение actual questions
  renderActualQuestions();
}

// Форма создания события для пустого слота
function showCreateForm(slotEl){
  const slotDateStr = slotEl.dataset.date; // YYYY-MM-DD
  const startTimeStr = slotEl.dataset.start; // HH:MM
  const endTimeStr = slotEl.dataset.end; // HH:MM

  console.log('Создание формы для слота:', {
    date: slotDateStr,
    start: startTimeStr,
    end: endTimeStr
  });

  window.startISO = createMoscowTime(slotDateStr, startTimeStr);
  window.endISO = createMoscowTime(slotDateStr, endTimeStr);
  
  console.log('ISO даты:', {
    start: window.startISO,
    end: window.endISO
  });

  eventDetails.innerHTML = `
    <div class="event-block">
      <form id="create-event-form">
        <input type="text" id="ce-title" placeholder="Название встречи" required style="width:100%; font-size:1.1rem; padding:8px; border-radius:6px; border:1px solid #ccc;" />

        <div style="margin-top:10px; display:flex; align-items:center; gap:12px; justify-content:space-between;">
          <span id="ce-time">${formatDateOnly(startISO)} · ${formatHM(startISO)} – ${formatHM(endISO)}</span>
          <div id="ce-location-buttons" style="display:flex; gap:6px; flex-wrap:wrap;">
            <button type="button" class="loc-btn" data-value="Zoom" title="Zoom - popular video conferencing platform">
              <img src="logos_pics/Zoom.svg?v=3" width="20" height="20" alt="Zoom" style="object-fit: contain;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
              <span style="display:none; font-size:12px;">Z</span>
            </button>
            <button type="button" class="loc-btn" data-value="Teams" title="Microsoft Teams - video conferencing and collaboration platform">
              <img src="logos_pics/teams.png?v=1" width="20" height="20" alt="Microsoft Teams" style="object-fit: contain;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
              <span style="display:none; font-size:12px;">T</span>
            </button>
            <button type="button" class="loc-btn" data-value="Google Meet" title="Google Meet - video conferencing by Google">
              <img src="logos_pics/meet.png?v=1" width="20" height="20" alt="Google Meet" style="object-fit: contain;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
              <span style="display:none; font-size:12px;">G</span>
            </button>
            <button type="button" class="loc-btn" data-value="Телемост" title="Yandex Telemost - video conferencing for large groups">
              <img src="logos_pics/telemost.jpeg?v=1" width="20" height="20" alt="Yandex Telemost" style="object-fit: contain;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
              <span style="display:none; font-size:12px;">Y</span>
            </button>
            <button type="button" class="loc-btn" data-value="Телеграм" title="Telegram - messenger for quick communication">
              <img src="logos_pics/telegram.png?v=1" width="20" height="20" alt="Telegram" style="object-fit: contain;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
              <span style="display:none; font-size:12px;">T</span>
            </button>
            <button type="button" class="loc-btn" data-value="Другое" title="Other - choose another way to conduct the meeting">Other</button>
          </div>
        </div>

        <div style="margin-top:8px; display: flex; gap: 8px; align-items: center;">
          <input type="text" id="ce-location-address" placeholder="Link for the meeting" style="flex: 1; padding:8px; border-radius:6px; border:1px solid #ccc;" />
          <button type="button" id="ce-copy-link-btn" title="Получить ссылку из прошлого события" style="padding: 8px 12px; background: #4285f4; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 11px; display: none;">🔗 Получить ссылку</button>
        </div>

        <div style="display:block; margin-top:10px;">
          <div style="margin-bottom:6px; font-weight:bold;">Participants</div>
          <div class="tag-input" id="ce-attendees-tags">
            <div class="tags" id="ce-tags-container"></div>
            <input type="text" id="ce-attendees-input" placeholder="Start to input name or e-mail..." />
            <div class="suggestions" id="ce-attendees-suggest"></div>
          </div>
        </div>

        <div style="display:block; margin-top:10px;">
          <div style="margin-bottom:6px; font-weight:bold;">Stream</div>
          <div class="tag-input" id="ce-stream-tags">
            <div class="tags" id="ce-stream-container"></div>
            <input type="text" id="ce-stream-input" placeholder="Start to input tag or stream..." />
            <div class="suggestions" id="ce-stream-suggest"></div>
          </div>
        </div>
         <div class="section-box">
           <div class="section-title" onclick="toggleSection('ce-actual-questions-section')">
             <span class="section-toggle">▼</span>
             Actual open questions for the meeting
           </div>
           <div class="section-content actual-questions-section" id="ce-actual-questions-section">
             <button type="button" id="ce-add-actual-question" class="add-note-btn">Add question</button>
             <div id="ce-actual-questions-rows"></div>
           </div>
         </div>
         <div class="section-box">
           <div class="section-title" onclick="toggleSection('ce-notes-section')">
             <span class="section-toggle">▼</span>
             Notes
           </div>
           <div class="section-content notes-section" id="ce-notes-section">
             <button type="button" id="ce-add-note" class="add-note-btn">Add row</button>
             <div id="ce-notes-rows"></div>
           </div>
         </div>
         <div style="display:block; margin-top:12px;">
           <div style="margin-bottom:6px; font-weight:bold;">Meeting materials</div>
           <input type="url" id="ce-recording-url" placeholder="Link to recording...." style="width:100%; padding:8px; border-radius:6px; border:1px solid #ccc;" />
         </div>
        <div style="margin-top:12px; display:flex; gap:8px;">
          <button type="button" id="ce-cancel" style="display:none;">Отмена</button>
        </div>
      </form>
    </div>
  `;

  const form = document.getElementById('create-event-form');
  const cancelBtn = document.getElementById('ce-cancel');
  cancelBtn?.addEventListener('click', ()=>{ eventDetails.innerHTML = ''; });

  // Инициализация кнопки копирования ссылки
  setTimeout(() => {
    checkAndShowCopyLinkButton();
  }, 100);

  // Функция определения платформы по ссылке
  function detectPlatform(url) {
    const urlLower = url.toLowerCase();
    if (urlLower.includes('zoom.us') || urlLower.includes('zoom.com')) {
      return 'Zoom';
    }
    if (urlLower.includes('teams.microsoft.com') || urlLower.includes('teams.live.com')) {
      return 'Teams';
    }
    if (urlLower.includes('meet.google.com') || urlLower.includes('google.com/meet')) {
      return 'Google Meet';
    }
    if (urlLower.includes('telemost') || urlLower.includes('telemost.ru') || urlLower.includes('telemost.by')) {
      return 'Телемост';
    }
    if (urlLower.includes('t.me') || urlLower.includes('telegram.me') || urlLower.includes('telegram.org')) {
      return 'Телеграм';
    }
    return 'Другое';
  }
  
  // Выбор места
  let chosenPlace = '';
  const locButtons = Array.from(document.querySelectorAll('#ce-location-buttons .loc-btn'));
  const addressInput = /** @type {HTMLInputElement} */(document.getElementById('ce-location-address'));
  let editBtn = null;
  
  function updateLocationButtons() {
    const address = addressInput?.value || '';
    const hasLink = address.trim().length > 0;
    
    console.log('🔍 DEBUG: updateLocationButtons (create) called', { address, hasLink, chosenPlace });
    
    // Автоопределение платформы
    if (hasLink && !chosenPlace) {
      chosenPlace = detectPlatform(address);
      console.log('🔍 DEBUG: Auto-detected platform (create):', chosenPlace);
    } else if (hasLink) {
      // Проверяем, не поменялась ли платформа
      const detectedPlatform = detectPlatform(address);
      if (detectedPlatform !== chosenPlace && detectedPlatform !== 'Другое') {
        chosenPlace = detectedPlatform;
        console.log('🔍 DEBUG: Platform changed to (create):', chosenPlace);
      }
    }
    
    locButtons.forEach(btn => {
      const btnType = btn.dataset.value;
      
      if (btnType === chosenPlace && hasLink) {
        // Активная кнопка с ссылкой - синяя с белым текстом
        btn.style.display = 'inline-block';
        btn.style.background = '#0078d4';
        btn.style.color = 'white';
        btn.style.fontWeight = 'bold';
        btn.style.cursor = 'pointer';
        btn.style.paddingRight = '8px';
      } else if (btnType === chosenPlace) {
        // Активная кнопка без ссылки - обычная активная
        btn.style.display = 'inline-block';
        btn.classList.add('active');
        btn.style.background = '';
        btn.style.color = '';
        btn.style.fontWeight = '';
        btn.style.cursor = '';
        btn.style.paddingRight = '';
      } else {
        // Неактивная кнопка - скрываем если есть ссылка и это коммуникационная платформа или Other
        const communicationPlatforms = ['Zoom', 'Teams', 'Google Meet', 'Телемост', 'Телеграм'];
        if (hasLink && (communicationPlatforms.includes(btnType) || btnType === 'Другое')) {
          btn.style.display = 'none';
        } else {
          btn.style.display = 'inline-block';
          btn.classList.remove('active');
          btn.style.background = '';
          btn.style.color = '';
          btn.style.fontWeight = '';
          btn.style.cursor = '';
          btn.style.paddingRight = '';
        }
      }
    });
    
    // Управление кнопкой Edit
    if (hasLink && chosenPlace) {
      if (!editBtn) {
        editBtn = document.createElement('span');
        editBtn.textContent = '✏️';
        editBtn.style.cssText = 'margin-left:8px; font-size:0.7em; cursor:pointer; margin-top:7px;';
        editBtn.addEventListener('click', ()=>{
          if (addressInput) {
            addressInput.style.display = 'block';
            addressInput.focus();
          }
        });
        document.getElementById('ce-location-buttons')?.appendChild(editBtn);
      }
      editBtn.style.display = 'inline';
    } else {
      if (editBtn) editBtn.style.display = 'none';
    }
    
    // Скрываем/показываем поле адреса
    if (addressInput) {
      if (chosenPlace && hasLink) {
        addressInput.style.display = 'none';
      } else {
        addressInput.style.display = 'block';
      }
    }
    
    // Проверяем видимость кнопки копирования ссылки
    setTimeout(() => {
      checkAndShowCopyLinkButton();
    }, 50);
  }
  
  locButtons.forEach(btn => {
    btn.addEventListener('click', ()=>{
      const btnType = btn.dataset.value;
      const address = addressInput?.value || '';
      const hasLink = address.trim().length > 0;
      
      // Если кнопка уже активна и есть ссылка - открываем встречу
      if (btnType === chosenPlace && hasLink) {
        // Запускаем таймер встречи
        meetingStartTime = new Date();
        console.log('🚀 Встреча началась в', meetingStartTime.toLocaleTimeString());
        window.open(address, '_blank');
        return;
      }
      
      // Иначе делаем кнопку активной
      locButtons.forEach(b=> b.classList.remove('active'));
      btn.classList.add('active');
      chosenPlace = btn.dataset.value || '';
      
      // Скрываем остальные кнопки коммуникационных платформ
      hideOtherLocationButtons(btn);
      
      // Добавляем обработчик двойного клика для сброса выбора
      btn.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Сбрасываем выбор
        btn.classList.remove('active');
        chosenPlace = '';
        
        // Показываем все кнопки снова
        showAllLocationButtons();
        
        updateLocationButtons();
      });
      
      updateLocationButtons();
    });
  });
  
  // Обновляем кнопки при вводе адреса
  addressInput?.addEventListener('input', ()=>{
    updateLocationButtons();
  });
  
  // При потере фокуса - сохраняем и проверяем платформу
  addressInput?.addEventListener('blur', ()=>{
    updateLocationButtons();
  });

  // Участники как теги
  const tagsContainer = document.getElementById('ce-tags-container');
  const tagsInput = /** @type {HTMLInputElement} */(document.getElementById('ce-attendees-input'));
  const suggestBox = document.getElementById('ce-attendees-suggest');
  /** @type {string[]} */
  currentTags = []; // Используем глобальную переменную

  let history = [];
  
  console.log('🔍 Инициализация currentTags в showCreateForm:', currentTags);
  
  // Загрузка участников из API
  async function loadAttendeesFromAPI(search = ''){
    try {
      const response = await fetch(`/api/attendees?search=${encodeURIComponent(search)}`);
      if (response.ok) {
        const attendees = await response.json();
        return attendees.map(a => {
          let displayName;
          if (a.name && a.surname) {
            displayName = `${a.name} ${a.surname}`;
          } else if (a.name) {
            displayName = a.name;
          } else {
            displayName = a.email;
          }
          
          // Добавляем информацию о последнем использовании
          return {
            displayName: displayName,
            email: a.email,
            lastUsed: a.last_used,
            useCount: a.use_count,
            id: a.id
          };
        });
        
        // Применяем дедупликацию
        return deduplicateAttendees(attendees);
      }
    } catch(err) {
      console.error('Ошибка загрузки участников:', err);
    }
    return [];
  }
  
  // Функция для умного парсинга вводимых данных участника
  function parseAttendeeInput(input) {
    const trimmed = input.trim();
    
    // Если содержит @ - это email
    if (trimmed.includes('@')) {
      return {
        email: trimmed,
        name: null,
        surname: null
      };
    }
    
    // Разбиваем по пробелам
    const parts = trimmed.split(/\s+/).filter(part => part.length > 0);
    
    if (parts.length === 1) {
      // Одно слово - это name
      return {
        email: trimmed, // Используем как email для поиска
        name: trimmed,
        surname: null
      };
    } else if (parts.length === 2) {
      // Два слова - name и surname
      return {
        email: trimmed, // Используем как email для поиска
        name: parts[0],
        surname: parts[1]
      };
    } else {
      // Больше двух слов - считаем все name
      return {
        email: trimmed, // Используем как email для поиска
        name: trimmed,
        surname: null
      };
    }
  }

  // Сохранение участника в API
  async function saveAttendeeToAPI(input){
    try {
      const parsed = parseAttendeeInput(input);
      console.log('🔍 Парсинг участника:', { input, parsed });
      
      const params = new URLSearchParams();
      params.append('email', parsed.email);
      if (parsed.name) params.append('name', parsed.name);
      if (parsed.surname) params.append('surname', parsed.surname);
      
      await fetch(`/api/attendees?${params.toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch(err) {
      console.error('Ошибка сохранения участника:', err);
    }
  }
  
  // Удаление участника из API
  async function deleteAttendeeFromAPI(email){
    try {
      await fetch(`/api/attendees/${encodeURIComponent(email)}`, {
        method: 'DELETE'
      });
    } catch(err) {
      console.error('Ошибка удаления участника:', err);
    }
  }
  
  // Загружаем начальный список
  loadAttendeesFromAPI().then(list => { history = list; });

  function renderTags(){
    if (!tagsContainer) return;
    tagsContainer.innerHTML = '';
    currentTags.forEach(val => {
      const chip = document.createElement('span');
      chip.className = 'tag-chip';
      chip.textContent = val;
      chip.title = 'ПКМ — удалить';
      chip.addEventListener('contextmenu', (e)=>{
        e.preventDefault();
        currentTags = currentTags.filter(v => v !== val);
        renderTags();
        checkAndShowCopyAttendeesButtonForView(); // Проверяем видимость кнопки после удаления участника
      });
      tagsContainer.appendChild(chip);
    });
  }

  async function addTag(value){
    const v = (value||'').trim();
    if (!v) return;
    if (!currentTags.includes(v)) {
      currentTags.push(v);
      renderTags();
      renderNoteRows(); // Обновляем заметки при добавлении участника
      checkAndShowCopyAttendeesButtonForView(); // Проверяем видимость кнопки после добавления участника
    }
    // Сохраняем в БД
    await saveAttendeeToAPI(v);
    if (!history.includes(v)) {
      history = [v, ...history].slice(0, 200);
    }
  }

  function setSuggestionsVisible(visible){
    if (!suggestBox) return;
    suggestBox.classList.toggle('visible', !!visible);
  }

  async function renderSuggestions(query){
    if (!suggestBox) return;
    const q = (query||'').trim();
    
    // Загружаем из API с поиском
    const apiList = await loadAttendeesFromAPI(q);
    const list = apiList.filter(h => !currentTags.includes(h.displayName)).slice(0, 8);
    
    if (list.length === 0) { suggestBox.innerHTML = ''; setSuggestionsVisible(false); return; }
    suggestBox.innerHTML = '';
    list.forEach((item, index) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:4px 8px;';
      
      const textSpan = document.createElement('span');
      textSpan.textContent = item.displayName;
      textSpan.style.flex = '1';
      textSpan.addEventListener('mousedown', (e)=>{ // mousedown чтобы сработало до blur инпута
        e.preventDefault();
        addTag(item.displayName);
        if (tagsInput) tagsInput.value = '';
        setSuggestionsVisible(false);
      });
      
      // Добавляем информацию о последнем использовании
      const lastUsedSpan = document.createElement('span');
      if (item.lastUsed) {
        const lastUsedDate = new Date(item.lastUsed);
        const now = new Date();
        const diffDays = Math.floor((now - lastUsedDate) / (1000 * 60 * 60 * 24));
        
        let lastUsedText;
        if (diffDays === 0) {
          lastUsedText = 'сегодня';
        } else if (diffDays === 1) {
          lastUsedText = 'вчера';
        } else if (diffDays < 7) {
          lastUsedText = `${diffDays} дн. назад`;
        } else if (diffDays < 30) {
          lastUsedText = `${Math.floor(diffDays / 7)} нед. назад`;
        } else {
          lastUsedText = `${Math.floor(diffDays / 30)} мес. назад`;
        }
        
        lastUsedSpan.textContent = lastUsedText;
        lastUsedSpan.style.cssText = 'font-size:0.8em; color:#666; margin-left:8px;';
        lastUsedSpan.title = `Последний раз использован: ${lastUsedDate.toLocaleDateString('ru-RU')}`;
      }
      
      const deleteBtn = document.createElement('span');
      deleteBtn.textContent = '✕';
      deleteBtn.style.cssText = 'cursor:pointer; color:#999; padding:0 4px; display:none; font-weight:bold;';
      deleteBtn.title = 'Удалить из истории';
      deleteBtn.addEventListener('mousedown', async (e)=>{
        e.preventDefault();
        e.stopPropagation();
        // Удаляем из БД
        await deleteAttendeeFromAPI(item.email);
        history = history.filter(h => h !== item.displayName);
        // Перерисовываем список
        await renderSuggestions(query);
      });
      
      row.addEventListener('mouseenter', ()=> deleteBtn.style.display = 'inline');
      row.addEventListener('mouseleave', ()=> deleteBtn.style.display = 'none');
      
      row.appendChild(textSpan);
      if (lastUsedSpan.textContent) {
        row.appendChild(lastUsedSpan);
      }
      row.appendChild(deleteBtn);
      suggestBox.appendChild(row);
    });
    setSuggestionsVisible(true);
  }

  tagsInput?.addEventListener('keydown', (e)=>{
    if (e.key === 'Enter' || e.key === ','){
      e.preventDefault();
      // Если есть выбранный элемент в suggestions, добавляем его
      const selectedSuggestion = suggestBox?.querySelector('.suggestion-selected');
      if (selectedSuggestion) {
        const text = selectedSuggestion.querySelector('span').textContent;
        addTag(text);
        tagsInput.value = '';
        setSuggestionsVisible(false);
      } else {
        // Иначе добавляем то, что введено в поле
        addTag(tagsInput.value);
        tagsInput.value = '';
        setSuggestionsVisible(false);
      }
    } else if (e.key === 'ArrowDown'){
      e.preventDefault();
      const suggestions = suggestBox?.querySelectorAll('div');
      if (suggestions && suggestions.length > 0) {
        const currentSelected = suggestBox?.querySelector('.suggestion-selected');
        if (currentSelected) {
          currentSelected.classList.remove('suggestion-selected');
          const next = currentSelected.nextElementSibling;
          if (next) {
            next.classList.add('suggestion-selected');
          } else {
            suggestions[0].classList.add('suggestion-selected');
          }
        } else {
          suggestions[0].classList.add('suggestion-selected');
        }
      }
    } else if (e.key === 'ArrowUp'){
      e.preventDefault();
      const suggestions = suggestBox?.querySelectorAll('div');
      if (suggestions && suggestions.length > 0) {
        const currentSelected = suggestBox?.querySelector('.suggestion-selected');
        if (currentSelected) {
          currentSelected.classList.remove('suggestion-selected');
          const prev = currentSelected.previousElementSibling;
          if (prev) {
            prev.classList.add('suggestion-selected');
          } else {
            suggestions[suggestions.length - 1].classList.add('suggestion-selected');
          }
        } else {
          suggestions[suggestions.length - 1].classList.add('suggestion-selected');
        }
      }
    } else if (e.key === 'Escape'){
      setSuggestionsVisible(false);
    } else if (e.key === 'Backspace' && !tagsInput.value && currentTags.length){
      // Удаление последнего тега, если поле пусто
      currentTags.pop();
      renderTags();
    }
  });
  tagsInput?.addEventListener('input', ()=>{
    renderSuggestions(tagsInput.value);
    checkAndShowCopyAttendeesButtonForView(); // Проверяем видимость кнопки при вводе
  });
  tagsInput?.addEventListener('blur', ()=>{
    // Добавляем незавершённый ввод при уходе фокуса
    if (tagsInput.value.trim()) addTag(tagsInput.value);
    tagsInput.value = '';
    setSuggestionsVisible(false);
  });

  // Stream как теги
  const streamContainer = document.getElementById('ce-stream-container');
  const streamInput = /** @type {HTMLInputElement} */(document.getElementById('ce-stream-input'));
  const streamSuggestBox = document.getElementById('ce-stream-suggest');
  let currentStreams = [];
  let streamHistory = [];
  
  // Загрузка streams из API
  async function loadStreamsFromAPI(search = ''){
    try {
      const response = await fetch(`/api/streams?search=${encodeURIComponent(search)}`);
      if (response.ok) {
        const streams = await response.json();
        return streams;
      }
    } catch(err) {
      console.error('Ошибка загрузки streams:', err);
    }
    // Fallback к localStorage
    return await loadStreamsFromStorage();
  }
  
  // Загрузка streams из localStorage (fallback)
  async function loadStreamsFromStorage(){
    try {
      const stored = localStorage.getItem('stream_history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
  
  async function saveStreamToStorage(stream){
    try {
      const history = await loadStreamsFromStorage();
      if (!history.includes(stream)) {
        const updated = [stream, ...history].slice(0, 200);
        localStorage.setItem('stream_history', JSON.stringify(updated));
      }
    } catch(err) {
      console.error('Ошибка сохранения stream:', err);
    }
  }
  
  loadStreamsFromStorage().then(list => { streamHistory = list; });

  function renderStreams(){
    if (!streamContainer) return;
    streamContainer.innerHTML = '';
    currentStreams.forEach(val => {
      const chip = document.createElement('span');
      chip.className = 'tag-chip';
      chip.textContent = val;
      chip.title = 'ПКМ — удалить';
      chip.addEventListener('contextmenu', (e)=>{
        e.preventDefault();
        currentStreams = currentStreams.filter(v => v !== val);
        renderStreams();
      });
      streamContainer.appendChild(chip);
    });
  }

  async function addStream(value){
    const v = (value||'').trim();
    if (!v) return;
    if (!currentStreams.includes(v)) {
      currentStreams.push(v);
      renderStreams();
    }
    await saveStreamToStorage(v);
    if (!streamHistory.includes(v)) {
      streamHistory = [v, ...streamHistory].slice(0, 200);
    }
  }

  function setStreamSuggestionsVisible(visible){
    if (!streamSuggestBox) return;
    streamSuggestBox.classList.toggle('visible', !!visible);
  }

  async function renderStreamSuggestions(query){
    if (!streamSuggestBox) return;
    const q = (query||'').trim().toLowerCase();
    const apiList = await loadStreamsFromAPI(q);
    const list = apiList.filter(h => !currentStreams.includes(h)).slice(0, 8);
    
    if (list.length === 0) { streamSuggestBox.innerHTML = ''; setStreamSuggestionsVisible(false); return; }
    streamSuggestBox.innerHTML = '';
    list.forEach(item => {
      const row = document.createElement('div');
      row.className = 'suggestion-item'; // Добавляем класс для навигации стрелками
      row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:4px 8px;';
      
      const textSpan = document.createElement('span');
      textSpan.textContent = item;
      textSpan.style.flex = '1';
      
      // Функция для добавления stream
      const addStreamAction = (e) => {
        e.preventDefault();
        addStream(item);
        if (streamInput) streamInput.value = '';
        setStreamSuggestionsVisible(false);
      };
      
      // Обработчики на row для поддержки клика и Enter
      textSpan.addEventListener('mousedown', addStreamAction);
      row.addEventListener('click', addStreamAction);
      
      row.appendChild(textSpan);
      streamSuggestBox.appendChild(row);
    });
    setStreamSuggestionsVisible(true);
  }

  streamInput?.addEventListener('keydown', (e)=>{
    if (e.key === 'Enter' || e.key === ','){
      e.preventDefault();
      const selectedSuggestion = streamSuggestBox?.querySelector('.suggestion-selected');
      if (selectedSuggestion) {
        selectedSuggestion.click();
      } else {
        addStream(streamInput.value);
        streamInput.value = '';
        setStreamSuggestionsVisible(false);
      }
    } else if (e.key === 'ArrowDown'){
      e.preventDefault();
      const suggestions = streamSuggestBox?.querySelectorAll('.suggestion-item');
      if (suggestions && suggestions.length > 0) {
        const currentSelected = streamSuggestBox?.querySelector('.suggestion-selected');
        if (currentSelected) {
          currentSelected.classList.remove('suggestion-selected');
          const next = currentSelected.nextElementSibling;
          if (next) {
            next.classList.add('suggestion-selected');
          } else {
            suggestions[0].classList.add('suggestion-selected');
          }
        } else {
          suggestions[0].classList.add('suggestion-selected');
        }
      }
    } else if (e.key === 'ArrowUp'){
      e.preventDefault();
      const suggestions = streamSuggestBox?.querySelectorAll('.suggestion-item');
      if (suggestions && suggestions.length > 0) {
        const currentSelected = streamSuggestBox?.querySelector('.suggestion-selected');
        if (currentSelected) {
          currentSelected.classList.remove('suggestion-selected');
          const prev = currentSelected.previousElementSibling;
          if (prev) {
            prev.classList.add('suggestion-selected');
          } else {
            suggestions[suggestions.length - 1].classList.add('suggestion-selected');
          }
        } else {
          suggestions[suggestions.length - 1].classList.add('suggestion-selected');
        }
      }
    } else if (e.key === 'Backspace' && !streamInput.value && currentStreams.length){
      currentStreams.pop();
      renderStreams();
    }
  });
  streamInput?.addEventListener('input', ()=>{
    renderStreamSuggestions(streamInput.value);
  });
  streamInput?.addEventListener('blur', ()=>{
    if (streamInput.value.trim()) addStream(streamInput.value);
    streamInput.value = '';
    setStreamSuggestionsVisible(false);
  });

  // Заметки как строки с полем времени, персоной и текстом
  const notesRowsEl = document.getElementById('ce-notes-rows');
  const addNoteBtn = document.getElementById('ce-add-note');
  /** @type {{text:string, time:string, person:string, isQuestion:boolean, due:string|null, topic:string|null}[]} */
  let noteItems = [];

  function renderNoteRows(){
    if (!notesRowsEl) return;
    notesRowsEl.innerHTML = '';
    noteItems.forEach((n, idx)=>{
      const row = document.createElement('div');
      row.className = 'note-row';

      // Выпадающий список с доступными минутами
      const timeSelect = document.createElement('select');
      timeSelect.className = 'note-time';
      timeSelect.style.cssText = 'width:100px; padding:6px; border:1px solid #ccc; border-radius:4px; font-size: 14px;';
      
      // Парсим время начала и конца встречи
      const [startHour, startMin] = startTimeStr.split(':').map(Number);
      const [endHour, endMin] = endTimeStr.split(':').map(Number);
      
      // Генерируем список минут для диапазона встречи
      // Начинаем с 00:00, независимо от времени начала встречи
      const meetingDurationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
      
      // Добавляем опцию "не выбрано"
      const defaultOpt = document.createElement('option');
      defaultOpt.value = '';
      defaultOpt.textContent = '--:--';
      timeSelect.appendChild(defaultOpt);
      
      for (let minutesFromStart = 0; minutesFromStart <= meetingDurationMinutes; minutesFromStart += 5) {
        const h = Math.floor(minutesFromStart / 60);
        const m = minutesFromStart % 60;
        const timeValue = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const displayValue = timeValue; // Показываем полное время в формате HH:MM
        
        const opt = document.createElement('option');
        opt.value = timeValue;
        opt.textContent = displayValue;
        if (n.time === timeValue) opt.selected = true;
        timeSelect.appendChild(opt);
      }
      
      timeSelect.addEventListener('change', ()=>{ n.time = timeSelect.value; });
      row.appendChild(timeSelect);

      // Поле ввода для персоны с автокомплитом
      const personContainer = document.createElement('div');
      personContainer.className = 'note-person-container';
      
      // Checkbox для персоны (resolved статус)
      const personCheckbox = document.createElement('input');
      personCheckbox.type = 'checkbox';
      personCheckbox.className = 'note-person-checkbox';
      personCheckbox.checked = n.resolved || false;
      personCheckbox.addEventListener('change', async () => {
        n.resolved = personCheckbox.checked;
        personCheckbox.title = n.resolved ? 'Отмечено как решенное' : 'Отметить как решенное';
        
        // Обновляем заметку в базе данных
        if (n.id) {
          try {
            const response = await safeFetch(`/api/meeting-notes/update/${n.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                resolved: n.resolved
              })
            });

            if (response) {
              console.log(`✅ Обновлен статус resolved для заметки ID ${n.id}: ${n.resolved}`);
              showNotification(`Статус заметки обновлен: ${n.resolved ? 'Решена' : 'Не решена'}`, 'success');
            } else {
              throw new Error('Не удалось обновить статус заметки');
            }
          } catch (error) {
            console.error(`❌ Ошибка обновления статуса resolved для заметки ID ${n.id}:`, error);
            alert('Ошибка при обновлении статуса заметки. Попробуйте еще раз.');
            // Откатываем состояние чекбокса в случае ошибки
            personCheckbox.checked = !n.resolved;
            n.resolved = !n.resolved;
          }
        } else {
          // Если заметка без ID, создаем её в базе данных
          console.log(`⚠️ Заметка без ID, создаем в базе данных: ${n.resolved}`);
          try {
            const response = await safeFetch('/api/meeting-notes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                event_id: ev.id,
                text: n.text,
                time: n.time,
                person: n.person,
                isQuestion: n.isQuestion,
                resolved: n.resolved
              })
            });

            if (response && response.id) {
              n.id = response.id;
              console.log(`✅ Заметка создана в базе данных с ID ${response.id}`);
              showNotification(`Статус заметки обновлен: ${n.resolved ? 'Решена' : 'Не решена'}`, 'success');
            } else {
              throw new Error('Не удалось создать заметку');
            }
          } catch (error) {
            console.error(`❌ Ошибка создания заметки:`, error);
            showNotification('Ошибка при создании заметки. Попробуйте еще раз.', 'error');
            // Откатываем состояние чекбокса в случае ошибки
            personCheckbox.checked = !n.resolved;
            n.resolved = !n.resolved;
          }
        }
        triggerAutoSave();
      });
      
      const personInput = document.createElement('input');
      personInput.type = 'text';
      personInput.className = 'note-person';
      personInput.placeholder = 'Who';
      personInput.value = n.person || '';
      
      // Обработчик клавиатуры для навигации по предложениям
      personInput.addEventListener('keydown', (e) => {
        // Сначала проверяем глобальный автокомплит
        let suggestionsBox = document.getElementById('global-suggestions-box');
        let suggestions = [];
        
        if (suggestionsBox && suggestionsBox.style.display !== 'none') {
          suggestions = suggestionsBox.querySelectorAll('.suggestion-item');
        } else {
          // Если глобального нет, проверяем локальный
          suggestionsBox = personSuggestBox;
          if (suggestionsBox && suggestionsBox.style.display !== 'none') {
            suggestions = suggestionsBox.querySelectorAll('.suggestion-item');
          }
        }
        
        if (suggestions.length === 0) return;
        
        let selectedIndex = -1;
        suggestions.forEach((item, index) => {
          if (item.classList.contains('suggestion-selected')) {
            selectedIndex = index;
          }
        });
        
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            // Убираем выделение с текущего элемента
            suggestions.forEach(item => item.classList.remove('suggestion-selected'));
            
            // Выделяем следующий элемент
            if (selectedIndex === -1 || selectedIndex === suggestions.length - 1) {
              selectedIndex = 0;
            } else {
              selectedIndex++;
            }
            suggestions[selectedIndex].classList.add('suggestion-selected');
            break;
            
          case 'ArrowUp':
            e.preventDefault();
            // Убираем выделение с текущего элемента
            suggestions.forEach(item => item.classList.remove('suggestion-selected'));
            
            // Выделяем предыдущий элемент
            if (selectedIndex === -1 || selectedIndex === 0) {
              selectedIndex = suggestions.length - 1;
            } else {
              selectedIndex--;
            }
            suggestions[selectedIndex].classList.add('suggestion-selected');
            break;
            
          case 'Enter':
            e.preventDefault();
            const selectedItem = suggestionsBox.querySelector('.suggestion-selected');
            if (selectedItem) {
              personInput.value = selectedItem.textContent;
              n.person = selectedItem.textContent;
              hideGlobalSuggestionsBox();
              if (personSuggestBox) {
                personSuggestBox.style.display = 'none';
              }
              triggerAutoSave();
            }
            break;
            
          case 'Escape':
            e.preventDefault();
            hideGlobalSuggestionsBox();
            if (personSuggestBox) {
              personSuggestBox.style.display = 'none';
            }
            break;
        }
      });
      
      const personSuggestBox = document.createElement('div');
      personSuggestBox.className = 'suggestions-box';
      
      personContainer.appendChild(personInput);
      personContainer.appendChild(personSuggestBox);
      row.appendChild(personContainer);
      
      // Функция для рендеринга предложений
      async function renderPersonSuggestions(query) {
        if (!personSuggestBox) return;
        const q = (query || '').trim();
        
        try {
          const response = await fetch(`/api/attendees?search=${encodeURIComponent(q)}`);
          if (response.ok) {
            const attendees = await response.json();
            const list = attendees.map(a => {
              if (a.name && a.surname) {
                return `${a.name} ${a.surname}`;
              } else if (a.name) {
                return a.name;
              } else {
                return a.email;
              }
            }).slice(0, 8);
            
            if (list.length === 0) {
              personSuggestBox.innerHTML = '';
              personSuggestBox.style.display = 'none';
              return;
            }
            
            personSuggestBox.innerHTML = '';
            list.forEach((item) => {
              const row = document.createElement('div');
              row.style.cssText = 'padding: 4px 8px; cursor: pointer;';
              row.textContent = item;
              row.addEventListener('mousedown', (e) => {
                e.preventDefault();
                personInput.value = item;
                n.person = item;
                personSuggestBox.style.display = 'none';
              });
              row.addEventListener('mouseenter', () => {
                row.style.backgroundColor = '#f0f0f0';
              });
              row.addEventListener('mouseleave', () => {
                row.style.backgroundColor = '';
              });
              personSuggestBox.appendChild(row);
            });
            
            // Правильное позиционирование выпадающего списка с максимальным z-index
            const rect = personInput.getBoundingClientRect();
            const currentZIndex = 2147483647; // Максимально возможный z-index (2^31-1)
            
            personSuggestBox.style.position = 'fixed';
            personSuggestBox.style.top = (rect.bottom + window.scrollY) + 'px';
            personSuggestBox.style.left = (rect.left + window.scrollX) + 'px';
            personSuggestBox.style.width = rect.width + 'px';
            personSuggestBox.style.zIndex = currentZIndex;
            personSuggestBox.style.display = 'block';
            
            // Проверяем, не выходит ли список за границы экрана
            const viewportHeight = window.innerHeight;
            const dropdownHeight = Math.min(200, list.length * 32); // Примерная высота
            const bottomPosition = rect.bottom + dropdownHeight;
            
            if (bottomPosition > viewportHeight) {
              // Если не помещается снизу, показываем сверху
              personSuggestBox.style.top = (rect.top + window.scrollY - dropdownHeight) + 'px';
            }
            
            // Дополнительная защита от перекрытия - скрываем все другие автокомплиты
            const allSuggestionsBoxes = document.querySelectorAll('.notes-section .suggestions-box');
            allSuggestionsBoxes.forEach(box => {
              if (box !== personSuggestBox) {
                box.style.display = 'none';
              }
            });
          }
        } catch (err) {
          console.error('Ошибка загрузки участников:', err);
        }
      }
      
      // Обработчики событий
      personInput.addEventListener('input', () => {
        // При вводе скрываем глобальный автокомплит перед показом нового
        hideGlobalSuggestionsBox();
        renderPersonSuggestions(personInput.value);
      });
      
      personInput.addEventListener('focus', () => {
        // При фокусе на поле скрываем глобальный автокомплит
        hideGlobalSuggestionsBox();
      });
      
      personInput.addEventListener('blur', () => {
        setTimeout(() => {
          hideGlobalSuggestionsBox();
        }, 200);
      });
      
      // Обновляем позицию глобального автокомплита при прокрутке или изменении размера окна
      window.addEventListener('scroll', () => {
        if (globalSuggestionsBox && globalSuggestionsBox.style.display === 'block') {
          const rect = personInput.getBoundingClientRect();
          globalSuggestionsBox.style.top = (rect.bottom + window.scrollY) + 'px';
          globalSuggestionsBox.style.left = (rect.left + window.scrollX) + 'px';
        }
      });
      
      window.addEventListener('resize', () => {
        if (globalSuggestionsBox && globalSuggestionsBox.style.display === 'block') {
          const rect = personInput.getBoundingClientRect();
          globalSuggestionsBox.style.top = (rect.bottom + window.scrollY) + 'px';
          globalSuggestionsBox.style.left = (rect.left + window.scrollX) + 'px';
          globalSuggestionsBox.style.width = rect.width + 'px';
        }
      });
      
      personInput.addEventListener('change', () => {
        n.person = personInput.value;
      });

      // Поле для текста заметки (что сказал)
      const textInput = document.createElement('textarea');
      textInput.className = 'note-input';
      textInput.placeholder = 'Said ...';
      textInput.value = n.text;
      textInput.rows = 1;
      textInput.style.cssText = 'resize: vertical; min-height: 32px;';
      textInput.addEventListener('input', ()=>{ 
        n.text = textInput.value; 
        autoResizeTextarea(textInput);
        triggerAutoSave();
      });
      
      // Автоматическое изменение размера при вставке текста
      textInput.addEventListener('paste', () => {
        setTimeout(() => autoResizeTextarea(textInput), 0);
      });
      
      // Настраиваем автокомплит тегов
      setupTagAutocomplete(textInput);
      
      // Настраиваем автокомплит участников
      setupAttendeeAutocomplete(textInput);
      
      row.appendChild(textInput);

      // Создаем контейнер для кнопок ASAP и IMP
      const buttonsContainer = document.createElement('div');
      buttonsContainer.className = 'note-buttons-container';
      buttonsContainer.style.cssText = 'display:flex; align-items:center; gap:4px; white-space:nowrap;';
      
      // Добавляем checkbox для персоны в контейнер кнопок
      buttonsContainer.appendChild(personCheckbox);
      
      // Кнопка ASAP
      const asapBtn = document.createElement('button');
      asapBtn.type = 'button';
      asapBtn.className = 'note-asap-btn';
      asapBtn.textContent = 'ASAP';
      asapBtn.classList.toggle('active', !!n.isASAP);
      asapBtn.addEventListener('click', async () => {
        // Защита от множественных кликов
        if (asapBtn.disabled) {
          console.log('⚠️ Кнопка ASAP уже обрабатывается, пропускаем клик');
          return;
        }
        
        asapBtn.disabled = true;
        asapBtn.textContent = '⏳';
        
        try {
          n.isASAP = !n.isASAP;
          asapBtn.classList.toggle('active', n.isASAP);
          
          // Если включаем ASAP, создаем вопрос в базе данных
          if (n.isASAP) {
            await createQuestionFromNote(n, idx, ev.id);
          }
        } finally {
          // Восстанавливаем кнопку
          asapBtn.disabled = false;
          asapBtn.textContent = 'ASAP';
        }
      });
      
      // Кнопка IMP
      const impBtn = document.createElement('button');
      impBtn.type = 'button';
      impBtn.className = 'note-imp-btn';
      impBtn.textContent = 'IMP';
      impBtn.classList.toggle('active', !!n.isIMP);
      impBtn.addEventListener('click', async () => {
        // Защита от множественных кликов
        if (impBtn.disabled) {
          console.log('⚠️ Кнопка IMP уже обрабатывается, пропускаем клик');
          return;
        }
        
        impBtn.disabled = true;
        impBtn.textContent = '⏳';
        
        try {
          n.isIMP = !n.isIMP;
          impBtn.classList.toggle('active', n.isIMP);
          
          // Если включаем IMP, создаем вопрос в базе данных
          if (n.isIMP) {
            await createQuestionFromNote(n, idx, ev.id);
          }
        } finally {
          // Восстанавливаем кнопку
          impBtn.disabled = false;
          impBtn.textContent = 'IMP';
        }
      });
      
      buttonsContainer.appendChild(impBtn);
      buttonsContainer.appendChild(asapBtn);
      
      row.appendChild(buttonsContainer);

      notesRowsEl.appendChild(row);
      
      // Инициализируем размер textarea
      autoResizeTextarea(textInput);
    });
  }

  function addNoteRow(prefill = ''){
    // Автоматически подставляем время с начала встречи
    const autoTime = getTimeSinceMeetingStart();
    noteItems.push({ text: prefill, time: autoTime, person: '', isQuestion: false, due: null, stream: null, important: false, asap: false });
    renderNoteRows();
  }

  addNoteBtn?.addEventListener('click', ()=> addNoteRow(''));
  // По умолчанию одна пустая строка
  addNoteRow('');

  // Актуальные открытые вопросы для встречи
  const ceActualQuestionsRowsEl = document.getElementById('ce-actual-questions-rows');
  const ceAddActualQuestionBtn = document.getElementById('ce-add-actual-question');
  let ceActualQuestions = [];
  
  function renderCeActualQuestions() {
    if (!ceActualQuestionsRowsEl) return;
    ceActualQuestionsRowsEl.innerHTML = '';
    
    ceActualQuestions.forEach((q, idx) => {
      const row = document.createElement('div');
      row.className = 'actual-question-row';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'actual-question-checkbox';
      checkbox.checked = q.completed || false;
      checkbox.addEventListener('change', (e) => {
        ceActualQuestions[idx].completed = e.target.checked;
      });
      
      const textInput = document.createElement('textarea');
      textInput.className = 'actual-question-text';
      textInput.value = q.text;
      textInput.placeholder = 'Question ...';
      textInput.rows = 1;
      textInput.style.cssText = 'resize: vertical; min-height: 32px;';
      textInput.addEventListener('input', (e) => {
        ceActualQuestions[idx].text = e.target.value;
        autoResizeTextarea(textInput);
      });
      
      // Автоматическое изменение размера при вставке текста
      textInput.addEventListener('paste', () => {
        setTimeout(() => autoResizeTextarea(textInput), 0);
      });
      
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'actual-question-delete-btn';
      deleteBtn.textContent = '✕';
      deleteBtn.addEventListener('click', () => {
        ceActualQuestions.splice(idx, 1);
        renderCeActualQuestions();
      });
      
      row.appendChild(checkbox);
      row.appendChild(textInput);
      row.appendChild(deleteBtn);
      ceActualQuestionsRowsEl.appendChild(row);
      
      // Инициализируем размер textarea
      autoResizeTextarea(textInput);
    });
  }
  
  function addCeActualQuestion(text = '') {
    ceActualQuestions.push({ text, completed: false });
    renderCeActualQuestions();
  }
  
  ceAddActualQuestionBtn?.addEventListener('click', () => addCeActualQuestion(''));
  addCeActualQuestion('');

  // Функция создания события

  // Копирование ссылки из предыдущего события
  async function copyLinkFromPreviousEvent(subject) {
    const previousEvent = await findPreviousEventWithSameName(subject);
    if (previousEvent && previousEvent.location) {
      // Извлекаем ссылку из поля location
      const location = previousEvent.location;
      
      // Ищем ссылки в тексте
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = location.match(urlRegex);
      
      if (urls && urls.length > 0) {
        return urls[0]; // Возвращаем первую найденную ссылку
      }
    }
    return null;
  }

  // Проверка наличия предыдущего события с ссылкой и показ кнопки
  async function checkAndShowCopyLinkButton() {
    const subject = document.getElementById('ce-title')?.value.trim();
    const copyBtn = document.getElementById('ce-copy-link-btn');
    const addressInput = document.getElementById('ce-location-address');
    
    console.log('🔍 checkAndShowCopyLinkButton вызвана:', {
      subject: subject,
      copyBtnExists: !!copyBtn,
      addressInputExists: !!addressInput
    });
    
    if (!subject || !copyBtn || !addressInput) return;
    
    // Проверяем, видимо ли поле адреса
    const isAddressFieldVisible = addressInput.style.display !== 'none';
    console.log('👁️ Видимость поля адреса:', {
      isVisible: isAddressFieldVisible,
      displayStyle: addressInput.style.display
    });
    
    if (!isAddressFieldVisible) {
      // Если поле адреса скрыто, скрываем и кнопку
      console.log('❌ Поле адреса скрыто - скрываем кнопку');
      copyBtn.style.display = 'none';
      return;
    }
    
    try {
      console.log('🔍 Ищем предыдущее событие с названием:', subject);
      const previousEvent = await findPreviousEventWithSameName(subject);
      console.log('📋 Результат поиска:', {
        found: !!previousEvent,
        eventDate: previousEvent?.start?.split('T')[0],
        hasLocation: !!previousEvent?.location
      });
      
      if (previousEvent && previousEvent.location) {
        // Проверяем, есть ли ссылка в поле location
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const hasLink = urlRegex.test(previousEvent.location);
        console.log('🔗 Проверка ссылки:', {
          hasLink: hasLink,
          location: previousEvent.location.substring(0, 100) + '...'
        });
        
        if (hasLink) {
          console.log('✅ Показываем кнопку!');
          copyBtn.style.display = 'block';
          copyBtn.title = `Получить ссылку из события "${subject}" (${previousEvent.start?.split('T')[0] || 'дата неизвестна'})`;
        } else {
          console.log('❌ Ссылка не найдена в location');
          copyBtn.style.display = 'none';
        }
      } else {
        console.log('❌ Предыдущее событие не найдено или нет location');
        copyBtn.style.display = 'none';
      }
    } catch (error) {
      console.error('❌ Ошибка проверки предыдущего события:', error);
      copyBtn.style.display = 'none';
    }
  }


  // Обработчик кнопки копирования ссылки
  document.getElementById('ce-copy-link-btn')?.addEventListener('click', async () => {
    const subject = document.getElementById('ce-title')?.value.trim();
    if (!subject) {
      alert('Сначала введите название события');
      return;
    }
    
    const copyBtn = document.getElementById('ce-copy-link-btn');
    const originalText = copyBtn.textContent;
    copyBtn.textContent = '⏳ Загрузка...';
    copyBtn.disabled = true;
    
    try {
      const previousLink = await copyLinkFromPreviousEvent(subject);
      if (previousLink) {
        const addressInput = document.getElementById('ce-location-address');
        if (addressInput) {
          addressInput.value = previousLink;
          addressInput.style.borderColor = '#4CAF50';
          addressInput.style.backgroundColor = '#f0f8ff';
          setTimeout(() => {
            addressInput.style.borderColor = '#ccc';
            addressInput.style.backgroundColor = 'white';
          }, 3000);
        }
        
        // Показываем уведомление об успехе
        copyBtn.textContent = '✅ Скопировано!';
        copyBtn.style.background = '#4CAF50';
        
        setTimeout(() => {
          copyBtn.textContent = originalText;
          copyBtn.style.background = '#4285f4';
        }, 2000);
        
        console.log('✅ Скопирована ссылка из предыдущего события:', previousLink);
      } else {
        alert('Предыдущее событие с таким названием не найдено или не содержит ссылку');
        copyBtn.textContent = originalText;
      }
    } catch (error) {
      console.error('Ошибка копирования ссылки:', error);
      alert('Ошибка при копировании ссылки');
      copyBtn.textContent = originalText;
    } finally {
      copyBtn.disabled = false;
    }
  });
    
  async function createEvent() {
    console.log('=== createEvent: начало ===');
    console.log('window.startISO:', window.startISO);
    console.log('window.endISO:', window.endISO);
    console.log('DEBUG: Выбранный слот:', {
      slotDate: slotDateStr,
      startTime: startTimeStr,
      endTime: endTimeStr
    });
    
    console.log('Создание события...');
    const subject = /** @type {HTMLInputElement} */(document.getElementById('ce-title')).value.trim();
    
    // Проверяем, что название события не пустое
    if (!subject) {
      alert('Название события не может быть пустым!');
      return;
    }
    
    let address = /** @type {HTMLInputElement} */(document.getElementById('ce-location-address')).value.trim();
     const attendees = currentTags.slice();
     const streams = currentStreams.slice();
     const recUrl = /** @type {HTMLInputElement} */(document.getElementById('ce-recording-url')).value.trim();
     
     console.log('🔍 currentTags в createEvent:', currentTags);
     console.log('🔍 attendees в createEvent:', attendees);
     
     // Если адрес пустой, пытаемся скопировать ссылку из предыдущего события с таким же названием
     if (!address) {
       console.log('🔍 Поиск ссылки из предыдущего события с названием:', subject);
       const previousLink = await copyLinkFromPreviousEvent(subject);
       if (previousLink) {
         address = previousLink;
         // Обновляем поле ввода
         const addressInput = document.getElementById('ce-location-address');
         if (addressInput) {
           addressInput.value = address;
         }
         console.log('✅ Скопирована ссылка из предыдущего события:', previousLink);
       } else {
         console.log('📝 Предыдущее событие с таким названием не найдено или не содержит ссылку');
       }
     }
     
     console.log('DEBUG: Данные события:', {
       subject,
       address,
       attendees,
       streams,
       recUrl
     });
     
     // Собираем актуальные вопросы в строку
     const actualQuestionsText = ceActualQuestions
       .filter(q => q.text.trim())
       .map(q => `${q.completed ? '✓ ' : '○ '}${q.text.trim()}`)
       .join('\n');

    // Открытые вопросы собираются из отмеченных строк заметок

    // Сборка места: приоритет кнопки, затем адрес. Если выбрано Zoom/Teams и указан адрес — объединим.
    let location = '';
    if (chosenPlace && address) location = `${chosenPlace}: ${address}`;
    else location = chosenPlace || address;

    // Собираем заметки как отдельные объекты с полями
    const notesAsObjects = noteItems
      .filter(n => n.text.trim())
      .map(n => ({
        text: n.text.trim(),
        time: n.time || null,
        person: n.person || null,
        topic: n.topic || null
      }));

    const oqFromNotes = noteItems
      .filter(n => n.isQuestion && n.text.trim())
      .map(n => {
        const meta = [];
        if (n.time) meta.push(n.time);
        if (n.person) meta.push(n.person);
        if (n.stream) meta.push(`#${n.stream}`);
        if (n.due) meta.push(`до ${new Date(n.due).toLocaleString()}`);
        if (n.important) meta.push('Important');
        if (n.asap) meta.push('ASAP');
        return `${meta.length? '['+meta.join(' | ')+'] ' : ''}${n.text.trim()}`;
      });

    console.log('DEBUG: Payload события:', {
      subject: subject || 'Без темы',
      start: window.startISO,
      end: window.endISO,
      location,
      attendees,
      stream: streams,
      notes: notesAsObjects, // Теперь отправляем как массив объектов
      recording_url: recUrl,
      open_questions: oqFromNotes,
      actual_open_questions: actualQuestionsText
    });

    const payload = {
      subject: subject || 'Без темы',
      start: window.startISO,
      end: window.endISO,
      location,
      attendees,
      stream: streams,
      notes: notesAsObjects, // Теперь отправляем как массив объектов
      recording_url: recUrl,
      open_questions: oqFromNotes,
      actual_open_questions: actualQuestionsText
    };

    console.log('Отправка события на сервер:', payload);
    console.log('=== createEvent: отправка на сервер ===');

    // Пытаемся сохранить на сервер
    let saved = null;
    try {
      console.log('Отправляем POST запрос на сервер...');
      const resp = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      console.log('Ответ сервера:', resp.status, resp.statusText);
      
      if (resp.ok) {
        saved = await resp.json();
        console.log('Событие успешно сохранено:', saved);
        console.log('DEBUG: Сохраненное событие:', {
          id: saved.id,
          subject: saved.subject,
          start: saved.start,
          end: saved.end,
          start_time: saved.start_time,
          end_time: saved.end_time
        });
        console.log('=== createEvent: успешно завершено ===');
      } else {
        const errorText = await resp.text();
        console.error('Ошибка сохранения события:', resp.status, errorText);
        console.log('DEBUG: Ошибка сервера:', {
          status: resp.status,
          statusText: resp.statusText,
          errorText: errorText
        });
        console.log('=== createEvent: ошибка ===');
      }
    } catch(err) {
      // оффлайн/сервер недоступен — используем локальное добавление
      console.warn('API недоступен, сохраняю локально', err);
      console.log('=== createEvent: ошибка сети ===');
    }

    if (saved) {
      // Событие успешно сохранено на сервере
      console.log('Событие сохранено в БД:', saved);
      
      // Проверяем, нужно ли создать серию (weekly или daily)
      const subjectLower = subject.toLowerCase();
      // Исключаем DEV Daily из автоматического создания серий
      if ((subjectLower.includes('weekly') || subjectLower.includes('daily')) && !subjectLower.includes('dev daily')) {
        const recurrenceType = subjectLower.includes('weekly') ? 'weekly' : 'daily';
        const createSeries = confirm(
          `Обнаружено ключевое слово "${recurrenceType}" в названии.\n\n` +
          `Создать серию повторяющихся событий на месяц?\n` +
          `(${recurrenceType === 'weekly' ? '4 недели, каждые 7 дней' : '5 рабочих дней, ежедневно'})`
        );
        
        if (createSeries) {
          await createRecurringSeries(payload, recurrenceType);
          alert(`Серия из ${recurrenceType === 'weekly' ? '4' : '5'} событий создана!`);
          
          // Предлагаем участников из похожих встреч
          await suggestAttendeesForSeries(payload.subject);
        }
      }
      
      console.log('=== createEvent: обновляем события ===');
      await loadEventsFromAPI();
      console.log('=== createEvent: события обновлены, mockEvents.length:', mockEvents.length);
      
      // Найдём созданное событие и покажем его
      const createdEvent = mockEvents.find(ev => ev.id === saved.id);
      console.log('=== createEvent: ищем созданное событие ===', {
        savedId: saved.id,
        foundEvent: createdEvent ? 'найдено' : 'не найдено'
      });
      
      if (createdEvent) {
        console.log('=== createEvent: показываем событие ===');
        showEvent(createdEvent);
      } else {
        console.log('=== createEvent: событие не найдено в mockEvents ===');
      }
    } else {
      // Оффлайн режим - добавляем локально
      const newEvent = {
        id: generateEventId(),
        ...payload
      };
      mockEvents.push(newEvent);
      markEventSlots(newEvent);
      showEvent(newEvent);
    }
  }

  // Обработчик формы (submit)
  form?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    await createEvent();
  });

  // Функция для проверки существующих событий
  function checkExistingEvent(subject, startTime, endTime) {
    return mockEvents.some(event => 
      event.subject === subject && 
      event.start === startTime && 
      event.end === endTime
    );
  }

  // Функция для сброса состояния автосохранения
  function resetAutoSaveState() {
    isEventCreated = false;
    isCreating = false;
    lastCreatedSubject = '';
    lastCreatedTime = '';
    if (inputTimeout) {
      clearTimeout(inputTimeout);
      inputTimeout = null;
    }
  }

  // Функция для поиска похожих событий и предложения участников
  async function findSimilarEvents(subject) {
    if (!subject || subject.length < 3) {
      return { suggested_attendees: [], similar_events: [] };
    }
    
    try {
      const response = await fetch(`/api/similar-events?subject=${encodeURIComponent(subject)}&limit=5`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Ошибка при поиске похожих событий:', error);
      return { suggested_attendees: [], similar_events: [] };
    }
  }

  // Функция для отображения предложенных участников
  function showSuggestedAttendees(suggestedAttendees, similarEvents) {
    // Удаляем предыдущие предложения, если они есть
    const existingSuggestions = document.getElementById('attendee-suggestions');
    if (existingSuggestions) {
      existingSuggestions.remove();
    }
    
    if (!suggestedAttendees || suggestedAttendees.length === 0) {
      return;
    }
    
    // Создаем контейнер для предложений
    const suggestionsContainer = document.createElement('div');
    suggestionsContainer.id = 'attendee-suggestions';
    suggestionsContainer.style.cssText = `
      margin-top: 8px;
      padding: 8px;
      background: #f0f8ff;
      border: 1px solid #4aa3ff;
      border-radius: 6px;
      font-size: 12px;
    `;
    
    // Заголовок
    const title = document.createElement('div');
    title.style.cssText = 'font-weight: bold; margin-bottom: 6px; color: #333;';
    title.textContent = `💡 Предложенные участники из похожих событий (${similarEvents.length} найдено):`;
    suggestionsContainer.appendChild(title);
    
    // Список участников
    const attendeesList = document.createElement('div');
    attendeesList.style.cssText = 'display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 6px;';
    
    suggestedAttendees.forEach(attendee => {
      const attendeeTag = document.createElement('span');
      attendeeTag.style.cssText = `
        background: #4aa3ff;
        color: white;
        padding: 2px 6px;
        border-radius: 12px;
        cursor: pointer;
        font-size: 11px;
        transition: background-color 0.2s;
      `;
      attendeeTag.textContent = attendee;
      attendeeTag.title = 'Нажмите, чтобы добавить участника';
      
      // Добавляем обработчик клика
      attendeeTag.addEventListener('click', () => {
        addSuggestedAttendee(attendee);
        attendeeTag.style.background = '#28a745';
        attendeeTag.textContent = '✓ ' + attendee;
        setTimeout(() => {
          attendeeTag.remove();
        }, 1000);
      });
      
      // Эффект при наведении
      attendeeTag.addEventListener('mouseenter', () => {
        attendeeTag.style.background = '#357abd';
      });
      attendeeTag.addEventListener('mouseleave', () => {
        attendeeTag.style.background = '#4aa3ff';
      });
      
      attendeesList.appendChild(attendeeTag);
    });
    
    suggestionsContainer.appendChild(attendeesList);
    
    // Кнопка "Добавить всех"
    const addAllBtn = document.createElement('button');
    addAllBtn.style.cssText = `
      background: #28a745;
      color: white;
      border: none;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
      margin-right: 8px;
    `;
    addAllBtn.textContent = 'Добавить всех';
    addAllBtn.addEventListener('click', () => {
      suggestedAttendees.forEach(attendee => {
        addSuggestedAttendee(attendee);
      });
      suggestionsContainer.remove();
    });
    
    // Кнопка "Закрыть"
    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = `
      background: #6c757d;
      color: white;
      border: none;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
    `;
    closeBtn.textContent = 'Закрыть';
    closeBtn.addEventListener('click', () => {
      suggestionsContainer.remove();
    });
    
    const buttonsContainer = document.createElement('div');
    buttonsContainer.appendChild(addAllBtn);
    buttonsContainer.appendChild(closeBtn);
    suggestionsContainer.appendChild(buttonsContainer);
    
    // Вставляем предложения после поля участников
    const attendeesContainer = document.getElementById('ce-attendees-tags');
    if (attendeesContainer) {
      attendeesContainer.appendChild(suggestionsContainer);
    }
  }
  
  // Функция для добавления предложенного участника
  function addSuggestedAttendee(attendee) {
    if (!currentTags.includes(attendee)) {
      currentTags.push(attendee);
      renderTags();
    }
  }

  // Автосохранение при вводе названия
  const titleInput = /** @type {HTMLInputElement} */(document.getElementById('ce-title'));
  let isEventCreated = false;
  let isCreating = false; // Защита от параллельных вызовов
  let inputTimeout = null; // Таймер для задержки автосохранения
  let lastCreatedSubject = ''; // Запоминаем последнее созданное название
  let lastCreatedTime = ''; // Запоминаем последнее созданное время
  
  // Автосохранение при вводе текста (с задержкой)
  titleInput?.addEventListener('input', async ()=>{
    const subject = titleInput.value.trim();
    const currentTime = `${window.startISO}_${window.endISO}`;
    
    // Проверяем наличие предыдущего события с ссылкой и показываем кнопку
    await checkAndShowCopyLinkButton();
    
    // Проверяем, не существует ли уже событие с таким названием и временем
    const eventExists = checkExistingEvent(subject, window.startISO, window.endISO);
    
    // Поиск похожих событий и предложение участников
    if (subject && subject.length >= 3) {
      const similarData = await findSimilarEvents(subject);
      if (similarData.suggested_attendees && similarData.suggested_attendees.length > 0) {
        showSuggestedAttendees(similarData.suggested_attendees, similarData.similar_events);
      }
    }
    
    if (subject && !isEventCreated && !isCreating && 
        (subject !== lastCreatedSubject || currentTime !== lastCreatedTime) && 
        !eventExists) {
      // Очищаем предыдущий таймер
      if (inputTimeout) {
        clearTimeout(inputTimeout);
      }
      
      // Устанавливаем новый таймер на 1 секунду
      inputTimeout = setTimeout(async () => {
        console.log('Автосохранение события при вводе названия...', {
          subject,
          start: window.startISO,
          end: window.endISO,
          eventExists
        });
        isCreating = true;
        try {
          await createEvent();
          isEventCreated = true;
          lastCreatedSubject = subject;
          lastCreatedTime = currentTime;
        } finally {
          isCreating = false;
        }
      }, 1000);
    }
  });
  
  // Автосохранение при потере фокуса с названия
  titleInput?.addEventListener('blur', async ()=>{
    const subject = titleInput.value.trim();
    const currentTime = `${window.startISO}_${window.endISO}`;
    
    // Проверяем, не существует ли уже событие с таким названием и временем
    const eventExists = checkExistingEvent(subject, window.startISO, window.endISO);
    
    if (subject && !isEventCreated && !isCreating && 
        (subject !== lastCreatedSubject || currentTime !== lastCreatedTime) && 
        !eventExists) {
      // Очищаем таймер, если он есть
      if (inputTimeout) {
        clearTimeout(inputTimeout);
        inputTimeout = null;
      }
      
      console.log('Автосохранение события при потере фокуса...', {
        subject,
        start: window.startISO,
        end: window.endISO,
        eventExists
      });
      isCreating = true;
      try {
        await createEvent();
        isEventCreated = true;
        lastCreatedSubject = subject;
        lastCreatedTime = currentTime;
      } finally {
        isCreating = false;
      }
    }
  });
  
  // Сбрасываем состояние автосохранения при смене слота
  resetAutoSaveState();
}

// Московское время - UTC+3
const MOSCOW_OFFSET_HOURS = 3;

// Создать московское время в формате ISO
function createMoscowTime(isoYMD, hhmm) {
  // Создаем ISO строку с московским timezone offset (+03:00)
  return `${isoYMD}T${hhmm}:00+03:00`;
}

// Парсинг времени из БД (оно уже в московском времени)
function utcToMoscow(dateStr) {
  // Проверяем, что dateStr не undefined или null
  if (!dateStr) {
    console.warn('utcToMoscow: dateStr is undefined or null');
    return new Date();
  }
  
  console.log('🔍 utcToMoscow input:', dateStr, 'type:', typeof dateStr);
  
  // Просто создаем дату из строки - все даты уже в московском времени
  const result = new Date(dateStr);
  
  console.log('🔍 utcToMoscow output:', result.toString(), 'ISO:', result.toISOString());
  
  return result;
}

// Форматирование даты для отображения (только дата)
function formatDateOnly(date) {
  const d = date.getDate();
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return `${d} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

// Форматирование времени HH:MM
function formatHM(date) {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

// Управление историей тегов вопросов
function loadTagsHistory(){
  try { return JSON.parse(localStorage.getItem('question_tags_history')||'[]'); } catch { return []; }
}
function saveTagToHistory(tag){
  console.log('💾 Сохраняем новый stream в историю:', tag);
  try {
    let history = loadTagsHistory();
    console.log('📋 Текущая история streams:', history);
    if (!history.includes(tag)) {
      history = [tag, ...history].slice(0, 50);
      localStorage.setItem('question_tags_history', JSON.stringify(history));
      console.log('✅ Новый stream добавлен в историю:', tag);
      console.log('📋 Обновленная история:', history);
    } else {
      console.log('ℹ️ Stream уже есть в истории:', tag);
    }
  } catch(err) {
    console.error('❌ Ошибка сохранения stream в историю:', err);
  }
}

// Управление разделёнными слотами (15-минутными)
function loadSplitSlots(){
  try { 
    return JSON.parse(localStorage.getItem('split_slots_history') || '[]'); 
  } catch { 
    return []; 
  }
}

function saveSplitSlot(date, startTime, endTime){
  try {
    let splits = loadSplitSlots();
    const key = `${date}_${startTime}_${endTime}`;
    if (!splits.includes(key)) {
      splits.push(key);
      localStorage.setItem('split_slots_history', JSON.stringify(splits));
    }
  } catch {}
}

function isSplitSlot(date, startTime, endTime){
  const splits = loadSplitSlots();
  const key = `${date}_${startTime}_${endTime}`;
  return splits.includes(key);
}

// Глобальная функция для загрузки streams из API
async function loadStreamsFromAPI(search = ''){
  try {
    const response = await fetch(`/api/streams?search=${encodeURIComponent(search)}`);
    if (response.ok) {
      const streams = await response.json();
      return streams;
    }
  } catch(err) {
    console.error('Ошибка загрузки streams:', err);
  }
  // Fallback к localStorage
  try {
    const stored = localStorage.getItem('question_tags_history');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Функция для загрузки участников из API
async function loadAttendeesFromAPI(search = ''){
  try {
    const response = await fetch(`/api/attendees?search=${encodeURIComponent(search)}`);
    if (response.ok) {
      const attendees = await response.json();
      // Преобразуем объекты участников в строки для автокомплита
      return attendees.map(attendee => {
        if (attendee.name && attendee.surname) {
          return `${attendee.name} ${attendee.surname}`;
        } else if (attendee.name) {
          return attendee.name;
        } else if (attendee.email) {
          return attendee.email;
        }
        return '';
      }).filter(name => name.trim() !== '');
    }
  } catch(err) {
    console.error('Ошибка загрузки участников:', err);
  }
  // Fallback к localStorage
  try {
    const stored = localStorage.getItem('attendees_history');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Функция для автокомплита тегов в поле NOTES
function setupTagAutocomplete(textarea) {
  console.log('🏷️ setupTagAutocomplete: инициализация для textarea');
  
  let tagSuggestBox = null;
  let currentTagQuery = '';
  let tagStartPos = 0;
  
  // Создаем контейнер для предложений тегов
  function createTagSuggestBox() {
    console.log('🏷️ createTagSuggestBox: создание контейнера предложений');
    if (tagSuggestBox) return tagSuggestBox;
    
    tagSuggestBox = document.createElement('div');
    tagSuggestBox.className = 'tag-suggest-box';
    tagSuggestBox.style.cssText = `
      position: fixed;
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      max-height: 200px;
      overflow-y: auto;
      z-index: 9999;
      display: none;
      min-width: 220px;
      margin-top: 2px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    // Добавляем стили для скроллбара
    const style = document.createElement('style');
    style.textContent = `
      .tag-suggest-box::-webkit-scrollbar {
        width: 6px;
      }
      .tag-suggest-box::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 3px;
      }
      .tag-suggest-box::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 3px;
      }
      .tag-suggest-box::-webkit-scrollbar-thumb:hover {
        background: #a8a8a8;
      }
    `;
    document.head.appendChild(style);
    
    // Добавляем контейнер к body для правильного позиционирования
    document.body.appendChild(tagSuggestBox);

    return tagSuggestBox;
  }
  
  // Показываем/скрываем предложения
  function setTagSuggestionsVisible(visible) {
    console.log('🏷️ setTagSuggestionsVisible:', visible ? 'показать' : 'скрыть');
    if (!tagSuggestBox) {
      console.log('🏷️ tagSuggestBox не существует, создаем...');
      createTagSuggestBox();
    }
    if (!tagSuggestBox) {
      console.log('❌ tagSuggestBox не создан');
      return;
    }
    
    if (visible) {
      console.log('🏷️ Показываем предложения тегов');
      // Получаем позицию курсора в тексте
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = textarea.value.substring(0, cursorPos);
      
      // Находим позицию символа # перед курсором
      const lastHashIndex = textBeforeCursor.lastIndexOf('#');
      if (lastHashIndex === -1) {
        console.log('🏷️ Символ # не найден, скрываем предложения');
        tagSuggestBox.style.display = 'none';
        return;
      }
      
      console.log('🏷️ Найден символ # на позиции:', lastHashIndex);
      
      // Создаем временный элемент для измерения позиции текста
      const tempDiv = document.createElement('div');
      tempDiv.style.cssText = `
        position: absolute;
        visibility: hidden;
        white-space: pre-wrap;
        font: ${window.getComputedStyle(textarea).font};
        padding: ${window.getComputedStyle(textarea).padding};
        border: ${window.getComputedStyle(textarea).border};
        width: ${textarea.offsetWidth}px;
        height: auto;
        word-wrap: break-word;
      `;
      
      // Получаем позицию поля ввода
      const textareaRect = textarea.getBoundingClientRect();
      
      // Измеряем позицию текста до символа #
      const textUpToHash = textarea.value.substring(0, lastHashIndex + 1);
      tempDiv.textContent = textUpToHash;
      document.body.appendChild(tempDiv);
      
      // Вычисляем позицию для выпадающего списка
      const textWidth = tempDiv.offsetWidth;
      const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight) || 20;
      
      // Вычисляем количество строк до символа #
      const lines = Math.floor(textWidth / textareaRect.width);
      const verticalOffset = lines * lineHeight;
      
      // Вычисляем горизонтальную позицию символа # в текущей строке
      const textInCurrentLine = textUpToHash.split('\n').pop() || '';
      const tempDivLine = document.createElement('div');
      tempDivLine.style.cssText = `
        position: absolute;
        visibility: hidden;
        white-space: nowrap;
        font: ${window.getComputedStyle(textarea).font};
      `;
      tempDivLine.textContent = textInCurrentLine;
      document.body.appendChild(tempDivLine);
      
      const horizontalOffset = tempDivLine.offsetWidth;
      
      // Позиционируем список справа от символа #
      const leftPos = textareaRect.left + horizontalOffset + 10;
      const topPos = textareaRect.top + verticalOffset + 5;
      
      console.log('🏷️ Позиционирование:', {
        textareaRect: { left: textareaRect.left, top: textareaRect.top },
        horizontalOffset,
        verticalOffset,
        finalPosition: { left: leftPos, top: topPos }
      });
      
      tagSuggestBox.style.left = leftPos + 'px';
      tagSuggestBox.style.top = topPos + 'px';
      tagSuggestBox.style.display = 'block';
      
      // Удаляем временные элементы
      document.body.removeChild(tempDiv);
      document.body.removeChild(tempDivLine);
    } else {
      tagSuggestBox.style.display = 'none';
    }
  }
  
  // Рендерим предложения тегов
  async function renderTagSuggestions(query) {
    console.log('🏷️ renderTagSuggestions: запрос тегов для:', query);
    console.log('🏷️ renderTagSuggestions: tagSuggestBox существует?', !!tagSuggestBox);
    if (!tagSuggestBox) {
      console.log('🏷️ tagSuggestBox не существует, создаем...');
      createTagSuggestBox();
    }
    if (!tagSuggestBox) {
      console.log('❌ tagSuggestBox не создан');
      return;
    }
    
    const q = (query || '').trim().toLowerCase();
    console.log('🏷️ Ищем теги для:', q);
    const apiList = await loadStreamsFromAPI(q);
    console.log('🏷️ Получены теги из API:', apiList);
    const list = apiList.slice(0, 8); // Показываем максимум 8 предложений
    
    if (list.length === 0) {
      console.log('🏷️ Нет тегов для отображения');
      tagSuggestBox.innerHTML = '';
      setTagSuggestionsVisible(false);
      return;
    }
    
    console.log('🏷️ Отображаем теги:', list);
    tagSuggestBox.innerHTML = '';
    list.forEach(item => {
      const row = document.createElement('div');
      row.className = 'tag-suggestion-item';
      row.style.cssText = `
        padding: 10px 14px;
        cursor: pointer;
        border-bottom: 1px solid #f5f5f5;
        font-size: 13px;
        color: #333;
        transition: background-color 0.15s ease;
        line-height: 1.4;
      `;
      
      const textSpan = document.createElement('span');
      // API возвращает строки, а не объекты
      textSpan.textContent = typeof item === 'string' ? item : item.name;
      row.appendChild(textSpan);
      
      // Обработчик клика
      const selectTag = () => {
        insertTagIntoTextarea(item);
        setTagSuggestionsVisible(false);
      };
      
      textSpan.addEventListener('mousedown', selectTag);
      row.addEventListener('click', selectTag);
      
      // Hover эффект
      row.addEventListener('mouseenter', () => {
        row.style.backgroundColor = '#f8f9fa';
        row.style.color = '#1a1a1a';
      });
      row.addEventListener('mouseleave', () => {
        row.style.backgroundColor = 'white';
        row.style.color = '#333';
      });
      
      tagSuggestBox.appendChild(row);
    });
    
    setTagSuggestionsVisible(true);
  }
  
  // Вставляем тег в textarea
  function insertTagIntoTextarea(tag) {
    console.log('🏷️ insertTagIntoTextarea: вставляем тег:', tag);
    
    const text = textarea.value;
    const beforeTag = text.substring(0, tagStartPos);
    const afterTag = text.substring(tagStartPos + currentTagQuery.length + 1); // +1 для символа #
    
    // Проверяем, является ли tag объектом или строкой
    const tagName = typeof tag === 'object' ? tag.name : tag;
    
    const newText = beforeTag + '#' + tagName + ' ' + afterTag;
    
    console.log('🏷️ Замена текста:', {
      beforeTag: beforeTag.substring(Math.max(0, beforeTag.length - 10)),
      currentTagQuery,
      tagName,
      afterTag: afterTag.substring(0, 10),
      newText: newText.substring(Math.max(0, newText.length - 30))
    });
    
    textarea.value = newText;
    
    // Устанавливаем курсор после вставленного тега
    const newCursorPos = beforeTag.length + tagName.length + 2; // +2 для # и пробела
    textarea.setSelectionRange(newCursorPos, newCursorPos);
    
    // Триггерим событие input для автосохранения
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    
    setTagSuggestionsVisible(false);
  }
  
  // Обработчик ввода
  textarea.addEventListener('input', (e) => {
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = textarea.value.substring(0, cursorPos);
    
    console.log('🏷️ Input event:', { 
      cursorPos, 
      textBeforeCursor: textBeforeCursor.substring(Math.max(0, textBeforeCursor.length - 50)), // показываем последние 50 символов
      fullTextBeforeCursor: textBeforeCursor // показываем весь текст для отладки
    });
    
    // Находим последний символ # перед курсором
    const lastHashIndex = textBeforeCursor.lastIndexOf('#');
    console.log('🏷️ Поиск символа #:', { 
      lastHashIndex, 
      textBeforeCursor: textBeforeCursor.substring(Math.max(0, lastHashIndex - 10), lastHashIndex + 20),
      cursorPos 
    });
    
    if (lastHashIndex === -1) {
      console.log('🏷️ Символ # не найден, скрываем предложения');
      setTagSuggestionsVisible(false);
      return;
    }
    
    // Проверяем, что после # есть символы тега (не пусто и не пробел)
    const textAfterHash = textBeforeCursor.substring(lastHashIndex + 1);
    console.log('🏷️ После #:', { textAfterHash, length: textAfterHash.length });
    
    // Если после # есть пробел - скрываем предложения (тег завершен)
    if (textAfterHash.includes(' ')) {
      console.log('🏷️ После # есть пробел, тег завершен, скрываем предложения');
      setTagSuggestionsVisible(false);
      return;
    }
    
    // Если после # пусто - показываем все доступные теги
    if (textAfterHash.trim() === '') {
      console.log('🏷️ После # пусто, показываем все доступные теги');
      currentTagQuery = '';
      tagStartPos = lastHashIndex;
      renderTagSuggestions('');
      return;
    }
    
    // Получаем запрос для поиска
    currentTagQuery = textAfterHash;
    tagStartPos = lastHashIndex;
    
    console.log('🏷️ Найден тег:', currentTagQuery, 'позиция:', tagStartPos);
    
    // Показываем предложения
    console.log('🏷️ Вызываем renderTagSuggestions с запросом:', currentTagQuery);
    renderTagSuggestions(currentTagQuery);
  });
  
  // Обработчик клавиш
  textarea.addEventListener('keydown', (e) => {
    if (!tagSuggestBox || tagSuggestBox.style.display === 'none') return;
    
    console.log('🏷️ Keydown event:', e.key);
    
    const items = tagSuggestBox.querySelectorAll('.tag-suggestion-item');
    if (items.length === 0) return;
    
    // Находим текущий выделенный элемент
    let selectedIndex = -1;
    for (let i = 0; i < items.length; i++) {
      if (items[i].classList.contains('selected')) {
        selectedIndex = i;
        break;
      }
    }
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        // Если ничего не выделено, выделяем первый элемент
        if (selectedIndex === -1) {
          selectedIndex = 0;
        } else {
          selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        }
        updateSelection(items, selectedIndex);
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        // Если ничего не выделено, выделяем последний элемент
        if (selectedIndex === -1) {
          selectedIndex = items.length - 1;
        } else {
          selectedIndex = Math.max(selectedIndex - 1, 0);
        }
        updateSelection(items, selectedIndex);
        break;
        
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          const selectedItem = items[selectedIndex];
          const tagText = selectedItem.textContent.trim();
          insertTagIntoTextarea(tagText);
        }
        return;
        
      case 'Escape':
        e.preventDefault();
        setTagSuggestionsVisible(false);
        return;
        
      case 'Tab':
        // При нажатии Tab скрываем автокомплит
        e.preventDefault();
        setTagSuggestionsVisible(false);
        return;
    }
  });
  
  // Функция для обновления выделения
  function updateSelection(items, selectedIndex) {
    items.forEach((item, index) => {
      if (index === selectedIndex) {
        item.classList.add('selected');
        item.style.backgroundColor = '#e3f2fd';
        item.style.color = '#1976d2';
        // Прокручиваем к выделенному элементу
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        item.classList.remove('selected');
        item.style.backgroundColor = 'white';
        item.style.color = '#333';
      }
    });
  }
  
  // Скрываем предложения при потере фокуса
  textarea.addEventListener('blur', () => {
    setTimeout(() => setTagSuggestionsVisible(false), 150);
  });
  
  // Обновляем позицию при прокрутке страницы
  window.addEventListener('scroll', () => {
    if (tagSuggestBox && tagSuggestBox.style.display === 'block') {
      setTagSuggestionsVisible(true);
    }
  });
  
  // Обновляем позицию при изменении размера окна
  window.addEventListener('resize', () => {
    if (tagSuggestBox && tagSuggestBox.style.display === 'block') {
      setTagSuggestionsVisible(true);
    }
  });
}

// Функция для автокомплита участников в поле NOTES
function setupAttendeeAutocomplete(textarea) {
  let attendeeSuggestBox = null;
  let currentAttendeeQuery = '';
  let attendeeStartPos = 0;
  
  // Создаем контейнер для предложений участников
  function createAttendeeSuggestBox() {
    if (attendeeSuggestBox) return attendeeSuggestBox;
    
    attendeeSuggestBox = document.createElement('div');
    attendeeSuggestBox.className = 'attendee-suggest-box';
    attendeeSuggestBox.style.cssText = `
      position: fixed;
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      max-height: 200px;
      overflow-y: auto;
      z-index: 9999;
      display: none;
      min-width: 220px;
      margin-top: 2px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    // Добавляем стили для скроллбара
    const style = document.createElement('style');
    style.textContent = `
      .attendee-suggest-box::-webkit-scrollbar {
        width: 6px;
      }
      .attendee-suggest-box::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 3px;
      }
      .attendee-suggest-box::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 3px;
      }
      .attendee-suggest-box::-webkit-scrollbar-thumb:hover {
        background: #a8a8a8;
      }
    `;
    document.head.appendChild(style);
    
    // Добавляем контейнер к body для правильного позиционирования
    document.body.appendChild(attendeeSuggestBox);
    
    return attendeeSuggestBox;
  }
  
  // Показываем/скрываем предложения
  function setAttendeeSuggestionsVisible(visible) {
    if (!attendeeSuggestBox) return;
    
    if (visible) {
      // Получаем позицию курсора в тексте
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = textarea.value.substring(0, cursorPos);
      
      // Находим позицию символа @ перед курсором
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');
      if (lastAtIndex === -1) {
        attendeeSuggestBox.style.display = 'none';
        return;
      }
      
      // Создаем временный элемент для измерения позиции текста
      const tempDiv = document.createElement('div');
      tempDiv.style.cssText = `
        position: absolute;
        visibility: hidden;
        white-space: pre-wrap;
        font: ${window.getComputedStyle(textarea).font};
        padding: ${window.getComputedStyle(textarea).padding};
        border: ${window.getComputedStyle(textarea).border};
        width: ${textarea.offsetWidth}px;
        height: auto;
        word-wrap: break-word;
      `;
      
      // Получаем позицию поля ввода
      const textareaRect = textarea.getBoundingClientRect();
      
      // Измеряем позицию текста до символа @
      const textUpToAt = textarea.value.substring(0, lastAtIndex + 1);
      tempDiv.textContent = textUpToAt;
      document.body.appendChild(tempDiv);
      
      // Вычисляем позицию для выпадающего списка
      const textWidth = tempDiv.offsetWidth;
      const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight) || 20;
      
      // Вычисляем количество строк до символа @
      const lines = Math.floor(textWidth / textareaRect.width);
      const verticalOffset = lines * lineHeight;
      
      // Вычисляем горизонтальную позицию символа @ в текущей строке
      const textInCurrentLine = textUpToAt.split('\n').pop() || '';
      const tempDivLine = document.createElement('div');
      tempDivLine.style.cssText = `
        position: absolute;
        visibility: hidden;
        white-space: nowrap;
        font: ${window.getComputedStyle(textarea).font};
      `;
      tempDivLine.textContent = textInCurrentLine;
      document.body.appendChild(tempDivLine);
      
      const horizontalOffset = tempDivLine.offsetWidth;
      
      // Позиционируем список справа от символа @
      attendeeSuggestBox.style.left = (textareaRect.left + horizontalOffset + 10) + 'px';
      attendeeSuggestBox.style.top = (textareaRect.top + verticalOffset + 5) + 'px';
      attendeeSuggestBox.style.display = 'block';
      
      // Удаляем временные элементы
      document.body.removeChild(tempDiv);
      document.body.removeChild(tempDivLine);
    } else {
      attendeeSuggestBox.style.display = 'none';
    }
  }
  
  // Вставляем участника в textarea
  function insertAttendeeIntoTextarea(attendee) {
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = textarea.value.substring(0, cursorPos);
    const textAfterCursor = textarea.value.substring(cursorPos);
    
    // Находим позицию символа @ перед курсором
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    if (lastAtIndex === -1) return;
    
    // Заменяем текст от @ до курсора на выбранного участника
    const textBeforeAt = textarea.value.substring(0, lastAtIndex);
    const newText = textBeforeAt + '@' + attendee + ' ' + textAfterCursor;
    
    textarea.value = newText;
    
    // Устанавливаем курсор после вставленного участника
    const newCursorPos = textBeforeAt.length + attendee.length + 2; // +2 для @ и пробела
    textarea.setSelectionRange(newCursorPos, newCursorPos);
    
    // Фокусируемся на textarea
    textarea.focus();
    
    // Сохраняем участника в историю
    saveAttendeeToHistory(attendee);
  }
  
  // Рендерим предложения участников
  async function renderAttendeeSuggestions(query) {
    if (!attendeeSuggestBox) createAttendeeSuggestBox();
    if (!attendeeSuggestBox) return;
    
    const q = (query || '').trim().toLowerCase();
    const apiList = await loadAttendeesFromAPI(q);
    const list = apiList.slice(0, 8); // Показываем максимум 8 предложений
    
    if (list.length === 0) {
      attendeeSuggestBox.innerHTML = '';
      setAttendeeSuggestionsVisible(false);
      return;
    }
    
    attendeeSuggestBox.innerHTML = '';
    list.forEach(item => {
      const row = document.createElement('div');
      row.className = 'attendee-suggestion-item';
      row.style.cssText = `
        padding: 10px 14px;
        cursor: pointer;
        border-bottom: 1px solid #f5f5f5;
        font-size: 13px;
        color: #333;
        transition: background-color 0.15s ease;
        line-height: 1.4;
      `;
      
      const textSpan = document.createElement('span');
      textSpan.textContent = item;
      row.appendChild(textSpan);
      
      // Обработчик клика
      const selectAttendee = () => {
        insertAttendeeIntoTextarea(item);
        setAttendeeSuggestionsVisible(false);
      };
      
      textSpan.addEventListener('mousedown', selectAttendee);
      row.addEventListener('click', selectAttendee);
      
      // Hover эффект
      row.addEventListener('mouseenter', () => {
        row.style.backgroundColor = '#f8f9fa';
        row.style.color = '#1a1a1a';
      });
      
      row.addEventListener('mouseleave', () => {
        row.style.backgroundColor = 'white';
        row.style.color = '#333';
      });
      
      attendeeSuggestBox.appendChild(row);
    });
    
    setAttendeeSuggestionsVisible(true);
  }
  
  // Обработчик ввода
  textarea.addEventListener('input', (e) => {
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = textarea.value.substring(0, cursorPos);
    
    // Находим последний символ @ перед курсором
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    if (lastAtIndex === -1) {
      setAttendeeSuggestionsVisible(false);
      return;
    }
    
    // Проверяем, что после @ нет пробела (значит мы все еще в процессе ввода участника)
    const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
    if (textAfterAt.includes(' ')) {
      setAttendeeSuggestionsVisible(false);
      return;
    }
    
    // Получаем запрос для поиска
    currentAttendeeQuery = textAfterAt;
    attendeeStartPos = lastAtIndex;
    
    // Показываем предложения
    renderAttendeeSuggestions(currentAttendeeQuery);
  });
  
  // Обработчик клавиатуры
  textarea.addEventListener('keydown', (e) => {
    if (!attendeeSuggestBox || attendeeSuggestBox.style.display === 'none') return;
    
    const items = attendeeSuggestBox.querySelectorAll('.attendee-suggestion-item');
    if (items.length === 0) return;
    
    let selectedIndex = -1;
    items.forEach((item, index) => {
      if (item.classList.contains('selected')) {
        selectedIndex = index;
      }
    });
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        updateSelection(items, selectedIndex);
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        updateSelection(items, selectedIndex);
        break;
        
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        if (selectedIndex >= 0) {
          const selectedItem = items[selectedIndex];
          const attendee = selectedItem.textContent.trim();
          insertAttendeeIntoTextarea(attendee);
          setAttendeeSuggestionsVisible(false);
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        setAttendeeSuggestionsVisible(false);
        break;
    }
  });
  
  // Функция для обновления выделения
  function updateSelection(items, selectedIndex) {
    items.forEach((item, index) => {
      if (index === selectedIndex) {
        item.classList.add('selected');
        item.style.backgroundColor = '#e3f2fd';
        item.style.color = '#1976d2';
        // Прокручиваем к выделенному элементу
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        item.classList.remove('selected');
        item.style.backgroundColor = 'white';
        item.style.color = '#333';
      }
    });
  }
  
  // Скрываем предложения при потере фокуса
  textarea.addEventListener('blur', () => {
    setTimeout(() => setAttendeeSuggestionsVisible(false), 150);
  });
  
  // Обновляем позицию при прокрутке страницы
  window.addEventListener('scroll', () => {
    if (attendeeSuggestBox && attendeeSuggestBox.style.display === 'block') {
      setAttendeeSuggestionsVisible(true);
    }
  });
  
  // Обновляем позицию при изменении размера окна
  window.addEventListener('resize', () => {
    if (attendeeSuggestBox && attendeeSuggestBox.style.display === 'block') {
      setAttendeeSuggestionsVisible(true);
    }
  });
}

// Функция для сохранения участника в историю
function saveAttendeeToHistory(attendee) {
  try {
    const history = JSON.parse(localStorage.getItem('attendees_history') || '[]');
    const index = history.indexOf(attendee);
    if (index > -1) {
      history.splice(index, 1);
    }
    history.unshift(attendee);
    localStorage.setItem('attendees_history', JSON.stringify(history.slice(0, 20)));
  } catch (error) {
    console.error('Ошибка сохранения участника в историю:', error);
  }
}


// Функция для миграции старых заметок в новый формат
function migrateOldNotesToNewFormat(notesString) {
  if (!notesString || typeof notesString !== 'string') {
    return [];
  }
  
  console.log('🔄 Мигрируем старые заметки:', notesString);
  
  const notesLines = notesString.split('\n').filter(line => line.trim());
  const migratedNotes = [];
  const seenTexts = new Set(); // Для отслеживания дублирования по содержимому
  
  notesLines.forEach(note => {
    // Проверяем, является ли строка уже отформатированной с метаданными
    const isFormattedWithMetadata = note.includes(' | ') && (note.includes('[') || note.includes(']'));
    
    let migratedNote;
    
    if (isFormattedWithMetadata) {
      // Парсим старый формат: [time | person | #topic] text
      const parsed = parseQuestionMetadata(note);
      migratedNote = {
        text: parsed.text || note,
        time: parsed.time || null,
        person: parsed.person || null,
        stream: parsed.stream || null
      };
    } else {
      // Обычная заметка без метаданных
      migratedNote = {
        text: note,
        time: null,
        person: null,
        topic: null
      };
    }
    
    // Проверяем на дублирование по содержимому текста
    const textContent = migratedNote.text.trim().toLowerCase();
    
    if (seenTexts.has(textContent)) {
      console.log('⚠️ Пропускаем дублированную заметку:', migratedNote.text);
      return; // Пропускаем дублированную заметку
    }
    
    // Добавляем текст в множество просмотренных
    seenTexts.add(textContent);
    
    console.log('✅ Мигрирована заметка:', migratedNote);
    migratedNotes.push(migratedNote);
  });
  
  console.log('🔄 Результат миграции (без дублирования):', migratedNotes);
  return migratedNotes;
}

// Функция для извлечения Person из текста заметки
function extractPersonFromText(text) {
  if (!text || typeof text !== 'string') return null;
  console.log('🔍 Извлекаем Person из текста:', text);
  
  // Ищем различные форматы имен
  const patterns = [
    // Формат 1: "[Имя]" (в квадратных скобках)
    /\[([A-Za-zА-Яа-я]{1,20})\]/,
    // Формат 2: "Имя:" (с двоеточием)
    /([A-Za-zА-Яа-я]{1,20}):/,
    // Формат 3: "meeting Имя" (после слова meeting)
    /meeting\s+([A-Za-zА-Яа-я]{1,20})/i,
    // Формат 4: "Спросить у Имя" (после "Спросить у")
    /Спросить\s+у\s+([A-Za-zА-Яа-я]{1,20})/i,
    // Формат 5: "у Имя" (после "у" с пробелом)
    /\bу\s+([A-Za-zА-Яа-я]{1,20})\b/i
  ];
  
  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i];
    const match = text.match(pattern);
    console.log(`🔍 Паттерн ${i + 1}:`, pattern, 'Результат:', match);
    if (match) {
      const potentialName = match[1];
      console.log('🔍 Потенциальное имя:', potentialName);
      // Проверяем, что это не служебное слово
      if (potentialName.length <= 20 && 
          !/[0-9@#$%^&*()_+=\[\]{}|\\:";'<>?,./]/.test(potentialName) &&
          !['important', 'asap', 'integration', 'time', 'topic', 'meeting', 'спросить'].includes(potentialName.toLowerCase()) &&
          !/\b(сказала|сказал|попросил|попросила|нужно|должен|должна)\b/i.test(potentialName)) {
        console.log('✅ Найден Person в тексте:', potentialName);
        return potentialName;
      } else {
        console.log('❌ Имя не прошло валидацию:', potentialName);
      }
    }
  }
  
  return null;
}

// Диалог выбора Stream с автокомплитом
function showStreamSelectorWithPriority(suggestedStream = null, suggestedPerson = null){
  console.log('🚀🚀🚀 ОТКРЫВАЕМ МОДАЛЬНОЕ ОКНО OQ ДЛЯ ВЫБОРА STREAM 🚀🚀🚀');
  console.log('🔍 НОВАЯ ВЕРСИЯ СКРИПТА ЗАГРУЖЕНА! v1759823488');
  console.log('🔍 Предлагаемый Stream из встречи:', suggestedStream);
  console.log('🔍 Предлагаемый Person из текста:', suggestedPerson);
  return new Promise((resolve)=>{
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:9999; display:flex; align-items:center; justify-content:center;';
    
    const dialog = document.createElement('div');
    dialog.style.cssText = 'background:white; padding:20px; border-radius:8px; min-width:400px; max-width:500px;';
    
    const title = document.createElement('h3');
    title.textContent = 'Выберите Stream и приоритет';
    title.style.marginTop = '0';
    dialog.appendChild(title);
    
    // Добавляем чекбоксы для приоритетов ПЕРВЫМИ
    const prioritySection = document.createElement('div');
    prioritySection.style.cssText = 'margin-bottom:16px; padding:12px; background:#f8f9fa; border-radius:6px;';
    
    const priorityTitle = document.createElement('div');
    priorityTitle.textContent = 'Приоритет:';
    priorityTitle.style.cssText = 'font-size:0.9em; color:#666; margin-bottom:8px; font-weight:bold;';
    prioritySection.appendChild(priorityTitle);
    
    const priorityCheckboxes = document.createElement('div');
    priorityCheckboxes.style.cssText = 'display:flex; gap:16px;';
    
    // Important checkbox
    const importantWrap = document.createElement('div');
    importantWrap.style.cssText = 'display:flex; align-items:center; gap:4px;';
    
    const importantToggle = document.createElement('input');
    importantToggle.type = 'checkbox';
    importantToggle.id = 'priority-important';
    
    const importantLbl = document.createElement('label');
    importantLbl.htmlFor = 'priority-important';
    importantLbl.textContent = 'Important';
    importantLbl.style.cssText = 'font-size:0.9em; color:#d97706; font-weight:bold; cursor:pointer;';
    
    importantWrap.appendChild(importantToggle);
    importantWrap.appendChild(importantLbl);
    priorityCheckboxes.appendChild(importantWrap);
    
    // ASAP checkbox
    const asapWrap = document.createElement('div');
    asapWrap.style.cssText = 'display:flex; align-items:center; gap:4px;';
    
    const asapToggle = document.createElement('input');
    asapToggle.type = 'checkbox';
    asapToggle.id = 'priority-asap';
    
    const asapLbl = document.createElement('label');
    asapLbl.htmlFor = 'priority-asap';
    asapLbl.textContent = 'ASAP';
    asapLbl.style.cssText = 'font-size:0.9em; color:#dc2626; font-weight:bold; cursor:pointer;';
    
    asapWrap.appendChild(asapToggle);
    asapWrap.appendChild(asapLbl);
    priorityCheckboxes.appendChild(asapWrap);
    
    prioritySection.appendChild(priorityCheckboxes);
    dialog.appendChild(prioritySection);
    
    const inputLabel = document.createElement('div');
    inputLabel.textContent = 'Начните печатать название Stream:';
    inputLabel.style.cssText = 'font-size:0.9em; color:#666; margin-bottom:8px;';
    dialog.appendChild(inputLabel);
    
    const inputWrapper = document.createElement('div');
    inputWrapper.style.cssText = 'position:relative; margin-bottom:12px;';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Введите Stream...';
    input.style.cssText = 'width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;';
    // Устанавливаем предлагаемый Stream
    if (suggestedStream) {
      input.value = suggestedStream;
      console.log('🔍 Устанавливаем предлагаемый Stream:', suggestedStream);
    }
    inputWrapper.appendChild(input);
    
    // Автокомплит для поля ввода
    const suggestions = document.createElement('div');
    suggestions.id = 'stream-suggestions-' + Date.now();
    suggestions.style.cssText = 'position:absolute; top:100%; left:0; right:0; background:white; border:2px solid #4aa3ff; border-radius:6px; max-height:200px; overflow-y:auto; display:none; z-index:10000; box-shadow:0 4px 12px rgba(0,0,0,0.2); margin-top:2px;';
    inputWrapper.appendChild(suggestions);
    
    dialog.appendChild(inputWrapper);
    
    let searchTimeout;
    let allStreams = [];
    
    // Загружаем все streams при открытии
    loadStreamsFromAPI().then(streams => {
      console.log('🔍 Загружены streams для OQ модального окна:', streams);
      console.log('🔍 Тип streams:', typeof streams, 'Длина:', streams?.length);
      console.log('🔍 Первые 3 streams:', streams?.slice(0, 3));
      allStreams = streams || [];
      console.log('🔍 allStreams установлен:', allStreams.length, 'элементов');
    }).catch(err => {
      console.error('❌ Ошибка загрузки streams:', err);
      allStreams = [];
    });
    
    // Обработка ввода с автокомплитом
    input.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(async () => {
        const query = input.value.trim().toLowerCase();
        if (query.length < 2) {
          suggestions.style.display = 'none';
          return;
        }
        
      const filtered = allStreams.filter(stream => {
        return stream.toLowerCase().includes(query);
      });
        
        suggestions.innerHTML = '';
        if (filtered.length === 0) {
          suggestions.style.display = 'none';
          return;
        }
        
        filtered.forEach(stream => {
          const item = document.createElement('div');
          item.textContent = stream;
          item.style.cssText = 'padding:10px; cursor:pointer; border-bottom:1px solid #f0f0f0; transition:background-color 0.2s; font-size:14px;';
          item.addEventListener('mouseenter', () => item.style.background = '#e3f2fd');
          item.addEventListener('mouseleave', () => item.style.background = '');
          item.addEventListener('click', () => {
            console.log('✅ Выбран stream для OQ:', stream);
            input.value = stream;
            suggestions.style.display = 'none';
            document.body.removeChild(overlay);
            resolve({
              stream: stream,
              important: importantToggle.checked,
              asap: asapToggle.checked,
              person: suggestedPerson || null
            });
          });
          suggestions.appendChild(item);
        });
        
        // Показываем suggestions с правильным позиционированием
        const inputRect = input.getBoundingClientRect();
        suggestions.style.display = 'block';
        suggestions.style.position = 'fixed';
        suggestions.style.top = (inputRect.bottom + 5) + 'px';
        suggestions.style.left = inputRect.left + 'px';
        suggestions.style.width = inputRect.width + 'px';
        suggestions.style.zIndex = '10000';
        console.log('📋 Показываем suggestions:', filtered.length, 'вариантов');
        console.log('🔍 Input позиция:', inputRect);
        console.log('🔍 Suggestions позиция:', suggestions.getBoundingClientRect());
        console.log('🔍 Suggestions содержимое:', suggestions.innerHTML);
      }, 300);
    });
    
    // Скрываем suggestions при клике вне
    input.addEventListener('blur', () => {
      setTimeout(() => suggestions.style.display = 'none', 150);
    });
    
    const buttons = document.createElement('div');
    buttons.style.cssText = 'display:flex; gap:8px; justify-content:flex-end;';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Отмена';
    cancelBtn.style.cssText = 'padding:6px 12px; border:1px solid #ccc; border-radius:4px; background:white; cursor:pointer;';
    cancelBtn.addEventListener('click', ()=>{
      document.body.removeChild(overlay);
      resolve(null);
    });
    
    const okBtn = document.createElement('button');
    okBtn.type = 'button';
    okBtn.textContent = 'ОК';
    okBtn.style.cssText = 'padding:6px 12px; border:1px solid #4aa3ff; border-radius:4px; background:#4aa3ff; color:white; cursor:pointer;';
    okBtn.addEventListener('click', ()=>{
      const val = input.value.trim();
      document.body.removeChild(overlay);
      resolve({
        stream: val || null,
        important: importantToggle.checked,
        asap: asapToggle.checked,
        person: suggestedPerson || null
      });
    });
    
    buttons.appendChild(cancelBtn);
    buttons.appendChild(okBtn);
    dialog.appendChild(buttons);
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    input.focus();
    
    input.addEventListener('keydown', (e)=>{
      if (e.key === 'Enter') {
        e.preventDefault();
        okBtn.click();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelBtn.click();
      }
    });
  });
}

function showStreamSelector(){
  return new Promise((resolve)=>{
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:9999; display:flex; align-items:center; justify-content:center;';
    
    const dialog = document.createElement('div');
    dialog.style.cssText = 'background:white; padding:20px; border-radius:8px; min-width:400px; max-width:500px;';
    
    const title = document.createElement('h3');
    title.textContent = 'Выберите Stream';
    title.style.marginTop = '0';
    dialog.appendChild(title);
    
    const inputLabel = document.createElement('div');
    inputLabel.textContent = 'Начните печатать название Stream:';
    inputLabel.style.cssText = 'font-size:0.9em; color:#666; margin-bottom:8px;';
    dialog.appendChild(inputLabel);
    
    const inputWrapper = document.createElement('div');
    inputWrapper.style.cssText = 'position:relative; margin-bottom:12px;';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Введите Stream...';
    input.style.cssText = 'width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;';
    inputWrapper.appendChild(input);
    
    // Автокомплит для поля ввода
    const suggestions = document.createElement('div');
    suggestions.id = 'stream-suggestions-' + Date.now();
    suggestions.style.cssText = 'position:absolute; top:100%; left:0; right:0; background:white; border:2px solid #4aa3ff; border-radius:6px; max-height:200px; overflow-y:auto; display:none; z-index:10000; box-shadow:0 4px 12px rgba(0,0,0,0.2); margin-top:2px;';
    inputWrapper.appendChild(suggestions);
    
    dialog.appendChild(inputWrapper);
    
    let searchTimeout;
    let allStreams = [];
    
    // Загружаем все streams при открытии
    loadStreamsFromAPI().then(streams => {
      allStreams = streams;
    });
    
    // Обработка ввода с автокомплитом
    input.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(async () => {
        const query = input.value.trim().toLowerCase();
        if (query.length < 2) {
          suggestions.style.display = 'none';
          return;
        }
        
        const filtered = allStreams.filter(stream => 
          stream.toLowerCase().includes(query)
        );
        
        suggestions.innerHTML = '';
        if (filtered.length === 0) {
          suggestions.style.display = 'none';
          return;
        }
        
        filtered.forEach(stream => {
          const item = document.createElement('div');
          item.textContent = stream;
          item.style.cssText = 'padding:8px; cursor:pointer; border-bottom:1px solid #f0f0f0;';
          item.addEventListener('mouseenter', () => item.style.background = '#f0f0f0');
          item.addEventListener('mouseleave', () => item.style.background = '');
          item.addEventListener('click', () => {
            document.body.removeChild(overlay);
            resolve(stream);
          });
          suggestions.appendChild(item);
        });
        suggestions.style.display = 'block';
      }, 300);
    });
    
    // Скрываем suggestions при клике вне
    input.addEventListener('blur', () => {
      setTimeout(() => suggestions.style.display = 'none', 150);
    });
    
    const buttons = document.createElement('div');
    buttons.style.cssText = 'display:flex; gap:8px; justify-content:flex-end;';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Отмена';
    cancelBtn.style.cssText = 'padding:6px 12px; border:1px solid #ccc; border-radius:4px; background:white; cursor:pointer;';
    cancelBtn.addEventListener('click', ()=>{
      document.body.removeChild(overlay);
      resolve(null);
    });
    
    const okBtn = document.createElement('button');
    okBtn.type = 'button';
    okBtn.textContent = 'ОК';
    okBtn.style.cssText = 'padding:6px 12px; border:1px solid #4aa3ff; border-radius:4px; background:#4aa3ff; color:white; cursor:pointer;';
    okBtn.addEventListener('click', ()=>{
      const val = input.value.trim();
      document.body.removeChild(overlay);
      resolve(val || null);
    });
    
    buttons.appendChild(cancelBtn);
    buttons.appendChild(okBtn);
    dialog.appendChild(buttons);
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    input.focus();
    
    input.addEventListener('keydown', (e)=>{
      if (e.key === 'Enter') {
        e.preventDefault();
        okBtn.click();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelBtn.click();
      }
    });
  });
}

function generateEventId(){
  let maxId = 0;
  for (const ev of mockEvents) maxId = Math.max(maxId, ev.id || 0);
  return maxId + 1;
}

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString();
}

function formatDateOnly(dateStr){
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { year:'numeric', month:'long', day:'numeric' });
}

function formatHM(dateStr){
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
}

// =======================
// Таймлайн: слева список дат, справа непрерывные слоты с разделителями дней
// =======================
const startHour = 8;
const endHour = 22;
const slotMinutes = 30;

function pad(num) { return num.toString().padStart(2,'0'); }

function formatDayHeader(date) {
  const monthsFullEn = [
    'January','February','March','April','May','June','July','August','September','October','November','December'
  ];
  return `${date.getDate()} ${monthsFullEn[date.getMonth()]}`;
}

function renderDays(rangeBefore = 1, rangeAfter = 1) {
  const today = new Date();
  today.setHours(0,0,0,0);
  // Левый список дат рендерится отдельно (фиксированный центр 2 окт 2025)
  allSlotsEl.innerHTML = '';
  const dates = [];
  for (let d = -rangeBefore; d <= rangeAfter; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() + d);
    dates.push(date);
  }
  // Слева список дат не трогаем здесь

  // Справа: непрерывные слоты с разделителями
  dates.forEach((date, idx) => {
    if (idx !== 0) {
      const hr = document.createElement('hr');
      hr.className = 'day-divider';
      hr.dataset.date = date.toISOString().slice(0,10);
      allSlotsEl.appendChild(hr);
    }
    
    const dateStr = date.toISOString().slice(0,10);
    for(let h=8; h<=21; h++){
      for(let m=0; m<60; m+=30){
        const start = `${pad(h)}:${pad(m)}`;
        const end = m === 0 ? `${pad(h)}:30` : `${pad(h+1)}:00`;
        
        const li = document.createElement('li');
        li.className = 'slot';
        if (isSlotInPast(dateStr, start)) {
          li.classList.add('past-slot');
        }
        li.dataset.date = dateStr;
        li.dataset.start = start;
        li.dataset.end = end;
        li.textContent = `${start} – ${end}`;
        allSlotsEl.appendChild(li);
      }
    }
  });
}

renderDays(7, 7);

// Центрирование активной даты по вертикали
let centeringInProgress = false;

function centerTodayInDateList(){
  if (centeringInProgress) {
    return; // Предотвращаем множественные вызовы
  }
  
  centeringInProgress = true;
  
  const activeEl = dateListEl.querySelector('.date-item.active');
  if(!activeEl) {
    console.log('Не найден активный элемент - пропускаем центрирование');
    centeringInProgress = false;
    return;
  }
  
  const topSpacer = dateListEl.querySelector('.date-spacer-top');
  if (!topSpacer) {
    console.log('Не найден topSpacer');
    return;
  }
  
  // Используем viewport height для центрирования
  const viewportHeight = window.innerHeight;
  const targetCenter = viewportHeight / 2;
  
  // Получаем позицию активного элемента относительно viewport
  const itemRect = activeEl.getBoundingClientRect();
  const itemCenter = itemRect.top + itemRect.height / 2;
  
  // Вычисляем нужную высоту верхнего спейсера
  const currentSpacerHeight = topSpacer.offsetHeight || 0;
  const delta = targetCenter - itemCenter;
  const newSpacerHeight = Math.max(0, currentSpacerHeight + delta);
  
  console.log('Центрирование:', {
    viewportHeight,
    targetCenter,
    itemCenter,
    delta,
    newSpacerHeight
  });
  
  topSpacer.style.height = `${newSpacerHeight}px`;
  
  // Сбрасываем флаг через небольшую задержку
  setTimeout(() => {
    centeringInProgress = false;
  }, 100);
}

centerTodayInDateList();
window.addEventListener('resize', centerTodayInDateList);
window.addEventListener('load', ()=> {
  setTimeout(centerTodayInDateList, 100);
});

// Перерисовка левого списка под фиксированный центр 2 окт 2025
function renderFixedLeftDates(){
  dateListEl.innerHTML = '';
  const monthsShortEn = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const formatShort = d => `${d.getDate()} ${monthsShortEn[d.getMonth()]}`;
  const center = new Date(2025, 9, 2); // 2 окт 2025
  center.setHours(0,0,0,0);
  const maxUp = new Date(2025, 9, 20); // 20 окт 2025
  const minDown = new Date(2025, 8, 1); // 1 сен 2025

  const topSpacer = document.createElement('div');
  topSpacer.className = 'date-spacer-top';
  dateListEl.appendChild(topSpacer);

  for(let d = new Date(maxUp); d > center; d.setDate(d.getDate()-1)){
    const el = document.createElement('div');
    el.className = 'date-item';
    el.dataset.date = d.toISOString().slice(0,10);
    el.textContent = formatShort(d);
    dateListEl.insertBefore(el, topSpacer.nextSibling);
  }

  const centerEl = document.createElement('div');
  centerEl.className = 'date-item active';
  centerEl.dataset.date = center.toISOString().slice(0,10);
  centerEl.textContent = formatShort(center);
  dateListEl.appendChild(centerEl);

  for(let d = new Date(center); d > minDown; ){
    d.setDate(d.getDate()-1);
    const el = document.createElement('div');
    el.className = 'date-item';
    el.dataset.date = d.toISOString().slice(0,10);
    el.textContent = formatShort(d);
    dateListEl.appendChild(el);
  }

  const bottomSpacer = document.createElement('div');
  bottomSpacer.className = 'date-spacer-bottom';
  dateListEl.appendChild(bottomSpacer);

  centerTodayInDateList();
}

renderFixedLeftDates();

// Перецентрируем после рендеринга с большей задержкой
setTimeout(centerTodayInDateList, 300);
setTimeout(centerTodayInDateList, 600);

// =======================
// Упрощённый режим: одна дата (2 октября 2025) и слоты 08:00–23:00
// =======================
function formatFullRu(date){
  const monthsShortEn = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${date.getDate()} ${monthsShortEn[date.getMonth()]} ${date.getFullYear().toString().slice(-2)}`;
}

function formatFullRuWithWeekday(date){
  const monthsShortEn = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const weekdaysShortEn = ['Su','Mo','Tu','We','Th','Fr','Sa'];
  const weekday = weekdaysShortEn[date.getDay()];
  return `${date.getDate()} ${monthsShortEn[date.getMonth()]} ${date.getFullYear().toString().slice(-2)} (${weekday})`;
}

function formatActiveDate(date){
  const monthsShortEn = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const day = date.getDate();
  const month = monthsShortEn[date.getMonth()];
  const year = date.getFullYear();
  
  return {
    day: day,
    month: month,
    year: year
  };
}

function renderSingleLeftDate(center){
  dateListEl.innerHTML = '';
  const topSpacer = document.createElement('div');
  topSpacer.className = 'date-spacer-top';
  dateListEl.appendChild(topSpacer);

  const centerEl = document.createElement('div');
  centerEl.className = 'date-item active';
  centerEl.dataset.date = center.toISOString().slice(0,10);
  
  // Создаем структуру для новой даты
  const dateInfo = formatActiveDate(center);
  centerEl.innerHTML = `
    <div class="active-date-day">${dateInfo.day}</div>
    <div class="active-date-month">${dateInfo.month}</div>
    <div class="active-date-year">${dateInfo.year}</div>
  `;
  
  dateListEl.appendChild(centerEl);

  const bottomSpacer = document.createElement('div');
  bottomSpacer.className = 'date-spacer-bottom';
  dateListEl.appendChild(bottomSpacer);
}

function isSlotInPast(dateStr, startTime) {
  const now = getMoscowTime();
  const today = getMoscowTime();
  today.setHours(0, 0, 0, 0); // Начало дня
  
  const slotDate = new Date(dateStr);
  slotDate.setHours(0, 0, 0, 0); // Начало дня для слота
  
  // Если слот не сегодня, проверяем дату
  if (slotDate < today) {
    return true;
  }
  
  // Если слот сегодня, проверяем время
  if (slotDate.getTime() === today.getTime()) {
    const [hours, minutes] = startTime.split(':').map(Number);
    const slotDateTime = getMoscowTime();
    slotDateTime.setHours(hours, minutes, 0, 0);
    
    return slotDateTime < now;
  }
  
  return false;
}

function renderSingleDaySlots(center){
  allSlotsEl.innerHTML = '';
  // Формируем строку даты без учета временной зоны (локальная дата)
  const year = center.getFullYear();
  const month = String(center.getMonth() + 1).padStart(2, '0');
  const day = String(center.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  console.log('Рендеринг слотов для даты:', dateStr, formatFullRu(center));
  console.log('DEBUG: renderSingleDaySlots - center:', center);
  console.log('DEBUG: renderSingleDaySlots - dateStr:', dateStr);
  
  // Генерируем получасовые слоты с 8:00 до 22:00 по умолчанию
  for(let h=8; h<=21; h++){
    for(let m=0; m<60; m+=30){
      const start = `${pad(h)}:${pad(m)}`;
      const end = m === 0 ? `${pad(h)}:30` : `${pad(h+1)}:00`;
      
      // Создаём получасовые слоты по умолчанию
      const li = document.createElement('li');
      li.className = 'slot';
      if (isSlotInPast(dateStr, start)) {
        li.classList.add('past-slot');
        console.log('Добавлен класс past-slot для:', dateStr, start);
      }
      li.dataset.date = dateStr;
      li.dataset.start = start;
      li.dataset.end = end;
      li.dataset.isSplit = 'false'; // Флаг для отслеживания разделения
      li.textContent = `${start} – ${end}`;
      
      // Добавляем обработчик клика для пустых слотов
      li.onclick = () => {
        // Снимаем выделение со всех слотов
        document.querySelectorAll('#all-slots li.selected').forEach(slot => {
          slot.classList.remove('selected');
        });
        // Выделяем текущий слот
        li.classList.add('selected');
        showCreateForm(li);
      };
      
      allSlotsEl.appendChild(li);
    }
  }
}

// Функция для разделения получасового слота на два 15-минутных
function splitSlotInto15Min(slotElement) {
  if (slotElement.dataset.isSplit === 'true') {
    return; // Уже разделен
  }
  
  const start = slotElement.dataset.start;
  const end = slotElement.dataset.end;
  const date = slotElement.dataset.date;
  
  // Создаем два 15-минутных слота
  const [startHour, startMin] = start.split(':').map(Number);
  const midMin = startMin + 15;
  const midHour = midMin >= 60 ? startHour + 1 : startHour;
  const midMinAdjusted = midMin >= 60 ? midMin - 60 : midMin;
  
  const midTime = `${pad(midHour)}:${pad(midMinAdjusted)}`;
  
  // Первый 15-минутный слот
  const firstSlot = document.createElement('li');
  firstSlot.className = 'slot';
  if (isSlotInPast(date, start)) {
    firstSlot.classList.add('past-slot');
  }
  firstSlot.dataset.date = date;
  firstSlot.dataset.start = start;
  firstSlot.dataset.end = midTime;
  firstSlot.dataset.isSplit = 'true';
  firstSlot.textContent = `${start} – ${midTime}`;
  
  // Добавляем обработчик клика для первого 15-минутного слота
  firstSlot.onclick = () => {
    // Снимаем выделение со всех слотов
    document.querySelectorAll('#all-slots li.selected').forEach(slot => {
      slot.classList.remove('selected');
    });
    // Выделяем текущий слот
    firstSlot.classList.add('selected');
    showCreateForm(firstSlot);
  };
  
  // Второй 15-минутный слот
  const secondSlot = document.createElement('li');
  secondSlot.className = 'slot';
  if (isSlotInPast(date, midTime)) {
    secondSlot.classList.add('past-slot');
  }
  secondSlot.dataset.date = date;
  secondSlot.dataset.start = midTime;
  secondSlot.dataset.end = end;
  secondSlot.dataset.isSplit = 'true';
  secondSlot.textContent = `${midTime} – ${end}`;
  
  // Добавляем обработчик клика для второго 15-минутного слота
  secondSlot.onclick = () => {
    // Снимаем выделение со всех слотов
    document.querySelectorAll('#all-slots li.selected').forEach(slot => {
      slot.classList.remove('selected');
    });
    // Выделяем текущий слот
    secondSlot.classList.add('selected');
    showCreateForm(secondSlot);
  };
  
  // Заменяем исходный слот двумя новыми
  slotElement.parentNode.insertBefore(firstSlot, slotElement);
  slotElement.parentNode.insertBefore(secondSlot, slotElement);
  slotElement.remove();
  
  console.log(`Слот ${start} – ${end} разделен на ${start} – ${midTime} и ${midTime} – ${end}`);
}

function initSingleDay(){
  // Используем текущую выбранную дату
  renderSingleLeftDate(currentDisplayDate);
  renderSingleDaySlots(currentDisplayDate);
  centerTodayInDateList();
  
  // Загружаем события для текущей даты
  console.log('=== initSingleDay: загружаем события ===');
  loadEventsFromAPI();
}

// Инициализация будет выполнена после загрузки событий
// initSingleDay(); - убрали отсюда, будет вызвано в switchToDate

// Установим в баннере прошедшей даты дату сегодня минус 2 дня в формате "D месяц YYYY (день недели)"
const pastDateBannerEl = document.getElementById('past-date-banner');
if (pastDateBannerEl) {
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  twoDaysAgo.setHours(0,0,0,0);
  pastDateBannerEl.textContent = formatFullRuWithWeekday(twoDaysAgo);
}

// Установим в баннере "Завтра" завтрашнюю дату
const tomorrowBannerEl = document.getElementById('tomorrow-banner');
if (tomorrowBannerEl) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0,0,0,0);
  tomorrowBannerEl.textContent = `Tomorrow (${formatDayMonth(tomorrow)})`;
}

// Установим в баннере "Сегодня" сегодняшнюю дату
const todayBannerEl = document.getElementById('today-banner');
if (todayBannerEl) {
  const today = new Date();
  today.setHours(0,0,0,0);
  todayBannerEl.textContent = `Сегодня (${formatDayMonth(today)})`;
}

// Установим в баннере "Вчера" вчерашнюю дату
const yesterdayBannerEl = document.getElementById('yesterday-banner');
if (yesterdayBannerEl) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0,0,0,0);
  yesterdayBannerEl.textContent = `Yesterday (${formatDayMonth(yesterday)})`;
}

// Установим в баннере "future-date-banner" дату сегодня плюс 2 дня в формате "D месяц YYYY (день недели)"
const futureDateBannerEl = document.getElementById('future-date-banner');
if (futureDateBannerEl) {
  const twoDaysAhead = new Date();
  twoDaysAhead.setDate(twoDaysAhead.getDate() + 2);
  twoDaysAhead.setHours(0,0,0,0);
  futureDateBannerEl.textContent = formatFullRuWithWeekday(twoDaysAhead);
}

// Заполним дополнительные будущие даты (над future-date-banner)
// Они идут от более далёких к ближним: future-7 (сегодня+7) ... future-3 (сегодня+3)
for (let i = 7; i >= 3; i--) {
  const el = document.getElementById(`future-${i}`);
  if (el) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    date.setHours(0,0,0,0);
    el.textContent = formatFullRuWithWeekday(date);
  }
}

// Заполним дополнительные прошедшие даты (под past-date-banner)
// Они идут от более близких к далёким: past-3 (сегодня-3) ... past-7 (сегодня-7)
for (let i = 3; i <= 7; i++) {
  const el = document.getElementById(`past-${i}`);
  if (el) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0,0,0,0);
    el.textContent = formatFullRuWithWeekday(date);
  }
}

function formatDayMonth(date) {
  const monthsShortEn = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${date.getDate()} ${monthsShortEn[date.getMonth()]}`;
}

// Блок с динамическими датами отключён

// =======================
// Синхронизация левого столбца с видимым днём
// =======================
function parseISODateOnly(isoYYYYMMDD){
  const [y,m,d] = isoYYYYMMDD.split('-').map(Number);
  return new Date(y, m-1, d);
}

function formatShortWithYear(date){
  const monthsShortEn = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${date.getDate()} ${monthsShortEn[date.getMonth()]} ${date.getFullYear()}`;
}

function setLeftLabelsByBaseDate(baseDate){
  if (clockTimeEl) clockTimeEl.textContent = formatShortWithYear(baseDate);
  const monthsFullEn = [
    'January','February','March','April','May','June','July','August','September','October','November','December'
  ];
  const tomorrow = new Date(baseDate);
  tomorrow.setDate(baseDate.getDate() + 1);
  const yesterday = new Date(baseDate);
  yesterday.setDate(baseDate.getDate() - 1);
  if (dateTopEl) dateTopEl.textContent = `${tomorrow.getDate()} ${monthsFullEn[tomorrow.getMonth()]}`;
  if (dateBottomEl) dateBottomEl.textContent = `${yesterday.getDate()} ${monthsFullEn[yesterday.getMonth()]}`;
}

function updateVisibleDayLabels(){
  const scrollContainer = sidebarEl || document.body;
  const containerTop = scrollContainer.getBoundingClientRect().top;
  let bestDateStr = null;
  let bestDist = Infinity;
  document.querySelectorAll('#all-slots > .day-divider, #all-slots > li').forEach(el=>{
    const rect = el.getBoundingClientRect();
    const dist = Math.abs(rect.top - containerTop - 8);
    const dateStr = el.dataset.date;
    if (!dateStr) return;
    if (dist < bestDist) {
      bestDist = dist;
      bestDateStr = dateStr;
    }
  });
  if (bestDateStr) {
    const baseDate = parseISODateOnly(bestDateStr);
    setLeftLabelsByBaseDate(baseDate);
    // Подсветка активной даты слева
    document.querySelectorAll('#date-list .date-item').forEach(d=>{
      d.classList.toggle('active', d.dataset.date === bestDateStr);
    });
  }
}

// Синхронизация левого столбца по видимому дню отключена для упрощённого режима

// =======================
// Подсветка слотов и выбор
// =======================
let isSelecting = false;
let startSlot = null;

allSlotsEl.addEventListener("mousedown", e=>{
  if(e.target.tagName === 'LI'){
    isSelecting = true;
    startSlot = e.target;
    startSlot.classList.add("selected");
  }
});

allSlotsEl.addEventListener("mouseover", e=>{
  if(isSelecting && e.target.tagName==='LI'){
    clearSelectionWithin(e.target.dataset.date);
    selectRangeWithin(startSlot, e.target);
  }
});

document.addEventListener("mouseup", e=>{
  isSelecting = false;
});

// Добавляем кнопку на пустые слоты при hover
allSlotsEl.addEventListener("mouseover", e=>{
  if(e.target.tagName==='LI' && !e.target.classList.contains('event-slot')){
    // Если кнопка уже добавлена, не добавляем снова
    if (e.target.querySelector('.empty-slot-btn')) return;
    
    // Проверяем длительность слота - если 15 минут, не показываем кнопку Split
    const startTime = e.target.dataset.start;
    const endTime = e.target.dataset.end;
    if (startTime && endTime) {
      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);
      const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);
      
      // Если слот 15-минутный, не показываем кнопку Split
      if (durationMinutes === 15) return;
    }
    
    // Добавляем обработчик двойного щелчка для разбиения получасового слота на 2 по 15 минут
    // Проверяем, что обработчик еще не добавлен
    if (!e.target.hasAttribute('data-dblclick-added')) {
      e.target.setAttribute('data-dblclick-added', 'true');
      e.target.addEventListener('dblclick', (ev) => {
      ev.stopPropagation();
      
      const [startHour, startMin] = e.target.dataset.start.split(':').map(Number);
      const midMin = startMin + 15;
      const midTime = `${String(startHour).padStart(2, '0')}:${String(midMin).padStart(2, '0')}`;
      const date = e.target.dataset.date;
      const startTime = e.target.dataset.start;
      const endTime = e.target.dataset.end;
      
      // Помечаем слот как разделённый
      e.target.classList.add('split-into-15');
      
      // Скрываем оригинальное время и добавляем два новых слота
      e.target.style.display = 'none';
      
      // Создаём первый 15-минутный слот
      const firstSlot = document.createElement('li');
      firstSlot.textContent = `${startTime} : ${midTime}`;
      firstSlot.dataset.date = date;
      firstSlot.dataset.start = startTime;
      firstSlot.dataset.end = midTime;
      firstSlot.style.cursor = 'pointer';
      firstSlot.style.padding = '0.3rem 0.5rem'; // Уменьшенный padding для меньшей высоты
      firstSlot.style.fontSize = '0.9em'; // Чуть меньший шрифт
      
      // Добавляем обработчик клика для первого слота
      firstSlot.addEventListener('click', (event) => {
        event.stopPropagation();
        clearSelectionWithin(date);
        firstSlot.classList.add('selected');
        showCreateForm(firstSlot);
      });
      
      // Создаём второй 15-минутный слот
      const secondSlot = document.createElement('li');
      secondSlot.textContent = `${midTime} : ${endTime}`;
      secondSlot.dataset.date = date;
      secondSlot.dataset.start = midTime;
      secondSlot.dataset.end = endTime;
      secondSlot.style.cursor = 'pointer';
      secondSlot.style.padding = '0.3rem 0.5rem'; // Уменьшенный padding для меньшей высоты
      secondSlot.style.fontSize = '0.9em'; // Чуть меньший шрифт
      
      // Добавляем обработчик клика для второго слота
      secondSlot.addEventListener('click', (event) => {
        event.stopPropagation();
        clearSelectionWithin(date);
        secondSlot.classList.add('selected');
        showCreateForm(secondSlot);
      });
      
      // Вставляем новые слоты после текущего
      e.target.insertAdjacentElement('afterend', secondSlot);
      e.target.insertAdjacentElement('afterend', firstSlot);
      
      // Сохраняем информацию о разделении в localStorage
      saveSplitSlot(date, startTime, endTime);
      
        console.log(`✓ Слот ${startTime}-${endTime} разделён на два по 15 минут`);
      });
      
      // Добавляем визуальную подсказку о двойном щелчке
      e.target.title = `${e.target.title || ''}\n\n💡 Двойной щелчок для разделения слота на 15-минутные`;
    }
  }
});

// Удаляем кнопки при уходе курсора (больше не нужно, так как используем двойной щелчок)
// allSlotsEl.addEventListener("mouseleave", e=>{
//   if(e.target.tagName==='LI'){
//     const buttons = e.target.querySelectorAll('.empty-slot-btn');
//     buttons.forEach(btn => btn.remove());
//   }
// }, true); // Используем capture phase для корректной работы

// Выделение слотов кликом
allSlotsEl.addEventListener("click", e=>{
  if(e.target.tagName==='LI' && !isSelecting){
    const dateStr = e.target.dataset.date;
    const selectedSlots = Array.from(allSlotsEl.querySelectorAll(`li.selected[data-date="${dateStr}"]`));
    
    // Если есть выделенные слоты и кликнутый слот - пустой и НЕ выделенный
    if (selectedSlots.length > 0 && !e.target.classList.contains('event-slot') && !e.target.classList.contains('selected')) {
      // Проверяем, является ли кликнутый слот смежным с уже выделенными
      const allDateSlots = Array.from(allSlotsEl.querySelectorAll(`li[data-date="${dateStr}"]`));
      const clickedIndex = allDateSlots.indexOf(e.target);
      const selectedIndices = selectedSlots.map(slot => allDateSlots.indexOf(slot));
      const minSelected = Math.min(...selectedIndices);
      const maxSelected = Math.max(...selectedIndices);
      
      // Если слот смежный (рядом с выделенными), добавляем к выделению
      if (clickedIndex === minSelected - 1 || clickedIndex === maxSelected + 1) {
        e.target.classList.add('selected');
        selectedSlots.push(e.target);
        
        // Сортируем слоты по времени и создаём событие на весь диапазон
        selectedSlots.sort((a, b) => allDateSlots.indexOf(a) - allDateSlots.indexOf(b));
        
        const firstSlot = selectedSlots[0];
        const lastSlot = selectedSlots[selectedSlots.length - 1];
        
        // Создаём объединённый слот для формы
        const mergedSlot = {
          dataset: {
            date: firstSlot.dataset.date,
            start: firstSlot.dataset.start,
            end: lastSlot.dataset.end
          }
        };
        
        showCreateForm(mergedSlot);
      } else {
        // Слот не смежный - сбрасываем выделение и начинаем новое
        clearSelectionWithin(dateStr);
        e.target.classList.add("selected");
        showCreateForm(e.target);
      }
    } else {
      // Обычное поведение - один слот
      clearSelectionWithin(dateStr);
      e.target.classList.add("selected");
      if (!e.target.classList.contains('event-slot')){
        showCreateForm(e.target);
      }
    }
  }
});

function clearSelectionWithin(dateStr){
  if(!dateStr) return;
  allSlotsEl.querySelectorAll(`li.selected[data-date="${dateStr}"]`).forEach(li=> li.classList.remove('selected'));
}

function selectRangeWithin(start, end){
  if(start.dataset.date !== end.dataset.date) return;
  const slots = Array.from(allSlotsEl.querySelectorAll(`li[data-date="${start.dataset.date}"]`));
  const startIndex = slots.indexOf(start);
  const endIndex = slots.indexOf(end);
  const [from, to] = startIndex<endIndex ? [startIndex,endIndex] : [endIndex,startIndex];
  for(let i=from;i<=to;i++) slots[i].classList.add('selected');
}

// =======================
// Создание серии повторяющихся событий
// =======================
async function createRecurringSeries(eventData, recurrenceType) {
  const createdEvents = [];
  const baseDate = createMoscowDate(eventData.start);
  
  let count = 0;
  let interval = 0;
  
  if (recurrenceType === 'weekly') {
    count = 1; // 1 неделя (5 рабочих дней)
    interval = 7; // дней
  } else if (recurrenceType === 'daily') {
    count = 5; // 5 рабочих дней
    interval = 1; // день
  }
  
  console.log(`Создание серии из ${count} событий (${recurrenceType})`);
  
  for (let i = 1; i <= count; i++) {
    let nextDate;
    let nextEndDate;
    
    if (recurrenceType === 'daily') {
      // Для Daily событий создаем только в рабочие дни (понедельник-пятница)
      nextDate = getNextWorkingDay(baseDate, i);
      // Для Daily событий время окончания рассчитываем относительно новой даты начала
      const duration = utcToMoscow(eventData.end).getTime() - utcToMoscow(eventData.start).getTime();
      nextEndDate = new Date(nextDate.getTime() + duration);
    } else {
      // Для Weekly событий создаем каждые 7 дней в то же время
      nextDate = new Date(baseDate);
      nextDate.setDate(nextDate.getDate() + (interval * i));
      
      // Для Weekly событий время окончания рассчитываем относительно новой даты начала
      const duration = utcToMoscow(eventData.end).getTime() - utcToMoscow(eventData.start).getTime();
      nextEndDate = new Date(nextDate.getTime() + duration);
    }
    
    const nextEventData = {
      ...eventData,
      start: toMoscowISOString(nextDate),
      end: toMoscowISOString(nextEndDate)
    };
    
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextEventData)
      });
      
      if (response.ok) {
        const created = await response.json();
        createdEvents.push(created);
        console.log(`✓ Создано событие ${i}/${count}: ${nextDate.toLocaleDateString()}`);
      }
    } catch (err) {
      console.error(`Ошибка при создании события ${i}:`, err);
    }
  }
  
  return createdEvents;
}

// Функция для получения следующего рабочего дня
function getNextWorkingDay(baseDate, workingDayNumber) {
  const date = new Date(baseDate);
  let workingDaysFound = 0;
  
  while (workingDaysFound < workingDayNumber) {
    date.setDate(date.getDate() + 1);
    const dayOfWeek = date.getDay(); // 0 = воскресенье, 1 = понедельник, ..., 6 = суббота
    
    // Проверяем, что это рабочий день (понедельник-пятница)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      workingDaysFound++;
    }
  }
  
  return date;
}

// =======================
// Проверка, является ли событие последним в серии
// =======================
async function checkAndExtendSeries(ev) {
  const eventDate = utcToMoscow(ev.start);
  const subject = ev.subject.toLowerCase();
  
  let recurrenceType = null;
  if (subject.includes('weekly')) {
    recurrenceType = 'weekly';
  } else if (subject.includes('daily') && !subject.includes('dev daily')) {
    recurrenceType = 'daily';
  }
  
  if (!recurrenceType) return;
  
  // Ищем все события с таким же названием (загружаем из API)
  let similarEvents = [];
  try {
    console.log('🔍 Проверка серии: загружаем все события из API');
    const response = await fetch('/api/events');
    if (response.ok) {
      const allEvents = await response.json();
      console.log('📋 Загружено всего событий:', allEvents.length);
      similarEvents = allEvents.filter(e => 
        e.subject.toLowerCase() === subject && e.id !== ev.id
      );
      console.log(`📋 Найдено событий серии "${subject}":`, similarEvents.length);
      console.log('📋 События серии:', similarEvents.map(e => ({ id: e.id, start: e.start, subject: e.subject })));
    }
  } catch (error) {
    console.error('Ошибка загрузки событий для проверки серии:', error);
    // Fallback к mockEvents
    similarEvents = mockEvents.filter(e => 
      e.subject.toLowerCase() === subject && e.id !== ev.id
    );
  }
  
  if (similarEvents.length === 0) return;
  
  // Сортируем по дате
  similarEvents.sort((a, b) => utcToMoscow(a.start) - utcToMoscow(b.start));
  
  // Проверяем, является ли текущее событие последним
  const lastEvent = similarEvents[similarEvents.length - 1];
  const isLast = utcToMoscow(ev.start) >= utcToMoscow(lastEvent.start);
  
  // Дополнительная проверка: есть ли события в ближайшие дни (для обработки пропусков в выходные)
  let hasUpcomingEvents = false;
  if (isLast) {
    const currentDate = new Date(utcToMoscow(ev.start));
    const nextDay = new Date(currentDate);
    nextDay.setDate(currentDate.getDate() + 1);
    const dayAfterTomorrow = new Date(currentDate);
    dayAfterTomorrow.setDate(currentDate.getDate() + 2);
    const threeDaysLater = new Date(currentDate);
    threeDaysLater.setDate(currentDate.getDate() + 3);
    
    console.log('🔍 Проверка следующих событий:');
    console.log('📅 Текущая дата:', currentDate.toLocaleDateString('ru-RU'));
    console.log('📅 Следующий день:', nextDay.toLocaleDateString('ru-RU'));
    console.log('📅 Через день:', dayAfterTomorrow.toLocaleDateString('ru-RU'));
    console.log('📅 Через 3 дня:', threeDaysLater.toLocaleDateString('ru-RU'));
    
    // Проверяем, есть ли события на следующий день, через день или через 3 дня
    hasUpcomingEvents = similarEvents.some(event => {
      const eventDate = new Date(utcToMoscow(event.start));
      const isNextDay = eventDate.getTime() === nextDay.getTime();
      const isDayAfterTomorrow = eventDate.getTime() === dayAfterTomorrow.getTime();
      const isThreeDaysLater = eventDate.getTime() === threeDaysLater.getTime();
      
      if (isNextDay || isDayAfterTomorrow || isThreeDaysLater) {
        console.log(`✅ Найдено событие на ${eventDate.toLocaleDateString('ru-RU')}:`, event.subject);
        return true;
      }
      return false;
    });
    
    console.log('🔍 Есть ли следующие события:', hasUpcomingEvents);
  }
  
  if (isLast && !hasUpcomingEvents) {
    const extendMore = confirm(
      `Это последнее событие в серии "${ev.subject}".\n\n` +
      `Следующих событий в серии не найдено (проверено на 3 дня вперёд).\n\n` +
      `Продлить серию ещё на неделю (5 будущих рабочих дней)?`
    );
    
    if (extendMore) {
      const eventData = {
        subject: ev.subject,
        start: ev.start,
        end: ev.end,
        location: ev.location || '',
        attendees: ev.attendees || [],
        stream: ev.stream || [],
        notes: ev.notes || ''
      };
      
      await createRecurringSeries(eventData, recurrenceType);
      await loadEventsFromAPI();
      alert(`Серия "${ev.subject}" продлена на неделю (5 рабочих дней)!`);
    }
  }
}

// =======================
// Объединение события со следующим получасовым слотом
// =======================
async function combineWithNext(ev, currentSlot) {
  console.log(`Объединение события "${ev.subject}" со следующим слотом`);
  
  // Находим следующий слот
  const allSlots = Array.from(allSlotsEl.querySelectorAll(`li[data-date="${currentSlot.dataset.date}"]`));
  const currentIndex = allSlots.indexOf(currentSlot);
  
  if (currentIndex === -1 || currentIndex >= allSlots.length - 1) {
    alert('Это последний слот дня, объединение невозможно');
    return;
  }
  
  const nextSlot = allSlots[currentIndex + 1];
  const nextSlotStartTime = nextSlot.dataset.start;
  const nextSlotEndTime = nextSlot.dataset.end;
  
  // Находим событие в следующем слоте (если есть)
  let nextEvent = null;
  if (nextSlot.classList.contains('event-slot')) {
    // Ищем событие, которое занимает следующий слот
    nextEvent = mockEvents.find(e => {
      const eStart = utcToMoscow(e.start);
      const eEnd = utcToMoscow(e.end);
      const slotStart = new Date(currentSlot.dataset.date + 'T' + nextSlotStartTime);
      const slotEnd = new Date(currentSlot.dataset.date + 'T' + nextSlotEndTime);
      return eEnd > slotStart && eStart < slotEnd;
    });
  }
  
  // Формируем сообщение подтверждения
  let confirmMessage = `Объединить событие "${ev.subject}" со следующим слотом (${nextSlotStartTime} – ${nextSlotEndTime})?`;
  
  if (nextEvent) {
    confirmMessage = `Объединить два события?\n\n` +
      `1️⃣ "${ev.subject}" (${currentSlot.dataset.start} – ${currentSlot.dataset.end})\n` +
      `2️⃣ "${nextEvent.subject}" (${nextSlotStartTime} – ${nextSlotEndTime})\n\n` +
      `Результат: "${ev.subject}" (${currentSlot.dataset.start} – ${nextSlotEndTime})\n\n` +
      `⚠️ Второе событие будет удалено, его заметки будут добавлены к первому.`;
  }
  
  if (!confirm(confirmMessage)) {
    return;
  }
  
  // Расширяем текущее событие до конца следующего слота
  // Используем правильное время окончания следующего слота
  const [year, month, day] = nextSlot.dataset.date.split('-').map(Number);
  const [endHour, endMinute] = nextSlotEndTime.split(':').map(Number);
  
  // Создаем строку времени в правильном формате (локальное время)
  const newEndTime = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}:00`;
  
  console.log('DEBUG combineWithNext:', {
    nextSlotDate: nextSlot.dataset.date,
    nextSlotEndTime: nextSlotEndTime,
    year, month, day, endHour, endMinute,
    newEndTime: newEndTime
  });
  
  // Объединяем заметки, если есть второе событие
  let combinedNotes = ev.notes || '';
  let combinedAttendees = [...(ev.attendees || [])];
  let combinedStreams = [...(ev.stream || [])];
  
  if (nextEvent) {
    // Добавляем заметки из второго события
    if (nextEvent.notes) {
      combinedNotes = combinedNotes 
        ? `${combinedNotes}\n\n--- Заметки из "${nextEvent.subject}" ---\n${nextEvent.notes}`
        : nextEvent.notes;
    }
    
    // Объединяем участников (без дубликатов)
    if (nextEvent.attendees) {
      nextEvent.attendees.forEach(att => {
        if (!combinedAttendees.includes(att)) {
          combinedAttendees.push(att);
        }
      });
    }
    
    // Объединяем стримы (без дубликатов)
    if (nextEvent.stream) {
      nextEvent.stream.forEach(str => {
        if (!combinedStreams.includes(str)) {
          combinedStreams.push(str);
        }
      });
    }
  }
  
  try {
    // Обновляем первое событие
    const response = await fetch(`/api/events/${ev.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        end: newEndTime,
        notes: combinedNotes,
        attendees: combinedAttendees,
        stream: combinedStreams
      })
    });
    
    if (response.ok) {
      console.log('✓ Событие успешно расширено до', nextSlotEndTime);
      
      // Удаляем второе событие, если оно было
      if (nextEvent) {
        await fetch(`/api/events/${nextEvent.id}`, {
          method: 'DELETE'
        });
        console.log('✓ Второе событие удалено');
      }
      
      await loadEventsFromAPI();
    }
  } catch (err) {
    console.error('Ошибка при объединении события:', err);
    alert('Не удалось объединить события');
  }
}

// =======================
// Разделение получасового события на два 15-минутных
// =======================
async function splitTo15Min(ev, currentSlot) {
  console.log(`Разделение события "${ev.subject}" на два 15-минутных события`);
  
  // Парсим время начала и конца события
  const [startHour, startMin] = currentSlot.dataset.start.split(':').map(Number);
  const [endHour, endMin] = currentSlot.dataset.end.split(':').map(Number);
  
  // Создаём два 15-минутных события
  const midMin = startMin + 15;
  const midTime = `${String(startHour).padStart(2, '0')}:${String(midMin).padStart(2, '0')}`;
  
  const event1 = {
    subject: ev.subject,
    start: createMoscowTime(currentSlot.dataset.date, currentSlot.dataset.start),
    end: createMoscowTime(currentSlot.dataset.date, midTime),
    location: ev.location || '',
    attendees: ev.attendees || [],
    stream: ev.stream || [],
    notes: ev.notes || ''
  };
  
  const event2 = {
    subject: ev.subject,
    start: createMoscowTime(currentSlot.dataset.date, midTime),
    end: createMoscowTime(currentSlot.dataset.date, currentSlot.dataset.end),
    location: ev.location || '',
    attendees: ev.attendees || [],
    stream: ev.stream || [],
    notes: ev.notes || ''
  };
  
  try {
    // Создаём первое 15-минутное событие
    const response1 = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event1)
    });
    
    // Создаём второе 15-минутное событие
    const response2 = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event2)
    });
    
    if (response1.ok && response2.ok) {
      console.log('✓ Два 15-минутных события созданы');
      
      // Удаляем исходное получасовое событие
      await fetch(`/api/events/${ev.id}`, {
        method: 'DELETE'
      });
      console.log('✓ Исходное событие удалено');
      
      await loadEventsFromAPI();
    }
  } catch (err) {
    console.error('Ошибка при разделении на 15-минутные события:', err);
    alert('Не удалось разделить событие');
  }
}

// =======================
// Разделение объединённого события на отдельные получасовые слоты
// =======================
async function splitEvent(ev, markedSlots) {
  console.log(`Разделение события "${ev.subject}" на ${markedSlots.length} слотов`);
  
  // Создаём отдельные события для каждого получасового слота
  const newEvents = [];
  for (let i = 0; i < markedSlots.length; i++) {
    const slot = markedSlots[i];
    const startTime = createMoscowTime(slot.dataset.date, slot.dataset.start);
    const endTime = createMoscowTime(slot.dataset.date, slot.dataset.end);
    
    const newEvent = {
      subject: ev.subject,
      start: startTime,
      end: endTime,
      location: ev.location || '',
      attendees: ev.attendees || [],
      stream: ev.stream || [],
      notes: ev.notes || ''
    };
    
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEvent)
      });
      
      if (response.ok) {
        const created = await response.json();
        newEvents.push(created);
        console.log(`✓ Создан слот ${i + 1}/${markedSlots.length}:`, slot.dataset.start, '-', slot.dataset.end);
      }
    } catch (err) {
      console.error('Ошибка при создании слота:', err);
    }
  }
  
  // Удаляем исходное объединённое событие
  try {
    await fetch(`/api/events/${ev.id}`, {
      method: 'DELETE'
    });
    console.log('✓ Исходное событие удалено');
  } catch (err) {
    console.error('Ошибка при удалении исходного события:', err);
  }
  
  // Перезагружаем события
  await loadEventsFromAPI();
}

// =======================
// Сброс стилей слотов перед загрузкой событий
// =======================
function resetSlotStyles() {
  const slots = Array.from(allSlotsEl.querySelectorAll('li'));
  slots.forEach(li => {
    // Сбрасываем все кастомные стили
    li.style.height = '';
    li.style.display = '';
    li.style.alignItems = '';
    li.classList.remove('event-slot', 'event-slot-first', 'event-slot-hidden');
    li.onclick = null;
    
    // Восстанавливаем исходный текст
    const start = li.dataset.start;
    const end = li.dataset.end;
    li.textContent = `${start} – ${end}`;
    li.title = '';
  });
}

// =======================
// Размещение событий в таймлайне
// =======================
function markEventSlots(ev){
  console.log('=== markEventSlots: начало ===', {
    subject: ev.subject,
    start: ev.start,
    end: ev.end
  });
  
  console.log('DEBUG: markEventSlots - исходные данные:', {
    evStart: ev.start,
    evEnd: ev.end,
    evStartType: typeof ev.start,
    evEndType: typeof ev.end
  });
  
  // Конвертируем время из БД в московское время для отображения
  const startTime = utcToMoscow(ev.start);
  const endTime = utcToMoscow(ev.end);
  
  // Для логирования создаем UTC время правильно
  const startTimeUTC = new Date(startTime.getTime() + (3 * 60 * 60 * 1000));
  const endTimeUTC = new Date(endTime.getTime() + (3 * 60 * 60 * 1000));
  
  console.log('DEBUG: markEventSlots - конвертированное время:', {
    startTimeUTC: startTimeUTC.toISOString(),
    endTimeUTC: endTimeUTC.toISOString(),
    startTime: startTime.toString(),
    endTime: endTime.toString()
  });
  
  // Получаем дату события в московском времени
  const year = startTime.getFullYear();
  const month = String(startTime.getMonth() + 1).padStart(2, '0');
  const day = String(startTime.getDate()).padStart(2, '0');
  const eventDateStr = `${year}-${month}-${day}`;
  
  console.log(`Размещаем событие "${ev.subject}": дата=${eventDateStr}, UTC=${startTimeUTC.toISOString()}, Moscow=${startTime}`);

  const slots = Array.from(allSlotsEl.querySelectorAll('li'));
  let markedSlots = [];
  
  console.log('=== markEventSlots: проверяем слоты ===', {
    eventDateStr,
    totalSlots: slots.length,
    slotDates: [...new Set(slots.map(s => s.dataset.date))],
    firstFewSlots: slots.slice(0, 3).map(s => ({
      date: s.dataset.date,
      start: s.dataset.start,
      end: s.dataset.end
    })),
    allSlotsEl: allSlotsEl ? 'exists' : 'missing',
    allSlotsElChildren: allSlotsEl ? allSlotsEl.children.length : 'N/A'
  });
  
  // Сначала находим все подходящие слоты (только видимые)
  slots.forEach(li=>{
    const slotDateStr = li.dataset.date; // YYYY-MM-DD
    
    if (slotDateStr !== eventDateStr) {
      return;
    }
    
    // Убираем проверку на event-slot-hidden, чтобы события могли перекрываться
    // if (li.classList.contains('event-slot-hidden')) {
    //   return;
    // }
    
    const [y, mo, d] = slotDateStr.split('-').map(Number);
    const [sh, sm] = li.dataset.start.split(':').map(Number);
    const [eh, em] = li.dataset.end.split(':').map(Number);
    
    const slotStart = new Date(y, mo-1, d, sh, sm, 0, 0);
    const slotEnd = new Date(y, mo-1, d, eh, em, 0, 0);

    console.log(`🔍 Проверяем слот ${slotDateStr} ${li.dataset.start}-${li.dataset.end}:`, {
      slotStart: slotStart.toString(),
      slotEnd: slotEnd.toString(),
      startTime: startTime.toString(),
      endTime: endTime.toString(),
      slotEndGTStartTime: slotEnd > startTime,
      slotStartLTEndTime: slotStart < endTime,
      condition: slotEnd > startTime && slotStart < endTime
    });

    if(slotEnd > startTime && slotStart < endTime){
      markedSlots.push(li);
      console.log(`✅ Слот добавлен: ${slotDateStr} ${li.dataset.start}-${li.dataset.end}`);
    }
  });
  
  console.log(`  Найдено слотов: ${markedSlots.length}`);
  
  // Вычисляем реальную длительность события из базы данных
  const durationMinutes = (endTime - startTime) / (1000 * 60);
  const slotsNeeded = Math.ceil(durationMinutes / 15); // Количество 15-минутных слотов
  
  console.log(`DEBUG: Событие "${ev.subject}": durationMinutes=${durationMinutes}, slotsNeeded=${slotsNeeded}`);
  console.log(`DEBUG: Найденные слоты для "${ev.subject}":`, markedSlots.map(s => `${s.dataset.start}-${s.dataset.end}`));
  
  // Для 15-минутных событий автоматически разделяем слоты, если они еще не разделены
  if (durationMinutes <= 15 && markedSlots.length > 0) {
    const slotToSplit = markedSlots[0];
    if (slotToSplit.dataset.isSplit === 'false') {
      console.log(`DEBUG: Автоматически разделяем слот ${slotToSplit.dataset.start}-${slotToSplit.dataset.end} для 15-минутного события "${ev.subject}"`);
      splitSlotInto15Min(slotToSplit);
      
      // Обновляем список слотов после разделения
      const updatedSlots = Array.from(allSlotsEl.querySelectorAll('li'));
      markedSlots = [];
      
      updatedSlots.forEach(li => {
        const slotDateStr = li.dataset.date;
        if (slotDateStr !== eventDateStr) return;
        
        const [y, mo, d] = slotDateStr.split('-').map(Number);
        const [sh, sm] = li.dataset.start.split(':').map(Number);
        const [eh, em] = li.dataset.end.split(':').map(Number);
        
        const slotStart = new Date(y, mo-1, d, sh, sm, 0, 0);
        const slotEnd = new Date(y, mo-1, d, eh, em, 0, 0);

        if(slotEnd > startTime && slotStart < endTime){
          markedSlots.push(li);
        }
      });
      
      console.log(`DEBUG: После разделения найдено слотов: ${markedSlots.length}`);
    }
  }
  
  // Если событие занимает несколько слотов - объединяем их визуально
  if (markedSlots.length > 0) {
    const firstSlot = markedSlots[0];
    const lastSlot = markedSlots[markedSlots.length - 1];
    
    // Форматируем текст для первого слота (показываем реальное время события)
    const startTimeStr = startTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const endTimeStr = endTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const fullText = `${startTimeStr} – ${endTimeStr}: ${ev.subject}`;
    firstSlot.textContent = fullText;
    firstSlot.title = fullText;
    firstSlot.classList.add('event-slot');
    firstSlot.classList.add('event-slot-first');
    
    // Добавляем класс для длительности события на основе реальной длительности
    if (durationMinutes <= 15) {
      firstSlot.classList.add('event-duration-15min');
      console.log(`DEBUG: Добавлен класс event-duration-15min для "${ev.subject}"`);
      console.log(`DEBUG: Классы слота после добавления:`, firstSlot.className);
      console.log(`DEBUG: Высота слота после добавления класса:`, firstSlot.style.height);
    } else if (durationMinutes <= 30) {
      firstSlot.classList.add('event-duration-30min');
      console.log(`DEBUG: Добавлен класс event-duration-30min для "${ev.subject}"`);
      console.log(`DEBUG: Классы слота после добавления:`, firstSlot.className);
    } else if (durationMinutes <= 45) {
      firstSlot.classList.add('event-duration-45min');
      console.log(`DEBUG: Добавлен класс event-duration-45min для "${ev.subject}"`);
    } else if (durationMinutes <= 60) {
      firstSlot.classList.add('event-duration-60min');
      console.log(`DEBUG: Добавлен класс event-duration-60min для "${ev.subject}"`);
    } else {
      firstSlot.classList.add('event-duration-long');
      console.log(`DEBUG: Добавлен класс event-duration-long для "${ev.subject}"`);
    }
    firstSlot.onclick = () => {
      // Снимаем выделение со всех слотов
      document.querySelectorAll('#all-slots li.selected').forEach(slot => {
        slot.classList.remove('selected');
      });
      // Выделяем текущий слот
      firstSlot.classList.add('selected');
      showEvent(ev);
    };
    
    // Для событий на один слот добавляем кнопку Combine
    if (markedSlots.length === 1) {
      // Вычисляем длительность события в минутах
      const eventStart = utcToMoscow(ev.start);
      const eventEnd = utcToMoscow(ev.end);
      const durationMinutes = (eventEnd - eventStart) / (1000 * 60);
      
      // Проверяем, является ли следующий слот 15-минутным
      const allSlots = Array.from(allSlotsEl.querySelectorAll(`li[data-date="${firstSlot.dataset.date}"]`));
      const currentIndex = allSlots.indexOf(firstSlot);
      const nextSlot = allSlots[currentIndex + 1];
      const nextSlotStart = nextSlot?.dataset.start;
      const nextSlotEnd = nextSlot?.dataset.end;
      
      let nextSlotIs15Min = false;
      if (nextSlotStart && nextSlotEnd) {
        const [nsH, nsM] = nextSlotStart.split(':').map(Number);
        const [neH, neM] = nextSlotEnd.split(':').map(Number);
        const nextDuration = (neH * 60 + neM) - (nsH * 60 + nsM);
        nextSlotIs15Min = (nextDuration === 15);
      }
      
      // Для 15-минутных событий показываем Combine всегда
      // Для получасовых событий показываем Combine всегда
      const shouldShowCombine = (durationMinutes === 15) || (durationMinutes === 30);
      
      if (shouldShowCombine) {
        // Кнопка Combine
        const combineBtn = document.createElement('span');
        combineBtn.textContent = 'Combine';
        combineBtn.className = 'combine-btn';
        combineBtn.title = durationMinutes === 15 
          ? 'Объединить со следующим 15-минутным слотом' 
          : 'Объединить со следующим слотом';
        combineBtn.onclick = async (e) => {
          e.stopPropagation();
          await combineWithNext(ev, firstSlot);
        };
        firstSlot.appendChild(combineBtn);
      }
    }
    
    // Если событие занимает больше одного слота
    if (markedSlots.length > 1) {
      // Для 15-минутных событий показываем Combine вместо Split
      if (durationMinutes === 15) {
        const combineBtn = document.createElement('span');
        combineBtn.textContent = 'Combine';
        combineBtn.className = 'combine-btn';
        combineBtn.title = 'Объединить со следующим 15-минутным слотом';
        combineBtn.onclick = async (e) => {
          e.stopPropagation();
          await combineWithNext(ev, firstSlot);
        };
        firstSlot.appendChild(combineBtn);
      } else {
        // Добавляем обработчик двойного щелчка для разделения события
        // Проверяем, что обработчик еще не добавлен
        if (!firstSlot.hasAttribute('data-dblclick-added')) {
          firstSlot.setAttribute('data-dblclick-added', 'true');
          firstSlot.addEventListener('dblclick', async (e) => {
            e.stopPropagation();
            if (confirm('Разделить это событие на отдельные получасовые слоты?')) {
              await splitEvent(ev, markedSlots);
            }
          });
          
          // Добавляем визуальную подсказку о двойном щелчке
          firstSlot.title = `${firstSlot.title || ''}\n\n💡 Двойной щелчок для разделения события`;
        }
      }
      // Вычисляем общую высоту всех слотов с учетом отступов
      let totalHeight = 0;
      markedSlots.forEach((slot, idx) => {
        const slotStyle = getComputedStyle(slot);
        const height = parseFloat(slotStyle.height);
        const marginBottom = parseFloat(slotStyle.marginBottom);
        totalHeight += height;
        if (idx < markedSlots.length - 1) {
          totalHeight += marginBottom;
        }
      });
      
      firstSlot.style.height = `${totalHeight}px`;
      firstSlot.style.display = 'flex';
      firstSlot.style.alignItems = 'center';
      
      // НЕ скрываем остальные слоты, чтобы другие события могли их использовать
      // for (let i = 1; i < markedSlots.length; i++) {
      //   markedSlots[i].style.display = 'none';
      //   markedSlots[i].classList.add('event-slot-hidden');
      // }
    }
  }
}

// =======================
// Загрузка событий из API
// =======================
async function loadEventsFromAPI() {
  
  // Формируем строку даты без учета временной зоны (локальная дата)
  const year = currentDisplayDate.getFullYear();
  const month = String(currentDisplayDate.getMonth() + 1).padStart(2, '0');
  const day = String(currentDisplayDate.getDate()).padStart(2, '0');
  const currentDateStr = `${year}-${month}-${day}`;
  
  console.log('🔍 DEBUG: currentDisplayDate:', currentDisplayDate, '→', currentDateStr);
  console.log('🔍 DEBUG: Сегодняшняя дата:', new Date().toISOString().split('T')[0]);
  console.log('🔍 DEBUG: currentDisplayDate === сегодня?', currentDateStr === new Date().toISOString().split('T')[0]);
  
  try {
    console.log('=== loadEventsFromAPI: отправляем запрос за период ===');
    
    // Вычисляем диапазон дат для загрузки (7 дней назад + сегодня + 7 дней вперед)
    const startDate = new Date(currentDisplayDate);
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date(currentDisplayDate);
    endDate.setDate(endDate.getDate() + 7);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    
    const events = await safeFetch(`/api/events?start_date=${startDateStr}&end_date=${endDateStr}`, {}, 'Загрузка событий');
    
    if (events !== null) {
      // events может быть пустым массивом [], что нормально
      console.log(`📅 Загружено событий: ${events.length}`);
      
      mockEvents = events.map(ev => {
        // Обрабатываем notes - если это JSON строка, парсим её
        let notes = ev.notes || '';
        if (typeof notes === 'string' && notes.trim().startsWith('[')) {
          try {
            notes = JSON.parse(notes);
          } catch (e) {
            console.log('Ошибка парсинга notes как JSON:', e);
            // Если не удалось распарсить как JSON, возможно это старый формат
            // Мигрируем в новый формат
            console.log('🔄 Мигрируем старые заметки в новый формат для события:', ev.id);
            notes = migrateOldNotesToNewFormat(notes);
          }
        } else if (typeof notes === 'string' && notes.trim()) {
          // Если это обычная строка (старый формат), мигрируем
          console.log('🔄 Мигрируем старые заметки в новый формат для события:', ev.id);
          notes = migrateOldNotesToNewFormat(notes);
        }
        
        return {
          id: ev.id,
          subject: ev.subject,
          start: ev.start,
          end: ev.end,
          location: ev.location || '',
          attendees: ev.attendees || [],
          stream: ev.stream || [],
          notes: notes,
          recording_url: ev.recording_url || '',
          // Преобразуем open_questions из формата БД
          open_questions: (ev.open_questions || []).map(oq => {
            const parts = [];
            if (oq.time) parts.push(oq.time);
            if (oq.person) parts.push(oq.person);
            if (oq.stream) parts.push(`#${oq.stream}`);
            const prefix = parts.length ? `[${parts.join(' | ')}] ` : '';
            return `${prefix}${oq.text}`;
          }),
          actual_open_questions: ev.actual_open_questions || ''
        };
      });
      
      console.log('События после преобразования:', mockEvents.length);
      
      // Проверяем событие "with Aleks" в mockEvents
      const aleksEvent = mockEvents.find(e => e.id === 644);
      if (aleksEvent) {
        console.log('🔍 DEBUG: Aleks event in mockEvents:', aleksEvent.actual_open_questions);
      } else {
        console.log('❌ DEBUG: Aleks event NOT found in mockEvents');
      }
      
      // Очищаем все слоты перед отметкой событий
      clearAllEventSlots();
      
      // Сбрасываем стили объединённых слотов
      resetSlotStyles();
      
      // Отметим все события на слотах для текущей даты и ближайших дней (для weekly/daily серий)
      console.log('Фильтруем события для отображения на текущую дату:', currentDateStr);
      
      // Создаем массив дат для отображения (7 дней назад + сегодня + 7 дней вперед)
      const datesToDisplay = [];
      for (let i = -7; i <= 7; i++) {
        const date = new Date(currentDisplayDate);
        date.setDate(date.getDate() + i);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        datesToDisplay.push(`${year}-${month}-${day}`);
      }
      
      console.log('Отображаем события для дат:', datesToDisplay);
      
      const filteredEvents = mockEvents.filter(ev => {
        // Конвертируем UTC в московское время
        const eventStartMoscow = utcToMoscow(ev.start);
        const year = eventStartMoscow.getFullYear();
        const month = String(eventStartMoscow.getMonth() + 1).padStart(2, '0');
        const day = String(eventStartMoscow.getDate()).padStart(2, '0');
        const eventDate = `${year}-${month}-${day}`;
        
        const matches = datesToDisplay.includes(eventDate);
        
        // Дополнительное логирование для всех событий на сегодня
        if (eventDate === currentDateStr) {
          console.log('🎯 СОБЫТИЕ НА СЕГОДНЯ:', {
            id: ev.id,
            subject: ev.subject,
            startUTC: ev.start,
            endUTC: ev.end,
            startMoscow: eventStartMoscow.toISOString(),
            eventDate: eventDate,
            currentDate: currentDateStr,
            datesToDisplay: datesToDisplay,
            matches: matches
          });
        }
        
        // Специальное логирование для события 566
        if (ev.id === 566) {
          console.log('🔴🔴🔴 СОБЫТИЕ 566 "Sync after vac" 🔴🔴🔴', {
            id: ev.id,
            subject: ev.subject,
            startUTC: ev.start,
            endUTC: ev.end,
            startMoscow: eventStartMoscow.toISOString(),
            eventDate: eventDate,
            currentDate: currentDateStr,
            datesToDisplay: datesToDisplay,
            matches: matches
          });
        }
        
        console.log(`  Событие "${ev.subject}":`, {
          startUTC: ev.start,
          startMoscow: eventStartMoscow.toISOString(),
          eventDate: eventDate,
          currentDate: currentDateStr,
          matches: matches
        });
        return matches;
      });
      
      filteredEvents.forEach(ev => {
        markEventSlots(ev);
      });
      
      // Скрываем занятые слоты
      hideOccupiedSlots();
      
      // Добавляем индикатор текущего времени
      addCurrentTimeIndicator();
      
      // Показываем информативное сообщение, если событий нет
      if (events.length === 0) {
        console.log('📅 Событий на выбранный период не найдено');
        // Не показываем уведомление об ошибке - это нормальная ситуация
      }
    } else {
      console.warn('Не удалось загрузить события - произошла ошибка сервера');
      showNotification('Ошибка загрузки событий. Проверьте подключение к серверу.', 'error');
    }
  } catch (err) {
    console.error('Ошибка при загрузке событий:', err);
  }
}

// Очистка всех слотов от событий
function clearAllEventSlots() {
  const slots = Array.from(allSlotsEl.querySelectorAll('li'));
  slots.forEach(li => {
    // Сбрасываем все кастомные стили
    li.style.height = '';
    li.style.display = '';
    li.style.alignItems = '';
    li.classList.remove('event-slot', 'event-slot-first', 'event-slot-hidden', 'selected');
    li.onclick = null;
    
    // Восстанавливаем исходный текст
    const start = li.dataset.start;
    const end = li.dataset.end;
    if (start && end) {
      li.textContent = `${start} – ${end}`;
      li.title = '';
    }
  });
  
  // Скрываем занятые слоты после очистки
  hideOccupiedSlots();
}

// Текущая выбранная дата (для отображения слотов)
let currentDisplayDate = new Date();
currentDisplayDate.setHours(0,0,0,0);

console.log('=== ИНИЦИАЛИЗАЦИЯ: new Date() ===', new Date());
console.log('=== ИНИЦИАЛИЗАЦИЯ: currentDisplayDate ===', currentDisplayDate);
console.log('=== ИНИЦИАЛИЗАЦИЯ: дата для фильтрации ===', currentDisplayDate.toISOString().slice(0, 10));
console.log('=== ИНИЦИАЛИЗАЦИЯ: локальная дата ===', currentDisplayDate.toLocaleDateString());
console.log('=== ИНИЦИАЛИЗАЦИЯ: UTC дата ===', currentDisplayDate.toUTCString());

// Инициализация интерфейса
initSingleDay();

// Обновляем индикатор текущего времени каждые 30 секунд
setInterval(() => {
  addCurrentTimeIndicator();
}, 30000); // 30 секунд

// Скрываем кнопку "Сегодня" при загрузке (так как мы на сегодня)
updateTodayButtonVisibility();

// Загружаем события при загрузке страницы
loadEventsFromAPI();

// Обработчик кнопки OpenQuestions
document.getElementById('openquestions-btn')?.addEventListener('click', () => {
  showOpenQuestionsModal();
});

// Обработчик кнопки выбора даты
document.getElementById('calendar-picker-btn')?.addEventListener('click', () => {
  showDatePicker();
});


// =======================
// Функции поиска
// =======================

// Функция поиска по событиям
function searchEvents(query) {
  if (!query || query.trim().length < 2) {
    searchResults = [];
    hideSearchResults();
    return;
  }

  const searchTerm = query.toLowerCase().trim();
  searchResults = [];

  // Ищем по всем событиям
  mockEvents.forEach(event => {
    let matchScore = 0;
    let matchedFields = [];

    // Поиск по названию события
    if (event.subject && event.subject.toLowerCase().includes(searchTerm)) {
      matchScore += 10;
      matchedFields.push('Название');
    }

    // Поиск по участникам
    if (event.attendees && Array.isArray(event.attendees)) {
      event.attendees.forEach(attendee => {
        if (attendee.toLowerCase().includes(searchTerm)) {
          matchScore += 5;
          matchedFields.push('Participants');
        }
      });
    }

    // Поиск по stream'ам
    if (event.stream && Array.isArray(event.stream)) {
      event.stream.forEach(stream => {
        if (stream.toLowerCase().includes(searchTerm)) {
          matchScore += 5;
          matchedFields.push('Stream');
        }
      });
    }

    // Поиск по заметкам
    if (event.notes && typeof event.notes === 'string' && event.notes.toLowerCase().includes(searchTerm)) {
      matchScore += 3;
      matchedFields.push('Заметки');
    } else if (event.notes && Array.isArray(event.notes)) {
      // Поиск по заметкам в массиве
      const notesText = event.notes.map(note => typeof note === 'string' ? note : note.text || '').join(' ').toLowerCase();
      if (notesText.includes(searchTerm)) {
        matchScore += 3;
        matchedFields.push('Заметки');
      }
    }

    // Поиск по открытым вопросам
    if (event.open_questions && Array.isArray(event.open_questions)) {
      event.open_questions.forEach(question => {
        if (question.toLowerCase().includes(searchTerm)) {
          matchScore += 3;
          matchedFields.push('Вопросы');
        }
      });
    }

    // Поиск по месту проведения
    if (event.location && event.location.toLowerCase().includes(searchTerm)) {
      matchScore += 2;
      matchedFields.push('Место');
    }

    if (matchScore > 0) {
      searchResults.push({
        event: event,
        score: matchScore,
        matchedFields: [...new Set(matchedFields)]
      });
    }
  });

  // Сортируем по релевантности
  searchResults.sort((a, b) => b.score - a.score);
  
  displaySearchResults();
}

// Функция отображения результатов поиска
function displaySearchResults() {
  const resultsContainer = document.getElementById('search-results');
  if (!resultsContainer) return;

  if (searchResults.length === 0) {
    resultsContainer.style.display = 'none';
    return;
  }

  resultsContainer.innerHTML = '';
  resultsContainer.style.display = 'block';

  searchResults.forEach(result => {
    const event = result.event;
    const matchedFields = result.matchedFields.join(', ');
    
    const resultItem = document.createElement('div');
    resultItem.className = 'search-result-item';
    
    const startTime = utcToMoscow(event.start);
    const endTime = utcToMoscow(event.end);
    
    resultItem.innerHTML = `
      <div class="search-result-title">${highlightSearchTerm(event.subject, document.getElementById('search-input').value)}</div>
      <div class="search-result-meta">${formatHM(startTime)} – ${formatHM(endTime)}</div>
      <div class="search-result-meta">Найдено в: ${matchedFields}</div>
    `;
    
    resultItem.addEventListener('click', () => {
      showEvent(event);
      hideSearchResults();
      document.getElementById('search-input').value = '';
    });
    
    resultsContainer.appendChild(resultItem);
  });
}

// Функция подсветки найденного текста
function highlightSearchTerm(text, searchTerm) {
  if (!searchTerm || searchTerm.length < 2) return text;
  
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  return text.replace(regex, '<span class="search-result-highlight">$1</span>');
}

// Функция скрытия результатов поиска
function hideSearchResults() {
  const resultsContainer = document.getElementById('search-results');
  if (resultsContainer) {
    resultsContainer.style.display = 'none';
  }
}

// Обработчик поля поиска
document.getElementById('search-input')?.addEventListener('input', (e) => {
  searchEvents(e.target.value);
});

// Обработчик клика вне поля поиска
document.addEventListener('click', (e) => {
  const searchContainer = document.getElementById('search-container');
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');
  
  if (searchContainer && !searchContainer.contains(e.target)) {
    hideSearchResults();
  }
});

// =======================
// Переключение дат по кликам на баннеры
// =======================
function switchToDate(targetDate) {
  console.log('switchToDate вызвана с датой:', targetDate);
  currentDisplayDate = new Date(targetDate);
  currentDisplayDate.setHours(0,0,0,0);
  
  console.log('Установлена currentDisplayDate:', currentDisplayDate);
  
  // Обновляем отображение даты в центральном блоке
  renderSingleLeftDate(currentDisplayDate);
  // Обновляем слоты для этой даты
  renderSingleDaySlots(currentDisplayDate);
  // Загружаем события для новой даты
  loadEventsFromAPI();
  // Центрируем дату
  centerTodayInDateList();
  
  // Показываем/скрываем кнопку "Сегодня"
  updateTodayButtonVisibility();
  
  console.log('Переключились на дату:', formatFullRu(currentDisplayDate));
}

// Функция для показа/скрытия кнопки "Сегодня"
function updateTodayButtonVisibility() {
  const todayBanner = document.getElementById('today-banner');
  if (!todayBanner) return;
  
  const today = getMoscowTime();
  today.setHours(0,0,0,0);
  
  // Проверяем, находимся ли мы на сегодняшней дате
  const isTodayDate = isToday(currentDisplayDate);
  
  if (isTodayDate) {
    // Если сегодня - скрываем кнопку
    todayBanner.style.display = 'none';
  } else {
    // Если не сегодня - показываем кнопку
    todayBanner.style.display = 'block';
  }
}

// Обработчики кликов на баннеры дат
document.getElementById('yesterday-banner')?.addEventListener('click', () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0,0,0,0);
  switchToDate(yesterday);
});

document.getElementById('today-banner')?.addEventListener('click', () => {
  const today = getMoscowTime();
  today.setHours(0,0,0,0);
  switchToDate(today);
});

document.getElementById('tomorrow-banner')?.addEventListener('click', () => {
  const tomorrow = getMoscowTime();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0,0,0,0);
  switchToDate(tomorrow);
});

document.getElementById('past-date-banner')?.addEventListener('click', () => {
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  twoDaysAgo.setHours(0,0,0,0);
  switchToDate(twoDaysAgo);
});

document.getElementById('future-date-banner')?.addEventListener('click', () => {
  const twoDaysAhead = new Date();
  twoDaysAhead.setDate(twoDaysAhead.getDate() + 2);
  twoDaysAhead.setHours(0,0,0,0);
  switchToDate(twoDaysAhead);
});

// Обработчики для дополнительных будущих дат
for (let i = 3; i <= 7; i++) {
  document.getElementById(`future-${i}`)?.addEventListener('click', () => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    date.setHours(0,0,0,0);
    switchToDate(date);
  });
}

// Обработчики для дополнительных прошедших дат
for (let i = 3; i <= 7; i++) {
  document.getElementById(`past-${i}`)?.addEventListener('click', () => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0,0,0,0);
    switchToDate(date);
  });
}

// Клик по центральной дате - возврат к сегодня
document.getElementById('date-list')?.addEventListener('click', (e) => {
  if (e.target.classList.contains('date-item')) {
    const today = new Date();
    today.setHours(0,0,0,0);
    switchToDate(today);
  }
});

// =======================
// Функции для модального окна настроек участников
// =======================

let participants = []; // Массив участников
let saveTimeouts = {}; // Таймеры для автосохранения

// Показать модальное окно настроек
function showSettingsModal() {
  const modal = document.createElement('div');
  modal.className = 'settings-modal';
  modal.innerHTML = `
    <div class="settings-modal-content">
      <h2>Управление участниками</h2>
      <div id="participants-table-container"></div>
      <div class="settings-modal-buttons">
        <button class="settings-modal-btn secondary" onclick="closeSettingsModal()">Закрыть</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Загружаем участников из API
  loadParticipants();
  
  // Обработчик клика вне модального окна
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeSettingsModal();
    }
  });
}

// Закрыть модальное окно настроек
function closeSettingsModal() {
  const modal = document.querySelector('.settings-modal');
  if (modal) {
    modal.remove();
  }
}

// Загрузить участников из API
async function loadParticipants() {
  try {
    const response = await fetch('/api/attendees');
    if (response.ok) {
      participants = await response.json();
      // Добавляем пустую строку для создания нового участника
      addEmptyRow();
      renderParticipantsTable();
    } else {
      console.error('Ошибка загрузки участников:', response.statusText);
      participants = [];
      addEmptyRow();
      renderParticipantsTable();
    }
  } catch (error) {
    console.error('Ошибка загрузки участников:', error);
    participants = [];
    addEmptyRow();
    renderParticipantsTable();
  }
}

// Добавить пустую строку для нового участника
function addEmptyRow() {
  // Находим максимальный ID среди существующих участников
  let maxId = 0;
  participants.forEach(participant => {
    if (!participant.isNew && participant.id) {
      const id = parseInt(participant.id);
      if (!isNaN(id) && id > maxId) {
        maxId = id;
      }
    }
  });
  
  const newParticipant = {
    id: `new_${maxId + 1}`,
    name: '',
    surname: '',
    email: '',
    isNew: true,
    isEmpty: true
  };
  
  participants.unshift(newParticipant);
}

// Переменные для сортировки
let sortColumn = null;
let sortDirection = 'asc';

// Функция сортировки таблицы
function sortTable(column) {
  if (sortColumn === column) {
    // Если кликнули по тому же столбцу, меняем направление
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    // Если кликнули по новому столбцу, устанавливаем его и направление по умолчанию
    sortColumn = column;
    sortDirection = 'asc';
  }
  
  // Перерисовываем таблицу
  renderParticipantsTable();
}

// Отобразить таблицу участников
function renderParticipantsTable() {
  const container = document.getElementById('participants-table-container');
  if (!container) return;
  
  // Сортируем участников
  const sortedParticipants = [...participants].sort((a, b) => {
    if (sortColumn === null) return 0;
    
    let aVal, bVal;
    
    switch (sortColumn) {
      case 'id':
        aVal = parseInt(a.id) || 0;
        bVal = parseInt(b.id) || 0;
        break;
      case 'name':
        aVal = (a.name || '').toLowerCase();
        bVal = (b.name || '').toLowerCase();
        break;
      case 'surname':
        aVal = (a.surname || '').toLowerCase();
        bVal = (b.surname || '').toLowerCase();
        break;
      case 'email':
        aVal = (a.email || '').toLowerCase();
        bVal = (b.email || '').toLowerCase();
        break;
      case 'use_count':
        aVal = parseInt(a.use_count) || 0;
        bVal = parseInt(b.use_count) || 0;
        break;
      case 'last_used':
        aVal = new Date(a.last_used || 0);
        bVal = new Date(b.last_used || 0);
        break;
      case 'last_searched_at':
        aVal = new Date(a.last_searched_at || 0);
        bVal = new Date(b.last_searched_at || 0);
        break;
      default:
        return 0;
    }
    
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
  
  let html = `
    <div class="participants-stats">
      <p><strong>Всего участников:</strong> ${participants.filter(p => !p.isEmpty).length}</p>
    </div>
    <table class="participants-table">
      <thead>
        <tr>
          <th onclick="sortTable('id')" style="cursor: pointer;">
            ID ${sortColumn === 'id' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
          </th>
          <th onclick="sortTable('name')" style="cursor: pointer;">
            Name ${sortColumn === 'name' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
          </th>
          <th onclick="sortTable('surname')" style="cursor: pointer;">
            Surname ${sortColumn === 'surname' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
          </th>
          <th onclick="sortTable('email')" style="cursor: pointer;">
            Email ${sortColumn === 'email' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
          </th>
          <th onclick="sortTable('use_count')" style="cursor: pointer;">
            Использований ${sortColumn === 'use_count' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
          </th>
          <th onclick="sortTable('last_used')" style="cursor: pointer;">
            Последнее<br>использование ${sortColumn === 'last_used' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
          </th>
          <th onclick="sortTable('last_searched_at')" style="cursor: pointer;">
            Последний<br>поиск ${sortColumn === 'last_searched_at' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
          </th>
          <th>Действия</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  sortedParticipants.forEach(participant => {
    const isNewRow = participant.isNew && participant.isEmpty;
    const rowClass = isNewRow ? 'new-row' : '';
    
    // Форматируем даты
    const formatParticipantDate = (dateStr) => {
      if (!dateStr) return '-';
      const date = new Date(dateStr);
      return date.toLocaleString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    };
    
    html += `
      <tr class="${rowClass}" data-id="${participant.id}">
        <td>
          <span class="participant-id">${participant.id}</span>
        </td>
        <td>
          <input 
            type="text" 
            value="${participant.name && participant.name !== 'None' ? participant.name : ''}" 
            placeholder="Введите имя"
            onchange="updateParticipant(${participant.id}, 'name', this.value)"
            ${participant.isSaving ? 'disabled' : ''}
          />
        </td>
        <td>
          <input 
            type="text" 
            value="${participant.surname && participant.surname !== 'None' ? participant.surname : ''}" 
            placeholder="Введите фамилию"
            onchange="updateParticipant(${participant.id}, 'surname', this.value)"
            ${participant.isSaving ? 'disabled' : ''}
          />
        </td>
        <td>
          <input 
            type="email" 
            value="${participant.email && participant.email !== 'None' ? participant.email : ''}" 
            placeholder="Введите email"
            onchange="updateParticipant(${participant.id}, 'email', this.value)"
            ${participant.isSaving ? 'disabled' : ''}
          />
        </td>
        <td>
          <span class="use-count">${participant.use_count || 0}</span>
        </td>
        <td>
          <span class="last-used">${formatParticipantDate(participant.last_used)}</span>
        </td>
        <td>
          <span class="last-searched">${formatParticipantDate(participant.last_searched_at)}</span>
        </td>
        <td>
          ${participant.isSaving ? 
            '<span class="saving-status">💾 Сохранение...</span>' : 
            participant.hasError ? 
              '<span class="error-status">❌ Ошибка</span>' : 
              `<button onclick="deleteParticipant(${participant.id})" class="delete-btn" title="Удалить участника">×</button>`
          }
        </td>
      </tr>
    `;
  });
  
  html += `
      </tbody>
    </table>
  `;
  
  container.innerHTML = html;
}

// Обновить участника (с автосохранением)
function updateParticipant(id, field, value) {
  console.log(`📝 Обновление участника ID: ${id}, поле: ${field}, значение: "${value}"`);
  
  const participant = participants.find(p => p.id === id);
  if (!participant) {
    console.error('❌ Участник не найден:', id);
    return;
  }
  
  console.log('👤 Участник до изменения:', participant);
  
  // Обновляем значение в массиве
  participant[field] = value === 'None' ? null : value;
  
  console.log('👤 Участник после изменения:', participant);
  
  // Проверяем, есть ли хотя бы одно заполненное поле
  const hasData = (participant.name && participant.name.trim()) || 
                  (participant.surname && participant.surname.trim()) || 
                  (participant.email && participant.email.trim());
  console.log('📊 Есть данные:', hasData, 'isEmpty:', participant.isEmpty);
  
  // Если это новая пустая строка и есть данные, добавляем еще одну пустую строку
  if (participant.isEmpty && hasData) {
    console.log('➕ Добавление новой пустой строки');
    participant.isEmpty = false;
    addEmptyRow();
    renderParticipantsTable();
    return;
  }
  
  // Если это существующий участник или новая строка с данными, сохраняем
  if (!participant.isEmpty || hasData) {
    console.log('⏰ Установка таймера автосохранения...');
    
    // Очищаем предыдущий таймер
    if (saveTimeouts[id]) {
      clearTimeout(saveTimeouts[id]);
      console.log('🔄 Предыдущий таймер очищен');
    }
    
    // Устанавливаем новый таймер для автосохранения (через 1 секунду)
    saveTimeouts[id] = setTimeout(() => {
      console.log('💾 Запуск автосохранения для участника:', id);
      saveParticipant(id);
    }, 1000);
    
    console.log('✅ Таймер автосохранения установлен');
  } else {
    console.log('⏭️ Пропуск автосохранения - нет данных');
  }
}

// Сохранить участника
async function saveParticipant(id) {
  console.log(`💾 Сохранение участника ID: ${id}`);
  
  const participant = participants.find(p => p.id === id);
  if (!participant) {
    console.error('❌ Участник не найден для сохранения:', id);
    return;
  }
  
  const name = participant.name || '';
  const surname = participant.surname || '';
  const email = participant.email || '';
  
  console.log('📊 Данные для сохранения:', { name, surname, email });
  
  // Если все поля пустые, не сохраняем
  if (!name.trim() && !surname.trim() && !email.trim()) {
    console.log('⏭️ Пропуск сохранения - все поля пустые');
    return;
  }
  
  console.log('🔄 Показ статуса сохранения...');
  // Показываем статус сохранения
  participant.isSaving = true;
  renderParticipantsTable();
  
  try {
    if (participant.isNew) {
      console.log('🆕 Создание нового участника...');
      // Создаем нового участника
      const params = new URLSearchParams();
      if (email) params.append('email', email);
      if (name) params.append('name', name);
      if (surname) params.append('surname', surname);
      
      const response = await fetch(`/api/attendees?${params.toString()}`, {
        method: 'POST'
      });
      
      console.log('📡 Ответ сервера (создание):', response.status, response.statusText);
      
      if (response.ok) {
        const newParticipant = await response.json();
        console.log('✅ Новый участник создан:', newParticipant);
        
        // Обновляем ID участника
        participant.id = newParticipant.id;
        participant.isNew = false;
        participant.isEmpty = false;
        
        // Показываем статус успешного сохранения
        setTimeout(() => {
          participant.isSaving = false;
          renderParticipantsTable();
          console.log('✅ Статус сохранения сброшен');
        }, 500);
      } else {
        const error = await response.text();
        console.error('❌ Ошибка создания участника:', error);
        participant.isSaving = false;
        participant.hasError = true;
        renderParticipantsTable();
        
        setTimeout(() => {
          participant.hasError = false;
          renderParticipantsTable();
        }, 2000);
      }
    } else {
      console.log('🔄 Обновление существующего участника...');
      // Обновляем существующего участника
      const params = new URLSearchParams();
      if (name) params.append('name', name);
      if (surname) params.append('surname', surname);
      
      const response = await fetch(`/api/attendees/${id}?${params.toString()}`, {
        method: 'PUT'
      });
      
      console.log('📡 Ответ сервера (обновление):', response.status, response.statusText);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Участник обновлен:', result);
        
        // Показываем статус успешного сохранения
        setTimeout(() => {
          participant.isSaving = false;
          renderParticipantsTable();
          console.log('✅ Статус сохранения сброшен');
        }, 500);
      } else {
        const error = await response.text();
        console.error('❌ Ошибка обновления участника:', error);
        participant.isSaving = false;
        participant.hasError = true;
        renderParticipantsTable();
        
        setTimeout(() => {
          participant.hasError = false;
          renderParticipantsTable();
        }, 2000);
      }
    }
  } catch (error) {
    console.error('❌ Ошибка сети при сохранении:', error);
    participant.isSaving = false;
    participant.hasError = true;
    renderParticipantsTable();
    
    setTimeout(() => {
      participant.hasError = false;
      renderParticipantsTable();
    }, 2000);
  }
}

// Удалить участника
async function deleteParticipant(id) {
  console.log('🗑️ Удаление участника с ID:', id);
  const participant = participants.find(p => p.id === id);
  if (!participant) {
    console.error('❌ Участник не найден:', id);
    return;
  }
  
  console.log('👤 Участник для удаления:', participant);
  
  // Если это новая пустая строка, просто удаляем из массива
  if (participant.isEmpty) {
    console.log('📝 Удаление новой пустой строки');
    participants = participants.filter(p => p.id !== id);
    renderParticipantsTable();
    return;
  }
  
  const confirmMessage = `Вы уверены, что хотите удалить участника?\n\n${participant.name || ''} ${participant.surname || ''}\n${participant.email || ''}`;
  
  if (!confirm(confirmMessage)) {
    console.log('❌ Удаление отменено пользователем');
    return;
  }
  
  console.log('🌐 Отправка запроса на удаление...');
  try {
    const response = await fetch(`/api/attendees/${id}`, {
      method: 'DELETE'
    });
    
    console.log('📡 Ответ сервера:', response.status, response.statusText);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Результат удаления:', result);
      
      participants = participants.filter(p => p.id !== id);
      renderParticipantsTable();
      console.log('✅ Участник удален из интерфейса:', participant);
    } else {
      const error = await response.text();
      console.error('❌ Ошибка удаления:', error);
      alert('Ошибка удаления участника: ' + error);
    }
  } catch (error) {
    console.error('❌ Ошибка сети при удалении:', error);
    alert('Ошибка удаления участника: ' + error.message);
  }
}

// Обработчик клика на кнопку настроек
document.addEventListener('DOMContentLoaded', () => {
  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', showSettingsModal);
  }
  
  // Обработчик клика на кнопку синхронизации с Google Calendar
  const googleSyncBtn = document.getElementById('google-sync-btn');
  if (googleSyncBtn) {
    googleSyncBtn.addEventListener('click', handleGoogleCalendarSync);
  }

  // Проверяем статус автоматической синхронизации при загрузке
  checkAutoSyncStatus();
  
  // Обработчик кнопки выбора будущей даты
  const futureDatePickerBtn = document.getElementById('future-calendar-picker-btn');
  if (futureDatePickerBtn) {
    futureDatePickerBtn.addEventListener('click', () => {
      showFutureDatePicker();
    });
  }
  
  // Инициализация Morning ToDos и Evening Conclusions
  initializeMorningTodos();
  initializeEveningConclusions();
});

// Функция синхронизации с Google Calendar
async function handleGoogleCalendarSync() {
  const button = document.getElementById('google-sync-btn');
  if (!button) return;
  
  // Отключаем кнопку во время синхронизации
  button.disabled = true;
  button.textContent = '⏳';
  
  try {
    console.log('🔄 Начинаем синхронизацию с Google Calendar...');
    
    // Проверяем статус Google Calendar API
    const statusResponse = await fetch('http://localhost:5001/api/google-calendar/status');
    const status = await statusResponse.json();
    
    console.log('📊 Статус Google Calendar:', status);
    
    if (!status.available) {
      alert('❌ Google Calendar API не установлен.\n\nУстановите зависимости:\npip install google-api-python-client google-auth-oauthlib');
      return;
    }
    
    if (status.setup_required) {
      alert('⚠️ Требуется настройка Google Calendar API.\n\n1. Создайте проект в Google Cloud Console\n2. Включите Google Calendar API\n3. Создайте файл credentials.json\n4. Поместите его в папку v2.1/');
      return;
    }
    
    // Выполняем синхронизацию
    const syncResponse = await fetch('http://localhost:5001/api/google-calendar/sync', {
      method: 'POST'
    });
    
    if (!syncResponse.ok) {
      const error = await syncResponse.text();
      throw new Error(`Ошибка синхронизации: ${error}`);
    }
    
    const result = await syncResponse.json();
    console.log('✅ Результат синхронизации:', result);
    
    // Показываем результат пользователю
    if (result.synced_events && result.synced_events.length > 0) {
      const eventTitles = result.synced_events.map(e => `• ${e.title} (${e.start_time} - ${e.end_time})`).join('\n');
      alert(`✅ Синхронизация завершена!\n\nСинхронизировано событий: ${result.synced_events.length}\n\nСобытия:\n${eventTitles}`);
      
      // Перезагружаем события в интерфейсе
      await loadEventsFromAPI();
    } else {
      alert(`ℹ️ Синхронизация завершена.\n\nНайдено событий: ${result.events_count}\nСинхронизировано: ${result.synced_events ? result.synced_events.length : 0}\n\nВозможно, события уже были синхронизированы ранее.`);
    }
    
  } catch (error) {
    console.error('❌ Ошибка синхронизации:', error);
    alert(`❌ Ошибка синхронизации с Google Calendar:\n\n${error.message}`);
  } finally {
    // Восстанавливаем кнопку
    button.disabled = false;
    button.textContent = '📅';
  }
}

// Функция создания события в Google Calendar
async function handleCreateEventInGoogleCalendar() {
  const button = document.getElementById('google-create-btn');
  if (!button) return;
  
  // Отключаем кнопку во время создания
  button.disabled = true;
  button.textContent = '⏳';
  
  try {
    console.log('📝 Создание события в Google Calendar...');
    
    // Проверяем статус Google Calendar API
    const statusResponse = await fetch('http://localhost:5001/api/google-calendar/status');
    const status = await statusResponse.json();
    
    console.log('📊 Статус Google Calendar:', status);
    
    if (!status.available) {
      alert('❌ Google Calendar API не установлен.\n\nУстановите зависимости:\npip install google-api-python-client google-auth-oauthlib');
      return;
    }
    
    if (status.setup_required) {
      alert('⚠️ Требуется настройка Google Calendar API.\n\n1. Создайте проект в Google Cloud Console\n2. Включите Google Calendar API\n3. Создайте файл credentials.json\n4. Поместите его в папку v2.1/');
      return;
    }
    
    // Получаем данные для создания события
    const eventData = await promptForEventData();
    if (!eventData) {
      console.log('❌ Пользователь отменил создание события');
      return;
    }
    
    console.log('📊 Данные события:', eventData);
    
    // Создаем событие в Google Calendar
    const createResponse = await fetch('http://localhost:5001/api/google-calendar/create-event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventData)
    });
    
    if (!createResponse.ok) {
      const error = await createResponse.text();
      throw new Error(`Ошибка создания события: ${error}`);
    }
    
    const result = await createResponse.json();
    console.log('✅ Результат создания события:', result);
    
    // Показываем результат пользователю
    alert(`✅ Событие создано в Google Calendar!\n\nНазвание: ${eventData.title}\nВремя: ${eventData.start_time} - ${eventData.end_time}\n\nСсылка: ${result.google_calendar_link}`);
    
    // Перезагружаем события в интерфейсе
    await loadEventsFromAPI();
    
  } catch (error) {
    console.error('❌ Ошибка создания события:', error);
    alert(`❌ Ошибка создания события в Google Calendar:\n\n${error.message}`);
  } finally {
    // Восстанавливаем кнопку
    button.disabled = false;
    button.textContent = '📝';
  }
}

// Функция для получения данных события от пользователя
async function promptForEventData() {
  return new Promise((resolve) => {
    // Создаем модальное окно для ввода данных события
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      width: 400px;
      max-width: 90%;
    `;
    
    modalContent.innerHTML = `
      <h3 style="margin-top: 0; color: #333;">📝 Создать событие в Google Calendar</h3>
      
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Название события:</label>
        <input type="text" id="event-title" placeholder="Введите название события" 
               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
      </div>
      
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Дата:</label>
        <input type="date" id="event-date" 
               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
      </div>
      
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Время начала:</label>
        <input type="time" id="event-start-time" 
               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
      </div>
      
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Время окончания:</label>
        <input type="time" id="event-end-time" 
               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
      </div>
      
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Описание (необязательно):</label>
        <textarea id="event-description" placeholder="Введите описание события" 
                  style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; height: 60px; resize: vertical;"></textarea>
      </div>
      
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Местоположение (необязательно):</label>
        <input type="text" id="event-location" placeholder="Введите местоположение" 
               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
      </div>
      
      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button id="cancel-event" style="padding: 8px 16px; border: 1px solid #ddd; background: #f5f5f5; border-radius: 4px; cursor: pointer;">Отмена</button>
        <button id="create-event" style="padding: 8px 16px; border: none; background: #4285f4; color: white; border-radius: 4px; cursor: pointer;">Создать</button>
      </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Устанавливаем текущую дату
    const today = new Date();
    const dateInput = modalContent.querySelector('#event-date');
    dateInput.value = today.toISOString().split('T')[0];
    
    // Устанавливаем текущее время + 1 час как время начала
    const now = new Date();
    now.setHours(now.getHours() + 1);
    const startTimeInput = modalContent.querySelector('#event-start-time');
    startTimeInput.value = now.toTimeString().slice(0, 5);
    
    // Устанавливаем время окончания на час позже
    const endTime = new Date(now);
    endTime.setHours(endTime.getHours() + 1);
    const endTimeInput = modalContent.querySelector('#event-end-time');
    endTimeInput.value = endTime.toTimeString().slice(0, 5);
    
    // Обработчики событий
    const cancelBtn = modalContent.querySelector('#cancel-event');
    const createBtn = modalContent.querySelector('#create-event');
    
    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(modal);
      resolve(null);
    });
    
    createBtn.addEventListener('click', () => {
      const title = modalContent.querySelector('#event-title').value.trim();
      const date = modalContent.querySelector('#event-date').value;
      const startTime = modalContent.querySelector('#event-start-time').value;
      const endTime = modalContent.querySelector('#event-end-time').value;
      const description = modalContent.querySelector('#event-description').value.trim();
      const location = modalContent.querySelector('#event-location').value.trim();
      
      if (!title) {
        alert('❌ Пожалуйста, введите название события');
        return;
      }
      
      if (!date) {
        alert('❌ Пожалуйста, выберите дату');
        return;
      }
      
      if (!startTime || !endTime) {
        alert('❌ Пожалуйста, выберите время начала и окончания');
        return;
      }
      
      // Формируем ISO строки для времени
      const startDateTime = `${date}T${startTime}:00+03:00`;
      const endDateTime = `${date}T${endTime}:00+03:00`;
      
      const eventData = {
        title: title,
        start_time: startDateTime,
        end_time: endDateTime,
        description: description,
        location: location,
        attendees: []
      };
      
      document.body.removeChild(modal);
      resolve(eventData);
    });
    
    // Закрытие по клику вне модального окна
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
        resolve(null);
      }
    });
    
    // Фокус на поле названия
    setTimeout(() => {
      modalContent.querySelector('#event-title').focus();
    }, 100);
  });
}

// Функция проверки статуса автоматической синхронизации
async function checkAutoSyncStatus() {
  try {
    const response = await fetch('http://localhost:5001/api/auto-sync/status');
    const status = await response.json();
    
    const autoSyncBtn = document.getElementById('auto-sync-btn');
    if (!autoSyncBtn) return;
    
    if (status.available) {
      if (status.running) {
        autoSyncBtn.classList.add('running');
        autoSyncBtn.title = `Автоматическая синхронизация активна (каждые ${status.sync_interval / 60} мин)`;
      } else {
        autoSyncBtn.classList.remove('running');
        autoSyncBtn.title = 'Автоматическая синхронизация неактивна';
      }
    } else {
      autoSyncBtn.disabled = true;
      autoSyncBtn.title = 'Автоматическая синхронизация недоступна';
    }
    
    console.log('📊 Статус автоматической синхронизации:', status);
  } catch (error) {
    console.error('❌ Ошибка проверки статуса автоматической синхронизации:', error);
  }
}

// Функция управления автоматической синхронизацией
async function handleAutoSync() {
  const button = document.getElementById('auto-sync-btn');
  if (!button) return;
  
  try {
    // Проверяем текущий статус
    const statusResponse = await fetch('http://localhost:5001/api/auto-sync/status');
    const status = await statusResponse.json();
    
    if (!status.available) {
      alert('❌ Автоматическая синхронизация недоступна.\n\nПроверьте настройки Google Calendar API.');
      return;
    }
    
    if (status.running) {
      // Останавливаем синхронизацию
      const stopResponse = await fetch('http://localhost:5001/api/auto-sync/stop', {
        method: 'POST'
      });
      
      if (stopResponse.ok) {
        button.classList.remove('running');
        button.title = 'Автоматическая синхронизация неактивна';
        alert('🛑 Автоматическая синхронизация остановлена');
      }
    } else {
      // Запускаем синхронизацию
      const startResponse = await fetch('http://localhost:5001/api/auto-sync/start', {
        method: 'POST'
      });
      
      if (startResponse.ok) {
        button.classList.add('running');
        button.title = `Автоматическая синхронизация активна (каждые ${status.sync_interval / 60} мин)`;
        alert('🔄 Автоматическая синхронизация запущена!\n\nСобытия будут синхронизироваться каждые 5 минут.');
      }
    }
    
    // Обновляем статус
    await checkAutoSyncStatus();
    
  } catch (error) {
    console.error('❌ Ошибка управления автоматической синхронизацией:', error);
    alert(`❌ Ошибка управления автоматической синхронизацией:\n\n${error.message}`);
  }
}

// Функция для выполнения синхронизации прямо сейчас
async function syncNow() {
  try {
    const response = await fetch('http://localhost:5001/api/auto-sync/sync-now', {
      method: 'POST'
    });
    
    if (response.ok) {
      const result = await response.json();
      alert(`✅ ${result.message}`);
      
      // Перезагружаем события
      await loadEventsFromAPI();
    } else {
      const error = await response.text();
      throw new Error(error);
    }
  } catch (error) {
    console.error('❌ Ошибка синхронизации:', error);
    alert(`❌ Ошибка синхронизации:\n\n${error.message}`);
  }
}

// Предложение участников для серии встреч
async function suggestAttendeesForSeries(subject) {
  try {
    console.log('🔍 Ищем похожие встречи для предложения участников...');
    
    const response = await fetch(`/api/similar-events?subject=${encodeURIComponent(subject)}&limit=5`);
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.suggested_attendees && data.suggested_attendees.length > 0) {
        console.log(`✅ Найдено ${data.suggested_attendees.length} предложенных участников`);
        
        // Показываем модальное окно с предложением участников
        showAttendeesModal(data.suggested_attendees, data.similar_events, subject);
      } else {
        console.log('📝 Похожие встречи не найдены');
      }
    }
  } catch (error) {
    console.error('❌ Ошибка при поиске похожих встреч:', error);
  }
}

// Модальное окно для предложения участников
function showAttendeesModal(suggestedAttendees, similarEvents, subject) {
  // Создаем модальное окно
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `;
  
  // Содержимое модального окна
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 24px;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  `;
  
  // Заголовок
  const title = document.createElement('h3');
  title.style.cssText = 'margin: 0 0 16px 0; color: #333; font-size: 18px;';
  title.textContent = '💡 Предложенные участники';
  modalContent.appendChild(title);
  
  // Описание
  const description = document.createElement('p');
  description.style.cssText = 'margin: 0 0 16px 0; color: #666; font-size: 14px; line-height: 1.4;';
  description.textContent = `Найдено ${similarEvents.length} похожих встреч для "${subject}". Хотите скопировать участников?`;
  modalContent.appendChild(description);
  
  // Список участников
  const attendeesContainer = document.createElement('div');
  attendeesContainer.style.cssText = 'margin: 16px 0;';
  
  const attendeesTitle = document.createElement('div');
  attendeesTitle.style.cssText = 'font-weight: bold; margin-bottom: 8px; color: #333;';
  attendeesTitle.textContent = `Участники (${suggestedAttendees.length}):`;
  attendeesContainer.appendChild(attendeesTitle);
  
  const attendeesList = document.createElement('div');
  attendeesList.style.cssText = 'display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px;';
  
  suggestedAttendees.forEach(attendee => {
    const attendeeTag = document.createElement('span');
    attendeeTag.style.cssText = `
      background: #4aa3ff;
      color: white;
      padding: 4px 8px;
      border-radius: 16px;
      font-size: 12px;
      cursor: pointer;
      transition: background-color 0.2s;
    `;
    attendeeTag.textContent = attendee;
    attendeeTag.title = 'Нажмите, чтобы добавить участника';
    
    attendeeTag.addEventListener('click', () => {
      addSuggestedAttendeeToForm(attendee);
      attendeeTag.style.background = '#28a745';
      attendeeTag.textContent = '✓ ' + attendee;
      setTimeout(() => {
        attendeeTag.remove();
      }, 1000);
    });
    
    attendeeTag.addEventListener('mouseenter', () => {
      attendeeTag.style.background = '#357abd';
    });
    
    attendeeTag.addEventListener('mouseleave', () => {
      attendeeTag.style.background = '#4aa3ff';
    });
    
    attendeesList.appendChild(attendeeTag);
  });
  
  attendeesContainer.appendChild(attendeesList);
  modalContent.appendChild(attendeesContainer);
  
  // Кнопки
  const buttonsContainer = document.createElement('div');
  buttonsContainer.style.cssText = 'display: flex; gap: 12px; justify-content: flex-end;';
  
  // Кнопка "Добавить всех"
  const addAllBtn = document.createElement('button');
  addAllBtn.style.cssText = `
    background: #28a745;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    font-weight: 500;
  `;
  addAllBtn.textContent = 'Добавить всех';
  addAllBtn.addEventListener('click', () => {
    suggestedAttendees.forEach(attendee => {
      addSuggestedAttendeeToForm(attendee);
    });
    modal.remove();
  });
  
  // Кнопка "Закрыть"
  const closeBtn = document.createElement('button');
  closeBtn.style.cssText = `
    background: #6c757d;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    font-weight: 500;
  `;
  closeBtn.textContent = 'Закрыть';
  closeBtn.addEventListener('click', () => {
    modal.remove();
  });
  
  buttonsContainer.appendChild(addAllBtn);
  buttonsContainer.appendChild(closeBtn);
  modalContent.appendChild(buttonsContainer);
  
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
  
  // Закрытие по клику вне модального окна
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// Добавление предложенного участника в форму
function addSuggestedAttendeeToForm(attendee) {
  // Ищем поле участников в форме создания события
  const attendeesInput = document.getElementById('ce-attendees-input');
  if (attendeesInput) {
    // Добавляем участника в поле ввода
    const currentValue = attendeesInput.value;
    const newValue = currentValue ? `${currentValue}, ${attendee}` : attendee;
    attendeesInput.value = newValue;
    
    // Триггерим событие input для обновления тегов
    attendeesInput.dispatchEvent(new Event('input', { bubbles: true }));
    
    console.log(`✅ Добавлен участник: ${attendee}`);
  }
}

// Обновляем статус автоматической синхронизации каждые 30 секунд
setInterval(checkAutoSyncStatus, 30000);

// Функция для перехода к временному слоту события
async function goToEventTimeSlot(eventId) {
  try {
    console.log('🔗 Переход к временному слоту события, ID:', eventId);
    
    const response = await fetch(`/api/events/${eventId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const event = await response.json();
    console.log('📅 Получено событие для перехода:', event);

    const eventDate = new Date(event.start);
    if (isNaN(eventDate.getTime())) {
      console.error('❌ Неверная дата события:', event.start);
      alert('Ошибка: неверная дата события');
      return;
    }

    switchToDate(eventDate); // Переключаемся на дату события

    setTimeout(() => {
      const slots = Array.from(allSlotsEl.querySelectorAll('li.slot'));
      const eventSlots = slots.filter(slot => {
        const slotDate = slot.dataset.date;
        const slotStart = slot.dataset.start;
        const slotEnd = slot.dataset.end;

        if (!slotDate || !slotStart || !slotEnd) return false;

        const slotDateStr = slotDate;
        const eventDateStr = eventDate.toISOString().slice(0, 10);
        if (slotDateStr !== eventDateStr) return false;

        const eventStart = createMoscowDate(event.start);
        const eventEnd = createMoscowDate(event.end);

        const slotStartTime = createSlotDate(
          parseInt(slotDate.split('-')[0]),
          parseInt(slotDate.split('-')[1]),
          parseInt(slotDate.split('-')[2]),
          parseInt(slotStart.split(':')[0]),
          parseInt(slotStart.split(':')[1])
        );
        const slotEndTime = createSlotDate(
          parseInt(slotDate.split('-')[0]),
          parseInt(slotDate.split('-')[1]),
          parseInt(slotDate.split('-')[2]),
          parseInt(slotEnd.split(':')[0]),
          parseInt(slotEnd.split(':')[1])
        );

        return (eventStart < slotEndTime && eventEnd > slotStartTime);
      });

      if (eventSlots.length > 0) {
        eventSlots[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        eventSlots.forEach(slot => {
          slot.style.boxShadow = '0 0 10px #4aa3ff';
          slot.style.border = '2px solid #4aa3ff';
          setTimeout(() => {
            slot.style.boxShadow = '';
            slot.style.border = '';
          }, 3000);
        });
        console.log('✅ Переход к временному слоту выполнен успешно');
      } else {
        console.log('⚠️ Слоты события не найдены');
        alert('Слоты события не найдены на календаре');
      }
    }, 1000);

  } catch (error) {
    console.error('❌ Ошибка при переходе к временному слоту:', error);
    alert('Ошибка при переходе к временному слоту: ' + error.message);
  }
}

// Функция для перехода к событию из вопроса
async function goToEventFromQuestion(eventId) {
  try {
    console.log('🔗 Переход к событию из вопроса, ID:', eventId);
    
    // Закрываем модальное окно Open Questions
    closeOpenQuestionsModal();
    
    // Закрываем модальное окно со списком встреч (если открыто)
    const filteredMeetingsModal = document.querySelector('.filtered-meetings-modal');
    if (filteredMeetingsModal) {
      console.log('🔒 Закрываем модальное окно со списком встреч');
      filteredMeetingsModal.remove();
    }
    
    // Получаем данные события
    const response = await fetch(`/api/events/${eventId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const event = await response.json();
    console.log('📅 Получено событие:', event);
    
    // Парсим дату события
    const eventDate = new Date(event.start);
    if (isNaN(eventDate.getTime())) {
      console.error('❌ Неверная дата события:', event.start);
      alert('Ошибка: неверная дата события');
      return;
    }
    
    // Переключаемся на дату события
    switchToDate(eventDate);
    
    // Ждем немного для рендеринга календаря
    setTimeout(() => {
      // Находим слот события и переходим к нему
      const slots = Array.from(allSlotsEl.querySelectorAll('li.slot'));
      const eventSlots = slots.filter(slot => {
        const slotDate = slot.dataset.date;
        const slotStart = slot.dataset.start;
        const slotEnd = slot.dataset.end;
        
        if (!slotDate || !slotStart || !slotEnd) return false;
        
        // Проверяем, что слот на ту же дату
        const slotDateStr = slotDate;
        const eventDateStr = eventDate.toISOString().slice(0, 10);
        if (slotDateStr !== eventDateStr) return false;
        
        // Проверяем пересечение времени
        const eventStart = createMoscowDate(event.start);
        const eventEnd = createMoscowDate(event.end);
        
        const slotStartTime = createSlotDate(
          parseInt(slotDate.split('-')[0]),
          parseInt(slotDate.split('-')[1]),
          parseInt(slotDate.split('-')[2]),
          parseInt(slotStart.split(':')[0]),
          parseInt(slotStart.split(':')[1])
        );
        const slotEndTime = createSlotDate(
          parseInt(slotDate.split('-')[0]),
          parseInt(slotDate.split('-')[1]),
          parseInt(slotDate.split('-')[2]),
          parseInt(slotEnd.split(':')[0]),
          parseInt(slotEnd.split(':')[1])
        );
        
        return (eventStart < slotEndTime && eventEnd > slotStartTime);
      });
      
      if (eventSlots.length > 0) {
        // Прокручиваем к первому слоту события
        eventSlots[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Подсвечиваем все слоты события
        eventSlots.forEach(slot => {
          slot.style.boxShadow = '0 0 10px #4aa3ff';
          slot.style.border = '2px solid #4aa3ff';
          
          // Убираем подсветку через 3 секунды
          setTimeout(() => {
            slot.style.boxShadow = '';
            slot.style.border = '';
          }, 3000);
        });
        
        console.log('✅ Переход к событию выполнен успешно');
        
        // Показываем детали встречи
        console.log('📋 Показываем детали встречи...');
        showEvent(event);
      } else {
        console.log('⚠️ Слоты события не найдены');
        alert('Слоты события не найдены на календаре');
      }
    }, 1000);
    
  } catch (error) {
    console.error('❌ Ошибка при переходе к событию:', error);
    alert('Ошибка при переходе к событию: ' + error.message);
  }
}

// Обработчики кликов по тегам Stream
let streamTagClickTimeout = null;

// Обработчики кликов по встречам
let meetingClickTimeout = null;

// Обработчик кликов по встречам с различением одиночного и двойного клика
function handleMeetingClick(eventId) {
  console.log('🖱️ handleMeetingClick вызвана для события ID:', eventId);
  console.log('🖱️ Тип eventId:', typeof eventId);
  console.log('🖱️ Текущий meetingClickTimeout:', meetingClickTimeout);
  
  // Отменяем предыдущий таймаут, если он есть
  if (meetingClickTimeout) {
    console.log('🖱️ Отменяем предыдущий таймаут - это двойной клик!');
    clearTimeout(meetingClickTimeout);
    meetingClickTimeout = null;
    // Если таймаут был отменен, значит это двойной клик
    console.log('🖱️ Двойной клик по встрече:', eventId);
    console.log('🖱️ Вызываем goToEventFromQuestion...');
    goToEventFromQuestion(eventId);
    return;
  }
  
  // Устанавливаем таймаут для обработки одиночного клика
  console.log('🖱️ Устанавливаем таймаут для одиночного клика...');
  meetingClickTimeout = setTimeout(() => {
    console.log('🖱️ Таймаут сработал - это одиночный клик по встрече:', eventId);
    console.log('🖱️ Вызываем showEventFromId...');
    showEventFromId(eventId);
    meetingClickTimeout = null;
  }, 300); // 300ms задержка для различения одиночного и двойного клика
}

// Глобальные переменные для фильтрации
let allStreamsData = [];
let allStreamsMap = {}; // Маппинг названий streams к их ID
let allOpenQuestionsData = [];
let allNotesQuestionsData = [];
let allEventsData = []; // Добавляем переменную для событий
let currentStreamFilter = null;

// Функция для переключения флагов вопросов
async function toggleQuestionFlag(questionId, flagType, newValue) {
  console.log(`🏷️ Переключаем флаг ${flagType} для вопроса ${questionId} на ${newValue}`);
  console.log(`🏷️ Тип questionId: ${typeof questionId}, значение: ${questionId}`);
  
  // Находим чекбокс и временно отключаем его
  const checkboxId = `${flagType === 'asap' ? 'asap' : 'imp'}-${questionId}`;
  console.log(`🏷️ Ищем чекбокс с ID: ${checkboxId}`);
  
  const checkbox = document.getElementById(checkboxId);
  if (checkbox) {
    console.log(`✅ Чекбокс найден:`, checkbox);
    checkbox.disabled = true;
  } else {
    console.error(`❌ Чекбокс не найден с ID: ${checkboxId}`);
    return;
  }
  
  try {
    // Находим вопрос в данных (ищем в обеих коллекциях)
    let question = allOpenQuestionsData.find(q => q.id === questionId);
    if (!question) {
      question = allNotesQuestionsData.find(q => q.id === questionId);
    }
    if (!question) {
      throw new Error(`Вопрос с ID ${questionId} не найден`);
    }
    
    console.log(`🔍 DEBUG: найденный вопрос:`, question);
    console.log(`🔍 DEBUG: question.stream = "${question.stream}", question.topic = "${question.topic}"`);
    
    // Подготавливаем данные для обновления
    const updateData = {
      event_id: question.event_id || null,
      question_text: question.question_text || question.question || '',
      time: question.time || null,
      person: question.person || null,
      stream: question.stream || question.topic || 'General', // Используем stream или topic с fallback
      important: flagType === 'imp' ? newValue : (question.important || false),
      asap: flagType === 'asap' ? newValue : (question.asap || false),
      note_index: null
    };
    
    console.log(`📤 Отправляем данные обновления:`, updateData);
    console.log(`🔍 DEBUG: question.event_id = "${question.event_id}", question.question_text = "${question.question_text}", question.question = "${question.question}"`);
    
    const response = await fetch(`/api/open-questions/${questionId}/update`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ Флаг обновлен:', result);
    
    // Обновляем данные в памяти
    if (question) {
      if (flagType === 'asap') {
        question.asap = newValue;
      } else if (flagType === 'imp') {
        question.important = newValue;
      }
    }
    
    // Также обновляем в другой коллекции, если вопрос там есть
    const otherQuestion = allOpenQuestionsData.find(q => q.id === questionId) || 
                         allNotesQuestionsData.find(q => q.id === questionId);
    if (otherQuestion && otherQuestion !== question) {
      if (flagType === 'asap') {
        otherQuestion.asap = newValue;
      } else if (flagType === 'imp') {
        otherQuestion.important = newValue;
      }
    }
    
    // Обновляем модальное окно
    renderOpenQuestionsModal();
    
    // Показываем уведомление
    showNotification(`Флаг ${flagType.toUpperCase()} ${newValue ? 'установлен' : 'снят'}`, 'success');
    
  } catch (error) {
    console.error('❌ Ошибка при обновлении флага:', error);
    showNotification(`Ошибка при обновлении флага: ${error.message}`, 'error');
    
    // Возвращаем чекбокс в исходное состояние
    if (checkbox) {
      checkbox.checked = !newValue;
    }
  } finally {
    // Включаем чекбокс обратно
    if (checkbox) {
      checkbox.disabled = false;
    }
  }
}

// Функция для редактирования вопроса
async function editQuestion(questionId) {
  console.log(`✏️ Редактируем вопрос с ID: ${questionId}`);
  
  // Находим вопрос в данных (ищем в обеих коллекциях)
  let question = allOpenQuestionsData.find(q => q.id === questionId);
  if (!question) {
    question = allNotesQuestionsData.find(q => q.id === questionId);
  }
  if (!question) {
    console.error(`❌ Вопрос с ID ${questionId} не найден`);
    alert('Вопрос не найден');
    return;
  }
  
  // Создаем модальное окно для редактирования
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 600px;">
      <div class="modal-header">
        <h3>Редактировать вопрос</h3>
        <span class="close" onclick="closeEditQuestionModal()">&times;</span>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label for="edit-question-text">Текст вопроса:</label>
          <textarea id="edit-question-text" rows="3" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">${question.question}</textarea>
        </div>
        <div class="form-group">
          <label for="edit-question-stream">Stream (тема):</label>
          <input type="text" id="edit-question-stream" value="${question.stream || ''}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
        </div>
        <div class="form-group">
          <label for="edit-question-person">Кто:</label>
          <input type="text" id="edit-question-person" value="${question.person || ''}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
        </div>
        <div class="form-group">
          <label for="edit-question-time">Время:</label>
          <input type="text" id="edit-question-time" value="${question.time || ''}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="edit-question-important" ${question.important ? 'checked' : ''}>
            Важно
          </label>
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="edit-question-asap" ${question.asap ? 'checked' : ''}>
            ASAP
          </label>
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="edit-question-resolved" ${question.resolved ? 'checked' : ''}>
            Решено
          </label>
        </div>
        <div class="form-group">
          <p><strong>Встреча:</strong> ${question.event}</p>
          <p><strong>Дата:</strong> ${question.date}</p>
        </div>
      </div>
      <div class="modal-footer">
        <button onclick="saveQuestion(${questionId})" class="btn btn-primary">Сохранить</button>
        <button onclick="closeEditQuestionModal()" class="btn btn-secondary">Отмена</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  modal.style.display = 'block';
  
  // Фокусируемся на тексте вопроса
  setTimeout(() => {
    document.getElementById('edit-question-text').focus();
  }, 100);
}

// Функция для закрытия модального окна редактирования
function closeEditQuestionModal() {
  const modal = document.querySelector('.modal');
  if (modal) {
    modal.remove();
  }
}

// Функция для сохранения изменений вопроса
async function saveQuestion(questionId) {
  console.log(`💾 Сохраняем изменения для вопроса ${questionId}`);
  
  const textElement = document.getElementById('edit-question-text');
  const streamElement = document.getElementById('edit-question-stream');
  const personElement = document.getElementById('edit-question-person');
  const timeElement = document.getElementById('edit-question-time');
  const importantElement = document.getElementById('edit-question-important');
  const asapElement = document.getElementById('edit-question-asap');
  const resolvedElement = document.getElementById('edit-question-resolved');
  
  if (!textElement || !streamElement) {
    alert('Ошибка: элементы формы не найдены');
    return;
  }
  
  const updatedQuestion = {
    text: textElement.value.trim(),
    stream: streamElement.value.trim(),
    person: personElement.value.trim(),
    time: timeElement.value.trim(),
    important: importantElement.checked,
    asap: asapElement.checked,
    is_resolved: resolvedElement.checked
  };
  
  if (!updatedQuestion.text) {
    alert('Текст вопроса не может быть пустым');
    return;
  }
  
  if (!updatedQuestion.stream) {
    alert('Stream (тема) не может быть пустым');
    return;
  }
  
  try {
    // Обновляем вопрос в базе данных
    const response = await fetch(`/api/open-questions/${questionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedQuestion)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ Вопрос обновлен в базе данных:', result);
    
    // Если у вопроса есть event_id, обновляем также исходное событие
    if (question.eventId) {
      console.log(`🔄 Синхронизируем изменения с исходным событием ID: ${question.eventId}`);
      await syncQuestionWithEvent(questionId, updatedQuestion, question.eventId);
    }
    
    // Закрываем модальное окно
    closeEditQuestionModal();
    
    // Обновляем данные и перерисовываем модальное окно
    await collectOpenQuestionsData();
    renderOpenQuestionsModal();
    
    alert('Вопрос успешно обновлен!');
    
  } catch (error) {
    console.error('❌ Ошибка при обновлении вопроса:', error);
    alert('Ошибка при обновлении вопроса: ' + error.message);
  }
}

// Функции для работы с inline комментариями
async function toggleCommentsInline(questionId) {
  console.log(`💬 Переключаем inline комментарии для вопроса ${questionId}`);
  console.log(`💬 Тип questionId: ${typeof questionId}, значение: ${questionId}`);
  
  // Проверяем, есть ли элемент с таким ID
  const commentsExpandable = document.getElementById(`comments-expandable-${questionId}`);
  console.log(`💬 Найден элемент comments-expandable-${questionId}:`, commentsExpandable);
  
  if (!commentsExpandable) {
    console.error(`❌ Элемент comments-expandable-${questionId} не найден!`);
    // Попробуем найти все элементы с похожими ID
    const allCommentsElements = document.querySelectorAll('[id^="comments-expandable-"]');
    console.log(`💬 Все найденные элементы комментариев:`, allCommentsElements);
    return;
  }
  
  if (commentsExpandable.style.display === 'none') {
    // Показываем область и загружаем комментарии
    console.log(`💬 Показываем комментарии для вопроса ${questionId}`);
    commentsExpandable.style.display = 'block';
    await loadCommentsInline(questionId);
  } else {
    // Скрываем область
    console.log(`💬 Скрываем комментарии для вопроса ${questionId}`);
    commentsExpandable.style.display = 'none';
  }
}

async function loadCommentsInline(questionId) {
  console.log(`📥 Загружаем inline комментарии для вопроса ${questionId}`);
  console.log(`📥 Тип questionId: ${typeof questionId}, значение: ${questionId}`);
  
  // Проверяем, что questionId - это число
  if (typeof questionId !== 'number' || isNaN(questionId)) {
    console.error('❌ Неверный тип questionId:', questionId);
    const commentsList = document.getElementById(`comments-list-inline-${questionId}`);
    if (commentsList) {
      commentsList.innerHTML = '<div class="error-text-inline">Ошибка: неверный ID вопроса</div>';
    }
    return;
  }
  
  try {
    const response = await fetch(`/api/open-questions/${questionId}/comments`);
    console.log(`📡 Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Response error:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }
    
    const comments = await response.json();
    console.log(`✅ Загружено комментариев: ${comments.length}`);
    console.log(`✅ Комментарии:`, comments);
    
    const commentsList = document.getElementById(`comments-list-inline-${questionId}`);
    if (!commentsList) {
      console.error('❌ Элемент comments-list-inline не найден для ID:', questionId);
      return;
    }
    
    if (comments.length === 0) {
      commentsList.innerHTML = '<div class="no-comments-text-inline">Комментариев пока нет</div>';
    } else {
      let html = '';
      comments.forEach(comment => {
        const date = new Date(comment.created_at).toLocaleDateString('ru-RU');
        const time = new Date(comment.created_at).toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'});
        html += `
          <div class="comment-item-inline" id="comment-${comment.id}">
            <div class="comment-header-inline">
              <span class="comment-author-inline">${comment.author}</span>
              <span class="comment-datetime-inline">${date} ${time}</span>
              <div class="comment-actions-inline">
                <button onclick="editComment(${questionId}, ${comment.id})" class="comment-edit-btn" title="Редактировать">✏️</button>
                <button onclick="deleteComment(${questionId}, ${comment.id})" class="comment-delete-btn" title="Удалить">🗑️</button>
              </div>
            </div>
            <div class="comment-text-inline" id="comment-text-${comment.id}">${comment.comment_text}</div>
          </div>
        `;
      });
      commentsList.innerHTML = html;
    }
  } catch (error) {
    console.error('❌ Ошибка при загрузке комментариев:', error);
    const commentsList = document.getElementById(`comments-list-inline-${questionId}`);
    if (commentsList) {
      commentsList.innerHTML = '<div class="error-text-inline">Ошибка загрузки комментариев</div>';
    }
  }
}

async function addCommentInline(questionId) {
  console.log(`➕ Добавляем inline комментарий к вопросу ${questionId}`);
  
  const commentInput = document.getElementById(`comment-input-inline-${questionId}`);
  const commentText = commentInput.value.trim();
  
  if (!commentText) {
    alert('Пожалуйста, введите текст комментария');
    return;
  }
  
  try {
    const response = await fetch(`/api/open-questions/${questionId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        comment_text: commentText,
        author: 'User' // Можно сделать динамическим
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const newComment = await response.json();
    console.log('✅ Комментарий добавлен:', newComment);
    
    // Очищаем поле ввода
    commentInput.value = '';
    
    // Перезагружаем комментарии
    await loadCommentsInline(questionId);
    
  } catch (error) {
    console.error('❌ Ошибка при добавлении комментария:', error);
    alert('Ошибка при добавлении комментария: ' + error.message);
  }
}

// Функция для редактирования комментария
async function editComment(questionId, commentId) {
  console.log(`✏️ Редактируем комментарий ${commentId} к вопросу ${questionId}`);
  
  const commentElement = document.getElementById(`comment-text-${commentId}`);
  if (!commentElement) {
    console.error('❌ Элемент комментария не найден');
    return;
  }
  
  const currentText = commentElement.textContent;
  
  // Создаем поле ввода для редактирования
  const editInput = document.createElement('textarea');
  editInput.value = currentText;
  editInput.className = 'comment-edit-input';
  editInput.style.cssText = 'width: 100%; padding: 4px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; resize: vertical; min-height: 60px;';
  
  // Заменяем текст на поле ввода
  commentElement.innerHTML = '';
  commentElement.appendChild(editInput);
  editInput.focus();
  
  // Создаем кнопки сохранения и отмены
  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = 'margin-top: 8px; display: flex; gap: 8px;';
  
  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Сохранить';
  saveBtn.className = 'comment-save-btn';
  saveBtn.style.cssText = 'background: #007bff; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;';
  
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Отмена';
  cancelBtn.className = 'comment-cancel-btn';
  cancelBtn.style.cssText = 'background: #6c757d; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;';
  
  buttonContainer.appendChild(saveBtn);
  buttonContainer.appendChild(cancelBtn);
  commentElement.appendChild(buttonContainer);
  
  // Обработчик сохранения
  saveBtn.onclick = async () => {
    const newText = editInput.value.trim();
    if (!newText) {
      alert('Текст комментария не может быть пустым');
      return;
    }
    
    try {
      const response = await fetch(`/api/open-questions/${questionId}/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment_text: newText,
          author: 'Anonymous' // Можно улучшить, добавив авторизацию
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      // Возвращаем текст обратно
      commentElement.innerHTML = newText;
      console.log('✅ Комментарий обновлен');
      
    } catch (error) {
      console.error('❌ Ошибка при обновлении комментария:', error);
      alert('Ошибка при обновлении комментария: ' + error.message);
      // Возвращаем исходный текст
      commentElement.innerHTML = currentText;
    }
  };
  
  // Обработчик отмены
  cancelBtn.onclick = () => {
    commentElement.innerHTML = currentText;
  };
  
  // Сохранение по Enter (Ctrl+Enter)
  editInput.onkeydown = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      saveBtn.onclick();
    } else if (e.key === 'Escape') {
      cancelBtn.onclick();
    }
  };
}

// Функция для удаления комментария
async function deleteComment(questionId, commentId) {
  console.log(`🗑️ Удаляем комментарий ${commentId} к вопросу ${questionId}`);
  
  if (!confirm('Вы уверены, что хотите удалить этот комментарий?')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/open-questions/${questionId}/comments/${commentId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    
    // Удаляем элемент комментария из DOM
    const commentElement = document.getElementById(`comment-${commentId}`);
    if (commentElement) {
      commentElement.remove();
    }
    
    console.log('✅ Комментарий удален');
    
  } catch (error) {
    console.error('❌ Ошибка при удалении комментария:', error);
    alert('Ошибка при удалении комментария: ' + error.message);
  }
}

// Функция для синхронизации изменений вопроса с исходным событием
async function syncQuestionWithEvent(questionId, updatedQuestion, eventId) {
  console.log(`🔄 Синхронизация вопроса ${questionId} с событием ${eventId}`);
  
  try {
    // Получаем текущее событие
    const eventResponse = await fetch(`/api/events/${eventId}`);
    if (!eventResponse.ok) {
      throw new Error(`Не удалось получить событие: ${eventResponse.status}`);
    }
    
    const event = await eventResponse.json();
    console.log('📋 Текущее событие:', event.subject);
    
    // Находим вопрос в open_questions события
    const eventQuestions = event.open_questions || [];
    const questionIndex = eventQuestions.findIndex(q => {
      // Ищем по тексту, так как в событии вопросы хранятся как строки
      return q.includes(updatedQuestion.text) || q.includes(question.text);
    });
    
    if (questionIndex === -1) {
      console.log('⚠️ Вопрос не найден в open_questions события, добавляем новый');
      // Если вопрос не найден, добавляем его как новый
      const newQuestionString = formatQuestionAsString(updatedQuestion);
      eventQuestions.push(newQuestionString);
    } else {
      console.log(`✅ Найден вопрос в позиции ${questionIndex}, обновляем`);
      // Обновляем существующий вопрос
      eventQuestions[questionIndex] = formatQuestionAsString(updatedQuestion);
    }
    
    // Обновляем событие
    const updateResponse = await fetch(`/api/events/${eventId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...event,
        open_questions: eventQuestions
      })
    });
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Не удалось обновить событие: ${updateResponse.status}, ${errorText}`);
    }
    
    console.log('✅ Событие успешно обновлено с новыми данными вопроса');
    
  } catch (error) {
    console.error('❌ Ошибка при синхронизации с событием:', error);
    // Не прерываем процесс, только логируем ошибку
  }
}

// Функция для форматирования вопроса в строку для события
function formatQuestionAsString(question) {
  let str = '';
  if (question.time) str += `[${question.time}] `;
  if (question.person) str += `[${question.person}] `;
  if (question.stream && question.stream !== 'General') str += `#${question.stream} `;
  str += question.text;
  return str;
}

// Функция для инициализации автокомплита для полей "Кто"
function initializePersonAutocomplete() {
  console.log('🔧 Инициализируем автокомплит для полей "Кто"');
  
  // Находим все поля ввода для "Кто"
  const personInputs = document.querySelectorAll('.person-input');
  console.log(`🔍 Найдено ${personInputs.length} полей ввода для "Кто"`);
  
  personInputs.forEach((input, index) => {
    console.log(`🔧 Инициализируем поле ${index + 1}:`, input);
    const questionId = input.dataset.questionId;
    const suggestionsContainer = document.getElementById(`person-suggestions-${questionId}`);
    
    if (!suggestionsContainer) return;
    
    let searchTimeout;
    let selectedIndex = -1;
    
    // Обработчик ввода
    input.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      const query = input.value.trim();
      selectedIndex = -1; // Сбрасываем выбранный индекс при вводе
      
      if (query.length < 2) {
        suggestionsContainer.style.display = 'none';
        return;
      }
      
      searchTimeout = setTimeout(async () => {
        await loadPersonSuggestions(query, suggestionsContainer, input, questionId);
      }, 300);
    });
    
    // Обработчик клавиш для навигации
    input.addEventListener('keydown', (e) => {
      const suggestions = suggestionsContainer.querySelectorAll('.person-suggestion-item');
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
        updatePersonSelection(suggestions, selectedIndex);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, -1);
        updatePersonSelection(suggestions, selectedIndex);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          suggestions[selectedIndex].click();
        }
      } else if (e.key === 'Escape') {
        suggestionsContainer.style.display = 'none';
        selectedIndex = -1;
      }
    });
    
    // Обработчик фокуса
    input.addEventListener('focus', () => {
      if (input.value.trim().length >= 2) {
        loadPersonSuggestions(input.value.trim(), suggestionsContainer, input, questionId);
      }
    });
    
    // Обработчик потери фокуса
    input.addEventListener('blur', () => {
      setTimeout(() => {
        suggestionsContainer.style.display = 'none';
        selectedIndex = -1;
      }, 200);
    });
    
    // Обработчик фокуса
    input.addEventListener('focus', () => {
      if (input.value.trim().length >= 2) {
        loadPersonSuggestions(input.value.trim(), suggestionsContainer, input, questionId);
      }
    });
    
    // Обработчик потери фокуса
    input.addEventListener('blur', () => {
      setTimeout(() => {
        suggestionsContainer.style.display = 'none';
      }, 200);
    });
    
    // Обработчик клавиш
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const firstSuggestion = suggestionsContainer.querySelector('.person-suggestion-item');
        if (firstSuggestion) {
          firstSuggestion.click();
        }
      }
    });
  });
}

// Функция для обновления выделения в предложениях участников
function updatePersonSelection(suggestions, selectedIndex) {
  suggestions.forEach((item, index) => {
    if (index === selectedIndex) {
      item.classList.add('selected');
      item.scrollIntoView({ block: 'nearest' });
    } else {
      item.classList.remove('selected');
    }
  });
}

// Функция для загрузки предложений участников
async function loadPersonSuggestions(query, container, input, questionId) {
  try {
    console.log(`🔍 Загружаем предложения для "Кто": "${query}"`);
    
    const response = await fetch(`/api/attendees?search=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const attendees = await response.json();
    const suggestions = attendees.map(a => {
      if (a.name && a.surname) {
        return `${a.name} ${a.surname}`;
      } else if (a.name) {
        return a.name;
      } else {
        return a.email;
      }
    }).slice(0, 5); // Ограничиваем до 5 предложений
    
    console.log(`✅ Найдено ${suggestions.length} предложений:`, suggestions);
    
    // Очищаем контейнер
    container.innerHTML = '';
    
    if (suggestions.length === 0) {
      container.style.display = 'none';
      return;
    }
    
    // Добавляем предложения
    suggestions.forEach(suggestion => {
      const item = document.createElement('div');
      item.className = 'person-suggestion-item';
      item.textContent = suggestion;
      
      item.addEventListener('click', () => {
        input.value = suggestion;
        container.style.display = 'none';
        savePersonToQuestion(questionId, suggestion);
      });
      
      container.appendChild(item);
    });
    
    container.style.display = 'block';
    
  } catch (error) {
    console.error('❌ Ошибка при загрузке предложений участников:', error);
    container.style.display = 'none';
  }
}

// Функция для сохранения участника в вопрос
async function savePersonToQuestion(questionId, person) {
  console.log(`💾 Сохраняем участника "${person}" для вопроса ${questionId}`);
  console.log(`💾 Тип questionId: ${typeof questionId}, значение: ${questionId}`);
  console.log(`💾 allOpenQuestionsData:`, allOpenQuestionsData);
  
  try {
    // Находим вопрос в данных
    // Находим вопрос в данных (ищем в обеих коллекциях)
    let question = allOpenQuestionsData.find(q => q.id === questionId);
    if (!question) {
      question = allNotesQuestionsData.find(q => q.id === questionId);
    }
    console.log(`💾 Найденный вопрос:`, question);
    if (!question) {
      console.error('❌ Вопрос не найден в данных');
      return;
    }
    
    // Обновляем вопрос
    const response = await fetch(`/api/open-questions/${questionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: question.question,
        stream: question.stream,
        person: person,
        time: question.time,
        important: question.important,
        asap: question.asap,
        is_resolved: question.resolved
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ Участник сохранен в вопрос:', result);
    
    // Если у вопроса есть event_id, синхронизируем с событием
    if (question.eventId) {
      console.log(`🔄 Синхронизируем участника с исходным событием ID: ${question.eventId}`);
      await syncQuestionWithEvent(questionId, {
        text: question.question,
        stream: question.stream,
        person: person,
        time: question.time,
        important: question.important,
        asap: question.asap
      }, question.eventId);
    }
    
    // Обновляем отображение
    await collectOpenQuestionsData();
    renderOpenQuestionsModal();
    
  } catch (error) {
    console.error('❌ Ошибка при сохранении участника:', error);
    alert('Ошибка при сохранении участника: ' + error.message);
  }
}

// Функция для инициализации автокомплита для полей "Stream"
function initializeStreamAutocomplete() {
  console.log('🔧 Инициализируем автокомплит для полей "Stream"');
  
  // Находим все поля ввода для "Stream"
  const streamInputs = document.querySelectorAll('.stream-input');
  
  streamInputs.forEach(input => {
    const questionId = input.dataset.questionId;
    const suggestionsContainer = document.getElementById(`stream-suggestions-${questionId}`);
    
    if (!suggestionsContainer) return;
    
    let searchTimeout;
    let selectedIndex = -1;
    
    // Обработчик ввода
    input.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      const query = input.value.trim();
      selectedIndex = -1; // Сбрасываем выбранный индекс при вводе
      
      if (query.length < 1) {
        suggestionsContainer.style.display = 'none';
        return;
      }
      
      searchTimeout = setTimeout(async () => {
        await loadStreamSuggestions(query, suggestionsContainer, input, questionId);
      }, 200);
    });
    
    // Обработчик клавиш для навигации
    input.addEventListener('keydown', (e) => {
      const suggestions = suggestionsContainer.querySelectorAll('.stream-suggestion-item');
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
        updateStreamSelection(suggestions, selectedIndex);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, -1);
        updateStreamSelection(suggestions, selectedIndex);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          suggestions[selectedIndex].click();
        }
      } else if (e.key === 'Escape') {
        suggestionsContainer.style.display = 'none';
        selectedIndex = -1;
      }
    });
    
    // Обработчик фокуса
    input.addEventListener('focus', () => {
      if (input.value.trim().length >= 1) {
        loadStreamSuggestions(input.value.trim(), suggestionsContainer, input, questionId);
      }
    });
    
    // Обработчик потери фокуса
    input.addEventListener('blur', () => {
      setTimeout(() => {
        suggestionsContainer.style.display = 'none';
        selectedIndex = -1;
      }, 200);
    });
  });
}

// Функция для обновления выделения в предложениях Stream
function updateStreamSelection(suggestions, selectedIndex) {
  suggestions.forEach((item, index) => {
    if (index === selectedIndex) {
      item.classList.add('selected');
      item.scrollIntoView({ block: 'nearest' });
    } else {
      item.classList.remove('selected');
    }
  });
}

// Функция для загрузки предложений Stream
async function loadStreamSuggestions(query, container, input, questionId) {
  try {
    console.log(`🔍 Загружаем предложения для "Stream": "${query}"`);
    
    // Используем доступные streams из allStreamsData
    const availableStreams = allStreamsData || [];
    const suggestions = availableStreams
      .filter(stream => stream.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5); // Ограничиваем до 5 предложений
    
    console.log(`✅ Найдено ${suggestions.length} предложений:`, suggestions);
    
    // Очищаем контейнер
    container.innerHTML = '';
    
    if (suggestions.length === 0) {
      container.style.display = 'none';
      return;
    }
    
    // Добавляем предложения
    suggestions.forEach(suggestion => {
      const item = document.createElement('div');
      item.className = 'stream-suggestion-item';
      item.textContent = suggestion;
      
      item.addEventListener('click', () => {
        input.value = suggestion;
        container.style.display = 'none';
        saveStreamToQuestion(questionId, suggestion);
      });
      
      container.appendChild(item);
    });
    
    container.style.display = 'block';
    
  } catch (error) {
    console.error('❌ Ошибка при загрузке предложений Stream:', error);
    container.style.display = 'none';
  }
}

// Функция для сохранения Stream в вопрос
async function saveStreamToQuestion(questionId, stream) {
  console.log(`💾 Сохраняем Stream "${stream}" для вопроса ${questionId}`);
  
  try {
    // Находим вопрос в данных
    // Находим вопрос в данных (ищем в обеих коллекциях)
    let question = allOpenQuestionsData.find(q => q.id === questionId);
    if (!question) {
      question = allNotesQuestionsData.find(q => q.id === questionId);
    }
    if (!question) {
      console.error('❌ Вопрос не найден в данных');
      return;
    }
    
    // Обновляем вопрос
    const response = await fetch(`/api/open-questions/${questionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: question.question,
        stream: stream,
        person: question.person,
        time: question.time,
        important: question.important,
        asap: question.asap,
        is_resolved: question.resolved
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ Stream сохранен в вопрос:', result);
    
    // Если у вопроса есть event_id, синхронизируем с событием
    if (question.eventId) {
      console.log(`🔄 Синхронизируем Stream с исходным событием ID: ${question.eventId}`);
      await syncQuestionWithEvent(questionId, {
        text: question.question,
        stream: stream,
        person: question.person,
        time: question.time,
        important: question.important,
        asap: question.asap
      }, question.eventId);
    }
    
    // Обновляем отображение
    await collectOpenQuestionsData();
    renderOpenQuestionsModal();
    
  } catch (error) {
    console.error('❌ Ошибка при сохранении Stream:', error);
    alert('Ошибка при сохранении Stream: ' + error.message);
  }
}

// Функция для создания нового Open Question
async function createNewOpenQuestion() {
  console.log('🆕 Создаем новый Open Question...');
  
  // Получаем данные из формы
  const textElement = document.getElementById('new-question-text');
  const importantElement = document.getElementById('new-question-important');
  const asapElement = document.getElementById('new-question-asap');
  
  if (!textElement || !importantElement || !asapElement) {
    console.error('❌ Элементы формы не найдены');
    showNotification('Ошибка: элементы формы не найдены', 'error');
    return;
  }
  
  const text = textElement.value.trim();
  const important = importantElement.checked;
  const asap = asapElement.checked;
  
  // Валидация
  if (!text) {
    showNotification('Пожалуйста, введите текст вопроса', 'error');
    textElement.focus();
    return;
  }
  
  // Извлекаем stream из текста через #
  const streamMatch = text.match(/#(\w+)/);
  const stream = streamMatch ? streamMatch[1] : null;
  
  console.log('📝 Данные нового вопроса:', { text, stream, important, asap });
  
  try {
    // Создаем вопрос
    const response = await fetch('/api/open-questions/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event_id: null, // Для вопросов, созданных вручную
        question_text: text,
        stream: stream,
        important: important,
        asap: asap,
        time: null,
        person: null
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const newQuestion = await response.json();
    console.log('✅ Новый вопрос создан:', newQuestion);
    
    // Очищаем форму
    textElement.value = '';
    importantElement.checked = false;
    asapElement.checked = false;
    
    // Обновляем модальное окно
    await collectOpenQuestionsData();
    
    showNotification('Open Question успешно создан!', 'success');
    
  } catch (error) {
    console.error('❌ Ошибка при создании вопроса:', error);
    showNotification('Ошибка при создании вопроса: ' + error.message, 'error');
  }
}

function handleStreamTagClick(stream) {
  console.log('🏷️ Клик по тегу Stream:', stream);
  
  // Отменяем предыдущий таймаут, если он есть
  if (streamTagClickTimeout) {
    clearTimeout(streamTagClickTimeout);
    streamTagClickTimeout = null;
  }
  
  // Устанавливаем таймаут для обработки одиночного клика
  streamTagClickTimeout = setTimeout(() => {
    filterQuestionsInModal(stream);
  }, 300); // 300ms задержка для различения одиночного и двойного клика
}

function handleStreamTagDoubleClick(stream) {
  console.log('🏷️ Двойной клик по тегу Stream:', stream);
  
  // Отменяем таймаут одиночного клика
  if (streamTagClickTimeout) {
    clearTimeout(streamTagClickTimeout);
    streamTagClickTimeout = null;
  }
  
  // Фильтруем все встречи по Stream
  filterAllMeetingsByStream(stream);
}

// Функция обработки правого клика по тегу
function handleStreamTagRightClick(event, stream, isUsed) {
  console.log('🖱️ Правый клик по тегу Stream:', stream, 'isUsed:', isUsed);
  
  // Предотвращаем стандартное контекстное меню
  event.preventDefault();
  
  // Если тег используется, не показываем меню удаления
  if (isUsed) {
    console.log('ℹ️ Тег используется, не показываем меню удаления');
    return;
  }
  
  // Показываем контекстное меню для удаления
  showDeleteTagMenu(event, stream);
}

// Функция для показа контекстного меню удаления тега
function showDeleteTagMenu(event, stream) {
  console.log('🗑️ Показываем меню удаления для тега:', stream);
  
  // Удаляем существующее меню, если есть
  const existingMenu = document.getElementById('delete-tag-menu');
  if (existingMenu) {
    existingMenu.remove();
  }
  
  // Создаем контекстное меню
  const menu = document.createElement('div');
  menu.id = 'delete-tag-menu';
  menu.style.cssText = `
    position: fixed;
    top: ${event.clientY}px;
    left: ${event.clientX}px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    z-index: 10000;
    padding: 8px 0;
    min-width: 150px;
  `;
  
  // Добавляем пункт меню
  const menuItem = document.createElement('div');
  menuItem.style.cssText = `
    padding: 8px 16px;
    cursor: pointer;
    color: #d32f2f;
    font-size: 14px;
    transition: background-color 0.2s;
  `;
  menuItem.textContent = `Удалить тег "${stream}"`;
  
  menuItem.addEventListener('mouseenter', () => {
    menuItem.style.backgroundColor = '#ffebee';
  });
  
  menuItem.addEventListener('mouseleave', () => {
    menuItem.style.backgroundColor = 'transparent';
  });
  
  menuItem.addEventListener('click', () => {
    deleteUnusedTag(stream);
    menu.remove();
  });
  
  menu.appendChild(menuItem);
  document.body.appendChild(menu);
  
  // Закрываем меню при клике вне его
  const closeMenu = (e) => {
    if (!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    }
  };
  
  setTimeout(() => {
    document.addEventListener('click', closeMenu);
  }, 100);
}

// Функция для удаления неиспользуемого тега
async function deleteUnusedTag(stream) {
  console.log('🗑️ Удаляем неиспользуемый тег:', stream);
  
  // Подтверждение удаления
  const confirmed = confirm(`Вы уверены, что хотите удалить тег "${stream}"?\n\nЭто действие нельзя отменить.`);
  if (!confirmed) {
    console.log('❌ Удаление отменено пользователем');
    return;
  }
  
  try {
    // Получаем ID тега по названию
    const streamId = allStreamsMap[stream];
    if (!streamId) {
      console.error(`❌ Не найден ID для тега "${stream}" в allStreamsMap:`, allStreamsMap);
      throw new Error(`Не найден ID для тега "${stream}"`);
    }
    
    console.log(`🗑️ Удаляем тег "${stream}" с ID ${streamId}`);
    
    // Отправляем запрос на удаление тега по ID
    const response = await fetch(`/api/streams/remove/${streamId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      console.log('✅ Тег успешно удален:', stream);
      
      // Показываем уведомление об успехе
      showNotification(`Тег "${stream}" успешно удален`, 'success');
      
      // Обновляем данные в модальном окне
      await collectOpenQuestionsData();
      
    } else {
      const errorData = await response.json();
      console.error('❌ Ошибка при удалении тега:', errorData);
      
      // Показываем уведомление об ошибке
      showNotification(`Ошибка при удалении тега: ${errorData.detail || 'Неизвестная ошибка'}`, 'error');
    }
    
  } catch (error) {
    console.error('❌ Ошибка при удалении тега:', error);
    showNotification(`Ошибка при удалении тега: ${error.message}`, 'error');
  }
}

// Функция для показа уведомлений
function showNotification(message, type = 'info') {
  // Удаляем существующие уведомления
  const existingNotifications = document.querySelectorAll('.notification');
  existingNotifications.forEach(notification => notification.remove());
  
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 4px;
    color: white;
    font-weight: 500;
    z-index: 10001;
    max-width: 300px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    animation: slideIn 0.3s ease-out;
  `;
  
  // Устанавливаем цвет в зависимости от типа
  switch (type) {
    case 'success':
      notification.style.backgroundColor = '#4caf50';
      break;
    case 'error':
      notification.style.backgroundColor = '#f44336';
      break;
    case 'warning':
      notification.style.backgroundColor = '#ff9800';
      break;
    default:
      notification.style.backgroundColor = '#2196f3';
  }
  
  notification.textContent = message;
  document.body.appendChild(notification);
  
  // Автоматически удаляем уведомление через 3 секунды
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 300);
  }, 3000);
}

// Функция для фильтрации вопросов в модальном окне
function filterQuestionsInModal(stream) {
  console.log('🔍 Фильтрация вопросов в модальном окне по Stream:', stream);
  
  // Если кликнули по уже активному фильтру - сбрасываем фильтр
  if (currentStreamFilter === stream) {
    console.log('🔄 Сбрасываем фильтр');
    currentStreamFilter = null;
  } else {
    console.log('🎯 Устанавливаем фильтр:', stream);
    currentStreamFilter = stream;
  }
  
  // Перерисовываем модальное окно с новым фильтром
  renderOpenQuestionsModal();
}

// Функция для фильтрации всех встреч по Stream
async function filterAllMeetingsByStream(stream) {
  console.log('🔍 Фильтрация всех встреч по Stream:', stream);
  
  try {
    // Получаем все события
    console.log('📡 Загружаем все события...');
    const response = await fetch('/api/events');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const allEvents = await response.json();
    console.log('📅 Получено всех событий:', allEvents.length);
    console.log('📅 Первые 3 события:', allEvents.slice(0, 3).map(e => ({ id: e.id, subject: e.subject, stream: e.stream })));
    
    // Фильтруем события по Stream
    const filteredEvents = allEvents.filter(event => {
      if (!event.stream || !Array.isArray(event.stream)) return false;
      return event.stream.includes(stream);
    });
    
    console.log('🎯 Найдено событий с Stream "' + stream + '":', filteredEvents.length);
    console.log('🎯 Отфильтрованные события:', filteredEvents.map(e => ({ id: e.id, subject: e.subject, stream: e.stream })));
    
    // Сортируем по дате (самые свежие наверху)
    filteredEvents.sort((a, b) => {
      const dateA = new Date(a.start);
      const dateB = new Date(b.start);
      return dateB - dateA; // Новые события первыми
    });
    
    console.log('📊 Отсортированные события:', filteredEvents.map(e => ({ id: e.id, subject: e.subject, start: e.start })));
    
    // Показываем отфильтрованные встречи
    console.log('🎭 Вызываем showFilteredMeetingsModal...');
    showFilteredMeetingsModal(filteredEvents, stream);
    
  } catch (error) {
    console.error('❌ Ошибка при фильтрации встреч по Stream:', error);
    alert('Ошибка при фильтрации встреч: ' + error.message);
  }
}

// Функция для показа модального окна с отфильтрованными открытыми вопросами
function showFilteredOpenQuestionsModal(stream) {
  console.log('📋 Показываем отфильтрованные открытые вопросы для Stream:', stream);
  
  // Создаем модальное окно
  const modal = document.createElement('div');
  modal.className = 'filtered-meetings-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `;
  
  modal.innerHTML = `
    <div class="filtered-meetings-modal-content" style="
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 800px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    ">
      <h3 style="margin: 0 0 20px 0; color: #333; font-size: 20px;">
        Открытые вопросы: ${stream}
      </h3>
      <div class="filtered-questions-list" id="filtered-questions-list">
        Загрузка...
      </div>
      <div class="filtered-meetings-modal-buttons" style="
        margin-top: 20px;
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      ">
        <button class="filtered-meetings-modal-btn" onclick="this.closest('.filtered-meetings-modal').remove()" style="
          background: #6c757d;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        ">Закрыть</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Загружаем и отображаем отфильтрованные вопросы
  loadFilteredOpenQuestions(stream);
  
  // Закрытие по клику вне модального окна
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// Функция для загрузки отфильтрованных открытых вопросов
async function loadFilteredOpenQuestions(stream) {
  try {
    console.log('📥 Загружаем отфильтрованные открытые вопросы для Stream:', stream);
    
    // Получаем все события
    const response = await fetch('/api/events');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const allEvents = await response.json();
    
    // Собираем открытые вопросы для указанного Stream
    const filteredQuestions = [];
    
    allEvents.forEach(event => {
      // Проверяем, что событие содержит указанный Stream
      const hasStream = event.stream && Array.isArray(event.stream) && event.stream.includes(stream);
      
      if (hasStream) {
        // НЕ добавляем actual_open_questions при фильтрации
        // Только явно созданные вопросы из базы данных должны отображаться
        console.log(`ℹ️ Пропускаем actual_open_questions при фильтрации по stream "${stream}" для события "${event.subject}"`);
        
        // НЕ добавляем обычные заметки из open_questions при фильтрации
        // Только явно созданные открытые вопросы должны отображаться
        console.log(`ℹ️ Пропускаем обычные заметки при фильтрации по stream "${stream}" для события "${event.subject}"`);
      }
    });
    
    console.log('📋 Найдено отфильтрованных вопросов:', filteredQuestions.length);
    
    // Отображаем вопросы
    displayFilteredQuestions(filteredQuestions, stream);
    
  } catch (error) {
    console.error('❌ Ошибка при загрузке отфильтрованных вопросов:', error);
    document.getElementById('filtered-questions-list').innerHTML = `
      <div style="color: #dc3545; padding: 20px; text-align: center;">
        Ошибка при загрузке вопросов: ${error.message}
      </div>
    `;
  }
}

// Функция для отображения отфильтрованных вопросов
function displayFilteredQuestions(questions, stream) {
  const container = document.getElementById('filtered-questions-list');
  
  if (questions.length === 0) {
    container.innerHTML = `
      <div style="color: #6c757d; padding: 20px; text-align: center;">
        Нет открытых вопросов для Stream "${stream}"
      </div>
    `;
    return;
  }
  
  // Сортируем вопросы по дате (новые первыми)
  questions.sort((a, b) => {
    let dateA, dateB;
    
    if (a.eventStart && !isNaN(new Date(a.eventStart).getTime())) {
      dateA = new Date(a.eventStart);
    } else if (a.date && !isNaN(new Date(a.date).getTime())) {
      dateA = new Date(a.date);
    } else {
      dateA = new Date(0); // Очень старая дата для невалидных дат
    }
    
    if (b.eventStart && !isNaN(new Date(b.eventStart).getTime())) {
      dateB = new Date(b.eventStart);
    } else if (b.date && !isNaN(new Date(b.date).getTime())) {
      dateB = new Date(b.date);
    } else {
      dateB = new Date(0);
    }
    
    return dateB - dateA;
  });
  
  let html = '<div class="questions-table-container">';
  html += '<table class="questions-table">';
  html += '<thead>';
  html += '<tr>';
  html += '<th>Решено</th>';
  html += '<th>Задача</th>';
  html += '<th>Встреча</th>';
  html += '<th>Важно</th>';
  html += '<th>Срочно</th>';
  html += '</tr>';
  html += '</thead>';
  html += '<tbody>';
  
  questions.forEach(q => {
    // Определяем дату
    let eventDate;
    if (q.eventStart && !isNaN(new Date(q.eventStart).getTime())) {
      eventDate = new Date(q.eventStart);
    } else if (q.date && !isNaN(new Date(q.date).getTime())) {
      eventDate = new Date(q.date);
    } else {
      eventDate = null;
    }
    
    const date = eventDate ? eventDate.toLocaleDateString('ru-RU') : 'Дата не указана';
    
    html += `<tr>`;
    
    // Колонка Checkbox (Решено)
    html += `<td class="checkbox-cell">`;
    if (q.id) {
      // Для вопросов из заметок - интерактивный checkbox
      html += `<input type="checkbox" onchange="resolveQuestion(${q.id})" class="question-checkbox">`;
    } else {
      // Для вопросов из Actual open questions - только отображение
      html += `<span class="question-status-display">○</span>`;
    }
    html += `</td>`;
    
    // Колонка Задача (с текстом и датой)
    html += `<td class="task-text">`;
    html += `<div class="question-text">${q.text}</div>`;
    html += `<div class="question-date">${date}</div>`;
    html += `</td>`;
    
    // Колонка Встреча (с кнопкой перехода)
    html += `<td class="meeting-cell">`;
    if (q.eventId) {
      html += `<button class="meeting-link-btn" onclick="goToEventFromQuestion(${q.eventId})" title="Перейти к встрече">`;
      html += `<span class="meeting-link-text">${q.event}</span>`;
      html += `</button>`;
    } else {
      html += `<span class="meeting-text">${q.event}</span>`;
    }
    html += `</td>`;
    
    // Колонка Важно
    html += `<td class="flag-cell">`;
    if (q.important) {
      html += '<span class="flag important">✔️</span>';
    } else {
      html += '<span class="flag empty">—</span>';
    }
    html += `</td>`;
    
    // Колонка Срочно
    html += `<td class="flag-cell">`;
    if (q.asap) {
      html += '<span class="flag asap">✔️</span>';
    } else {
      html += '<span class="flag empty">—</span>';
    }
    html += `</td>`;
    
    html += '</tr>';
  });
  
  html += '</tbody>';
  html += '</table>';
  html += '</div>';
  
  container.innerHTML = html;
}

// Функция для показа модального окна с отфильтрованными встречами
function showFilteredMeetingsModal(events, stream) {
  console.log('📅 Показываем отфильтрованные встречи для Stream:', stream);
  console.log('📅 Количество событий для отображения:', events.length);
  console.log('📅 События:', events.map(e => ({ id: e.id, subject: e.subject })));
  
  // Создаем модальное окно
  const modal = document.createElement('div');
  modal.className = 'filtered-meetings-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `;
  
  modal.innerHTML = `
    <div class="filtered-meetings-modal-content" style="
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 900px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    ">
      <h3 style="margin: 0 0 20px 0; color: #333; font-size: 20px;">
        Все встречи: ${stream} (${events.length})
      </h3>
      <div class="filtered-meetings-list" id="filtered-meetings-list">
        ${generateFilteredMeetingsHTML(events)}
      </div>
      <div class="filtered-meetings-modal-buttons" style="
        margin-top: 20px;
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      ">
        <button class="filtered-meetings-modal-btn" onclick="this.closest('.filtered-meetings-modal').remove()" style="
          background: #6c757d;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        ">Закрыть</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Закрытие по клику вне модального окна
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// Функция для показа события по ID
async function showEventFromId(eventId) {
  try {
    console.log('🔍 Загружаем событие по ID:', eventId);
    console.log('🔍 URL запроса:', `/api/events/${eventId}`);
    
    const response = await fetch(`/api/events/${eventId}`);
    console.log('📡 Response status:', response.status);
    console.log('📡 Response ok:', response.ok);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const event = await response.json();
    console.log('📅 Получено событие:', event);
    console.log('📅 Тип события:', typeof event);
    console.log('📅 ID события:', event.id);
    console.log('📅 Название события:', event.subject);
    
    console.log('🎯 Вызываем showEvent с событием...');
    showEvent(event);
    console.log('✅ showEvent вызвана успешно');
    
  } catch (error) {
    console.error('❌ Ошибка при загрузке события:', error);
    console.error('❌ Stack trace:', error.stack);
    alert('Ошибка при загрузке события: ' + error.message);
  }
}

// Функция для генерации HTML отфильтрованных встреч
function generateFilteredMeetingsHTML(events) {
  console.log('🎨 generateFilteredMeetingsHTML вызвана с событиями:', events.length);
  console.log('🎨 События:', events.map(e => ({ id: e.id, subject: e.subject })));
  
  if (events.length === 0) {
    console.log('⚠️ Нет событий для отображения');
    return `
      <div style="color: #6c757d; padding: 20px; text-align: center;">
        Нет встреч для отображения
      </div>
    `;
  }
  
  let html = '<div class="filtered-meetings-list">';
  console.log('🎨 Начинаем генерацию HTML для', events.length, 'событий');
  
  events.forEach(event => {
    console.log('🎯 Обрабатываем событие для списка встреч:', {
      id: event.id,
      subject: event.subject,
      start: event.start,
      type: typeof event.id
    });
    
    // Парсим дату события
    const eventDate = new Date(event.start);
    let dateStr = 'Дата не указана';
    let timeStr = '';
    
    if (!isNaN(eventDate.getTime())) {
      dateStr = eventDate.toLocaleDateString('ru-RU');
      timeStr = eventDate.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
    
    // Формируем информацию об участниках
    const attendees = event.attendees && Array.isArray(event.attendees) 
      ? event.attendees.join(', ') 
      : 'Участники не указаны';
    
    // Формируем информацию о месте (скрываем длинные ссылки)
    let location = event.location || 'Место не указано';
    
    // Скрываем длинные ссылки на платформы (Teams, Google Meet и т.д.)
    if (location && (
      location.includes('teams.microsoft.com') ||
      location.includes('meet.google.com') ||
      location.includes('zoom.us') ||
      location.includes('webex.com') ||
      location.includes('https://') ||
      location.includes('http://')
    )) {
      // Определяем тип платформы по ссылке
      if (location.includes('teams.microsoft.com')) {
        location = 'Teams';
      } else if (location.includes('meet.google.com')) {
        location = 'Google Meet';
      } else if (location.includes('zoom.us')) {
        location = 'Zoom';
      } else if (location.includes('webex.com')) {
        location = 'WebEx';
      } else {
        location = 'Онлайн-встреча';
      }
    }
    
    console.log('🔧 Создаем HTML для события:', {
      id: event.id,
      subject: event.subject,
      onclick: `goToEventFromQuestion(${event.id})`
    });
    
    html += `
      <div class="filtered-meeting-item" style="
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 12px;
        background: #f9f9f9;
        transition: all 0.2s ease;
        cursor: pointer;
      " onmouseover="this.style.background='#f0f0f0'; this.style.borderColor='#4aa3ff';" onmouseout="this.style.background='#f9f9f9'; this.style.borderColor='#e0e0e0';" onclick="goToEventFromQuestion(${event.id})" title="Клик: переход к встрече">
        <div class="meeting-content">
          <div class="meeting-title" style="font-weight: bold; font-size: 16px; color: #333; margin-bottom: 8px;">
            ${event.subject}
          </div>
          <div class="meeting-date" style="color: #666; font-size: 14px; margin-bottom: 4px;">
            📅 ${dateStr} в ${timeStr}
          </div>
          <div class="meeting-location" style="color: #666; font-size: 14px; margin-bottom: 4px;">
            📍 ${location}
          </div>
          <div class="meeting-attendees" style="color: #666; font-size: 14px;">
            👥 ${attendees}
          </div>
          ${event.notes && (typeof event.notes === 'string' ? event.notes.trim() : Array.isArray(event.notes) ? event.notes.length > 0 : false) ? `
            <div class="meeting-notes" style="color: #555; font-size: 13px; margin-top: 8px; padding: 8px; background: #f8f9fa; border-radius: 4px; border-left: 3px solid #4aa3ff;">
              <div style="font-weight: 600; color: #333; margin-bottom: 4px;">📝 Заметки:</div>
              <div style="line-height: 1.4;">${typeof event.notes === 'string' ? (event.notes.length > 200 ? event.notes.substring(0, 200) + '...' : event.notes) : Array.isArray(event.notes) ? event.notes.map(note => typeof note === 'string' ? note : note.text || '').join('\n') : ''}</div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  return html;
}
// Функция для скрытия остальных кнопок коммуникационных платформ
function hideOtherLocationButtons(selectedBtn) {
  const locationButtonsContainer = selectedBtn.closest('[id$="-location-buttons"]');
  if (!locationButtonsContainer) return;
  
  const allButtons = locationButtonsContainer.querySelectorAll('.loc-btn');
  const communicationPlatforms = ['Zoom', 'Teams', 'Google Meet', 'Телемост', 'Телеграм'];
  
  allButtons.forEach(btn => {
    const btnValue = btn.dataset.value;
    if (communicationPlatforms.includes(btnValue)) {
      if (btn === selectedBtn) {
        // Показываем выбранную кнопку
        btn.style.display = 'block';
      } else {
        // Скрываем остальные кнопки коммуникационных платформ
        btn.style.display = 'none';
      }
    }
    // Кнопка "Other" всегда остается видимой
  });
}

// Функция для показа всех кнопок коммуникационных платформ
function showAllLocationButtons() {
  const locationButtonsContainers = document.querySelectorAll('[id$="-location-buttons"]');
  
  locationButtonsContainers.forEach(container => {
    const allButtons = container.querySelectorAll('.loc-btn');
    allButtons.forEach(btn => {
      btn.style.display = 'block';
    });
  });
}


// Version: 1760031551
// Version: 1760031551

// ===== MORNING TODOS FUNCTIONALITY =====

function initializeMorningTodos() {
  console.log('🌅 Инициализация Morning ToDos');
  
  // Добавляем обработчик для кнопки-слота
  const slotBtn = document.getElementById('morning-todos-slot-btn');
  if (slotBtn) {
    slotBtn.addEventListener('click', showMorningTodosModal);
  }
  
  loadMorningTodos();
}

async function loadMorningTodos() {
  try {
    // Загружаем все задачи и фильтруем только незавершенные
    const allTodos = await safeFetch(`/api/morning-todos`);
    
    if (!allTodos) {
      console.error('❌ Не удалось загрузить Morning ToDos');
      return;
    }
    
    // Показываем только незавершенные задачи
    const incompleteTodos = allTodos.filter(todo => !todo.completed);
    
    renderMorningTodos(incompleteTodos);
  } catch (error) {
    console.error('❌ Ошибка загрузки Morning ToDos:', error);
  }
}

// Функция для редактирования текста задачи по двойному клику
function editMorningTodoText(todoId, currentText) {
  console.log('✏️ Редактирование задачи ID:', todoId, 'Текст:', currentText);
  
  // Находим элемент с текстом задачи
  const todoElement = document.querySelector(`[data-id="${todoId}"]`);
  if (!todoElement) {
    console.error('❌ Не найден элемент задачи с ID:', todoId);
    return;
  }
  
  const textElement = todoElement.querySelector('.todo-text');
  if (!textElement) {
    console.error('❌ Не найден элемент текста задачи');
    return;
  }
  
  // Создаем input для редактирования
  const input = document.createElement('input');
  input.type = 'text';
  input.value = currentText;
  input.className = 'todo-edit-input';
  input.style.cssText = `
    width: 100%;
    padding: 4px 8px;
    border: 2px solid #007bff;
    border-radius: 4px;
    font-size: 14px;
    background: white;
    outline: none;
  `;
  
  // Заменяем текст на input
  textElement.style.display = 'none';
  textElement.parentNode.insertBefore(input, textElement);
  
  // Фокусируемся на input и выделяем весь текст
  input.focus();
  input.select();
  
  // Обработчики событий
  const saveEdit = async () => {
    const newText = input.value.trim();
    
    if (newText === currentText) {
      // Текст не изменился, просто отменяем редактирование
      cancelEdit();
      return;
    }
    
    if (newText === '') {
      alert('Текст задачи не может быть пустым');
      input.focus();
      return;
    }
    
    try {
      // Обновляем задачу в базе данных
      const response = await safeFetch(`/api/morning-todos/${todoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          todo_text: newText
        })
      });
      
      if (response) {
        console.log('✅ Задача обновлена:', response);
        
        // Обновляем отображение
        textElement.textContent = newText;
        textElement.style.display = 'block';
        input.remove();
        
        // Показываем уведомление об успешном обновлении
        showNotification('Задача обновлена', 'success');
      } else {
        throw new Error('Не удалось обновить задачу');
      }
      
    } catch (error) {
      console.error('❌ Ошибка обновления задачи:', error);
      alert('Ошибка при обновлении задачи. Попробуйте еще раз.');
      input.focus();
    }
  };
  
  const cancelEdit = () => {
    textElement.style.display = 'block';
    input.remove();
  };
  
  // Обработчики событий
  input.addEventListener('blur', saveEdit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  });
  
  // Предотвращаем всплытие события двойного клика
  input.addEventListener('dblclick', (e) => {
    e.stopPropagation();
  });
}

// Функция для показа уведомлений
function showNotification(message, type = 'info') {
  // Создаем элемент уведомления
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 6px;
    color: white;
    font-weight: 500;
    z-index: 10000;
    opacity: 0;
    transform: translateX(100%);
    transition: all 0.3s ease;
    max-width: 300px;
    word-wrap: break-word;
  `;
  
  // Устанавливаем цвет в зависимости от типа
  switch (type) {
    case 'success':
      notification.style.backgroundColor = '#28a745';
      break;
    case 'error':
      notification.style.backgroundColor = '#dc3545';
      break;
    case 'warning':
      notification.style.backgroundColor = '#ffc107';
      notification.style.color = '#000';
      break;
    default:
      notification.style.backgroundColor = '#007bff';
  }
  
  // Добавляем в DOM
  document.body.appendChild(notification);
  
  // Анимация появления
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateX(0)';
  }, 100);
  
  // Автоматическое скрытие через 3 секунды
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}
async function toggleTodoCompletion(todoId, completed) {
  try {
    const result = await safeFetch(`/api/morning-todos/${todoId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: completed })
    });
    
    if (result) {
      // Обновляем визуальное состояние
      const todoItem = document.querySelector(`[data-id="${todoId}"]`);
      if (todoItem) {
        if (completed) {
          todoItem.classList.add('completed');
          todoItem.querySelector('.todo-text').classList.add('completed');
        } else {
          todoItem.classList.remove('completed');
          todoItem.querySelector('.todo-text').classList.remove('completed');
        }
      }
      
      showNotification(completed ? '✅ Задача выполнена' : '⏳ Задача не выполнена', 'success');
    } else {
      showNotification('❌ Ошибка обновления задачи', 'error');
    }
  } catch (error) {
    console.error('❌ Ошибка обновления задачи:', error);
    showNotification('❌ Ошибка обновления задачи', 'error');
  }
}

// Функция для удаления задачи
async function deleteTodo(todoId) {
  if (!confirm('Удалить эту задачу?')) return;
  
  try {
    const result = await safeFetch(`/api/morning-todos/${todoId}`, {
      method: 'DELETE'
    });
    
    if (result !== null) {
      // Перезагружаем список задач
      await loadMorningTodosInModal();
      showNotification('✅ Задача удалена', 'success');
    } else {
      showNotification('❌ Ошибка удаления задачи', 'error');
    }
  } catch (error) {
    console.error('❌ Ошибка удаления задачи:', error);
    showNotification('❌ Ошибка удаления задачи', 'error');
  }
}

// Функция для автоматического создания задачи из ввода
async function createTodoFromInput(text) {
  try {
    const today = getCurrentDateAtMidnight().toISOString().split('T')[0];
    
    const result = await safeFetch('/api/morning-todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: today,
        todo_text: text,
        completed: false,
        priority: 'normal'
      })
    });
    
    if (result) {
      // Перезагружаем список задач
      await loadMorningTodosInModal();
      showNotification('✅ Задача создана', 'success');
    } else {
      showNotification('❌ Ошибка создания задачи', 'error');
    }
  } catch (error) {
    console.error('❌ Ошибка создания задачи:', error);
    showNotification('❌ Ошибка создания задачи', 'error');
  }
}

function initializeMorningTodosModal() {
  // Обработчик для создания задач только по Enter
  const newTodoInput = document.getElementById('new-todo-input');
  if (newTodoInput) {
    // Создаем задачу только при нажатии Enter
    newTodoInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const text = e.target.value.trim();
        if (text.length >= 3) {
          await createTodoFromInput(text);
          e.target.value = ''; // Очищаем поле ввода
        } else if (text.length > 0) {
          showNotification('❌ Задача должна содержать минимум 3 символа', 'error');
        }
      }
    });
    
    // Фокус на поле ввода
    setTimeout(() => {
      newTodoInput.focus();
    }, 100);
  }
  
  // Инициализируем drag-and-drop
  initializeDragAndDrop();
}

async function loadMorningTodosInModal() {
  try {
    const today = getCurrentDateAtMidnight().toISOString().split('T')[0];
    
    // Загружаем все задачи (незавершенные и завершенные за сегодня)
    const allTodos = await safeFetch(`/api/morning-todos`);
    
    if (!allTodos) {
      console.error('❌ Не удалось загрузить Morning ToDos');
      return;
    }
    
    const dragContainer = document.getElementById('todos-drag-container');
    if (!dragContainer) return;
    
    // Фильтруем задачи: незавершенные + завершенные только за сегодня
    const filteredTodos = allTodos.filter(todo => {
      if (!todo.completed) {
        return true; // Показываем все незавершенные задачи
      }
      return todo.date === today; // Показываем завершенные только за сегодня
    });
    
    if (filteredTodos.length === 0) {
      dragContainer.innerHTML = '<div class="no-todos-message">Нет задач на сегодня</div>';
      return;
    }
    
    // Сортируем задачи: сначала незавершенные по позиции (order), потом завершенные
    const sortedTodos = filteredTodos.sort((a, b) => {
      // Незавершенные задачи идут первыми
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      
      // Среди незавершенных сортируем по позиции (order), если есть
      if (!a.completed && !b.completed) {
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        // Если нет order, сортируем по приоритету как fallback
        const priorityOrder = { 'high': 3, 'normal': 2, 'low': 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      
      // Среди завершенных сортируем по дате создания
      return new Date(a.created_at) - new Date(b.created_at);
    });
    
    dragContainer.innerHTML = sortedTodos.map((todo, index) => `
      <div class="todo-checklist-item ${todo.completed ? 'completed' : ''} ${todo.priority === 'high' ? 'high-priority-task' : ''} ${index < 3 ? 'top-three-task' : ''}" 
           data-id="${todo.id}" 
           data-priority="${todo.priority}"
           draggable="true">
        <div class="todo-checkbox-container">
          <input type="checkbox" ${todo.completed ? 'checked' : ''} 
                 class="todo-checkbox" 
                 onchange="toggleTodoComplete(${todo.id})">
        </div>
        <div class="todo-text-container">
          <div class="todo-text" ondblclick="editMorningTodoText(${todo.id}, '${escapeHtml(todo.todo_text)}')">${escapeHtml(todo.todo_text)}</div>
          <div class="todo-created-date">Создано: ${formatTodoDate(todo.created_at)}</div>
        </div>
        <div class="todo-actions">
          <div class="drag-handle">⋮⋮</div>
          <button class="delete-btn" onclick="deleteMorningTodo(${todo.id})" title="Удалить">×</button>
        </div>
      </div>
    `).join('');
    
    // Инициализируем drag-and-drop
    initializeDragAndDrop();
    
  } catch (error) {
    console.error('❌ Ошибка загрузки Morning ToDos в модальное окно:', error);
  }
}

function renderMorningTodos(todos) {
  const container = document.getElementById('morning-todos-list');
  if (!container) return;
  
  if (todos.length === 0) {
    container.innerHTML = '<div style="text-align: center; color: #666; font-size: 12px; padding: 10px;">Нет задач на сегодня</div>';
    return;
  }
  
  container.innerHTML = todos.map(todo => `
    <div class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
      <div class="todo-text">${escapeHtml(todo.todo_text)}</div>
      <div class="todo-meta">
        <span class="priority-badge priority-${todo.priority}">${getPriorityLabel(todo.priority)}</span>
        <div class="todo-actions">
          <button class="complete-btn" onclick="toggleTodoComplete(${todo.id})" title="Отметить как выполненное">
            ${todo.completed ? '↩️' : '✅'}
          </button>
          <button class="edit-btn" onclick="editMorningTodo(${todo.id})" title="Редактировать">✏️</button>
          <button class="delete-btn" onclick="deleteMorningTodo(${todo.id})" title="Удалить">×</button>
        </div>
      </div>
    </div>
  `).join('');
}

function getPriorityLabel(priority) {
  const labels = {
    'high': 'Высокий',
    'normal': 'Обычный',
    'low': 'Низкий'
  };
  return labels[priority] || priority;
}

function getPriorityColor(priority) {
  const colors = {
    'high': '#dc3545',
    'normal': '#007bff',
    'low': '#28a745'
  };
  return colors[priority] || '#007bff';
}

// Функция закрытия модального окна
function closeModal(button) {
  const modal = button.closest('.modal');
  if (modal) {
    modal.remove();
  }
}

function showMorningTodosModal() {
  // Отображаем интерфейс Morning ToDos в правой панели
  eventDetails.innerHTML = `
    <div class="event-block">
      <div class="morning-todos-header">
        <h3>🌅 Morning ToDos</h3>
        <div class="header-actions">
          <button id="close-morning-todos-btn" class="close-btn">×</button>
        </div>
      </div>
      
      <div id="morning-todos-checklist" class="todos-checklist" style="display: block;">
        <!-- Пустая строка для создания новых задач -->
        <div class="todo-create-row">
          <div class="todo-checkbox-container">
            <input type="checkbox" class="todo-checkbox" disabled>
          </div>
          <div class="todo-text-container">
            <input type="text" id="new-todo-input" placeholder="Введите задачу и нажмите Enter для создания..." class="todo-create-input" />
          </div>
          <div class="todo-actions">
            <div class="drag-handle">⋮⋮</div>
          </div>
        </div>
        
        <div id="todos-drag-container" class="drag-container">
          <!-- Здесь будут отображаться существующие задачи с возможностью перетаскивания -->
        </div>
      </div>
    </div>
  `;
  
  // Инициализируем функциональность
  initializeMorningTodosModal();
  
  // Загружаем существующие задачи
  loadMorningTodosInModal();
  
  // Добавляем обработчик для кнопки закрытия
  const closeBtn = document.getElementById('close-morning-todos-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      eventDetails.innerHTML = '';
    });
  }
}

function formatTodoDate(createdAt) {
  const date = new Date(createdAt);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Проверяем, если это сегодня
  if (date.toDateString() === today.toDateString()) {
    return `сегодня в ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
  }
  
  // Проверяем, если это вчера
  if (date.toDateString() === yesterday.toDateString()) {
    return `вчера в ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
  }
  
  // Для других дат показываем полную дату
  return date.toLocaleDateString('ru-RU', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function initializeDragAndDrop() {
  const dragContainer = document.getElementById('todos-drag-container');
  if (!dragContainer) {
    return;
  }
  
  // Проверяем, есть ли задачи для перетаскивания
  const todoItems = dragContainer.querySelectorAll('.todo-checklist-item');
  
  if (todoItems.length === 0) {
    return;
  }
  
  let draggedElement = null;
  
  // Обработчики для перетаскивания
  dragContainer.addEventListener('dragstart', (e) => {
    if (e.target.classList.contains('todo-checklist-item')) {
      draggedElement = e.target;
      e.target.style.opacity = '0.5';
    }
  });
  
  dragContainer.addEventListener('dragend', (e) => {
    if (e.target.classList.contains('todo-checklist-item')) {
      e.target.style.opacity = '1';
      draggedElement = null;
    }
  });
  
  dragContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
  });
  
  dragContainer.addEventListener('drop', (e) => {
    e.preventDefault();
    
    if (draggedElement && e.target.classList.contains('todo-checklist-item')) {
      const dropTarget = e.target;
      const container = dragContainer;
      
      // Определяем новую позицию
      const draggedRect = draggedElement.getBoundingClientRect();
      const dropRect = dropTarget.getBoundingClientRect();
      
      if (draggedRect.top < dropRect.top) {
        // Перетаскиваем вниз
        container.insertBefore(draggedElement, dropTarget.nextSibling);
      } else {
        // Перетаскиваем вверх
        container.insertBefore(draggedElement, dropTarget);
      }
      
      // Обновляем приоритеты на основе новой позиции
      updateTodoPriorities();
    }
  });
}

async function updateTodoPriorities() {
  const dragContainer = document.getElementById('todos-drag-container');
  if (!dragContainer) return;
  
  const todoItems = dragContainer.querySelectorAll('.todo-checklist-item');
  
  for (let i = 0; i < todoItems.length; i++) {
    const item = todoItems[i];
    const todoId = item.dataset.id;
    
    // Первые три задачи имеют высокий приоритет, остальные - нормальный
    const newPriority = i < 3 ? 'high' : 'normal';
    
    try {
      const result = await safeFetch(`/api/morning-todos/${todoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority, order: i })
      });
      
      if (result !== null) {
        // Обновляем data-priority в DOM
        item.dataset.priority = newPriority;
        
        // Обновляем CSS классы для окрашивания
        if (newPriority === 'high') {
          item.classList.add('high-priority-task', 'top-three-task');
        } else {
          item.classList.remove('high-priority-task', 'top-three-task');
        }
      } else {
        console.error(`Ошибка обновления приоритета для задачи ${todoId}`);
      }
    } catch (error) {
      console.error(`Ошибка обновления приоритета для задачи ${todoId}:`, error);
    }
  }
}

async function createMorningTodo() {
  const textarea = document.querySelector('#todo-text');
  const select = document.querySelector('#todo-priority');
  
  if (!textarea || !select) return;
  
  const todoText = textarea.value.trim();
  if (!todoText) {
    alert('Пожалуйста, введите текст задачи');
    return;
  }
  
  try {
    const today = getCurrentDateAtMidnight().toISOString().split('T')[0];
    const response = await safeFetch('/api/morning-todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: today,
        todo_text: todoText,
        priority: select.value
      })
    });
    
    if (response.ok) {
      // Скрываем форму и показываем список
      document.getElementById('add-todo-form').style.display = 'none';
      document.getElementById('morning-todos-checklist').style.display = 'block';
      
      // Очищаем форму
      textarea.value = '';
      select.value = 'normal';
      
      // Перезагружаем список задач
      await loadMorningTodosInModal();
      
      showNotification('✅ Задача создана успешно', 'success');
    } else {
      const error = await response.json();
      showNotification(`❌ Ошибка: ${error.detail}`, 'error');
    }
  } catch (error) {
    console.error('❌ Ошибка создания задачи:', error);
    showNotification('❌ Ошибка создания задачи', 'error');
  }
}

async function toggleTodoComplete(todoId) {
  try {
    const todoItem = document.querySelector(`.todo-checklist-item[data-id="${todoId}"]`);
    if (!todoItem) {
      console.error('❌ Элемент задачи не найден:', todoId);
      return;
    }
    const isCompleted = todoItem.classList.contains('completed');
    
    const result = await safeFetch(`/api/morning-todos/${todoId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        completed: !isCompleted,
        date: !isCompleted ? getCurrentDateAtMidnight().toISOString().split('T')[0] : undefined
      })
    });
    
    if (result) {
      // Перезагружаем список задач
      await loadMorningTodosInModal();
      showNotification(`✅ Задача ${!isCompleted ? 'выполнена' : 'восстановлена'}`, 'success');
    } else {
      showNotification('❌ Ошибка обновления задачи', 'error');
    }
  } catch (error) {
    console.error('❌ Ошибка обновления задачи:', error);
    showNotification('❌ Ошибка обновления задачи', 'error');
  }
}

async function deleteMorningTodo(todoId) {
  if (!confirm('Вы уверены, что хотите удалить эту задачу?')) return;
  
  try {
    const result = await safeFetch(`/api/morning-todos/${todoId}`, {
      method: 'DELETE'
    });
    
    if (result !== null) {
      await loadMorningTodosInModal();
      showNotification('✅ Задача удалена', 'success');
    } else {
      showNotification('❌ Ошибка удаления задачи', 'error');
    }
  } catch (error) {
    console.error('❌ Ошибка удаления задачи:', error);
    showNotification('❌ Ошибка удаления задачи', 'error');
  }
}

function editMorningTodo(todoId) {
  // TODO: Реализовать редактирование задачи
  showNotification('✏️ Редактирование будет добавлено в следующей версии', 'info');
}

// ===== EVENING CONCLUSIONS FUNCTIONALITY =====

function initializeEveningConclusions() {
  console.log('🌙 Инициализация Evening Conclusions');
  
  // Добавляем обработчик для кнопки-слота
  const slotBtn = document.getElementById('evening-conclusions-slot-btn');
  if (slotBtn) {
    slotBtn.addEventListener('click', showEveningConclusionsModal);
  }
  
  loadEveningConclusions();
}

async function loadEveningConclusions() {
  try {
    const today = getCurrentDateAtMidnight().toISOString().split('T')[0];
    const conclusions = await safeFetch(`/api/evening-conclusions?date=${today}`);
    
    if (!conclusions) {
      console.error('❌ Не удалось загрузить Evening Conclusions');
      return;
    }
    
    renderEveningConclusions(conclusions);
  } catch (error) {
    console.error('❌ Ошибка загрузки Evening Conclusions:', error);
  }
}

async function loadEveningConclusionsInModal() {
  try {
    const today = getCurrentDateAtMidnight().toISOString().split('T')[0];
    const conclusions = await safeFetch(`/api/evening-conclusions?date=${today}`);
    
    if (!conclusions) {
      console.error('❌ Не удалось загрузить Evening Conclusions');
      return;
    }
    
    const modalList = document.getElementById('evening-conclusions-modal-list');
    if (!modalList) return;
    
    if (conclusions.length === 0) {
      modalList.innerHTML = '<div style="text-align: center; color: #666; font-size: 12px; padding: 10px;">Нет выводов на сегодня</div>';
      return;
    }
    
    modalList.innerHTML = conclusions.map(conclusion => `
      <div class="conclusion-item" data-id="${conclusion.id}" style="background: white; border: 1px solid #ddd; border-radius: 6px; padding: 8px; margin-bottom: 6px; font-size: 13px;">
        <div class="conclusion-text" style="margin-bottom: 4px; line-height: 1.4;">${escapeHtml(conclusion.conclusion_text)}</div>
        <div class="conclusion-meta" style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #666;">
          <span class="mood-badge mood-${conclusion.mood}" style="padding: 2px 6px; border-radius: 3px; font-size: 10px; background: ${getMoodColor(conclusion.mood)}; color: white;">${getMoodLabel(conclusion.mood)}</span>
          <div class="conclusion-actions">
            <button class="delete-btn" onclick="deleteEveningConclusion(${conclusion.id})" title="Удалить" style="background: none; border: none; cursor: pointer; color: #ff6b6b;">🗑️</button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('❌ Ошибка загрузки Evening Conclusions в модальное окно:', error);
  }
}

function renderEveningConclusions(conclusions) {
  const container = document.getElementById('evening-conclusions-list');
  if (!container) return;
  
  if (conclusions.length === 0) {
    container.innerHTML = '<div style="text-align: center; color: #666; font-size: 12px; padding: 10px;">Нет выводов на сегодня</div>';
    return;
  }
  
  container.innerHTML = conclusions.map(conclusion => `
    <div class="conclusion-item" data-id="${conclusion.id}">
      <div class="conclusion-text">${escapeHtml(conclusion.conclusion_text)}</div>
      <div class="conclusion-meta">
        <span class="mood-badge mood-${conclusion.mood}">${getMoodLabel(conclusion.mood)}</span>
        <div class="conclusion-actions">
          <button class="edit-btn" onclick="editEveningConclusion(${conclusion.id})" title="Редактировать">✏️</button>
          <button class="delete-btn" onclick="deleteEveningConclusion(${conclusion.id})" title="Удалить">🗑️</button>
        </div>
      </div>
    </div>
  `).join('');
}

function getMoodLabel(mood) {
  const labels = {
    'positive': '😊 Позитивное',
    'neutral': '😐 Нейтральное',
    'negative': '😔 Негативное'
  };
  return labels[mood] || mood;
}

function getMoodColor(mood) {
  const colors = {
    'positive': '#28a745',
    'neutral': '#007bff',
    'negative': '#dc3545'
  };
  return colors[mood] || '#007bff';
}

function showEveningConclusionsModal() {
  // Отображаем интерфейс Evening Conclusions в правой панели
  eventDetails.innerHTML = `
    <div class="event-block">
      <div class="evening-conclusions-header">
        <h3>🌙 Evening Conclusions</h3>
        <button id="close-evening-conclusions-btn" class="close-btn">×</button>
      </div>
      
      <div id="evening-conclusions-modal-list" style="max-height: 300px; overflow-y: auto; margin-bottom: 15px;"></div>
      
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Добавить новый вывод:</label>
        <textarea id="conclusion-text" placeholder="Опишите итоги дня..." style="width: 100%; height: 100px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-family: inherit; resize: vertical;"></textarea>
      </div>
      
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Настроение:</label>
        <select id="conclusion-mood" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-family: inherit;">
          <option value="positive">😊 Позитивное</option>
          <option value="neutral" selected>😐 Нейтральное</option>
          <option value="negative">😔 Негативное</option>
        </select>
      </div>
      
      <div class="form-actions">
        <button id="close-evening-conclusions-btn2" class="cancel-btn" style="margin-right: 10px;">Закрыть</button>
        <button id="create-conclusion-btn" class="primary-btn">Добавить вывод</button>
      </div>
    </div>
  `;
  
  // Загружаем существующие выводы
  loadEveningConclusionsInModal();
  
  // Добавляем обработчики
  const closeBtn = document.getElementById('close-evening-conclusions-btn');
  const closeBtn2 = document.getElementById('close-evening-conclusions-btn2');
  const createBtn = document.getElementById('create-conclusion-btn');
  
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      eventDetails.innerHTML = '';
    });
  }
  
  if (closeBtn2) {
    closeBtn2.addEventListener('click', () => {
      eventDetails.innerHTML = '';
    });
  }
  
  if (createBtn) {
    createBtn.addEventListener('click', createEveningConclusion);
  }
  
  // Фокус на текстовое поле
  setTimeout(() => {
    const textarea = document.querySelector('#conclusion-text');
    if (textarea) textarea.focus();
  }, 100);
}

async function createEveningConclusion() {
  const textarea = document.querySelector('#conclusion-text');
  const select = document.querySelector('#conclusion-mood');
  
  if (!textarea || !select) return;
  
  const conclusionText = textarea.value.trim();
  if (!conclusionText) {
    alert('Пожалуйста, введите текст вывода');
    return;
  }
  
  try {
    const today = getCurrentDateAtMidnight().toISOString().split('T')[0];
    const result = await safeFetch('/api/evening-conclusions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: today,
        conclusion_text: conclusionText,
        mood: select.value
      })
    });
    
    if (result !== null) {
      closeModal(document.querySelector('.modal'));
      loadEveningConclusions();
      loadEveningConclusionsInModal(); // Обновляем модальное окно
      showNotification('✅ Вывод создан успешно', 'success');
    } else {
      showNotification('❌ Ошибка создания вывода', 'error');
    }
  } catch (error) {
    console.error('❌ Ошибка создания вывода:', error);
    showNotification('❌ Ошибка создания вывода', 'error');
  }
}

async function deleteEveningConclusion(conclusionId) {
  if (!confirm('Вы уверены, что хотите удалить этот вывод?')) return;
  
  try {
    const result = await safeFetch(`/api/evening-conclusions/${conclusionId}`, {
      method: 'DELETE'
    });
    
    if (result !== null) {
      loadEveningConclusions();
      showNotification('✅ Вывод удален', 'success');
    } else {
      showNotification('❌ Ошибка удаления вывода', 'error');
    }
  } catch (error) {
    console.error('❌ Ошибка удаления вывода:', error);
    showNotification('❌ Ошибка удаления вывода', 'error');
  }
}

function editEveningConclusion(conclusionId) {
  // TODO: Реализовать редактирование вывода
  showNotification('✏️ Редактирование будет добавлено в следующей версии', 'info');
}

// Вспомогательная функция для экранирования HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

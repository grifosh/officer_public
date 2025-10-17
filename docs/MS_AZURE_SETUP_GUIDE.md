# 🔧 Настройка Microsoft Graph API для Outlook.com

## Пошаговая инструкция

### 1. Создание приложения в Azure Portal

1. **Откройте Azure Portal**: https://portal.azure.com
2. **Войдите в свой Microsoft аккаунт** (тот же, что используете для Outlook.com)
3. **В поиске введите**: `Azure Active Directory`
4. **Перейдите в**: `App registrations`
5. **Нажмите**: `New registration`

### 2. Настройка приложения

**Заполните форму:**
- **Name**: `Officer Calendar App`
- **Supported account types**: `Accounts in any organizational directory and personal Microsoft accounts`
- **Redirect URI**: `http://localhost:8080/auth/callback`

**Нажмите**: `Register`

### 3. Получение данных приложения

После создания приложения на странице "Overview" скопируйте:

- **Application (client) ID** → это ваш `CLIENT_ID`
- **Directory (tenant) ID** → это ваш `TENANT_ID`

### 4. Настройка разрешений

1. **Перейдите в**: `API permissions`
2. **Нажмите**: `Add a permission`
3. **Выберите**: `Microsoft Graph`
4. **Выберите**: `Delegated permissions`
5. **Добавьте разрешения**:
   - `Calendars.ReadWrite` - чтение и запись календарей
   - `User.Read` - чтение профиля пользователя
6. **Нажмите**: `Add permissions`
7. **Нажмите**: `Grant admin consent` (если доступно)

### 5. Создание Client Secret (опционально)

1. **Перейдите в**: `Certificates & secrets`
2. **Нажмите**: `New client secret`
3. **Добавьте описание**: `Officer Calendar Secret`
4. **Выберите срок действия**: `24 months`
5. **Нажмите**: `Add`
6. **Скопируйте "Value"** → это ваш `CLIENT_SECRET`

## 📝 Обновление скрипта

1. **Откройте файл**: `test_azure_credentials.py`
2. **Замените**:
   ```python
   CLIENT_ID = "YOUR_CLIENT_ID_HERE"  # Ваш Application (client) ID
   TENANT_ID = "YOUR_TENANT_ID_HERE"  # Ваш Directory (tenant) ID
   CLIENT_SECRET = "YOUR_CLIENT_SECRET_HERE"  # Ваш Client Secret
   ```

3. **Запустите скрипт**:
   ```bash
   python test_azure_credentials.py
   ```

## 🔧 Настройка переменных окружения

Создайте файл `.env`:

```env
MICROSOFT_CLIENT_ID=your_client_id_here
MICROSOFT_CLIENT_SECRET=your_client_secret_here
MICROSOFT_TENANT_ID=your_tenant_id_here
MICROSOFT_SYNC_ENABLED=true
MICROSOFT_SYNC_INTERVAL=300
```

## 🚀 Тестирование

После настройки запустите:

```bash
# Тест аутентификации
python test_azure_credentials.py

# Тест интеграции с приложением
curl http://localhost:5001/api/microsoft-graph/status
```

## ❗ Важные моменты

1. **Для персональных аккаунтов Microsoft** используйте `TENANT_ID = "common"`
2. **Разрешения** должны быть настроены корректно
3. **Client Secret** нужен только для серверных приложений
4. **Токены** сохраняются в `microsoft_token.pickle`

## 🔍 Устранение неполадок

### Ошибка аутентификации
- Проверьте правильность Client ID
- Убедитесь, что разрешения настроены
- Удалите `microsoft_token.pickle` и повторите аутентификацию

### Ошибка разрешений
- Проверьте, что добавлены разрешения `Calendars.ReadWrite`
- Убедитесь, что разрешения предоставлены (Grant admin consent)

### Ошибка API
- Проверьте интернет-соединение
- Убедитесь, что Microsoft Graph API доступен
- Проверьте логи для детальной информации

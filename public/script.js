// Основная логика приложения

console.log('🚀 Начало загрузки script.js');

// Глобальные переменные
let editingId = null;
let currentEditingType = null;
let currentSortField = null;
let currentSortDirection = 'asc';

// Проверка зависимостей
function checkDependencies() {
    console.log('🔍 Проверка зависимостей...');
    
    if (typeof NotificationManager === 'undefined') {
        console.error('❌ NotificationManager не загружен!');
        return false;
    }
    
    if (typeof Database === 'undefined') {
        console.error('❌ Database не загружен!');
        return false;
    }
    
    console.log('✅ Все зависимости загружены');
    return true;
}

// Инициализация приложения
async function initializeApp() {
    console.log('🔧 Инициализация приложения...');
    
    if (!checkDependencies()) {
        console.error('❌ Не удалось инициализировать - отсутствуют зависимости');
        return;
    }
    
    try {
        // Проверяем подключение к серверу (но не блокируем работу если сервер недоступен)
        const isConnected = await db.checkConnection().catch(() => false);
        
        if (isConnected) {
            console.log('✅ Подключение к серверу установлено');
            NotificationManager.success('Подключение к серверу установлено');
        } else {
            console.warn('⚠️ Сервер недоступен, работаем в автономном режиме');
            NotificationManager.warning('Сервер недоступен. Убедитесь что сервер запущен на порту 3000.');
        }
        
        await updateStats();
        await renderCurrentTab();
        
        console.log('✅ Приложение инициализировано');
    } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
        NotificationManager.error('Ошибка инициализации приложения');
    }
}

// Обновление статистики
async function updateStats() {
    try {
        const stats = await db.getStats();
        document.getElementById('totalComputers').textContent = stats.computers || 0;
        document.getElementById('totalNetwork').textContent = stats.network || 0;
        document.getElementById('totalOther').textContent = stats.other || 0;
        document.getElementById('totalAssigned').textContent = stats.assigned || 0;
    } catch (error) {
        console.error('Ошибка обновления статистики:', error);
        // Устанавливаем нули если не удалось получить статистику
        document.getElementById('totalComputers').textContent = '0';
        document.getElementById('totalNetwork').textContent = '0';
        document.getElementById('totalOther').textContent = '0';
        document.getElementById('totalAssigned').textContent = '0';
    }
}

// Переключение вкладок
function openTab(evt, tabName) {
    console.log('📂 Открытие вкладки:', tabName);
    
    try {
        // Скрываем все вкладки
        const tabContents = document.getElementsByClassName("tab-content");
        for (let i = 0; i < tabContents.length; i++) {
            tabContents[i].classList.remove("active");
        }
        
        // Убираем активный класс с кнопок
        const tabButtons = document.getElementsByClassName("tab-button");
        for (let i = 0; i < tabButtons.length; i++) {
            tabButtons[i].classList.remove("active");
        }
        
        // Показываем выбранную вкладку
        document.getElementById(tabName).classList.add("active");
        evt.currentTarget.classList.add("active");
        
        // Отображаем данные для выбранной вкладки
        renderTabContent(tabName);
    } catch (error) {
        console.error('Ошибка переключения вкладки:', error);
        NotificationManager.error('Ошибка при переключении вкладки');
    }
}

// Отображение содержимого вкладки
async function renderTabContent(tabName) {
    console.log('📄 Рендеринг содержимого вкладки:', tabName);
    
    try {
        switch(tabName) {
            case 'computers':
                await filterComputers();
                break;
            case 'network':
                await filterNetworkDevices();
                break;
            case 'other':
                await filterOtherDevices();
                break;
            case 'assigned':
                await filterAssignedDevices();
                break;
            default:
                console.warn('Неизвестная вкладка:', tabName);
        }
    } catch (error) {
        console.error('Ошибка отображения содержимого вкладки:', error);
        NotificationManager.error('Ошибка загрузки данных');
    }
}

// Отображение текущей активной вкладки
async function renderCurrentTab() {
    const activeTab = document.querySelector('.tab-content.active');
    if (activeTab) {
        await renderTabContent(activeTab.id);
    }
}

// === РАБОТА С КОМПЬЮТЕРАМИ ===

function renderComputerTable(data = []) {
    console.log('💻 Рендеринг таблицы компьютеров, записей:', data.length);
    
    const tbody = document.getElementById('computerTable');
    if (!tbody) {
        console.error('❌ Элемент computerTable не найден');
        return;
    }
    
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" style="text-align: center; padding: 20px;">Нет данных для отображения</td></tr>';
        return;
    }

    data.forEach((computer, index) => {
        const statusClass = StatusManager ? StatusManager.getStatusClass(computer.status) : 'status-working';
        const statusText = StatusManager ? StatusManager.getStatusText(computer.status) : 'Неизвестно';

        tbody.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${escapeHtml(computer.inventoryNumber || '')}</strong></td>
                <td>${escapeHtml(computer.building || '')}</td>
                <td>${escapeHtml(computer.location || '')}</td>
                <td>${escapeHtml(computer.deviceType || '')}</td>
                <td>${escapeHtml(computer.model || '')}</td>
                <td>${escapeHtml(computer.processor || '')}</td>
                <td>${escapeHtml(computer.ram || '')}</td>
                <td>${escapeHtml(computer.ipAddress || '')}</td>
                <td>${escapeHtml(computer.computerName || '')}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn" onclick="editComputer(${computer.id})" style="font-size: 12px; padding: 5px 10px;" title="Редактировать">✏️</button>
                    <button class="btn btn-danger" onclick="deleteComputer(${computer.id})" style="font-size: 12px; padding: 5px 10px; margin-left: 5px;" title="Удалить">🗑️</button>
                </td>
            </tr>
        `;
    });
}

async function filterComputers() {
    console.log('🔍 Фильтрация компьютеров...');
    
    try {
        const searchTerm = document.getElementById('computerSearchInput')?.value || '';
        const buildingFilter = document.getElementById('buildingFilter')?.value || '';
        const typeFilter = document.getElementById('typeFilter')?.value || '';
        const statusFilter = document.getElementById('statusFilter')?.value || '';

        let computers = await db.getByType('computers');

        // Поиск
        if (searchTerm) {
            computers = computers.filter(computer => {
                const searchFields = [
                    computer.inventoryNumber || '',
                    computer.location || '',
                    computer.model || '',
                    computer.computerName || '',
                    computer.processor || '',
                    computer.ram || ''
                ];
                return searchFields.some(field => 
                    field.toLowerCase().includes(searchTerm.toLowerCase())
                );
            });
        }

        // Фильтры
        if (buildingFilter) {
            computers = computers.filter(c => c.building === buildingFilter);
        }
        if (typeFilter) {
            computers = computers.filter(c => c.deviceType === typeFilter);
        }
        if (statusFilter) {
            computers = computers.filter(c => c.status === statusFilter);
        }

        renderComputerTable(computers);
    } catch (error) {
        console.error('Ошибка фильтрации компьютеров:', error);
        renderComputerTable([]);
    }
}

function openComputerModal() {
    console.log('💻 Открытие модального окна компьютера');
    
    try {
        editingId = null;
        currentEditingType = 'computer';
        document.getElementById('computerModalTitle').textContent = 'Добавить компьютер';
        
        // Очищаем форму
        const form = document.getElementById('computerForm');
        if (form) {
            form.reset();
        }
        
        // Сбрасываем состояние поиска
        resetInventorySearch();
        
        document.getElementById('computerModal').style.display = 'block';
    } catch (error) {
        console.error('Ошибка открытия модального окна:', error);
        NotificationManager.error('Ошибка открытия формы');
    }
}

async function editComputer(id) {
    console.log('✏️ Редактирование компьютера ID:', id);
    
    try {
        const computers = await db.getByType('computers');
        const computer = computers.find(c => c.id === id);
        
        if (!computer) {
            NotificationManager.error('Компьютер не найден');
            return;
        }

        editingId = id;
        currentEditingType = 'computer';
        document.getElementById('computerModalTitle').textContent = 'Редактировать компьютер';
        
        // Заполняем форму
        document.getElementById('computerInventoryNumber').value = computer.inventoryNumber || '';
        document.getElementById('computerBuilding').value = computer.building || '';
        document.getElementById('computerLocation').value = computer.location || '';
        document.getElementById('computerDeviceType').value = computer.deviceType || '';
        document.getElementById('computerModel').value = computer.model || '';
        document.getElementById('computerProcessor').value = computer.processor || '';
        document.getElementById('computerRam').value = computer.ram || '';
        document.getElementById('computerStorage').value = computer.storage || '';
        document.getElementById('computerGraphics').value = computer.graphics || '';
        document.getElementById('computerIpAddress').value = computer.ipAddress || '';
        document.getElementById('computerName').value = computer.computerName || '';
        document.getElementById('computerYear').value = computer.year || '';
        document.getElementById('computerNotes').value = computer.notes || '';

        resetInventorySearch();
        document.getElementById('computerModal').style.display = 'block';
    } catch (error) {
        console.error('Ошибка редактирования компьютера:', error);
        NotificationManager.error('Ошибка при загрузке данных компьютера');
    }
}

async function deleteComputer(id) {
    console.log('🗑️ Удаление компьютера ID:', id);
    
    if (confirm('Вы уверены, что хотите удалить этот компьютер?')) {
        try {
            await db.delete('computers', id);
            NotificationManager.success('Компьютер успешно удален');
            await filterComputers();
            await updateStats();
        } catch (error) {
            console.error('Ошибка удаления компьютера:', error);
            NotificationManager.error('Ошибка при удалении компьютера');
        }
    }
}

// === ДРУГИЕ ФУНКЦИИ ===

function openNetworkModal() {
    console.log('🌐 Открытие модального окна сетевого оборудования');
    NotificationManager.info('Функция в разработке');
}

function openOtherModal() {
    console.log('🖨️ Открытие модального окна другой техники');
    NotificationManager.info('Функция в разработке');
}

function openAssignedModal() {
    console.log('👤 Открытие модального окна назначенных устройств');
    NotificationManager.info('Функция в разработке');
}

async function filterNetworkDevices() {
    console.log('🌐 Фильтрация сетевых устройств (заглушка)');
    const tbody = document.getElementById('networkTable');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 20px;">Функция в разработке</td></tr>';
    }
}

async function filterOtherDevices() {
    console.log('🖨️ Фильтрация другой техники (заглушка)');
    const tbody = document.getElementById('otherTable');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px;">Функция в разработке</td></tr>';
    }
}

async function filterAssignedDevices() {
    console.log('👤 Фильтрация назначенных устройств (заглушка)');
    const tbody = document.getElementById('assignedTable');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">Функция в разработке</td></tr>';
    }
}

// === РАБОТА С ИМПОРТИРОВАННЫМИ ДАННЫМИ ===

async function showImportedData() {
    console.log('👁️ Показ импортированных данных');
    
    try {
        const importedData = await db.getImportedComputers();
        console.log('📊 Импортированные данные:', importedData);
        
        if (importedData.length === 0) {
            NotificationManager.info('Нет импортированных данных');
            return;
        }
        
        // Временно показываем импортированные данные в таблице компьютеров
        renderComputerTable(importedData);
        NotificationManager.info(`Показано ${importedData.length} импортированных записей`);
        
    } catch (error) {
        console.error('Ошибка получения импортированных данных:', error);
        NotificationManager.error('Ошибка получения импортированных данных');
    }
}

async function migrateImportedData() {
    console.log('🔄 Миграция импортированных данных');
    
    if (!confirm('Перенести все импортированные данные в основную таблицу компьютеров?')) {
        return;
    }
    
    try {
        NotificationManager.info('Начинается перенос данных...');
        
        const result = await db.migrateImportedData();
        console.log('📊 Результат миграции:', result);
        
        if (result.success) {
            let message = `Успешно перенесено ${result.migratedCount} из ${result.totalImported} записей`;
            
            if (result.errors && result.errors.length > 0) {
                message += ` с ${result.errors.length} ошибками`;
                console.warn('⚠️ Ошибки миграции:', result.errors);
            }
            
            NotificationManager.success(message);
            await filterComputers(); // Обновляем основную таблицу
            await updateStats();
        } else {
            NotificationManager.error('Ошибка при миграции данных');
        }
    } catch (error) {
        console.error('Ошибка миграции:', error);
        NotificationManager.error('Ошибка при миграции данных: ' + error.message);
    }
}

// Добавляем обработку формы компьютеров с отладкой
async function handleComputerSubmit(e) {
    e.preventDefault();
    console.log('💾 Отправка формы компьютера');

    try {
        // Собираем данные формы
        const formData = {
            inventoryNumber: document.getElementById('computerInventoryNumber').value.trim(),
            building: document.getElementById('computerBuilding').value,
            location: document.getElementById('computerLocation').value.trim(),
            deviceType: document.getElementById('computerDeviceType').value,
            model: document.getElementById('computerModel').value.trim(),
            processor: document.getElementById('computerProcessor').value.trim(),
            ram: document.getElementById('computerRam').value.trim(),
            storage: document.getElementById('computerStorage').value.trim(),
            graphics: document.getElementById('computerGraphics').value.trim(),
            ipAddress: document.getElementById('computerIpAddress').value.trim(),
            computerName: document.getElementById('computerName').value.trim(),
            year: document.getElementById('computerYear').value.trim(),
            notes: document.getElementById('computerNotes').value.trim()
        };

        console.log('📝 Данные формы:', formData);

        // Упрощенная валидация - проверяем только обязательные поля
        const errors = [];
        if (!formData.building) errors.push('Корпус обязателен');
        if (!formData.location) errors.push('Расположение обязательно');
        if (!formData.deviceType) errors.push('Тип устройства обязателен');

        if (errors.length > 0) {
            console.error('❌ Ошибки валидации:', errors);
            NotificationManager.error(errors.join('\n'));
            return;
        }

        // Проверка IP адреса если указан
        if (formData.ipAddress && !Validator.isValidIP(formData.ipAddress)) {
            NotificationManager.warning('IP-адрес имеет неверный формат, но запись будет сохранена');
        }

        if (editingId && currentEditingType === 'computer') {
            console.log('🔄 Обновление компьютера ID:', editingId);
            await db.update('computers', editingId, formData);
            NotificationManager.success('Компьютер успешно обновлен');
        } else {
            console.log('➕ Добавление нового компьютера');
            const result = await db.add('computers', formData);
            console.log('📊 Результат добавления:', result);
            NotificationManager.success('Компьютер успешно добавлен');
        }

        await filterComputers();
        await updateStats();
        closeModal('computerModal');
    } catch (error) {
        console.error('❌ Ошибка сохранения компьютера:', error);
        NotificationManager.error('Ошибка при сохранении: ' + error.message);
    }
}

async function exportData(type) {
    console.log('📊 Экспорт данных типа:', type);
    NotificationManager.info(`Экспорт данных: ${type}`);
    
    try {
        // Простой экспорт в JSON
        const data = await db.getByType(type === 'computers' ? 'computers' : type);
        
        const filename = `${type}_${new Date().toISOString().split('T')[0]}.json`;
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
        
        NotificationManager.success(`Данные экспортированы: ${filename}`);
    } catch (error) {
        console.error('Ошибка экспорта:', error);
        NotificationManager.error('Ошибка экспорта данных');
    }
}

async function exportToExcel(type) {
    console.log('📤 Экспорт в Excel типа:', type);
    NotificationManager.info(`Экспорт в Excel: ${type} (функция в разработке)`);
}

async function importComputers(event) {
    console.log('📥 Импорт компьютеров');
    
    const file = event.target.files[0];
    if (!file) {
        console.log('Файл не выбран');
        return;
    }

    console.log('📄 Выбран файл:', {
        name: file.name,
        size: file.size,
        type: file.type
    });

    // Проверяем тип файла
    const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'application/octet-stream'
    ];

    const isValidType = allowedTypes.includes(file.type) || 
                       file.name.toLowerCase().endsWith('.xlsx') || 
                       file.name.toLowerCase().endsWith('.xls');

    if (!isValidType) {
        NotificationManager.error('Неподдерживаемый тип файла. Выберите .xlsx или .xls файл');
        event.target.value = '';
        return;
    }

    try {
        NotificationManager.info('Начинается импорт данных...');
        console.log('🔄 Отправляем файл на сервер...');
        
        const result = await db.importFromExcel(file);
        console.log('📊 Результат импорта:', result);
        
        if (result.success) {
            let message = `Успешно импортировано ${result.count} записей`;
            
            if (result.totalRows) {
                message += ` из ${result.totalRows} строк`;
            }
            
            if (result.warnings && result.warnings.length > 0) {
                console.warn('⚠️ Предупреждения при импорте:', result.warnings);
                
                if (result.warningCount) {
                    message += ` с ${result.warningCount} предупреждениями`;
                } else {
                    message += ` с ${result.warnings.length} предупреждениями`;
                }
                
                // Показываем детали в консоли
                console.log('📝 Детали предупреждений:');
                result.warnings.forEach((warning, index) => {
                    console.log(`${index + 1}. ${warning}`);
                });
            }
            
            NotificationManager.success(message);
            await filterComputers();
            await updateStats();
        } else {
            console.error('❌ Ошибка импорта:', result.error);
            NotificationManager.error('Ошибка при импорте: ' + result.error);
        }
    } catch (error) {
        console.error('❌ Исключение при импорте:', error);
        NotificationManager.error('Ошибка при импорте файла: ' + error.message);
    }
    
    // Сбрасываем значение input
    event.target.value = '';
}

// === ПОИСК ПО ИНВЕНТАРНОМУ НОМЕРУ ===

async function searchByInventoryNumber() {
    console.log('🔍 Поиск по инвентарному номеру');
    
    const inventoryNumber = document.getElementById('inventorySearchInput')?.value?.trim();
    if (!inventoryNumber) {
        NotificationManager.warning('Введите инвентарный номер');
        return;
    }

    try {
        const result = await db.findByInventoryNumber(inventoryNumber);
        const searchBox = document.getElementById('inventorySearchBox');
        const infoElement = document.getElementById('autoFillInfo');

        if (result) {
            searchBox.className = 'inventory-search inventory-found';
            infoElement.textContent = `✅ Найдено: ${result.data.model || result.data.type || 'Устройство'}`;
            
            fillComputerFormFromData(result.data);
            NotificationManager.success('Устройство найдено и данные заполнены автоматически');
        } else {
            searchBox.className = 'inventory-search inventory-not-found';
            infoElement.textContent = `❌ Устройство с номером "${inventoryNumber}" не найдено в базе данных`;
            
            document.getElementById('computerInventoryNumber').value = inventoryNumber;
            NotificationManager.warning('Устройство не найдено в базе данных');
        }
    } catch (error) {
        console.error('Ошибка поиска по инвентарному номеру:', error);
        NotificationManager.error('Ошибка при поиске устройства');
    }
}

function fillComputerFormFromData(data) {
    document.getElementById('computerInventoryNumber').value = data.inventoryNumber || '';
    document.getElementById('computerLocation').value = data.location || '';
    document.getElementById('computerDeviceType').value = data.deviceType || '';
    document.getElementById('computerModel').value = data.model || '';
    document.getElementById('computerProcessor').value = data.processor || '';
    document.getElementById('computerRam').value = data.ram || '';
    document.getElementById('computerStorage').value = data.storage || '';
    document.getElementById('computerGraphics').value = data.graphics || '';
    document.getElementById('computerYear').value = data.year || '';
    
    if (data.building) {
        document.getElementById('computerBuilding').value = data.building;
    } else {
        document.getElementById('computerBuilding').value = 'главный';
    }
}

function resetInventorySearch() {
    const searchBox = document.getElementById('inventorySearchBox');
    const infoElement = document.getElementById('autoFillInfo');
    const searchInput = document.getElementById('inventorySearchInput');
    
    if (searchBox) searchBox.className = 'inventory-search';
    if (infoElement) infoElement.textContent = 'Введите инвентарный номер и нажмите "Найти" для автоматического заполнения полей';
    if (searchInput) searchInput.value = '';
}

// === МОДАЛЬНЫЕ ОКНА ===

function closeModal(modalId) {
    console.log('❌ Закрытие модального окна:', modalId);
    
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
    
    editingId = null;
    currentEditingType = null;
    resetInventorySearch();
}

// === УТИЛИТЫ ===

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// === НАСТРОЙКА ОБРАБОТЧИКОВ СОБЫТИЙ ===

function setupEventListeners() {
    console.log('🔧 Настройка обработчиков событий...');
    
    // Поисковые поля
    const searchInputs = ['computerSearchInput', 'networkSearchInput', 'otherSearchInput', 'assignedSearchInput'];
    searchInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('input', debounce(() => {
                if (inputId === 'computerSearchInput') filterComputers();
            }, 300));
        }
    });

    // Фильтры
    const filters = ['buildingFilter', 'typeFilter', 'statusFilter'];
    filters.forEach(filterId => {
        const filter = document.getElementById(filterId);
        if (filter) {
            filter.addEventListener('change', () => filterComputers());
        }
    });

    // Обработчики форм
    const computerForm = document.getElementById('computerForm');
    if (computerForm) {
        computerForm.addEventListener('submit', handleComputerSubmit);
        console.log('✅ Обработчик формы компьютера установлен');
    } else {
        console.error('❌ Форма компьютера не найдена');
    }

    // Закрытие модальных окон по клику вне их
    window.addEventListener('click', function(event) {
        const modals = ['computerModal', 'networkModal', 'otherModal', 'assignedModal'];
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (event.target === modal) {
                closeModal(modalId);
            }
        });
    });

    console.log('✅ Обработчики событий настроены');
}

// === ГЛОБАЛЬНЫЕ ФУНКЦИИ ===

// Назначаем все функции глобально
window.openTab = openTab;
window.openComputerModal = openComputerModal;
window.openNetworkModal = openNetworkModal;
window.openOtherModal = openOtherModal;
window.openAssignedModal = openAssignedModal;
window.editComputer = editComputer;
window.deleteComputer = deleteComputer;
window.closeModal = closeModal;
window.exportData = exportData;
window.exportToExcel = exportToExcel;
window.importComputers = importComputers;
window.searchByInventoryNumber = searchByInventoryNumber;

// Отладочные функции
window.testClick = function() {
    console.log('🔧 Тестовая кнопка работает!');
    NotificationManager.success('Тестовая кнопка работает!');
};

window.initApp = initializeApp;
window.checkDeps = checkDependencies;

// === ИНИЦИАЛИЗАЦИЯ ===

document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM загружен, инициализируем приложение...');
    
    setTimeout(async function() {
        await initializeApp();
        setupEventListeners();
        
        console.log('✅ Приложение полностью инициализировано');
        
        // Проверяем доступность функций
        const testFunctions = ['openTab', 'openComputerModal', 'exportData'];
        console.log('🔍 Проверка функций:');
        testFunctions.forEach(funcName => {
            console.log(`${funcName}: ${typeof window[funcName]}`);
        });
        
    }, 500);
});

console.log('✅ script.js загружен полностью');
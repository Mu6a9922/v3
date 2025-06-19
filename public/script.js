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
            case 'ipaddresses':
                await renderIPAddressTable();
                break;
            case 'history':
                await renderHistory();
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
        document.getElementById('computerStatus').value = 'working';
        
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
        document.getElementById('computerStatus').value = computer.status || 'working';

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

// === РАБОТА С СЕТЕВЫМ ОБОРУДОВАНИЕМ ===

function renderNetworkTable(data = []) {
    console.log('🌐 Рендеринг таблицы сетевого оборудования, записей:', data.length);
    
    const tbody = document.getElementById('networkTable');
    if (!tbody) {
        console.error('❌ Элемент networkTable не найден');
        return;
    }
    
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 20px;">Нет данных для отображения</td></tr>';
        return;
    }

    data.forEach((device, index) => {
        const statusClass = StatusManager ? StatusManager.getStatusClass(device.status) : 'status-working';
        const statusText = StatusManager ? StatusManager.getStatusText(device.status) : 'Неизвестно';

        tbody.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${escapeHtml(device.type || '')}</td>
                <td>${escapeHtml(device.model || '')}</td>
                <td>${escapeHtml(device.building || '')}</td>
                <td>${escapeHtml(device.location || '')}</td>
                <td>${escapeHtml(device.ipAddress || '')}</td>
                <td>${escapeHtml(device.login || '')}</td>
                <td>${escapeHtml(device.wifiName || '')}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn" onclick="editNetworkDevice(${device.id})" style="font-size: 12px; padding: 5px 10px;" title="Редактировать">✏️</button>
                    <button class="btn btn-danger" onclick="deleteNetworkDevice(${device.id})" style="font-size: 12px; padding: 5px 10px; margin-left: 5px;" title="Удалить">🗑️</button>
                </td>
            </tr>
        `;
    });
}

async function filterNetworkDevices() {
    console.log('🌐 Фильтрация сетевых устройств');
    
    try {
        const searchTerm = document.getElementById('networkSearchInput')?.value || '';
        const buildingFilter = document.getElementById('networkBuildingFilter')?.value || '';
        const typeFilter = document.getElementById('networkTypeFilter')?.value || '';

        let devices = await db.getByType('networkDevices');

        // Поиск
        if (searchTerm) {
            devices = devices.filter(device => {
                const searchFields = [
                    device.model || '',
                    device.ipAddress || '',
                    device.location || '',
                    device.wifiName || ''
                ];
                return searchFields.some(field => 
                    field.toLowerCase().includes(searchTerm.toLowerCase())
                );
            });
        }

        // Фильтры
        if (buildingFilter) {
            devices = devices.filter(d => d.building === buildingFilter);
        }
        if (typeFilter) {
            devices = devices.filter(d => d.type === typeFilter);
        }

        renderNetworkTable(devices);
    } catch (error) {
        console.error('Ошибка фильтрации сетевых устройств:', error);
        renderNetworkTable([]);
    }
}

function openNetworkModal() {
    console.log('🌐 Открытие модального окна сетевого оборудования');
    
    try {
        editingId = null;
        currentEditingType = 'network';
        document.getElementById('networkModalTitle').textContent = 'Добавить сетевое устройство';
        
        // Очищаем форму
        const form = document.getElementById('networkForm');
        if (form) {
            form.reset();
        }
        document.getElementById('networkStatus').value = 'working';
        
        document.getElementById('networkModal').style.display = 'block';
    } catch (error) {
        console.error('Ошибка открытия модального окна сетевого оборудования:', error);
        NotificationManager.error('Ошибка открытия формы');
    }
}

async function editNetworkDevice(id) {
    console.log('✏️ Редактирование сетевого устройства ID:', id);
    
    try {
        const devices = await db.getByType('networkDevices');
        const device = devices.find(d => d.id === id);
        
        if (!device) {
            NotificationManager.error('Сетевое устройство не найдено');
            return;
        }

        editingId = id;
        currentEditingType = 'network';
        document.getElementById('networkModalTitle').textContent = 'Редактировать сетевое устройство';
        
        // Заполняем форму
        document.getElementById('networkType').value = device.type || '';
        document.getElementById('networkModel').value = device.model || '';
        document.getElementById('networkBuilding').value = device.building || '';
        document.getElementById('networkLocation').value = device.location || '';
        document.getElementById('networkIpAddress').value = device.ipAddress || '';
        document.getElementById('networkLogin').value = device.login || '';
        document.getElementById('networkPassword').value = device.password || '';
        document.getElementById('networkWifiName').value = device.wifiName || '';
        document.getElementById('networkWifiPassword').value = device.wifiPassword || '';
        document.getElementById('networkNotes').value = device.notes || '';
        document.getElementById('networkStatus').value = device.status || 'working';

        document.getElementById('networkModal').style.display = 'block';
    } catch (error) {
        console.error('Ошибка редактирования сетевого устройства:', error);
        NotificationManager.error('Ошибка при загрузке данных устройства');
    }
}

async function deleteNetworkDevice(id) {
    console.log('🗑️ Удаление сетевого устройства ID:', id);
    
    if (confirm('Вы уверены, что хотите удалить это сетевое устройство?')) {
        try {
            await db.delete('networkDevices', id);
            NotificationManager.success('Сетевое устройство успешно удалено');
            await filterNetworkDevices();
            await updateStats();
        } catch (error) {
            console.error('Ошибка удаления сетевого устройства:', error);
            NotificationManager.error('Ошибка при удалении устройства');
        }
    }
}

// === РАБОТА С ДРУГОЙ ТЕХНИКОЙ ===

function renderOtherTable(data = []) {
    console.log('🖨️ Рендеринг таблицы другой техники, записей:', data.length);
    
    const tbody = document.getElementById('otherTable');
    if (!tbody) {
        console.error('❌ Элемент otherTable не найден');
        return;
    }
    
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px;">Нет данных для отображения</td></tr>';
        return;
    }

    data.forEach((device, index) => {
        const statusClass = StatusManager ? StatusManager.getStatusClass(device.status) : 'status-working';
        const statusText = StatusManager ? StatusManager.getStatusText(device.status) : 'Неизвестно';

        tbody.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${escapeHtml(device.type || '')}</td>
                <td>${escapeHtml(device.model || '')}</td>
                <td>${escapeHtml(device.building || '')}</td>
                <td>${escapeHtml(device.location || '')}</td>
                <td>${escapeHtml(device.responsible || '')}</td>
                <td>${escapeHtml(device.inventoryNumber || '')}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn" onclick="editOtherDevice(${device.id})" style="font-size: 12px; padding: 5px 10px;" title="Редактировать">✏️</button>
                    <button class="btn btn-danger" onclick="deleteOtherDevice(${device.id})" style="font-size: 12px; padding: 5px 10px; margin-left: 5px;" title="Удалить">🗑️</button>
                </td>
            </tr>
        `;
    });
}

async function filterOtherDevices() {
    console.log('🖨️ Фильтрация другой техники');
    
    try {
        const searchTerm = document.getElementById('otherSearchInput')?.value || '';
        const buildingFilter = document.getElementById('otherBuildingFilter')?.value || '';
        const typeFilter = document.getElementById('otherTypeFilter')?.value || '';

        let devices = await db.getByType('otherDevices');

        // Поиск
        if (searchTerm) {
            devices = devices.filter(device => {
                const searchFields = [
                    device.type || '',
                    device.model || '',
                    device.location || '',
                    device.responsible || '',
                    device.inventoryNumber || ''
                ];
                return searchFields.some(field => 
                    field.toLowerCase().includes(searchTerm.toLowerCase())
                );
            });
        }

        // Фильтры
        if (buildingFilter) {
            devices = devices.filter(d => d.building === buildingFilter);
        }
        if (typeFilter) {
            devices = devices.filter(d => d.type === typeFilter);
        }

        renderOtherTable(devices);
    } catch (error) {
        console.error('Ошибка фильтрации другой техники:', error);
        renderOtherTable([]);
    }
}

function openOtherModal() {
    console.log('🖨️ Открытие модального окна другой техники');
    
    try {
        editingId = null;
        currentEditingType = 'other';
        document.getElementById('otherModalTitle').textContent = 'Добавить устройство';
        
        // Очищаем форму
        const form = document.getElementById('otherForm');
        if (form) {
            form.reset();
        }
        document.getElementById('otherStatus').value = 'working';
        
        document.getElementById('otherModal').style.display = 'block';
    } catch (error) {
        console.error('Ошибка открытия модального окна другой техники:', error);
        NotificationManager.error('Ошибка открытия формы');
    }
}

async function editOtherDevice(id) {
    console.log('✏️ Редактирование другого устройства ID:', id);
    
    try {
        const devices = await db.getByType('otherDevices');
        const device = devices.find(d => d.id === id);
        
        if (!device) {
            NotificationManager.error('Устройство не найдено');
            return;
        }

        editingId = id;
        currentEditingType = 'other';
        document.getElementById('otherModalTitle').textContent = 'Редактировать устройство';
        
        // Заполняем форму
        document.getElementById('otherType').value = device.type || '';
        document.getElementById('otherModel').value = device.model || '';
        document.getElementById('otherBuilding').value = device.building || '';
        document.getElementById('otherLocation').value = device.location || '';
        document.getElementById('otherResponsible').value = device.responsible || '';
        document.getElementById('otherInventoryNumber').value = device.inventoryNumber || '';
        document.getElementById('otherNotes').value = device.notes || '';
        document.getElementById('otherStatus').value = device.status || 'working';

        document.getElementById('otherModal').style.display = 'block';
    } catch (error) {
        console.error('Ошибка редактирования устройства:', error);
        NotificationManager.error('Ошибка при загрузке данных устройства');
    }
}

async function deleteOtherDevice(id) {
    console.log('🗑️ Удаление другого устройства ID:', id);
    
    if (confirm('Вы уверены, что хотите удалить это устройство?')) {
        try {
            await db.delete('otherDevices', id);
            NotificationManager.success('Устройство успешно удалено');
            await filterOtherDevices();
            await updateStats();
        } catch (error) {
            console.error('Ошибка удаления устройства:', error);
            NotificationManager.error('Ошибка при удалении устройства');
        }
    }
}

// === РАБОТА С НАЗНАЧЕННЫМИ УСТРОЙСТВАМИ ===

function renderAssignedTable(data = []) {
    console.log('👤 Рендеринг таблицы назначенных устройств, записей:', data.length);
    
    const tbody = document.getElementById('assignedTable');
    if (!tbody) {
        console.error('❌ Элемент assignedTable не найден');
        return;
    }
    
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">Нет данных для отображения</td></tr>';
        return;
    }

    data.forEach((assignment, index) => {
        const devicesText = Array.isArray(assignment.devices) 
            ? assignment.devices.join('; ') 
            : assignment.devices || '';

        tbody.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${escapeHtml(assignment.employee || '')}</strong></td>
                <td>${escapeHtml(assignment.position || '')}</td>
                <td>${escapeHtml(assignment.building || '')}</td>
                <td style="max-width: 300px; word-wrap: break-word;">${escapeHtml(devicesText)}</td>
                <td>${DateUtils ? DateUtils.formatDate(assignment.assignedDate) : assignment.assignedDate || ''}</td>
                <td>
                    <button class="btn" onclick="editAssignment(${assignment.id})" style="font-size: 12px; padding: 5px 10px;" title="Редактировать">✏️</button>
                    <button class="btn btn-danger" onclick="deleteAssignment(${assignment.id})" style="font-size: 12px; padding: 5px 10px; margin-left: 5px;" title="Удалить">🗑️</button>
                </td>
            </tr>
        `;
    });
}

async function filterAssignedDevices() {
    console.log('👤 Фильтрация назначенных устройств');
    
    try {
        const searchTerm = document.getElementById('assignedSearchInput')?.value || '';
        const buildingFilter = document.getElementById('assignedBuildingFilter')?.value || '';

        let assignments = await db.getByType('assignedDevices');

        // Поиск
        if (searchTerm) {
            assignments = assignments.filter(assignment => {
                const devicesText = Array.isArray(assignment.devices) 
                    ? assignment.devices.join(' ') 
                    : assignment.devices || '';
                    
                const searchFields = [
                    assignment.employee || '',
                    assignment.position || '',
                    devicesText
                ];
                return searchFields.some(field => 
                    field.toLowerCase().includes(searchTerm.toLowerCase())
                );
            });
        }

        // Фильтры
        if (buildingFilter) {
            assignments = assignments.filter(a => a.building === buildingFilter);
        }

        renderAssignedTable(assignments);
    } catch (error) {
        console.error('Ошибка фильтрации назначенных устройств:', error);
        renderAssignedTable([]);
    }
}

function openAssignedModal() {
    console.log('👤 Открытие модального окна назначенных устройств');
    
    try {
        editingId = null;
        currentEditingType = 'assigned';
        document.getElementById('assignedModalTitle').textContent = 'Назначить устройство сотруднику';
        
        // Очищаем форму
        const form = document.getElementById('assignedForm');
        if (form) {
            form.reset();
        }
        
        // Устанавливаем текущую дату
        document.getElementById('assignedDate').value = DateUtils ? DateUtils.getCurrentDate() : '';
        
        resetDeviceSearch();
        document.getElementById('assignedModal').style.display = 'block';
    } catch (error) {
        console.error('Ошибка открытия модального окна назначенных устройств:', error);
        NotificationManager.error('Ошибка открытия формы');
    }
}

async function editAssignment(id) {
    console.log('✏️ Редактирование назначения ID:', id);
    
    try {
        const assignments = await db.getByType('assignedDevices');
        const assignment = assignments.find(a => a.id === id);
        
        if (!assignment) {
            NotificationManager.error('Назначение не найдено');
            return;
        }

        editingId = id;
        currentEditingType = 'assigned';
        document.getElementById('assignedModalTitle').textContent = 'Редактировать назначение';
        
        // Заполняем форму
        document.getElementById('assignedEmployee').value = assignment.employee || '';
        document.getElementById('assignedPosition').value = assignment.position || '';
        document.getElementById('assignedBuilding').value = assignment.building || '';
        document.getElementById('assignedDate').value = assignment.assignedDate || '';
        document.getElementById('assignedNotes').value = assignment.notes || '';
        
        // Заполняем устройства
        const devicesText = Array.isArray(assignment.devices) 
            ? assignment.devices.join('\n') 
            : assignment.devices || '';
        document.getElementById('assignedDevices').value = devicesText;

        resetDeviceSearch();
        document.getElementById('assignedModal').style.display = 'block';
    } catch (error) {
        console.error('Ошибка редактирования назначения:', error);
        NotificationManager.error('Ошибка при загрузке данных назначения');
    }
}

async function deleteAssignment(id) {
    console.log('🗑️ Удаление назначения ID:', id);
    
    if (confirm('Вы уверены, что хотите удалить это назначение?')) {
        try {
            await db.delete('assignedDevices', id);
            NotificationManager.success('Назначение успешно удалено');
            await filterAssignedDevices();
            await updateStats();
        } catch (error) {
            console.error('Ошибка удаления назначения:', error);
            NotificationManager.error('Ошибка при удалении назначения');
        }
    }
}

// === ТАБЛИЦА IP АДРЕСОВ ===

async function renderIPAddressTable() {
    console.log('🌐 Рендеринг таблицы IP адресов');
    
    try {
        // Получаем все устройства с IP адресами
        const [computers, networkDevices] = await Promise.all([
            db.getByType('computers'),
            db.getByType('networkDevices')
        ]);
        
        // Создаем карту используемых IP адресов
        const usedIPs = new Map();
        
        // Добавляем компьютеры
        computers.forEach(computer => {
            if (computer.ipAddress && computer.ipAddress.startsWith('192.168.100.')) {
                usedIPs.set(computer.ipAddress, {
                    type: computer.deviceType || 'Компьютер',
                    name: computer.computerName || computer.model || 'Неизвестно',
                    location: computer.location || '',
                    status: computer.status || 'working'
                });
            }
        });
        
        // Добавляем сетевые устройства
        networkDevices.forEach(device => {
            if (device.ipAddress && device.ipAddress.startsWith('192.168.100.')) {
                usedIPs.set(device.ipAddress, {
                    type: device.type || 'Сетевое устройство',
                    name: device.model || 'Неизвестно',
                    location: device.location || '',
                    status: device.status || 'working'
                });
            }
        });
        
        const tbody = document.getElementById('ipTable');
        if (!tbody) {
            console.error('❌ Элемент ipTable не найден');
            return;
        }
        
        tbody.innerHTML = '';
        
        // Генерируем таблицу IP адресов от 192.168.100.1 до 192.168.100.254
        for (let i = 1; i <= 254; i++) {
            const ip = `192.168.100.${i}`;
            const device = usedIPs.get(ip);
            
            let statusClass = 'status-free';
            let deviceInfo = 'Свободен';
            let typeInfo = '';
            let locationInfo = '';
            
            if (device) {
                statusClass = StatusManager ? StatusManager.getStatusClass(device.status) : 'status-working';
                deviceInfo = device.name;
                typeInfo = device.type;
                locationInfo = device.location;
            }
            
            tbody.innerHTML += `
                <tr class="${device ? 'ip-used' : 'ip-free'}">
                    <td>${i}</td>
                    <td><strong>${ip}</strong></td>
                    <td>${typeInfo}</td>
                    <td>${deviceInfo}</td>
                    <td>${locationInfo}</td>
                    <td><span class="status-badge ${statusClass}">${device ? (StatusManager ? StatusManager.getStatusText(device.status) : 'Используется') : 'Свободен'}</span></td>
                    <td>
                        ${device ? 
                            `<button class="btn" onclick="editDeviceByIP('${ip}')" style="font-size: 12px; padding: 5px 10px;" title="Редактировать">✏️</button>` :
                            `<button class="btn btn-success" onclick="assignIP('${ip}')" style="font-size: 12px; padding: 5px 10px;" title="Назначить">➕</button>`
                        }
                    </td>
                </tr>
            `;
        }
    } catch (error) {
        console.error('Ошибка рендеринга таблицы IP адресов:', error);
        const tbody = document.getElementById('ipTable');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">Ошибка загрузки данных</td></tr>';
        }
    }
}

async function editDeviceByIP(ip) {
    console.log('✏️ Редактирование устройства по IP:', ip);
    
    try {
        // Ищем устройство по IP
        const [computers, networkDevices] = await Promise.all([
            db.getByType('computers'),
            db.getByType('networkDevices')
        ]);
        
        let device = computers.find(c => c.ipAddress === ip);
        if (device) {
            await editComputer(device.id);
            return;
        }
        
        device = networkDevices.find(d => d.ipAddress === ip);
        if (device) {
            await editNetworkDevice(device.id);
            return;
        }
        
        NotificationManager.warning('Устройство с данным IP не найдено');
    } catch (error) {
        console.error('Ошибка поиска устройства по IP:', error);
        NotificationManager.error('Ошибка поиска устройства');
    }
}

function assignIP(ip) {
    console.log('➕ Назначение IP адреса:', ip);
    
    // Открываем модальное окно для выбора типа устройства
    const deviceType = prompt('Выберите тип устройства:\n1 - Компьютер\n2 - Сетевое устройство\n\nВведите номер:');
    
    if (deviceType === '1') {
        openComputerModal();
        // Автоматически заполняем IP
        setTimeout(() => {
            document.getElementById('computerIpAddress').value = ip;
        }, 100);
    } else if (deviceType === '2') {
        openNetworkModal();
        // Автоматически заполняем IP
        setTimeout(() => {
            document.getElementById('networkIpAddress').value = ip;
        }, 100);
    }
}

// === ИСТОРИЯ ИЗМЕНЕНИЙ ===
async function renderHistory() {
    console.log('📜 Загрузка истории изменений');

    try {
        const history = await db.getHistory();
        const tbody = document.getElementById('historyTable');
        if (!tbody) {
            console.error('❌ Элемент historyTable не найден');
            return;
        }

        tbody.innerHTML = '';

        history.forEach((item, index) => {
            tbody.innerHTML += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${escapeHtml(item.table)}</td>
                    <td>${item.deviceId}</td>
                    <td>${escapeHtml(item.action)}</td>
                    <td>${new Date(item.timestamp).toLocaleString()}</td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Ошибка загрузки истории:', error);
    }
}

// === ОБРАБОТЧИКИ ФОРМ ===

// Добавляем обработку формы компьютеров
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
            notes: document.getElementById('computerNotes').value.trim(),
            status: document.getElementById('computerStatus').value
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

// Обработка формы сетевого оборудования
async function handleNetworkSubmit(e) {
    e.preventDefault();
    console.log('💾 Отправка формы сетевого оборудования');

    try {
        const formData = {
            type: document.getElementById('networkType').value,
            model: document.getElementById('networkModel').value.trim(),
            building: document.getElementById('networkBuilding').value,
            location: document.getElementById('networkLocation').value.trim(),
            ipAddress: document.getElementById('networkIpAddress').value.trim(),
            login: document.getElementById('networkLogin').value.trim(),
            password: document.getElementById('networkPassword').value.trim(),
            wifiName: document.getElementById('networkWifiName').value.trim(),
            wifiPassword: document.getElementById('networkWifiPassword').value.trim(),
            notes: document.getElementById('networkNotes').value.trim(),
            status: document.getElementById('networkStatus').value
        };

        // Валидация
        const errors = [];
        if (!formData.type) errors.push('Тип устройства обязателен');
        if (!formData.model) errors.push('Модель обязательна');
        if (!formData.building) errors.push('Корпус обязателен');
        if (!formData.location) errors.push('Расположение обязательно');
        if (!formData.ipAddress) errors.push('IP-адрес обязателен');

        if (errors.length > 0) {
            NotificationManager.error(errors.join('\n'));
            return;
        }

        if (!Validator.isValidIP(formData.ipAddress)) {
            NotificationManager.error('Некорректный формат IP-адреса');
            return;
        }

        if (editingId && currentEditingType === 'network') {
            await db.update('networkDevices', editingId, formData);
            NotificationManager.success('Сетевое устройство успешно обновлено');
        } else {
            await db.add('networkDevices', formData);
            NotificationManager.success('Сетевое устройство успешно добавлено');
        }

        await filterNetworkDevices();
        await updateStats();
        closeModal('networkModal');
    } catch (error) {
        console.error('❌ Ошибка сохранения сетевого устройства:', error);
        NotificationManager.error('Ошибка при сохранении: ' + error.message);
    }
}

// Обработка формы другой техники
async function handleOtherSubmit(e) {
    e.preventDefault();
    console.log('💾 Отправка формы другой техники');

    try {
        const formData = {
            type: document.getElementById('otherType').value,
            model: document.getElementById('otherModel').value.trim(),
            building: document.getElementById('otherBuilding').value,
            location: document.getElementById('otherLocation').value.trim(),
            responsible: document.getElementById('otherResponsible').value.trim(),
            inventoryNumber: document.getElementById('otherInventoryNumber').value.trim(),
            notes: document.getElementById('otherNotes').value.trim(),
            status: document.getElementById('otherStatus').value
        };

        // Валидация
        const errors = [];
        if (!formData.type) errors.push('Тип устройства обязателен');
        if (!formData.model) errors.push('Модель обязательна');
        if (!formData.building) errors.push('Корпус обязателен');
        if (!formData.location) errors.push('Расположение обязательно');

        if (errors.length > 0) {
            NotificationManager.error(errors.join('\n'));
            return;
        }

        if (editingId && currentEditingType === 'other') {
            await db.update('otherDevices', editingId, formData);
            NotificationManager.success('Устройство успешно обновлено');
        } else {
            await db.add('otherDevices', formData);
            NotificationManager.success('Устройство успешно добавлено');
        }

        await filterOtherDevices();
        await updateStats();
        closeModal('otherModal');
    } catch (error) {
        console.error('❌ Ошибка сохранения устройства:', error);
        NotificationManager.error('Ошибка при сохранении: ' + error.message);
    }
}

// Обработка формы назначенных устройств
async function handleAssignedSubmit(e) {
    e.preventDefault();
    console.log('💾 Отправка формы назначенных устройств');

    try {
        const devicesText = document.getElementById('assignedDevices').value.trim();
        const devices = devicesText.split('\n').filter(line => line.trim() !== '');

        const formData = {
            employee: document.getElementById('assignedEmployee').value.trim(),
            position: document.getElementById('assignedPosition').value.trim(),
            building: document.getElementById('assignedBuilding').value,
            devices: devices,
            assignedDate: document.getElementById('assignedDate').value,
            notes: document.getElementById('assignedNotes').value.trim()
        };

        // Валидация
        const errors = [];
        if (!formData.employee) errors.push('ФИО сотрудника обязательно');
        if (!formData.position) errors.push('Должность обязательна');
        if (!formData.building) errors.push('Корпус обязателен');
        if (!formData.assignedDate) errors.push('Дата назначения обязательна');
        if (devices.length === 0) errors.push('Необходимо указать хотя бы одно устройство');

        if (errors.length > 0) {
            NotificationManager.error(errors.join('\n'));
            return;
        }

        if (editingId && currentEditingType === 'assigned') {
            await db.update('assignedDevices', editingId, formData);
            NotificationManager.success('Назначение успешно обновлено');
        } else {
            await db.add('assignedDevices', formData);
            NotificationManager.success('Устройство успешно назначено');
        }

        await filterAssignedDevices();
        await updateStats();
        closeModal('assignedModal');
    } catch (error) {
        console.error('❌ Ошибка сохранения назначения:', error);
        NotificationManager.error('Ошибка при сохранении: ' + error.message);
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

async function searchDeviceByInventoryNumber() {
    console.log('🔍 Поиск устройства для назначения по инвентарному номеру');
    
    const inventoryNumber = document.getElementById('deviceSearchInput')?.value?.trim();
    if (!inventoryNumber) {
        NotificationManager.warning('Введите инвентарный номер устройства');
        return;
    }

    try {
        const result = await db.findByInventoryNumber(inventoryNumber);
        const searchBox = document.getElementById('deviceSearchBox');
        const infoElement = document.getElementById('deviceAutoFillInfo');

        if (result) {
            searchBox.className = 'inventory-search inventory-found';
            const deviceName = result.data.model || result.data.type || 'Устройство';
            infoElement.textContent = `✅ Найдено: ${deviceName}`;
            
            // Добавляем устройство в список
            const devicesTextarea = document.getElementById('assignedDevices');
            const currentDevices = devicesTextarea.value.trim();
            const newDevice = `${deviceName} (${inventoryNumber})`;
            
            if (currentDevices) {
                devicesTextarea.value = currentDevices + '\n' + newDevice;
            } else {
                devicesTextarea.value = newDevice;
            }
            
            NotificationManager.success('Устройство добавлено в список');
            document.getElementById('deviceSearchInput').value = '';
        } else {
            searchBox.className = 'inventory-search inventory-not-found';
            infoElement.textContent = `❌ Устройство с номером "${inventoryNumber}" не найдено`;
            NotificationManager.warning('Устройство не найдено в базе данных');
        }
    } catch (error) {
        console.error('Ошибка поиска устройства:', error);
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

function resetDeviceSearch() {
    const searchBox = document.getElementById('deviceSearchBox');
    const infoElement = document.getElementById('deviceAutoFillInfo');
    const searchInput = document.getElementById('deviceSearchInput');
    
    if (searchBox) searchBox.className = 'inventory-search';
    if (infoElement) infoElement.textContent = 'Поиск устройства по инвентарному номеру для быстрого добавления';
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
    resetDeviceSearch();
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
                else if (inputId === 'networkSearchInput') filterNetworkDevices();
                else if (inputId === 'otherSearchInput') filterOtherDevices();
                else if (inputId === 'assignedSearchInput') filterAssignedDevices();
            }, 300));
        }
    });

    // Фильтры для компьютеров
    const computerFilters = ['buildingFilter', 'typeFilter', 'statusFilter'];
    computerFilters.forEach(filterId => {
        const filter = document.getElementById(filterId);
        if (filter) {
            filter.addEventListener('change', () => filterComputers());
        }
    });

    // Фильтры для сетевого оборудования
    const networkFilters = ['networkBuildingFilter', 'networkTypeFilter'];
    networkFilters.forEach(filterId => {
        const filter = document.getElementById(filterId);
        if (filter) {
            filter.addEventListener('change', () => filterNetworkDevices());
        }
    });

    // Фильтры для другой техники
    const otherFilters = ['otherBuildingFilter', 'otherTypeFilter'];
    otherFilters.forEach(filterId => {
        const filter = document.getElementById(filterId);
        if (filter) {
            filter.addEventListener('change', () => filterOtherDevices());
        }
    });

    // Фильтры для назначенных устройств
    const assignedFilters = ['assignedBuildingFilter'];
    assignedFilters.forEach(filterId => {
        const filter = document.getElementById(filterId);
        if (filter) {
            filter.addEventListener('change', () => filterAssignedDevices());
        }
    });

    // Обработчики форм
    const forms = [
        { id: 'computerForm', handler: handleComputerSubmit },
        { id: 'networkForm', handler: handleNetworkSubmit },
        { id: 'otherForm', handler: handleOtherSubmit },
        { id: 'assignedForm', handler: handleAssignedSubmit }
    ];

    forms.forEach(({ id, handler }) => {
        const form = document.getElementById(id);
        if (form) {
            form.addEventListener('submit', handler);
            console.log(`✅ Обработчик формы ${id} установлен`);
        } else {
            console.warn(`⚠️ Форма ${id} не найдена`);
        }
    });

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
window.editNetworkDevice = editNetworkDevice;
window.deleteNetworkDevice = deleteNetworkDevice;
window.editOtherDevice = editOtherDevice;
window.deleteOtherDevice = deleteOtherDevice;
window.editAssignment = editAssignment;
window.deleteAssignment = deleteAssignment;
window.editDeviceByIP = editDeviceByIP;
window.assignIP = assignIP;
window.closeModal = closeModal;
window.exportData = exportData;
window.exportToExcel = exportToExcel;
window.importComputers = importComputers;
window.searchByInventoryNumber = searchByInventoryNumber;
window.searchDeviceByInventoryNumber = searchDeviceByInventoryNumber;
window.showImportedData = showImportedData;
window.migrateImportedData = migrateImportedData;

// Отладочные функции
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
        const testFunctions = ['openTab', 'openComputerModal', 'openNetworkModal', 'openOtherModal', 'openAssignedModal'];
        console.log('🔍 Проверка функций:');
        testFunctions.forEach(funcName => {
            console.log(`${funcName}: ${typeof window[funcName]}`);
        });
        
    }, 500);
});

console.log('✅ script.js загружен полностью');
// Класс для работы с API сервера
class Database {
    constructor() {
        this.baseURL = window.location.origin; // Автоматически определяем базовый URL
        this.endpoints = {
            computers: '/api/computers',
            networkDevices: '/api/network-devices',
            otherDevices: '/api/other-devices',
            assignedDevices: '/api/assigned-devices',
            stats: '/api/stats',
            searchInventory: '/api/search-inventory',
            importExcel: '/api/import-excel',
            importedComputers: '/api/imported-computers',
            migrateImported: '/api/migrate-imported',
            history: '/api/history'
        };
    }

    // Универсальный метод для API запросов
    async apiRequest(url, options = {}) {
        try {
            const response = await fetch(this.baseURL + url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Ошибка сервера' }));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request error:', error);
            throw error;
        }
    }

    // Получение статистики
    async getStats() {
        try {
            return await this.apiRequest(this.endpoints.stats);
        } catch (error) {
            console.error('Ошибка получения статистики:', error);
            return {
                computers: 0,
                network: 0,
                other: 0,
                assigned: 0
            };
        }
    }

    // Получение импортированных компьютеров
    async getImportedComputers() {
        try {
            return await this.apiRequest(this.endpoints.importedComputers);
        } catch (error) {
            console.error('Ошибка получения импортированных компьютеров:', error);
            return [];
        }
    }

    // Миграция импортированных данных в основную таблицу
    async migrateImportedData() {
        try {
            return await this.apiRequest(this.endpoints.migrateImported, {
                method: 'POST'
            });
        } catch (error) {
            console.error('Ошибка миграции данных:', error);
            throw error;
        }
    }

    async getHistory() {
        try {
            return await this.apiRequest(this.endpoints.history);
        } catch (error) {
            console.error('Ошибка получения истории:', error);
            return [];
        }
    }

    // Получение данных по типу (обновленная версия)
    async getByType(type) {
        try {
            const endpointMap = {
                'computers': this.endpoints.computers,
                'networkDevices': this.endpoints.networkDevices,
                'otherDevices': this.endpoints.otherDevices,
                'assignedDevices': this.endpoints.assignedDevices,
                'importedComputers': this.endpoints.importedComputers
            };

            const endpoint = endpointMap[type];
            if (!endpoint) {
                throw new Error(`Неизвестный тип данных: ${type}`);
            }

            return await this.apiRequest(endpoint);
        } catch (error) {
            console.error(`Ошибка получения данных типа ${type}:`, error);
            return [];
        }
    }

    // Добавление записи
    async add(type, item) {
        try {
            const endpointMap = {
                'computers': this.endpoints.computers,
                'networkDevices': this.endpoints.networkDevices,
                'otherDevices': this.endpoints.otherDevices,
                'assignedDevices': this.endpoints.assignedDevices
            };

            const endpoint = endpointMap[type];
            if (!endpoint) {
                throw new Error(`Неизвестный тип данных: ${type}`);
            }

            const result = await this.apiRequest(endpoint, {
                method: 'POST',
                body: JSON.stringify(item)
            });

            return { ...item, id: result.id };
        } catch (error) {
            console.error(`Ошибка добавления ${type}:`, error);
            throw error;
        }
    }

    // Обновление записи
    async update(type, id, updatedItem) {
        try {
            const endpointMap = {
                'computers': this.endpoints.computers,
                'networkDevices': this.endpoints.networkDevices,
                'otherDevices': this.endpoints.otherDevices,
                'assignedDevices': this.endpoints.assignedDevices
            };

            const endpoint = endpointMap[type];
            if (!endpoint) {
                throw new Error(`Неизвестный тип данных: ${type}`);
            }

            await this.apiRequest(`${endpoint}/${id}`, {
                method: 'PUT',
                body: JSON.stringify(updatedItem)
            });

            return { ...updatedItem, id };
        } catch (error) {
            console.error(`Ошибка обновления ${type}:`, error);
            throw error;
        }
    }

    // Удаление записи
    async delete(type, id) {
        try {
            const endpointMap = {
                'computers': this.endpoints.computers,
                'networkDevices': this.endpoints.networkDevices,
                'otherDevices': this.endpoints.otherDevices,
                'assignedDevices': this.endpoints.assignedDevices
            };

            const endpoint = endpointMap[type];
            if (!endpoint) {
                throw new Error(`Неизвестный тип данных: ${type}`);
            }

            await this.apiRequest(`${endpoint}/${id}`, {
                method: 'DELETE'
            });

            return true;
        } catch (error) {
            console.error(`Ошибка удаления ${type}:`, error);
            throw error;
        }
    }

    // Поиск по инвентарному номеру
    async findByInventoryNumber(inventoryNumber) {
        try {
            return await this.apiRequest(`${this.endpoints.searchInventory}/${encodeURIComponent(inventoryNumber)}`);
        } catch (error) {
            if (error.message.includes('404')) {
                return null; // Устройство не найдено
            }
            console.error('Ошибка поиска по инвентарному номеру:', error);
            throw error;
        }
    }

    // Импорт данных из Excel
    async importFromExcel(file) {
        try {
            // Создаем FormData для отправки файла
            const formData = new FormData();
            formData.append('file', file);

            // Отправляем файл на сервер
            const response = await fetch(this.baseURL + this.endpoints.importExcel, {
                method: 'POST',
                body: formData
                // НЕ добавляем Content-Type - браузер установит его автоматически для FormData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Ошибка сервера' }));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Ошибка импорта Excel:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Экспорт данных в формат для Excel
    async exportToExcel(type) {
        try {
            const data = await this.getByType(type);
            
            switch (type) {
                case 'computers':
                    return this.exportComputersToExcel(data);
                case 'networkDevices':
                    return this.exportNetworkToExcel(data);
                case 'otherDevices':
                    return this.exportOtherToExcel(data);
                case 'assignedDevices':
                    return this.exportAssignedToExcel(data);
                default:
                    return [];
            }
        } catch (error) {
            console.error('Ошибка экспорта данных:', error);
            return [];
        }
    }

    exportComputersToExcel(computers) {
        const headers = [
            'ID', 'Инвентарный номер', 'Корпус', 'Расположение', 'Тип устройства',
            'Модель', 'Процессор', 'ОЗУ', 'Накопитель', 'Видеокарта',
            'IP-адрес', 'Имя компьютера', 'Год', 'Статус', 'Примечания'
        ];
        
        const rows = computers.map(c => [
            c.id, c.inventoryNumber || '', c.building || '', c.location || '', c.deviceType || '',
            c.model || '', c.processor || '', c.ram || '', c.storage || '', c.graphics || '',
            c.ipAddress || '', c.computerName || '', c.year || '', c.status || '', c.notes || ''
        ]);
        
        return [headers, ...rows];
    }

    exportNetworkToExcel(devices) {
        const headers = [
            'ID', 'Тип', 'Модель', 'Корпус', 'Расположение', 'IP-адрес',
            'Логин', 'Пароль', 'WiFi сеть', 'Пароль WiFi', 'Статус', 'Примечания'
        ];
        
        const rows = devices.map(d => [
            d.id, d.type || '', d.model || '', d.building || '', d.location || '', d.ipAddress || '',
            d.login || '', d.password || '', d.wifiName || '', d.wifiPassword || '', d.status || '', d.notes || ''
        ]);
        
        return [headers, ...rows];
    }

    exportOtherToExcel(devices) {
        const headers = [
            'ID', 'Тип', 'Модель', 'Корпус', 'Расположение', 'Ответственный',
            'Инвентарный номер', 'Статус', 'Примечания'
        ];
        
        const rows = devices.map(d => [
            d.id, d.type || '', d.model || '', d.building || '', d.location || '', d.responsible || '',
            d.inventoryNumber || '', d.status || '', d.notes || ''
        ]);
        
        return [headers, ...rows];
    }

    exportAssignedToExcel(assignments) {
        const headers = [
            'ID', 'Сотрудник', 'Должность', 'Корпус', 'Устройства',
            'Дата назначения', 'Примечания'
        ];
        
        const rows = assignments.map(a => [
            a.id, a.employee || '', a.position || '', a.building || '', 
            Array.isArray(a.devices) ? a.devices.join('; ') : '',
            a.assignedDate || '', a.notes || ''
        ]);
        
        return [headers, ...rows];
    }

    // Резервное копирование
    async backup() {
        try {
            const data = {
                computers: await this.getByType('computers'),
                networkDevices: await this.getByType('networkDevices'),
                otherDevices: await this.getByType('otherDevices'),
                assignedDevices: await this.getByType('assignedDevices')
            };

            const backup = {
                timestamp: new Date().toISOString(),
                data: data
            };
            
            const dataStr = JSON.stringify(backup, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `equipment_backup_${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            URL.revokeObjectURL(url);

            return true;
        } catch (error) {
            console.error('Ошибка создания резервной копии:', error);
            throw error;
        }
    }

    // Проверка подключения к серверу
    async checkConnection() {
        try {
            await this.apiRequest('/api/stats');
            return true;
        } catch (error) {
            console.error('Нет подключения к серверу:', error);
            return false;
        }
    }

    // Нормализация типа устройства
    normalizeDeviceType(type) {
        const typeMap = {
            'компьютер': 'компьютер',
            'ноутбук': 'ноутбук',
            'нетбук': 'нетбук'
        };
        return typeMap[type.toLowerCase()] || 'компьютер';
    }

    // Определение корпуса по расположению
    determineBuilding(location) {
        if (typeof location === 'string') {
            if (location.includes('мед') || location.includes('МЕД')) {
                return 'медицинский';
            }
        }
        return 'главный';
    }
}

// Создаем глобальный экземпляр базы данных
const db = new Database();

// Проверяем подключение при загрузке
document.addEventListener('DOMContentLoaded', async function() {
    const isConnected = await db.checkConnection();
    if (!isConnected) {
        NotificationManager.error('Нет подключения к серверу. Проверьте, что сервер запущен.');
    }
});
// Утилиты и вспомогательные функции

// Класс для работы с уведомлениями
class NotificationManager {
    static show(message, type = 'info', duration = 3000) {
        // Удаляем предыдущие уведомления
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());

        // Создаем новое уведомление
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        // Показываем уведомление
        setTimeout(() => notification.classList.add('show'), 100);

        // Скрываем уведомление
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }

    static success(message, duration = 3000) {
        this.show(message, 'success', duration);
    }

    static error(message, duration = 5000) {
        this.show(message, 'error', duration);
    }

    static warning(message, duration = 4000) {
        this.show(message, 'warning', duration);
    }

    static info(message, duration = 3000) {
        this.show(message, 'info', duration);
    }
}

// Класс для работы с Excel файлами
class ExcelManager {
    // Чтение Excel файла
    static readExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                        header: 1, 
                        defval: '',
                        range: 0
                    });
                    resolve(jsonData);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = function(error) {
                reject(error);
            };
            reader.readAsArrayBuffer(file);
        });
    }

    // Создание и скачивание Excel файла
    static downloadExcel(data, filename) {
        try {
            const worksheet = XLSX.utils.aoa_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
            
            // Применяем стили к заголовкам
            const range = XLSX.utils.decode_range(worksheet['!ref']);
            for (let col = range.s.c; col <= range.e.c; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
                if (!worksheet[cellAddress]) continue;
                worksheet[cellAddress].s = {
                    font: { bold: true },
                    fill: { fgColor: { rgb: "CCCCCC" } }
                };
            }
            
            XLSX.writeFile(workbook, filename);
            return true;
        } catch (error) {
            console.error('Ошибка при создании Excel файла:', error);
            return false;
        }
    }
}

// Класс для валидации данных
class Validator {
    // Проверка IP адреса
    static isValidIP(ip) {
        const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return ipRegex.test(ip);
    }

    // Проверка даты
    static isValidDate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }

    // Проверка email
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Проверка инвентарного номера
    static isValidInventoryNumber(number) {
        return number && number.toString().trim().length > 0;
    }

    // Проверка обязательных полей
    static validateRequired(fields) {
        const errors = [];
        for (const [fieldName, value] of Object.entries(fields)) {
            if (!value || value.toString().trim() === '') {
                errors.push(`Поле "${fieldName}" обязательно для заполнения`);
            }
        }
        return errors;
    }
}

// Класс для фильтрации и поиска
class FilterManager {
    // Фильтрация массива по поисковому запросу
    static filterBySearch(items, searchTerm, searchFields) {
        if (!searchTerm || searchTerm.trim() === '') return items;
        
        const term = searchTerm.toLowerCase().trim();
        return items.filter(item => {
            return searchFields.some(field => {
                const value = this.getNestedValue(item, field);
                return value && value.toString().toLowerCase().includes(term);
            });
        });
    }

    // Фильтрация по значениям фильтров
    static filterByFilters(items, filters) {
        return items.filter(item => {
            return Object.entries(filters).every(([field, filterValue]) => {
                if (!filterValue || filterValue === '') return true;
                const itemValue = this.getNestedValue(item, field);
                return itemValue === filterValue;
            });
        });
    }

    // Получение вложенного значения из объекта
    static getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : '';
        }, obj);
    }

    // Сортировка массива
    static sortBy(items, field, direction = 'asc') {
        return [...items].sort((a, b) => {
            const aValue = this.getNestedValue(a, field);
            const bValue = this.getNestedValue(b, field);
            
            // Обработка чисел
            const aNum = parseFloat(aValue);
            const bNum = parseFloat(bValue);
            if (!isNaN(aNum) && !isNaN(bNum)) {
                return direction === 'asc' ? aNum - bNum : bNum - aNum;
            }
            
            // Обработка строк
            const aStr = aValue.toString().toLowerCase();
            const bStr = bValue.toString().toLowerCase();
            
            if (direction === 'asc') {
                return aStr.localeCompare(bStr, 'ru');
            } else {
                return bStr.localeCompare(aStr, 'ru');
            }
        });
    }
}

// Класс для работы с формами
class FormManager {
    // Получение данных из формы
    static getFormData(formId) {
        const form = document.getElementById(formId);
        if (!form) return {};

        const formData = new FormData(form);
        const data = {};
        
        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        // Дополнительно получаем данные из всех элементов формы
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (input.id) {
                const key = input.id.replace(/^(computer|network|other|assigned)/, '').toLowerCase();
                if (key) {
                    data[key] = input.value;
                }
            }
        });
        
        return data;
    }

    // Заполнение формы данными
    static fillForm(formId, data) {
        const form = document.getElementById(formId);
        if (!form) return;

        Object.entries(data).forEach(([key, value]) => {
            const input = form.querySelector(`[id*="${key}"]`);
            if (input) {
                input.value = value || '';
            }
        });
    }

    // Очистка формы
    static clearForm(formId) {
        const form = document.getElementById(formId);
        if (form) {
            form.reset();
        }
    }

    // Валидация формы
    static validateForm(formId, rules) {
        const form = document.getElementById(formId);
        if (!form) return { valid: false, errors: ['Форма не найдена'] };

        const errors = [];
        const data = this.getFormData(formId);

        Object.entries(rules).forEach(([field, rule]) => {
            const value = data[field];
            
            if (rule.required && (!value || value.trim() === '')) {
                errors.push(rule.message || `Поле "${field}" обязательно для заполнения`);
            }
            
            if (rule.pattern && value && !rule.pattern.test(value)) {
                errors.push(rule.patternMessage || `Поле "${field}" имеет неверный формат`);
            }
            
            if (rule.minLength && value && value.length < rule.minLength) {
                errors.push(`Поле "${field}" должно содержать минимум ${rule.minLength} символов`);
            }
            
            if (rule.maxLength && value && value.length > rule.maxLength) {
                errors.push(`Поле "${field}" должно содержать максимум ${rule.maxLength} символов`);
            }
        });

        return {
            valid: errors.length === 0,
            errors: errors,
            data: data
        };
    }
}

// Класс для определения статуса устройства
class StatusManager {
    static getStatus(notes) {
        if (!notes || notes.trim() === '') return 'working';
        
        const notesLower = notes.toLowerCase();
        const brokenKeywords = ['неисправ', 'сломан', 'не работает', 'поломка', 'broken'];
        const issuesKeywords = ['проблем', 'медленн', 'требует', 'нужен', 'issues', 'slow'];
        
        if (brokenKeywords.some(keyword => notesLower.includes(keyword))) {
            return 'broken';
        }
        
        if (issuesKeywords.some(keyword => notesLower.includes(keyword))) {
            return 'issues';
        }
        
        return 'working';
    }

    static getStatusText(status) {
        const statusMap = {
            'working': 'Исправен',
            'issues': 'Проблемы',
            'broken': 'Неисправен'
        };
        return statusMap[status] || 'Неизвестно';
    }

    static getStatusClass(status) {
        return `status-${status}`;
    }
}

// Класс для работы с прогресс-баром
class ProgressManager {
    static show(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.style.display = 'block';
        }
    }

    static hide(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.style.display = 'none';
        }
    }

    static update(containerId, percentage, text = '') {
        const container = document.getElementById(containerId);
        if (container) {
            const progressFill = container.querySelector('.progress-fill');
            const progressText = container.querySelector('.progress-text');
            
            if (progressFill) {
                progressFill.style.width = `${percentage}%`;
            }
            
            if (progressText && text) {
                progressText.textContent = text;
            }
        }
    }
}

// Утилиты для работы с датами
class DateUtils {
    static formatDate(date, format = 'dd.mm.yyyy') {
        if (!date) return '';
        
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        
        switch (format) {
            case 'dd.mm.yyyy':
                return `${day}.${month}.${year}`;
            case 'yyyy-mm-dd':
                return `${year}-${month}-${day}`;
            case 'dd/mm/yyyy':
                return `${day}/${month}/${year}`;
            default:
                return d.toLocaleDateString('ru-RU');
        }
    }

    static getCurrentDate(format = 'yyyy-mm-dd') {
        return this.formatDate(new Date(), format);
    }

    static addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    static diffDays(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        const timeDiff = Math.abs(d2.getTime() - d1.getTime());
        return Math.ceil(timeDiff / (1000 * 3600 * 24));
    }
}

// Утилиты для работы со строками
class StringUtils {
    static capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    static truncate(str, length = 50) {
        if (!str || str.length <= length) return str;
        return str.substring(0, length) + '...';
    }

    static escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    static removeExtraSpaces(str) {
        if (!str) return '';
        return str.replace(/\s+/g, ' ').trim();
    }

    static formatInventoryNumber(number) {
        if (!number) return '';
        return number.toString().toUpperCase().trim();
    }
}

// Утилиты для работы с массивами
class ArrayUtils {
    static unique(array, key = null) {
        if (!key) {
            return [...new Set(array)];
        }
        
        const seen = new Map();
        return array.filter(item => {
            const value = FilterManager.getNestedValue(item, key);
            if (seen.has(value)) {
                return false;
            }
            seen.set(value, true);
            return true;
        });
    }

    static groupBy(array, key) {
        return array.reduce((groups, item) => {
            const value = FilterManager.getNestedValue(item, key);
            if (!groups[value]) {
                groups[value] = [];
            }
            groups[value].push(item);
            return groups;
        }, {});
    }

    static sortByMultiple(array, sortKeys) {
        return [...array].sort((a, b) => {
            for (const { key, direction = 'asc' } of sortKeys) {
                const aValue = FilterManager.getNestedValue(a, key);
                const bValue = FilterManager.getNestedValue(b, key);
                
                let comparison = 0;
                if (aValue < bValue) comparison = -1;
                if (aValue > bValue) comparison = 1;
                
                if (comparison !== 0) {
                    return direction === 'asc' ? comparison : -comparison;
                }
            }
            return 0;
        });
    }
}

// Утилиты для работы с localStorage
class StorageUtils {
    static setItem(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Ошибка при сохранении в localStorage:', error);
            return false;
        }
    }

    static getItem(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Ошибка при чтении из localStorage:', error);
            return defaultValue;
        }
    }

    static removeItem(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Ошибка при удалении из localStorage:', error);
            return false;
        }
    }

    static clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Ошибка при очистке localStorage:', error);
            return false;
        }
    }
}

// Глобальные утилиты
window.NotificationManager = NotificationManager;
window.ExcelManager = ExcelManager;
window.Validator = Validator;
window.FilterManager = FilterManager;
window.FormManager = FormManager;
window.StatusManager = StatusManager;
window.ProgressManager = ProgressManager;
window.DateUtils = DateUtils;
window.StringUtils = StringUtils;
window.ArrayUtils = ArrayUtils;
window.StorageUtils = StorageUtils;
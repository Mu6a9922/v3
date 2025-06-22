const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Настройка multer для загрузки файлов
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Настройки подключения к базе данных
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'equipment_management',
    charset: 'utf8mb4',
    acquireTimeout: 60000,
    timeout: 60000
};

// Создание пула соединений
let pool = null;

// Безопасная инициализация пула
async function createPool() {
    try {
        pool = mysql.createPool({
            ...dbConfig,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
        
        // Тестируем подключение
        const connection = await pool.getConnection();
        await connection.ping();
        connection.release();
        
        console.log('✅ Подключение к MySQL установлено');
        return true;
    } catch (error) {
        console.error('❌ Ошибка подключения к MySQL:', error.message);
        console.log('📝 Убедитесь что:');
        console.log('   - MySQL сервер запущен');
        console.log('   - База данных equipment_management создана');
        console.log('   - Настройки подключения корректны');
        return false;
    }
}

// Инициализация базы данных
async function initDatabase() {
    if (!pool) {
        console.log('⚠️ Пул соединений не создан, пропускаем инициализацию БД');
        return false;
    }
    
    try {
        const connection = await pool.getConnection();
        
        console.log('🔧 Создание таблиц...');
        
        // Создание таблицы компьютеров
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS computers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                inventory_number VARCHAR(100),
                building ENUM('главный', 'медицинский') NOT NULL,
                location VARCHAR(255) NOT NULL,
                device_type ENUM('компьютер', 'ноутбук', 'нетбук') NOT NULL,
                model VARCHAR(255),
                processor VARCHAR(255),
                ram VARCHAR(255),
                storage VARCHAR(255),
                graphics VARCHAR(255),
                ip_address VARCHAR(45),
                computer_name VARCHAR(255),
                year VARCHAR(10),
                notes TEXT,
                status ENUM('working', 'issues', 'broken') DEFAULT 'working',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_inventory (inventory_number),
                INDEX idx_building (building),
                INDEX idx_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Создание таблицы сетевых устройств
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS network_devices (
                id INT AUTO_INCREMENT PRIMARY KEY,
                type ENUM('роутер', 'свитч', 'точка доступа') NOT NULL,
                model VARCHAR(255) NOT NULL,
                building ENUM('главный', 'медицинский') NOT NULL,
                location VARCHAR(255) NOT NULL,
                ip_address VARCHAR(45) NOT NULL,
                login VARCHAR(255),
                password VARCHAR(255),
                wifi_name VARCHAR(255),
                wifi_password VARCHAR(255),
                notes TEXT,
                status ENUM('working', 'issues', 'broken') DEFAULT 'working',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_building (building),
                INDEX idx_type (type),
                INDEX idx_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Создание таблицы другой техники
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS other_devices (
                id INT AUTO_INCREMENT PRIMARY KEY,
                type ENUM('принтер', 'проектор', 'монитор', 'МФУ', 'другое') NOT NULL,
                model VARCHAR(255) NOT NULL,
                building ENUM('главный', 'медицинский') NOT NULL,
                location VARCHAR(255) NOT NULL,
                responsible VARCHAR(255),
                inventory_number VARCHAR(100),
                notes TEXT,
                status ENUM('working', 'issues', 'broken') DEFAULT 'working',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_inventory (inventory_number),
                INDEX idx_building (building),
                INDEX idx_type (type),
                INDEX idx_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Создание таблицы назначенных устройств
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS assigned_devices (
                id INT AUTO_INCREMENT PRIMARY KEY,
                employee VARCHAR(255) NOT NULL,
                position VARCHAR(255) NOT NULL,
                building ENUM('главный', 'медицинский') NOT NULL,
                devices TEXT NOT NULL,
                assigned_date DATE NOT NULL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_building (building),
                INDEX idx_employee (employee),
                INDEX idx_assigned_date (assigned_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Создание таблицы импортированных данных
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS imported_computers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                inventory_number VARCHAR(100),
                location VARCHAR(255),
                device_type VARCHAR(100),
                model VARCHAR(255),
                screen VARCHAR(50),
                os VARCHAR(255),
                processor VARCHAR(255),
                cores VARCHAR(50),
                ram VARCHAR(255),
                storage VARCHAR(255),
                graphics VARCHAR(255),
                year VARCHAR(10),
                building ENUM('главный', 'медицинский') DEFAULT 'главный',
                status ENUM('working', 'issues', 'broken') DEFAULT 'working',
                imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_inventory (inventory_number)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        // Создание таблицы истории изменений
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS device_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                device_table VARCHAR(50) NOT NULL,
                device_id INT NOT NULL,
                action VARCHAR(50) NOT NULL,
                details TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_table (device_table),
                INDEX idx_device (device_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        connection.release();
        console.log('✅ Таблицы созданы успешно');
        return true;
    } catch (error) {
        console.error('❌ Ошибка создания таблиц:', error);
        return false;
    }
}

// Функция для определения статуса по примечаниям
function getStatusFromNotes(notes) {
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

// Проверка, занят ли IP-адрес
async function isIPInUse(ip, excludeTable = null, excludeId = null) {
    if (!ip) return false;
    const connection = await pool.getConnection();
    try {
        let [rows] = await connection.execute(
            `SELECT id FROM computers WHERE ip_address = ?${excludeTable === 'computers' ? ' AND id <> ?' : ''}`,
            excludeTable === 'computers' ? [ip, excludeId] : [ip]
        );
        if (rows.length > 0) return true;

        [rows] = await connection.execute(
            `SELECT id FROM network_devices WHERE ip_address = ?${excludeTable === 'network_devices' ? ' AND id <> ?' : ''}`,
            excludeTable === 'network_devices' ? [ip, excludeId] : [ip]
        );
        if (rows.length > 0) return true;

        return false;
    } finally {
        connection.release();
    }
}

// Добавление записи в историю изменений

async function addHistory(table, id, action, beforeData = null, afterData = null) {
    if (!pool) return;
    try {
        const connection = await pool.getConnection();
        const details = JSON.stringify({ before: beforeData, after: afterData });

        await connection.execute(
            'INSERT INTO device_history (device_table, device_id, action, details) VALUES (?, ?, ?, ?)',
            [table, id, action, details]
        );
        connection.release();
    } catch (error) {
        console.error('Ошибка записи истории:', error.message);
    }
}

// Middleware для проверки подключения к БД
const checkDB = (req, res, next) => {
    if (!pool) {
        return res.status(503).json({ 
            error: 'База данных недоступна',
            message: 'Сервер работает без подключения к базе данных'
        });
    }
    next();
};

// === API ENDPOINTS ===

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Проверка здоровья сервера
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok',
        database: pool ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// Добавим endpoint для получения импортированных данных
app.get('/api/imported-computers', checkDB, async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.execute('SELECT * FROM imported_computers ORDER BY id DESC LIMIT 50');
        connection.release();
        
        const computers = rows.map(row => ({
            id: row.id,
            inventoryNumber: row.inventory_number,
            building: row.building,
            location: row.location,
            deviceType: row.device_type,
            model: row.model,
            screen: row.screen,
            os: row.os,
            processor: row.processor,
            cores: row.cores,
            ram: row.ram,
            storage: row.storage,
            graphics: row.graphics,
            year: row.year,
            status: row.status,
            importedAt: row.imported_at
        }));
        
        res.json(computers);
    } catch (error) {
        console.error('Ошибка получения импортированных компьютеров:', error);
        res.status(500).json({ error: 'Ошибка получения импортированных компьютеров' });
    }
});

// Endpoint для переноса данных из imported_computers в computers
app.post('/api/migrate-imported', checkDB, async (req, res) => {
    try {
        const connection = await pool.getConnection();
        
        // Получаем все импортированные данные
        const [importedRows] = await connection.execute('SELECT * FROM imported_computers');
        
        let migratedCount = 0;
        const errors = [];
        
        try {
            await connection.beginTransaction();
            
            for (const row of importedRows) {
                try {
                    // Проверяем есть ли уже такая запись в основной таблице
                    const [existing] = await connection.execute(
                        'SELECT id FROM computers WHERE inventory_number = ? AND inventory_number IS NOT NULL',
                        [row.inventory_number]
                    );
                    
                    if (existing.length > 0) {
                        errors.push(`Компьютер с инвентарным номером ${row.inventory_number} уже существует`);
                        continue;
                    }
                    
                    // Переносим в основную таблицу
                    await connection.execute(
                        `INSERT INTO computers 
                         (inventory_number, building, location, device_type, model, processor, ram, storage, graphics, year, status, notes)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            row.inventory_number,
                            row.building,
                            row.location,
                            row.device_type,
                            row.model,
                            row.processor,
                            row.ram,
                            row.storage, 
                            row.graphics,
                            row.year,
                            row.status || 'working',
                            `Импортировано из Excel (${row.imported_at})`
                        ]
                    );
                    migratedCount++;
                } catch (rowError) {
                    errors.push(`Ошибка переноса строки ID ${row.id}: ${rowError.message}`);
                }
            }
            
            await connection.commit();
            
            res.json({
                success: true,
                migratedCount: migratedCount,
                totalImported: importedRows.length,
                errors: errors.slice(0, 10)
            });
            
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
        
    } catch (error) {
        console.error('Ошибка миграции данных:', error);
        res.status(500).json({ error: 'Ошибка миграции данных' });
    }
});

// Получение статистики (обновляем чтобы включить импортированные данные)
app.get('/api/stats', checkDB, async (req, res) => {
    try {
        const connection = await pool.getConnection();
        
        const [computers] = await connection.execute('SELECT COUNT(*) as count FROM computers');
        const [networkDevices] = await connection.execute('SELECT COUNT(*) as count FROM network_devices');
        const [otherDevices] = await connection.execute('SELECT COUNT(*) as count FROM other_devices');
        const [assignedDevices] = await connection.execute('SELECT COUNT(*) as count FROM assigned_devices');
        const [importedComputers] = await connection.execute('SELECT COUNT(*) as count FROM imported_computers');
        
        connection.release();
        
        res.json({
            computers: computers[0].count,
            network: networkDevices[0].count,
            other: otherDevices[0].count,
            assigned: assignedDevices[0].count,
            imported: importedComputers[0].count
        });
    } catch (error) {
        console.error('Ошибка получения статистики:', error);
        res.status(500).json({ error: 'Ошибка получения статистики' });
    }
});

// === КОМПЬЮТЕРЫ ===

// Получение всех компьютеров
app.get('/api/computers', checkDB, async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.execute('SELECT * FROM computers ORDER BY id DESC');
        connection.release();
        
        // Преобразуем snake_case в camelCase для фронтенда
        const computers = rows.map(row => ({
            id: row.id,
            inventoryNumber: row.inventory_number,
            building: row.building,
            location: row.location,
            deviceType: row.device_type,
            model: row.model,
            processor: row.processor,
            ram: row.ram,
            storage: row.storage,
            graphics: row.graphics,
            ipAddress: row.ip_address,
            computerName: row.computer_name,
            year: row.year,
            notes: row.notes,
            status: row.status
        }));
        
        res.json(computers);
    } catch (error) {
        console.error('Ошибка получения компьютеров:', error);
        res.status(500).json({ error: 'Ошибка получения компьютеров' });
    }
});

// Добавление компьютера
app.post('/api/computers', checkDB, async (req, res) => {
    try {
        const {
            inventoryNumber, building, location, deviceType, model,
            processor, ram, storage, graphics, ipAddress, computerName, year, notes, status: reqStatus
        } = req.body;

        // Валидация обязательных полей
        if (!building || !location || !deviceType) {
            return res.status(400).json({ 
                error: 'Отсутствуют обязательные поля: building, location, deviceType' 
            });
        }

        // Определяем статус
        const status = reqStatus || getStatusFromNotes(notes);

        if (ipAddress) {
            const inUse = await isIPInUse(ipAddress);
            if (inUse) {
                return res.status(400).json({ error: 'IP-адрес уже используется другим устройством' });
            }
        }

        const connection = await pool.getConnection();
        const [result] = await connection.execute(
            `INSERT INTO computers (
                inventory_number, building, location, device_type, model,
                processor, ram, storage, graphics, ip_address, computer_name, year, notes, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [inventoryNumber || null, building, location, deviceType, model || null,
             processor || null, ram || null, storage || null, graphics || null, 
             ipAddress || null, computerName || null, year || null, notes || null, status]
        );
        connection.release();


        await addHistory('computers', result.insertId, 'create', null, req.body);


        res.json({ id: result.insertId, message: 'Компьютер добавлен успешно' });
    } catch (error) {
        console.error('Ошибка добавления компьютера:', error);
        res.status(500).json({ error: 'Ошибка добавления компьютера' });
    }
});

// Обновление компьютера
app.put('/api/computers/:id', checkDB, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            inventoryNumber, building, location, deviceType, model,
            processor, ram, storage, graphics, ipAddress, computerName, year, notes, status: reqStatus
        } = req.body;

        // Валидация обязательных полей
        if (!building || !location || !deviceType) {
            return res.status(400).json({ 
                error: 'Отсутствуют обязательные поля: building, location, deviceType' 
            });
        }

        const status = reqStatus || getStatusFromNotes(notes);

        if (ipAddress) {
            const inUse = await isIPInUse(ipAddress, 'computers', id);
            if (inUse) {
                return res.status(400).json({ error: 'IP-адрес уже используется другим устройством' });
            }
        }

        const connection = await pool.getConnection();
        const [oldRows] = await connection.execute('SELECT * FROM computers WHERE id = ?', [id]);
        await connection.execute(
            `UPDATE computers SET
                inventory_number = ?, building = ?, location = ?, device_type = ?, model = ?,
                processor = ?, ram = ?, storage = ?, graphics = ?, ip_address = ?,
                computer_name = ?, year = ?, notes = ?, status = ?
            WHERE id = ?`,
            [inventoryNumber || null, building, location, deviceType, model || null,
             processor || null, ram || null, storage || null, graphics || null,
             ipAddress || null, computerName || null, year || null, notes || null, status, id]
        );
        connection.release();


        await addHistory('computers', id, 'update', oldRows[0] || null, req.body);


        res.json({ message: 'Компьютер обновлен успешно' });
    } catch (error) {
        console.error('Ошибка обновления компьютера:', error);
        res.status(500).json({ error: 'Ошибка обновления компьютера' });
    }
});

// Удаление компьютера
app.delete('/api/computers/:id', checkDB, async (req, res) => {
    try {
        const { id } = req.params;
        const connection = await pool.getConnection();
        const [oldRows] = await connection.execute('SELECT * FROM computers WHERE id = ?', [id]);
        await connection.execute('DELETE FROM computers WHERE id = ?', [id]);
        connection.release();

        await addHistory('computers', id, 'delete', oldRows[0] || null, null);


        res.json({ message: 'Компьютер удален успешно' });
    } catch (error) {
        console.error('Ошибка удаления компьютера:', error);
        res.status(500).json({ error: 'Ошибка удаления компьютера' });
    }
});

// === СЕТЕВЫЕ УСТРОЙСТВА ===

app.get('/api/network-devices', checkDB, async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.execute('SELECT * FROM network_devices ORDER BY id DESC');
        connection.release();
        
        const devices = rows.map(row => ({
            id: row.id,
            type: row.type,
            model: row.model,
            building: row.building,
            location: row.location,
            ipAddress: row.ip_address,
            login: row.login,
            password: row.password,
            wifiName: row.wifi_name,
            wifiPassword: row.wifi_password,
            notes: row.notes,
            status: row.status
        }));
        
        res.json(devices);
    } catch (error) {
        console.error('Ошибка получения сетевых устройств:', error);
        res.status(500).json({ error: 'Ошибка получения сетевых устройств' });
    }
});

app.post('/api/network-devices', checkDB, async (req, res) => {
    try {
        const {
            type, model, building, location, ipAddress, login, password,
            wifiName, wifiPassword, notes, status: reqStatus
        } = req.body;

        // Валидация обязательных полей
        if (!type || !model || !building || !location || !ipAddress) {
            return res.status(400).json({ 
                error: 'Отсутствуют обязательные поля' 
            });
        }

        const status = reqStatus || getStatusFromNotes(notes);

        if (ipAddress) {
            const inUse = await isIPInUse(ipAddress);
            if (inUse) {
                return res.status(400).json({ error: 'IP-адрес уже используется другим устройством' });
            }
        }

        const connection = await pool.getConnection();
        const [result] = await connection.execute(
            `INSERT INTO network_devices (
                type, model, building, location, ip_address, login, password,
                wifi_name, wifi_password, notes, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [type, model, building, location, ipAddress, login || null, password || null,
             wifiName || null, wifiPassword || null, notes || null, status]
        );
        connection.release();


        await addHistory('network_devices', result.insertId, 'create', null, req.body);


        res.json({ id: result.insertId, message: 'Сетевое устройство добавлено успешно' });
    } catch (error) {
        console.error('Ошибка добавления сетевого устройства:', error);
        res.status(500).json({ error: 'Ошибка добавления сетевого устройства' });
    }
});

app.put('/api/network-devices/:id', checkDB, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            type, model, building, location, ipAddress, login, password,
            wifiName, wifiPassword, notes, status: reqStatus
        } = req.body;

        if (!type || !model || !building || !location || !ipAddress) {
            return res.status(400).json({ 
                error: 'Отсутствуют обязательные поля' 
            });
        }

        const status = reqStatus || getStatusFromNotes(notes);

        if (ipAddress) {
            const inUse = await isIPInUse(ipAddress, 'network_devices', id);
            if (inUse) {
                return res.status(400).json({ error: 'IP-адрес уже используется другим устройством' });
            }
        }

        const connection = await pool.getConnection();
        const [oldRows] = await connection.execute('SELECT * FROM network_devices WHERE id = ?', [id]);
        await connection.execute(
            `UPDATE network_devices SET
                type = ?, model = ?, building = ?, location = ?, ip_address = ?,
                login = ?, password = ?, wifi_name = ?, wifi_password = ?, notes = ?, status = ?
            WHERE id = ?`,
            [type, model, building, location, ipAddress, login || null, password || null,
             wifiName || null, wifiPassword || null, notes || null, status, id]
        );
        connection.release();


        await addHistory('network_devices', id, 'update', oldRows[0] || null, req.body);


        res.json({ message: 'Сетевое устройство обновлено успешно' });
    } catch (error) {
        console.error('Ошибка обновления сетевого устройства:', error);
        res.status(500).json({ error: 'Ошибка обновления сетевого устройства' });
    }
});

app.delete('/api/network-devices/:id', checkDB, async (req, res) => {
    try {
        const { id } = req.params;
        const connection = await pool.getConnection();
        const [oldRows] = await connection.execute('SELECT * FROM network_devices WHERE id = ?', [id]);
        await connection.execute('DELETE FROM network_devices WHERE id = ?', [id]);
        connection.release();


        await addHistory('network_devices', id, 'delete', oldRows[0] || null, null);


        res.json({ message: 'Сетевое устройство удалено успешно' });
    } catch (error) {
        console.error('Ошибка удаления сетевого устройства:', error);
        res.status(500).json({ error: 'Ошибка удаления сетевого устройства' });
    }
});

// === ДРУГАЯ ТЕХНИКА ===

app.get('/api/other-devices', checkDB, async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.execute('SELECT * FROM other_devices ORDER BY id DESC');
        connection.release();
        
        const devices = rows.map(row => ({
            id: row.id,
            type: row.type,
            model: row.model,
            building: row.building,
            location: row.location,
            responsible: row.responsible,
            inventoryNumber: row.inventory_number,
            notes: row.notes,
            status: row.status
        }));
        
        res.json(devices);
    } catch (error) {
        console.error('Ошибка получения другой техники:', error);
        res.status(500).json({ error: 'Ошибка получения другой техники' });
    }
});

app.post('/api/other-devices', checkDB, async (req, res) => {
    try {
        const {
            type, model, building, location, responsible, inventoryNumber, notes, status: reqStatus
        } = req.body;

        // Валидация обязательных полей
        if (!type || !model || !building || !location) {
            return res.status(400).json({ 
                error: 'Отсутствуют обязательные поля' 
            });
        }

        const status = reqStatus || getStatusFromNotes(notes);

        const connection = await pool.getConnection();
        const [result] = await connection.execute(
            `INSERT INTO other_devices (
                type, model, building, location, responsible, inventory_number, notes, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [type, model, building, location, responsible || null, inventoryNumber || null, notes || null, status]
        );
        connection.release();

        await addHistory('other_devices', result.insertId, 'create', null, req.body);


        res.json({ id: result.insertId, message: 'Устройство добавлено успешно' });
    } catch (error) {
        console.error('Ошибка добавления устройства:', error);
        res.status(500).json({ error: 'Ошибка добавления устройства' });
    }
});

app.put('/api/other-devices/:id', checkDB, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            type, model, building, location, responsible, inventoryNumber, notes, status: reqStatus
        } = req.body;

        if (!type || !model || !building || !location) {
            return res.status(400).json({ 
                error: 'Отсутствуют обязательные поля' 
            });
        }

        const status = reqStatus || getStatusFromNotes(notes);

        const connection = await pool.getConnection();
        const [oldRows] = await connection.execute('SELECT * FROM other_devices WHERE id = ?', [id]);
        await connection.execute(
            `UPDATE other_devices SET
                type = ?, model = ?, building = ?, location = ?, responsible = ?,
                inventory_number = ?, notes = ?, status = ?
            WHERE id = ?`,
            [type, model, building, location, responsible || null, inventoryNumber || null, notes || null, status, id]
        );
        connection.release();

        await addHistory('other_devices', id, 'update', oldRows[0] || null, req.body);


        res.json({ message: 'Устройство обновлено успешно' });
    } catch (error) {
        console.error('Ошибка обновления устройства:', error);
        res.status(500).json({ error: 'Ошибка обновления устройства' });
    }
});

app.delete('/api/other-devices/:id', checkDB, async (req, res) => {
    try {
        const { id } = req.params;
        const connection = await pool.getConnection();
        const [oldRows] = await connection.execute('SELECT * FROM other_devices WHERE id = ?', [id]);
        await connection.execute('DELETE FROM other_devices WHERE id = ?', [id]);
        connection.release();


        await addHistory('other_devices', id, 'delete', oldRows[0] || null, null);


        res.json({ message: 'Устройство удалено успешно' });
    } catch (error) {
        console.error('Ошибка удаления устройства:', error);
        res.status(500).json({ error: 'Ошибка удаления устройства' });
    }
});

// === НАЗНАЧЕННЫЕ УСТРОЙСТВА ===

app.get('/api/assigned-devices', checkDB, async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.execute('SELECT * FROM assigned_devices ORDER BY id DESC');
        connection.release();
        
        const devices = rows.map(row => ({
            id: row.id,
            employee: row.employee,
            position: row.position,
            building: row.building,
            devices: JSON.parse(row.devices || '[]'),
            assignedDate: row.assigned_date,
            notes: row.notes
        }));
        
        res.json(devices);
    } catch (error) {
        console.error('Ошибка получения назначенных устройств:', error);
        res.status(500).json({ error: 'Ошибка получения назначенных устройств' });
    }
});

app.post('/api/assigned-devices', checkDB, async (req, res) => {
    try {
        const {
            employee, position, building, devices, assignedDate, notes
        } = req.body;

        // Валидация обязательных полей
        if (!employee || !position || !building || !devices || !assignedDate) {
            return res.status(400).json({ 
                error: 'Отсутствуют обязательные поля' 
            });
        }

        // Преобразуем массив устройств в JSON строку
        const devicesJson = Array.isArray(devices) ? JSON.stringify(devices) : JSON.stringify([devices]);

        const connection = await pool.getConnection();
        const [result] = await connection.execute(
            `INSERT INTO assigned_devices (
                employee, position, building, devices, assigned_date, notes
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [employee, position, building, devicesJson, assignedDate, notes || null]
        );
        connection.release();


        await addHistory('assigned_devices', result.insertId, 'create', null, req.body);


        res.json({ id: result.insertId, message: 'Устройство назначено успешно' });
    } catch (error) {
        console.error('Ошибка назначения устройства:', error);
        res.status(500).json({ error: 'Ошибка назначения устройства' });
    }
});

app.put('/api/assigned-devices/:id', checkDB, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            employee, position, building, devices, assignedDate, notes
        } = req.body;

        if (!employee || !position || !building || !devices || !assignedDate) {
            return res.status(400).json({ 
                error: 'Отсутствуют обязательные поля' 
            });
        }

        const devicesJson = Array.isArray(devices) ? JSON.stringify(devices) : JSON.stringify([devices]);

        const connection = await pool.getConnection();
        const [oldRows] = await connection.execute('SELECT * FROM assigned_devices WHERE id = ?', [id]);
        await connection.execute(
            `UPDATE assigned_devices SET
                employee = ?, position = ?, building = ?, devices = ?, assigned_date = ?, notes = ?
            WHERE id = ?`,
            [employee, position, building, devicesJson, assignedDate, notes || null, id]
        );
        connection.release();


        await addHistory('assigned_devices', id, 'update', oldRows[0] || null, req.body);


        res.json({ message: 'Назначение обновлено успешно' });
    } catch (error) {
        console.error('Ошибка обновления назначения:', error);
        res.status(500).json({ error: 'Ошибка обновления назначения' });
    }
});

app.delete('/api/assigned-devices/:id', checkDB, async (req, res) => {
    try {
        const { id } = req.params;
        const connection = await pool.getConnection();
        const [oldRows] = await connection.execute('SELECT * FROM assigned_devices WHERE id = ?', [id]);
        await connection.execute('DELETE FROM assigned_devices WHERE id = ?', [id]);
        connection.release();


        await addHistory('assigned_devices', id, 'delete', oldRows[0] || null, null);


        res.json({ message: 'Назначение удалено успешно' });
    } catch (error) {
        console.error('Ошибка удаления назначения:', error);
        res.status(500).json({ error: 'Ошибка удаления назначения' });
    }
});

// === ИСТОРИЯ ИЗМЕНЕНИЙ ===
app.get('/api/history', checkDB, async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.execute('SELECT * FROM device_history ORDER BY id DESC LIMIT 100');
        connection.release();


        const history = rows.map(r => {
            let detailsObj = {};
            try {
                detailsObj = JSON.parse(r.details || '{}');
            } catch (_) {}
            const info = detailsObj.after || detailsObj.before || {};
            const inventoryNumber = info.inventoryNumber || info.inventory_number || '';
            let name = info.model || info.computer_name || info.computerName || info.employee || '';
            if (!name) {
                name = info.type || info.deviceType || '';
            }

            return {
                id: r.id,
                table: r.device_table,
                deviceId: r.device_id,
                inventoryNumber,
                name,
                action: r.action,
                details: detailsObj,
                timestamp: r.timestamp
            };
        });


        res.json(history);
    } catch (error) {
        console.error('Ошибка получения истории:', error);
        res.status(500).json({ error: 'Ошибка получения истории' });
    }
});

// === ПОИСК ПО ИНВЕНТАРНОМУ НОМЕРУ ===

app.get('/api/search-inventory/:number', checkDB, async (req, res) => {
    try {
        const { number } = req.params;
        const connection = await pool.getConnection();
        
        // Поиск в компьютерах
        const [computers] = await connection.execute(
            'SELECT *, "computers" as source_table FROM computers WHERE inventory_number = ?',
            [number]
        );
        
        // Поиск в другой технике
        const [otherDevices] = await connection.execute(
            'SELECT *, "other_devices" as source_table FROM other_devices WHERE inventory_number = ?',
            [number]
        );
        
        // Поиск в импортированных данных
        const [importedComputers] = await connection.execute(
            'SELECT *, "imported_computers" as source_table FROM imported_computers WHERE inventory_number = ?',
            [number]
        );
        
        connection.release();
        
        const allResults = [...computers, ...otherDevices, ...importedComputers];
        
        if (allResults.length > 0) {
            const result = allResults[0];
            let formattedResult;
            
            if (result.source_table === 'computers') {
                formattedResult = {
                    type: 'computers',
                    data: {
                        inventoryNumber: result.inventory_number,
                        building: result.building,
                        location: result.location,
                        deviceType: result.device_type,
                        model: result.model,
                        processor: result.processor,
                        ram: result.ram,
                        storage: result.storage,
                        graphics: result.graphics,
                        year: result.year
                    }
                };
            } else if (result.source_table === 'imported_computers') {
                formattedResult = {
                    type: 'importedComputers',
                    data: {
                        inventoryNumber: result.inventory_number,
                        location: result.location,
                        deviceType: result.device_type,
                        model: result.model,
                        processor: result.processor,
                        ram: result.ram,
                        storage: result.storage,
                        graphics: result.graphics,
                        year: result.year,
                        building: result.building
                    }
                };
            } else {
                formattedResult = {
                    type: 'otherDevices',
                    data: {
                        inventoryNumber: result.inventory_number,
                        type: result.type,
                        model: result.model,
                        building: result.building,
                        location: result.location
                    }
                };
            }
            
            res.json(formattedResult);
        } else {
            res.status(404).json({ message: 'Устройство не найдено' });
        }
    } catch (error) {
        console.error('Ошибка поиска по инвентарному номеру:', error);
        res.status(500).json({ error: 'Ошибка поиска' });
    }
});

// === ИМПОРТ EXCEL ===

app.post('/api/import-excel', upload.single('file'), async (req, res) => {
    try {
        console.log('🔄 Начинается импорт Excel файла...');
        
        if (!req.file) {
            console.error('❌ Файл не загружен');
            return res.status(400).json({ error: 'Файл не загружен' });
        }

        console.log('📄 Файл загружен:', {
            originalname: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype
        });

        if (!pool) {
            console.error('❌ База данных недоступна');
            return res.status(503).json({ error: 'База данных недоступна' });
        }

        // Проверяем тип файла
        const allowedTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-excel', // .xls
            'application/octet-stream' // некоторые браузеры могут отправлять этот тип
        ];

        if (!allowedTypes.includes(req.file.mimetype)) {
            console.error('❌ Неподдерживаемый тип файла:', req.file.mimetype);
            return res.status(400).json({ 
                error: 'Неподдерживаемый тип файла. Поддерживаются только .xlsx и .xls файлы' 
            });
        }

        let workbook, jsonData;
        
        try {
            console.log('📊 Обработка Excel файла...');
            workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
            
            if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                throw new Error('Excel файл не содержит листов');
            }
            
            const firstSheetName = workbook.SheetNames[0];
            console.log('📋 Обрабатываем лист:', firstSheetName);
            
            const worksheet = workbook.Sheets[firstSheetName];
            jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
            
            console.log('📊 Количество строк в файле:', jsonData.length);
            
        } catch (xlsxError) {
            console.error('❌ Ошибка обработки Excel файла:', xlsxError);
            return res.status(400).json({ 
                error: 'Ошибка чтения Excel файла: ' + xlsxError.message 
            });
        }

        const connection = await pool.getConnection();
        let importedCount = 0;
        const errors = [];

        try {
            await connection.beginTransaction();
            console.log('🔄 Начинаем импорт записей...');

            for (let i = 3; i < jsonData.length; i++) { // Пропускаем заголовки (строки 0, 1, 2)
                const row = jsonData[i];
                
                // Проверяем что строка не пустая
                if (!row || row.length === 0 || !row[0] || row[0] === '') {
                    continue;
                }

                try {
                    // Очищаем и нормализуем данные
                    const inventoryNumber = normalizeInventoryNumber(row[1]);
                    const location = cleanString(row[2]);
                    const deviceType = normalizeDeviceType(row[3]);
                    const model = cleanString(row[4]);
                    const building = determineBuilding(location);
                    
                    // Проверяем обязательные поля
                    if (!location || !deviceType) {
                        errors.push(`Строка ${i}: отсутствуют обязательные поля (расположение или тип устройства)`);
                        continue;
                    }
                    
                    console.log(`📝 Импортируем строку ${i}: ${inventoryNumber || 'без инв.номера'} - ${deviceType} в ${location}`);
                    
                    await connection.execute(
                        `INSERT INTO imported_computers 
                         (inventory_number, location, device_type, model, screen, os, processor, cores, ram, storage, graphics, year, building, status)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            inventoryNumber,                    // inventory_number
                            location,                          // location  
                            deviceType,                        // device_type
                            model,                            // model
                            cleanString(row[5]),              // screen
                            cleanString(row[6]),              // os
                            cleanString(row[7]),              // processor
                            cleanString(row[8]),              // cores
                            cleanString(row[9]),              // ram
                            cleanString(row[10]),             // storage
                            cleanString(row[11]),             // graphics
                            cleanString(row[12]),             // year
                            building,                         // building
                            'working'                         // status
                        ]
                    );
                    importedCount++;
                } catch (rowError) {
                    console.error(`❌ Ошибка импорта строки ${i}:`, rowError.message);
                    errors.push(`Строка ${i}: ${rowError.message}`);
                    
                    // Если ошибок слишком много, прерываем
                    if (errors.length > 50) { // Увеличили лимит ошибок
                        console.log(`⚠️ Достигнуто максимальное количество ошибок (${errors.length}), прерываем импорт`);
                        break;
                    }
                }
            }

            await connection.commit();
            console.log(`✅ Импорт завершен: ${importedCount} записей импортировано из ${jsonData.length - 3} обработанных`);
            
            const response = { 
                success: true, 
                count: importedCount,
                totalRows: jsonData.length - 3,
                processedRows: importedCount + errors.length
            };
            
            if (errors.length > 0) {
                response.warnings = errors.slice(0, 10); // Показываем только первые 10 ошибок
                response.warningCount = errors.length;
                
                if (errors.length > 10) {
                    response.warnings.push(`... и еще ${errors.length - 10} ошибок`);
                }
                
                response.message = `Импортировано ${importedCount} записей с ${errors.length} предупреждениями`;
            } else {
                response.message = `Успешно импортировано ${importedCount} записей`;
            }
            
            res.json(response);
            
        } catch (error) {
            await connection.rollback();
            console.error('❌ Ошибка транзакции импорта:', error);
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('❌ Общая ошибка импорта Excel:', error);
        res.status(500).json({ 
            error: 'Ошибка при импорте данных: ' + error.message,
            details: error.stack
        });
    }
});

// Вспомогательные функции для импорта
function normalizeDeviceType(type) {
    if (!type) return 'компьютер';
    
    const typeStr = type.toString().toLowerCase().trim();
    const typeMap = {
        'компьютер': 'компьютер',
        'ноутбук': 'ноутбук', 
        'нетбук': 'нетбук'
    };
    
    // Ищем точное соответствие
    if (typeMap[typeStr]) {
        return typeMap[typeStr];
    }
    
    // Ищем частичное соответствие
    if (typeStr.includes('ноутбук')) return 'ноутбук';
    if (typeStr.includes('нетбук')) return 'нетбук';
    if (typeStr.includes('компьютер')) return 'компьютер';
    
    // По умолчанию
    return 'компьютер';
}

function determineBuilding(location) {
    if (!location) return 'главный';
    
    const locationStr = location.toString().toLowerCase();
    if (locationStr.includes('мед') || locationStr.includes('МЕД')) {
        return 'медицинский';
    }
    return 'главный';
}

function cleanString(str) {
    if (!str) return null;
    const cleaned = str.toString().trim();
    return cleaned === '' ? null : cleaned;
}

function normalizeInventoryNumber(number) {
    if (!number) return null;
    
    const numberStr = number.toString().trim();
    
    // Пропускаем явно некорректные значения
    if (numberStr === '' || 
        numberStr.toLowerCase().includes('видеонаблюдение') ||
        numberStr.toLowerCase().includes('раздевалка')) {
        return null;
    }
    
    return numberStr;
}

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('Необработанная ошибка:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// 404 для API
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint не найден' });
});

// Запуск сервера
async function startServer() {
    try {
        console.log('🚀 Запуск сервера...');
        
        // Пытаемся подключиться к БД
        const dbConnected = await createPool();
        
        if (dbConnected) {
            console.log('🔧 Инициализация базы данных...');
            await initDatabase();
        } else {
            console.log('⚠️ Сервер запускается без подключения к БД');
        }
        
        app.listen(PORT, () => {
            console.log(`✅ Сервер запущен на http://localhost:${PORT}`);
            console.log(`📊 Статус БД: ${dbConnected ? 'подключена' : 'отключена'}`);
            console.log('📁 Статические файлы обслуживаются из папки public/');
        });
    } catch (error) {
        console.error('❌ Ошибка запуска сервера:', error);
        process.exit(1);
    }
}

startServer();
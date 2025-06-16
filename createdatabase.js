const connection = require('./db');

connection.query('CREATE DATABASE equipment_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;', (err, results) => {
  if (err) throw err;
  console.log('✅ База данных создана или уже существует.');
  connection.end();
});

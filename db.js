const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',         // или твой логин
  password: '',         // или твой пароль
  // database: 'testdb' // пока не указываем — будем создавать
});

connection.connect((err) => {
  if (err) throw err;
  console.log('✅ Успешное подключение к MySQL!');
});

module.exports = connection;

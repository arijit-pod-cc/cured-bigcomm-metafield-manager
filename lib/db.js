const { DB_TYPE = 'mysql' } = process.env;

if (DB_TYPE !== 'mysql') {
    throw new Error(`Unsupported DB_TYPE: ${DB_TYPE}. This app uses MySQL.`);
}

const mysqlDb = require('./dbs/mysql');
const db = mysqlDb;
const { query } = mysqlDb;

export default db;
export { query };

import mysql from 'mysql2';
import { promisify } from 'util';

const MYSQL_CONFIG = {
    host: process.env.MYSQL_HOST,
    database: process.env.MYSQL_DATABASE,
    user: process.env.MYSQL_USERNAME,
    password: process.env.MYSQL_PASSWORD,
    ...(process.env.MYSQL_PORT && {
        port: Number(process.env.MYSQL_PORT),
    }),
};

// For use with DB URLs
// Other mysql: https://www.npmjs.com/package/mysql#pooling-connections
const dbUrl = process.env.DATABASE_URL;

const pool = dbUrl
    ? mysql.createPool(dbUrl)
    : mysql.createPool(MYSQL_CONFIG);

const rawQuery = promisify(pool.query.bind(pool));

let schemaEnsuring = null;

export async function ensureSchema() {
    if (schemaEnsuring) return schemaEnsuring;
    schemaEnsuring = (async () => {
        try {
            await rawQuery(`
                CREATE TABLE IF NOT EXISTS metafield_definitions (
                    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    storeHash VARCHAR(64) NOT NULL,
                    category VARCHAR(50) NOT NULL,
                    namespace VARCHAR(100) NOT NULL DEFAULT 'custom',
                    \`key\` VARCHAR(100) NULL,
                    name VARCHAR(255) NOT NULL,
                    description TEXT NULL,
                    type VARCHAR(50) NOT NULL,
                    isList TINYINT(1) DEFAULT 0,
                    referenceMetaobjectDefinitionId INT UNSIGNED NULL,
                    validationsJson LONGTEXT NULL,
                    defaultValueJson LONGTEXT NULL,
                    isRequired TINYINT(1) DEFAULT 0,
                    visibility VARCHAR(50) DEFAULT 'storefront',
                    sortOrder INT UNSIGNED DEFAULT 0,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_store_cat (storeHash, category)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `);

            const cols = await rawQuery(`SHOW COLUMNS FROM metafield_definitions`);
            const colNames = (cols || []).map(c => c.Field);
            
            if (!colNames.includes('key')) {
                await rawQuery(`ALTER TABLE metafield_definitions ADD COLUMN \`key\` VARCHAR(100) NULL AFTER namespace`);
            }
            if (!colNames.includes('validationsJson')) {
                await rawQuery(`ALTER TABLE metafield_definitions ADD COLUMN validationsJson LONGTEXT NULL AFTER referenceMetaobjectDefinitionId`);
            }
            if (!colNames.includes('defaultValueJson')) {
                await rawQuery(`ALTER TABLE metafield_definitions ADD COLUMN defaultValueJson LONGTEXT NULL AFTER validationsJson`);
            }
            if (!colNames.includes('visibility')) {
                await rawQuery(`ALTER TABLE metafield_definitions ADD COLUMN visibility VARCHAR(50) DEFAULT 'storefront' AFTER isRequired`);
            }
            if (!colNames.includes('sortOrder')) {
                await rawQuery(`ALTER TABLE metafield_definitions ADD COLUMN sortOrder INT UNSIGNED DEFAULT 0 AFTER visibility`);
            }

            await rawQuery(`
                CREATE TABLE IF NOT EXISTS metafield_values (
                    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    storeHash VARCHAR(64) NOT NULL,
                    category VARCHAR(50) NOT NULL,
                    category_data_id VARCHAR(128) NOT NULL,
                    definitionId INT UNSIGNED NULL DEFAULT 0,
                    valueJson LONGTEXT NOT NULL,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_store_cat_item (storeHash, category, category_data_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `);

            await rawQuery(`
                CREATE TABLE IF NOT EXISTS metaobject_definitions (
                    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    storeHash VARCHAR(64) NOT NULL,
                    type VARCHAR(100) NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    description TEXT NULL,
                    displayFieldKey VARCHAR(100) NULL,
                    status VARCHAR(50) DEFAULT 'active',
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_store_type (storeHash, type)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `);

            await rawQuery(`
                CREATE TABLE IF NOT EXISTS metaobject_field_definitions (
                    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    storeHash VARCHAR(64) NOT NULL,
                    metaobjectDefinitionId INT UNSIGNED NOT NULL,
                    \`key\` VARCHAR(100) NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    description TEXT NULL,
                    type VARCHAR(50) NOT NULL,
                    isList TINYINT(1) DEFAULT 0,
                    referenceMetaobjectDefinitionId INT UNSIGNED NULL,
                    validationsJson LONGTEXT NULL,
                    isRequired TINYINT(1) DEFAULT 0,
                    sortOrder INT UNSIGNED DEFAULT 0,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_mo_def (metaobjectDefinitionId)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `);

            await rawQuery(`
                CREATE TABLE IF NOT EXISTS metaobject_entries (
                    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    storeHash VARCHAR(64) NOT NULL,
                    metaobjectDefinitionId INT UNSIGNED NOT NULL,
                    handle VARCHAR(150) NOT NULL,
                    displayName VARCHAR(255) NOT NULL,
                    status VARCHAR(50) DEFAULT 'active',
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_entry_mo (metaobjectDefinitionId)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `);

            await rawQuery(`
                CREATE TABLE IF NOT EXISTS metaobject_field_values (
                    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    storeHash VARCHAR(64) NOT NULL,
                    entryId INT UNSIGNED NOT NULL,
                    fieldDefinitionId INT UNSIGNED NOT NULL,
                    valueJson LONGTEXT NULL,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_entry_field (entryId, fieldDefinitionId)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `);
        } catch (e) {
            console.error('Schema initialization error:', e);
        }
    })();
    return schemaEnsuring;
}

export async function query(sql, values) {
    await ensureSchema();
    return rawQuery(sql, values);
}


// Use setUser for storing global user data (persists between installs)
export async function setUser({ user }) {
    if (!user) return null;

    const { email, id, username } = user;
    const userData = {
        email,
        userId: id,
        username,
    };

    await query('REPLACE INTO users SET ?', userData);
}

export async function setStore(session) {
    const {
        access_token: accessToken,
        context,
        scope,
    } = session;

    // Only set on app install or update
    if (!accessToken || !scope) return null;

    const storeHash = context?.split('/')[1] || '';

    const storeData = {
        accessToken,
        scope,
        storeHash,
    };

    await query('REPLACE INTO stores SET ?', storeData);
}

// Use setStoreUser for storing store-specific variables
export async function setStoreUser(session) {
    const {
        access_token: accessToken,
        context,
        owner,
        sub,
        user: { id: userId },
    } = session;

    if (!userId) return null;

    const contextString = context ?? sub;
    const storeHash = contextString?.split('/')[1] || '';

    const sql =
        'SELECT * FROM storeUsers WHERE userId = ? AND storeHash = ?';

    const values = [String(userId), storeHash];

    const storeUser = await query(sql, values);

    // Set admin (store owner) if installing/updating the app
    // https://developer.bigcommerce.com/api-docs/apps/guide/users
    if (accessToken) {
        // Create a new admin user if none exists
        if (!storeUser.length) {
            await query(
                'INSERT INTO storeUsers SET ?',
                {
                    isAdmin: true,
                    storeHash,
                    userId,
                }
            );
        } else if (!storeUser[0]?.isAdmin) {
            await query(
                'UPDATE storeUsers SET isAdmin=1 WHERE userId = ? AND storeHash = ?',
                values
            );
        }
    } else {
        // Create a new user if it doesn't exist
        // (non-store owners added here for multi-user apps)
        if (!storeUser.length) {
            await query(
                'INSERT INTO storeUsers SET ?',
                {
                    isAdmin: owner.id === userId,
                    storeHash,
                    userId,
                }
            );
        }
    }
}

export async function deleteUser({ context, user, sub }) {
    const contextString = context ?? sub;
    const storeHash = contextString?.split('/')[1] || '';

    const values = [
        String(user?.id),
        storeHash,
    ];

    await query(
        'DELETE FROM storeUsers WHERE userId = ? AND storeHash = ?',
        values
    );
}

export async function hasStoreUser(storeHash, userId) {
    if (!storeHash || !userId) return false;

    const values = [userId, storeHash];

    const results = await query(
        'SELECT * FROM storeUsers WHERE userId = ? AND storeHash = ? LIMIT 1',
        values
    );

    return results.length > 0;
}

export async function getStoreToken(storeHash) {
    if (!storeHash) return null;

    const results = await query(
        'SELECT accessToken FROM stores WHERE storeHash = ?',
        storeHash
    );

    return results.length
        ? results[0].accessToken
        : null;
}

export async function deleteStore({ store_hash: storeHash }) {
    await query(
        'DELETE FROM stores WHERE storeHash = ?',
        storeHash
    );
}
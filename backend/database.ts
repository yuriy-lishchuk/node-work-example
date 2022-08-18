import {
    PoolConfig,
    Pool,
    createPool,
    QueryFunction,
    MysqlError,
    Connection,
} from 'mysql';
import * as fs from 'fs';
import { promisify } from 'util';

var dbConfig = {
    connectionLimit: process.env.DB_CONNECTION_LIMIT,
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DATABASE,
    timezone: process.env.DB_TIMEZONE,
    ssl: {
        ca: fs.readFileSync(process.env.DB_SSL_CA_PATH),
        key: fs.readFileSync(process.env.DB_SSL_KEY_PATH),
        cert: fs.readFileSync(process.env.DB_SSL_CERT_PATH),
    },
    charset: process.env.DB_CHARSET,
};

/**
 * Use JSON as opposed to flat arrays to bind to SQL statements
 * @param query
 * @param values
 * @returns {*}
 */
function queryFormat(query, values) {
    if (!values) return query;

    // escape IDs
    query = query.replace(
        /\:\:(\w+)/g,
        function (txt, key) {
            if (values.hasOwnProperty(key)) {
                return this.escapeId(values[key]);
            }
            return txt;
        }.bind(this)
    );

    // escape values
    query = query.replace(
        /\:(\w+)/g,
        function (txt, key) {
            if (values.hasOwnProperty(key)) {
                return this.escape(values[key]);
            } else {
                return 'NULL';
            }
            return txt;
        }.bind(this)
    );

    return query;
}

export class Database {
    public query: QueryFunction;
    private _pool: Pool;
    private _connection: Connection;

    public beginTransaction: (callback: (err: MysqlError) => void) => void;
    public commit: (callback: (err: MysqlError) => void) => void;
    public rollback: (callback: () => void) => void;

    constructor(config: PoolConfig) {
        config.queryFormat = queryFormat;
        this._pool = createPool(config);
    }

    private _destroyConnection() {
        if (this._connection) {
            this._connection.destroy();
            this._connection = null;
        }
    }

    public async beginTransactionAsync(): Promise<void> {
        if (!this._connection)
            this._connection = await promisify(this._pool.getConnection).bind(
                this._pool
            )();

        try {
            await promisify(this._connection.beginTransaction).bind(this._connection)();
        } catch (error) {
            this._destroyConnection();
            throw error;
        }
    }

    public async commitAsync(): Promise<void> {
        try {
            await promisify(this._connection.commit).bind(this._connection)();
            this._destroyConnection();
        } catch (error) {
            this._destroyConnection();
            throw error;
        }
    }

    public async rollbackAsync(): Promise<void> {
        try {
            await promisify(this._connection.rollback).bind(this._connection)();
        } catch (error) {
            this._destroyConnection();
            throw error;
        }
    }

    public queryAsync<T>(sql: string, args?: any): Promise<T> {
        return new Promise((resolve, reject) => {
            this._pool.query(sql, args, (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });
    }
}

const db = new Database(dbConfig);

export default db;

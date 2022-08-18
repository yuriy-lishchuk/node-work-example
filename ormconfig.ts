const { readFileSync } = require('fs');

const ssl = {
    ca: readFileSync(process.env.DB_SSL_CA_PATH),
    key: readFileSync(process.env.DB_SSL_KEY_PATH),
    cert: readFileSync(process.env.DB_SSL_CERT_PATH),
};


//redis cache config
const cache = {
    type: "redis",
    options: {
        password : process.env.REDIS_PASSWORD,
        host:  process.env.REDIS_HOST,
        port: process.env.REDIS_PORT
    }
}

module.exports = [{
    name: 'default',
    type: 'mysql',
    host: process.env.DB_HOST,
    port: 3306,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DATABASE,
    synchronize: false,
    entities: ['dist/**/entities/*.js'],
    ssl,
    // cache
}];

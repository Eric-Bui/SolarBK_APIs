const MSSQL = require('mssql');

const { user, password, server, database, port, requestTimeout } = require('../ultis/SWH_DB');
const { user_pv, password_pv, server_pv, database_pv, port_pv, requestTimeout_pv } = require('../ultis/PV_DB');

const sqlPool_SWH = new MSSQL.ConnectionPool({
    server: server,
    port: port,
    user: user,
    password: password,
    database: database,
    requestTimeout: requestTimeout,
    options: {
        encrypt: false
    },
    pool: {
        idleTimeoutMillis: requestTimeout
    }
}, (err) => {
    if (err) {
        console.log(err);
    } else {
        console.log('SWH Database connected');
    }
});

const sqlPool_PV = new MSSQL.ConnectionPool({
    server: server_pv,
    port: port_pv,
    user: user_pv,
    password: password_pv,
    database: database_pv,
    requestTimeout: requestTimeout_pv,
    options: {
        encrypt: false
    },
    pool: {
        idleTimeoutMillis: requestTimeout_pv
    }
}, (err) => {
    if (err) {
        console.log(err);
    } else {
        console.log('PV Database connected');
    }
});

module.exports = { sqlPool_SWH, sqlPool_PV }
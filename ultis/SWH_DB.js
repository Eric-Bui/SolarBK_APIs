require('dotenv').config()
//SWH Database
module.exports = {
    user: process.env.SQLUSER || 'sa',
    password: process.env.SQLPASSWORD || 'admin@123',
    server: process.env.SERVERNAME || '10.2.100.5',
    port: parseInt(process.env.PORT_SWH) || 1433,
    database: process.env.DATABASE || 'SSOC',
    requestTimeout: 60000
}
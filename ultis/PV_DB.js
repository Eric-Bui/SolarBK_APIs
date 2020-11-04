require('dotenv').config();
module.exports = {
    user_pv: process.env.SQLUSER_PV || 'sa',
    password_pv: process.env.SQLPASSWORD_PV || 'admin@123',
    server_pv: process.env.SERVERNAME_PV || '10.2.100.4',
    port_pv: parseInt(process.env.PORT_PV) || 1433,
    database_pv: process.env.DATABASE_PV || 'SSOC',
    requestTimeout_pv: 60000
}
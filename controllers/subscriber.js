require('dotenv').config();
var mqtt = require('mqtt');
let redis = require('async-redis');
let sql = require('mssql');
const { v4: uuidv4 } = require('uuid');
const { sqlPool_PV, sqlPool_SWH } = require('./connectDB.js');
const CronJob = require('cron').CronJob;

// var setting = {
//     hostname: process.env.HOSTNAME_MS || 'ssoc.solarbk.vn',
//     port: parseInt(process.env.PORT_MS) || 443,
//     protocol: process.env.PROTOCOL_MS || 'wss',
//     path: process.env.PATH_MS || '/websocket/mosca'
// }

// let availabelTopic = ['01-C016-0919-1560', '01-C016-0219-0297'];
let availabelTopicVinasino = ['01-C016-0919-1560'],
    availabelTopicSungrow = ['01-C016-0219-0297'],
    availabelTopicHuaweiV3 = [];

const REDIS_PORT_SERVER = parseInt(process.env.REDIS_PORT_SERVER) || 6379;
const REDIS_HOST_SERVER = process.env.REDIS_HOST_SERVER || '10.2.100.7';
const client_redis = redis.createClient(REDIS_PORT_SERVER, REDIS_HOST_SERVER);

const REDIS_PORT = process.env.REDIS_PORT || 6379;
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const client_redis_local = redis.createClient(REDIS_PORT, REDIS_HOST);

function getTimeRound() {
    let coeff = 1000 * 60 * 5;
    let date = new Date();
    let offSetTime = -new Date().getTimezoneOffset() / 60;

    let rounded;
    if (offSetTime === 0) {
        rounded = new Date(Math.round(date.getTime() / coeff) * coeff);
        rounded.setHours(rounded.getHours() + 7);
    } else {
        rounded = new Date(Math.round(date.getTime() / coeff) * coeff);
    }
    let day = ('0' + rounded.getDate()).slice(-2);
    let month = ('0' + (rounded.getMonth() + 1)).slice(-2);
    let year = rounded.getFullYear();

    let hour = ('0' + rounded.getHours()).slice(-2);
    let minute = ('0' + rounded.getMinutes()).slice(-2);

    let CurrentDate = `${year}-${month}-${day} ${hour}:${minute}:00`
    return CurrentDate;
}

//#region subscriber by redis server
let logJob = new CronJob({
    cronTime: `0 */3 * * * *`,
    onTick: async () => { await logDataVinasino() },
    start: true
})

let logDataVinasino = async () => {
    try {
        for (let i = 0; i < availabelTopicVinasino.length; i++) {
            const serial = availabelTopicVinasino[i];
            let dataBody = [];
            for (let n = 0; n < 11; n++) {
                let checkDevID = await client_redis.get(`pvsofar:${serial}:${n}:vnsn`);
                if (checkDevID != null) {
                    dataBody.push(JSON.parse(checkDevID));
                }
            }
            let dataHeaderString = await client_redis.get(`pvsofar:${serial}:header`);
            let dataHeader = JSON.parse(dataHeaderString);
            //check if serial exist
            let checkSerial = dataHeader.Serial;
            // console.log(checkSerial)
            let CurrentDateTime = dataHeader.CurrentDate;
            let checkCurrentDate = await client_redis_local.get(`CurrentTime_${serial}`);
            if (checkCurrentDate != CurrentDateTime) {
                let checkQuerySerial = await sqlPool_SWH.request()
                    .input('Serial', sql.NVarChar, checkSerial)
                    .query(`SELECT Serial FROM tb_ProjectInfo WHERE Serial = @Serial`);

                let getCheckSerial = checkQuerySerial.recordset;

                if (getCheckSerial.length > 0) {
                    //ready data to insert
                    let CurrentDate = getTimeRound();
                    let dataList = dataBody;
                    //#region raw data collector - vinasino
                    for (let i = 0; i < dataList.length; i++) {
                        //ready string list
                        let vinasinoId = null,
                            vinasinoStatus = null,
                            paramAKeys = [],
                            paramAValues = [];

                        delete dataList[i].CurrentDate;
                        delete dataList[i].Id;
                        delete dataList[i].Serial;
                        delete dataList[i].TodayPosEnergy;
                        delete dataList[i].TodayNegEnergy;

                        let items = dataList[i];
                        for (var key in items) {
                            if (key === 'DevId') {
                                vinasinoId = items[key];
                            } else if (key === 'Status') {
                                vinasinoStatus = items[key];
                            } else {
                                if (items[key] != null) {
                                    paramAKeys.push(key);
                                    paramAValues.push(items[key]);
                                }
                            }
                        }

                        //check if exist records
                        let queryCheckExist = await sqlPool_PV.request()
                            .input('Serial', sql.NVarChar, checkSerial)
                            .input('currentDate', CurrentDate)
                            .input('devId', sql.Int, vinasinoId)
                            .query(`SELECT TOP (1) * FROM tb_VinasinoFullMetter WHERE Serial = @Serial
                                AND CONVERT(datetime, CurrentDate, 103) = @currentDate AND DevId = @devId`);

                        let getCheckExist = queryCheckExist.recordset[0];

                        if (paramAKeys.length === paramAValues.length) {
                            if (getCheckExist === undefined) {
                                await sqlPool_PV.request()
                                    .input('Serial', sql.NVarChar, checkSerial)
                                    .input('currentDate', CurrentDate)
                                    .input('devId', sql.Int, vinasinoId)
                                    .input('Status', sql.Int, vinasinoStatus)
                                    .query(`INSERT INTO tb_VinasinoFullMetter (Serial, CurrentDate, DevId, Status, 
                                        ${paramAKeys.toString()})
                                        VALUES (@Serial, @currentDate, @devId, @Status, ${paramAValues.toString()})`);
                                await client_redis_local.set(`CurrentTime_${serial}`, CurrentDateTime);
                                console.log(`Insert new record successful`);
                            } else {
                                //string update format
                                let stringUpdate = '';
                                for (let i = 0; i < paramAKeys.length; i++) {
                                    if (typeof paramAValues[i] === "number") {
                                        stringUpdate += ` ${paramAKeys[i]} = ${paramAValues[i]},`
                                    } else {
                                        stringUpdate += ` ${paramAKeys[i]} = '${paramAValues[i]}',`
                                    }
                                }
                                let stringAUpdate = stringUpdate.slice(0, -1);
                                // console.log(stringAUpdate)
                                await sqlPool_PV.request()
                                    .input('Serial', sql.NVarChar, checkSerial)
                                    .input('currentDate', CurrentDate)
                                    .input('devId', sql.Int, vinasinoId)
                                    .query(`UPDATE tb_VinasinoFullMetter SET ${stringAUpdate}
                                        WHERE Serial = @Serial AND 
                                        CONVERT(datetime, CurrentDate, 103) = @currentDate AND DevId = @devId`);
                                await client_redis_local.set(`CurrentTime_${serial}`, CurrentDateTime);
                                console.log(`Update old record successful`)
                            }
                        } else {
                            console.log('String keys and values not equal');
                        }
                    }

                    let splitGetDate = CurrentDate.split(' ');
                    let date = splitGetDate[0];
                    for (let i = 0; i < dataList.length; i++) {
                        let queryFirstDataInDay = await sqlPool_PV.request()
                            .input('Serial', sql.NVarChar, checkSerial)
                            .input('devID', sql.Int, dataList[i].DevId)
                            .input('date', date)
                            .query(`SELECT TOP (1) * 
                            FROM tb_VinasinoFullMetter 
                            WHERE CONVERT(date, CurrentDate, 103)=@date
                            AND Serial=@Serial AND DevId=@devID 
                            ORDER BY CurrentDate ASC`)
                        let getFirstDataInDay = queryFirstDataInDay.recordset[0];

                        let todayMetterProduction;
                        let sessionID = uuidv4();

                        if (getFirstDataInDay == undefined) {
                            todayMetterProduction = 0;
                        } else {
                            let First_A1 = getFirstDataInDay.A1;
                            let Last_A1 = dataList[i].A1;
                            todayMetterProduction = Last_A1 - First_A1;
                        }

                        //query check exist
                        let queryCheckExist = await sqlPool_PV.request()
                            .input('Serial', sql.NVarChar, checkSerial)
                            .input('currentDate', CurrentDate)
                            .query(`SELECT TOP (1) * FROM tb_PVNextCalculated WHERE Serial = @Serial
                            AND CONVERT(datetime, CurrentDate, 103) = @currentDate`);

                        let getCheckExist = queryCheckExist.recordset[0];

                        if (getCheckExist === undefined) {
                            await sqlPool_PV.request()
                                .input('Serial', sql.NVarChar, checkSerial)
                                .input('CurrentDate', CurrentDate)
                                .input('sessionID', sql.NVarChar, sessionID)
                                .input('count', sql.Int, 0)
                                .input('MetterTodayProduction', sql.Decimal(18, 2), todayMetterProduction)
                                .input('MetterTotalProduction', sql.Decimal(18, 2), dataList[i].A1)
                                .query(`INSERT INTO tb_PVNextCalculated 
                                (Serial, CurrentDate, SessionID, Count, MetterTodayProduction, MetterTotalProduction) 
                                VALUES (@Serial, @CurrentDate, @sessionID, @count, @MetterTodayProduction, 
                                @MetterTotalProduction)`);
                                await client_redis_local.set(`CurrentTime_${serial}`, CurrentDateTime);
                            console.log('Insert Done');
                        } else {
                            let countUpdate;
                            const FIVE_MIN = 5 * 60 * 1000,
                                TEN_MIN = 10 * 60 * 1000,
                                FIFTH_MIN = 15 * 60 * 1000,
                                TWENTY_MIN = 20 * 60 * 1000,
                                TWENTYFIVE_MIN = 25 * 60 * 1000;

                            let recentDate = new Date();
                            let databaseDate = new Date(getCheckExist.CurrentDate);
                            let difTime = recentDate - databaseDate;
                            if (difTime > FIVE_MIN && difTime <= TEN_MIN) {
                                countUpdate = 1
                            } else if (difTime > TEN_MIN && difTime <= FIFTH_MIN) {
                                countUpdate = 2
                            } else if (difTime > FIFTH_MIN && difTime <= TWENTY_MIN) {
                                countUpdate = 3
                            } else if (difTime > TWENTY_MIN && difTime <= TWENTYFIVE_MIN) {
                                countUpdate = 4
                            } else if (difTime > TWENTYFIVE_MIN) {
                                countUpdate = 5
                            } else {
                                countUpdate = 0
                            }

                            await sqlPool_PV.request()
                                .input('MetterTodayProduction', sql.Decimal(18, 2), todayMetterProduction)
                                .input('MetterTotalProduction', sql.Decimal(18, 2), dataList[i].A1)
                                .input('count', sql.Int, countUpdate)
                                .input('Serial', sql.NVarChar, checkSerial)
                                .input('CurrentDate', CurrentDate)
                                .query(`UPDATE tb_PVNextCalculated 
                                SET MetterTodayProduction = @MetterTodayProduction, 
                                MetterTotalProduction = @MetterTotalProduction, 
                                Count=@count
                                WHERE Serial = @Serial AND 
                                CONVERT(datetime, CurrentDate, 103) = @CurrentDate`);
                                await client_redis_local.set(`CurrentTime_${serial}`, CurrentDateTime);
                            console.log('Update Done');
                        }
                    }
                } else {
                    console.log('Serial not found');
                }
            } else {
                console.log('Nothing new');
            }
        }
    } catch (err) {
        console.log(err);
    }
}

//#endregion

module.exports = {
    // connectMQTTFunc: connectMQTTFunc,
    // subscribeMessage: subscribeMessage
}
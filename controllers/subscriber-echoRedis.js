require('dotenv').config();

const { v4: uuidv4 } = require('uuid');

// import subscriber dynamic params
const SubParams = require('./subscriber/subscriber-dynamic-params');

// Redis server import and config
let redis = require('redis');
const { sqlPool_SWH, sqlPool_PV } = require('./connectDB');
const REDIS_PORT_SERVER = process.env.ECHO_REDIS_PORT_SERVER || 6379;
const REDIS_HOST_SERVER = process.env.ECHO_REDIS_HOST_SERVER || '172.18.0.1';
const client_redis = redis.createClient(REDIS_PORT_SERVER, REDIS_HOST_SERVER);

// Table name DB
const pvSofarInfo = 'tb_PVNextCalculated';

// subscriber dynamic params
let tableRawData,
    listRecordName,
    DeviceIDName,
    totalProductionParamName,
    NumberOfDevice,
    HasMetter,
    HasRadiation,
    StartFromZero,
    DBDeviceIDName,
    isGrouped,
    numberOfParams,
    logSessionID;

const sql = require('mssql');

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

let availabelTopic = [
    // other
    '01-C016-0520-0110', // pv sofar group v3 - 33kw + 60kw
    '01-C016-0919-1560', // vinasino - test
    '01-C016-0520-0145', // Huawei v3
    '01-C016-0219-0297', // sungrow irex

    // Sungrow v3
    '01-C016-0919-1539',

    // // ilight 30
    '01-C016-0920-0207',
    '01-C016-0920-0202',
    '01-C016-0920-0209',
    '01-C016-0920-0205',
    '01-C016-0920-0210',
    '01-C016-0920-0201',
    '01-C016-0920-0204',
    '01-C016-0920-0208'

    // UN Green House - test
    // '01-C016-0520-0102'
];

function safelyParseJson(json) {
    let parsed
    try {
        parsed = JSON.parse(json)
    } catch (err) {

    }
    return parsed;
}

let checkExistFunction = async (checkedSerial, CurrentDate, SubId, tableRawData, DBDeviceIDName) => {
    try {
        let checkExist = await sqlPool_PV.request()
            .input('Serial', sql.NVarChar, checkedSerial)
            .input('currentDate', CurrentDate)
            .input('id', sql.Int, SubId)
            .query(`SELECT TOP (1) * FROM ${tableRawData} WHERE Serial=@Serial 
                AND CONVERT(datetime, CurrentDate, 103)=@currentDate 
                AND ${DBDeviceIDName}=@id `);

        return checkExist;
    } catch (err) {
        console.log(err)
    }
}

let insertNewData = async (checkedSerial, CurrentDate, SubId, tableRawData, DBDeviceIDName, SubStatus, paramAKeys, paramAValues, logSessionID) => {
    try {
        let sessionKeyInject = '', sessionValueInject = '';
        if (logSessionID === true) {
            sessionKeyInject = ', SessionID';
            sessionValueInject = `, '${uuidv4()}'`;
        }

        await sqlPool_PV.request()
            .input('Serial', sql.NVarChar, checkedSerial)
            .input('currentDate', CurrentDate)
            .input('id', sql.Int, SubId)
            .input('Status', sql.Int, SubStatus)
            .query(`INSERT INTO ${tableRawData} (Serial, CurrentDate, ${DBDeviceIDName}, Status, 
                    ${paramAKeys.toString()} ${sessionKeyInject})
                    VALUES (@Serial, @currentDate, @id, @Status, ${paramAValues.toString()} ${sessionValueInject})`);
    } catch (err) {
        console.log(err);
    }
}

let updateOldData = async (checkedSerial, CurrentDate, SubId, tableRawData, stringAUpdate, DBDeviceIDName) => {
    try {
        await sqlPool_PV.request()
            .input('Serial', sql.NVarChar, checkedSerial)
            .input('currentDate', CurrentDate)
            .input('id', sql.Int, SubId)
            .query(`UPDATE ${tableRawData} SET ${stringAUpdate}
                    WHERE Serial=@Serial AND 
                    CONVERT(datetime, CurrentDate, 103)=@currentDate AND ${DBDeviceIDName}=@id`);
    } catch (err) {
        console.log(err);
    }
}

let handleForNumberOfDevice = async (Serial, NumberOfDevice, NumberDeviceMetter, DeviceType) => {
    try {
        let NumberDevice;
        let isGroup;
        if (DeviceType === 'Inverter') {
            if (NumberOfDevice == null) {
                let queryNumberDevice = await sqlPool_SWH.request()
                    .input('Serial', Serial)
                    .query(`SELECT Device, NumberDevice FROM tb_ProjectInfo WHERE Serial=@Serial`);
                    let isGroupTemp;
                if (queryNumberDevice.recordset[0] === undefined) {
                    NumberDevice = null;
                    isGroupTemp = null;
                } else {
                    NumberDevice = queryNumberDevice.recordset[0].NumberDevice;
                    isGroupTemp = queryNumberDevice.recordset[0].Device;
                }
                if (isGroupTemp === 'PVSofarGroupV3') {
                    NumberDevice = NumberDevice;
                    isGroup = true;
                } else {
                    NumberDevice = NumberDevice;
                    isGroup = false;
                }
            } else {
                NumberDevice = NumberOfDevice;
                isGroup = false;
            }
        } else if (DeviceType === 'Metter') {
            if (NumberDeviceMetter == null) {
                NumberDevice = 1;
                isGroup = false;
            } else {
                NumberDevice = NumberDeviceMetter;
                isGroup = false;
            }
        } else {
            NumberDevice = 1;
            isGroup = false;
        }

        return {
            NumberDevice: NumberDevice,
            isGroup: isGroup
        };
    } catch (err) {
        console.log(err);
    }
}

let swap32 = async (val) => {
    try {
        return ((val & 0xFF) << 24)
            | ((val & 0xFF00) << 8)
            | ((val >> 8) & 0xFF00)
            | ((val >> 24) & 0xFF);
    } catch (err) {
        console.log(err);
    }
}

client_redis.on('message', async (channel, message) => {
    try {
        //Clearing redis data
        let messageJson = JSON.parse(message);
        let formPostStr = messageJson.form_post;
        let rawDataJson;
        let RestrictedArea = SubParams.RestrictedArea;

        if (typeof formPostStr != 'object') {
            let correctjson = formPostStr.replace(/([{,])(\s*)([A-Za-z0-9_\-]+?)\s*:/g, '$1"$3":');
            let rawDataJsonTemp = safelyParseJson(correctjson);
            if (rawDataJsonTemp == undefined) {
                rawDataJson = 'error_string';
            } else {
                rawDataJson = rawDataJsonTemp;
            }
        } else {
            rawDataJson = {};
        }

        // set flag calculate
        if (rawDataJson != 'error_string') {
            if (availabelTopic.includes(rawDataJson.Serial)) {
                // check incomming signal type
                let checkSignalType = SubParams.signalType;
                let found = false;
                for (let i = 0; i < checkSignalType.length; i++) {
                    if (rawDataJson[checkSignalType[i].listRecordName] != undefined ||
                        rawDataJson[checkSignalType[i].listRecordName] != null) {
                        let handle = await handleForNumberOfDevice(rawDataJson.Serial, checkSignalType[i].NumberDevice, checkSignalType[i].NumberDeviceMetter, checkSignalType[i].type);
                        found = true;
                        listRecordName = checkSignalType[i].listRecordName;
                        DeviceIDName = checkSignalType[i].DeviceIDName;
                        tableRawData = checkSignalType[i].tableRawData;
                        totalProductionParamName = checkSignalType[i].totalProductionParamName;
                        DBDeviceIDName = checkSignalType[i].DBDeviceIDName;
                        StartFromZero = checkSignalType[i].StartFromZero;
                        HasMetter = checkSignalType[i].HasMetter;
                        HasRadiation = checkSignalType[i].HasRadiation;
                        numberOfParams = checkSignalType[i].numberOfParams;
                        logSessionID = checkSignalType[i].logSessionID;
                        NumberOfDevice = handle.NumberDevice;
                        isGrouped = handle.isGroup;
                        break;
                    } else {
                        found = false;
                    }
                }
                if (found == false) {
                    return;
                }
                // check serial is exist (DB)
                let checkedSerial = rawDataJson.Serial;
                // Check Serial exist (result)
                // if (getCheckSerial.length > 0) {
                let CurrentDate = getTimeRound();
                let dataList = rawDataJson[listRecordName];
                // return;
                //#region raw data collector - zone 1
                let globalSubId = null;
                for (let i = 0; i < dataList.length; i++) {
                    //ready string list

                    let SubId = null,
                        SubStatus = null,
                        paramAKeys = [],
                        paramAValues = [];

                    let items = dataList[i];
                    let item;
                    if (listRecordName === 'Sunspec_List_test') {
                        for (let s = 0; s < tableRawData.length; s++) {
                            switch (tableRawData[s]) {
                                case 'tb_SunspecNext_1': {
                                    item = dataList[i].UUID_1;
                                } break;
                                case 'tb_SunspecNext_101_103': {
                                    item = dataList[i].UUID_103;
                                } break;
                                case 'tb_SunspecNext_160': {
                                    item = dataList[i].UUID_106
                                } break;
                                default: {
                                    item = {};
                                } break;
                            }
                            for (let keys in item) {
                                if (keys === DeviceIDName) {
                                    SubId = item[keys];
                                    globalSubId = item[keys];
                                } else if (keys === 'Status') {
                                    SubStatus = item[keys];
                                } else {
                                    paramAKeys.push(keys.toUpperCase());
                                    if (item[keys] === '') {
                                        paramAValues.push(0);
                                    } else if (typeof item[keys] === 'string') {
                                        paramAValues.push(`'${item[keys]}'`);
                                    } else {
                                        paramAValues.push(item[keys]);
                                    }
                                }
                            }

                            let queryCheckExist = await checkExistFunction(checkedSerial, CurrentDate, SubId, tableRawData[s], DBDeviceIDName);
                            let getCheckExist = queryCheckExist.recordset[0];

                            if (numberOfParams != null) {
                                paramAKeys.length = numberOfParams;
                                paramAValues.length = numberOfParams;
                            }

                            if (paramAKeys.length === paramAValues.length) {
                                if (getCheckExist === undefined) {
                                    await insertNewData(checkedSerial, CurrentDate, SubId, tableRawData[s], DBDeviceIDName, SubStatus, paramAKeys, paramAValues, logSessionID);
                                    console.log(`Insert new record successful`);
                                } else {
                                    let stringUpdate = '';
                                    for (let i = 0; i < paramAKeys.length; i++) {
                                        if (typeof paramAValues[i] === 'number') {
                                            stringUpdate += ` ${paramAKeys[i]} = ${paramAValues[i]},`
                                        }
                                    }
                                    let stringAUpdate = stringUpdate.slice(0, -1);
                                    await updateOldData(checkedSerial, CurrentDate, SubId, tableRawData[s], stringAUpdate, DBDeviceIDName);
                                    console.log(`Update old record`);
                                }
                            } else {
                                console.log(`String keys and values not equal`);
                            }
                        }
                    } else {
                        for (var key in items) {
                            if (key === DeviceIDName) {
                                if (listRecordName === 'VinasinoList') {
                                    SubId = 0;
                                    globalSubId = 0;
                                } else {
                                    SubId = items[key];
                                    globalSubId = items[key];
                                }
                            } else if (key === 'Status') {
                                SubStatus = items[key];
                            } else {
                                paramAKeys.push(key.toUpperCase());
                                if (items[key] === '') {
                                    paramAValues.push(0);
                                } else if (typeof items[key] === 'string') {
                                    paramAValues.push(`'${items[key]}'`);
                                } else {
                                    // if (listRecordName === 'SungrowV3List') {
                                    //     if (key == 'A36' || key == 'A39') {
                                    //         paramAValues.push(((items[key] >> 16) & 0xFFFF | (items[key] & 0xFFFF) << 16))
                                    //         // paramAValues.push(await swap32(items[key]));
                                    //     } else if (key == 'A43') {
                                    //         paramAValues.push(await swap32((parseFloat(items[key]) * 1000) & 0xFFFF0000) / 1000)
                                    //     }
                                    //     else if (key == 'A34') {
                                    //         paramAValues.push(((items['A36'] >> 16) & 0xFFFF | (items['A36'] & 0xFFFF) << 16));
                                    //     }
                                    //     else {
                                    //         paramAValues.push(items[key]);
                                    //     }
                                    // } else {
                                    paramAValues.push(items[key]);
                                    // }
                                }
                            }
                        }

                        // check if exist records
                        let queryCheckExist = await checkExistFunction(checkedSerial, CurrentDate, SubId, tableRawData, DBDeviceIDName);
                        let getCheckExist = queryCheckExist.recordset[0];

                        if (numberOfParams != null) {
                            paramAKeys.length = numberOfParams;
                            paramAValues.length = numberOfParams;
                        }

                        if (paramAKeys.length === paramAValues.length) {
                            if (getCheckExist === undefined) {
                                await insertNewData(checkedSerial, CurrentDate, SubId, tableRawData, DBDeviceIDName, SubStatus, paramAKeys, paramAValues, logSessionID);
                                console.log(`Insert new record successful`);
                            } else {
                                // String update formate
                                let stringUpdate = '';
                                for (let i = 0; i < paramAKeys.length; i++) {
                                    if (typeof paramAValues[i] === 'number') {
                                        stringUpdate += ` ${paramAKeys[i]} = ${paramAValues[i]},`
                                    }
                                }
                                let stringAUpdate = stringUpdate.slice(0, -1);
                                await updateOldData(checkedSerial, CurrentDate, SubId, tableRawData, stringAUpdate, DBDeviceIDName);
                                console.log(`Update old record`);
                            }
                        } else {
                            console.log(`String keys and values not equal`);
                        }
                    }
                }
                //#endregion

                // Zone 1 - restricted
                if (RestrictedArea.includes(listRecordName)) {
                    return;
                }

                if (isGrouped === true) {
                    NumberOfDevice = NumberOfDevice / 2;
                }

                if (globalSubId !== NumberOfDevice) {
                    return;
                }
                //#region calculated data collector - zone 2
                let splitGetDate = CurrentDate.split(' ');
                let date = splitGetDate[0];
                let todayProduction = 0;
                let totalProduction = 0;
                let sessionID = uuidv4();

                for (let i = 0; i < NumberOfDevice; i++) {
                    let temp;
                    if (StartFromZero === true) {
                        temp = i;
                    } else {
                        temp = i + 1;
                    }

                    let queryFirstDataInDay = await sqlPool_PV.request()
                        .input('Serial', sql.NVarChar, checkedSerial)
                        .input('id', sql.Int, temp)
                        .input('date', date)
                        .query(`SELECT TOP (1) * FROM ${tableRawData} WHERE 
                            CONVERT (date, CurrentDate, 103)=@date
                            AND Serial=@Serial AND ${DBDeviceIDName}=@id ORDER BY CurrentDate ASC`);

                    let queryLastDataInDay = await sqlPool_PV.request()
                        .input('Serial', sql.NVarChar, checkedSerial)
                        .input('id', sql.Int, temp)
                        .input('date', date)
                        .query(`SELECT TOP (1) * FROM ${tableRawData} WHERE 
                            CONVERT (date, CurrentDate, 103)=@date
                            AND Serial=@Serial AND ${DBDeviceIDName}=@id ORDER BY CurrentDate DESC`);

                    let getLastDataInDay = queryLastDataInDay.recordset[0];
                    let getFirstDataInDay = queryFirstDataInDay.recordset[0];

                    if (getFirstDataInDay == undefined) {
                        todayProduction += 0;
                        totalProduction += 0;
                    } else {
                        let First_Aparams = parseFloat(getFirstDataInDay[totalProductionParamName]);
                        let Last_Aparams = parseFloat(getLastDataInDay[totalProductionParamName]);
                        todayProduction += Last_Aparams - First_Aparams;
                        totalProduction += Last_Aparams;
                    }
                }
                // query check exist calculated data
                let queryCheckExist = await sqlPool_PV.request()
                    .input('Serial', sql.NVarChar, checkedSerial)
                    .input('currentDate', CurrentDate)
                    .query(`SELECT TOP (1) * FROM ${pvSofarInfo} WHERE Serial=@Serial 
                            AND CONVERT(datetime, CurrentDate, 103)=@currentDate`);

                let cusTodayProd;
                let cusTotalProd;
                if (HasMetter === true) {
                    cusTodayProd = 'MetterTodayProduction';
                    cusTotalProd = 'MetterTotalProduction';
                } else {
                    cusTodayProd = 'TodayProduction';
                    cusTotalProd = 'TotalProduction';
                }
                console.log(`Total Production: ${totalProduction}`);
                //Ready data for instant radiation
                let RadiationInsertKeys = '';
                let RadiationInsertValue = '';
                let updateRadiationValue = '';
                if (HasRadiation === true) {
                    let queryRadiation = await sqlPool_PV.request()
                        .input('Serial', sql.NVarChar, checkedSerial)
                        .input('date', date)
                        .query(`SELECT TOP (1) A5 as instantRadiation, A6 as pvTemp
                        FROM tb_KippZonenSensor WHERE Serial=@Serial AND 
                        CONVERT(date, CurrentDate, 103)=@date 
                        ORDER BY CurrentDate DESC`);

                    let getRadiation = queryRadiation.recordset[0];
                    RadiationInsertKeys = ', Radiation, PVTemp ';
                    RadiationInsertValue = `, ${getRadiation.instantRadiation}, ${getRadiation.pvTemp} `;
                    updateRadiationValue = `, Radiation=${getRadiation.instantRadiation}, PVTemp=${getRadiation.pvTemp} `;
                }

                let getCheckExist = queryCheckExist.recordset[0];
                /** Insert new calculated records */
                if (getCheckExist === undefined) {
                    await sqlPool_PV.request()
                        .input('Serial', sql.NVarChar, checkedSerial)
                        .input('currentDate', CurrentDate)
                        .input('sessionID', sql.NVarChar, sessionID)
                        .input('count', sql.Int, 0)
                        .input('TodayProduction', sql.Decimal(18, 2), todayProduction)
                        .input('TotalProduction', sql.Decimal(18, 2), totalProduction)
                        .input('SignalStack', sql.NVarChar, 1)
                        .query(`INSERT INTO ${pvSofarInfo} (Serial, CurrentDate, SessionID, Count, 
                            ${cusTodayProd}, ${cusTotalProd}, Signal
                            ${RadiationInsertKeys}) 
                                VALUES (@Serial, @currentDate, @sessionID, @count, @TodayProduction, 
                                    @TotalProduction, @SignalStack
                                    ${RadiationInsertValue})`)
                    console.log('Insert Done');
                }
                /** Update old calculated records */
                else {
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
                    let SignalStack;
                    let NumberODeviceCheck = NumberOfDevice * 2;
                    if (isGrouped === true) {
                        if (getCheckExist.Signal == null || getCheckExist.Signal >= NumberODeviceCheck) {
                            SignalStack = 1;
                        } else {
                            SignalStack = parseInt(getCheckExist.Signal) + 1;
                            todayProduction += getCheckExist[cusTodayProd];
                            totalProduction += getCheckExist[cusTotalProd];
                        }
                    }
                    await sqlPool_PV.request()
                        .input('TodayProduction', sql.Decimal(18, 2), todayProduction)
                        .input('TotalProduction', sql.Decimal(18, 2), totalProduction)
                        .input('count', sql.Int, countUpdate)
                        .input('Serial', sql.NVarChar, checkedSerial)
                        .input('currentDate', CurrentDate)
                        .input('SignalStack', sql.NVarChar, SignalStack)
                        .query(`UPDATE ${pvSofarInfo} SET ${cusTodayProd}=@TodayProduction, 
                                ${cusTotalProd}=@TotalProduction, Count=@count, Signal=@SignalStack
                                ${updateRadiationValue}
                                WHERE Serial=@Serial AND 
                                CONVERT(datetime, CurrentDate, 103)=@currentDate`);
                    console.log('Update done');
                }

                // } else {
                //     console.log('Serial not found');
                // }
            }
        }
    } catch (err) {
        console.log(err);
    }
})

client_redis.subscribe('ECHO_SERVICE_DEVICE_RAW_DATA');


module.exports = {
    // connectMQTTFunc: connectMQTTFunc,
    // subscribeMessage: subscribeMessage
}
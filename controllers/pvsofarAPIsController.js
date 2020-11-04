//CONNECT DATABASE
const { sqlPool_SWH, sqlPool_PV } = require('./connectDB');

const axios = require('axios');

const sql = require('mssql');

//
require('dotenv').config();

//SSOC PV APIs
const host = process.env.APIPV_HOST || `https://ssoc.solarbk.vn`

//Gia dien default
const defaultPrice = 2971;

//Gia dien Amata
const defaultAmata = 440;

// fs
const fs = require('fs');

//path
const path = require('path');

// table infor
let projectInfo = `tb_ProjectInfo`, clPerson = `tb_Cl_Person`,
    nextCalculateTable = 'tb_PVNextCalculated', PVinfo = `tb_PVSofarInfo`,
    pvsofarNextLog = 'tb_PVSofarNextLog', pvsofarv3NextLog = 'tb_PVSofarV3Log';

let loadingLang = async (lang) => {
    let pathRead = path.join(__dirname, '/lang', `${lang}.json`);
    let choose = fs.readFileSync(pathRead);
    return JSON.parse(choose);
}

function getCurrentTime() {
    let currentDate = new Date();
    let hour = ('0' + currentDate.getHours()).slice(-2);
    let minute = ('0' + currentDate.getMinutes()).slice(-2);
    let second = ('0' + currentDate.getSeconds()).slice(-2);
    return `${hour}:${minute}:${second}`;
}

function getCurrentDate() {
    let currentDate = new Date();
    let day = ('0' + currentDate.getDate()).slice(-2);
    let month = ('0' + (currentDate.getMonth() + 1)).slice(-2);
    let year = currentDate.getFullYear();
    return `${year}-${month}-${day}`;
}

let warrantyInfo = async (Request, Response) => {
    try {
        let lang = Request.headers['x-language'];
        let langTemp = await loadingLang(lang);
        let currentLang = langTemp.warrantyinfo;

        let PersonID = JSON.parse(Request.headers.user).PersonID;

        let queryPersonInfo = await sqlPool_SWH.request()
            .query(`
            SELECT TOP(1) Name, Address FROM tb_Cl_Person WHERE PersonID = '${PersonID}'
            `)
        let getPersonInfo = queryPersonInfo.recordset[0];

        await axios.get(`${host}/api/warranty-maintenance/warranty`, {
            params: {
                user: PersonID
            }
        }).then(response => {

            let firstData = response.data[0].device_list[0]
            let labelTable = [];
            for (let name in firstData) {
                switch (name) {
                    case 'image': {
                        labelTable.push({ key: 'image', label: '' })
                    } break
                    case 'group_name': {
                        labelTable.push({ key: 'group_name', label: currentLang.device })
                    } break
                    case 'dev_name': {
                        labelTable.push({ key: 'dev_name', label: currentLang.producttype })
                    } break
                    case 'amount': {
                        labelTable.push({ key: 'amount', label: currentLang.quantity })
                    } break
                    case 'unit': {
                        labelTable.push({ key: 'unit', label: currentLang.unit })
                    } break
                    case 'serial': {
                        labelTable.push({ key: 'serial', label: currentLang.serial })
                    } break
                    case 'warranty_from': {
                        labelTable.push({ key: 'warranty_from', label: currentLang.warrantyfrom })
                    } break
                    case 'warranty_to': {
                        labelTable.push({ key: 'warranty_to', label: currentLang.warrantyto })
                    }
                }
            }


            response.data[0].device_list.forEach(e => {
                let imgSplit = e.image.split('/');
                e.image = imgSplit[imgSplit.length - 1];
            })

            Response.status(200).json({
                customerInfo: getPersonInfo,
                warrantyInfo: response.data[0],
                labelTable: labelTable
            })
        })
    } catch (err) {
        Response.status(500).json({
            message: `Không có dữ liệu`
        })
    }
}

let maintenanceInfo = async (Request, Response) => {
    try {
        let lang = Request.headers['x-language'];
        let langTemp = await loadingLang(lang);
        let currentLang = langTemp.warrantyinfo;

        let PersonID = JSON.parse(Request.headers.user).PersonID;

        let queryPersonInfo = await sqlPool_SWH.request()
            .query(`
            SELECT TOP(1) Name, Address FROM tb_Cl_Person WHERE PersonID = '${PersonID}'
            `)
        let getPersonInfo = queryPersonInfo.recordset[0];

        await axios.get(`${host}/api/warranty-maintenance/maintenance`, {
            params: {
                user: PersonID
            }
        }).then(response => {
            let contractInfo = response.data[0].contract,
                maintenanceInfo = response.data[0].maintenances;
            let firstData = response.data[0].maintenances[0];
            let labelTable = [];
            for (let name in firstData) {
                switch (name) {
                    case 'month': {
                        labelTable.push({ key: 'month', label: currentLang.maintainmonth })
                    } break
                    case 'picture': {
                        labelTable.push({ key: 'picture', label: '' })
                    } break
                    case 'works': {
                        labelTable.push({ key: 'works', label: currentLang.maintaincontent })
                    }
                    case 'rating': {
                        labelTable.push({ key: 'cmt_rating', label: currentLang.review })
                    }
                }
            }

            maintenanceInfo.forEach(e => {
                let imgSplit = e.picture.split('/');
                e.picture = imgSplit[imgSplit.length - 1];
            });

            Response.status(200).json({
                customerInfo: getPersonInfo,
                contractInfo: contractInfo,
                maintenanceInfo: maintenanceInfo,
                labelTable: labelTable
            })
        })
    } catch (err) {
        console.log(err)
        Response.status(500).json({
            message: `Không có dữ liệu`
        })
    }
}

let checkPersonInsurance = async (Request, Response) => {
    try {
        let PersonID = JSON.parse(Request.headers.user).PersonID;
        let QueryPersonInsurance = await sqlPool_PV.request()
            .query(`SELECT TOP (1) Warranty, Maintenance, Insurrance, Performance, Percentage, PackageID
            FROM tb_CLPersonInsurrance WHERE PersonID = '${PersonID}'`)
        let getPersonInsurance = QueryPersonInsurance.recordset[0];
        Response.status(200).json(getPersonInsurance);
    } catch (err) {
        console.log(err)
        Response.status(500).json({
            message: `Không có dữ liệu`
        })
    }
}

let viewInvMechanic = async (Request, Response) => {
    try {
        let He = Request.query.He;
        let PersonID = JSON.parse(Request.headers.user).PersonID;
        let queryProjectDataParam = await sqlPool_SWH.request()
            .query(`SELECT Serial, NumberDevice, Module FROM ${projectInfo} WHERE PersonID='${PersonID}' 
            AND Available = 1
            order by STT asc`);
        let getProjectParam = queryProjectDataParam.recordset;
        let labelBienso = [];
        let dataBienso = [];
        for (let i = 0; i < getProjectParam.length; i++) {
            await axios.get(`${host}/api/pvsofar/outback/lastData`, {
                params: {
                    serial: getProjectParam[i].Serial
                }
            }).then(response => {
                let data = response.data;
                let PVPower = (data.SystemStatus.PVPower === null) ? 0 : data.SystemStatus.PVPower,
                    PVLoad = (data.SystemStatus.OutputPower === null) ? 0 : data.SystemStatus.OutputPower,
                    Radiation = (data.SystemStatus.Radiation === null) ? 0 : data.SystemStatus.Radiation,
                    GeneratorStatus = (data.InverterList.SunyIslandInverterList[He].A38 === null) ? 0
                        : data.InverterList.SunyIslandInverterList[He].A38,
                    Battery = (data.InverterList.SunyIslandInverterList[He].A10 === null) ? 0
                        : data.InverterList.SunyIslandInverterList[He].A10,
                    BatteryCapacity = (data.InverterList.SunyIslandInverterList[He].A25 === null) ? 0
                        : data.InverterList.SunyIslandInverterList[He].A25
                if (i + 1 === getProjectParam.length) {
                    labelBienso.push({ key: 'bienso', label: 'Biến số' }, { key: 'giatri', label: 'Giá trị' },
                        { key: 'donvi', label: 'Đơn vị' });
                    dataBienso.push(
                        { bienso: 'Công suất PV', giatri: PVPower, donvi: 'kW' },
                        { bienso: 'Công suất tải', giatri: PVLoad, donvi: 'kW' },
                        { bienso: 'Công suất Pin', giatri: Math.abs(Battery), donvi: 'kW' },
                        { bienso: 'Dung lượng Pin', giatri: BatteryCapacity, donvi: '%' },
                        { bienso: 'Bức xạ mặt trời', giatri: Radiation, donvi: 'W/m<sup>2</sup>' }
                    )
                }
            })
        }

        Response.status(200).json({
            labelsMechanic: labelBienso,
            itemsMechanic: dataBienso
        })

    } catch (err) {
        Response.status(500).json({
            message: `Không có dữ liệu`
        })
    }
}

//smartbuilding statictis
let energyConsump = async (Serial, from, to) => {
    try {
        let TotalP_Rename = '',
            PosEnergy_Rename = '',
            TodayPosEnergy_Rename = '',
            changeableVar = 'PosEnergy';

        //module 0
        if (Serial === '01-C012-17-0066') {
            TotalP_Rename = 'as GetPV_Total';
            PosEnergy_Rename = 'as PLoadTotal';
            TodayPosEnergy_Rename = 'as PLoadToday';
        }
        //module 2, 3
        else if (Serial === '01-C012-17-0059' || Serial === '01-C012-0418-0001') {
            TotalP_Rename = 'as getPV_1';
            TodayPosEnergy_Rename = 'as getEnergy_1';
        }
        //module 6
        else if (Serial === '01-C012-1218-0014') {
            TotalP_Rename = 'as getPV_AirConditioner';
            PosEnergy_Rename = 'as getPV_HotPartCabinet';
            TodayPosEnergy_Rename = 'as getEnergy_AirConditioner';
            changeableVar = 'TotalP';
        }

        let queryData;
        //module 7
        if (Serial === '01-C012-2018-0023') {
            queryData = await sqlPool_PV.request()
                .query(`
            select convert(char(20), CurrentDate, 127) as CurrentDate, 
            coalesce(NULLIF(MetterTodayProduction, 0.00), TodayProduction) as TodayProduction, 
            coalesce(NULLIF(MetterTotalProduction, 0.00), TotalProduction) as TotalProduction, 
            PVPower, Radiation,
            InverterPower from ${PVinfo}
            where Serial = '${Serial}' and CurrentDate between '${from}' and '${to}'
            order by CurrentDate desc
        `);
        } else {
            queryData = await sqlPool_PV.request()
                .query(`SELECT convert(char(20), CurrentDate, 127) as CurrentDate, 
            MetterId, TotalP ${TotalP_Rename}, ${changeableVar} ${PosEnergy_Rename}, 
            TodayPosEnergy ${TodayPosEnergy_Rename}
            FROM tb_PVSofarFullMetter
            WHERE Serial='${Serial}'
            AND CurrentDate between '${from}' and '${to}'
            order by CurrentDate ASC`);
        }
        // module 1
        if (Serial === '01-C012-0418-0005') {
            let formatingArr = [];
            let getData = queryData.recordset;
            getData.forEach((e, index) => {
                if (formatingArr.length === 0) {
                    if (e.MetterId === '0') {
                        formatingArr.push({
                            CurrentDate: e.CurrentDate,
                            GetPV_MG: e.TotalP,
                            getEnergy_MG: e.TodayPosEnergy
                        })
                    } else if (e.MetterId === '1') {
                        formatingArr.push({
                            CurrentDate: e.CurrentDate,
                            getPV_BackUpCabine: e.TotalP
                        })
                    } else if (e.MetterId === '2') {
                        formatingArr.push({
                            CurrentDate: e.CurrentDate,
                            getPV_SuppilerPumpCabinet: e.TotalP
                        })
                    }
                } else {
                    let checkData = formatingArr[formatingArr.length - 1];
                    if (checkData.CurrentDate === e.CurrentDate) {
                        if (e.MetterId === '0') {
                            checkData['GetPV_MG'] = e.TotalP;
                            checkData['getEnergy_MG'] = e.TodayPosEnergy
                        } else if (e.MetterId === '1') {
                            checkData['getPV_BackUpCabine'] = e.TotalP
                        } else if (e.MetterId === '2') {
                            checkData['getPV_SuppilerPumpCabinet'] = e.TotalP
                        }
                    } else {
                        if (e.MetterId === '0') {
                            formatingArr.push({
                                CurrentDate: e.CurrentDate,
                                GetPV_MG: e.TotalP,
                                getEnergy_MG: e.TodayPosEnergy
                            })
                        } else if (e.MetterId === '1') {
                            formatingArr.push({
                                CurrentDate: e.CurrentDate,
                                getPV_BackUpCabine: e.TotalP
                            })
                        } else if (e.MetterId === '2') {
                            formatingArr.push({
                                CurrentDate: e.CurrentDate,
                                getPV_SuppilerPumpCabinet: e.TotalP
                            })
                        }
                    }
                }
            })
            return {
                data: formatingArr
            }
        }
        // module 4
        else if (Serial === '01-C012-0418-0003') {
            let getData = queryData.recordset;
            let formatingArr = [];
            getData.forEach((e, index) => {
                if (formatingArr.length === 0) {
                    if (e.MetterId === '0') {
                        formatingArr.push({
                            CurrentDate: e.CurrentDate,
                            getPV_3: e.TotalP,
                            getEnergy_3: e.TodayPosEnergy
                        })
                    } else if (e.MetterId === '1') {
                        formatingArr.push({
                            CurrentDate: e.CurrentDate,
                            getPV_PressurePump: e.TotalP
                        })
                    } else if (e.MetterId === '2') {
                        formatingArr.push({
                            CurrentDate: e.CurrentDate,
                            getPV_ServerRoom: e.TotalP
                        })
                    }
                } else {
                    let checkData = formatingArr[formatingArr.length - 1];
                    if (checkData.CurrentDate === e.CurrentDate) {
                        if (e.MetterId === '0') {
                            checkData['getPV_3'] = e.TotalP;
                            checkData['getEnergy_3'] = e.TodayPosEnergy
                        } else if (e.MetterId === '1') {
                            checkData['getPV_PressurePump'] = e.TotalP
                        } else if (e.MetterId === '2') {
                            checkData['getPV_ServerRoom'] = e.TotalP
                        }
                    } else {
                        if (e.MetterId === '0') {
                            formatingArr.push({
                                CurrentDate: e.CurrentDate,
                                getPV_3: e.TotalP,
                                getEnergy_3: e.TodayPosEnergy
                            })
                        } else if (e.MetterId === '1') {
                            formatingArr.push({
                                CurrentDate: e.CurrentDate,
                                getPV_PressurePump: e.TotalP
                            })
                        } else if (e.MetterId === '2') {
                            formatingArr.push({
                                CurrentDate: e.CurrentDate,
                                getPV_ServerRoom: e.TotalP
                            })
                        }
                    }
                }
            })
            return {
                data: formatingArr
            }
        }
        // module 5
        else if (Serial === '01-C012-0418-0002') {
            let getData = queryData.recordset;
            let formatingArr = [];
            getData.forEach((e, index) => {
                if (formatingArr.length === 0) {
                    if (e.MetterId === '0') {
                        formatingArr.push({
                            CurrentDate: e.CurrentDate,
                            getPV_4: e.TotalP,
                            getEnergy_4: e.TodayPosEnergy
                        })
                    } else if (e.MetterId === '1') {
                        formatingArr.push({
                            CurrentDate: e.CurrentDate,
                            getPV_Elevator: e.TotalP,
                            getEnergy_Elevator: e.TodayPosEnergy
                        })
                    }
                } else {
                    let checkData = formatingArr[formatingArr.length - 1];
                    if (checkData.CurrentDate === e.CurrentDate) {
                        if (e.MetterId === '0') {
                            checkData['getPV_4'] = e.TotalP;
                            checkData['getEnergy_4'] = e.TodayPosEnergy
                        } else if (e.MetterId === '1') {
                            checkData['getPV_Elevator'] = e.TotalP
                            checkData['getEnergy_Elevator'] = e.TodayPosEnergy
                        }
                    } else {
                        if (e.MetterId === '0') {
                            formatingArr.push({
                                CurrentDate: e.CurrentDate,
                                getPV_4: e.TotalP,
                                getEnergy_4: e.TodayPosEnergy
                            })
                        } else if (e.MetterId === '1') {
                            formatingArr.push({
                                CurrentDate: e.CurrentDate,
                                getPV_Elevator: e.TotalP,
                                getEnergy_Elevator: e.TodayPosEnergy
                            })
                        }
                    }
                }
            })
            return {
                data: formatingArr
            }
        }
        else {
            return {
                data: queryData.recordset
            }
        }
    } catch (err) {
        console.log(err)
    }
}

let energyConsump_dateMonthYear = async (by, Serial, from, to, price) => {
    try {
        let returnValue;

        let queryStringDate = `select * from 
        (select convert(char(10), I.CurrentDate, 127) as Date,
        max(L.TotalP) as TotalP,
        max(L.PosEnergy) as PosEnergy,
        max(L.TodayPosEnergy) as TodayPosEnergy,
        L.MetterId
        from ${PVinfo} I inner join
        (select Serial, MetterId, CurrentDate, coalesce(sum(TotalP), 0) as TotalP,
        coalesce(max(PosEnergy), 0) as PosEnergy,
        coalesce(max(TodayPosEnergy), 0) as TodayPosEnergy
        from tb_PVSofarFullMetter
        where Serial = '${Serial}'
        and convert(date, CurrentDate, 103) >= '${from}'
        and convert(date, CurrentDate, 103) <= '${to}'
        group by Serial, CurrentDate, MetterId) L
        on I.Serial = L.Serial
        and I.CurrentDate = L.CurrentDate
        group by convert(char(10), I.CurrentDate, 127), L.MetterId) as D
        order by D.Date, D.MetterId`;

        let queryStringMonth = `select * from 
        ( select left(CurrentDate, 7) as Month,
        max(TotalP) as TotalP,
        max(PosEnergy) as PosEnergy,
        sum(TodayPosEnergy) as TodayPosEnergy,
        MetterId
        from
        ( select convert(char(10), I.CurrentDate, 127) as CurrentDate, 
        max(L.TotalP) as TotalP,
        max(L.PosEnergy) as PosEnergy,
        max(L.TodayPosEnergy) as TodayPosEnergy,
        L.MetterId
        from ${PVinfo} I inner join
        (select Serial, CurrentDate,
        MetterId, 
        sum(TotalP) as TotalP,
        coalesce(max(PosEnergy), 0) as PosEnergy,
        coalesce(max(TodayPosEnergy), 0) as TodayPosEnergy from tb_PVSofarFullMetter
        where Serial = '${Serial}'
        and CONVERT(date, CurrentDate, 103) >= '${from}'
        and CONVERT(date, CurrentDate, 103) <= '${to}'
        group by Serial, CurrentDate, MetterId) L
        on I.Serial = L.Serial
        and I.CurrentDate = L.CurrentDate
        group by convert(char(10), I.CurrentDate, 127), L.MetterId) D
        group by left(CurrentDate, 7), MetterId) E
        order by Month, MetterId ASC`;

        let queryStringYear = `select * from 
        ( select left(CurrentDate, 4) as Year,
        max(TotalP) as TotalP,
        max(PosEnergy) as PosEnergy,
        sum(TodayPosEnergy) as TodayPosEnergy,
        MetterId
        from
        ( select left(CurrentDate, 7) as CurrentDate,  
        max(TotalP) as TotalP,
        max(PosEnergy) as PosEnergy,
        sum(TodayPosEnergy) as TodayPosEnergy,
        MetterId
        from
        ( select convert(char(10), I.CurrentDate, 127) as CurrentDate, 
        max(L.TotalP) as TotalP,
        max(L.PosEnergy) as PosEnergy,
        max(L.TodayPosEnergy) as TodayPosEnergy,
        L.MetterId
        from ${PVinfo} I inner join
        ( select Serial, CurrentDate, 
        sum(TotalP) as TotalP,
        coalesce(max(PosEnergy), 0) as PosEnergy,
        coalesce(max(TodayPosEnergy), 0) as TodayPosEnergy,
        MetterId 
        from tb_PVSofarFullMetter
        where Serial = '${Serial}'
        and convert(date, CurrentDate, 103) >= '${from}'
        and convert(date, CurrentDate, 103) <= '${to}'
        group by Serial, CurrentDate, MetterId
        ) L
        on I.Serial = L.Serial
        and I.CurrentDate = L.CurrentDate
        group by convert(char(10), I.CurrentDate, 127), L.MetterId) D
        group by left(CurrentDate, 7), MetterId) E
        group by left(CurrentDate, 4), MetterId) F
        order by Year, MetterId ASC`;

        //module 0
        if (Serial === '01-C012-17-0066') {
            if (by === 'date') {
                let queryData = await sqlPool_PV.request()
                    .query(`
                    select * from 
                    (select convert(char(10), I.CurrentDate, 127) as Date,
                    max(L.TotalP) as GetPV_Total,
                    max(L.PosEnergy) as PLoadTotal,
                    max(L.TodayPosEnergy) as PLoadToday,
                    L.MetterId
                    from ${PVinfo} I inner join
                    (select Serial, MetterId, CurrentDate, coalesce(sum(TotalP), 0) as TotalP,
                    coalesce(max(PosEnergy), 0) as PosEnergy,
                    coalesce(max(TodayPosEnergy), 0) as TodayPosEnergy
                    from tb_PVSofarFullMetter
                    where Serial = '${Serial}'
                    and convert(date, CurrentDate, 103) >= '${from}'
                    and convert(date, CurrentDate, 103) <= '${to}'
                    group by Serial, CurrentDate, MetterId) L
                    on I.Serial = L.Serial
                    and I.CurrentDate = L.CurrentDate
                    group by convert(char(10), I.CurrentDate, 127), L.MetterId) as D
                    order by D.Date, D.MetterId
                    `)
                returnValue = queryData.recordset;
            } else if (by === 'month') {
                let queryData = await sqlPool_PV.request()
                    .query(`
                    select * from 
                    ( select left(CurrentDate, 7) as Month,
                    max(TotalP) as GetPV_Total,
                    max(PosEnergy) as PLoadTotal,
                    sum(TodayPosEnergy) as PLoadToday,
                    MetterId from
                    ( select convert(char(10), I.CurrentDate, 127) as CurrentDate, 
                    max(L.TotalP) as TotalP,
                    max(L.PosEnergy) as PosEnergy,
                    max(L.TodayPosEnergy) as TodayPosEnergy,
                    L.MetterId
                    from ${PVinfo} I inner join
                    (select Serial, CurrentDate,
                    MetterId, 
                    sum(TotalP) as TotalP,
                    coalesce(max(PosEnergy), 0) as PosEnergy,
                    coalesce(max(TodayPosEnergy), 0) as TodayPosEnergy 
                    from tb_PVSofarFullMetter
                    where Serial = '${Serial}'
                    and CONVERT(date, CurrentDate, 103) >= '${from}'
                    and CONVERT(date, CurrentDate, 103) <= '${to}'
                    group by Serial, CurrentDate, MetterId) L
                    on I.Serial = L.Serial
                    and I.CurrentDate = L.CurrentDate
                    group by convert(char(10), I.CurrentDate, 127), L.MetterId) D
                    group by left(CurrentDate, 7), MetterId) E
                    order by Month, MetterId ASC
                    `);
                returnValue = queryData.recordset;
            } else if (by === 'year') {
                let queryData = await sqlPool_PV.request()
                    .query(`
                    select * from 
                    ( select left(CurrentDate, 4) as Year,
                    max(TotalP) as GetPV_Total,
                    max(PosEnergy) as PLoadTotal,
                    sum(TodayPosEnergy) as PLoadToday,
                    MetterId
                    from
                    ( select left(CurrentDate, 7) as CurrentDate,  
                    max(TotalP) as TotalP,
                    max(PosEnergy) as PosEnergy,
                    sum(TodayPosEnergy) as TodayPosEnergy,
                    MetterId
                    from
                    ( select convert(char(10), I.CurrentDate, 127) as CurrentDate, 
                    max(L.TotalP) as TotalP,
                    max(L.PosEnergy) as PosEnergy,
                    max(L.TodayPosEnergy) as TodayPosEnergy,
                    L.MetterId
                    from ${PVinfo} I inner join
                    ( select Serial, CurrentDate, 
                    sum(TotalP) as TotalP,
                    coalesce(max(PosEnergy), 0) as PosEnergy,
                    coalesce(max(TodayPosEnergy), 0) as TodayPosEnergy,
                    MetterId 
                    from tb_PVSofarFullMetter
                    where Serial = '${Serial}'
                    and convert(date, CurrentDate, 103) >= '${from}'
                    and convert(date, CurrentDate, 103) <= '${to}'
                    group by Serial, CurrentDate, MetterId
                    ) L
                    on I.Serial = L.Serial
                    and I.CurrentDate = L.CurrentDate
                    group by convert(char(10), I.CurrentDate, 127), L.MetterId) D
                    group by left(CurrentDate, 7), MetterId) E
                    group by left(CurrentDate, 4), MetterId) F
                    order by Year
                    `);
                returnValue = queryData.recordset;
            }
        }
        //module 1 
        else if (Serial === '01-C012-0418-0005') {
            let getData;
            let byValue;
            if (by === 'date') {
                let queryData = await sqlPool_PV.request()
                    .query(queryStringDate)
                getData = queryData.recordset;
                byValue = 'Date';
            } else if (by === 'month') {
                let queryData = await sqlPool_PV.request()
                    .query(queryStringMonth);
                getData = queryData.recordset;
                byValue = 'Month';
            } else if (by === 'year') {
                let queryData = await sqlPool_PV.request()
                    .query(queryStringYear);
                getData = queryData.recordset;
                byValue = 'Year'
            }
            let formatingArr = [];
            getData.forEach((e, index) => {
                if (formatingArr.length === 0) {
                    if (e.MetterId === '0') {
                        formatingArr.push({
                            [byValue]: e[byValue],
                            GetPV_MG: e.TotalP,
                            getEnergy_MG: e.TodayPosEnergy
                        })
                    } else if (e.MetterId === '1') {
                        formatingArr.push({
                            [byValue]: e[byValue],
                            getPV_BackUpCabine: e.TotalP
                        })
                    } else if (e.MetterId === '2') {
                        formatingArr.push({
                            [byValue]: e[byValue],
                            getPV_SuppilerPumpCabinet: e.TotalP
                        })
                    }
                } else {
                    let checkData = formatingArr[formatingArr.length - 1];
                    if (checkData[byValue] === e[byValue]) {
                        if (e.MetterId === '0') {
                            checkData['GetPV_MG'] = e.TotalP;
                            checkData['getEnergy_MG'] = e.TodayPosEnergy
                        } else if (e.MetterId === '1') {
                            checkData['getPV_BackUpCabine'] = e.TotalP
                        } else if (e.MetterId === '2') {
                            checkData['getPV_SuppilerPumpCabinet'] = e.TotalP
                        }
                    } else {
                        if (e.MetterId === '0') {
                            formatingArr.push({
                                [byValue]: e[byValue],
                                GetPV_MG: e.TotalP,
                                getEnergy_MG: e.TodayPosEnergy
                            })
                        } else if (e.MetterId === '1') {
                            formatingArr.push({
                                [byValue]: e[byValue],
                                getPV_BackUpCabine: e.TotalP
                            })
                        } else if (e.MetterId === '2') {
                            formatingArr.push({
                                [byValue]: e[byValue],
                                getPV_SuppilerPumpCabinet: e.TotalP
                            })
                        }
                    }
                }
            })
            returnValue = formatingArr;
        }
        // module 2, 3
        else if (Serial === '01-C012-17-0059' || Serial === '01-C012-0418-0001') {
            if (by === 'date') {
                let queryData = await sqlPool_PV.request()
                    .query(`
                    select * from 
                    (select convert(char(10), I.CurrentDate, 127) as Date,
                    max(L.TotalP) as getPV_1,
                    max(L.TodayPosEnergy) as getEnergy_1,
                    L.MetterId
                    from ${PVinfo} I inner join
                    (select Serial, MetterId, CurrentDate, coalesce(sum(TotalP), 0) as TotalP,
                    coalesce(max(TodayPosEnergy), 0) as TodayPosEnergy
                    from tb_PVSofarFullMetter
                    where Serial = '${Serial}'
                    and convert(date, CurrentDate, 103) >= '${from}'
                    and convert(date, CurrentDate, 103) <= '${to}'
                    group by Serial, CurrentDate, MetterId) L
                    on I.Serial = L.Serial
                    and I.CurrentDate = L.CurrentDate
                    group by convert(char(10), I.CurrentDate, 127), L.MetterId) as D
                    order by D.Date, D.MetterId
                    `);
                returnValue = queryData.recordset
            } else if (by === 'month') {
                let queryData = await sqlPool_PV.request()
                    .query(`
                    select * from 
                    ( select left(CurrentDate, 7) as Month,
                    max(TotalP) as getPV_1,
                    sum(TodayPosEnergy) as getEnergy_1,
                    MetterId
                    from
                    ( select convert(char(10), I.CurrentDate, 127) as CurrentDate, 
                    max(L.TotalP) as TotalP,
                    max(L.TodayPosEnergy) as TodayPosEnergy,
                    L.MetterId
                    from ${PVinfo} I inner join
                    (select Serial, CurrentDate,
                    MetterId, 
                    sum(TotalP) as TotalP,
                    coalesce(max(TodayPosEnergy), 0) as TodayPosEnergy from tb_PVSofarFullMetter
                    where Serial = '${Serial}'
                    and CONVERT(date, CurrentDate, 103) >= '${from}'
                    and CONVERT(date, CurrentDate, 103) <= '${to}'
                    group by Serial, CurrentDate, MetterId) L
                    on I.Serial = L.Serial
                    and I.CurrentDate = L.CurrentDate
                    group by convert(char(10), I.CurrentDate, 127), L.MetterId) D
                    group by left(CurrentDate, 7), MetterId) E
                    order by Month, MetterId ASC
                    `);
                returnValue = queryData.recordset
            } else if (by === 'year') {
                let queryData = await sqlPool_PV.request()
                    .query(`
                    select * from 
                    ( select left(CurrentDate, 4) as Year,
                    max(TotalP) as getPV_1,
                    max(PosEnergy) as PosEnergy,
                    sum(TodayPosEnergy) as getEnergy_1,
                    MetterId
                    from
                    ( select left(CurrentDate, 7) as CurrentDate,  
                    max(TotalP) as TotalP,
                    max(PosEnergy) as PosEnergy,
                    sum(TodayPosEnergy) as TodayPosEnergy,
                    MetterId
                    from
                    ( select convert(char(10), I.CurrentDate, 127) as CurrentDate, 
                    max(L.TotalP) as TotalP,
                    max(L.PosEnergy) as PosEnergy,
                    max(L.TodayPosEnergy) as TodayPosEnergy,
                    L.MetterId
                    from ${PVinfo} I inner join
                    ( select Serial, CurrentDate, 
                    sum(TotalP) as TotalP,
                    coalesce(max(PosEnergy), 0) as PosEnergy,
                    coalesce(max(TodayPosEnergy), 0) as TodayPosEnergy,
                    MetterId 
                    from tb_PVSofarFullMetter
                    where Serial = '${Serial}'
                    and convert(date, CurrentDate, 103) >= '${from}'
                    and convert(date, CurrentDate, 103) <= '${to}'
                    group by Serial, CurrentDate, MetterId
                    ) L
                    on I.Serial = L.Serial
                    and I.CurrentDate = L.CurrentDate
                    group by convert(char(10), I.CurrentDate, 127), L.MetterId) D
                    group by left(CurrentDate, 7), MetterId) E
                    group by left(CurrentDate, 4), MetterId) F
                    order by Year
                    `);
                returnValue = queryData.recordset
            }
        }
        //module 4
        else if (Serial === '01-C012-0418-0003') {
            let getData;
            let byValue;
            if (by === 'date') {
                let queryData = await sqlPool_PV.request()
                    .query(queryStringDate);
                getData = queryData.recordset;
                byValue = 'Date'
            } else if (by === 'month') {
                let queryData = await sqlPool_PV.request()
                    .query(queryStringMonth);
                getData = queryData.recordset;
                byValue = 'Month';
            } else if (by === 'year') {
                let queryData = await sqlPool_PV.request()
                    .query(queryStringYear);
                getData = queryData.recordset;
                byValue = 'Year';
            }

            let formatingArr = [];
            getData.forEach((e, index) => {
                if (formatingArr.length === 0) {
                    if (e.MetterId === '0') {
                        formatingArr.push({
                            [byValue]: e[byValue],
                            getPV_3: e.TotalP,
                            getEnergy_3: e.TodayPosEnergy
                        })
                    } else if (e.MetterId === '1') {
                        formatingArr.push({
                            [byValue]: e[byValue],
                            getPV_PressurePump: e.TotalP
                        })
                    } else if (e.MetterId === '2') {
                        formatingArr.push({
                            [byValue]: e[byValue],
                            getPV_ServerRoom: e.TotalP
                        })
                    }
                } else {
                    let checkData = formatingArr[formatingArr.length - 1];
                    if (checkData[byValue] === e[byValue]) {
                        if (e.MetterId === '0') {
                            checkData['getPV_3'] = e.TotalP;
                            checkData['getEnergy_3'] = e.TodayPosEnergy
                        } else if (e.MetterId === '1') {
                            checkData['getPV_PressurePump'] = e.TotalP
                        } else if (e.MetterId === '2') {
                            checkData['getPV_ServerRoom'] = e.TotalP
                        }
                    } else {
                        if (e.MetterId === '0') {
                            formatingArr.push({
                                [byValue]: e[byValue],
                                getPV_3: e.TotalP,
                                getEnergy_3: e.TodayPosEnergy
                            })
                        } else if (e.MetterId === '1') {
                            formatingArr.push({
                                [byValue]: e[byValue],
                                getPV_PressurePump: e.TotalP
                            })
                        } else if (e.MetterId === '2') {
                            formatingArr.push({
                                [byValue]: e[byValue],
                                getPV_ServerRoom: e.TotalP
                            })
                        }
                    }
                }
            })
            returnValue = formatingArr;
        }
        //module 5
        else if (Serial === '01-C012-0418-0002') {
            let getData;
            let byValue;
            if (by === 'date') {
                let queryData = await sqlPool_PV.request()
                    .query(queryStringDate);
                getData = queryData.recordset;
                byValue = 'Date'
            } else if (by === 'month') {
                let queryData = await sqlPool_PV.request()
                    .query(queryStringMonth);
                getData = queryData.recordset;
                byValue = 'Month'
            } else if (by === 'year') {
                let queryData = await sqlPool_PV.request()
                    .query(queryStringYear);
                getData = queryData.recordset;
                byValue = 'Year'
            }
            let formatingArr = [];
            getData.forEach((e, index) => {
                if (formatingArr.length === 0) {
                    if (e.MetterId === '0') {
                        formatingArr.push({
                            [byValue]: e[byValue],
                            getPV_4: e.TotalP,
                            getEnergy_4: e.TodayPosEnergy
                        })
                    } else if (e.MetterId === '1') {
                        formatingArr.push({
                            [byValue]: e[byValue],
                            getPV_Elevator: e.TotalP,
                            getEnergy_Elevator: e.TodayPosEnergy
                        })
                    }
                } else {
                    let checkData = formatingArr[formatingArr.length - 1];
                    if (checkData[byValue] === e[byValue]) {
                        if (e.MetterId === '0') {
                            checkData['getPV_4'] = e.TotalP;
                            checkData['getEnergy_4'] = e.TodayPosEnergy
                        } else if (e.MetterId === '1') {
                            checkData['getPV_Elevator'] = e.TotalP
                            checkData['getEnergy_Elevator'] = e.TodayPosEnergy
                        }
                    } else {
                        if (e.MetterId === '0') {
                            formatingArr.push({
                                [byValue]: e[byValue],
                                getPV_4: e.TotalP,
                                getEnergy_4: e.TodayPosEnergy
                            })
                        } else if (e.MetterId === '1') {
                            formatingArr.push({
                                [byValue]: e[byValue],
                                getPV_Elevator: e.TotalP,
                                getEnergy_Elevator: e.TodayPosEnergy
                            })
                        }
                    }
                }
            })
            returnValue = formatingArr;
        }
        //module 6
        else if (Serial === '01-C012-1218-0014') {
            if (by === 'date') {
                let queryData = await sqlPool_PV.request()
                    .query(`
                    select * from 
                    (select convert(char(10), I.CurrentDate, 127) as Date,
                    max(L.TotalP_1) as getPV_AirConditioner,
                    max(L.TotalP_2) as getPV_HotPartCabinet,
                    max(L.TodayPosEnergy) as getEnergy_AirConditioner,
                    L.MetterId
                    from ${PVinfo} I inner join
                    (select Serial, MetterId, CurrentDate, coalesce(sum(TotalP), 0) as TotalP_1,
                    coalesce(sum(TotalP), 0) as TotalP_2,
                    coalesce(max(TodayPosEnergy), 0) as TodayPosEnergy
                    from tb_PVSofarFullMetter
                    where Serial = '${Serial}'
                    and convert(date, CurrentDate, 103) >= '${from}'
                    and convert(date, CurrentDate, 103) <= '${to}'
                    group by Serial, CurrentDate, MetterId) L
                    on I.Serial = L.Serial
                    and I.CurrentDate = L.CurrentDate
                    group by convert(char(10), I.CurrentDate, 127), L.MetterId) as D
                    order by D.Date, D.MetterId
                    `)
                returnValue = queryData.recordset;
            } else if (by === 'month') {
                let queryData = await sqlPool_PV.request()
                    .query(`
                    select * from 
                    ( select left(CurrentDate, 7) as Month,
                    max(TotalP_1) as getPV_AirConditioner,
                    max(TotalP_2) as getPV_HotPartCabinet,
                    sum(TodayPosEnergy) as getEnergy_AirConditioner,
                    MetterId
                    from
                    ( select convert(char(10), I.CurrentDate, 127) as CurrentDate, 
                    max(L.TotalP_1) as TotalP_1,
                    max(L.TotalP_2) as TotalP_2,
                    max(L.TodayPosEnergy) as TodayPosEnergy,
                    L.MetterId
                    from ${PVinfo} I inner join
                    (select Serial, CurrentDate,
                    MetterId,
                    sum(TotalP) as TotalP_1,
                    sum(TotalP) as TotalP_2,
                    coalesce(max(TodayPosEnergy), 0) as TodayPosEnergy from tb_PVSofarFullMetter
                    where Serial = '${Serial}'
                    and CONVERT(date, CurrentDate, 103) >= '${from}'
                    and CONVERT(date, CurrentDate, 103) <= '${to}'
                    group by Serial, CurrentDate, MetterId) L
                    on I.Serial = L.Serial
                    and I.CurrentDate = L.CurrentDate
                    group by convert(char(10), I.CurrentDate, 127), L.MetterId) D
                    group by left(CurrentDate, 7), MetterId) E
                    order by Month, MetterId ASC
                    `);
                returnValue = queryData.recordset;
            } else if (by === 'year') {
                let queryData = await sqlPool_PV.request()
                    .query(`
                    select * from 
                    ( select left(CurrentDate, 4) as Year,
                    max(TotalP_1) as getPV_AirConditioner,
                    max(TotalP_2) as getPV_HotPartCabinet,
                    sum(TodayPosEnergy) as getEnergy_AirConditioner,
                    MetterId
                    from
                    ( select left(CurrentDate, 7) as CurrentDate,  
                    max(TotalP_1) as TotalP_1,
                    max(TotalP_2) as TotalP_2,
                    sum(TodayPosEnergy) as TodayPosEnergy,
                    MetterId
                    from
                    ( select convert(char(10), I.CurrentDate, 127) as CurrentDate, 
                    max(L.TotalP_1) as TotalP_1,
                    max(L.TotalP_2) as TotalP_2,
                    max(L.TodayPosEnergy) as TodayPosEnergy,
                    L.MetterId
                    from ${PVinfo} I inner join
                    ( select Serial, CurrentDate, 
                    sum(TotalP) as TotalP_1,
                    sum(TotalP) as TotalP_2,
                    coalesce(max(TodayPosEnergy), 0) as TodayPosEnergy,
                    MetterId 
                    from tb_PVSofarFullMetter
                    where Serial = '${Serial}'
                    and convert(date, CurrentDate, 103) >= '${from}'
                    and convert(date, CurrentDate, 103) <= '${to}'
                    group by Serial, CurrentDate, MetterId
                    ) L
                    on I.Serial = L.Serial
                    and I.CurrentDate = L.CurrentDate
                    group by convert(char(10), I.CurrentDate, 127), L.MetterId) D
                    group by left(CurrentDate, 7), MetterId) E
                    group by left(CurrentDate, 4), MetterId) F
                    order by Year`);
                returnValue = queryData.recordset;
            }
        }
        //module 7
        else if (Serial === '01-C012-2018-0023') {
            if (by === 'date') {
                let queryDate = await sqlPool_PV.request()
                    .query(`select * from 
                    (select convert(char(10), I.CurrentDate, 127) as Date, 
                    max(coalesce(NULLIF(I.MetterTodayProduction, 0.00), I.TodayProduction)) 
                    as TodayProduction,
                    max(CONVERT(float, I.Radiation)) as Radiation,
                    CONVERT(DECIMAL(10,2),(max(CONVERT(float, I.Radiation))/12)) as TotalRadiation,
                    max(L.Power) as Power
                    from ${PVinfo} I inner join
                        (select Serial, CurrentDate, sum(A11/1000) as Power from tb_Sunspec_Inverter
                        where Serial = '${Serial}'
                        and CONVERT(date, CurrentDate, 103) >= '${from}'
                        and CONVERT(date, CurrentDate, 103) <= '${to}'
                        group by Serial, CurrentDate) L
                    on I.Serial = L.Serial
                    and I.CurrentDate = L.CurrentDate
                    group by convert(char(10), I.CurrentDate, 127)) as D
                    order by Date
                `);
                returnValue = sumPrice(queryDate.recordset, by, price);
            } else if (by === 'month') {
                let queryMonth = await sqlPool_PV.request()
                    .query(`
                    select * from 
                    ( select left(CurrentDate, 7) as Month, sum(Energy) as MonthProduction, 
                    sum(Radiation) as Radiation,
                    max(PVPower) as Power from
                    ( select convert(char(10), I.CurrentDate, 127) as CurrentDate, 
                    max(coalesce(NULLIF(I.MetterTodayProduction, 0.00), I.TodayProduction)) as Energy,
                    max(CONVERT(float, I.Radiation)) as Radiation,
                    max(L.Power) as PVPower
                    from ${PVinfo} I inner join
                    (select Serial, CurrentDate, sum(A11/1000) as Power from tb_Sunspec_Inverter
                    where Serial = '${Serial}'
                    and CONVERT(date, CurrentDate, 103) >= '${from}'
                    and CONVERT(date, CurrentDate, 103) <= '${to}'
                    group by Serial, CurrentDate) L
                    on I.Serial = L.Serial
                    and I.CurrentDate = L.CurrentDate
                    group by convert(char(10), I.CurrentDate, 127)) D
                    group by left(CurrentDate, 7)) E
                    order by Month`);
                returnValue = sumPrice(queryMonth.recordset, by, price);
            } else if (by === 'year') {
                let queryYear = await sqlPool_PV.request()
                    .query(`select * from 
                    ( select left(CurrentDate, 4) as Year, sum(Energy) as YearProduction,
                    sum(Radiation) as Radiation, 
                    max(PVPower) as Power from
                    ( select left(CurrentDate, 7) as CurrentDate, sum(Energy) as Energy,
                    sum(Radiation) as Radiation, 
                    max(PVPower) as PVPower from
                    ( select convert(char(10), I.CurrentDate, 127) as CurrentDate, 
                    max(coalesce(NULLIF(I.MetterTodayProduction, 0.00), I.TodayProduction)) as Energy,
                    max(CONVERT(float, I.Radiation)) as Radiation, 
                    max(L.Power) as PVPower
                    from ${PVinfo} I inner join
                    ( select Serial, CurrentDate, sum(A11/1000) as Power from tb_Sunspec_Inverter
                    where Serial = '${Serial}'
                    and convert(date, CurrentDate, 103) >= '${from}'
                    and convert(date, CurrentDate, 103) <= '${to}'
                    group by Serial, CurrentDate
                    ) L
                    on I.Serial = L.Serial
                    and I.CurrentDate = L.CurrentDate
                    group by convert(char(10), I.CurrentDate, 127)) D
                    group by left(CurrentDate, 7)) E
                    group by left(CurrentDate, 4)) F
                    order by Year`);
                returnValue = sumPrice(queryYear.recordset, by, price);
            }
        }
        return returnValue
    } catch (err) {
        console.log(err);
    }
}

let sofarGroupOverview = async (ModuleInfo) => {
    try {
        let queryOverview = await sqlPool_PV.request()
            .input('Serial', sql.NVarChar, ModuleInfo.Serial)
            .input('PersonID', sql.NVarChar, ModuleInfo.PersonID)
            .query(`SELECT TOP (1) * FROM ${nextCalculateTable} WHERE Serial=@Serial 
            ORDER BY STT DESC`);

        // Query today production
        let queryMonthProd = await sqlPool_PV.request()
            .input('Serial', sql.NVarChar, ModuleInfo.Serial)
            .input('CurrentDate', `${getCurrentDate()} ${getCurrentTime()}`)
            .query(`SELECT CONVERT(CHAR(7), DAY, 127) AS Month, SUM(TodayProduction) as MonthProduction 
        FROM (SELECT CAST(CurrentDate as DATE) as DAY, MAX(TodayProduction) as TodayProduction
        FROM ${PVinfo} WHERE Serial=@Serial AND CONVERT(CHAR(7), CurrentDate, 127) = CONVERT(CHAR(7), @CurrentDate, 127) 
        GROUP BY CAST(CurrentDate as DATE)) T
        GROUP BY CONVERT(CHAR(7), DAY, 127)`);

        let MonthProd = queryMonthProd.recordset[0].MonthProduction;

        let { Serial, SessionID, ErrorCode, Signal, Communicate, InverterType,
            TodayProduction, TotalProduction, PVTemp, ENVTemp, MetterTodayProduction,
            MetterTotalProduction, MetterEnergyComsumption, BussinessMoneySaved, Radiation,
        } = queryOverview.recordset[0];
        let listRecord = [];
        if (ModuleInfo.HasMetter != 1) {
            for (let i = 0; i < ModuleInfo.NumberDevice; i++) {
                // inverter sofar 33kW
                let queryLogPV30kw = await sqlPool_PV.request()
                    .input('Id', sql.Int, i + 1)
                    .input('Serial', sql.NVarChar, ModuleInfo.Serial)
                    .query(`SELECT TOP (1) * FROM tb_PVSofarNextLog 
                WHERE InverterID=@Id and Serial=@Serial 
                ORDER BY STT DESC`);
                let getLogPV30kw = queryLogPV30kw.recordset[0];
                if (getLogPV30kw == undefined || getLogPV30kw == null) {

                } else {
                    let pushObj1 = {
                        InverterID: listRecord.length + 1,
                        Status: getLogPV30kw.Status,
                        pv1_cstt: getLogPV30kw.A10,
                        pv2_cstt: getLogPV30kw.A11,
                        pv3_cstt: 0,
                        pv1_voltage: getLogPV30kw.A6,
                        pv2_voltage: getLogPV30kw.A8,
                        pv3_voltage: 0,
                        pvload: getLogPV30kw.A12
                    };
                    listRecord.push(pushObj1);
                }
                // inverter sofar 60kW
                let queryLogPV60kw = await sqlPool_PV.request()
                    .input('Id', sql.Int, i + 1)
                    .input('Serial', sql.NVarChar, ModuleInfo.Serial)
                    .query(`SELECT TOP (1) * FROM tb_PVSofarV3Log 
                WHERE InverterID=@Id and Serial=@Serial 
                ORDER BY STT DESC`);
                let getLogPV60kw = queryLogPV60kw.recordset[0];
                if (getLogPV60kw == undefined || getLogPV60kw == null) {

                } else {
                    let pushObj2 = {
                        InverterID: listRecord.length + 1,
                        Status: getLogPV60kw.Status,
                        pv1_cstt: getLogPV60kw.A12,
                        pv2_cstt: getLogPV60kw.A13,
                        pv3_cstt: getLogPV60kw.A14,
                        pv1_voltage: getLogPV60kw.A6,
                        pv2_voltage: getLogPV60kw.A8,
                        pv3_voltage: getLogPV60kw.A10,
                        pvload: getLogPV60kw.A15
                    };
                    listRecord.push(pushObj2);
                }
            }
        }

        return {
            data: {
                Serial: Serial,
                SessionID: SessionID,
                ErrorCode: ErrorCode,
                Signal: null, // sample for test - not included in further solution
                Communicate: Communicate,
                Radiation: Radiation,
                InverterType: InverterType,
                TodayProduction: (TodayProduction == null) ? 0 : TodayProduction,
                TotalProduction: (TotalProduction == null) ? 0 : TotalProduction,
                PVTemp: (PVTemp == null) ? 0 : PVTemp,
                ENVTemp: (ENVTemp == null) ? 0 : ENVTemp,
                MetterTodayProduction: (MetterTodayProduction == null) ? 0 : MetterTodayProduction,
                MetterTotalProduction: (MetterTotalProduction == null) ? 0 : MetterTotalProduction,
                MonthProduction: (MonthProd == null) ? 0 : MonthProd,
                MetterEnergyComsumption: MetterEnergyComsumption,
                BussinessMoneySaved: BussinessMoneySaved,
                Module: (ModuleInfo.Module == null) ? `Hệ ${ModuleInfo.index}` : ModuleInfo.Module,
                ComparePVProduct: ModuleInfo.ComparePVProduct,
                HasMetter: ModuleInfo.HasMetter,
                ProductionMetterId: ModuleInfo.ProductionMetterId,
                listRecord: listRecord,
                metterList: [],
                fullMetterList: []
            }
        }
    } catch (err) {
        console.log(err);
    }
}

let overviewPage = async (Request, Response) => {
    try {
        let lang = Request.headers['x-language'];
        let langTemp = await loadingLang(lang);
        let currentLang = langTemp.overviewapi;

        let { pvType, device } = Request.body;
        let hesoCarbon = 0.8649;
        let PersonID = JSON.parse(Request.headers.user).PersonID;
        // 
        let price = await getPrice(sqlPool_SWH, PersonID);
        let fullName;
        if (lang === 'vi') {
            fullName = 'Fullname';
        } else {
            fullName = 'FullnameEN';
        }

        let queryProjectInfo = await sqlPool_SWH.request()
            .query(`SELECT ${fullName} as Fullname, LatLng FROM ${clPerson} WHERE PersonID ='${PersonID}'`);

        let queryProjectDataParam = await sqlPool_SWH.request()
            .query(`SELECT Serial, NumberDevice, Module, ProjectType, HasMetter, Birthday, 
            NumberMPPT, Capacity, ComparePVProduct, ProductionMetterId, LoadMetterId
            FROM ${projectInfo} WHERE PersonID='${PersonID}' AND Available = 1
            order by STT asc`);

        let getDataProject = queryProjectInfo.recordset[0],
            getProjectParam = queryProjectDataParam.recordset

        let splitLatLng = getDataProject.LatLng.split(','),
            Lat = splitLatLng[0].replace(" ", ""),
            Long = splitLatLng[1].replace(" ", ""),
            Lang = lang;

        let weather = await axios.get(`${host}/api/WeatherStation/weather`, {
            params: {
                lat: Lat,
                lon: Long,
                lang: Lang
            }
        }).then(response => {
            return response.data
        })

        let TodayProduction = 0,
            TotalProduction = 0,
            listRecord = [];

        let CSTT = [];
        let status = [];
        let radiation = [];

        //tariff 3 prices - params
        let ArrTariff = [];
        let tariffAvailable = false;

        //daobe - params
        let numberOfNguyenLy = [];
        let todayConsump = 0;
        let totalConsump = 0;
        let generatorStatus;

        let accQuyLabels = [
            { key: 'he', label: currentLang.module },
            { key: 'volt', label: `${currentLang.voltage} (V)` },
            { key: 'capacity', label: `${currentLang.capacitybattery} (%)` }
        ]
        let accQuyItems = [];

        let tableInvItems1 = [],
            tableInvItems2 = [],
            tableInvLabels = [
                { key: 'invID', label: currentLang.inverterset },
                { key: 'invPower', label: `${currentLang.inverterpower} (kW)` }
            ]
        //daobe - params

        //smart building params
        let getPV = 0, getPV_MG = 0, getEnergy_MG = 0,
            getPV_1 = 0, getEnergy_1 = 0,
            getPV_2 = 0, getEnergy_2 = 0,
            getPV_3 = 0, getEnergy_3 = 0,
            getPV_4 = 0, getEnergy_4 = 0,
            getPV_AirConditioner = 0, getEnergy_AirConditioner = 0,
            getPV_Elevator = 0, getEnergy_Elevator = 0,
            getPV_Sum = 0, getPV_BackUpCabine = 0,
            getPV_SuppilerPumpCabinet = 0,
            getPV_PressurePump = 0,
            getPV_ServerRoom = 0,
            getPV_HotPartCabinet = 0,
            getPV_Total = 0

        let ToLoadToday = 0, ToLoadTotal = 0;
        let smartbuilding_Sunspec = '01-C012-2018-0023';
        let PVEnergyToday = 0, PVEnergyTotal = 0, TienTietKiem = 0,
            total_pv_power = 0, total_inverter_power = 0
        //smart building params

        //PR define variables
        let totalTodayRadiation = 0;
        let totalCapacity = 0;

        //MultiPvSofar2 - Insurance
        let InsuranceChart_data = [],
            InsuranceChart_label = [];
        let InsuranceStatus;
        //MultiPvSofar2 - Insurance

        //huawei calculate
        if (pvType === 'HUAWEI') {
            if (device === 'MultiPVHuawei1') {
                for (let i = 0; i < getProjectParam.length; i++) {
                    await axios.get(`${host}/api/pvsofar/huawei/multiLastStatus`, {
                        params: {
                            user: PersonID,
                            serials: getProjectParam[i].Serial
                        }
                    }).then(response => {
                        let TodayProduction_met = response.data[0].MetterTodayProduction,
                            TotalProduction_met = response.data[0].MetterTotalProduction;

                        if (TodayProduction_met === null || TodayProduction_met === 0.00) {
                            TodayProduction += response.data[0].TodayProduction;
                        } else {
                            TodayProduction += response.data[0].MetterTodayProduction;
                        }

                        if (TotalProduction_met === null || TotalProduction_met === 0.00) {
                            TotalProduction += response.data[0].TotalProduction;
                        } else {
                            TotalProduction += response.data[0].MetterTotalProduction;
                        }

                        if (response.data[0].Radiation != null) {
                            radiation.push(response.data[0].Radiation)
                        }

                        let CSTT_A53 = 0,
                            CSTT_A54 = 0,
                            CSTT_A55 = 0,
                            CSTT_A56 = 0,
                            CSLOAD_A43 = 0;

                        let inverterData = [];
                        response.data[0].inveterList.forEach((e, index) => {

                            if (index + 1 <= getProjectParam[i].NumberDevice) {
                                CSTT_A53 += (e.A53 === null) ? 0 : e.A53;
                                CSTT_A54 += (e.A54 === null) ? 0 : e.A54;
                                CSTT_A55 += (e.A55 === null) ? 0 : e.A55;
                                CSTT_A56 += (e.A56 === null) ? 0 : e.A56;
                                CSLOAD_A43 += (e.A43 === null) ? 0 : e.A43;

                                let cstt_recent_A53 = (e.A53 === null) ? 0 : e.A53,
                                    cstt_recent_A54 = (e.A54 === null) ? 0 : e.A54,
                                    cstt_recent_A55 = (e.A55 === null) ? 0 : e.A55,
                                    cstt_recent_A56 = (e.A56 === null) ? 0 : e.A56;

                                let final_recent = cstt_recent_A53
                                    + cstt_recent_A54 + cstt_recent_A55 + cstt_recent_A56

                                inverterData.push({
                                    id: `Inverter-${index + 1}`,
                                    data: final_recent
                                })

                                listRecord.push({
                                    Module: (getProjectParam[i].Module === null)
                                        ? `${currentLang.module} ${i + 1}` : getProjectParam[i].Module,
                                    InverterID: e.HwId,
                                    Status: e.Status,
                                    A14: e.A14,
                                    A16: e.A16
                                })
                            } else {

                            }
                            if (index + 1 == response.data[0].inveterList.length) {
                                CSTT.push({
                                    Module: (getProjectParam[i].Module === null)
                                        ? `${currentLang.module} ${i + 1}` : getProjectParam[i].Module,
                                    CSTT: CSTT_A53 + CSTT_A54 + CSTT_A55 + CSTT_A56,
                                    CS_LOAD: CSLOAD_A43, Inverter: inverterData
                                });
                                inverterData = [];
                            }
                        })
                    })
                    await axios.get(`${host}/api/pvsofar/lastStatus`, {
                        params: {
                            serial: getProjectParam[i].Serial
                        }
                    }).then(response => {
                        status.push(
                            {
                                Inverter: (getProjectParam[i].Module === null)
                                    ? `${currentLang.module} ${i + 1}` : getProjectParam[i].Module,
                                count: response.data.Count,
                                lastUpdate: response.data.LastUpdate
                            }
                        )
                    })
                }
            }
            else if (device === 'MultiPVHuawei3') {
                for (let i = 0; i < getProjectParam.length; i++) {
                    let queryProduction = await sqlPool_PV.request()
                        .input('Serial', sql.NVarChar, getProjectParam[i].Serial)
                        .query(`SELECT TOP (1) * FROM ${nextCalculateTable} WHERE Serial=@Serial ORDER BY STT DESC`);

                    let getProduction = queryProduction.recordset[0];

                    TodayProduction += getProduction.TodayProduction;
                    TotalProduction += getProduction.TotalProduction;

                    if (getProduction.Radiation != null) {
                        radiation.push(getProduction.Radiation);
                    }

                    // query raw data detail
                    let inverterData = [];
                    let cstt_temp = 0;
                    let csload_temp = 0;
                    // console.log(getProjectParam[i]);
                    for (let n = 0; n < getProjectParam[i].NumberDevice; n++) {
                        let queryRawData = await sqlPool_PV.request()
                            .input('Serial', sql.NVarChar, getProjectParam[i].Serial)
                            .input('id', sql.Int, n + 1)
                            .query(`SELECT TOP (1) * FROM tb_PVSofarHuaweiInverterV3 WHERE Serial=@Serial AND HwId=@id 
                            ORDER BY STT DESC`)

                        let getRawData = queryRawData.recordset[0];

                        inverterData.push({
                            id: `Inverter-${n + 1}`,
                            data: getRawData.A70
                        })

                        listRecord.push({
                            Module: (getProjectParam[i].Module === null || getProjectParam[i].Module === '')
                                ? `${currentLang.module} ${i + 1}` : getProjectParam[i].Module,
                            InverterID: getRawData.HwId,
                            Status: getRawData.Status,
                            A9: getRawData.A9,
                            A13: getRawData.A13,
                            A17: getRawData.A17,
                            A21: getRawData.A21,
                            A25: getRawData.A25,
                            A29: getRawData.A29,
                            A33: getRawData.A33,
                            A37: getRawData.A37,
                            A41: getRawData.A41,
                            A45: getRawData.A45,
                            A49: getRawData.A49
                        })

                        cstt_temp += getRawData.A70;
                        csload_temp += getRawData.A72;

                        // if (n + 1 == getProjectParam[i].NumberDevice) {
                        //     inverterData = [];
                        // }
                    }
                    // console.log(listRecord);
                    CSTT.push({
                        Module: (getProjectParam[i].Module === null)
                            ? `${currentLang.module} ${i + 1}` : getProjectParam[i].Module,
                        CSTT: cstt_temp,
                        CS_LOAD: csload_temp, Inverter: inverterData
                    });
                    inverterData = [];
                }
            }
            else {
                // MultiPVHuawei2
                for (let i = 0; i < getProjectParam.length; i++) {
                    await axios.get(`${host}/api/pvsofar/huawei/lastStatus`, {
                        params: {
                            user: PersonID,
                            serial: getProjectParam[i].Serial
                        }
                    }).then(response => {
                        let TodayProduction_met = response.data.MetterTodayProduction,
                            TotalProduction_met = response.data.MetterTotalProduction;

                        if (TodayProduction_met === null || TodayProduction_met === 0.00) {
                            TodayProduction += response.data.TodayProduction;
                        } else {
                            TodayProduction += response.data.MetterTodayProduction;
                        }

                        if (TotalProduction_met === null || TotalProduction_met === 0.00) {
                            TotalProduction += response.data.TotalProduction;
                        } else {
                            TotalProduction += response.data.MetterTotalProduction;
                        }

                        if (response.data.Radiation != null) {
                            radiation.push(response.data.Radiation)
                        }

                        let CSTT_A53 = 0,
                            CSTT_A54 = 0,
                            CSTT_A55 = 0,
                            CSTT_A56 = 0,
                            CSLOAD_A43 = 0;

                        let inverterData = [];
                        response.data.inveterList.forEach((e, index) => {

                            if (index + 1 <= getProjectParam[i].NumberDevice) {
                                CSTT_A53 += (e.A53 === null) ? 0 : e.A53;
                                CSTT_A54 += (e.A54 === null) ? 0 : e.A54;
                                CSTT_A55 += (e.A55 === null) ? 0 : e.A55;
                                CSTT_A56 += (e.A56 === null) ? 0 : e.A56;
                                CSLOAD_A43 += (e.A43 === null) ? 0 : e.A43;

                                let cstt_recent_A53 = (e.A53 === null) ? 0 : e.A53,
                                    cstt_recent_A54 = (e.A54 === null) ? 0 : e.A54,
                                    cstt_recent_A55 = (e.A55 === null) ? 0 : e.A55,
                                    cstt_recent_A56 = (e.A56 === null) ? 0 : e.A56;

                                let final_recent = cstt_recent_A53
                                    + cstt_recent_A54 + cstt_recent_A55 + cstt_recent_A56

                                inverterData.push({
                                    id: `Inverter-${index + 1}`,
                                    data: final_recent
                                })

                                listRecord.push({
                                    Module: (getProjectParam[i].Module === null)
                                        ? `${currentLang.module} ${i + 1}` : getProjectParam[i].Module,
                                    InverterID: e.HwId,
                                    Status: e.Status,
                                    A14: e.A14,
                                    A16: e.A16
                                })
                            } else {

                            }
                            if (index + 1 == response.data.inveterList.length) {
                                CSTT.push({
                                    Module: (getProjectParam[i].Module === null)
                                        ? `${currentLang.module} ${i + 1}` : getProjectParam[i].Module,
                                    CSTT: (CSTT_A53 + CSTT_A54 + CSTT_A55 + CSTT_A56),
                                    CS_LOAD: (CSLOAD_A43), Inverter: inverterData
                                });
                                inverterData = [];
                            }
                        })
                    })
                    await axios.get(`${host}/api/pvsofar/lastStatus`, {
                        params: {
                            serial: getProjectParam[i].Serial
                        }
                    }).then(response => {
                        status.push(
                            {
                                Inverter: (getProjectParam[i].Module === null)
                                    ? `${currentLang.module} ${i + 1}` : getProjectParam[i].Module,
                                count: response.data.Count,
                                lastUpdate: response.data.LastUpdate
                            }
                        )
                    })
                }
            }
        } else if (pvType === 'SOFAR') {
            if (device === 'MultiPVSofar10') {
                for (let i = 0; i < getProjectParam.length; i++) {
                    await axios.get(`${host}/api/pvsofar/v2/lastData`, {
                        params: {
                            serials: getProjectParam[i].Serial
                        }
                    }).then(response => {
                        let TodayProduction_met = response.data[0].MetterTodayProduction,
                            TotalProduction_met = response.data[0].MetterTotalProduction;

                        if (TodayProduction_met === null || TodayProduction_met === 0.00) {
                            TodayProduction += response.data[0].TodayProduction;
                        } else {
                            TodayProduction += response.data[0].MetterTodayProduction;
                        }

                        if (TotalProduction_met === null || TotalProduction_met === 0.00) {
                            TotalProduction += response.data[0].TotalProduction;
                        } else {
                            TotalProduction += response.data[0].MetterTotalProduction;
                        }

                        if (response.data[0].Radiation != null) {
                            radiation.push(response.data[0].Radiation)
                        }

                        let CSTT_PV1Power = 0,
                            CSTT_PV2Power = 0,
                            CSTT_PV3Power = 0,
                            CS_LOAD = 0;

                        let inverterData = [];
                        response.data[i].listRecord.forEach((e, index) => {
                            if (index <= getProjectParam[i].NumberDevice) {
                                CSTT_PV1Power += (e.PV1Power === null) ? 0 : e.PV1Power;
                                CSTT_PV2Power += (e.PV2Power === null) ? 0 : e.PV2Power;
                                CSTT_PV3Power += (e.PV3Power === null) ? 0 : e.PV3Power;
                                CS_LOAD += (e.OutputPower === null) ? 0 : e.OutputPower;

                                let cstt_recent_pv1 = (e.PV1Power === null) ? 0 : e.PV1Power,
                                    cstt_recent_pv2 = (e.PV2Power === null) ? 0 : e.PV2Power,
                                    cstt_recent_pv3 = (e.PV3Power === null) ? 0 : e.PV3Power;

                                let final_recent = (cstt_recent_pv1
                                    + cstt_recent_pv2 + cstt_recent_pv3)

                                inverterData.push({
                                    id: `Inverter-${index + 1}`,
                                    data: final_recent
                                })

                                listRecord.push({
                                    Module: (getProjectParam[i].Module === null)
                                        ? `${currentLang.module} ${i + 1}` : getProjectParam[i].Module,
                                    InverterID: e.InverterID,
                                    Status: e.Status,
                                    PV1Volt: e.PV1Volt,
                                    PV2Volt: e.PV2Volt,
                                    PV3Volt: e.PV3Volt
                                })
                            } else {

                            }

                            if (index + 1 == response.data[i].listRecord.length) {
                                CSTT.push({
                                    Module: (getProjectParam[i].Module === null)
                                        ? `${currentLang.module} ${i + 1}` : getProjectParam[i].Module,
                                    CSTT: (CSTT_PV1Power + CSTT_PV2Power + CSTT_PV3Power),
                                    CS_LOAD: (CS_LOAD), Inverter: inverterData
                                });
                                inverterData = [];
                            }
                        })
                    })

                    await axios.get(`${host}/api/pvsofar/lastStatus`, {
                        params: {
                            serial: getProjectParam[i].Serial
                        }
                    }).then(response => {
                        status.push(
                            {
                                Inverter: (getProjectParam[i].Module === null)
                                    ? `${currentLang.module} ${i + 1}` : getProjectParam[i].Module,
                                count: response.data.Count,
                                lastUpdate: response.data.LastUpdate
                            }
                        )
                    })
                }
            }
            else if (device === 'Sungrow') {
                for (let i = 0; i < getProjectParam.length; i++) {
                    // sungrow total response
                    // define sub variables
                    let SungrowSerial = getProjectParam[i].Serial;
                    let numOfMppt = getProjectParam[i].NumberMPPT;
                    let numOfDevice = getProjectParam[i].NumberDevice;
                    let moduleName = getProjectParam[i].Module;

                    let queryLastDate = await sqlPool_PV.request()
                        .input('Serial', sql.NVarChar, SungrowSerial)
                        .query(`SELECT TOP (1) CONVERT(varchar(23), CurrentDate, 121) as CurrentDate
                        FROM ${nextCalculateTable} WHERE Serial=@Serial 
                        ORDER BY CurrentDate DESC`);

                    let getLastDate = queryLastDate.recordset[0].CurrentDate;

                    let queryProduction = await sqlPool_PV.request()
                        .input('Serial', sql.NVarChar, SungrowSerial)
                        .input('CurrentDate', getLastDate)
                        .query(`SELECT * FROM ${nextCalculateTable} WHERE Serial=@Serial 
                        AND CONVERT(datetime, CurrentDate, 103)=@CurrentDate ORDER BY STT DESC`);

                    let getProduction = queryProduction.recordset[0];

                    let queryPower = await sqlPool_PV.request()
                        .input('Serial', sql.NVarChar, SungrowSerial)
                        .input('CurrentDate', getLastDate)
                        .query(`SELECT InvID as id, Status as status, A34 as pv_power 
                        FROM tb_Sungrow_Inverter WHERE Serial=@Serial AND 
                        CONVERT(datetime, CurrentDate, 103)=@CurrentDate ORDER BY stt DESC`);

                    let getPower = queryPower.recordset;

                    // Ready for custom number of mppt
                    let selectMpptStr = '';
                    let stater = 2;
                    for (let m = 0; m < numOfMppt; m++) {
                        stater = stater + 2;
                        let mpptParam = ` A${stater},`;
                        selectMpptStr += mpptParam;
                    }

                    let mpptSelectTrim = selectMpptStr.slice(0, -1);

                    let queryMppt = await sqlPool_PV.request()
                        .input(`Serial`, sql.NVarChar, SungrowSerial)
                        .input(`CurrentDate`, getLastDate)
                        .query(`SELECT InvID as id, Status as status, 
                        ${mpptSelectTrim} FROM tb_Sungrow_Inverter 
                        WHERE Serial=@Serial AND 
                        CONVERT(datetime, CurrentDate, 103)=@CurrentDate 
                        ORDER BY id ASC`);

                    let getMppt = queryMppt.recordset;

                    let queryRadiation = await sqlPool_PV.request()
                        .input(`Serial`, sql.NVarChar, SungrowSerial)
                        .input(`CurrentDate`, getCurrentDate())
                        .query(`SELECT (sum(CONVERT(float, Radiation))/12)/1000 as TotalRadiation
                        FROM ${nextCalculateTable} WHERE Serial=@Serial
                        AND CONVERT(date, CurrentDate, 103)=@CurrentDate 
                        GROUP BY Serial`)

                    let getRadiation = queryRadiation.recordset[0];

                    // define values for globa variables
                    TotalProduction += getProduction.TotalProduction;
                    TodayProduction += getProduction.TodayProduction;

                    totalTodayRadiation += (getRadiation.TotalRadiation == null) ? 0 : getRadiation.TotalRadiation;
                    totalCapacity += (getProjectParam[i].Capacity == null) ? 0 : parseFloat(getProjectParam[i].Capacity);

                    if (getProduction.Radiation != null) {
                        radiation.push(getProduction.Radiation);
                    }

                    let pv_power = 0, pv_load = 0, inverterData = [];
                    for (let nod = 0; nod < numOfDevice; nod++) {
                        // let define 
                        let moduleInfo = {
                            Module: (moduleName === null) ? `${currentLang.module} ${i + 1}` : moduleName,
                            InverterID: (getMppt[nod] === undefined) ? nod : getMppt[nod].id,
                            Status: (getMppt[nod] === undefined) ? 0 : getMppt[nod].status,
                        };
                        stater = 2;
                        for (let nom = 0; nom < numOfMppt; nom++) {
                            stater = stater + 2;
                            let mpptParam = `A${stater}`;
                            moduleInfo[`Mppt${nom + 1}`] = (getMppt[nod] === undefined) ? 0 : getMppt[nod][mpptParam];
                        }
                        listRecord.push(moduleInfo);

                        pv_power += (getPower[nod] === undefined) ? 0 : getPower[nod].pv_power;

                        inverterData.push({
                            id: `Inverter-${nod + 1}`,
                            data: (getPower[nod] === undefined) ? 0 : getPower[nod].pv_power
                        });
                    }

                    CSTT.push({
                        Module: (moduleName === null)
                            ? `${currentLang.module} ${i + 1}` : moduleName,
                        CSTT: (pv_power),
                        CS_LOAD: (pv_load),
                        Inverter: inverterData
                    });
                    inverterData = [];

                    await axios.get(`${host}/api/pvsofar/lastStatus`, {
                        params: {
                            serial: SungrowSerial
                        }
                    }).then(response => {
                        status.push(
                            {
                                Inverter: (moduleName === null)
                                    ? `${currentLang.module} ${i + 1}` : moduleName,
                                count: response.data.Count,
                                lastUpdate: response.data.LastUpdate
                            }
                        )
                    })
                }
            }
            else if (device === 'MultiSunspec') {
                for (let i = 0; i < getProjectParam.length; i++) {
                    let response;
                    if (getProjectParam[i].ProjectType === 14) {
                        /**
                         * For test account demo we use birthday field as serial field --
                         */
                        getProjectParam[i].Serial = getProjectParam[i].Birthday;
                        let queryCurrentDate = await sqlPool_PV.request()
                            .input('Serial', sql.NVarChar, getProjectParam[i].Serial)
                            .query(`SELECT TOP (1) CONVERT(varchar(23), I.CurrentDate, 121) as CurrentDate,
                                II.PVPower, II.InverterPower, II.GridPower, II.LoadPower, II.Radiation
                                FROM ${nextCalculateTable} I
                                INNER JOIN ${PVinfo} II
                                on I.Serial = II.Serial
                                and I.CurrentDate = II.CurrentDate
                                WHERE I.Serial=@Serial ORDER BY CurrentDate DESC`);

                        let getCurrentDate = queryCurrentDate.recordset[0];

                        let queryProduction = await sqlPool_PV.request()
                            .input('Serial', sql.NVarChar, getProjectParam[i].Serial)
                            .input('CurrentDate', getCurrentDate.CurrentDate)
                            .query(`SELECT * FROM ${nextCalculateTable} WHERE Serial=@Serial 
                            AND CONVERT(datetime, CurrentDate, 103)=@CurrentDate ORDER BY STT DESC`);

                        let getProduction = queryProduction.recordset[0];

                        let queryPower = await sqlPool_PV.request()
                            .input('Serial', sql.NVarChar, getProjectParam[i].Serial)
                            .input('CurrentDate', getCurrentDate.CurrentDate)
                            .query(`SELECT InvID as id, Status as status, A11/1000 as load_power, 
                            A19/1000 as pv_power FROM tb_Sunspec_Inverter WHERE Serial=@Serial 
                            AND CONVERT(datetime, CurrentDate, 103)=@CurrentDate ORDER BY stt DESC`);

                        let getPower = queryPower.recordset;

                        let queryMppt = await sqlPool_PV.request()
                            .input('Serial', sql.NVarChar, getProjectParam[i].Serial)
                            .input('CurrentDate', getCurrentDate.CurrentDate)
                            .query(`SELECT * FROM tb_Sunspec_160 WHERE Serial=@Serial AND 
                            CONVERT(datetime, CurrentDate, 103)=@CurrentDate order by InvID DESC`);

                        let getMppt = queryMppt.recordset;

                        let queryTariff = await sqlPool_PV.request()
                            .input('Serial', sql.NVarChar, getProjectParam[i].Serial)
                            .input('CurrentDate', getCurrentDate.CurrentDate)
                            .query(`SELECT A2 as Tariff1, A3 as Tariff2, A4 as Tariff3 FROM 
                            tb_VinasinoFullMetter WHERE Serial=@Serial AND 
                            CONVERT(datetime, CurrentDate, 103)=@CurrentDate ORDER BY Id DESC`);

                        let getTariff = queryTariff.recordset[0];

                        for (let i = 0; i < getPower.length; i++) {
                            if (getPower[i].pv_power == null || getPower[i].pv_power == 0) {
                                let pv_mppt_power = 0;
                                for (let j = 0; j < getMppt.length; j++) {
                                    if (getPower[i].id == getMppt[j].InvID) {
                                        pv_mppt_power += (getMppt[j].A3 == null) ? 0 : getMppt[j].A3 / 1000
                                    }
                                }
                                getPower[i].pv_power = pv_mppt_power;
                            }
                        }

                        let mpptPower = 0;
                        getMppt.forEach(v => {
                            mpptPower += ((v.A3 == null) ? 0 : v.A3) / 1000
                        })

                        var group = {};
                        var result = getMppt.reduce(function (r, o) {
                            var key = o.InvID;
                            if (!group[key]) {
                                group[key] = Object.assign({});
                                group[key][`inverter`] = o.InvID;
                                group[key][`mppt_${o.ID}`] = (o.A2 == null) ? 0 : o.A2;
                                r.push(group[key]);
                            } else {
                                group[key][`mppt_${o.ID}`] = (o.A2 == null) ? 0 : o.A2;
                            }
                            return r;
                        }, []);
                        tariffAvailable = true;
                        response = {
                            data: [{
                                update_at: getCurrentDate.CurrentDate,
                                total_pv_power: ((getCurrentDate.PVPower == null) ? 0 : getCurrentDate.PVPower) > 0 ? getCurrentDate.PVPower : mpptPower,
                                total_inverter_power: getCurrentDate.InverterPower,
                                total_grid_power: getCurrentDate.GridPower,
                                total_load_power: getCurrentDate.LoadPower,
                                today_production: getProduction.TodayProduction,
                                total_production: getProduction.TotalProduction,
                                radiation: getCurrentDate.Radiation,
                                has_metter: getProjectParam[i].HasMetter,
                                module: getProjectParam[i].Module,
                                metter_today_producction: getProduction.MetterTodayProduction,
                                metter_total_producction: getProduction.MetterTotalProduction,
                                sunspec_inverters: getPower,
                                tariff: getTariff,
                                mppt_list: result
                            }]
                        }
                    } else {
                        response = await axios.get(`${host}/api/pvsofar/sunspec/multiLatestData`, {
                            params: {
                                serials: getProjectParam[i].Serial
                            }
                        }).then(response => { return response })
                    }
                    // return
                    let TodayProduction_met = response.data[0].metter_today_producction,
                        TotalProduction_met = response.data[0].metter_total_producction;
                    if (TodayProduction_met === null || TodayProduction_met === 0.00) {
                        TodayProduction += response.data[0].today_production;
                    } else {
                        TodayProduction += response.data[0].metter_today_producction;
                    }

                    if (TotalProduction_met === null || TotalProduction_met === 0.00) {
                        TotalProduction += response.data[0].total_production;
                    } else {
                        TotalProduction += response.data[0].metter_total_producction;;
                    }

                    if (response.data[0].radiation != null) {
                        radiation.push(response.data[0].radiation)
                    }

                    if (response.data[0].tariff != null) {
                        ArrTariff.push(response.data[0].tariff)
                    }

                    let pv_power = 0, mppt1 = 0, mppt2 = 0, mppt3 = 0, mppt4 = 0,
                        mppt5 = 0, mppt6 = 0, mppt7 = 0, mppt8 = 0,
                        mppt9 = 0, mppt10 = 0, pv_load = 0;

                    let inverterData = [];
                    for (let ro = 0; ro < response.data[0].sunspec_inverters.length; ro++) {
                        let resData = response.data[0];
                        pv_power += (resData.sunspec_inverters[ro].pv_power === null)
                            ? 0 : resData.sunspec_inverters[ro].pv_power;
                        pv_load += (resData.sunspec_inverters[ro].load_power === null)
                            ? 0 : resData.sunspec_inverters[ro].load_power;

                        inverterData.push({
                            id: `Inverter-${ro + 1}`,
                            data: (resData.sunspec_inverters[ro].pv_power === null)
                                ? 0 : resData.sunspec_inverters[ro].pv_power
                        })

                        mppt1 = (resData.mppt_list[ro].mppt_1 === null)
                            ? 0 : resData.mppt_list[ro].mppt_1;
                        mppt2 = (resData.mppt_list[ro].mppt_2 === null)
                            ? 0 : resData.mppt_list[ro].mppt_2;
                        mppt3 = (resData.mppt_list[ro].mppt_3 === null)
                            ? 0 : resData.mppt_list[ro].mppt_3;
                        mppt4 = (resData.mppt_list[ro].mppt_4 === null)
                            ? 0 : resData.mppt_list[ro].mppt_4;
                        mppt5 = (resData.mppt_list[ro].mppt_5 === null)
                            ? 0 : resData.mppt_list[ro].mppt_5;
                        mppt6 = (resData.mppt_list[ro].mppt_6 === null)
                            ? 0 : resData.mppt_list[ro].mppt_6;
                        mppt7 = (resData.mppt_list[ro].mppt_7 === null)
                            ? 0 : resData.mppt_list[ro].mppt_7;
                        mppt8 = (resData.mppt_list[ro].mppt_8 === null)
                            ? 0 : resData.mppt_list[ro].mppt_8;
                        mppt9 = (resData.mppt_list[ro].mppt_9 === null)
                            ? 0 : resData.mppt_list[ro].mppt_10;
                        mppt10 = (resData.mppt_list[ro].mppt_10 === null)
                            ? 0 : resData.mppt_list[ro].mppt_10;

                        if (ro + 1 <= getProjectParam[i].NumberDevice) {
                            listRecord.push({
                                Module: (getProjectParam[i].Module === null)
                                    ? `${currentLang.module} ${i + 1}` : getProjectParam[i].Module,
                                InverterID: resData.sunspec_inverters[ro].id,
                                Status: resData.sunspec_inverters[ro].status,
                                Mppt1: mppt1, Mppt2: mppt2, Mppt3: mppt3,
                                Mppt4: mppt4, Mppt5: mppt5, Mppt6: mppt6,
                                Mppt7: mppt7, Mppt8: mppt8, Mppt9: mppt9,
                                Mppt10: mppt10,
                            })
                        } else {

                        }
                        if (ro + 1 == response.data[0].sunspec_inverters.length) {
                            CSTT.push({
                                Module: (getProjectParam[i].Module === null)
                                    ? `${currentLang.module} ${i + 1}` : getProjectParam[i].Module,
                                CSTT: (pv_power),
                                CS_LOAD: (pv_load),
                                Inverter: inverterData
                            })
                            inverterData = [];
                        }
                    }

                    await axios.get(`${host}/api/pvsofar/lastStatus`, {
                        params: {
                            serial: getProjectParam[i].Serial
                        }
                    }).then(response => {
                        status.push(
                            {
                                Inverter: (getProjectParam[i].Module === null)
                                    ? `${currentLang.module} ${i + 1}` : getProjectParam[i].Module,
                                count: response.data.Count,
                                lastUpdate: response.data.LastUpdate
                            }
                        )
                    })
                }
            }
            else if (device === 'PV-SMA-OffGrid1') {
                for (let i = 0; i < getProjectParam.length; i++) {
                    await axios.get(`${host}/api/pvsofar/outback/lastData`, {
                        params: {
                            serial: getProjectParam[i].Serial
                        }
                    }).then(response => {
                        let res = response.data;
                        //load number battery
                        let NumberOfInv = res.InverterList.SunyIslandInverterList.length;
                        for (let inv = 0; inv < NumberOfInv; inv++) {
                            numberOfNguyenLy.push({ id: inv, text: `Hệ ${inv + 1}` });
                        }

                        //load main data
                        TodayProduction = (res.SystemStatus.TodayProduction === null) ? 0
                            : res.SystemStatus.TodayProduction;
                        TotalProduction = (res.SystemStatus.TotalProduction === null) ? 0
                            : res.SystemStatus.TotalProduction;

                        let pv_power, pv_load;
                        let inverterData = [];
                        // for (let ro = 0; ro < getProjectParam[i].NumberDevice; ro++) {
                        pv_power = (res.SystemStatus.PVPower === null)
                            ? 0 : res.SystemStatus.PVPower;
                        pv_load = (res.SystemStatus.OutputPower === null)
                            ? 0 : res.SystemStatus.OutputPower;
                        // if (ro + 1 == getProjectParam[i].NumberDevice) {
                        CSTT.push({
                            Module: (getProjectParam[i].Module === null)
                                ? `${currentLang.module} ${i + 1}` : getProjectParam[i].Module,
                            CSTT: (pv_power),
                            CS_LOAD: (pv_load),
                            Inverter: inverterData
                        });
                        inverterData = [];

                        //Consump in day
                        todayConsump = (res.SystemStatus.TodayEnergyConsumption === null) ? 0
                            : res.SystemStatus.TodayEnergyConsumption;
                        totalConsump = (res.SystemStatus.TotalEnergyConsumption === null) ? 0
                            : res.SystemStatus.TotalEnergyConsumption;

                        //generator status
                        let genStats = (res.InverterList.SunyIslandInverterList[0].A38 === null)
                            ? 0 : res.InverterList.SunyIslandInverterList[0].A38

                        //check
                        let genStatus_1 = currentLang.off, genStatus_2 = currentLang.error,
                            genStatus_3 = currentLang.intial, genStatus_4 = currentLang.ready,
                            genStatus_5 = currentLang.startup, genStatus_6 = currentLang.sync,
                            genStatus_7 = currentLang.run, genStatus_8 = currentLang.resync,
                            genStatus_9 = currentLang.isolate, genStatus_10 = currentLang.offslow,
                            genStatus_11 = currentLang.block, genStatus_12 = currentLang.blockerror
                        // console.log(genStats == 303);
                        if (genStats == 303) {
                            generatorStatus = genStatus_1;
                        } else if (genStats == 1392) {
                            generatorStatus = genStatus_2;
                        } else if (genStats == 1787) {
                            generatorStatus = genStatus_3;
                        } else if (genStats == 1788) {
                            generatorStatus = genStatus_4;
                        } else if (genStats == 1789) {
                            generatorStatus = genStatus_5;
                        } else if (genStats == 1790) {
                            generatorStatus = genStatus_6;
                        } else if (genStats == 1791) {
                            generatorStatus = genStatus_7;
                        } else if (genStats == 1792) {
                            generatorStatus = genStatus_8;
                        } else if (genStats == 1793) {
                            generatorStatus = genStatus_9;
                        } else if (genStats == 1794) {
                            generatorStatus = genStatus_10;
                        } else if (genStats == 1795) {
                            generatorStatus = genStatus_11;
                        } else if (genStats == 1796) {
                            generatorStatus = genStatus_12;
                        } else {
                            generatorStatus = genStatus_1;
                        }

                        for (let acc = 0; acc < res.InverterList.SunyIslandInverterList.length; acc++) {
                            accQuyItems.push(
                                {
                                    he: `H${i + 1}`,
                                    volt: (res.InverterList.SunyIslandInverterList[acc].A28 === null)
                                        ? 0 : res.InverterList.SunyIslandInverterList[acc].A28,
                                    capacity: (res.InverterList.SunyIslandInverterList[acc].A25 === null)
                                        ? 0 : res.InverterList.SunyIslandInverterList[acc].A25
                                }
                            )
                        }

                        //inv sofar
                        for (let inv1 = 0; inv1 < res.InverterList.SofarInverterList.length; inv1++) {
                            let A10 = (res.InverterList.SofarInverterList[inv1].A10 === null)
                                ? 0 : res.InverterList.SofarInverterList[inv1].A10;
                            let A11 = (res.InverterList.SofarInverterList[inv1].A11 === null)
                                ? 0 : res.InverterList.SofarInverterList[inv1].A11;
                            let invSofar = (parseFloat(A10) + parseFloat(A11));
                            tableInvItems1.push({
                                invID: `Inverter ${inv1 + 1}`,
                                status: res.InverterList.SofarInverterList[inv1].Status,
                                invPower: invSofar
                            })
                        }

                        //inv sunny
                        for (let inv2 = 0; inv2 < res.InverterList.SunyIslandInverterList.length; inv2++) {
                            let A10 = (res.InverterList.SunyIslandInverterList[inv2].A10 === null)
                                ? 0 : res.InverterList.SunyIslandInverterList[inv2].A10;
                            tableInvItems2.push({
                                invID: `${currentLang.module} ${inv2 + 1}`,
                                status: res.InverterList.SunyIslandInverterList[inv2].Status,
                                invPower: Math.abs(A10)
                            })
                        }
                        // }
                        // }
                    })
                    await axios.get(`${host}/api/pvsofar/lastStatus`, {
                        params: {
                            serial: getProjectParam[i].Serial
                        }
                    }).then(response => {

                        status.push(
                            {
                                Inverter: (getProjectParam[i].Module === null)
                                    ? `${currentLang.module} ${i + 1}` : getProjectParam[i].Module,
                                count: response.data.Count,
                                lastUpdate: response.data.LastUpdate
                            }
                        )
                    })
                }
            }
            else if (device === 'Sunspec') {
                for (let i = 0; i < getProjectParam.length; i++) {
                    await axios.get(`${host}/api/pvsofar/sunspec/latestData`, {
                        params: {
                            serial: getProjectParam[i].Serial
                        }
                    }).then(response => {
                        //metter production
                        let TodayProduction_met = response.data.metter_today_producction,
                            TotalProduction_met = response.data.metter_total_producction;
                        if (TodayProduction_met === null || TodayProduction_met === 0.00) {
                            TodayProduction += response.data.today_production;
                        } else {
                            TodayProduction += response.data.metter_today_producction;
                        }

                        if (TotalProduction_met === null || TotalProduction_met === 0.00) {
                            TotalProduction += response.data.total_production;
                        } else {
                            TotalProduction += response.data.metter_total_producction;;
                        }

                        if (response.data.radiation != null) {
                            radiation.push(response.data.radiation)
                        }

                        let pv_power = 0, mppt1 = 0, mppt2 = 0, mppt3 = 0, mppt4 = 0,
                            mppt5 = 0, mppt6 = 0, mppt7 = 0, mppt8 = 0,
                            mppt9 = 0, mppt10 = 0, pv_load = 0;
                        let inverterData = [];
                        for (let ro = 0; ro < getProjectParam[i].NumberDevice; ro++) {
                            let resData = response.data;
                            pv_power += (resData.sunspec_inverters[ro].pv_power === null)
                                ? 0 : resData.sunspec_inverters[ro].pv_power;
                            pv_load += (resData.sunspec_inverters[ro].load_power === null)
                                ? 0 : resData.sunspec_inverters[ro].load_power;

                            inverterData.push({
                                id: `Inverter-${ro + 1}`,
                                data: (resData.sunspec_inverters[ro].pv_power === null)
                                    ? 0 : resData.sunspec_inverters[ro].pv_power
                            })

                            if (resData.mppt_list[ro] === undefined) {
                                mppt1 = null
                                mppt2 = null
                                mppt3 = null
                                mppt4 = null
                                mppt5 = null
                                mppt6 = null
                                mppt7 = null
                                mppt8 = null
                                mppt9 = null
                                mppt10 = null
                            } else {
                                mppt1 = (resData.mppt_list[ro].mppt_1 === null)
                                    ? 0 : resData.mppt_list[ro].mppt_1;
                                mppt2 = (resData.mppt_list[ro].mppt_2 === null)
                                    ? 0 : resData.mppt_list[ro].mppt_2;
                                mppt3 = (resData.mppt_list[ro].mppt_3 === null)
                                    ? 0 : resData.mppt_list[ro].mppt_3;
                                mppt4 = (resData.mppt_list[ro].mppt_4 === null)
                                    ? 0 : resData.mppt_list[ro].mppt_4;
                                mppt5 = (resData.mppt_list[ro].mppt_5 === null)
                                    ? 0 : resData.mppt_list[ro].mppt_5;
                                mppt6 = (resData.mppt_list[ro].mppt_6 === null)
                                    ? 0 : resData.mppt_list[ro].mppt_6;
                                mppt7 = (resData.mppt_list[ro].mppt_7 === null)
                                    ? 0 : resData.mppt_list[ro].mppt_7;
                                mppt8 = (resData.mppt_list[ro].mppt_8 === null)
                                    ? 0 : resData.mppt_list[ro].mppt_8;
                                mppt9 = (resData.mppt_list[ro].mppt_9 === null)
                                    ? 0 : resData.mppt_list[ro].mppt_10;
                                mppt10 = (resData.mppt_list[ro].mppt_10 === null)
                                    ? 0 : resData.mppt_list[ro].mppt_10;
                            }
                            if (ro + 1 <= getProjectParam[i].NumberDevice) {
                                listRecord.push({
                                    Module: (getProjectParam[i].Module === null)
                                        ? `${currentLang.module} ${i + 1}` : getProjectParam[i].Module,
                                    InverterID: resData.mppt_list[ro].inverter,
                                    Status: resData.sunspec_inverters[ro].status,
                                    Mppt1: mppt1, Mppt2: mppt2, Mppt3: mppt3,
                                    Mppt4: mppt4, Mppt5: mppt5, Mppt6: mppt6,
                                    Mppt7: mppt7, Mppt8: mppt8, Mppt9: mppt9,
                                    Mppt10: mppt10,
                                })
                            } else {

                            }

                            if (ro + 1 == getProjectParam[i].NumberDevice) {
                                CSTT.push({
                                    Module: (getProjectParam[i].Module === null)
                                        ? `${currentLang.module} ${i + 1}` : getProjectParam[i].Module,
                                    CSTT: (pv_power),
                                    CS_LOAD: (pv_load),
                                    Inverter: inverterData
                                });
                                inverterData = [];
                            }
                        }
                    })
                    await axios.get(`${host}/api/pvsofar/lastStatus`, {
                        params: {
                            serial: getProjectParam[i].Serial
                        }
                    }).then(response => {
                        status.push(
                            {
                                Inverter: (getProjectParam[i].Module === null)
                                    ? `${currentLang.module} ${i + 1}` : getProjectParam[i].Module,
                                count: response.data.Count,
                                lastUpdate: response.data.LastUpdate
                            }
                        )
                    })
                }
            }
            else if (device === 'Amata' || device === 'MultiPVSofar1') {
                for (let i = 0; i < getProjectParam.length; i++) {
                    await axios.get(`${host}/api/pvsofarfunsion/lastData`, {
                        params: {
                            serials: getProjectParam[i].Serial
                        }
                    }).then(response => {
                        if (device === 'Amata') {
                            let TodayProduction_met = response.data[0].MetterTodayProduction,
                                TotalProduction_met = response.data[0].MetterTotalProduction;

                            if (TodayProduction_met === null || TodayProduction_met === 0.0) {
                                TodayProduction += response.data[0].TodayProduction;
                            } else {
                                TodayProduction += response.data[0].MetterTodayProduction
                            }

                            if (TotalProduction_met === null || TotalProduction_met === 0.0) {
                                TotalProduction += response.data[0].TotalProduction;
                            } else {
                                TotalProduction += response.data[0].MetterTotalProduction;
                            }
                        } else if (device === 'MultiPVSofar1') {
                            TodayProduction += (response.data[0].TodayProduction === null)
                                ? 0 : response.data[0].TodayProduction;
                            TotalProduction += (response.data[0].TotalProduction === null)
                                ? 0 : response.data[0].TotalProduction;
                            ToLoadToday += (response.data[0].MetterTodayProduction === null)
                                ? 0 : response.data[0].MetterTodayProduction;
                            ToLoadTotal += (response.data[0].MetterTotalProduction === null)
                                ? 0 : response.data[0].MetterTotalProduction;
                        }

                        if (response.data[0].Radiation != null) {
                            radiation.push(response.data[0].Radiation)
                        }

                        let CSTT_A10 = 0,
                            CSTT_A11 = 0,
                            CSTT_A12 = 0;
                        let inverterData = [];
                        response.data[0].listRecord.forEach((e, index) => {
                            if (index + 1 <= getProjectParam[i].NumberDevice) {
                                CSTT_A10 += (e.A10 === null) ? 0 : e.A10;
                                CSTT_A11 += (e.A11 === null) ? 0 : e.A11;
                                CSTT_A12 += (e.A12 === null) ? 0 : e.A12;

                                let cstt_recent_A10 = (e.A10 === null) ? 0 : e.A10;
                                let cstt_recent_A11 = (e.A11 === null) ? 0 : e.A11;

                                let final_recent = (cstt_recent_A10 + cstt_recent_A11);

                                inverterData.push({
                                    id: `Inverter-${index + 1}`,
                                    data: final_recent
                                })

                                listRecord.push({
                                    Module: (getProjectParam[i].Module === null)
                                        ? `${currentLang.module} ${i + 1}` : getProjectParam[i].Module,
                                    InverterID: e.InverterID,
                                    Status: e.Status,
                                    A6: e.A6,
                                    A8: e.A8
                                })
                            } else {

                            }

                            if (index + 1 == response.data[0].listRecord.length) {
                                CSTT.push({
                                    Module: (getProjectParam[i].Module === null)
                                        ? `${currentLang.module} ${i + 1}` : getProjectParam[i].Module,
                                    CSTT: (CSTT_A10 + CSTT_A11),
                                    CS_LOAD: (CSTT_A12), Inverter: inverterData
                                });
                                inverterData = [];
                            }
                        })
                    })

                    await axios.get(`${host}/api/pvsofar/lastStatus`, {
                        params: {
                            serial: getProjectParam[i].Serial
                        }
                    }).then(response => {

                        status.push(
                            {
                                Inverter: (getProjectParam[i].Module === null)
                                    ? `${currentLang.module} ${i + 1}` : getProjectParam[i].Module,
                                count: response.data.Count,
                                lastUpdate: response.data.LastUpdate
                            }
                        )
                    })
                }
            }
            else if (device === 'SmartBuilding1') {
                for (let i = 0; i < getProjectParam.length; i++) {
                    await axios.get(`${host}/api/pvsofarfunsion/lastData`, {
                        params: {
                            serials: getProjectParam[i].Serial
                        }
                    }).then(async response => {
                        let res = response.data[0];

                        if (res.Radiation != null) {
                            radiation.push(res.Radiation)
                        }

                        if (getProjectParam[i].Serial === smartbuilding_Sunspec) {
                            await axios.get(`${host}/api/pvsofar/sunspec/latestData`, {
                                params: {
                                    serial: smartbuilding_Sunspec
                                }
                            }).then(sunRes => {
                                TodayProduction = (sunRes.data.today_production === null)
                                    ? 0 : sunRes.data.today_production
                                TotalProduction = (sunRes.data.total_production === null)
                                    ? 0 : sunRes.data.total_production

                                let pv_power = 0, mppt1 = 0, mppt2 = 0, mppt3 = 0, mppt4 = 0,
                                    mppt5 = 0, mppt6 = 0, mppt7 = 0, mppt8 = 0,
                                    mppt9 = 0, mppt10 = 0, pv_load = 0;
                                let inverterData = [];
                                for (let ro = 0; ro < getProjectParam[i].NumberDevice; ro++) {
                                    let resData = sunRes.data;
                                    pv_power += (resData.sunspec_inverters[ro].pv_power === null)
                                        ? 0 : resData.sunspec_inverters[ro].pv_power;
                                    pv_load += (resData.sunspec_inverters[ro].load_power === null)
                                        ? 0 : resData.sunspec_inverters[ro].load_power;

                                    inverterData.push({
                                        id: `Inverter-${ro + 1}`,
                                        data: (resData.sunspec_inverters[ro].pv_power === null)
                                            ? 0 : resData.sunspec_inverters[ro].pv_power
                                    })
                                    // console.log(ro);
                                    if (resData.mppt_list[ro] !== undefined) {
                                        mppt1 = (resData.mppt_list[ro].mppt_1 === null)
                                            ? 0 : resData.mppt_list[ro].mppt_1;
                                        mppt2 = (resData.mppt_list[ro].mppt_2 === null)
                                            ? 0 : resData.mppt_list[ro].mppt_2;
                                        mppt3 = (resData.mppt_list[ro].mppt_3 === null)
                                            ? 0 : resData.mppt_list[ro].mppt_3;
                                        mppt4 = (resData.mppt_list[ro].mppt_4 === null)
                                            ? 0 : resData.mppt_list[ro].mppt_4;
                                        mppt5 = (resData.mppt_list[ro].mppt_5 === null)
                                            ? 0 : resData.mppt_list[ro].mppt_5;
                                        mppt6 = (resData.mppt_list[ro].mppt_6 === null)
                                            ? 0 : resData.mppt_list[ro].mppt_6;
                                        mppt7 = (resData.mppt_list[ro].mppt_7 === null)
                                            ? 0 : resData.mppt_list[ro].mppt_7;
                                        mppt8 = (resData.mppt_list[ro].mppt_8 === null)
                                            ? 0 : resData.mppt_list[ro].mppt_8;
                                        mppt9 = (resData.mppt_list[ro].mppt_9 === null)
                                            ? 0 : resData.mppt_list[ro].mppt_10;
                                        mppt10 = (resData.mppt_list[ro].mppt_10 === null)
                                            ? 0 : resData.mppt_list[ro].mppt_10;
                                    }
                                    if (ro + 1 <= getProjectParam[i].NumberDevice) {
                                        listRecord.push({
                                            Module: (getProjectParam[i].Module === null)
                                                ? `${currentLang.module} ${i + 1}` : getProjectParam[i].Module,
                                            InverterID: resData.sunspec_inverters[ro].id,
                                            Status: resData.sunspec_inverters[ro].status,
                                            Mppt1: mppt1, Mppt2: mppt2, Mppt3: mppt3,
                                            Mppt4: mppt4, Mppt5: mppt5, Mppt6: mppt6,
                                            Mppt7: mppt7, Mppt8: mppt8, Mppt9: mppt9,
                                            Mppt10: mppt10,
                                        })
                                    } else {

                                    }

                                    if (ro + 1 == getProjectParam[i].NumberDevice) {
                                        CSTT.push({
                                            Module: (getProjectParam[i].Module === null)
                                                ? `${currentLang.module} ${i + 1}` : getProjectParam[i].Module,
                                            CSTT: (pv_power),
                                            CS_LOAD: (pv_load),
                                            Inverter: inverterData
                                        });
                                        inverterData = [];
                                    }
                                }
                            })
                        }

                        // module 0
                        if (i === 0) {
                            ToLoadToday = (res.fullMetterList[0].TodayPosEnergy === null)
                                ? 0 : res.fullMetterList[0].TodayPosEnergy;
                            ToLoadTotal = (res.fullMetterList[0].PosEnergy === null)
                                ? 0 : res.fullMetterList[0].PosEnergy;
                            getPV_Total = (res.fullMetterList[0].TotalP === null)
                                ? 0 : res.fullMetterList[0].TotalP;
                        }

                        // module 1
                        if (i === 1) {
                            getPV_MG = (res.fullMetterList[0].TotalP === null)
                                ? 0 : res.fullMetterList[0].TotalP;
                            getPV_BackUpCabine = (res.fullMetterList[1].TotalP === null)
                                ? 0 : res.fullMetterList[1].TotalP;
                            getPV_SuppilerPumpCabinet = (res.fullMetterList[2].TotalP === null)
                                ? 0 : res.fullMetterList[2].TotalP;
                            getEnergy_MG = (res.fullMetterList[0].TodayPosEnergy === null)
                                ? 0 : res.fullMetterList[0].TodayPosEnergy
                        }

                        // module 2
                        if (i === 2) {
                            getPV_1 = (res.fullMetterList[0].TotalP === null)
                                ? 0 : res.fullMetterList[0].TotalP;
                            getEnergy_1 = (res.fullMetterList[0].TodayPosEnergy === null)
                                ? 0 : res.fullMetterList[0].TodayPosEnergy;
                        }

                        // module 3
                        if (i === 3) {
                            getPV_2 = (res.fullMetterList[0].TotalP === null)
                                ? 0 : res.fullMetterList[0].TotalP;
                            getEnergy_2 = (res.fullMetterList[0].TodayPosEnergy === null)
                                ? 0 : res.fullMetterList[0].TodayPosEnergy;
                        }

                        // module 4
                        if (i === 4) {
                            getPV_3 = (res.fullMetterList[0].TotalP === null)
                                ? 0 : res.fullMetterList[0].TotalP;
                            getPV_PressurePump = (res.fullMetterList[1].TotalP === null)
                                ? 0 : res.fullMetterList[1].TotalP;
                            getPV_ServerRoom = (res.fullMetterList[2].TotalP === null)
                                ? 0 : res.fullMetterList[2].TotalP;
                            getEnergy_3 = (res.fullMetterList[0].TodayPosEnergy === null)
                                ? 0 : res.fullMetterList[0].TodayPosEnergy;
                        }

                        // module 5
                        if (i === 5) {
                            getPV_4 = (res.fullMetterList[0].TotalP === null)
                                ? 0 : res.fullMetterList[0].TotalP;
                            getEnergy_4 = (res.fullMetterList[0].TodayPosEnergy === null)
                                ? 0 : res.fullMetterList[0].TodayPosEnergy;
                            getPV_Elevator = (res.fullMetterList[1].TotalP === null)
                                ? 0 : res.fullMetterList[1].TotalP;
                            getEnergy_Elevator = (res.fullMetterList[1].TodayPosEnergy === null)
                                ? 0 : res.fullMetterList[1].TodayPosEnergy;
                        }

                        // module 6
                        if (i === 6) {
                            getPV_AirConditioner = (res.fullMetterList[0].TotalP === null)
                                ? 0 : res.fullMetterList[0].TotalP;
                            getEnergy_AirConditioner = (res.fullMetterList[0].TodayPosEnergy === null)
                                ? 0 : res.fullMetterList[0].TodayPosEnergy;
                            getPV_HotPartCabinet = (res.fullMetterList[0].TotalP === null)
                                ? 0 : res.fullMetterList[0].TotalP;
                        }

                    })
                    await axios.get(`${host}/api/pvsofar/lastStatus`, {
                        params: {
                            serial: getProjectParam[i].Serial
                        }
                    }).then(response => {

                        status.push(
                            {
                                Inverter: (getProjectParam[i].Module === null)
                                    ? `${currentLang.module} ${i + 1}` : getProjectParam[i].Module,
                                count: response.data.Count,
                                lastUpdate: response.data.LastUpdate
                            }
                        )
                    })
                }
            }
            else if (device === 'PVSofarGroupV3') {
                for (let i = 0; i < getProjectParam.length; i++) {
                    let ModuleInfo = {
                        Serial: getProjectParam[i].Serial,
                        PersonID: PersonID,
                        HasMetter: getProjectParam[i].HasMetter,
                        NumberDevice: getProjectParam[i].NumberDevice,
                        index: i + 1,
                        Module: getProjectParam[i].Module,
                        ComparePVProduct: getProjectParam[i].ComparePVProduct,
                        ProductionMetterId: getProjectParam[i].ProductionMetterId
                    }
                    let { data } = await sofarGroupOverview(ModuleInfo);
                    if (data.HasMetter === false) {
                        TodayProduction += data.TodayProduction;
                        TotalProduction += data.TotalProduction;
                    } else {
                        TodayProduction += data.MetterTodayProduction;
                        TotalProduction += data.MetterTotalProduction;
                    }

                    if (data.Radiation != null) {
                        radiation.push(data.Radiation);
                    }

                    let pv1 = 0, pv2 = 0, pv3 = 0, pvload = 0;
                    let inverterData = [];
                    data.listRecord.forEach((e, index) => {
                        if (index + 1 <= getProjectParam[i].NumberDevice) {
                            let pv1_cstt_temp = (e.pv1_cstt == null) ? 0 : e.pv1_cstt;
                            let pv2_cstt_temp = (e.pv2_cstt == null) ? 0 : e.pv2_cstt;
                            let pv3_cstt_temp = (e.pv3_cstt == null) ? 0 : e.pv3_cstt;
                            let pv_load_temp = (e.pvload == null) ? 0 : e.pvload;

                            pv1 += pv1_cstt_temp;
                            pv2 += pv2_cstt_temp;
                            pv3 += pv3_cstt_temp;
                            pvload += pv_load_temp;

                            let final_recent = (pv1_cstt_temp + pv2_cstt_temp + pv3_cstt_temp);
                            inverterData.push({
                                id: `Inverter-${index + 1}`,
                                data: final_recent
                            });
                            listRecord.push({
                                Module: (getProjectParam[i].Module == null) ? `${currentLang.module} ${i + 1}` : getProjectParam[i].Module,
                                InverterID: e.InverterID,
                                Status: e.Status,
                                pv1_voltage: e.pv1_voltage,
                                pv2_voltage: e.pv2_voltage,
                                pv3_voltage: e.pv3_voltage
                            });
                        } else {

                        }

                        if (index + 1 == data.listRecord.length) {
                            CSTT.push({
                                Module: (getProjectParam[i].Module == null) ? `${currentLang.module} ${i + 1}` : getProjectParam[i].Module,
                                CSTT: (pv1 + pv2 + pv3),
                                CS_LOAD: (pvload), Inverter: inverterData
                            });
                            inverterData = [];
                        }
                    })
                    await axios.get(`${host}/api/pvsofar/lastStatus`, {
                        params: {
                            serial: getProjectParam[i].Serial
                        }
                    }).then(response => {
                        status.push(
                            {
                                Inverter: (getProjectParam[i].Module === null)
                                    ? `${currentLang.module} ${i + 1}` : getProjectParam[i].Module,
                                count: response.data.Count,
                                lastUpdate: response.data.LastUpdate
                            }
                        )
                    })
                }
            }
            else {
                for (let i = 0; i < getProjectParam.length; i++) {
                    await axios.get(`${host}/api/pvsofar/lastData`, {
                        params: {
                            serial: getProjectParam[i].Serial
                        }
                    }).then(response => {
                        let TodayProduction_met = response.data.MetterTodayProduction,
                            TotalProduction_met = response.data.MetterTotalProduction;

                        if (TodayProduction_met === null || TodayProduction_met === 0.0) {
                            TodayProduction += response.data.TodayProduction;
                        } else {
                            TodayProduction += response.data.MetterTodayProduction;
                        }

                        if (TotalProduction_met === null || TotalProduction_met === 0.0) {
                            TotalProduction += response.data.TotalProduction;
                        } else {
                            TotalProduction += response.data.MetterTotalProduction;
                        }

                        if (response.data.Radiation != null) {
                            radiation.push(response.data.Radiation)
                        }

                        let CSTT_A10 = 0,
                            CSTT_A11 = 0,
                            CSTT_A12 = 0;
                        let inverterData = [];
                        response.data.listRecord.forEach((e, index) => {
                            if (index + 1 <= getProjectParam[i].NumberDevice) {
                                CSTT_A10 += (e.A10 === null) ? 0 : e.A10;
                                CSTT_A11 += (e.A11 === null) ? 0 : e.A11;
                                CSTT_A12 += (e.A12 === null) ? 0 : e.A12;

                                let cstt_recent_A10 = (e.A10 === null) ? 0 : e.A10;
                                let cstt_recent_A11 = (e.A11 === null) ? 0 : e.A11;

                                let final_recent = (cstt_recent_A10 + cstt_recent_A11);

                                inverterData.push({
                                    id: `Inverter-${index + 1}`,
                                    data: final_recent
                                })

                                listRecord.push({
                                    Module: (getProjectParam[i].Module === null)
                                        ? `${currentLang.module} ${i + 1}` : getProjectParam[i].Module,
                                    InverterID: e.InverterID,
                                    Status: e.Status,
                                    A6: e.A6,
                                    A8: e.A8
                                })
                            } else {

                            }

                            if (index + 1 == response.data.listRecord.length) {
                                CSTT.push({
                                    Module: (getProjectParam[i].Module === null)
                                        ? `${currentLang.module} ${i + 1}` : getProjectParam[i].Module,
                                    CSTT: (CSTT_A10 + CSTT_A11),
                                    CS_LOAD: (CSTT_A12), Inverter: inverterData
                                });
                                inverterData = [];
                            }
                        })
                    })

                    await axios.get(`${host}/api/pvsofar/lastStatus`, {
                        params: {
                            serial: getProjectParam[i].Serial
                        }
                    }).then(response => {
                        status.push(
                            {
                                Inverter: (getProjectParam[i].Module === null)
                                    ? `${currentLang.module} ${i + 1}` : getProjectParam[i].Module,
                                count: response.data.Count,
                                lastUpdate: response.data.LastUpdate
                            }
                        )
                    })
                }
                if (device === 'MultiPVSofar2') {
                    //load Insurance
                    await axios.get(`${host}/api/getInfo/insurranceInfo_V2`, {
                        params: {
                            user: PersonID
                        }
                    }).then(async InsRes => {
                        InsuranceStatus = InsRes.data.Insurrance;
                        let packageID = InsRes.data.PackageID;
                        if (packageID != null) {
                            await axios.get(`${host}/api/pvsofar/v2/insurrenceChart`, {
                                params: {
                                    package: packageID,
                                    serial: getProjectParam[0].Serial
                                }
                            }).then(InChartRes => {
                                let dataSimulation = [],
                                    dataReal = [],
                                    dataInsurence = [];
                                InChartRes.data.forEach(e => {
                                    InsuranceChart_label.push(`${e.label}`);
                                    dataSimulation.push((e.simulation === null) ? 0 : e.simulation);
                                    dataReal.push((e.real === null) ? 0 : e.real);
                                    dataInsurence.push((e.insurrence === null) ? 0 : e.insurrence);
                                });

                                InsuranceChart_data.push({
                                    label: `${currentLang.simulate}`,
                                    backgroundColor: getRandomColor(),
                                    data: dataSimulation
                                },
                                    {
                                        label: `${currentLang.insurance}`,
                                        backgroundColor: getRandomColor(),
                                        data: dataInsurence
                                    },
                                    {
                                        label: `${currentLang.reality}`,
                                        backgroundColor: getRandomColor(),
                                        data: dataReal,
                                        type: 'line'
                                    })
                            })
                        } else {
                            InsuranceChart_data = [];
                            InsuranceChart_label = [];
                        }
                    })
                }
            }
        }

        let percent_MG = 0, percent_1 = 0, percent_2 = 0, percent_3 = 0, percent_4 = 0,
            percent_AirConditioner = 0, percent_Elevator = 0;
        if (device === 'SmartBuilding1') {
            getPV_Sum = getPV_MG + getPV_1 + getPV_2 + getPV_4 + getPV_AirConditioner + getPV_Elevator
                + getPV_BackUpCabine + getPV_SuppilerPumpCabinet + getPV_PressurePump + getPV_ServerRoom
                + getPV_HotPartCabinet;
            percent_MG = round2DecimalsDot(((getPV_MG * 100) / getPV_Sum));
            percent_1 = round2DecimalsDot(((getPV_1 * 100) / getPV_Sum));
            percent_2 = round2DecimalsDot(((getPV_2 * 100) / getPV_Sum));
            percent_3 = round2DecimalsDot(((getPV_3 * 100) / getPV_Sum));
            percent_4 = round2DecimalsDot(((getPV_4 * 100) / getPV_Sum));
            percent_AirConditioner = round2DecimalsDot(((getPV_AirConditioner * 100) / getPV_Sum));
            percent_Elevator = round2DecimalsDot(((getPV_Elevator * 100) / getPV_Sum));
        }

        let TongCSTT = 0,
            TongCSLOAD = 0;
        CSTT.forEach(e => {
            TongCSTT += e.CSTT
            TongCSLOAD += e.CS_LOAD
        })

        CSTT.forEach(e => {
            e.CSTT = round2Decimals(e.CSTT);
            e.CS_LOAD = round2Decimals(e.CS_LOAD);
            e.Inverter.forEach(ei => {
                ei.data = round2Decimals(ei.data)
            })
        })

        //calculate total tarif
        let sumTarifHigh = 0,
            sumTarifNormal = 0,
            sumTarifLow = 0;

        if (ArrTariff.length != 0) {
            for (let tar = 0; tar < ArrTariff.length; tar++) {
                sumTarifHigh += ArrTariff[tar].Tariff1;
                sumTarifNormal += ArrTariff[tar].Tariff2;
                sumTarifLow += ArrTariff[tar].Tariff3;
            }
        }

        let fieldsCSTT,
            itemsCSTT
        if (radiation.length != 0) {
            let sumRad = 0;
            for (let ra = 0; ra < radiation.length; ra++) {
                sumRad += parseInt(radiation[ra]);
            }

            let radAvg = sumRad / radiation.length;

            fieldsCSTT = [{ key: 'TongCSTT', label: `${currentLang.pvpower} (kW)` },
            { key: 'TongCSLOAD', label: `${currentLang.pvload} (kW)` },
            { key: 'radiationAVG', label: `${currentLang.radiation} (W/m<sup>2</sup>)` }]

            itemsCSTT = [{
                TongCSTT: round2Decimals(TongCSTT), TongCSLOAD: round2Decimals(TongCSLOAD),
                radiationAVG: round2Decimals(radAvg)
            }]
        } else {
            fieldsCSTT = [{ key: 'TongCSTT', label: `${currentLang.pvpower} (kW)` },
            { key: 'TongCSLOAD', label: `${currentLang.pvload} (kW)` }]

            itemsCSTT = [{
                TongCSTT: round2Decimals(TongCSTT), TongCSLOAD: round2Decimals(TongCSLOAD)
            }]
        }

        let totalSaveMoney = price * TotalProduction;

        let totalAmataMoney;
        if (device === 'Amata') {
            totalAmataMoney = defaultAmata * TotalProduction;
        } else {
            totalAmataMoney = null;
        }

        let totalCarbon = (hesoCarbon * TotalProduction) / 1000;

        //PR Calculate
        let prCalculate
        if (totalCapacity != 0) {
            prCalculate = (TodayProduction / (totalCapacity * Math.round((totalTodayRadiation + Number.EPSILON) * 100) / 100)) * 100;
        } else {
            prCalculate = 0;
        }
        Response.status(200).json({
            message: `Get user information successful`,
            data: {
                Fullname: getDataProject.Fullname,
                TodayProduction: round2Decimals(TodayProduction),
                TotalProduction: numberWithCommas(Math.floor(TotalProduction)),
                listRecord: listRecord,
                weather: weather,
                price: price,
                totalCarbon: round2Decimals(totalCarbon),
                totalSaveMoney: numberWithCommas(Math.floor(totalSaveMoney)),
                CSTT: {
                    TongCSTT: round2Decimals(TongCSTT),
                    TongCSLOAD: round2Decimals(TongCSLOAD),
                    fieldsCSTT: fieldsCSTT,
                    itemsCSTT: itemsCSTT,
                    CSTTArr: CSTT
                },
                status: status,
                totalAmataMoney: numberWithCommas(Math.floor(totalAmataMoney)),
                numberOfNguyenLy: numberOfNguyenLy,
                Consumption: {
                    todayConsump: round2Decimals(todayConsump),
                    totalConsump: totalConsump
                },
                generator: {
                    generatorStatus: generatorStatus,
                    accQuyLabels: accQuyLabels,
                    accQuyItems: accQuyItems
                },
                tableInv: {
                    tableInvLabels: tableInvLabels,
                    tableInvItems1: tableInvItems1,
                    tableInvItems2: tableInvItems2
                },
                smartBuildingParams_pieChart: {
                    percent_MG: percent_MG,
                    percent_1: percent_1,
                    percent_2: percent_2,
                    percent_3: percent_3,
                    percent_4: percent_4,
                    percent_AirConditioner: percent_AirConditioner,
                    percent_Elevator: percent_Elevator
                },
                smartBuildingData: {
                    ToLoadToday: round2Decimals(ToLoadToday),
                    ToLoadTotal: numberWithCommas(round2Decimals(ToLoadTotal)),
                    getPV_Total: getPV_Total,
                    getPV_MG: round2Decimals(getPV_MG),
                    getEnergy_MG: round2Decimals(getEnergy_MG),
                    getPV_1: round2Decimals(getPV_1),
                    getEnergy_1: round2Decimals(getEnergy_1),
                    getPV_2: round2Decimals(getPV_2),
                    getEnergy_2: round2Decimals(getEnergy_2),
                    getPV_3: round2Decimals(getPV_3),
                    getEnergy_3: round2Decimals(getEnergy_3),
                    getPV_4: round2Decimals(getPV_4),
                    getEnergy_4: round2Decimals(getEnergy_4),
                    getPV_AirConditioner: round2Decimals(getPV_AirConditioner),
                    getEnergy_AirConditioner: round2Decimals(getEnergy_AirConditioner),
                    getPV_Elevator: round2Decimals(getPV_Elevator),
                    getEnergy_Elevator: round2Decimals(getEnergy_Elevator)
                },
                InsuranceInfo: {
                    InsuranceStatus: InsuranceStatus,
                    InsuranceChart_data: InsuranceChart_data,
                    InsuranceChart_label: InsuranceChart_label
                },
                Tariff: {
                    sumTarifHigh: sumTarifHigh,
                    sumTarifNormal: sumTarifNormal,
                    sumTarifLow: sumTarifLow
                },
                tariffAvailable: tariffAvailable,
                PRCalculate: round2Decimals(prCalculate)
            }
        });

    } catch (err) {
        console.log(err);
        Response.status(500).json({
            message: `Không có dữ liệu`
        });
    }
}

let productionByDayChart = async (Request, Response) => {
    try {
        let { pvType, viewMode, device } = Request.query;
        let PersonID = JSON.parse(Request.headers.user).PersonID;
        // let 
        querySerial = await sqlPool_SWH.request()
            .query(`SELECT Serial, Module, ProjectType, Birthday, Capacity, 
            ProductionMetterID FROM ${projectInfo} WHERE PersonID='${PersonID}' AND Available = 1
            order by STT asc`);

        let getSerial = querySerial.recordset;
        let chartData = [];
        let labels = [];
        // let totalCapacity = 0;
        let arrDateCheck = [];
        if (viewMode === 'byDay') {
            let daysArr = [];
            for (let i = 0; i < 30; i++) {
                var today = new Date()
                today.setDate(today.getDate())
                var priorDate = new Date().setDate(today.getDate() - (i))
                let day = ('0' + new Date(priorDate).getDate()).slice(-2)
                let month = ('0' + (new Date(priorDate).getMonth() + 1)).slice(-2);
                let year = new Date(priorDate).getFullYear();
                daysArr.push(`${year}-${month}-${day}`)
            }
            let ReArr = daysArr.reverse();

            if (pvType == 'SOFAR') {
                if (device === 'SmartBuilding1') {
                    let queryEnergyConsumption = await sqlPool_PV.request()
                        .query(`select cast(CurrentDate as date) as CurrentDate, 
                        max(TodayPosEnergy) as TodayPosEnergy from tb_PVSofarFullMetter 
                        where Serial = '01-C012-17-0066'
                        and cast(CurrentDate as date) between cast('${ReArr[0]}' as date) 
                        and cast('${ReArr[ReArr.length - 1]}' as date)
                        group by cast(CurrentDate as date)
                        order by cast(CurrentDate as date) asc`)
                    let dataArr = queryEnergyConsumption.recordset;
                    // console.log(dataArr);
                    let data = [],
                        dateArr = [];
                    for (let i = 0; i < dataArr.length; i++) {
                        if (dataArr[i] === undefined) {

                        } else {
                            let dateTimeString = JSON.stringify(dataArr[i].CurrentDate)
                            let split = dateTimeString.split('T');
                            let dateString = split[0].substring(1);
                            dateArr.push(dateString);
                            data.push(dataArr[i].TodayPosEnergy)
                        }
                    }
                    labels = dateArr;
                    chartData.push({
                        label: 'Năng lượng tiêu thụ',
                        backgroundColor: getRandomColor(),
                        data: data,
                    });
                } else {
                    for (let i = 0; i < getSerial.length; i++) {
                        let response;
                        // if test id or sungrow type
                        if (getSerial[i].ProjectType === 14) {
                            let getProdChart;
                            getSerial[i].Serial = getSerial[i].Birthday;
                            if (getSerial[i].ProductionMetterID !== null) {
                                let queryMetterProdChart = await sqlPool_PV.request()
                                    .input('Serial', sql.NVarChar, getSerial[i].Serial)
                                    .input('dayFrom', ReArr[0])
                                    .input('dayTo', ReArr[ReArr.length - 1])
                                    .query(`SELECT MAX(MetterTodayProduction) as SumNL, 
                                    avg(convert(int, Radiation)) as AvgRadiation, 
                                    avg(ENVTemp) as AvgENVTemp, avg(PVTemp) as AvgPVTemp, 
                                    cast(CurrentDate as DATE) as Date 
                                    from ${nextCalculateTable}
                                    where Serial = @Serial
                                    and convert(date, CurrentDate, 103) >= @dayFrom 
                                    and convert(date, CurrentDate, 103) <= @dayTo
                                    group by cast(CurrentDate as DATE) order by Date`);

                                getProdChart = queryMetterProdChart.recordset;
                            } else {
                                let queryProdChart = await sqlPool_PV.request()
                                    .input('Serial', sql.NVarChar, getSerial[i].Serial)
                                    .input('dayFrom', ReArr[0])
                                    .input('dayTo', ReArr[ReArr.length - 1])
                                    .query(`SELECT MAX(TodayProduction) as SumNL, 
                                    avg(convert(int, Radiation)) as AvgRadiation, 
                                    avg(ENVTemp) as AvgENVTemp, avg(PVTemp) as AvgPVTemp, 
                                    cast(CurrentDate as DATE) as Date 
                                    from ${PVinfo}
                                    where Serial = @Serial
                                    and convert(date, CurrentDate, 103) >= @dayFrom 
                                    and convert(date, CurrentDate, 103) <= @dayTo
                                    group by cast(CurrentDate as DATE) order by Date`);

                                getProdChart = queryProdChart.recordset;
                            }

                            for (let i = 0; i < getProdChart.length; i++) {
                                let stringDate = JSON.stringify(getProdChart[i].Date)
                                let format = stringDate.replace(/"/g, '').split('.');
                                getProdChart[i].Date = format[0];
                            }

                            response = {
                                data: getProdChart
                            }
                        }
                        else if (device === 'Sungrow' || device === 'PVSofarGroupV3') {
                            let getProdChart;
                            if (getSerial[i].ProductionMetterID !== null) {
                                let queryMetterProdChart = await sqlPool_PV.request()
                                    .input('Serial', sql.NVarChar, getSerial[i].Serial)
                                    .input('dayFrom', ReArr[0])
                                    .input('dayTo', ReArr[ReArr.length - 1])
                                    .query(`SELECT MAX(MetterTodayProduction) as SumNL, 
                                    avg(convert(int, Radiation)) as AvgRadiation, 
                                    avg(ENVTemp) as AvgENVTemp, avg(PVTemp) as AvgPVTemp, 
                                    cast(CurrentDate as DATE) as Date 
                                    from ${nextCalculateTable}
                                    where Serial = @Serial
                                    and convert(date, CurrentDate, 103) >= @dayFrom 
                                    and convert(date, CurrentDate, 103) <= @dayTo
                                    group by cast(CurrentDate as DATE) order by Date`);

                                getProdChart = queryMetterProdChart.recordset;
                            } else {
                                let queryProdChart = await sqlPool_PV.request()
                                    .input('Serial', sql.NVarChar, getSerial[i].Serial)
                                    .input('dayFrom', ReArr[0])
                                    .input('dayTo', ReArr[ReArr.length - 1])
                                    .query(`SELECT MAX(TodayProduction) as SumNL, 
                                    avg(convert(int, Radiation)) as AvgRadiation, 
                                    avg(ENVTemp) as AvgENVTemp, avg(PVTemp) as AvgPVTemp, 
                                    SUM(CONVERT(float, Radiation)/12)/1000 as TodayRadiation,
                                    cast(CurrentDate as DATE) as Date 
                                    from ${nextCalculateTable} 
                                    where Serial = @Serial
                                    and convert(date, CurrentDate, 103) >= @dayFrom 
                                    and convert(date, CurrentDate, 103) <= @dayTo 
                                    group by cast(CurrentDate as DATE) order by Date`);

                                getProdChart = queryProdChart.recordset;
                            }

                            // query and calculate for pr line chart
                            if (i + 1 == getSerial.length) {

                            }

                            for (let i = 0; i < getProdChart.length; i++) {
                                let stringDate = JSON.stringify(getProdChart[i].Date)
                                let format = stringDate.replace(/"/g, '').split('.');
                                getProdChart[i].Date = format[0];
                            }

                            response = {
                                data: getProdChart
                            }
                        }
                        else {
                            response = await axios.get(`${host}/api/pvsofar/v2/productionChart`,
                                {
                                    params: {
                                        user: PersonID,
                                        serial: getSerial[i].Serial
                                    }
                                }).then(response => {
                                    return response
                                })
                        }

                        let dataRes = response.data;
                        let arrData = [];
                        let arrDataLine = [];
                        let arrDataRadiation = [];
                        let arrLable = [];
                        dataRes.forEach((e, index) => {
                            let newDate = e.Date.split('T')
                            arrLable.push(newDate[0]);
                            arrData.push(e.SumNL);

                            // check device for calculate
                            if (device === 'Sungrow') {
                                let prCalculate = (e.SumNL /
                                    (((getSerial[i].Capacity == null) ? 0 : parseFloat(getSerial[i].Capacity)) *
                                        Math.round((e.TodayRadiation + Number.EPSILON) * 100) / 100)) * 100
                                arrDataLine.push(parseFloat((prCalculate).toFixed(2)));

                                arrDataRadiation.push(Math.round((e.TodayRadiation + Number.EPSILON) * 100) / 100);
                            }

                            if (index + 1 == response.data.length) {
                                if (labels.length === 0) {
                                    labels = arrLable;
                                } else if (labels.length < arrLable.length) {
                                    labels = arrLable;
                                }
                                arrDateCheck.push(arrLable);
                                let moduleCheck;
                                if (getSerial[i].Module === null) {
                                    moduleCheck = `Hệ ${i + 1}`
                                } else {
                                    moduleCheck = getSerial[i].Module
                                }

                                let ChartDataPush = {
                                    label: moduleCheck,
                                    backgroundColor: getRandomColor(),
                                    data: arrData,
                                }

                                let ChartDataPushRadiation = {
                                    label: `${moduleCheck}-Radiation`,
                                    backgroundColor: getRandomColor(),
                                    data: arrDataRadiation
                                }

                                let ChartDataPushLine = {
                                    label: `${moduleCheck}-PR`,
                                    borderColor: getRandomColor(),
                                    data: arrDataLine,
                                    type: 'line',
                                    fill: false
                                }

                                if (PersonID == 'p_prtestkit') {
                                    ChartDataPush.label = 'Sản lượng';
                                    ChartDataPushLine.label = 'PR';
                                    ChartDataPushRadiation.label = 'Bức xạ';
                                }

                                if (device === 'Sungrow') {
                                    ChartDataPush.yAxisID = 'A';
                                    ChartDataPushLine.yAxisID = 'B';
                                }

                                chartData.push(ChartDataPush);

                                if (arrDataLine.length > 0) {
                                    chartData.push(ChartDataPushLine);
                                }

                                if (arrDataRadiation.length > 0) {
                                    chartData.push(ChartDataPushRadiation);
                                }
                            }
                        })

                    }
                }
            } else if (pvType == 'HUAWEI') {
                let customTableHuawei;
                if (device === 'MultiPVHuawei3') {
                    customTableHuawei = nextCalculateTable;
                } else {
                    customTableHuawei = PVinfo;
                }

                let combieArr = [];
                for (let ser = 0; ser < getSerial.length; ser++) {
                    let serialArr = [];
                    for (let ro = 0; ro < ReArr.length; ro++) {
                        let queryTodayProduction = await sqlPool_PV.request()
                            .query(`SELECT TOP 1 CONVERT(varchar(30),CurrentDate,103) as Date,
                    coalesce(NULLIF(MetterTodayProduction, 0.00), TodayProduction) as TodayProduction, 
                    PVTemp, ENVTemp, Radiation
                    FROM ${customTableHuawei}
                    WHERE Serial = '${getSerial[ser].Serial}' AND
                    CONVERT(date,CurrentDate,103) = '${ReArr[ro]}'
                    ORDER BY STT DESC`)
                        serialArr.push(queryTodayProduction.recordset[0])
                    }
                    combieArr.push(serialArr);
                }
                // console.log(combieArr[0]);
                for (let ro = 0; ro < combieArr.length; ro++) {
                    let arrData = [];
                    let arrLable = [];
                    combieArr[ro].forEach((e, index) => {
                        if (e != undefined) {
                            arrLable.push(e.Date);
                            arrData.push(e.TodayProduction);
                            if (index + 1 == combieArr[ro].length) {
                                if (labels.length === 0) {
                                    labels = arrLable;
                                } else if (labels.length < arrLable.length) {
                                    labels = arrLable;
                                }
                                let moduleCheck;
                                if (getSerial[ro].Module === null || getSerial[ro].Module == '') {
                                    moduleCheck = `Hệ ${ro + 1}`
                                } else {
                                    moduleCheck = getSerial[ro].Module
                                }
                                chartData.push({
                                    label: moduleCheck,
                                    backgroundColor: getRandomColor(),
                                    data: arrData,
                                })
                            }
                        } else {
                            arrLable.push(ReArr[index]);
                            arrData.push(0);
                            if (index + 1 === combieArr[ro].length) {
                                if (labels.length === 0) {
                                    labels.push(arrLable);
                                } else if (labels.length < arrLable.length) {
                                    labels.push(arrLabel);
                                }
                                let moduleCheck;
                                if (getSerial[ro].Module === null || getSerial[ro].Module == '') {
                                    moduleCheck = `Hệ ${ro + 1}`
                                } else {
                                    moduleCheck = getSerial[ro].Module
                                }

                                chartData.push({
                                    label: moduleCheck,
                                    backgroundColor: getRandomColor(),
                                    data: arrData,
                                })
                            }
                        }
                    })
                }
            }

        } else if (viewMode === 'byMonth') {
            // get 13 month ago
            let beginMonth = new Date().setMonth(new Date().getMonth() - 13);
            let endMonth = new Date().setMonth(new Date().getMonth());

            let be = new Date(beginMonth),
                en = new Date(endMonth);

            // first day of begin month and last day of end month
            let fromDate = new Date(be.getFullYear(), be.getMonth(), 1);
            let toDate = new Date(en.getFullYear(), en.getMonth() + 1, 0);

            //re-formating date
            let fdate = ('0' + fromDate.getDate()).slice(-2),
                fmonth = ('0' + (fromDate.getMonth() + 1)).slice(-2),
                fyear = fromDate.getFullYear();

            let tdate = ('0' + toDate.getDate()).slice(-2),
                tmonth = ('0' + (toDate.getMonth() + 1)).slice(-2),
                tyear = toDate.getFullYear();

            //result
            let resultFromDate = `${fyear}-${fmonth}-${fdate}`;
            let resultToDate = `${tyear}-${tmonth}-${tdate}`;

            let combieArr = [];
            for (let ser = 0; ser < getSerial.length; ser++) {
                // if equal test id or multipvhuawei3 or Sungrow type
                if (getSerial[ser].ProjectType === 14 || device === 'MultiPVHuawei3'
                    || device === 'Sungrow' || device === 'PVSofarGroupV3') {
                    if (getSerial[ser].ProjectType === 14) {
                        getSerial[ser].Serial = getSerial[ser].Birthday;
                    }
                    let queryProductionMetterMonth = await sqlPool_PV.request()
                        .input('Serial', sql.NVarChar, getSerial[ser].Serial)
                        .input('fromDate', resultFromDate)
                        .input('toDate', resultToDate)
                        .query(`
                        select * from
                        (select left(CurrentDate, 7) as Month, 
                        sum(Energy) as MonthProduction from
                        (select convert(char(10), I.CurrentDate, 127) as CurrentDate,
                        max(coalesce(NULLIF(I.MetterTodayProduction, 0.00), I.TodayProduction)) 
                        as Energy
                        from ${nextCalculateTable} I 
                        where Serial = @Serial
                        and convert(date, CurrentDate, 103) >= @fromDate
                        and convert(date, CurrentDate, 103) <= @toDate
                        group by convert(char(10), I.CurrentDate, 127)) D
                        group by left(CurrentDate, 7)) E
                        order by E.Month
                        `);
                    combieArr.push(queryProductionMetterMonth.recordset);
                } else {
                    let queryProductionMonth = await sqlPool_PV.request().query(`
                    select * from
                    (select left(CurrentDate, 7) as Month, 
                    sum(Energy) as MonthProduction from
                    (select convert(char(10), I.CurrentDate, 127) as CurrentDate,
                    max(coalesce(NULLIF(I.MetterTodayProduction, 0.00), I.TodayProduction)) 
                    as Energy
                    from ${PVinfo} I 
                    where Serial = '${getSerial[ser].Serial}'
                    and convert(date, CurrentDate, 103) >= '${resultFromDate}'
                    and convert(date, CurrentDate, 103) <= '${resultToDate}'
                    group by convert(char(10), I.CurrentDate, 127)) D
                    group by left(CurrentDate, 7)) E
                    order by E.Month
                    `);
                    combieArr.push(queryProductionMonth.recordset);
                }
            }
            for (let i = 0; i < combieArr.length; i++) {
                let arrLable = [];
                let arrData = [];
                combieArr[i].forEach((e, index) => {
                    if (e != undefined) {
                        arrLable.push(e.Month);
                        arrData.push(e.MonthProduction);

                        if (index + 1 == combieArr[i].length) {
                            if (labels.length === 0) {
                                labels = arrLable;
                            } else if (labels.length < arrLable.length) {
                                labels = arrLable;
                            }
                            let moduleCheck;
                            if (getSerial[i].Module === null) {
                                moduleCheck = `Hệ ${i + 1}`;
                            } else {
                                moduleCheck = getSerial[i].Module;
                            }

                            chartData.push({
                                label: moduleCheck,
                                backgroundColor: getRandomColor(),
                                data: arrData,
                            })
                        }
                    }
                })
            }
        }
        //check missing
        let loopLimit;
        if (device === 'SmartBuilding1') {
            loopLimit = 1;
        } else {
            if (device === 'Sungrow') {
                loopLimit = getSerial.length * 3;
            } else {
                loopLimit = getSerial.length;
            }
        }
        // console.log(chartData);
        for (let i = 0; i < loopLimit; i++) {
            let arrDataCheck = chartData[i].data;
            if (arrDataCheck.length < labels.length) {
                let checkValue;
                if (arrDateCheck[i] == undefined) {
                    checkValue = '';
                } else {
                    checkValue = arrDateCheck[i];
                }
                var missing = [];
                for (var t = 0; t < labels.length; t++) {
                    if (!checkValue.includes(labels[t])) {
                        missing.push(t)
                    }
                }

                for (let m = 0; m < missing.length; m++) {
                    chartData[i].data.splice(missing[m], 0, 0)
                }
            }
        }
        Response.status(200).json({
            message: `Get production chart successful`,
            data: {
                labels: labels,
                chartData: chartData
            }
        });

    } catch (err) {
        console.log(err)
        Response.status(500).json({
            message: `Không có dữ liệu`
        });
    }
}

function DateIterator(date) {
    this.current = date;
}

DateIterator.prototype.next = function () {
    this.current.setDate(this.current.getDate() + 1);
    return this.current.getFullYear() + '-' +
        ('0' + (this.current.getMonth() + 1)).slice(-2) + '-' +
        ('0' + this.current.getDate()).slice(-2);
};



let lineChartPowerPV = async (Request, Response) => {
    try {
        let { PersonID } = JSON.parse(Request.headers.user);
        let { date, device, pvType } = Request.query;
        let querySerial;
        if (device === 'SmartBuilding1') {
            querySerial = await sqlPool_SWH.request()
                .query(`SELECT Serial, Module, NumberDevice FROM ${projectInfo} WHERE PersonID='${PersonID}'
                and Serial='01-C012-17-0066' or Serial='01-C012-0418-0004'
                or Serial='01-C012-0418-0005' or Serial='01-C012-2018-0023'
            order by STT asc`);
        } else {
            querySerial = await sqlPool_SWH.request()
                .query(`SELECT Serial, Module, NumberDevice, ProjectType, Birthday
                FROM ${projectInfo} WHERE PersonID='${PersonID}' 
                AND Available = 1
                order by STT asc`);
        }
        let getSerial = querySerial.recordset;

        let chartData = [],
            labels = [], formatArr = [];
        for (let i = 0; i < getSerial.length; i++) {
            // let 
            let arrFilter = [];
            let tableQueryDB;
            if (pvType === 'SOFAR') {
                if (device === 'MultiPVSofar10') {
                    let querySolidQPowerChart = await sqlPool_PV.request()
                        .query(`SELECT CONVERT(VARCHAR, CurrentDate, 20) as CurrentDate,
                        InverterID, COALESCE(((A10*A11/1000) + (A12*A13/1000) + (A14*A15/1000)), 0) as SumPV
                        FROM tb_SoliqQ WHERE Serial = '${getSerial[i].Serial}'
                        AND CAST(CurrentDate as DATE) = CAST('${date}' as DATE)
                        ORDER BY CurrentDate, InverterID`);
                    tableQueryDB = querySolidQPowerChart.recordset;
                }
                else if (device === 'MultiSunspec' && PersonID === 'p_otran_logistics') {
                    let queryMultiSunspecOtrans = await sqlPool_PV.request()
                        .query(`SELECT CONVERT(VARCHAR, CurrentDate, 20) as CurrentDate
                        , SUM(COALESCE((A11/1000), 0)) as SumPV
                        FROM tb_Sunspec_Inverter WHERE Serial = '${getSerial[i].Serial}'
                        AND CAST(CurrentDate as DATE) = CAST('${date}' as DATE)
                        group by CurrentDate
                        ORDER BY CurrentDate`);
                    let tableAddID = queryMultiSunspecOtrans.recordset;
                    tableAddID.forEach(e => { e.InverterID = 1 });
                    tableQueryDB = tableAddID;
                }
                else if (device === 'PVSofarGroupV3') {
                    let queryPowerChart = await sqlPool_PV.request()
                        .input('Serial', sql.NVarChar, getSerial[i].Serial)
                        .input('date', date)
                        .query(`SELECT CONVERT(VARCHAR, I.CurrentDate, 20) as CurrentDate, 
                        I.InverterID, COALESCE((I.A10 + I.A11), 0) as SumPV33kw, 
                        COALESCE((II.A12 + II.A13 + II.A14), 0) as SumPV60kw
                        FROM tb_PVSofarNextLog I
                        inner join tb_PVSofarV3Log II on I.Serial = II.Serial
                        and I.CurrentDate = II.CurrentDate 
                        WHERE I.Serial=@Serial 
                        AND CAST(I.CurrentDate as DATE)=CAST(@date as DATE)
                        ORDER BY I.CurrentDate, I.InverterID`);

                    // handle for merge data inverter
                    let getPowerChart = queryPowerChart.recordset;
                    for (let n = 0; n < getPowerChart.length; n++) {
                        formatArr.push({
                            CurrentDate: getPowerChart[n].CurrentDate,
                            InverterID: getPowerChart[n].InverterID,
                            SumPV: getPowerChart[n].SumPV33kw
                        });
                        formatArr.push({
                            CurrentDate: getPowerChart[n].CurrentDate,
                            InverterID: getPowerChart[n].InverterID + 1,
                            SumPV: getPowerChart[n].SumPV60kw
                        })
                    }
                    tableQueryDB = formatArr;
                }
                else if (device === 'Sungrow') {
                    let querySungrowPowerChart = await sqlPool_PV.request()
                        .input('Serial', sql.NVarChar, getSerial[i].Serial)
                        .input('date', date)
                        .query(`SELECT CONVERT(VARCHAR, CurrentDate, 20) as CurrentDate, 
                        InvID as InverterID, COALESCE((A34), 0) as SumPV 
                        FROM tb_Sungrow_Inverter WHERE Serial=@Serial 
                        AND CAST(CurrentDate as DATE)=CAST(@date as DATE)
                        ORDER BY CurrentDate, InvID`);
                    tableQueryDB = querySungrowPowerChart.recordset;
                }
                else if (device === 'Sunspec' || device === 'MultiSunspec') {
                    if (getSerial[i].ProjectType === 14) {
                        getSerial[i].Serial = getSerial[i].Birthday;
                    }
                    let querySunspecPowerChart = await sqlPool_PV.request()
                        .query(`SELECT CONVERT(VARCHAR, CurrentDate, 20) as CurrentDate,
                        InvID as InverterID, COALESCE((A11/1000), 0) as SumPV
                        FROM tb_Sunspec_Inverter WHERE Serial = '${getSerial[i].Serial}'
                        AND CAST(CurrentDate as DATE) = CAST('${date}' as DATE)
                        ORDER BY CurrentDate, InvID`);
                    tableQueryDB = querySunspecPowerChart.recordset;
                }
                else if (device === 'SmartBuilding1') {
                    if (getSerial[i].Serial === '01-C012-0418-0005') {
                        let querySmartBuilding2 = await sqlPool_PV.request()
                            .query(`SELECT CONVERT(VARCHAR, CurrentDate, 20) as CurrentDate, TotalP as SumPV
                            FROM tb_PVSofarFullMetter WHERE Serial='${getSerial[i].Serial}' AND MetterID = 1
                            AND CAST(CurrentDate as DATE) = CAST('${date}' as DATE)
                            ORDER BY CurrentDate`);
                        let tempData = querySmartBuilding2.recordset;
                        tempData.forEach(e => { e.InverterID = 1 });
                        tableQueryDB = tempData;
                    }
                    else if (getSerial[i].Serial === '01-C012-2018-0023') {
                        let querySmartBuilding3 = await sqlPool_PV.request()
                            .query(`SELECT CONVERT(VARCHAR, CurrentDate, 20) as CurrentDate, 
                            InverterID, COALESCE((A10 + A11), 0) as SumPV
                            FROM tb_PVSofarLog WHERE Serial = '${getSerial[i].Serial}'
                            AND CAST(CurrentDate as DATE) = CAST('${date}' as DATE)
                            ORDER BY CurrentDate, InverterID
                            `);
                        tableQueryDB = querySmartBuilding3.recordset;
                    }
                    else {
                        let querySmartBuilding1 = await sqlPool_PV.request()
                            .query(`SELECT CONVERT(VARCHAR, CurrentDate, 20) as CurrentDate, TotalP as SumPV
                        FROM tb_PVSofarFullMetter WHERE Serial='${getSerial[i].Serial}'
                        AND CAST(CurrentDate as DATE) = CAST('${date}' as DATE)
                        ORDER BY CurrentDate`);
                        let tempData = querySmartBuilding1.recordset;
                        tempData.forEach(e => { e.InverterID = 1 });
                        tableQueryDB = tempData;
                    }

                }
                else {
                    let queryMultiPVSofarPowerChart = await sqlPool_PV.request()
                        .query(`SELECT CONVERT(VARCHAR, CurrentDate, 20) as CurrentDate, 
                        InverterID, COALESCE((A10 + A11), 0) as SumPV
                        FROM tb_PVSofarLog WHERE Serial = '${getSerial[i].Serial}'
                        AND CAST(CurrentDate as DATE) = CAST('${date}' as DATE)
                        ORDER BY CurrentDate, InverterID`);
                    tableQueryDB = queryMultiPVSofarPowerChart.recordset;
                }
            } else if (pvType === 'HUAWEI') {
                let customTableHuawei;
                let customParams;
                if (device === 'MultiPVHuawei3') {
                    customTableHuawei = 'tb_PVSofarHuaweiInverterV3';
                    customParams = 'A70';
                } else {
                    customTableHuawei = 'tb_PVSofarHuaweiInverter';
                    customParams = 'A43';
                }
                // console.log(customTableHuawei);
                let queryHuaweiPVPowerChart = await sqlPool_PV.request()
                    .query(`select HwId as InverterID, COALESCE((${customParams}), 0) as SumPV, 
                    CONVERT(VARCHAR, CurrentDate, 20) as CurrentDate from ${customTableHuawei}
                    where Serial = '${getSerial[i].Serial}' 
                    and convert(date, CurrentDate, 103) = '${date}'
                    order by CurrentDate, InverterID`)
                tableQueryDB = queryHuaweiPVPowerChart.recordset;
            }
            tableQueryDB.forEach((e) => {
                let checkedID;
                if (typeof e.InverterID === String) {
                    checkedID = e.InverterID.trim();
                } else {
                    checkedID = e.InverterID;
                }
                if (arrFilter.length === 0) {
                    arrFilter.push({
                        CurrentDate: e.CurrentDate,
                        [`System0_Inverter${checkedID}_Power`]: e.SumPV
                    })
                } else {
                    let lastItem = arrFilter[arrFilter.length - 1];
                    if (e.CurrentDate === lastItem.CurrentDate) {
                        if (lastItem !== undefined) {
                            lastItem[`System0_Inverter${checkedID}_Power`] = e.SumPV
                        }
                    } else if (e.CurrentDate != lastItem.CurrentDate) {
                        newLastItem = arrFilter[arrFilter.length - 1];
                        arrFilter.push({
                            CurrentDate: e.CurrentDate,
                            [`System0_Inverter${checkedID}_Power`]: e.SumPV
                        })
                    }
                }
            })
            let data = arrFilter;
            let arrItem = [];
            let arrLabel = [];
            data.forEach((e, index) => {
                let test = 0;
                let start = 1;
                let newDate = e.CurrentDate.split(' ');
                arrLabel.push(newDate[1])
                for (let ind in e) {
                    if (test >= Object.keys(e).length - 1) {

                    } else if (test < Object.keys(e).length - 1) {
                        if (arrItem[test] == undefined || arrItem[test] == null) {
                            arrItem.push([]);
                            arrItem[test].push({
                                x: newDate[1],
                                y: e[Object.keys(e)[start]]
                            })
                        } else if (arrItem[test] != undefined || arrItem[test] != null) {
                            arrItem[test].push({
                                x: newDate[1],
                                y: e[Object.keys(e)[start]]
                            })
                        }
                    }
                    test++; start++;
                }
            })

            let moduleCheck;
            if (getSerial[i].Module === null || getSerial[i].Module === '') {
                moduleCheck = `Hệ ${i + 1}`;
            } else {
                moduleCheck = getSerial[i].Module
            }

            chartData.push({ module: moduleCheck, NumberDevice: getSerial[i].NumberDevice, data: arrItem })
            if (labels.length == 0) {
                labels.push(arrLabel)
            } else if ((labels.length != 0) && (labels[0].length < arrLabel.length)) {
                labels = [];
                labels.push(arrLabel);
            }
        }

        let intialData = [];
        let newlabel = [];
        for (let i = 0; i < labels[0].length; i++) {
            newlabel.push({
                x: labels[0][i],
                y: 0
            })
        }
        chartData.forEach((e) => {
            let arrData = e.data;
            for (let int = 0; int < e.NumberDevice; int++) {
                let final;
                if (arrData[int] === undefined) {
                    final = newlabel;
                } else {
                    let only = newlabel.filter(comparer(arrData[int]));
                    final = only.concat(arrData[int])
                    final.sort(function (a, b) {
                        if (parseInt(a.x.split(":")[0]) - parseInt(b.x.split(":")[0]) === 0) {
                            return parseInt(a.x.split(":")[1]) - parseInt(b.x.split(":")[1]);
                        } else {
                            return parseInt(a.x.split(":")[0]) - parseInt(b.x.split(":")[0]);
                        }
                    })
                }
                let color = getRandomColor();

                let checkLabel;
                if (e.module === 'Main Cabinet'
                    || e.module === 'Ground' || e.module === 'Hot part cabinet') {
                    checkLabel = `${e.module}`
                } else {
                    if (PersonID === 'p_prtestkit') {
                        checkLabel = `Inverter${int + 1}`;
                    } else {
                        checkLabel = `${e.module}-Inverter${int + 1}`;
                    }
                }

                intialData.push({
                    label: checkLabel,
                    borderColor: color,
                    backgroundColor: color,
                    data: final,
                    lineTension: 0.1,
                    borderDashOffset: 0.0,
                    pointRadius: 0,
                    fill: false
                })
            }
        })

        Response.status(200).json({
            message: `Get power PV chart successful`,
            labels: labels,
            dataChart: intialData
        });

    } catch (err) {
        console.log(err)
        Response.status(500).json({
            message: `Some thing went wrong`
        });
    }
}

function comparer(otherArray) {
    if (otherArray === undefined) {
        return [];
    } else {
        return function (current) {
            return otherArray.filter(function (other) {
                return other.x == current.x
            }).length == 0;
        }
    }
}

let pageLayoutModule = async (Request, Response) => {
    try {
        let PersonID = JSON.parse(Request.headers.user).PersonID,
            // 
            queryModuleData = await sqlPool_SWH.request()
                .query(`SELECT Module, Serial FROM ${projectInfo} WHERE PersonID='${PersonID}' 
                AND Available = 1
                order by STT asc`),
            getModuleData = queryModuleData.recordset;

        Response.status(200).json({
            message: `Get module info successful`,
            data: getModuleData
        });
    } catch (err) {
        console.log(err)
        Response.status(500).json({
            message: `Không có dữ liệu`
        });
    }

}

let getListDetail = async (Request, Response) => {
    try {
        let lang = Request.headers['x-language'];
        let langTemp = await loadingLang(lang);
        let currentLang = langTemp.detaillist;

        let PersonID = JSON.parse(Request.headers.user).PersonID,
            { serial, fromDate, toDate, selected, pvType, device } = Request.body;
        let response;
        if (pvType === 'SOFAR') {
            if (device === 'MultiPVSofar10') {
                response = await axios.get(`${host}/api/pvsofar/v3/listLog`, {
                    params: {
                        serial: serial,
                        beginDate: fromDate,
                        endDate: toDate
                    }
                }).then(response => {
                    return response
                })
            }
            else if (device === 'Sungrow') {
                response = await getListFunc_Sungrow(serial, fromDate, toDate, PersonID);
            }
            else if (device === 'Sunspec' || device === 'MultiSunspec') {
                response = await getListFunc_Sunspec(serial, fromDate, toDate, PersonID);
            }
            else if (device === 'PV-SMA-OffGrid1') {
                response = await getListFunc_daobe(serial, fromDate, toDate);
            }
            else if (device === 'SmartBuilding1') {
                response = await energyConsump(serial, fromDate, toDate);
            }
            else if (device === 'Amata') {
                response = await getListFunc_Amata(serial, fromDate, toDate, device);
            }
            else if (device === 'PVSofarGroupV3') {
                response = await getListFunc_PVSofarGroupV3(serial, fromDate, toDate, 'detail');
            }
            else {
                response = await getListFunc_daobe(serial, fromDate, toDate);
                if (device !== 'MultiPVSofar1') {
                } else {
                    response.data.forEach(e => e.TodayProduction = e.Production);
                }
            }
        } else if (pvType === 'HUAWEI') {
            if (device === 'MultiPVHuawei1' || device === 'MultiPVHuawei3') {
                response = await getListDMY_Huawei1(serial, fromDate, toDate, 'detail', device);
            } else {
                response = await axios.get(`${host}/api/pvsofar/huawei/listLog`, {
                    params: {
                        user: PersonID,
                        serial: serial,
                        beginDate: fromDate,
                        endDate: toDate
                    }
                }).then(response => {
                    return response
                })
            }
        }

        let field = [];
        for (let i = 0; i < selected.length; i++) {
            if (field.length == 0) {
                if (device === 'MultiPVSofar10') {
                    field.push({ key: 'current_date', label: `${currentLang.time}` });
                } else {
                    field.push({ key: 'CurrentDate', label: `${currentLang.time}` });
                }
            }
            switch (selected[i]) {
                case 'SumPV': {
                    field.push({ key: 'SumPV', label: `${currentLang.sumpv} (kW)` })
                } break
                case 'SumPLoad': {
                    field.push({ key: 'SumPLoad', label: `${currentLang.loadpv} (kW)` })
                } break
                case 'Timer': {
                    field.push({ key: 'Timer', label: `${currentLang.timer} (h)` })
                } break
                case 'TodayProduction': {
                    field.push({ key: 'TodayProduction', label: `${currentLang.todayprod} (kWh)` })
                } break
                case 'TotalProduction': {
                    field.push({ key: 'TotalProduction', label: `${currentLang.totalprod} (kWh)` })
                } break
                case 'pv_power': {
                    field.push({ key: 'pv_power', label: `${currentLang.sumpv} (kW)` })
                } break
                case 'inverter_power': {
                    field.push({ key: 'inverter_power', label: `${currentLang.inverterpower} (kW)` })
                } break
                case 'load_power': {
                    field.push({ key: 'load_power', label: `${currentLang.loadpv} (kW)` })
                } break
                case 'charge_power': {
                    field.push({ key: 'charge_power', label: `${currentLang.chargepower} (kW)` })
                } break
                case 'today_production': {
                    field.push({ key: 'today_production', label: `${currentLang.todayprod} (kWh)` })
                } break
                case 'total_production': {
                    field.push({ key: 'total_production', label: `${currentLang.totalprod} (kWh)` })
                } break
                case 'PVPower': {
                    field.push({ key: 'PVPower', label: `${currentLang.sumpv} (kW)` })
                } break
                case 'InverterPower': {
                    field.push({ key: 'InverterPower', label: `${currentLang.inverterpower} (kW)` })
                } break
                case 'Production': {
                    field.push({ key: 'Production', label: `${currentLang.todayprod} (kWh)` })
                } break
                case 'Radiation': {
                    field.push({ key: 'Radiation', label: `${currentLang.radiation} (W/m<sup>2</sup>)` })
                } break
                case 'GetPV_Total': {
                    field.push({ key: 'GetPV_Total', label: `${currentLang.totalsumpv} (kW)` })
                } break
                case 'PLoadToday': {
                    field.push({ key: 'PLoadToday', label: `${currentLang.energyconsume} (kWh)` })
                } break
                case 'PLoadTotal': {
                    field.push({ key: 'PLoadTotal', label: `${currentLang.totalenergyconsume} (kWh)` })
                } break
                case 'GetPV_MG': {
                    field.push({ key: 'GetPV_MG', label: `${currentLang.sumconsume} (kW)` })
                } break
                case 'getEnergy_MG': {
                    field.push({ key: 'getEnergy_MG', label: `${currentLang.energyconsume} (kWh)` })
                } break
                case 'getPV_BackUpCabine': {
                    field.push({ key: 'getPV_BackUpCabine', label: `${currentLang.cabinet} (kW)` })
                } break
                case 'getPV_SuppilerPumpCabinet': {
                    field.push({ key: 'getPV_SuppilerPumpCabinet', label: `${currentLang.pumplevel} (kW)` })
                } break
                case 'getPV_1': {
                    field.push({ key: 'getPV_1', label: `${currentLang.sumconsume} (kW)` })
                } break
                case 'getEnergy_1': {
                    field.push({ key: 'getEnergy_1', label: `${currentLang.energyconsume} (kWh)` })
                } break
                case 'getPV_3': {
                    field.push({ key: 'getPV_3', label: `${currentLang.sumconsume} (kW)` })
                } break
                case 'getEnergy_3': {
                    field.push({ key: 'getEnergy_3', label: `${currentLang.energyconsume} (kWh)` })
                } break
                case 'getPV_PressurePump': {
                    field.push({ key: 'getPV_PressurePump', label: `${currentLang.booster} (kW)` })
                } break
                case 'getPV_ServerRoom': {
                    field.push({ key: 'getPV_ServerRoom', label: `${currentLang.serverroom} (kW)` })
                } break
                case 'getPV_4': {
                    field.push({ key: 'getPV_4', label: `${currentLang.sumconsume} (kW)` })
                } break
                case 'getEnergy_4': {
                    field.push({ key: 'getEnergy_4', label: `${currentLang.energyconsume} (kW)` })
                } break
                case 'getPV_Elevator': {
                    field.push({ key: 'getPV_Elevator', label: `${currentLang.elevator} (kW)` })
                } break
                case 'getEnergy_Elevator': {
                    field.push({ key: 'getEnergy_Elevator', label: `${currentLang.elevatorene} (kWh)` })
                } break
                case 'getPV_AirConditioner': {
                    field.push({ key: 'getPV_AirConditioner', label: `${currentLang.aircon} (kW)` })
                } break
                case 'getEnergy_AirConditioner': {
                    field.push({ key: 'getEnergy_AirConditioner', label: `${currentLang.airconene} (kWh)` })
                } break
                case 'getPV_HotPartCabinet': {
                    field.push({ key: 'getPV_HotPartCabinet', label: `${currentLang.sumconsume} (kW)` })
                }
            }
        }
        let responseArr = response.data;
        if (device === 'MultiPVSofar10') {
            responseArr.forEach((item) => {
                item.current_date = item.current_date.replace('T', ' ');
                if (item.load_power === null) {
                    item.load_power = 0
                }
                if (item.charge_power === null) {
                    item.charge_power = 0
                }
            });
        }
        else if (device === 'Sunspec' || device === 'MultiSunspec') {
            responseArr.forEach((item) => {
                item.CurrentDate = item.CurrentDate.replace('T', ' ');
                if (item.TodayProduction === null || item.TodayProduction < 0) {
                    item.TodayProduction = 0
                }
                if (item.Radiation === null) {
                    item.Radiation = 0
                }
            });

        }
        else if (device === 'SmartBuilding1') {
            responseArr.forEach((item) => {
                item.CurrentDate = item.CurrentDate.replace('T', ' ');
                if (item.Production === null) {
                    item.TodayProduction = 0
                }
                if (item.TotalProduction === null) {
                    item.TotalProduction = 0
                }
            });
        }
        else {
            responseArr.forEach((item) => item.CurrentDate = item.CurrentDate.replace('T', ' '));
        }
        Response.status(200).json({
            message: `Get list log successful`,
            data: {
                fields: field,
                tableData: responseArr
            }
        })

    } catch (err) {
        console.log(err)
        Response.status(500).json({
            message: `Không có dữ liệu`
        })
    }
}

async function getListDMY_Huawei1(serial, beginDate, endDate, by, device) {
    try {
        let queryString;

        let SumPVParams;
        let timerParams;
        let customTable;
        let customRawDataTable;
        if (device === 'MultiPVHuawei3') {
            SumPVParams = 'A70';
            timerParams = 'A51';
            customRawDataTable = 'tb_PVSofarHuaweiInverterV3';
            customTable = nextCalculateTable;
        } else {
            SumPVParams = 'A43';
            timerParams = 'A51';
            customRawDataTable = 'tb_PVSofarHuaweiInverter';
            customTable = PVinfo;
        }

        if (by === 'date') {
            queryString = `
            select * from 
                        (select convert(char(10), I.CurrentDate, 127) as CurrentDate, 
                        max(coalesce(NULLIF(I.MetterTodayProduction, 0.00), I.TodayProduction)) as Energy,
                        CONVERT(DECIMAL(10,2),(sum(CONVERT(float, I.Radiation))/12)/1000) as TotalRadiation,
                        max(L.Power) as PVPower
                        from ${customTable} I inner join
                            (select Serial, CurrentDate, coalesce(sum(A43), 0) as Power 
                            from ${customRawDataTable}
	                        where Serial = '${serial}'
	                        and CurrentDate >= '${beginDate}'
	                        and CurrentDate <= '${endDate}'
	                        group by Serial, CurrentDate) L
                        on I.Serial = L.Serial
                        and I.CurrentDate = L.CurrentDate
                        group by convert(char(10), I.CurrentDate, 127)) as D
                    order by CurrentDate
            `
        } else if (by === 'month') {
            queryString = `
            select * from 
                        (
                            select left(CurrentDate, 7) as CurrentDate, sum(Energy) as Energy, 
                            max(PVPower) as PVPower,
                            sum(Radiation) as Radiation
                            from
			                    (
                                    select convert(char(10), I.CurrentDate, 127) as CurrentDate, 
                                    max(coalesce(I.MetterTodayProduction, I.TodayProduction)) as Energy,
                                    CONVERT(DECIMAL(10,2),(sum(CONVERT(float, I.Radiation))/12)/1000) as Radiation, 
                                    max(L.Power) as PVPower
				                    from ${customTable} I inner join
					                    (
                                            select Serial, CurrentDate, coalesce(sum(A43), 0) as Power 
                                            from tb_PVSofarHuaweiInverter
						                    where Serial = '${customRawDataTable}'
						                    and convert(date, CurrentDate, 103) >= '${beginDate}'
						                    and convert(date, CurrentDate, 103) <= '${endDate}'
						                    group by Serial, CurrentDate
					                    ) L
				                    on I.Serial = L.Serial
				                    and I.CurrentDate = L.CurrentDate
				                    group by convert(char(10), I.CurrentDate, 127)
			                    ) D
		                    group by left(CurrentDate, 7)
	                    ) E
                    order by CurrentDate
            `
        } else if (by === 'year') {
            queryString = `
            select * from 
	                    (
                            select left(CurrentDate, 4) as CurrentDate, sum(Energy) as Energy,
                            sum(Radiation) as Radiation, 
                            max(PVPower) as PVPower from
			                    (
                                    select left(CurrentDate, 7) as CurrentDate, sum(Energy) as Energy,
                                    sum(Radiation) as Radiation, 
                                    max(PVPower) as PVPower from
					                    (
                                            select convert(char(10), I.CurrentDate, 127) as CurrentDate, 
                                            max(coalesce(I.MetterTodayProduction, I.TodayProduction)) as Energy,
                                            CONVERT(DECIMAL(10,2),(sum(CONVERT(float, I.Radiation))/12)/1000) as Radiation,
                                            max(L.Power) as PVPower
						                    from ${customTable} I inner join
							                    (
								                    select Serial, CurrentDate, coalesce(sum(A43), 0) as Power from ${customRawDataTable}
								                    where Serial = '${serial}'
								                    and convert(date, CurrentDate, 103) >= '${beginDate}'
								                    and convert(date, CurrentDate, 103) <= '${endDate}'
								                    group by Serial, CurrentDate
							                    ) L
						                    on I.Serial = L.Serial
						                    and I.CurrentDate = L.CurrentDate
						                    group by convert(char(10), I.CurrentDate, 127)
					                    ) D
				                    group by left(CurrentDate, 7)
			                    ) E
			                    group by left(CurrentDate, 4)
		                    ) F
                    order by CurrentDate
            `
        } else {
            queryString = `select * from
            (select sum(L.${SumPVParams}) as SumPV, max(L.${timerParams}) as Timer, 
                I.TodayProduction,
                I.ENVTemp, I.PVTemp,
                I.Radiation,
                convert(char(20), I.CurrentDate, 127) as CurrentDate, I.Serial, I.Signal
            from ${customRawDataTable} L inner join ${customTable} I on 
            L.CurrentDate = I.CurrentDate and I.Serial = L.Serial
            where I.Serial= '${serial}'
            and convert(date, I.CurrentDate, 103) >= '${beginDate}' 
            and convert(date, I.CurrentDate, 103) <= '${endDate}'
            group by I.CurrentDate, I.Serial, I.Signal, I.TodayProduction, 
            I.MetterEnergyComsumption, I.ENVTemp, I.PVTemp, I.Radiation )
            as T
        order by CurrentDate`
        }

        let queryData = await sqlPool_PV.request()
            .query(queryString);

        return {
            data: queryData.recordset
        };
    } catch (err) {
        console.log(err);
    }
}

//Amata
async function getListFunc_Amata(serial, beginDate, endDate, device) {
    try {
        let queryProjectInfo = await sqlPool_SWH.request()
            .query(`SELECT HasMetter FROM ${projectInfo} WHERE Serial = '${serial}' AND Available = 1
            order by STT asc`);
        let HasMetter = queryProjectInfo.recordset[0].HasMetter;

        let nameTodayProd;
        if (device === 'Amata') {
            nameTodayProd = 'Production'
        } else if (device === 'MultiPVSofar1') {
            nameTodayProd = 'TodayProduction'
        }

        let returnValue;
        if (HasMetter === true) {
            let queryData = await sqlPool_PV.request()
                .query(`
                select * from
                (select (sum(A10) + sum(A11)) as SumPV, 
                sum(A12) as SumPLoad, max(A22) as Timer, 
                I.MetterTodayProduction as ${nameTodayProd}, 
                I.MetterEnergyComsumption,
                I.MetterTotalProduction as TotalProduction,
                I.Radiation,
                I.ENVTemp, I.PVTemp,
                convert(char(20), I.CurrentDate, 127) as CurrentDate, I.Serial, 
                I.SessionID, I.Signal,
                I.BussinessMoneySaved
                from tb_PVSofarLog L 
                inner join ${PVinfo} I 
                on L.CurrentDate = I.CurrentDate 
                and I.Serial = L.Serial
                inner join tb_PVSofarFullMetter M
                on M.Serial = I.Serial
                and M.CurrentDate = I.CurrentDate
                where I.Serial='${serial}'
                and (I.CurrentDate between  '${beginDate}' and '${endDate}') 
                group by I.CurrentDate, I.Serial, I.SessionID, I.Signal, 
                I.MetterTodayProduction, I.MetterTotalProduction, I.TodayProduction,
                I.MetterEnergyComsumption, I.ENVTemp, I.PVTemp, I.BussinessMoneySaved,
                I.Radiation, 
                M.TodayPosEnergy, M.PosEnergy )
                as T
                order by CurrentDate;
                `);
            returnValue = queryData.recordset;
        } else {
            let queryData = await sqlPool_PV.request()
                .query(`
                select *, coalesce(TodayProduction, TProduction) as ${nameTodayProd} from
                (select (sum(A10) + sum(A11)) as SumPV, 
                sum(A12) as SumPLoad, max(A22) as Timer, 
                II.TodayProduction, II.MetterEnergyComsumption,
                II.ENVTemp, II.PVTemp,
                II.Radiation,
                sum(A23) as TProduction, sum(A21) as TotalProduction,
                convert(char(20), II.CurrentDate, 127) as CurrentDate, II.Serial, 
                II.SessionID, II.Signal,
                II.BussinessMoneySaved
                from tb_PVSofarLog inner join ${PVinfo} II on tb_PVSofarLog.CurrentDate = II.CurrentDate 
                and II.Serial = tb_PVSofarLog.Serial
                where II.Serial='${serial}'
                and (II.CurrentDate between  '${beginDate}' and '${endDate}') 
                group by II.CurrentDate, II.Serial, II.SessionID, 
                II.Signal, II.TodayProduction, II.MetterEnergyComsumption, 
                II.ENVTemp, II.PVTemp, II.BussinessMoneySaved, II.Radiation )
                as T
                order by CurrentDate
                `)
            returnValue = queryData.recordset;
        }
        return {
            data: returnValue
        };
    } catch (err) {
        console.log(err);
    }
}

// sungrow type list summary
async function getListFunc_Sungrow(serial, beginDate, endDate, PersonID) {
    try {
        let queryProjectInfo = await sqlPool_SWH.request()
            .query(`SELECT HasMetter, ProjectType FROM ${projectInfo} WHERE Serial = '${serial}' 
            AND Available = 1 
            AND PersonID = '${PersonID}'
            ORDER BY STT ASC`);
        let { HasMetter, ProjectType } = queryProjectInfo.recordset[0];
        let returnValue;
        if (HasMetter === true) {
            let queryData = await sqlPool_PV.request()
                .input('Serial', sql.NVarChar, serial)
                .input('beginDate', beginDate)
                .input('endDate', endDate)
                .query(`select convert(char(20), CurrentDate, 127) as CurrentDate, 
                    MetterTodayProduction as TodayProduction, 
                    MetterTotalProduction as TotalProduction, 
                    Radiation, InverterPower from ${nextCalculateTable}
                    where Serial = @Serial and CurrentDate between @beginDate and @endDate
                    order by CurrentDate desc`);
            returnValue = queryData.recordset;
        } else {
            let queryData = await sqlPool_PV.request()
                .input('Serial', sql.NVarChar, serial)
                .input('beginDate', beginDate)
                .input('endDate', endDate)
                .query(`select convert(char(20), I.CurrentDate, 127) as CurrentDate,
                I.TodayProduction, SUM(II.A34) as PVPower,
                I.TotalProduction, I.Radiation,
                SUM(II.A40) as Timer from ${nextCalculateTable} I
                inner join tb_Sungrow_Inverter II
                on I.CurrentDate = II.CurrentDate
                and I.Serial = II.Serial
                where I.Serial = @Serial and I.CurrentDate 
                between @beginDate and @endDate
                group by I.CurrentDate, I.TodayProduction, I.TotalProduction, I.Radiation,
                I.InverterPower
                order by I.CurrentDate desc
                `);
            returnValue = queryData.recordset;
        }
        return {
            data: returnValue
        };
    } catch (err) {
        console.log(err);
    }
}

// Sunspec - multisunspec - list detail - test ID Vinasino 14
async function getListFunc_Sunspec(serial, beginDate, endDate, PersonID) {
    try {
        let queryProjectInfo = await sqlPool_SWH.request()
            .query(`SELECT HasMetter, ProjectType, Birthday FROM ${projectInfo} WHERE Serial = '${serial}' 
            AND Available = 1
            and PersonID = '${PersonID}'
            order by STT asc`);
        let HasMetter = queryProjectInfo.recordset[0].HasMetter;
        let projectType = queryProjectInfo.recordset[0].ProjectType;

        //Birthday serial for testing account
        let bdSerial = queryProjectInfo.recordset[0].Birthday;

        let returnValue;
        if (HasMetter === true) {
            if (projectType === 14) {
                let queryData = await sqlPool_PV.request()
                    .input('Serial', sql.NVarChar, bdSerial)
                    .input('beginDate', beginDate)
                    .input('endDate', endDate)
                    .query(`select convert(char(20), I.CurrentDate, 127) as CurrentDate, 
                    I.MetterTodayProduction as TodayProduction, 
                    I.MetterTotalProduction as TotalProduction, II.PVPower, II.Radiation,
                    II.InverterPower from ${nextCalculateTable} I
                    inner join ${PVinfo} II on I.Serial = II.Serial and I.CurrentDate = II.CurrentDate
                    where I.Serial = @Serial and I.CurrentDate between @beginDate and @endDate
                    order by I.CurrentDate desc`);
                returnValue = queryData.recordset;
            } else {
                let queryData = await sqlPool_PV.request()
                    .query(`select convert(char(20), CurrentDate, 127) as CurrentDate, 
                    MetterTodayProduction as TodayProduction, 
                    MetterTotalProduction as TotalProduction, PVPower, Radiation,
                    InverterPower from ${PVinfo}
                    where Serial = '${serial}' and CurrentDate between '${beginDate}' and '${endDate}'
                    order by CurrentDate desc
                    `);
                returnValue = queryData.recordset;
            }
        } else {
            let queryData = await sqlPool_PV.request()
                .query(`select convert(char(20), CurrentDate, 127) as CurrentDate,
                TodayProduction, 
                TotalProduction, PVPower, Radiation,
                InverterPower from ${PVinfo}
                where Serial = '${serial}' and CurrentDate between '${beginDate}' and '${endDate}'
                order by CurrentDate desc
                `);
            returnValue = queryData.recordset;
        }
        return {
            data: returnValue
        };
    } catch (err) {
        console.log(err)
    }
}

// PV sofar group v3
async function getListFunc_PVSofarGroupV3(serial, beginDate, endDate, by) {
    try {
        let queryProjectInfo = await sqlPool_SWH.request()
            .input('Serial', sql.NVarChar, serial)
            .query(`SELECT HasMetter FROM ${projectInfo} WHERE Serial=@Serial 
            AND Available=1 
            ORDER BY STT ASC`);
        let HasMetter = queryProjectInfo.recordset[0].HasMetter;

        let returnValue;
        if (by === 'date') {
            let queryData = await sqlPool_PV.request()
                .input('Serial', sql.NVarChar, serial)
                .input('fromDate', beginDate).input('toDate', endDate)
                .query(`select * from 
                (select convert(char(10), I.CurrentDate, 127) as Date, 
                max(coalesce(NULLIF(I.MetterTodayProduction, 0.00), I.TodayProduction)) as TodayProduction,
                max(CONVERT(float, I.Radiation)) as Radiation,
                CONVERT(DECIMAL(10,2),(sum(CONVERT(float, I.Radiation))/12)/1000) as TotalRadiation,
                max(L.Power) as Power
                from ${nextCalculateTable} I inner join
                    (select II.Serial, II.CurrentDate, (sum(II.A12) + sum(III.A15)) as Power from ${pvsofarNextLog} II
                    inner join ${pvsofarv3NextLog} III on II.Serial = III.Serial and II.CurrentDate = III.CurrentDate
                    where II.Serial = @Serial
                    and CONVERT(date, II.CurrentDate, 103) >=  @fromDate
                    and CONVERT(date, II.CurrentDate, 103) <= @toDate
                    group by II.Serial, II.CurrentDate) L
                on I.Serial = L.Serial
                and I.CurrentDate = L.CurrentDate
                group by convert(char(10), I.CurrentDate, 127)) as D
            order by Date`);
            returnValue = queryData.recordset;
        } else if (by === 'month') {
            let queryData = await sqlPool_PV.request()
                .input('Serial', sql.NVarChar, serial)
                .input('fromDate', beginDate).input('toDate', endDate)
                .query(`
                select * from 
                        (
                            select left(CurrentDate, 7) as Month, sum(Energy) as MonthProduction,
                            sum(Radiation) as Radiation,
                            max(PVPower) as Power from
			                    (
                                    select convert(char(10), I.CurrentDate, 127) as CurrentDate, 
                                    max(coalesce(NULLIF(I.MetterTodayProduction, 0.00), I.TodayProduction)) as Energy,
                                    CONVERT(DECIMAL(10,2),(sum(CONVERT(float, I.Radiation))/12)/1000) as Radiation,
                                    max(L.Power) as PVPower
				                    from ${nextCalculateTable} I inner join
					                    (
						                    select II.Serial, II.CurrentDate, (sum(II.A12) + sum(III.A15)) as Power from ${pvsofarNextLog} II
                                            inner join ${pvsofarv3NextLog} III
                                            on II.Serial = III.Serial and II.CurrentDate = III.CurrentDate
						                    where II.Serial = @Serial
						                    and CONVERT(date, II.CurrentDate, 103) >= @fromDate
						                    and CONVERT(date, II.CurrentDate, 103) <= @toDate
						                    group by II.Serial, II.CurrentDate
					                    ) L
				                    on I.Serial = L.Serial
				                    and I.CurrentDate = L.CurrentDate
				                    group by convert(char(10), I.CurrentDate, 127)
			                    ) D
		                    group by left(CurrentDate, 7)
	                    ) E
                    order by Month
                `);
            returnValue = queryData.recordset;
        } else if (by === 'year') {
            let queryData = await sqlPool_PV.request()
                .input('Serial', sql.NVarChar, serial)
                .input('fromDate', beginDate).input('toDate', endDate)
                .query(`
            select * from 
	                    (
                            select left(CurrentDate, 4) as Year, sum(Energy) as YearProduction,
                            sum(Radiation) as Radiation,
                            max(PVPower) as Power from
			                    (
                                    select left(CurrentDate, 7) as CurrentDate, sum(Energy) as Energy,
                                    sum(Radiation) as Radiation,
                                    max(PVPower) as PVPower from
					                    (
                                            select convert(char(10), I.CurrentDate, 127) as CurrentDate, 
                                            max(coalesce(NULLIF(I.MetterTodayProduction, 0.00), I.TodayProduction)) as Energy,
                                            CONVERT(DECIMAL(10,2),(sum(CONVERT(float, I.Radiation))/12)/1000) as Radiation, 
                                            max(L.Power) as PVPower
						                    from ${nextCalculateTable} I inner join
							                    (
                                                    select II.Serial, II.CurrentDate, (sum(II.A12) + sum(III.A15)) as Power 
                                                    from ${pvsofarNextLog} II
                                                    inner join ${pvsofarv3NextLog} III
                                                    on II.Serial = III.Serial and II.CurrentDate = III.CurrentDate
								                    where II.Serial = @Serial
								                    and CONVERT(date, II.CurrentDate, 103) >= @fromDate
								                    and CONVERT(date, II.CurrentDate, 103) <= @toDate
								                    group by II.Serial, II.CurrentDate
							                    ) L
						                    on I.Serial = L.Serial
						                    and I.CurrentDate = L.CurrentDate
						                    group by convert(char(10), I.CurrentDate, 127)
					                    ) D
				                    group by left(CurrentDate, 7)
			                    ) E
			                    group by left(CurrentDate, 4)
		                    ) F
                    order by Year
            `);
            returnValue = queryData.recordset;
        } else {
            if (HasMetter === true) {
            } else {
                let queryData = await sqlPool_PV.request()
                    .input('Serial', sql.NVarChar, serial)
                    .input('beginDate', beginDate)
                    .input('endDate', endDate)
                    .query(`
                    select * from
                    (select (sum(L.A10) + sum(L.A11) 
                    + sum(V.A12) + sum(V.A13) + sum(V.A14)) as SumPV, 
                        sum(L.A12 + V.A15) as SumPLoad, max(L.A22 + V.A25) as Timer, 
                        I.TodayProduction as TodayProduction, I.MetterEnergyComsumption,
                        I.TotalProduction as TotalProduction,
                        I.ENVTemp, I.PVTemp,
                        convert(char(20), I.CurrentDate, 127) as CurrentDate, I.Serial, 
                        I.SessionID, I.Signal,
                        I.BussinessMoneySaved,
                        I.Radiation
                    from ${pvsofarNextLog} L
                    inner join ${pvsofarv3NextLog} V
                    on L.CurrentDate = V.CurrentDate
                    and L.Serial = V.Serial 
                    inner join ${nextCalculateTable} I 
                    on L.CurrentDate = I.CurrentDate 
                    and I.Serial = L.Serial
                    where I.Serial=@Serial
                    and (I.CurrentDate between @beginDate and @endDate) 
                    group by I.CurrentDate, I.Serial, I.SessionID, I.Signal, 
                    I.TodayProduction, I.TotalProduction, 
                    I.MetterEnergyComsumption, I.ENVTemp, I.PVTemp, I.BussinessMoneySaved, I.Radiation)
                    as T
                    order by CurrentDate
                    `);
                returnValue = queryData.recordset;
            }
        }
        return {
            data: returnValue
        };
    } catch (err) {
        console.log(err);
    }
}

// PV-SMA-Offgrid1 - list detail
async function getListFunc_daobe(serial, beginDate, endDate) {
    try {
        let queryProjectInfo = await sqlPool_SWH.request()
            .query(`SELECT HasMetter FROM ${projectInfo} WHERE Serial = '${serial}' 
            AND Available = 1
            order by STT asc`);

        let HasMetter = queryProjectInfo.recordset[0].HasMetter;

        let returnValue;
        if (HasMetter === true) {
            let queryData = await sqlPool_PV.request()
                .query(`select * from
            (select (sum(A10) + sum(A11)) as SumPV, 
                sum(A12) as SumPLoad, max(A22) as Timer, 
                I.MetterTodayProduction as Production, I.MetterEnergyComsumption,
                I.MetterTotalProduction as TotalProduction,
                I.ENVTemp, I.PVTemp,
                convert(char(20), I.CurrentDate, 127) as CurrentDate, I.Serial, 
                I.SessionID, I.Signal,
                I.BussinessMoneySaved,
                I.Radiation
            from tb_PVSofarLog L 
            inner join ${PVinfo} I 
            on L.CurrentDate = I.CurrentDate 
            and I.Serial = L.Serial
            inner join tb_PVSofarFullMetter M
            on M.Serial = I.Serial
            and M.CurrentDate = I.CurrentDate
            where I.Serial='${serial}'
            and (I.CurrentDate between '${beginDate}' and '${endDate}') 
            group by I.CurrentDate, I.Serial, I.SessionID, I.Signal, 
            I.MetterTodayProduction, I.MetterTotalProduction, I.TodayProduction, 
            I.MetterEnergyComsumption, I.ENVTemp, I.PVTemp, I.BussinessMoneySaved, I.Radiation,
            M.TodayPosEnergy, M.PosEnergy )
            as T
            order by CurrentDate
            `);
            returnValue = queryData.recordset;
        } else {
            let queryData = await sqlPool_PV.request()
                .query(`
            select *, coalesce(TodayProduction, TProduction) as Production from
            (select (sum(A10) + sum(A11)) as SumPV, 
            sum(A12) as SumPLoad, max(A22) as Timer, 
			${PVinfo}.TodayProduction, ${PVinfo}.MetterEnergyComsumption,
            ${PVinfo}.ENVTemp, ${PVinfo}.PVTemp,
			sum(A23) as TProduction, sum(A21) as TotalProduction,
			convert(char(20), ${PVinfo}.CurrentDate, 127) as CurrentDate, ${PVinfo}.Serial, 
			${PVinfo}.SessionID, ${PVinfo}.Signal,
            ${PVinfo}.BussinessMoneySaved,
            ${PVinfo}.Radiation
            from tb_PVSofarLog inner join ${PVinfo} on 
            tb_PVSofarLog.CurrentDate = ${PVinfo}.CurrentDate 
            and ${PVinfo}.Serial = tb_PVSofarLog.Serial
			where ${PVinfo}.Serial='${serial}'
			and (${PVinfo}.CurrentDate between '${beginDate}' and '${endDate}') 
            group by ${PVinfo}.CurrentDate, ${PVinfo}.Serial, ${PVinfo}.Radiation,
            ${PVinfo}.SessionID, ${PVinfo}.Signal, ${PVinfo}.TodayProduction, 
            ${PVinfo}.MetterEnergyComsumption, ${PVinfo}.ENVTemp, ${PVinfo}.PVTemp,
            ${PVinfo}.BussinessMoneySaved )
			as T
		    order by CurrentDate
            `);
            returnValue = queryData.recordset;
        }
        return {
            data: returnValue
        };
    } catch (err) {
        console.log(err);
    }
}

let ListDetail = async (Request, Response) => {
    try {
        let { sessionID, Serial, pvType, device } = Request.body;
        let response;

        // let 
        let queryGetNumberDevice = await sqlPool_SWH.request()
            .query(`SELECT NumberDevice FROM ${projectInfo} WHERE Serial='${Serial}' 
            AND Available = 1
            order by STT asc`);
        let numberDevice = queryGetNumberDevice.recordset[0].NumberDevice;

        if (pvType === 'SOFAR') {
            response = await axios.get(`${host}/api/pvsofar/listLogDetail`, {
                params: {
                    serial: Serial,
                    session: sessionID
                }
            }).then(response => {
                return response
            })
        } else if (pvType === 'HUAWEI') {
            response = await axios.get(`${host}/api/pvsofar/huawei/listlogDetail`, {
                params: {
                    serial: Serial,
                    date: sessionID
                }
            }).then(response => {
                return response
            })
        }
        let fields = [];
        let detailData = [];
        let finalData;
        if (pvType === 'SOFAR') {
            if (device === 'Amata') {
                fields = [
                    { key: 'InverterID', label: 'Inverter ID' },
                    { key: 'A6', label: 'Điện áp PV1 (V)' },
                    { key: 'A8', label: 'Điện áp PV2 (V)' },
                    { key: 'A10', label: 'PV1 Power (kW)' },
                    { key: 'A11', label: 'PV2 Power (kW)' }
                ]
            } else {
                fields = [
                    { key: 'InverterID', label: 'Inverter ID' },
                    { key: 'A6', label: 'Điện áp PV1 (V)' },
                    { key: 'A8', label: 'Điện áp PV2 (V)' }
                ]
            }
            finalData = response.data;
        } else if (pvType === 'HUAWEI') {
            fields.push({ key: 'bienso', label: `Biến số` }, { key: 'donvi', label: 'Đơn vị' })
            response.data.forEach((e, index) => {
                fields.push({ key: `inv${index + 1}`, label: `Inverter ${index + 1}` })

                if (detailData.length == 0) {
                    let datainput = `inv${index + 1}`;

                    detailData.push(
                        { bienso: 'Inverter status', donvi: '' }, { bienso: 'Rated Power', donvi: '' },
                        { bienso: 'Alarm 1', donvi: '' }, { bienso: 'Alarm 2', donvi: '' },
                        { bienso: 'Alarm 3', donvi: '' }, { bienso: 'Alarm 4', donvi: '' },
                        { bienso: 'Alarm 5', donvi: '' }, { bienso: 'Alarm 6', donvi: '' },
                        { bienso: 'Alarm 7', donvi: '' }, { bienso: 'Alarm 8', donvi: '' },
                        { bienso: 'Alarm 9', donvi: '' }, { bienso: 'Alarm 10', donvi: '' },
                        { bienso: 'Alarm 11', donvi: '' }, { bienso: 'CO2 Reduction', donvi: '' },
                        { bienso: 'PV1 Voltage', donvi: '(V)' }, { bienso: 'PV1 Current', donvi: '(A)' },
                        { bienso: 'PV2 Voltage', donvi: '(V)' }, { bienso: 'PV2: Current', donvi: '(A)' },
                        { bienso: 'PV3 Voltage', donvi: '(V)' }, { bienso: 'PV3 Current', donvi: '(A)' },
                        { bienso: 'PV4 Voltage', donvi: '(V)' }, { bienso: 'PV4 Current', donvi: '(A)' },
                        { bienso: 'PV5 Voltage', donvi: '(V)' }, { bienso: 'PV5 Current', donvi: '(A)' },
                        { bienso: 'PV6 Voltage', donvi: '(V)' }, { bienso: 'PV6 Current', donvi: '(A)' },
                        { bienso: 'PV7 Voltage', donvi: '(V)' }, { bienso: 'PV7 Current', donvi: '(A)' },
                        { bienso: 'PV8 Voltage', donvi: '(V)' }, { bienso: 'PV8 Current', donvi: '(V)' },
                        { bienso: 'Uab', donvi: '(V)' }, { bienso: 'Ubc', donvi: '(V)' },
                        { bienso: 'Uca', donvi: '(V)' }, { bienso: 'Ua', donvi: '(V)' },
                        { bienso: 'Ub', donvi: '(V)' }, { bienso: 'Uc', donvi: '(V)' },
                        { bienso: 'la', donvi: '(V)' }, { bienso: 'lb', donvi: '(V)' }, { bienso: 'lc', donvi: '(V)' },
                        { bienso: 'Frequecy', donvi: '(Hz)' }, { bienso: 'Power factor', donvi: '' },
                        { bienso: 'Inverter Efficiency', donvi: '(%)' }, { bienso: 'Cabinet temperature', donvi: '(\u00B0C)' },
                        { bienso: 'Active power', donvi: '(kW)' }, { bienso: 'Reactive power', donvi: '(kW)' },
                        { bienso: 'Total input power', donvi: '(kW)' }, { bienso: 'Energy in Hour', donvi: '(kWh)' },
                        { bienso: 'Energy in Day', donvi: '(kWh)' }, { bienso: 'Energy in Month', donvi: '(kWh)' },
                        { bienso: 'Energy in Year', donvi: '(kWh)' }, { bienso: 'Energy in total', donvi: '(kWh)' },
                        { bienso: 'Inverter start time', donvi: '(hour)' }, { bienso: 'Inverter shutdown time', donvi: '(hour)' },
                        { bienso: 'MPPT1 total input power', donvi: '(kW)' }, { bienso: 'MPPT2 total input power', donvi: '(kW)' },
                        { bienso: 'MPPT3 total input power', donvi: '(kW)' }, { bienso: 'MPPT4 total input power', donvi: '(kW)' }
                    )

                    delete e.STT;
                    delete e.Serial;
                    delete e.CurrentDate;
                    delete e.HwId;
                    delete e.Status;

                    Object.values(e).forEach((value, indexu) => {
                        let pos = detailData[indexu]
                        pos[datainput] = value;
                    });
                } else {
                    let datainput = `inv${index + 1}`;
                    delete e.STT;
                    delete e.Serial;
                    delete e.CurrentDate;
                    delete e.HwId;
                    delete e.Status;
                    Object.values(e).forEach((value, indexu) => {
                        let pos = detailData[indexu]
                        pos[datainput] = value;
                    });
                }
            })
            finalData = detailData
        }
        let dataCheck = [];
        if (pvType === 'SOFAR') {
            for (let i = 0; i < numberDevice; i++) {
                dataCheck.push(finalData[i])
            }
        } else if (pvType === 'HUAWEI') {
            dataCheck = finalData;
        }

        Response.status(200).json({
            message: `Get detail successful`,
            data: {
                fields: fields,
                dataTable: dataCheck
            }
        })
    } catch (err) {
        console.log(err);
        Response.status(500).json({
            message: `Không có dữ liệu`
        })
    }
}

let getDateMonthYear = async (Request, Response) => {
    try {
        let lang = Request.headers['x-language'];
        let langTemp = await loadingLang(lang);
        let currentLang = langTemp.detaillist;

        let PersonID = JSON.parse(Request.headers.user).PersonID;
        let { Serial, fromDate, toDate, by, selected, pvType, device } = Request.body;

        let queryProjectType = await sqlPool_SWH.request()
            .input('Serial', sql.NVarChar, Serial)
            .input('PersonID', sql.NVarChar, PersonID)
            .query(`SELECT ProjectType, Birthday FROM ${projectInfo} 
            WHERE Serial=@Serial and PersonID=@PersonID`);

        let ProjectType = queryProjectType.recordset[0].ProjectType;
        //Birthday serial for testing account
        let bdSerial = queryProjectType.recordset[0].Birthday;

        // let 
        let price = await getPrice(sqlPool_SWH, PersonID);
        let readyParams;
        let fields = [];

        //GET by Date
        if (by == 'date') {
            let fromDatespl = fromDate.split(' '),
                toDatespl = toDate.split(' ');

            readyParams = {
                user: PersonID,
                serial: Serial,
                from: fromDatespl[0],
                to: toDatespl[0],
                by: 'day'
            }

            fields.push({ key: 'Date', label: currentLang.date })

            for (let i = 0; i <= selected.length; i++) {
                switch (selected[i]) {
                    case 'Power': {
                        fields.push({ key: 'Power', label: `${currentLang.sumpv} (kW)` })
                    } break
                    case 'TodayProduction': {
                        fields.push({
                            key: 'TodayProduction',
                            label: `${currentLang.todayprod} (kWh)`
                        })
                    } break
                    case 'Money': {
                        fields.push({
                            key: 'TotalSaveMoney',
                            label: `${currentLang.totalmoneysave} (VNĐ)`
                        })
                    } break
                    case 'Radiation': {
                        fields.push({
                            key: 'Radiation',
                            label: `${currentLang.radiation} (W/m<sup>2</sup>)`
                        })
                    } break
                    case 'TotalRadiation': {
                        fields.push({
                            key: 'TotalRadiation',
                            label: `${currentLang.totalradiation} (kWh/m<sup>2</sup>)`
                        })
                    } break
                    case 'GetPV_Total': {
                        fields.push({ key: 'GetPV_Total', label: `${currentLang.totalsumpv} (kW)` })
                    } break
                    case 'PLoadToday': {
                        fields.push({ key: 'PLoadToday', label: `${currentLang.energyconsume} (kWh)` })
                    } break
                    case 'PLoadTotal': {
                        fields.push({ key: 'PLoadTotal', label: `${currentLang.totalenergyconsume} (kWh)` })
                    } break
                    case 'GetPV_MG': {
                        fields.push({ key: 'GetPV_MG', label: `${currentLang.sumconsume} (kW)` })
                    } break
                    case 'getEnergy_MG': {
                        fields.push({ key: 'getEnergy_MG', label: `${currentLang.energyconsume} (kWh)` })
                    } break
                    case 'getPV_BackUpCabine': {
                        fields.push({ key: 'getPV_BackUpCabine', label: `${currentLang.cabinet} (kW)` })
                    } break
                    case 'getPV_SuppilerPumpCabinet': {
                        fields.push({ key: 'getPV_SuppilerPumpCabinet', label: `${currentLang.pumplevel} (kW)` })
                    } break
                    case 'getPV_1': {
                        fields.push({ key: 'getPV_1', label: `${currentLang.instanconsume} (kW)` })
                    } break
                    case 'getEnergy_1': {
                        fields.push({ key: 'getEnergy_1', label: `${currentLang.energyconsume} (kWh)` })
                    } break
                    case 'getPV_3': {
                        fields.push({ key: 'getPV_3', label: `${currentLang.instanconsume} (kW)` })
                    } break
                    case 'getEnergy_3': {
                        fields.push({ key: 'getEnergy_3', label: `${currentLang.energyconsume} (kWh)` })
                    } break
                    case 'getPV_PressurePump': {
                        fields.push({ key: 'getPV_PressurePump', label: `${currentLang.booster} (kW)` })
                    } break
                    case 'getPV_ServerRoom': {
                        fields.push({ key: 'getPV_ServerRoom', label: `${currentLang.serverroom} (kW)` })
                    } break
                    case 'getPV_4': {
                        fields.push({ key: 'getPV_4', label: `${currentLang.instanconsume} (kW)` })
                    } break
                    case 'getEnergy_4': {
                        fields.push({ key: 'getEnergy_4', label: `${currentLang.energyconsume} (kWh)` })
                    } break
                    case 'getPV_Elevator': {
                        fields.push({ key: 'getPV_Elevator', label: `${currentLang.elevator} (kW)` })
                    } break
                    case 'getEnergy_Elevator': {
                        fields.push({ key: 'getEnergy_Elevator', label: `${currentLang.elevatorene} (kWh)` })
                    } break
                    case 'getPV_AirConditioner': {
                        fields.push({ key: 'getPV_AirConditioner', label: `${currentLang.aircon} (kW)` })
                    } break
                    case 'getEnergy_AirConditioner': {
                        fields.push({ key: 'getEnergy_AirConditioner', label: `${currentLang.airconene} (kWh)` })
                    } break
                    case 'getPV_HotPartCabinet': {
                        fields.push({ key: 'getPV_HotPartCabinet', label: `${currentLang.instanconsume} (kW)` })
                    }
                }
            }

        } else if (by == 'month') {
            readyParams = {
                user: PersonID,
                serial: Serial,
                from: fromDate,
                to: toDate,
                by: 'month'
            }

            fields.push({ key: 'Month', label: currentLang.month })

            for (let i = 0; i <= selected.length; i++) {
                switch (selected[i]) {
                    case 'Power': {
                        fields.push({ key: 'Power', label: `${currentLang.sumpv} (kW)` })
                    } break
                    case 'MonthProduction': {
                        fields.push({ key: 'MonthProduction', label: `${currentLang.monthprod} (kWh)` })
                    } break
                    case 'Money': {
                        fields.push({ key: 'TotalSaveMoney', label: `${currentLang.monthmoneysave} (VNĐ)` })
                    } break
                    case 'Radiation': {
                        fields.push({ key: 'Radiation', label: `${currentLang.totalradiation} (kWh/m<sup>2</sup>)` })
                    } break
                    case 'GetPV_Total': {
                        fields.push({ key: 'GetPV_Total', label: `${currentLang.totalsumpv} (kW)` })
                    } break
                    case 'PLoadToday': {
                        fields.push({ key: 'PLoadToday', label: `${currentLang.energyconsume} (kWh)` })
                    } break
                    case 'PLoadTotal': {
                        fields.push({ key: 'PLoadTotal', label: `${currentLang.totalenergyconsume} (kWh)` })
                    } break
                    case 'GetPV_MG': {
                        fields.push({ key: 'GetPV_MG', label: `${currentLang.sumconsume} (kW)` })
                    } break
                    case 'getEnergy_MG': {
                        fields.push({ key: 'getEnergy_MG', label: `${currentLang.energyconsume} (kWh)` })
                    } break
                    case 'getPV_BackUpCabine': {
                        fields.push({ key: 'getPV_BackUpCabine', label: `${currentLang.cabinet} (kW)` })
                    } break
                    case 'getPV_SuppilerPumpCabinet': {
                        fields.push({ key: 'getPV_SuppilerPumpCabinet', label: `${currentLang.pumplevel} (kW)` })
                    } break
                    case 'getPV_1': {
                        fields.push({ key: 'getPV_1', label: `${currentLang.sumconsume} (kW)` })
                    } break
                    case 'getEnergy_1': {
                        fields.push({ key: 'getEnergy_1', label: `${currentLang.energyconsume} (kWh)` })
                    } break
                    case 'getPV_3': {
                        fields.push({ key: 'getPV_3', label: `${currentLang.instanconsume} (kW)` })
                    } break
                    case 'getEnergy_3': {
                        fields.push({ key: 'getEnergy_3', label: `${currentLang.energyconsume} (kWh)` })
                    } break
                    case 'getPV_PressurePump': {
                        fields.push({ key: 'getPV_PressurePump', label: `${currentLang.booster} (kW)` })
                    } break
                    case 'getPV_ServerRoom': {
                        fields.push({ key: 'getPV_ServerRoom', label: `${currentLang.serverroom} (kW)` })
                    } break
                    case 'getPV_4': {
                        fields.push({ key: 'getPV_4', label: `${currentLang.instanconsume} (kW)` })
                    } break
                    case 'getEnergy_4': {
                        fields.push({ key: 'getEnergy_4', label: `${currentLang.energyconsume} (kWh)` })
                    } break
                    case 'getPV_Elevator': {
                        fields.push({ key: 'getPV_Elevator', label: `${currentLang.elevator} (kW)` })
                    } break
                    case 'getEnergy_Elevator': {
                        fields.push({ key: 'getEnergy_Elevator', label: `${currentLang.elevatorene} (kWh)` })
                    } break
                    case 'getPV_AirConditioner': {
                        fields.push({ key: 'getPV_AirConditioner', label: `${currentLang.aircon} (kW)` })
                    } break
                    case 'getEnergy_AirConditioner': {
                        fields.push({ key: 'getEnergy_AirConditioner', label: `${currentLang.airconene} (kWh)` })
                    } break
                    case 'getPV_HotPartCabinet': {
                        fields.push({ key: 'getPV_HotPartCabinet', label: `${currentLang.instanconsume} (kW)` })
                    }
                }
            }

        } else if (by == 'year') {
            readyParams = {
                user: PersonID,
                serial: Serial,
                from: fromDate,
                to: toDate,
                by: 'year'
            }

            fields.push({ key: 'Year', label: currentLang.year })

            for (let i = 0; i <= selected.length; i++) {
                switch (selected[i]) {
                    case 'Power': {
                        fields.push({ key: 'Power', label: `${currentLang.sumpv} (kW)` })
                    } break
                    case 'YearProduction': {
                        fields.push({ key: 'YearProduction', label: `${currentLang.yearprod} (kWh)` })
                    } break
                    case 'Money': {
                        fields.push({ key: 'TotalSaveMoney', label: `${currentLang.yearmoneysave} (VNĐ)` })
                    } break
                    case 'Radiation': {
                        fields.push({ key: 'Radiation', label: `${currentLang.totalradiation} (kWh/m<sup>2</sup>)` })
                    } break
                    case 'GetPV_Total': {
                        fields.push({ key: 'GetPV_Total', label: `${currentLang.totalsumpv} (kW)` })
                    } break
                    case 'PLoadToday': {
                        fields.push({ key: 'PLoadToday', label: `${currentLang.energyconsume} (kWh)` })
                    } break
                    case 'PLoadTotal': {
                        fields.push({ key: 'PLoadTotal', label: `${currentLang.totalenergyconsume} (kWh)` })
                    } break
                    case 'GetPV_MG': {
                        fields.push({ key: 'GetPV_MG', label: `${currentLang.instanconsume} (kW)` })
                    } break
                    case 'getEnergy_MG': {
                        fields.push({ key: 'getEnergy_MG', label: `${currentLang.energyconsume} (kWh)` })
                    } break
                    case 'getPV_BackUpCabine': {
                        fields.push({ key: 'getPV_BackUpCabine', label: `${currentLang.cabinet} (kW)` })
                    } break
                    case 'getPV_SuppilerPumpCabinet': {
                        fields.push({ key: 'getPV_SuppilerPumpCabinet', label: `${currentLang.pumplevel} (kW)` })
                    } break
                    case 'getPV_1': {
                        fields.push({ key: 'getPV_1', label: `${currentLang.instanconsume} (kW)` })
                    } break
                    case 'getEnergy_1': {
                        fields.push({ key: 'getEnergy_1', label: `${currentLang.energyconsume} (kWh)` })
                    } break
                    case 'getPV_3': {
                        fields.push({ key: 'getPV_3', label: `${currentLang.instanconsume} (kW)` })
                    } break
                    case 'getEnergy_3': {
                        fields.push({ key: 'getEnergy_3', label: `${currentLang.energyconsume} (kWh)` })
                    } break
                    case 'getPV_PressurePump': {
                        fields.push({ key: 'getPV_PressurePump', label: `${currentLang.pumplevel} (kW)` })
                    } break
                    case 'getPV_ServerRoom': {
                        fields.push({ key: 'getPV_ServerRoom', label: `${currentLang.serverroom} (kW)` })
                    } break
                    case 'getPV_4': {
                        fields.push({ key: 'getPV_4', label: `${currentLang.instanconsume} (kW)` })
                    } break
                    case 'getEnergy_4': {
                        fields.push({ key: 'getEnergy_4', label: `${currentLang.energyconsume} (kWh)` })
                    } break
                    case 'getPV_Elevator': {
                        fields.push({ key: 'getPV_Elevator', label: `${currentLang.elevator} (kW)` })
                    } break
                    case 'getEnergy_Elevator': {
                        fields.push({ key: 'getEnergy_Elevator', label: `${currentLang.elevatorene} (kWh)` })
                    } break
                    case 'getPV_AirConditioner': {
                        fields.push({ key: 'getPV_AirConditioner', label: `${currentLang.aircon} (kW)` })
                    } break
                    case 'getEnergy_AirConditioner': {
                        fields.push({ key: 'getEnergy_AirConditioner', label: `${currentLang.airconene} (kWh)` })
                    } break
                    case 'getPV_HotPartCabinet': {
                        fields.push({ key: 'getPV_HotPartCabinet', label: `${currentLang.instanconsume} (kW)` })
                    }
                }
            }
        }

        let summaryRes;
        let splitDateFrom = fromDate.split(' '),
            splitDateTo = toDate.split(' ');
        if (pvType === 'SOFAR') {
            if (device === 'MultiPVSofar10') {
                if (by === 'date') {
                    let queryProduction = await sqlPool_PV.request().query(`
                    select * from 
                    (select convert(char(10), I.CurrentDate, 127) as Date, 
                    max(coalesce(NULLIF(I.MetterTodayProduction, 0.00), I.TodayProduction)) 
                    as TodayProduction, 
                    max(L.Power) as Power
                    from ${PVinfo} I inner join
                    (select Serial, CurrentDate, coalesce(sum(
                    (((A10) * (A11)) / 1000) + (((A12) * (A13)) / 1000) 
                    + (((A14) * (A15)) / 1000)), 0) as Power 
                    from tb_SoliqQ
                    where Serial = '${Serial}'
                    and convert(date, CurrentDate, 103) >= '${splitDateFrom[0]}'
                    and convert(date, CurrentDate, 103) <= '${splitDateTo[0]}'
                    group by Serial, CurrentDate) L
                    on I.Serial = L.Serial
                    and I.CurrentDate = L.CurrentDate
                    group by convert(char(10), I.CurrentDate, 127)) as D
                    order by D.Date
                    `);
                    summaryRes = sumPrice(queryProduction.recordset, by, price);
                } else if (by === 'month') {
                    let queryProduction = await sqlPool_PV.request().query(`
                    select * from
                    (select left(CurrentDate, 7) as Month, 
                    sum(Energy) as MonthProduction, max(PVPower) as Power from
                    (select convert(char(10), I.CurrentDate, 127) as CurrentDate,
                    max(coalesce(NULLIF(I.MetterTodayProduction, 0.00), I.TodayProduction)) 
                    as Energy, max(L.Power) as PVPower
                    from ${PVinfo} I inner join
                    (select Serial, CurrentDate, coalesce(sum(
                    (((A10) * (A11)) / 1000) + (((A12) * (A13)) / 1000) 
                    + (((A14) * (A15)) / 1000)), 0) as Power 
                    from tb_SoliqQ
                    where Serial = '${Serial}'
                    and convert(date, CurrentDate, 103) >= '${fromDate}'
                    and convert(date, CurrentDate, 103) <= '${toDate}'
                    group by Serial, CurrentDate) L
                    on I.Serial = L.Serial
                    and I.CurrentDate = L.CurrentDate
                    group by convert(char(10), I.CurrentDate, 127)) D
                    group by left(CurrentDate, 7)) E
                    order by E.Month
                    `);
                    summaryRes = sumPrice(queryProduction.recordset, by, price);
                } else if (by === 'year') {
                    let queryProduction = await sqlPool_PV.request().query(`
                    select * from 
                    (select left(CurrentDate, 4) as Year, 
                    sum(Energy) as YearProduction, 
                    max(PVPower) as Power from
                    (select left(CurrentDate, 7) as CurrentDate, 
                    sum(Energy) as Energy, 
                    max(PVPower) as PVPower from
                    (select convert(char(10), I.CurrentDate, 127) as CurrentDate, 
                    max(coalesce(NULLIF(I.MetterTodayProduction, 0.00), I.TodayProduction)) as Energy, 
                    max(L.Power) as PVPower
                    from ${PVinfo} I inner join
                    (select Serial, CurrentDate, coalesce(sum(
                    (((A10) * (A11)) / 1000) + (((A12) * (A13)) / 1000)
                    + (((A14) * (A15)) / 1000)), 0) as Power
                    from tb_SoliqQ
                    where Serial = '${Serial}'
                    and CurrentDate >= '${fromDate}'
                    and CurrentDate <= '${toDate}'
                    group by Serial, CurrentDate) L
                    on I.Serial = L.Serial
                    and I.CurrentDate = L.CurrentDate
                    group by convert(char(10), I.CurrentDate, 127)) D
                    group by left(CurrentDate, 7)) E
                    group by left(CurrentDate, 4)) F
                    order by F.Year
                    `);
                    summaryRes = sumPrice(queryProduction.recordset, by, price);
                }
            }
            else if (device === 'Sungrow') {
                if (by === 'date') {
                    let queryDate = await sqlPool_PV.request()
                        .input('Serial', sql.NVarChar, Serial)
                        .input('dateFrom', splitDateFrom[0])
                        .input('dateTo', splitDateTo[0])
                        .query(`select * from 
                            (select convert(char(10), I.CurrentDate, 127) as Date, 
                            max(coalesce(NULLIF(I.MetterTodayProduction, 0.00), I.TodayProduction)) 
                            as TodayProduction,
                            max(CONVERT(float, Radiation)) as Radiation,
                            CONVERT(DECIMAL(10,2),(sum(CONVERT(float, Radiation))/12)/1000) as TotalRadiation,
                            max(L.Power) as Power
                            from ${nextCalculateTable} I inner join
                                (select Serial, CurrentDate, sum(A34) as Power 
                                from tb_Sungrow_Inverter
                                where Serial = @Serial
                                and CONVERT(date, CurrentDate, 103) >= @dateFrom
                                and CONVERT(date, CurrentDate, 103) <= @dateTo
                                group by Serial, CurrentDate) L
                            on I.Serial = L.Serial
                            and I.CurrentDate = L.CurrentDate
                            group by convert(char(10), I.CurrentDate, 127)) as D
                            order by Date`);
                    summaryRes = sumPrice(queryDate.recordset, by, price);
                } else if (by === 'month') {
                    let queryMonth = await sqlPool_PV.request()
                        .input('Serial', sql.NVarChar, Serial)
                        .input('fromDate', fromDate)
                        .input('toDate', toDate)
                        .query(`
                            select * from 
                            ( select left(CurrentDate, 7) as Month, sum(Energy) as MonthProduction, 
                            sum(Radiation) as Radiation,
                            max(PVPower) as Power from
                            ( select convert(char(10), I.CurrentDate, 127) as CurrentDate, 
                            max(coalesce(NULLIF(I.MetterTodayProduction, 0.00), I.TodayProduction)) as Energy,
                            CONVERT(DECIMAL(10,2),(sum(CONVERT(float, Radiation))/12)/1000) as Radiation,
                            max(L.Power) as PVPower
                            from ${nextCalculateTable} I inner join
                            (select Serial, CurrentDate, sum(A34) as Power 
                            from tb_Sungrow_Inverter
                            where Serial = @Serial
                            and CONVERT(date, CurrentDate, 103) >= @fromDate
                            and CONVERT(date, CurrentDate, 103) <= @toDate
                            group by Serial, CurrentDate) L
                            on I.Serial = L.Serial
                            and I.CurrentDate = L.CurrentDate
                            group by convert(char(10), I.CurrentDate, 127)) D
                            group by left(CurrentDate, 7)) E
                            order by Month
                            `);
                    summaryRes = sumPrice(queryMonth.recordset, by, price);
                } else if (by === 'year') {
                    let queryYear = await sqlPool_PV.request()
                        .input('Serial', sql.NVarChar, Serial)
                        .input('fromDate', fromDate)
                        .input('toDate', toDate)
                        .query(`select * from 
                            ( select left(CurrentDate, 4) as Year, sum(Energy) as YearProduction,
                            sum(Radiation) as Radiation, 
                            max(PVPower) as Power from
                            ( select left(CurrentDate, 7) as CurrentDate, sum(Energy) as Energy,
                            sum(Radiation) as Radiation, 
                            max(PVPower) as PVPower from
                            ( select convert(char(10), I.CurrentDate, 127) as CurrentDate, 
                            max(coalesce(NULLIF(I.MetterTodayProduction, 0.00), I.TodayProduction)) as Energy,
                            CONVERT(DECIMAL(10,2),(sum(CONVERT(float, Radiation))/12)/1000) as Radiation, 
                            max(L.Power) as PVPower
                            from ${nextCalculateTable} I inner join
                            ( select Serial, CurrentDate, sum(A34) as Power 
                            from tb_Sungrow_Inverter
                            where Serial = @Serial
                            and convert(date, CurrentDate, 103) >= @fromDate
                            and convert(date, CurrentDate, 103) <= @toDate
                            group by Serial, CurrentDate
                            ) L
                            on I.Serial = L.Serial
                            and I.CurrentDate = L.CurrentDate
                            group by convert(char(10), I.CurrentDate, 127)) D
                            group by left(CurrentDate, 7)) E
                            group by left(CurrentDate, 4)) F
                            order by Year`);
                    summaryRes = sumPrice(queryYear.recordset, by, price);
                }
            }
            else if (device === 'Sunspec' || device === 'MultiSunspec') {
                if (by === 'date') {
                    if (ProjectType === 14) {
                        let queryDate = await sqlPool_PV.request()
                            .input('Serial', sql.NVarChar, bdSerial)
                            .input('dateFrom', splitDateFrom[0])
                            .input('dateTo', splitDateTo[0])
                            .query(`select * from 
                            (select convert(char(10), I.CurrentDate, 127) as Date, 
                            max(coalesce(NULLIF(I.MetterTodayProduction, 0.00), I.TodayProduction)) 
                            as TodayProduction,
                            max(CONVERT(float, II.Radiation)) as Radiation,
                            CONVERT(DECIMAL(10,2),(sum(CONVERT(float, II.Radiation))/12)/1000) as TotalRadiation,
                            max(L.Power) as Power
                            from ${nextCalculateTable} I inner join
                                (select Serial, CurrentDate, sum(A11/1000) as Power from tb_Sunspec_Inverter
                                where Serial = @Serial
                                and CONVERT(date, CurrentDate, 103) >= @dateFrom
                                and CONVERT(date, CurrentDate, 103) <= @dateTo
                                group by Serial, CurrentDate) L
                            on I.Serial = L.Serial
                            and I.CurrentDate = L.CurrentDate
                            inner join ${PVinfo} II on I.Serial = II.Serial
                            and I.CurrentDate = II.CurrentDate
                            group by convert(char(10), I.CurrentDate, 127)) as D
                            order by Date`);
                        summaryRes = sumPrice(queryDate.recordset, by, price);
                    } else {
                        let queryDate = await sqlPool_PV.request()
                            .query(`select * from 
                            (select convert(char(10), I.CurrentDate, 127) as Date, 
                            max(coalesce(NULLIF(I.MetterTodayProduction, 0.00), I.TodayProduction)) 
                            as TodayProduction,
                            max(CONVERT(float, I.Radiation)) as Radiation,
                            CONVERT(DECIMAL(10,2),(sum(CONVERT(float, I.Radiation))/12)/1000) as TotalRadiation,
                            max(L.Power) as Power
                            from ${PVinfo} I inner join
                                (select Serial, CurrentDate, sum(A11/1000) as Power from tb_Sunspec_Inverter
                                where Serial = '${Serial}'
                                and CONVERT(date, CurrentDate, 103) >= '${splitDateFrom[0]}'
                                and CONVERT(date, CurrentDate, 103) <= '${splitDateTo[0]}'
                                group by Serial, CurrentDate) L
                            on I.Serial = L.Serial
                            and I.CurrentDate = L.CurrentDate
                            group by convert(char(10), I.CurrentDate, 127)) as D
                            order by Date
                        `);
                        summaryRes = sumPrice(queryDate.recordset, by, price);
                    }
                } else if (by === 'month') {
                    if (ProjectType === 14) {
                        let queryMonth = await sqlPool_PV.request()
                            .input('Serial', sql.NVarChar, bdSerial)
                            .input('fromDate', fromDate)
                            .input('toDate', toDate)
                            .query(`
                            select * from 
                            ( select left(CurrentDate, 7) as Month, sum(Energy) as MonthProduction, 
                            sum(Radiation) as Radiation,
                            max(PVPower) as Power from
                            ( select convert(char(10), I.CurrentDate, 127) as CurrentDate, 
                            max(coalesce(NULLIF(I.MetterTodayProduction, 0.00), I.TodayProduction)) as Energy,
                            CONVERT(DECIMAL(10,2),(sum(CONVERT(float, II.Radiation))/12)/1000) as Radiation,
                            max(L.Power) as PVPower
                            from ${nextCalculateTable} I inner join
                            (select Serial, CurrentDate, sum(A11/1000) as Power from tb_Sunspec_Inverter
                            where Serial = @Serial
                            and CONVERT(date, CurrentDate, 103) >= @fromDate
                            and CONVERT(date, CurrentDate, 103) <= @toDate
                            group by Serial, CurrentDate) L
                            on I.Serial = L.Serial
                            and I.CurrentDate = L.CurrentDate
                            inner join ${PVinfo} II
                            on I.Serial = II.Serial
                            and I.CurrentDate = II.CurrentDate
                            group by convert(char(10), I.CurrentDate, 127)) D
                            group by left(CurrentDate, 7)) E
                            order by Month
                            `);
                        summaryRes = sumPrice(queryMonth.recordset, by, price);
                    } else {
                        let queryMonth = await sqlPool_PV.request()
                            .query(`
                        select * from 
                        ( select left(CurrentDate, 7) as Month, sum(Energy) as MonthProduction, 
                        sum(Radiation) as Radiation,
                        max(PVPower) as Power from
                        ( select convert(char(10), I.CurrentDate, 127) as CurrentDate, 
                        max(coalesce(NULLIF(I.MetterTodayProduction, 0.00), I.TodayProduction)) as Energy,
                        CONVERT(DECIMAL(10,2),(sum(CONVERT(float, I.Radiation))/12)/1000) as Radiation,
                        max(L.Power) as PVPower
                        from ${PVinfo} I inner join
                        (select Serial, CurrentDate, sum(A11/1000) as Power from tb_Sunspec_Inverter
                        where Serial = '${Serial}'
                        and CONVERT(date, CurrentDate, 103) >= '${fromDate}'
                        and CONVERT(date, CurrentDate, 103) <= '${toDate}'
                        group by Serial, CurrentDate) L
                        on I.Serial = L.Serial
                        and I.CurrentDate = L.CurrentDate
                        group by convert(char(10), I.CurrentDate, 127)) D
                        group by left(CurrentDate, 7)) E
                        order by Month`);
                        summaryRes = sumPrice(queryMonth.recordset, by, price);
                    }
                } else if (by === 'year') {
                    if (ProjectType === 14) {
                        let queryYear = await sqlPool_PV.request()
                            .input('Serial', sql.NVarChar, bdSerial)
                            .input('fromDate', fromDate)
                            .input('toDate', toDate)
                            .query(`select * from 
                            ( select left(CurrentDate, 4) as Year, sum(Energy) as YearProduction,
                            sum(Radiation) as Radiation, 
                            max(PVPower) as Power from
                            ( select left(CurrentDate, 7) as CurrentDate, sum(Energy) as Energy,
                            sum(Radiation) as Radiation, 
                            max(PVPower) as PVPower from
                            ( select convert(char(10), I.CurrentDate, 127) as CurrentDate, 
                            max(coalesce(NULLIF(I.MetterTodayProduction, 0.00), I.TodayProduction)) as Energy,
                            CONVERT(DECIMAL(10,2),(sum(CONVERT(float, II.Radiation))/12)/1000) as Radiation, 
                            max(L.Power) as PVPower
                            from ${nextCalculateTable} I inner join
                            ( select Serial, CurrentDate, sum(A11/1000) as Power from tb_Sunspec_Inverter
                            where Serial = @Serial
                            and convert(date, CurrentDate, 103) >= @fromDate
                            and convert(date, CurrentDate, 103) <= @toDate
                            group by Serial, CurrentDate
                            ) L
                            on I.Serial = L.Serial
                            and I.CurrentDate = L.CurrentDate
                            inner join ${PVinfo} II
                            on I.Serial = II.Serial
                            and I.CurrentDate = II.CurrentDate
                            group by convert(char(10), I.CurrentDate, 127)) D
                            group by left(CurrentDate, 7)) E
                            group by left(CurrentDate, 4)) F
                            order by Year`);
                        summaryRes = sumPrice(queryYear.recordset, by, price);
                    } else {
                        let queryYear = await sqlPool_PV.request()
                            .query(`select * from 
                        ( select left(CurrentDate, 4) as Year, sum(Energy) as YearProduction,
                        sum(Radiation) as Radiation, 
                        max(PVPower) as Power from
                        ( select left(CurrentDate, 7) as CurrentDate, sum(Energy) as Energy,
                        sum(Radiation) as Radiation, 
                        max(PVPower) as PVPower from
                        ( select convert(char(10), I.CurrentDate, 127) as CurrentDate, 
                        max(coalesce(NULLIF(I.MetterTodayProduction, 0.00), I.TodayProduction)) as Energy,
                        CONVERT(DECIMAL(10,2),(sum(CONVERT(float, I.Radiation))/12)/1000) as Radiation, 
                        max(L.Power) as PVPower
                        from ${PVinfo} I inner join
                        ( select Serial, CurrentDate, sum(A11/1000) as Power from tb_Sunspec_Inverter
                        where Serial = '${Serial}'
                        and convert(date, CurrentDate, 103) >= '${fromDate}'
                        and convert(date, CurrentDate, 103) <= '${toDate}'
                        group by Serial, CurrentDate
                        ) L
                        on I.Serial = L.Serial
                        and I.CurrentDate = L.CurrentDate
                        group by convert(char(10), I.CurrentDate, 127)) D
                        group by left(CurrentDate, 7)) E
                        group by left(CurrentDate, 4)) F
                        order by Year`);
                        summaryRes = sumPrice(queryYear.recordset, by, price);
                    }
                }

            }
            else if (device === 'SmartBuilding1') {
                summaryRes = await energyConsump_dateMonthYear(by, Serial, splitDateFrom[0], splitDateTo[0], price);
            }
            else if (device === 'Amata') {
                let dataRes = await getDateMonthYearAmata(Serial, by, splitDateFrom[0], splitDateTo[0]);
                summaryRes = sumPrice(dataRes, by, price);
            }
            else if (device === 'PVSofarGroupV3') {
                let dataRes = await getListFunc_PVSofarGroupV3(Serial, splitDateFrom[0], splitDateTo[0], by);
                summaryRes = sumPrice(dataRes.data, by, price);
            }
            else {
                let dataRes = await getDateMonthYearAmata(Serial, by, splitDateFrom[0], splitDateTo[0]);
                summaryRes = sumPrice(dataRes, by, price);
            }
        } else if (pvType === 'HUAWEI') {
            // let 
            let customTable;
            let customRawDataTable;
            let customParams;
            if (device === 'MultiPVHuawei3') {
                customTable = nextCalculateTable;
                customRawDataTable = 'tb_PVSofarHuaweiInverterV3';
                customParams = 'A70';
            } else {
                customTable = PVinfo;
                customRawDataTable = 'tb_PVSofarHuaweiInverter';
                customParams = 'A53 + A54 + A55 + A56';
            }
            if (by === 'date') {
                let queryProduction = await sqlPool_PV.request().query(`
                select * from 
                (select convert(char(10), I.CurrentDate, 127) as Date, 
                max(coalesce(NULLIF(I.MetterTodayProduction, 0.00), I.TodayProduction))
                as TodayProduction,
                max(CONVERT(float, I.Radiation)) as Radiation,
                CONVERT(DECIMAL(10,2),(sum(CONVERT(float, I.Radiation))/12)/1000) as TotalRadiation,
                max(L.Power) as Power
                from ${customTable} I inner join
                (select Serial, CurrentDate, coalesce(sum(${customParams}), 0) as Power 
                from ${customRawDataTable}
                where Serial = '${Serial}'
                and convert(date, CurrentDate, 103) >= '${splitDateFrom[0]}'
                and convert(date, CurrentDate, 103) <= '${splitDateTo[0]}'
                group by Serial, CurrentDate) L
                on I.Serial = L.Serial
                and I.CurrentDate = L.CurrentDate
                group by convert(char(10), I.CurrentDate, 127)) as D
                order by D.Date
                `)
                summaryRes = sumPrice(queryProduction.recordset, by, price);

            } else if (by === 'month') {
                let queryProduction = await sqlPool_PV.request().query(`
                select * from 
                (select left(CurrentDate, 7) as Month, 
                sum(Energy) as MonthProduction, max(PVPower) as Power, sum(Radiation) as Radiation from
                (select convert(char(10), I.CurrentDate, 127) as CurrentDate,
                max(coalesce(NULLIF(I.MetterTodayProduction, 0.00), I.TodayProduction)) 
                as Energy, max(L.Power) as PVPower, 
                CONVERT(DECIMAL(10,2),(sum(CONVERT(float, I.Radiation))/12)/1000) as Radiation
                from ${customTable} I inner join
                (select Serial, CurrentDate, coalesce(sum(${customParams}), 0) as Power 
                from ${customRawDataTable}
                where Serial = '${Serial}'
                and convert(date, CurrentDate, 103) >= '${fromDate}'
                and convert(date, CurrentDate, 103) <= '${toDate}'
                group by Serial, CurrentDate) L
                on I.Serial = L.Serial
                and I.CurrentDate = L.CurrentDate
                group by convert(char(10), I.CurrentDate, 127)) D
                group by left(CurrentDate, 7)) E
                order by E.Month
                `)
                summaryRes = sumPrice(queryProduction.recordset, by, price);

            } else if (by === 'year') {
                let queryProduction = await sqlPool_PV.request().query(`
                select * from 
                (select left(CurrentDate, 4) as Year, 
                sum(Energy) as YearProduction,
                sum(Radiation) as Radiation, 
                max(PVPower) as Power from
                (select left(CurrentDate, 7) as CurrentDate, 
                sum(Energy) as Energy,
                sum(Radiation) as Radiation, 
                max(PVPower) as PVPower from
                (select convert(char(10), I.CurrentDate, 127) as CurrentDate, 
                max(coalesce(NULLIF(I.MetterTodayProduction, 0.00), I.TodayProduction)) as Energy,
                CONVERT(DECIMAL(10,2),(sum(CONVERT(float, I.Radiation))/12)/1000) as Radiation,
                max(L.Power) as PVPower
                from ${customTable} I inner join
                (select Serial, CurrentDate, coalesce(sum(${customParams}), 0) as Power
                from ${customRawDataTable}
                where Serial = '${Serial}'
                and CurrentDate >= '${fromDate}'
                and CurrentDate <= '${toDate}'
                group by Serial, CurrentDate) L
                on I.Serial = L.Serial
                and I.CurrentDate = L.CurrentDate
                group by convert(char(10), I.CurrentDate, 127)) D
                group by left(CurrentDate, 7)) E
                group by left(CurrentDate, 4)) F
                order by F.Year
                `)
                summaryRes = sumPrice(queryProduction.recordset, by, price);
            }
        }
        if (device !== 'SmartBuilding1') {
            summaryRes.forEach((e) => e.Power = round2Decimals(e.Power));
        }
        Response.status(200).json({
            message: `Get summary successful`,
            data: {
                fields: fields,
                dataTable: summaryRes
            }
        });

    } catch (err) {
        console.log(err)
        Response.status(500).json({
            message: `Không có dữ liệu`
        });
    }
}

let getDateMonthYearAmata = async (serial, by, from, to) => {
    try {
        let returnValue;
        if (by === 'date') {
            let queryData = await sqlPool_PV.request()
                .query(`
            select * from 
                    (select convert(char(10), I.CurrentDate, 127) as Date, 
                    max(coalesce(NULLIF(I.MetterTodayProduction, 0.00), I.TodayProduction)) as TodayProduction,
                    max(CONVERT(float, I.Radiation)) as Radiation,
                    CONVERT(DECIMAL(10,2),(sum(CONVERT(float, I.Radiation))/12)/1000) as TotalRadiation,
                    max(L.Power) as Power
                    from ${PVinfo} I inner join
	                    (select Serial, CurrentDate, sum(A12) as Power from tb_PVSofarLog
	                    where Serial = '${serial}'
	                    and CONVERT(date, CurrentDate, 103) >=  '${from}'
	                    and CONVERT(date, CurrentDate, 103) <= '${to}'
	                    group by Serial, CurrentDate) L
                    on I.Serial = L.Serial
                    and I.CurrentDate = L.CurrentDate
                    group by convert(char(10), I.CurrentDate, 127)) as D
                order by Date
            `);
            returnValue = queryData.recordset;
        } else if (by === 'month') {
            let queryData = await sqlPool_PV.request()
                .query(`
                select * from 
                        (
                            select left(CurrentDate, 7) as Month, sum(Energy) as MonthProduction,
                            sum(Radiation) as Radiation,
                            max(PVPower) as Power from
			                    (
                                    select convert(char(10), I.CurrentDate, 127) as CurrentDate, 
                                    max(coalesce(NULLIF(I.MetterTodayProduction, 0.00), I.TodayProduction)) as Energy,
                                    CONVERT(DECIMAL(10,2),(sum(CONVERT(float, I.Radiation))/12)/1000) as Radiation,
                                    max(L.Power) as PVPower
				                    from ${PVinfo} I inner join
					                    (
						                    select Serial, CurrentDate, sum(A12) as Power from tb_PVSofarLog
						                    where Serial = '${serial}'
						                    and CONVERT(date, CurrentDate, 103) >= '${from}'
						                    and CONVERT(date, CurrentDate, 103) <= '${to}'
						                    group by Serial, CurrentDate
					                    ) L
				                    on I.Serial = L.Serial
				                    and I.CurrentDate = L.CurrentDate
				                    group by convert(char(10), I.CurrentDate, 127)
			                    ) D
		                    group by left(CurrentDate, 7)
	                    ) E
                    order by Month
                `);
            returnValue = queryData.recordset;
        } else if (by === 'year') {
            let queryData = await sqlPool_PV.request()
                .query(`
                select * from 
	                    (
                            select left(CurrentDate, 4) as Year, sum(Energy) as YearProduction,
                            sum(Radiation) as Radiation,
                            max(PVPower) as Power from
			                    (
                                    select left(CurrentDate, 7) as CurrentDate, sum(Energy) as Energy,
                                    sum(Radiation) as Radiation,
                                    max(PVPower) as PVPower from
					                    (
                                            select convert(char(10), I.CurrentDate, 127) as CurrentDate, 
                                            max(coalesce(NULLIF(I.MetterTodayProduction, 0.00), I.TodayProduction)) as Energy,
                                            CONVERT(DECIMAL(10,2),(sum(CONVERT(float, I.Radiation))/12)/1000) as Radiation, 
                                            max(L.Power) as PVPower
						                    from ${PVinfo} I inner join
							                    (
                                                    select Serial, CurrentDate, sum(A12) as Power 
                                                    from tb_PVSofarLog
								                    where Serial = '${serial}'
								                    and CONVERT(date, CurrentDate, 103) >= '${from}'
								                    and CONVERT(date, CurrentDate, 103) <= '${to}'
								                    group by Serial, CurrentDate
							                    ) L
						                    on I.Serial = L.Serial
						                    and I.CurrentDate = L.CurrentDate
						                    group by convert(char(10), I.CurrentDate, 127)
					                    ) D
				                    group by left(CurrentDate, 7)
			                    ) E
			                    group by left(CurrentDate, 4)
		                    ) F
                    order by Year
                `);
            returnValue = queryData.recordset;
        }
        return returnValue;
    } catch (err) {
        console.log(err);
    }
}

//sum Price
function sumPrice(dataRes, by, price) {
    let priceCom = parseFloat(numberWithCommas(price));
    let dataPrice = dataRes.map(function (el) {
        var o = Object.assign({}, el);
        let priceSum;
        if (by === 'date') {
            priceSum = (o.TodayProduction * priceCom).toFixed(3);
        } else if (by === 'month') {
            priceSum = (o.MonthProduction * priceCom).toFixed(3);
        } else if (by === 'year') {
            priceSum = (o.YearProduction * priceCom).toFixed(3);
        }

        o.TotalSaveMoney = priceSum
        return o;
    })
    return dataPrice;
}

let getDayMonthYearTotal = async (Request, Response) => {
    try {
        let lang = Request.headers['x-language'];
        let langTemp = await loadingLang(lang);
        let currentLang = langTemp.detaillist;

        let PersonID = JSON.parse(Request.headers.user).PersonID;
        let { fromDate, toDate, by, selected, pvType, device } = Request.body;
        // let 
        let price = await getPrice(sqlPool_SWH, PersonID)
        let readyParams;
        let fields = [];
        let querySerial = await sqlPool_SWH.request()
            .query(`SELECT Serial, ProjectType, Birthday 
            FROM ${projectInfo} WHERE PersonID='${PersonID}' 
            AND Available = 1
            order by STT asc`);
        let getSerial = querySerial.recordset;

        //GET by Date
        let fromDatespl = fromDate.split(' '),
            toDatespl = toDate.split(' ');
        if (by == 'date') {
            readyParams = {
                user: PersonID,
                from: fromDatespl[0],
                to: toDatespl[0],
                by: 'day'
            }

            fields.push({ key: 'Date', label: currentLang.date })

            for (let i = 0; i <= selected.length; i++) {
                switch (selected[i]) {
                    case 'Power': {
                        fields.push({ key: 'Power', label: `${currentLang.sumpv} (kW)` })
                    } break
                    case 'TodayProduction': {
                        fields.push({
                            key: 'TodayProduction',
                            label: `${currentLang.todayprod} (kWh)`
                        })
                    } break
                    case 'totalMoney': {
                        fields.push({ key: 'TotalSaveMoney', label: `${currentLang.totalmoneysave} (VNĐ)` })
                    }
                }
            }

        } else if (by == 'month') {
            readyParams = {
                user: PersonID,
                from: fromDate,
                to: toDate,
                by: 'month'
            }

            fields.push({ key: 'Month', label: currentLang.month })

            for (let i = 0; i <= selected.length; i++) {
                switch (selected[i]) {
                    case 'Power': {
                        fields.push({ key: 'Power', label: `${currentLang.sumpv} (kW)` })
                    } break
                    case 'MonthProduction': {
                        fields.push({ key: 'MonthProduction', label: `${currentLang.monthprod} (kWh)` })
                    } break
                    case 'totalMoney': {
                        fields.push({ key: 'TotalSaveMoney', label: `${currentLang.monthmoneysave} (VNĐ)` })
                    }
                }
            }

        } else if (by == 'year') {

            readyParams = {
                user: PersonID,
                from: fromDate,
                to: toDate,
                by: 'year'
            }

            fields.push({ key: 'Year', label: currentLang.year })

            for (let i = 0; i <= selected.length; i++) {
                switch (selected[i]) {
                    case 'Power': {
                        fields.push({ key: 'Power', label: `${currentLang.sumpv} (kW)` })
                    } break
                    case 'YearProduction': {
                        fields.push({ key: 'YearProduction', label: `${currentLang.yearprod} (kWh)` })
                    } break
                    case 'totalMoney': {
                        fields.push({ key: 'TotalSaveMoney', label: `${currentLang.yearmoneysave} (VNĐ)` })
                    }
                }
            }
        }

        let arrTotal = []
        for (let i = 0; i < getSerial.length; i++) {
            readyParams.serial = getSerial[i].Serial
            if (pvType === 'SOFAR') {
                if (device === 'MultiSunspec') {
                    let response = [];
                    if (getSerial[i].ProjectType === 14) {
                        getSerial[i].Serial = getSerial[i].Birthday;
                        if (by == 'date') {
                            let queryDate = await sqlPool_PV.request()
                                .input('Serial', sql.NVarChar, getSerial[i].Serial)
                                .input('dateFrom', fromDatespl[0])
                                .input('dateTo', toDatespl[0])
                                .query(`select * from 
                                (select convert(char(10), I.CurrentDate, 127) as Date, 
                                max(coalesce(NULLIF(I.MetterTodayProduction, 0.00), I.TodayProduction)) 
                                as TodayProduction,
                                max(CONVERT(float, II.Radiation)) as Radiation,
                                CONVERT(DECIMAL(10,2),(sum(CONVERT(float, II.Radiation))/12)/1000) as TotalRadiation,
                                max(L.Power) as Power
                                from ${nextCalculateTable} I inner join
                                    (select Serial, CurrentDate, sum(A11/1000) as Power from tb_Sunspec_Inverter
                                    where Serial = @Serial
                                    and CONVERT(date, CurrentDate, 103) >= @dateFrom
                                    and CONVERT(date, CurrentDate, 103) <= @dateTo
                                    group by Serial, CurrentDate) L
                                on I.Serial = L.Serial
                                and I.CurrentDate = L.CurrentDate
                                inner join ${PVinfo} II on I.Serial = II.Serial
                                and I.CurrentDate = II.CurrentDate
                                group by convert(char(10), I.CurrentDate, 127)) as D
                                order by Date`);
                            response = {
                                data: queryDate.recordset
                            };
                        } else if (by == 'month') {
                            let queryMonth = await sqlPool_PV.request()
                                .input('Serial', sql.NVarChar, getSerial[i].Serial)
                                .input('fromDate', fromDate)
                                .input('toDate', toDate)
                                .query(`
                            select * from 
                            ( select left(CurrentDate, 7) as Month, sum(Energy) as MonthProduction, 
                            sum(Radiation) as Radiation,
                            max(PVPower) as Power from
                            ( select convert(char(10), I.CurrentDate, 127) as CurrentDate, 
                            max(coalesce(NULLIF(I.MetterTodayProduction, 0.00), I.TodayProduction)) as Energy,
                            CONVERT(DECIMAL(10,2),(sum(CONVERT(float, II.Radiation))/12)/1000) as Radiation,
                            max(L.Power) as PVPower
                            from ${nextCalculateTable} I inner join
                            (select Serial, CurrentDate, sum(A11/1000) as Power from tb_Sunspec_Inverter
                            where Serial = @Serial
                            and CONVERT(date, CurrentDate, 103) >= @fromDate
                            and CONVERT(date, CurrentDate, 103) <= @toDate
                            group by Serial, CurrentDate) L
                            on I.Serial = L.Serial
                            and I.CurrentDate = L.CurrentDate
                            inner join ${PVinfo} II
                            on I.Serial = II.Serial
                            and I.CurrentDate = II.CurrentDate
                            group by convert(char(10), I.CurrentDate, 127)) D
                            group by left(CurrentDate, 7)) E
                            order by Month
                            `);
                            response = {
                                data: queryMonth.recordset
                            };
                        } else if (by == 'year') {
                            let queryYear = await sqlPool_PV.request()
                                .input('Serial', sql.NVarChar, getSerial[i].Serial)
                                .input('fromDate', fromDate)
                                .input('toDate', toDate)
                                .query(`select * from 
                            ( select left(CurrentDate, 4) as Year, sum(Energy) as YearProduction,
                            sum(Radiation) as Radiation, 
                            max(PVPower) as Power from
                            ( select left(CurrentDate, 7) as CurrentDate, sum(Energy) as Energy,
                            sum(Radiation) as Radiation, 
                            max(PVPower) as PVPower from
                            ( select convert(char(10), I.CurrentDate, 127) as CurrentDate, 
                            max(coalesce(NULLIF(I.MetterTodayProduction, 0.00), I.TodayProduction)) as Energy,
                            CONVERT(DECIMAL(10,2),(sum(CONVERT(float, II.Radiation))/12)/1000) as Radiation, 
                            max(L.Power) as PVPower
                            from ${nextCalculateTable} I inner join
                            ( select Serial, CurrentDate, sum(A11/1000) as Power from tb_Sunspec_Inverter
                            where Serial = @Serial
                            and convert(date, CurrentDate, 103) >= @fromDate
                            and convert(date, CurrentDate, 103) <= @toDate
                            group by Serial, CurrentDate
                            ) L
                            on I.Serial = L.Serial
                            and I.CurrentDate = L.CurrentDate
                            inner join ${PVinfo} II
                            on I.Serial = II.Serial
                            and I.CurrentDate = II.CurrentDate
                            group by convert(char(10), I.CurrentDate, 127)) D
                            group by left(CurrentDate, 7)) E
                            group by left(CurrentDate, 4)) F
                            order by Year`);
                            response = {
                                data: queryYear.recordset
                            };
                        }
                    } else {
                        response = await axios.get(`${host}/api/pvsofar/sunspec/getLog`, {
                            params: readyParams
                        }).then(response => {
                            return response
                        })
                    }
                    let dataRes = response.data;
                    if (by === 'date') {
                        dataRes.forEach(e => {
                            arrTotal.push({ Date: e.Date, TodayProduction: e.TodayProduction })
                        })
                    } else if (by === 'month') {
                        dataRes.forEach(e => {
                            arrTotal.push({ Month: e.Month, MonthProduction: e.MonthProduction })
                        })
                    } else if (by === 'year') {
                        dataRes.forEach(e => {
                            arrTotal.push({ Year: e.Year, YearProduction: e.YearProduction })
                        })
                    }
                } else {
                    await axios.get(`${host}/api/pvsofar/v2/getLog`, {
                        params: readyParams
                    }).then(response => {
                        let dataRes = response.data;
                        if (by === 'date') {
                            dataRes.forEach(e => {
                                arrTotal.push({ Date: e.Date, TodayProduction: e.TodayProduction })
                            })
                        } else if (by === 'month') {
                            dataRes.forEach(e => {
                                arrTotal.push({ Month: e.Month, MonthProduction: e.MonthProduction })
                            })
                        } else if (by === 'year') {
                            dataRes.forEach(e => {
                                arrTotal.push({ Year: e.Year, YearProduction: e.YearProduction })
                            })
                        }
                    })
                }
            } else if (pvType === 'HUAWEI') {
                let newKeyName = { from: 'beginDate', to: 'endDate' };
                let renameObj = renameKeys(readyParams, newKeyName);
                await axios.get(`${host}/api/pvsofar/huawei/listLog`, {
                    params: renameObj
                }).then(response => {
                    let dataRes = response.data;
                    if (by === 'date') {
                        dataRes.forEach(e => {
                            arrTotal.push({ Date: e.CurrentDate, TodayProduction: e.Energy });
                        })
                    } else if (by === 'month') {
                        dataRes.forEach(e => {
                            arrTotal.push({ Month: e.CurrentDate, MonthProduction: e.Energy });
                        })
                    } else if (by === 'year') {
                        dataRes.forEach(e => {
                            arrTotal.push({ Year: e.CurrentDate, YearProduction: e.Energy });
                        })
                    }
                })
            }
        }
        let sumTotal = reduceArr(arrTotal, by);
        var result = sumTotal.map(function (el) {
            var o = Object.assign({}, el);
            let priceSum;
            if (by === 'date') {
                priceSum = (o.TodayProduction * price).toFixed(3);
            } else if (by === 'month') {
                priceSum = (o.MonthProduction * price).toFixed(3);
            } else if (by === 'year') {
                priceSum = (o.YearProduction * price).toFixed(3);
            }

            o.TotalSaveMoney = priceSum
            return o;
        })
        Response.status(200).json({
            message: `Get summary successful`,
            data: {
                fields: fields,
                dataTable: result
            }
        });

    } catch (err) {
        console.log(err)
        Response.status(500).json({
            message: `Không có dữ liệu`
        });
    }
}

//FUNC change key name
function renameKeys(obj, newKeys) {
    const keyValues = Object.keys(obj).map(key => {
        const newKey = newKeys[key] || key;
        return { [newKey]: obj[key] };
    });
    return Object.assign({}, ...keyValues);
}

// PowerTrack platform APIs
let getSunspecFullParams = async (Request, Response) => {
    try {
        // let 
        let { pageNumber, perPage } = Request.query;
        //specify project serial
        let specifyPer = `p_otran_logistics`;
        let querySerial = await sqlPool_SWH.request()
            .query(`SELECT Serial From ${projectInfo} where PersonID='${specifyPer}' 
            AND Available = 1 order by STT asc`);
        let getSerial = querySerial.recordset;

        let resData = [];
        // let invData = [];
        for (let i = 0; i < getSerial.length; i++) {
            let querySunspec_1 = await sqlPool_PV.request()
                .query(`
                SELECT TOP (1)
                I.A1 as IacTotal, 
                I.A2 as IacA, 
                I.A3 as IacB, 
                I.A4 as IacC, 
                I.A5 as VacAB, 
                I.A6 as VacBC, 
                I.A7 as VacCA, 
                I.A8 as VacA, 
                I.A9 as VacB, 
                I.A10 as VacC, 
                I.A11 as KW,
                I.A13 as KVA, 
                I.A14 as KVAR, 
                I.A15 as PowerFactor, 
                I.A16 as KWh, 
                I.A17 as Idc, 
                I.A18 as Vdc, 
                I.A19 as KwDC, 
                I.A20 as InternalTemp,
                Vdc#1 = (select Top (1) A2 from tb_Sunspec_160 where Serial = I.Serial and 
                CurrentDate = I.CurrentDate and InvID = I.InvID and ID=1 order by stt desc),
                Vdc#2 = (select Top (1) A2 from tb_Sunspec_160 where Serial = I.Serial and 
                CurrentDate = I.CurrentDate and InvID = I.InvID and ID=2 order by stt desc),
                Vdc#3 = (select Top (1) A2 from tb_Sunspec_160 where Serial = I.Serial and 
                CurrentDate = I.CurrentDate and InvID = I.InvID and ID=3 order by stt desc),
                Vdc#4 = (select Top (1) A2 from tb_Sunspec_160 where Serial = I.Serial and 
                CurrentDate = I.CurrentDate and InvID = I.InvID and ID=4 order by stt desc),
                Vdc#5 = (select Top (1) A2 from tb_Sunspec_160 where Serial = I.Serial and 
                CurrentDate = I.CurrentDate and InvID = I.InvID and ID=5 order by stt desc),
                Vdc#6 = (select Top (1) A2 from tb_Sunspec_160 where Serial = I.Serial and 
                CurrentDate = I.CurrentDate and InvID = I.InvID and ID=6 order by stt desc),
                Idc#1 = (select Top (1) A1 from tb_Sunspec_160 where Serial = I.Serial and 
                CurrentDate = I.CurrentDate and InvID = I.InvID and ID=1 order by stt desc),
                Idc#2 = (select Top (1) A1 from tb_Sunspec_160 where Serial = I.Serial and 
                CurrentDate = I.CurrentDate and InvID = I.InvID and ID=2 order by stt desc),
                Idc#3 = (select Top (1) A1 from tb_Sunspec_160 where Serial = I.Serial and 
                CurrentDate = I.CurrentDate and InvID = I.InvID and ID=3 order by stt desc),
                Idc#4 = (select Top (1) A1 from tb_Sunspec_160 where Serial = I.Serial and 
                CurrentDate = I.CurrentDate and InvID = I.InvID and ID=4 order by stt desc),
                Idc#5 = (select Top (1) A1 from tb_Sunspec_160 where Serial = I.Serial and 
                CurrentDate = I.CurrentDate and InvID = I.InvID and ID=5 order by stt desc),
                Idc#6 = (select Top (1) A1 from tb_Sunspec_160 where Serial = I.Serial and 
                CurrentDate = I.CurrentDate and InvID = I.InvID and ID=6 order by stt desc),
                KWDC#1 = (select Top (1) A3 from tb_Sunspec_160 where Serial = I.Serial and 
                CurrentDate = I.CurrentDate and InvID = I.InvID and ID=1 order by stt desc),
                KWDC#2 = (select Top (1) A3 from tb_Sunspec_160 where Serial = I.Serial and 
                CurrentDate = I.CurrentDate and InvID = I.InvID and ID=2 order by stt desc),
                KWDC#3 = (select Top (1) A3 from tb_Sunspec_160 where Serial = I.Serial and 
                CurrentDate = I.CurrentDate and InvID = I.InvID and ID=3 order by stt desc),
                KWDC#4 = (select Top (1) A3 from tb_Sunspec_160 where Serial = I.Serial and 
                CurrentDate = I.CurrentDate and InvID = I.InvID and ID=4 order by stt desc),
                KWDC#5 = (select Top (1) A3 from tb_Sunspec_160 where Serial = I.Serial and 
                CurrentDate = I.CurrentDate and InvID = I.InvID and ID=5 order by stt desc),
                KWDC#6 = (select Top (1) A3 from tb_Sunspec_160 where Serial = I.Serial and 
                CurrentDate = I.CurrentDate and InvID = I.InvID and ID=6 order by stt desc)
                FROM tb_Sunspec_Inverter I
                WHERE I.Serial = '${getSerial[i].Serial}' and InvID = 1
                ORDER BY I.stt DESC`);
            let getSunspec_1 = querySunspec_1.recordset[0];

            let querySunspec_2 = await sqlPool_PV.request()
                .query(`
                SELECT TOP (1)
                I.A1 as IacTotal, 
                I.A2 as IacA, 
                I.A3 as IacB, 
                I.A4 as IacC, 
                I.A5 as VacAB, 
                I.A6 as VacBC, 
                I.A7 as VacCA, 
                I.A8 as VacA, 
                I.A9 as VacB, 
                I.A10 as VacC, 
                I.A11 as KW,
                I.A13 as KVA, 
                I.A14 as KVAR, 
                I.A15 as PowerFactor, 
                I.A16 as KWh, 
                I.A17 as Idc, 
                I.A18 as Vdc, 
                I.A19 as KwDC, 
                I.A20 as InternalTemp,
                Vdc#1 = (select Top (1) A2 from tb_Sunspec_160 where Serial = I.Serial and 
                CurrentDate = I.CurrentDate and InvID = I.InvID and ID=1 order by stt desc),
                Vdc#2 = (select Top (1) A2 from tb_Sunspec_160 where Serial = I.Serial and 
                CurrentDate = I.CurrentDate and InvID = I.InvID and ID=2 order by stt desc),
                Vdc#3 = (select Top (1) A2 from tb_Sunspec_160 where Serial = I.Serial and 
                CurrentDate = I.CurrentDate and InvID = I.InvID and ID=3 order by stt desc),
                Vdc#4 = (select Top (1) A2 from tb_Sunspec_160 where Serial = I.Serial and 
                CurrentDate = I.CurrentDate and InvID = I.InvID and ID=4 order by stt desc),
                Vdc#5 = (select Top (1) A2 from tb_Sunspec_160 where Serial = I.Serial and 
                CurrentDate = I.CurrentDate and InvID = I.InvID and ID=5 order by stt desc),
                Vdc#6 = (select Top (1) A2 from tb_Sunspec_160 where Serial = I.Serial and 
                CurrentDate = I.CurrentDate and InvID = I.InvID and ID=6 order by stt desc),
                Idc#1 = (select Top (1) A1 from tb_Sunspec_160 where Serial = I.Serial and 
                CurrentDate = I.CurrentDate and InvID = I.InvID and ID=1 order by stt desc),
                Idc#2 = (select Top (1) A1 from tb_Sunspec_160 where Serial = I.Serial and 
                CurrentDate = I.CurrentDate and InvID = I.InvID and ID=2 order by stt desc),
                Idc#3 = (select Top (1) A1 from tb_Sunspec_160 where Serial = I.Serial and 
                CurrentDate = I.CurrentDate and InvID = I.InvID and ID=3 order by stt desc),
                Idc#4 = (select Top (1) A1 from tb_Sunspec_160 where Serial = I.Serial and 
                CurrentDate = I.CurrentDate and InvID = I.InvID and ID=4 order by stt desc),
                Idc#5 = (select Top (1) A1 from tb_Sunspec_160 where Serial = I.Serial and 
                CurrentDate = I.CurrentDate and InvID = I.InvID and ID=5 order by stt desc),
                Idc#6 = (select Top (1) A1 from tb_Sunspec_160 where Serial = I.Serial and 
                CurrentDate = I.CurrentDate and InvID = I.InvID and ID=6 order by stt desc),
                KWDC#1 = (select Top (1) A3 from tb_Sunspec_160 where Serial = I.Serial and 
                CurrentDate = I.CurrentDate and InvID = I.InvID and ID=1 order by stt desc),
                KWDC#2 = (select Top (1) A3 from tb_Sunspec_160 where Serial = I.Serial and 
                CurrentDate = I.CurrentDate and InvID = I.InvID and ID=2 order by stt desc),
                KWDC#3 = (select Top (1) A3 from tb_Sunspec_160 where Serial = I.Serial and 
                CurrentDate = I.CurrentDate and InvID = I.InvID and ID=3 order by stt desc),
                KWDC#4 = (select Top (1) A3 from tb_Sunspec_160 where Serial = I.Serial and 
                CurrentDate = I.CurrentDate and InvID = I.InvID and ID=4 order by stt desc),
                KWDC#5 = (select Top (1) A3 from tb_Sunspec_160 where Serial = I.Serial and 
                CurrentDate = I.CurrentDate and InvID = I.InvID and ID=5 order by stt desc),
                KWDC#6 = (select Top (1) A3 from tb_Sunspec_160 where Serial = I.Serial and 
                CurrentDate = I.CurrentDate and InvID = I.InvID and ID=6 order by stt desc)
                FROM tb_Sunspec_Inverter I
                WHERE I.Serial = '${getSerial[i].Serial}' and InvID = 2
                ORDER BY I.stt DESC`);
            let getSunspec_2 = querySunspec_2.recordset[0];

            let queryMetter_1 = await sqlPool_PV.request()
                .query(`
                SELECT TOP (1)
                [V1] as VacA
                ,[V2] as VacB 
                ,[V3] as VacC
                ,[I1] as IacA
                ,[I2] as IacB
                ,[I3] as IacC
                ,[P1] as KwAC#1
                ,[P2] as KwAC#2
                ,[P3] as KwAC#3
                ,[V12] as VacAB
                ,[V23] as VacBC
                ,[V31] as VacCA
                ,[In] as Iac
                ,[PF] as PowerFactor
                ,[TotalP] as KWHdel
                ,[NegEnergy] as KWHrec#1
                ,[PosEnergy] as KWHrec#2
                ,[AP1] as KVA#1
                ,[AP2] as KVA#2
                ,[AP3] as KVA#3
                ,[ReP1] as KVAR#1
                ,[ReP2] as KVAR#2
                ,[ReP3] as KVAR#3
                ,[TotalAP] as KVA
                ,[TotalReP] as KVAR
                ,[AppEnergy] as KWHnet
                ,[NegReEnergy] as KWHloss#1
                ,[PosReEnergy] as KWHloss#2
            FROM [SSOC].[dbo].[tb_PVSofarFullMetter]
            where Serial='${getSerial[i].Serial}'
            order by STT desc`);
            let getMetter_1 = queryMetter_1.recordset[0];

            if (getSunspec_2 !== undefined) {
                resData.push({
                    [`Logger${i + 1}`]: {
                        Inverter1: getSunspec_1,
                        Inverter2: getSunspec_2,
                        [`Metter${i + 1}`]: getMetter_1
                    }
                })
            } else {
                resData.push({
                    [`Logger${i + 1}`]: {
                        Inverter1: getSunspec_1,
                        [`Metter${i + 1}`]: getMetter_1
                    }
                })
            }
        }

        Response.status(200).json(resData);

    } catch (err) {
        console.log(err);
        Response.status(500).json({
            message: `Something went wrong when getting data`
        })

    }
}

//REDUCE ARR FUNCTION
function reduceArr(arr, by) {
    var holder = {};
    var obj2 = [];

    if (by === 'date') {
        arr.forEach(function (d) {
            if (holder.hasOwnProperty(d.Date)) {
                holder[d.Date] = holder[d.Date] + d.TodayProduction;
            } else {
                holder[d.Date] = d.TodayProduction;
            }
        });

        for (var prop in holder) {
            obj2.push({ Date: prop, TodayProduction: holder[prop] });
        }
    } else if (by === 'month') {
        arr.forEach(function (d) {
            if (holder.hasOwnProperty(d.Month)) {
                holder[d.Month] = holder[d.Month] + d.MonthProduction;
            } else {
                holder[d.Month] = d.MonthProduction;
            }
        });

        for (var prop in holder) {
            obj2.push({ Month: prop, MonthProduction: holder[prop] });
        }
    } else if (by === 'year') {
        arr.forEach(function (d) {
            if (holder.hasOwnProperty(d.Year)) {
                holder[d.Year] = holder[d.Year] + d.YearProduction;
            } else {
                holder[d.Year] = d.YearProduction;
            }
        });

        for (var prop in holder) {
            obj2.push({ Year: prop, YearProduction: holder[prop] });
        }
    }

    return obj2;
}

//FUNC COMMA
function numberWithCommas(x) {
    var parts = x.toString().split(".");
    // console.log(parts);
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    if (parts[1] !== undefined) {
        return `${parts[0]},${parts[1]}`;
    } else {
        return parts.join(".");
    }
}

//FUNC GET PRICE
async function getPrice(sqlPool_SWH, PersonID) {
    let queryPrice = await sqlPool_SWH.request().query(`SELECT GiaCD FROM ${projectInfo} 
            WHERE PersonID='${PersonID}' AND Available = 1
            order by STT asc`);
    let getPrice = queryPrice.recordset[0].GiaCD;
    let price;
    if (getPrice === null || getPrice === '') {
        price = defaultPrice
    } else {
        price = getPrice
    }
    return price;
}

//FUNC PARSE STRING TO NUMBER AND ROUND 2 DECIMALS
function round2Decimals(number) {
    let parse = Math.round((Number(number) + Number.EPSILON) * 100) / 100;
    let replaceDot = parse.toFixed(2).replace(".", ",");
    return replaceDot;
}

function round2DecimalsDot(number) {
    let parse = Math.round((Number(number) + Number.EPSILON) * 100) / 100;
    return parse;
}

//GET RANDOM COLOR
function getRandomColor() {
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// EPE Tracer
let getEPETracer = async (Request, Response) => {
    try {
        let { Serial } = Request.query;
        let tracerTable = 'tb_ilight_raw_data';

        let queryData;
        // Query current info
        queryData = await sqlPool_PV.request()
            .input('Serial', sql.NVarChar, Serial)
            .input('CurrentDate', getCurrentDate())
            .query(`SELECT TOP (1) * FROM ${tracerTable} WHERE Serial=@Serial
            ORDER BY STT DESC`);

        let getData = queryData.recordset[0];

        if (getData === undefined) {
            getData = {}
        }

        let chargingStatusTemp, batteryStatusTemp,
            solarStatusTemp, loadStatusTemp, deviceStatusTemp;

        // check status for charging data
        switch (getData.A1) {
            case 0: {
                chargingStatusTemp = 'Not charging';
            } break;
            case 1: {
                chargingStatusTemp = 'Float';
            } break;
            case 2: {
                chargingStatusTemp = 'Boost';
            } break;
            case 3: {
                chargingStatusTemp = 'Equalization';
            } break;
            default: {
                chargingStatusTemp = 'Undefined';
            } break;
        }

        // check status for battery data
        switch (getData.A2) {
            case 0: {
                batteryStatusTemp = 'Normal';
            } break;
            case 1: {
                batteryStatusTemp = 'Overvolt';
            } break;
            case 2: {
                batteryStatusTemp = 'Under volt';
            } break;
            case 3: {
                batteryStatusTemp = 'Low Volt Disconnect';
            } break;
            case 4: {
                batteryStatusTemp = 'Fault';
            } break;
            default: {
                batteryStatusTemp = 'Undefined';
            } break;
        }

        // check status for solar data
        switch (getData.A0) {
            case 0: {
                solarStatusTemp = 'Normal';
            } break;
            case 1: {
                solarStatusTemp = 'No power connected';
            } break;
            case 2: {
                solarStatusTemp = 'Higher Volt Input';
            } break;
            case 3: {
                solarStatusTemp = 'Input Volt Error';
            } break;
            default: {
                solarStatusTemp = 'Undefined';
            } break;
        }

        // check status for load data
        switch (getData.A53) {
            case 0: {
                loadStatusTemp = 'OFF';
            } break;
            case 1: {
                loadStatusTemp = 'ON';
            } break;
            default: {
                loadStatusTemp = 'Undefined';
            } break;
        }

        // check status for device data
        switch (getData.A3) {
            case 0: {
                deviceStatusTemp = 'Correct';
            } break;
            case 1: {
                deviceStatusTemp = 'Wrong';
            } break;
            default: {
                deviceStatusTemp = 'Undefined';
            } break;
        }

        // Solar information part
        let solarInfo = {
            SolarCurrent: getData.A14,
            SolarVoltage: getData.A13,
            SolarPower: getData.A15,
            SolarStatus: solarStatusTemp
        };

        let batteryInfo = {
            BatteryVoltage: getData.A35,
            BatteryCurrent: getData.A36,
            MaxVoltage: getData.A25,
            MinVoltage: getData.A26,
            BatteryTemp: getData.A37,
            BatterySOC: getData.A21,
            ChargingStatus: chargingStatusTemp,
            BatteryStatus: batteryStatusTemp
        };

        let dcLoadInfo = {
            LoadCurrent: getData.A17,
            LoadVoltage: getData.A16,
            LoadPower: getData.A18,
            LoadStatus: loadStatusTemp
        };

        let deviceInfo = {
            DeviceTemp: getData.A20,
            DeviceStatus: deviceStatusTemp
        };

        let energyGenInfo = {
            Daily: getData.A31,
            Monthly: getData.A32,
            Annual: getData.A33,
            Total: getData.A34
        };

        let energyConInfo = {
            Daily: getData.A27,
            Monthly: getData.A28,
            Annual: getData.A29,
            Total: getData.A30
        }

        let customCurrentDate = getCurrentDate();

        // Query chart info in current date
        let queryDataChart = await sqlPool_PV.request()
            .input('Serial', sql.NVarChar, Serial)
            .input('currentDate', customCurrentDate)
            .query(`SELECT convert(char(19), CurrentDate, 127) as CurrentDate, 
            A15 as PVPower, A18 as LoadPower FROM ${tracerTable} 
            WHERE Serial=@Serial AND CONVERT(date, CurrentDate, 103)=@currentDate 
            AND DevID=1 ORDER BY stt ASC`);

        let getDataChart = queryDataChart.recordset;

        let dataChart = [];
        let labelDate = [];

        let dataPVPowerTemp = [];
        let dataLoadPowerTemp = [];
        for (let i = 0; i < getDataChart.length; i++) {
            let date = getDataChart[i].CurrentDate;
            let dateF = date.split('T');
            labelDate.push(dateF[1]);

            // Push PV Power data Chart
            let pvPower = getDataChart[i].PVPower;
            let loadPower = getDataChart[i].LoadPower;
            if (pvPower == null) {
                pvPower = 0;
            }

            if (loadPower == null) {
                loadPower = 0;
            }

            dataPVPowerTemp.push({ x: dateF[1], y: pvPower });
            dataLoadPowerTemp.push({ x: dateF[1], y: loadPower });
        }

        // generate line chart 
        dataChart.push({
            label: 'Solar Power',
            borderColor: '#ff7070',
            backgroundColor: '#ff7070',
            borderDashOffset: 0.0,
            lineTension: 0.1,
            fill: false,
            data: dataPVPowerTemp
        });

        dataChart.push({
            label: 'Load Power',
            borderColor: '#4268ff',
            backgroundColor: '#4268ff',
            borderDashOffset: 0.0,
            lineTension: 0.1,
            fill: false,
            data: dataLoadPowerTemp
        });

        // Intial last response data

        let intialLastData = {
            SolarInformation: solarInfo,
            BatteryInformation: batteryInfo,
            DCLoadInformation: dcLoadInfo,
            ControllerInformation: deviceInfo,
            EnergyGenerated: energyGenInfo,
            EnergyConsumed: energyConInfo,
            PowerRealTimeChart: {
                label: labelDate,
                DataChart: dataChart
            }
        }
        Response.status(200).json(intialLastData);
    } catch (err) {
        console.log(err);
        Response.status(500).json({
            message: `Something went wrong`
        })
    }
}

// Node Express Server Sent Events
let redis = require('redis');
const REDIS_PORT_SERVER = process.env.ECHO_REDIS_PORT_SERVER || 6379;
const REDIS_HOST_SERVER = process.env.ECHO_REDIS_HOST_SERVER || '172.18.0.1';
const client_redis = redis.createClient(REDIS_PORT_SERVER, REDIS_HOST_SERVER);

// handle connection
let clients = [];
let nests = null;

let ServerSentEventsHandler = async (Request, Response) => {
    try {
        let logSerial = Request.query.serial;
        const headers = {
            'Content-Type': 'text/event-stream',
            'Connection': 'keep-alive',
            'Cache-control': 'no-cache'
        }
        Response.writeHead(200, headers);
        Response.connection.setTimeout(0);
        // Handle for user observer
        const clientID = Date.now();
        const newClient = {
            id: clientID,
            res: Response
        }

        clients.push(newClient);
        if (logSerial != null) {
            await addNewNest(logSerial);
        }
        // when client close connection - remove
        Request.on('close', () => {
            console.log(`${clientID} Connection is Closed`);
            clients = [];
            client_redis.unsubscribe('ECHO_SERVICE_DEVICE_RAW_DATA');
            clients = clients.filter(c => c.id !== clientID);
        });
    } catch (err) {
        console.log(err);
        client_redis.unsubscribe('ECHO_SERVICE_DEVICE_RAW_DATA');
        clients = [];
        Response.status(500).json({
            message: `Something went wrong`
        })
    }
}

let SendEventToAll = (newNest) => {
    let currentDate = getCurrentDate();
    let currentTime = getCurrentTime();
    let currentDateTime = new Date().toString();
    newNest.time = currentDateTime;
    let resData = `data: ${JSON.stringify(newNest)}\n\n`;
    clients.forEach(c => c.res.write(resData.toString()));
}

function safelyParseJson(json) {
    let parsed
    try {
        parsed = JSON.parse(json)
    } catch (err) {

    }
    return parsed;
}

let addNewNest = async (Serial) => {
    client_redis.subscribe('ECHO_SERVICE_DEVICE_RAW_DATA');
    client_redis.on('message', async (channel, message) => {
        try {
            let messageJson = JSON.parse(message);
            let formPostStr = messageJson.form_post;
            let rawDataJson;

            if (typeof formPostStr != 'object') {
                let correctJson = formPostStr.replace(/([{,])(\s*)([A-Za-z0-9_\-]+?)\s*:/g, '$1"$3":');
                let rawDataJsonTemp = safelyParseJson(correctJson);
                if (rawDataJsonTemp === undefined) {
                    rawDataJson = 'error_string';
                } else {
                    rawDataJson = rawDataJsonTemp;
                }
            } else {
                rawDataJson = {};
            }

            if (rawDataJson != 'error_string') {
                if (Serial == rawDataJson.Serial) {
                    nests = rawDataJson;
                    return SendEventToAll(rawDataJson);
                }
            }
        } catch (err) {
            console.log(err)
            client_redis.unsubscribe('ECHO_SERVICE_DEVICE_RAW_DATA');
            clients = [];
        }
    })
}


module.exports = {
    overviewPage: overviewPage,
    productionByDayChart: productionByDayChart,
    lineChartPowerPV: lineChartPowerPV,
    pageLayoutModule: pageLayoutModule,
    getListDetail: getListDetail,
    ListDetail: ListDetail,
    getDateMonthYear: getDateMonthYear,
    getDayMonthYearTotal: getDayMonthYearTotal,
    viewInvMechanic: viewInvMechanic,
    checkPersonInsurance: checkPersonInsurance,
    warrantyInfo: warrantyInfo,
    maintenanceInfo: maintenanceInfo,

    //EPE Tracer test
    getEPETracer: getEPETracer,

    //Powertrack plaform
    getSunspecFullParams: getSunspecFullParams,

    //Server sent events test
    ServerSentEventsHandler: ServerSentEventsHandler,
    addNewNest: addNewNest // testing
}
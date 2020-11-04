// COMPARE TEXT
const { Compare, convertArray } = require('./textCompare');

//EXCEL JS CONFIG
// polyfills required by exceljs
require('core-js/modules/es.promise');
require('core-js/modules/es.object.assign');
require('core-js/modules/es.object.keys');
require('regenerator-runtime/runtime');
require('dotenv').config();

//paginate-arr
const paginate = require("paginate-array");

//CONNECT DATABASE
const { sqlPool_SWH, sqlPool_PV } = require('./connectDB');

const sql = require('mssql');

//FILE SYSTEM
const fs = require('fs');

//PATH
const path = require('path');

//EXCELJS
const ExcelJS = require('exceljs/dist/es5');

//EXCEL JS OBJECT
const workbook = new ExcelJS.Workbook();


//JSON WEB TOKEN
let jwt = require('jsonwebtoken');

//REDIS
let redis = require('redis');

//PAIR KEY GENERATE
const { generateKeyPairSync } = require('crypto');

//REDIS CONFIG
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const client_redis = redis.createClient(REDIS_PORT, REDIS_HOST);

//GET RECENT DATE, MONTH, YEAR
function getCurrentDate(option) {
    let currentDate = new Date();
    let day = ('0' + currentDate.getDate()).slice(-2);
    let month = ('0' + (currentDate.getMonth() + 1)).slice(-2);
    let year = currentDate.getFullYear();

    let hour = ('0' + currentDate.getHours()).slice(-2);
    let minute = ('0' + currentDate.getMinutes()).slice(-2);
    let second = ('0' + currentDate.getSeconds()).slice(-2);

    let date = `${year}-${month}-${day}`;
    let time = `${hour}:${minute}:${second}`

    switch (option) {
        case 'date': {
            return date;
        } break;
        case 'time': {
            return time;
        } break;
        case 'full': {
            return `${date} ${time}`;
        } break;
    }
}

//recent date
let date = new Date();
let year = date.getFullYear().toString();
let month = ("0" + (date.getMonth() + 1)).slice(-2);
let days = ("0" + date.getDate()).slice(-2);

//yesterday date
let yesterday = date.setDate(date.getDate() - 1);
let convert = new Date(yesterday);
let dayOfYesterday = ('0' + convert.getDate()).slice(-2);
let monthOfYesterday = ("0" + (convert.getMonth() + 1)).slice(-2)
let yearOfYesterday = convert.getFullYear().toString();

//HE SO 1
const HeSo1 = '4.18';

//
const tableName = `tb_tableName`;
const tableProjectInfo = `tb_ProjectInfo`;

//EXPIRE TIME
let expire = {
    expireInToken: 60 * 60 * 24 * 90,
    expireInRedis_access: 60 * 60 * 6,
    expireInRedis_refresh: 60 * 60 * 24 * 30
}

//limit time status
let limitNormal = 5 * 60;
let limitWarning = 15 * 60;
let limitError = 25 * 60;

let getHiddenProject = async (Request, Response) => {
    try {
        // Get all hidden projects
        let queryProjectHidden = await sqlPool_SWH.request()
            .query(`SELECT II.PersonID, II.Name, II.Address, III.Serial, III.TypeProject,
            I.addBy, I.CurrentDate
            FROM [SSOC].[dbo].[tb_AD_HiddenProject] I
            inner join tb_Cl_Person II on I.PersonID = II.PersonID
            inner join tb_ProjectInfo III on II.PersonID = III.PersonID
            where III.Available != 0 order by I.STT desc`);

        let getProjectHidden = queryProjectHidden.recordset;

        let hideProjectLabel = [
            {
                label: 'Chọn',
                key: 'checkBtn'
            }, {
                label: 'ID',
                key: 'PersonID',
                sortable: true,
                sortDirection: "desc"
            }, {
                label: 'Tên dự án',
                key: 'Name',
                sortable: true
            }, {
                label: 'Địa chỉ',
                key: 'Address',
                sortable: true
            }, {
                label: 'Số Seri',
                key: 'Serial',
                sortable: true
            }, {
                label: 'Loại đầu tư',
                key: 'TypeProject',
                sortable: true
            }, {
                label: 'Thêm bởi',
                key: 'addBy',
                sortable: true
            }, {
                label: 'Ngày thêm',
                key: 'CurrentDate',
                sortable: true
            }]

        let arrTemp = []
        for (let i = 0; i < getProjectHidden.length; i++) {
            arrTemp.push(`'${getProjectHidden[i].PersonID}'`);
        }

        // inject query unhide projects
        let injectTemp = '';
        if (arrTemp.length > 0) {
            injectTemp = `I.PersonID NOT IN (${arrTemp.toString()}) AND `;
        }
        let queryUnHideProject = await sqlPool_SWH.request()
            .query(`SELECT I.PersonID, I.Name, I.Address, II.Serial, 
                II.TypeProject FROM tb_Cl_Person I 
                INNER JOIN tb_ProjectInfo II on I.PersonID = II.PersonID 
                WHERE ${injectTemp}
                II.Available != 0 ORDER BY I.STT DESC`);

        let getUnHideProject = queryUnHideProject.recordset;

        let unhideProjectLabel = [
            {
                label: 'Chọn',
                key: 'checkBtn'
            }, {
                label: 'ID',
                key: 'PersonID',
                sortable: true,
                sortDirection: "desc"
            }, {
                label: 'Tên dự án',
                key: 'Name',
                sortable: true
            }, {
                label: 'Địa chỉ',
                key: 'Address',
                sortable: true
            }, {
                label: 'Số Seri',
                key: 'Serial',
                sortable: true
            }, {
                label: 'Loại đầu tư',
                key: 'TypeProject',
                sortable: true
            }
        ]

        Response.status(200).json({
            hideProject: {
                label: hideProjectLabel,
                data: getProjectHidden
            },
            unhideProject: {
                label: unhideProjectLabel,
                data: getUnHideProject
            }
        });
    } catch (err) {
        console.log(err);
        Response.status(500).json({
            message: `Không có dữ liệu`
        });
    }
}

let addHiddenProject = async (Request, Response) => {
    try {
        let username = Request.body.userinfo.username;
        let { PersonIDArray } = Request.body.dataPost;

        // check if hidden project already exist
        let queryCheckExist = await sqlPool_SWH.request()
            .input('checking', PersonIDArray.toString())
            .query(`SELECT * FROM tb_AD_HiddenProject WHERE PersonID IN (@checking)`);

        let getCheckExist = queryCheckExist.recordset;

        if (getCheckExist.length <= 0) {
            // inject query
            let queryInject = '';
            for (let i = 0; i < PersonIDArray.length; i++) {
                queryInject += ` ('${PersonIDArray[i]}', '${username}', '${getCurrentDate('full')}'),`
            }

            let trimQueryInject = queryInject.slice(0, -1);

            await sqlPool_SWH.request()
                .query(`INSERT INTO tb_AD_HiddenProject (PersonID, addBy, CurrentDate)
                VALUES ${trimQueryInject}`);

            Response.status(200).json({
                message: `Ẩn danh sách dự án thành công`
            })

        } else {
            Response.status(409).json({
                message: `Có một hoặc nhiều dự án đã được ẩn`
            });
        }

    } catch (err) {
        console.log(err);
        Response.status(500).json({
            message: `Thao tác thất bại`
        });
    }
}

let restoreProjectHidden = async (Request, Response) => {
    try {
        let { PersonIDArray } = Request.body.dataPost;

        let listTemp = '';
        for (let i = 0; i < PersonIDArray.length; i++) {
            listTemp += ` '${PersonIDArray[i]}',`;
        }

        let listTempTrim = listTemp.slice(0, -1);

        await sqlPool_SWH.request()
            .query(`DELETE FROM tb_AD_HiddenProject WHERE PersonID IN (${listTempTrim})`);

        Response.status(200).json({
            message: `Khôi phục danh sách dự án thành công`
        });
    } catch (err) {
        console.log(err);
        Response.status(500).json({
            message: `Thao tác thất bại`
        });
    }
}

//select box
let selecteBox = async (Request, Response) => {
    try {
        let bodyPost = Request.body.dataPost;

        let dataRes;
        if (bodyPost.type === 'nation') {
            let queryLocationType = await sqlPool_SWH.request()
                .input('nation', sql.Int, bodyPost.id)
                .query(`SELECT name as text, province_id as value FROM tb_SSOC_Provinces WHERE 
                country_id=@nation`);
            dataRes = queryLocationType.recordset;
        } else if (bodyPost.type === 'province') {
            let queryLocationType = await sqlPool_SWH.request()
                .input('province', sql.Int, bodyPost.id)
                .query(`SELECT name as text, district_id as value FROM tb_SSOC_Districts WHERE 
                province_id=@province`);
            dataRes = queryLocationType.recordset;
        } else if (bodyPost.type === 'district') {
            let queryLocationType = await sqlPool_SWH.request()
                .input('ward', sql.Int, bodyPost.id)
                .query(`SELECT name as text, ward_id as value FROM tb_SSOC_Wards WHERE 
                district_id=@ward`);
            dataRes = queryLocationType.recordset;
        } else {

        }
        Response.status(200).json({
            type: bodyPost.type,
            data: dataRes
        })
    } catch (err) {
        console.log(err);
        Response.status(500).json({
            message: `Không có dữ liệu`
        })
    }
}

//delete project
let editDeleteProject = async (Request, Response) => {
    try {
        let bodyPost = Request.body.dataPost;

        await sqlPool_SWH.request()
            .input('PersonID', sql.NVarChar, bodyPost.PersonID)
            .query(`UPDATE tb_Cl_Person SET Available = 0 WHERE PersonID=@PersonID`)

        await sqlPool_PV.request()
            .input('PersonID', sql.NVarChar, bodyPost.PersonID)
            .query(`UPDATE tb_Cl_Person SET Available = 0 WHERE PersonID=@PersonID`)

        Response.status(200).json({
            message: `Delete project successful`
        })
    } catch (err) {
        Response.status(500).json({
            message: `Thao tác thất bại`
        })
    }
}

//delete module
let deleteModule = async (Request, Response) => {
    try {
        let bodyPost = Request.body.dataPost;

        await sqlPool_SWH.request()
            .input('PersonID', sql.NVarChar, bodyPost.PersonID)
            .input('serial', sql.NVarChar, bodyPost.Serial)
            .query(`DELETE FROM ${tableProjectInfo} WHERE PersonID=@PersonID AND Serial=@serial`);

        await sqlPool_PV.request()
            .input('PersonID', sql.NVarChar, bodyPost.PersonID)
            .input('serial', sql.NVarChar, bodyPost.Serial)
            .query(`DELETE FROM ${tableProjectInfo} WHERE PersonID=@PersonID AND Serial=@serial`);

        Response.status(200).json({
            message: `Delete module successful`
        })
    } catch (err) {
        Response.status(500).json({
            message: `Thao tác thất bại`
        })
    }
}

//add new modulee
let addNewModule = async (Request, Response) => {
    try {
        let bodyPost = Request.body.dataPost;
        // console.log(bodyPost);
        // return
        let selectedTypeModule = bodyPost.selectTypeModule;
        let systemTemplate;
        if (selectedTypeModule === 'pv') {
            systemTemplate = `Hệ thống cấp nguồn`
        } else {
            systemTemplate = `Hệ thống máy nước nóng`
        }

        let ProjectName = bodyPost.PersonID.replace('_', '-');

        //check if module exist
        let queryModule = await sqlPool_SWH.request()
            .input('PersonID', sql.NVarChar, bodyPost.PersonID)
            .query(`SELECT Device, Project, KindProject, Scale 
            FROM ${tableProjectInfo} WHERE PersonID=@PersonID`);

        let getModule = queryModule.recordset[0];
        let DeviceModule;
        let projectType;
        let scale;
        if (getModule !== undefined) {
            DeviceModule = getModule.Device;
            projectType = getModule.Project;
            scale = getModule.Scale;
        } else {
            if (selectedTypeModule === 'pv') {
                DeviceModule = 'MultiPVSofar2';
                projectType = 'pv';
                scale = 2;
            } else {
                DeviceModule = 'SWH';
                projectType = 'swh';
                scale = 1;
            }
        }
        await sqlPool_SWH.request()
            .input('PersonID', sql.NVarChar, bodyPost.PersonID)
            .input('projectName', sql.NVarChar, ProjectName)
            .input('device', sql.NVarChar, DeviceModule)
            .input('serial', sql.NVarChar, bodyPost.addModuleSerial)
            .input('capacity', sql.Decimal(18, 2), bodyPost.addModuleCapacity)
            .input('moduleName', sql.NVarChar, bodyPost.addModuleName)
            .input('setupDate', sql.DateTime, bodyPost.addModuleInstallDate)
            .input('numberMppt', sql.Int, bodyPost.addModuleMppt)
            .input('numberDevice', sql.Int, bodyPost.addModuleNumberDevice)
            .input('investType', sql.NVarChar, bodyPost.addModuleInvest)
            .input('systemName', sql.NVarChar, systemTemplate)
            .input('project', sql.NVarChar, projectType)
            .input('kindProject', sql.NVarChar, bodyPost.addModuleKindModule)
            .input('scale', sql.Int, scale)
            .input('sim', sql.NVarChar, bodyPost.addModuleSim)
            .input('communication', sql.NVarChar, bodyPost.addModuleCommunication)
            .input('beginDate', sql.DateTime, bodyPost.addModuleBeginDate)
            .input('endDate', sql.DateTime, bodyPost.addModuleEndDate)
            .query(`INSERT INTO ${tableProjectInfo}(PersonID, ProjectName, Device, 
                Serial, Capacity, Module, SetupDate, NumberDevice, NumberMPPT, TypeProject, System, Project,
                KindProject, Scale, Communication, Sim, SimActive_DayBegin, SimActive_DayEnd)
                VALUES (@PersonID, @projectName, @device, @serial, @capacity, @moduleName,
                @setupDate, @numberDevice, @numberMppt, @investType, @systemName, @project, @kindProject,
                @scale, @communication, @sim, @beginDate, @endDate)`);

        await sqlPool_PV.request()
            .input('PersonID', sql.NVarChar, bodyPost.PersonID)
            .input('projectName', sql.NVarChar, ProjectName)
            .input('device', sql.NVarChar, DeviceModule)
            .input('serial', sql.NVarChar, bodyPost.addModuleSerial)
            .input('capacity', sql.Decimal(18, 2), bodyPost.addModuleCapacity)
            .input('moduleName', sql.NVarChar, bodyPost.addModuleName)
            .input('setupDate', sql.DateTime, bodyPost.addModuleInstallDate)
            .input('numberDevice', sql.Int, bodyPost.addModuleNumberDevice)
            .input('investType', sql.NVarChar, bodyPost.addModuleInvest)
            .input('systemName', sql.NVarChar, systemTemplate)
            .input('project', sql.NVarChar, projectType)
            .input('kindProject', sql.NVarChar, bodyPost.addModuleKindModule)
            .input('scale', sql.Int, scale)
            .input('sim', sql.NVarChar, bodyPost.addModuleSim)
            .input('communication', sql.NVarChar, bodyPost.addModuleCommunication)
            .input('beginDate', sql.DateTime, bodyPost.addModuleBeginDate)
            .input('endDate', sql.DateTime, bodyPost.addModuleEndDate)
            .query(`INSERT INTO ${tableProjectInfo}(PersonID, ProjectName, Device, 
                    Serial, Capacity, Module, SetupDate, NumberDevice, TypeProject, System, Project,
                    KindProject, Scale, Communication, Sim, SimActive_DayBegin, SimActive_DayEnd)
                    VALUES (@PersonID, @projectName, @device, @serial, @capacity, @moduleName,
                    @setupDate, @numberDevice, @investType, @systemName, @project, @kindProject,
                    @scale, @communication, @sim, @beginDate, @endDate)`);

        Response.status(200).json({
            message: `Add New Successful`
        })

    } catch (err) {
        console.log(err)
        Response.status(500).json({
            message: `Thao tác thất bại`
        })
    }
}

//update lat long info
let updateLatLongInfo = async (Request, Response) => {
    try {
        let bodyPost = Request.body.dataPost;
        // console.log(bodyPost);

        let lat = bodyPost.latitudeInput,
            long = bodyPost.longtitudeInput;
        let latlongString = `${lat}, ${long}`;

        await sqlPool_SWH.request()
            .input('latlongString', sql.NVarChar, latlongString)
            .input('PersonID', sql.NVarChar, bodyPost.PersonID)
            .query(`UPDATE tb_Cl_Person SET LatLng = @latlongString WHERE PersonID=@PersonID`);

        await sqlPool_SWH.request()
            .input('latlongString', sql.NVarChar, latlongString)
            .input('PersonID', sql.NVarChar, bodyPost.PersonID)
            .query(`UPDATE tb_Cl_Person SET LatLng = @latlongString WHERE PersonID=@PersonID`);

        Response.status(200).json({
            message: `Update Successful`
        })

    } catch (err) {
        Response.status(500).json({
            message: `Thao tác thất bại`
        })
    }
}

//update password info
let updatePasswordInfo = async (Request, Response) => {
    try {
        let bodyPost = Request.body.dataPost;
        await sqlPool_SWH.request()
            .input('newPassEncode', sql.NVarChar, bodyPost.newPassEnCode)
            .input('newPassword', sql.NVarChar, bodyPost.newPassword)
            .input('PersonID', sql.NVarChar, bodyPost.PersonID)
            .query(`UPDATE tb_Cl_Person SET Password=@newPassEncode, ViewPass=@newPassword
        WHERE PersonID=@PersonID`);

        await sqlPool_PV.request()
            .input('newPassEncode', sql.NVarChar, bodyPost.newPassEnCode)
            .input('newPassword', sql.NVarChar, bodyPost.newPassword)
            .input('PersonID', sql.NVarChar, bodyPost.PersonID)
            .query(`UPDATE tb_Cl_Person SET Password=@newPassEncode, ViewPass=@newPassword
        WHERE PersonID=@PersonID`);

        Response.status(200).json({
            message: `Update Successful`
        })
    } catch (err) {
        Response.status(500).json({
            message: `Thao tác thất bại`
        })
    }
}

//update module info
let updateModuleInfo = async (Request, Response) => {
    try {
        let id = Request.body.userinfo.id;
        let username = Request.body.userinfo.username;
        let bodyPost = Request.body.dataPost;
        // bodyPost.serialToWhere

        let serialToWhere;
        if (bodyPost.serialToWhere == null) {
            serialToWhere = `Serial IS NULL`;
        } else {
            serialToWhere = `Serial = '${bodyPost.serialToWhere}'`;
        }

        await sqlPool_SWH.request()
            .input('systemName', sql.NVarChar, bodyPost.systemEdit)
            .input('moduleName', sql.NVarChar, bodyPost.moduleNameEdit)
            .input('serial', sql.NVarChar, bodyPost.serialEdit)
            .input('capacity', sql.Decimal(18, 2), bodyPost.capacityEdit)
            .input('kindProject', sql.NVarChar, bodyPost.kindProjectEdit)
            .input('numberDevice', sql.Int, bodyPost.numberDeviceEdit)
            .input('communication', sql.NVarChar, bodyPost.communicationEdit)
            .input('sim', sql.NVarChar, bodyPost.simEdit)
            .input('beginDate', sql.DateTime, bodyPost.daybeginEdit)
            .input('endDate', sql.DateTime, bodyPost.dayendEdit)
            .input('PersonID', sql.NVarChar, bodyPost.PersonID)
            .input('numberMppt', sql.Int, bodyPost.numberMpptEdit)
            .input('serialToWhere', sql.NVarChar, bodyPost.serialToWhere)
            .query(`UPDATE tb_ProjectInfo SET System=@systemName, Module=@moduleName,
        Serial=@serial, Capacity=@capacity, KindProject=@kindProject, NumberDevice=@numberDevice,
        Communication=@communication, Sim=@sim, SimActive_DayBegin=@beginDate, SimActive_DayEnd=@endDate,
        NumberMPPT=@numberMppt 
        WHERE PersonID=@PersonID AND ${serialToWhere}`);

        await sqlPool_PV.request()
            .input('systemName', sql.NVarChar, bodyPost.systemEdit)
            .input('moduleName', sql.NVarChar, bodyPost.moduleNameEdit)
            .input('serial', sql.NVarChar, bodyPost.serialEdit)
            .input('capacity', sql.Decimal(18, 2), bodyPost.capacityEdit)
            .input('kindProject', sql.NVarChar, bodyPost.kindProjectEdit)
            .input('numberDevice', sql.Int, bodyPost.numberDeviceEdit)
            .input('communication', sql.NVarChar, bodyPost.communicationEdit)
            .input('sim', sql.NVarChar, bodyPost.simEdit)
            .input('beginDate', sql.DateTime, bodyPost.daybeginEdit)
            .input('endDate', sql.DateTime, bodyPost.dayendEdit)
            .input('PersonID', sql.NVarChar, bodyPost.PersonID)
            .query(`UPDATE tb_ProjectInfo SET System=@systemName, Module=@moduleName,
        Serial=@serial, Capacity=@capacity, KindProject=@kindProject, NumberDevice=@numberDevice,
        Communication=@communication, Sim=@sim, SimActive_DayBegin=@beginDate, SimActive_DayEnd=@endDate
        WHERE PersonID=@PersonID AND ${serialToWhere}`);

        Response.status(200).json({
            message: `Update successful`
        })
    } catch (err) {
        console.log(err);
        Response.status(500).json({
            message: `Thao tác thất bại`
        })
    }
}

//update project info
let updateProjectInfo = async (Request, Response) => {
    try {
        let id = Request.body.userinfo.id;
        let username = Request.body.userinfo.username;
        let bodyPost = Request.body.dataPost;

        //get full address
        let getAddress;
        if (bodyPost.nation != null && bodyPost.province != null &&
            bodyPost.city != null && bodyPost.ward != null) {
            let queryAddress = await sqlPool_SWH.request()
                .query(`
            SELECT con.name as conName, pro.name as proName, dis.name as disName, war.name as warName
            FROM tb_SSOC_Countries con
            inner join tb_SSOC_Provinces pro on pro.country_id = con.country_id
            inner join tb_SSOC_Districts dis on dis.province_id = pro.province_id
            inner join tb_SSOC_Wards war on war.district_id = dis.district_id
            where con.country_id = ${bodyPost.nation} and pro.province_id = ${bodyPost.province} 
            and dis.district_id = ${bodyPost.city} and war.ward_id = ${bodyPost.ward}
            `);
            getAddress = queryAddress.recordset[0];
        } else {
            getAddress = {};
        }

        let fullAddress =
            `${bodyPost.address}, ${getAddress.warName}, ${getAddress.disName}, ${getAddress.proName}, ${getAddress.conName}`;

        await sqlPool_SWH.request()
            .input('customerName', sql.NVarChar, bodyPost.customerName)
            .input('systemName', sql.NVarChar, bodyPost.systemName)
            .input('fullAddress', sql.NVarChar, fullAddress)
            .input('capacity', sql.Decimal(18, 2), bodyPost.capacity)
            .input('installDate', sql.DateTime, bodyPost.installDate)
            .input('birthdate', sql.DateTime, bodyPost.birthdate)
            .input('telephone', sql.NVarChar, bodyPost.telephone)
            .input('email', sql.NVarChar, bodyPost.email)
            .input('PersonID', sql.NVarChar, bodyPost.PersonID)
            .query(`UPDATE tb_Cl_Person SET Name=@customerName,
            SystemVI=@systemName, Address=@fullAddress, Capacity=@capacity,
            DateInstall=@installDate, BirthDay=@birthdate, Phone=@telephone,
            Email=@email WHERE PersonID=@PersonID`);

        await sqlPool_PV.request()
            .input('customerName', sql.NVarChar, bodyPost.customerName)
            .input('systemName', sql.NVarChar, bodyPost.systemName)
            .input('fullAddress', sql.NVarChar, fullAddress)
            .input('capacity', sql.Decimal(18, 2), bodyPost.capacity)
            .input('installDate', sql.DateTime, bodyPost.installDate)
            .input('birthdate', sql.DateTime, bodyPost.birthdate)
            .input('telephone', sql.NVarChar, bodyPost.telephone)
            .input('email', sql.NVarChar, bodyPost.email)
            .input('PersonID', sql.NVarChar, bodyPost.PersonID)
            .query(`UPDATE tb_Cl_Person SET Name=@customerName,
            SystemVI=@systemName, Address=@fullAddress, Capacity=@capacity,
            DateInstall=@installDate, BirthDay=@birthdate, Phone=@telephone,
            Email=@email WHERE PersonID=@PersonID`);

        await sqlPool_PV.request()
            .input('address', sql.NVarChar, bodyPost.address)
            .input('ward', sql.Int, bodyPost.ward)
            .input('city', sql.Int, bodyPost.city)
            .input('province', sql.Int, bodyPost.province)
            .input('nation', sql.Int, bodyPost.nation)
            .input('warName', sql.NVarChar, getAddress.warName)
            .input('disName', sql.NVarChar, getAddress.disName)
            .input('proName', sql.NVarChar, getAddress.proName)
            .input('conName', sql.NVarChar, getAddress.conName)
            .input('PersonID', sql.NVarChar, bodyPost.PersonID)
            .query(`UPDATE tb_Cl_PersonInfo SET Street=@address, WardID=@ward, 
            DistrictID=@city, ProvinceID=@province, CountryID=@nation, 
            PhuongXa=@warName, QuanHuyen=@disName, 
            Tinh_ThanhPho=@proName, QuocGia=@conName 
            WHERE PersonID=@PersonID`);

        Response.status(200).json({
            message: `Update Successful`
        })
    } catch (err) {
        console.log(err);
        Response.status(500).json({
            message: `Thao tác thất bại`
        })
    }
}

//detail info project
let editViewProjectInfo = async (Request, Response) => {
    try {
        let id = Request.body.userinfo.id;
        let username = Request.body.userinfo.username;

        // console.log(Request.body.dataPost);

        let PersonID = Request.body.dataPost.PersonID;
        let queryProjectInfo = await sqlPool_SWH.request()
            .query(`SELECT Name as customerName, SystemVI as systemName, PersonID, Password, LatLng,
            Address as fullAddress, Capacity as capacity, DateInstall as installDate, Birthday as birthDate,
            Phone as telephone, Email as email FROM tb_Cl_Person WHERE PersonID='${PersonID}'`);

        let getProjectInfo = queryProjectInfo.recordset[0];

        let queryProjectAddress = await sqlPool_PV.request()
            .query(`SELECT Street as streetName, WardID, DistrictID, ProvinceID, CountryID
            FROM tb_Cl_PersonInfo
            WHERE PersonID='${PersonID}'`);

        let getProjectAddress = queryProjectAddress.recordset[0];

        let queryAddressDetailNation = await sqlPool_SWH.request()
            .query(`SELECT country_id as value, name as text
            FROM tb_SSOC_Countries`);

        let queryAddressDetailProvince = await sqlPool_SWH.request()
            .query(`SELECT province_id as value, name as text
            FROM tb_SSOC_Provinces`);

        let queryAddressDetailDistrict = await sqlPool_SWH.request()
            .query(`SELECT district_id as value, name as text
            FROM tb_SSOC_Districts`);

        let queryAddressDetailWards = await sqlPool_SWH.request()
            .query(`SELECT ward_id as value, name as text
            FROM tb_SSOC_Wards`);

        //split lat long
        let latLong = getProjectInfo.LatLng.split(',');
        let latitude = latLong[0].trim();
        let longtitude = latLong[1].trim();

        let getAddressDetail = {
            optionsNation: queryAddressDetailNation.recordset,
            optionsProvince: queryAddressDetailProvince.recordset,
            optionsCity: queryAddressDetailDistrict.recordset,
            optionsWard: queryAddressDetailWards.recordset
        }

        let queryModule = await sqlPool_SWH.request()
            .query(`SELECT System, Module, Serial, Capacity, KindProject, NumberDevice, NumberMPPT,
                Communication, Sim, SimActive_DayBegin, SimActive_DayEnd FROM tb_ProjectInfo
                WHERE PersonID='${PersonID}'`)

        let getModule = queryModule.recordset;

        Response.status(200).json({
            itemsSerials: getModule,
            projectInfo: getProjectInfo,
            projectAddress: getProjectAddress,
            addressDetail: getAddressDetail,
            Latitude: latitude,
            Longtitude: longtitude
        })

    } catch (err) {
        console.log(err)
        Response.status(500).json({
            message: `Không có dữ liệu`
        })
    }
}

//admin search
let searchProject = async (Request, Response) => {
    try {
        let id = Request.body.userinfo.id;
        let username = Request.body.userinfo.username;

        let inputSearch = Request.body.dataPost.inputSearch;

        let querySearch = await sqlPool_SWH.request()
            .query(`SELECT I.PersonID FROM tb_ProjectInfo I INNER JOIN tb_Cl_Person II on I.PersonID = II.PersonID
            WHERE I.PersonID = '${inputSearch}' OR II.Name LIKE N'%${inputSearch}%' OR I.Serial='${inputSearch}'
            OR I.ProjectName = '${inputSearch}'`);
        let returnData;
        if (querySearch.recordset[0] !== undefined) {
            let getPersonID = querySearch.recordset[0].PersonID

            let querySearchProject = await sqlPool_SWH.request()
                .query(`select II.PersonID, II.Module, II.LastUpdate, II.Capacity, I.Name, II.STT,
            II.Serial,
            II.NumberDevice, II.TypeProject
            from tb_Cl_Person I
            inner join tb_ProjectInfo II on I.PersonId = II.PersonID
            where I.Available = 1 AND II.PersonID = '${getPersonID}'
            order by I.STT asc`);

            let getStatus = querySearchProject.recordset;
            let ModuleStatus = [];
            let sumCapacity = 0;
            let sumLastUpdate = null;
            let ProjectName = null;
            let TypeProject = null;
            let Serial = [];
            // 0: normal // 1: warning // 2: disconnect
            let unixTimeNow = Math.floor(new Date().getTime() / 1000);

            for (let i = 0; i < getStatus.length; i++) {
                let unixProject = Math.floor(new Date(getStatus[i].LastUpdate).getTime() / 1000);
                if (getStatus[i].LastUpdate === null) {
                    ModuleStatus.push({
                        STT: getStatus[i].STT,
                        Module: (getStatus[i].Module === null) ? `Hệ ${i + 1}` : getStatus[i].Module,
                        NumberDevice: getStatus[i].NumberDevice,
                        Status: 2
                    });
                } else {
                    let difUnix = unixTimeNow - unixProject;
                    if (difUnix <= limitNormal) {
                        ModuleStatus.push({
                            STT: getStatus[i].STT,
                            Module: (getStatus[i].Module === null) ? `Hệ ${i + 1}` : getStatus[i].Module,
                            NumberDevice: getStatus[i].NumberDevice,
                            Status: 0
                        });
                    } else if ((limitNormal < difUnix) && (difUnix <= limitWarning)) {
                        ModuleStatus.push({
                            STT: getStatus[i].STT,
                            Module: (getStatus[i].Module === null) ? `Hệ ${i + 1}` : getStatus[i].Module,
                            NumberDevice: getStatus[i].NumberDevice,
                            Status: 1
                        });
                    } else if ((limitWarning < difUnix) && (difUnix <= limitError)) {
                        ModuleStatus.push({
                            STT: getStatus[i].STT,
                            Module: (getStatus[i].Module === null) ? `Hệ ${i + 1}` : getStatus[i].Module,
                            NumberDevice: getStatus[i].NumberDevice,
                            Status: 2
                        });
                    } else {
                        ModuleStatus.push({
                            STT: getStatus[i].STT,
                            Module: (getStatus[i].Module === null) ? `Hệ ${i + 1}` : getStatus[i].Module,
                            NumberDevice: getStatus[i].NumberDevice,
                            Status: 2
                        });
                    }

                    if (sumLastUpdate === null) {
                        sumLastUpdate = unixProject;
                    } else if (sumLastUpdate < unixProject) {
                        sumLastUpdate = unixProject;
                    }
                }

                Serial.push(getStatus[i].Serial);

                sumCapacity += getStatus[i].Capacity;

                if (ProjectName === null) {
                    ProjectName = getStatus[i].Name;
                }

                if (TypeProject === null) {
                    TypeProject = getStatus[i].TypeProject;
                }
            }
            let newDate = new Date(sumLastUpdate * 1000);
            let updateDate = ('0' + newDate.getUTCDate()).slice(-2);
            let updateMonth = ('0' + (newDate.getUTCMonth() + 1)).slice(-2);
            let updateYear = newDate.getUTCFullYear();

            let updateHour = ('0' + newDate.getUTCHours()).slice(-2);
            let updateMin = ('0' + newDate.getUTCMinutes()).slice(-2);
            let updateSec = ('0' + newDate.getUTCSeconds()).slice(-2);

            let LastUpdate = `${updateYear}-${updateMonth}-${updateDate} ${updateHour}:${updateMin}:${updateSec}`;

            returnData = {
                PersonID: getStatus[0].PersonID,
                Serial: Serial,
                ProjectName: ProjectName,
                TypeProject: TypeProject,
                Capacity: sumCapacity,
                ModuleStatus: ModuleStatus,
                LastUpdate: LastUpdate
            };
        } else {
            returnData = null;
        }
        Response.status(200).json(returnData);
    } catch (err) {
        console.log(err)
        Response.status(500).json({
            message: `Không có dữ liệu`
        })
    }
}

//LOGIN / LOGOUT FUNCTION 
let loginAuth = async (Request, Response) => {
    //Query data
    try {
        let payload = Request.headers.user;
        // console.log(payload)
        if (payload.kindCustomer === 'parent') {
            let payloadWithUID = {
                PersonID: payload.PersonID,
                userName: payload.userName
            }

            //Generate pair keys
            let pairKeys = await generatePairKeys(),
                setRedis = await setTokenToRedis(payloadWithUID, pairKeys.publicKey,
                    pairKeys.privateKey, expire, payload.kindCustomer);

            if (setRedis.err != null) {
                Response.status(500).json({
                    message: `Something went wrong`
                })

            } else {
                Response.status(200).send({
                    message: `Logged in successful`,
                    token: setRedis.token,
                    kindAccount: 'parent'
                })
            }

        } else {
            let checkProjectType = await sqlPool_SWH.request().query(
                `SELECT Project, KindProject, Device FROM ${tableProjectInfo} 
                WHERE PersonID='${payload.PersonID}'`);
            let UID,
                projectType,
                KindProject,
                Device;
            let getType = checkProjectType.recordset[0];
            if (getType.Project == 'pv' && getType.KindProject.toLowerCase() == 'sofar') {
                UID = null;
                projectType = 'PV';
                KindProject = 'SOFAR';
                Device = getType.Device;
            } else if (getType.Project == 'pv' && getType.KindProject.toLowerCase() == 'huawei') {
                UID = null;
                projectType = 'PV';
                KindProject = 'HUAWEI';
                Device = getType.Device;
            } else {
                let getUID = await sqlPool_SWH.request()
                    .query(`SELECT uID FROM ${tableName} WHERE PersonID = '${payload.PersonID}'`);
                UID = getUID.recordset[0].uID;
                projectType = 'SWH';
            }

            let payloadWithUID = {
                PersonID: payload.PersonID,
                userName: payload.userName,
                uID: UID,
                projectType: projectType,
                kindProject: KindProject,
                Device: Device
            };
            //Generate pair keys
            let pairKeys = await generatePairKeys(),
                setRedis = await setTokenToRedis(payloadWithUID, pairKeys.publicKey,
                    pairKeys.privateKey, expire, payload.kindCustomer);
            if (setRedis.err != null) {
                Response.status(500).json({
                    message: `Something went wrong`
                })

            } else {
                // console.log(setRedis.token, projectType, KindProject)
                Response.status(200).send({
                    message: `Logged in successful`,
                    token: setRedis.token,
                    projectType: projectType,
                    kindProject: KindProject,
                    kindAccount: 'normal'
                })
            }
        }
    } catch (err) {
        console.log(err);
        Response.status(500).json({
            message: `Đăng nhập thất bại`
        })
    }
}

let adminAuthLogin = async (Request, Response) => {
    let { user_id, username, access_token, refresh_token } = Request.body;
    let payload_access = {
        id: user_id,
        username: username,
        access_token: access_token
    }
    let payload_refresh = {
        id: user_id,
        refresh_token: refresh_token
    }
    client_redis.set(`${user_id}_${username}_accessToken`,
        JSON.stringify(payload_access), (err) => {
            if (err) {
                Response.status(500).json({
                    message: `Có lỗi xảy ra khi đặt access token`
                })
            } else {
                client_redis.set(`${user_id}_${username}_refreshToken`,
                    JSON.stringify(payload_refresh), (err) => {
                        if (err) {
                            Response.status(500).json({
                                message: `Có lỗi xảy ra khi đặt refresh token`
                            })
                        } else {
                            Response.status(200).json({
                                id: user_id,
                                username: username,
                                access_token: access_token
                            });
                        }
                    })
            }
        });

}

let logStation = async (Request, Response) => {
    try {
        let time = Request.body.dataPost.time

        let queryActivity = await sqlPool_SWH.request().query(`
            SELECT CONVERT(VARCHAR, TimeCreate, 120) as DateLog, 
            LogSession, LogAction, PersonID, CustomerID, System
            FROM tb_AD_LogSession
            WHERE CONVERT(date, TimeCreate, 103) = '${time}'
            ORDER BY STT DESC  
        `);

        let getActivity = queryActivity.recordset;
        let activityLabel = [
            { key: 'DateLog', label: 'Date' },
            { key: 'LogAction', label: 'Action' },
            { key: 'PersonID', label: 'Factor' },
            { key: 'CustomerID', label: 'Project ID' },
            { key: 'System', label: 'System' }
        ]

        let queryErrorPV = await sqlPool_SWH.request().query(`
            SELECT CONVERT(VARCHAR, StartTime, 120) as LogDate
            , I.Serial
            , II.PersonID
            , II.Module
            , II.Project
        FROM tb_ErrorLog I
        INNER JOIN tb_ProjectInfo II on I.Serial = II.Serial
        where CONVERT(date, StartTime, 103) = '${time}' 
        order by Id desc
        `);
        let getErrorPV = queryErrorPV.recordset;

        let queryErrorSWH = await sqlPool_SWH.request().query(`
            SELECT 
            CONVERT(VARCHAR, I.CurrentDate, 120) as LogDate,
            I.Serial,
            II.PersonID,
            II.Module,
            II.Project
        FROM tb_EscoErrorLog I
        INNER JOIN tb_ProjectInfo II on I.Serial = II.Serial
        where CONVERT(date, I.CurrentDate, 103) = '${time}'
        and I.Count >= 4
        order by I.STT DESC 
        `);

        let getErrorSWH = queryErrorSWH.recordset;

        let getError = getErrorPV.concat(getErrorSWH);
        let errorLabel = [
            { key: 'LogDate', label: 'Date' },
            { key: 'Serial', label: 'Serial' },
            { key: 'PersonID', label: 'Project ID' },
            { key: 'Module', label: 'Module' },
            { key: 'Project', label: 'Type' }
        ]

        Response.status(200).json({
            activities: {
                label: activityLabel,
                data: getActivity
            },
            errors: {
                label: errorLabel,
                data: getError
            }
        })

    } catch (err) {
        console.log(err)
        Response.status(500).json({
            message: `Không có dữ liệu`
        })
    }
}

let logStationDetail = async (Request, Response) => {
    try {
        let logSession = Request.body.dataPost.logSession;
        let queryActionUpdate = await sqlPool_SWH.request()
            .query(`SELECT TOP (1) *, ct.name as CountryName, pv.name as ProvinceName, 
            dt.name as DistrictName, wa.name as WardName
            FROM tb_AD_LogInfo 
            inner join tb_SSOC_Countries ct on C_CountryID = ct.country_id and L_CountryID = ct.country_id
            inner join tb_SSOC_Provinces pv on C_ProvinceID = pv.province_id and L_ProvinceID = pv.province_id
            inner join tb_SSOC_Districts dt on C_DistrictID = dt.district_id and L_DistrictID = dt.district_id
            inner join tb_SSOC_Wards wa on C_WardID = wa.ward_id and L_WardID = wa.ward_id
            WHERE LogSession='${logSession}' ORDER BY STT DESC`);

        let getActionUpdate = queryActionUpdate.recordset[0];
        if (getActionUpdate === undefined) {
            let queryActionCreate = await sqlPool_SWH.request()
                .query(`SELECT * FROM tb_AD_LogKhoiTao WHERE LogSession='${logSession}' ORDER BY STT DESC`);

            let getActionCreate = queryActionCreate.recordset[0];

            Response.status(200).json({
                typeAction: 'Create',
                ActionData: getActionCreate
            })
        } else {
            Response.status(200).json({
                typeAction: 'Update',
                ActionData: getActionUpdate
            })
        }
    } catch (err) {
        Response.status(500).json({
            message: `Không có dữ liệu`
        })
    }
}

let projectDetail = async (Request, Response) => {
    try {
        let PersonID = Request.query.PersonID;
        let queryProject = await sqlPool_SWH.request()
            .query(`
            SELECT PersonID, Name, Email, Address, Phone, Fullname FROM tb_Cl_Person WHERE PersonID='${PersonID}'
            `)
        let getProject = queryProject.recordset[0];
        let queryProjectInfo = await sqlPool_SWH.request()
            .query(`
            SELECT STT, Module, Device, Capacity, NumberDevice, NumberMPPT,
            System, TypeProject, Project, KindProject, Sim, SimActive_DayBegin,
            SimActive_DayEnd, CONVERT(VARCHAR, LastUpdate, 120) as LastUpdate  
            FROM tb_ProjectInfo WHERE PersonID='${PersonID}'
            `)
        let getProjectInfo = queryProjectInfo.recordset[0];
        let checkModule = queryProjectInfo.recordset;

        // 0: normal // 1: warning // 2: disconnect
        let unixTimeNow = Math.floor(new Date().getTime() / 1000);
        let limitNormal = 5 * 60;
        let limitWarning = 15 * 60;
        let limitError = 25 * 60;
        let moduleArr = []
        for (let i = 0; i < checkModule.length; i++) {
            let unixProject = Math.floor(new Date(checkModule[i].LastUpdate).getTime() / 1000);
            let difUnix = unixTimeNow - unixProject;
            // console.log(difUnix, limitNormal, limitWarning)
            if (difUnix <= limitNormal) {
                status = 0
            } else if ((limitNormal < difUnix) && (difUnix <= limitWarning)) {
                status = 1
            } else if ((limitWarning < difUnix) && (difUnix <= limitError)) {
                status = 2
            } else {
                status = 2
            }
            moduleArr.push({
                id: checkModule[i].STT,
                module: (checkModule[i].Module === null) ? `Hệ ${i + 1}` : checkModule[i].Module,
                status: status,
                lastUpdate: checkModule[i].LastUpdate
            });
        }
        Response.status(200).json({
            PersonID: getProject.PersonID,
            FullNameProject: getProject.Fullname,
            NameProject: getProject.Name,
            Email: getProject.Email,
            Address: getProject.Address,
            Phone: getProject.Phone,
            projectInfo: getProjectInfo,
            moduleInfo: moduleArr
        });
    } catch (err) {
        console.log(err)
        Response.status(500).json({
            message: `Không có dữ liệu`
        })
    }
}

let projectTypeSelect = async (Request, Response) => {
    try {
        let queryProjectType = await sqlPool_SWH.request()
            .query(`
    SELECT Project FROM tb_ProjectInfo group by Project 
    `)
        let getProjectType = queryProjectType.recordset;
        let arrType = [{ value: 'all', text: 'Tất cả loại dự án' }]

        for (let i = 0; i < getProjectType.length; i++) {
            arrType.push({ value: getProjectType[i].Project, text: getProjectType[i].Project })
        }

        Response.status(200).json(arrType);
    } catch (err) {
        Response.status(500).json({
            message: `Không có dữ liệu`
        })
    }
}

function Paginator(items, page, per_page) {
    var page = page || 1,
        per_page = per_page || 10,
        offset = (page - 1) * per_page,

        paginatedItems = items.slice(offset).slice(0, per_page),
        total_pages = Math.ceil(items.length / per_page);
    return {
        page: page,
        per_page: per_page,
        pre_page: page - 1 ? page - 1 : null,
        next_page: (total_pages > page) ? page + 1 : null,
        total: items.length,
        total_pages: total_pages,
        data: paginatedItems
    };
}

let projectInfoByType = async (Request, Response) => {
    try {
        let id = Request.body.userinfo.id;
        let username = Request.body.userinfo.username;

        let projectType = Request.body.dataPost.projectType;

        let reqDataPost = Request.body.dataPost;
        let selectedProjectType = reqDataPost.selectedProjectType,
            selectedInvestType = reqDataPost.selectedInvestType,
            selectedDeviceStatus = reqDataPost.selectedDeviceStatus,
            currentPage = reqDataPost.currentPage,
            perPage = reqDataPost.perPage;

        // console.log(selectedDeviceStatus);

        /**
         * Hệ nước nóng:
         *  - ('swh', 'isolarbk', 'istar')
         * Hệ pv rooftop:
         *  - ('pv', 'ilight', 'pv-swh', 'hbr', 'rmia', 'lnb')
         */
        let projectTypeString;
        if (projectType === 'BK') {
            if (selectedInvestType === 'all_InvestType') {
                projectTypeString = `AND (II.TypeProject = 'DIRECT' OR II.TypeProject = 'ESCO') and II.Scale = 1`
            } else {
                projectTypeString = `AND II.TypeProject = '${selectedInvestType}' and II.Scale = 1`
            }
        } else if (projectType === 'ES') {
            projectTypeString = `AND II.TypeProject = 'ESCO'`
        } else {
            projectTypeString = `AND II.TypeProject = 'DIRECT' and II.Scale = 2`
        }

        //check project type
        if (selectedProjectType === 'pv') {
            projectTypeString += ` AND Project IN ('pv', 'ilight', 'pv-swh', 'hbr', 'rmia', 'lnb')`
        } else if (selectedProjectType === 'swh') {
            projectTypeString += ` AND Project IN ('swh', 'isolarbk', 'istar')`
        }

        let queryTotalProject = await sqlPool_SWH.request()
            .query(`
            select II.PersonID, II.Module, II.LastUpdate, II.Capacity, I.Name, II.STT,
            II.Serial,
            II.NumberDevice, II.TypeProject
            from tb_Cl_Person I
            inner join tb_ProjectInfo II on I.PersonID = II.PersonID 
            left join tb_AD_HiddenProject III on II.PersonID = III.PersonID
            where I.Available = 1 AND III.PersonID IS NULL ${projectTypeString}
            order by I.STT asc
            `)
        let getTotalProject = queryTotalProject.recordset;

        let groupTotal = getTotalProject.reduce(function (r, a) {
            r[a.PersonID] = r[a.PersonID] || [];
            r[a.PersonID].push(a);
            return r;
        }, Object.create(null));

        // 0: normal // 1: warning // 2: disconnect
        let unixTimeNow = Math.floor(new Date().getTime() / 1000);

        let tableProject = [];
        for (let project in groupTotal) {
            let getStatus = groupTotal[project];
            let totalStatus;
            let ModuleStatus = [];
            let checkTotalStatus = [];
            let sumCapacity = 0;
            let sumLastUpdate = null;
            let ProjectName = null;
            let TypeProject = null;
            let Serial = '';
            for (let i = 0; i < getStatus.length; i++) {
                let unixProject = Math.floor(new Date(getStatus[i].LastUpdate).getTime() / 1000);
                if (getStatus[i].LastUpdate === null) {
                    ModuleStatus.push({
                        STT: getStatus[i].STT,
                        Module: (getStatus[i].Module === null) ? `Hệ ${i + 1}` : getStatus[i].Module,
                        NumberDevice: getStatus[i].NumberDevice,
                        Status: 2
                    });

                    checkTotalStatus.push(2);
                } else {
                    let difUnix = unixTimeNow - unixProject;
                    if (difUnix <= limitNormal) {
                        ModuleStatus.push({
                            STT: getStatus[i].STT,
                            Module: (getStatus[i].Module === null) ? `Hệ ${i + 1}` : getStatus[i].Module,
                            NumberDevice: getStatus[i].NumberDevice,
                            Status: 0
                        });

                        checkTotalStatus.push(0);
                    } else if ((limitNormal < difUnix) && (difUnix <= limitWarning)) {
                        ModuleStatus.push({
                            STT: getStatus[i].STT,
                            Module: (getStatus[i].Module === null) ? `Hệ ${i + 1}` : getStatus[i].Module,
                            NumberDevice: getStatus[i].NumberDevice,
                            Status: 1
                        });

                        checkTotalStatus.push(1);
                    } else if ((limitWarning < difUnix) && (difUnix <= limitError)) {
                        ModuleStatus.push({
                            STT: getStatus[i].STT,
                            Module: (getStatus[i].Module === null) ? `Hệ ${i + 1}` : getStatus[i].Module,
                            NumberDevice: getStatus[i].NumberDevice,
                            Status: 2
                        });

                        checkTotalStatus.push(2);
                    } else {
                        ModuleStatus.push({
                            STT: getStatus[i].STT,
                            Module: (getStatus[i].Module === null) ? `Hệ ${i + 1}` : getStatus[i].Module,
                            NumberDevice: getStatus[i].NumberDevice,
                            Status: 2
                        });

                        checkTotalStatus.push(2);
                    }

                    if (sumLastUpdate === null) {
                        sumLastUpdate = unixProject;
                    } else if (sumLastUpdate < unixProject) {
                        sumLastUpdate = unixProject;
                    }
                }

                Serial += ` ${getStatus[i].Serial}`;

                sumCapacity += getStatus[i].Capacity;

                if (ProjectName === null) {
                    ProjectName = getStatus[i].Name;
                }

                if (TypeProject === null) {
                    TypeProject = getStatus[i].TypeProject;
                }
            }

            let newDate = new Date(sumLastUpdate * 1000);
            let updateDate = ('0' + newDate.getUTCDate()).slice(-2);
            let updateMonth = ('0' + (newDate.getUTCMonth() + 1)).slice(-2);
            let updateYear = newDate.getUTCFullYear();

            let updateHour = ('0' + newDate.getUTCHours()).slice(-2);
            let updateMin = ('0' + newDate.getUTCMinutes()).slice(-2);
            let updateSec = ('0' + newDate.getUTCSeconds()).slice(-2);

            let LastUpdate = `${updateYear}-${updateMonth}-${updateDate} ${updateHour}:${updateMin}:${updateSec}`

            //checking total status
            if (checkTotalStatus.length <= 1) {
                if (checkTotalStatus[0] === 0) {
                    totalStatus = 0
                } else if (checkTotalStatus[0] === 1) {
                    totalStatus = 1
                } else {
                    totalStatus = 2
                }
            } else {
                if (!checkTotalStatus.includes(0)) {
                    if ((checkTotalStatus.includes(1) && checkTotalStatus.includes(2))
                        || !checkTotalStatus.includes(2)) {
                        totalStatus = 1
                    } else {
                        totalStatus = 2
                    }
                } else if (!checkTotalStatus.includes(1)) {
                    if ((checkTotalStatus.includes(2) && checkTotalStatus.includes(0))) {
                        totalStatus = 1
                    } else if (!checkTotalStatus.includes(2)) {
                        totalStatus = 0
                    } else {
                        totalStatus = 2
                    }
                } else if (!checkTotalStatus.includes(2)) {
                    if ((checkTotalStatus.includes(0) && checkTotalStatus.includes(1))
                        || !checkTotalStatus.includes(0)) {
                        totalStatus = 1
                    } else {
                        totalStatus = 0
                    }
                }
            }



            //checking checkbox selected
            if (selectedDeviceStatus.length === 3) {
                tableProject.push({
                    PersonID: project,
                    ProjectName: ProjectName,
                    TypeProject: TypeProject,
                    DeviceStatus: ModuleStatus,
                    Capacity: sumCapacity,
                    LastUpdate: LastUpdate,
                    Serial: Serial
                })
            } else if (selectedDeviceStatus.includes(totalStatus)) {
                tableProject.push({
                    PersonID: project,
                    ProjectName: ProjectName,
                    TypeProject: TypeProject,
                    DeviceStatus: ModuleStatus,
                    Capacity: sumCapacity,
                    LastUpdate: LastUpdate,
                    Serial: Serial
                })
            }
        }

        Response.status(200).json({
            tableData: tableProject,
            pagination: {
                currentPage: currentPage,
                perPage: perPage
            }
        })
    } catch (err) {
        console.log(err)
        Response.status(500).json({
            message: `Không có dữ liệu`
        })
    }
}

let parentProjectList = async (Request, Response) => {
    try {
        let parentAccountInfo = JSON.parse(Request.headers.user);
        let queryParentProject = await sqlPool_SWH.request()
            .input('managerID', sql.NVarChar, parentAccountInfo.PersonID)
            .input('available', sql.Int, 1)
            .query(`SELECT I.PersonId as PersonID, II.Serial, II.Capacity, II.Module, III.Name,  
            II.LastUpdate, II.NumberDevice, II.TypeProject FROM tb_ProjectManager I 
            inner join tb_ProjectInfo II on I.PersonId = II.PersonID
            inner join tb_Cl_Person III on II.PersonID = III.PersonID
            where Manager=@managerID and I.Available=@available`)

        let getParentProject = queryParentProject.recordset;

        let groupTotal = getParentProject.reduce(function (r, a) {
            r[a.PersonID] = r[a.PersonID] || [];
            r[a.PersonID].push(a);
            return r;
        }, Object.create(null));

        // 0: normal // 1: warning // 2: disconnect
        let unixTimeNow = Math.floor(new Date().getTime() / 1000);

        let tableProject = [];
        for (let project in groupTotal) {
            let getStatus = groupTotal[project];
            let totalStatus;
            let ModuleStatus = [];
            let checkTotalStatus = [];
            let sumCapacity = 0;
            let sumLastUpdate = null;
            let ProjectName = null;
            let TypeProject = null;
            let Serial = '';
            for (let i = 0; i < getStatus.length; i++) {
                let unixProject = Math.floor(new Date(getStatus[i].LastUpdate).getTime() / 1000);
                if (getStatus[i].LastUpdate === null) {
                    ModuleStatus.push({
                        STT: getStatus[i].STT,
                        Module: (getStatus[i].Module === null) ? `Hệ ${i + 1}` : getStatus[i].Module,
                        NumberDevice: getStatus[i].NumberDevice,
                        Status: 2
                    });

                    checkTotalStatus.push(2);
                } else {
                    let difUnix = unixTimeNow - unixProject;
                    if (difUnix <= limitNormal) {
                        ModuleStatus.push({
                            STT: getStatus[i].STT,
                            Module: (getStatus[i].Module === null) ? `Hệ ${i + 1}` : getStatus[i].Module,
                            NumberDevice: getStatus[i].NumberDevice,
                            Status: 0
                        });

                        checkTotalStatus.push(0);
                    } else if ((limitNormal < difUnix) && (difUnix <= limitWarning)) {
                        ModuleStatus.push({
                            STT: getStatus[i].STT,
                            Module: (getStatus[i].Module === null) ? `Hệ ${i + 1}` : getStatus[i].Module,
                            NumberDevice: getStatus[i].NumberDevice,
                            Status: 1
                        });

                        checkTotalStatus.push(1);
                    } else if ((limitWarning < difUnix) && (difUnix <= limitError)) {
                        ModuleStatus.push({
                            STT: getStatus[i].STT,
                            Module: (getStatus[i].Module === null) ? `Hệ ${i + 1}` : getStatus[i].Module,
                            NumberDevice: getStatus[i].NumberDevice,
                            Status: 2
                        });

                        checkTotalStatus.push(2);
                    } else {
                        ModuleStatus.push({
                            STT: getStatus[i].STT,
                            Module: (getStatus[i].Module === null) ? `Hệ ${i + 1}` : getStatus[i].Module,
                            NumberDevice: getStatus[i].NumberDevice,
                            Status: 2
                        });

                        checkTotalStatus.push(2);
                    }

                    if (sumLastUpdate === null) {
                        sumLastUpdate = unixProject;
                    } else if (sumLastUpdate < unixProject) {
                        sumLastUpdate = unixProject;
                    }
                }

                Serial += ` ${getStatus[i].Serial}`;

                sumCapacity += getStatus[i].Capacity;

                if (ProjectName === null) {
                    ProjectName = getStatus[i].Name;
                }

                if (TypeProject === null) {
                    TypeProject = getStatus[i].TypeProject;
                }
            }

            let newDate = new Date(sumLastUpdate * 1000);
            let updateDate = ('0' + newDate.getUTCDate()).slice(-2);
            let updateMonth = ('0' + (newDate.getUTCMonth() + 1)).slice(-2);
            let updateYear = newDate.getUTCFullYear();

            let updateHour = ('0' + newDate.getUTCHours()).slice(-2);
            let updateMin = ('0' + newDate.getUTCMinutes()).slice(-2);
            let updateSec = ('0' + newDate.getUTCSeconds()).slice(-2);

            let LastUpdate = `${updateYear}-${updateMonth}-${updateDate} ${updateHour}:${updateMin}:${updateSec}`

            //checking total status
            if (checkTotalStatus.length <= 1) {
                if (checkTotalStatus[0] === 0) {
                    totalStatus = 0
                } else if (checkTotalStatus[0] === 1) {
                    totalStatus = 1
                } else {
                    totalStatus = 2
                }
            } else {
                if (!checkTotalStatus.includes(0)) {
                    if ((checkTotalStatus.includes(1) && checkTotalStatus.includes(2))
                        || !checkTotalStatus.includes(2)) {
                        totalStatus = 1
                    } else {
                        totalStatus = 2
                    }
                } else if (!checkTotalStatus.includes(1)) {
                    if ((checkTotalStatus.includes(2) && checkTotalStatus.includes(0))) {
                        totalStatus = 1
                    } else if (!checkTotalStatus.includes(2)) {
                        totalStatus = 0
                    } else {
                        totalStatus = 2
                    }
                } else if (!checkTotalStatus.includes(2)) {
                    if ((checkTotalStatus.includes(0) && checkTotalStatus.includes(1))
                        || !checkTotalStatus.includes(0)) {
                        totalStatus = 1
                    } else {
                        totalStatus = 0
                    }
                }
            }

            tableProject.push({
                PersonID: project,
                ProjectName: ProjectName,
                TypeProject: TypeProject,
                DeviceStatus: ModuleStatus,
                Capacity: sumCapacity.toFixed(2),
                LastUpdate: LastUpdate,
                Serial: Serial
            })
        }

        Response.status(200).json({ tableData: tableProject });
    } catch (err) {
        console.log(err);
        Response.status(500).json({
            message: `Không có dữ liệu`
        })
    }
}

let systemStatusTotal = async (Request, Response) => {
    try {
        let id = Request.body.userinfo.id;
        let username = Request.body.userinfo.username;

        let numberItems = Request.body.dataPost.numberItems,
            currentPage = Request.body.dataPost.currentPage,
            selectedType = Request.body.dataPost.selectedType,
            selectedStatus = Request.body.dataPost.selectedStatus;

        let projectType;
        if (selectedType === 'all') {
            projectType = '';
        } else {
            projectType = `AND II.Project = '${selectedType}'`
        }

        let queryTotalStatus = await sqlPool_SWH.request()
            .query(`select II.PersonID, II.Module, II.LastUpdate from tb_Cl_Person I
            inner join tb_ProjectInfo II on I.PersonID = II.PersonID 
            left join tb_AD_HiddenProject III on II.PersonID = III.PersonID
            where I.Available = 1 AND III.PersonID IS NULL ${projectType}
            order by I.STT asc`);

        let getTotalStatus = queryTotalStatus.recordset;
        let groupTotal = getTotalStatus.reduce(function (r, a) {
            r[a.PersonID] = r[a.PersonID] || [];
            r[a.PersonID].push(a);
            return r;
        }, Object.create(null));

        // 0: normal // 1: warning // 2: disconnect
        let unixTimeNow = Math.floor(new Date().getTime() / 1000);

        let PerStatusArr = [],
            PerStatusArr_normal = [],
            PerStatusArr_warning = [],
            PerStatusArr_error = [];

        for (let project in groupTotal) {
            let checkTotalStatus = []
            let status;
            let getStatus = groupTotal[project]
            for (let i = 0; i < getStatus.length; i++) {
                if (getStatus[i].LastUpdate === null) {
                    checkTotalStatus.push(2)
                } else {
                    let unixProject = Math.floor(new Date(getStatus[i].LastUpdate).getTime() / 1000);
                    let difUnix = unixTimeNow - unixProject;
                    if (difUnix <= limitNormal) {
                        status = 0
                    } else if ((limitNormal < difUnix) && (difUnix <= limitWarning)) {
                        status = 1
                    } else if ((limitWarning < difUnix) && (difUnix <= limitError)) {
                        status = 2
                    } else {
                        status = 2
                    }
                    checkTotalStatus.push(status);
                }
            }
            if (checkTotalStatus.length <= 1) {
                if (checkTotalStatus[0] === 0) {
                    PerStatusArr_normal.push(0)
                } else if (checkTotalStatus[0] === 1) {
                    PerStatusArr_warning.push(1)
                } else {
                    PerStatusArr_error.push(2)
                }
                PerStatusArr.push({
                    PersonId: project,
                    Status: checkTotalStatus[0]
                })
            } else {
                if (!checkTotalStatus.includes(0)) {
                    if ((checkTotalStatus.includes(1) && checkTotalStatus.includes(2))
                        || !checkTotalStatus.includes(2)) {
                        PerStatusArr_warning.push(1)
                        PerStatusArr.push({
                            PersonId: project,
                            Status: 1
                        })
                    } else {
                        PerStatusArr_error.push(2)
                        PerStatusArr.push({
                            PersonId: project,
                            Status: 2
                        })
                    }
                } else if (!checkTotalStatus.includes(1)) {
                    if ((checkTotalStatus.includes(2) && checkTotalStatus.includes(0))) {
                        PerStatusArr_warning.push(1)
                        PerStatusArr.push({
                            PersonId: project,
                            Status: 1
                        })
                    } else if (!checkTotalStatus.includes(2)) {
                        PerStatusArr_normal.push(0)
                        PerStatusArr.push({
                            PersonId: project,
                            Status: 0
                        })
                    } else {
                        PerStatusArr_warning.push(2)
                        PerStatusArr.push({
                            PersonId: project,
                            Status: 2
                        })
                    }
                } else if (!checkTotalStatus.includes(2)) {
                    if ((checkTotalStatus.includes(0) && checkTotalStatus.includes(1))
                        || !checkTotalStatus.includes(0)) {
                        PerStatusArr_warning.push(1)
                        PerStatusArr.push({
                            PersonId: project,
                            Status: 1
                        })
                    } else {
                        PerStatusArr_normal.push(0)
                        PerStatusArr.push({
                            PersonId: project,
                            Status: 0
                        })
                    }
                }
            }
        }

        let checkSelectStatus = [];
        if (selectedStatus === 'all') {
            checkSelectStatus = PerStatusArr;
        } else {
            for (let i = 0; i < PerStatusArr.length; i++) {
                if (PerStatusArr[i].Status == selectedStatus) {
                    checkSelectStatus.push({
                        PersonId: PerStatusArr[i].PersonId,
                        Status: PerStatusArr[i].Status
                    })
                }
            }
        }
        const paginateCollection = Paginator(checkSelectStatus, currentPage, numberItems)
        Response.status(200).json({
            TotalProject: PerStatusArr.length,
            TotalProjectNormal: PerStatusArr_normal.length,
            TotalProjectWarning: PerStatusArr_warning.length,
            TotalProjectError: PerStatusArr_error.length,
            StatusPageData: paginateCollection
        })
    } catch (err) {
        console.log(err);
        Response.status(500).json({
            message: `Không có dữ liệu`
        })
    }
}

//parent account information
let parentAccountInfo = async (Request, Response) => {
    try {
        let parentAccountInfo = JSON.parse(Request.headers.user);
        //do something

        Response.status(200).json(parentAccountInfo);
    } catch (err) {
        Response.status(500).json({
            message: `Không có dữ liệu`
        })
    }
}

let getAdminInfoProject = async (Request, Response) => {
    try {
        let id = Request.body.userinfo.id;
        let username = Request.body.userinfo.username;

        let getAdminPermission =
            await sqlPool_SWH.request().query(`SELECT name_permision, descript_permision, PersonID, licensed
            FROM tb_AD_Permision inner join tb_AD_PersonPermision
            on tb_AD_Permision.id_permision = tb_AD_PersonPermision.id_permision
            where tb_AD_PersonPermision.PersonID = '${username}'`);

        let getPermission = getAdminPermission.recordset;
        if (getPermission !== undefined) {
            let queryProject =
                await sqlPool_SWH.request().query(`SELECT tb_ProjectInfo.PersonId, Serial, tb_ProjectInfo.Capacity, 
                NumberDevice, TypeProject, Project, KindProject, Name as ProjectName, Device
                FROM tb_ProjectManager inner join tb_ProjectInfo
                on tb_ProjectManager.PersonId = tb_ProjectInfo.PersonID
                inner join tb_Cl_Person on tb_Cl_Person.PersonID = tb_ProjectInfo.PersonID
                where tb_ProjectManager.Manager = '${username}'`);

            let getProject = queryProject.recordset;

            getPermission.forEach(e => {
                if (e.licensed == 1) {
                    e.licensed = true
                } else if (e.licensed == 0) {
                    e.licensed = false
                } else {
                    e.licensed = undefined
                }
            })

            getProject.forEach(e => {
                if (e.Serial == null) {
                    e.Serial = 'Undefined'
                }

                if (e.Capacity == null) {
                    e.Capacity = 'Undefined'
                }

                if (e.NumberDevice == null) {
                    e.NumberDevice = 'Undefined'
                }

                if (e.TypeProject == null) {
                    e.TypeProject = 'Undefined'
                }

                if (e.Project == null) {
                    e.Project = 'Undefined'
                }

                if (e.KindProject == null) {
                    e.KindProject = 'Undefined'
                }

                if (e.Name == null) {
                    e.Name = 'Undefined'
                }
            })

            if (Request.body.token != undefined) {

                let { access_token, refresh_token } = Request.body.token;

                let payloadRefreshAccessTok = {
                    id: id,
                    username: username,
                    access_token: access_token
                }

                let payloadRefreshRefreshTok = {
                    id: id,
                    refresh_token: refresh_token
                }

                client_redis.set(`${id}_${username}_accessToken`, JSON.stringify(payloadRefreshAccessTok), (err) => {
                    if (err) {
                        Response.status(500).json({
                            message: `Something went wrong when set admin access token`
                        })

                    } else {
                        client_redis.set(`${id}_${username}_refreshToken`, JSON.stringify(payloadRefreshRefreshTok),
                            (err) => {
                                if (err) {
                                    Response.status(500).json({
                                        message: `Something went wrong when set admin refresh token`
                                    })

                                } else {
                                    Response.status(200).json({
                                        admin_permission: getPermission,
                                        user_info: Request.body.userinfo,
                                        admin_project: getProject,
                                        token: access_token
                                    })

                                }
                            })
                    }

                })
            } else {
                Response.status(200).json({
                    admin_permission: getPermission,
                    user_info: Request.body.userinfo,
                    admin_project: getProject,
                    token: Request.body.access_token
                })
            }
        } else {
            Response.status(409).json({
                message: `Người dùng không được phép truy cập`
            })
        }
    } catch (err) {
        console.log(err);
        Response.status(500).json({
            message: `Có lỗi xảy ra khi lấy thông tin admin`
        })
    }
}

let logOutAdmin = async (Request, Response) => {
    let token = Request.headers['authorization']
        || Request.headers['x-access-token'];
    if (!token) {
        Response.status(403).json({
            message: `Token là bắt buộc`
        })
    } else {
        let { id, username } = Request.body;
        client_redis.del(`${id}_${username}_accessToken`, (err) => {
            if (err) {
                Response.status(500).json({
                    message: `Có lỗi xảy ra khi đăng xuất Admin`
                })
            } else {
                client_redis.del(`${id}_${username}_refreshToken`, (err) => {
                    if (err) {
                        Response.status(500).json({
                            message: `Có lỗi xảy ra khi đăng xuất admin`
                        })
                    } else {
                        Response.status(200).json({
                            message: `Logout successful`
                        })
                    }
                })
            }
        })
    }
}

let changePass = async (Request, Response) => {
    try {
        let { username, newPassword, newPassEnCode } = Request.body;

        await sqlPool_SWH.request().query(`UPDATE tb_Cl_Person SET Password= N'${newPassEnCode}', 
        ViewPass='${newPassword}' WHERE PersonID='${username}'`);

        Response.status(200).json({
            message: `Change password successful`
        })
    } catch (err) {
        console.log(err);
        Response.status(500).json({
            message: `Có lỗi xảy ra khi thay đổi mật khẩu`
        })
    }
}

let logOutParent = (Request, Response) => {
    let token = Request.headers['authorization']
        || Request.headers['x-access-token'];
    if (!token) {
        Response.status(409).json({
            message: `Đã đăng xuất`
        })
    } else {
        client_redis.get(`${token}_accessToken_parent`, (err, accessTok) => {
            if (err) {
                Response.status(500).json({
                    message: `Có lỗi xảy ra khi lấy access token`
                })
            } else {
                if (accessTok == null) {
                    client_redis.del(`${token}_refreshToken_parent`, (err) => {
                        if (err) { console.log(err) }
                        else {
                            Response.status(200).json({
                                message: `Log out successful`
                            })
                        }
                    })
                } else {
                    client_redis.del(`${token}_accessToken_parent`, (err) => {
                        if (err) { console.log(err) }
                        else {
                            client_redis.del(`${token}_refreshToken_parent`, (err) => {
                                if (err) { console.log(err) }
                                else {
                                    Response.status(200).json({
                                        message: `Log out successful`
                                    })
                                }
                            })
                        }
                    })
                }
            }
        })
    }
}

let logOut = (Request, Response) => {
    let token = Request.headers['authorization']
        || Request.headers['x-access-token'];
    if (!token) {
        Response.status(409).json({
            message: `Đã đăng xuất`
        })
    } else {
        client_redis.get(`${token}_accessToken`, (err, accessTok) => {
            if (err) {
                Response.status(500).json({
                    message: `Có lỗi xảy ra`
                })
            } else {
                if (accessTok == null) {
                    client_redis.del(`${token}_refreshToken`, (err) => {
                        if (err) { console.log(err) }
                        else {
                            Response.status(200).json({
                                message: `Log out successful`
                            })
                        }
                    })
                } else {
                    client_redis.del(`${token}_accessToken`, (err) => {
                        if (err) { console.log(err) }
                        else {
                            client_redis.del(`${token}_refreshToken`, (err) => {
                                if (err) { console.log(err) }
                                else {
                                    Response.status(200).json({
                                        message: `Log out successful`
                                    })
                                }
                            })
                        }
                    })
                }
            }
        })
    }
}

let RefreshToken = async (Request, Response) => {
    let token = Request.headers['authorization']
        || Request.headers['x-access-token'];
    if (!token) {
        Response.status(403).json({
            message: `Token là bắt buộc`
        })
    } else {
        client_redis.get(`${token}_accessToken`, (err, accessTok) => {
            if (err) {
                console.log(err);
                Response.status(500).json({
                    message: `Có lỗi xảy ra`
                })
            }
            else {
                if (accessTok != null) {
                    Response.status(409).json({
                        message: `Token chưa hết hạn`,
                        token: token
                    })
                } else {
                    client_redis.get(`${token}_refreshToken`, (err, refreshTok) => {
                        if (err) {
                            console.log(err);
                            Response.status(500).json({ message: `Có lỗi xảy ra` })
                        }
                        else {
                            if (refreshTok == null) {
                                Response.status(409).json({
                                    message: `Refresh token đã hết hạn`
                                })
                            } else {
                                try {
                                    let parseRefreshToken = JSON.parse(refreshTok).publicKey;
                                    jwt.verify(token, parseRefreshToken, { algorithms: ["RS256"] }, async (err, decoded) => {
                                        if (err) {
                                            console.log(err);
                                            Response.status(403).json({
                                                message: `Token không hợp lệ`
                                            })
                                        } else {
                                            let pairKeys = await generatePairKeys(),
                                                setRedis = await setTokenToRedis(decoded,
                                                    pairKeys.publicKey,
                                                    pairKeys.privateKey, expire);
                                            if (setRedis.err != undefined) {
                                                Response.status(500).json({
                                                    message: `Có lỗi xảy ra`
                                                })
                                            } else {
                                                Response.status(200).json({
                                                    message: `Refresh token successful`,
                                                    token: setRedis.token
                                                })
                                            }
                                        }
                                    })
                                } catch (err) {
                                    console.log(err);
                                    Response.status(500).json({
                                        message: `Có lỗi xảy ra`
                                    })
                                }
                            }
                        }
                    })
                }
            }
        })
    }
}

let powerTrackPlatformAuth = async (Request, Response) => {
    let token = Request.headers['authorization']
        || Request.headers['x-access-token'];
    if (token) {
        Response.status(409).json({
            message: `Request already has token`
        })
    } else {
        let ipAddress = Request.headers['x-forwarded-for'] || Request.connection.remoteAddress;
        let pairKeys = await generatePairKeys();
        let expireInToken = expire.expireInToken,
            expireInRedis_access = expire.expireInRedis_access,
            expireInRedis_refresh = expire.expireInRedis_refresh;

        let newPayLoad = {
            ip: ipAddress
        }

        let token = jwt.sign(newPayLoad, pairKeys.privateKey, { expiresIn: expireInToken, algorithm: "RS256" });

        let accessTokValue = JSON.stringify({
            token: token,
            publicKey: pairKeys.publicKey
        });

        let refreshTokValue = JSON.stringify({
            token: token,
            publicKey: pairKeys.publicKey,
            privateKey: pairKeys.privateKey
        });

        client_redis.setex(`${token}_accessToken_powerTrack`, expireInRedis_access,
            accessTokValue, (err) => {
                if (err) {
                    Response.status(500).json({
                        message: `Something went wrong`
                    })
                } else {
                    client_redis.setex(`${token}_refreshToken_powerTrack`, expireInRedis_refresh,
                        refreshTokValue, (err) => {
                            if (err) {
                                Response.status(500).json({
                                    message: `Something went wrong`
                                })
                            } else {
                                Response.status(200).json({ token })
                            }
                        })
                }
            })
    }
}

let refreshPowerTrackToken = async (Request, Response) => {
    let token = Request.headers['authorization']
        || Request.headers['x-access-token'];

    if (!token) {
        Response.status(403).json({
            message: `Token required`
        })
    } else {
        client_redis.get(`${token}_accessToken_powerTrack`, (err, accessTok) => {
            if (err) {
                Response.status(500).json({
                    message: `Something went wrong`
                })
            } else {
                if (accessTok != null) {
                    Response.status(409).json({
                        message: `Token not expire`
                    })
                } else {
                    client_redis.get(`${token}_refreshToken_powerTrack`, (err, refreshTok) => {
                        if (err) {
                            Response.status(500).json({
                                message: `Something went wrong`
                            })
                        } else {
                            if (refreshTok == null) {
                                Response.status(403).json({
                                    message: `Refresh token expired`
                                })
                            } else {
                                let parseRefreshToken = JSON.parse(refreshTok).publicKey;
                                jwt.verify(token, parseRefreshToken, { algorithms: ["RS256"] }, async (err, decoded) => {
                                    if (err) {
                                        Response.status(403).json({
                                            message: `Invalid token`
                                        })
                                    } else {
                                        let pairKeys = await generatePairKeys();
                                        let expireInToken = expire.expireInToken,
                                            expireInRedis_access = expire.expireInRedis_access,
                                            expireInRedis_refresh = expire.expireInRedis_refresh;

                                        var newPayLoad = {
                                            ip: decoded.ip
                                        }

                                        let newtoken = jwt.sign(newPayLoad, pairKeys.privateKey, { expiresIn: expireInToken, algorithm: "RS256" });

                                        let accessTokValue = JSON.stringify({
                                            token: newtoken,
                                            publicKey: pairKeys.publicKey
                                        });

                                        let refreshTokValue = JSON.stringify({
                                            token: newtoken,
                                            publicKey: pairKeys.publicKey,
                                            privateKey: pairKeys.privateKey
                                        });

                                        client_redis.setex(`${newtoken}_accessToken_powerTrack`, expireInRedis_access,
                                            accessTokValue, (err) => {
                                                if (err) {
                                                    Response.status(500).json({
                                                        message: `Something went wrong`
                                                    })
                                                } else {
                                                    client_redis.setex(`${newtoken}_refreshToken_powerTrack`, expireInRedis_refresh,
                                                        refreshTokValue, (err) => {
                                                            if (err) {
                                                                Response.status(500).json({
                                                                    message: `Something went wrong`
                                                                })
                                                            } else {
                                                                Response.status(200).json({ newtoken })
                                                            }
                                                        })
                                                }
                                            })
                                    }
                                })
                            }
                        }
                    })
                }
            }
        })
    }
}

//SMAL FUNC
let setTokenToRedis = async (payload, publicKey, privateKey, expire, kindAccount) => {
    //let expireTime
    let expireInToken = expire.expireInToken,
        expireInRedis_access = expire.expireInRedis_access,
        expireInRedis_refresh = expire.expireInRedis_refresh;
    let newPayLoad = {
        PersonID: payload.PersonID,
        userName: payload.userName,
        uID: payload.uID,
        projectType: payload.projectType,
        kindProject: payload.kindProject,
        Device: payload.Device
    }
    let token = jwt.sign(newPayLoad, privateKey, { expiresIn: expireInToken, algorithm: "RS256" });
    //Access token value
    let accessTokValue = JSON.stringify({
        token: token,
        publicKey: publicKey
    }),
        refreshTokValue = JSON.stringify({
            token: token,
            publicKey: publicKey,
            privateKey: privateKey
        });

    let check;
    if (kindAccount === 'parent') {
        check = client_redis.setex(`${token}_accessToken_parent`, expireInRedis_access,
            accessTokValue, (err) => {
                if (err) {
                    return false;
                } else {
                    return client_redis.setex(`${token}_accessToken_parent`, expireInRedis_refresh,
                        refreshTokValue, (err) => {
                            if (err) {
                                return false;
                            } else {
                                return true;
                            }
                        })
                }
            })
    } else {
        check = client_redis.setex(`${token}_accessToken`, expireInRedis_access,
            accessTokValue, (err) => {
                if (err) {
                    return false;
                } else {
                    return client_redis.setex(`${token}_refreshToken`, expireInRedis_refresh,
                        refreshTokValue, (err) => {
                            if (err) {
                                return false;
                            } else {
                                return true;
                            }
                        })
                }
            })
    }
    if (check == false) {
        return { err: `Something went wrong` };
    } else {
        return { token: token };
    }
}

//GENERATE PAIR KEYS FUNC
let generatePairKeys = async () => {
    const { publicKey, privateKey }
        = generateKeyPairSync('rsa', {
            modulusLength: 512,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs1',
                format: 'pem'
            }
        });
    return {
        publicKey: publicKey,
        privateKey: privateKey
    }
}


let getSystemStatus = async (Request, Response) => {
    let timeStart = new Date().getTime();
    let table = JSON.parse(Request.headers.table);
    let demoTableName = table.tableReport,
        demoTableName_log = table.tableLog;
    try {
        let statusParam = table.statusParam;
        let dataID = statusParam.substring(1, statusParam.length - 1);

        //Get data params
        const queryDataParams = await sqlPool_SWH.request()
            .query(`SELECT TOP 1 ${dataID},CurrentDate FROM ${demoTableName_log} ORDER BY STT DESC`);

        //Get total params
        const queryTongso = await sqlPool_SWH.request()
            .query(`SELECT TOP 1 TongLuuLuong, DienNangTieuThu, NangLuongTietKiem,
            Temp_Nuoclanh, Temp_Nuocnong
            FROM ${demoTableName} WHERE (Nam='${year}') AND (Thang='${month}')
            AND (Ngay='${days}') ORDER BY ThoiDiem DESC`);

        let dataParams = queryDataParams.recordset[0];
        // let arr = await Compare(statusParam)
        let converted = await convertArray(dataParams);

        let dataResponse = {
            currentTime: queryDataParams.recordset[0].CurrentDate,
            dataParams: converted,
            dataTotal: queryTongso.recordset[0]
        }

        Response.status(200).json({
            message: `Get system status successful`,
            data: dataResponse
        });
        let timeDone = new Date().getTime();
        console.log({
            runIn: `${timeDone - timeStart}(ms)`
        });

    } catch (err) {
        console.log(err);
        Response.status(500).json({
            message: `Không có dữ liệu`
        })
    }
}

let getOverView = async (Request, Response) => {
    /**
     * variables Name
     * // TLL: Tổng lưu lượng
     * // NLTK: Năng lượng tiết kiệm
     * // CPTK: Chi phí tiết kiệm
     * // TNN: Temp nước nóng
     * // TNL: Temp nước lạnh
     * // DNTT: Điện năng tiêu thụ
     * // TLTK: Tỷ lệ tiết kiệm
     * // GT_CD: Giá tiền cao điểm
     * // GT_BT: Giá tiền bình thường
     * // GT_TD: Giá tiền thấp điểm
     * // HS1: Hệ số 1
     * // HS2: Hệ số 2
     * // TT_1: Biến tính toán 1
     * // TT_2: Biến tính toán 2
     */
    try {
        let timeStart = new Date().getTime();
        let table = JSON.parse(Request.headers.table);

        let demoTableName = table.tableReport;
        let demoTableName_log = table.tableLog;
        let demoPersonID = table.PersonID;

        //request demo data - POST TABLE NAME ?

        //QUERY GET PARAMS A
        const queryGetDataLog = await sqlPool_SWH.request()
            .query(`SELECT TOP 1 A1,A0,A3 FROM ${demoTableName_log} ORDER BY STT DESC`);

        //QUERY GET NLTK AND TLL BY MONTH
        const queryGetSumByMonth = await sqlPool_SWH.request()
            .query(`SELECT TOP 1 [ThoiDiem], SUM(NangLuongTietKiem) as NLTK_MONTH 
            FROM ${demoTableName} WHERE (Nam='${year}') AND (Thang='${month}') AND
            (ThoiDiem like N'%Tổng cộng%')
            Group by ThoiDiem`);

        //QUERY GET TOTAL NLTK
        const queryGetSumTotal = await sqlPool_SWH.request()
            .query(`SELECT TOP 1 [ThoiDiem], SUM(NangLuongTietKiem) as NLTK_TOTAL,
            SUM(TongLuuLuong) as TLL_TOTAL
        FROM ${demoTableName} WHERE (ThoiDiem like N'%Tổng cộng%')
        Group by ThoiDiem`);

        //QUERY GET NLTK BY MONTH AND BY THOIDIEM
        const queryGetNLTKByMonthByTD = await sqlPool_SWH.request()
            .query(`SELECT TOP 1
        (SELECT TOP 1 SUM(NangLuongTietKiem) from ${demoTableName} 
        where (Nam='${year}') AND (Thang='${month}') AND (Ma_ThoiDiem='CD')
        ) as NLTK_CD,
        (SELECT TOP 1 SUM(NangLuongTietKiem) from ${demoTableName}
        where (Nam='${year}') AND (Thang='${month}') AND (Ma_ThoiDiem='BT')
        ) as NLTK_BT,
        (SELECT TOP 1 SUM(NangLuongTietKiem) from ${demoTableName}
        where (Nam='${year}') AND (Thang='${month}') AND (Ma_ThoiDiem='TD')
        ) as NLTK_TD
        FROM ${demoTableName}
        Group by Ma_ThoiDiem`)

        //QUERY GET TOTAL NLTK BY THOIDIEM
        const queryGetNLTKByTD = await sqlPool_SWH.request()
            .query(`SELECT TOP 1 
        (SELECT TOP 1 SUM(NangLuongTietKiem) from ${demoTableName}
        where (Ma_ThoiDiem='CD')) as NLTK_CD,
        (SELECT TOP 1 SUM(NangLuongTietKiem) from ${demoTableName} 
        where (Ma_ThoiDiem='BT')) as NLTK_BT,
        (SELECT TOP 1 SUM(NangLuongTietKiem) from ${demoTableName}
        where (Ma_ThoiDiem='TD')) as NLTK_TD
        FROM ${demoTableName}
        Group by Ma_ThoiDiem`)

        //QUERY GET HESO PROJECT (2) AND GIATIEN BY THOIDIEM
        const queryGetHSProject = await sqlPool_SWH.request()
            .query(`SELECT TOP 1 HeSoTinhToan, GiaCD, GiaBT, GiaTD FROM tb_ProjectInfo
        WHERE PersonID='${demoPersonID}'`);

        //QUERY GET TongLuuLuong, Temp_Nuocnong, Temp_Nuoclanh, DienNangTieuThu BY DAY
        const queryGetTLL_TNN_TNL_DNTT_ByDay = await sqlPool_SWH.request()
            .query(`SELECT TOP 1 TongLuuLuong, Temp_Nuocnong, Temp_Nuoclanh, DienNangTieuThu
        FROM ${demoTableName} WHERE (Nam='${yearOfYesterday}') AND (Thang='${monthOfYesterday}')
        AND (Ngay='${dayOfYesterday}') AND (ThoiDiem LIKE N'%Tổng cộng%')`);

        //QUERY GET TongLuuLuong, Temp_Nuocnong, Temp_Nuoclanh, DienNangTieuThu BY MONTH
        const queryGetTLL_TNN_TNL_DNTT_ByMonth = await sqlPool_SWH.request()
            .query(`SELECT TOP 1 SUM(Temp_Nuocnong) AS TNN_BYMONTH, 
            SUM(Temp_Nuoclanh) AS TNL_BYMONTH, 
            (SELECT COUNT(*) FROM ${demoTableName} WHERE 
            Temp_Nuocnong != 0 and (Nam='${year}') AND (Thang='${month}') AND
            (ThoiDiem LIKE N'%Tổng cộng%')) AS ROW_NN,
            (SELECT COUNT(*) FROM ${demoTableName} WHERE
            Temp_Nuoclanh != 0 and (Nam='${year}') AND (Thang='${month}') AND
            (ThoiDiem LIKE N'%Tổng cộng%')) AS ROW_NL
            FROM ${demoTableName} WHERE (Nam='${year}') AND (Thang='${month}') AND
            (ThoiDiem LIKE N'%Tổng cộng%') GROUP BY ThoiDiem`);

        //QUERY GET TongLuuLuong BY MONTH
        let stringDateTimeToConvert = `${year}/${month}/01 04:30:00 AM`
        const queryGetTLL_DNTTByMonth = await sqlPool_SWH.request()
            .query(`SELECT TOP 1 
        (
            SELECT TOP 1 [A3] FROM ${demoTableName_log}
            WHERE (Nam='${year}') AND (Thang='${month}') 
            AND CONVERT(DATETIME,CurrentDate,103) >= '${stringDateTimeToConvert}'
            ORDER BY STT ASC 
        ) AS firstRecord_TLL,
        (
            SELECT TOP 1 [A3] FROM ${demoTableName_log}
            WHERE (Nam='${year}') AND (Thang='${month}')
            ORDER BY STT DESC
        ) AS lastRecord_TLL,
        (
            SELECT TOP 1 [A2] FROM ${demoTableName_log}
            WHERE (Nam='${year}') AND (Thang='${month}') 
            AND CONVERT(DATETIME,CurrentDate,103) >= '${stringDateTimeToConvert}'
            ORDER BY STT ASC 
        ) AS firstRecord_DNTT,
        (
            SELECT TOP 1 [A2] FROM ${demoTableName_log}
            WHERE (Nam='${year}') AND (Thang='${month}')
            ORDER BY STT DESC
        ) AS lastRecord_DNTT
        FROM ${demoTableName_log}`);

        const queryFullNameProject = await sqlPool_SWH.request()
            .query(`SELECT Fullname FROM tb_Cl_Person WHERE PersonID = '${demoPersonID}'`);

        //GET QUERY RESULT
        let getDataLog = queryGetDataLog.recordset[0],
            getTLLByMonth = queryGetTLL_DNTTByMonth.recordset[0],
            getSumByMonth = queryGetSumByMonth.recordset[0],
            getSumTotal = queryGetSumTotal.recordset[0],
            getNLTKByMonthByTD = queryGetNLTKByMonthByTD.recordset[0],
            getNLTKTotalByTD = queryGetNLTKByTD.recordset[0],
            getHSProject = queryGetHSProject.recordset[0],
            getTLL_TNN_TNL_DNTT_ByDay = queryGetTLL_TNN_TNL_DNTT_ByDay.recordset[0],
            getTLL_TNN_TNL_DNTT_ByMonth = queryGetTLL_TNN_TNL_DNTT_ByMonth.recordset[0],
            getFullNameProject = queryFullNameProject.recordset[0];

        //GET NLTK BY MONTH AND BY THOIDIEM
        let NLTK_CD_ByMonth = getNLTKByMonthByTD.NLTK_CD,
            NLTK_BT_ByMonth = getNLTKByMonthByTD.NLTK_BT,
            NLTK_TD_ByMonth = getNLTKByMonthByTD.NLTK_TD;

        //GET TOTAL NLTK BY THOIDIEM
        let NLTK_CD_total = getNLTKTotalByTD.NLTK_CD,
            NLTK_BT_total = getNLTKTotalByTD.NLTK_BT,
            NLTK_TD_total = getNLTKTotalByTD.NLTK_TD;

        //GET GIATIEN BY THOIDIEM
        let GT_CD = Number(getHSProject.GiaCD),
            GT_BT = Number(getHSProject.GiaBT),
            GT_TD = Number(getHSProject.GiaTD);

        //GET CPTK BY MONTH AND BY THOIDIEM 
        let CPTK_ByMonth = calculateCPTK(GT_CD, GT_BT, GT_TD,
            NLTK_CD_ByMonth, NLTK_BT_ByMonth, NLTK_TD_ByMonth)

        //GET CPTK TOTAL NLTK BY THOIDIEM
        let CPTK_ByTotal = calculateCPTK(GT_CD, GT_BT, GT_TD,
            NLTK_CD_total, NLTK_BT_total, NLTK_TD_total);

        //GET TLL DNTT BY MONTH
        let firstTLL = getTLLByMonth.firstRecord_TLL,
            lastTLL = getTLLByMonth.lastRecord_TLL,
            firstDNTT = getTLLByMonth.firstRecord_DNTT,
            lastDNTT = getTLLByMonth.lastRecord_DNTT,
            TLL_BYMonth = round2Decimals(lastTLL - firstTLL) || 0,
            DNTT_BYMonth = round2Decimals(lastDNTT - firstDNTT);

        //TLTK BY DAY
        let TLL_ByDay = getTLL_TNN_TNL_DNTT_ByDay.TongLuuLuong,
            TNN_ByDay = getTLL_TNN_TNL_DNTT_ByDay.Temp_Nuocnong,
            TNL_ByDay = getTLL_TNN_TNL_DNTT_ByDay.Temp_Nuoclanh,
            DNTT_ByDay = getTLL_TNN_TNL_DNTT_ByDay.DienNangTieuThu;

        let TLTK_ByDay = calculateTLTK(HeSo1, getHSProject.HeSoTinhToan,
            TLL_ByDay, TNN_ByDay, TNL_ByDay, DNTT_ByDay, null, null);

        //TLTK BY MONTH
        let TLL_ByMonth = TLL_BYMonth,
            TNN_ByMonth = getTLL_TNN_TNL_DNTT_ByMonth.TNN_BYMONTH,
            TNL_ByMonth = getTLL_TNN_TNL_DNTT_ByMonth.TNL_BYMONTH,
            DNTT_ByMonth = DNTT_BYMonth,
            ROW_NN = getTLL_TNN_TNL_DNTT_ByMonth.ROW_NN,
            ROW_NL = getTLL_TNN_TNL_DNTT_ByMonth.ROW_NL;

        let TLTK_ByMonth = calculateTLTK(HeSo1, getHSProject.HeSoTinhToan,
            TLL_ByMonth, TNN_ByMonth, TNL_ByMonth, DNTT_ByMonth, ROW_NN, ROW_NL);

        //READY DATA RESPONSE
        let getData = {
            A0: getDataLog.A0,
            A1: getDataLog.A1,
            A3: getDataLog.A3,
            NLTK_ByMonth: getSumByMonth.NLTK_MONTH,
            TLL_ByMonth: TLL_BYMonth,
            TLL_ByTotal: getSumTotal.TLL_TOTAL,
            NLTK_ByTotal: getSumTotal.NLTK_TOTAL,
            CPTK_ByMonth: CPTK_ByMonth,
            CPTK_ByTotal: CPTK_ByTotal,
            TLTK_ByDay: TLTK_ByDay,
            TLTK_ByMonth: TLTK_ByMonth,
            FullnameProject: getFullNameProject.Fullname
        }
        Response.status(200).json({
            message: `Get overview data successful`,
            data: getData
        });
        let timeDone = new Date().getTime();
        console.log({ runIn: `${timeDone - timeStart}(ms)` });

    } catch (err) {
        console.log(err);
        Response.status(500).json({
            message: `Không có dữ liệu`
        })
    }
}

let getStatisticChart = async (Request, Response) => {
    let timeStart = new Date().getTime();
    let table = JSON.parse(Request.headers.table);
    //demo table data
    let demoTableName = table.tableReport,
        demoTableName_log = table.tableLog,
        demoPersonID = table.PersonID;

    try {
        //QUERY GET RECENT DATE RECORD STT

        const queryGetRecentSTT = await sqlPool_SWH.request()
            .query(`SELECT TOP 1 STT FROM ${demoTableName}
        WHERE (Nam='${year}') AND (Thang='${month}') AND (Ngay='${days}') 
        AND (ThoiDiem LIKE N'%Tổng cộng%')`)

        //QUERY GET YESTERDAY RECORD STT
        const queryGetYesterdaySTT = await sqlPool_SWH.request()
            .query(`SELECT TOP 1 STT FROM ${demoTableName}
        WHERE (Nam='${yearOfYesterday}') AND (Thang='${monthOfYesterday}') AND (Ngay='${dayOfYesterday}') 
        AND (ThoiDiem LIKE N'%Tổng cộng%')`)

        //GET RECENT AND YESTERDAY DATE STT
        let recentSTT = queryGetRecentSTT.recordset[0].STT,
            yesterdaySTT = queryGetYesterdaySTT.recordset[0].STT;
        // console.log(yesterdaySTT);

        //QUERY TongLuuLuong BY 30 DAYS FROM RECENT DATE
        const queryGetRecord30DaysFromRecent = await sqlPool_SWH.request()
            .query(`SELECT TOP 31 Ngay, Thang, Nam, TongLuuLuong, NangLuongTietKiem
    FROM ${demoTableName} WHERE (CONVERT(INT, STT)<=${recentSTT}) 
    AND (ThoiDiem LIKE N'%Tổng cộng%') ORDER BY STT DESC`);

        //QUERY Temp_Nuocnong, Temp_Nuoclanh, DienNangTieuThu 
        const queryGetRecord30DaysFromYesterday = await sqlPool_SWH.request()
            .query(`SELECT TOP 31 Ngay, Thang, Nam, TongLuuLuong,
        Temp_Nuocnong, Temp_Nuoclanh, DienNangTieuThu FROM ${demoTableName}
        WHERE (CONVERT(INT, STT)<=${yesterdaySTT}) 
        AND (ThoiDiem LIKE N'%Tổng cộng%') ORDER BY STT DESC`)

        //QUERY HESO(2) PROJECT
        const queryGetHSProject = await sqlPool_SWH.request()
            .query(`SELECT TOP 1 HeSoTinhToan FROM tb_ProjectInfo WHERE PersonID='${demoPersonID}'`);

        //GET QUERY RESULT
        let getTLL_NLTK_30days = queryGetRecord30DaysFromRecent.recordset,
            getTNN_TNL_DNTT_30days = queryGetRecord30DaysFromYesterday.recordset,
            getHSProject = queryGetHSProject.recordset[0].HeSoTinhToan,
            TLL_NLTK_30Days = arrayToOrderArray(getTLL_NLTK_30days);
        let TLTK_30Days = dataArrToTLTKArr(getTNN_TNL_DNTT_30days, HeSo1, getHSProject);

        Response.status(200).json({
            message: `Get statistic chart successful`,
            data: {
                TLL: TLL_NLTK_30Days.TongLuuLuong,
                NLTK: TLL_NLTK_30Days.NangLuongTietKiem,
                TLTK: TLTK_30Days
            }
        });
        let timeDone = new Date().getTime();
        console.log({ runIn: `${timeDone - timeStart}(ms)` });

    } catch (err) {
        console.log(err);
        Response.status(500).json({
            message: `Không có dữ liệu`
        })
    }

}

//HEAVY QUERY RIGHT HERE
let getSystemData = async (Request, Response) => {
    //Demo table data
    let getTimeStart = new Date().getTime();

    let table = JSON.parse(Request.headers.table);
    let demoTableName = table.tableReport;
    let demoTableName_log = table.tableLog;
    let demoPersonID = table.PersonID;
    // let otherOperateParam = table.paramArr;
    let numberGen = table.numberGen;

    try {
        let otherOperateParam = await Compare(table.paramArr, table.PersonID);
        let tableParams = await Compare(Request.body.paramArr, table.PersonID);
        //
        let paramArr = Request.body.paramArr,
            fromDate =
                datetimeStringtoDatetime(Request.body.fromDate),
            toDate =
                datetimeStringtoDatetime(Request.body.toDate),
            trim = paramArr.substring(1, paramArr.length - 1);

        console.log({ f: fromDate, t: toDate });


        const queryGetData = await sqlPool_SWH.request()
            .query(`SELECT ${trim}, CurrentDate
        FROM ${demoTableName_log} WHERE 
        (CONVERT(datetime,CurrentDate,103) >= '${fromDate}') and
        (CONVERT(datetime,CurrentDate,103) <= '${toDate}')
        ORDER BY STT ASC`);

        //GET QUERY RESULT
        let getData = queryGetData.recordset;

        Response.status(200).json({
            message: `get system data successful`,
            data: getData,
            tableParams: tableParams.concat([{ 'CurrentDate': 'Ngày' }]),
            user: {
                paramArr: otherOperateParam,
                numberGen: numberGen
            }
        });
        let timeDone = new Date().getTime();
        console.log({
            runIn: `${timeDone - getTimeStart}(ms)`
        });

    } catch (err) {
        console.log(err);
        Response.status(500).json({
            message: `Không có dữ liệu`
        })
    }
}

let getReportByMonth = async (Request, Response) => {
    let timeStart = new Date().getTime();
    //Demo table data
    let table = JSON.parse(Request.headers.table);
    let demoTableName = table.tableReport;
    let demoTableName_log = table.tableLog;
    let demoPersonID = table.PersonID;
    try {
        //
        let Nam = Request.body.Nam,
            Thang = Request.body.Thang;
        console.log({ n: Nam, t: Thang })

        //QUERY REPORT DATA BY MONTH
        const queryGetDataByMonth = await sqlPool_SWH.request()
            .query(`SELECT Date, ThoiDiem, TongLuuLuong, 
    Temp_Nuoclanh, Temp_Nuocnong, DienNangTieuThu, NangLuongTietKiem
    FROM ${demoTableName} WHERE (Nam='${Nam}') AND (Thang='${Thang}')
    ORDER BY STT ASC`);

        //GET QUERY RESULT
        let getDataByMonth = queryGetDataByMonth.recordset;

        Response.status(200).json({
            message: `Get report data successful`,
            data: getDataByMonth
        })

        let timeDone = new Date().getTime();
        console.log({ runIn: `${timeDone - timeStart}(ms)` });

    } catch (err) {
        console.log(err);
        Response.status(500).json({
            message: `Không có dữ liệu`
        })
    }
}

let getOtherParams = async (Request, Response) => {
    let timeStart = new Date().getTime();
    //demo table data
    let table = JSON.parse(Request.headers.table);
    let demoTableName = table.tableReport;
    let demoTableName_log = table.tableLog;
    let demoPersonID = table.PersonID;
    try {
        //
        let recentDate = new Date();
        let fromDate = new Date(Request.body.fromDate),
            toDate = new Date(Request.body.toDate);

        let checkedFromDate,
            checkedToDate
        if (fromDate > recentDate) {
            checkedFromDate = recentDate
        } else {
            checkedFromDate = fromDate
        }

        if (toDate > recentDate) {
            checkedToDate = recentDate
        } else {
            checkedToDate = toDate
        }

        let timeRunArr = Request.body.timeRunArr,
            fromDay = ('0' + checkedFromDate.getDate()).slice(-2),
            trim = timeRunArr.substring(1, timeRunArr.length - 1),
            fromMonth = ('0' + (checkedFromDate.getMonth() + 1)).slice(-2),
            fromYear = checkedFromDate.getFullYear(),
            toDay = ('0' + checkedToDate.getDate()).slice(-2),
            toMonth = ('0' + (checkedToDate.getMonth() + 1)).slice(-2),
            toYear = checkedToDate.getFullYear();


        // QUERY FIRST/LAST FLAG
        const queryGetFirstFlag = await sqlPool_SWH.request()
            .query(`SELECT TOP 1 STT FROM ${demoTableName}
    WHERE (Nam='${fromYear}') AND (Thang='${fromMonth}')
    AND (Ngay='${fromDay}') ORDER BY STT ASC`)

        const queryGetLastFlag = await sqlPool_SWH.request()
            .query(`SELECT TOP 1 STT FROM ${demoTableName}
    WHERE (Nam='${toYear}') AND (Thang='${toMonth}')
    AND (Ngay='${toDay}') ORDER BY STT DESC`)

        // console.log(queryGetFirstFlag, queryGetLastFlag)
        //GET QUERY FLAGS RESULT
        let getSttFirstFlag = queryGetFirstFlag.recordset[0].STT,
            getSttLastFlag = queryGetLastFlag.recordset[0].STT;
        console.log({
            f: getSttFirstFlag,
            l: getSttLastFlag
        })
        //GET QUERY OTHER PARAMS
        const queryGetOtherParam = await sqlPool_SWH.request()
            .query(`SELECT ${trim}, Date, ThoiDiem FROM ${demoTableName}
        WHERE (STT >= ${getSttFirstFlag}) AND (STT <= ${getSttLastFlag})
        ORDER BY STT ASC`)

        //GET QUERY OTHER PARAMS RESULT
        let getOtherParams = queryGetOtherParam.recordset;

        Response.status(200).json({
            message: `get other params successful`,
            data: getOtherParams
        })

        let timeDone = new Date().getTime();
        console.log({ runIn: `${timeDone - timeStart}(ms)` });

    } catch (err) {
        console.log(err);
        Response.status(500).json({
            message: `Không có dữ liệu`
        });
    }
}

//small func
//FUNC CALCULATE CPTK BY MONTH - BY THOIDIEM / BY TOTAL - BY THOIDIEM
function calculateCPTK(GT_CD, GT_BT, GT_TD, NLTK_CD, NLTK_BT, NLTK_TD) {
    let CPTK_CD = round2Decimals(GT_CD * NLTK_CD),
        CPTK_BT = round2Decimals(GT_BT * NLTK_BT),
        CPTK_TD = round2Decimals(GT_TD * NLTK_TD),
        CPTK = round2Decimals(CPTK_CD + CPTK_BT + CPTK_TD) || 0;
    return CPTK;
}

//FUNC CALCULATE TLTK BY DAY/ BY MONTH
function calculateTLTK(heso1, heso2, TLL, TNN, TNL, DNTT, ROW_NN, ROW_NL) {
    let TNN_cal,
        TNL_cal;
    if (ROW_NN == null && ROW_NL == null) {
        TNN_cal = TNN;
        TNL_cal = TNL;
    } else {
        TNN_cal = round2Decimals(TNN / ROW_NN);
        TNL_cal = round2Decimals(TNL / ROW_NL);
    }

    let HS1 = Number(heso1),
        HS2 = Number(heso2),
        TT_1 = round2Decimals((TLL * HS1 * (TNN_cal - TNL_cal)) / (3600 * HS2)),
        TT_2 = round2Decimals(TT_1 - DNTT),
        TLTK = round2Decimals((TT_2 / TT_1) * 100) || 0,
        TLTK_Checked;
    if (TLTK <= 0) {
        TLTK_Checked = 0;
    } else {
        TLTK_Checked = TLTK;
    }

    return Math.round(TLTK_Checked);
}

//FUNC PARSE STRING TO NUMBER AND ROUND 2 DECIMALS
function round2Decimals(number) {
    let parse = Math.round((Number(number) + Number.EPSILON) * 100) / 100;
    return parse
}

//FUNC SPLIT ARRAY TO SPECIFIC ORDER ARRAY
function arrayToOrderArray(arr) {
    let tllArr = [],
        nltkArr = [];
    arr.forEach(element => {
        tllArr.push({
            Date: `${element.Ngay}/${element.Thang}/${element.Nam}`,
            TongLuuLuong: Number(element.TongLuuLuong)
        });
        nltkArr.push({
            Date: `${element.Ngay}/${element.Thang}/${element.Nam}`,
            NangLuongTietKiem: Number(element.NangLuongTietKiem)
        });
    });

    return {
        TongLuuLuong: tllArr,
        NangLuongTietKiem: nltkArr
    }
}

//HANDLE ARRAY CALCULATE TLTK
function dataArrToTLTKArr(arr, heso1, heso2) {
    let HS1 = Number(heso1),
        HS2 = Number(heso2),
        tltkArr = [];

    arr.forEach(ele => {
        let TLTK_Day = calculateTLTK(HS1, HS2, ele.TongLuuLuong,
            ele.Temp_Nuocnong, ele.Temp_Nuoclanh, ele.DienNangTieuThu, null, null);
        let converDate = new Date(`${ele.Nam}/${ele.Thang}/${ele.Ngay}`),
            addDay = converDate.setDate(converDate.getDate() + 1),
            next = new Date(addDay),
            nextDay = ('0' + next.getDate()).slice(-2),
            nextDayMonth = ("0" + (next.getMonth() + 1)).slice(-2),
            nextDayYear = next.getFullYear().toString();

        tltkArr.push({
            Date: `${nextDay}/${nextDayMonth}/${nextDayYear}`,
            TyLeTietKiem: TLTK_Day
        });
    });
    return tltkArr
}


let downloadExcelFile = async (Request, Response) => {
    try {
        let table = JSON.parse(Request.headers.table),
            tableReport = table.tableReport,
            Thang = Request.query.Thang,
            Nam = Request.query.Nam,
            arrRowNum = JSON.parse(table.excelArrRow),
            PersonID = table.PersonID,
            col = JSON.parse(table.excelArrColumn),
            templateName = table.templateName;

        if (table.templateName == null) {
            Response.status(409).json({
                message: `Project don't have template`
            })
        } else {
            // Ready col data
            let dataTable = col.TableData,
                monthTable = col.TableMonth,
                dayTable = col.TableDay,
                HoaDon = col.HoaDon;

            let dateInMonth = new Date(Nam, Thang, 0).getDate();

            let queryData = await sqlPool_SWH.request()
                .query(`SELECT Date, Ma_ThoiDiem, ThoiDiem, TongLuuLuong, Temp_Nuoclanh,
    Temp_Nuocnong, DienNangTieuThu, NangLuongTietKiem FROM ${tableReport}
    WHERE Nam='${Nam}' AND Thang='${Thang}' ORDER BY STT ASC`)

            let queryDataHeSo = await sqlPool_SWH.request().query(
                `SELECT HeSoTinhToan, GiaCD, GiaBT, GiaTD FROM tb_ProjectInfo WHERE
        PersonID='${PersonID}'`
            )

            let getData = queryData.recordset;
            let getDataHeSo = queryDataHeSo.recordset[0];

            let temp_path = path.join(__dirname, 'templates', `Template-${templateName}.xlsx`);
            let write_path = path.join(__dirname, 'templates', `Thong-ke-${templateName}-Thang-${Thang}-Nam-${Nam}.xlsx`);
            workbook.xlsx.readFile(temp_path).then(function (file) {
                // console.log(file);
                let rowNCheck;
                if (templateName == 'WINDSOR') {
                    rowNCheck = 44;
                } else {
                    rowNCheck = 12;
                }
                let worksheet = file.getWorksheet(1),
                    rowN = rowNCheck,
                    rowDays = worksheet.getRow(arrRowNum[0]),
                    rowTLTK = worksheet.getRow(arrRowNum[1]),
                    rowHDTT_CD = worksheet.getRow(arrRowNum[2]),
                    rowHDTT_BT = worksheet.getRow(arrRowNum[3]),
                    rowHDTT_TD = worksheet.getRow(arrRowNum[4]),
                    rowTTK = worksheet.getRow(arrRowNum[5]),
                    rowTTCK = worksheet.getRow(arrRowNum[6]),
                    rowCSTK = worksheet.getRow(arrRowNum[7]),
                    rowSTTT = worksheet.getRow(arrRowNum[8]),
                    rowGTGT = worksheet.getRow(arrRowNum[9]),
                    rowTCTT = worksheet.getRow(arrRowNum[10]);

                getData.forEach(element => {
                    let row = worksheet.getRow(rowN++);
                    if (element.ThoiDiem != 'Tổng cộng') {
                        row.getCell(dataTable[0]).value = element.Date;
                        row.getCell(dataTable[1]).value = element.Ma_ThoiDiem;
                        row.getCell(dataTable[2]).value = element.ThoiDiem;
                        row.getCell(dataTable[3]).value = element.TongLuuLuong;
                        row.getCell(dataTable[4]).value = element.Temp_Nuoclanh;
                        row.getCell(dataTable[5]).value = element.Temp_Nuocnong;
                        row.getCell(dataTable[6]).value = element.DienNangTieuThu;
                        row.getCell(dataTable[7]).value = element.NangLuongTietKiem;
                        //Update Hệ số thời điểm
                        let cell;
                        if (element.Ma_ThoiDiem == 'BT') {
                            cell = dataTable[9];
                            row.getCell(cell).value = getDataHeSo.GiaBT;
                        } else if (element.Ma_ThoiDiem == 'CD') {
                            cell = dataTable[8];
                            row.getCell(cell).value = getDataHeSo.GiaCD;
                        } else if (element.Ma_ThoiDiem == 'TD') {
                            cell = dataTable[10];
                            row.getCell(cell).value = getDataHeSo.GiaTD;
                        }
                        row.getCell(dataTable[11]).model.result = undefined;
                    } else {
                        row.getCell(dataTable[2]).value = element.ThoiDiem;
                        row.getCell(dataTable[11]).model.result = undefined;
                    }
                    row.commit();
                });

                rowDays.getCell(monthTable[0]).value = dateInMonth;
                //re-calculate 
                rowDays.getCell(monthTable[1]).model.result = undefined;
                rowDays.getCell(monthTable[2]).model.result = undefined;
                rowDays.getCell(monthTable[3]).model.result = undefined;
                rowDays.getCell(monthTable[4]).model.result = undefined;
                rowDays.getCell(monthTable[5]).model.result = undefined;
                rowDays.commit();

                //re-calculate TLTK
                rowTLTK.getCell(dayTable[0]).model.result = undefined;
                rowTLTK.getCell(dayTable[1]).model.result = undefined;
                rowTLTK.getCell(dayTable[2]).model.result = undefined;
                rowTLTK.getCell(dayTable[3]).model.result = undefined;
                rowTLTK.getCell(dayTable[4]).model.result = undefined;
                rowTLTK.getCell(dayTable[5]).model.result = undefined;
                rowTLTK.getCell(dayTable[6]).model.result = undefined;
                rowTLTK.commit();

                // Hóa đơn
                rowHDTT_CD.getCell(HoaDon[0]).model.result = undefined;
                rowHDTT_CD.getCell(HoaDon[1]).value = getDataHeSo.GiaCD
                rowHDTT_CD.getCell(HoaDon[2]).model.result = undefined;

                rowHDTT_BT.getCell(HoaDon[0]).model.result = undefined;
                rowHDTT_BT.getCell(HoaDon[1]).value = getDataHeSo.GiaBT;
                rowHDTT_BT.getCell(HoaDon[2]).model.result = undefined;

                rowHDTT_TD.getCell(HoaDon[0]).model.result = undefined;
                rowHDTT_TD.getCell(HoaDon[1]).value = getDataHeSo.GiaTD;
                rowHDTT_TD.getCell(HoaDon[2]).model.result = undefined;

                rowHDTT_CD.commit();
                rowHDTT_BT.commit();
                rowHDTT_TD.commit();

                rowTTK.getCell(HoaDon[2]).model.result = undefined;
                rowTTK.commit();

                rowTTCK.getCell(HoaDon[2]).model.result = undefined;
                rowTTCK.commit();

                rowCSTK.getCell(HoaDon[2]).model.result = undefined;
                rowCSTK.commit();

                rowSTTT.getCell(HoaDon[2]).model.result = undefined;
                rowSTTT.commit();

                rowGTGT.getCell(HoaDon[2]).model.result = undefined;
                rowGTGT.commit();

                rowTCTT.getCell(HoaDon[2]).model.result = undefined;
                rowTCTT.commit();

                workbook.xlsx.writeFile(write_path).then(() => {
                    Response.download(write_path, `Thong-ke-${templateName}-Thang-${Thang}-Nam-${Nam}.xlsx`,
                        (err) => {
                            if (err) {
                                console.log(err)
                                Response.status(500).json({
                                    message: `Có lỗi xảy ra`
                                });

                            }
                            else {
                                fs.unlinkSync(write_path);

                            }
                        });
                }).catch(err => {
                    console.log(err)
                    Response.status(409).json({
                        message: `Viết mẫu thất bại`
                    });

                });
            }).catch(err => {
                console.log(err)
                Response.status(409).json({
                    message: `Đọc mẫu thất bại`
                });

            });
        }
    } catch (err) {
        console.log(err)
        Response.status(500).json({
            message: `Tải xuống tập tin excel thất bại`
        })
    }
}

//HANDLE DATETIME STRING IN FORMAT "dd/mm/yyyy hh:mm AM/PM"
function datetimeStringtoDatetime(string) {
    let newDate = new Date(string);
    let convert = `${newDate.getFullYear()}-${newDate.getMonth() + 1}-${newDate.getDate()} ${newDate.getHours()}:${newDate.getMinutes()}:${newDate.getSeconds()}`;
    return convert;
}

//SPLIT TO SPECIFIC DAY MONTH YEAR
// function splitDateTimeString(string) {
//     let split = string.split('-');
//     return {
//         dd: split[2],
//         mm: split[1],
//         yyyy: split[0]
//     }
// }

let getFullYear = async (Request, Response) => {
    let table = JSON.parse(Request.headers.table);
    let tableReport = table.tableReport;

    try {

        let queryGetYear = await sqlPool_SWH.request()
            .query(`SELECT Nam FROM ${tableReport} GROUP BY Nam ORDER BY Nam ASC`)
        console.log(queryGetYear.recordset);
        Response.status(200).json({
            message: `Get year successful`,
            data: queryGetYear.recordset
        })
    } catch (err) {
        Response.status(500).json({
            message: `Không có dữ liệu`
        })
    }

}

let signalAndUpdateTime = async (Request, Response) => {
    let table = JSON.parse(Request.headers.table),
        tableLog = table.tableLog;
    try {

        let querySignalTime = await sqlPool_SWH.request()
            .query(`SELECT TOP 1 CurrentDate, SoLanLap FROM ${tableLog} ORDER BY STT DESC`);

        let getData = querySignalTime.recordset[0];
        Response.status(200).json({
            message: `Get time and signal successful`,
            data: getData
        });

    } catch (err) {
        Response.status(500).json({
            message: `Không có dữ liệu`
        });
    }
}

module.exports = {
    loginAuth: loginAuth,
    logOut: logOut,
    getSystemStatus: getSystemStatus,
    getOverView: getOverView,
    getStatisticChart: getStatisticChart,
    getSystemData: getSystemData,
    getReportByMonth: getReportByMonth,
    getOtherParams: getOtherParams,
    RefreshToken: RefreshToken,
    getFullYear: getFullYear,
    signalAndUpdateTime: signalAndUpdateTime,
    downloadExcelFile: downloadExcelFile,
    powerTrackPlatformAuth: powerTrackPlatformAuth,
    refreshPowerTrackToken: refreshPowerTrackToken,
    changePass: changePass,
    adminAuthLogin: adminAuthLogin,
    getAdminInfoProject: getAdminInfoProject,
    logOutAdmin: logOutAdmin,
    logStation: logStation,
    logStationDetail: logStationDetail,
    projectDetail: projectDetail,
    projectTypeSelect: projectTypeSelect,
    systemStatusTotal: systemStatusTotal,
    projectInfoByType: projectInfoByType,
    searchProject: searchProject,
    editViewProjectInfo: editViewProjectInfo,
    updateProjectInfo: updateProjectInfo,
    updateModuleInfo: updateModuleInfo,
    updatePasswordInfo: updatePasswordInfo,
    updateLatLongInfo: updateLatLongInfo,
    addNewModule: addNewModule,
    deleteModule: deleteModule,
    editDeleteProject: editDeleteProject,
    selecteBox: selecteBox,
    parentAccountInfo: parentAccountInfo,
    parentProjectList: parentProjectList,
    logOutParent: logOutParent,
    getHiddenProject: getHiddenProject,
    addHiddenProject: addHiddenProject,
    restoreProjectHidden: restoreProjectHidden
}
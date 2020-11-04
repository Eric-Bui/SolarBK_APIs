require('dotenv').config();

//REDIS
let redis = require('redis');

//query string
let qs = require('querystring');

let sql = require('mssql');

//REDIS CONFIG
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const client_redis = redis.createClient(REDIS_PORT, REDIS_HOST);

//Oauth2 host
let oauth2_host = process.env.OAUTH2_HOST || 'https://icms.solarbk.vn/oauth2';

//Oauth2 client
let client_id = process.env.CLIENT_ID || 2,
    client_token = process.env.CLIENT_TOKEN || `LolMPgWFZcmVq0edNmeiCBghVqETp2XdwYMXiUnJ40dMgLKit76o857SOBmOjnKt`,
    grant_type = process.env.GRANT_TYPE || `refresh_token`

//AXIOS
let axios = require('axios');

//CONNECT DATABASE
const { sqlPool_SWH, sqlPool_PV } = require('../controllers/connectDB');

let jwt = require('jsonwebtoken');
let crypto = require('crypto');
let btoa = require('btoa');

let middlewareLogin = async (Request, Response, next) => {
    let authToken = Request.headers['authorization']
        || Request.headers['x-access-token'];
    if (authToken) {
        Response.status(409).json({
            message: `Người dùng đã đăng nhập`
        })
    } else {
        let username = Request.body.username,
            password = Request.body.password
        if (username == null || password == null) {
            Response.status(409).json({
                message: `Thông tin đăng nhập người dùng không hợp lệ`
            })
        } else if (username != null && password != null) {
            try {
                let user =
                    await sqlPool_SWH.request().query(`SELECT * FROM tb_Cl_Person WHERE PersonID = '${username}' `);
                let testLngth = user.recordset.length;
                if (testLngth == 0) {
                    Response.status(409).json({
                        message: `Tên tài khoản không tồn tại`
                    });
                } else {
                    if (Request.body.admin == true) {
                        let access_token = Request.body.password
                        let configHeaderGet = {
                            headers: {
                                'Authorization': 'Bearer ' + access_token
                            }
                        }
                        axios.get(`${oauth2_host}/api/profile`, configHeaderGet)
                            .then(response => {
                                let { username, id } = response.data;
                                client_redis.get(`${id}_${username}_accessToken`, (err, decoded) => {
                                    if (err) {
                                        Response.status(500).json({
                                            message: `Lỗi xảy ra khi lấy access token`
                                        });
                                    } else {
                                        if (decoded === null) {
                                            Response.status(409).json({
                                                message: `Admin token đã hết hạn`
                                            })
                                        } else {
                                            let accTok = JSON.parse(decoded).access_token
                                            if (access_token === accTok) {
                                                let userInfo = user.recordset;
                                                let payload = {
                                                    PersonID: userInfo[0].PersonID,
                                                    userName: userInfo[0].Name,
                                                    kindCustomer: userInfo[0].KindCustomer
                                                }
                                                Request.headers.user = payload;
                                                next();
                                            } else {
                                                Response.status(403).json({
                                                    message: `Mật khẩu Admin để đăng nhập vào dự án không hợp lệ`
                                                });
                                            }
                                        }
                                    }
                                })
                            }).catch(err => {
                                console.log(err)
                                Response.status(500).json({
                                    message: `Lỗi kiểm tra thao tác hệ thống`
                                });
                            })
                    } else if (Request.body.parent == true) {
                        let access_token = Request.body.password
                        client_redis.get(`${access_token}_accessToken_parent`, (err, decoded) => {
                            if (err) {
                                Response.status(500).json({
                                    message: `Parent access token đã hết hạn`
                                });
                            } else {
                                if (decoded === null) {
                                    Response.status(409).json({
                                        message: `Parent access token đã hết hạn`
                                    })
                                } else {
                                    let accTok = JSON.parse(decoded).token
                                    if (access_token === accTok) {
                                        let userInfo = user.recordset;
                                        let payload = {
                                            PersonID: userInfo[0].PersonID,
                                            userName: userInfo[0].Name,
                                            kindCustomer: userInfo[0].KindCustomer
                                        }
                                        // console.log(payload)
                                        Request.headers.user = payload;
                                        next();
                                    } else {
                                        Response.status(403).json({
                                            message: `Mật khẩu Parent để đăng nhập dự án không hợp lệ`
                                        });
                                    }
                                }
                            }
                        })
                    } 
                    else {
                        let Upassword = user.recordset[0].Password;
                        let checkPass = comparePassword(password, Upassword);
                        // console.log(Upassword);
                        if (checkPass == false) {
                            Response.status(409).json({
                                message: `Sai mật khẩu`
                            })
                        } else {
                            let userInfo = user.recordset;
                            let payload = {
                                PersonID: userInfo[0].PersonID,
                                userName: userInfo[0].Name,
                                kindCustomer: userInfo[0].KindCustomer
                            }
                            Request.headers.user = payload;
                            next();
                        }
                    }
                }
            } catch (err) {
                console.log(err);
                Response.status(500).json({
                    message: `Lỗi kiểm tra thao tác hệ thống`
                })
            }
        }
    }
}

let adminAuth = (Request, Response, next) => {
    let { access_token, refresh_token } = Request.body;
    let configHeaderGet = {
        headers: {
            'Authorization': 'Bearer ' + access_token
        }
    }
    axios.get(`${oauth2_host}/api/profile`, configHeaderGet)
        .then(response => {
            if (response.data.error == 'Token expired') {
                //refresh token
                let optionAxios = {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    }
                };

                let requestBody = {
                    client_id: client_id,
                    client_token: client_token,
                    refresh_token: refresh_token,
                    grant_type: grant_type
                }

                axios.post(`${oauth2_host}/token`, qs.stringify(requestBody), optionAxios).then(refreshRes => {
                    let access_token_after_refresh = refreshRes.data.access_token;
                    let refresh_token_after_refresh = refreshRes.data.refresh_token;

                    let afterRefresh_configHeaderGet = {
                        headers: {
                            'Authorization': 'Bearer ' + access_token_after_refresh
                        }
                    }

                    axios.get(`${oauth2_host}/api/profile`, afterRefresh_configHeaderGet)
                        .then(afterRefreshGet => {
                            let { username, id } = afterRefreshGet.data;
                            Request.body = {
                                user_id: id,
                                username: username,
                                access_token: access_token_after_refresh,
                                refresh_token: refresh_token_after_refresh
                            }
                            next();
                        }).catch(err => {
                            console.log(err)
                            Response.status(500).json({
                                message: `Có lỗi xảy ra khi tái lấy dữ liệu người dùng`
                            })
                        })
                }).catch(err => {
                    console.log(err);
                    Response.status(500).json({
                        message: `Có lỗi xảy ra khi làm mới token Admin`
                    })
                })
            } else {
                let { username, id } = response.data
                Request.body = {
                    user_id: id,
                    username: username,
                    access_token: access_token,
                    refresh_token: refresh_token
                }
                next();
            }
        }).catch(err => {
            console.log(err)
            Response.status(500).json({
                message: `Lỗi kiểm tra thao tác hệ thống`
            })
        })

}

let checkAdminchangePass = async (Request, Response, next) => {
    try {
        let bodyPost = Request.body.dataPost;
        let oldPassword = bodyPost.oldpassword;
        let newPassword = bodyPost.newpassword;
        let PersonID = bodyPost.PersonID;

        if (oldPassword == newPassword) {
            Response.status(500).json({
                message: `Mật khẩu mới phải khác mật khẩu cũ`
            })
        } else {
            let queryPassword = await sqlPool_SWH.request()
                .input('PersonID', sql.NVarChar, PersonID)
                .query('SELECT Password FROM tb_Cl_Person WHERE PersonID = @PersonID');
            let getPassword = queryPassword.recordset[0].Password;

            let testPass = comparePassword(oldPassword, getPassword);
            if (testPass === true) {
                let newPassEnCode = generatePassword(newPassword);
                let newbody = Request.body.dataPost;
                newbody.newPassEnCode = newPassEnCode;
                newbody.newPassword = newPassword;
                Request.body = {
                    dataPost: newbody
                }
                next();
            } else {
                console.log('here')
                Response.status(500).json({
                    message: `Mật khẩu cũ không trùng khớp`
                })
            }
        }
    } catch (err) {
        console.log(err)
        Response.status(500).json({
            message: `Có lỗi xảy ra khi kiểm tra mật khẩu`
        })
    }
}

let checkDataChangePass = async (Request, Response, next) => {
    try {
        let { username, oldPassword, confirmOldPassword, newPassword, confirmNewPassword } = Request.body;
        if (oldPassword != confirmOldPassword) {
            Response.status(409).json({
                message: 'Mật khẩu cũ và xác nhận mật khẩu cũ không trùng khớp'
            })
        } else if (newPassword != confirmNewPassword) {
            Response.status(409).json({
                message: 'Mật khẩu mới và xác nhận mật khẩu mới không trùng khớp'
            })
        } else if (oldPassword == newPassword) {
            Response.status(409).json({
                message: 'Mật khẩu mới phải khác mật khẩu cũ'
            })
        } else {

            let queryUsername = await sqlPool_SWH.request().query(`SELECT * FROM tb_Cl_Person WHERE PersonID = '${username}'`);
            let getUsername = queryUsername.recordset
            if (getUsername.length == 0) {
                Response.status(409).json({
                    message: `Tên người dùng không tồn tại`
                });

            } else {
                let Upassword = getUsername[0].Password;
                let checkPass = comparePassword(oldPassword, Upassword);
                let newPassEnCode = generatePassword(newPassword);
                if (checkPass == false) {
                    Response.status(409).json({
                        message: `Sai mật khẩu`
                    });

                } else {
                    let payload = {
                        username: username,
                        newPassword: newPassword,
                        newPassEnCode: newPassEnCode
                    }
                    Request.body = payload;

                    next();
                }
            }
        }
    } catch (err) {
        Response.status(500).json({
            message: `Có lỗi xảy ra khi kiểm tra dữ liệu`
        });
    }
}

//#region generate password
let generatePassword = (newPassword) => {
    var byteArr = getByteArray(newPassword),
        b64String = arrayBufferToBase64(byteArr),
        byteArr2 = getByteArray(b64String),
        convertToBuffer = crypto.createHash('md5').update(byteToUint8Array(byteArr2)).digest(),
        lastPass = convertToBuffer.toString();
    return lastPass;
}

let fs = require('fs');
let comparePassword = (inputPassword, databasePass) => {
    var byteArr = getByteArray(inputPassword.trim()),
        b64String = arrayBufferToBase64(byteArr),
        byteArr2 = getByteArray(b64String),
        convertToBuffer = crypto.createHash('md5').update(byteToUint8Array(byteArr2)).digest(),
        lastPass = convertToBuffer.toString();
    // console.log(lastPass)
    let result = lastPass == databasePass;

    return result;
}

let byteToUint8Array = (byteArray) => {
    var uint8Array = new Uint8Array(byteArray.length);
    for (var i = 0; i < uint8Array.length; i++) {
        uint8Array[i] = byteArray[i];
    }

    return uint8Array;
}

let getByteArray = (string) => {
    var utf8 = unescape(encodeURIComponent(string));
    var arr = [];

    for (var i = 0; i < utf8.length; i++) {
        arr.push(utf8.charCodeAt(i));
    }
    return arr;
}

let arrayBufferToBase64 = (buffer) => {
    let binary = '';
    let bytes = new Uint8Array(buffer);
    let len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}
//#endregion

let checkTokenParent = (Request, Response, next) => {
    let token = Request.headers['authorization']
        || Request.headers['x-access-token'];
    if (!token) {
        Response.status(403).json({
            message: `Parent token là bắt buộc`
        })
    } else {
        client_redis.get(`${token}_accessToken_parent`, (err, accessTok) => {
            if (err) {
                Response.status(500).json({
                    message: `Có lỗi xảy ra khi kiểm tra token`
                })
            } else {
                if (accessTok == null) {
                    Response.status(409).json({
                        message: `Parent token đã hết hạn`
                    })
                } else {
                    let accessTokenParse = JSON.parse(accessTok).publicKey;
                    jwt.verify(token, accessTokenParse, { algorithms: ["RS256"] }, async (err, decoded) => {
                        if (err) {
                            Response.status(403).json({
                                message: 'Token không hợp lệ'
                            })
                        } else {
                            Request.headers.user = JSON.stringify({
                                PersonID: decoded.PersonID,
                                userName: decoded.userName
                            })
                            next();
                        }
                    })
                }
            }
        })
    }
}

let checkToken = (Request, Response, next) => {
    let token = Request.headers['authorization']
        || Request.headers['x-access-token'];

    // let default lang if not exist
    let lang = Request.headers['x-language'];
    if (lang == null || lang == undefined) {
        Request.headers['x-language'] = 'vi';
    }

    if (!token) {
        Response.status(403).json({
            message: `Token là bắt buộc`
        })
    } else {
        client_redis.get(`${token}_accessToken`, (err, accessTok) => {
            if (err) {
                // console.log(err);
                Response.status(500).json({
                    message: `Có lỗi xảy ra khi kiểm tra token`
                })
            } else {
                if (accessTok == null) {
                    Response.status(409).json({
                        message: `Token đã hết hạn`
                    })
                } else {
                    let accessTokenParse = JSON.parse(accessTok).publicKey;
                    // console.log(accessTok);
                    jwt.verify(token, accessTokenParse, { algorithms: ["RS256"] }, async (err, decoded) => {
                        if (err) {
                            console.log(err);
                            Response.status(403).json({
                                message: `Token không hợp lệ`
                            })
                        } else {
                            let checkSerial;
                            if (Request.body.serial != null) {
                                checkSerial = `AND Serial = '${Request.body.serial}'`;
                            } else {
                                checkSerial = '';
                            }

                            let queryCheckSerialPerson = await sqlPool_SWH.request()
                                .query(`SELECT * FROM tb_ProjectInfo WHERE PersonID='${decoded.PersonID}' 
                                ${checkSerial}`);
                            let getCheckSerialPerson = queryCheckSerialPerson.recordset;
                            // console.log(decoded)
                            if (getCheckSerialPerson.length > 0) {
                                if (decoded.projectType == 'PV') {
                                    Request.headers.user = JSON.stringify({
                                        PersonID: decoded.PersonID,
                                        projectType: decoded.projectType,
                                        serial: decoded.Serial
                                    })
                                    next();
                                } else if (decoded.projectType == 'SWH') {
                                    try {

                                        let getTableName = await sqlPool_SWH.request()
                                            .query(`SELECT tableReport, tableLog, paramArr, numberGen,
                                    templateName, excelArrRow, excelArrColumn,
                                    statusParam FROM tb_tableName
                                    WHERE uID='${decoded.uID}'`),
                                            getRecordData = getTableName.recordset[0],
                                            tableReport = getRecordData.tableReport,
                                            tableLog = getRecordData.tableLog,
                                            paramArr = getRecordData.paramArr,
                                            numberGen = getRecordData.numberGen,
                                            templateName = getRecordData.templateName,
                                            excelArrRow = getRecordData.excelArrRow,
                                            excelArrColumn = getRecordData.excelArrColumn,
                                            statusParam = getRecordData.statusParam,
                                            PersonID = decoded.PersonID;

                                        Request.headers.table = JSON.stringify(
                                            {
                                                tableReport: tableReport, tableLog: tableLog, PersonID: PersonID,
                                                paramArr: paramArr, numberGen: numberGen,
                                                templateName: templateName, excelArrRow: excelArrRow,
                                                excelArrColumn: excelArrColumn, statusParam: statusParam
                                            }
                                        );
                                        next();
                                    } catch (err) {
                                        console.log(err);
                                        Response.status(409).json({
                                            message: `Kết nối với máy chủ đã ngắt, vui lòng tải lại trang`
                                        });
                                    }
                                }
                            } else {
                                Response.status(409).json({
                                    message: `Số Seri thuộc tài khoản này không tìm thấy`
                                })
                            }
                        }
                    })
                }
            }
        })

    }
}

let checkGetUser = (Request, Response) => {
    let token = Request.headers['authorization']
        || Request.headers['x-access-token'];
    if (!token) {
        Response.status(403).json({
            message: `Token là bắt buộc`
        })
    } else {
        client_redis.get(`${token}_accessToken`, (err, accessToken) => {
            if (err) {
                Response.status(500).json({
                    message: `Có lỗi xảy ra khi kiểm tra token`
                })
            } else {
                if (accessToken == null) {
                    Response.status(409).json({
                        message: `Token là bắt buộc`
                    })
                } else {
                    let publicKey = JSON.parse(accessToken).publicKey
                    jwt.verify(token, publicKey, { algorithms: ["RS256"] }, (err, decoded) => {
                        if (err) {
                            Response.status(500).json({
                                message: `Có lỗi xảy ra khi kiểm tra token`
                            })
                        } else {
                            Response.status(200).json({
                                message: `Check token and get user information successful`,
                                userName: decoded.userName,
                                projectType: decoded.projectType,
                                kindProject: decoded.kindProject,
                                Device: decoded.Device
                            })
                        }
                    })
                }
            }
        })
    }
}

let checkGetAdmin = (Request, Response, next) => {
    let token = Request.headers['authorization']
        || Request.headers['x-access-token'];
    let { id, username } = Request.body;
    if (!token) {
        Response.status(403).json({
            message: `Token là bắt buộc`
        })
    } else {
        let configHeaderGet = {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        }
        axios.get(`${oauth2_host}/api/profile`, configHeaderGet)
            .then(response => {
                if (response.data.error == 'Token expired') {
                    client_redis.get(`${id}_${username}_refreshToken`, (err, decode) => {
                        if (err) {
                            Response.status(409).json({
                                message: `Có lỗi xảy ra khi lấy refresh token`
                            })
                        } else {
                            if (JSON.parse(decode) === null) {
                                Response.status(409).json({
                                    message: `Refresh token đã hết hạn`
                                })
                            } else {
                                let refreshTok = JSON.parse(decode).refresh_token
                                //refresh token
                                let optionAxios = {
                                    headers: {
                                        "Content-Type": "application/x-www-form-urlencoded"
                                    }
                                };

                                let requestBody = {
                                    client_id: client_id,
                                    client_token: client_token,
                                    refresh_token: refreshTok,
                                    grant_type: grant_type
                                }

                                axios.post(`${oauth2_host}/token`, qs.stringify(requestBody), optionAxios)
                                    .then(refreshRes => {
                                        let access_token_after_refresh = refreshRes.data.access_token;
                                        let refresh_token_after_refresh = refreshRes.data.refresh_token;

                                        let afterRefresh_configHeaderGet = {
                                            headers: {
                                                'Authorization': 'Bearer ' + access_token_after_refresh
                                            }
                                        }

                                        axios.get(`${oauth2_host}/api/profile`, afterRefresh_configHeaderGet)
                                            .then(afterRefreshGet => {
                                                Request.body = {
                                                    dataPost: Request.body,
                                                    userinfo: afterRefreshGet.data,
                                                    token: {
                                                        access_token: access_token_after_refresh,
                                                        refresh_token: refresh_token_after_refresh
                                                    }
                                                }
                                                next();
                                            }).catch(err => {
                                                console.log(err)
                                                Response.status(409).json({
                                                    message: `Có lỗi xảy ra khi tái lấy thông tin người dùng`
                                                })
                                            })
                                    }).catch(err => {
                                        console.log(err)
                                        Response.status(409).json({
                                            message: `Có lỗi xảy ra khi làm mới token`
                                        })
                                    })
                            }
                        }
                    })
                } else {
                    Request.body = {
                        dataPost: Request.body,
                        userinfo: response.data,
                        access_token: token
                    }
                    next();
                }
            }).catch(err => {
                // console.log(err)
                Response.status(500).json({
                    message: `Lỗi kiểm tra thao tác hệ thống`
                })
            })
    }
}

const moment = require('moment');
let limitRequestInTime = (Request, Response, next) => {
    let ipAddress = Request.headers['x-forwarded-for'] || Request.connection.remoteAddress;
    client_redis.get(`${ipAddress}_limit`, (err, data) => {
        if (err) {
            Response.status(500).json({
                message: `Something went wrong when checking limit request`
            })
        } else {
            if (data != null) {
                let dataParse = JSON.parse(data);
                let expireTime = dataParse.expireTime,
                    requestAttemp = dataParse.requestAttemp;
                if (new Date().getTime() < new Date(expireTime).getTime()) {
                    if (requestAttemp < 50) {
                        let newAttemp = requestAttemp + 1;
                        let dataRedisUpdate = {
                            expireTime: expireTime,
                            requestAttemp: newAttemp
                        }
                        client_redis.setex(`${ipAddress}_limit`, 60 * 60 * 24 * 90,
                            JSON.stringify(dataRedisUpdate));
                        next();
                    } else if (requestAttemp >= 50) {
                        Response.status(409).json({
                            message: `Reach limit request attemp`
                        })
                    } else {
                        Response.status(500).json({
                            message: `Something went wrong when checking limit request`
                        })
                    }
                } else {
                    client_redis.del(`${ipAddress}_limit`);
                    next();
                }
            } else {
                let dataRedis = {
                    expireTime: moment().add(15, 'm').toDate(),
                    requestAttemp: 1
                }
                client_redis.setex(`${ipAddress}_limit`, 60 * 60 * 24 * 90, JSON.stringify(dataRedis));
                next();
            }
        }
    });
}

let checkTokenPowertrackFlatfrom = (Request, Response, next) => {
    let token = Request.headers['authorization']
        || Request.headers['x-access-token'];

    let ipAddress = Request.headers['x-forwarded-for']
        || Request.connection.remoteAddress;

    if (!token) {
        Response.status(403).json({
            message: `Token required`
        })
    } else {
        client_redis.get(`${token}_accessToken_powerTrack`, (err, accessTok) => {
            if (err) {
                Response.status(500).json({
                    message: `Something went wrong when checking token`
                })
            } else {
                if (accessTok === null) {
                    Response.status(409).json({
                        message: `Token expired`
                    })
                } else {
                    let publicKey = JSON.parse(accessTok).publicKey
                    jwt.verify(token, publicKey, { algorithms: ["RS256"] }, (err, decoded) => {
                        if (err) {
                            Response.status(500).json({
                                message: `Invalid token`
                            })
                        } else {
                            let ip = decoded.ip;
                            if (ip != ipAddress) {
                                Response.status(401).json({
                                    message: `Ip does not match`
                                })
                            } else {
                                next();
                            }
                        }
                    })
                }
            }
        })
    }
}

let checkPermissionAction = async (Request, Response, next) => {
    try {
        let id = Request.body.userinfo.id;
        let username = Request.body.userinfo.username;

        let PersonID = Request.body.dataPost.PersonID;
        let actionType = Request.body.dataPost.actionType;

        //check type of project
        let queryProject = await sqlPool_SWH.request()
            .query(`SELECT TypeProject, Scale, Project FROM tb_ProjectInfo WHERE PersonID='${PersonID}'`);
        let getProject = queryProject.recordset[0];

        //PV QMGD 
        let pv_qmgd = ['pv', 'pv-swh']

        //pv QMCN
        let pv_qmcn = ['pv', 'ilight', 'pv-swh', 'overview', 'metter', 'hbr', 'rmia', 'lnb']

        //swh QMGD
        let swh_qmgd = ['istar']

        //swh QMCN
        let swh_qmcn = ['swh', 'isolarbk']

        let PermissionProject;
        if (getProject.TypeProject === 'DIRECT' && getProject.Scale === 2
            && pv_qmgd.includes(getProject.Project)) {
            PermissionProject = 'PV-QMGD'
        }

        if (pv_qmcn.includes(getProject.Project)) {
            PermissionProject = 'PV-QMCN'
        }

        if (swh_qmgd.includes(getProject.Project)) {
            PermissionProject = 'SWH-QMGD'
        }

        if (swh_qmcn.includes(getProject.Project)) {
            PermissionProject = 'SWH-QMCN'
        }

        let queryPermission = await sqlPool_SWH.request()
            .query(`SELECT I.id_permision
        ,I.PersonID
        ,I.licensed
        ,II.descript_permision
        ,III.action_code
        ,III.check_action
    FROM tb_AD_PersonPermision I
    inner join tb_AD_Permision II on I.id_permision = II.id_permision
    inner join tb_AD_PermisionDetail III on I.id_permision = III.id_permision
    where I.PersonID = '${username}' and II.descript_permision = '${PermissionProject}'
    and III.action_code = '${actionType}' and III.check_action = 1 `)

        let getPermission = queryPermission.recordset;

        if (getPermission === undefined) {
            Response.status(403).json({
                message: `Không có quyền để thực thi hành động này`
            })
        } else {
            Request.body = {
                dataPost: Request.body.dataPost,
                userinfo: {
                    id: id,
                    username: username
                }
            }
            next();
        }
    } catch (err) {
        console.log(err);
        Response.status(500).json({
            message: `Có lỗi xảy ra khi kiểm tra quyền thực thi hành động`
        })
    }
}

module.exports = {
    middlewareLogin: middlewareLogin,
    checkToken: checkToken,
    checkGetUser: checkGetUser,
    limitRequestInTime: limitRequestInTime,
    checkTokenPowertrackFlatfrom: checkTokenPowertrackFlatfrom,
    checkDataChangePass: checkDataChangePass,
    adminAuth: adminAuth,
    checkGetAdmin: checkGetAdmin,
    checkPermissionAction: checkPermissionAction,
    checkAdminchangePass: checkAdminchangePass,
    checkTokenParent: checkTokenParent
}
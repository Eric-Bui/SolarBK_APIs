## SSOC Manager APIs

### SWH Manager APIs

#### Install
```json
npm install
```

#### Run App
```json
npm start
```

#### Requirement
*   Node v10.16.1
*   NPM 6.9.0
*   Redis

#### Base URL
```json
BaseURL: "http://localhost:3000/swhapi"
```
#### Configure Database Connect
*   Path: '.../ultis/database_conf.js'

#### APIs

##### Login
*   URL: `BaseURL/login_auth`
*   Content-type: `application/json`
*   Method: `POST`
*   Request:
    *   Body:
    ```json
    {
        "username": STRING, //
        "password": STRING, //
    }
    ```
*   Response:
    *   [Success]
    *   Status: `200`
    ```json
    {
        "message": "Logged in successful",
        "token": STRING
    }
    ```
    *   [Fail]:
    *   Status: `409`
    ```json
    {
        "message": "User name not exist"
    }
    ```
    ---
    *   Status: `409`
    ```json
    {
        "message": "Wrong password"
    }
    ```
    ---
    *   Status: `500`
    ```json
    {
        "message": "Something went wrong"
    }
    ```

##### Logout
*   URL: `BaseURL/logout`
*   Content-type: `application/json`
*   Method: `GET`
*   Request: 
    *   headers:
    ```json
    {
        "authorization": STRING //TOKEN
    }
    ```
*   Response:
    *   [Success]:
    *   Status: `200`
    ```json
    {
        "message": "Logged out successful"
    }
    ```
    *   [Fail]:
    *   Status: `409`
    ```json
    {
        "message": "Already logged out"
    }
    ```
    ---
    *   Status: `500`
    ```json
    {
        "message": "Something went wrong"
    }
    ```

##### Overview
*   URL: `BaseURL/getoverview`
*   Content-type: `application/json`
*   Method: `POST`
*   Request:
    *   headers:
    ```json
    {
        "authorization": STRING //TOKEN
    }
    ```
*   Response:
    *   [Success]:
    *   Status: `200`
    ```json
    {
        "message": "Get overview data successful",
        "data": {
            "A0": NUMBER, // NHIỆT ĐỘ ĐẦU VÀO
            "A1": NUMBER, // NHIỆT ĐỘ ĐẦU RA
            "A3": NUMBER, // TỔNG LƯU LƯỢNG
            "NLTK_ByMonth": NUMBER, // NĂNG LƯỢNG TIẾT KIỆM THEO THÁNG
            "NLTK_ByTotal": NUMBER, // TỔNG NĂNG LƯỢNG TIẾT KIỆM
            "TLL_ByMonth": NUMBER, // LƯU LƯỢNG NƯỚC SỬ DỤNG THEO THÁNG
            "TLL_ByTotal": NUMBER, // TỔNG LƯU LƯỢNG NƯỚC SỬ DỤNG
            "CPTK_ByMonth": NUMBER, // CHI PHÍ TIẾT KIỆM THEO THÁNG
            "CPTK_ByTotal": NUMBER, // TỔNG CHI PHÍ TIẾT KIỆM
            "TLTK_ByDay": NUMBER, // TỶ LỆ TIẾT KIỆM THEO NGÀY
            "TLTK_ByMonth": NUMBER, // TỶ LỆ TIẾT KIỆM THEO THÁNG
            "FullnameProject": STRING, // TÊN DỰ ÁN
        }
    }
    ```
    *   [Fail]:
    *   Status: `500`
    ```json
    {
        "message": "Something went wrong"
    }
    ```

##### System status
*   URL: `BaseURL/getsystemstatus`
*   Content-type: `application/json`
*   Method: `POST`
*   Request:
    *   headers:
    ```json
    {
        "authorization": STRING //TOKEN
    }
    ```
    *   body:
    ```json
    {
        "dataID": STRING 
        //CHUỖI CHỨA CÁC TÊN BIẾN NGĂN CÁCH BỞI DẤU PHẨY KHÔNG CÓ KHOẢNG TRẮNG
    }
    ```
*   Response:
    *   Demo dataID String: `A4,A5,A8,A9`
    *   [Success]:
    *   Status: `200`
    ```json
    {
        "message": "Get system status successful",
        "data": {
            "A4": NUMBER, // NHIỆT ĐỘ TRÊN TẤM HỆ 1
            "A5": NUMBER, // NHIỆT ĐỘ TRÊN TẤM HỆ 2
            "A8": NUMBER, // NHIỆT ĐỘ ĐÁY BỒN SOLAR 1
            "A9": NUMBER, // NHIỆT ĐỘ ĐÁY BỒN SOLAR 2
            "CurrentDate": STRING //DD/MM/YYYY HH:MM:SS AM/PM
        }
    }
    ```
    *   [Fail]:
    *   Status: `500`
    ```json
    {
        "message": "Something went wrong"
    }
    ```

##### Thống kê và báo cáo
*   URL: `BaseURL/statisticchart`
*   Content-type: `application/json`
*   Method: `POST`
*   Request:
    *   headers:
    ```json
    {
        "authorization": STRING, //TOKEN
    }
    ```
*   Response:
    *   [Success]
    *   Status: `200`
    ```json
    {
        "message": "Get statistic chart successful",
        "data": {
            "TLL": [
                { "Date": STRING, "TongLuuLuong": NUMBER },
                //...
            ],
            "NLTK": [
                { "Date": STRING, "NangLuongTietKiem": NUMBER},
                //...
            ],
            "TLTK": [
                { "Date": STRING, "TyLeTietKiem": NUMBER },
                //...
            ]
        }
    }
    ```
    *   [Fail]
    *   Status: `500`
    ```json
    {
        "message": "Something went wrong"
    }
    ```

##### System data
*   URL: `BaseURL/getsystemdata`
*   Content-type: `application/json`
*   Method: `POST`
*   Request:
    *   headers:
    ```json
    {
        "authorization": STRING //TOKEN
    }
    ```
    *   body:
    ```json
    {
        "fromDate": STRING, // YYYY-MM-DDTHH:MM:SS+GMT
        "toDate": STRING, // YYYY-MM-DDTHH:MM:SS+GMT
        "paramArr": STRING, // ["A0", "A1", "A2", ...]
    }
    ```
*   Response:
    *   [Success];
    *   Status: `200`
    ```json
    {
        "message": "get system data successful",
        "data": [
            { "A0": NUMBER, "A1": NUMBER, "A2": NUMBER, "CurrentDate": STRING },
            //...
        ]
    }
    ```
    *   [Fail]:
    *   Status: `500`
    ```json
    {
        "message": "Something went wrong"
    }
    ```

##### Month report
*   URL: `BaseURL/getreportbymonth`
*   Content-type: `application/json`
*   Method: `POST`
*   Request:
    *   headers:
    ```json
    {
        "authorization": STRING //TOKEN
    }
    ```
    *   body:
    ```json
    {
        "Nam": STRING,
        "Thang": STRING
    }
    ```
*   Response:
    *   [Success]
    *   Status: `200`
    ```json
    {
        "message": "Get report data successful",
        "data": [
            {
                "Date": STRING, // DD/MM/YYYY
                "ThoiDiem": STRING,
                "TongLuuLuong": NUMBER,
                "Temp_Nuoclanh": NUMBER,
                "Temp_Nuocnong": NUMBER,
                "DienNangTieuThu": NUMBER,
                "NangLuongTietKiem": NUMBER
            }
            //...
        ]
    }
    ```
    *   [Fail]
    *   Status: `500`
    ```json
    {
        "message": "Something went wrong"
    }
    ```
##### Other params
*   URL: `BaseURL/getotherparam`
*   Content-type: `application/json`
*   Method: `POST`
*   Request:
    *   headers:
    ```json
    {
        "authorization": STRING //TOKEN
    }
    ```
    *   body:
    ```json
    {
        "fromDate": STRING, // YYYY-MM-DDTHH:MM:SS+GMT
        "toDate": STRING, // YYYY-MM-DDTHH:MM:SS+GMT
        "timeRunArr": STRING, // ["TimeRun_DoiLuu1", "TimeRun_TangAp1", "TimeRun_BomHoi1",...]
    }
    ```
*   Response:
    *   [Success]:
    *   Status: `200`
    ```json
    {
        "message": "get other params successful",
        "data": [
            { 
                "TimeRun_DoiLuu1": STRING, "TimeRun_TangAp1": STRING,
                "TimeRun_BomHoi1": STRING,
                "DATE": STRING,
                "ThoiDiem": STRING
            }
        ]
    }
    ```
    *   [Fail]:
    *   Status: `500`
    ```json
    {
        "message": "Something went wrong"
    }
    ```

##### Refresh token
*   URL: `BaseURL/refreshtoken`
*   Content-type: `application/json`
*   Method: `POST`
*   Request:
    *   headers:
    ```json
    {
        "authorization": STRING //TOKEN
    }
    ```
*   Response:
    *   [Success]:
    *   Status: `200`
    ```json
    {
        "message": "Refresh token successful",
        "token": STRING //NEW TOKEN
    }
    ```
    *   [Fail]:
    *   Status: `403`
    ```json
    {
        "message": "Token required"
    }
    ```
    ---
    *   Status: `409`
    ```json
    {
        "message": "Token not expire"
    }
    ```
    ---
    *   Status: `409`
    ```json
    {
        "message": "Refresh token expire"
    }
    ```
    ---
    *   Status: `403`
    ```json
    {
        "message": "Invalid token"
    }
    ```
    ---
    *   Status: `500`
    ```json
    {
        "message": "Something went wrong"
    }
    ```

##### Get project year
*   URL: `BaseURL/getfullyear`
*   Content-type: `application/json`
*   Method: `POST`
*   Request:
    *   headers:
    ```json
    {
        "authorization": STRING //TOKEN
    }
    ```
*   Response:
    *   [Success]:
    *   Status: `200`
    ```json
    {
        "message": "Get year successful",
        "data": [
            { "Nam": STRING }
            //...
        ]
    }
    ```
    *   [Fail]:
    *   Status: `500`
    ```json
    {
        "message": "Something went wrong"
    }
    ```

##### Export excel report
*   URL: `BaseURL/exportexcel`
*   Content-type: `application/json`
*   Method: `POST`
*   Request:
    *   headers:
    ```json
    {
        "authorization": STRING // TOKEN
    }
    ```
    *   body:
    ```json
    {
        "Nam": STRING,
        "Thang": STRING,
        "templateName": STRING,
        "arrRowNum": STRING //[235,241,263,...]
    }
    ```
*   Response:
    *   [Success]
    *   Content-type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
    *   Status: `200`
    ```json
    {
        "size": NUMBER, // FILE SIZE
        "type": STRING, // FILE TYPE
    }
    ```
    *   [Fail]
    *   Status: `409`
    ```json
    {
        "message": "Read template failed"
    }
    ```
    ---
    *   Status: `409`
    ```json
    {
        "message": "Wrtie template failed"
    }
    ```
    ---
    *   Status: `500`
    ```json
    {
        "message": "Something went wrong"
    }
    ```

#### PV Manager APIs
*   Base URL: `host/pvsofarapi`
##### Overview page
*   URL: `{baseURL}/userinfo`
*   Content-type: `application/json`
*   Method: `POST`
*   Request:
    *   headers:
    ```json
    {
        "authorization": STRING // TOKEN
    }
    ```
    *   body:
    ```json
    {
        "pvType": STRING // SOFAR || HUAWEI
    }
    ```
*   Response:
    *   [Success]
    *   Status: `200`
    *   Content-type: `application/json`
    ```json
    {
        "message": "Get user information successful",
        "data": {
            "Fullname": STRING,
            "TodayProduction": NUMBER,
            "TotalProduction": NUMBER,
            "listRecord": [
                // if pvtype = 'SOFAR'
                {
                    "Module": STRING,
                    "InverterID": NUMBER,
                    "A6": NUMBER,
                    "A8": NUMBER
                },
                // if pvtype = 'HUAWEI'
                {
                    "Module": STRING,
                    "InverterID": NUMBER,
                    "A14": NUMBER,
                    "A16": NUMBER
                }
            ],
            "weather": {
                "main": STRING,
                "description": STRING,
                "temp": NUMBER,
                "pressure": NUMBER,
                "humidity": NUMBER,
                "tempMin": NUMBER,
                "tempMax": NUMBER,
                "name": STRING,
                "icon": STRING
            },
            "price": NUMBER,
            "totalCarbon": NUMBER,
            "totalSaveMoney": NUMBER,
            "CSTT": {
                "TongCSTT": NUMBER,
                "fieldsCSTT": [
                    {"key": STRING, "label": STRING}
                    "..."
                ],
                "itemCSTT": [
                    {"TongCSTT": NUMBER, "TongCSLOAD": NUMBER}
                ],
                "CSTTArr": [
                    {"Module": STRING, "CSTT": NUMBER, "CS_LOAD": NUMBER}
                ]
            },
            "status": [
                {"Inverter": NUMBER, "count": NUMBER, "lastUpdate": STRING}
            ]
        }
    }
    ```
    *   [Fail]
    *   Status: `500`
    *   Content-type: `application/json`
    ```json
    {
        "message": "Something went wrong"
    }
    ```
##### Production chart
*   URL: `{baseURL}/production-chart`
*   Method: `GET`
*   Content-type: `application/json`
*   Request:
    *   headers:
        ```json
        {
            "authorization": STRING // TOKEN
        }
        ```
    *   query Params:
        ```json
        {
            "pvType": STRING // SOFAR || HUAWEI
        }
        ```
*   Response:
    *   [Success]
    *   Status: `200`
    *   Content-type: `application/json`
    ```json
    {
        "message": "Get production chart successful",
        "data": {
            "labels": [[ARRAY]],
            "chartData": [
                {
                    "label": STRING,
                    "backgroundColor": STRING,
                    "data": [ARRAY]
                }
                "..."
            ]
        }
    }
    ```
    *   [Fail]
    *   Status: `500`
    *   Content-type: `application/json`
    ```json
    {
        "message": "Something went wrong"
    }
    ```

##### PV Power Chart
*   URL: `{baseURL}/power-chart`
*   Method: `GET`
*   Content-type: `application/json`
*   Response:
    *   [Success]
    *   Status: `200`
    *   Content-type: `application/json`
    ```json
    {
        "message": "Get power PV chart successful",
        "labels": [[ARRAY]],
        "dataChart": [
            {"label": STRING, "borderColor": STRING, "data": [ARRAY], "fill": false}
        ]
    }
    ```

##### Page layout module
*   URL: `{baseURL}/module-info`
*   Method: `GET`
*   Content-type: `application/json`
*   Request:
    *   headers:
        ```json
        {
            "authorization": STRING // TOKEN
        }
        ```

*   Response:
    *   [Success]
    *   Status: `200`
    *   Content-type: `application/json`
    ```json
    {
        "message": "Get module info successful",
        "data": [
            {"Serial": STRING, "Module": STRING}
        ]
    }
    ```
    *   [Fail]
    *   Status: `500`
    *   Content-type: `application/json`
    ```json
    {
        "message": "Something went wrong"
    }
    ```

##### List log detail
*   URL: `{baseURL}/detail-table`
*   Method: `POST`
*   Content-type: `application/json`
*   Request:
    *   headers:
    ```json
    {
        "authorization": STRING // TOKEN
    }
    ```
    *   body:
    ```json
    {
        "serial": STRING,
        "fromDate": STRING, // yyyy-mm-dd HH:MM:SS
        "toDate": STRING, // yyyy-mm-dd HH:MM:SS
        "selected": [ARRAY],
        "pvType": STRING
    }
    ```
*   Response
    *   [Success]
    *   Status: `200`
    *   Content-type: `application/json`
    ```json
    {
        "message": "Get list log successful",
        "data": {
            "fields": [
                {"key": STRING, "label": STRING}
                "..."
            ],
            "tableData": [
                {
                    "SumPV": NUMBER,
                    "SumPLoad": NUMBER,
                    "Timer": NUMBER,
                    "TodayProduction": NUMBER,
                    "MetterEnergyComsumption": NUMBER,
                    "ENVTemp": NUMBER,
                    "PVTemp": NUMBER,
                    "TProduction": NUMBER,
                    "TotalProduction": NUMBER,
                    "CurrentDate": STRING,
                    "Serial": STRING,
                    "SessionID": STRING,
                    "Signal": STRING,
                    "BussinessMoneySaved": NUMBER,
                    "Production": NUMBER
                }
            ]
        }
    }
    ```
    *   [Fail]
    *   Status: `500`
    *   Content-type: `application/json`
    ```json
    {
        "message": "Something went wrong"
    }
    ```

##### Session Detail
*   URL: `{baseURL}/list-detail`
*   Method: `POST`
*   Content-type: `application/json`
*   Request
    *   headers
    ```json
    {
        "authorization": STRING // TOKEN
    }
    ```
    *   body
    ```json
    {
        "sessionID": STRING,
        "Serial": STRING,
        "pvType": STRING
    }
    ```
*   Response
    *   [Success]
    *   Status: `200`
    *   Content-type: `application/json`
    ```json
    {
        "message": "Get detail successful",
        "data": {
            "fields": [ARRAY],
            "dataTable": [
                //If pvType = SOFAR
                {
                    "CurrentDate": STRING,
                    "SessionID": STRING,
                    "InverterID": STRING,
                    "A6": NUMBER,
                    "A7": NUMBER,
                    "A8": NUMBER,
                    "A9": NUMBER,
                    "A10": NUMBER,
                    "A11": NUMBER,
                    "A12": NUMBER,
                    "A21": NUMBER,
                    "A23": NUMBER,
                    "PosEnergy": STRING
                },
                //If pvType = HUAWEI
                {
                    "A0": NUMBER,
                    "A1": NUMBER,
                    "A2": NUMBER,
                    "A3": NUMBER,
                    "A4": NUMBER,
                    "A5": NUMBER,
                    "A6": NUMBER,
                    "A7": NUMBER,
                    "A8": NUMBER,
                    "A9": NUMBER,
                    "A10": NUMBER,
                    "A11": NUMBER,
                    "A12": NUMBER,
                    "A13": NUMBER,
                    "A14": NUMBER,
                    "A15": NUMBER,
                    "A16": NUMBER,
                    "A17": NUMBER,
                    "A18": NUMBER,
                    "A19": NUMBER,
                    "A20": NUMBER,
                    "A21": NUMBER,
                    "A22": NUMBER,
                    "A23": NUMBER,
                    "A24": NUMBER,
                    "A25": NUMBER,
                    "A26": NUMBER,
                    "A27": NUMBER,
                    "A28": NUMBER,
                    "A29": NUMBER,
                    "A30": NUMBER,
                    "A31": NUMBER,
                    "A32": NUMBER,
                    "A33": NUMBER,
                    "A34": NUMBER,
                    "A35": NUMBER,
                    "A36": NUMBER,
                    "A37": NUMBER,
                    "A38": NUMBER,
                    "A39": NUMBER,
                    "A40": NUMBER,
                    "A41": NUMBER,
                    "A42": NUMBER,
                    "A43": NUMBER,
                    "A44": NUMBER,
                    "A45": NUMBER,
                    "A46": NUMBER,
                    "A47": NUMBER,
                    "A48": NUMBER,
                    "A49": NUMBER,
                    "A50": NUMBER,
                    "A51": NUMBER,
                    "A52": NUMBER,
                    "A53": NUMBER,
                    "A54": NUMBER,
                    "A55": NUMBER,
                    "A56": NUMBER
                }
            ]
        }
    }
    ```
##### Date, month, year summary
*   URL: `{baseURL}/date-year`
*   Method: `POST`
*   Content-type: `application/json`
*   Request
    *   headers:
    ```json
    {
        "authorization": STRING // TOKEN
    }
    ```
    *   body:
    ```json
    {
        "Serial": STRING,
        "fromDate": STRING, // yyyy-mm-dd
        "toDate": STRING, // yyyy-mm-dd
        "by": STRING, // date || month || year
        "selected": [ARRAY],
        "pvType": STRING
    }
    ```
*   Response:
    *   [Success]
    *   Status: `200`
    *   Content-type: `application/json`
    ```json
    {
        "message": "Get summary successful",
        "data": {
            "fields": [ARRAY],
            "dataTable": [
                // if by = date
                {
                    "Date": STRING, // yyyy-mm-dd
                    "TodayProduction": NUMBER,
                    "Power": NUMBER,
                    "Money": NUMBER
                },
                // if by = month
                {
                    "Month": STRING, // yyyy-mm
                    "MonthProduction": NUMBER,
                    "Power": NUMBER,
                    "Money": NUMBER
                },
                // if by = year
                {
                    "Year": STRING, // yyyy
                    "YearProduction": NUMBER,
                    "Power": NUMBER,
                    "Money": NUMBER
                }
            ]
        }
    }
    ```
    *   [Fail]
    *   Status: `500`
    *   Content-type: `application/json`
    ```json
    {
        "message": "Something went wrong"
    }
    ```
##### Date, month, year summary total
*   URL: `{baseURL}/date-year-total`
*   Method: `POST`
*   Content-type: `application/json`
*   Request
    *   headers:
    ```json
    {
        "authorization": STRING //TOKEN
    }
    ```
    *   body:
    ```json
    {
        "fromDate": STRING,
        "toDate": STRING,
        "by": STRING,
        "selected": STRING
    }
    ```
*   Response:
    *   [Success]
    *   Status: `200`
    *   Content-type: `application/json`
    ```json
    {
        "message": "Get summary successful",
        "data": {
            "fields": [ARRAY],
            "dataTable": [
                // if by = date
                {
                    "Date": STRING, // yyyy-mm-dd
                    "TodayProduction": NUMBER,
                    "Power": NUMBER,
                    "Money": NUMBER
                },
                // if by = month
                {
                    "Month": STRING, // yyyy-mm
                    "MonthProduction": NUMBER,
                    "Power": NUMBER,
                    "Money": NUMBER
                },
                // if by = year
                {
                    "Year": STRING, // yyyy
                    "YearProduction": NUMBER,
                    "Power": NUMBER,
                    "Money": NUMBER
                }
            ]
        }
    }
    ```
    *   [Fail]
    *   Status: `500`
    *   Content-type: `application/json`
    ```json
    {
        "message": "Something went wrong"
    }
    ```

#### Middlewares
##### Check Token
*   Content-type: `application/json`
*   Request:
    *   headers:
    ```json
    {
        "authorization": STRING //TOKEN
    }
    ```
*   Processing:
    *   [Success]
    *   Request:
        *   headers:
        ```json
        {
            "table": STRING //
        }
        ```
    *   [Fail]
    *   Response:
        *   Status: `403`
        ```json
        {
            "message": "Token required"
        }
        ```
        ---
        *   Status: `403`
        ```json
        {
            "message": "Invalid token"
        }
        ```
        ---
        *   Status: `409`
        ```json
        {
            "message": "Token expired please refresh page"
        }
        ```
        ---
        *   Status: `409`
        ```json
        {
            "message": "Connection with Server is closed, Please refresh page"
        }
        ```
        ---
        *   Status: `500`
        ```json
        {
            "message": "Something went wrong"
        }
        ```
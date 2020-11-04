//EXCEL JS CONFIG
// polyfills required by exceljs
require('core-js/modules/es.promise');
require('core-js/modules/es.object.assign');
require('core-js/modules/es.object.keys');
require('regenerator-runtime/runtime');

//EXCELJS
const ExcelJS = require('exceljs/dist/es5');

//EXCEL JS OBJECT
const workbook = new ExcelJS.Workbook();

//PATH
const path = require('path')

let Compare = async (input, PersonID) => {
    let temp_path = path.join(__dirname, `text-frame.xlsx`);
    console.log(temp_path);
    let result = await workbook.xlsx.readFile(temp_path).then(function (file) {
        let arr = JSON.parse(input);
        let worksheet = file.getWorksheet('Sheet1');
        let test = [];
        for (let rowN = 4; rowN < 245; rowN++) {
            let row = worksheet.getRow(rowN);
            let check = row.getCell('B').text;
            if (arr.includes(check)) {
                let obj = {};
                if (PersonID == 's_windsor') {
                    let checkValue;
                    switch (check) {
                        case 'A188': {
                            checkValue = 'Nhiệt độ nước bồn gia nhiệt 1';
                            obj[check] = checkValue;
                            test.push(obj);
                        } break;
                        case 'A189': {
                            checkValue = 'Nhiệt độ nước bồn gia nhiệt 2';
                            obj[check] = checkValue;
                            test.push(obj);
                        } break;
                        case 'A190': {
                            checkValue = 'Nhiệt độ nước bồn gia nhiệt 3';
                            obj[check] = checkValue;
                            test.push(obj);
                        } break;
                        case 'A191': {
                            checkValue = 'Nhiệt độ nước bồn gia nhiệt 4';
                            obj[check] = checkValue;
                            test.push(obj);
                        } break;
                        default: {
                            checkValue = row.getCell('D').text;
                        }
                            obj[check] = checkValue;
                            test.push(obj);
                    }
                } else {
                    let value = row.getCell('D').text;
                    obj[check] = value;
                    test.push(obj);
                }
            }
        }
        return test
    }).catch(err => { console.log(err) })

    return result;
}

let convertArray = async (input, PersonID) => {
    let temp_path = path.join(__dirname, `text-frame.xlsx`);
    console.log(temp_path);
    let result = await workbook.xlsx.readFile(temp_path).then(function (file) {
        let worksheet = file.getWorksheet('Sheet1');
        let test = [];
        for (let i in input) {
            for (let rowN = 4; rowN < 245; rowN++) {
                let row = worksheet.getRow(rowN);
                let check = row.getCell('B').text;
                if (i == check) {
                    let value = row.getCell('D').text;
                    let readyPushData;
                    if (value.includes('Nhiệt độ') || value.includes('nhiệt độ')) {
                        if (PersonID = 's_windsor') {
                            switch (check) {
                                case 'A188': {
                                    readyPushData = {
                                        bien: 'Nhiệt độ nước bồn gia nhiệt 1',
                                        thongSo: input[i],
                                        trangThai: null
                                    }
                                } break;
                                case 'A189': {
                                    readyPushData = {
                                        bien: 'Nhiệt độ nước bồn gia nhiệt 2',
                                        thongSo: input[i],
                                        trangThai: null
                                    }
                                } break;
                                case 'A190': {
                                    readyPushData = {
                                        bien: 'Nhiệt độ nước bồn gia nhiệt 3',
                                        thongSo: input[i],
                                        trangThai: null
                                    }
                                } break;
                                case 'A191': {
                                    readyPushData = {
                                        bien: 'Nhiệt độ nước bồn gia nhiệt 4',
                                        thongSo: input[i],
                                        trangThai: null
                                    }
                                } break;
                                default: {
                                    readyPushData = {
                                        bien: value,
                                        thongSo: input[i],
                                        trangThai: null
                                    }
                                }
                            }
                        } else {
                            readyPushData = {
                                bien: value,
                                thongSo: input[i],
                                trangThai: null
                            }
                        }
                    } else {
                        let checkThongSo;
                        if (input[i] == 1) {
                            checkThongSo = 'ON'
                        } else if (input[i] == 0) {
                            checkThongSo = 'OFF'
                        } else {
                            checkThongSo = null
                        }
                        readyPushData = {
                            bien: value,
                            thongSo: null,
                            trangThai: checkThongSo
                        }
                    }
                    test.push(readyPushData)
                }
            }
        }
        return test
    }).catch(err => { console.log(err) })
    return result;
}

module.exports = {
    Compare: Compare,
    convertArray: convertArray
}
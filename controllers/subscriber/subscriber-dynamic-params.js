module.exports = {
    signalType: [
        // Sungrow 110kw list
        {
            listRecordName: "SungrowV3List",
            DeviceIDName: "Id",
            HasMetter: false,
            tableRawData: "tb_Sungrow_Inverter",
            totalProductionParamName: "A39",
            NumberDevice: null,
            DBDeviceIDName: "InvID",
            HasRadiation: true,
            type: "Inverter"
        },
        // Sunspec list
        {
            listRecordName: "Sunspec_List_test",
            DeviceIDName: "InvID",
            HasMetter: false,
            tableRawData: ["tb_SunspecNext_1", "tb_SunspecNext_101_103", "tb_SunspecNext_160"],
            totalProductionParamName: null,
            NumberDevice: null,
            DBDeviceIDName: "InvID",
            HasRadiation: true,
            type: "Inverter"
        },
        // Sofar list - 33kw
        {
            listRecordName: "listRecord",
            DeviceIDName: "InverterID",
            HasMetter: false,
            tableRawData: "tb_PVSofarNextLog",
            totalProductionParamName: "A21",
            NumberDevice: null,
            DBDeviceIDName: "InverterID",
            HasRadiation: false,
            type: "Inverter",
            numberOfParams: 38,
            logSessionID: true
        },

        // Sofar list - 60kw
        {
            listRecordName: "listRecordV3",
            DeviceIDName: "InverterID",
            HasMetter: false,
            tableRawData: "tb_PVSofarV3Log",
            totalProductionParamName: "A24",
            NumberDevice: null,
            DBDeviceIDName: "InverterID",
            HasRadiation: false,
            type: "Inverter",
            numberOfParams: 37,
            logSessionID: true
        },

        // Huawei list
        {
            listRecordName: "HuaweiInverterV3List",
            DeviceIDName: "HwId",
            HasMetter: false,
            tableRawData: "tb_PVSofarHuaweiInverterV3",
            totalProductionParamName: "A74",
            StartFromZero: false,
            NumberDevice: null,
            DBDeviceIDName: "HwId",
            HasRadiation : false,
            type: "Inverter"
        },

        // Sungrow 30kw list
        {
            listRecordName: "SungrowList",
            DeviceIDName: "Id",
            tableRawData: "tb_Sungrow_Inverter",
            totalProductionParamName: null,
            NumberDevice: null,
            DBDeviceIDName: "InvID",
            HasRadiation: true,
            type: "Inverter"
        },

        // Sensor list
        {
            listRecordName: "KippZonenList",
            DeviceIDName: "DevID",
            tableRawData: "tb_KippZonenSensor",
            totalProductionParamName: null,
            NumberDevice: null,
            DBDeviceIDName: "DevID",
            HasRadiation: false,
            type: "Sensor"
        },

        // ilight 30 list
        {
            listRecordName: "iLight30List",
            DeviceIDName: "id",
            tableRawData: "tb_ilight_raw_data",
            totalProductionParamName: null,
            NumberDevice: null,
            DBDeviceIDName: "DevID",
            HasRadiation: false,
            type: "Inverter"
        },

        // Vinasino metter list
        {
            listRecordName: "VinasinoList",
            DeviceIDName: "Id",
            tableRawData: "tb_VinasinoFullMetter",
            totalProductionParamName: "A1",
            HasMetter: true,
            StartFromZero: true,
            DBDeviceIDName: "DevId",
            HasRadiation: false,
            NumberDeviceMetter: 1,
            type: "Metter"
        }
    ],
    // keys value for select type not restricted in zone 1
    RestrictedArea: ['SungrowList', 'KippZonenList', 'iLight30List', 'Sunspec_List_test']
}
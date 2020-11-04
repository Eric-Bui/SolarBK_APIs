const { Router } = require('express');
var express = require('express');
var router = express.Router();

let swhController = require('../controllers/swhAPIsController');
let middleware = require('./middlewares');

/* GET users listing. */
//authenticate route
router.post('/login_auth', [middleware.middlewareLogin], swhController.loginAuth);
router.get('/logout', swhController.logOut);

//get system status route
router.post('/getsystemstatus', [middleware.checkToken], swhController.getSystemStatus);

//get overview route
router.post('/getoverview', [middleware.checkToken], swhController.getOverView);

//get static and report route
router.post('/statisticchart', [middleware.checkToken], swhController.getStatisticChart);

//get system data route
router.post('/getsystemdata', [middleware.checkToken], swhController.getSystemData);

//get report data by month route
router.post('/getreportbymonth', [middleware.checkToken], swhController.getReportByMonth);

//get other params
router.post('/getotherparam', [middleware.checkToken], swhController.getOtherParams);

//Refresh token
router.post('/refreshtoken', swhController.RefreshToken);

//Get all year
router.post('/getfullyear', [middleware.checkToken], swhController.getFullYear);

//Get signal and current time
router.post('/signaltime', [middleware.checkToken], swhController.signalAndUpdateTime);

//Download excel report
router.get('/exportexcel', [middleware.checkToken], swhController.downloadExcelFile);

//Checking token user
router.get('/checktoken', middleware.checkGetUser);
// router.post('/checktoken', middleware.checkGetUser);

//change pass
router.post('/change-pass', [middleware.checkDataChangePass], swhController.changePass);

//admin-auth
router.post('/admin-auth', [middleware.adminAuth], swhController.adminAuthLogin);

router.post('/admin-update-project-info', [middleware.checkGetAdmin, middleware.checkPermissionAction],
    swhController.updateProjectInfo);

router.post('/admin-update-new-module', [middleware.checkGetAdmin, middleware.checkPermissionAction],
    swhController.addNewModule);

router.post('/admin-get-select-box', [middleware.checkGetAdmin], swhController.selecteBox);

router.post('/admin-update-password-info', [middleware.checkGetAdmin, middleware.checkPermissionAction,
    middleware.checkAdminchangePass],
    swhController.updatePasswordInfo);

router.post('/admin-update-latlong-info', [middleware.checkGetAdmin, middleware.checkPermissionAction],
    swhController.updateLatLongInfo);

router.post('/admin-update-delete-project', [middleware.checkGetAdmin, middleware.checkPermissionAction],
    swhController.editDeleteProject);

router.post('/admin-update-delete-module', [middleware.checkGetAdmin, middleware.checkPermissionAction],
    swhController.deleteModule);

router.post('/admin-update-module-info', [middleware.checkGetAdmin, middleware.checkPermissionAction],
    swhController.updateModuleInfo);

router.post('/admin-view-edit-project', [middleware.checkGetAdmin, middleware.checkPermissionAction],
    swhController.editViewProjectInfo);

router.post('/admin-info', [middleware.checkGetAdmin], swhController.getAdminInfoProject);

router.post('/admin-search', [middleware.checkGetAdmin], swhController.searchProject);

router.post('/admin-log-station', [middleware.checkGetAdmin], swhController.logStation);

router.post('/admin-log-detail', [middleware.checkGetAdmin], swhController.logStationDetail);

router.post('/status-total', [middleware.checkGetAdmin], swhController.systemStatusTotal);

router.get('/project-detail', [middleware.checkGetAdmin], swhController.projectDetail);

router.post('/project-type', [middleware.checkGetAdmin], swhController.projectTypeSelect);

router.post('/project-by-type', [middleware.checkGetAdmin], swhController.projectInfoByType);

router.post('/logout-admin', swhController.logOutAdmin);

// admin hidden project
router.get('/admin-hidden-project', [middleware.checkGetAdmin], swhController.getHiddenProject);

router.post('/admin-add-hidden-project', [middleware.checkGetAdmin], swhController.addHiddenProject);

router.post('/admin-restore-hidden-project', [middleware.checkGetAdmin], swhController.restoreProjectHidden);

//parent account route
router.post('/parent-account-info', [middleware.checkTokenParent], swhController.parentAccountInfo);

router.post('/parent-project-list', [middleware.checkTokenParent], swhController.parentProjectList);

router.get('/parent-log-out', [middleware.checkTokenParent], swhController.logOutParent);

module.exports = router;

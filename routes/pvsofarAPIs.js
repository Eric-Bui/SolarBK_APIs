var express = require('express');
var router = express.Router();

let pvsofarController = require('../controllers/pvsofarAPIsController');
let swhController = require('../controllers/swhAPIsController');
let middleware = require('./middlewares');

const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

/**
 * @swagger
 * tags:
 * - name: Sunspec
 *   description: Sunspec data request
 * - name: EPEverTracer
 *   description: EPE Tracer data request
 */

/**
 * @swagger
 * paths:
 *  /fullparams:
 *    get:
 *      summary: Get lastest sunspec data
 *      tags: [Sunspec]
 *      responses:
 *        "200":
 *          description: Sunspec lastest data
 *        "500":
 *          description: Error message
 * 
 *  /prototype/84843:
 *    get:
 *      Summary: Get EPE Tracer Data
 *      tags: [EPEverTracer]
 *      parameters:
 *        - in: query
 *          name: Serial
 *          schema:
 *            type: string
 *          required: true
 *      responses:
 *        "200":
 *          description: EPE Tracer Data
 *        "500":
 *          description: Error message
 */



router.post('/userinfo', [middleware.checkToken], pvsofarController.overviewPage);

router.get('/production-chart', [middleware.checkToken], pvsofarController.productionByDayChart);

router.get('/power-chart', [middleware.checkToken], pvsofarController.lineChartPowerPV);

router.get('/module-info', [middleware.checkToken], pvsofarController.pageLayoutModule);

router.post('/detail-table', [middleware.checkToken], pvsofarController.getListDetail);

router.post('/list-detail', [middleware.checkToken], pvsofarController.ListDetail);

router.post('/date-year', [middleware.checkToken], pvsofarController.getDateMonthYear);

router.post('/date-year-total', [middleware.checkToken], pvsofarController.getDayMonthYearTotal);

router.get('/table-mechanic', [middleware.checkToken], pvsofarController.viewInvMechanic);

router.get('/person-insurance', [middleware.checkToken], pvsofarController.checkPersonInsurance);

router.get('/warranty-info', [middleware.checkToken], pvsofarController.warrantyInfo);

router.get('/maintenance-info', [middleware.checkToken], pvsofarController.maintenanceInfo);

// EPE Tracer test
router.get('/prototype/84843', pvsofarController.getEPETracer);

//Powertrack plaform
router.get('/fullparams', [middleware.limitRequestInTime], pvsofarController.getSunspecFullParams);

router.get('/auth', [middleware.limitRequestInTime], swhController.powerTrackPlatformAuth);

router.get('/refresh-token', [middleware.limitRequestInTime], swhController.refreshPowerTrackToken);

// Server sent events route
router.get('/events', pvsofarController.ServerSentEventsHandler);
// router.get('/close-sse', pvsofarController.closeFromClient);


// Swagger set up
const options = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "Sunspec APIs",
      version: "1.0.0",
      description:
        "Use to request lastest Sunspec data",
      contact: {
        name: "Solarbk",
        url: "https://solarbk.vn/vi/"
      }
    },
    servers: [
      {
        url: "http://localhost:5000/pvsofarapi"
      },
      {
        url: "https://ssoc-next.solarbk.vn/backend/pvsofarapi"
      }
    ]
  },
  apis: ["./routes/pvsofarAPIs.js"]
};
const specs = swaggerJsdoc(options);
router.use("/docs", swaggerUi.serve);
router.get(
  "/docs",
  swaggerUi.setup(specs, {
    explorer: true
  })
);

/**
 * Cloud iot Core Device routes - 
 */
// Device registry routes
router.post('/cloud/device-registry')

module.exports = router;
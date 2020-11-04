require('dotenv').config();

var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var cors = require('cors');
// require('./controllers/subscriber');
require('./controllers/subscriber-echoRedis');

var swhAPIs = require('./routes/swhAPIs');
var pvsofarAPIs = require('./routes/pvsofarAPIs');

var app = express();

app.use(cors());

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE")
    next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/swhapi', swhAPIs);
app.use('/pvsofarapi', pvsofarAPIs);

module.exports = app;

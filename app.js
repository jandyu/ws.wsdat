var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var app = express();
var log4js = require("./lib/log");
var favicon = require('serve-favicon');

//initialization database connection
var appConfig = require("./config/app.json");
var database = require("./lib/database.js");

var mysqltorest  = require('./lib/index.js');




database.initDbConn();

app.use(log4js.httplog);



// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'www', 'favicon.ico')));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'www')));


app.use("/uploads", express.static(path.join(__dirname, 'upload')));

//manifest cache
/*
 app.get("/app.manifest", function(req, res){
 res.header("Content-Type", "text/cache-manifest");
 res.end("CACHE MANIFEST");
 });
 */



//cross-domain access
app.all('*', function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Content-Length, Authorization, Accept, X-Requested-With , yourHeaderFeild');
    res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');

    if (req.method == 'OPTIONS') {
        res.sendStatus(200); //options return quickly
    }
    else {
        next();
    }
});


//security token
app.use(require("./lib/authority"));

//routes
app.use('/', require('./routes/index.js'));



mysqltorest(app,'ktwy');


//app.use(appConfig.restPrefix,require("./routes/wsdat.js"));

//app.use('/api',require('./routes/api'));
//mongodb-rest route
//require('./lib/rest')(app);


// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);


        //res.render('error', {
        //    env: 'development',
        //    message: err.message,
        //    error: err
        //});
        console.info(err);
        res.json({
            ok: 0,
            env: 'development',
            msg: err.message,
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);

    //res.render('error', {
    //    env: 'production',
    //    message: err.message,
    //    error: {}
    //});
    res.json({
        ok: 0,
        env: 'production',
        msg: '500 Internal Server Error',
        message: err.message,
        error: {}
    });
});


module.exports = app;

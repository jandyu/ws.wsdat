/**
 * Created by jrain on 16/1/21.
 */
var path = require("path");
var fs = require("fs");


var log4js = require("log4js");

var pt = path.join(__dirname, '../log/');
if(!fs.existsSync(pt)){
    fs.mkdirSync(pt);
}


log4js.configure('config/log4js.json', { reloadSecs: 300 });

module.exports = {
    httplog:log4js.connectLogger(log4js.getLogger("http"), {level: 'auto'}),
    sqllog:log4js.getLogger("sql"),
    msglog:log4js.getLogger("message"),
    wsdat:log4js.getLogger("wsdat")
};

/*
logger.trace('Entering cheese testing');
logger.debug('Got cheese.');
logger.info('Cheese is Gouda.');
logger.warn('Cheese is quite smelly.');
logger.error('Cheese is too ripe!');
logger.fatal('Cheese was breeding ground for listeria.');
*/
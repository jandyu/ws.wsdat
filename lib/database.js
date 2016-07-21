/**
 * Created by jrain on 16/7/13.
 */
const mongo = require('mongodb').MongoClient;
const mysql = require('mysql');


const dbDriver = {
    mysql: {
        connect: (dbname, cfg) => {
            return new Promise(function (resolve, reject) {

                var conn = mysql.createConnection(cfg);
                conn.connect(function (err) {
                    if (err) {
                        console.error('mysql error connecting: ' + err.stack);
                        reject(err);
                    }
                    else {
                        console.log('mysql connected as id ' + conn.threadId);
                        //unify the method name in all DB driver's end connection.
                        conn.close = conn.end;
                        resolve({dbname: dbname, conn: conn});
                    }
                });
            });
        }
    },
    mongo: {
        connect: (dbname, cfg) => {
            return new Promise(function (resolve, reject) {
                mongo.connect(cfg, function (err, db) {
                    if (err) {
                        console.error("Connect to MongoDB error: %s", cfg);
                        reject(err);
                    } else {
                        console.log('Connected to MongoDB: %s', cfg);
                        resolve({dbname: dbname, conn: db});
                    }
                });
            })
        }
    }
};

const appConfig = require("../config/app.json");

//multi-connection
var connection = {};

function initDbConnect() {
    const cfg = appConfig.db;

    for (var key of Object.keys(cfg)) {
        console.info(key);
        dbDriver[cfg[key].driver].connect(key,
            cfg[key].config
            )
            .then(function (c) {

                connection[c.dbname] = c.conn;
                console.info(Object.keys(connection));
            })
            .catch(function (err) {
                console.info("Connect error:%s", err);
            })
    }
}

function closeDbConnect() {
    for (var key of Object.keys(connection)) {
        connection[key].close();
    }
}

function getConnect(dname) {
    if (connection.hasOwnProperty(dname)) {

        return connection[dname];
    }
    else {
        return null;
    }

}

module.exports = {
    initDbConn: initDbConnect,
    closeDbConn: closeDbConnect,
    getConn: getConnect
}
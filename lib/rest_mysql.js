/**
 * Created by jrain on 16/7/18.
 */
'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, Promise, generator) {
        return new Promise(function (resolve, reject) {
            generator = generator.call(thisArg, _arguments);
            function cast(value) {
                return value instanceof Promise && value.constructor === Promise ? value : new Promise(function (resolve) {
                    resolve(value);
                });
            }

            function onfulfill(value) {
                try {
                    step("next", value);
                } catch (e) {
                    reject(e);
                }
            }

            function onreject(value) {
                try {
                    step("throw", value);
                } catch (e) {
                    reject(e);
                }
            }

            function step(verb, value) {
                var result = generator[verb](value);
                result.done ? resolve(result.value) : cast(result.value).then(onfulfill, onreject);
            }

            step("next", void 0);
        });
    };

var mysql = require("mysql");
var _ = require("underscore");
const appConfig = require("../config/app.json");
const database = require("./database.js");


require("date-format-lite");

console['format'] = function (c) {
    return c.date + ": " + require('path').basename(c.filename) + ":" + c.getLineNumber();
};


function printable(body) {
    if (!body)
        return null;
    let s = JSON.stringify(body);
    if (s.length > 10 * 1024)
        return ` ... ${s.length} bytes`;
    return s;
}


function quoteValue(value, type) {
    if (value == null)
        return 'null';
    return type.search('char') >= 0 || type.search('date') >= 0 ? "'" + value + "'" : value;
}
function buildCond(id, query, table) {
    if (id) {
        return " " + table.id_ + "=" + quoteValue(id, table[table.id_]);
    }
    var cond = '';
    for (var f in table) {
        if (table.hasOwnProperty(f) && query.hasOwnProperty(f)) {
            let qf = quoteValue(query[f], table[f]);
            cond += ` and ${f}=${qf}`;
        }
    }
    return cond && cond.slice(4) || '';
}
function buildUpdate(tname, id, jbody, table, force) {
    let fs = [], vs = [], sets = [];
    if (id) {
        jbody[table.id_] = id;
    }
    for (let k in table) {
        if (!table.hasOwnProperty(k) || k == 'id_')
            continue;
        if (jbody.hasOwnProperty(k) || force) {
            if ((table[k]).search('date') >= 0) {
                jbody[k] = new Date(jbody[k])['format']();
            }
            fs.push(k);
            vs.push(quoteValue(jbody[k] || null, table[k]));
            sets.push(`${k}=${quoteValue(typeof jbody[k] == 'undefined' ? null : jbody[k], table[k])}`);
        }
    }
    let fs2 = fs.join(',');
    let vs2 = vs.join(',');
    let sets2 = sets.join(',');
    return `insert into ${tname}(${fs2}) values(${vs2}) on duplicate key update ${sets2}`;
}
function getOnlyField(obj) {
    return _.values(obj)[0];
}
function transformRows(rows) {
    if (rows instanceof Array) {
        console.log('total rows: ', rows.length);
        for (let i in rows) {
            for (let f in rows[i]) {
                if (rows[i][f] instanceof Date) {
                    rows[i][f] = new Date(rows[i][f])['format']();
                }
            }
        }
    }
}


function create(option) {
    return new Rest(option);
}




function RestMysql(req) {


    this.custom = {};
    this.options = {
        timeFormat: 'YYYY-MM-DD hh:mm:ss',
        custom: '',
        raw: '',
        www: '',
        call: '',
        proxy: {},
        bodyOption: {limit: '50mb'},
        verbose: true,
    };

    this.query = (sql) => __awaiter(this, void 0, Promise, function* () {
        console.log('querying: ', sql);
        return new Promise((resolve, reject) => {
            this.conn.query(sql, function (err, rows) {
                if (err) {
                    if (err.code == 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR' || err.fatal)
                        throw err;
                    reject(err);
                }
                else {
                    transformRows(rows);
                    resolve(rows);
                }
            });
        });
    });
    this.queryOne = (sql) => __awaiter(this, void 0, Promise, function* () {
        var rows = yield this.query(sql);
        return rows[0];
    });
    this.queryColumn = (sql) => __awaiter(this, void 0, Promise, function* () {
        var rows = yield this.query(sql);
        return rows.map(getOnlyField);
    });
    this.queryValue = (sql) => __awaiter(this, void 0, Promise, function* () {
        let col = yield this.queryColumn(sql);
        return col[0];
    });


    this.handleDefault = (req) => __awaiter(this, void 0, Promise, function* () {
        //req.params.table
        //req.params.id
        //req.query = {where_:{}}  || {column:val,...}  {force:true}
        //req.query = where_=&order_=&start_=&limit_=&
        //req.method = "GET" || "POST" || "DELETE"
        //req.body

        //addJbody(req);

        var table = req.params.table;
        let fs = yield this.query('desc ' + table);
        var tableMeta = {};
        let pris = [];
        for (let k = 0; k < fs.length; k++) {
            let f = fs[k];

            tableMeta[f.Field] = f.Type;
            if (f.Key) {
                pris.push(f.Field);
            }
        }
        let pri = pris.length >= 1 ? pris[0] : pris[0];
        if (pri) {
            tableMeta['id_'] = pri;
        }

        var id = req.params.id || null;
        var query = req.query;
        var where = query.where_ || buildCond(id, query, tableMeta);

        where = where && ' where ' + where || '';
        if (req.method == 'GET') {
            let order = query.order_ ? " order by " + query.order_ : "";
            let start = query.page_ || 1;
            let limit = query.psize_ || 100;
            start = (start - 1) * limit;
            let sql = "select * from " + table + where + order + " limit " + start + "," + limit;
            let sqlCnt  = "select count(1) a from " + table + where;
            var rowCount =0;
            if (query.op_ == 'count') {
                let crows = yield this.query(sqlCnt);
                rowCount = crows[0]['a']
            }
            let rows = yield this.query(sql);
            if (id && rows.length == 0) {
                return Promise.reject(['', 404]);
            }
            let r = rows;
            if (id) {
                r = rows[0];
            }
            return Promise.resolve({
                data:r,
                page:{currpage:query.page_,totalrows:rowCount,pagesize:limit,orderby:query.order_,totalpage:Math.ceil(rowCount / limit) }
            });
        }
        else if (req.method == 'POST') {
            let jbody = req['body'];
            jbody.create_time = jbody.create_time || new Date()['format']();
            jbody.update_time = new Date()['format']();
            let sql = buildUpdate(table, id, jbody, tableMeta, !!req.query.force);
            let result = yield this.query(sql);
            let nid = id || result.insertId;
            if (!nid) {
                return Promise.resolve(jbody);
            }
            let rows = yield this.query(`select * from ${table} where ${pri}='${nid}'`);
            for (let k in rows[0]) {
                if (rows[0].hasOwnProperty(k)) {
                    jbody[k] = rows[0][k];
                }
            }
            return Promise.resolve(jbody);
        }
        else if (req.method == 'DELETE') {
            if (!id && !where) {
                return Promise.reject(['delete should specify condition', 400]);
            }
            let limit = query.limit_ || 1;
            let sql = "delete from " + table + where + ' limit ' + limit;
            let result = yield this.query(sql);
            if (result.affectedRows == 0) {
                return Promise.reject(['', 404]);
            }
            return Promise.resolve(result);
        }
    });

    this.genAngular = (filename) => __awaiter(this, void 0, Promise, function* () {
        function underscore2Camel(uname) {
            var cname = '';
            var upper = true;
            for (let c of uname) {
                if (c == '_') {
                    upper = true;
                }
                else {
                    cname += upper ? c.toUpperCase() : c;
                    upper = false;
                }
            }
            console.log('cname is: ', cname);
            return cname;
        }

        var cs = yield this.queryColumn(`show tables`);
        var ngCont = "angular.module('restService', ['ngResource'])\n";
        for (let i = 0; i < cs.length; i++) {
            let tname = cs[i];
            let fs = yield this.query('desc ' + tname);
            let pris = [];
            for (let k = 0; k < fs.length; k++) {
                let f = fs[k];
                if (f.Key) {
                    pris.push(f.Field);
                }
            }
            let camelTable = underscore2Camel(tname);
            let pri = pris.length == 1 ? pris[0] : '';
            var id_part = pri ? ":" + pri + "',{ " + pri + ":'@" + pri + "'}" : "'";
            ngCont += `.factory('${camelTable}', function($resource){ return $resource('${this.options.api}table/${cs[i]}/${id_part});})\n`;
        }
        require('fs').writeFileSync(filename, ngCont);
        console.log('write result finished:', filename);
        process.exit(0);
    });

    this.callRest = function (option) {
        _.extendOwn(this.options, option);
        if (this.options.custom) {
            this.custom = require(this.options.custom);
        }
        Date['masks']['default'] = this.options.timeFormat;
        this.conn = database.getConn(req.params.db);

        //if customer
        if(req.params.table in this.custom){
            return this.custom[req.params.table](req);
        }
        return this.handleDefault(req);
    }

}


function restMethod(db,req) {
    var rest = new RestMysql(req);
    console.info(req.params);
    var option = {custom:appConfig.db[db].custom};
    return rest.callRest(option);
}

module.exports = {
    create: create,
    rest: restMethod
}

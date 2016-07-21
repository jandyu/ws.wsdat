/*
 * windows版本接口转换
 * */
var router = require('express').Router();
const appConfig = require("../config/app.json");

const dbRest = {
    mysql: require('../lib//rest_mysql.js'),
    mongo: require('../lib/rest_mongo.js')
}


function queryController(defid, fmtid, strparam, dStyle) {
    return new Promise(function (resolve, reject) {

    });
}

function updateController(defid, fmtid, strparam, dStyle) {
    return new Promise(function (resolve, reject) {

    });
}

function restDbCall(res, db, req) {
    dbRest[appConfig.db[db].driver].rest(db,req)
        .then(function (rtn) {
            res.json(rtn);
        })
        .catch(function (err) {
            console.error(err);
            res.status(err[1]).json(err[0]);
        })
}


/* wsdata interface*/
router.get("/wsdat.wsdat",function(req,res){
    console.info(req.query);
    var defid = req.query.defid.split(".");
    var fmtid = req.query.fmtid;
    var qry = req.query.strparam;
    var dStyle = req.query.dStyle;

    var wrapReq = {};
    if (fmtid == "json" && dStyle == "json") {
        req.params.table = (defid.length==2)?defid[1]:defid[0];
        req.method ="get";
        //{common: {currpage: CurrPage,pagesize: PageSize,where: []}};

        var currPage =qry.common.currpage;
        var pageSize =qry.common.pagesize;

    }

    restDbCall(res, 'ktwy', wrapReq);

});
router.post('/wsdat.wsdat', function (req, res) {
    //
    console.info(req.body);
    var defid = req.body.defid.split(".");
    var fmtid = req.body.fmtid;
    var strparam = req.body.strparam;
    var dStyle = req.body.dStyle;

    var wrapReq = {};
    if (fmtid == "json" && dStyle == "json") {
        req.params.table = (defid.length==2)?defid[1]:defid[0];
        req.method ="get";
    }
    if (fmtid == "update" && dStyle == "xml") {

    }


    //req.params.table
    //req.params.id
    //req.query = {where_:{}}  || {column:val,...}  {force:true}
    //req.query = where_=&order_=&start_=&limit_=&
    //req.method = "GET" || "POST" || "DELETE"
    //req.body
    //addJbody(req);
    //--------------------------------------------------------
    //wrap in req
    var wrapReq = {};
    restDbCall(res, 'ktwy', wrapReq);
});


router.all(['/:db/:table', '/:db/:table/:id'], function (req, res) {
    var dbname = req.params.db;
    restDbCall(res, dbname, req);
})


module.exports = router;

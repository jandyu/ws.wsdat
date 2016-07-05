'use strict'

var _ = require("underscore");
var appConfig = require("../config/app.json");


module.exports = function (req, res, next) {
    var url = req.originalUrl;

    // check token
    if (appConfig.checkAuthToken) {
        //require token
        var authList = ["/member", "/user", "/coach", "/pay", "/dbrest", "/backend", "/merchant"];
        //not require token
        var allowList = ["/user/login", "/user/forgot", "/user/register", "/user/checkdev"];

        //if is not in allow list  && is in require token , check token
        if (_.find(allowList, function (item) {return RegExp("^" + item).test(url);}) == undefined) {
            if (_.find(authList, function (item) {return RegExp("^" + item).test(url);}) != undefined) {

                //check token
                var token = req.header('authorization');
                try {
                    security.verifyToken(token);
                } catch (err) {
                    //Unauthorized 401
                    console.error("401 Unauthorized");
                    return res.status(401).send("Unauthorized: Access is denied.");
                }
            }
        }
    }
    //success
    next();
}
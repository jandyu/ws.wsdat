const appConfig = require("../config/app.json");
var database = require("./database.js");

var uuid = require("uuid");
var _ = require("underscore");


function mongoREST(req) {
    this.options = {
        custom: ''
    }

    /**
     * Query
     */
    this.get = function (req) {
        var me = this;
        return new Promise(function (resolve, reject) {
            var query = req.query.query ? JSON.parse(req.query.query) : {};
            //var namings = ['_id', '$id', "$oid"];
            var namings = ['$id', "$oid"];

            //Function to test whether object has nested objects
            function testForNested(obj) {
                for (var i = 0; i < Object.keys(query).length; i++) {
                    if (typeof(obj[Object.keys(obj)[i]]) == 'object') {
                        return true;
                    }
                }
                ;
                return false;
            }

            // Providing an id overwrites giving a query in the URL
            if (req.params.id) {
                //query = {'_id': new BSON.ObjectID(req.params.id)};
                query = {'_id': req.params.id};
            }

            //Check if there is a nested queries
            else if (testForNested(query)) {

                //Parse down the object tree
                (function searchObj(obj) {

                    for (var key in obj) {

                        //Found nested object - going deeper
                        if (typeof obj[key] === 'object') {
                            obj[key] = searchObj(obj[key]);
                        }

                        //Found a match
                        if (namings.indexOf(key) > -1) {
                            //Cast the id to an Object id
                            return obj = new BSON.ObjectID.createFromHexString(obj[key]);
                        }
                        else if (key == "$regex") {
                            var regExpString = obj[key].substring(obj[key].indexOf('/') + 1, obj[key].lastIndexOf('/'));
                            var regExpFlags = obj[key].substring(obj[key].lastIndexOf('/') + 1)
                            return obj = {"$regex": new RegExp(regExpString, regExpFlags)};
                        }
                        else {
                            return obj
                        }


                    }

                })(query);
            }

            var options = req.params.options || {};

            var test = ['limit', 'sort', 'fields', 'skip', 'hint', 'explain', 'snapshot', 'timeout'];
            var needParse = ['fields', 'hint', 'sort'];

            for (o in req.query) {
                if (test.indexOf(o) >= 0) {
                    if (needParse.indexOf(o) >= 0) {
                        options[o] = JSON.parse(req.query[o]);
                    } else {
                        console.info(o);
                        if (o == "limit" || o == "skip") {
                            options[o] = parseInt(req.query[o]);
                        }
                        else {
                            options[o] = req.query[o];
                        }
                    }
                }
            }


            me.db.collection(req.params.table, function (err, collection) {
                if (err) {
                    logger.error('Error getting collection ' + collection + ': ' + err.message);
                    reject([{message: 'Server error'}, 500]);

                }


                collection.find(query, options, function (err, cursor) {
                    if (err) {
                        logger.error('Error finding document(s): ' + err.message);
                        reject([{message: 'Server error'}, 500]);

                    }

                    cursor.toArray(function (err, docs) {
                        if (err) {
                            logger.error('Error getting database cursor as array: ' + err.message);
                            reject({message: 'Server error'}, 500)
                            return;
                        }

                        if (docs.length > 0) {
                            resolve(docs);

                        } else {
                            reject([{ok: 0}, 404]);
                        }
                    });
                });
            });
        })
    };
    /**
     * Insert
     */
    this.post = function (req) {
        var me = this;
        return new Promise(function (resolve, reject) {
            if (req.body) {
                me.db.collection(req.params.table, function (err, collection) {
                    if (err) {
                        logger.error('Error getting collection ' + collection + ': ' + err.message);
                        reject([{message: 'Server error'}, 500]);
                        return;
                    }

                    // We only support inserting one document at a time
                    var idata = Array.isArray(req.body) ? req.body[0] : req.body;
                    idata._id = uuid.v4().replace(/-/g, "");
                    console.info(idata);

                    collection.insert(idata,
                        function (err, docs) {
                            if (err) {
                                logger.error('Error inserting into collection ' + collection + ': ' + err.message);
                                reject([{message: 'Server error'}, 500]);
                                return;
                            }
                            resolve({ok: 1});

                        }
                    );
                });

            } else {
                resolve({ok: 1});
            }
        });
    };
    /**
     * Update
     */
    this.put = function (req) {
        var me = this;
        return new Promise(function (resolve, reject) {
            //var spec = {'_id': new BSON.ObjectID(req.params.id)};
            var spec = {'_id': req.params.id};
            me.db.collection(req.params.table, function (err, collection) {
                if (err) {
                    logger.error('Error getting collection ' + collection + ': ' + err.message);
                    reject([{message: 'Server error'}, 500]);
                    return;
                }

                collection.update(spec, req.body, true, function (err, docs) {
                    resolve({ok: 1});
                });
            });

        });
    };
    /**
     * Delete
     */
    this.delete = function (req) {
        var me = this;
        return new Promise(function (resolve, reject) {
            //var spec = {'_id': new BSON.ObjectID(req.params.id)};
            var spec = {'_id': req.params.id};


            me.db.collection(req.params.table, function (err, collection) {
                if (err) {
                    logger.error('Error getting collection ' + collection + ': ' + err.message);
                    reject([{message: 'Server error'}, 500]);
                    return;
                }

                collection.remove(spec, function (err, docs) {
                    if (err) {
                        logger.error('Error removing from ' + collection + ': ' + err.message);
                        reject([{message: 'Server error removing'}, 500]);
                        return;
                    }

                    resolve({ok: 1});
                });
            });
        });
    };

    this.callRest = function (option) {
        _.extendOwn(this.options, option);
        if (this.options.custom) {
            this.custom = require(this.options.custom);
        }
        this.db = database.getConn(req.params.db);

        //if customer
        if (req.params.table in this.custom) {
            return this.custom[req.params.table](req);
        }

        return this[req.method.toLowerCase()](req);
    }
};


function restMethod(db, req) {
    var rest = new mongoREST(req);
    console.info(req.params);
    var option = {custom: appConfig.db[db].custom};
    return rest.callRest(option);
}

module.exports = {
    rest: restMethod
}

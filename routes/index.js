/**
 * Created by jrain on 16/7/12.
 */


var router = require('express').Router();

/* GET home page. */
router.get('/v', function(req, res) {
    res.json({home:'wsdat Srv Platform base on Node.js'});
});



module.exports = router;

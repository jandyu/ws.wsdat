/**
 * Created by jrain on 16/7/20.
 */
'use strict';

module.exports = {
    cus1: (req) => {
        console.info("custom method");
        return Promise.resolve("custom-build method");
    }
};

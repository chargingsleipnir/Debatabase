var mySQL = require('mysql');

var pool = mySQL.createPool({
    connectionLimit: 50,
    host: 'localhost',
    user: 'root',
    password: '', //! Needs to be entered
    database: 'Debatree'
});

module.exports = function() {

    function CallDB(query, CB) {
        pool.getConnection(function(error, poolConn) {
            if(!!error) console.log("MySQL pool connection error");
            else {
                poolConn.query(query, function(error2, rows, fields) {
                    if(!!error2) console.log("Query error");
                    else CB(rows);
                })
            }
        });
    }

    var module = {
        ExampleFunc: function() {
            CallDB('SELECT * FROM SubmArgs', function(rows) {
                console.log(rows);
            });
        }
    };

    return module;
};
//  OpenShift sample Node application
var express = require('express');
var app = express();
var morgan = require('morgan');

var session = require('express-session');
var MongoStore = require('connect-mongo')(session);

var http = require('http').Server(app);
var io = require('socket.io')(http);

var fs = require('fs');
var bodyParser = require('body-parser');
var pdf = require('html-pdf');

var mongoHdlr = require('./Server/mongoHdlr.js')();
var Consts = require('./Shared/consts.js');

var port = process.env.PORT || 8080,
ip = process.env.IP || '0.0.0.0';

Object.assign=require('object-assign');

app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

app.use(morgan('combined'));
// error handling - not sure how and when this'll be used.
app.use(function(err, req, res, next){
    console.error(err.stack);
    res.status(500).send('Something bad happened!');
});  

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.use(express.static(__dirname + '/Client'));
app.use(express.static(__dirname + '/Shared'));
app.use(express.static(__dirname + '/views/partials'));


// ROUTES -------------------------------------------

// Perhaps use this to make a custom page for myself later with these and many more server details, if so needed.
// app.get('/', function (req, res) {
//     // try to initialize the db on every request if it's not already initialized.
//     if(CheckDBConn()) {
//         mongoHdlr.AddVisit(req.ip, Date.now(), function(count, dbDetails) {
//             res.render('index.html', { pageCountMessage: count });
//         });
//     } 
//     else
//         res.render('index.html', { pageCountMessage : null});
// });

// Test routes - just set these up right away
app.get('/otherTestGarbo', function (req, res) {
    res.send('otherTestGarbo');
});
app.get('/pagecount', function (req, res) {
    res.send('pagecount with no ejs O.o');
});

// CHECK DB CONNECTION, INCLUDES SETUP SESSION DATA STORAGE (must come after db has been connected)  
var sessionStoreInitialized = false;
function CheckDBConn() {
    // Try to establish db connection again, in case if failed previously
    var connObj = mongoHdlr.GetConnObj();

    if(!connObj) {
        sessionStoreInitialized = false
        return false;
    }
    else {
        if(sessionStoreInitialized)
            return true;
        else {
            // var mongoStore = new MongoStore({ 
            //   url: mongoURL,
            //   ttl: 90 * 24 * 60 * 60, // Session saves for... 90 days
            //   //touchAfter: 24 * 60 * 60 // Only update session once per day max, outside of saves when data changes.
            // });
            var mongoStore = new MongoStore({ db: connObj });
            var SessionFunc = session({
                secret: 'SomeKindOfSessionSecretIReallyDontKnowMuchAbout',
                cookie: {
                    //secure: true,
                    maxAge: 90 * 24 * 60 * 60 * 1000 // Cookie expires in... 90 days,
                },
                rolling: true,
                saveUninitialized: false,
                resave: true,
                store: mongoStore
            });
            app.use(SessionFunc);
            PostSessionConnection();
            sessionStoreInitialized = true;
            return true;
        }
    }        
}

function PostSessionConnection() {
    function LoginAttemptResponse(req, res, resObj) {
        if(resObj.success)
            req.session.accountID = resObj.accountID;
    
        res.json(resObj);
    }
    app.post('/LoginData', function(req, res){
        mongoHdlr.GetAccountID({ nameOrEmail: req.body.nameOrEmail, password: req.body.password }, function(resObj) {
            LoginAttemptResponse(req, res, resObj);
        });
    });
    app.post('/SignUpData', function(req, res) {
        mongoHdlr.SignUp({ username: req.body.username, email: req.body.email, password: req.body.password }, function(resObj) {
            LoginAttemptResponse(req, res, resObj);
        });
    });
    app.post('/Logout', function (req, res) {
        req.session.destroy(function(error) {
            if(error)
                console.log(error);
    
            if(!req.body.accountDeleted)
                mongoHdlr.Logout(req.body.socketID);
                
            res.json({});
        });
    });
    
    var pdfOpts = {
        format: 'Letter',
        border: {
            top: '0.5in',
            bottom: '0.5in',
            left: '0.5in',
            right: '0.5in'
        }
    };
    app.get('/Download', function(req, res, next) {
        // So if someone just types 'Download' they won't actually come through here.
        if(!req.query.treeID || !req.query.isCtrl) {
            next();
        }
        else {
            mongoHdlr.HTMLforPDF(req.query.treeID, req.query.isCtrl == 'true', function(error, html, title) {
                if(error)
                    next();
                else {
                    title = title.split(' ').join('_');
                    var filename = title + '.pdf';
    
                    pdf.create(html, pdfOpts).toFile('./pdfCreateDeleteSpace/' + filename, function(error, result) {
                        if(error)
                            console.log(error);
                        else {
                            res.download(result.filename, filename, function() {
                                fs.unlink(result.filename);
                            });
                        }
                    });
                }
            });
        }
    });
    
    function CallIndex(res, session) {
        // TODO: Account for possible lack of session...
    
        if(!session) {
            // try to initialize the db on every request if it's not already initialized.
            res.render('index.html', { pageCountMessage : 6 });
        }
        else {
            mongoHdlr.GetAccountComp(session.accountID, function(loggedIn, account, submArgCount, timePersCount, timePublCount) {
                mongoHdlr.GetMostInteracted(account, function(openTreesObjArr, ctrlTreesObjArr, archTreesObjArr) {
                    mongoHdlr.CheckForTree(session, account, function(resObj) {
                        var ejsObj = {
                            urlParam: session.urlParam,
                            mostInteractedOpen: openTreesObjArr,
                            mostInteractedCtrl: ctrlTreesObjArr,
                            mostInteractedArch: archTreesObjArr,
                            loggedIn: loggedIn,
                            account: account,
                            submArgCount: submArgCount,
                            submBatchSize: Consts.SUBM_BATCH_SIZE,
                            timePersCount: timePersCount,
                            timePublCount: timePublCount,
                            timelineBatchSize: Consts.TIMELINE_BATCH_SIZE,
                            argTypesObj: Consts.argTypes,
                            inviteResps: Consts.inviteResps,
                            permTypes: Consts.permTypes,
                            treeRemoveTypes: Consts.treeRemoveTypes,
                            imgLoadMax: Consts.IMG_LOAD_MAX
                        };
                        if(resObj) {
                            ejsObj['treeIsLoaded'] = resObj.success;
                            ejsObj['isCtrl'] = resObj.isControlled;
                            ejsObj['treeData'] = resObj.treeData;
                            ejsObj['permObj'] = resObj.permObj;
                        }
                        else {
                            ejsObj['treeIsLoaded'] = false;
                            ejsObj['isCtrl'] = false;
                            ejsObj['treeData'] = null;
                            ejsObj['permObj'] = null;
                        }
                        res.render('index.ejs', ejsObj);
                    });
                });
            });
        }
    }
    
    // This specifically needs to happen only after instantiation of database, then session manager, so "req" has session property
    app.get('/:id?', function (req, res) {
        if(!!req.session) {
            req.session.urlParam = req.params.id || '/';
    
            req.session.treeType = null;
            req.session.branchIdx = null;
            if(req.query.type && req.query.idx) {
                // Use parseInt and check for not NaN to make sure we have a valid integer
                var idx = parseInt(req.query.idx, 10);
                if((req.query.type == 'ctrl' || 
                    req.query.type == 'open') &&
                    !isNaN(idx)) {
                    req.session.treeType = req.query.type;
                    req.session.branchIdx = idx;
                }
            }
        }
    
        CallIndex(res, req.session);
    });
    
    var templates = {};
    templates['li_ArgParent.ejs'] = fs.readFileSync('views/partials/li_ArgParent.ejs', 'utf-8');
    templates['li_SourceLink.ejs'] = fs.readFileSync('views/partials/li_SourceLink.ejs', 'utf-8');
    templates['li_BranchLink.ejs'] = fs.readFileSync('views/partials/li_BranchLink.ejs', 'utf-8');
    templates['li_AddUser.ejs'] = fs.readFileSync('views/partials/li_AddUser.ejs', 'utf-8');
    templates['li_BranchBtnList.ejs'] = fs.readFileSync('views/partials/li_BranchBtnList.ejs', 'utf-8');
    templates['li_Subm.ejs'] = fs.readFileSync('views/partials/li_Subm.ejs', 'utf-8');
    templates['li_Sent.ejs'] = fs.readFileSync('views/partials/li_Sent.ejs', 'utf-8');
    templates['li_Revision.ejs'] = fs.readFileSync('views/partials/li_Revision.ejs', 'utf-8');
    templates['li_BranchListLinear.ejs'] = fs.readFileSync('views/partials/li_BranchListLinear.ejs', 'utf-8');
    templates['block_Arg.ejs'] = fs.readFileSync('views/partials/block_Arg.ejs', 'utf-8');
    templates['block_ProgBar.ejs'] = fs.readFileSync('views/partials/block_ProgBar.ejs', 'utf-8');
    templates['block_MeterBar.ejs'] = fs.readFileSync('views/partials/block_MeterBar.ejs', 'utf-8');
    templates['block_FavDisp.ejs'] = fs.readFileSync('views/partials/block_FavDisp.ejs', 'utf-8');
    
    app.post('/LoadIdxPgData', function(req, res) {
        mongoHdlr.LogIn(req.session.accountID, req.body.socketID, function(loggedIn, account, loginHTMLObj, loginDataObj) {
            mongoHdlr.CheckForTree(req.session, account, function(resObj) {
                res.json({
                    loggedIn: loggedIn,
                    accountData: account,
                    loginHTMLObj: loginHTMLObj,
                    loginData: loginDataObj,
                    treeObj: resObj,
                    urlParam: req.session.urlParam,
                    templates: templates 
                });
            });
        });
    });
}

// Keep trying session connection until established, setting up all the routes that use session.
var connTimer = 0;
var interval = setInterval(function() {
    if(CheckDBConn()) {
        console.log('Session store connected');
        clearInterval(interval);
    }
    else {
        connTimer+= 0.5;
        console.log('Session store connection attempt timer: ' + connTimer + 's');
    }
}, 500);


io.on("connection", function (socket) {
    console.log("Socket connection established: " + socket.client.id);

    socket.on("disconnecting", function () {
        console.log("Socket connection cut: " + socket.client.id);
        mongoHdlr.LeaveRooms(socket);
    });

    socket.on("disconnect", function () {
        console.log("Socket connection lost: " + socket.client.id);
        mongoHdlr.Logout(socket.client.id);
    });

    mongoHdlr.InitSocketCalls(io, socket);
});

http.listen(port, ip);
console.log('%s: Node server started on %s:%d ...', Date(Date.now()), ip, port);

module.exports = app;
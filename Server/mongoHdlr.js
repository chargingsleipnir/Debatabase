require('dotenv').config();

var mongojs = require('mongojs');
var mongoDB = require('mongodb');
const mongoClient = mongoDB.MongoClient;
const ObjectId = mongoDB.ObjectID;
var GridFS = require('gridfs-stream');
var ejs = require('ejs');
var fs = require('fs');
var read = fs.readFileSync;
var nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');

var Consts = require('../Shared/consts.js');
var SuppFuncs = require('../Shared/supportFuncs.js');
var timeBldr = require('./timelineBuilder.js')();

var mongoURLLabel = "";
var mongoURI = "";

//mongodb+srv://<username>:<password>@prototype.4ovju.mongodb.net/debatabase_db?retryWrites=true&w=majority

var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase(),
    mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'],
    mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'], // Mongo mongodb+srv domains do not use a port
    mongoDBName = process.env[mongoServiceName + '_DATABASE'],
    mongoPassword = process.env[mongoServiceName + '_PASSWORD'],
    mongoUser = process.env[mongoServiceName + '_USER'],
    mongoDomain = process.env[mongoServiceName + '_DOMAIN'],
    mongoOptions = process.env[mongoServiceName + '_OPTIONS'];

if (mongoHost && /*mongoPort &&*/ mongoDBName) {
    mongoURLLabel = mongoURI = mongoDomain + '://';
    if (mongoUser && mongoPassword)
        mongoURI += mongoUser + ':' + mongoPassword + '@';

    // Provide UI label that excludes user id and pw
    var remainder = mongoHost + /*':' + mongoPort +*/ '/' + mongoDBName + mongoOptions;
    mongoURLLabel += remainder;
    mongoURI += remainder;
}

// mongoConn and db are differentiated only because the MongoStore in server.js doesn't seem to take the object from mongojs
// TODO: There's no use in having 2 client wrappers, just use mongoDB and toss mongojs if that seems to be better.
var db = null,
    mongoConn = null,
    gfs = null,
    dbDetails = new Object();

var colls = {
    ACCOUNTS: 'Accounts',
    CTRL_TREES: 'CtrlTrees',
    OPEN_TREES: 'OpenTrees',
    SUBM_ARGS: 'SubmArgs',
    TAGS: 'Tags',
    TIMELINE: 'TimelineBldr'
};

// Not sure about all of these, just trying to resolve connection issues
var connOptions = {
    poolSize: 20,
    socketTimeoutMS: 480000,
    keepAlive: 300000,
    ssl: true,
    sslValidate: false
};

function Connect() {
    if(db) return; // Connect has already been made
    if(mongoURI == null) return;
    if(mongoDB == null || mongoClient == null) return;
    if(mongojs == null) return;

    mongoClient.connect(mongoURI, function(err, client) {
        if(err) {
            console.log('Error connecting to Mongo. Message:\n' + err);
            return;
        }

        mongoConn = client.db(mongoDBName);
        gfs = GridFS(mongoConn, mongoDB);
        dbDetails.databaseName = mongoConn.databaseName;
        dbDetails.url = mongoURLLabel;
        dbDetails.type = 'MongoDB';

        db = mongojs(mongoURI, [
            colls.ACCOUNTS,
            colls.CTRL_TREES,
            colls.OPEN_TREES,
            colls.SUBM_ARGS,
            colls.TAGS,
            colls.TIMELINE
        ]);

        // db.on('error', (err) => console.log('\nmongojs database error', err));         
        // db.on('connect', () => console.log('\nnmongojs database connected'));

        db.on('error', function(err) {console.log('\nmongojs database error', err)});  
        db.on('connect', function() {console.log('\nmongojs database connected')});

        console.log(`\nConnected to MongoDB`);
        //console.log(`\nConnected to MongoDB at: <${mongoURI}>`);
    });
};

// FIRST DB CONNECTION ATTEMPT
Connect();

// db.command({ buildInfo: 1 }, function(err, buildinfo) {
//     console.log('V', buildinfo.version);
// });

// db.command({ listCommands : 1 }, function(err, response) {
//     console.log(response.commands);
// });

// ! NOT TO RUN HERE --> DB commands to implement ONCE as needed, separately, in DB managament program (like Robomongo command line)
// Create indexing for search functionality
// db.getCollection('Accounts').createIndex({ "username": "text", "bio.lastName": "text", "bio.firstName": "text", "bio.profDesig": "text", "email": "text" }, {"weights": { "username": 3, "bio.lastName": 2, "bio.firstName": 2 }, "name": "TextIndex"});
// db.getCollection('OpenTrees').createIndex({ "title": "text", "branches.assertion": "text", "branches.elaboration": "text", "branches.sources.text": "text" }, {"weights": { "title": 3, "branches.assertion": 2 }, "name": "TextIndex"});
// db.getCollection('CtrlTrees').createIndex({ "title": "text", "branches.assertion": "text", "branches.elaboration": "text", "branches.sources.text": "text" }, {"weights": { "title": 3, "branches.assertion": 2 }, "name": "TextIndex"});
// * Just putting 'branches.assertion' covers every assertion field, without any indicator of which branch array element to check
// * Use these to drop indexes if need be.
// db.getCollection('Accounts').dropIndex("TextIndex");
// db.getCollection('OpenTrees').dropIndex("TextIndex");
// db.getCollection('CtrlTrees').dropIndex("TextIndex");
// * Check indexes established
// db.getCollection('Accounts').getIndexes();

ejs.delimiter = '?';
var EJS_LI_TreeLink = ejs.compile(read('views/partials/li_TreeLink.ejs', 'utf-8'), { rmWhitespace: true }),
    EJS_LIs_TreeLink = ejs.compile(read('views/partials/lis_TreeLink.ejs', 'utf-8'), { rmWhitespace: true }),
    EJS_LI_BranchBtnList = ejs.compile(read('views/partials/li_BranchBtnList.ejs', 'utf-8'), { rmWhitespace: true, filename: "li_BranchBtnList.ejs" }),
    EJS_LI_BranchLink = ejs.compile(read('views/partials/li_BranchLink.ejs', 'utf-8'), { rmWhitespace: true }),
    EJS_LI_AddUser = ejs.compile(read('views/partials/li_AddUser.ejs', 'utf-8'), { rmWhitespace: true }),
    EJS_LI_BlockUser = ejs.compile(read('views/partials/li_BlockUser.ejs', 'utf-8'), { rmWhitespace: true }),
    EJS_LI_TagList = ejs.compile(read('views/partials/li_Tag.ejs', 'utf-8'), { rmWhitespace: true }),
    EJS_LI_DashTreeLink = ejs.compile(read('views/partials/li_DashTreeLink.ejs', 'utf-8'), { rmWhitespace: true }),
    EJS_LI_Timeline = ejs.compile(read('views/partials/li_Timeline.ejs', 'utf-8'), { rmWhitespace: true }),
    EJS_Arg = ejs.compile(read('views/partials/block_Arg.ejs', 'utf-8'), { rmWhitespace: true, filename: "block_Arg.ejs" }),
    EJS_LI_BranchListLinear = ejs.compile(read('views/partials/li_BranchListLinear.ejs', 'utf-8'), { rmWhitespace: true }),
    EJS_FullTree = ejs.compile(read('views/partials/fullTree.ejs', 'utf-8'), { rmWhitespace: true, filename: "fullTree.ejs" }),
    EJS_TreeHTMLToPDF = ejs.compile(read('views/partials/block_TreePDFDownload.ejs', 'utf-8'), { rmWhitespace: true });

var mailTrans = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'debatabase.app@gmail.com',
        pass: 'GgMXhAUcJnR6_g2u' //! Needs to be entered
    }
});

module.exports = function() {

    // TODO: VALIDATION OF ALL USER SUBMITTED DATA

    // SIGN-IN PROCESS
    var CheckLoginCreds = function (data, Callback) {
        // Separating find from update to make sure the socketID is first checked for, constrains login to just once at a time.
        db[colls.ACCOUNTS].find({$or : [{ email: new RegExp('^' + data.nameOrEmail + '$', 'i')}, { username: new RegExp('^' + data.nameOrEmail + '$', 'i')}]}, function(error1, accounts) {
            if(accounts.length == 1) {
                bcrypt.compare(data.password, accounts[0].passHash, function(error2, match) {
                    if(match)
                        Callback(true, accounts[0]);       
                    else
                        Callback(false, "Incorrect password.");  
                });
            }
            else if(accounts.length == 0)
                Callback(false, "Account not found.");
            else if(error1) {
                console.log("Error in mongoHdlr.js CheckLoginCreds():");
                console.log(error1);
                Callback(false, "Something went wrong on the server. Try again later.");
            }         
        });
    }
    var FindNameOrEmail = function (data, Callback) {
        db[colls.ACCOUNTS].find({$or : [{ email: new RegExp('^' + data.email + '$', 'i')}, { username: new RegExp('^' + data.username + '$', 'i')}]}, function(error, results) {
            if (results.length > 0)
                Callback(true, results[0]);
            else
                Callback(false, results[0]);
        });
    }

    // V+ Make a single guest account that has a little bit of everything to show, but cannot be changed
    // something just for newcomers to explore to see what making an account has to offer.

    var AddUser = function (data, Callback) {
        
        var newUserObj = {
            socketID: null,
            username: data.username,
            passHash: '',
            email: data.email,
            avatarExt: '',
            bio: {
                firstName: '',
                lastName: '',
                profDesig: '',
                desc: ''
            },
            following: [], 
            followers: [],
            followReqAutoOpt : Consts.inviteResps.NONE,
            blocking: [],
            blockers: [],
            permissions: {
                viewDebate: Consts.permTypes.MOD,
                viewFeedback: Consts.permTypes.MOD,
                viewRating: Consts.permTypes.ANYONE,
                submitFeedback: Consts.permTypes.ANYONE,
                submitRating: Consts.permTypes.LOGGEDIN
            },
            preferences: { // TODO: Include some options for how much personal info gets displayed, such as contact info (email)
                treeLayout: {
                    argShowContDets: true,
                    argShowMetadets: false,
                    argShowContext: false,
                    ratingShowSelf: true,
                    ratingShowMod: false,
                    ratingShowVis: false,
                    ratingShowOpen: false,
                    favShowSelf: true,
                    favShowMod: false,
                    favShowVis: false,
                    favShowOpen: false
                },
                confMsgs: {
                    // Other confirm msgs for delete account & delete tree will not have option to be circumvented.
                    stopFollowing: true,
                    cutFollower: true,
                    unblock: true,
                    rescindInv: true,
                    removeLink: true,
                    changeArg: true,
                    editLimit: true,
                    deleteFB: true
                }                
            },
            created: [],
            moderating: [],
            guestOf: [],
            bookmarked: {
                ctrl: {},
                open: {}
            },
            ratings: {
                argStr: {
                    ctrl: {},
                    open: {}
                },
                revInt: {}
            },
            recentTreeVis: [] //Keep track of the last 5 treeIDs visited
        }
        
        // The result here is the same obj but with the db id included
        db[colls.ACCOUNTS].insert(newUserObj, function (error1, result) {
            // Set password hash here so user doesn't have to wait for it
            bcrypt.hash(data.password, Consts.SALT_ROUNDS, function(error2, hash) {
                // Set password hash as db reference item
                Update(colls.ACCOUNTS, { _id: result._id }, { $set: { passHash: hash }}, {}, function(nModifed) {});
            });
            Callback(result);
        });
    }

    var Find = function(collection, queryObj, Callback) {
        db[collection].find(queryObj, function (error, docs) {
            if(error) {
                console.log('mongoHdlr.js, Find(), error returned. Collection: ' + collection + ', queryObj:');
                console.log(queryObj);
                // TODO: Set up special messaging (email myself) for instances like this, where an obvious logic error has occured.
            }
            else
                Callback(docs);                
        });
    }
    var Update = function (collection, queryObj, modifierObj, optsObj, Callback) {
        db[collection].update(queryObj, modifierObj, optsObj, function (error, result) {
            if (error)
                console.log(error);
            else {
                //console.log("Updated Collection: " + collection);
                //console.log(result);
                Callback(result.nModified);
            }
        });
    }
    var FindAndUpdate = function (collection, query, modifierObj, postModReturn, Callback) {
        db[collection].findAndModify({ query: query, update: modifierObj, new: postModReturn }, function (error, doc) {
            if (error) {
                console.log(error);
                Callback(false, doc);
            }
            else if (doc === null)
                Callback(false, doc);
            else {
                //console.log("Found and updated Collection: " + collection);
                Callback(true, doc);
            }
        });
    }

    var LogoutHdlr = (query) => Update(colls.ACCOUNTS, query, { $set: { socketID: null }}, {}, function (nModified) {});

    // Abstracted permission/data checking functions
    function GetAdminPermObj() { return { isAdmin: true, isMod: true, loggedIn: true, canViewTree: true, canViewFeedback: true, canViewRatings: true, canSubmitFeedback: false, canRate: true }; }
    function GetBlockedPermObj(isLoggedIn) { return { isAdmin: false, isMod: false, loggedIn: isLoggedIn, canViewTree: false, canViewFeedback: false, canViewRatings: false, canSubmitFeedback: false, canRate: false }; }
    function GetArchivedPermObj(isLoggedIn) { return { isAdmin: false, isMod: false, loggedIn: isLoggedIn, canViewTree: true, canViewFeedback: true, canViewRatings: true, canSubmitFeedback: false, canRate: false }; }
    function GetOpenPermObj(isLoggedIn) { return { isAdmin: false, isMod: false, loggedIn: isLoggedIn, canViewTree: true, canViewFeedback: false, canViewRatings: true,  canSubmitFeedback: false, canRate: isLoggedIn }; }
    // V+ Add "canTag" permission
    function GetPermObj(clientStatus, treePerms) {
        return {
            isAdmin: clientStatus == Consts.permTypes.ADMIN,
            isMod: clientStatus >= Consts.permTypes.MOD,
            loggedIn: clientStatus > Consts.permTypes.ANYONE,
            canViewTree: clientStatus >= treePerms['viewDebate'],
            canViewFeedback: clientStatus >= treePerms['viewFeedback'],
            canViewRatings: clientStatus >= treePerms['viewRating'],
            // Mods/admin cannot send their own trees submissions
            canSubmitFeedback: clientStatus < Consts.permTypes.MOD && clientStatus >= treePerms['submitFeedback'],
            canRate: clientStatus >= treePerms['submitRating']
        };
    }
    function GetClientStatus(accountID, treeAdminID, guestList, modList) {
        if(treeAdminID)
            treeAdminID = treeAdminID.valueOf();

        var clientStatus = Consts.permTypes.LOGGEDIN;
        if(accountID == treeAdminID)
            return Consts.permTypes.ADMIN;
        else if(accountID == null)
            return Consts.permTypes.ANYONE;
        else {
            // I intentionally check for guest status first so mod status takes priority, incase someone is added to both lists.
            // They'll have to be dropped as a mod in order to regain guest functionality.
            for(var i = 0, len = guestList.length; i < len; i++)
                if((accountID == guestList[i].accountID.valueOf()) && guestList[i].invite == Consts.inviteResps.ACCEPT)
                    clientStatus = Consts.permTypes.GUEST;
            for(var i = 0, len = modList.length; i < len; i++)
                if((accountID == modList[i].accountID.valueOf()) && modList[i].invite == Consts.inviteResps.ACCEPT)
                    clientStatus = Consts.permTypes.MOD;
        }
        return clientStatus;
    }
    function CheckCanView(blockers, accountID, adminID, perms) {
        // Does the admin have me blocked?
        if(blockers)
            for(var i = 0; i < blockers.length; i++)
                if(blockers[i] == adminID)
                    return false;

        if(GetClientStatus(accountID, adminID, perms.guests, perms.moderators) < perms['viewDebate'])
            return false;

        return true;
    }

    function CreateTree(data, trunk, Callback) {
        var newTreeObj = {};
        
        if(data.isControlled) {
            newTreeObj['adminID'] = ObjectId(data.accountID);
            newTreeObj['archived'] = false;
            newTreeObj['archTimeStamp'] = '';
        }

        newTreeObj['title'] = data.title;
        // TODO: Implement
        newTreeObj['imgExt'] = '';
        newTreeObj['tags'] = [];

        if(data.isControlled) {
            newTreeObj['permissions'] = {
                viewDebate: Consts.permTypes.MOD,
                viewFeedback: Consts.permTypes.MOD,
                viewRating: Consts.permTypes.ANYONE,
                submitFeedback: Consts.permTypes.ANYONE,
                submitRating: Consts.permTypes.LOGGEDIN,
                guests: [],
                moderators: []
            };
            newTreeObj['modChat'] = [];
        }

        newTreeObj['branches'] = [trunk];

        db[data.isControlled ? colls.CTRL_TREES : colls.OPEN_TREES].insert(newTreeObj, function (error, tree) {
            if (!error)
                Callback(true, tree);
            else
                console.log(error)  
        });
    }

    //* Many fields build with arrays are using Consts.argType to satisfy their index-based changes
    function CreateBranch(data) {
        var newBranchObj = {};
        newBranchObj['_id'] = ObjectId();
        if(data.isControlled) {
            newBranchObj['submArg'] = {
                username: data.submArgUsername || null,
                id: data.submArgID || null
            };
        }

        // V+ Implement - particularly useful when changing columns.
        // Though, if I go with the hard enforced stage/commit option, and do not actually create the
        // timeline (or make any other major changes) until the arg is locked down, this wouldn't be necessary.
        // newBranchObj['timelineRef'] = [ timelineObjID, timelineObjID, timelineObjID ];        

        // TODO: Get rid of this - wasted space (need to change everything this touches first)
        newBranchObj['timeStamp'] = newBranchObj['_id'].getTimestamp();
        newBranchObj['parent'] = data.parentIdx;
        newBranchObj['extParentConns'] = {}; // treeID: branchIdx
        newBranchObj['interactions'] = {
            direct: 0,
            cumulative: 0
        };
        newBranchObj['type'] = data.type;
        newBranchObj['typeAliases'] = ['Pro', 'Con'];
        newBranchObj['canEdit'] = data.canEdit;
        newBranchObj['assertion'] = data.assertion;
        newBranchObj['elaboration'] = data.elaboration;
        newBranchObj['sources'] = data.sources;

        if(data.isControlled) {
            newBranchObj['rating'] = {
                mod: {
                    cumuValue: 0,
                    entries: 0,
                    override: false
                },
                vis: {
                    cumuValue: 0,
                    entries: 0,
                    override: false
                }
            };
            newBranchObj['favour'] = {
                mod: [{ entries: 0, avg: 0 }, { entries: 0, avg: 0 }],
                vis: [{ entries: 0, avg: 0 }, { entries: 0, avg: 0 }]
            }
            newBranchObj['revision'] = {
                list: [],
                integ: {
                    pos: 0,
                    neg: 0
                }
            }
        }
        else {
            newBranchObj['rating'] = {
                cumuValue: 0,
                entries: 0,
                override: false
            };
            newBranchObj['favour'] = [{ entries: 0, avg: 0 }, { entries: 0, avg: 0 }]
        }

        newBranchObj['hasChildren'] = false;
        newBranchObj['children'] = [[], [], []]; //* See consts.js for type sequence
        //newBranchObj['extChildConns'] = [{}, {}, {}]; // treeID: branchIdx
        // TODO: "Dependencies" will be eliminated, and the external child connections will
        // likely fill that void as "Contributing debates" or something to that effect,
        // essentially being what "dependencies" are, but as linked external debates.
        // They won't go into pro or con - middle, direct contribution only.
        // Use an object:
        // {
        //     treeID: '',
        //     branchIdx: -1,
        //     timeStamp: '',
        //     title: '',  - Repeat for the sake of display here
        //     assertion (at index): '', - Repeat for the sake of display here
        //     favourUsed: true/false,  - Maybe the favour isn't used for everything connected to? Giving mods the option would allow many more connections without it being a ratings-calculation-nightmare
        //     ???
        // }

        return newBranchObj;
    }
    function GetModeratorBioData(noMods, adminID, mods, CB) {
        if(noMods) {
            CB([]);
            return;
        }

        var ids = adminID ? [adminID] : [];
        for(var i = 0, len = mods.length; i < len; i++) {
            if(mods[i].invite == Consts.inviteResps.ACCEPT)
                ids.push(mods[i].accountID);
        }

        // I could just send back the account objects, but as they grow, this will be more efficient
        // TODO: Use aggregate pipeline or capture data one-at-a-time to make this way more efficient
        
        var accountsList = [];
        Find(colls.ACCOUNTS, { _id: { $in: ids }}, function(accounts) {
            for(var i = 0, len = accounts.length; i < len; i++) {
                accountsList.push({
                    accountID: accounts[i]._id,
                    invite: Consts.inviteResps.ACCEPT,
                    username: accounts[i].username,
                    bio: accounts[i].bio
                });

                // * The double loop is to match each mod (as listed in the tree doc) with their account, to blend the information from both.
                // Still not seeing the point actually. This above works just fine.
                /*
                for(var j = 0, jLen = mods.length; j < jLen; j++) {
                    if(mods[j].accountID.toString() == accounts[i]._id.toString()) {
                        accountsList.push({
                            accountID: mods[j].accountID,
                            invite: Consts.inviteResps.ACCEPT,
                            username: accounts[i].username,
                            bio: accounts[i].bio
                        });
                    }
                }*/
            }

            CB(accountsList);
        });
    }

    function GetFBSubm(canViewSubms, isMod, accountID, treeID, CB) {
        if(!canViewSubms) {
            CB(null);
            return;
        }

        db[colls.SUBM_ARGS].find({ treeID: treeID, archived: false }).sort({_id: -1}, function (error, args) {
            if(!error) {
                if(args.length > 0) {
                    // Formatting args into easy-to-reference json with total and unviewed qty's
                    var argObj = {
                        total: args.length,
                        unviewed: 0,
                        branches: {}
                    };
                    for(var i = 0, len = args.length; i < len; i++) {

                        args[i].timeStamp = SuppFuncs.FormatDate(args[i]._id.getTimestamp());
                        args[i]._id = args[i]._id.toString();

                        var unviewedVal = isMod ? (args[i].modViews[accountID] ? 0 : 1) : 0;

                        argObj.unviewed+= unviewedVal;

                        if(!argObj.branches[args[i].branchIdx]) {
                            argObj.branches[args[i].branchIdx] = {
                                total: 0,
                                unviewed: 0,
                                types: {}
                            };
                        }
                        argObj.branches[args[i].branchIdx].total++;
                        argObj.branches[args[i].branchIdx].unviewed+= unviewedVal;

                        if(!argObj.branches[args[i].branchIdx].types[args[i].type]) {
                            argObj.branches[args[i].branchIdx].types[args[i].type] = {
                                total: 0,
                                unviewed: 0,
                                args: {}
                            };
                        }
                        argObj.branches[args[i].branchIdx].types[args[i].type].total++;
                        argObj.branches[args[i].branchIdx].types[args[i].type].unviewed+= unviewedVal;

                        if(!argObj.branches[args[i].branchIdx].types[args[i].type].args[args[i]._id])
                            argObj.branches[args[i].branchIdx].types[args[i].type].args[args[i]._id] = args[i];
                    }
                    CB(argObj);
                }
                else
                    CB(null);
            }
            else
                CB(null);
        });

        // All of this is bloody useless. -_-
        // var aggArr = [];
        // aggArr.push({
        //     $match: {
        //         treeID: treeID
        //     }
        // });
        // aggArr.push({
        //     $group: {
        //         _id: treeID
        //     }
        // });
        
        // aggArr.push({
        //     $project: {
        //         treeFBObj: {
        //             $let: {
        //                 vars: {
        //                     indices: { $addToSet: "$branchIdx"}
        //                 },
        //                 in: {
        //                     argID: "$_id",
        //                     accountID: "$accountID",
        //                     username: "$username",
        //                     branchIdx: "$branchIdx",
        //                     type: "$type",
        //                     viewed: "$viewed",
        //                     arg: {
        //                         asser: "$assertion",
        //                         elab: "$elaboration",
        //                         src: "$sources"
        //                     }
        //                 }
        //             }
        //         }               
        //     }
        // });

        // db[colls.SUBM_ARGS].aggregate(aggArr, function (error, docs) {
        //     console.log(docs);
        // });

        // VERSION 1
        // function map() {
        //     emit(this.branchIdx, {
        //         argID: this._id,
        //         accountID: this.accountID,
        //         username: this.username,
        //         type: this.type,
        //         viewed: this.viewed,
        //         arg: {
        //             asser: this.assertion,
        //             elab: this.elaboration,
        //             src: this.sources
        //         }
        //     });
        // }
        // function reduce(branchIdx, values) {
        //     var retObj = {};
        //     for(var i = 0; i < values.length; i++) {
        //         var pushObj = {
        //             argID: values[i].argID,
        //             accountID: values[i].accountID,
        //             username: values[i].username,
        //             viewed: values[i].viewed,
        //             arg: values[i].arg
        //         };
        //         if(retObj[values[i].type])
        //             retObj[values[i].type].push(pushObj);
        //         else
        //             retObj[values[i].type] = [pushObj];
        //     }
        //     return retObj;
        // }
        // VERSION 2
        // function map() {
        //     var valObj = {};
        //     valObj[this.type] = [{
        //         argID: this._id,
        //         accountID: this.accountID,
        //         username: this.username,
        //         type: this.type,
        //         viewed: this.viewed,
        //         arg: {
        //             assertion: this.assertion,
        //             elaboration: this.elaboration,
        //             sources: this.sources
        //         }
        //     }];
        //     emit(this.branchIdx, valObj);
        // }
        // function reduce(branchIdx, values) {
        //     var retObj = {};
        //     for(var i = 0; i < values.length; i++) {
        //         for(var key in values[i]) {
        //             if(retObj[key])
        //                 retObj[key] = retObj[key].concat(values[i][key][0]);
        //             else
        //                 retObj[key] = [values[i][key][0]];
        //         }
        //     }
        //     return retObj;
        // }
        // VERSION 3
        // function map() {
        //     emit(this.treeID, {
        //         argID: this._id,
        //         branchIdx: this.branchIdx,
        //         accountID: this.accountID,
        //         username: this.username,
        //         type: this.type,
        //         viewed: this.viewed,
        //         arg: {
        //             asser: this.assertion,
        //             elab: this.elaboration,
        //             src: this.sources
        //         }
        //     });
        // }
        // function reduce(treeID, values) {
        //     var retObj = {};
        //     for(var i = 0; i < values.length; i++) {
        //         var pushObj = {
        //             argID: values[i].argID,
        //             accountID: values[i].accountID,
        //             username: values[i].username,
        //             viewed: values[i].viewed,
        //             arg: values[i].arg
        //         };
        //         if(retObj[values[i].branchIdx]) {
        //             if(retObj[values[i].branchIdx][values[i].type])
        //                 retObj[values[i].branchIdx][values[i].type].push(pushObj);
        //             else
        //                 retObj[values[i].branchIdx][values[i].type] = [pushObj];
        //         }
        //         else {
        //             retObj[values[i].branchIdx] = {}; 
        //             retObj[values[i].branchIdx][values[i].type] = [pushObj];
        //         }
        //     }
        //     return retObj;
        // }
        // //function finalize(branchIdx, reducedValues) {}

        // db[colls.SUBM_ARGS].mapReduce(
        //     map,
        //     reduce,
        //     //finalize,
        //     {
        //         query: { treeID: treeID },
        //         out: 'ArgSubmMapReduceOut'
        //     }
        // );
    }
    //GetFBSubm(true, '5a1b383598b00804d80f7233', function(){});

    function GetFavPct(favObj, retType) {
        var pctHolder = [0, 0];
        pctHolder[Consts.argTypes.CORROB] = favObj[Consts.argTypes.CORROB].avg * favObj[Consts.argTypes.CORROB].entries;
        pctHolder[Consts.argTypes.REFUTE] = favObj[Consts.argTypes.REFUTE].avg * favObj[Consts.argTypes.REFUTE].entries;
        var compTotal = pctHolder[Consts.argTypes.CORROB] + pctHolder[Consts.argTypes.REFUTE];
        return (compTotal > 0) ? (pctHolder[retType] / compTotal) * 100 : 50;
    }
    function FavourObjBldr(branches, idx, parentIdx, argType, ratedIdxList, retObj, forUser) {
        var ratePctTally = 0;
        rateEntries = 0;

        var favAvgTally = 0,
        favEntries = 0;

        var argSibs = branches[parentIdx].children[argType];

        // V+ Perhaps store other debate's favour here as well, perhaps just fetch and display it
        // var dependSibs = branches[parentIdx].children[Consts.argTypes.EXT_CONTRIB];

        // Get str rating averages for type of given arg.
        for(var i = 0; i < argSibs.length; i++) {
            // Since I've already filtered for useful indexes, just use this check to determine whether to use the rating or favour here.
            if(ratedIdxList[argSibs[i]]) {
                if(!ratedIdxList[argSibs[i]].override) {
                    // Remove arg about to be used from current loop so it doesn't initiate it's own loop cycle frivolously.
                    ratedIdxList[argSibs[i]].used = true;
                    if(forUser) {
                        rateEntries ++;
                        ratePctTally += (ratedIdxList[argSibs[i]].rating / 5) * 100;
                    }
                    else {
                        rateEntries += ratedIdxList[argSibs[i]].rating.entries;
                        ratePctTally += (ratedIdxList[argSibs[i]].rating.cumuValue / 5) * 100;
                    }
                }
                else {
                    // If it's on the list of useful indices(so has a rating), but has been deemed overridden, it must have a favour slot in the retObj
                    favEntries += retObj[argSibs[i]].favObj[Consts.argTypes.CORROB].entries;
                    favAvgTally += GetFavPct(retObj[argSibs[i]].favObj, Consts.argTypes.CORROB);
                }
            }
            else {
                // Get favour if there's any to be had
                // The favour for this index will be calculated/captured as a parent, since it's children must be on the 'ratedIdxList'.
                if(retObj[argSibs[i]]) {
                    favEntries += retObj[argSibs[i]].favObj[Consts.argTypes.CORROB].entries;
                    favAvgTally += GetFavPct(retObj[argSibs[i]].favObj, Consts.argTypes.CORROB);
                }
            }
        }
        // V+ Perhaps store other debate's favour here as well, perhaps just fetch and display it
        /*
        for(var i = 0; i < dependSibs.length; i++) {
            // Get favour if there's any to be had
            if(retObj[dependSibs[i]]) {
                favEntries += retObj[dependSibs[i]].favObj[argType].entries;
                favAvgTally += GetFavPct(retObj[dependSibs[i]].favObj, argType);
            }
        }*/

        var totalEntries = rateEntries + favEntries;
        if(totalEntries > 0) {
            // "Entries" means inputs, not people, so it still needs to be tracked.
            if(!retObj[parentIdx])
                retObj[parentIdx] = {
                    override: true,
                    favObj: [{ entries: 0, avg: 0 }, { entries: 0, avg: 0 }]
                };

            retObj[parentIdx].favObj[argType].entries = totalEntries;
            retObj[parentIdx].favObj[argType].avg = (ratePctTally + favAvgTally) / totalEntries;
        }
    }
    function IdxListLoop(idxList, branches, retObj, forUser) {
        for(var idx in idxList) {
            if(!(idxList[idx].used || idxList[idx].override)) {
                idxList[idx].used = true;

                function ParentChainFavRecursion(idx) {
                    var parentIdx = branches[idx].parent;
                    if(parentIdx < 0)
                        return;

                    if(idxList[parentIdx])
                        idxList[parentIdx].override = true;

                    var argType = branches[idx].type;
                    // V+ Perhaps store other debate's favour here as well, perhaps just fetch and display it
                    // if(argType == Consts.argTypes.EXT_CONTRIB) {
                    //     FavourObjBldr(branches, idx, parentIdx, Consts.argTypes.CORROB, idxList, retObj, forUser);
                    //     FavourObjBldr(branches, idx, parentIdx, Consts.argTypes.REFUTE, idxList, retObj, forUser);
                    // }
                    // else
                    FavourObjBldr(branches, idx, parentIdx, argType, idxList, retObj, forUser);

                    ParentChainFavRecursion(parentIdx);
                }
                ParentChainFavRecursion(idx);
            }
        }
    }
    function FavourCalcUser(strRatings, branches, isControlled) {
        var retObj = {};

        // Get only those entries that are useful in calculating this debate's favourability.
        // The "used" prop has a true/false value to set as true during initial use and/or when looping over an argument's siblings
        var ratedIdxList = {};
        for(var idx in strRatings) {
            if(strRatings[idx] != -1)
                ratedIdxList[idx] = { rating: strRatings[idx], used: false, override: false };
        }

        IdxListLoop(ratedIdxList, branches, retObj, true);
        return retObj;
    }

    
    /**
     * Used when many ratings change at once. (Running CtrlRatingTransfer function)
     * @param {array} branches 
     * @param {string} ratedAs - 'mod' or 'vis'
     */
    function FavourCalcTree(branches, modifier, ratedAs) {
        var retObj = {};

        var ratedIdxList = {};
        for(var i = 0, len = branches.length; i < len; i++)
            if(ratedAs)
                if(branches[i].rating[ratedAs].entries > 0)
                    ratedIdxList[i] = { rating: branches[i].rating[ratedAs], used: false, override: false };
            else
                if(branches[i].rating.entries > 0)
                    ratedIdxList[i] = { rating: branches[i].rating, used: false, override: false };

        IdxListLoop(ratedIdxList, branches, retObj, false);

        for(var i = 0, len = branches.length; i < len; i++) {
            var corrEntries = corrAvg = refuEntries = refuAvg = 0;
            var override = false;
            if(retObj[i]) {
                corrEntries = retObj[i].favObj[Consts.argTypes.CORROB].entries;
                corrAvg = retObj[i].favObj[Consts.argTypes.CORROB].avg;
                refuEntries = retObj[i].favObj[Consts.argTypes.REFUTE].entries;
                refuAvg = retObj[i].favObj[Consts.argTypes.REFUTE].avg;
                override = retObj[i].override;
            }

            var userTypeStr = ratedAs ? ratedAs + '.' : '';
            modifier.$set['branches.' + i + '.favour.' + userTypeStr + Consts.argTypes.CORROB + '.entries'] = corrEntries;
            modifier.$set['branches.' + i + '.favour.' + userTypeStr + Consts.argTypes.CORROB + '.avg'] = corrAvg;
            modifier.$set['branches.' + i + '.favour.' + userTypeStr + Consts.argTypes.REFUTE + '.entries'] = refuEntries;
            modifier.$set['branches.' + i + '.favour.' + userTypeStr + Consts.argTypes.REFUTE + '.avg'] = refuAvg;
            modifier.$set['branches.' + i + '.rating.' + userTypeStr + 'override'] = override;
        }
    }

    function ModTreeRetObj(retObj, tree, branchIdx, isControlled, permObj, submArgsAct, strRatings, accountID, CB) {
        // Function calls database, CB will be delayed
        GetModeratorBioData(!isControlled || !!tree.archived, tree.adminID == accountID ? null : tree.adminID, tree.permissions ? tree.permissions.moderators : null, function(modDataList) {
            retObj['treeData'] = tree;
            retObj['timeStamp'] = SuppFuncs.FormatDate(tree._id.getTimestamp());
            retObj['idx'] = branchIdx;
            retObj['isControlled'] = isControlled;
            retObj['permObj'] = permObj;
            retObj['tagString'] = EJS_LI_TagList({
                tagArr: tree.tags,
                canRemove: !isControlled || (permObj.isMod && !tree.archived) 
            });

            if(isControlled && !tree.archived) {
                if(permObj.isAdmin) {
                    retObj['guestInviteString'] = EJS_LI_AddUser({ liArr: tree.permissions.guests, indOnline: false, userConnName: true, userConnOpts: false, statusInd: true, accRejBtns: true, accBtn: false, inviteResps: Consts.inviteResps });
                    retObj['modInviteString'] = EJS_LI_AddUser({ liArr: tree.permissions.moderators, indOnline: true, userConnName: true, userConnOpts: false, statusInd: true, accRejBtns: true, accBtn: false, inviteResps: Consts.inviteResps });
                }
                else if(permObj.isMod)
                    retObj['modInviteString'] = EJS_LI_AddUser({ liArr: modDataList, indOnline: true, userConnName: true, userConnOpts: false, statusInd: false, accRejBtns: false, accBtn: false, inviteResps: Consts.inviteResps });
                else
                    retObj['modInviteString'] = EJS_LI_AddUser({ liArr: modDataList, indOnline: false, userConnName: false, userConnOpts: permObj.loggedIn, statusInd: false, accRejBtns: false, accBtn: false, inviteResps: Consts.inviteResps });
            }

            retObj['branchListString'] = '';
            for(var i = 0, len = tree.branches.length; i < len; i++) {
                retObj['branchListString'] += EJS_LI_BranchListLinear({
                    branch: tree.branches[i],
                    timeStamp: SuppFuncs.FormatDate(tree.branches[i].timeStamp),
                    idx: i,
                    canViewFeedback: permObj.canViewFeedback,
                    submArgsAct: submArgsAct,
                    isMod: permObj.isMod,
                    argTypes: Consts.argTypes
                });
            }
            
            retObj['userFavour'] = {};
            if(accountID) {
                if(strRatings)
                    retObj['userFavour'] = FavourCalcUser(strRatings || {}, tree.branches, isControlled);
            }

            retObj['treeString'] = EJS_FullTree({
                isCtrl: !!tree.adminID,
                archived: !!tree.archived,
                tree: tree,
                idx: branchIdx,
                meta: {
                    pathPartials: 'views/partials/',
                    pathIncludes: 'views/includes/'
                },
                permObj: permObj,
                strRatings: strRatings || {},
                userFavour: retObj['userFavour'],
                argTypes: Consts.argTypes
            });

            
            if(accountID) // Add tree to "recent tree visits" list
                AddRecTreeVis(ObjectId(accountID), isControlled, tree._id, tree._id.toString(), tree.title, tree.branches[0].assertion, retObj, CB);
            else
                CB();
        });
    }
    function GetTreeDelay(tree, data, CB, success) {
        var cbObj = { success: success };
        // Who is client relative to branch.
        var permObj
        if(data.isControlled) {
            // Check that user isn't blocked from admin
            if(data.blockers)
                for(var i = 0; i < data.blockers.length; i++)
                    if(data.blockers[i] == tree.adminID) {
                        permObj = GetBlockedPermObj(!!data.accountID);
                        break;
                    }

            if(!permObj) {
                if(tree.archived)
                    permObj = GetArchivedPermObj(!!data.accountID);
                else
                    permObj = GetPermObj(
                        GetClientStatus(data.accountID, tree.adminID, tree.permissions.guests, tree.permissions.moderators), 
                        tree.permissions
                    );
            }
        }
        else
            // open branch
            permObj = GetOpenPermObj(!!data.accountID);

        if(permObj.canViewTree) {
            // Tree must be controlled, and user must be permitted to view submissions or "submArgsAct" is null
            GetFBSubm(data.isControlled && permObj.canViewFeedback, permObj.isMod, data.accountID, tree._id.toString(), function(submArgsAct) {
                if(submArgsAct)
                    cbObj['submArgsAct'] = submArgsAct;
                // Prepare common tree data
                ModTreeRetObj(cbObj, tree, data.branchIdx, data.isControlled, permObj, submArgsAct, data.strRatings, data.accountID || null, function() {
                    CB(cbObj);
                });
            });            
        }
        else {
            cbObj['success'] = false;
            cbObj['treeID'] = tree._id;
            cbObj['msg'] = 'You are not permitted to view this debate.';
            CB(cbObj);
        }
    }
    function GetTree(data, Callback) {
        db[data.isControlled ? colls.CTRL_TREES : colls.OPEN_TREES].find({ _id: ObjectId(data.treeID) }, function (error, trees) {
            if(trees.length == 1) {
                // Incase the url gets messed with or something else goes awry, default to the trunk
                if(!trees[0].branches[data.branchIdx])
                    data.branchIdx = 0;

                GetTreeDelay(trees[0], data, Callback, true);
            }
            else
                Callback({ success: false, msg: 'This debate does not exist.' });
        });
    }
    // V+ Make this an object that includes a timestamp, and if that's the case, maybe also re-orders the list chronologically everytime one (already on the list) is visited
    function AddRecTreeVis(accountID, isCtrl, idObj, idString, title, asser, cbObj, CB) {
        // Push this tree into the front of the list, so long as it's not already there.
        var modifier =  { $push: {} };
        modifier.$push['recentTreeVis'] = { $each: [idObj], $position: 0 };
        var query = { _id: accountID };
        query['recentTreeVis'] = { $ne: idObj };
        Update(colls.ACCOUNTS, query, modifier, {}, function(nModified) {
            var modifier =  { $pop: {} };
            modifier.$pop['recentTreeVis'] = 1;
            query = { _id: accountID };
            query['recentTreeVis.' + Consts.REC_TREE_VIS_QTY] = { $exists: true };
            Update(colls.ACCOUNTS, query, modifier, {}, function(nModified2) {
                if(nModified == 1) {
                    cbObj['newRecentTreeVis'] = {
                        id: idString,
                        linkString: EJS_LI_DashTreeLink({linkDataArr: [{
                            id: idString,
                            isCtrl: isCtrl,
                            title: title,
                            assertion: asser
                        }]})
                    };
                }
                CB();
            });
        });
    }
    function CreateTimelineDoc(timelineObj, Callback) {
        db[colls.TIMELINE].insert(timelineObj, function (error, result) {
            if(!error)
                Callback(result);
            else
                console.log('mongoHdlr.js, CreateTimelineDoc(), error');
        });
    }
    function CreateTimelineString(dataObj, showName) {
        dataObj.timeStamp = SuppFuncs.FormatDate(dataObj._id.getTimestamp());
        dataObj.typeDesc = timeBldr.typeDescs[dataObj.type];
        //! This may be incomplete once I start linking trees, as open tree could also be linked
        dataObj.isCtrl = dataObj.type != timeBldr.types.CREATE_OPEN;
        dataObj.hasSender = dataObj.type == timeBldr.types.ADOPT_SUBM;
        dataObj.argTypeName = Consts.argNames[dataObj.argType];
        dataObj.showPosted = !!dataObj.asser2
        return EJS_LI_Timeline({ showName: showName, li: dataObj, types: timeBldr.types });
    }
    function CreateSubmArg(data, Callback) {
        var newDoc = {
            accountID: data.accountID,
            username: data.sender,
            modViews: {}, // key = accountIDs : value = viewed
            treeID: data.treeID,
            branchIdx: Number(data.idx),
            type: data.type,
            assertion: data.assertion,
            elaboration: data.elaboration,
            sources: data.sources,
            archived: false,
            archiver: '', // id of mod who deleted it
            adoptions: [] // List of branch indices this arg was directly used to create
        }
        for(var i = 0, len = data.modArr.length; i < len; i++) {
            newDoc['modViews'][data.modArr[i]] = false;
        }
        db[colls.SUBM_ARGS].insert(newDoc, function (error, result) {
            Callback(result);
        });
    }

    function GetViewableArgSubmCounts(stringIDs, accountID, CB) {
        if(stringIDs.length < 1) {
            CB(null);
            return;
        }

        var pipeline = [];

        pipeline.push({ $match: {
            'archived' : false,
            'treeID' : { $in : stringIDs }
        }});
        pipeline.push({ $project: {
            _id: 0,
            treeID: 1,
            unviewed: {$cond: [{$eq: ['$modViews.' + accountID, false]}, 1, 0]}
        }});
        pipeline.push({ $group: {
            _id: null,
            total: {$sum: 1},
            unviewed: {$sum: '$unviewed'},
            trees: {$push: {
                treeID: '$treeID',
                unviewed: '$unviewed'
            }}
        }});
        pipeline.push({ $unwind: '$trees'});
        pipeline.push({ $group: {
            _id: '$trees.treeID',
            total: {$first: '$total'},
            unviewed: {$first: '$unviewed'},
            totalByTree: {$sum: 1},
            unviewedByTree: {$sum: '$trees.unviewed'}
        }});
        pipeline.push({ $group: {
            _id: '$total',
            unviewed: {$first: '$unviewed'},
            byTree: {$push: {
                treeID: '$_id',
                counts: {
                    total: '$totalByTree',
                    unviewed: '$unviewedByTree'
                }
            }},
        }});

        // V+ Sort of... Openshift server currently only runs mongo version 3.2.10, so $arrayToObject is out.
        // pipeline.push({$project: {
        //     total: '$_id',
        //     _id: 0,
        //     unviewed: 1,
        //     byTreeID: {
        //         $arrayToObject: {
        //             $map: {
        //                 input: '$byTree',
        //                 as: 'pair',
        //                 in: ['$$pair.treeID', '$$pair.counts']
        //             }
        //         }
        //     }
        // }});

        // Replacement for above, without mapping in pipeline
        pipeline.push({$project: {
            total: '$_id',
            _id: 0,
            unviewed: 1,
            byTreeID: '$byTree'
        }});

        db[colls.SUBM_ARGS].aggregate(pipeline, function (error, countObj) {
            if(countObj) {
                if(countObj.length == 1) {
                    // V+ If Openshift should change to mongo 3.6, can get rid of everything before CB(countObj[0]);
                    var byTreeIdObj = {};
                    for(var i = 0; i < countObj[0].byTreeID.length; i++)
                        byTreeIdObj[countObj[0].byTreeID[i].treeID] = countObj[0].byTreeID[i].counts;

                    countObj[0].byTreeID = byTreeIdObj;
                    CB(countObj[0]);
                }
                else if(countObj.length == 0) {
                    CB(null);
                }
            }
            else if(error) {
                console.log('mongoHdlr.js, GetViewableArgSubmCounts(), error in aggregate pipeline');
                CB(null);
            }
            else {
                // No countObj to speak of - no submArgs yet
                CB(null);
            }
        });
    }
    function UpdateModArgSubms(accountMods, accountID, CB) {
        var modStringIDs = [];
        for(var i = 0; i < accountMods.length; i++)
            if(accountMods[i].invAccepted)
                modStringIDs.push(accountMods[i].treeID.toString());

        GetViewableArgSubmCounts(modStringIDs, accountID, CB);
    }
    function GetFollowCounts(follList, countObj) {
        for(var i = 0, len = follList.length; i < len; i++) {
            countObj.total++;
            countObj.byType[follList[i].invite]++;
        }
    }

    function GetAvatarData(accountID, ext, CB) {
        var path = __dirname + '/AvatarDownloadSpace/',
            fileName = accountID + '.' + ext;

        // Stream avatar from mongoDB gridFS into empty folder
        var writeStream = fs.createWriteStream(path + fileName);
        var readStream = gfs.createReadStream({_id: accountID});
        readStream.on('error', function(error) {
            console.log('mongoHdlr.js, GetAvatarData(), error in gfs.createReadStream:');
            console.log(error);
            fs.unlink(path + fileName);
            CB(accountID, null);
        });
        readStream.on('close', function() {
            // Then, send from folder to client
            fs.readFile(path + fileName, function(error, data) {
                if(error) {
                    console.log('mongoHdlr.js, GetAvatarData(), error in fs.readFile:');
                    console.log(error);
                    fs.unlink(path + fileName);
                    CB(accountID, null);
                }
                else {
                    fs.unlink(path + fileName);
                    CB(accountID, "data:image/" + ext + ";base64,"+ data.toString("base64"));
                }
            });
        });
        readStream.pipe(writeStream);
    }

    /*
    function CreateDM() {
        var newDoc = {
            senderID: data,
            sendername: data,
            receiverID: data,
            receiver: data,
            subj: data,
            body: data,
            replyID: data,
            viewed: false
        }
    }*/

    var module = {

        InitSocketCalls: function (io, socket) {

            // socket.emit('ServerToClientTest', {});

            socket.on('ContactAdmin', function (data) {
                var opts = {
                    from: 'Contact Request',
                    to: 'debatabase.app@gmail.com',
                    subject: 'Contact rquest: ' + data.subject,
                    text: 'NAME: ' + data.name + '\nEMAIL: ' + data.email + '\nMESSAGE: ' + data.msg
                };
                mailTrans.sendMail(opts, function(error, info) {
                    if(error) {
                        console.log(error);
                        socket.emit('ContactAdminResp', {success: false});
                    }
                    else {
                        console.log('Email sent: ' + info.response);
                        socket.emit('ContactAdminResp', {success: true});
                    }
                });                
            }); 
            
            // USER/ACCOUNT REQUESTS =================================================================================

            socket.on('Logout', function (data) {
                LogoutHdlr({ _id: ObjectId(data._id) });
            });            

            function RecalcFavCB(groupName) {
                return function(success, updatedTree) {
                    if(success) {
                        var modifier = {$set: {}};
                        FavourCalcTree(updatedTree.branches, modifier, groupName);
                        Update(colls.CTRL_TREES, { _id: updatedTree._id }, modifier, {}, function(nModifed) {});
                    }
                }
            }

            //V+ Create a "disable/deactivate" feature? Would perhaps set timer in databse, 3-6 months without re-activation, archive the trees
            socket.on('RemoveAccount', function (data) {
                var userID = ObjectId(data._id);
                db[colls.ACCOUNTS].findAndModify({ query: {_id: userID}, remove: true }, function (error, account) {
                    if(!error) {
                        // TODO: Bulk update anything here that could use it.
                        // TODO: Send immediate updates to other users when appropriate (e.g. cut any followers who happen to be online)
                        // FOLLOWING
                        var idArr = [];
                        for(var i = 0, len = account.following.length; i < len; i++)
                            idArr.push(account.following[i].accountID);
                        Update(colls.ACCOUNTS, { _id: {$in: idArr} }, { $pull: { 'followers': { 'accountID': userID }}}, {multi: true}, function(nModified) {});
                        
                        // FOLLOWERS - Just cut them, so still, they can see who's been lost, even if not knowing why.
                        idArr = [];
                        for(var i = 0, len = account.followers.length; i < len; i++)
                            idArr.push(account.followers[i].accountID);
                        var query = { _id: {$in: idArr} };
                        query['following.accountID'] = userID;
                        Update(colls.ACCOUNTS, query, { $set: { 'following.$.invite' : Consts.inviteResps.REJECT }}, {multi: true}, function(nModified) {});

                        // BLOCKING
                        idArr = [];
                        for(var i = 0, len = account.blocking.length; i < len; i++)
                            idArr.push(account.blocking[i].accountID);
                        Update(colls.ACCOUNTS, { _id: {$in: idArr} }, { $pull: { 'blockers': userID }}, {multi: true}, function(nModified) {});

                        // BLOCKERS
                        Update(colls.ACCOUNTS, { _id: {$in: account.blockers} }, { $pull: { 'blocking': { 'accountID': userID }}}, {multi: true}, function(nModified) {});

                        // LEAVE CURRENT ROOM IF IN ONE
                        if(data.inRoom)
                            LeaveRoom(data.roomName, account.username);

                        // ARCHIVE CTRL TREES
                        for(var i = 0, len = account.created.length; i < len; i++) {
                            CutAllInvites(account.created[i], function(tree) {
                                RemoveSubmArgModViewCheck(data._id, tree._id.toString());
                                ArchiveTree(tree._id);
                            });
                        }

                        // REJECT MOD INVITES - *don't touch ratings here
                        // Collect mod tree ids so when dissolving all ratings, I know when to take from mod and when from vis
                        var modTreeIDs = [];
                        for(var i = 0, len = account.moderating.length; i < len; i++) {
                            if(account.moderating[i].invAccepted)
                                modTreeIDs.push(account.moderating[i].treeID.toString());
                            RemoveInvOnAccountDeletion(account.moderating[i].treeID, 'moderators', account._id, account.username, true, 'ReceiveModInvResp');
                        }

                        // REJECT GUEST INVITES - *don't touch ratings here
                        for(var i = 0, len = account.guestOf.length; i < len; i++)
                            RemoveInvOnAccountDeletion(account.guestOf[i].treeID, 'guests', account._id, account.username, false, 'ReceiveGuestInvResp');

                        // RETRACT ALL RATINGS
                        // ctrl trees
                        // TODO: Filter out what's been archived ahead of time. Currently handling it on update
                        for(var treeID in account.ratings.argStr.ctrl) {
                            var wasMod = modTreeIDs.indexOf(treeID) > -1;
                            var groupName = wasMod ? 'mod' : 'vis';
                            var modifier = { $inc: {}};
                            var incUsed = false;
                            for(var branchIdx in account.ratings.argStr.ctrl[treeID]) {
                                if(account.ratings.argStr.ctrl[treeID][branchIdx] > -1) {
                                    incUsed = true;
                                    modifier.$inc['branches.' + branchIdx + '.rating.' + groupName + '.cumuValue'] = -account.ratings.argStr.ctrl[treeID][branchIdx];
                                    modifier.$inc['branches.' + branchIdx + '.rating.' + groupName + '.entries'] = -1;
                                }
                            }
                            
                            if(incUsed)
                                FindAndUpdate(colls.CTRL_TREES, { archived: false, _id: ObjectId(treeID) }, modifier, true, RecalcFavCB(groupName));
                        }
                        // open trees
                        for(var treeID in account.ratings.argStr.open) {
                            var modifier = { $inc: {}};
                            var incUsed = false;
                            for(var branchIdx in account.ratings.argStr.open[treeID]) {
                                if(account.ratings.argStr.open[treeID][branchIdx] > -1) {
                                    incUsed = true;
                                    modifier.$inc['branches.' + branchIdx + '.rating.cumuValue'] = -strRating;
                                    modifier.$inc['branches.' + branchIdx + '.rating.entries'] = -1;
                                }
                            }
                            
                            if(incUsed)
                                FindAndUpdate(colls.OPEN_TREES, { _id: ObjectId(treeID) }, modifier, true, function(success, updatedTree) {
                                    if(success) {
                                        var modifer = {$set: {}};
                                        FavourCalcTree(updatedTree.branches, modifier);
                                        Update(colls.OPEN_TREES, { _id: updatedTree._id }, modifier, {}, function(nModifed) {});
                                    }
                                });
                        }
                        // revision integ ratings
                        // TODO: Filter out what's been archived ahead of time. Currently handling it on update
                        for(var treeID in account.ratings.revInt) {
                            var modifier = { $inc: {}};
                            var incUsed = false;
                            for(var branchIdx in account.ratings.revInt[treeID]) {
                                if(account.ratings.revInt[treeID][branchIdx] == 1) {
                                    incUsed = true;
                                    modifier.$inc['branches.' + branchIdx + '.revision.integ.pos'] = -1;
                                }
                                else if(account.ratings.revInt[treeID][branchIdx] == -1) {
                                    incUsed = true;
                                    modifier.$inc['branches.' + branchIdx + '.revision.integ.neg'] = -1;
                                }
                            }
                            
                            if(incUsed)
                                Update(colls.CTRL_TREES, { archived: false, _id: ObjectId(treeID) }, modifier, {}, function(nModifed) {});
                        }

                        db[colls.TIMELINE].remove({ accountID: account._id.toString() }, function(error, result) {});
                        socket.emit('RemoveAccountResp', { success: true });
                    }
                });
            });

            // TODO: Do something about these
            var files = {},
            struct = {
                name: null, 
                type: null, 
                size: 0, 
                data: [], 
                slice: 0,
            }
 
            socket.on('AvatarSliceUpload', function(data) {
                if (!files[data.name]) { 
                    files[data.name] = Object.assign({}, struct, data); 
                    files[data.name].data = []; 
                }
                
                // Convert the ArrayBuffer to Buffer 
                data.data = new Buffer(new Uint8Array(data.data)); 
                // Save the data 
                files[data.name].data.push(data.data); 
                files[data.name].slice++;
                
                if(files[data.name].slice * Consts.SLICE_SIZE >= files[data.name].size) { 
                    var fileBuffer = Buffer.concat(files[data.name].data);
                    var path = './Server/AvatarUploadSpace/',
                        fileName = data.name + '.' + data.ext;

                    // First, avatar image goes into open folder
                    fs.writeFile(path + fileName, fileBuffer, (error) => {
                        delete files[data.name];
                        if(error)
                            return socket.emit('AvatarUploadError');

                        // Then use mongoDB gridFS for persistent storage
                        var writeStream = gfs.createWriteStream({_id: data.name});
                        writeStream.on('finish', function() {
                            Update(colls.ACCOUNTS, { _id: ObjectId(data.name) }, { $set: {avatarExt: data.ext}}, {}, function(nModifed) {
                                fs.unlink(path + fileName);
                                socket.emit('AvatarUploadEnd'); 
                            });
                        });
                        fs.createReadStream(path + fileName).pipe(writeStream);
                    });                    
                }
                else { 
                    socket.emit('AvatarReqSlice', { currentSlice: files[data.name].slice }); 
                }
            });
            socket.on('AcquireImgSrc', function(data) {
                Find(colls.ACCOUNTS, { _id: ObjectId(data.accountID), avatarExt: {$ne: ''} }, function(accounts) {
                    if(accounts.length == 1) {
                        GetAvatarData(data.accountID, accounts[0].avatarExt, function(accountID, srcData) {
                            if(srcData)
                                socket.emit('AcquireImgSrcRespByServer', { success: true, idKey: accountID, src: srcData });
                            else
                                socket.emit('AcquireImgSrcRespByServer', { success: false, idKey: accountID });
                        });                       
                    }
                    // TODO: Will need better error handling than this.
                    else { // Assuming prop 'avatarExt' wasn't found
                        socket.emit('AcquireImgSrcRespByServer', { success: false, idKey: data.accountID });
                    }
                });
            });
            /* // TODO: Run this with/after "RemoveAccount" 
            gfs.remove(options, function (err) {
                if (err) return handleError(err);
                console.log('success');
            }); */
            socket.on('UpdateBio', function (data) {
                var modifier = { $set: {} };
                modifier.$set['bio.firstName'] = data.bioObj.firstName;
                modifier.$set['bio.lastName'] = data.bioObj.lastName;
                modifier.$set['bio.profDesig'] = data.bioObj.profDesig;
                modifier.$set['bio.desc'] = data.bioObj.desc;
                Update(colls.ACCOUNTS, { _id: ObjectId(data.accountID) }, modifier, {}, function(nModified) {
                    socket.emit('UpdateBioResponse');
                });
            });
            socket.on('ChangePassword', function (data) {
                Find(colls.ACCOUNTS, { _id: ObjectId(data.accountID) }, function(accounts) {
                    bcrypt.compare(data.currPwd, accounts[0].passHash, function(error, match) {
                        if(match) {
                            bcrypt.hash(data.newPwd, Consts.SALT_ROUNDS, function(error2, newHash) {
                                Update(colls.ACCOUNTS, { _id: accounts[0]._id }, { $set: { passHash: newHash }}, {}, function(nModifed) {});
                            });
                            socket.emit('ChangePasswordResp', { success: true });
                        }      
                        else
                            socket.emit('ChangePasswordResp', { success: false });
                    });
                });
            });
            
            socket.on('ForgotPassword', function (data) {
                // TODO: Modify to appropriately use password hashing with bcrypt. Something more complicated than this needs to be done.
                // Find(colls.ACCOUNTS, { _id: ObjectId(data._id) }, function(accounts) {
                //     var opts = {
                //         from: 'Debatabase Support',
                //         to: accounts[0].email,
                //         subject: 'You forgot your password, sad times ahead.',
                //         text: 'Your password is...'
                //     };
                //     mailTrans.sendMail(opts, function(error, info) {
                //         if(error) {
                //             console.log(error);
                //             socket.emit('ForgotPasswordResp', { success: false });
                //         }
                //         else {
                //             console.log('Email sent: ' + info.response);
                //             socket.emit('ForgotPasswordResp', { success: true });
                //         }
                //     });
                // });
            });
            socket.on('UpdatePreferences', function (data) {
                var modifier = { $set: {} };
                modifier.$set['preferences.' + data.prefObj.key] = data.prefObj.setObj;
                Update(colls.ACCOUNTS, { _id: ObjectId(data.accountID) }, modifier, {}, function(nModified) {
                    socket.emit('UpdatePreferencesResponse', { key: data.prefObj.key, setObj: data.prefObj.setObj });
                });
            });

            // TODO: Expand object to include qty/count/total/etc... maybe... this isn't about popularity, so maybe not?
            socket.on('FollowUser', function (data) {
                // First, check that account with given name/email exists, 
                var query = {$or : [{ email: data.nameOrEmail }, { username: data.nameOrEmail }]};
                //* Checking each possible issue manually so I can tell the req sender why the req might fail
                Find(colls.ACCOUNTS, query, function(accounts) {
                    if(accounts.length > 0) {
                        // Must check if following is already happening here - can't tell simply by name or email entry in client
                        var alreadyFollowing = false;
                        for(var i = 0, len = accounts[0].followers.length; i < len; i++)
                            if(accounts[0].followers[i].accountID == data.accountID) {
                                alreadyFollowing = true;
                                break;
                            }
                        if(!alreadyFollowing) {
                            // If auto-reject is not set up
                            if(accounts[0].followReqAutoOpt != Consts.inviteResps.REJECT) {
                                // If not blocked
                                var blocked = false;
                                for(var i = 0, len = accounts[0].blocking.length; i < len; i++)
                                    if(accounts[0].blocking[i].accountID == data.accountID) {
                                        blocked = true;
                                        break;
                                    }
                                if(!blocked) {
                                    // Add them to my account
                                    var timeStamp = new Date(), 
                                    invite = (accounts[0].followReqAutoOpt == Consts.inviteResps.ACCEPT) ? Consts.inviteResps.ACCEPT : Consts.inviteResps.NONE;

                                    var inviteeObj = {
                                        accountID: accounts[0]._id,
                                        timeStamp: timeStamp,
                                        username: accounts[0].username,
                                        invite: invite
                                    };

                                    // Making sure it's not already in there
                                    var query = { _id: ObjectId(data.accountID) };
                                    query['following.accountID'] = { $ne: accounts[0]._id };
                                    Update(colls.ACCOUNTS, query, { $push: { 'following': inviteeObj }}, {}, function (nModified) {
                                        if(nModified > 0) {
                                            var invitorDataObj = {
                                                accountID: ObjectId(data.accountID),
                                                timeStamp: timeStamp,
                                                username: data.myName,
                                                invite: invite
                                            };

                                            Update(colls.ACCOUNTS, { _id: accounts[0]._id }, { $push: { 'followers': invitorDataObj }}, {}, function(nModified){
                                                socket.emit('FollowUserResp', { 
                                                    success: true,
                                                    accountID: accounts[0]._id,
                                                    inviteeObj: inviteeObj,
                                                    htmlString: EJS_LI_AddUser({ liArr: [inviteeObj], indOnline: false, userConnName: false, userConnOpts: false, statusInd: true, accRejBtns: true, accBtn: false, inviteResps: Consts.inviteResps })
                                                });
                                                // If the user that's been added is currently logged in...
                                                if(accounts[0].socketID) {
                                                    io.to(accounts[0].socketID).emit('ReceiveFollReq', {
                                                        accountID: data.accountID,
                                                        followerObj: invitorDataObj,
                                                        htmlString: EJS_LI_AddUser({ liArr: [invitorDataObj], indOnline: false, userConnName: true, userConnOpts: false, statusInd: false, accRejBtns: true, accBtn: true, inviteResps: Consts.inviteResps })
                                                    });
                                                }
                                            });
                                        }
                                        else {
                                            console.log('Error: User ' + accounts[0].username + ' exists in "following" list of user ' + data.myName + ', but not the other way around.');
                                            socket.emit('FollowUserResp', { success: false, msg: "Already following this user's activity" });
                                        }
                                    });
                                }
                                else
                                    socket.emit('FollowUserResp', { success: false, msg: "Cannot follow this user's activity" });
                            }
                            else
                                socket.emit('FollowUserResp', { success: false, msg: "Cannot follow this user's activity at this time" });
                        }
                        else
                            socket.emit('FollowUserResp', { success: false, msg: "Already following this user's activity" });
                    }
                    else
                        socket.emit('FollowUserResp', { success: false, msg: "Could not find user" });
                });
            });
            socket.on('StopFollowing', function (data) {
                // Remove user being followed from "my" account
                Update(colls.ACCOUNTS, { _id: ObjectId(data.followerID) }, { $pull: { 'following': { 'accountID': ObjectId(data.followedID) }}}, {}, function(nModified) {
                    if(data.invStatus != Consts.inviteResps.REJECT) {
                        // Remove "me" from "theirs"
                        FindAndUpdate(colls.ACCOUNTS, { _id: ObjectId(data.followedID) }, { $pull: { 'followers': { 'accountID': ObjectId(data.followerID) }}}, true, function(success, account) {
                            // If followed user is currently online
                            if(account.socketID)
                                io.to(account.socketID).emit('ReceiveFollowerCut', { followerID: data.followerID, invStatus: data.invStatus });
                        });
                    }
                    socket.emit('StopFollowingResp', { followedID: data.followedID, invStatus: data.invStatus });
                });
            });
            function CutFollower(data) {
                // Remove follower from "my" account
                Update(colls.ACCOUNTS, { _id: ObjectId(data.followedID) }, { $pull: { 'followers': { 'accountID': ObjectId(data.followerID) }}}, {}, function(nModified) {
                    // Change their invite to rejected
                    var query = { _id: ObjectId(data.followerID) };
                    query['following.accountID'] = ObjectId(data.followedID);
                    FindAndUpdate(colls.ACCOUNTS, query, { $set: { 'following.$.invite' : Consts.inviteResps.REJECT }}, true, function(success, account) {
                        socket.emit('CutFollowerResp', { followerID: data.followerID, invStatus: data.invStatus });
                        
                        // If followed user is currently online
                        if(account.socketID)
                            io.to(account.socketID).emit('ReceiveFollReqRes', { 
                                followedID: data.followedID, 
                                invStatus: data.invStatus, 
                                newStatus: Consts.inviteResps.REJECT 
                            });
                    });
                });
            }
            socket.on('CutFollower', function (data) {
                CutFollower(data);
            });            
            socket.on('AcceptFollower', function (data) {
                // First, change accepter's account
                var query = { _id: ObjectId(data.followedID) };
                query['followers.accountID'] = ObjectId(data.followerID);
                Update(colls.ACCOUNTS, query, { $set: { 'followers.$.invite' : Consts.inviteResps.ACCEPT }}, {}, function (nModified) {
                    // Then change account of follow requester
                    query = { _id: ObjectId(data.followerID) };
                    query['following.accountID'] = ObjectId(data.followedID);
                    FindAndUpdate(colls.ACCOUNTS, query, { $set: { 'following.$.invite' : Consts.inviteResps.ACCEPT }}, true, function (success, account) {
                        socket.emit('AcceptFollResp', { followerID: data.followerID });
                        // If follower accepted is currently online, switch indicator for follower from neutral to accepted
                        if(account.socketID) {
                            io.to(account.socketID).emit('ReceiveFollReqRes', {
                                followedID: data.followedID,
                                invStatus: Consts.inviteResps.NONE, 
                                newStatus: Consts.inviteResps.ACCEPT 
                            });
                        }
                    });
                });
            });
            socket.on('UpdateFollReqAutoOpt', function(data) {
                var setModifier = { $set: { followReqAutoOpt: data.opt }};
                Update(colls.ACCOUNTS, { _id: ObjectId(data.accountID) }, setModifier, {}, function (nModified) {
                    socket.emit('UpdateFollReqAutoOptResponse', { success: nModified == 1, opt: data.opt });
                });
            });

            // TODO: Users who are blocked can not view a debate with an admin who's blocked them,
            // even as a mod or guest. However, their mod or guest status has not been revoked from
            // all of the blocker's created ctrl debates. Perhaps I'll have to do this.

            // On that note, should trees get their own local block lists? Might make sense to go along with
            // tree permissions...
            socket.on('BlockUser', function (data) {
                // First, check that account with given name/email exists, 
                var query = {$or : [{ email: data.nameOrEmail }, { username: data.nameOrEmail }]};
                Find(colls.ACCOUNTS, query, function(accounts) {
                    if(accounts.length > 0) {
                        var blockedStringID = accounts[0]._id.toString();
                        // Add them to my account, using their account _id as obj key
                        var timeStamp = SuppFuncs.FormatDate(new Date());

                        var blockObj = {
                            accountID: accounts[0]._id,
                            timeStamp: timeStamp,
                            username: accounts[0].username,
                        };

                        var query = { _id: ObjectId(data.accountID) };
                        query['blocking.accountID'] = { $ne: accounts[0]._id };
                        FindAndUpdate(colls.ACCOUNTS, query, { $push: { 'blocking': blockObj }}, true, function (success, myAccount) {
                            if(success) {
                                // Check to see if they are currently following caller. IF so, cut them
                                for(var i = 0, len = myAccount.followers.length; i < len; i++) {
                                    if(myAccount.followers[i].accountID == blockedStringID)
                                        CutFollower({
                                            followerID: blockedStringID,
                                            followedID: data.accountID,
                                            invStatus: myAccount.followers[i].invite
                                        });
                                }

                                var query = { _id: accounts[0]._id };
                                query['blockers.accountID'] = { $ne: myAccount._id };
                                // No reason for the 'blockers' array to be even remotely complicated - just ids
                                Update(colls.ACCOUNTS, query, { $push: { 'blockers': myAccount._id }}, {}, function(nModified) {
                                    socket.emit('BlockUserResp', { 
                                        success: true,
                                        accountID: accounts[0]._id,
                                        blockObj: blockObj,
                                        htmlString: EJS_LI_BlockUser({ liArr: [blockObj] })
                                    });

                                    // TODO: Do I need to find out if the blockee is online and update their local data? Their 'blockers' list is used at some point...
                                });
                            }
                            else
                                socket.emit('BlockUserResp', { success: false, msg: "User already blocked" });
                        });
                    }
                    else
                        socket.emit('FollowUserResp', { success: false, msg: "Could not find user" });
                });
            });
            socket.on('RemoveBlock', function (data) {
                // Remove user being blocked from "my" account
                Update(colls.ACCOUNTS, { _id: ObjectId(data.blockerID) }, { $pull: {'blocking': {'accountID': ObjectId(data.blockedID) }}}, {}, function(nModifed) {
                    // Remove "me" from "theirs"
                    Update(colls.ACCOUNTS, { _id: ObjectId(data.blockedID) }, { $pull: {'blockers': ObjectId(data.blockerID) }}, {}, function(nModifed2) {
                        socket.emit('RemoveBlockResp', { blockedID: data.blockedID });
                    });
                });
            });

            // TREE RELATED REQUESTS =================================================================================

            function SearchListBuilder(resObj, treeArr, propName, type) {
                if(treeArr.length > 0) {
                    resObj.resToShow = true;
                    var treeLinkArr = [];
                    for(var i = 0, len = treeArr.length; i < len; i++) {
                        treeLinkArr.push({
                            treeID: treeArr[i]._id,
                            title: treeArr[i].title,
                            interactions: treeArr[i].branches[0].interactions
                        });
                    }
                    resObj[propName] = EJS_LIs_TreeLink({ treeType: type, liArr: treeLinkArr });
                }
            }
            function SearchListOpenBuilder(resObj, treeArr) {
                SearchListBuilder(resObj, treeArr, 'openHTMLString', 'open');
            }
            function SearchListCtrlBuilder(resObj, accountID, blockers, treeArr) {
                // Check trees for canView permission status
                for(var i = treeArr.length - 1; i > -1; i--) {
                    if(!CheckCanView(blockers, accountID, treeArr[i].adminID, treeArr[i].permissions))
                        treeArr.splice(i, 1);
                }
                SearchListBuilder(resObj, treeArr, 'ctrlHTMLString', 'ctrl');
            }
            function SearchListArchBuilder(resObj, treeArr) {
                SearchListBuilder(resObj, treeArr, 'archHTMLString', 'ctrl');
            }

            // TODO: Restructure this so searches are not nested. This will allow:
            //a) Searches to happen asynchronously, which is obviously faster.
            //b) Searches to be separated/individualized, so I can add batch change functionality
            // into the client, for each debate type.
            // So, use of the search bar will specifically check all three, but use of a select tag
            // will search only it's specified debate type.

            socket.on('SearchTerm', function(data) {
                var resObj = {
                    openHTMLString: '',
                    ctrlHTMLString: '',
                    archHTMLString: '',
                    userHTMLString: '',
                    resToShow: false,
                    text: data.text,
                    type: data.type
                };

                if(data.type == Consts.searchTypes.TEXT) {
                    db[colls.OPEN_TREES].find({$text: {$search: data.text}}, {score: {$meta: "textScore"}}).sort({score:{$meta:"textScore"}, "branches.0.interactions.cumulative": -1, "_id": -1}).limit(Consts.SEARCH_BATCH_SIZE).toArray(function (error, openTrees) {
                        if(!error) {
                            SearchListOpenBuilder(resObj, openTrees);
                            db[colls.CTRL_TREES].find({ archived: false, $text: {$search: data.text}}, {score: {$meta: "textScore"}}).sort({score:{$meta:"textScore"}, "branches.0.interactions.cumulative": -1, "_id": -1}).limit(Consts.SEARCH_BATCH_SIZE).toArray(function (error2, ctrlTrees) {
                                if(!error2) {
                                    SearchListCtrlBuilder(resObj, data.accountID, data.blockers, ctrlTrees);
                                    db[colls.CTRL_TREES].find({ archived: true, $text: {$search: data.text}}, {score: {$meta: "textScore"}}).sort({score:{$meta:"textScore"}, "branches.0.interactions.cumulative": -1, "_id": -1}).limit(Consts.SEARCH_BATCH_SIZE).toArray(function (error3, archTrees) {
                                        if(!error3) {
                                            SearchListArchBuilder(resObj, archTrees);
                                            socket.emit('SearchTermResp', resObj);
                                        }
                                        else {
                                            console.log('mongoHdlr, SearchTerm(), error on Text search in control trees, archived.');
                                            console.log(error3);
                                        }
                                    });
                                }
                                else {
                                    console.log('mongoHdlr, SearchTerm(), error on Text search in control trees, non archived.');
                                    console.log(error2);
                                }
                            });
                        }
                        else {
                            console.log('mongoHdlr, SearchTerm(), error on Text search in open trees.');
                            console.log(error);
                        }
                    });
                }
                else if(data.type == Consts.searchTypes.TAG) {
                    Find(colls.TAGS, {tag: data.text}, function(tagDocs) {
                        if(tagDocs.length > 0) {
                            if(tagDocs[0].trees.length > 0) {
                                for(var i = 0, len = tagDocs[0].trees.length; i < len; i++)
                                    tagDocs[0].trees[i] = ObjectId(tagDocs[0].trees[i]);

                                db[colls.OPEN_TREES].find({_id: {$in: tagDocs[0].trees}}).sort({"branches.0.interactions.cumulative": -1, "_id": -1}).limit(Consts.SEARCH_BATCH_SIZE).toArray(function (error, openTrees) {
                                    if(openTrees.length > 0)
                                        SearchListOpenBuilder(resObj, openTrees);

                                    db[colls.CTRL_TREES].find({archived: false, _id: {$in: tagDocs[0].trees}}).sort({"branches.0.interactions.cumulative": -1, "_id": -1}).limit(Consts.SEARCH_BATCH_SIZE).toArray(function (error, ctrlTrees) {
                                        if(ctrlTrees.length > 0)
                                            SearchListCtrlBuilder(resObj, data.accountID, data.blockers, ctrlTrees);

                                        db[colls.CTRL_TREES].find({archived: true, _id: {$in: tagDocs[0].trees}}).sort({"branches.0.interactions.cumulative": -1, "_id": -1}).limit(Consts.SEARCH_BATCH_SIZE).toArray(function (error, archTrees) {
                                            if(archTrees.length > 0)
                                                SearchListArchBuilder(resObj, archTrees);
    
                                            socket.emit('SearchTermResp', resObj);
                                        });
                                    });
                                });
                            }
                        }
                        else
                            socket.emit('SearchTermResp', resObj);
                    });
                }
                else if (data.type == Consts.searchTypes.USER) {
                    // TODO: Send avatar of searched user as well
                    if(data.usernameOnly) {
                        Find(colls.ACCOUNTS, {username: new RegExp('^' + data.text + '$', 'i')}, function(accounts) {
                            if(accounts.length == 1) {
                                resObj.resToShow = true;
                                resObj.userHTMLString = EJS_LI_AddUser({
                                    liArr: [{
                                        invite: -1,
                                        accountID: accounts[0]._id,
                                        username: accounts[0].username,
                                        bio: accounts[0].bio
                                        // Start with these for now. Might want to include # of followers, # of admin/mod trees, etc.
                                    }], 
                                    indOnline: false, 
                                    userConnName: false, 
                                    userConnOpts: data.loggedIn, 
                                    statusInd: false, 
                                    accRejBtns: false, 
                                    accBtn: false, 
                                    inviteResps: Consts.inviteResps
                                });
                            }
                            else
                                console.log('mongoHdlr, SearchTerm(), error or more than 1 username found.');
                                
                            socket.emit('SearchTermResp', resObj);
                        });
                    }
                    else {
                        //db[colls.ACCOUNTS].find({$text: {$search: data.text}}, {score: {$meta: "textScore"}}).sort({score:{$meta:"textScore"}, "_id": -1}).toArray(function (error, accounts) {
                        db[colls.ACCOUNTS].find({$text: {$search: data.text}}, {score: {$meta: "textScore"}}).sort({score:{$meta:"textScore"}}).toArray(function (error, accounts) {
                            if(error)
                                console.log(error);
                            else {
                                if(accounts.length > 0) {
                                    resObj.resToShow = true;
                                    var accountObjArr = [];
                                    for(var i = 0, len = accounts.length; i < len; i++) {
                                        accountObjArr.push({
                                            invite: -1,
                                            accountID: accounts[i]._id,
                                            username: accounts[i].username,
                                            bio: accounts[i].bio
                                        });
                                    }
                                    resObj.userHTMLString = EJS_LI_AddUser({
                                        liArr: accountObjArr, 
                                        indOnline: false, 
                                        userConnName: false, 
                                        userConnOpts: data.loggedIn, 
                                        statusInd: false, 
                                        accRejBtns: false, 
                                        accBtn: false, 
                                        inviteResps: Consts.inviteResps
                                    });
                                }
                                else
                                    console.log('mongoHdlr.js, SearchTerm(), no accounts found in user search.'); 
                            }
                            socket.emit('SearchTermResp', resObj);
                        });
                    }
                }
            });
            socket.on('AddTag', function(data) {
                Update(colls.TAGS, {tag: data.tag}, {$addToSet: {'trees': data.treeID}}, {upsert: true}, function(nModified) {});
                Update(data.isCtrl ? colls.CTRL_TREES : colls.OPEN_TREES, {_id: ObjectId(data.treeID), 'tags': {$ne: data.tag}}, {$push: { "tags": { $each: [data.tag], $position: 0 }}}, {}, function(nModified) {
                    socket.emit('AddTagResp', {
                        tagAdded: nModified > 0,
                        tag: data.tag,
                        htmlString: EJS_LI_TagList({ tagArr: [data.tag], canRemove: true })
                    });
                })
            });
            socket.on('RemoveTag', function(data) {
                FindAndUpdate(colls.TAGS, {tag: data.tag}, {$pull: {'trees': data.treeID}}, true, function(success, tagDoc) {
                    if(tagDoc.trees.length < 1)
                        db[colls.TAGS].remove({ _id: tagDoc._id }, function (error, result) {});
                });
                Update(data.isCtrl ? colls.CTRL_TREES : colls.OPEN_TREES, {_id: ObjectId(data.treeID)}, {$pull: { "tags": data.tag}}, {}, function(nModified) {
                    socket.emit('RemoveTagResp', {
                        tagRemoved: nModified > 0,
                        tag: data.tag
                    });
                })
            });

            socket.on('PlantTree', function (data) {
                CreateTree(data.roots, CreateBranch(data.trunk), function(success, tree) {
                    function EmitCreateBranchResp(permObj) {
                        var respObj = { success: true };

                        // Not needed otherwise
                        if(data.roots.isControlled) {
                            respObj['linkString'] = EJS_LI_TreeLink({liArr: [{
                                treeID: tree._id,
                                inviteLink: false,
                                title: tree.title,
                                argSubs: { total: 0, unviewed: 0 },
                                interactions: { cumulative: 0 }
                            }]});
                        }

                        // Prepare common tree data
                        ModTreeRetObj(respObj, tree, 0, data.roots.isControlled, permObj, null, null, data.accountID || null, function() {
                            
                            // Change rooms
                            if(data.inRoom)
                                LeaveRoom(data.roomName, data.username);
                            // Sending in a Callback just to stop the unnecessary socket call - obviously no other mods since this tree is just being created
                            JoinRoom(tree._id.toString(), data.username, function() {});
                            
                            // Add to timeline
                            if(data.accountID) {
                                CreateTimelineDoc(timeBldr.CreateTree(
                                    data.roots.isControlled ? timeBldr.types.CREATE_CTRL : timeBldr.types.CREATE_OPEN,
                                    data.accountID,
                                    data.username,
                                    tree._id.toString(),
                                    data.roots.title,
                                    data.trunk.assertion
                                ), function(timelineDoc) {
                                    respObj['timelineString'] = CreateTimelineString(timelineDoc, false);
                                    socket.emit('CreateTreeResp', respObj);
                                });
                            }
                            else
                                socket.emit('CreateTreeResp', respObj);
                        });                   
                    }

                    if(data.roots.isControlled) { // If this is a controlled tree, so there's definitely an account
                        var pushModifier = {$push: {}};
                        pushModifier.$push['created'] = { $each: [tree._id], $position: 0 };
                        Update(colls.ACCOUNTS, { _id: ObjectId(data.roots.accountID) }, pushModifier, {}, function (nModified) {
                            if (nModified > 0)
                                EmitCreateBranchResp(GetAdminPermObj());
                        });
                    }
                    else { // If this is an open tree
                        if(data.roots.accountID) {
                            var bmObj = {
                                accountID: data.roots.accountID,
                                treeID: tree._id.toString(),
                                isCtrl: false,
                                typeKey: 'open',
                                branchIdx: 0,
                                title: tree.title,
                                asser: tree.branches[0].assertion
                            };
                            AddBookmark(bmObj, true);

                            EmitCreateBranchResp(GetOpenPermObj(true));
                        }
                        else
                            EmitCreateBranchResp(GetOpenPermObj(false));
                    }
                });
            });
            socket.on('CreateBranch', function (data) {
                // Mongo can't update both of these fields at the same time.
                var collection = data.isControlled ? colls.CTRL_TREES : colls.OPEN_TREES;
                FindAndUpdate(collection, { _id: ObjectId(data.treeID) }, {$push: { 'branches': CreateBranch(data) }}, true, function(success, tree1) {
                    var modifier = { $push: {}, $set: {} };
                    modifier.$push['branches.' + data.parentIdx + '.children.' + data.type] = tree1.branches.length - 1;
                    modifier.$set['branches.' + data.parentIdx + '.hasChildren'] = true;
                    modifier.$set['branches.' + data.parentIdx + '.canEdit'] = false;
                    FindAndUpdate(collection, { _id: ObjectId(data.treeID) }, modifier, true, function(success, tree) {
                        if(success) {
                            var newIdx = tree.branches.length - 1;
                            var retObj = {};

                            // Transfer relevant arg submissions to new branch
                            // Just bring permission object from client? - makes way more sense than re-figuring it out I think
                            
                            retObj['success'] = true;
                            retObj['replaceParent'] = data.replaceParent;
                            retObj['newBranchIdx'] = newIdx;
                            retObj['newBranchType'] = tree.branches[newIdx].type;
                            retObj['newBranchData'] = tree.branches[newIdx];
                            retObj['argString'] = data.parentIsFocused ? EJS_Arg({
                                pathPartials: 'views/partials/',
                                treeCtrl: data.isControlled,
                                treeArch: !!tree.archived,
                                idx: newIdx,
                                arg: tree.branches[newIdx],
                                isFocalArg: false,
                                permObj: data.permObj,
                                strRating: -1, // Pre-existing input data from user
                                userFavour: {},
                                argTypes: Consts.argTypes
                            }) : '';

                            // Fix up branch list, which means adding the new branch, and adjusting it's parent.
                            retObj['blockString'] = EJS_LI_BranchListLinear({
                                branch: tree.branches[newIdx],
                                timeStamp: SuppFuncs.FormatDate(tree.branches[newIdx].timeStamp),
                                idx: newIdx,
                                canViewFeedback: data.permObj.canViewFeedback,
                                submArgsAct: null,
                                isMod: data.permObj.isMod,
                                argTypes: Consts.argTypes
                            });
                            retObj['blockParentString'] = EJS_LI_BranchListLinear({
                                branch: tree.branches[tree.branches[newIdx].parent],
                                timeStamp: SuppFuncs.FormatDate(tree.branches[tree.branches[newIdx].parent].timeStamp),
                                idx: tree.branches[newIdx].parent,
                                canViewFeedback: data.permObj.canViewFeedback,
                                submArgsAct: data.replSubmArgsAct,
                                isMod: data.permObj.isMod,
                                argTypes: Consts.argTypes
                            });

                            function NextReturnPhase() {
                                // Before sending off data for new arg, check submission status and update accordingly
                                if(data.submArgID) {
                                    modifier = { $push: {} };
                                    modifier.$push['adoptions'] = newIdx;
                                    var query = { _id: ObjectId(data.submArgID) };
                                    query['adoptions'] = { $ne: newIdx };
                                    FindAndUpdate(colls.SUBM_ARGS, query, modifier, true, function(success, submArg) {
                                        if(success) {
                                            retObj['submArgID'] = data.submArgID;
                                            retObj['submBranchIdx'] = submArg.branchIdx;
                                            retObj['submType'] = submArg.type;
                                        }
                                        socket.emit('CreateBranchResp', retObj);
                                    });
                                }
                                else
                                    socket.emit('CreateBranchResp', retObj);
                            }

                            // Update timeline
                            if(data.accountID) {
                                //* A name definitely means adding the adopter's event
                                // Use parent index because from there you can see both assertions
                                if(data.submArgUsername) {
                                    CreateTimelineDoc(timeBldr.AdoptArg(
                                        timeBldr.types.ADOPT_SUBM,
                                        data.accountID,
                                        data.username,
                                        data.treeID,
                                        newIdx,
                                        tree.title,
                                        tree.branches[data.parentIdx].assertion,
                                        data.assertion,
                                        data.type,
                                        data.submArgUsername
                                    ), function(timelineDoc) {
                                        retObj['timelineString'] = CreateTimelineString(timelineDoc, false);
                                        //* If there's also an id, add event for account holder, otherwise, arg came from non-account-holder
                                        if(data.submArgAccountID) {
                                            CreateTimelineDoc(timeBldr.SubmArgAdopted(
                                                timeBldr.types.SUBM_ADOPT,
                                                data.submArgAccountID,
                                                data.submArgUsername,
                                                data.treeID,
                                                newIdx, 
                                                tree.title,
                                                tree.branches[data.parentIdx].assertion,
                                                data.assertion,
                                                data.type
                                            ), function(timelineDoc) {});
                                            // No need for if/else shenanigans here since this timeline doc isn't sent to the client
                                        }
                                        NextReturnPhase();
                                    });                                    
                                } //* No name means definitely no id either, so this was not added from an external submission
                                else {
                                    CreateTimelineDoc(timeBldr.CreateBranch(
                                        timeBldr.types.ADD_NEW_ARG,
                                        data.accountID,
                                        data.username,
                                        data.treeID,
                                        newIdx,
                                        tree.title,
                                        tree.branches[data.parentIdx].assertion,
                                        data.assertion,
                                        data.type
                                    ), function(timelineDoc) {
                                        retObj['timelineString'] = CreateTimelineString(timelineDoc, false);
                                        NextReturnPhase();
                                    });
                                }                                
                            }
                            else
                                NextReturnPhase();
                        }
                    });
                });
            });

            socket.on('LockEditOpt', function (data) {
                var modifier = { $set: {} };
                modifier.$set['branches.' + data.branchIdx + '.canEdit'] = false;
                Update(colls.CTRL_TREES, { _id: ObjectId(data.treeID) }, modifier, {}, function(nModified) {
                    if(nModified == 1)
                        socket.emit('LockEditOptResp', { branchIdx: data.branchIdx });
                    else
                        console.log('mongoHdlr.js, socket call LockEditOpt, failed to modify tree.');
                });
            });
            socket.on('EditBranch', function (data) {
                var modifier = {};
                modifier.$set = {};

                if(data.isControlled) {
                    modifier.$push = {};
                    modifier.$push['branches.' + data.branchIdx + '.revision.list'] = {
                        $each: [data.revision],
                        $position: 0
                    };
                }

                modifier.$set['branches.' + data.branchIdx + '.timeStamp'] = new Date();
                modifier.$set['branches.' + data.branchIdx + '.assertion'] = data.newArg.assertion;
                modifier.$set['branches.' + data.branchIdx + '.elaboration'] = data.newArg.elaboration;
                modifier.$set['branches.' + data.branchIdx + '.sources'] = data.newArg.sources;

                var collection = data.isControlled ? colls.CTRL_TREES : colls.OPEN_TREES;
                FindAndUpdate(collection, {_id: ObjectId(data.treeID)}, modifier, true, function (success, tree) {
                    if(success) {

                        var newBranchString = EJS_Arg({
                            pathPartials: 'views/partials/',
                            treeCtrl: data.isControlled,
                            treeArch: !!tree.archived,
                            idx: data.branchIdx,
                            arg: tree.branches[data.branchIdx],
                            isFocalArg: data.isFocused,
                            permObj: data.userPerms,
                            strRating: -1,
                            userFavour: {},
                            argTypes: Consts.argTypes
                        });
                        var newBlockString = EJS_LI_BranchListLinear({
                            branch: tree.branches[data.branchIdx],
                            timeStamp: SuppFuncs.FormatDate(tree.branches[data.branchIdx].timeStamp),
                            idx: data.branchIdx,
                            canViewFeedback: data.userPerms.canViewFeedback,
                            submArgsAct: data.replSubmArgsAct,
                            isMod: data.userPerms.isMod,
                            argTypes: Consts.argTypes,
                        });

                        socket.emit('EditBranchResponse', {
                            success: success,
                            idx: data.branchIdx,
                            isFocused: data.isFocused,
                            branchData: tree.branches[data.branchIdx],
                            branchString: newBranchString,
                            blockString: newBlockString
                        });
                    }
                    else
                        console.log("'EditBranch', couldn't modify/retrieve tree id: " + data.treeID);
                });
            });
            socket.on('EditSrcs', function (data) {
                var modifier = { $set: {} };
                modifier.$set['branches.' + data.branchIdx + '.sources'] = data.sources;

                var collection = data.isControlled ? colls.CTRL_TREES : colls.OPEN_TREES;
                FindAndUpdate(collection, {_id: ObjectId(data.treeID)}, modifier, true, function (success, tree) {
                    if(success) {
                        socket.emit('EditSrcsResponse', {
                            success: success,
                            idx: data.branchIdx,
                            isFocused: data.isFocused,
                            srcData: tree.branches[data.branchIdx].sources,
                            branchString: EJS_Arg({
                                pathPartials: 'views/partials/',
                                treeCtrl: data.isControlled,
                                treeArch: !!tree.archived,
                                idx: data.branchIdx,
                                arg: tree.branches[data.branchIdx],
                                isFocalArg: data.isFocused,
                                permObj: data.userPerms,
                                strRating: data.strRating,
                                userFavour: data.userFavour,
                                argTypes: Consts.argTypes
                            })
                        });
                    }
                    else
                        console.log("'EditSrcs', couldn't modify/retrieve tree id: " + data.treeID);
                });
            });
            socket.on('ColSwap', function (data) {
                var modifier = { $set: {}, $pull: {}, $push: {} };
                // Change argType on tree branch
                modifier.$set['branches.' + data.branchIdx + '.type'] = data.newType;
                // Branch parent - Pull index from given child column and insert into other column
                modifier.$pull['branches.' + data.parentIdx + '.children.' + data.currType] = data.branchIdx;
                modifier.$push['branches.' + data.parentIdx + '.children.' + data.newType] = data.branchIdx;
                
                Update(colls.CTRL_TREES, { _id: ObjectId(data.treeID) }, modifier, {}, function(nModified) {

                    modifier = {$set: {}};
                    modifier.$set['argType'] = data.newType;

                    Update(colls.TIMELINE, { treeID: data.treeID, branchIdx: data.branchIdx, type: { $in: [timeBldr.types.ADD_NEW_ARG, timeBldr.types.ADOPT_SUBM, timeBldr.types.SUBM_ADOPT] }}, modifier, { multi: true }, function(nModified2) {});
                    // TODO:
                    /*
                    - Change timeline object created for this, or add a new timeline item for it. I don't think there's any way to trace back to the appropriate timeline item
                    -- Adding a timeline item doesn't seem to make sense, since this is just a minor error correction.
                    -- Changing the appropriate timeline items would make the most sense
                    -- I might have to just leave this for now, unless I intend to do a large rebuild to accomodate a schema change to make this happen
                    */
                    //socket.emit('ColSwapResp', { success: true });
                });
            });

            function StdPermModifier(permsObj, collection, query, opts, resString, successMsg) {
                var setModifier = { $set: {} };
                // TODO: Any reason these need to be individually spelled out, and the object isn't simply replaced?
                setModifier.$set['permissions.viewDebate'] = permsObj.viewDebate;
                setModifier.$set['permissions.viewFeedback'] = permsObj.viewFeedback;
                setModifier.$set['permissions.viewRating'] = permsObj.viewRating;
                setModifier.$set['permissions.submitFeedback'] = permsObj.submitFeedback;
                setModifier.$set['permissions.submitRating'] = permsObj.submitRating;

                Update(collection, query, setModifier, opts, function(nModified) { 
                    if(nModified > 0) socket.emit(resString, { success: true, msg: successMsg, perms: permsObj });
                    else socket.emit(resString, { success: false, msg: 'No changes made' });
                 });
            }
            socket.on('SetPermissions', function (data) {
                // TODO: See who's currently viewing tree and update accordingly
                StdPermModifier(data.perms, colls.CTRL_TREES, {_id: ObjectId(data.treeID), archived: false}, {}, 'UpdatePermissions', 'Permissions updated');
            });
            socket.on('SetPermissionsToAll', function (data) {
                var ids = [];
                for(var i = 0, len = data.treeIDs.length; i < len; i++)
                    ids.push(ObjectId(data.treeIDs[i]));

                StdPermModifier(data.perms, colls.CTRL_TREES, {_id: { $in: ids }, archived: false}, { multi: true }, 'UpdatePermissions', 'Permissions updated for all debates you administer');
            });
            socket.on('SetPermDefaults', function (data) {
                StdPermModifier(data.perms, colls.ACCOUNTS, {_id: ObjectId(data.accountID)}, {}, 'UpdatePermDefaults', 'Permission defaults saved');
            });
            
            socket.on('SetTypeAlias', function(data) {
                var setModifier = { $set: {} };
                setModifier.$set['branches.' + data.idx + '.typeAliases.' + data.type] = data.alias;
                var collection = data.isControlled ? colls.CTRL_TREES : colls.OPEN_TREES;
                Update(collection, {_id: ObjectId(data.treeID)}, setModifier, {}, function(nModified) {
                    if(nModified > 0)
                        // Make sure to update client data
                        socket.emit('SetTypeAliasResp', {
                            success: nModified > 0,
                            msg: 'Argument group alias updated' ,
                            idx: data.idx,
                            type: data.type,
                            alias: data.alias
                        });
                    else
                        socket.emit('SetTypeAliasResp', { success: nModified > 0, msg: 'No changes made' });
                });
            });
            
            // Both _id params as strings
            function RemoveSubmArgModViewCheck(accountID, treeID) {
                var modifier = { $unset: {} };
                modifier.$unset['modViews.' + accountID] = 1;
                Update(colls.SUBM_ARGS, { treeID: treeID }, modifier, { multi: true }, function(nModifed) {});
            }
            socket.on('SubmArg', function(data) {
                CreateSubmArg(data, function(submObj) {

                    var respObj = { success: true, canViewFB: data.canViewFB, branchIdx: data.idx, argType: data.type };

                    // This could apply to non-logged in users
                    if(data.canViewFB) {
                        submObj.timeStamp = SuppFuncs.FormatDate(submObj._id.getTimestamp());
                        respObj['dataObj'] = submObj;
                    }
                    else
                        respObj['argID'] = submObj._id.toString();

                    //* Update timeline
                    if(data.accountID) {
                        CreateTimelineDoc(timeBldr.SubmArg(
                            timeBldr.types.SUBM_SENT,
                            data.accountID,
                            data.sender,
                            data.treeID,
                            data.idx,
                            data.treeTitle,
                            data.postedAsser,
                            data.assertion,
                            data.type
                        ), function(timelineDoc) {
                            respObj['timelineString'] = CreateTimelineString(timelineDoc, false);
                            socket.emit('SubmArgResp', respObj);
                        });
                    }
                    else
                        socket.emit('SubmArgResp', respObj);

                    // TODO: Go through all mods/admin/anyone who is viewing debate, and update with new argSubs?
                    // Something like this might be better suited to periodic updates, like every 15 or 30 seconds,
                    // so I don't have to keep track of who's viewing any given debate at any given time.

                    // Include update to all client notifications as well.
                });
            });
            socket.on('DeleteArgSubm', function(data) {
                Update(colls.SUBM_ARGS, {_id: ObjectId(data.argID)}, {$set: { 'archived': true, 'archiver': data.archiverID }}, {}, function(nModified) {
                    socket.emit('DeleteArgSubmResp', { 
                        success: nModified == 1,
                        branchIdx: data.idx,
                        fbType: data.type,
                        argKey: data.argID,
                    });
                });
            });
            socket.on('DeleteArgSubmMulti', function(data) {
                var objIDKeyArr = [];
                for(var i = 0; i < data.keyArr.length; i++)
                    objIDKeyArr[i] = ObjectId(data.keyArr[i]);

                Update(colls.SUBM_ARGS, {_id: {$in: objIDKeyArr}}, { $set: {'archived': true, 'archiver': data.archiverID }}, { multi: true }, function(nModified) {
                    socket.emit('DeleteArgSubmMultiResp', { 
                        success: nModified >= 1,
                        branchIdx: data.idx,
                        fbType: data.type,
                        keyArr: data.keyArr
                    });
                });
            });
            socket.on('ViewedSubmArg', function(data) {
                modifier = {$set: {}};
                modifier.$set['modViews.' + data.modID] = true;
                Update(colls.SUBM_ARGS, {_id: ObjectId(data.argID)}, modifier, {}, function(nModified) {
                    socket.emit('ViewedSubmArgResp', { 
                        success: nModified == 1,
                        branchIdx: data.idx,
                        argType: data.typeKey,
                        argID: data.argID,
                        modID: data.modID
                    });
                });
            });
            socket.on('GetFeedbackSubmData', function(data) {
                var submID = ObjectId(data.submID);
                Find(colls.SUBM_ARGS, {_id: submID}, function(args) {
                    if(args.length == 1)
                        socket.emit('GetArgSubmDataResp', { submArg: args[0], active: true });
                    else
                        console.log('mongoHdlr.js, socket call GetArgSubmData, could not retreive arg object');
                });
            });

            socket.on('GetSubmDataBatch', function(data) {
                var skipQty = data.batchNum * Consts.SUBM_BATCH_SIZE;
                // Acquire all of the args, in order, narrowed by given batch number
                db[colls.SUBM_ARGS].find({ accountID: data.accountID }).sort({ "_id" : -1 }).limit(Consts.SUBM_BATCH_SIZE).skip(skipQty).toArray(function (error, args) {
                    if(args.length > 0) {
                        // 1. Get all of the necessary treeIDs (no repeats)
                        // 2. Build small reference var to determine exactly which branches I should acquire the data of
                        var treeIDs = [];
                        var branchRef = {};
                        for(var i = 0, len = args.length; i < len; i++) {
                            // Adding extra fields that'll be needed in sent arg selection/reference list
                            args[i].timeStamp = SuppFuncs.FormatDate(args[i]._id.getTimestamp());
                            args[i].argTypeName = Consts.argNames[args[i].type];
                            args[i].wasAdopted = args[i].adoptions.length > 0;
                            args[i].branchAsser = null;

                            if(treeIDs.indexOf(args[i].treeID) == -1) {
                                treeIDs.push(ObjectId(args[i].treeID));

                                if(!branchRef[args[i].treeID])
                                    branchRef[args[i].treeID] = [];
                                if(branchRef[args[i].treeID].indexOf(args[i].branchIdx) == -1)
                                    branchRef[args[i].treeID].push(args[i].branchIdx);
                            }
                        }

                        // Find all the trees and collect data to send
                        Find(colls.CTRL_TREES, { _id: { $in: treeIDs} }, function(trees) {
                            if(trees.length > 0) {
                                var batchObj = {};
                                for(var i = 0, len = trees.length; i < len; i++) {
                                    trees[i]._id = trees[i]._id.toString();

                                    // The above branchRef allows us to only find unique trees and get everything needed
                                    if(!batchObj[trees[i]._id]) {
                                        batchObj[trees[i]._id] = {
                                            title: trees[i].title,
                                            branches: {}
                                        };
                                        // Loop through the branchRef array and add each branch as an object with associated data to present
                                        for(var j = 0, refLen = branchRef[trees[i]._id].length; j < refLen; j++) {
                                            var idx = branchRef[trees[i]._id][j];

                                            batchObj[trees[i]._id].branches[idx] = {
                                                timeStamp: SuppFuncs.FormatDate(trees[i].branches[idx]._id.getTimestamp()),
                                                assertion: trees[i].branches[idx].assertion,
                                                elaboration: trees[i].branches[idx].elaboration,
                                                sources: trees[i].branches[idx].sources
                                            };
                                        }
                                    }
                                }
                                socket.emit('GetSubmDataBatchResp', { success: true, argList: args, treesObj: batchObj, freshOpen: data.freshOpen });
                            }
                            else
                                console.log('mongoHdlr.js, socket call GetSubmDataBatch, could not retreive trees to match subm args');
                        });
                    }
                    else
                        socket.emit('GetSubmDataBatchResp', { success: false, msg: 'No arguments sent' });
                });
            });
            socket.on('GetPersTimelineHTMLBatch', function(data) {
                var skipQty = data.batchNum * Consts.TIMELINE_BATCH_SIZE;
                db[colls.TIMELINE].find({ accountID: data.accountID}).sort({ "_id" : -1 }).limit(Consts.TIMELINE_BATCH_SIZE).skip(skipQty).toArray(function (error, items) {
                    var html = '';
                    for(var i = 0, len = items.length; i < len; i++)
                        html += CreateTimelineString(items[i], false);

                    socket.emit('GetPersTimelineHTMLBatchResp', html);
                });
            });
            socket.on('GetPublTimelineHTMLBatch', function(data) {
                var skipQty = data.batchNum * Consts.TIMELINE_BATCH_SIZE;
                // Only doing this here instead of in the client so that if a user follows someone new, they can change the timeline batch to instantly see the new person
                Find(colls.ACCOUNTS, { _id: ObjectId(data.accountID) }, function(accounts) {
                    var strIDs = [];
                    for(var i = 0, len = accounts[0].following.length; i < len; i++) {
                        if(accounts[0].following[i].invite == Consts.inviteResps.ACCEPT)
                            strIDs.push(accounts[0].following[i].accountID.toString());
                    }
                    db[colls.TIMELINE].find({ type: { $ne: timeBldr.types.DELETED }, accountID: { $in: strIDs }}).sort({ "_id" : -1 }).limit(Consts.TIMELINE_BATCH_SIZE).skip(skipQty).toArray(function (error, items) {
                        var html = '';
                        for(var i = 0, len = items.length; i < len; i++)
                            html += CreateTimelineString(items[i], true);
    
                        socket.emit('GetPublTimelineHTMLBatchResp', html);
                    });
                });
            });
            
            socket.on('RateRevInteg', function(data) {

                var setModifier = { $set: {} };
                var keyString = 'ratings.revInt.' + data.treeID + '.' + data.branchIdx;
                setModifier.$set[keyString] = data.newInput;
                FindAndUpdate(colls.ACCOUNTS, { _id: ObjectId(data.accountID) }, setModifier, true, function(success, account) {
                    if(success) {
                        var incModifier =  { $inc: {} };
                        incModifier.$inc['branches.' + data.branchIdx + '.revision.integ.pos'] = data.deltaPos;
                        incModifier.$inc['branches.' + data.branchIdx + '.revision.integ.neg'] = data.deltaNeg;
                        Update(colls.CTRL_TREES, { _id: ObjectId(data.treeID) }, incModifier, {}, function(nModified) {
                            socket.emit('RateRevIntegResp', {
                                success: nModified == 1,
                                branchIdx: data.branchIdx,
                                deltaPos: data.deltaPos,
                                deltaNeg: data.deltaNeg,
                                revIntData: account.ratings.revInt
                            });
                        });
                    }
                });
            });
            function FavourFromRatings(branches, idx, parentIdx, argType, isCtrl, ratedAs, moddedData) {
                // The moddedData is only necessary because the db changes aren't actually been made to each parent arg as they're calculated,
                // so it passes the changes on ahead to be used as needed.

                var ratePctTally = 0,
                rateEntries = 0;

                var favAvgTally = 0,
                favEntries = 0;

                var argSibs = branches[parentIdx].children[argType];
                // V+ Perhaps store other debate's favour here as well, perhaps just fetch and display it
                // var dependSibs = branches[parentIdx].children[Consts.argTypes.EXT_CONTRIB];

                // Get data from all sibling arguments, either the ratings data of favourability, depending on
                // arg.ratingOverridden flag that maintains first principle calculations
                for(var i = 0; i < argSibs.length; i++) {
                    var arg = branches[argSibs[i]];
                    var ratingOverride = isCtrl ? arg.rating[ratedAs].override : arg.rating.override;

                    //* This is when the moddedData needs to replace the existing data, reflecting the changes that'll be made when the db call happens.
                    if(argSibs[i] == idx) {
                        //console.log('Using moddedData');
                        ratingOverride = moddedData.overridden;
                        if(isCtrl)
                            arg.favour[ratedAs] = moddedData.favObj;
                        else
                            arg.favour = moddedData.favObj;
                    }

                    // Get favour to use - this rating (if one exists on this arg) is ignored
                    if(ratingOverride) {
                        //console.log('Rating overridden, using fav object');
                        var fav = isCtrl ? arg.favour[ratedAs] : arg.favour;
                        if(fav[Consts.argTypes.CORROB].entries > 0) {
                            // # of entries used in calculating favCorrobPct, so only corrob entries should be sent along to the parent favour set.
                            // The refute entries & avg are not carried forward, but do their job by lowering the corrob side of the equation.
                            favEntries += fav[Consts.argTypes.CORROB].entries;
                            favAvgTally += GetFavPct(fav, Consts.argTypes.CORROB);
                        }
                    }
                    // Get ratings to calculate contribution toward parent's favour value
                    else {
                        //console.log('Using rating');
                        var ratingAtSib = isCtrl ? arg.rating[ratedAs] : arg.rating;
                        if(ratingAtSib.entries > 0) {
                            rateEntries += ratingAtSib.entries;
                            ratePctTally += (ratingAtSib.cumuValue / 5) * 100;
                        }
                    }
                }
                // Only collecting favour information from Dependencies
                // V+ Perhaps store other debate's favour here as well, perhaps just fetch and display it
                // for(var i = 0; i < dependSibs.length; i++) {
                //     //console.log('In depend loop');
                //     var arg = branches[dependSibs[i]];

                //     //* This is when the moddedData needs to replace the existing data, reflecting the changes that'll be made when the db call happens.
                //     if(dependSibs[i] == idx) {
                //         if(isCtrl)
                //             arg.favour[ratedAs] = moddedData.favObj;
                //         else
                //             arg.favour = moddedData.favObj;
                //     }
                            
                //     var fav = isCtrl ? arg.favour[ratedAs] : arg.favour;
                //     if(fav[Consts.argTypes.CORROB].entries > 0 || fav[Consts.argTypes.REFUTE].entries > 0) {
                //         favEntries += fav[argType].entries;
                //         favAvgTally += GetFavPct(fav, argType);
                //     }
                // }

                return {
                    entries: favEntries + rateEntries,
                    avg: (rateEntries > 0 || favEntries > 0) ? (ratePctTally + favAvgTally) / (rateEntries + favEntries) : 0
                };
            }
            function CalcFavParentChain(branches, treeID, branchIdx, isCtrl, ratedAs) {
                if(branches[branchIdx].type == Consts.argTypes.EXT_CONTRIB)
                    return;

                // For the modifier object
                var userTypeStr = isCtrl ? '' + ratedAs + '.' : '';

                function ChainRecursion(idx, prevType, moddedData, setModifier) {
                    var parentIdx = branches[idx].parent;
                    if(parentIdx < 0)
                        return;
                    else {
                        var argType = branches[idx].type;
                        // If any parent is a dependency, BOTH sides must be calculated to determine what gets contributed to the next parent,
                        // as a change on one side effects the outcome of the other
                        // V+ Perhaps store other debate's favour here as well, perhaps just fetch and display it
                        // if(argType == Consts.argTypes.EXT_CONTRIB) {
                        //     var favPctObj_Corrob = FavourFromRatings(branches, idx, parentIdx, Consts.argTypes.CORROB, isCtrl, ratedAs, moddedData);
                        //     var favPctObj_Refute = FavourFromRatings(branches, idx, parentIdx, Consts.argTypes.REFUTE, isCtrl, ratedAs, moddedData);

                        //     var newModdedData = {
                        //         favObj: [{}, {}],
                        //         overridden: favPctObj_Corrob.entries > 0 || favPctObj_Refute.entries > 0
                        //     };
                        //     newModdedData.favObj[Consts.argTypes.CORROB] = favPctObj_Corrob;
                        //     newModdedData.favObj[Consts.argTypes.REFUTE] = favPctObj_Refute;

                        //     // Set newly calculated direct data
                            
                        //     setModifier.$set['branches.' + parentIdx + '.favour.' + userTypeStr + Consts.argTypes.CORROB + '.entries'] = favPctObj_Corrob.entries;
                        //     setModifier.$set['branches.' + parentIdx + '.favour.' + userTypeStr + Consts.argTypes.CORROB + '.avg'] = favPctObj_Corrob.avg;
                        //     setModifier.$set['branches.' + parentIdx + '.favour.' + userTypeStr + Consts.argTypes.REFUTE + '.entries'] = favPctObj_Refute.entries;
                        //     setModifier.$set['branches.' + parentIdx + '.favour.' + userTypeStr + Consts.argTypes.REFUTE + '.avg'] = favPctObj_Refute.avg;
                        //     setModifier.$set['branches.' + parentIdx + '.rating.' + userTypeStr + 'override'] = newModdedData.overridden;

                        //     ChainRecursion(parentIdx, argType, newModdedData, setModifier);
                        // }
                        // else {
                            var favPctObj = FavourFromRatings(branches, idx, parentIdx, argType, isCtrl, ratedAs, moddedData);
                            
                            var otherType = (argType == Consts.argTypes.CORROB) ? Consts.argTypes.REFUTE : Consts.argTypes.CORROB;
                            var otherFav = isCtrl ? branches[parentIdx].favour[ratedAs][otherType] : branches[parentIdx].favour[otherType];

                            var newModdedData = {
                                favObj: [{}, {}],
                                overridden: favPctObj.entries > 0 || otherFav.entries > 0
                            };
                            newModdedData.favObj[argType] = favPctObj;
                            newModdedData.favObj[otherType] = otherFav;

                            // Set newly calculated direct data
                            modMade = true;
                            setModifier.$set['branches.' + parentIdx + '.favour.' + userTypeStr + argType + '.entries'] = favPctObj.entries;
                            setModifier.$set['branches.' + parentIdx + '.favour.' + userTypeStr + argType + '.avg'] = favPctObj.avg;
                            setModifier.$set['branches.' + parentIdx + '.rating.' + userTypeStr + 'override'] = newModdedData.overridden;

                            ChainRecursion(parentIdx, argType, newModdedData, setModifier);
                        // }
                    }
                }
                var setModifier = { $set: {} };
                var modObj = {
                    favObj: isCtrl ? branches[branchIdx].favour[ratedAs] : branches[branchIdx].favour,
                    overridden: isCtrl ? branches[branchIdx].rating[ratedAs].override : branches[branchIdx].rating.override
                };
                ChainRecursion(branchIdx, branches[branchIdx].type, modObj, setModifier);
                Update(isCtrl ? colls.CTRL_TREES : colls.OPEN_TREES, { _id: treeID }, setModifier, {}, function(nModifed) {});
            }

            //* Old way, not based off first priniciples concept. Not in use right now.
            function CalcFavourability(isCtrl, branches, treeID, branchIdx, ratedAs) {
                // branchIdx referes to the branch that just had it's ratings changed
                // This function is type-neutral, several isCtrl checks throughout.
                function ParentChainFavRecursion(idx, newFavObj, setModifier) {
                    var parentIdx = branches[idx].parent;
                    if(parentIdx > -1) {
                        var type = branches[idx].type,
                        otherSide = (type == Consts.argTypes.CORROB) ? Consts.argTypes.REFUTE : Consts.argTypes.CORROB,
                        argSibs = branches[parentIdx].children[type];

                        var val = 0,
                        pct = 0,
                        count = 0,
                        entries = 0,
                        avg = 0;

                        // Get mod & vis str rating averages for type of given arg.
                        for(var i = 0; i < argSibs.length; i++) {
                            var arg = branches[argSibs[i]];
                            var ratingAtSib = isCtrl ? arg.rating[ratedAs] : arg.rating;

                            //* This is stopping fav calculations from continuing upward toward the root.
                            if(ratingAtSib.entries > 0) {
                                count++;
                                entries += ratingAtSib.entries;
                                val = ratingAtSib.cumuValue / ratingAtSib.entries;
                                pct = (val / 5) * 100;

                                // Pass full favourability object (before type distinction) into function, and use when appropriate.
                                var favObj = (argSibs[i] == idx) ? newFavObj : isCtrl ? arg.favour[ratedAs] : arg.favour;
                                if(favObj[Consts.argTypes.CORROB].entries > 0 || favObj[Consts.argTypes.REFUTE].entries > 0) {
                                    // Include all child entries having made any influence
                                    entries = entries + favObj[Consts.argTypes.CORROB].entries + favObj[Consts.argTypes.REFUTE].entries;
                                    
                                    // If the corrob avg >= refute avg by any amount, maintain 100% positive rating avg.
                                    // Otherwise, refute > corrob avg by any amount, reduce the rating avg by the proportional difference
                                    var argSupportFactor = 1;
                                    if(favObj[Consts.argTypes.REFUTE].avg > favObj[Consts.argTypes.CORROB].avg) {
                                        var avgTotal = favObj[Consts.argTypes.CORROB].avg + favObj[Consts.argTypes.REFUTE].avg,
                                        rightAvgPct = favObj[Consts.argTypes.REFUTE].avg / avgTotal;
                                        // With right being > left, the above calc is guarenteed to be > .5, and we want to know how much greater,
                                        // as a percentage of the remaining 0.5, so we double the remainder, then take that amount off 1 (100% potential support).
                                        argSupportFactor = 1 - ((rightAvgPct - 0.5) * 2);

                                        // argSupportFactor = (100 - (favObj[Consts.argTypes.REFUTE].avg - favObj[Consts.argTypes.CORROB].avg)) * .01;
                                    }
                                    
                                    pct *= argSupportFactor;
                                }
                                avg += pct;
                            }
                        }
                        if(count > 0)
                            avg /= count;

                        var nextAvgObj = [{}, {}];
                        nextAvgObj[type].entries = entries;
                        nextAvgObj[type].avg = avg;
                        var favAtType = isCtrl ? branches[parentIdx].favour[ratedAs] : branches[parentIdx].favour;
                        nextAvgObj[otherSide].entries = favAtType[otherSide].entries;
                        nextAvgObj[otherSide].avg = favAtType[otherSide].avg;
                        
                        // Set newly calculated direct data
                        var typeString = isCtrl ? ratedAs + '.' : '';
                        setModifier.$set['branches.' + parentIdx + '.favour.' + typeString + type + '.entries'] = entries;
                        setModifier.$set['branches.' + parentIdx + '.favour.' + typeString + type + '.avg'] = avg;

                        console.log('Parent index to change: ' + parentIdx);
                        console.log('entries: ' + entries);
                        console.log('avg: ' + avg);
                        console.log('Next avg object being sent in:');
                        console.log(nextAvgObj);

                        ParentChainFavRecursion(parentIdx, nextAvgObj, setModifier);
                    }
                    else {
                        Update(isCtrl ? colls.CTRL_TREES : colls.OPEN_TREES, { _id: treeID }, setModifier, {}, function(nModified) {});
                    }
                }
                ParentChainFavRecursion(branchIdx, isCtrl ? branches[branchIdx].favour[ratedAs] : branches[branchIdx].favour, { $set: {} });
            }

            socket.on('RateArgStrength', function(data) {
                var ctrlType = data.isControlled ? 'ctrl' : 'open';
                var setModifier = { $set: {} };
                setModifier.$set['ratings.argStr.' + ctrlType + '.' + data.treeID + '.' + data.branchIdx] = data.rating;
                //* This seems to be a problem only because I cannot continue to unset each object with 0 props up the nesting chain
                // var modifier;
                // var keyString = 'interactions.' + data.treeID + '.branches.' + data.branchIdx + '.strRating';
                // if(data.rating > -1) {
                //     modifier = { $set: {} };
                //     modifier.$set[keyString] = data.rating;
                // }
                // else {
                //     modifier = { $unset: {} };
                //     modifier.$unset[keyString] = 1;
                // }
                FindAndUpdate(colls.ACCOUNTS, { _id: ObjectId(data.accountID) }, setModifier, true, function(success, account) {
                    if(success) {
                        var incModifier =  { $inc: {} },
                            cumuValueChange,
                            entriesChange;

                        if(data.prevRating == -1) {
                            cumuValueChange = data.rating;
                            entriesChange = 1;
                        }
                        else {
                            if(data.rating == -1) {
                                cumuValueChange = -data.prevRating;
                                entriesChange = -1;
                            }
                            else {
                                cumuValueChange = -data.prevRating + data.rating;
                                entriesChange = 0;
                            }
                        }

                        var collection;
                        if(data.isControlled) {
                            collection = colls.CTRL_TREES;
                            incModifier.$inc['branches.' + data.branchIdx + '.rating.' + data.ratedAs + '.cumuValue'] = cumuValueChange;
                            incModifier.$inc['branches.' + data.branchIdx + '.rating.' + data.ratedAs + '.entries'] = entriesChange;
                        }
                        else {
                            collection = colls.OPEN_TREES;
                            incModifier.$inc['branches.' + data.branchIdx + '.rating.cumuValue'] = cumuValueChange;
                            incModifier.$inc['branches.' + data.branchIdx + '.rating.entries'] = entriesChange;
                        }

                        FindAndUpdate(collection, { _id: ObjectId(data.treeID) }, incModifier, true, function(success, tree) {
                            if(success) {
                                //* The favour imbued to an linked external debate will move up toward the next parent.
                                // V+ Perhaps store other debate's favour here as well, perhaps just fetch and display it
                                // if(tree.branches[data.branchIdx].type != Consts.argTypes.EXT_CONTRIB) {
                                    //* No need to calculate new favour values if rating.override flag has been activated
                                    var overridden = data.isControlled ? tree.branches[data.branchIdx].rating[data.ratedAs].override : tree.branches[data.branchIdx].rating.override;
                                    if(!overridden)
                                        CalcFavParentChain(tree.branches, tree._id, data.branchIdx, data.isControlled, data.ratedAs);
                                // }
                                socket.emit('RateArgStrengthResp', {
                                    ctrlType: ctrlType,
                                    treeId: data.treeID,
                                    branchIdx: data.branchIdx,
                                    rating: data.rating
                                });
                            }
                            else
                                console.log('In "RateArgStrength", could not update tree');
                            
                        });
                        // TODO: Send back new arg or just rating data for immediate updating.                        
                    }
                });
            });
            
            function CutAllInvitesParamPass(treeID, CB) {
                return function(trees) {
                    // Kill off moderator invites
                    var mods = trees[0].permissions.moderators;
                    for (var i = 0, len = mods.length; i < len; i++) {
                        if(mods[i].invite != Consts.inviteResps.REJECT) {
                            RemoveSubmArgModViewCheck(mods[i].accountID.toString(), trees[0]._id.toString());
                            CutInviteLink({ treeID: treeID, accountID: mods[i].accountID, invType: mods[i].invite}, 'moderators', 'moderating', null, 'ReceiveModCut');
                        }
                    }
                    // Kill off guest invites
                    var guests = trees[0].permissions.guests;
                    for (var i = 0, len = guests.length; i < len; i++)
                        if(guests[i].invite != Consts.inviteResps.REJECT)
                            CutInviteLink({ treeID: treeID, accountID: guests[i].accountID, invType: guests[i].invite}, 'guests', 'guestOf', null, 'ReceiveGuestCut');

                    CB(trees[0]);
                }
            }
            // Separated to be used upon account deletion
            function CutAllInvites(treeID, CB) {
                // Whichever removal method, cut all mod and guest links
                Find(colls.CTRL_TREES, { _id: treeID }, CutAllInvitesParamPass(treeID, CB));
            }
            function ArchiveTree(treeID) {
                // Open view permissions to anyone, Close submit permissions from everyone
                var modifier = { $set: {} };
                modifier.$set['archived'] = true;
                modifier.$set['archTimeStamp'] = SuppFuncs.FormatDate(new Date());
                modifier.$set['permissions.viewDebate'] = Consts.permTypes.ANYONE;
                modifier.$set['permissions.viewFeedback'] = Consts.permTypes.ANYONE;
                modifier.$set['permissions.viewRating'] = Consts.permTypes.ANYONE;
                modifier.$set['permissions.submitFeedback'] = Consts.permTypes.NONE;
                modifier.$set['permissions.submitRating'] = Consts.permTypes.NONE;
                modifier.$set['permissions.guests'] = [];
                modifier.$set['permissions.moderators'] = [];
                modifier.$set['modChat'] = [];
                Update(colls.CTRL_TREES, { _id: treeID }, modifier, {}, function(nModifed) {});

                // ? Cut each branch's external connections? Haven't established this feature yet, worry about it at that time.
                // TODO: Make timeline objects for removing trees in general.
            }

            // V+ Allow admin ctrl to be passed to a moderator
            socket.on('DeleteTree', function (data) {
                if(data.isCtrl) {
                    CutAllInvites(ObjectId(data.treeID), function(tree) {

                        // Get rid of tree from creator's admin list
                        Update(colls.ACCOUNTS, { _id: ObjectId(data.accountID) }, { $pull: { 'created': tree._id }}, {}, function (nModified) {});

                        var respObj = { msg: 'Moderated debate removed from your account', treeID: data.treeID, isCtrl: data.isCtrl };

                        // ARCHIVE 
                        if(data.removeType == Consts.treeRemoveTypes.ARCHIVE) {
                            // Remove creator's own mod view checks
                            RemoveSubmArgModViewCheck(data.accountID, data.treeID);
                            ArchiveTree(tree._id);

                            // Bookmrk tree for admin, mods, and guests
                            var bmObj = {
                                accountID: data.accountID,
                                treeID: data.treeID,
                                isCtrl: true,
                                typeKey: 'ctrl',
                                branchIdx: 0,
                                title: tree.title,
                                asser: tree.branches[0].assertion
                            };
                            AddBookmark(bmObj, true);

                            var mods = tree.permissions.moderators;
                            for (var i = 0, len = mods.length; i < len; i++) {
                                bmObj['accountID'] = mods[i].accountID;
                                AddBookmark(bmObj, false);
                            }

                            var guests = tree.permissions.guests;
                            for (var i = 0, len = guests.length; i < len; i++) {
                                bmObj['accountID'] = guests[i].accountID;
                                AddBookmark(bmObj, false);
                            }

                            CreateTimelineDoc(timeBldr.ArchTree(
                                timeBldr.types.ARCHIVED,
                                data.accountID,
                                data.username,
                                tree._id.toString(),
                                tree.title,
                                tree.branches[0].assertion
                            ), function(timelineDoc) {
                                respObj['timelineString'] = CreateTimelineString(timelineDoc, false);
                                socket.emit('DeleteTreeResp', respObj);
                            });
                        }
                        else {
                            db[colls.CTRL_TREES].remove({ _id: tree._id }, function(error, result) {
                                // Remove tree references from tags
                                for(var i = 0; i < tree.tags.length; i++)
                                    Update(colls.TAGS, { tag: tree.tags[i] }, { $pull: {'trees': tree._id.toString()}}, {}, function(nModifed) {});
                                
                                CreateTimelineDoc(timeBldr.DeleteTree(
                                    timeBldr.types.DELETED,
                                    data.accountID,
                                    data.username,
                                    tree.title,
                                    tree.branches[0].assertion
                                ), function(timelineDoc) {
                                    respObj['timelineString'] = CreateTimelineString(timelineDoc, false);
                                    socket.emit('DeleteTreeResp', respObj);
                                });
                            });
                        }
                    });
                }
                // This is really just a matter of removing the tree from the user's list, nothing more. Open trees live forever as they are.
                else {
                    Update(colls.ACCOUNTS, { _id: ObjectId(data.accountID) }, { $pull: {'created': ObjectId(data.treeID)}}, {}, function(nModifed) {
                        if(nModifed == 1)
                            socket.emit('DeleteTreeResp', { msg: 'Open debate link removed from your account', treeID: data.treeID, isCtrl: data.isCtrl });
                    });
                }
            });

            
            //* Leaving and Joining room MUST be done here, as their functions only work within 'InitSocketCalls' which brings the 'socket' and 'io' objects in
            function GetTreeWithSocketChecks(data, CB) {
                // Applies to moderators - leave current room
                if(data.inRoom)
                    LeaveRoom(data.roomName, data.username);

                GetTree(data, function(resObj) {
                    // Applies to moderators - join room for this debate
                    if(resObj.success) {
                        if(resObj.permObj.isMod && resObj.isControlled) {
                            JoinRoom(resObj.treeData._id.toString(), data.username, function(usernames) {
                                resObj['modActiveUsernames'] = usernames;
                                CB(resObj);
                            });
                            return;
                        }
                    }
                    CB(resObj);
                });
            }
            socket.on('GetTree', function (data) {
                GetTreeWithSocketChecks(data, function(resObj) {
                    socket.emit('GetTreeResp', resObj);
                });
            });
            socket.on('RefreshTree', function (data) {
                GetTreeWithSocketChecks(data, function(resObj) {
                    resObj['forceSameURL'] = true;
                    socket.emit('GetTreeResp', resObj);
                });
            });

            function IncrInteractionCount(data) {
                var modifier = { $inc: {} };
                modifier.$inc['branches.' + data.idx + '.interactions.direct'] = data.incr;
                // parIndices array begins with data.idx to incr it's cumulative count as well
                for(var i = 0; i < data.parIndices.length; i++)
                    modifier.$inc['branches.' + data.parIndices[i] + '.interactions.cumulative'] = data.incr;

                Update(data.isCtrl ? colls.CTRL_TREES : colls.OPEN_TREES, { _id: ObjectId(data.treeID) }, modifier, {}, function(nModifed) {});
            }
            socket.on('IncrInteractionCount', IncrInteractionCount);
 
            function AddInvitee(data, treeListName, accountListName, AddRespCallString, ReceiveInvCallString) {
                var treeID = ObjectId(data.treeID);

                // Don't update anything into account yet, not until the tree's invites are dealt with.
                FindNameOrEmail({ email: data.nameOrEmail, username: data.nameOrEmail }, function (success, account) {
                    if(success) {
                        var dataObj = {
                            accountID: account._id,
                            username: account.username,
                            invite: Consts.inviteResps.NONE
                        };

                        // Assign keys in such a way to allow string variables to be assigned
                        var pushModifier = { $push: {}};
                        var keyString = 'permissions.' + treeListName;
                        pushModifier['$push'][keyString] = { $each: [dataObj], $position: 0 };

                        var query = { _id: treeID };
                        keyString = 'permissions.' + treeListName + '.accountID';
                        query[keyString] = { $ne: account._id };
                        Update(colls.CTRL_TREES, query, pushModifier, {}, function (nModified) {
                            if(nModified == 1) {

                                pushModifier = { $push: {}};
                                pushModifier['$push'][accountListName] = { $each: [{ treeID: treeID, invAccepted: false }], $position: 0 };
                                Update(colls.ACCOUNTS, {_id: account._id}, pushModifier, {}, function(nModified){});

                                socket.emit(AddRespCallString, { success: success, dataObj: dataObj, htmlString: EJS_LI_AddUser({ liArr: [dataObj], indOnline: true, userConnName: true, userConnOpts: false, statusInd: true, accRejBtns: true, accBtn: false, inviteResps: Consts.inviteResps })});
                                // Have the "Find" function be seperate from the Update above, as it will rarely be necessary I think. And to seperate the nModified return from the tree return.
                                // I should probably cut out "interactions" from these links - could then pass the title through directly, no db call required.
                                if(account.socketID) {
                                    Find(colls.CTRL_TREES, { _id: treeID }, function (trees) {
                                        if(trees.length == 1) {
                                            var invData = {
                                                treeID: data.treeID,
                                                inviteLink: true,
                                                invAccepted: false,
                                                title: trees[0].title,
                                                // TODO: Because this is pending, block the link from showing anything about mail
                                                // TODO: Thus, the link needs to be replaced upon pending -> accepted or accepted -> invite cut (& mod is online)
                                                argSubs: null,
                                                interactions: trees[0].branches[0].interactions
                                            };
                                            io.to(account.socketID).emit(ReceiveInvCallString, { htmlString: EJS_LI_TreeLink({ liArr: [invData] }) });
                                        }
                                        else
                                            console.log('mongoHdlr.js, AddInvitee(), failed to get tree data to send html link to invitee');
                                    });
                                }
                            }
                            else
                                socket.emit(AddRespCallString, { success: false, msg: "User is already on this list." });
                        });
                    }
                    else {
                        socket.emit(AddRespCallString, { success: false, msg: "Could not find user." });
                        console.log('mongoHdlr.js, AddInvitee(), failed to find username or email.');
                    }
                });
            }

            socket.on('AddMod', function (data) {
                AddInvitee(data, 'moderators', 'moderating', 'AddModResponse', 'ReceiveModInvite');
            });
            socket.on('AddGuest', function (data) {
                AddInvitee(data, 'guests', 'guestOf', 'AddGuestResponse', 'ReceiveGuestInvite');
            });

            function CtrlRatingTransfer(ratingsObj, modifier, groupNameFrom, groupNameTo) {
                if(ratingsObj) {
                    var incUsed = false;
                    modifier.$inc = {};

                    for(var idx in ratingsObj) {
                        if(ratingsObj[idx] != -1) {
                            incUsed = true;
                            // Remove rating from ... side
                            modifier.$inc['branches.' + idx + '.rating.' + groupNameFrom + '.cumuValue'] = -ratingsObj[idx];
                            modifier.$inc['branches.' + idx + '.rating.' + groupNameFrom + '.entries'] = -1;
                            // Bring over to ... side
                            modifier.$inc['branches.' + idx + '.rating.' + groupNameTo + '.cumuValue'] = ratingsObj[idx];
                            modifier.$inc['branches.' + idx + '.rating.' + groupNameTo + '.entries'] = 1;
                        }
                    }

                    // Mongo will throw an error if $inc is sent in without any work being done.
                    if(!incUsed)
                        delete modifier['$inc'];
                }
            }
            
            // This is separated so it can also be used by 'DeleteTree' above
            //* ids must be ObjectId
            function CutInviteLink(data, treeListName, accountListName, CutRespCallString, ReceiveCutCallString, Callback) {
                var pullModifier = { $pull: {} };
                pullModifier.$pull[accountListName] = { treeID: data.treeID};

                FindAndUpdate(colls.ACCOUNTS, { _id: data.accountID }, pullModifier, true, function(success, account) {
                    // TODO: Set above truthy param to false and acquire invAccepted data from here to use in check past CB - will be easy if DB changed to use treeID as obj key for mods/guests
                    if(success) {
                        if(CutRespCallString)
                            socket.emit(CutRespCallString, { success: true, treeListName: treeListName, accountID: data.accountID, invType: data.invType });
                        
                        // Updating of tree (if required) happens in client
                        if(account.socketID) {
                            io.to(account.socketID).emit(ReceiveCutCallString, { treeID: data.treeID });
                            // Adjust total mod tree arg subm counts
                            if(treeListName == 'moderators') {
                                UpdateModArgSubms(account.moderating, account._id.toString(), function(dataObj) {
                                    io.to(account.socketID).emit('UpdateModSubms', dataObj || {total: 0, unviewed: 0, byTreeID: {}}); // user.js
                                });
                            }
                        }

                        if(Callback)
                            Callback(account.ratings.argStr.ctrl[data.treeID.toString()] || null, account.username);
                    }
                    else {
                        // Allowing for "success" in the case of rejected invite -> indicitive of a deleted account
                        if(data.invType == Consts.inviteResps.REJECT) {
                            if(CutRespCallString)    
                                socket.emit(CutRespCallString, { success: true, invType: data.invType });
                            if(Callback)
                                Callback();
                        }
                        else
                            console.log('MongoHdlr, CutInviteLink(), could not find account - (could be deleted).');
                        
                    }
                });
            }
            function CutInvitee(data, treeListName, accountListName, CutRespCallString, ReceiveCutCallString) {
                var treeID = ObjectId(data.treeID),
                    accountID = ObjectId(data.accountID);

                // Might need to move the data in this and the above function around to ensure there are no async problems.
                // Shouldn't be, since it's a function, not a loop.
                CutInviteLink({ treeID: treeID, accountID: accountID, invType: data.invType }, treeListName, accountListName, CutRespCallString, ReceiveCutCallString, function(ratingsObj, accountUsername) {
                    var modifier = { $pull: {} };
                    var keyString = 'permissions.' + treeListName;
                    modifier.$pull[keyString] = { accountID: accountID };

                    // Changes modifier by reference
                    if(treeListName == 'moderators' && data.invType == Consts.inviteResps.ACCEPT) {
                        CtrlRatingTransfer(ratingsObj, modifier, 'mod', 'vis');
                        FindAndUpdate(colls.CTRL_TREES, { _id: treeID }, modifier, true, function(success, updatedTree) {
                            modifier = { $set: {} };
                            FavourCalcTree(updatedTree.branches, modifier, 'mod');
                            FavourCalcTree(updatedTree.branches, modifier, 'vis');
                            Update(colls.CTRL_TREES, { _id: updatedTree._id }, modifier, {}, function(nModifed) {});
                        });

                        // Remove moderator from all details lists
                        io.in(data.treeID).emit('ModStatusChangeReceive', { responsePos: false, username: accountUsername });
                    }
                    else
                        Update(colls.CTRL_TREES, { _id: treeID }, modifier, {}, function (nModified) {});
                });
            }

            socket.on('CutModerator', function (data) {
                RemoveSubmArgModViewCheck(data.accountID, data.treeID);
                CutInvitee(data, 'moderators', 'moderating', 'CutUserResp', 'ReceiveModCut');
            });
            socket.on('CutGuest', function (data) {
                CutInvitee(data, 'guests', 'guestOf', 'CutUserResp', 'ReceiveGuestCut');
            });
            
            function AcceptRemoveCommon(query, modifier, wasModChange, callString, data, responsePos, account) {
                FindAndUpdate(colls.CTRL_TREES, query, modifier, true, function(success, updatedTree) {

                    // Ratings were transfered, need to re-calculate favourability
                    if(wasModChange) {
                        modifier = { $set: {} };
                        FavourCalcTree(updatedTree.branches, modifier, 'mod');
                        FavourCalcTree(updatedTree.branches, modifier, 'vis');
                        Update(colls.CTRL_TREES, { _id: updatedTree._id }, modifier, {}, function(nModifed) {});

                        // TODO: This is a broad solution, could be more specific
                        // Re-acquire all mod tree sumbission counts
                        UpdateModArgSubms(account.moderating, account._id.toString(), function(dataObj) {
                            socket.emit('UpdateModSubms', dataObj || {total: 0, unviewed: 0, byTreeID: {}}); // user.js
                        });
                        
                        // Send updated details info to any active users (they'll only be in the room if viewing this tree)
                        socket.broadcast.to(data.treeID).emit('ModStatusChangeReceive', { 
                            responsePos: responsePos,
                            treeID: updatedTree._id,
                            accountID: account._id,
                            username: account.username,
                            bio: account.bio
                        });
                    }

                    // Get adminID of tree to update admin as to invite acceptance, if online
                    db[colls.ACCOUNTS].find({ _id: updatedTree.adminID, socketID: {$ne: null} }, function (error, accounts) {
                        if(accounts.length)
                            io.to(accounts[0].socketID).emit(callString, { accountID: data.accountID, treeID: data.treeID, responsePos: responsePos });
                    });

                    // Refresh tree if this is the one being viewed right now
                    if(data.isActiveTree) {
                        var getTreeData = {
                            isControlled: true,
                            inRoom: data.inRoom,
                            roomName: data.treeID,
                            treeID: data.treeID,
                            branchIdx: data.branchIdx,
                            accountID: data.accountID,
                            username: account.username,
                            blockers: account.blockers.hash,
                            strRatings: data.strRatings
                        };
                        GetTreeWithSocketChecks(getTreeData, function(resObj) {
                            resObj['forceSameURL'] = true;
                            resObj['stayAtCurrPage'] = !!data.stayAtCurrPage;
                            socket.emit('GetTreeResp', resObj);
                        });
                    }
                });
            }
            function AcceptInvite(data, treeListName, accountListName, ReceiveAccCallString) {
                
                var setModifier = { $set: {} };
                setModifier.$set[accountListName + '.$.invAccepted'] = true;

                var query = { _id: ObjectId(data.accountID)};
                query[accountListName + '.treeID'] = ObjectId(data.treeID);
                FindAndUpdate(colls.ACCOUNTS, query, setModifier, true, function(success, account) {

                    query = { _id: ObjectId(data.treeID)};
                    query['permissions.' + treeListName + '.accountID'] = ObjectId(data.accountID);

                    var modifier = { $set: {} };
                    modifier.$set['permissions.' + treeListName + '.$.invite'] = Consts.inviteResps.ACCEPT;

                    // Changes modifier by reference
                    if(treeListName == 'moderators') {
                        // Replace the link to one that shows the submitted arguments for the accepted tree (new mod, so 'unviewed' = 'total')
                        db[colls.SUBM_ARGS].count({treeID: data.treeID}, function (error, argCount) {
                            if(error)
                                console.log('mongoHdlr.js, AcceptInvite() as mod, error getting subm arg count.');
                            else {
                                Find(colls.CTRL_TREES, query, function(trees) {
                                    if(trees.length == 1) {
                                        socket.emit('AccModeratorInvResp', { treeID: data.treeID, newLinkString: EJS_LI_TreeLink({ liArr: [{
                                            treeID: data.treeID,
                                            inviteLink: true,
                                            invAccepted: true,
                                            title: trees[0].title,
                                            argSubs: { total: argCount, unviewed: argCount },
                                            interactions: trees[0].branches[0].interactions
                                        }] })});
                                    }
                                    else
                                        console.log('mongoHdlr.js, AcceptInvite(), cannot find tree to send mod invite response.');
                                });
                            }
                        });
                        
                        CtrlRatingTransfer(account.ratings.argStr.ctrl[data.treeID] || null, modifier, 'vis', 'mod');
                    }
                    
                    AcceptRemoveCommon(query, modifier, treeListName == 'moderators', ReceiveAccCallString, data, true, account);
                });
            }

            socket.on('AccModeratorInv', function (data) {
                var modifier = {$set: {}};
                modifier.$set['modViews.' + data.accountID] = false;
                Update(colls.SUBM_ARGS, { treeID: data.treeID }, modifier, { multi: true }, function(nModifed) {});
                AcceptInvite(data, 'moderators', 'moderating', 'ReceiveModInvResp');  
            });
            socket.on('AccGuestInv', function (data) {
                AcceptInvite(data, 'guests', 'guestOf', 'ReceiveGuestInvResp');
            });

            function RemoveInvOnAccountDeletion(treeID, treeListName, accountID, username, isMod, receiveRejCallString) {
                var query = { _id: treeID};
                query['permissions.' + treeListName + '.accountID'] = accountID;

                var modifier = { $set: {} };
                modifier.$set['permissions.' + treeListName + '.$.invite'] = Consts.inviteResps.REJECT;

                FindAndUpdate(colls.CTRL_TREES, query, modifier, true, function(success, updatedTree) {
                    if(isMod)
                        socket.broadcast.to(treeID.toString()).emit('ModStatusChangeReceive', { responsePos: false, username: username });

                    // Get adminID of tree to update admin as to invite acceptance, if online
                    db[colls.ACCOUNTS].find({ _id: updatedTree.adminID, socketID: {$ne: null} }, function (error, accounts) {
                        if(accounts.length)
                            io.to(accounts[0].socketID).emit(receiveRejCallString, { accountID: accountID, treeID: treeID, responsePos: false });
                    });
                });
            }
            function RemoveInvite(data, treeListName, accountListName, ReceiveRejCallString) {
                var pullModifier = { $pull: {} };
                pullModifier.$pull[accountListName] = { treeID: ObjectId(data.treeID) };
                FindAndUpdate(colls.ACCOUNTS, { _id: ObjectId(data.accountID) }, pullModifier, true, function(success, account) {
                    var query = { _id: ObjectId(data.treeID)};
                    query['permissions.' + treeListName + '.accountID'] = ObjectId(data.accountID);

                    var modifier = { $set: {} };
                    modifier.$set['permissions.' + treeListName + '.$.invite'] = Consts.inviteResps.REJECT;

                    var wasModChange = (treeListName == 'moderators');
                    // Changes modifier by reference
                    if(wasModChange) {
                        CtrlRatingTransfer(account.ratings.argStr.ctrl[data.treeID] || null, modifier, 'mod', 'vis');
                    }

                    AcceptRemoveCommon(query, modifier, wasModChange, ReceiveRejCallString, data, false, account);
                });
            }

            socket.on('RemoveModInvite', function (data) {
                RemoveSubmArgModViewCheck(data.accountID, data.treeID);
                RemoveInvite(data, 'moderators', 'moderating', 'ReceiveModInvResp');
            });
            socket.on('RemoveGuestInvite', function (data) {
                RemoveInvite(data, 'guests', 'guestOf', 'ReceiveGuestInvResp');
            });

            // TODO: For both of these broadcasts, differentiate between simply joining/leaving the room,
            // and being/not being a moderator. Changing mod status should change details list as well

            function LeaveRoom(room, username) {
                socket.leave(room);
                socket.broadcast.to(room).emit('ModRoomChangeReceive', { username: username, active: false });
            }
            function JoinRoom(room, username, CB) {
                socket.join(room);
                socket.broadcast.to(room).emit('ModRoomChangeReceive', { username: username, active: true });
                
                // Get usernames of everyone already in room
                var socketList = [];
                for(var socketID in io.sockets.adapter.rooms[room].sockets)
                    if(io.sockets.adapter.rooms[room].sockets[socketID])
                        socketList.push(socketID);
                
                var pipeline = [];
                // Match all sockets minus my own
                pipeline.push({ $match: {
                    'username' : { $ne: username },
                    'socketID' : { $in: socketList }
                }});
                // Formatting
                pipeline.push({$project: {
                    _id: 0,
                    username: 1,
                }});
                pipeline.push({$group: {
                    _id: null,
                    usernames: {$push: '$username'},
                }});

                db[colls.ACCOUNTS].aggregate(pipeline, function (error, retObj) {
                    if(retObj.length == 1) {
                        if(CB) 
                            CB(retObj[0].usernames);
                        else 
                            socket.emit('ModRoomGetStarters', { usernames: retObj[0].usernames });
                    }
                    else {
                        if(CB) 
                            CB(null);
                        if(error)
                            console.log('mongoHdlr.js, JoinRoom(), error in aggregate pipeline');
                    }
                });
            }
            socket.on('JoinModChatRoom', function (data) {
                JoinRoom(data.room, data.username, null);
            });
            socket.on('ModChatSend', function (data) {
                data.msgObj.timeStamp = new Date();
                Update(colls.CTRL_TREES, { _id: ObjectId(data.room) }, {$push: {'modChat': data.msgObj}}, {}, function(nModifed) {
                    socket.broadcast.to(data.room).emit('ModChatReceive', data.msgObj);
                });
            });

            // V+ Add notifications on bookmarks to indicate changes to debate
            function AddBookmark(data, forActiveUser) {
                var keyString = 'bookmarked.' + data.typeKey + '.' + data.treeID;
                // Trying to ensure there are no duplicate bookark additions
                var query = { _id: ObjectId(data.accountID) };
                query[keyString] = {$ne: data.branchIdx};

                var modifier = { $addToSet: {} };
                modifier.$addToSet[keyString] = data.branchIdx;
                Update(colls.ACCOUNTS, query, modifier, {}, function (nModified) {
                    // V+ If it's not the active user calling this (called for mods & guests on tree deletion), lookup if user is loggedin and complete response if so.
                    if(forActiveUser) {
                        Find(data.isCtrl ? colls.CTRL_TREES : colls.OPEN_TREES,  { _id: ObjectId(data.treeID)}, function (trees) {
                            var liObj = {};
                            liObj[data.branchIdx] = {
                                assertion: data.asser,
                                interactions: trees[0].branches[data.branchIdx].interactions
                            };
                            socket.emit('AddBookmarkResp', {
                                success: true,
                                treeID: data.treeID,
                                branchIdx: data.branchIdx,
                                isCtrl: data.isCtrl,
                                typeKey: data.typeKey,
                                title: data.title,
                                archived: !!trees[0].archived,
                                htmlString: EJS_LI_BranchLink({liObj: liObj})
                            });
                        });
                    }                   
                });
            }

            // Main function is seperated so as to also be used by 'DeleteTree'
            socket.on('AddBookmark', function(data) {
                AddBookmark(data, true);
            });
            socket.on('RemoveBookmark', function (data) {
                var modifier
                if(data.unsetTreeID) {
                    modifier = { $unset: {} };
                    modifier.$unset['bookmarked.' + data.ctrlTypeKey + '.' + data.treeID] = 1;
                }
                else {
                    modifier = { $pull: {} };
                    modifier.$pull['bookmarked.' + data.ctrlTypeKey + '.' + data.treeID] = data.branchIdx;
                }
                Update(colls.ACCOUNTS, { _id: ObjectId(data.accountID) }, modifier, {}, function (nModified) {});
            });            
        },
        GetAccountID: function(userData, Callback) {
            CheckLoginCreds(userData, function (success, returnObj) {
                if(success)
                    // TODO: Socket isn't being inserted here, but I can still check that it must be null to proceed
                    // Otherwise send message. "Account is currently in use."
                    Callback({ success: success, accountID: returnObj._id.valueOf() });
                else
                    Callback({ success: success, msg: returnObj });
            });
        },
        // 100% do not remember what Comp means
        GetAccountComp: function(accountID, Callback) {
            if(!accountID) {
                console.log(`\nmongoHdlr.js GetAccountComp: No accountID, returning.`);

                Callback();
                return;
            }

            Find(colls.ACCOUNTS, { _id: ObjectId(accountID) }, function (accounts) {
                if(accounts.length > 0) {

                    // DONE: Need to fetch only the most recent 20, and create front-end system to load batches
                    // TODO: Same idea applies to search results, and anything else that can get too massive

                    // Get a count of all sent arguments
                    db[colls.SUBM_ARGS].count({accountID: accountID}, function (error, argCount) {
                        // Get a count of full personal timeline arguments
                        db[colls.TIMELINE].count({accountID: accountID}, function (error, timePersCount) {
                            // Get a count of full public timeline arguments
                            var strIDs = [];
                            for(var i = 0, len = accounts[0].following.length; i < len; i++) {
                                if(accounts[0].following[i].invite == Consts.inviteResps.ACCEPT)
                                    strIDs.push(accounts[0].following[i].accountID.toString());
                            }
                            db[colls.TIMELINE].count({ type: { $ne: timeBldr.types.DELETED }, accountID: { $in: strIDs }}, function (error, timePublCount) {
                                delete accounts[0].passHash;
                                Callback(true, accounts[0], argCount, timePersCount, timePublCount);
                            });
                        });
                    });
                }
                else {
                    Callback();
                    console.log("\nmongoHdlr.js GetAccountComp: Account not found");
                }
            });
        },
        CheckForTree: function(session, account, Callback) {
            if(ObjectId.isValid(session.urlParam) && session.treeType && !isNaN(session.branchIdx)) {
                GetTree({ 
                    accountID: session.accountID || null,
                    blockers: account ? account.blockers.hash : null,
                    strRatings: account ? (account.ratings.argStr[session.treeType][session.urlParam] || null) : null,
                    treeID: session.urlParam,
                    branchIdx: session.branchIdx,
                    isControlled: session.treeType == 'ctrl'
                }, Callback);
            }
            else
                Callback(null);
        },
        LogIn: function(accountID, socketID, Callback) {
            if(!accountID) {
                Callback(false, null, null, null);
                return;
            }

            var setModifier = { $set: { socketID: socketID }};
            FindAndUpdate(colls.ACCOUNTS, { _id: ObjectId(accountID) }, setModifier, true, function (success, accountObj) {
                if(success) {

                    // TODO: CLEAN OUT ANY DELETED TREES.
                    //- Bookmarked
                    //- Recently visited

                    var loginHTMLObj = {
                        created: '',
                        bookmarkedCtrl: '',
                        bookmarkedArch: '',
                        bookmarkedOpen: '',
                        guestOf: '',
                        moderating: '',
                        dashTreeLinks: '',
                        timelinePrivate: '',
                        timelinePublic: ''
                    };
                    var loginDataObj = {
                        allCreateSubms: { total: 0, unviewed: 0, byTreeID: {} },
                        allModSubms: { total: 0, unviewed: 0, byTreeID: {} },
                        followCounts: {
                            following: { total: 0, byType: [0, 0, 0] },
                            followers: { total: 0, byType: [0, 0, 0] }
                        },
                        avaSrcObj: {}
                    };

                    //* GET AVATAR SRCs - starting with this user's, collect the src data for the avatar of each user the client encounters
                    var idsForAvaSrcColl = [ accountObj._id ];

                    var checks = Consts.LOGIN_GET_HTML_CHECKS + Consts.LOGIN_GET_DATA_CHECKS;
                    function LoginPrepCheck() {
                        checks--;
                        if(checks == 0) {
                            delete accountObj.passHash; // Pretty important that this not casually be sent to the client.
                            // I do actually need to reference this list -> delete accountObj.blockers; //_ Don't want to client actually gleening who has blocked them
                            Callback(true, accountObj, loginHTMLObj, loginDataObj);
                        }
                    }

                    // CREATED - CTRL
                    function DelayGetCreatedTreeLinks() {
                        if(accountObj.created.length > 0) {
                            //db[colls.CTRL_TREES].find({ _id: { $in: accountObj.created }}).sort({ "_id": -1 }).toArray(function (error, trees) {});
                            Find(colls.CTRL_TREES, { _id: { $in: accountObj.created }, archived: false }, function (trees) {
                                pushList = [];

                                for(var i = 0, len = trees.length; i < len; i++) {
                                    pushList.push({
                                        treeID: trees[i]._id,
                                        inviteLink: false,
                                        title: trees[i].title,
                                        argSubs: loginDataObj.allCreateSubms.byTreeID[trees[i]._id.toString()] || { total: 0, unviewed: 0 },
                                        interactions: trees[i].branches[0].interactions
                                    });
                                }
                                // Even though my db list is in proper order, trees always come out sorted backwards.
                                pushList.reverse();
                                loginHTMLObj['created'] = EJS_LI_TreeLink({ liArr: pushList });
                                LoginPrepCheck();
                            });
                        }
                        else
                            LoginPrepCheck();
                    }
                    

                    var bookmarkCtrlTreeIdList = [],
                    bookmarkOpenTreeIdList = [];
                    for(var treeID in accountObj.bookmarked.ctrl) {
                        bookmarkCtrlTreeIdList.push(ObjectId(treeID));
                        bookmarkCtrlTreeIdList.reverse();
                    }
                    for(var treeID in accountObj.bookmarked.open) {
                        bookmarkOpenTreeIdList.push(ObjectId(treeID));
                        bookmarkOpenTreeIdList.reverse();
                    }

                    // BOOK MARK - CTRL
                    if(bookmarkCtrlTreeIdList.length > 0) {
                        Find(colls.CTRL_TREES, { _id: { $in: bookmarkCtrlTreeIdList }, archived: false }, function (trees) {
                            pushList = {};
                            for(var i = 0, len = trees.length; i < len; i++) {
                                var idxList = accountObj.bookmarked.ctrl[trees[i]._id];
                                var listLen = idxList.length;
                                var branchListPassObj = {};
                                for(var j = 0; j < listLen; j++)
                                    branchListPassObj[idxList[j]] = {
                                        assertion: trees[i].branches[idxList[j]].assertion,
                                        interactions: trees[i].branches[idxList[j]].interactions
                                    };

                                pushList[trees[i]._id] = {
                                    title: trees[i].title,
                                    numBranches: listLen,
                                    branchObj: branchListPassObj
                                }
                            }
                            loginHTMLObj['bookmarkedCtrl'] = EJS_LI_BranchBtnList({ pathPartials: 'views/partials/', treeList: pushList });
                            LoginPrepCheck();
                        });
                    }
                    else
                        LoginPrepCheck();

                    // BOOK MARK - ARCHIVED
                    if(bookmarkCtrlTreeIdList.length > 0) {
                        Find(colls.CTRL_TREES, { _id: { $in: bookmarkCtrlTreeIdList }, archived: true }, function (trees) {
                            pushList = {};
                            for(var i = 0, len = trees.length; i < len; i++) {
                                var idxList = accountObj.bookmarked.ctrl[trees[i]._id];
                                var listLen = idxList.length;
                                var branchListPassObj = {};
                                for(var j = 0; j < listLen; j++)
                                    branchListPassObj[idxList[j]] = {
                                        assertion: trees[i].branches[idxList[j]].assertion,
                                        interactions: trees[i].branches[idxList[j]].interactions
                                    };

                                pushList[trees[i]._id] = {
                                    title: trees[i].title,
                                    numBranches: listLen,
                                    branchObj: branchListPassObj
                                }
                            }
                            loginHTMLObj['bookmarkedArch'] = EJS_LI_BranchBtnList({ pathPartials: 'views/partials/', treeList: pushList });
                            LoginPrepCheck();
                        });
                    }
                    else
                        LoginPrepCheck();

                    // BOOK MARK - OPEN
                    if(bookmarkOpenTreeIdList.length > 0) {
                        Find(colls.OPEN_TREES, { _id: { $in: bookmarkOpenTreeIdList }}, function (trees) {
                            pushList = {};
                            for(var i = 0, len = trees.length; i < len; i++) {
                                var idxList = accountObj.bookmarked.open[trees[i]._id];
                                var listLen = idxList.length;
                                var branchListPassObj = {};
                                for(var j = 0; j < listLen; j++)
                                    branchListPassObj[idxList[j]] = {
                                        assertion: trees[i].branches[idxList[j]].assertion,
                                        interactions: trees[i].branches[idxList[j]].interactions
                                    };

                                pushList[trees[i]._id] = {
                                    title: trees[i].title,
                                    numBranches: listLen,
                                    branchObj: branchListPassObj
                                }
                            }
                            loginHTMLObj['bookmarkedOpen'] = EJS_LI_BranchBtnList({ pathPartials: 'views/partials/', treeList: pushList });
                            LoginPrepCheck();
                        });
                    }
                    else
                        LoginPrepCheck();

                    // GUEST OF
                    if(accountObj.guestOf.length > 0) {
                        var guestOfIdList = [],
                            guestOfInviteRefObj = {};
                        for(var i = 0; i < accountObj.guestOf.length; i++) {
                            guestOfIdList.push(ObjectId(accountObj.guestOf[i].treeID));
                            guestOfInviteRefObj[accountObj.guestOf[i].treeID] = accountObj.guestOf[i].invAccepted;
                        }

                        Find(colls.CTRL_TREES, { _id: { $in: guestOfIdList }}, function (trees) {
                            pushList = [];
                            for(var i = 0, len = trees.length; i < len; i++) {
                                pushList.push({
                                    treeID: trees[i]._id,
                                    inviteLink: true,
                                    invAccepted: guestOfInviteRefObj[trees[i]._id], // Might err if not converted to string from ObjectId
                                    title: trees[i].title,
                                    argSubs: null,
                                    interactions: trees[i].branches[0].interactions
                                });
                            }
                            loginHTMLObj['guestOf'] = EJS_LI_TreeLink({ liArr: pushList });
                            LoginPrepCheck();
                        });
                    }
                    else
                        LoginPrepCheck();

                    // MODERATOR
                    function DelayGetModTreeLinks() {
                        if(accountObj.moderating.length > 0) {
                            var modIdList = [],
                                modInviteRefObj = {};
                            for(var i = 0; i < accountObj.moderating.length; i++) {
                                modIdList.push(ObjectId(accountObj.moderating[i].treeID));
                                modInviteRefObj[accountObj.moderating[i].treeID] = accountObj.moderating[i].invAccepted;
                            }

                            Find(colls.CTRL_TREES, { _id: { $in: modIdList }}, function (trees) {
                                pushList = [];
                                for(var i = 0, len = trees.length; i < len; i++) {
                                    pushList.push({
                                        treeID: trees[i]._id,
                                        inviteLink: true,
                                        invAccepted: modInviteRefObj[trees[i]._id],
                                        title: trees[i].title,
                                        argSubs: modInviteRefObj[trees[i]._id] ? (loginDataObj.allModSubms.byTreeID[trees[i]._id.toString()] || { total: 0, unviewed: 0 }) : null,
                                        interactions: trees[i].branches[0].interactions
                                    });
                                }
                                loginHTMLObj['moderating'] = EJS_LI_TreeLink({ liArr: pushList });
                                LoginPrepCheck();
                            });
                        }
                        else
                            LoginPrepCheck();
                    }

                    // LAST 5 DEBATES
                    var treeVisCount = accountObj.recentTreeVis.length;
                    if(treeVisCount > 0) {
                        Find(colls.CTRL_TREES, { _id: { $in: accountObj.recentTreeVis}}, function(ctrlTrees) {
                            var linkDataArr = [];
                            if(ctrlTrees.length > 0) {
                                for(var i = 0; i < ctrlTrees.length; i++) {
                                    linkDataArr.push({
                                        id: ctrlTrees[i]._id,
                                        isCtrl: true,
                                        title: ctrlTrees[i].title,
                                        assertion: ctrlTrees[i].branches[0].assertion
                                    });
                                }
                                loginHTMLObj['dashTreeLinks'] = EJS_LI_DashTreeLink({ linkDataArr: linkDataArr });
                            }

                            if(ctrlTrees.length < treeVisCount) {
                                Find(colls.OPEN_TREES, { _id: {$in: accountObj.recentTreeVis}}, function(openTrees) {
                                    linkDataArr = [];
                                    for(var i = 0; i < openTrees.length; i++) {
                                        linkDataArr.push({
                                            id: openTrees[i]._id,
                                            isCtrl: false,
                                            title: openTrees[i].title,
                                            assertion: openTrees[i].branches[0].assertion
                                        });
                                    }
                                    loginHTMLObj['dashTreeLinks'] += EJS_LI_DashTreeLink({ linkDataArr: linkDataArr });
                                    LoginPrepCheck();
                                })
                            }
                            else
                                LoginPrepCheck();
                        });
                    }
                    else
                        LoginPrepCheck();

                    // PRIVATE TIMELINE
                    db[colls.TIMELINE].find({ accountID: accountObj._id.toString()}).sort({ "_id" : -1 }).limit(Consts.TIMELINE_BATCH_SIZE).toArray(function (error, items) {
                        for(var i = 0, len = items.length; i < len; i++)
                            loginHTMLObj['timelinePrivate'] += CreateTimelineString(items[i], false);

                        LoginPrepCheck();
                    });

                    // PUBLIC TIMELINE, based on Following
                    // Gather up all accepted account ids
                    var strIDs = [];
                    for(var i = 0, len = accountObj.following.length; i < len; i++) {
                        idsForAvaSrcColl.push(accountObj.following[i].accountID);
                        if(accountObj.following[i].invite == Consts.inviteResps.ACCEPT)
                            strIDs.push(accountObj.following[i].accountID.toString());
                    }
                    // Find timeline items and sort by their _ids(by time)
                    //* Exclude personal timeline items, including:
                    //- Deleted trees
                    db[colls.TIMELINE].find({ type: { $ne: timeBldr.types.DELETED }, accountID: { $in: strIDs }}).sort({ "_id" : -1 }).limit(Consts.TIMELINE_BATCH_SIZE).toArray(function (error, items) {
                        for(var i = 0, len = items.length; i < len; i++)
                            loginHTMLObj['timelinePublic'] += CreateTimelineString(items[i], true);

                        LoginPrepCheck();
                    });

                    //* Acquire avatar src data - need image extensions
                    // Continue collecting ids of Followers and Blocking, for use in the rest of the Connections page
                    for(var i = 0, len = accountObj.followers.length; i < len; i++)
                        idsForAvaSrcColl.push(accountObj.followers[i].accountID);
                    for(var i = 0, len = accountObj.blocking.length; i < len; i++)
                        idsForAvaSrcColl.push(accountObj.blocking[i].accountID);

                    var extCheck = 0;
                    function TimeAvatarLoopCheck() {
                        extCheck--;
                        if(extCheck <= 0)
                            LoginPrepCheck();
                    }

                    var pipeline = [];
                    pipeline.push({ $match: { '_id' : { $in: idsForAvaSrcColl } }});
                    pipeline.push({$project: { _id: 1, avatarExt: 1 }});
                    db[colls.ACCOUNTS].aggregate(pipeline, function (error, retObj) {
                        if(retObj.length > 0) {
                            extCheck = retObj.length;
                            for(var i = 0, len = retObj.length; i < len; i++) {
                                if(retObj[i].avatarExt) {
                                    GetAvatarData(retObj[i]._id, retObj[i].avatarExt, function(accountID, srcData) {
                                        if(srcData)
                                            loginDataObj.avaSrcObj[accountID] = srcData;
                                        TimeAvatarLoopCheck();
                                    });
                                }
                                else
                                    TimeAvatarLoopCheck();
                            }
                        } 
                        else if(error) {
                            console.log('mongoHdlr.js, Login() acquiring user avatars, error in aggregate pipeline');
                            TimeAvatarLoopCheck();
                        }
                        else
                            TimeAvatarLoopCheck();
                    });
                    
                    // SOCIAL TOTALS - Following
                    if(accountObj.following.length > 0)
                        GetFollowCounts(accountObj.following, loginDataObj.followCounts.following);
                    LoginPrepCheck(); // Above check is syncronous, no delay concern

                    // TODO: Get and use avatars
                    // SOCIAL TOTALS - Followers
                    if(accountObj.followers.length > 0)
                        GetFollowCounts(accountObj.followers, loginDataObj.followCounts.followers);
                    LoginPrepCheck(); // Above check is syncronous, no delay concern

                    // TODO: Same for blocking

                    // ALL CREATED TREE TOTALS - Get args subms before creating html strings
                    if(accountObj.created.length > 0) {
                        var createStringIDs = [];
                        for(var i = 0; i < accountObj.created.length; i++)
                            createStringIDs.push(accountObj.created[i].toString());

                        GetViewableArgSubmCounts(createStringIDs, accountID, function(dataObj) {
                            loginDataObj.allCreateSubms = dataObj || {total: 0, unviewed: 0, byTreeID: {}};
                            LoginPrepCheck();
                            DelayGetCreatedTreeLinks();
                        });
                    }
                    else {
                        LoginPrepCheck();
                        DelayGetCreatedTreeLinks();
                    }

                    // ALL MOD TREE TOTALS - Get args subms before creating html strings
                    if(accountObj.moderating.length > 0) {
                        UpdateModArgSubms(accountObj.moderating, accountID, function(dataObj) {
                            loginDataObj.allModSubms = dataObj || {total: 0, unviewed: 0, byTreeID: {}};
                            LoginPrepCheck();
                            DelayGetModTreeLinks();
                        });
                    }
                    else {
                        LoginPrepCheck();
                        DelayGetModTreeLinks();
                    }
                }
                else
                    console.log("mongoHdlr LogIn: Account not found");
            });
        },
        SignUp: function(userData, Callback) {
            // I have this in here instead of using the FindNameOrEmail function so as to distinguish each, to let the user know which part was the issue.
            db[colls.ACCOUNTS].find({ email: userData.email }, function (error, accounts) {
                if (accounts.length > 0)
                    Callback({ success: false, msg: "Account already exists for this email address" });
                else {
                    db[colls.ACCOUNTS].find({ username: new RegExp('^' + userData.username + '$', 'i')}, function (error, accounts2) {
                        if (accounts2.length > 0)
                            Callback({ success: false, msg: "Username Taken" });
                        else {
                            AddUser(userData, function (accountObj) {
                                CreateTimelineDoc(timeBldr.SignUp(timeBldr.types.SIGN_UP, accountObj._id.toString(), accountObj.username ), function(timelineDoc) {
                                    // timelineString: CreateTimelineString(timelineDoc, false) - Not necessary to add, as the page reloads upon signup/login
                                    Callback({ success: true, accountID: accountObj._id.toString() });
                                });                                
                            });
                        }
                    });
                }
            });
        },
        GetMostInteracted: function(account, Callback) {
            console.log(`\nmongoHdlr.js GetMostInteracted.`);

            db[colls.OPEN_TREES].find({}).sort({ "branches.0.interactions.cumulative" : -1, "_id" : -1 }).limit(20).toArray(function (error, openTrees) {
                console.log(`\nmongoHdlr.js -db[colls.OPEN_TREES].find openTrees.length <${openTrees.length}>`);
                
                db[colls.CTRL_TREES].find({ archived: false }).sort({ "branches.0.interactions.cumulative" : -1, "_id" : -1 }).limit(20).toArray(function (error, ctrlTrees) {
                    console.log(`\nmongoHdlr.js -db[colls.CTRL_TREES].find non-archived, ctrlTrees.length<${ctrlTrees.length}>`);
                    
                    db[colls.CTRL_TREES].find({ archived: true }).sort({ "branches.0.interactions.cumulative" : -1, "_id" : -1 }).limit(20).toArray(function (error, archTrees) {
                        console.log(`\nmongoHdlr.js -db[colls.CTRL_TREES].find archived archTrees.length<${archTrees.length}>`);
                        
                        var openTreeArr = [];
                        for(var i = 0, len = openTrees.length; i < len; i++) {
                            openTreeArr.push({
                                treeID: openTrees[i]._id,
                                title: openTrees[i].title,
                                interactions: openTrees[i].branches[0].interactions
                            });
                        }

                        var ctrlTreeArr = [];
                        // Cut out trees that user is not permitted to view
                        var accountID = account ? account._id.toString() : null;
                        for(var i = 0, len = ctrlTrees.length; i < len; i++) {
                            if(account)
                                if(!CheckCanView(account.blockers, accountID, ctrlTrees[i].adminID, ctrlTrees[i].permissions))
                                    continue;

                            ctrlTreeArr.push({
                                treeID: ctrlTrees[i]._id,
                                title: ctrlTrees[i].title,
                                interactions: ctrlTrees[i].branches[0].interactions
                            });
                        }

                        var archTreeArr = [];
                        for(var i = 0, len = archTrees.length; i < len; i++) {
                            archTreeArr.push({
                                treeID: archTrees[i]._id,
                                title: archTrees[i].title,
                                interactions: archTrees[i].branches[0].interactions
                            });
                        }
                        Callback(openTreeArr, ctrlTreeArr, archTreeArr);
                    });
                });
            });
        },
        LeaveRooms: function(socket) {
            var roomsCache = [];
            for(var id in socket.rooms)
                roomsCache.push(socket.rooms[id]);

            var pipeline = [];
            pipeline.push({ $match: { 'socketID' : socket.client.id }});
            pipeline.push({$project: { _id: 0, username: 1 }});
            db[colls.ACCOUNTS].aggregate(pipeline, function (error, retObj) {
                if(retObj.length == 1) {
                    for(var i = 0; i < roomsCache.length; i++) {
                        socket.leave(roomsCache[i]);
                        socket.broadcast.to(roomsCache[i]).emit('ModRoomChangeReceive', { username: retObj[0].username, active: false });
                    }
                } 
                else if(error) {
                    console.log('mongoHdlr.js, LeaveRooms(), error in aggregate pipeline');
                }
            });
        },
        Logout: function(socketID) {
            LogoutHdlr({ socketID: socketID });
        },
        HTMLforPDF: function(treeID, isCtrl, CB) {
            Find(isCtrl ? colls.CTRL_TREES : colls.OPEN_TREES, { _id: ObjectId(treeID) }, function(trees) {
                if(trees.length < 1)
                    CB(true, null, null);
                else {
                    // TODO: Perhaps still do permission check here incase anyone types tree path into url
                    // - Need to bring in accountID for this

                    // TODO: Complete robust html tree/argument output
                    var html = EJS_TreeHTMLToPDF({
                        title: trees[0].title,
                        timeStamp: SuppFuncs.FormatDate(trees[0]._id.getTimestamp()),
                        archTimeStamp: trees[0].archTimeStamp,
                        branches: trees[0].branches,
                        argTypes: Consts.argTypes
                    });

                    CB(false, html, trees[0].title);
                }                
            });
        },
        GetConnectionURL: function() {
            return mongoURI;
        },
        GetConnObj: function() {
            if(!mongoConn)
                Connect();

            return mongoConn;
        },
        GetDBObj: function() {
            return db;
        },
        AddVisit: function(ip, date, CB) {
            var col = db.collection('counts');
            // Create a document with request IP and current time of request
            col.insert({ ip: ip, date: date });
            col.count(function(err, count) {
                if (err) {
                    console.log('Error running count. Message:\n' + err);
                }
                CB(count, dbDetails);
            });
        },
        GetVisits: function(CB) {
            db.collection('counts').count(function(err, count ) {
                CB(count);
            });
        }
    };

    return module;
}

/* Failed aggregation attempt
var aggArr = [];

var op1 = { $lookup: {} };
op1.$lookup['from'] = colls.;
op1.$lookup['localField'] = 'accountID';
op1.$lookup['foreignField'] = 'accountID';
op1.$lookup['as'] = 'archivedArgSubs';

var op2 = { $match: {} };
op2.$match['accountID'] = accountID;

aggArr.push(op1);
aggArr.push(op2);

db[colls.SUBM_ARGS].aggregate(aggArr, function (error, args) {
    console.log(args);
});*/





/* Another
var aggArr = [];

var optMatch = { $match: {} };
optMatch.$match['_id'] = { $in: ids};

var optGroup = { $group: {} };
optGroup.$group['_id'] = null;
optGroup.$group['idArr'] = {$push: {'k': { $toString: '$_id' }, 'v': '$title'}};

var optReplRoot = { $replaceRoot: {} };
optReplRoot.$replaceRoot['idObj'] = { $arrayToObject: '$idArr'};

//! arrayToObj is not working because the _id is an ObjectId, not string. So far, cannot find anything to cast
//! There will be $toString and/or $convert in upcoming versions
var optProject = { $project: {} };
optProject.$project['idArr'] = { $arrayToObject: '$idArr' };

// optProject.$project['idArr'] = { 
//     $arrayToObject: {
//         $map: {
//             input: '$idArr',
//             as: 'pair',
//             in: ['$$pair.k', '$$pair.v']
//         }
//     }
// };

aggArr.push(optMatch);
aggArr.push(optGroup);
//aggArr.push(optReplRoot);
aggArr.push(optProject);

console.log(aggArr);
console.log('======================================');
db[colls.OPEN_TREES].aggregate(aggArr, function (error, trees2) {
    console.log(trees2);
    //for(var j = 0; j < trees2[0].idArr.length; j++) {
        //console.log(trees2[0].idArr[j]);
    //}
});*/



/* This actually did work, though I'm changing the model

var aggArr = [];

var accountIDs = [accountObj._id];
for(var _id in accountObj.following.hash)
    accountIDs.push(ObjectId(_id));

var optMatch = { $match: {} };
optMatch.$match['_id'] = { $in: accountIDs};

var optProject = { $project: {} };
optProject.$project['_id'] = 0;
optProject.$project['username'] = 1;
optProject.$project['history'] = '$activity.history';

aggArr.push(optMatch);
aggArr.push(optProject);
aggArr.push({ $unwind: '$history' });
aggArr.push({ $addFields: { 'history.username': '$username' }});
aggArr.push({ $project: { 'username': 0 }});
aggArr.push({ $replaceRoot: { 'newRoot': '$history' }});
aggArr.push({ $sort: { 'timeStamp': -1 }});

console.log(aggArr);
console.log('======================================');
db[colls.ACCOUNTS].aggregate(aggArr, function (error, history) {
    console.log(history);
});

*/
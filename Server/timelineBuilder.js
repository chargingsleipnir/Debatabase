// TODO: New set of permissions/preferences to control what's shown

/**
 * * Min Data requirements
 * * This should be enough to only require 1 db find() per history object
 * * Could require zero finds, though I'd consume a lot more memory redundantly :/
 * 
 * * All
 * type
 * date (but maybe not here, maybe as object key)
 * 
 * * SIGN_UP
 * ? nothing else
 * 
 * * CREATE_OPEN, CREATE_CTRL
 * treeID
 *
 * * ADD_NEW_ARG, EDIT_ARG
 * treeID
 * branchIdx
 * 
 * * LINK_TREES (might need less info, each tree will reference the other)
 * treeID
 * branchIdx (parent)
 * Linked treeID
 * Linked tree branchIdx
 * 
 * * RECEIVE_FB, ADOPT_FB
 * submArgID
 * 
 * * RATE_ARG, RATE_REV
 * treeID
 * branchIdx
 * 
 * * SUBM_ARG, SUBM_ACC (Submission acceptance [when THIS user's sent argSub is used to create an argument])
 * submArgID
 * 
 * * FOLLOWING, FOLLOWED, BLOCKED
 * accountID
 */

module.exports = function() {

    // Going to use objectIDs for timeStamp tracking, as that is what the Activity collection will already provide
    function HistObj(type, accountID, username) {
        this.type = type;
        this.accountID = accountID;
        this.username = username;
    }
    function HistObjDeleteTree(type, accountID, username, title, asserRoot) {
        var retObj = new HistObj(type, accountID, username);
        retObj.title = title;
        retObj.asser = asserRoot;
        return retObj;
    }
    function HistObjCreateTree(type, accountID, username, treeID, branchIdx, title, asserRoot) {
        var retObj = new HistObjDeleteTree(type, accountID, username, title, asserRoot);
        retObj.treeID = treeID;
        retObj.branchIdx = branchIdx;
        return retObj;
    }
    function HistObjCreateBranch(type, accountID, username, treeID, branchIdx, title, origAsser, respAsser, argType) {
        var retObj = new HistObjCreateTree(type, accountID, username, treeID, branchIdx, title, origAsser);
        retObj.asser2 = respAsser;
        retObj.argType = argType;
        return retObj;
    }
    function HistObjLinkTrees(type, accountID, username, treeID1, branchIdx1, title1, asser1, treeID2, branchIdx2, title2, asser2, argType) {
        var retObj = new HistObjCreateBranch(type, accountID, username, treeID1, branchIdx1, title1, asser1, asser2, argType);
        retObj.treeID2 = treeID2;
        retObj.branchIdx2 = branchIdx2;
        retObj.title2 = title2;
        return retObj;
    }
    function HistObjAdoptArg(type, accountID, username, treeID, branchIdx, title, asser, submAsser, argType, senderName) {
        var retObj = new HistObjCreateBranch(type, accountID, username, treeID, branchIdx, title, asser, submAsser, argType);
        retObj.senderName = senderName;
        return retObj;
    }

    var module = {
        // These will all show up for the user, but only some will show up for the follower
        types: {
            SIGN_UP: 0,
            CREATE_OPEN: 1,
            CREATE_CTRL: 2,
            ADD_NEW_ARG: 3,
            LINK_TREES: 4,
            ADOPT_SUBM: 5,
            SUBM_SENT: 6,
            SUBM_ADOPT: 7,
            ARCHIVED: 8,
            DELETED: 9
        },
        typeDescs: [
            'Signed up with Debatabase',
            'Create open debate',
            'Created moderated debate',
            'Added new argument',
            'Linked to another debate',
            'Adopted argument submission',
            'Submitted argument',
            'Submitted argument was adopted',
            'Debate archived',
            'Debate deleted'
        ],
        SignUp: (type, accountID, username) => new HistObj(type, accountID, username),
        CreateTree: (type, accountID, username, treeID, title, asserRoot) => new HistObjCreateTree(type, accountID, username, treeID, 0, title, asserRoot),
        CreateBranch: (type, accountID, username, treeID, branchIdx, title, origAsser, respAsser, argType) => new HistObjCreateBranch(type, accountID, username, treeID, branchIdx, title, origAsser, respAsser, argType),
        LinkTrees: (type, accountID, username, treeID1, branchIdx1, title1, asser1, treeID2, branchIdx2, title2, asser2, argType) => new HistObjLinkTrees(type, accountID, username, treeID1, branchIdx1, title1, asser1, treeID2, branchIdx2, title2, asser2, argType),
        AdoptArg: (type, accountID, username, treeID, branchIdx, title, origAsser, respAsser, argType, senderName) => new HistObjAdoptArg(type, accountID, username, treeID, branchIdx, title, origAsser, respAsser, argType, senderName),
        SubmArg: (type, accountID, username, treeID, branchIdx, title, origAsser, respAsser, argType) => new HistObjCreateBranch(type, accountID, username, treeID, branchIdx, title, origAsser, respAsser, argType),
        SubmArgAdopted: (type, accountID, username, treeID, branchIdx, title, submAsser, adaptation, argType) => new HistObjCreateBranch(type, accountID, username, treeID, branchIdx, title, submAsser, adaptation, argType),
        ArchTree: (type, accountID, username, treeID, title, asserRoot) => new HistObjCreateTree(type, accountID, username, treeID, 0, title, asserRoot),
        DeleteTree: (type, accountID, username, title, asserRoot) => new HistObjDeleteTree(type, accountID, username, title, asserRoot),
    };

    return module;
};
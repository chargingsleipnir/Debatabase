var User = (function () {

    var isGuestAccount = false;

    return {
        loggedIn: false,
        accountData: null,
        submArgs: {
            out: { batchNum: -1, list: null, treesObj: null },
            in: {
                allCreateSubms: null, /* {total: 0, unviewed: 0, byTreeID: {}} */
                allModSubms: null /* {total: 0, unviewed: 0, byTreeID: {}} */
            }
        },
        countOthers: null, /* {
            following: { total: 0, byType: [0, 0, 0] },
            followers: { total: 0, byType: [0, 0, 0] }
        },*/
        perms: {},
        favour: {},
        Init: function(accountData, loginData) {
            User.loggedIn = true;
            User.accountData = accountData;
            User.submArgs.in.allCreateSubms = loginData.allCreateSubms;
            User.submArgs.in.allModSubms = loginData.allModSubms;
            User.countOthers = loginData.followCounts;

            isGuestAccount = accountData.username == 'Guest';

            // User data specific callbacks
            Network.CreateResponse('RateArgStrengthResp', function(respObj) {
                if(!User.accountData.ratings.argStr[respObj.ctrlType][respObj.treeId])
                    User.accountData.ratings.argStr[respObj.ctrlType][respObj.treeId] = {};

                User.accountData.ratings.argStr[respObj.ctrlType][respObj.treeId][respObj.branchIdx] = respObj.rating;
            });

            Network.CreateResponse('UpdateModSubms', function(updObj) {
                User.submArgs.in.allModSubms = updObj;
                ActivityPg.UpdateModSubms();
            }); 
        },
        IsGuestAccount: function() {
            return isGuestAccount;
        },
        CheckActive: function(value) {
            return (value == User.accountData.username || value == User.accountData.email);
        },
        // retNum option exists so I can (in some cases) determine if this data has ever been set before
        GetStrRatings: function(treeID, isCtrl, branchIdx, retNum) {
            var retObj = User.accountData ? User.accountData.ratings.argStr[isCtrl ? 'ctrl' : 'open'][treeID] || null : null;
            if(branchIdx) {
                if(retObj)
                    return isNaN(retObj[branchIdx]) ? (retNum ? -1 : null) : retObj[branchIdx];
                else
                    return retNum ? -1 : null;
            }
            return retObj;
        },
        GetRevRatings: function(treeID, branchIdx, retNum) {
            var retObj = User.accountData ? User.accountData.ratings.revInt[treeID] || null : null;
            if(branchIdx) {
                if(retObj)
                    return isNaN(retObj[branchIdx]) ? (retNum ? 0 : null) : retObj[branchIdx];
                else
                    return retNum ? 0 : null;
            }
            return retObj;
        },
        SetRevIntData: function(revIntData) {
            User.accountData.ratings.revInt = revIntData;
        },
        ResetFavour: function() {
            User.favour = { std: {}, firstPrinc: {} };
        },
        GetPermissions: function(form) {
            var retObj = {
                viewDebate: '',
                viewFeedback: '',
                viewRating: '',
                submitFeedback: '',
                submitRating: ''
            };
            
            var i, len;
            for (i = 0, len = form.viewDebate.length; i < len; i++)
                if (form.viewDebate[i].checked) {
                    retObj.viewDebate = form.viewDebate[i].value;
                    break;
                }
    
            for (i = 0, len = form.viewFeedback.length; i < len; i++)
                if (form.viewFeedback[i].checked) {
                    retObj.viewFeedback = form.viewFeedback[i].value;
                    break;
                }
    
            for (i = 0, len = form.viewRating.length; i < len; i++)
                if (form.viewRating[i].checked) {
                    retObj.viewRating = form.viewRating[i].value;
                    break;
                }
    
            for (i = 0, len = form.submitFeedback.length; i < len; i++)
                if (form.submitFeedback[i].checked) {
                    retObj.submitFeedback = form.submitFeedback[i].value;
                    break;
                }
    
            for (i = 0, len = form.submitRating.length; i < len; i++)
                if (form.submitRating[i].checked) {
                    retObj.submitRating = form.submitRating[i].value;
                    break;
                }
    
            return retObj;
        },
        ViewedFeedbackSubm: function(branchIdx, type, argID) {
            // TODO: Need to go through this data as well, make sure it's being reduced appropriately.
            // Not just at the top level, but also at the tree level
            // See sliderRight 547, ActivityPg.ViewedFeedbackSubm, and treeHdlr deletion handlers.
            //User.submArgs.in.allCreateSubms.unviewed --;
        }
    }
})();
var ConnsPg = (function () {

    var connsPgElems = new DynElemCont();
    var followerToCutElem;

    var timelineBatch = 0;

    var currFollowingFilterID, currFollowerFilterID;

    function GetInviteString(inviteNum) {
        if(inviteNum == Consts.inviteResps.ACCEPT) return 'accepted';
        if(inviteNum == Consts.inviteResps.NONE) return 'pending';
        return 'rejected';
    }

    function UpdateFollowingCounts() {
        connsPgElems.hash['FollowingTotalDisp'].DisplayMsg(User.countOthers.following.total);
        connsPgElems.hash['FollowingAccDisp'].DisplayMsg(User.countOthers.following.byType[Consts.inviteResps.ACCEPT]);
        connsPgElems.hash['FollowingPendDisp'].DisplayMsg(User.countOthers.following.byType[Consts.inviteResps.NONE]);
        connsPgElems.hash['FollowingRejDisp'].DisplayMsg(User.countOthers.following.byType[Consts.inviteResps.REJECT]);
    }
    function UpdateFollowerCounts() {
        connsPgElems.hash['FollowerTotalDisp'].DisplayMsg(User.countOthers.followers.total);
        connsPgElems.hash['FollowerAccDisp'].DisplayMsg(User.countOthers.followers.byType[Consts.inviteResps.ACCEPT]);
        connsPgElems.hash['FollowerPendDisp'].DisplayMsg(User.countOthers.followers.byType[Consts.inviteResps.NONE]);
    }

    return {
        Init: function(loginHTMLObj) {
            //* SETUP TABS
            ElemDyns.MakeTabbedBox(connsPgElems, 'ConnsSections', 'connsTab', 'connsPanel', true);
            document.getElementById('TabTimeline').addEventListener('click', function(event) {
                connsPgElems.hash['ConnsSections'].ChangeTab('TabTimeline', 'PanelTimeline');
            });
            document.getElementById('TabFollowing').addEventListener('click', function(event) {
                connsPgElems.hash['ConnsSections'].ChangeTab('TabFollowing', 'PanelFollowing');
            });
            document.getElementById('TabFollowers').addEventListener('click', function(event) {
                connsPgElems.hash['ConnsSections'].ChangeTab('TabFollowers', 'PanelFollowers');
                connsPgElems.hash['NewFollowerNotif'].Hide();
            });
            document.getElementById('TabBlocked').addEventListener('click', function(event) {
                connsPgElems.hash['ConnsSections'].ChangeTab('TabBlocked', 'PanelBlocked');
            });

            ElemDyns.MakeHidable(connsPgElems, 'NewFollowerNotif');

            //* Public Timeline ========================

            if(loginHTMLObj.timelinePublic != '') {
                var timelineElem = document.getElementById('PanelTimeline');

                function LoadConnAvatars() {
                    for(var i = 0; i < timelineElem.children.length; i++) {
                        var imgElem = timelineElem.children[i].getElementsByClassName('userImg')[0];
                        Main.GetImgSrc(imgElem.getAttribute('data-accountID'), imgElem);
                    }
                }

                // Set html string
                timelineElem.innerHTML = loginHTMLObj.timelinePublic;
                // Load avatars //! Definitely causing page to hang momentarily
                // I can maybe do this toward the end if it helps letting everything else load first. :/
                LoadConnAvatars();

                // Set event handler
                timelineElem.addEventListener('click', function(event) {
                    if(Utility.html.CheckClass(event.target, 'timelineLinkBtn'))
                        TreeHdlr.GoTo(event.target.getAttribute('data-treeID'), Number(event.target.getAttribute('data-branchIdx')), event.target.getAttribute('data-isCtrl') === 'true', true);
                    else if(Utility.html.CheckClass(event.target, 'userSearchBtn'))
                        SearchPg.SearchForUser(event.target.value);
                });

                // Tab batch fetching
                document.getElementById('TimePublSel').addEventListener('change', function(event) {
                    if(timelineBatch != event.target.options[event.target.selectedIndex].value) {
                        timelineBatch = event.target.options[event.target.selectedIndex].value;

                        Main.Pause(true);
                        Network.Emit('GetPublTimelineHTMLBatch', {
                            accountID: User.accountData._id,
                            batchNum: timelineBatch
                        });                        
                    }
                });
                Network.CreateResponse('GetPublTimelineHTMLBatchResp', function(resHTML) {
                    timelineElem.innerHTML = resHTML;
                    timelineElem.scrollTop = 0;
                    LoadConnAvatars();
                    Main.UnPause();
                });
            }

            //* Following ========================

            ElemDyns.MakeBillboard(connsPgElems, 'FollowingTotalDisp');
            ElemDyns.MakeBillboard(connsPgElems, 'FollowingAccDisp');
            ElemDyns.MakeBillboard(connsPgElems, 'FollowingPendDisp');
            ElemDyns.MakeBillboard(connsPgElems, 'FollowingRejDisp');
            UpdateFollowingCounts();

            currFollowingFilterID = 'FollowingTotalFilter';

            // BOOKMARK - Filter system to implement on mod invites
            var followingFilterBtns = document.getElementById('FollowingTotalBtns').getElementsByClassName('follFilterBtn');
            document.getElementById('FollowingTotalBtns').addEventListener('click', function(event) {
                if(Utility.html.CheckClass(event.target, 'follFilterBtn')) {
                    // Make-shift tab setup/change active
                    ElemDyns.DownplayUnregisteredColl(followingFilterBtns);
                    ElemDyns.HighlightUnregOne(event.target);

                    InvFilter.ChangeFilterBtn(event.target.id, 'Following', connsPgElems.hash['FollowingList'].GetListItems());
                    currFollowingFilterID = event.target.id;
                }
            });

            ElemDyns.AnimateExtensibility(connsPgElems, 'FollowingList', true);

            // Load avatars
            var children = connsPgElems.hash['FollowingList'].GetListItems();
            for(var i = 0; i < children.length; i++) {
                var imgElem = children[i].getElementsByClassName('userImg')[0];
                Main.GetImgSrc(imgElem.getAttribute('data-accountID'), imgElem);
            }

            if(!User.IsGuestAccount()) {
                document.FollUserForm.AddUserBtn.addEventListener('click', function() {
                    ConnsPg.AddUserToFollow(document.FollUserForm.NameOrEmailField.value);
                });
                Network.CreateResponse('FollowUserResp', function(resObj) { 
                    if (resObj.success) {
                        User.accountData.following.unshift(resObj.inviteeObj);

                        User.countOthers.following.total++;
                        User.countOthers.following.byType[resObj.inviteeObj.invite]++;
                        UpdateFollowingCounts();                    

                        connsPgElems.hash['FollowingList'].Push(true, resObj.htmlString, function() {
                            document.FollUserForm.NameOrEmailField.value = '';

                            InvFilter.ChangeFilterBtn(currFollowingFilterID, 'Following', connsPgElems.hash['FollowingList'].GetListItems());
                            PageHdlr.DisplayMsg('Follow request sent & ' + GetInviteString(resObj.inviteeObj.invite), 3);
                        });
                    }         
                    else
                        PageHdlr.DisplayMsg(resObj.msg, 3);
                });
                connsPgElems.hash['FollowingList'].elem.addEventListener('click', function (event) {
                    if(Utility.html.CheckClass(event.target, 'removeBtn')) {
                        var li = event.target.parentElement.parentElement.parentElement;
                        invStatus = Number(li.getAttribute('data-invite'));
                        // If the invitee already rejected the offer, kill it off right away (This won't have any relevance when cutting followers, as rejected followers will never be listed)
                        if(invStatus == Consts.inviteResps.ACCEPT)
                            if(User.accountData.preferences.confMsgs.stopFollowing) // User preference check
                                if(!confirm('Stop following this user\'s activity?'))
                                    return;

                        connsPgElems.hash['FollowingList'].Pop(li, function(){});
                        Network.Emit('StopFollowing', {
                            followerID: User.accountData._id,
                            followedID: li.getAttribute('data-accountID'),
                            invStatus: invStatus
                        });
                    }
                });
                Network.CreateResponse('StopFollowingResp', function(resObj) {
                    var idx = Utility.gen.ArrIdxByProp(User.accountData.following, 'accountID', resObj.followedID);
                    User.accountData.following.splice(idx, 1);

                    User.countOthers.following.total--;
                    User.countOthers.following.byType[resObj.invStatus]--;
                    UpdateFollowingCounts();

                    if(resObj.invStatus == Consts.inviteResps.ACCEPT) {
                        PageHdlr.DisplayMsg('No longer following user', 3);
                        // TODO: Remove all traces of followed user from activity page
                    }
                });
                Network.CreateResponse('ReceiveFollReqRes', function(resObj) {
                    User.countOthers.following.byType[resObj.invStatus]--;
                    User.countOthers.following.byType[resObj.newStatus]++;
                    UpdateFollowingCounts();

                    var resString = 'rejected',
                    colString = 'colorNeg';
                    if(resObj.newStatus == Consts.inviteResps.ACCEPT) {
                        resString = 'accepted';
                        colString = 'colorPos';
                    }

                    var list = connsPgElems.hash['FollowingList'].GetListItems();
                    for(i = 0, len = list.length; i < len; i++) {
                        if(list[i].getAttribute('data-accountID') == resObj.followedID) {
                            list[i].setAttribute('data-invite', resObj.newStatus);
                            list[i].getElementsByClassName('colorInd')[0].setAttribute('class', 'colorInd ' + colString);
                            break;
                        }
                    }
                    PageHdlr.DisplayMsg('Follow request ' + resString, 2);
                });
            }

            //* Followers ========================

            ElemDyns.MakeBillboard(connsPgElems, 'FollowerTotalDisp');
            ElemDyns.MakeBillboard(connsPgElems, 'FollowerAccDisp');
            ElemDyns.MakeBillboard(connsPgElems, 'FollowerPendDisp');
            UpdateFollowerCounts();

            currFollowerFilterID = 'FollowerTotalFilter';

            var followerFilterBtns = document.getElementById('FollowerTotalBtns').getElementsByClassName('follFilterBtn');
            document.getElementById('FollowerTotalBtns').addEventListener('click', function(event) {
                if(Utility.html.CheckClass(event.target, 'follFilterBtn')) {
                    // Make-shift tab setup/change active
                    ElemDyns.DownplayUnregisteredColl(followerFilterBtns);
                    ElemDyns.HighlightUnregOne(event.target);

                    InvFilter.ChangeFilterBtn(event.target.id, 'Follower', connsPgElems.hash['FollowerList'].GetListItems());
                    currFollowerFilterID = event.target.id;
                }
            });

            ElemDyns.AnimateExtensibility(connsPgElems, 'FollowerList', true);

            // Load avatars
            var children = connsPgElems.hash['FollowerList'].GetListItems();
            for(var i = 0; i < children.length; i++) {
                var imgElem = children[i].getElementsByClassName('userImg')[0];
                Main.GetImgSrc(imgElem.getAttribute('data-accountID'), imgElem);
            }

            document.FollReqOptForm.AutoAccept.addEventListener('click', function(event) { if(event.target.checked) document.FollReqOptForm.AutoReject.checked = false; });
            document.FollReqOptForm.AutoReject.addEventListener('click', function(event) { if(event.target.checked) document.FollReqOptForm.AutoAccept.checked = false; });
            if(!User.IsGuestAccount()) {
                document.FollReqOptForm.SaveBtn.addEventListener('click', function() {
                    Network.Emit('UpdateFollReqAutoOpt', {
                        accountID: User.accountData._id,
                        opt: document.FollReqOptForm.AutoAccept.checked ? Consts.inviteResps.ACCEPT : (document.FollReqOptForm.AutoReject.checked ? Consts.inviteResps.REJECT : Consts.inviteResps.NONE)
                    });
                });
                Network.CreateResponse('UpdateFollReqAutoOptResponse', function(resObj) { 
                    if(resObj.success) {
                        User.accountData.followReqAutoOpt = resObj.opt;
                        PageHdlr.DisplayMsg('Auto response saved', 2);
                    }
                    else
                        PageHdlr.DisplayMsg('No changes made', 2);
                });

                connsPgElems.hash['FollowerList'].elem.addEventListener('click', function (event) {
                    if(Utility.html.CheckClass(event.target, 'acceptBtn')) {
                        var li = event.target.parentElement.parentElement.parentElement;
                        li.setAttribute('data-invite', Consts.inviteResps.ACCEPT);
                        // TODO: Will need to only go to db response if successful
                        event.target.parentElement.removeChild(event.target);
                        Network.Emit('AcceptFollower', {
                            followerID: li.getAttribute('data-accountID'),
                            followedID: User.accountData._id
                        });
                    }
                    else if(Utility.html.CheckClass(event.target, 'removeBtn')) {
                        followerToCutElem = event.target.parentElement.parentElement.parentElement;
                        var invStatus = Number(followerToCutElem.getAttribute('data-invite'));
                        if(invStatus == Consts.inviteResps.ACCEPT)
                            if(User.accountData.preferences.confMsgs.cutFollower) // User preference check
                                if(!confirm('Stop user from following your activity?'))
                                    return;

                        
                        Network.Emit('CutFollower', {
                            followerID: followerToCutElem.getAttribute('data-accountID'),
                            followedID: User.accountData._id,
                            invStatus: invStatus
                        });
                    }
                });
                Network.CreateResponse('AcceptFollResp', function(resObj) {
                    User.countOthers.followers.byType[Consts.inviteResps.NONE]--;
                    User.countOthers.followers.byType[Consts.inviteResps.ACCEPT]++;
                    UpdateFollowerCounts();

                    PageHdlr.DisplayMsg('Follower accepted', 1);
                });
                Network.CreateResponse('CutFollowerResp', function(resObj) {
                    var idx = Utility.gen.ArrIdxByProp(User.accountData.followers, 'accountID', resObj.followerID);
                    User.accountData.followers.splice(idx, 1);

                    User.countOthers.followers.total--;
                    User.countOthers.followers.byType[resObj.invStatus]--;
                    UpdateFollowerCounts();

                    /* Cut html from list. I'm doing this here because 'blockuser' can also yield
                    this response if a user being blocked was also a follower. In that case,
                    the proper element will need to be tracked down. */
                    if(followerToCutElem) {
                        connsPgElems.hash['FollowerList'].Pop(followerToCutElem, function(){});
                        followerToCutElem = null;
                    }
                    else {
                        var list = connsPgElems.hash['FollowerList'].GetListItems();
                        for(var i = 0, len = list.length; i < len; i++) {
                            if(list[i].getAttribute('data-accountID') == resObj.followerID) {
                                connsPgElems.hash['FollowerList'].Pop(list[i], function(){});
                                break;
                            }
                        }
                    }

                    if(resObj.invStatus == Consts.inviteResps.ACCEPT)
                        PageHdlr.DisplayMsg('User no longer following', 3);
                }); 
                Network.CreateResponse('ReceiveFollReq', function(resObj) {
                    User.accountData.followers.unshift(resObj.followerObj);

                    User.countOthers.followers.total++;
                    User.countOthers.followers.byType[resObj.followerObj.invite]++;
                    UpdateFollowerCounts();

                    // ? New follower must be not-yet-accepted to throw notification?
                    //if(resObj.followerObj.invite == Consts.inviteResps.NONE) {
                        if(!connsPgElems.hash['ConnsSections'].CheckTabActive('TabFollowers'))
                            connsPgElems.hash['NewFollowerNotif'].Show();
                        if(PageHdlr.state != pageStates.CONNS)
                            Header.IndConnsNotif(true);
                    //}

                    connsPgElems.hash['FollowerList'].Push(true, resObj.htmlString, function() {
                        InvFilter.ChangeFilterBtn(currFollowerFilterID, 'Follower', connsPgElems.hash['FollowerList'].GetListItems());
                        PageHdlr.DisplayMsg('New follower: ' + resObj.followerObj.username + ', status: ' + GetInviteString(resObj.followerObj.invite), 3);
                        
                    });
                });
                Network.CreateResponse('ReceiveFollowerCut', function(resObj) {
                    var idx = Utility.gen.ArrIdxByProp(User.accountData.followers, 'accountID', resObj.followerID);
                    User.accountData.followers.splice(idx, 1);

                    User.countOthers.followers.total--;
                    User.countOthers.followers.byType[resObj.invStatus]--;
                    UpdateFollowerCounts();

                    var list = connsPgElems.hash['FollowerList'].GetListItems();
                    for(i = 0, len = list.length; i < len; i++) {
                        if(list[i].getAttribute('data-accountID') == resObj.followerID) {
                            connsPgElems.hash['FollowerList'].Pop(list[i], function(){});
                            break;
                        }
                    }
                });
            }

            //* Blocking ========================

            ElemDyns.MakeBillboard(connsPgElems, 'BlockedTotalDisp');

            ElemDyns.AnimateExtensibility(connsPgElems, 'BlockList', true);

            // Load avatars
            var children = connsPgElems.hash['BlockList'].GetListItems();
            for(var i = 0; i < children.length; i++) {
                var imgElem = children[i].getElementsByClassName('userImg')[0];
                Main.GetImgSrc(imgElem.getAttribute('data-accountID'), imgElem);
            }

            if(!User.IsGuestAccount()) {
                document.BlockForm.AddUserBtn.addEventListener('click', function() {
                    ConnsPg.AddUserToBlock(document.BlockForm.NameOrEmailField.value);
                });
                Network.CreateResponse('BlockUserResp', function(resObj) { 
                    if (resObj.success) {
                        User.accountData.blocking.unshift(resObj.blockObj);
                        connsPgElems.hash['BlockedTotalDisp'].DisplayMsg(User.accountData.blocking.length);

                        connsPgElems.hash['BlockList'].Push(true, resObj.htmlString, function() {
                            document.BlockForm.NameOrEmailField.value = '';
                            PageHdlr.DisplayMsg('' + resObj.blockObj.username + ' is blocked from viewing your history and created debates.' , 3);
                        });
                    }         
                    else
                        PageHdlr.DisplayMsg(resObj.msg, 3);
                });
                connsPgElems.hash['BlockList'].elem.addEventListener('click', function (event) {
                    if(Utility.html.CheckClass(event.target, 'removeBtn')) {
                        var li = event.target.parentElement;

                        // TODO: Update confirm message preferences to reflect this and follow checks
                        if(User.accountData.preferences.confMsgs.unblock) // User preference check
                            if(!confirm('Unblock this user?'))
                                return;

                        connsPgElems.hash['BlockList'].Pop(li, function(){});
                        Network.Emit('RemoveBlock', {
                            blockerID: User.accountData._id,
                            blockedID: li.getAttribute('data-accountID'),
                        });
                    }
                });
                Network.CreateResponse('RemoveBlockResp', function(resObj) {
                    var idx = Utility.gen.ArrIdxByProp(User.accountData.blocking, 'accountID', resObj.blockedID);
                    User.accountData.blocking.splice(idx, 1);
                    connsPgElems.hash['BlockedTotalDisp'].DisplayMsg(User.accountData.blocking.length);
                    PageHdlr.DisplayMsg('User no longer blocked', 2);
                });
            }
        },
        AddUserToFollow: function(followedUsername) {
            if(!User.IsGuestAccount()) {
                if(followedUsername == '' || User.CheckActive(followedUsername)) {
                    PageHdlr.DisplayMsg('Invalid submission', 2);
                    return;
                }
                Network.Emit('FollowUser', { 
                    accountID: User.accountData._id, 
                    myName: User.accountData.username, 
                    nameOrEmail: followedUsername
                });
            }
        },
        AddUserToBlock: function(blockedUsername) {
            if(!User.IsGuestAccount()) {
                if(blockedUsername == '' || User.CheckActive(blockedUsername)) {
                    PageHdlr.DisplayMsg('Invalid submission', 2);
                    return;
                }
                Network.Emit('BlockUser', { 
                    accountID: User.accountData._id, 
                    nameOrEmail: blockedUsername
                });
            }
        }
    }
})();
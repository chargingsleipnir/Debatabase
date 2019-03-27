var SliderLeft = (function () {

    var sideBarScrollElem;
    var tagElem = null;
    var fullyOpen = false;

    var modListEmpty = false;

    var sliderLeftElems = new DynElemCont();

    var modColourList = {};

    /*======================== PERMISSIONS WINDOW ========================*/

    var classFields = {
        guestInputElem: null,
        modInputElem: null
    };

    var currModFilterID;
    var currGuestFilterID;

    // ? Have to check that it's fullOpen? Can close while part way without incident, no?
    function Open() {
        if(!sliderLeftElems.hash['SliderLeft'].animPos) {
            CssTransMngr.AddToQueue('SliderLeft', sliderLeftElems.hash['SliderLeft'].AnimatePos);
            CssTransMngr.LaunchQueue();
        }
    }
    function Close() {
        if(sliderLeftElems.hash['SliderLeft'].animPos) {
            CssTransMngr.LaunchQueue();
        }
    }

    function SetPermissions(permSrc, changeActive) { 
        
        var i, len;
        if(changeActive) {
            for (i = 0, len = document.permissionForm.viewDebate.length; i < len; i++) {
                if(document.permissionForm.viewDebate[i].value == permSrc.viewDebate) {
                    document.permissionForm.viewDebate[i].checked = true;
                    Utility.html.ChangeClass(document.permissionForm.viewDebate[i], 'activeFalse', 'activeTrue');
                }
                else {
                    document.permissionForm.viewDebate[i].checked = false;
                    Utility.html.ChangeClass(document.permissionForm.viewDebate[i], 'activeTrue', 'activeFalse');
                }
            }
            for (i = 0, len = document.permissionForm.viewFeedback.length; i < len; i++) {
                if(document.permissionForm.viewFeedback[i].value == permSrc.viewFeedback) {
                    document.permissionForm.viewFeedback[i].checked = true;
                    Utility.html.ChangeClass(document.permissionForm.viewFeedback[i], 'activeFalse', 'activeTrue');
                }
                else {
                    document.permissionForm.viewFeedback[i].checked = false;
                    Utility.html.ChangeClass(document.permissionForm.viewFeedback[i], 'activeTrue', 'activeFalse');
                }
            }
            for (i = 0, len = document.permissionForm.viewRating.length; i < len; i++) {
                if(document.permissionForm.viewRating[i].value == permSrc.viewRating) {
                    document.permissionForm.viewRating[i].checked = true;
                    Utility.html.ChangeClass(document.permissionForm.viewRating[i], 'activeFalse', 'activeTrue');
                }
                else {
                    document.permissionForm.viewRating[i].checked = false;
                    Utility.html.ChangeClass(document.permissionForm.viewRating[i], 'activeTrue', 'activeFalse');
                }
            }
            for (i = 0, len = document.permissionForm.submitFeedback.length; i < len; i++) {
                if(document.permissionForm.submitFeedback[i].value == permSrc.submitFeedback) {
                    document.permissionForm.submitFeedback[i].checked = true;
                    Utility.html.ChangeClass(document.permissionForm.submitFeedback[i], 'activeFalse', 'activeTrue');
                }
                else {
                    document.permissionForm.submitFeedback[i].checked = false;
                    Utility.html.ChangeClass(document.permissionForm.submitFeedback[i], 'activeTrue', 'activeFalse');
                }
            }
            for (i = 0, len = document.permissionForm.submitRating.length; i < len; i++) {
                if(document.permissionForm.submitRating[i].value == permSrc.submitRating) {
                    document.permissionForm.submitRating[i].checked = true;
                    Utility.html.ChangeClass(document.permissionForm.submitRating[i], 'activeFalse', 'activeTrue');
                }
                else {
                    document.permissionForm.submitRating[i].checked = false;
                    Utility.html.ChangeClass(document.permissionForm.submitRating[i], 'activeTrue', 'activeFalse');
                }
            }
        }
        else {
            for (i = 0, len = document.permissionForm.viewDebate.length; i < len; i++)
                document.permissionForm.viewDebate[i].checked = (document.permissionForm.viewDebate[i].value == permSrc.viewDebate);
            for (i = 0, len = document.permissionForm.viewFeedback.length; i < len; i++)
                document.permissionForm.viewFeedback[i].checked = (document.permissionForm.viewFeedback[i].value == permSrc.viewFeedback);
            for (i = 0, len = document.permissionForm.viewRating.length; i < len; i++)
                document.permissionForm.viewRating[i].checked = (document.permissionForm.viewRating[i].value == permSrc.viewRating);
            for (i = 0, len = document.permissionForm.submitFeedback.length; i < len; i++)
                document.permissionForm.submitFeedback[i].checked = (document.permissionForm.submitFeedback[i].value == permSrc.submitFeedback);
            for (i = 0, len = document.permissionForm.submitRating.length; i < len; i++)
                document.permissionForm.submitRating[i].checked = (document.permissionForm.submitRating[i].value == permSrc.submitRating);
        }
    }

    function ReceiveInvRespCB(listID, treeListKey) {
        return function(resObj) {
            // Make sure the given tree is even active. The admin could be logged in but not have the tree available to warrant this.
            if(TreeHdlr.active.data) {
                if(TreeHdlr.active.data._id == resObj.treeID) {
                    // Change local data - should be the same in js and html, but cannot be certain
                    var list = TreeHdlr.active.data.permissions[treeListKey];
                    for(i = 0, len = list.length; i < len; i++) {
                        if(list[i].accountID == resObj.accountID) {
                            list[i].invite = resObj.responsePos ? Consts.inviteResps.ACCEPT : Consts.inviteResps.REJECT;
                            break;
                        }
                    }

                    list = sliderLeftElems.hash[listID].GetListItems();
                    for(i = 0, len = list.length; i < len; i++) {
                        if(list[i].getAttribute('data-accountID') == resObj.accountID) {
                            if(resObj.responsePos) {
                                list[i].setAttribute('data-invite', Consts.inviteResps.ACCEPT);
                                list[i].getElementsByClassName('colorInd')[0].setAttribute('class', 'colorInd colorPos');
                            }
                            else {
                                list[i].setAttribute('data-invite', Consts.inviteResps.REJECT);
                                list[i].getElementsByClassName('colorInd')[0].setAttribute('class', 'colorInd colorNeg');
                            }
                            break;
                        }
                    }

                    if(treeListKey == 'moderators') {
                        InvFilter.ChangeFilterBtn(currModFilterID, 'Mod', sliderLeftElems.hash['ModeratorList'].GetListItems());
                        UpdateInviteCounts('moderators', 'Mod');
                    }
                    else {
                        InvFilter.ChangeFilterBtn(currGuestFilterID, 'Guest', sliderLeftElems.hash['TreeGuestList'].GetListItems());
                        UpdateInviteCounts('guests', 'Guest');
                    }
                }
            }
        };
    }
    function RescindInvite(liElem, socketCallString) {
        // If the invitee already rejected the offer, kill it off right away, otherwise...
        var invType = Number(liElem.getAttribute('data-invite'));
        if(invType != Consts.inviteResps.REJECT)
            if(User.accountData.preferences.confMsgs.rescindInv) // User preference check
                if(!confirm('Rescind Invitation?'))
                    return;

        // TODO: Move this to response call? In case it fails here.
        sliderLeftElems.hash[liElem.parentElement.id].Pop(liElem, function(){});
        Network.Emit(socketCallString, { treeID: TreeHdlr.active.data._id, accountID: liElem.getAttribute('data-accountID'), invType: invType});
    }

    function BranchListFilterOff() {
        sliderLeftElems.hash['SBTreeCtrl_UnviewedTotal'].DisplayMsg('');
        document.BranchListFilterForm.NewFeedback.checked = false;
        document.BranchListFilterForm.NewFeedback.setAttribute('disabled', '');
        NewMailFilter(sliderLeftElems.hash['BranchList'].elem, false);
    }
    function ApplyBranchListFilter() {
        document.BranchListFilterForm.NewFeedback.checked = true;
        NewMailFilter(sliderLeftElems.hash['BranchList'].elem, true);
    }

    //* This function operators at the TREE level (the tab on the left side)
    function UpdateArgSubmDispTreeLevel() {
        // Using the function that replaces innerHTML so I can add entities
        sliderLeftElems.hash['SBTreeCtrl_FeedbackTotal'].NewInnards('&nbsp;' + TreeHdlr.active.submArgsAct.total);
            
        // Display new unviewed amount, but if there's none, shut down buttons and disable 'new mail' filter
        if(User.perms.isMod) {
            var unviewedByTree = TreeHdlr.active.submArgsAct.unviewed;
            if(unviewedByTree > 0) {
                document.BranchListFilterForm.NewFeedback.removeAttribute('disabled');
                sliderLeftElems.hash['SBTreeCtrl_UnviewedTotal'].DisplayMsg(' (' + unviewedByTree + ')');
            }
            else {
                BranchListFilterOff();
            }
        }
    }

    // TODO: Get this & similar functions to use ids instead of usernames
    function DetailsModUpdate(usernames, active) {
        var ul;
        if(ul = sliderLeftElems.hash['ModeratorList'].elem) {
            var list = ul.children;
            for(var i = 0, len = list.length; i < len; i++) {
                for(var j = 0, jLen = usernames.length; j < jLen; j++) {
                    if(list[i].getAttribute('data-username') == usernames[j]) {
                        // ! Error here when receiving accepted mod request - elem is undefined (doesn't have online indicator yet - replace element with new one?)
                        var colIndElem = list[i].getElementsByClassName('onlineInd')[0];
                        if(active) Utility.html.ChangeClass(colIndElem, 'colorActiveFalse', 'colorActiveTrue');
                        else Utility.html.ChangeClass(colIndElem, 'colorActiveTrue', 'colorActiveFalse');
                        break;
                    }
                }
            }
        }
    }

    function ClearMsgBoard() {
        modColourList = {};
        sliderLeftElems.hash['ModChatDisp'].ClearInnards();
    }
    function ReplaceMsgBoard(chatArr) {
        modColourList = {};
        sliderLeftElems.hash['ModChatDisp'].ClearInnards();
        for(var i = 0; i < chatArr.length; i++) {
            // Trip from server to client turns timeStamp into a string, so it needs to be re-converted
            chatArr[i].timeStamp = SuppFuncs.FormatDate(new Date(chatArr[i].timeStamp));
            sliderLeftElems.hash['ModChatDisp'].AddHTMLNode(TemplateHdlr.GetModMsg(chatArr[i], chatArr[i].username == User.accountData.username));
        }
        sliderLeftElems.hash['ModChatDisp'].elem.scrollTop = sliderLeftElems.hash['ModChatDisp'].elem.scrollHeight; 
    }
    function GoToModChat() {
        sliderLeftElems.hash['TreeDetailSections'].ChangeTab('TabModDets', 'ModListPanel');
        //* Delay necessary - animation will not happen is panel still detected as display:none
        Open();
        //? setTimeout(Open, 333);      
    }

    // TODO: Move to Utility if it needs wider usage
    // TODO: Possibly subject these numbers to greater variability.
    function RandRGBObj() {
        return {
            r: Utility.math.GetRandInt(50, 255),
            g: Utility.math.GetRandInt(50, 255),
            b: Utility.math.GetRandInt(50, 255)
        };
    }

    function UpdateInviteCounts(permGroupString, dispIdPrefix) {
        if(TreeHdlr.active.data) {
            var group = TreeHdlr.active.data.permissions[permGroupString];
            var numAcc = 0, numPend = 0, numRej = 0;
            for(var i = 0, len = group.length; i < len; i++) {
                if(group[i].invite == Consts.inviteResps.ACCEPT)
                    numAcc++;
                else if(group[i].invite == Consts.inviteResps.NONE)
                    numPend++;
                else if(group[i].invite == Consts.inviteResps.REJECT)
                    numRej++;
            }

            sliderLeftElems.hash[dispIdPrefix + 'TotalDisp'].DisplayMsg(group.length);
            sliderLeftElems.hash[dispIdPrefix + 'AccDisp'].DisplayMsg(numAcc);
            sliderLeftElems.hash[dispIdPrefix + 'PendDisp'].DisplayMsg(numPend);
            sliderLeftElems.hash[dispIdPrefix + 'RejDisp'].DisplayMsg(numRej);
        }
    }

    return {
        Init: function(loggedIn) {

            // Make slider work
            // BOOKMARK
            sideBarScrollElem = document.getElementById('SliderLeft');
            ElemDyns.MakeTransitional(sliderLeftElems, 'SliderLeft', function(event, animPos) {
                fullyOpen = animPos;
                if(event.propertyName == 'transform') {
                    if(fullyOpen) {
                        CssTransMngr.AddToQueue('SliderLeft', sliderLeftElems.hash['SliderLeft'].AnimateNeg);
                        Header.IndicateModMsg(false);
                    }
                }
            });
            document.getElementById('DetailsBtn').addEventListener('click', Open);
            document.getElementById('SliderLeftCloseBtn').addEventListener('click', function() {
                Close();
            });
            // Instantiate tabs
            ElemDyns.MakeTabbedBox(sliderLeftElems, 'TreeDetailSections', 'treeDetTab', 'treeDetPanel', true);
            document.getElementById('TabModDets').addEventListener('click', function(event) {
                sliderLeftElems.hash['TreeDetailSections'].ChangeTab('TabModDets', 'ModListPanel');
            });
            if(document.getElementById('TabPerms')) {
                document.getElementById('TabPerms').addEventListener('click', function(event) {
                    sliderLeftElems.hash['TreeDetailSections'].ChangeTab('TabPerms', 'TreePerms');
                }); 
            }           
            document.getElementById('TabTags').addEventListener('click', function(event) {
                sliderLeftElems.hash['TreeDetailSections'].ChangeTab('TabTags', 'TagListPanel');
            });
            document.getElementById('TabArgs').addEventListener('click', function(event) {
                sliderLeftElems.hash['TreeDetailSections'].ChangeTab('TabArgs', 'BranchListPanel');
            });

            /*======================== HEADER ========================*/
            ElemDyns.MakeBillboard(sliderLeftElems, 'TreeTitle');
            ElemDyns.MakeBillboard(sliderLeftElems, 'DateTreeCreated');
            ElemDyns.MakeBillboard(sliderLeftElems, 'DateTreeArchived');
            // V+ ElemDyns.MakeHidable(sliderLeftElems, 'ArchivedInd');

            /*======================== MOD PANEL ========================*/
            ElemDyns.MakeHidable(sliderLeftElems, 'ModAdminCtrls');
            ElemDyns.GiveCssSwitch(sliderLeftElems, 'ModListPanel', false);
            ElemDyns.AnimateExtensibility(sliderLeftElems, 'ModeratorList', true);  
            
            // Filter buttons
            ElemDyns.MakeBillboard(sliderLeftElems, 'ModTotalDisp');
            ElemDyns.MakeBillboard(sliderLeftElems, 'ModAccDisp');
            ElemDyns.MakeBillboard(sliderLeftElems, 'ModPendDisp');
            ElemDyns.MakeBillboard(sliderLeftElems, 'ModRejDisp');

            if(User.perms.isAdmin)
                UpdateInviteCounts('moderators', 'Mod');

            currModFilterID = 'ModTotalFilter';

            var modFilterBtns = document.getElementById('ModTotalBtns').getElementsByClassName('modFilterBtn');
            document.getElementById('ModTotalBtns').addEventListener('click', function(event) {
                if(Utility.html.CheckClass(event.target, 'modFilterBtn')) {
                    // Make-shift tab setup/change active
                    ElemDyns.DownplayUnregisteredColl(modFilterBtns);
                    ElemDyns.HighlightUnregOne(event.target);

                    InvFilter.ChangeFilterBtn(event.target.id, 'Mod', sliderLeftElems.hash['ModeratorList'].GetListItems());
                    currModFilterID = event.target.id;
                }
            });

            sliderLeftElems.hash['ModeratorList'].elem.addEventListener('click', function (event) {
                if(Utility.html.CheckClass(event.target, 'userSearchBtn'))
                    SearchPg.SearchForUser(event.target.value);
                if(!User.IsGuestAccount()) {
                    if(Utility.html.CheckClass(event.target, 'userFollowBtn'))
                        ConnsPg.AddUserToFollow(event.target.parentElement.getAttribute('data-username'));
                    else if(Utility.html.CheckClass(event.target, 'userBlockBtn'))
                        ConnsPg.AddUserToBlock(event.target.parentElement.getAttribute('data-username'));
                    else if(Utility.html.CheckClass(event.target, 'removeBtn'))
                        RescindInvite(event.target.parentElement.parentElement.parentElement, 'CutModerator');
                }
            });
            Network.CreateResponse('ModStatusChangeReceive', function(data) {
                // This function should only launch for mods/admin viewing this debate, but as a safety measure...
                if(data.treeID != TreeHdlr.active.data._id)
                    return;

                var ul;
                if(ul = sliderLeftElems.hash['ModeratorList'].elem) {
                    if(data.responsePos) {                        
                        if(User.perms.isAdmin) {
                            var list = ul.children;
                            for(var i = 0, len = list.length; i < len; i++) {
                                if(list[i].getAttribute('data-username') == data.username) {
                                    ElemDyns.ShowUnregOne(list[i].getElementsByClassName('onlineInd')[0]);
                                    break;
                                }
                            }
                        }
                        else if(User.perms.isMod) {
                            // Add html li to mod list
                            var newModString = TemplateHdlr.EJS_GetUserLI(
                                [{
                                    invite: Consts.inviteResps.ACCEPT,
                                    accountID: data.accountID,
                                    username: data.username,
                                    bio: data.bio
                                }],
                                true, true, false, false, false, false
                            );

                            // TODO: Add this to the list in transitioned manner, as list is set up to do.
                            if(modListEmpty)
                                ul.innerHTML = '';
                            ul.innerHTML += newModString;
                        }                        
                    }
                    else {
                        var list = ul.children;
                        for(var i = 0, len = list.length; i < len; i++) {
                            if(list[i].getAttribute('data-username') == data.username) {
                                if(User.perms.isAdmin) {
                                    ElemDyns.HideUnregOne(list[i].getElementsByClassName('onlineInd')[0]);
                                }
                                else if(User.perms.isMod) {
                                    ul.removeChild(list[i]);
                                    if(ul.children.length == 0 && !User.perms.isAdmin) {
                                        ul.innerHTML = '<li>None</li>';
                                        modListEmpty = true;
                                    }
                                }                                
                                break;
                            }
                        }
                    }
                }
            });

            Network.CreateResponse('ModRoomChangeReceive', function(data) {
                DetailsModUpdate([data.username], data.active);
            });
            // Adjust indicator for everyone already in room
            Network.CreateResponse('ModRoomGetStarters', function(data) {
                DetailsModUpdate(data.usernames, true);
            });

            // Mod chat
            ElemDyns.MakeHidable(sliderLeftElems, 'ModChatBox');
            ElemDyns.MakeDynamic(sliderLeftElems, 'ModChatDisp');
            if(!User.IsGuestAccount()) {
                document.ModChatForm.ModChatSendBtn.addEventListener('click', function(event) {
                    if(TreeHdlr.active.data._id) {
                        if(document.ModChatForm.ModChatInputField.value == '')
                            return;

                        sliderLeftElems.hash['ModChatDisp'].AddHTMLNode(TemplateHdlr.GetModMsg({
                            'username': User.accountData.username,
                            'timeStamp': SuppFuncs.FormatDate(new Date()),
                            'msg': document.ModChatForm.ModChatInputField.value
                        }, true));
                        sliderLeftElems.hash['ModChatDisp'].elem.scrollTop = sliderLeftElems.hash['ModChatDisp'].elem.scrollHeight;
                        
                        Network.Emit('ModChatSend', {
                            // Perfect room name - will always be available by only the mods
                            room: TreeHdlr.active.data._id,
                            msgObj: {
                                username: User.accountData.username,
                                msg: document.ModChatForm.ModChatInputField.value
                            }
                        });
                        document.ModChatForm.ModChatInputField.value = '';
                    }
                    else
                        PageHdlr.DisplayMsg('Nobody\'s listening');
                });
                Network.CreateResponse('ModChatReceive', function(msgObj) {
                    msgObj.timeStamp = SuppFuncs.FormatDate(new Date(msgObj.timeStamp));
                    sliderLeftElems.hash['ModChatDisp'].AddHTMLNode(TemplateHdlr.GetModMsg(msgObj, false));
                    sliderLeftElems.hash['ModChatDisp'].elem.scrollTop = sliderLeftElems.hash['ModChatDisp'].elem.scrollHeight;

                    if(PageHdlr.state != pageStates.TREE || !sliderLeftElems.hash['SliderLeft'].animPos) {
                        Header.IndicateModMsg(true);
                    }
                });
            }

            /*======================== PERMISSIONS WINDOW ========================*/

            if(loggedIn) {
                // TODO: Make disable/enablable ElemDyns.MakeHidable(sliderLeftElems, 'TabPerms');

                if(!User.IsGuestAccount()) {
                    Network.CreateResponse('UpdatePermissions', function(resObj) {
                        PageHdlr.DisplayMsg(resObj.msg, 3);
                        if (resObj.success && TreeHdlr.active.data) {
                            TreeHdlr.active.data.permissions.viewDebate = resObj.perms.viewDebate;
                            TreeHdlr.active.data.permissions.viewFeedback = resObj.perms.viewFeedback;
                            TreeHdlr.active.data.permissions.viewRating = resObj.perms.viewRating;
                            TreeHdlr.active.data.permissions.submitFeedback = resObj.perms.submitFeedback;
                            TreeHdlr.active.data.permissions.submitRating = resObj.perms.submitRating;
                            SetPermissions(TreeHdlr.active.data.permissions, true);
                        }
                    });
                    document.getElementById('UpdatePermsBtn').addEventListener('click', function() {
                        if(User.perms.isAdmin) {
                            Network.Emit('SetPermissions', {
                                treeID: TreeHdlr.active.data._id,
                                perms: User.GetPermissions(document.permissionForm)
                            });
                        }
                    });

                    document.getElementById('SaveDefaultPermsBtn').addEventListener('click', function() {
                        if(User.perms.isAdmin) {
                            Network.Emit('SetPermDefaults', {
                                accountID: User.accountData._id,
                                perms: User.GetPermissions(document.permissionForm)
                            });
                        }
                    });
                }
                document.getElementById('ApplyDefaultPermsBtn').addEventListener('click', function() {
                    SetPermissions(User.accountData.permissions, false);
                });

                // Guest filters
                ElemDyns.MakeBillboard(sliderLeftElems, 'GuestTotalDisp');
                ElemDyns.MakeBillboard(sliderLeftElems, 'GuestAccDisp');
                ElemDyns.MakeBillboard(sliderLeftElems, 'GuestPendDisp');
                ElemDyns.MakeBillboard(sliderLeftElems, 'GuestRejDisp');

                if(User.perms.isAdmin)
                    UpdateInviteCounts('guests', 'Guest');

                currGuestFilterID = 'GuestTotalFilter';

                var guestFilterBtns = document.getElementById('GuestTotalBtns').getElementsByClassName('guestFilterBtn');
                document.getElementById('GuestTotalBtns').addEventListener('click', function(event) {
                    if(Utility.html.CheckClass(event.target, 'guestFilterBtn')) {
                        // Make-shift tab setup/change active
                        ElemDyns.DownplayUnregisteredColl(guestFilterBtns);
                        ElemDyns.HighlightUnregOne(event.target);

                        InvFilter.ChangeFilterBtn(event.target.id, 'Guest', sliderLeftElems.hash['TreeGuestList'].GetListItems());
                        currGuestFilterID = event.target.id;
                    }
                });
    
                ElemDyns.AnimateExtensibility(sliderLeftElems, 'TreeGuestList', true);

                if(!User.IsGuestAccount()) {
                    sliderLeftElems.hash['TreeGuestList'].elem.addEventListener('click', function (event) {
                        if(Utility.html.CheckClass(event.target, 'removeBtn'))
                            RescindInvite(event.target.parentElement.parentElement.parentElement, 'CutGuest');
                    });
                }
    
                function AddUserAttempt(value, emitString) {
                    if(value == '' || User.CheckActive(value)) {
                        PageHdlr.DisplayMsg('Invalid submission', 3);
                        return;
                    }
                    Network.Emit(emitString, { treeID: TreeHdlr.active.data._id, nameOrEmail: value });
                }
                classFields.guestInputElem = document.getElementById('GuestField');
                classFields.modInputElem = document.getElementById('ModeratorField');

                if(!User.IsGuestAccount()) {
                    document.getElementById('AddGuestBtn').addEventListener('click', function() { AddUserAttempt(classFields.guestInputElem.value, 'AddGuest'); });
                    document.getElementById('AddModBtn').addEventListener('click', function() { AddUserAttempt(classFields.modInputElem.value, 'AddMod'); });
                }

                // TODO: This will be gone with new update system that suits many mods looking at same tree
                function AddUser(resObj, modAdded, dataKey, listID, inputID) {
                    if(resObj.success) {
                        TreeHdlr.active.data.permissions[dataKey].push(resObj.dataObj);

                        var userElem = Utility.html.FromString(resObj.htmlString, false);
                        // Get user avatar
                        var imgElem = userElem.getElementsByClassName('userImg')[0];
                        Main.GetImgSrc(imgElem.getAttribute('data-accountID'), imgElem);

                        sliderLeftElems.hash[listID].Push(true, userElem, function() {
                            classFields[inputID].value = '';
                            PageHdlr.DisplayMsg('Invitation sent', 3);
                            if(modAdded) {
                                // After adding item, re-apply the current filter, incase it needs to be filtered out.
                                // TODO: This works well enough (Item transitions in and then disappears/filters out). Would be better if it added to the list without being seen though.
                                InvFilter.ChangeFilterBtn(currModFilterID, 'Mod', sliderLeftElems.hash['ModeratorList'].GetListItems());
                                UpdateInviteCounts('moderators', 'Mod');
                            }
                            else {
                                InvFilter.ChangeFilterBtn(currGuestFilterID, 'Guest', sliderLeftElems.hash['TreeGuestList'].GetListItems());
                                UpdateInviteCounts('guests', 'Guest');
                            }
                        });
                    }
                    else
                        PageHdlr.DisplayMsg(resObj.msg, 3);
                }
                Network.CreateResponse('AddGuestResponse', function(resObj) { AddUser(resObj, false, 'guests', 'TreeGuestList', 'guestInputElem'); });
                Network.CreateResponse('AddModResponse', function(resObj) { AddUser(resObj, true, 'moderators', 'ModeratorList', 'modInputElem'); });
                Network.CreateResponse('CutUserResp', function(resObj) {
                    if(resObj.success) {
                        // Remove data locally
                        var list = TreeHdlr.active.data.permissions[resObj.treeListName];
                        for(var i = 0; i < list.length; i++) {
                            if(list[i].accountID == resObj.accountID) {
                                list.splice(i, 1);
                                if(resObj.treeListName == 'moderators') {
                                    // No real reason to re-apply filter when eliminating someone
                                    UpdateInviteCounts('moderators', 'Mod');
                                }
                                else {
                                    // TODO: Same filter system for guests
                                    UpdateInviteCounts('guests', 'Guest');
                                }
                                break;
                            }
                        }

                        if(resObj.invType != Consts.inviteResps.REJECT)
                            PageHdlr.DisplayMsg('Invitation rescinded.', 3);
                    }
                    else PageHdlr.DisplayMsg("Failed to rescind invitation. Site creator has been notified. :/", 3);
                });

                Network.CreateResponse('ReceiveGuestInvResp', ReceiveInvRespCB('TreeGuestList', 'guests'));
                Network.CreateResponse('ReceiveModInvResp', ReceiveInvRespCB('ModeratorList', 'moderators'));
            }

            /*======================== TAG PANEL ========================*/
            ElemDyns.MakeHidable(sliderLeftElems, 'TagForm');
            ElemDyns.AnimateExtensibility(sliderLeftElems, 'TagList', true);

            if(!User.IsGuestAccount()) {
                document.TagForm.AddBtn.addEventListener('click', function(event) {
                    // Check current tags to avoid duplicates. (local tree data)
                    for(var i = 0, len = TreeHdlr.active.data.tags.length; i < len; i++) {
                        if(document.TagForm.InputElem.value == TreeHdlr.active.data.tags[i]) {
                            PageHdlr.DisplayMsg('Already tagged', 2);
                            return;
                        }
                    }
                    // Add to tree in dbhdlr
                    Network.Emit('AddTag', {
                        treeID: TreeHdlr.active.data._id,
                        isCtrl: TreeHdlr.active.isControlled,
                        tag: document.TagForm.InputElem.value
                    });
                });
                Network.CreateResponse('AddTagResp', function(resObj) {
                    if(resObj.tagAdded) {
                        sliderLeftElems.hash['TagList'].Push(true, resObj.htmlString, function() {});
                        TreeHdlr.active.data.tags.unshift(resObj.tag);
                        document.TagForm.InputElem.value = '';
                    }
                });
                Network.CreateResponse('RemoveTagResp', function(resObj) {
                    if(resObj.tagRemoved && tagElem) {
                        sliderLeftElems.hash['TagList'].Pop(tagElem, function(listLen) {});
                        TreeHdlr.active.data.tags.splice(TreeHdlr.active.data.tags.indexOf(resObj.tag), 1);
                    }
                });
            }
            sliderLeftElems.hash['TagList'].elem.addEventListener('click', function(event) {
                if(Utility.html.CheckClass(event.target, 'searchTagBtn')) {
                    // Check the "search tags" checkbox
                    document.SearchBar.Method[Consts.searchTypes.TAG].checked = true;
                    Close();
                    // Run a db search for the tag (min 1 result will be found, obviously)
                    Network.Emit('SearchTerm', {
                        loggedIn: User.loggedIn,
                        text: event.target.value,
                        type: Consts.searchTypes.TAG
                    });
                }
                if(!User.IsGuestAccount()) {
                    if(Utility.html.CheckClass(event.target, 'removeBtn')) {
                        tagElem = event.target.parentElement;
                        Network.Emit('RemoveTag', {
                            treeID: TreeHdlr.active.data._id,
                            isCtrl: TreeHdlr.active.isControlled,
                            tag: event.target.getAttribute('data-tag')
                        });
                    }
                }
            });

            /*======================== BRANCHES TAB/PANEL ========================*/
            ElemDyns.MakeHidable(sliderLeftElems, 'SBTreeCtrl_FeedbackByTree');
            ElemDyns.MakeDynamic(sliderLeftElems, 'SBTreeCtrl_FeedbackTotal');            
            ElemDyns.MakeBillboard(sliderLeftElems, 'SBTreeCtrl_UnviewedTotal');
            ElemDyns.MakeDynamic(sliderLeftElems, 'BranchList');
            // New/unviewed submission indicator
            sliderLeftElems.hash['SBTreeCtrl_UnviewedTotal'].elem.addEventListener('click', ApplyBranchListFilter);

            ElemDyns.MakeHidable(sliderLeftElems, 'BranchListFilterForm');
            document.BranchListFilterForm.NewFeedback.addEventListener('click', function(event) { NewMailFilter(sliderLeftElems.hash['BranchList'].elem, event.target.checked); });
            
            sliderLeftElems.hash['BranchList'].elem.addEventListener('click', function(event) {
                if(Utility.html.CheckClass(event.target, 'branchListLinkBtn')) {
                    function KillDuration() { 
                        CssTransMngr.RemoveFromQueue('SliderLeft');
                        sliderLeftElems.hash['SliderLeft'].SetDuration();
                    }
                    TreeHdlr.ClimbTree(Number(event.target.getAttribute('data-branchIdx')), KillDuration, null, sliderLeftElems.hash['SliderLeft'].AnimateNeg, null, null, sliderLeftElems.hash['SliderLeft'].RestoreDuration);
                }
                else if(Utility.html.CheckClass(event.target, 'branchListScrollBtn')) {
                    var topPos = document.getElementById(event.target.getAttribute('data-branchListID')).offsetTop;
                    sideBarScrollElem.scrollTop = topPos - 10;
                }
                else if(Utility.html.CheckClass(event.target, 'branchListFBBtn')) {
                    var branchIdx = Number(event.target.getAttribute('data-branchIdx')),
                    arg = TreeHdlr.active.data.branches[branchIdx];

                    if(TreeHdlr.active.submArgsAct.branches[branchIdx]) {
                        if(TreeHdlr.active.submArgsAct.branches[branchIdx].total < 1) {
                            PageHdlr.DisplayMsg('Nothing to view', 2);
                            return;
                        }
                    }

                    Close();
                    TreeHdlr.SetNotifToAdjust(branchIdx);
                    TreeBuilder.ViewFeedback({
                        idx: branchIdx,
                        asser: arg.assertion,
                        elab: arg.elaboration,
                        srcString: User.perms.isMod ? TemplateHdlr.GetSrcListEditDisp(arg.sources) : TemplateHdlr.EJS_GetSrcList(this.argData.sources, false),
                    });
                }
            });

            /*======================== BRANCHES TAB/PANEL ========================*/
            document.getElementById('DownloadTreeBtn').addEventListener('click', function() {
                window.open(window.location.protocol + '//' + window.location.hostname + ':' + window.location.port + '/Download?treeID=' + TreeHdlr.active.data._id + '&isCtrl=' + TreeHdlr.active.isControlled);
            });
        },
        ReplaceBranch: function(idx, newString) {
            var oldLI = document.getElementById('BranchList' + idx);
            var newLI = Utility.html.FromString(newString, false);
            sliderLeftElems.hash['BranchList'].ReplaceHTMLNode(newLI, oldLI);
        },
        AddBranch: function(newString) {
            sliderLeftElems.hash['BranchList'].AddHTMLString(newString);
        },
        //* This function operators at the BRANCH level
        UpdateArgSubmDisp: function(branchIdx) {
            //* This function operators at the TREE level (the tab on the left side)
            UpdateArgSubmDispTreeLevel();

            // If arg subm data is total zero, or data doesn't exist anymore, replace list item.
            var replElem = null;
            var submAtIdx;
            if(submAtIdx = TreeHdlr.active.submArgsAct.branches[branchIdx]) {
                if(submAtIdx.total > 0) {
                    var branchListElem = document.getElementById('BranchList' + branchIdx);
                    branchListElem.getElementsByClassName('branchListMailTotal')[0].textContent = submAtIdx.total;
                    // Total is replaced, now see if unviewed amount needs to be updated
                    if(User.perms.isMod) {
                        newFBElem = branchListElem.getElementsByClassName('newFBCol')[0];
                        if(submAtIdx.unviewed > 0)
                            newFBElem.textContent = '(' + submAtIdx.unviewed + ')';
                        else {
                            if(newFBElem)
                                newFBElem.textContent = '';
                            Utility.html.ChangeClass(branchListElem, 'filterNewFBTrue', 'filterNewFBFalse');
                        }
                    }
                }
                else
                    replElem = TemplateHdlr.EJS_GetLinearBranchLI(branchIdx);
            }
            else
                replElem = TemplateHdlr.EJS_GetLinearBranchLI(branchIdx);
            
            if(replElem)
                SliderLeft.ReplaceBranch(branchIdx, replElem);
        },
        TreeUpdate: function(timeStamp, tagString, modActiveUsernames, branchListString, modChat, modInviteString, guestInviteString) {

            // TODO: Make sure this isn't instantiating anything it doesn't need to (now that the details html is always created right away)
            
            /*======================== HEADER ========================*/
            sliderLeftElems.hash['TreeTitle'].DisplayMsg(TreeHdlr.active.data.title);
            sliderLeftElems.hash['DateTreeCreated'].DisplayMsg('Created: ' + timeStamp);
            if(TreeHdlr.active.data.archTimeStamp)
                sliderLeftElems.hash['DateTreeArchived'].DisplayMsg('Archived: ' + TreeHdlr.active.data.archTimeStamp);
            else
                sliderLeftElems.hash['DateTreeArchived'].ClearMsg();

            // V+
            // if(!!TreeHdlr.active.data.archived)
            //     sliderLeftElems.hash['ArchivedInd'].Show();
            // else
            //     sliderLeftElems.hash['ArchivedInd'].Hide();

            /*======================== MOD PANEL ========================*/
            // TODO: Perhaps the names of former mods should also be kept & listed here for record-keeping sake.
            if(TreeHdlr.active.data.archived || !TreeHdlr.active.isControlled) {
                sliderLeftElems.hash['TreeDetailSections'].ChangeTabAbility('TabModDets', false);
            }
            else {
                sliderLeftElems.hash['TreeDetailSections'].ChangeTabAbility('TabModDets', true);
                if(User.perms.isAdmin) {
                    sliderLeftElems.hash['ModAdminCtrls'].Show();
                    UpdateInviteCounts('moderators', 'Mod');
                    // TODO: Same filter system for guests
                }
                else {
                    sliderLeftElems.hash['ModAdminCtrls'].Hide();
                    if(modInviteString == '') {
                        modInviteString = '<li>None</li>';
                        modListEmpty = true;
                    }
                }

                sliderLeftElems.hash['ModeratorList'].QuickReplace(modInviteString, false, function(){});

                // Load avatars
                var imgTags = sliderLeftElems.hash['ModeratorList'].elem.getElementsByClassName('userImg');
                for(var i = 0; i < imgTags.length; i++)
                    Main.GetImgSrc(imgTags[i].getAttribute('data-accountID'), imgTags[i]);

                // Go through mods and indicate which are active
                if(User.perms.isMod) {
                    if(TreeHdlr.active.isControlled) {
                        if(modActiveUsernames)
                            modActiveUsernames.push(User.accountData.username);
                        else 
                            modActiveUsernames = [User.accountData.username];

                        DetailsModUpdate(modActiveUsernames, true);
                    }                
                }

                // Mod chat
                if(User.loggedIn) {
                    if(TreeHdlr.active.isControlled && User.perms.isMod) {

                        // TODO: Highlight mod names on the left with the same random colours chosen to highlight the message text on the right
                        sliderLeftElems.hash['ModListPanel'].On();
                        sliderLeftElems.hash['ModChatBox'].Show();
                        sliderLeftElems.hash['ModChatDisp'].elem.scrollTop = sliderLeftElems.hash['ModChatDisp'].elem.scrollHeight;
                        if(modChat)
                            ReplaceMsgBoard(modChat);
                    }
                    else {
                        ClearMsgBoard();
                        sliderLeftElems.hash['ModListPanel'].Off();
                        sliderLeftElems.hash['ModChatBox'].Hide();
                    }
                }
            }

            /*======================== PERMS PANEL ========================*/
            if(User.loggedIn) {
                if(User.perms.isAdmin && !TreeHdlr.active.data.archived) {
                    sliderLeftElems.hash['TreeDetailSections'].ChangeTabAbility('TabPerms', true);

                    SetPermissions(TreeHdlr.active.data.permissions, true);
                    sliderLeftElems.hash['TreeGuestList'].ClearInnards();
                    if(guestInviteString) {
                        sliderLeftElems.hash['TreeGuestList'].QuickReplace(guestInviteString, false, function(){});

                        // Load avatars
                        var imgTags = sliderLeftElems.hash['TreeGuestList'].elem.getElementsByClassName('userImg');
                        for(var i = 0; i < imgTags.length; i++)
                            Main.GetImgSrc(imgTags[i].getAttribute('data-accountID'), imgTags[i]);
                    }

                    UpdateInviteCounts('guests', 'Guest');
                }
                else
                    sliderLeftElems.hash['TreeDetailSections'].ChangeTabAbility('TabPerms', false);
            }
            else
                sliderLeftElems.hash['TreeDetailSections'].ChangeTabAbility('TabPerms', false);

            /*======================== TAGS PANEL ========================*/
            if(!TreeHdlr.active.data.archived && (User.perms.isMod || !TreeHdlr.active.isControlled))
                sliderLeftElems.hash['TagForm'].Show();
            else {
                sliderLeftElems.hash['TagForm'].Hide();
                // Only need to say "None" for omeone who cannot add tags anyway 
                if(tagString == '')
                    tagString = '<li>None</li>';
            }

            sliderLeftElems.hash['TagList'].ReplaceWith(tagString, function() {});

            /*======================== ARGS PANEL ========================*/
            
            // TODO: I should be able to delete this, if necessary permission checks are being done server side
            // There doesn't seem to be any chance that the branch list will remain but the arg subm elems will change visibility
            if(User.perms.canViewFeedback) {
                sliderLeftElems.hash['SBTreeCtrl_FeedbackByTree'].Show();
                ElemDyns.ShowUnregisteredColl(sliderLeftElems.hash['BranchList'].elem.getElementsByClassName('branchListFBBtn'));
            }
            else {
                sliderLeftElems.hash['SBTreeCtrl_FeedbackByTree'].Hide();
                ElemDyns.HideUnregisteredColl(sliderLeftElems.hash['BranchList'].elem.getElementsByClassName('branchListFBBtn'));
            }

            if(TreeHdlr.active.isControlled)
                //* This function operators at the TREE level (the tab on the left side)
                UpdateArgSubmDispTreeLevel();

            if(User.perms.loggedIn) {
                if(TreeHdlr.active.isControlled) {
                    if(User.perms.isMod) {
                        sliderLeftElems.hash['BranchListFilterForm'].Show();
                        // Disable/enable filter form happens in UpdateArgSubmDispTreeLevel()
                    }
                    else {
                        BranchListFilterOff();
                        sliderLeftElems.hash['BranchListFilterForm'].Hide();
                    }
                    document.BranchListFilterForm.NewFeedback.checked = false;
                    NewMailFilter(sliderLeftElems.hash['BranchList'].elem, false);
                }
            }

            sliderLeftElems.hash['BranchList'].NewInnards(branchListString);
        },
        TreeShowing: function(isShowing) {
            if(User.loggedIn) {
                if(!isShowing)
                    Close();
            }
        },
        GoToModChat: function() {
            GoToModChat();
        },
        GetModChatColour: function(username) {
            if(!modColourList[username]) {
                modColourList[username] = RandRGBObj();
            }
            return modColourList[username];
        },
        GoToFilteredBranchList: function() {
            sliderLeftElems.hash['TreeDetailSections'].ChangeTab('TabArgs', 'BranchListPanel');
            ApplyBranchListFilter();
            //* Delay necessary - animation will not happen is panel still detected as display:none
            setTimeout(Open, 500);
        },
        ColSwap: function(branchIdx, parentIdx) {
            SliderLeft.ReplaceBranch(branchIdx, TemplateHdlr.EJS_GetLinearBranchLI(branchIdx));
            SliderLeft.ReplaceBranch(parentIdx, TemplateHdlr.EJS_GetLinearBranchLI(parentIdx));
        },
        CheckSlidePanelClosed: function(clickedElem) {
            if(clickedElem.id == 'DetailsBtn')
                return;
            if(sliderLeftElems.hash['SliderLeft'].elem.contains(clickedElem))
                return;
            if(Utility.html.CheckClass(clickedElem, 'nonEffector_SliderLeft'))
                return;

            Close();
        }
    };
})();
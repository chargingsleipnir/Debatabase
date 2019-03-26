var ActivityPg = (function () {

    var actPgElems = new DynElemCont();

    var timelineBatch = 0;

    var invites = {
        guest: 0,
        mod: 0,
        UpdateGuestNotif: function() {
            if(invites.guest > 0) actPgElems.hash['GuestPendingInvitesText'].DisplayMsg(invites.guest);
            else actPgElems.hash['GuestPendingInvitesText'].ClearMsg();
        },
        UpdateModNotif: function() {
            if(invites.mod > 0) actPgElems.hash['ModPendingInvitesText'].DisplayMsg(invites.mod);
            else actPgElems.hash['ModPendingInvitesText'].ClearMsg();
        },
        IncrGuestNotif: function() {
            invites.guest++;
            invites.UpdateGuestNotif();
        },
        IncrModNotif: function() {
            invites.mod++;
            invites.UpdateModNotif();
        },
        DecrGuestNotif: function() {
            invites.guest--;
            invites.UpdateGuestNotif();
        },
        DecrModNotif: function() {
            invites.mod--;
            invites.UpdateModNotif();
        }
    };

    function DestroyInvite(liElem, InviteNotifCallback, DBCallString) {
        if(User.accountData.preferences.confMsgs.removeLink) // User preference check
            if(!confirm('Removing this link will also drop your permissions for this debate.'))
                return;

        var treeID = liElem.getAttribute('data-treeID');
        // Reduce "pending invites" notification
        if(liElem.getAttribute('data-invAccepted') == 'false')
            InviteNotifCallback();
        // Remove element, close panel if empty
        var parentID = liElem.parentElement.id;
        actPgElems.hash[parentID].Pop(liElem, function(itemCount) {
            if(itemCount < 1) {
                // TODO: Indicate "None" here
            }
        });
        var isActiveTree = TreeHdlr.active.data ? (treeID == TreeHdlr.active.data._id) : false;
        Network.Emit(DBCallString, {
            // If inRoom, it's the same tree being left/joined, so treeID is used in MongoHdlr
            inRoom: User.perms.isMod && TreeHdlr.active.isControlled,
            treeID: treeID, 
            accountID: User.accountData._id,
            strRatings: User.GetStrRatings(treeID, TreeHdlr.active.isControlled),
            isActiveTree: isActiveTree,
            stayAtCurrPage: true,
            branchIdx: isActiveTree ? TreeHdlr.active.focalIdx : 0
        });
    }
    function DestroyModCB(liElem) {
        DestroyInvite(liElem, invites.DecrModNotif, 'RemoveModInvite');
    }
    function DestroyGuestCB(liElem) {
        DestroyInvite(liElem, invites.DecrGuestNotif, 'RemoveGuestInvite');
    }
    function AccInvite(accBtnElem, DBCallString) {
        var liElem = accBtnElem.parentElement.parentElement.parentElement;
        liElem.setAttribute('data-invAccepted', true);
        var treeID = liElem.getAttribute('data-treeID');

        var isActiveTree = TreeHdlr.active.data ? (treeID == TreeHdlr.active.data._id) : false;
        Network.Emit(DBCallString, {
            // If inRoom, it's the same tree being left/joined, so treeID is used in MongoHdlr
            inRoom: User.perms.isMod && TreeHdlr.active.isControlled,
            treeID: treeID, 
            accountID: User.accountData._id,
            strRatings: User.GetStrRatings(treeID, TreeHdlr.active.isControlled),
            isActiveTree: isActiveTree,
            stayAtCurrPage: true,
            branchIdx: isActiveTree ? TreeHdlr.active.focalIdx : 0
        });
        accBtnElem.parentElement.removeChild(accBtnElem);
    }
    function AccModCB(accBtnElem) {
        invites.DecrModNotif();
        AccInvite(accBtnElem, 'AccModeratorInv');
    }
    function AccGuestCB(accBtnElem) {
        invites.DecrGuestNotif();
        AccInvite(accBtnElem, 'AccGuestInv');
    }
    function BookmarkDestroyGroupCont(branchListParLI, branchListULID, isCtrl, archived) {
        var treeListID, otherID1, otherID2;
        if(isCtrl) {
            if(archived) {
                treeListID = 'BookListArch';
                otherID1 = 'BookListCtrl';
                otherID2 = 'BookListOpen';
            }
            else {
                treeListID = 'BookListCtrl';
                otherID1 = 'BookListArch';
                otherID2 = 'BookListOpen';
            }
        }
        else {
            treeListID = 'BookListOpen';
            otherID1 = 'BookListArch';
            otherID2 = 'BookListCtrl';
        }

        // Make sure to remove tree object from actPgElems.hash
        actPgElems.hash[treeListID].ReEnableExtensibleAnim(branchListParLI);
        delete actPgElems.hash[branchListULID];
        // ------------ These two lines are not particularly necessary, just thought I'd hard-code a way to drop the height of these elements at the last minute
        Utility.html.ChangeClass(branchListParLI, 'transFadeRot', 'transFadeRotColl');
        branchListParLI.style.height = '' + branchListParLI.offsetHeight + 'px';
        // ------------ ^^^^^^^^^^
        actPgElems.hash[treeListID].Pop(branchListParLI, function(itemCount) {
            if(itemCount < 1) {
                actPgElems.hash[treeListID + 'Cont'].Hide();

                if(actPgElems.hash[otherID1].GetListLength() < 1 && actPgElems.hash[otherID2].GetListLength() < 1) {
                    //actPgElems.hash['SidebarSlider'].CloseAll();
                    // TODO: New equivalent of this
                }
            }
        });
    }
    function DestroyBookmarkCB(liElem, isCtrl, archived) {
        var branchListUL = liElem.parentElement,
        branchListParLI = branchListUL.parentElement;

        var typeKey = isCtrl ? 'ctrl' : 'open';

        var treeID = branchListParLI.getAttribute('data-treeID');
        var branchIdx = Number(liElem.getAttribute('data-branchIdx'));

        // Remove item from data
        var unsetTreeID = false;
        var listIdx = User.accountData.bookmarked[typeKey][treeID].indexOf(branchIdx);
        User.accountData.bookmarked[typeKey][treeID].splice(listIdx, 1);
        if(User.accountData.bookmarked[typeKey][treeID].length < 1) {
            delete User.accountData.bookmarked[typeKey][treeID];
            unsetTreeID = true;
        }

        // This should sufficiently counter-balance the interaction increases from adding a bookmark
        TreeHdlr.IncrInteractions(branchIdx, -1);
        Network.Emit('RemoveBookmark', {
            treeID: treeID,
            ctrlTypeKey: typeKey,
            branchIdx: branchIdx,
            accountID: User.accountData._id,
            unsetTreeID: unsetTreeID
        });

        // Just shut down entire parent list item
        if(unsetTreeID)
            BookmarkDestroyGroupCont(branchListParLI, branchListUL.id, isCtrl, archived);
        else {
            actPgElems.hash[branchListUL.id].Pop(liElem, function() {
                // Protection here, as bookmarks can be erased fast enough to bypass main check when erasing the last few.
                if(branchListUL.children.length == 0 && actPgElems.hash[branchListUL.id]) {
                    // In the case that this is necessary, the delay is required to separate the child transitions from the parent's
                    setTimeout(function() {
                        BookmarkDestroyGroupCont(branchListParLI, branchListUL.id, isCtrl, archived);
                    }, 0);
                }
            });
        }
    }
    function LinkFunc(elem, isCtrl, DestroyLinkCallback, AccInvCallback) {
        if(Utility.html.CheckClass(elem, 'treeLinkBtn'))
            TreeHdlr.GoTo(elem.getAttribute('data-treeID'), 0, isCtrl, true);
        if(!User.IsGuestAccount()) {
            if(Utility.html.CheckClass(elem, 'removeBtn'))
                DestroyLinkCallback(elem.parentElement.parentElement.parentElement);
            else if(Utility.html.CheckClass(elem, 'acceptBtn'))
                AccInvCallback(elem);
        }
    }

    function BookmarkLinkFunc(elem, isCtrl, archived) {
        if(Utility.html.CheckClass(elem, 'treeTitle'))
            TreeHdlr.GoTo(elem.parentElement.getAttribute('data-treeID'), 0, isCtrl, true);
        else if(Utility.html.CheckClass(elem, 'treeLinkBtn')) {
            TreeHdlr.GoTo(
                elem.parentElement.parentElement.parentElement.parentElement.getAttribute('data-treeID'),
                Number(elem.getAttribute('data-branchIdx')),
                isCtrl,
                true
            );
        }
        if(!User.IsGuestAccount()) {
            if(Utility.html.CheckClass(elem, 'removeBtn'))
                DestroyBookmarkCB(elem.parentElement.parentElement, isCtrl, archived);
        }
    }

    function DestroyTreeCB(isCtrl) {
        return function(liElem) {
            linkElem = liElem;
            var treeID = liElem.getAttribute('data-treeID');

            if(isCtrl)
                OverlapCont.SetTreeRemoveWindow(liElem.getElementsByClassName('treeLinkTitleBar')[0].textContent, function (removeType) {
                    Network.Emit('DeleteTree', { treeID: treeID, accountID: User.accountData._id, username: User.accountData.username, isCtrl: isCtrl, removeType: removeType });
                });
            else
                Network.Emit('DeleteTree', { treeID: treeID, accountID: User.accountData._id, isCtrl: isCtrl });
        }        
    }

    function ReceiveInviteCut(treeID, listID, InviteNotifCallback) {
        var list = actPgElems.hash[listID].GetListItems();
        var invAccept = false;
        // Loop in reverse to not run into index problems
        for(var i = list.length - 1; i > -1; i--) {
            if(list[i].getAttribute('data-treeID') == treeID) {
                if(list[i].getAttribute('data-invAccepted') == 'false')
                    InviteNotifCallback();
                else
                    invAccept = true;

                actPgElems.hash[listID].Pop(list[i], function(itemCount) {
                    if(itemCount < 1) {
                        // TODO: Indicate "None" here
                    }
                });
                break;
            }
        }

        // Refresh tree to reflect changed permissions (not necessary if invite was never accepted to begin with)
        if(invAccept)
            if(TreeHdlr.active.data)
                if(treeID == TreeHdlr.active.data._id)
                    TreeHdlr.Refresh();
    }

    // V+ Requires cross-referencing with new arg subm filter
    function InvAccFilter(listItems, filterOn, newFBFilterOn) {
        if(filterOn) {
            for(var i = 0; i < listItems.length; i++) {
                if(listItems[i].getAttribute('data-invAccepted') == 'false')
                    ElemDyns.HideUnregOne(listItems[i]);
            }
        }
        else {
            for(var i = 0; i < listItems.length; i++) {
                if(listItems[i].getAttribute('data-invAccepted') == 'false')
                    ElemDyns.ShowUnregOne(listItems[i]);
            }
        }
    }

    return {
        Init: function(loginHTMLObj) {
            //* SETUP TABS
            ElemDyns.MakeTabbedBox(actPgElems, 'ActivitySections', 'actTab', 'actPanel', true);
            document.getElementById('TabActTimeline').addEventListener('click', function(event) {
                actPgElems.hash['ActivitySections'].ChangeTab('TabActTimeline', 'PersonalTimeline');
            });
            document.getElementById('TabCreated').addEventListener('click', function(event) {
                actPgElems.hash['ActivitySections'].ChangeTab('TabCreated', 'PanelAdmin');
            });
            document.getElementById('TabMod').addEventListener('click', function(event) {
                actPgElems.hash['ActivitySections'].ChangeTab('TabMod', 'PanelMod');
            });
            document.getElementById('TabGuest').addEventListener('click', function(event) {
                actPgElems.hash['ActivitySections'].ChangeTab('TabGuest', 'PanelGuestOf');
            });
            document.getElementById('TabBookmarked').addEventListener('click', function(event) {
                actPgElems.hash['ActivitySections'].ChangeTab('TabBookmarked', 'PanelBookmarked');
            });
            document.getElementById('TabRecentVis').addEventListener('click', function(event) {
                actPgElems.hash['ActivitySections'].ChangeTab('TabRecentVis', 'PanelRecentVis');
            });

            //* SUBMITTED ARGUMENT NOTIFICATIONS ========================
            // Created total
            ElemDyns.MakeBillboard(actPgElems, 'DashCreatedTotalFBQtyNotif');
            actPgElems.hash['DashCreatedTotalFBQtyNotif'].DisplayMsg(User.submArgs.in.allCreateSubms.total);
            // Created new
            ElemDyns.MakeBillboard(actPgElems, 'DashCreatedNewFBQtyNotif');
            actPgElems.hash['DashCreatedNewFBQtyNotif'].elem.addEventListener('click', ActivityPg.OpenFilteredCreatePanel);
            if(User.submArgs.in.allCreateSubms.unviewed > 0) {
                document.CreateListFilterForm.NewFeedback.removeAttribute('disabled');
                actPgElems.hash['DashCreatedNewFBQtyNotif'].DisplayMsg('(' + User.submArgs.in.allCreateSubms.unviewed + ')');
            }
            // Mod total
            ElemDyns.MakeBillboard(actPgElems, 'DashModTotalFBQtyNotif');
            // Mod new
            ElemDyns.MakeBillboard(actPgElems, 'DashModNewFBQtyNotif');

            ActivityPg.UpdateModSubms();

            actPgElems.hash['DashModNewFBQtyNotif'].elem.addEventListener('click', ActivityPg.OpenFilteredModPanel);
            

            //* PERSONAL/PRIVATE TIMELINE ========================
            ElemDyns.MakeDynamic(actPgElems, 'PersonalTimeline');
            actPgElems.hash['PersonalTimeline'].NewInnards(loginHTMLObj.timelinePrivate);
            actPgElems.hash['PersonalTimeline'].elem.addEventListener('click', function(event) {
                if(Utility.html.CheckClass(event.target, 'timelineLinkBtn'))
                    // Reminder - html attributes are all strings, so "false" is truthy -->
                    TreeHdlr.GoTo(event.target.getAttribute('data-treeID'), Number(event.target.getAttribute('data-branchIdx')), event.target.getAttribute('data-isCtrl') === 'true', true);
                else if(Utility.html.CheckClass(event.target, 'userSearchBtn'))
                    SearchPg.SearchForUser(event.target.value);
            });

            // Tab batch fetching
            document.getElementById('TimePersSel').addEventListener('change', function(event) {
                if(timelineBatch != event.target.options[event.target.selectedIndex].value) {
                    timelineBatch = event.target.options[event.target.selectedIndex].value;
                    Network.Emit('GetPersTimelineHTMLBatch', {
                        accountID: User.accountData._id,
                        batchNum: timelineBatch
                    });
                }
            });
            Network.CreateResponse('GetPersTimelineHTMLBatchResp', function(resHTML) {
                actPgElems.hash['PersonalTimeline'].NewInnards(resHTML);
                actPgElems.hash['PersonalTimeline'].elem.scrollTop = 0;
            });

            //* SAVED DEBATES ========================
            ElemDyns.AnimateExtensibility(actPgElems, 'CtrlList', true);
            ElemDyns.AnimateExtensibility(actPgElems, 'ModList', true);
            ElemDyns.AnimateExtensibility(actPgElems, 'GuestOfList', true);
            ElemDyns.MakeHidable(actPgElems, 'BookListCtrlCont');
            ElemDyns.MakeHidable(actPgElems, 'BookListOpenCont');
            ElemDyns.MakeHidable(actPgElems, 'BookListArchCont');
            ElemDyns.AnimateExtensibility(actPgElems, 'BookListCtrl', true);
            ElemDyns.AnimateExtensibility(actPgElems, 'BookListOpen', true);
            ElemDyns.AnimateExtensibility(actPgElems, 'BookListArch', true);

            ElemDyns.MakeBillboard(actPgElems, 'ModPendingInvitesText');
            ElemDyns.MakeBillboard(actPgElems, 'GuestPendingInvitesText');

            var itemList;
            invites.mod = 0;
            invites.guest = 0;
            invites.UpdateModNotif();
            invites.UpdateGuestNotif();

            //* ADMIN ========================
            document.CreateListFilterForm.NewFeedback.addEventListener('click', function(event) { NewMailFilter(actPgElems.hash['CtrlList'].elem, event.target.checked); });
            
            if(!User.IsGuestAccount()) {
                Network.CreateResponse('DeleteTreeResp', function(resObj) {
                    PageHdlr.DisplayMsg(resObj.msg, 3);

                    var treeID = linkElem.getAttribute('data-treeID');
                    if(TreeHdlr.active.data)
                        if(TreeHdlr.active.data._id == treeID)
                            TreeHdlr.Refresh();

                    var parentID = linkElem.parentElement.id;
                    actPgElems.hash[parentID].Pop(linkElem, function(itemCount) {
                        if(actPgElems.hash['CtrlList'].elem.children.length < 1) {
                            // TODO: Make some indication that nothing is saved. Maybe switch tabs and disable this tab?
                        }                      
                    });

                    if(resObj.timelineString) {
                        ActivityPg.AddTimelineItem(resObj.timelineString);
                    }

                    // TODO: Check Search lists and remove tree as required
                });
            }
            actPgElems.hash['CtrlList'].elem.addEventListener('click', function(event) {
                LinkFunc(event.target, true, DestroyTreeCB(true));
                if(Utility.html.CheckClass(event.target, 'mailBtn')) {
                    // Go to tree, while openning tree side panel and branch list panel
                    TreeHdlr.GoTo(event.target.getAttribute('data-treeID'), 0, true, true, SliderLeft.GoToFilteredBranchList);
                }
            });
            if(loginHTMLObj['created'] != '') {
                // TODO: Enable tab if disabled
                actPgElems.hash['CtrlList'].QuickReplace(loginHTMLObj['created'], false, function(listLen) {
                    console.log('# moderated debates created: ' + listLen);
                });
            }

            //* MOD ========================
            document.ModListFilterForm.NewFeedback.addEventListener('click', function(event) { NewMailFilter(actPgElems.hash['ModList'].elem, event.target.checked); });
            // V+ Make sure to cross-reference with new subm arg filter, and apply to guestOf list as well
            // document.ModListFilterForm.Accepted.addEventListener('click', function(event) { 
            //     InvAccFilter(actPgElems.hash['ModList'].elem, event.target.checked, document.ModListFilterForm.NewFeedback.checked); 
            // });

            if(!User.IsGuestAccount()) {
                Network.CreateResponse('AccModeratorInvResp', function(resObj) {
                    // Change tree link to one that shows arg submission information
                    var modLinkList = actPgElems.hash['ModList'].GetListItems();
                    for(var i = 0; i < modLinkList.length; i++) {
                        if(modLinkList[i].getAttribute('data-treeID') == resObj.treeID) {
                            actPgElems.hash['ModList'].ReplaceSingle(resObj.newLinkString, modLinkList[i]);
                            break;
                        }
                    }
                });
                Network.CreateResponse('ReceiveModInvite', function(resObj) {
                    actPgElems.hash['ModList'].Push(true, resObj.htmlString, function(){});
                    invites.IncrModNotif();
                    if(PageHdlr.state != pageStates.ACTIVITY)
                        Header.IndActNotif(true);
                });
                Network.CreateResponse('ReceiveModCut', function(resObj) {
                    ReceiveInviteCut(resObj.treeID, 'ModList', invites.DecrModNotif);
                });
            }
            actPgElems.hash['ModList'].elem.addEventListener('click', function(event) {
                LinkFunc(event.target, true, DestroyModCB, AccModCB);
                if(Utility.html.CheckClass(event.target, 'mailBtn')) {
                    // Go to tree, while openning tree side panel and branch list panel
                    TreeHdlr.GoTo(event.target.getAttribute('data-treeID'), 0, true, true, SliderLeft.GoToFilteredBranchList);
                }
            });
            if(loginHTMLObj['moderating'] != '') {
                // TODO: Enable tab if disabled
                actPgElems.hash['ModList'].QuickReplace(loginHTMLObj['moderating'], false, function(listLen) {
                    console.log('# moderator invites: ' + listLen);
                    itemList = actPgElems.hash['ModList'].GetListItems();
                    for(i = 0, len = itemList.length; i < len; i++)
                        if(itemList[i].getAttribute('data-invAccepted') == 'false')
                            invites.mod++;
                    invites.UpdateModNotif();
                });                
            }

            //* GUEST OF ========================
            if(!User.IsGuestAccount()) {
                Network.CreateResponse('ReceiveGuestInvite', function(resObj) {
                    actPgElems.hash['GuestOfList'].Push(true, resObj.htmlString, function(){});
                    invites.IncrGuestNotif();
                    if(PageHdlr.state != pageStates.ACTIVITY)
                        Header.IndActNotif(true);
                });
                Network.CreateResponse('ReceiveGuestCut', function(resObj) {
                    ReceiveInviteCut(resObj.treeID, 'GuestOfList', invites.DecrGuestNotif);
                });
            }
            actPgElems.hash['GuestOfList'].elem.addEventListener('click', function(event) {
                LinkFunc(event.target, true, DestroyGuestCB, AccGuestCB);
            });
            if(loginHTMLObj['guestOf'] != '') {
                // TODO: Enable tab if disabled
                actPgElems.hash['GuestOfList'].QuickReplace(loginHTMLObj['guestOf'], false, function(listLen) {
                    console.log('# guest invites: ' + listLen);
                    itemList = actPgElems.hash['GuestOfList'].GetListItems();
                    for(i = 0, len = itemList.length; i < len; i++) {
                        if(itemList[i].getAttribute('data-invAccepted') == 'false')
                            invites.guest++;
                    }
                    invites.UpdateGuestNotif();
                });                
            }

            //* BOOKMARKED ========================
            if(!User.IsGuestAccount()) {
                Network.CreateResponse('AddBookmarkResp', function(resObj) {
                    if (resObj.success) {

                        var bookListString;
                        if(resObj.isCtrl) {
                            if(resObj.archived) {
                                bookListString = 'BookListArch';
                                actPgElems.hash['BookListArchCont'].Show();
                            }
                            else {
                                bookListString = 'BookListCtrl';
                                actPgElems.hash['BookListCtrlCont'].Show();
                            }
                        }
                        else {
                            bookListString = 'BookListOpen';
                            actPgElems.hash['BookListOpenCont'].Show();
                        }

                        if(User.accountData.bookmarked[resObj.typeKey][resObj.treeID]) {
                            // Tree id exists, so at least 1 branch exists, so the appropriate html block must exist
                            var treeList = actPgElems.hash[bookListString].GetListItems();
                            for(var i = 0, len = treeList.length; i < len; i++) {
                                if(treeList[i].getAttribute('data-treeID') == resObj.treeID) {
                                    actPgElems.hash[treeList[i].getElementsByClassName("branchList")[0].id].Push(false, resObj.htmlString, function() {});
                                    break;
                                }
                            }
                        }
                        else {
                            // Tree id does not exist, so all data and html need to be added
                            User.accountData.bookmarked[resObj.typeKey][resObj.treeID] = [];
                            var branchListString = TemplateHdlr.GetBookmarkTree(resObj.treeID, resObj.title);
                            var branchLIHTML = Utility.html.FromString(branchListString, false);
                            var branchUL = branchLIHTML.getElementsByClassName("branchList")[0];
                            
                            branchUL.removeChild(branchUL.children[0]);
                            var liHTML = Utility.html.FromString(resObj.htmlString, false);
                            branchUL.appendChild(liHTML);
                            // Need to make element a part of the DOM before trying to manipulate it in ElemDyns
                            actPgElems.hash[bookListString].Push(true, branchLIHTML, function() {
                                ElemDyns.AnimateExtensibility(actPgElems, branchUL.id, true);
                            });
                        }

                        // Data slot now open, if it wasn't already, to add branchIdx
                        User.accountData.bookmarked[resObj.typeKey][resObj.treeID].push(resObj.branchIdx);
                        PageHdlr.DisplayMsg('Bookmarked this debate branch.', 3);
                    }
                    else
                        PageHdlr.DisplayMsg("Failed to bookmark this debate branch.", 3);
                });
            }
            actPgElems.hash['BookListCtrl'].elem.addEventListener('click', function(event) {
                BookmarkLinkFunc(event.target, true, false);
            });
            actPgElems.hash['BookListOpen'].elem.addEventListener('click', function(event) {
                BookmarkLinkFunc(event.target, false, false);
            });
            actPgElems.hash['BookListArch'].elem.addEventListener('click', function(event) {
                BookmarkLinkFunc(event.target, true, true);
            });
            if(loginHTMLObj['bookmarkedCtrl'] != '') {
                // TODO: Enable tab if disabled
                actPgElems.hash['BookListCtrlCont'].Show();
                actPgElems.hash['BookListCtrl'].QuickReplace(loginHTMLObj['bookmarkedCtrl'], false, function(listLen) {
                    console.log('# bookmark control tree groups: ' + listLen);
                    var branchULs = actPgElems.hash['BookListCtrl'].elem.getElementsByClassName('branchList');
                    for(var i = 0; i < branchULs.length; i++)
                        ElemDyns.AnimateExtensibility(actPgElems, branchULs[i].id, true);
                });
            }
            if(loginHTMLObj['bookmarkedOpen'] != '') {
                actPgElems.hash['BookListOpenCont'].Show();
                actPgElems.hash['BookListOpen'].QuickReplace(loginHTMLObj['bookmarkedOpen'], false, function(listLen) {
                    console.log('# bookmark open tree groups: ' + listLen);
                    var branchULs = actPgElems.hash['BookListOpen'].elem.getElementsByClassName('branchList');
                    for(var i = 0; i < branchULs.length; i++)
                        ElemDyns.AnimateExtensibility(actPgElems, branchULs[i].id, true);
                });
            }
            if(loginHTMLObj['bookmarkedArch'] != '') {
                actPgElems.hash['BookListArchCont'].Show();
                actPgElems.hash['BookListArch'].QuickReplace(loginHTMLObj['bookmarkedArch'], false, function(listLen) {
                    console.log('# bookmark archived tree groups: ' + listLen);
                    var branchULs = actPgElems.hash['BookListArch'].elem.getElementsByClassName('branchList');
                    for(var i = 0; i < branchULs.length; i++)
                        ElemDyns.AnimateExtensibility(actPgElems, branchULs[i].id, true);
                });
            }

            //* RECENTLY VIEWED ========================
            ElemDyns.MakeDynamic(actPgElems, 'RecentTreeVisitList');
            actPgElems.hash['RecentTreeVisitList'].elem.addEventListener('click', function(event) {
                if(Utility.html.CheckClass(event.target, 'dashTreeLinkBtn'))
                    // Reminder - html attributes are all strings, so "false" is truthy -->
                    TreeHdlr.GoTo(event.target.getAttribute('data-treeID'), 0, event.target.getAttribute('data-isCtrl') === 'true', true);
            });
            if(loginHTMLObj.dashTreeLinks)
                actPgElems.hash['RecentTreeVisitList'].NewInnards(loginHTMLObj.dashTreeLinks);

            //* ARGUMENT SUBMISSIONS ========================
            document.getElementById('ViewAllSubmArgsBtn').addEventListener('click', function(event) {
                // No submArg batch yet cached, fetch the first one
                if(User.submArgs.out.batchNum < 0) {
                    User.submArgs.out.batchNum = 0;
                    Network.Emit('GetSubmDataBatch', {
                        accountID: User.accountData._id,
                        batchNum: 0,
                        freshOpen: true
                    });
                }
                else // A batch is already held, just switch to it.
                    TreeBuilder.ReviewSentArgs(true);
            });
            Network.CreateResponse('GetSubmDataBatchResp', function(resObj) {
                if(resObj.success) {
                    User.submArgs.out.list = resObj.argList;
                    User.submArgs.out.treesObj = resObj.treesObj;
                    TreeBuilder.ReviewSentArgs(resObj.freshOpen);
                }
                else {
                    PageHdlr.DisplayMsg(resObj.msg, 3);
                    User.submArgs.out.batchNum = -1;
                }
            });
        },
        AddTimelineItem: function(htmlString) {
            var li = Utility.html.FromString(htmlString, false);
            actPgElems.hash['PersonalTimeline'].AddHTMLNodeToFront(li);
        },
        AddCreatedTree: function(linkString) {
            actPgElems.hash['CtrlList'].Push(true, Utility.html.FromString(linkString, false), function(){
                // TODO: Enable tab as needed
            });
        },
        OpenFilteredCreatePanel: function() {
            document.CreateListFilterForm.NewFeedback.checked = true;
            NewMailFilter(actPgElems.hash['CtrlList'].elem, true);
        },
        OpenFilteredModPanel: function() {
            document.ModListFilterForm.NewFeedback.checked = true;
            NewMailFilter(actPgElems.hash['ModList'].elem, true);
        },
        AddRecentTreeVisit: function(treeObj) {
            User.accountData.recentTreeVis.unshift(treeObj.id);
            if(User.accountData.recentTreeVis.length > 5)
                User.accountData.recentTreeVis.pop();

            var liElem = Utility.html.FromString(treeObj.linkString, false);
            actPgElems.hash['RecentTreeVisitList'].AddHTMLNodeToFront(liElem);
            
            var list = actPgElems.hash['RecentTreeVisitList'].GetListItems();
            if(list.length > 5)
                actPgElems.hash['RecentTreeVisitList'].RemoveHTMLNode(list[5]);
        },
        ViewedFeedbackSubm: function(qty) {
            if(!User.IsGuestAccount()) {
                if(User.perms.isAdmin) {
                    User.submArgs.in.allCreateSubms.unviewed -= qty;
                    if(User.submArgs.in.allCreateSubms.unviewed > 0)
                        actPgElems.hash['DashCreatedNewFBQtyNotif'].DisplayMsg('(' + User.submArgs.in.allCreateSubms.unviewed + ')');
                    else {
                        document.CreateListFilterForm.NewFeedback.checked = false;
                        document.CreateListFilterForm.NewFeedback.setAttribute('disabled', '');
                        NewMailFilter(actPgElems.hash['CtrlList'].elem, false);
                        actPgElems.hash['DashCreatedNewFBQtyNotif'].ClearMsg();
                    }
                }
                else {
                    User.submArgs.in.allModSubms.unviewed -= qty;
                    if(User.submArgs.in.allModSubms.unviewed > 0)
                        actPgElems.hash['DashModNewFBQtyNotif'].DisplayMsg('(' + User.submArgs.in.allModSubms.unviewed + ')');
                    else {
                        document.ModListFilterForm.NewFeedback.checked = false;
                        document.ModListFilterForm.NewFeedback.setAttribute('disabled', '');
                        NewMailFilter(actPgElems.hash['ModList'].elem, false);
                        actPgElems.hash['DashModNewFBQtyNotif'].ClearMsg();
                    }
                }
            }
        },
        DeletedFeedbackSubm: function(qty) {
            if(!User.IsGuestAccount()) {
                if(User.perms.isAdmin) {
                    User.submArgs.in.allCreateSubms.total -= qty;
                    if(User.submArgs.in.allCreateSubms.total > -1)
                        actPgElems.hash['DashCreatedTotalFBQtyNotif'].DisplayMsg(User.submArgs.in.allCreateSubms.total);
                    else
                        actPgElems.hash['DashCreatedTotalFBQtyNotif'].DisplayMsg(0);
                }
                else {
                    User.submArgs.in.allModSubms.total -= qty;
                    if(User.submArgs.in.allModSubms.total > -1)
                        actPgElems.hash['DashModTotalFBQtyNotif'].DisplayMsg(User.submArgs.in.allModSubms.total);
                    else
                        actPgElems.hash['DashModTotalFBQtyNotif'].DisplayMsg(0);
                }
            }
        },
        UpdateFeedbackDisp: function() {
            if(!User.IsGuestAccount()) {
                var unviewedByTree = TreeHdlr.active.submArgsAct.unviewed;

                var lis;
                var listName, formName;
                if(User.perms.isAdmin) {
                    listName = 'CtrlList';
                    formName = 'CreateListFilterForm';
                }
                else {
                    listName = 'ModList';
                    formName = 'ModListFilterForm';
                    lis = actPgElems.hash['ModList'].GetListItems();
                }

                lis = actPgElems.hash[listName].GetListItems();
                // Display new unviewed amount, but if there's none, shut down buttons and disable 'new mail' filter
                if(unviewedByTree < 1) {
                    document[formName].NewFeedback.checked = false;
                    NewMailFilter(actPgElems.hash[listName].elem, false);
                }
                else
                    document[formName].NewFeedback.removeAttribute('disabled');

                for(var i = 0, len = lis.length; i < len; i++) {
                    if(lis[i].getAttribute('data-treeID') == TreeHdlr.active.data._id) {
                        lis[i].getElementsByClassName('totalFeedbackQtyNotif')[0].textContent = TreeHdlr.active.submArgsAct.total;
                        var newFBBtn = lis[i].getElementsByClassName('newFBBtn2')[0];
                        if(newFBBtn) {
                            if(unviewedByTree > 0)
                                newFBBtn.value = '(' + unviewedByTree + ')';
                            else
                                newFBBtn.value = '';
                        }
                        break;
                    }
                }
            }
        },
        UpdateModSubms: function() {
            if(!User.IsGuestAccount()) {
                actPgElems.hash['DashModTotalFBQtyNotif'].DisplayMsg(User.submArgs.in.allModSubms.total);
                if(User.submArgs.in.allModSubms.unviewed > 0) {
                    document.ModListFilterForm.NewFeedback.removeAttribute('disabled');
                    actPgElems.hash['DashModNewFBQtyNotif'].DisplayMsg('(' + User.submArgs.in.allModSubms.unviewed + ')');
                }
                else {
                    document.ModListFilterForm.NewFeedback.setAttribute('disabled', '');
                    actPgElems.hash['DashModNewFBQtyNotif'].ClearMsg();
                }
            }
        }
    }
})();
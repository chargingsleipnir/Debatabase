var TreeHdlr = (function () {

    var treeElems = new DynElemCont();

    var treeContScrollElem;
    var argElemToAdjust;
    var argCompIdx;
    var submNotifToAdjust;

    var pushTreePath = false;

    var OnTreeLoadCB = null;

    // Arg transition fields
    var startRect,
    rePosRect,
    xIncr,
    yIncr,
    wIncr,
    hIncr,
    numIncrs;

    // Arg transition Calbacks START ===============
    function OnTransStart(ctx) {
        // Adjustment must be made here, once canvas is officially being displayed (thus, has dimension)
        TreeTransMngr.CanvasPosAdjust(startRect);
        TreeTransMngr.CanvasPosAdjust(rePosRect);

        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
    }
    function ClosingTick(ctx) {
        ctx.strokeRect(startRect.x, startRect.y, startRect.width, startRect.height);
    }
    function OnClose(ctx) {
        ctx.strokeRect(rePosRect.x, rePosRect.y, rePosRect.w, rePosRect.h);

        // Get rect of new focal arg
        var endRect = Utility.html.GetRect(treeElems.hash['BranchFocusCont'].elem.firstElementChild, treeContScrollElem);
        TreeTransMngr.CanvasPosAdjust(endRect);
        // calculate transition between endrect and rePosRect
        var transAlphaIncr = TreeTransMngr.GetAlphaChangeIncr();
        numIncrs = 1 / transAlphaIncr;

        xIncr = (endRect.x - rePosRect.x) / numIncrs;
        yIncr = (endRect.y - rePosRect.y) / numIncrs;
        wIncr = (endRect.width - rePosRect.w) / numIncrs;
        hIncr = (endRect.height - rePosRect.h) / numIncrs;
    }
    function ClosedTick(ctx) {
        //console.log('x incr: ' + xIncr + ', y incr: ' + yIncr + ', w incr: ' + wIncr + ', h incr: ' + hIncr);
        rePosRect.x += xIncr;
        rePosRect.y += yIncr;
        rePosRect.w += wIncr;
        rePosRect.h += hIncr;
        ctx.strokeRect(rePosRect.x, rePosRect.y, rePosRect.w, rePosRect.h);

        numIncrs--;
        return numIncrs <= 0;
    }
    function OpenningTick(ctx) {
        ctx.strokeRect(rePosRect.x, rePosRect.y, rePosRect.w, rePosRect.h);
    }
    function OnTransitionOpenStd(branchIdx) {
        TreeMap.SetLoadedPath(branchIdx);
    }
    // Arg transition Calbacks END ===============

    function GetArgContent(idx, srcAsLinks) {
        var sources = srcAsLinks ? 
        TemplateHdlr.EJS_GetSrcList(TreeHdlr.active.data.branches[idx].sources, false) : 
        TemplateHdlr.GetSrcListEditDisp(TreeHdlr.active.data.branches[idx].sources);
        return {
            asser: TreeHdlr.active.data.branches[idx].assertion,
            elab: TreeHdlr.active.data.branches[idx].elaboration,
            srcString: sources
        };
    }
    function ModifyBarGroup(elems) {
        for (var i = 0, len = elems.length; i < len; i++) {
            var pct = elems[i].value;
            elems[i].parentElement.getElementsByClassName('valInd')[0].style.left = '' + pct + '%';
            if(elems[i].hasAttribute('data-colourValue'))
                elems[i].setAttribute('data-colourValue', '' + AdjustRatingBarColourVal(pct));
        }
    }
    function ModifyRatingBars(arg) {
        ModifyBarGroup(arg.getElementsByTagName('PROGRESS'));
        ModifyBarGroup(arg.getElementsByTagName('METER'));    
    }
    function SetParentArgEvents(argArr) {
        if(argArr.length <= 0)
            return;

        for (i = 0, len = argArr.length; i < len; i++) {
            ModifyRatingBars(argArr[i]);

            var eventObj = {
                argElem: argArr[i],
                argIdx: argArr[i].getAttribute('data-index'),
                handleEvent: function(event) {
                    if (Utility.html.CheckClass(event.target, 'argGoToBranchBtn')) {
                        startRect = Utility.html.GetRect(this.argElem, treeContScrollElem);
                        // Object is non-settable in IE - needs to be independant object. IE also doesn't have x or y values, use left and top
                        var temp = this.argElem.getBoundingClientRect();
                        rePosRect = {
                            x: temp.left,
                            y: temp.top,
                            w: temp.width,
                            h: temp.height
                        }
                        TreeHdlr.ClimbTree(this.argIdx, OnTransStart, ClosingTick, OnClose, ClosedTick, OpenningTick, null);
                    }
                }
            };
            argArr[i].addEventListener('click', eventObj);
        }
    }
    function SetArgEvents(argArr) {
        if(argArr.length <= 0)
            return;

        // TODO: Make static progress bars display percentage on bar with numbers above/below.
        for (i = 0, len = argArr.length; i < len; i++) {
            var branchIdx = Number(argArr[i].getAttribute('data-index'));

            // TODO: For an open tree, this data might not exist
            if(TreeHdlr.active.isControlled) {
                var submNotif = argArr[i].getElementsByClassName('viewSubmNotifCont')[0] || null;
                if(submNotif) {
                    var argSubs = TreeHdlr.active.submArgsAct.branches[branchIdx] || {total: 0};
                    if(argSubs.total > 0) {
                        submNotif.getElementsByClassName('viewSubmNotifTotal')[0].innerHTML = '' + argSubs.total;
                        if(argSubs.unviewed > 0 && User.perms.isMod)
                            submNotif.getElementsByClassName('viewSubmNotifUnviewed')[0].innerHTML = '(' + argSubs.unviewed + ')';
                        else
                            submNotif.getElementsByClassName('viewSubmNotifUnviewed')[0].innerHTML = '';
                    }
                    else 
                    submNotif.getElementsByClassName('viewSubmNotifTotal')[0].innerHTML = '';
                }
                
                var revHistNotif = argArr[i].getElementsByClassName('argRevHistNotifText')[0] || '',
                revHistArrLen = TreeHdlr.active.data.branches[branchIdx].revision.list.length;
                if(revHistNotif != '' && revHistArrLen > 0)
                    revHistNotif.textContent = revHistArrLen;
            }

            ModifyRatingBars(argArr[i]);

            // If public can rate, I need to check localStorage or cookie for data? Am I going to keep data in the DB for
            // just anyone? I suppose I could.

            // Same applies to revision integrity

            // Maybe I check if DB loggin in and if not, send up a post request and add it to their session cookie? Make session
            // cookies last more-or-less forever? Hmmm......
            
            var eventObj = {
                argElem: argArr[i],
                argIdx: branchIdx,
                argData: TreeHdlr.active.data.branches[branchIdx],
                inputElemList: argArr[i].getElementsByClassName('ratingCheckbox') || null,
                ratingInput: argArr[i].getElementsByClassName('strRatingInput')[0] || null,
                ratingText: argArr[i].getElementsByClassName('ratingText')[0],
                ratingVal: -1,
                submNotif: submNotif,
                handleEvent: function(event) {
                    // Clickable rating bar
                    if(Utility.html.CheckClass(event.target, 'submArgOrigBtn')) {
                        argCompIdx = this.argIdx;
                        Network.Emit('GetFeedbackSubmData', { submID: event.target.getAttribute('data-submArgID') });
                    }
                    else if(Utility.html.CheckClass(event.target, 'submArgUserBtn')) {
                        SearchPg.SearchForUser(event.target.value);
                    }
                    else if(event.target.type == 'checkbox') {
                        
                        var cbVal = Number(event.target.value),
                            cbListLen = this.inputElemList.length;

                        var repeatUserRating = false;

                        var prevRatingVal;
                        if(TreeHdlr.active.data._id) {
                            this.ratingVal = User.GetStrRatings(TreeHdlr.active.data._id, TreeHdlr.active.isControlled, this.argIdx, false);
                            if(this.ratingVal === null)
                                this.ratingVal = prevRatingVal = -1;
                            else {
                                repeatUserRating = true;
                                prevRatingVal = this.ratingVal;                                      
                            }
                        }

                        // Same value was checked, just shut them all off, value is nullified (-1)
                        if(this.ratingVal == cbVal) {
                            for(j = 0; j <= cbVal; j++)
                                this.inputElemList[j].checked = false;

                            this.ratingVal = -1;
                            this.ratingText.textContent = 'none';
                        }
                        // Different value was checked, change checkbox set appropriately
                        else {
                            for(j = 0; j < cbListLen; j++) {
                                if(j < cbVal + 1)
                                    this.inputElemList[j].checked = true;
                                else
                                    this.inputElemList[j].checked = false;
                            }
                            this.ratingVal = cbVal;
                            this.ratingText.textContent = '' + this.ratingVal + ' (' + ((this.ratingVal/5) * 100) + '%)';
                        }

                        if(TreeHdlr.active.data._id) {
                            // Only have this here, and never decrease it. Even if the user removes it's rating, that singular interaction should always stand, just the one.
                            if(!repeatUserRating)
                                TreeHdlr.IncrInteractions(this.argIdx, 1);

                            var sendData = { 
                                accountID: User.accountData._id, 
                                treeID: TreeHdlr.active.data._id,
                                branchIdx: this.argIdx,
                                rating: this.ratingVal,
                                prevRating: prevRatingVal,
                                isControlled: TreeHdlr.active.isControlled,
                                ratedAs: User.perms.isMod ? 'mod' : 'vis'
                            };
                            if(!User.IsGuestAccount()) {
                                Network.Emit('RateArgStrength', sendData);
                            }
                            else {
                                //*** Specific to Guest account, just to make sure the checkboxes change appropriately
                                var ctrlType = TreeHdlr.active.isControlled ? 'ctrl' : 'open';
                                if(!User.accountData.ratings.argStr[ctrlType][TreeHdlr.active.data._id])
                                    User.accountData.ratings.argStr[ctrlType][TreeHdlr.active.data._id] = {};

                                User.accountData.ratings.argStr[ctrlType][TreeHdlr.active.data._id][this.argIdx] = this.ratingVal;
                            }
                        }                        
                    }
                    else if(Utility.html.CheckClass(event.target, 'editLockBtn')) {
                        if(!User.IsGuestAccount()) {
                            if(TreeHdlr.active.isControlled) { // Extra protection
                                if(confirm('- Only source links will be editable.\n- Cannot switch columns anymore.\n- Enables user ratings.\n- Cannot be undone.')) {
                                    argElemToAdjust = this.argElem;
                                    Network.Emit('LockEditOpt', {
                                        treeID: TreeHdlr.active.data._id,
                                        branchIdx: this.argIdx
                                    });
                                }
                            }
                        }
                    }
                    else if(Utility.html.CheckClass(event.target, 'argEditBtn')) {
                        argElemToAdjust = this.argElem;
                        var dispObj = {
                            revision: Number(this.argElem.getAttribute('data-revision')),
                            asser: this.argData.assertion,
                            elab: this.argData.elaboration,
                            srcString: TemplateHdlr.GetSrcListEditDisp(this.argData.sources)
                        };

                        // Argument has been specifically locked, or has children, or is top-level assertion, can edit source links only.
                        if(this.argData.canEdit) {
                            if(TreeHdlr.active.isControlled)
                                if(User.accountData.preferences.confMsgs.changeArg) // User preference check
                                    if(!confirm("Completion of editting process creates & saves a publicly viewable & ratable revision. Proceed?"))
                                        return;
                            
                            var submObj = {
                                asser: this.argData.assertion,
                                elab: this.argData.elaboration,
                                srcString: TemplateHdlr.EJS_GetSrcList(this.argData.sources, true) || ''
                            };

                            TreeBuilder.EditArgWindow(this.argIdx, dispObj, submObj);
                        }
                        else
                            TreeBuilder.EditSrcWindow(this.argIdx, dispObj, TemplateHdlr.EJS_GetSrcList(this.argData.sources, true) || '');
                    }
                    else if(Utility.html.CheckClass(event.target, 'argColSwapBtn')) {
                        if(!User.IsGuestAccount()) {
                            // Setting "currType" to pass value over, as this.argData is a ref to TreeHdlr.active.data.branches[branchIdx], and changing one changes the other
                            var currType = this.argData.type;
                            var newType, newULDynObj;
                            if(currType == Consts.argTypes.CORROB) {
                                newType = Consts.argTypes.REFUTE
                                newULDynObj = treeElems.hash['RefuteArgsList'];
                            }
                            else {
                                newType = Consts.argTypes.CORROB
                                newULDynObj = treeElems.hash['CorrobArgsList'];
                            }

                            Network.Emit('ColSwap', {
                                treeID: TreeHdlr.active.data._id,
                                branchIdx: this.argIdx,
                                parentIdx: this.argData.parent,
                                currType: currType,
                                newType: newType
                            });

                            // Change arg typing
                            TreeHdlr.active.data.branches[this.argIdx].type = newType;
                            // Remove arg index from given parent child array
                            var arrIdx = TreeHdlr.active.data.branches[this.argData.parent].children[currType].indexOf(this.argIdx);
                            TreeHdlr.active.data.branches[this.argData.parent].children[currType].splice(arrIdx, 1);
                            // Add arg to array of new side
                            TreeHdlr.active.data.branches[this.argData.parent].children[newType].push(this.argIdx);
                            
                            // Move html list item - ! Arg needs to be re-created, 1. so that data-type attribute changes, and 2. so arg event handler accounts for new typing.
                            // TODO: Transition might be needed for this not to be jumpy.
                            var replaceElem = Utility.html.FromString(TemplateHdlr.EJS_GetArg({
                                pathPartials: '',
                                treeCtrl: TreeHdlr.active.isControlled,
                                treeArch: !!TreeHdlr.active.data.archived,
                                idx: this.argIdx,
                                arg: TreeHdlr.active.data.branches[this.argIdx],
                                isFocalArg: this.argIdx == TreeHdlr.active.focalIdx,
                                permObj: User.perms,
                                strRating: User.GetStrRatings(TreeHdlr.active.data._id, TreeHdlr.active.isControlled, this.argIdx, true),
                                userFavour: User.favour,
                                argTypes: Consts.argTypes
                            }));
                            SetArgEvents([replaceElem]);
                            this.argElem.parentElement.removeChild(this.argElem);
                            newULDynObj.AddHTMLNode(replaceElem);

                            treeElems.hash[['CorrobTabChildCount', 'RefuteTabChildCount'][currType]].DisplayMsg('(' + TreeHdlr.active.data.branches[TreeHdlr.active.focalIdx].children[currType].length + ')');
                            treeElems.hash[['CorrobTabChildCount', 'RefuteTabChildCount'][newType]].DisplayMsg('(' + TreeHdlr.active.data.branches[TreeHdlr.active.focalIdx].children[newType].length + ')');
                            SideBar.ApplyLayoutChecks();

                            // Reset tree arg map
                            TreeMap.SetTree(TreeHdlr.active.data.branches);
                            TreeMap.SetLoadedPath(TreeHdlr.active.focalIdx);

                            // Change data/elements in left slider as well
                            SliderLeft.ColSwap(this.argIdx, this.argData.parent);
                        }
                    }
                    else if(Utility.html.CheckClass(event.target, 'addArgBtn')) {
                        argElemToAdjust = this.argElem;
                        // Possibly capture edit button here to be removed is this completes
                        TreeBuilder.AddArgWindow(this.argIdx, GetArgContent(this.argIdx, !User.perms.isMod));
                    }
                    else if(Utility.html.CheckClass(event.target, 'argViewFBBtn')) {
                        if(TreeHdlr.active.submArgsAct.branches[this.argIdx]) {
                            if(TreeHdlr.active.submArgsAct.branches[this.argIdx].total > 0) {
                                submNotifToAdjust = this.submNotif;
                                argElemToAdjust = this.argElem;
                                TreeBuilder.ViewFeedback({
                                    idx: this.argIdx,
                                    asser: this.argData.assertion,
                                    elab: this.argData.elaboration,
                                    // TODO: Maybe check permissions, and if this user can view argSubs but is NOT a mod,
                                    // send regular links to view, not the detailed link ... & urls?
                                    srcString: User.perms.isMod ? TemplateHdlr.GetSrcListEditDisp(this.argData.sources) : TemplateHdlr.EJS_GetSrcList(this.argData.sources, false),
                                });
                                return;
                            }
                        }
                        PageHdlr.DisplayMsg('No submissions given for this argument', 3);
                    }
                    else if(Utility.html.CheckClass(event.target, 'argSubmFeedbackBtn')) {
                        TreeBuilder.SubmitFeedback({
                            idx: this.argIdx,
                            asser: this.argData.assertion,
                            elab: this.argData.elaboration,
                            srcString: TemplateHdlr.EJS_GetSrcList(this.argData.sources, false) || ''
                        });
                    }
                    else if(Utility.html.CheckClass(event.target, 'argRevHistBtn')) {
                        var dispObj = {
                            asser: this.argData.assertion,
                            elab: this.argData.elaboration,
                            srcString: TemplateHdlr.GetSrcListEditDisp(this.argData.sources),
                            // TODO: Clean up the ratings displayed here - too much info, cut num entries
                            ratingString: this.argElem.getElementsByClassName('ctrlStrRatingCont')[0] ? this.argElem.getElementsByClassName('ctrlStrRatingCont')[0].innerHTML : '',
                        };
                        var userRevIntegRating = User.GetRevRatings(TreeHdlr.active.data._id, this.argIdx, false);
                        var repeatUserRating = true;
                        if(userRevIntegRating === null) {
                            userRevIntegRating = 0;
                            repeatUserRating = false;
                        }
                        TreeBuilder.SetRevisionWindow(this.argIdx, dispObj, this.argData.revision, userRevIntegRating, repeatUserRating);
                    }
                    else if (Utility.html.CheckClass(event.target, 'argShareBtn')) {
                        var svg = event.target.children[0];
                        svg.setAttribute('data-icon', 'lock');
                        PageHdlr.DisplayMsg('Share functionality not yet implemented', 2);
                    }
                    else if (Utility.html.CheckClass(event.target, 'argBookmarkBtn')) {
                        if(!User.IsGuestAccount()) {
                            // Check that bookmark doesn't already exist.
                            var typeKey = TreeHdlr.active.isControlled ? 'ctrl' : 'open';
                            var branchArr;            
                            // Does treeID exist
                            if(branchArr = User.accountData.bookmarked[typeKey][TreeHdlr.active.data._id]) {
                                for(var i = 0, len = branchArr.length; i < len; i++) {
                                    // Does branch already exist under treeID
                                    if(branchArr[i] == this.argIdx) {
                                        PageHdlr.DisplayMsg('Already bookmarked.', 3);
                                        return;
                                    }
                                }
                            }

                            TreeHdlr.IncrInteractions(this.argIdx, 1);
                            Network.Emit('AddBookmark', {
                                accountID: User.accountData._id,
                                treeID: TreeHdlr.active.data._id,
                                isCtrl: TreeHdlr.active.isControlled,
                                typeKey: typeKey,
                                branchIdx: Number(this.argIdx),
                                title: TreeHdlr.active.data.title,
                                asser: TreeHdlr.active.data.branches[this.argIdx].assertion
                            });
                        }
                    }
                    else if (Utility.html.CheckClass(event.target, 'argGoToBranchBtn')) {

                        // TODO: calculate and start shifting frame drawing earlier?
                        // Send transition percentage through callback, start moving at 50% or so?
                        startRect = Utility.html.GetRect(this.argElem, treeContScrollElem);
                        rePosRect = this.argElem.getBoundingClientRect();
                        // Object is non-settable in IE - needs to be independant object. IE also doesn't have x or y values, use left and top
                        var temp = this.argElem.getBoundingClientRect();
                        rePosRect = {
                            x: temp.left,
                            y: temp.top,
                            w: temp.width,
                            h: temp.height
                        }

                        TreeHdlr.ClimbTree(this.argIdx, OnTransStart, ClosingTick, OnClose, ClosedTick, OpenningTick, null);
                    }                    
                }
            };
            argArr[i].addEventListener('click', eventObj);
        }
    }
    function CorrobRefuteTabResp(e) {
        if(!treeElems.hash[e.currentTarget.id].lit) {
            if(!Utility.html.CheckClass(e.target, 'aliasInputElem')) {
                treeElems.hash['CorrobTab'].Highlight();
                treeElems.hash['RefuteTab'].Highlight();
                // V+ treeElems.hash['ContribTab'].Downplay();
                treeElems.hash['CorrobRefutePanel'].Show();
                treeElems.hash['ContribPanel'].Hide();
            }
        }
    }
    function ClearDynElemsTreeProps() {
        // Whether they exist or not, no problems appear to be coming up.
        treeElems.ClearHash();
    }
    function SetTreeEventHdlrs() {

        // V+ ElemDyns.MakeDynamic(treeElems, 'ContribList');
        ElemDyns.MakeDynamic(treeElems, 'CorrobArgsList');
        ElemDyns.MakeDynamic(treeElems, 'RefuteArgsList');
        ElemDyns.MakeDynamic(treeElems, 'BranchFocusCont');

        // PARENT LIST ANIMATIONS/TRANSITIONS
        ElemDyns.MakeHidable(treeElems, 'ParentDispContBuffer');
        ElemDyns.AnimateExtensibility(treeElems, 'ParentArgsList', false);
        
        document.getElementById('ParentArgsBundle').addEventListener('click', function(event) {
            if(TreeHdlr.active.parentListComp && TreeHdlr.active.transitionDone) {
                TreeHdlr.active.parentListComp = false;
                TreeHdlr.active.transitionDone = false;
                Utility.html.ChangeClass(document.getElementById('ParentDispCont'), 'parentListCompressed', 'parentListExpanded');
                treeElems.hash['ParentArgsList'].Expand(0.2, function(transitioned) {
                    if(transitioned)
                        TreeHdlr.active.transitionDone = true;
                });
            }
            else if(!TreeHdlr.active.parentListComp && TreeHdlr.active.transitionDone) {
                // Do the opposite of everything above
                TreeHdlr.active.parentListComp = true;
                TreeHdlr.active.transitionDone = false;
                treeElems.hash['ParentArgsList'].Collapse(0.2, function(transitioned) {
                    if(transitioned) {
                        Utility.html.ChangeClass(document.getElementById('ParentDispCont'), 'parentListExpanded', 'parentListCompressed');
                        TreeHdlr.active.transitionDone = true;
                    }
                });
            }
        });

        SetParentArgEvents(treeElems.hash['ParentArgsList'].GetListItems());
        SetArgEvents(treeElems.hash['BranchFocusCont'].GetListItems());

        // CHILD ARG CONTAINER
        ElemDyns.MakeHighlightable(treeElems, 'CorrobTab', true, true);
        // V+ - Keeping this active for now because it adds css "activeFalse", maintaining disabled tab look
        ElemDyns.MakeHighlightable(treeElems, 'ContribTab', false, true);
        ElemDyns.MakeHighlightable(treeElems, 'RefuteTab', true, true);

        ElemDyns.MakeBillboard(treeElems, 'CorrobTabChildCount');
        // V+ ElemDyns.MakeBillboard(treeElems, 'ContribTabChildCount');
        ElemDyns.MakeBillboard(treeElems, 'RefuteTabChildCount');

        ElemDyns.MakeHidable(treeElems, 'CorrobRefutePanel');
        ElemDyns.MakeHidable(treeElems, 'ContribPanel');
        
        // treeElems.hash['CorrobTab'].elem.addEventListener('click', CorrobRefuteTabResp);
        // treeElems.hash['RefuteTab'].elem.addEventListener('click', CorrobRefuteTabResp);
        // V+
        // treeElems.hash['ContribTab'].elem.addEventListener('click', function(e) {
        //     if(!treeElems.hash['ContribTab'].lit) {
        //         treeElems.hash['CorrobTab'].Downplay();
        //         treeElems.hash['RefuteTab'].Downplay();
        //         treeElems.hash['ContribTab'].Highlight();
        //         treeElems.hash['CorrobRefutePanel'].Hide();
        //         treeElems.hash['ContribPanel'].Show();
        //     }
        // });

        // V+ SetArgEvents(treeElems.hash['ContribList'].GetListItems());
        SetArgEvents(treeElems.hash['CorrobArgsList'].GetListItems());
        SetArgEvents(treeElems.hash['RefuteArgsList'].GetListItems());

        // Alias edit buttons
        ElemDyns.MakeBillboard(treeElems, 'CorrobAliasText');
        ElemDyns.MakeBillboard(treeElems, 'RefuteAliasText');

        if(User.perms.isMod) {  
            // LEFT
            if(document.getElementById('LeftArgColEdit')) {
                ElemDyns.MakeHidable(treeElems, 'CorrobAliasText');
                ElemDyns.MakeHidable(treeElems, 'LeftArgColHeadInputField');
                ElemDyns.MakeBillboard(treeElems, 'LeftArgColHeadInputField');
                ElemDyns.MakeHidable(treeElems, 'LeftArgColHeadUpdateBtn');
                function ToggleLeftHeaderElems() {
                    treeElems.hash['CorrobAliasText'].ToggleVisibility();
                    treeElems.hash['LeftArgColHeadInputField'].ToggleVisibility();
                    treeElems.hash['LeftArgColHeadUpdateBtn'].ToggleVisibility();
                }
                document.getElementById('LeftArgColEdit').addEventListener('click', function() {
                    ToggleLeftHeaderElems();
                    if(!treeElems.hash['LeftArgColHeadInputField'].hidden) {
                        treeElems.hash['LeftArgColHeadInputField'].DisplayMsg(treeElems.hash['CorrobAliasText'].GetMsg());
                    }
                });
                if(!User.IsGuestAccount()) {
                    treeElems.hash['LeftArgColHeadUpdateBtn'].elem.addEventListener('click', function() {
                        if(treeElems.hash['LeftArgColHeadInputField'].elem.value != '') {
                            Network.Emit('SetTypeAlias', {
                                treeID: TreeHdlr.active.data._id,
                                idx: TreeHdlr.active.focalIdx,
                                isControlled: TreeHdlr.active.isControlled,
                                type: Consts.argTypes.CORROB,
                                alias: treeElems.hash['LeftArgColHeadInputField'].elem.value,
                            });
                            ToggleLeftHeaderElems();
                            treeElems.hash['CorrobAliasText'].DisplayMsg(treeElems.hash['LeftArgColHeadInputField'].elem.value);
                        }
                    });
                }
                // RIGHT
                ElemDyns.MakeHidable(treeElems, 'RefuteAliasText');
                ElemDyns.MakeHidable(treeElems, 'RightArgColHeadInputField');
                ElemDyns.MakeBillboard(treeElems, 'RightArgColHeadInputField');
                ElemDyns.MakeHidable(treeElems, 'RightArgColHeadUpdateBtn');
                function ToggleRightHeaderElems() {
                    treeElems.hash['RefuteAliasText'].ToggleVisibility();
                    treeElems.hash['RightArgColHeadInputField'].ToggleVisibility();
                    treeElems.hash['RightArgColHeadUpdateBtn'].ToggleVisibility();
                }
                document.getElementById('RightArgColEdit').addEventListener('click', function() {
                    ToggleRightHeaderElems();
                    if(!treeElems.hash['RightArgColHeadInputField'].hidden) {
                        treeElems.hash['RightArgColHeadInputField'].DisplayMsg(treeElems.hash['RefuteAliasText'].GetMsg());
                    }
                });
                if(!User.IsGuestAccount()) {
                    treeElems.hash['RightArgColHeadUpdateBtn'].elem.addEventListener('click', function() {
                        if(treeElems.hash['RightArgColHeadInputField'].elem.value != '') {
                            Network.Emit('SetTypeAlias', {
                                treeID: TreeHdlr.active.data._id,
                                idx: TreeHdlr.active.focalIdx,
                                isControlled: TreeHdlr.active.isControlled,
                                type: Consts.argTypes.REFUTE,
                                alias: treeElems.hash['RightArgColHeadInputField'].elem.value,
                            });
                            ToggleRightHeaderElems();
                            treeElems.hash['RefuteAliasText'].DisplayMsg(treeElems.hash['RightArgColHeadInputField'].elem.value);
                        }
                    });
                }
            }
        }
    }
    function GetTreeCB(resObj) {
        if(resObj.success) {

            // TODO: Get rid of this? Does any path lead to this not having treeData?
            if(resObj.treeData) {
                
                // Establish new url and make sure this is indeed a new tree coming in
                // This should really only be a redundancy anyway, should never fail
                var histObj = UpdatePath(resObj.treeData._id, resObj.isControlled, resObj.idx);
                if(histObj || resObj.forceSameURL) {

                    // Update permission data
                    User.perms = resObj.permObj;            

                    // Update user's own favourability calculations
                    User.favour = resObj.userFavour;

                    // Update local data
                    TreeHdlr.active.data = resObj.treeData;
                    TreeHdlr.active.submArgsAct = resObj.submArgsAct || { total:0, unviewed:0, branches:{} };

                    if(histObj)
                        TreeHdlr.IncrInteractions(resObj.idx, 1);

                    // Reset tree map
                    TreeMap.SetTree(resObj.treeData.branches);
                    TreeMap.SetLoadedPath(resObj.idx);

                    // Display new tree and reset events for it
                    //* Order here is fairly important
                    //- enable tab first or tab & panel will not load/show
                    //- get html in place before setting up events
                    PageHdlr.EnableTreeBtn();
                    // So far this only applies to mod invite acceptance, when same tree is currently loaded (changes with permissions)
                    PageHdlr.TreeDisp(resObj.treeString, !resObj.stayAtCurrPage, histObj, !!histObj && pushTreePath);

                    ClearDynElemsTreeProps();
                    SetTreeEventHdlrs();
  
                    // Update other tree-related panels/windows
                    TreeBuilder.PermissionsUpdate(resObj.permObj.isMod);

                    //* Order important here - do general tree update, then change message board.
                    // Show/hide all tree details
                    SliderLeft.TreeUpdate(
                        resObj.timeStamp,
                        resObj.tagString,                        
                        resObj.modActiveUsernames || null,
                        resObj.branchListString,
                        resObj.treeData.modChat, // will not exist for open tree
                        resObj.modInviteString || null,
                        resObj.guestInviteString || null
                    );

                    SideBar.TreeUpdate();

                    if(resObj.newRecentTreeVis)
                        ActivityPg.AddRecentTreeVisit(resObj.newRecentTreeVis);
                }
                else {
                    console.log("Already viewing this debate");
                    PageHdlr.TreeDisp();
                }
            }
            else
                console.log("No full tree data retrieved");

            if(OnTreeLoadCB) {
                OnTreeLoadCB();
                OnTreeLoadCB = null;
            }
        }
        else {
            PageHdlr.DisplayMsg(resObj.msg, 3);
            if(TreeHdlr.active.data)
                if(TreeHdlr.active.data._id == resObj.treeID && PageHdlr.state == pageStates.TREE)
                    PageHdlr.GoTo('/', false);
        }
        Main.UnPause();
    }
    function CreateTreeCB(resObj) {
        TreeBuilder.SubmitDataResponse(
            resObj.success,
            'Debate tree successfully created.',
            'Failed to create debate tree. Site creator has been notified.'
        );

        if(resObj.success) {
            if(User.loggedIn) {
                User.accountData.created.unshift(resObj.treeData._id);
                ActivityPg.AddCreatedTree(resObj.linkString);
                ActivityPg.AddTimelineItem(resObj.timelineString);
            }
            pushTreePath = true;
            GetTreeCB(resObj);
        }
    }

    function CreateBranchCB(resObj) {
        if(resObj.success) {

            // Update submArgsAct if this was created from a submitted branch
            if(resObj.submArgID)
                TreeHdlr.active.submArgsAct.branches[resObj.submBranchIdx].types[resObj.submType].args[resObj.submArgID].adoptions.push(resObj.newBranchIdx);

            TreeHdlr.active.data.branches.push(resObj.newBranchData);
            TreeHdlr.active.data.branches[resObj.newBranchData.parent].children[resObj.newBranchType].push(resObj.newBranchIdx);
            TreeHdlr.active.data.branches[resObj.newBranchData.parent].hasChildren = true;
            TreeHdlr.active.data.branches[resObj.newBranchData.parent].canEdit = false;
            
            // Update tree nav map
            TreeMap.SetTree(TreeHdlr.active.data.branches);
            // This just loads to the focal index, regardless of where added arg is.
            TreeMap.SetLoadedPath(TreeHdlr.active.focalIdx);

            if(resObj.replaceParent) {
                var replaceElem = Utility.html.FromString(TemplateHdlr.EJS_GetArg({
                    pathPartials: '',
                    treeCtrl: TreeHdlr.active.isControlled,
                    treeArch: !!TreeHdlr.active.data.archived,
                    idx: resObj.newBranchData.parent,
                    arg: TreeHdlr.active.data.branches[resObj.newBranchData.parent],
                    isFocalArg: resObj.newBranchData.parent == TreeHdlr.active.focalIdx,
                    permObj: User.perms,
                    strRating: User.GetStrRatings(TreeHdlr.active.data._id, TreeHdlr.active.isControlled, resObj.newBranchData.parent, true),
                    userFavour: User.favour,
                    argTypes: Consts.argTypes
                }));

                // Parent element captured before on "addArg" click
                argElemToAdjust.parentElement.replaceChild(replaceElem, argElemToAdjust);
                SetArgEvents([replaceElem]);
            }

            // BOOKMARK
            if(resObj.argString != '') {
                var argLI = Utility.html.FromString(resObj.argString);
                treeElems.hash[['CorrobArgsList', 'RefuteArgsList'][resObj.newBranchType]].AddHTMLNode(argLI);
                treeElems.hash[['CorrobTabChildCount', 'RefuteTabChildCount'][resObj.newBranchType]].DisplayMsg('(' + TreeHdlr.active.data.branches[resObj.newBranchData.parent].children[resObj.newBranchType].length + ')');
                // V+
                // treeElems.hash[['CorrobArgsList', 'RefuteArgsList', 'ContribList'][resObj.newBranchType]].AddHTMLNode(argLI);
                // treeElems.hash[['CorrobTabChildCount', 'RefuteTabChildCount', 'ContribTabChildCount'][resObj.newBranchType]].DisplayMsg('(' + TreeHdlr.active.data.branches[resObj.newBranchData.parent].children[resObj.newBranchType].length + ')');
                SetArgEvents([argLI]);
            }

            // Update sidebar branch list
            SliderLeft.AddBranch(resObj.blockString);
            SliderLeft.ReplaceBranch(resObj.newBranchData.parent, resObj.blockParentString);

            SideBar.ApplyLayoutChecks();

            if(resObj.timelineString)
                ActivityPg.AddTimelineItem(resObj.timelineString);
        }

        TreeBuilder.SubmitDataResponse(
            resObj.success,
            'Branch Created',
            'Failed to branch out argument. Site creator has been notified.'
        );
    }

    function CommonEditResp(resObj) {
        // TODO: Establish some manner of smooth transition for this, arg editting?
        // New arg could be much shorter or longer, may have new button/notif data displayed.
        var argElem = Utility.html.FromString(resObj.branchString, false);
        if(resObj.isFocused) {
            treeElems.hash['BranchFocusCont'].ClearInnards();
            treeElems.hash['BranchFocusCont'].AddHTMLNode(argElem);
        }
        else {
            var type = TreeHdlr.active.data.branches[resObj.idx].type;
            if(type == Consts.argTypes.CORROB)
                treeElems.hash['CorrobArgsList'].ReplaceHTMLNode(argElem, argElemToAdjust);
            else if(type == Consts.argTypes.REFUTE)
                treeElems.hash['RefuteArgsList'].ReplaceHTMLNode(argElem, argElemToAdjust);
            // V+ 
            // else // Must be EXT_CONTRIB
            //     treeElems.hash['ContribList'].ReplaceHTMLNode(argElem, argElemToAdjust);
        }
        SideBar.ApplyLayoutChecks();

        TreeMap.UpdateBranch(resObj.idx, TreeHdlr.active.data.branches[resObj.idx]);

        SetArgEvents([argElem]);
    }
    function EditBranchCB(resObj) {
        if (resObj.success) {
            TreeHdlr.active.data.branches[resObj.idx] = resObj.branchData;
            CommonEditResp(resObj);
            SliderLeft.ReplaceBranch(resObj.idx, resObj.blockString);
        }

        TreeBuilder.SubmitDataResponse(
            resObj.success,
            'Information editted',
            'Failed to edit information. Site creator has been notified.'
        );
    }
    function EditSrcsCB(resObj) {
        if (resObj.success) {
            TreeHdlr.active.data.branches[resObj.idx].sources = resObj.srcData;
            CommonEditResp(resObj);
        }

        TreeBuilder.SubmitDataResponse(
            resObj.success,
            'Sources editted',
            'Failed to edit information. Site creator has been notified.'
        );
    }

    function AddToChildList(idxList, dynObjList) {
        for(var i = 0, len = idxList.length; i < len; i++) {
            dynObjList.AddHTMLString(TemplateHdlr.EJS_GetArg({
                pathPartials: '',
                treeCtrl: TreeHdlr.active.isControlled,
                treeArch: !!TreeHdlr.active.data.archived,
                idx: idxList[i],
                arg: TreeHdlr.active.data.branches[idxList[i]],
                isFocalArg: false,
                permObj: User.perms,
                strRating: User.GetStrRatings(TreeHdlr.active.data._id, TreeHdlr.active.isControlled, idxList[i], true),
                userFavour: User.favour,
                argTypes: Consts.argTypes
            }));
        }
    }
    function GoToBranch(idx) {
        TreeHdlr.IncrInteractions(idx, 1);

        // Tree area fully black, scroll to top
        document.getElementById('TreePageBuffer').scrollTop = 0;
        //treeContScrollElem.scrollTo(0, 0);

        var parentHtmlString = '',
        parentChain = [],
        index = TreeHdlr.active.data.branches[idx].parent;
        while (index > -1) {
            parentChain.push(index);
            index = TreeHdlr.active.data.branches[index].parent;
        }

        if(parentChain.length > 0) {
            treeElems.hash['ParentDispContBuffer'].Show();
            for(var i = parentChain.length - 1; i >= 0; i--) {
                parentHtmlString += TemplateHdlr.EJS_GetParentArg({
                    treeCtrl: TreeHdlr.active.isControlled,
                    idx: parentChain[i],
                    arg: TreeHdlr.active.data.branches[parentChain[i]],
                    canViewRatings: User.perms.canViewRatings
                });
            }
        }
        else {
            treeElems.hash['ParentDispContBuffer'].Hide();
        }

        // Turn this into html elements first, not only for the next function call, but because these
        // need to be made functional still.
        var newParentArgs = Utility.html.FromString(parentHtmlString, true);
        SetParentArgEvents(newParentArgs);

        // TODO: Account for zero index (no arg branches)
        treeElems.hash['ParentArgsList'].QuickReplace(newParentArgs, true, function(newListLength) {
            TreeHdlr.active.parentListComp = true;
            TreeHdlr.active.transitionDone = true;
            Utility.html.ChangeClass(document.getElementById('ParentDispCont'), 'parentListExpanded', 'parentListCompressed');
            //document.getElementById('ParentArgsCount').textContent = newListLength;
            document.getElementById('ParentArgsCountCont').textContent = newListLength + ' parent branch' + ((newListLength > 1) ? 'es' : '');
        });        

        // Create new focal arg & replace
        treeElems.hash['BranchFocusCont'].NewInnards(TemplateHdlr.EJS_GetArg({
            pathPartials: '',
            treeCtrl: TreeHdlr.active.isControlled,
            treeArch: !!TreeHdlr.active.data.archived,
            idx: idx,
            arg: TreeHdlr.active.data.branches[idx],
            isFocalArg: true,
            permObj: User.perms,
            strRating: User.GetStrRatings(TreeHdlr.active.data._id, TreeHdlr.active.isControlled, idx, true),
            userFavour: User.favour,
            argTypes: Consts.argTypes
        }));

        // Focal branch isn't actually a list, but array of children is returned regardless
        SetArgEvents(treeElems.hash['BranchFocusCont'].GetListItems());

        treeElems.hash['CorrobAliasText'].DisplayMsg(TreeHdlr.active.data.branches[idx].typeAliases[Consts.argTypes.CORROB]);
        treeElems.hash['RefuteAliasText'].DisplayMsg(TreeHdlr.active.data.branches[idx].typeAliases[Consts.argTypes.REFUTE]);

        // Create new lower args & replace lists
        treeElems.hash['CorrobArgsList'].ClearInnards();
        // V+ treeElems.hash['ContribList'].ClearInnards();
        treeElems.hash['RefuteArgsList'].ClearInnards();

        var newChildren = TreeHdlr.active.data.branches[idx].children;
        AddToChildList(newChildren[Consts.argTypes.CORROB], treeElems.hash['CorrobArgsList']);
        AddToChildList(newChildren[Consts.argTypes.REFUTE], treeElems.hash['RefuteArgsList']);
        // V+ AddToChildList(newChildren[Consts.argTypes.EXT_CONTRIB], treeElems.hash['ContribList']);

        treeElems.hash['CorrobTabChildCount'].DisplayMsg('(' + newChildren[Consts.argTypes.CORROB].length + ')');
        treeElems.hash['RefuteTabChildCount'].DisplayMsg('(' + newChildren[Consts.argTypes.REFUTE].length + ')');
        // V+ treeElems.hash['ContribTabChildCount'].DisplayMsg('(' + newChildren[Consts.argTypes.EXT_CONTRIB].length + ')');

        // Make sure all the new args are functional
        SetArgEvents(treeElems.hash['CorrobArgsList'].GetListItems());
        SetArgEvents(treeElems.hash['RefuteArgsList'].GetListItems());
        // V+ SetArgEvents(treeElems.hash['ContribList'].GetListItems());

        SideBar.ApplyLayoutChecks();
        TreeMap.SetLoadedPath(idx);
    }
    function SetTypeAliasCB(resObj) {
        PageHdlr.DisplayMsg(resObj.msg, 3);
        if(resObj.success)
            TreeHdlr.active.data.branches[resObj.idx].typeAliases[resObj.type] = resObj.alias;
    }
    // Argument specific notifications
    function UpdateFBNotif(branchIdx) {
        if(submNotifToAdjust) {
            var argSubs = TreeHdlr.active.submArgsAct.branches[branchIdx] || {total: 0, unviewed: 0};
            if(argSubs.total > 0) {
                submNotifToAdjust.getElementsByClassName('viewSubmNotifTotal')[0].innerHTML = '' + argSubs.total;
                if(argSubs.unviewed > 0 && User.perms.isMod)
                    submNotifToAdjust.getElementsByClassName('viewSubmNotifUnviewed')[0].innerHTML = '(' + argSubs.unviewed + ')';
                else
                    submNotifToAdjust.getElementsByClassName('viewSubmNotifUnviewed')[0].innerHTML = '';
            }
            else 
                submNotifToAdjust.getElementsByClassName('viewSubmNotifTotal')[0].innerHTML = '';
        }
    }
    //* This data is tied to the tree, and will show with every controlled tree, regardless of user status
    function EditSubmArgData(idx, type, arg, unviewedVal) {
        var ptr = TreeHdlr.active.submArgsAct;
        ptr.total++;
        ptr.unviewed+= unviewedVal;

        if(!ptr.branches[idx]) {
            ptr.branches[idx] = {
                total: 0,
                unviewed: 0,
                types: {}
            };
        }
        ptr.branches[idx].total++;
        ptr.branches[idx].unviewed+= unviewedVal;
        
        if(!ptr.branches[idx].types[type]) {
            ptr.branches[idx].types[type] = {
                total: 0,
                unviewed: 0,
                args: {}
            };
        }
        ptr.branches[idx].types[type].total++;
        ptr.branches[idx].types[type].unviewed+= unviewedVal;

        ptr.branches[idx].types[type].args[arg._id] = arg;
    }
    function SubmArgCB(resObj) {
        if(resObj.success) {
            //var argID = resObj.argID || resObj.dataObj._id;
            
            // TODO: If this user has permission to view argSubs, do everything else necessary to have it show up right away.
            // Since mods can't subm args to their own trees, this will only be used for visitors - no unviewed tracking
            if(resObj.canViewFB)
                EditSubmArgData(resObj.branchIdx, resObj.argType, resObj.dataObj, 0);

            // Sent by logged in user
            if(resObj.timelineString)
                ActivityPg.AddTimelineItem(resObj.timelineString);
        }
        TreeBuilder.SubmitDataResponse(
            resObj.success, 
            'Argument sent', 
            'Failed to send argument. Site creator has been notified.'
        );
    }
    function DelFBTotal(branchIdx, fbType, keys) {
        var ptr = TreeHdlr.active.submArgsAct;
        var unviewedDel = 0;
        for(var i = 0; i < keys.length; i++) {
            var unviewedVal = ptr.branches[branchIdx].types[fbType].args[keys[i]].modViews[User.accountData._id] ? 0 : 1;
            unviewedDel += unviewedVal;
            ptr.total--;
            if(ptr.total < 1) {
                TreeHdlr.active.submArgsAct = { total:0, unviewed:0, branches:{} };
                return;
            }
            else {
                ptr.unviewed-= unviewedVal;
                ptr.branches[branchIdx].total--;
                if(ptr.branches[branchIdx].total < 1) {
                    delete ptr.branches[branchIdx];
                }
                else {
                    ptr.branches[branchIdx].unviewed-= unviewedVal;
                    ptr.branches[branchIdx].types[fbType].total--;
                    if(ptr.branches[branchIdx].types[fbType].total < 1) {
                        delete ptr.branches[branchIdx].types[fbType];
                    }
                    else {
                        ptr.branches[branchIdx].types[fbType].unviewed-= unviewedVal;
                        delete ptr.branches[branchIdx].types[fbType].args[keys[i]];
                    }
                }
            }
        }
        return unviewedDel;
    }
    function DelSubmFeedback(success, branchIdx, fbType, argKeyArr) {
        if(success) {
            PageHdlr.DisplayMsg('Feedback deleted', 2);
            var unviewedDel = DelFBTotal(branchIdx, fbType, argKeyArr);

            // Remove qty (total & unviewed) from notifications that encompass all debates
            if(User.loggedIn) {
                ActivityPg.DeletedFeedbackSubm(argKeyArr.length);
                ActivityPg.ViewedFeedbackSubm(unviewedDel);
            }

            UpdateFBNotif(branchIdx);                
            ActivityPg.UpdateFeedbackDisp();
            SliderLeft.UpdateArgSubmDisp(branchIdx);            
        }
        else
            PageHdlr.DisplayMsg('Failed to delete submission. Site creator has been notified.', 2);
    }
    function UpdatePath(treeID, isCtrl, idx) {
        var path = treeID + '?type=' + (isCtrl ? 'ctrl' : 'open') + '&idx=' + idx;
        if(PageHdlr.currPath == path)
            return null;
            
        // The treeID will be taken care of with any full data exchange
        TreeHdlr.active.isControlled = isCtrl;
        TreeHdlr.active.focalIdx = idx;                
        PageHdlr.currPath = path;
        // Return history object
        return {
            type: stateTypes.tree, 
            _id: treeID,
            isCtrl: isCtrl,
            idx: idx                
        }
    }
    
    return {
        active: {
            data: null,
            submArgsAct: { total:0, unviewed:0, branches:{} },
            isControlled: null,
            focalIdx: null,
            parentListComp: true,
            transitionDone: true
        },
        Init: function(loggedIn) {
            // Setup network calls
            Network.CreateResponse('GetTreeResp', GetTreeCB);
            Network.CreateResponse('CreateTreeResp', CreateTreeCB);
            Network.CreateResponse('CreateBranchResp', CreateBranchCB);
            Network.CreateResponse('EditBranchResponse', EditBranchCB);
            Network.CreateResponse('EditSrcsResponse', EditSrcsCB);
            Network.CreateResponse('LockEditOptResp', function(resObj) {
                TreeHdlr.active.data.branches[resObj.branchIdx].canEdit = false;

                var replaceArg = Utility.html.FromString(TemplateHdlr.EJS_GetArg({
                    pathPartials: '',
                    treeCtrl: true,
                    treeArch: false,
                    idx: resObj.branchIdx,
                    arg: TreeHdlr.active.data.branches[resObj.branchIdx],
                    isFocalArg: resObj.branchIdx == TreeHdlr.active.focalIdx,
                    permObj: User.perms,
                    strRating: -1, // Can't have any yet, until this edit lock takes hold
                    userFavour: User.favour,
                    argTypes: Consts.argTypes
                }));

                argElemToAdjust.parentElement.replaceChild(replaceArg, argElemToAdjust);
                SetArgEvents([replaceArg]);
                SideBar.ApplyLayoutChecks();
            });
            // BOOKMARK - This probably isn't even needed
            // Network.CreateResponse('ColSwapResp', function() {

            // });
            Network.CreateResponse('SetTypeAliasResp', SetTypeAliasCB);
            Network.CreateResponse('SubmArgResp', SubmArgCB);
            Network.CreateResponse('DeleteArgSubmResp', function (resObj) {
                DelSubmFeedback(resObj.success, resObj.branchIdx, resObj.fbType, [resObj.argKey]);
            });
            Network.CreateResponse('DeleteArgSubmMultiResp', function (resObj) {
                DelSubmFeedback(resObj.success, resObj.branchIdx, resObj.fbType, resObj.keyArr);
            });
            Network.CreateResponse('GetArgSubmDataResp', function (resObj) {
                var branch = TreeHdlr.active.data.branches[argCompIdx];
                TreeBuilder.CompareArgs({
                    asser: resObj.submArg.assertion,
                    elab: resObj.submArg.elaboration,
                    srcString: TemplateHdlr.GetSrcListEditDisp(resObj.submArg.sources)
                }, {
                    asser: branch.assertion,
                    elab: branch.elaboration,
                    srcString: TemplateHdlr.GetSrcListEditDisp(branch.sources)
                });
            });
            Network.CreateResponse('RateRevIntegResp', function(resObj) {
                if(resObj.success) {
                    // TODO: Make this more specific - send less data from server
                    User.SetRevIntData(resObj.revIntData);
                    TreeHdlr.active.data.branches[resObj.branchIdx].revision.integ.pos += resObj.deltaPos;
                    TreeHdlr.active.data.branches[resObj.branchIdx].revision.integ.neg += resObj.deltaNeg;
                }
                else
                    console.log('Failed to rate revision integrity.');
            });

            treeContScrollElem = document.getElementById('PagesWrapper');
            TreeTransMngr.Init(treeContScrollElem);
        },
        Load: function(resObj) {
            pushTreePath = true;
            GetTreeCB(resObj);
        },
        CreateNew: function(isControlled, title, asser, elab, src) {
            Network.Emit('PlantTree', {
                inRoom: User.perms.isMod && TreeHdlr.active.isControlled,
                roomName: TreeHdlr.active.data ? TreeHdlr.active.data._id : null, // Must use the current _id, the tree being left.
                accountID: User.accountData._id || null,
                username: User.accountData.username || null,
                roots: {
                    accountID: User.accountData._id || null,
                    title: title,
                    isControlled: isControlled,
                },
                trunk: {
                    parentIdx: -1,
                    type: Consts.argTypes.EXT_CONTRIB,
                    canEdit: false,
                    isControlled: isControlled,
                    assertion: asser,
                    elaboration: elab,
                    sources: src
                }
            });
        },
        CreateBranch: function(submArgAccountID, submArgUsername, submArgID, parentIdx, type, canEdit, asser, elab, sources) {
            var replaceParent = false;
            if(TreeHdlr.active.isControlled)
                if(TreeHdlr.active.data.branches[parentIdx].canEdit) {
                    replaceParent = true;
                    if(User.accountData.preferences.confMsgs.editLimit) // User preference check
                        if(!confirm('Once branched out, the argument being responded to can only have its sources editted. (Will not alter revision history)'))
                            return;
                }

            var subms = TreeHdlr.active.submArgsAct;
            var replSubmArgsAct = null;
            if(subms.branches[parentIdx]) {
                replSubmArgsAct = {branches: {}};
                replSubmArgsAct.branches[parentIdx] = {
                    total: subms.branches[parentIdx].total,
                    unviewed: subms.branches[parentIdx].unviewed
                };
            }
            Network.Emit('CreateBranch', {
                accountID: User.accountData ? User.accountData._id : null,
                username: User.accountData ? User.accountData.username : null,
                submArgAccountID: submArgAccountID,
                submArgUsername: submArgUsername,
                submArgID: submArgID,
                treeID: TreeHdlr.active.data._id,
                loggedIn: User.loggedIn,
                parentIdx: parentIdx,
                parentIsFocused: parentIdx == TreeHdlr.active.focalIdx,
                permObj: User.perms,
                replSubmArgsAct: replSubmArgsAct,
                type: type,
                isControlled: TreeHdlr.active.isControlled,
                canEdit: canEdit,
                replaceParent: replaceParent,
                assertion: asser,
                elaboration: elab,
                sources: sources
            });
        },
        EditBranch: function(idx, asser, elab, sources) {
            var replSubmArgsAct = null;
            if(TreeHdlr.active.submArgsAct.branches[idx]) {
                replSubmArgsAct = { branches: {} };
                replSubmArgsAct.branches[idx] = {
                    total: TreeHdlr.active.submArgsAct.branches[idx].total,
                    unviewed: TreeHdlr.active.submArgsAct.branches[idx].unviewed
                };
            }
            var emitObj = {
                treeID: TreeHdlr.active.data._id,
                branchIdx: idx,
                isFocused: TreeHdlr.active.focalIdx == idx,
                isControlled: TreeHdlr.active.isControlled,
                newArg: {
                    assertion: asser,
                    elaboration: elab,
                    sources: sources
                },
                userPerms: User.perms,
                replSubmArgsAct: replSubmArgsAct
            };
            if(TreeHdlr.active.isControlled) {
                emitObj['revision'] = {
                    timeStamp: TreeHdlr.active.data.branches[idx].timeStamp,
                    assertion: TreeHdlr.active.data.branches[idx].assertion,
                    elaboration: TreeHdlr.active.data.branches[idx].elaboration,
                    sources: TreeHdlr.active.data.branches[idx].sources,
                    rating: TreeHdlr.active.data.branches[idx].rating,
                };
            }
            Network.Emit('EditBranch', emitObj);
            // TODO: I've presumed to reset user interactions so far, but may actually need to send them up
            // to be incorporated into return strings.
        },
        EditSrcs: function(idx, sources) {
            Network.Emit('EditSrcs', {
                treeID: TreeHdlr.active.data._id,
                branchIdx: idx,
                isFocused: TreeHdlr.active.focalIdx == idx,
                isControlled: TreeHdlr.active.isControlled,
                sources: sources,
                userPerms: User.perms,
                strRating: User.GetStrRatings(TreeHdlr.active.data._id, TreeHdlr.active.isControlled, idx, true),
                userFavour: User.favour
            });
        },
        IncrInteractions: function(idx, incr) {
            if(TreeHdlr.active.data) {
                //? Do I even need to care about the local data for this?
                //console.log(idx);
                //console.log(TreeHdlr.active.data.branches);
                TreeHdlr.active.data.branches[idx].interactions.direct += incr;
                var parIndices = [];
                // 'Cumulative' increments start with current idx
                var parentIdx = idx;
                while(parentIdx > -1) {
                    TreeHdlr.active.data.branches[parentIdx].interactions.cumulative += incr;
                    parIndices.push(parentIdx);
                    parentIdx = TreeHdlr.active.data.branches[parentIdx].parent;
                }

                Network.Emit('IncrInteractionCount', {
                    treeID: TreeHdlr.active.data._id,
                    isCtrl: TreeHdlr.active.isControlled,
                    idx: idx,
                    parIndices: parIndices,
                    incr: incr
                });
            }
        },
        ViewedFeedbackSubm: function(branchIdx, type, argID) {
            TreeHdlr.active.submArgsAct.unviewed --;
            TreeHdlr.active.submArgsAct.branches[branchIdx].unviewed --;
            TreeHdlr.active.submArgsAct.branches[branchIdx].types[type].unviewed --;
            TreeHdlr.active.submArgsAct.branches[branchIdx].types[type].args[argID].modViews[User.accountData._id] = true;
    
            UpdateFBNotif(branchIdx);
        },
        KillViewFBBtn: function(branchIdx) {
            var viewFBBtn;
            if(TreeHdlr.active.focalIdx == branchIdx)
                viewFBBtn = document.getElementById('FocalBranch').getElementsByClassName('argViewFBLI')[0];
            else if(document.getElementById('VisChildArg' + branchIdx))
                viewFBBtn = document.getElementById('VisChildArg' + branchIdx).getElementsByClassName('argViewFBLI')[0];

            if(viewFBBtn)
                viewFBBtn.parentElement.removeChild(viewFBBtn);
        },
        SetNotifToAdjust: function(branchIdx) {
            submNotifToAdjust = null;
            if(TreeHdlr.active.focalIdx == branchIdx)
                submNotifToAdjust = document.getElementById('FocalBranch').getElementsByClassName('viewSubmNotifCont')[0];
            else if(document.getElementById('VisChildArg' + branchIdx))
                submNotifToAdjust = document.getElementById('VisChildArg' + branchIdx).getElementsByClassName('viewSubmNotifCont')[0];
        }, 
        GetActiveTreeTextContent: function(id) {
            return document.getElementById(id).textContent;
        },
        NegateActiveTree: function() {
            TreeHdlr.active = {
                data: null,
                submArgsAct: null,
                isControlled: null,
                focalIdx: null,
                parentListComp: true,
                transitionDone: true
            };
        },
        ClimbTree: function(branchIdx, OnTransStartCB, ClosingTickCB, OnCloseCB, ClosedTickCB, OpenningTickCB, OnOpenCB) {
            if(branchIdx != TreeHdlr.active.focalIdx) {
                TreeTransMngr.Resize(treeContScrollElem.scrollWidth, treeContScrollElem.scrollHeight);
                TreeTransMngr.TransClose(OnTransStartCB, ClosingTickCB, 
                    function(drawCtx) {
                        // History set here
                        GoToBranch(branchIdx);
                        
                        // Adjust url
                        var histObj = UpdatePath(TreeHdlr.active.data._id, TreeHdlr.active.isControlled, branchIdx)
                        PageHdlr.TreeDisp('', true, histObj, !!histObj);

                        if(OnCloseCB)
                            OnCloseCB(drawCtx);

                    }, function(drawCtx) {
                        var open = true;
                        if(ClosedTickCB)
                            open = ClosedTickCB(drawCtx);

                        if(open) {
                            TreeTransMngr.TransOpen(OpenningTickCB, function() {
                                OnTransitionOpenStd(branchIdx);
                                if(OnOpenCB)
                                    OnOpenCB();
                            });
                        }
                    }
                );
            }
            else {
                PageHdlr.DisplayMsg('Already loaded', 1);
            }
        },
        GoTo: function(treeID, idx, isCtrl, push, LoadTreeCB) {
            // This is needed to distinguish the back/forward buttons from any other forward call.
            pushTreePath = push;
            OnTreeLoadCB = LoadTreeCB;

            if(TreeHdlr.active.data) {
                // If it's the active tree, just switch over
                if(TreeHdlr.active.data._id == treeID) {
                    // Same branch, just show it, otherwise, climb branch
                    var histObj = UpdatePath(treeID, isCtrl, idx);
                    if(!!histObj)
                        GoToBranch(idx);

                    PageHdlr.TreeDisp('', true, histObj, !!histObj && pushTreePath);
                    if(OnTreeLoadCB) {
                        // TODO: Try to figure out how to make this delay no longer required.
                        // Using a callback at the end of PageHdlr.TreeDisp did not work.
                        OnTreeLoadCB();
                        OnTreeLoadCB = null;                       
                    }
                    return;
                }
            }

            // Otherwise, get new tree
            var getTreeDataObj = {
                accountID: null,
                username: null,
                blockers: [],
                strRatings: User.GetStrRatings(treeID, isCtrl),
                treeID: treeID,
                branchIdx: idx,
                isControlled: isCtrl,
                inRoom: User.perms.isMod && TreeHdlr.active.isControlled,
                roomName: TreeHdlr.active.data ? TreeHdlr.active.data._id : null, // Must use the current _id, the tree being left.
            }
            if(User.accountData) {
                getTreeDataObj['accountID'] = User.accountData._id;
                getTreeDataObj['username'] = User.accountData.username;
                getTreeDataObj['blockers'] = User.accountData.blockers;
            }

            Main.Pause(true);
            Network.Emit('GetTree', getTreeDataObj);
        },
        Refresh: function() {
            pushTreePath = false;
            if(TreeHdlr.active.data) {
                var getTreeDataObj = {
                    accountID: null,
                    username: null,
                    blockers: [],
                    strRatings: User.GetStrRatings(TreeHdlr.active.data._id, TreeHdlr.active.isControlled),
                    treeID: TreeHdlr.active.data._id,
                    branchIdx: TreeHdlr.active.focalIdx,
                    isControlled: TreeHdlr.active.isControlled,
                    inRoom: User.perms.isMod && TreeHdlr.active.isControlled,
                    roomName: TreeHdlr.active.data._id, // Must use the current _id, the tree being left.
                }
                if(User.accountData) {
                    getTreeDataObj['accountID'] = User.accountData._id;
                    getTreeDataObj['username'] = User.accountData.username;
                    getTreeDataObj['blockers'] = User.accountData.blockers;
                }
                Network.Emit('RefreshTree', getTreeDataObj);
            }
        }
    }
})();
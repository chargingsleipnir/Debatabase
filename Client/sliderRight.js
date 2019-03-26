var SliderRight = (function () {

    var pgOverlapElems = new DynElemCont();
    var fullyOpen = false;

    function MapResize() {
        if(!pgOverlapElems.hash['TreeMapCont'].hidden)
            TreeMap.Resize(pgOverlapElems.hash['TreeMapCont'].elem.offsetWidth, pgOverlapElems.hash['TreeMapCont'].elem.offsetHeight);
    }

    return {
        Init: function(loggedIn) {

            ElemDyns.MakeBillboard(pgOverlapElems, 'SliderRightHeaderText');

            ElemDyns.MakeTransitional(pgOverlapElems, 'SliderRight', function(event, animPosEnded) {
                if(animPosEnded) {
                    fullyOpen = true;
                    CssTransMngr.AddToQueue('SliderRight', pgOverlapElems.hash['SliderRight'].AnimateNeg);
                }
                else {
                    fullyOpen = false;
                    SliderRight.StopTreeMap();
                    TreeBuilder.Close();
                }
            });

            document.getElementById('SliderRightHeader').addEventListener('click', function(event) {
                if(Utility.html.CheckClass(event.target, 'closeBtn'))
                    SliderRight.Close();
            });

            // TREE BRANCH STRUCTURE CANVAS NAVIGATION ========================================================
            document.getElementById('LocationBtn').addEventListener('click', function() {
                SliderRight.ViewTreeMap();
            });

            // TODO: Maybe Set Treemap resizing for side panel hiding as well?
            // Can't get a general element resize function, so I'd have to
            // specifically have the canvas width jump once the sidebar is hidden. Not ideal...
            // This includes the footer as well, sliding up and down
            ElemDyns.MakeHidable(pgOverlapElems, 'TreeMapCont');
            MapResize();
            window.addEventListener('resize', MapResize);
            pgOverlapElems.hash['TreeMapCont'].Hide();

            TreeBuilder.Init(loggedIn);
        },
        DisplayMsg: function(msg) {
            pgOverlapElems.hash['SliderRightHeaderText'].DisplayMsg(msg);
        },
        Open: function() {
            if(!pgOverlapElems.hash['SliderRight'].animPos) {
                CssTransMngr.AddToQueue('SliderRight', function() {
                    MapResize();
                    pgOverlapElems.hash['SliderRight'].AnimatePos();
                });
                CssTransMngr.LaunchQueue();
            }
        },
        Close: function() {
            // I hope this doesn't cause a problem - added to prevent infinite loops
            if(fullyOpen) {
                CssTransMngr.LaunchQueue();
            }
        },
        CloseImm: function() {
            CssTransMngr.RemoveFromQueue('SliderRight');
            pgOverlapElems.hash['SliderRight'].SetDuration(0);
            pgOverlapElems.hash['SliderRight'].AnimateNeg();
            // With duration at 0, the endTransition event does not fire. Hence, below
            fullyOpen = false;
            SliderRight.StopTreeMap();
        },
        ResetTransDur: function() {
            pgOverlapElems.hash['SliderRight'].RestoreDuration();
        },
        CheckSlidePanelClosed: function(clickedElem) {
            if(clickedElem.id == 'LocationBtn')
                return;
            if(Utility.html.CheckClass(clickedElem, 'treeBuildBtn'))
                return;
            if(pgOverlapElems.hash['SliderRight'].elem.contains(clickedElem))
                return;

            SliderRight.Close();
        },
        ViewTreeMap: function() {
            pgOverlapElems.hash['SliderRightHeaderText'].DisplayMsg('Debate Map Navigation');
            if(fullyOpen) {
                if(!pgOverlapElems.hash['TreeMapCont'].hidden) {
                    SliderRight.Close();
                    return;
                }                
            }
            TreeBuilder.Close();
            pgOverlapElems.hash['TreeMapCont'].Show();
            MapResize();
            TreeMap.Run();
            SliderRight.Open();
        },
        StopTreeMap: function() {
            if(!pgOverlapElems.hash['TreeMapCont'].hidden) {
                TreeMap.Stop();
                pgOverlapElems.hash['TreeMapCont'].Hide();
            }
        }
    };
})();

var TreeBuilder = (function () {

    var builderElems = new DynElemCont();
    var argIdx_G = null;
    var srcTextField, srcURLField;
    var revRatingRepeat = true;

    var addSrcBtnEditMode = false;
    var editBtnElem;
    var editSrcElem;

    var SubmitDataBtnEvent = function(){},
        EditDataBtnEvent = function(){},
        GoToBranchBtnEvent = function(){};

    function GetSources() {
        var sources = [],
            sourceList = builderElems.hash['TB_TopRight'].subElems['argSources'].GetListItems();
        for (var i = 0, sourceLen = sourceList.length; i < sourceLen; i++) {
            var aTag = sourceList[i].getElementsByTagName('a')[0];
            sources.push({
                text: aTag.textContent,
                url: aTag.href
            });
        }
        return sources;
    }
    function CheckMinCreateData(checkTitle) {
        var blankHeadField = false;
        if(checkTitle) {
            if (builderElems.hash['TitleSubmField'].elem.value == '') {
                builderElems.hash['TitleSubmField'].Highlight();
                blankHeadField = true;
            }
        }
        if (!builderElems.hash['AsserSubmField'].HasMsg()) {
            builderElems.hash['AsserSubmField'].Highlight();
            blankHeadField = true;
        }
        return blankHeadField;
    }
    function CreateTreeChecks(checkTitle) {
        // First, check fields for valid data
        if(CheckMinCreateData(checkTitle)) {
            PageHdlr.DisplayMsg('Minimum of debate title and assertion required.', 3);
            return false;
        }
        return true;
    }
    function SetArg(type, parentIdx, submArgAccountID, submArgUsername, submArgID) {
        // First, check fields for valid data
        if(CheckMinCreateData(false)) {
            PageHdlr.DisplayMsg('Minimum of argument assertion required.', 3);
            return;
        }

        TreeHdlr.CreateBranch(
            submArgAccountID,
            submArgUsername,
            submArgID,
            parentIdx,
            type,
            TreeHdlr.active.isControlled ? !document.getElementById('PresetEditLockCheck').checked : false, // No editting for open trees
            builderElems.hash['AsserSubmField'].GetMsg(),
            builderElems.hash['ElabSubmField'].GetMsg(),
            GetSources()
        );
    }
    function CommonTreeCreate() {
        builderElems.hash['TB_TopRight'].Show();
        builderElems.hash['TB_TopRightHeader'].Show();
        builderElems.hash['SubmDataRight'].Show();
        builderElems.hash['TitleSubmField'].Show();
        builderElems.hash['AsserSubmField'].Show();
        builderElems.hash['SubmOptionalMsg'].Show();
        builderElems.hash['ElabSubmField'].Show();
        builderElems.hash['SrcListMgmtCont'].Show();
        builderElems.hash['SubmitDataBtn'].Show();
    }
    function CommonArgSet() {
        CommonTreeCreate();
        builderElems.hash['TitleSubmField'].Hide();
    }
    function CommonSubmSetup(dispObj, dispRightHeaderText) {
        builderElems.hash['TB_TopLeftHeader'].DisplayMsg('Responding to:');
        BasicTB_TopLeftFill(dispObj);
        builderElems.hash['TB_TopRightHeader'].Show();
        builderElems.hash['TB_TopRightHeader'].DisplayMsg(dispRightHeaderText);
        CommonArgSet();
    }
    function CommonFeedbackBasics() {
        builderElems.hash['TB_TopRight'].Show();
        builderElems.hash['TB_TopRightDisp'].Show();
        builderElems.hash['TB_TopRightDisp'].subElems['asserDisp'].Show();
        builderElems.hash['TB_TopRightDisp'].subElems['elabDisp'].Show();
        builderElems.hash['TB_TopRightDisp'].subElems['srcListDisp'].Show();
    }
    function CommonFeedbackDetails() {
        builderElems.hash['TB_TopRightDisp'].subElems['detailDisp'].Show();
        builderElems.hash['TB_TopRightDisp'].subElems['dateDisp'].Show();
        builderElems.hash['TB_TopRightDisp'].subElems['senderDisp'].Show();
        builderElems.hash['TB_TopRightDisp'].subElems['adoptedIdxDisp'].Show();
    }
    function ClearTB_TopRightDisp() {
        builderElems.hash['TB_TopRightDisp'].subElems['asserDisp'].ClearMsg();
        builderElems.hash['TB_TopRightDisp'].subElems['elabDisp'].ClearMsg();
        builderElems.hash['TB_TopRightDisp'].subElems['srcListDisp'].ClearInnards();
        builderElems.hash['TB_TopRightDisp'].subElems['progBarDisp'].ClearInnards();
        builderElems.hash['TB_TopRightDisp'].subElems['dateDisp'].ClearMsg();
        builderElems.hash['SubmArgSenderBtn'].ClearMsg();
        builderElems.hash['TB_TopRightDisp'].subElems['adoptedIdxDisp'].ClearInnards();
    }
    function CommonTB_TopRightDispVisToggle() {
        builderElems.hash['TB_TopRightDisp'].ToggleVisibility();

        builderElems.hash['SubmDataRight'].ToggleVisibility();
        builderElems.hash['AsserSubmField'].ToggleVisibility();
        builderElems.hash['SubmOptionalMsg'].ToggleVisibility();
        builderElems.hash['ElabSubmField'].ToggleVisibility();
        builderElems.hash['SrcListMgmtCont'].ToggleVisibility();
        builderElems.hash['PresetEditLockBtn'].ToggleVisibility();
        builderElems.hash['ArgAliasSelCont'].ToggleVisibility();
    }
    function BasicTB_TopLeftFill(dispObj) {
        builderElems.hash['TB_TopLeft'].Show();
        builderElems.hash['TB_TopLeft'].subElems['asserDisp'].DisplayMsg(dispObj.asser);
        builderElems.hash['TB_TopLeft'].subElems['elabDisp'].Show();
        builderElems.hash['TB_TopLeft'].subElems['elabDisp'].DisplayMsg(dispObj.elab);
        builderElems.hash['TB_TopLeft'].subElems['srcListDisp'].Show();
        builderElems.hash['TB_TopLeft'].subElems['srcListDisp'].NewInnards(dispObj.srcString);
    }
    function ClearTB_TopLeftDisp() {
        builderElems.hash['TB_TopLeft'].subElems['asserDisp'].ClearMsg();
        builderElems.hash['TB_TopLeft'].subElems['elabDisp'].ClearMsg();
        builderElems.hash['TB_TopLeft'].subElems['srcListDisp'].ClearInnards();
        builderElems.hash['TB_TopLeft'].subElems['progBarDisp'].ClearInnards();
    }
    function ArgSubmitDataFill(dispObj) {
        builderElems.hash['AsserSubmField'].DisplayMsg(dispObj.asser);
        builderElems.hash['ElabSubmField'].DisplayMsg(dispObj.elab);
        builderElems.hash['TB_TopRight'].subElems['argSources'].QuickReplace(dispObj.srcString, false, function(newLength) {});
    }
    function ClearRightSubmFields() {
        builderElems.hash['TitleSubmField'].elem.value = '';
        builderElems.hash['AsserSubmField'].ClearMsg();
        builderElems.hash['ElabSubmField'].ClearMsg();
        builderElems.hash['TB_TopRight'].subElems['argSources'].ClearInnards();
        srcTextField.value = '';
        srcURLField.value = '';
    }

    function HideTopRightAndReturnToViewMode() {
        if(!builderElems.hash['BackToDataBtn'].hidden)
            builderElems.hash['BackToDataBtn'].elem.click();
        ClearTB_TopRightDisp();
        builderElems.hash['TB_TopRightDisp'].Hide();

        builderElems.hash['EditDataBtn'].Hide();
        builderElems.hash['PresetEditLockBtn'].Hide();
    }

    function ChangeFeedbackType(argType) {
        HideTopRightAndReturnToViewMode();

        builderElems.hash['TB_RefList'].QuickReplace(TemplateHdlr.EJS_GetSubmList(argIdx_G, argType), false, function(listLen, items) {

            // Load avatars
            var imgTags = builderElems.hash['TB_RefList'].elem.getElementsByClassName('userImg');
            for(var i = 0; i < imgTags.length; i++)
                Main.GetImgSrc(imgTags[i].getAttribute('data-accountID'), imgTags[i]);

            DataListHdlr.SetData(items,
                function(argKey) {
                    if(argKey == -1) {
                        HideTopRightAndReturnToViewMode();
                        return;
                    }

                    if(!builderElems.hash['BackToDataBtn'].hidden)
                        builderElems.hash['BackToDataBtn'].elem.click();
                    
                    var submObj = TreeHdlr.active.submArgsAct.branches[argIdx_G].types[argType].args[argKey];
                    if(submObj) {
                        if(User.perms.isMod && !TreeHdlr.active.data.archived) {
                            if(!User.IsGuestAccount()) {
                                if(!submObj.modViews[User.accountData._id]) {
                                    Network.Emit('ViewedSubmArg', {
                                        modID: User.accountData._id,
                                        argID: argKey,
                                        idx: argIdx_G,
                                        typeKey: argType,
                                    });
                                }
                            }
                            builderElems.hash['EditDataBtn'].Show();
                        }
                        builderElems.hash['TB_TopRightDisp'].Show();

                        SuggSubmHandler(submObj, true, function() {
                            var selElem = builderElems.hash['ArgAliasSel'].elem;

                            // TODO: If I want to use avatars beside the names of arg submitters in the main tree view,
                            // I'll need to send & save the accountIDs along with the arg ids and usernames, then load the img tag into the arg html

                            SetArg(selElem.options[selElem.selectedIndex].value, argIdx_G, submObj.accountID, submObj.username, argKey);
                        });
                    }
                    else
                        LastFBIdxDeleted();
                }, 
                function(argKey, deleteElem, listLen) {
                    if(!User.IsGuestAccount()) {
                        builderElems.hash['TB_RefList'].Pop(deleteElem, function() {
                            Network.Emit('DeleteArgSubm', {
                                argID: argKey,
                                archiverID: User.accountData._id,
                                idx: argIdx_G,
                                type: argType
                            });
                            if(listLen < 1)
                                LastFBIdxDeleted();
                        });
                    }
                },
                function(keyArr, deleteElems, listLen) {
                    if(!User.IsGuestAccount()) {
                        var arrLen = keyArr.length;
                        builderElems.hash['TB_RefList'].PopMulti(deleteElems, arrLen, function() {
                            Network.Emit('DeleteArgSubmMulti', {
                                keyArr: keyArr,
                                archiverID: User.accountData._id,
                                idx: argIdx_G,
                                type: argType
                            });
                            if(listLen < 1)
                                LastFBIdxDeleted();
                        });
                    }
                }
            );
        });
    }
    function CloseAll() {
        //SliderRight.Close();
        builderElems.hash['TreeBuildCont'].Hide();
        ElemDyns.HideGroup(builderElems, ['TreeBuildCont', 'ContBottom']);

        CloseTB_TopLeft();
        CloseTB_TopMid();
        CloseTB_TopRight();

        Utility.html.ChangeClass(builderElems.hash['TB_TopLeft'].elem, 'swapOrderTrue', 'swapOrderFalse');

        var selElem = builderElems.hash['ArgTypeSel'].elem;
        for(var i = 0; i < selElem.options.length; i++)
            selElem.options[i].removeAttribute('disabled', '');

        DataListHdlr.AdjustDispIncrs(0);
    }
    function CloseTB_TopLeft() {
        ElemDyns.HideGroup(builderElems, ['TB_TopLeft', 'TB_TopLeftGoToBranchBtn',]);
        builderElems.hash['TB_TopLeft'].subElems['srcListDisp'].Hide();
        builderElems.hash['TB_TopLeft'].subElems['progBarDisp'].Hide();
        ClearTB_TopLeftDisp();
    }
    function CloseTB_TopMid() {
        ElemDyns.HideGroup(builderElems, [
            'TB_TopMid',
            'ArgTypeSel',
            'ArgBatchSel',
            'RefListOptsBtns'
        ]);

        Utility.html.ChangeClass(builderElems.hash['TB_TopMid'].elem, 'swapOrderTrue', 'swapOrderFalse');
    }
    function CloseTB_TopRight() {
        ElemDyns.HideGroup(builderElems, [
            'TB_TopRight',
            'TB_TopRightHeader',
            'TB_TopRightDisp',
            'SubmDataRight',
            'TitleSubmField',
            'AsserSubmField',
            'SubmOptionalMsg',
            'ElabSubmField',
            'SrcListMgmtCont',
            'PresetEditLockBtn',
            'ArgAliasSelCont',
            'SubmitDataBtn',
            //'DeleteDataBtn',
            'EditDataBtn',
            'BackToDataBtn'
        ]);

        SrcEditModeOff();

        builderElems.hash['TB_TopRightDisp'].subElems['elabDisp'].Hide();
        builderElems.hash['TB_TopRightDisp'].subElems['srcListDisp'].Hide();
        builderElems.hash['TB_TopRightDisp'].subElems['progBarDisp'].Hide();
        builderElems.hash['TB_TopRightDisp'].subElems['detailDisp'].Hide();
        builderElems.hash['TB_TopRightDisp'].subElems['dateDisp'].Hide();
        builderElems.hash['TB_TopRightDisp'].subElems['senderDisp'].Hide();
        builderElems.hash['TB_TopRightDisp'].subElems['adoptedIdxDisp'].Hide();

        Utility.html.ChangeClass(builderElems.hash['TB_TopRight'].elem, 'createWindOpen', 'createWindClosed');
        ClearTB_TopRightDisp();
        ClearRightSubmFields();
    }
    function CheckSelectOpts() {
        var selElem = builderElems.hash['ArgTypeSel'].elem;
        for(var i = 0; i < selElem.options.length; i++) {
            if(!selElem.options[i].hasAttribute('disabled')) {
                selElem.options[i].selected = true;
                ChangeFeedbackType(Number(selElem.options[i].value));
                return true;
            }
        }
        return false;
    }
    function LastFBIdxDeleted() {
        var selElem = builderElems.hash['ArgTypeSel'].elem;
        selElem.options[selElem.selectedIndex].setAttribute('disabled', '');
        if(!CheckSelectOpts()) {
            TreeHdlr.KillViewFBBtn(argIdx_G);
            SliderRight.Close();
        }
    }
    function SuggSubmHandler(suggObj, colSelNeeded, SubmDataCB) {
        var date = new Date(suggObj.timeStamp);
        builderElems.hash['TB_TopRightDisp'].subElems['asserDisp'].DisplayMsg(suggObj.assertion);
        builderElems.hash['TB_TopRightDisp'].subElems['elabDisp'].DisplayMsg(suggObj.elaboration);
        builderElems.hash['TB_TopRightDisp'].subElems['srcListDisp'].NewInnards(User.perms.isMod ? TemplateHdlr.GetSrcListEditDisp(suggObj.sources) : TemplateHdlr.EJS_GetSrcList(suggObj.sources, false));
        builderElems.hash['TB_TopRightDisp'].subElems['dateDisp'].DisplayMsg('Date: ' + SuppFuncs.FormatDate(date));
        builderElems.hash['SubmArgSenderBtn'].DisplayMsg(suggObj.username);
        if(suggObj.accountID) {
            builderElems.hash['SubmArgSenderBtn'].elem.removeAttribute('disabled', '');
            Utility.html.ChangeClass(builderElems.hash['SubmArgSenderBtn'].elem, 'fromAccountFalse', 'fromAccountTrue');
        }
        else {
            builderElems.hash['SubmArgSenderBtn'].elem.setAttribute('disabled', '');
            Utility.html.ChangeClass(builderElems.hash['SubmArgSenderBtn'].elem, 'fromAccountTrue', 'fromAccountFalse');
        }

        var adoptCountString = 'Adopted to create ' + suggObj.adoptions.length + ' argument';
        if(suggObj.adoptions.length != 1) adoptCountString += 's';
        builderElems.hash['TB_TopRightDisp'].subElems['adoptedIdxDisp'].NewInnards(adoptCountString);

        EditDataBtnEvent = function () {
            // Transfer the information into the edit fields, prepping for adoption
            CommonTB_TopRightDispVisToggle();
            if(!colSelNeeded)
                builderElems.hash['ArgAliasSelCont'].Hide();

            builderElems.hash['EditDataBtn'].Hide();
            //builderElems.hash['DeleteDataBtn'].Hide();
            builderElems.hash['SubmitDataBtn'].Show();
            builderElems.hash['BackToDataBtn'].Show();

            var srcEditString = '';
            if(suggObj.sources.length > 0)
                for (var i = 0, len = suggObj.sources.length; i < len; i++)
                    srcEditString += TemplateHdlr.GetSrc(suggObj.sources[i].text, suggObj.sources[i].url);

            ArgSubmitDataFill({
                asser: suggObj.assertion,
                elab: suggObj.elaboration || '',
                srcString: srcEditString
            });
        };
        // If btn becomes more prevalent in the future... BackToDataBtnEvent = reverse of above function
        SubmitDataBtnEvent = SubmDataCB;
    }

    function SendRevIntegInput(deltaPos, deltaNeg, newInput) {
        ChangeRevBtnDisp(newInput);
        builderElems.hash['RevisIntegDispPos'].DisplayMsg(Number(builderElems.hash['RevisIntegDispPos'].GetMsg()) + deltaPos);
        builderElems.hash['RevisIntegDispNeg'].DisplayMsg(Number(builderElems.hash['RevisIntegDispNeg'].GetMsg()) + deltaNeg);
        
        if(!revRatingRepeat)
            TreeHdlr.IncrInteractions(argIdx_G, 1);

        Network.Emit('RateRevInteg', { 
            accountID: User.accountData._id, 
            treeID: TreeHdlr.active.data._id,
            branchIdx: argIdx_G,
            deltaPos: deltaPos,
            deltaNeg: deltaNeg,
            newInput: newInput
        });    
    }
    function ChangeRevBtnDisp(rating) {
        if(rating == 1) {
            Utility.html.ChangeClass(builderElems.hash['RevIntegBtnPos'].elem, 'switchActiveFalse', 'switchActiveTrue');
            Utility.html.ChangeClass(builderElems.hash['RevIntegBtnNeg'].elem, 'switchActiveTrue', 'switchActiveFalse');
        }
        else if(rating == -1) {
            Utility.html.ChangeClass(builderElems.hash['RevIntegBtnNeg'].elem, 'switchActiveFalse', 'switchActiveTrue');
            Utility.html.ChangeClass(builderElems.hash['RevIntegBtnPos'].elem, 'switchActiveTrue', 'switchActiveFalse');
        }
        else if(rating == 0) {
            Utility.html.ChangeClass(builderElems.hash['RevIntegBtnPos'].elem, 'switchActiveTrue', 'switchActiveFalse');
            Utility.html.ChangeClass(builderElems.hash['RevIntegBtnNeg'].elem, 'switchActiveTrue', 'switchActiveFalse');
        }
    }

    function ChangePanelCommon(header) {
        SliderRight.DisplayMsg(header);
        CloseAll();
        SliderRight.StopTreeMap();
    }

    function SrcEditModeOff() {
        srcTextField.value = '';
        srcURLField.value = '';
        ElemDyns.HideUnregisteredColl(builderElems.hash['TB_TopRight'].subElems['argSources'].elem.getElementsByClassName('editSrcInd'));
        builderElems.hash['EditSrcInd'].Hide();
        addSrcBtnEditMode = false;
        editBtnElem = null;
    }

    return {
        Init: function(loggedIn) {         
            ElemDyns.MakeHidable(builderElems, 'TreeBuildCont');

            /* HEAD SECTION */
            document.getElementById('ArgTypeSel').addEventListener('change', function(event) {
                ChangeFeedbackType(Number(event.target.options[event.target.selectedIndex].value));
            });
            
            DataListHdlr.SetCtrlElems(
                document.getElementById('RefListAll'),
                document.getElementById('RefListTrash'),
                document.getElementById('RefListCurrText'),
                document.getElementById('RefListTotalText')
            );

            Network.CreateResponse('ViewedSubmArgResp', function(resObj) {
                if(resObj.success) {
                    if(User.loggedIn)
                        ActivityPg.ViewedFeedbackSubm(1);

                    TreeHdlr.ViewedFeedbackSubm(resObj.branchIdx, resObj.argType, resObj.argID);
                    User.ViewedFeedbackSubm(resObj.branchIdx, resObj.argType, resObj.argID);
                    ActivityPg.UpdateFeedbackDisp();
                    SliderLeft.UpdateArgSubmDisp(resObj.branchIdx);
                }
            });

            /* TREE BUILD CONT LEFT */

            ElemDyns.MakeHidable(builderElems, 'TB_TopLeft');
            ElemDyns.MakeBillboard(builderElems, 'TB_TopLeftHeader');
            ElemDyns.MakeHidable(builderElems, 'TB_TopLeftGoToBranchBtn');
            ElemDyns.MakeDynamic(builderElems, 'TB_TopLeftBody');
            ElemDyns.MakeBillboard(builderElems, ['TB_TopLeft', 'asserDisp']);
            ElemDyns.MakeHidable(builderElems, ['TB_TopLeft', 'elabDisp']);
            ElemDyns.MakeBillboard(builderElems, ['TB_TopLeft', 'elabDisp']);
            ElemDyns.MakeDynamic(builderElems, ['TB_TopLeft', 'srcListDisp']);
            ElemDyns.MakeHidable(builderElems, ['TB_TopLeft', 'srcListDisp']);
            ElemDyns.MakeDynamic(builderElems, ['TB_TopLeft', 'progBarDisp']);
            ElemDyns.MakeHidable(builderElems, ['TB_TopLeft', 'progBarDisp']);

            builderElems.hash['TB_TopLeftGoToBranchBtn'].elem.addEventListener('click', function() {
                GoToBranchBtnEvent(); 
            });

            /* TREE BUILD CONT MIDDLE */
            ElemDyns.MakeHidable(builderElems, 'TB_TopMid');
            ElemDyns.MakeHidable(builderElems, 'ArgTypeSel');
            ElemDyns.MakeHidable(builderElems, 'ArgBatchSel');
            ElemDyns.MakeHidable(builderElems, 'RefListOptsBtns');
            ElemDyns.AnimateExtensibility(builderElems, 'TB_RefList', true);

            if(loggedIn) {
                builderElems.hash['ArgBatchSel'].elem.addEventListener('change', function(event) {
                    if(User.submArgs.out.batchNum != event.target.options[event.target.selectedIndex].value) {
                        User.submArgs.out.batchNum = event.target.options[event.target.selectedIndex].value;
                        Network.Emit('GetSubmDataBatch', {
                            accountID: User.accountData._id,
                            batchNum: User.submArgs.out.batchNum,
                            freshOpen: false
                        });
                    }
                });
            }

            /* TREE BUILD CONT RIGHT */

            ElemDyns.MakeHidable(builderElems, 'TB_TopRight');
            ElemDyns.MakeHidable(builderElems, 'TB_TopRightHeader');
            ElemDyns.MakeBillboard(builderElems, 'TB_TopRightHeader');
            ElemDyns.MakeHidable(builderElems, 'TB_TopRightDisp');
            ElemDyns.MakeHidable(builderElems, ['TB_TopRightDisp', 'asserDisp']);
            ElemDyns.MakeBillboard(builderElems, ['TB_TopRightDisp', 'asserDisp']);
            ElemDyns.MakeHidable(builderElems, ['TB_TopRightDisp', 'elabDisp']);
            ElemDyns.MakeBillboard(builderElems, ['TB_TopRightDisp', 'elabDisp']);
            ElemDyns.MakeHidable(builderElems, ['TB_TopRightDisp', 'srcListDisp']);
            ElemDyns.MakeDynamic(builderElems, ['TB_TopRightDisp', 'srcListDisp']);
            ElemDyns.MakeHidable(builderElems, ['TB_TopRightDisp', 'progBarDisp']);
            ElemDyns.MakeDynamic(builderElems, ['TB_TopRightDisp', 'progBarDisp']);
            ElemDyns.MakeHidable(builderElems, ['TB_TopRightDisp', 'detailDisp']);
            ElemDyns.MakeHidable(builderElems, ['TB_TopRightDisp', 'dateDisp']);
            ElemDyns.MakeBillboard(builderElems, ['TB_TopRightDisp', 'dateDisp']);
            ElemDyns.MakeHidable(builderElems, ['TB_TopRightDisp', 'senderDisp']);
            ElemDyns.MakeBillboard(builderElems, 'SubmArgSenderBtn');
            ElemDyns.MakeHidable(builderElems, ['TB_TopRightDisp', 'adoptedIdxDisp']);

            builderElems.hash['SubmArgSenderBtn'].elem.addEventListener('click', function(event) {
                SearchPg.SearchForUser(event.target.value);
                SliderRight.Close();
            });

            ElemDyns.MakeHidable(builderElems, 'SubmDataRight');
            ElemDyns.MakeHidable(builderElems, 'TitleSubmField');
            ElemDyns.MakeHighlightable(builderElems, 'TitleSubmField', false, false);
            ElemDyns.MakeHidable(builderElems, 'AsserSubmField');
            ElemDyns.MakeBillboard(builderElems, 'AsserSubmField');
            ElemDyns.MakeHighlightable(builderElems, 'AsserSubmField', false, false);
            builderElems.hash['TitleSubmField'].elem.addEventListener('keyup', function(event) { builderElems.hash[event.target.id].Downplay(); });
            builderElems.hash['AsserSubmField'].elem.addEventListener('keyup', function(event) { builderElems.hash[event.target.id].Downplay(); });
            ElemDyns.MakeHidable(builderElems, 'SubmOptionalMsg');
            ElemDyns.MakeHidable(builderElems, 'ElabSubmField');
            ElemDyns.MakeBillboard(builderElems, 'ElabSubmField');
            ElemDyns.MakeHidable(builderElems, 'SrcListMgmtCont');
            ElemDyns.MakeHidable(builderElems, 'EditSrcInd');
            ElemDyns.AnimateExtensibility(builderElems, ['TB_TopRight', 'argSources'], true);

            ElemDyns.MakeHidable(builderElems, 'PresetEditLockBtn');
            document.getElementById('PresetEditLockCheck').addEventListener('change', function(event) {
                // Cannot cache img element, as it's fully replaced on attr change
                if(event.target.checked)
                    document.getElementById('PresetEditLockImg').setAttribute('data-icon', 'lock');
                else
                    document.getElementById('PresetEditLockImg').setAttribute('data-icon', 'lock-open');
            });
            
            ElemDyns.MakeHidable(builderElems, 'ArgAliasSelCont');
            ElemDyns.MakeDynamic(builderElems, 'ArgAliasSel');
            ElemDyns.MakeBillboard(builderElems, 'ArgAliasCorrob');
            ElemDyns.MakeBillboard(builderElems, 'ArgAliasRefute');

            ElemDyns.MakeHidable(builderElems, 'SubmitDataBtn');
            //ElemDyns.MakeHidable(builderElems, 'DeleteDataBtn');
            ElemDyns.MakeHidable(builderElems, 'EditDataBtn');
            ElemDyns.MakeHidable(builderElems, 'BackToDataBtn');

            /* TREE BUILD CONT BOTTOM */
            ElemDyns.MakeHidable(builderElems, 'ContBottom');
            ElemDyns.MakeBillboard(builderElems, 'RevisIntegDispPos');
            ElemDyns.MakeBillboard(builderElems, 'RevisIntegDispNeg');
            ElemDyns.MakeDynamic(builderElems, 'RevIntegBtnPos');
            ElemDyns.MakeDynamic(builderElems, 'RevIntegBtnNeg');

            if(!User.IsGuestAccount()) {
                builderElems.hash['RevIntegBtnPos'].elem.addEventListener('click', function(event) {
                    var input = User.GetRevRatings(TreeHdlr.active.data._id, argIdx_G, true);
                    if(input == 1)
                        SendRevIntegInput(-1, 0, 0);
                    else if(input == 0)
                        SendRevIntegInput(1, 0, 1);
                    else if(input == -1)
                        SendRevIntegInput(1, -1, 1);
                });
                builderElems.hash['RevIntegBtnNeg'].elem.addEventListener('click', function(event) {
                    var input = User.GetRevRatings(TreeHdlr.active.data._id, argIdx_G, true);
                    if(input == -1)
                        SendRevIntegInput(0, -1, 0);
                    else if(input == 0)
                        SendRevIntegInput(0, 1, -1);
                    else if(input == 1)
                        SendRevIntegInput(-1, 1, -1);
                });
            }

            srcTextField = builderElems.hash['TB_TopRight'].elem.getElementsByClassName('srcTextField')[0];
            srcURLField = builderElems.hash['TB_TopRight'].elem.getElementsByClassName('srcURLField')[0];

            // Add sources
            builderElems.hash['TB_TopRight'].elem.getElementsByClassName('addSrcBtn')[0].addEventListener('click', function() {
                if(addSrcBtnEditMode) {
                    if (srcTextField.value != '' && srcURLField.checkValidity()) {
                        editSrcElem.textContent = srcTextField.value;
                        editSrcElem.href = srcURLField.value;
                        SrcEditModeOff();
                        //V+ Set this element to disappear unchanged and re-appear changed, smoothly, using replace transition.
                    }
                }
                else {
                    var src = TemplateHdlr.CheckGetSrc(srcTextField, srcURLField);
                    if(src != '') {
                        builderElems.hash['TB_TopRight'].subElems['argSources'].Push(false, src, function() {
                            console.log('Item added');
                        });
                    }
                }
            });
            // V+ Let users drag elements to shuffle order around
            // Cut/edit sources
            builderElems.hash['TB_TopRight'].subElems['argSources'].elem.addEventListener('click', function(event) {

                if(Utility.html.CheckClass(event.target, 'editBtn')) {
                    var liElem = event.target.parentElement.parentElement.parentElement;
                    if(addSrcBtnEditMode && editBtnElem == event.target) {
                        SrcEditModeOff();
                    }
                    else {
                        SrcEditModeOff();
                        // Get and show specific src edit notification
                        var srcInd = event.target.parentElement.getElementsByClassName('editSrcInd')[0];
                        ElemDyns.ShowUnregOne(srcInd);
                        // Show general src edit notification
                        builderElems.hash['EditSrcInd'].Show();
                        // Set this srcs text and url back into fields
                        editSrcElem = liElem.getElementsByTagName('a')[0];
                        srcTextField.value = editSrcElem.textContent;
                        srcURLField.value = editSrcElem.href;
                        // Overwrite addsrcbtn functionality (In event listener above)
                        addSrcBtnEditMode = true;
                        editBtnElem = event.target;
                    }
                }
                else
                    SrcEditModeOff();

                if(Utility.html.CheckClass(event.target, 'removeBtn')) {
                    var liElem = event.target.parentElement.parentElement.parentElement;
                    builderElems.hash['TB_TopRight'].subElems['argSources'].Pop(liElem, function() {
                        console.log('Item removed');
                    });
                }
            });

            if(!User.IsGuestAccount()) {
                builderElems.hash['SubmitDataBtn'].elem.addEventListener('click', function() { SubmitDataBtnEvent(); });
            }
            //builderElems.hash['DeleteDataBtn'].elem.addEventListener('click', DataNavHdlr.DestroyActiveIdx);
            builderElems.hash['EditDataBtn'].elem.addEventListener('click', function() { EditDataBtnEvent(); });
            builderElems.hash['BackToDataBtn'].elem.addEventListener('click', function() {
                CommonTB_TopRightDispVisToggle();
                if(!builderElems.hash['ArgAliasSelCont'].hidden)
                    builderElems.hash['ArgAliasSelCont'].Hide();

                if(User.perms.isMod) {
                    builderElems.hash['EditDataBtn'].Show();
                    //builderElems.hash['DeleteDataBtn'].Show();
                }
                builderElems.hash['SubmitDataBtn'].Hide();
                builderElems.hash['BackToDataBtn'].Hide();
            });
        },
        SetCreateTreeType: function(asCtrlTree) {
            ChangePanelCommon('Create Debate');

            Utility.html.ChangeClass(builderElems.hash['TB_TopRight'].elem, 'createWindClosed', 'createWindOpen');
            
            CommonTreeCreate();
            if(asCtrlTree)
                 builderElems.hash['TB_TopRightHeader'].DisplayMsg('New Moderated Debate');
            else
                builderElems.hash['TB_TopRightHeader'].DisplayMsg('New Open Debate');

            SubmitDataBtnEvent = function() {
                if(!CreateTreeChecks(true))
                    return;

                TreeHdlr.CreateNew(
                    asCtrlTree,
                    builderElems.hash['TitleSubmField'].elem.value,
                    builderElems.hash['AsserSubmField'].GetMsg(),
                    builderElems.hash['ElabSubmField'].GetMsg(),
                    GetSources()
                );
            };

            builderElems.hash['TreeBuildCont'].Show();
            SliderRight.Open();
        },
        AddArgWindow: function(parentIdx, dispObj) {
            ChangePanelCommon('Add New Argument');

            CommonSubmSetup(dispObj, 'New Argument');
            if(TreeHdlr.active.isControlled)
                builderElems.hash['PresetEditLockBtn'].Show();

            builderElems.hash['ArgAliasSelCont'].Show();
            builderElems.hash['ArgAliasCorrob'].DisplayMsg(TreeHdlr.active.data.branches[parentIdx].typeAliases[Consts.argTypes.CORROB]);
            builderElems.hash['ArgAliasRefute'].DisplayMsg(TreeHdlr.active.data.branches[parentIdx].typeAliases[Consts.argTypes.REFUTE]);

            SubmitDataBtnEvent = function() {
                var selElem = builderElems.hash['ArgAliasSel'].elem;
                SetArg(selElem.options[selElem.selectedIndex].value, parentIdx, null, null, null);
            }

            builderElems.hash['TreeBuildCont'].Show();
            SliderRight.Open();
        },
        EditArgWindow: function(idx, dispObj, submObj) {
            ChangePanelCommon('Edit Argument');

            CommonSubmSetup(dispObj, 'Argument');
            // Override left header from CommonSubmSetup()
            builderElems.hash['TB_TopLeftHeader'].DisplayMsg('Current Revision: ' + dispObj.revision);
            ArgSubmitDataFill(submObj);
            SubmitDataBtnEvent = function() {
                if(CheckMinCreateData(false)) {
                    PageHdlr.DisplayMsg('Minimum of argument assertion required.', 3);
                    return;
                }
                TreeHdlr.EditBranch(
                    idx,
                    builderElems.hash['AsserSubmField'].GetMsg(),
                    builderElems.hash['ElabSubmField'].GetMsg(),
                    GetSources()
                );                
            };

            builderElems.hash['TreeBuildCont'].Show();
            SliderRight.Open();
        },
        EditSrcWindow: function(idx, dispObj, srcString) {
            ChangePanelCommon('Edit Argument Source Links');

            builderElems.hash['TB_TopLeftHeader'].DisplayMsg('Current Revision: ' + dispObj.revision);
            BasicTB_TopLeftFill(dispObj);
            builderElems.hash['TB_TopRightHeader'].Show();
            builderElems.hash['TB_TopRightHeader'].DisplayMsg('Source links');

            builderElems.hash['TB_TopRight'].Show();
            builderElems.hash['SubmDataRight'].Show();
            builderElems.hash['SrcListMgmtCont'].Show();
            builderElems.hash['SubmitDataBtn'].Show();
            builderElems.hash['TB_TopRight'].subElems['argSources'].QuickReplace(srcString, false, function(newLength) {});

            SubmitDataBtnEvent = function() {
                TreeHdlr.EditSrcs(
                    idx,
                    GetSources()
                );
            };

            builderElems.hash['TreeBuildCont'].Show();
            SliderRight.Open();
        },
        SetRevisionWindow: function(branchIdx, currArgObj, revData, userRating, repeatUserRating) {
            revRatingRepeat = repeatUserRating;

            if(revData.list.length > 0) {
                ChangePanelCommon('Revision History');

                argIdx_G = branchIdx;

                builderElems.hash['TB_RefList'].QuickReplace(TemplateHdlr.EJS_GetRevList(revData.list), false, function(listLen, items) {
                    DataListHdlr.SetData(items, function(arrIdx) {
                        var revObj = revData.list[arrIdx];
                        var date = new Date(revObj.timeStamp);
                        builderElems.hash['TB_TopRightDisp'].subElems['asserDisp'].DisplayMsg(revObj.assertion);
                        builderElems.hash['TB_TopRightDisp'].subElems['elabDisp'].DisplayMsg(revObj.elaboration);
                        builderElems.hash['TB_TopRightDisp'].subElems['srcListDisp'].NewInnards(TemplateHdlr.GetSrcListEditDisp(revObj.sources));
                        builderElems.hash['TB_TopRightDisp'].subElems['dateDisp'].DisplayMsg('Date: ' + SuppFuncs.FormatDate(date));
    
                        var modRatingVal = (revObj.rating.mod.entries > 0) ? (revObj.rating.mod.cumuValue / revObj.rating.mod.entries) : -1,
                            modRatingPct = (modRatingVal > -1) ? Math.round((modRatingVal / 5) * 100) : 0;
                        var ratingDispString = TemplateHdlr.GetProgBar(modRatingVal, modRatingPct, AdjustRatingBarColourVal(modRatingPct), 'Moderators');
                        var visRatingVal = (revObj.rating.vis.entries > 0) ? (revObj.rating.vis.cumuValue / revObj.rating.vis.entries) : -1,
                            visRatingPct = (visRatingVal > -1) ? Math.round((visRatingVal / 5) * 100) : 0;
                        ratingDispString += TemplateHdlr.GetProgBar(visRatingVal, visRatingPct, AdjustRatingBarColourVal(visRatingPct), 'Visitors');
                        builderElems.hash['TB_TopRightDisp'].subElems['progBarDisp'].NewInnards(ratingDispString);
                    });
                });

                builderElems.hash['TB_TopLeftHeader'].DisplayMsg('Current Revision');
                BasicTB_TopLeftFill(currArgObj);
                builderElems.hash['TB_TopLeft'].subElems['progBarDisp'].Show();
                builderElems.hash['TB_TopLeft'].subElems['progBarDisp'].NewInnards(currArgObj.ratingString);
                
                builderElems.hash['TB_TopMid'].Show();

                builderElems.hash['TB_TopRightHeader'].Show();
                builderElems.hash['TB_TopRightHeader'].DisplayMsg('Previous Revisions');
                CommonFeedbackBasics();
                builderElems.hash['TB_TopRightDisp'].subElems['progBarDisp'].Show();
                builderElems.hash['TB_TopRightDisp'].subElems['detailDisp'].Show();
                builderElems.hash['TB_TopRightDisp'].subElems['dateDisp'].Show();

                builderElems.hash['RevisIntegDispPos'].DisplayMsg(revData.integ.pos);
                builderElems.hash['RevisIntegDispNeg'].DisplayMsg(revData.integ.neg);
                ChangeRevBtnDisp(userRating);

                builderElems.hash['ContBottom'].Show();
                builderElems.hash['TreeBuildCont'].Show();
                SliderRight.Open();
            }
            else {
                PageHdlr.DisplayMsg('No previous revisions to display', 3);
            }
        },
        ViewFeedback: function(argObj) {
            ChangePanelCommon('View Feedback');

            argIdx_G = argObj.idx;

            var dataObj = TreeHdlr.active.submArgsAct.branches[argObj.idx];
            var selElem = builderElems.hash['ArgTypeSel'].elem;
            for(var i = 0; i < selElem.options.length; i++) {
                // An argType isn't even established unless at least one submArg is going into it,
                // so this check should be sufficient
                if(!dataObj.types[Number(selElem.options[i].value)])
                    selElem.options[i].setAttribute('disabled', '');
            }

            builderElems.hash['TB_TopLeftHeader'].DisplayMsg('Responding To');
            BasicTB_TopLeftFill(argObj);

            builderElems.hash['TB_TopMid'].Show();
            builderElems.hash['ArgTypeSel'].Show();
            if(User.loggedIn && User.perms.isMod && !TreeHdlr.active.data.archived)
                builderElems.hash['RefListOptsBtns'].Show();

            builderElems.hash['TB_TopRight'].Show();
            builderElems.hash['TB_TopRightHeader'].Show();
            builderElems.hash['TB_TopRightHeader'].DisplayMsg('Submission');

            builderElems.hash['ArgAliasCorrob'].DisplayMsg(TreeHdlr.active.data.branches[argObj.idx].typeAliases[Consts.argTypes.CORROB]);
            builderElems.hash['ArgAliasRefute'].DisplayMsg(TreeHdlr.active.data.branches[argObj.idx].typeAliases[Consts.argTypes.REFUTE]);

            CommonFeedbackBasics();
            CommonFeedbackDetails();            

            builderElems.hash['TreeBuildCont'].Show();
            SliderRight.Open();

            // This ensures the window will only open if at least one option is enabled.
            if(!CheckSelectOpts())
                SliderRight.Close();
        },
        SubmitFeedback: function(argObj) {
            ChangePanelCommon('Send Feedback');

            CommonSubmSetup(argObj, 'Submit New argument');

            builderElems.hash['ArgAliasSelCont'].Show();
            builderElems.hash['ArgAliasCorrob'].DisplayMsg('Corroboration');
            builderElems.hash['ArgAliasRefute'].DisplayMsg('Refutation');

            SubmitDataBtnEvent = function() {
                if(CheckMinCreateData(false)) {
                    PageHdlr.DisplayMsg('Minimum of argument assertion required.', 3);
                    return;
                }

                var selElem = builderElems.hash['ArgAliasSel'].elem;

                // Mod invites must have been accepted to count of course.
                var mods = TreeHdlr.active.data.permissions.moderators;
                var modArr = [TreeHdlr.active.data.adminID];
                for(var i = 0, len = mods.length; i < len; i++)
                    if(mods[i].invite == Consts.inviteResps.ACCEPT)
                        modArr.push(mods[i].accountID);

                TreeHdlr.IncrInteractions(argObj.idx, 1);
                Network.Emit('SubmArg', {
                    accountID: User.loggedIn ? User.accountData._id : null,
                    sender: User.loggedIn ? User.accountData.username : '(Unavailable)',
                    assertion: builderElems.hash['AsserSubmField'].GetMsg(),
                    elaboration: builderElems.hash['ElabSubmField'].GetMsg(),
                    sources: GetSources(),
                    idx: argObj.idx,
                    type: selElem.options[selElem.selectedIndex].value,
                    treeID: TreeHdlr.active.data._id,
                    treeTitle: TreeHdlr.active.data.title,
                    postedAsser: argObj.asser,
                    modArr: modArr,
                    canViewFB: User.perms.canViewFeedback
                });
            }

            builderElems.hash['TreeBuildCont'].Show();
            SliderRight.Open();
        },
        CompareArgs: function(origObj, editedObj) {
            ChangePanelCommon('View Argument Pre & Post Potential Editing');

            builderElems.hash['TB_TopLeftHeader'].DisplayMsg('Original Submission:');
            BasicTB_TopLeftFill(origObj);
            builderElems.hash['TB_TopRightHeader'].Show();
            builderElems.hash['TB_TopRightHeader'].DisplayMsg('Adopted As:');
            CommonFeedbackBasics();
            builderElems.hash['TB_TopRightDisp'].subElems['asserDisp'].DisplayMsg(editedObj.asser);
            builderElems.hash['TB_TopRightDisp'].subElems['elabDisp'].DisplayMsg(editedObj.elab);
            builderElems.hash['TB_TopRightDisp'].subElems['srcListDisp'].NewInnards(editedObj.srcString);

            builderElems.hash['TreeBuildCont'].Show();
            SliderRight.Open();
        },
        // This is the user viewing what they've sent out
        ReviewSentArgs: function(freshOpen) {
            if(freshOpen) {
                ChangePanelCommon('Arguments Sent');
            }
            else {
                ClearTB_TopLeftDisp();
                ClearTB_TopRightDisp();
            }
            
            DataListHdlr.AdjustDispIncrs(User.submArgs.out.batchNum * Consts.SUBM_BATCH_SIZE);

            //* Data use
            builderElems.hash['TB_RefList'].QuickReplace(TemplateHdlr.EJS_GetSentList(User.submArgs.out.list), false, function(listLen, items) {
                DataListHdlr.SetData(items,
                    function(arrIdx) {
                        // Keep at the top, used to get other data
                        var sentObj = User.submArgs.out.list[arrIdx];

                        // Left side, branch responded to
                        var treeTitle = User.submArgs.out.treesObj[sentObj.treeID].title;
                        // So it's not showing up while nothing has been selected
                        builderElems.hash['TB_TopLeftGoToBranchBtn'].Show();
                        builderElems.hash['TB_TopLeftHeader'].DisplayMsg('From debate: "' + treeTitle + '"');
                        GoToBranchBtnEvent = function() {
                            SliderRight.Close();
                            TreeHdlr.GoTo(sentObj.treeID, sentObj.branchIdx, true, true); 
                        }

                        var branchObj = User.submArgs.out.treesObj[sentObj.treeID].branches[sentObj.branchIdx];
                        builderElems.hash['TB_TopLeft'].subElems['asserDisp'].DisplayMsg(branchObj.assertion);
                        builderElems.hash['TB_TopLeft'].subElems['elabDisp'].DisplayMsg(branchObj.elaboration);
                        builderElems.hash['TB_TopLeft'].subElems['srcListDisp'].NewInnards(TemplateHdlr.EJS_GetSrcList(branchObj.sources));
                        
                        // Right side, sent arg
                        builderElems.hash['TB_TopRightHeader'].DisplayMsg('Submitted as ' + Consts.argNames[sentObj.type]);
                        builderElems.hash['TB_TopRightDisp'].subElems['asserDisp'].DisplayMsg(sentObj.assertion);
                        builderElems.hash['TB_TopRightDisp'].subElems['elabDisp'].DisplayMsg(sentObj.elaboration);
                        builderElems.hash['TB_TopRightDisp'].subElems['srcListDisp'].NewInnards(TemplateHdlr.GetSrcListEditDisp(sentObj.sources));
                        builderElems.hash['TB_TopRightDisp'].subElems['dateDisp'].DisplayMsg('Date: ' + sentObj.timeStamp);

                        var adoptCountString = 'Adopted to create ' + sentObj.adoptions.length + ' argument';
                        if(sentObj.adoptions.length != 1) adoptCountString += 's';
                        builderElems.hash['TB_TopRightDisp'].subElems['adoptedIdxDisp'].NewInnards(adoptCountString);
                    }
                );
            });

            if(freshOpen) {
                builderElems.hash['TB_TopLeft'].Show();
                builderElems.hash['TB_TopLeftHeader'].DisplayMsg('Responded to:');
                builderElems.hash['TB_TopLeft'].subElems['elabDisp'].Show();
                builderElems.hash['TB_TopLeft'].subElems['srcListDisp'].Show();

                //* Swap horizontal positions of mail list panel & left display, since the display will possibly be changing with every arg
                Utility.html.ChangeClass(builderElems.hash['TB_TopLeft'].elem, 'swapOrderFalse', 'swapOrderTrue');
                Utility.html.ChangeClass(builderElems.hash['TB_TopMid'].elem, 'swapOrderFalse', 'swapOrderTrue');
                
                builderElems.hash['TB_TopMid'].Show();
                builderElems.hash['ArgBatchSel'].Show();            

                builderElems.hash['TB_TopRight'].Show();
                builderElems.hash['TB_TopRightHeader'].Show();
                builderElems.hash['TB_TopRightHeader'].DisplayMsg('Submission');

                CommonFeedbackBasics();
                CommonFeedbackDetails();
                builderElems.hash['TB_TopRightDisp'].subElems['senderDisp'].Hide();

                builderElems.hash['TreeBuildCont'].Show();
                SliderRight.Open();
            }
        },
        SubmitDataResponse: function(success, msgSuccess, msgFailure) {
            if(success) {
                ClearRightSubmFields();
                SliderRight.Close();
                PageHdlr.DisplayMsg(msgSuccess, 3);
            }
            else
                PageHdlr.DisplayMsg(msgFailure, 5);
        },
        PermissionsUpdate: function(isMod) {
            if(isMod || !User.loggedIn || !!TreeHdlr.active.data.archived) {
                builderElems.hash['RevIntegBtnPos'].elem.setAttribute('disabled', '');
                builderElems.hash['RevIntegBtnNeg'].elem.setAttribute('disabled', '');
            }
            else {
                builderElems.hash['RevIntegBtnPos'].elem.removeAttribute('disabled');
                builderElems.hash['RevIntegBtnNeg'].elem.removeAttribute('disabled');
            }
        },
        Close: function() {
            CloseAll();
        }
    };
})();
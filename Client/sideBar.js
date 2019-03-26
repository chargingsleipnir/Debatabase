var SideBar = (function () {

    var sideBarElems = new DynElemCont();
    var queueBranchList = false;
    var linkElem;

    /*======================== PREFERENCES WINDOW ========================*/
    var layoutBtnRefObj = {
        'argShowContDets': 'layoutOptShowContDets',
        'argShowMetaDets': 'layoutOptShowMetaDets',
        //'argShowContext': 'layoutOptShowContext',
        'ratingShowSelf': 'layoutOptShowSelfRatings',
        'ratingShowMod': 'layoutOptShowModRatings',
        'ratingShowVis': 'layoutOptShowVisRatings',
        'ratingShowOpen': 'layoutOptShowOpenRatings',
        'favShowSelf': 'layoutOptShowSelfFav',      
        'favShowMod': 'layoutOptShowModFav',
        'favShowVis': 'layoutOptShowVisFav',
        'favShowOpen': 'layoutOptShowOpenFav'             
    };
    var layoutRatingChecks,
    layoutRatingOpenChecks,
    layoutFavChecks,
    layoutFavOpenChecks,
    layoutDefaultChecks;

    var asideElem, prefContElem;

    function ShowHideElemGroups(showGroup, className) {
        if(showGroup)
            ElemDyns.ShowUnregisteredColl(document.getElementsByClassName(className));
        else
            ElemDyns.HideUnregisteredColl(document.getElementsByClassName(className));
    }
    function ApplyAllLayoutChecks() {
        for(var i = 0, len = document.LayoutForm.LayoutChecks.length; i < len; i++)
            ShowHideElemGroups(document.LayoutForm.LayoutChecks[i].checked, layoutBtnRefObj[document.LayoutForm.LayoutChecks[i].value]);            

        CheckLayoutGroupEffects();
    }
    // This gets rid of things like group headers, if every member of a group is set to be hidden
    function CheckLayoutGroupEffects() {
        var checked = false;
        for(var i = 0, len = layoutRatingChecks.length; i < len; i++) {
            if(layoutRatingChecks[i].checked) {
                checked = true;
                break;
            }
        }
        ShowHideElemGroups(checked, 'layoutOptShowRatings');

        checked = false;
        for(var i = 0, len = layoutRatingOpenChecks.length; i < len; i++) {
            if(layoutRatingOpenChecks[i].checked) {
                checked = true;
                break;
            }
        }
        ShowHideElemGroups(checked, 'layoutOptShowOpenRatingsGroup');

        checked = false;
        for(var i = 0, len = layoutFavChecks.length; i < len; i++) {
            if(layoutFavChecks[i].checked) {
                checked = true;
                break;
            }
        }
        ShowHideElemGroups(checked, 'layoutOptShowFav');

        checked = false;
        for(var i = 0, len = layoutFavOpenChecks.length; i < len; i++) {
            if(layoutFavOpenChecks[i].checked) {
                checked = true;
                break;
            }
        }
        ShowHideElemGroups(checked, 'layoutOptShowOpenFavGroup');
    }    

    function ApplyLayoutDefaults() {
        var checks = document.LayoutForm.LayoutChecks;
        if(User.loggedIn) {
            // Defaults set in account
            for (i = 0, len = checks.length; i < len; i++)
                checks[i].checked = User.accountData.preferences.treeLayout[checks[i].value];
        }
        else {
            // Defaults that I've established - fairly minimal data
            for(var i = 0, len = checks.length; i < len; i++)
                checks[i].checked = false;
            for(var i = 0, len = layoutDefaultChecks.length; i < len; i++)
                layoutDefaultChecks[i].checked = true;
        }             
        ApplyAllLayoutChecks();
    }

    function Close() {
        if(sideBarElems.hash['Aside'].animPos) {
            CssTransMngr.LaunchQueue();
        }
    }

    return {
        Init: function(loggedIn) {

            asideElem = document.getElementById('Aside');
            ElemDyns.MakeTransitional(sideBarElems, 'Aside', function(event, animPos) {
                if(event.propertyName == 'width') {
                    if(animPos) {
                        CssTransMngr.AddToQueue('Aside', sideBarElems.hash['Aside'].AnimateNeg);
                    }
                }
            });
            prefContElem = document.getElementById('PrefCont');
            document.getElementById('LayoutBtn').addEventListener('click', function(event) {
                if(!sideBarElems.hash['Aside'].animPos) {
                    CssTransMngr.AddToQueue('Aside', sideBarElems.hash['Aside'].AnimatePos);
                    CssTransMngr.LaunchQueue();
                }
                else
                    Close();
            });

            /*======================== PREFERENCES WINDOW ========================*/

            ElemDyns.MakeHidable(sideBarElems, 'SB_CtrlPrefRatingsChecks');
            ElemDyns.MakeHidable(sideBarElems, 'SB_CtrlPrefFavChecks');
            ElemDyns.MakeHidable(sideBarElems, 'SB_OpenPrefRatingsCheck');
            ElemDyns.MakeHidable(sideBarElems, 'SB_OpenPrefFavCheck');

            layoutRatingChecks = document.LayoutForm.getElementsByClassName('layoutRatingCheck');
            layoutRatingOpenChecks = document.LayoutForm.getElementsByClassName('layoutRatingOpenCheck');
            layoutFavChecks = document.LayoutForm.getElementsByClassName('layoutFavCheck');
            layoutFavOpenChecks = document.LayoutForm.getElementsByClassName('layoutFavOpenCheck');
            layoutDefaultChecks = document.LayoutForm.getElementsByClassName('layoutDefaultCheck');

            // Ongoing layout controls
            for(var i = 0, len = document.LayoutForm.LayoutChecks.length; i < len; i++) {
                var eventObj = {
                    className: layoutBtnRefObj[document.LayoutForm.LayoutChecks[i].value],
                    handleEvent: function(event) {
                        ShowHideElemGroups(event.target.checked, this.className);
                        CheckLayoutGroupEffects();
                    }
                };
                document.LayoutForm.LayoutChecks[i].addEventListener('click', eventObj);
            }

            // Layout group controls
            // Show/hide all
            document.LayoutForm.LayoutApplyAllBtn.addEventListener('click', function(event) {
                // See if any checkbox is unchecked
                var oneElemUnchecked = false;
                for(var i = 0, len = document.LayoutForm.LayoutChecks.length; i < len; i++) {
                    if(!document.LayoutForm.LayoutChecks[i].checked) {
                        oneElemUnchecked = true;
                        break;
                    }
                }
                // If so, make all true
                if(oneElemUnchecked)
                    for(var i = 0, len = document.LayoutForm.LayoutChecks.length; i < len; i++)
                        document.LayoutForm.LayoutChecks[i].checked = true;
                // Otherwise, make all false
                else
                    for(var i = 0, len = document.LayoutForm.LayoutChecks.length; i < len; i++)
                        document.LayoutForm.LayoutChecks[i].checked = false;

                ApplyAllLayoutChecks();
            });
            // Default layout selections
            document.LayoutForm.LayoutDefaultBtn.addEventListener('click', ApplyLayoutDefaults);

            if(loggedIn) {
                // Preferences - Layout save button
                if(!User.IsGuestAccount()) {
                    document.LayoutForm.LayoutSaveBtn.addEventListener('click', function() {
                        var prefObj = { key: 'treeLayout', setObj: {} };
                        for (i = 0, len = document.LayoutForm.LayoutChecks.length; i < len; i++)
                            prefObj.setObj[document.LayoutForm.LayoutChecks[i].value] = document.LayoutForm.LayoutChecks[i].checked;

                        Network.Emit('UpdatePreferences', { accountID: User.accountData._id, prefObj: prefObj });
                    });
                }
            }
        },
        Close: function() {
            Close();
        },
        CheckIsClosed: function(clickedElem) {
            // ? Just leave this to be manually controlled?

            // TODO: Set this to close after any sliders open or close
            // And maybe vice versa - if a slider panel tries to open, it waits for this to close first.
            
            if(asideElem.contains(clickedElem))
                return;
            if(Utility.html.CheckClass(clickedElem, 'nonEffector_SideBar'))
                return;

            Close();
        },
        ApplyLayoutChecks: function() {
            ApplyAllLayoutChecks();
        },
        TreeUpdate: function() {
            // TODO: Tailor sidebar preferences window to the type of tree being viewed.
            // Keep the full setup in the settings page of course.

            /*======================== PREFERENCES WINDOW ========================*/
            if(TreeHdlr.active.isControlled) {
                sideBarElems.hash['SB_CtrlPrefRatingsChecks'].Show();
                sideBarElems.hash['SB_CtrlPrefFavChecks'].Show();
                sideBarElems.hash['SB_OpenPrefRatingsCheck'].Hide();
                sideBarElems.hash['SB_OpenPrefFavCheck'].Hide();
            }
            else {
                sideBarElems.hash['SB_CtrlPrefRatingsChecks'].Hide();
                sideBarElems.hash['SB_CtrlPrefFavChecks'].Hide();
                sideBarElems.hash['SB_OpenPrefRatingsCheck'].Show();
                sideBarElems.hash['SB_OpenPrefFavCheck'].Show();
            }

            // Set preference defaults
            ApplyLayoutDefaults();
        }
    }
})();
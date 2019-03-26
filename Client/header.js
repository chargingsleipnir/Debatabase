var Header = (function () {

    var headerElems = new DynElemCont();
    var iconFrame;
    var shiftPctFactor = 3;

    return {
        Init: function(loggedIn) {
            document.getElementById('SiteLogo').addEventListener('click', function() {
                PageHdlr.GoTo('/', true);
            });

            //* Create buttons
            ElemDyns.MakeDisablable(headerElems, 'CreateCtrlTreeCont', false);
            document.getElementById('CreateOpenTreeBtn').addEventListener('click', function() {  TreeBuilder.SetCreateTreeType(false); });

            iconFrame = document.getElementById('HeaderIconFrame');

            // TABS
            // BOOKMARK
            document.getElementById('TreePageTab').addEventListener('click', function(event) {
                TreeHdlr.GoTo(TreeHdlr.active.data._id, TreeHdlr.active.focalIdx, TreeHdlr.active.isControlled, true);
            });
            document.getElementById('SearchPageTab').addEventListener('click', function(event) {
                PageHdlr.GoTo('Search', true);
            });
            document.getElementById('ActivityPageTab').addEventListener('click', function(event) {
                PageHdlr.GoTo('Activity', true);
            });
            document.getElementById('ConnsPageTab').addEventListener('click', function(event) {
                PageHdlr.GoTo('Conns', true);
            });
            document.getElementById('ProfilePageTab').addEventListener('click', function(event) {
                PageHdlr.GoTo('Profile', true);
            });
            document.getElementById('SettingsPageTab').addEventListener('click', function(event) {
                PageHdlr.GoTo('Settings', true);
            });

            //* Waiting indicator
            ElemDyns.MakeHidable(headerElems, 'HeaderWaitInd');

            if(loggedIn) {
                //* Create button
                headerElems.hash['CreateCtrlTreeCont'].Enable();
                
                document.getElementById('CreateCtrlTreeBtn').addEventListener('click', function() { TreeBuilder.SetCreateTreeType(true); });

                //* Page buttons - mod chat notification
                ElemDyns.MakeObscurable(headerElems, 'ModMsgsHeaderNotif');
                ElemDyns.MakeTransitional(headerElems, 'ModMsgsHeaderNotif', function(event, animPosAtEnd) {
                    if(event.propertyName == 'opacity') {
                        if(!animPosAtEnd) {
                            headerElems.hash['ModMsgsHeaderNotif'].Hide();
                        }
                    }
                });
                // BOOKMARK
                headerElems.hash['ModMsgsHeaderNotif'].elem.addEventListener('click', function(event) {
                    // This should take care of everything (history, page indicator, etc.)
                    TreeHdlr.GoTo(TreeHdlr.active.data._id, TreeHdlr.active.focalIdx, true, true, SliderLeft.GoToModChat);
                });

                //* notification - activity page
                ElemDyns.MakeTransitional(headerElems, 'TabNotifPageAct', function(event, animPosEnded) {});

                //* notification - connections page
                ElemDyns.MakeTransitional(headerElems, 'TabNotifPageConns', function(event, animPosEnded) {});

                //* Sign-in area
                Main.GetImgSrc(User.accountData._id, document.getElementById('UserAvatarHeader'));            
                ElemDyns.MakeBillboard(headerElems, 'UsernameText');
                /* //V+ If more options should be added here, use this.
                ElemDyns.MakeHidable(headerElems, 'HeaderUserOpts');

                headerElems.hash['UsernameText'].elem.addEventListener('click', function() {
                    headerElems.hash['HeaderUserOpts'].ToggleVisibility();
                });*/
                document.getElementById('LogoutBtn').addEventListener('click', function(){ 
                    // Kills socketID entry in DATABASE
                    Network.Emit('Logout', { _id: User.accountData._id });
                    Main.Logout(false);
                });
            }
            else {
                document.getElementById('LoginPgBtn').addEventListener('click', function() { OverlapCont.SetLoginWindow(); });
            }
        },
        SetLogInData: function(name) {
            headerElems.hash['UsernameText'].DisplayMsg(name);
        },
        IndicateModMsg: function(isInd) {
            if(User.loggedIn && User.perms.isMod) {
                if(isInd) {
                    headerElems.hash['ModMsgsHeaderNotif'].Show();
                    headerElems.hash['ModMsgsHeaderNotif'].AnimatePos();
                }
                else {
                    headerElems.hash['ModMsgsHeaderNotif'].AnimateNeg();
                }
            }
        },
        IndActNotif: function(isInd) {
            if(User.loggedIn) {
                if(isInd)
                    headerElems.hash['TabNotifPageAct'].AnimatePos();
                else
                    headerElems.hash['TabNotifPageAct'].AnimateNeg();
            }
        },
        IndConnsNotif: function(isInd) {
            if(User.loggedIn) {
                if(isInd)
                    headerElems.hash['TabNotifPageConns'].AnimatePos();
                else
                    headerElems.hash['TabNotifPageConns'].AnimateNeg();
            }
        },
        CheckUserOptPanelClosed: function(clickedElem, loggedIn) {
            // I have to exclude the button that opens this window first or the element will instantly switch from
            // openning to closing, and nothing happens on screen.
            //V+ If more options should be added here, use this.
            // if(loggedIn) {
            //     if(clickedElem.id != 'UsernameText') {
            //         if(!headerElems.hash['HeaderUserOpts'].hidden) {
            //             if(!headerElems.hash['HeaderUserOpts'].elem.contains(clickedElem))
            //                 headerElems.hash['HeaderUserOpts'].Hide();
            //         }
            //     }
            // }
        },
        ShiftIconFrame: function(factor) {
            shiftPctFactor = factor;
            Utility.html.ChangeClass(iconFrame, 'shift' + iconFrame.getAttribute('data-shiftPctFactor'), 'shift' + factor);
            iconFrame.setAttribute('data-shiftPctFactor', factor);
        },
        ShowWaiting: function() {
            if(headerElems.hash['HeaderWaitInd'])
                headerElems.hash['HeaderWaitInd'].Show();
        },
        EndWaiting: function() {
            if(headerElems.hash['HeaderWaitInd'])
                headerElems.hash['HeaderWaitInd'].Hide();
        }
    };
})();
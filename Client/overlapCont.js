var OverlapCont = (function () {

    var overlapElems = new DynElemCont();
    var msgTimeout, msgSecs;

    var RemoveTreeCB;

    var opacDelta = OPACITY_CONST = .1;
    var opacVal = 0;
    var animDir = 1;

    function Fade(dir) {
        AnimCtrl.SetActive('OverlapContFade', true);
        opacDelta = OPACITY_CONST * dir;
        animDir = dir;

        if(animDir > 0)
            overlapElems.hash['OverlapCont'].On();
        else
            overlapElems.hash['OverlapCont'].Off();
    }

    function FadeAnimCtrl() {
        opacVal += opacDelta;
        overlapElems.hash['OverlapCont'].elem.style.opacity = '' + opacVal;
        if(animDir > 0) {
            if(opacVal >= 1) {
                opacVal = 1;
                overlapElems.hash['OverlapCont'].elem.style.opacity = '1';
                AnimCtrl.SetActive('OverlapContFade', false);
                // TODO: Whatever else is relevant
            }
        }
        else {
            if(opacVal <= 0) {
                opacVal = 0;
                overlapElems.hash['OverlapCont'].elem.style.opacity = '0';
                AnimCtrl.SetActive('OverlapContFade', false);

                overlapElems.hash['OverlapContentBuffer'].Hide();
                overlapElems.hash['BetaNotes'].Hide();
                if(!User.loggedIn)
                    overlapElems.hash['LogInSignUpCont'].Hide();
                
                overlapElems.hash['OverlapWaitingDisp'].Hide();
                overlapElems.hash['ContactAdmin'].Hide();
                overlapElems.hash['RemoveTreeConf'].Hide();
            }
        }
    }

    // This definitely does not even ned to be here. :/
    function RefreshMsgTimeout() {
        msgTimeout = setTimeout(function () { 
            // When the time runs out, transition away
            overlapElems.hash['OverlapContMsg'].AnimateNeg();
            msgTimeout = null;
        }, msgSecs);
    }

    function DisplayMsg(msg, secs) {
        if(msg) {
            msgSecs = secs * 1000;          
            overlapElems.hash['OverlapContMsg'].DisplayMsg(msg);
            if(msgTimeout) {
                clearTimeout(msgTimeout);
                RefreshMsgTimeout();
            }
            else
                overlapElems.hash['OverlapContMsg'].AnimatePos();
        }
        else
            overlapElems.hash['OverlapContMsg'].ClearMsg();
    }

    function LoginAttempt(resObj) {
        if(resObj.success) {
            //delete overlapElems.hash['LoginOptions'];
            overlapElems.ClearHash();
            window.location.reload(true);
        }
        else
            DisplayMsg(resObj.msg, 3);
    }
    function LogInSetup() {
        var nameEmail = document.PanelLogin.usernameEmailField,
            passwordL = document.PanelLogin.passwordFieldLogin;

        nameEmail.addEventListener('keyup', function(event){ Utility.html.ColourByValidity(event.target); });
        passwordL.addEventListener('keyup', function(event){ Utility.html.ColourByValidity(event.target); });
        document.PanelLogin.showPasswordLogin.addEventListener('change', function(event) {
            Utility.html.ToggleShowPassword(event.target, passwordL);
        });
        document.PanelLogin.submitLogin.addEventListener('click', function(event) {
            if(nameEmail.checkValidity() && passwordL.checkValidity()) {
                var data = {
                    nameOrEmail: nameEmail.value,
                    password: passwordL.value,
                };
                Utility.AJAX('POST', '/LoginData', true, data, LoginAttempt);
            }
            else
                DisplayMsg('Invalid field(s)', 3);
        });
    }
    function SignUpSetup() {
        var username = document.PanelSignUp.usernameField,
            email = document.PanelSignUp.emailField,
            passwordS = document.PanelSignUp.passwordFieldSignUp;

        username.addEventListener('keyup', function(event){ Utility.html.ColourByValidity(event.target); });
        email.addEventListener('keyup', function(event){ Utility.html.ColourByValidity(event.target); });
        passwordS.addEventListener('keyup', function(event){ Utility.html.ColourByValidity(event.target); });
        document.PanelSignUp.showPasswordSignUp.addEventListener('change', function(event) {
            Utility.html.ToggleShowPassword(event.target, passwordS);
        });
        document.PanelSignUp.submitSignUp.addEventListener('click', function(event) {
            if (username.checkValidity() && email.checkValidity() && passwordS.checkValidity()) {
                var data = {
                    username: username.value,
                    email: email.value.toLowerCase(),
                    password: passwordS.value
                };
                Utility.AJAX('POST', '/SignUpData', true, data, LoginAttempt);
            }
            else
                DisplayMsg('Invalid field(s)', 3);
        });
    }

    return {
        Init: function(loggedIn) {
            ElemDyns.MakeHidable(overlapElems, 'OverlapContentBuffer');
            ElemDyns.MakeHidable(overlapElems, 'OverlapWaitingDisp');

            // TODO: I need to fix something here, as the css rtansitions don't seem to handle
            // interuptions very well, and it's making for some very inconsistant "wait" display
            // This is where I might need to use animation instead of transition
            // Animation can seemingly be stopped part way without problems
            // Of course, then it'll need a way to start in it's initial state without animating there.
            // Consider putting the "waiting" marker somewhere on the header bar (beside the user avatar?)

            ElemDyns.GiveCssSwitch(overlapElems, 'OverlapCont', false);
            AnimCtrl.SetEvent('OverlapContFade', FadeAnimCtrl);

            overlapElems.hash['OverlapCont'].elem.addEventListener('click', function(event) {
                if(event.target.id == 'OverlapCont' || Utility.html.CheckClass(event.target, 'closeBtn')) {
                    Fade(-1);
                }
            });

            ElemDyns.MakeBillboard(overlapElems, 'OverlapContMsg');
            ElemDyns.MakeTransitional(overlapElems, 'OverlapContMsg', function(event, animPosAtEnd) {
                // Apparently this fires for every property transitioned, so I need to single one
                if(event.propertyName == 'opacity') {
                    if(animPosAtEnd) {
                        RefreshMsgTimeout();
                    }
                    else {
                        // Once negative transition is complete, obscure the message container
                        overlapElems.hash['OverlapContMsg'].ClearMsg();
                    }
                }
            });            
            
            if(!loggedIn) {
                // LOG IN / SIGN UP WINDOW ========================================================
                ElemDyns.MakeHidable(overlapElems, 'LogInSignUpCont');
                ElemDyns.MakeTabbedBox(overlapElems, 'LoginOptions', 'loginTab', 'loginPanel', true);

                document.getElementById('TabLogin').addEventListener('click', function(event) {
                    overlapElems.hash['LoginOptions'].ChangeTab('TabLogin', 'PanelLogin');
                });
                document.getElementById('TabSignUp').addEventListener('click', function(event) {
                    overlapElems.hash['LoginOptions'].ChangeTab('TabSignUp', 'PanelSignUp');
                });
              
                LogInSetup()
                SignUpSetup()
            }
            
            //* BETA INFO ========================================================
            ElemDyns.MakeHidable(overlapElems, 'BetaNotes');

            //* CONTACT FORM ========================================================
            ElemDyns.MakeHidable(overlapElems, 'ContactAdmin');
            if(!User.IsGuestAccount()) {
                document.ContactAdminForm.Send.addEventListener('click', function() {
                    if(document.ContactAdminForm.Name.value != '' && 
                    document.ContactAdminForm.Email.checkValidity() &&
                    document.ContactAdminForm.Message.value != '') {
                        DisplayMsg('...', 3);
                        Network.Emit('ContactAdmin', {
                            name: document.ContactAdminForm.Name.value,
                            email: document.ContactAdminForm.Email.value,
                            subject: document.ContactAdminForm.Subject.value,
                            msg: document.ContactAdminForm.Message.value
                        });
                    }
                    else
                        DisplayMsg('Fill in all fields', 3);
                });
                Network.CreateResponse('ContactAdminResp', function(resObj) {
                    if(resObj.success) {
                        document.ContactAdminForm.Subject.value = '';
                        document.ContactAdminForm.Message.value = '';
                        Fade(-1);
                        PageHdlr.DisplayMsg('Message sent', 3);
                    }
                    else {
                        DisplayMsg('No dice. Try again later?', 3);
                    }
                });
            }

            //* TREE REMOVAL FORM ========================================================
            ElemDyns.MakeHidable(overlapElems, 'RemoveTreeConf');
            ElemDyns.MakeBillboard(overlapElems, 'RemoveDebateTitle');   
            if(!User.IsGuestAccount()) {         
                document.RemoveTreeConfForm.Accept.addEventListener('click', function() {
                    for(i = 0, len = document.RemoveTreeConfForm.RemoveType.length; i < len; i++)
                        if(document.RemoveTreeConfForm.RemoveType[i].checked)
                            RemoveTreeCB(document.RemoveTreeConfForm.RemoveType[i].value);
                            
                    // TODO: Maybe do these as a Network response instead
                    Fade(-1);
                });
            }
        },
        SetLoginWindow: function() {
            overlapElems.hash['OverlapContentBuffer'].Show();
            overlapElems.hash['LogInSignUpCont'].Show();
            Fade(1);
        },
        SetContactWindow: function() {
            overlapElems.hash['OverlapContentBuffer'].Show();
            overlapElems.hash['ContactAdmin'].Show();
            Fade(1);
        },
        SetBetaInfoWindow: function() {
            overlapElems.hash['OverlapContentBuffer'].Show();
            overlapElems.hash['BetaNotes'].Show();
            Fade(1);
        },
        SetTreeRemoveWindow: function(title, CB) {
            RemoveTreeCB = CB;
            overlapElems.hash['RemoveDebateTitle'].DisplayMsg(title);
            overlapElems.hash['OverlapContentBuffer'].Show();
            overlapElems.hash['RemoveTreeConf'].Show();
            Fade(1);
        }/*,
        ShowWaiting: function() {
            overlapElems.hash['OverlapWaitingDisp'].Show();
            Fade(1);
        },
        EndWaiting: function() {
            Fade(-1);
        }*/
    };
})();
var SettingsPg = (function () {

    var settingsPgElems = new DynElemCont();

    var sentPermUpdate = false,
    sentPrefUpdate = false;

    function SetPerms() {
        // The only purpose of this bool check is runtime efficiency.
        if(sentPermUpdate)
            sentPermUpdate = false;
        else {
            var i, len, 
            form = document.DashPermDefaultForm,
            permSrc = User.accountData.permissions;
            for (i = 0, len = form.viewDebate.length; i < len; i++)
                form.viewDebate[i].checked = (form.viewDebate[i].value == permSrc.viewDebate);
            for (i = 0, len = form.viewFeedback.length; i < len; i++)
                form.viewFeedback[i].checked = (form.viewFeedback[i].value == permSrc.viewFeedback);
            for (i = 0, len = form.viewRating.length; i < len; i++)
                form.viewRating[i].checked = (form.viewRating[i].value == permSrc.viewRating);
            for (i = 0, len = form.submitFeedback.length; i < len; i++)
                form.submitFeedback[i].checked = (form.submitFeedback[i].value == permSrc.submitFeedback);
            for (i = 0, len = form.submitRating.length; i < len; i++)
                form.submitRating[i].checked = (form.submitRating[i].value == permSrc.submitRating);
        }
    }

    return {
        Init: function() {
            //* SETUP TABS
            ElemDyns.MakeTabbedBox(settingsPgElems, 'SettingSections', 'settingsTab', 'settingsPanel', true);
            document.getElementById('TabPermDefaults').addEventListener('click', function(event) {
                settingsPgElems.hash['SettingSections'].ChangeTab('TabPermDefaults', 'PanelPermDefaults');
            });
            document.getElementById('TabPrefDefaults').addEventListener('click', function(event) {
                settingsPgElems.hash['SettingSections'].ChangeTab('TabPrefDefaults', 'PanelPrefDefaults');
            });
            document.getElementById('TabAccount').addEventListener('click', function(event) {
                settingsPgElems.hash['SettingSections'].ChangeTab('TabAccount', 'PanelAccount');
            });


            // Change Password ========================
            if(!User.IsGuestAccount()) {
                document.PwdForm.PwdSaveBtn.addEventListener('click', function() {
                    if(document.PwdForm.NewPwdField.checkValidity()) {
                        if(document.PwdForm.NewPwdField.value == document.PwdForm.RepeatPwdField.value) {
                            Network.Emit('ChangePassword', {
                                accountID: User.accountData._id,
                                currPwd: document.PwdForm.CurrPwdField.value,
                                newPwd: document.PwdForm.NewPwdField.value
                            });
                        }
                        else
                            PageHdlr.DisplayMsg('New password was not precisely repeated', 3);
                    }
                    else
                        PageHdlr.DisplayMsg('New password does not meet requirements', 3);
                });
                Network.CreateResponse('ChangePasswordResp', function(resObj) {
                    if(resObj.success) {
                        document.PwdForm.CurrPwdField.value = '';
                        document.PwdForm.NewPwdField.value = '';
                        document.PwdForm.RepeatPwdField.value = '';
                        PageHdlr.DisplayMsg('Password changed', 3);
                    }
                    else
                        PageHdlr.DisplayMsg('Current password submitted is incorrect', 3);
                });
            }
            // TODO: Implement - See pageSettings.ejs 147
            // document.PwdForm.ForgotPwdBtn.addEventListener('click', function() {
            //     Network.Emit('ForgotPassword', { _id: User.accountData._id });
            // });
            // Network.CreateResponse('ForgotPasswordResp', function(resObj) {
            //     if(resObj.success) PageHdlr.DisplayMsg('Your password has been emailed to you.', 3);
            //     else PageHdlr.DisplayMsg('Could not email your password, please contact administrator for help.', 3);
            // });

            // Delete Account ========================

            if(!User.IsGuestAccount()) {
                document.AccountOptsForm.DeleteAccountBtn.addEventListener('click', function() {
                    // TODO: Ultimately, this would require a fair bit of deeper consideration, such as what to do with the debates they created.
                    // If others contribute to them, just leave them up in the ether for anyone to take over, or public administration?
                    if(User.loggedIn)
                        if(confirm("Are you sure you want to permanently delete your account?"))
                            Network.Emit('RemoveAccount', { 
                                _id: User.accountData._id,
                                inRoom: User.perms.isMod && TreeHdlr.active.isControlled,
                                roomName: TreeHdlr.active.data ? TreeHdlr.active.data._id : null
                            });
                });
                Network.CreateResponse('RemoveAccountResp', function(resObj) {
                    if(resObj.success)
                        Main.Logout(true);
                });
            }

            // Permission table defaults ========================

            if(!User.IsGuestAccount()) {
                document.getElementById('DashSaveDefaultPermsBtn').addEventListener('click', function(event) {
                    sentPermUpdate = true;
                    Network.Emit('SetPermDefaults', {
                        accountID: User.accountData._id,
                        perms: User.GetPermissions(document.DashPermDefaultForm)
                    });
                });
            }
            document.getElementById('DashApplyDefaultPermsBtn').addEventListener('click', SetPerms);
            if(!User.IsGuestAccount()) {
                document.getElementById('UpdateAllTreesDefaultPermsBtn').addEventListener('click', function(event) {
                    if(User.accountData.created.length > 0) {
                        Network.Emit('SetPermissionsToAll', {
                            treeIDs: User.accountData.created,
                            perms: User.GetPermissions(document.DashPermDefaultForm)
                        });
                    }
                    else
                        PageHdlr.DisplayMsg('No debates to update', 3);
                });

                Network.CreateResponse("UpdatePermDefaults", function(resObj) {
                    PageHdlr.DisplayMsg(resObj.msg, 3);
                    if(resObj.success) {
                        User.accountData.permissions = resObj.perms;
                        SetPerms();
                    }
                });
            }

            // Preference form defaults ==========================

            document.PrefDefaultLayoutForm.LayoutApplyAllBtn.addEventListener('click', function(event) {
                var checks = document.PrefDefaultLayoutForm.LayoutChecks;
                
                // See if any checkbox is unchecked
                var oneElemUnchecked = false;
                for(var i = 0, len = checks.length; i < len; i++) {
                    if(!checks[i].checked) {
                        oneElemUnchecked = true;
                        break;
                    }
                }
                // If so, make all true
                if(oneElemUnchecked)
                    for(var i = 0, len = checks.length; i < len; i++)
                        checks[i].checked = true;
                // Otherwise, make all false
                else
                    for(var i = 0, len = checks.length; i < len; i++)
                        checks[i].checked = false;
            });
            document.PrefDefaultLayoutForm.LayoutDefaultBtn.addEventListener('click', function(event) {
                var checks = document.PrefDefaultLayoutForm.LayoutChecks;
                // Defaults set in account
                for (i = 0, len = checks.length; i < len; i++)
                    checks[i].checked = User.accountData.preferences.treeLayout[checks[i].value];
            });
            if(!User.IsGuestAccount()) {
                document.PrefDefaultLayoutForm.LayoutSaveBtn.addEventListener('click', function() {
                    sentPrefUpdate = true;
                    var prefObj = { key: 'treeLayout', setObj: {} };
                    var checks = document.PrefDefaultLayoutForm.LayoutChecks;
                    for (i = 0, len = checks.length; i < len; i++)
                        prefObj.setObj[checks[i].value] = checks[i].checked;

                    Network.Emit('UpdatePreferences', { accountID: User.accountData._id, prefObj: prefObj });
                });
                // Confirmation message circumvention
                document.ConfMsgsForm.SaveBtn.addEventListener('click', function() {
                    sentPrefUpdate = true;
                    var prefObj = { key: 'confMsgs', setObj: {} };
                    var checks = document.ConfMsgsForm.ConfMsgChecks;
                    for (i = 0, len = checks.length; i < len; i++)
                        prefObj.setObj[checks[i].value] = checks[i].checked;

                    Network.Emit('UpdatePreferences', { accountID: User.accountData._id, prefObj: prefObj });
                });
            }
            document.ConfMsgsForm.DefaultBtn.addEventListener('click', function() {
                var checks = document.ConfMsgsForm.ConfMsgChecks;
                for (i = 0, len = checks.length; i < len; i++)
                    checks[i].checked = User.accountData.preferences.confMsgs[checks[i].value];
            });
            if(!User.IsGuestAccount()) {
                Network.CreateResponse('UpdatePreferencesResponse', function(resObj) {
                    PageHdlr.DisplayMsg('Preferences updated', 3);
                    User.accountData.preferences[resObj.key] = resObj.setObj;  
                    // The only purpose of this bool check is runtime efficiency.
                    if(sentPrefUpdate)
                        sentPrefUpdate = false;
                    else {
                        var checks = (resObj.key == 'treeLayout') ? document.PrefDefaultLayoutForm.LayoutChecks : document.ConfMsgsForm.ConfMsgChecks;
                        for (i = 0, len = checks.length; i < len; i++)
                            checks[i].checked = User.accountData.preferences[resObj.key][checks[i].value];
                    }
                });
            }
        }
    }
})();
/*
Main has mostly universal helper functions, whereas all of the section-specific js files handle their particular areas. 
At least I'm going to try to organize it that way. :/
*/

var Main = (function () {

    var userImgs = {};
    var fetchList = [];
    var awaitSrcReqBacklog = {};

    return {
        Start: function () {

            /* IMPORTANT: I could very well load the account and tree html strings up front, but then I'd have to dissociate them
            from the raw data that also comes with this call, fetching it twice. It's just easier to bring everything in at once, 
            though maybe later I'll refactor again and make the distinction. */
            // Maybe put up a general load screen off the start, kill it after socket connection happens.
            Network.InitSocketConnection(function (socketID) {

                //* This is purely here as a test, because I can examine data better in a browser than a server display window
                Network.CreateResponse('ServerToClientTest', function(resObj) {
                    console.log(resObj);
                });

                //* Avatar collection
                // Network.CreateResponse('AcquireImgSrcRespByClient', function(data) {
                //     var src = "data:image/" + data.ext + ";base64," + Utility.gen.B64(data.buffer);
                // });
                Network.CreateResponse('AcquireImgSrcRespByServer', function(resObj) {
                    if(resObj.success) {
                        userImgs[resObj.idKey] = resObj.src;
                        if(awaitSrcReqBacklog[resObj.idKey])
                            for(var i = 0; i < awaitSrcReqBacklog[resObj.idKey].length; i++)
                                awaitSrcReqBacklog[resObj.idKey][i].src = resObj.src;
                    }
                    else {
                        // Keep the idKey stored with the default src so no more DB calls are made for this user, until app is refreshed
                        userImgs[resObj.idKey] = 'Images/SpeechlessGuy.png';
                    }
                    // ! Might have to wait for each src to "complete" before deleting this particular element reference.
                    delete awaitSrcReqBacklog[resObj.idKey];
                    Main.UnPause();
                });
                
                //* Load Index page data
                Utility.AJAX('POST', 'LoadIdxPgData', true, { socketID: socketID }, function(resObj) {
                    // First - Purely data-based classes
                    ElemDyns.Init();
                    TemplateHdlr.Init(resObj.templates);

                    // Second - Logged-in user classes, starting with user.js
                    if(resObj.loggedIn) {
                        // Set image src data collected
                        for(var key in resObj.loginData.avaSrcObj)
                            Main.SetImgSrc(key, resObj.loginData.avaSrcObj[key])

                        User.Init(resObj.accountData, resObj.loginData);
                        ActivityPg.Init(resObj.loginHTMLObj);
                        ConnsPg.Init(resObj.loginHTMLObj);
                        ProfilePg.Init();
                        SettingsPg.Init();
                    }

                    // Third - All other common site areas
                    Header.Init(resObj.loggedIn);
                    SideBar.Init(resObj.loggedIn);
                    SliderLeft.Init(resObj.loggedIn);
                    SearchPg.Init(resObj.loggedIn);                    
                        
                    PageHdlr.Init(resObj.loggedIn, resObj.treeObj);
                    TreeMap.Init();
                    TreeHdlr.Init(resObj.loggedIn); 
                    Footer.Init();                   
                    OverlapCont.Init(resObj.loggedIn);
                    // SliderTop.Init(resObj.loggedIn); Not useful right now
                    SliderRight.Init(resObj.loggedIn);

                    // TODO: Can certainly move this in the header.init
                    if(resObj.loggedIn) {
                        Header.SetLogInData(resObj.accountData.username);
                    }

                    if(resObj.treeObj) {
                        if(resObj.treeObj.success) {
                            // Initial check for mod status - join chat group right away, no worry about leaving one.
                            if(resObj.treeObj.permObj.isMod && resObj.treeObj.isControlled) {
                                Network.Emit('JoinModChatRoom', {
                                    room: resObj.treeObj.treeData._id,
                                    username: resObj.accountData.username
                                });
                            }

                            TreeHdlr.Load(resObj.treeObj);
                        }
                        else {
                            PageHdlr.GoTo('/', true);
                            PageHdlr.DisplayMsg(resObj.treeObj.msg, 2);
                        }
                    }
                    else
                        PageHdlr.GoTo(resObj.urlParam, true);

                    //* General page functionality
                    document.addEventListener('click', function(event) {
                        // Close sliding tabs if open & clicked outside of
                        //Header.CheckUserOptPanelClosed(event.target, resObj.loggedIn);
                        SliderLeft.CheckSlidePanelClosed(event.target);
                        // SliderTop.CheckSlidePanelClosed(event.target); Not useful right now
                        SliderRight.CheckSlidePanelClosed(event.target);
                        SideBar.CheckIsClosed(event.target);
                    });

                    Main.UnPause(); // Page loads in"Pause" state, so everything can load without too much hassle
                    // ! Just for now
                    OverlapCont.SetBetaInfoWindow();

                    // Useless Change to test usefulness of gitignore of "Avatars" folder
                    var a = 5,
                    b = a;
                    var c = b;
                });
            });
        },
        Logout: function(accountDeleted) {
            User.loggedIn = false;
            User.accountData = null;
            // Kills socketID entry in DATABASE, even though socket is still connected to server as a whole.
            Utility.AJAX('POST', 'Logout', true, { socketID: Network.GetSocketID(), accountDeleted: accountDeleted }, function(resObj) {
                window.location.reload(true);
            });
        },
        SetImgSrc: function(key, src) {
            userImgs[key] = src;
        },
        //! Definitely causes loading to hang momentarily, despite src loading being async
        GetImgSrc: function(idKey, elem) {
            if(!idKey)
                return;
                
            // If had, deliver src and leave function
            if(userImgs[idKey]) {
                elem.src = userImgs[idKey];
                return;
            }

            // Otherwise, add element to list of elements awaiting particular user avatar
            if(!awaitSrcReqBacklog[idKey]) {
                awaitSrcReqBacklog[idKey] = [];
            }
            awaitSrcReqBacklog[idKey].push(elem);

            // If avatar for given account id isn't already being fetched, go after it
            //* Remove nothing from fetchList, thus, each avatar is only gone after once per session.
            //* User must refresh page to attempt to acquire avatars again. That way they're consistently either present or not across the site.
            if(fetchList.indexOf(idKey) == -1) {
                fetchList.push(idKey);
                Main.Pause(true);
                Network.Emit('AcquireImgSrc', { accountID: idKey });
            }           
        },
        // TODO: Tie these functions into Network emit & response? Not all calls result in a response though.
        Pause: function(showWaiting) {
            Utility.html.ChangeClass(document.body, 'waitingFalse', 'waitingTrue');
            //* No point in trying to do this with site overlap fade-in, as socketio causes the client to stall while recieving respose anyway
            // If anything, do it on site overlap, but just with a mildly faded pop-up, foregoing the transition
            // if(showWaiting)
            //     OverlapCont.ShowWaiting();
            if(showWaiting)
                Header.ShowWaiting();
        },
        UnPause: function() {
            Utility.html.ChangeClass(document.body, 'waitingTrue', 'waitingFalse');
            //OverlapCont.EndWaiting();
            Header.EndWaiting();
        },
        //* Do more like this, with the overlay container, showing a "thinking" image (font-awesome)
        // when the server is getting something
    };
})();
var PageHdlr = (function () {

    var pageElems = new DynElemCont();
    var titleElem;
    var currTreeHistObj;
    var currTreePath;
    var msgTimeout, msgSecs;

    function RefreshMsgTimeout() {
        msgTimeout = setTimeout(function () { 
            // When the time runs out, transition away
            pageElems.hash['StatusText'].AnimateNeg();
            msgTimeout = null;
        }, msgSecs);
    }

    return {
        state: -1,
        currPath: '',
        Init: function(loggedIn, treeObj) {

            titleElem = document.getElementsByTagName('TITLE')[0];

            ElemDyns.MakeObscurable(pageElems, 'StatusText');
            ElemDyns.MakeBillboard(pageElems, 'StatusText');
            ElemDyns.MakeTransitional(pageElems, 'StatusText', function(event, animPosAtEnd) {
                // Only when the transition is complete, start timing the message
                // Apparently this fires for every property transitioned, so I need to single one
                if(event.propertyName == 'opacity') {
                    if(animPosAtEnd) {
                        RefreshMsgTimeout();
                    }
                    else {
                        // Once negative transition is complete, obscure the message container
                        pageElems.hash['StatusText'].Hide();
                        pageElems.hash['StatusText'].ClearMsg();
                    }
                }
            });

            ElemDyns.MakeTabbedBox(pageElems, 'Pages', 'pageTab', 'page', true);

            ElemDyns.MakeDynamic(pageElems, 'TreePage');

            Network.CreateResponse('StatusMsgResponse', function(resObj) {
                PageHdlr.DisplayMsg(resObj.msg, 3);
            });
        },
        EnableTreeBtn: function() {
            pageElems.hash['Pages'].ChangeTabAbility('TreePageTab', true);
        },
        TreeDisp: function(treeString, changePage = true, histObj, push) {
            if(treeString)
                pageElems.hash['TreePage'].NewInnards(treeString);

            if(changePage) {
                pageElems.hash['Pages'].ChangeTab('TreePageTab', 'TreePageCont');
                PageHdlr.state = pageStates.TREE;
                Header.ShiftIconFrame(0);
                titleElem.text = 'Debatabase | ' + TreeHdlr.active.data.title;

                if(histObj)
                    currTreeHistObj = histObj;

                if(push)
                    Utility.history.Push(currTreeHistObj, PageHdlr.currPath);
                else
                    Utility.history.Replace(currTreeHistObj, PageHdlr.currPath);
            }
        },
        DisplayMsg: function(msg, secs) {
            if(msg) {
                msgSecs = secs * 1000;
                pageElems.hash['StatusText'].DisplayMsg(msg);
                pageElems.hash['StatusText'].Show();
                if(msgTimeout) {
                    clearTimeout(msgTimeout);
                    RefreshMsgTimeout();
                }
                else
                    pageElems.hash['StatusText'].AnimatePos();                
            }
            else
                pageElems.hash['StatusText'].ClearMsg();
        },
        CheckHidden: function(id) {
            if(pageElems.hash.hasOwnProperty(id))
                return pageElems.hash[id].hidden;
            return false;
        },
        // TODO: Move tree items down here, perhaps with a isTree bool to deal with the dynamic paths
        // Essentially so there's a PageHdlr.ReturnToTree() or ActiveTree() function that takes care of everything nicely
        GoTo: function(path, push) {
            if(PageHdlr.currPath != path) {
                SliderLeft.TreeShowing(false);
                if(User.loggedIn) {
                    switch(path) {
                        case "Search":
                        pageElems.hash['Pages'].ChangeTab('SearchPageTab', 'SearchPage');
                        PageHdlr.state = pageStates.SEARCH;
                        Header.ShiftIconFrame(1);
                        titleElem.text = 'Debatabase | Search';
                        break;
                        case "Conns":
                        pageElems.hash['Pages'].ChangeTab('ConnsPageTab', 'ConnsPage');
                        PageHdlr.state = pageStates.CONNS;
                        Header.ShiftIconFrame(3);
                        Header.IndConnsNotif(false);
                        titleElem.text = 'Debatabase | Connections';
                        break;
                        case 'Profile':
                        pageElems.hash['Pages'].ChangeTab('ProfilePageTab', 'ProfilePage');
                        PageHdlr.state = pageStates.PROFILE;
                        Header.ShiftIconFrame(4);
                        titleElem.text = 'Debatabase | Profile';
                        break;
                        case 'Settings':
                        pageElems.hash['Pages'].ChangeTab('SettingsPageTab', 'SettingsPage');
                        PageHdlr.state = pageStates.SETTINGS;
                        Header.ShiftIconFrame(5);
                        titleElem.text = 'Debatabase | Settings';
                        break;
                        case "/": // Might still want to implement general landing page for logged in users?
                        case "Activity":
                        default:
                        pageElems.hash['Pages'].ChangeTab('ActivityPageTab', 'ActivityPage');
                        PageHdlr.state = pageStates.ACTIVITY;
                        Header.ShiftIconFrame(2);
                        Header.IndActNotif(false);
                        titleElem.text = 'Debatabase | Activity';
                        path = 'Activity';
                    }
                }
                else {
                    switch(path) {
                        case "Search":
                        default:
                        pageElems.hash['Pages'].ChangeTab('SearchPageTab', 'SearchPage');
                        PageHdlr.state = pageStates.SEARCH;
                        Header.ShiftIconFrame(1);
                        titleElem.text = 'Debatabase | Search';
                        path = 'Search';
                    }
                }

                PageHdlr.currPath = path;
                if(push) {
                    Utility.history.Push({ type: stateTypes.page, path: path }, path);
                }
            }
        }
    }
})();
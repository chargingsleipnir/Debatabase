var SearchPg = (function () {

    var searchPgElems = new DynElemCont();

    var dispTypes = { POP: 0, SEARCH: 1 };
    var dispGroups = { MOD: 0, OPEN: 1, ARCH: 2 };

    function SwitchToSearchRes() {
        searchPgElems.hash['SearchResults'].Show();
        searchPgElems.hash['PopularList'].Hide();
    }

    function SubmitSearchTerm() {
        var emitObj = {
            loggedIn: User.loggedIn,
            text: document.SearchBar.SearchTermField.value 
        };
        if(document.SearchBar.Method[Consts.searchTypes.TEXT].checked)
            emitObj['type'] = Consts.searchTypes.TEXT;
        else if(document.SearchBar.Method[Consts.searchTypes.TAG].checked)
            emitObj['type'] = Consts.searchTypes.TAG;
        else if(document.SearchBar.Method[Consts.searchTypes.USER].checked) {
            emitObj['type'] = Consts.searchTypes.USER;
            emitObj['usernameOnly'] = false;
        }

        Network.Emit('SearchTerm', emitObj);
    }

    return {
        Init: function(loggedIn) {

            //* SEARCH FUNCTIONALITY
            ElemDyns.MakeBillboard(searchPgElems, 'SearchResultsDescDisp');

            ElemDyns.MakeHidable(searchPgElems, 'TreeResultsCont');
            ElemDyns.MakeHidable(searchPgElems, 'UserResultsCont');

            ElemDyns.MakeHidable(searchPgElems, 'ModNoResText');
            ElemDyns.MakeHidable(searchPgElems, 'OpenNoResText');
            ElemDyns.MakeHidable(searchPgElems, 'ArchNoResText');

            ElemDyns.MakeDynamic(searchPgElems, 'SearchResultsCtrl'); 
            ElemDyns.MakeDynamic(searchPgElems, 'SearchResultsOpen');
            ElemDyns.MakeDynamic(searchPgElems, 'SearchResultsArch');
            ElemDyns.MakeDynamic(searchPgElems, 'UserResults');

            Network.CreateResponse('SearchTermResp', function(resObj) {
                if(resObj.resToShow) {
                    // Go to Search page if not already there
                    PageHdlr.GoTo('Search', true);

                    searchPgElems.hash['SearchResultsCtrl'].NewInnards(resObj.ctrlHTMLString);
                    searchPgElems.hash['SearchResultsOpen'].NewInnards(resObj.openHTMLString);
                    searchPgElems.hash['SearchResultsArch'].NewInnards(resObj.archHTMLString);

                    if(resObj.ctrlHTMLString == '')
                        searchPgElems.hash['ModNoResText'].Show();
                    else
                        searchPgElems.hash['ModNoResText'].Hide();

                    if(resObj.openHTMLString == '')
                        searchPgElems.hash['OpenNoResText'].Show();
                    else
                        searchPgElems.hash['OpenNoResText'].Hide();

                    if(resObj.archHTMLString == '')
                        searchPgElems.hash['ArchNoResText'].Show();
                    else
                        searchPgElems.hash['ArchNoResText'].Hide();

                    searchPgElems.hash['UserResults'].NewInnards(resObj.userHTMLString);

                    var typeString = '';
                    if(resObj.type == Consts.searchTypes.TEXT) {
                        typeString = 'debate text';
                        searchPgElems.hash['TreeResultsCont'].Show();
                        searchPgElems.hash['UserResultsCont'].Hide();
                    }
                    else if(resObj.type == Consts.searchTypes.TAG) {
                        typeString = 'tag';
                        searchPgElems.hash['TreeResultsCont'].Show();
                        searchPgElems.hash['UserResultsCont'].Hide();
                    }
                    else if(resObj.type == Consts.searchTypes.USER) {
                        typeString = 'user information';
                        searchPgElems.hash['UserResultsCont'].Show();
                        searchPgElems.hash['TreeResultsCont'].Hide();

                        // Display user avatar
                        var children = searchPgElems.hash['UserResults'].GetListItems();
                        for(var i = 0; i < children.length; i++) {
                            var avaElem = children[i].getElementsByClassName('userImg')[0];
                            Main.GetImgSrc(avaElem.getAttribute('data-accountID'), avaElem);
                        }
                    }

                    searchPgElems.hash['SearchResultsDescDisp'].DisplayMsg('Search by ' + typeString + '. ' +  'Results for "' + resObj.text + '"');
                    SwitchToSearchRes();
                    document.SearchLayout.DispType[dispTypes.SEARCH].checked = true;
                }
                else
                    PageHdlr.DisplayMsg('No new results', 3);

                // ! I don't know why clicking on the tags is causing the system to pause.
                Main.UnPause();
            });

            // Prevent form from submitting anything, so the enter button doesn't launch it.
            document.SearchBar.onsubmit = function() { return false; }

            // Enter key for specific input field activation
            document.SearchBar.SearchTermField.addEventListener('keyup', function(event) {
                if(event.keyCode == KeyMap.Enter)
                    SubmitSearchTerm();
            });
            document.SearchBar.SearchTermBtn.addEventListener('click', SubmitSearchTerm);

            //* LAYOUT FUNCTIONALITY

            ElemDyns.MakeHidable(searchPgElems, 'PopularList');
            ElemDyns.MakeHidable(searchPgElems, 'SearchResults');

            // Radio buttons - display type
            document.SearchLayout.DispType[dispTypes.POP].addEventListener('click', function(event) {
                if(event.target.checked) {
                    searchPgElems.hash['PopularList'].Show();
                    searchPgElems.hash['SearchResults'].Hide();
                }
            });            
            document.SearchLayout.DispType[dispTypes.SEARCH].addEventListener('click', function(event) {
                if(event.target.checked) SwitchToSearchRes();
            });

            // TODO: Check boxes - filters
            var dispArea = document.getElementById('SearchDisplay');
            var modGroups = dispArea.getElementsByClassName('filterMod');
            var openGroups = dispArea.getElementsByClassName('filterOpen');
            var archGroups = dispArea.getElementsByClassName('filterArch');

            document.SearchLayout.DispGroup[dispGroups.MOD].addEventListener('click', function(event) {
                if(event.target.checked) ElemDyns.ShowUnregisteredColl(modGroups);
                else ElemDyns.HideUnregisteredColl(modGroups);
            });
            document.SearchLayout.DispGroup[dispGroups.OPEN].addEventListener('click', function(event) {
                if(event.target.checked) ElemDyns.ShowUnregisteredColl(openGroups);
                else ElemDyns.HideUnregisteredColl(openGroups);
            });
            document.SearchLayout.DispGroup[dispGroups.ARCH].addEventListener('click', function(event) {
                if(event.target.checked) ElemDyns.ShowUnregisteredColl(archGroups);
                else ElemDyns.HideUnregisteredColl(archGroups);
            });

            //* LINK NAVIGATION
            function FollowLink(event) {
                if(Utility.html.CheckClass(event.target, 'treeGoToBtn'))
                    TreeHdlr.GoTo(event.target.getAttribute('data-treeID'), 0, event.target.getAttribute('data-type') == 'ctrl', true);
            }
            searchPgElems.hash['SearchResultsCtrl'].elem.addEventListener('click', FollowLink);
            searchPgElems.hash['SearchResultsOpen'].elem.addEventListener('click', FollowLink);
            searchPgElems.hash['SearchResultsArch'].elem.addEventListener('click', FollowLink);
            if(document.getElementById('PopularList'))
                document.getElementById('PopularList').addEventListener('click', FollowLink);

            // User search buttons
            if(!User.IsGuestAccount()) {
                document.getElementById('UserResults').addEventListener('click', function(event) {
                    if(Utility.html.CheckClass(event.target, 'userFollowBtn'))
                        ConnsPg.AddUserToFollow(event.target.parentElement.getAttribute('data-username'));
                    else if(Utility.html.CheckClass(event.target, 'userBlockBtn'))
                        ConnsPg.AddUserToBlock(event.target.parentElement.getAttribute('data-username'));
                });
            }
        },
        SearchForUser: function(username) {
            // Check the "search users" checkbox
            document.SearchBar.Method[Consts.searchTypes.USER].checked = true;

            Network.Emit('SearchTerm', {
                loggedIn: User.loggedIn,
                accountID: User.accountData ? User.accountData._id : null,
                blockers: User.accountData ? User.accountData.blockers : null,
                text: username,
                type: Consts.searchTypes.USER,
                usernameOnly: true
            });
        }
    }
})();
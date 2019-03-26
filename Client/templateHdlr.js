var TemplateHdlr = (function () {
    var srcEditDispTemplate,
        progBarTemplate,
        modMsgTemplate;

    // See app.js for template information
    var serverTemplateObj = {};

    return {
        Init: function(serverTemplates) {
            ejs.delimiter = '?';

            srcEditDispTemplate = document.getElementById('SourceEditDispTemplate');
            progBarTemplate = document.getElementById('ProgBarTemplate');
            modMsgTemplate = document.getElementById('ModMsgTemplate');

            for(var fileString in serverTemplates)
                serverTemplateObj[fileString] = ejs.compile(serverTemplates[fileString], {client: true});
        },
        CheckGetSrc: function(srcTextField, srcURLField) {
            var retString = '';
            if (srcTextField.value != '' && srcURLField.checkValidity()) {
                retString = serverTemplateObj['li_SourceLink.ejs']({
                    liArr: [{
                        text: srcTextField.value,
                        url: srcURLField.value
                    }],
                    isMod: true,
                    canEdit: true,
                    editReady: true
                });
                srcTextField.value = '';
                srcURLField.value = '';
            }
            return retString;
        },
        GetSrc: function(srcTextVal, srcURLVal) {
            return serverTemplateObj['li_SourceLink.ejs']({
                liArr: [{
                    text: srcTextVal,
                    url: srcURLVal
                }],
                isMod: true,
                canEdit: true,
                editReady: true
            });
        },
        ConvertEditDispToDelLinks: function(elemList) {
            var liArr = [];
            for (var i = 0, sourceLen = elemList.length; i < sourceLen; i++) {
                liArr[i] = {
                    text: elemList[i].getElementsByClassName('srcLITextCopy')[0].textContent,
                    url: elemList[i].getElementsByClassName('srcLIURLCopy')[0].textContent
                };
            }
            return serverTemplateObj['li_SourceLink.ejs']({
                liArr: liArr,
                isMod: true,
                canEdit: true,
                editReady: true
            });
        },
        RestoreSrcDeletion: function(elemList) {
            var liArr = [];
            for (var i = 0, sourceLen = elemList.length; i < sourceLen; i++) {
                var aTag = elemList[i].getElementsByTagName('a')[0];
                liArr[i] = {
                    text: aTag.textContent,
                    url: aTag.href
                };
            }
            return serverTemplateObj['li_SourceLink.ejs']({
                liArr: liArr,
                isMod: true,
                canEdit: true,
                editReady: true
            });
        },
        GetSrcLinkComponents: function(srcTextVal, srcURLVal) {
            return Utility.template.PopulateByObj(srcEditDispTemplate, {
                'text' : srcTextVal,
                'url' : srcURLVal
            });
        },
        ConvertLinksToEditDisp: function(elemList) {
            var retString = '';
            for (var i = 0, sourceLen = elemList.length; i < sourceLen; i++) {
                var aTag = elemList[i].getElementsByTagName('a')[0];
                retString += Utility.template.PopulateByObj(srcEditDispTemplate, {
                    'text' : aTag.textContent,
                    'url' : aTag.href
                });
            }
            return retString;
        },
        GetProgBar: function(ratingVal, ratingPct, colourVal, groupString) {
            return Utility.template.PopulateByObj(progBarTemplate, {
                'rating': (ratingVal > -1) ? '' + ratingVal.toFixed(2) + ' (' + ratingPct + '%)' : 'none',
                'ratingValueAttr' : ratingPct,
                'colourValue': colourVal,
                'label' : groupString
            });
        },
        GetBookmarkTree: function(treeID, title) {
            var pushList = {};
            pushList[treeID] = {
                title: title,
                numBranches: 1,
                branchObj: {
                    '-1': {
                        assertion: 'filler',
                        interactions: { direct: 0, cumulative: 0 }
                    }
                }
            }
            return serverTemplateObj['li_BranchBtnList.ejs']({ pathPartials: '', treeList: pushList }, null, function(path, data) {
                return serverTemplateObj[path](data);
            });
        },
        EJS_GetParentArg: function(data) {
            return serverTemplateObj['li_ArgParent.ejs'](data, null, function(path, data2) {
                return serverTemplateObj[path](data2);
            });
        },
        EJS_GetArg: function(data) {
            return serverTemplateObj['block_Arg.ejs'](data, null, function(path, data2) {
                return serverTemplateObj[path](data2, null, function(path2, data3) {
                    return serverTemplateObj[path2](data3);
                });
            });
        },
        // Standard source list - as a tags
        EJS_GetSrcList: function(dataArr, canEdit) {
            return serverTemplateObj['li_SourceLink.ejs']({
                liArr: dataArr,
                isMod: true,
                canEdit: canEdit,
                editReady: true
            });
        },
        EJS_GetSubmList: function(idx, type) {
            var argsObj = TreeHdlr.active.submArgsAct.branches[idx].types[type].args;
            return serverTemplateObj['li_Subm.ejs']({ 
                liObj: argsObj,
                loggedIn: User.loggedIn,
                isMod: User.perms.isMod,
                accountID: User.accountData ? User.accountData._id : "-1"
            });
        },
        EJS_GetLinearBranchLI: function(idx) {
            return serverTemplateObj['li_BranchListLinear.ejs']({
                branch: TreeHdlr.active.data.branches[idx],
                // timestamp comes back from server as string, need to re-convert
                timeStamp: SuppFuncs.FormatDate(new Date(TreeHdlr.active.data.branches[idx].timeStamp)),
                idx: idx,
                canViewFeedback: User.perms.canViewFeedback,
                submArgsAct: TreeHdlr.active.submArgsAct,
                isMod: User.perms.isMod,
                argTypes: Consts.argTypes
            });
        },
        EJS_GetSentList: function(sentArr) {
            var retString = '';
            for (var i = 0, len = sentArr.length; i < len; i++) {
                sentArr[i].listIdx = i;
                retString += serverTemplateObj['li_Sent.ejs'](sentArr[i]);
            }
            return retString;
        },
        EJS_GetRevList: function(revArr) {
            return serverTemplateObj['li_Revision.ejs']({ liArr: revArr });
        },
        EJS_GetUserLI: function(liArr, indOnline, userConnName, userConnOpts, statusInd, accRejBtns, accBtn) {
            return serverTemplateObj['li_AddUser.ejs']({
                liArr: liArr,
                indOnline: indOnline,
                userConnName: userConnName,
                userConnOpts: userConnOpts,
                statusInd: statusInd,
                accRejBtns: accRejBtns,
                accBtn: accBtn,
                inviteResps: Consts.inviteResps
            });
        },
        // Standard source list - broken into component parts
        GetSrcListEditDisp: function(dataArr) {
            var retString = '';
            for (var i = 0, len = dataArr.length; i < len; i++) {
                retString += Utility.template.PopulateByObj(srcEditDispTemplate, {
                    'text' : dataArr[i].text,
                    'url' : dataArr[i].url
                });
            }
            return retString;
        },
        GetModMsg: function(msgObj, fromClient) {
            var node = Utility.html.FromString(Utility.template.PopulateByObj(modMsgTemplate, {
                'senderClass': fromClient ? 'fromClientTrue': 'fromClientFalse',
                'username': msgObj.username,
                'timeStamp': msgObj.timeStamp,
                'msg': msgObj.msg
            }));

            if(!fromClient) {
                var col = SliderLeft.GetModChatColour(msgObj.username);
                node.style.backgroundColor = 'rgba(' + col.r + ',' + col.g + ',' + col.b + ', 0.5)';
            }

            return node;
        }
    }
})();
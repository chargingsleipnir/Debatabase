/* COMMENT EXTENSTION SAMPLE
! For alerts/erros perhaps
? For questions to myself/options
* For just generally important, like bolding
_ For code that's deadish, but not completely
TODO For todo item
V+ For later version functionality/features
BOOKMARK
@param myparam doesn't work like this
*/

/** Needed for the param thing.
* ! For alerts/erros perhaps
* ? For questions to myself/options
* * For just generally important, like bolding
* _ For code that's deadish, but not completely
* TODO For todo item
* V+ For later version functionality/features
* BOOKMARK
* @param myparam does this regardless of extension
*/

//!
//?
//*
//_
//TODO
//Bookmark


// Basic error handling
window.onerror = function (errorMsg, url, lineNumber, column, errorObj) {
    alert('Error: ' + errorMsg + ' Script: ' + url + ' Line: ' + lineNumber
    + ' Column: ' + column + ' StackTrace: ' + errorObj);
}

//console.log("Function caller is " + arguments.callee.caller.name);

// BOOKMARK - This is again, of course, just a goddamn nightmare.
// Part of the History API
window.addEventListener('popstate', function (event) {

    if(event.state) {
        switch(event.state.type) {
            case stateTypes.page:
                PageHdlr.GoTo(event.state.path, false);
                break;
            case stateTypes.tree:
                TreeHdlr.GoTo(event.state._id, event.state.idx, event.state.isCtrl, false);
                break;
        }
    }        
});

// Other general utilities / helper functions
var Utility = (function () {

    var parser = new DOMParser();

    return {
        html: {
            AddClass: function (elem, newClass) {
                var classStr = elem.getAttribute('class') || '';
                if(!((' ' + classStr + ' ').indexOf(' ' + newClass + ' ') > -1)) {
                    classStr += ' ' + newClass;
                    elem.setAttribute('class', classStr);
                }
            },
            // TODO: Copy above for RemoveClass ?? Problems getting it to work before?
            CheckClass: function (elem, className) {
                var classStr = elem.getAttribute('class');
                return (' ' + classStr + ' ').indexOf(' ' + className + ' ') > -1;
            },
            ChangeClass: function (elem, oldClass, newClass) {
                var classStr = elem.getAttribute('class');
                classStr = classStr.replace(oldClass, newClass);
                elem.setAttribute('class', classStr);
            },
            ChangeClassOfGroup: function (elems, oldClass, newClass) {
                // For obj
                for (var elem in elems) {
                    elems[elem].className = elems[elem].className.replace(oldClass, newClass);
                }

                // For array
                /*
                for (let i = 0; i < elems.length; i++)
                    elems[i].className = elems[i].className.replace(oldClass, newClass);
                 */
            },
            AppendNewElem: function (elem, str_Elem) {
                elem.appendChild(document.createElement(str_Elem));
            },
            RemoveElem: function (elem) {
                elem.parentElement.removeChild(elem);
            },
            AddAttribute: function (elem, str_Att, str_Function) {
                elem.setAttribute(str_Att, str_Function);
            },
            FromString: function(string, arrTrue) {
                //* This seems to work for now, though it's likely to fuck up at some point
                // var html = parser.parseFromString(string, "text/html");
                // var body = html.getElementsByTagName("BODY")[0];
                // return arrTrue ? body.children : body.firstElementChild;

                //* This seems to require specific xml parsing to fully acquire to elements i want right away.
                // let frag = document.createRange().createContextualFragment(string);
                // console.log(frag);
                // console.log(frag.firstElementChild);
                // return arrTrue ? frag.children : frag.firstElementChild;

                //* New one I saw, we shall see.
                var template = document.createElement('template');
                if(!arrTrue)
                    string = string.trim();

                template.innerHTML = string;
                return arrTrue ? template.content.children : template.content.firstElementChild;
            },
            ColourByValidity: function(elem) {
                if (elem.checkValidity() || elem.value == "")
                    elem.style.boxShadow = "";
                else
                    elem.style.boxShadow = "0px 0px 2px 2px red";
            },
            ToggleShowPassword: function(cbElem, pwElem) {
                if(cbElem.checked)
                    pwElem.setAttribute('type', 'text');
                else
                    pwElem.setAttribute('type', 'password');
            },
            GetRect: function(elem, scrollElem) {
                var box = elem.getBoundingClientRect();
                
                var body = document.body;
                var docEl = document.documentElement;
            
                var scrollTop = scrollElem ? scrollElem.scrollTop : window.pageYOffset || docEl.scrollTop || body.scrollTop;
                var scrollLeft = scrollElem ? scrollElem.scrollLeft : window.pageXOffset || docEl.scrollLeft || body.scrollLeft;
            
                var clientTop = docEl.clientTop || body.clientTop || 0;
                var clientLeft = docEl.clientLeft || body.clientLeft || 0;
            
                var x = box.left + scrollLeft - clientLeft;
                var y = box.top + scrollTop - clientTop;

                return { x: Math.round(x), y: Math.round(y), width: box.width, height: box.height };
            },
            GetOuterHeight: function(elem) {
                var h = elem.offsetHeight;
                var style = getComputedStyle(elem);
                
                h += parseInt(style.marginTop) + parseInt(style.marginBottom);
                return h;
            }
        },
        AJAX: function(method, url, isJson, data, Callback) {
            var xhttp = new XMLHttpRequest();
            xhttp.open(method, url, true);
            if(isJson) {
                xhttp.overrideMimeType('application/json');
                xhttp.setRequestHeader("Content-type", "application/json");
            }
            xhttp.onreadystatechange = function() {
                if (this.readyState == 4 && this.status == 200) {
                    if(isJson)
                        Callback(JSON.parse(this.responseText));
                    else
                        Callback(this.responseText);
                }
                else if(this.status == 404)
                    console.log('AJAX error');
            };
            if(isJson)
                xhttp.send(JSON.stringify(data));
            else
                xhttp.send(data);
        },
        json: {
            Load: function (file, CompCallback, ProgCallback, noCache) {
                var request = new XMLHttpRequest();
                request.onreadystatechange = function () {
                    if (request.readyState == 1) {
                        request.overrideMimeType('application/json');
                        request.send();
                    }
                    else if (request.readyState == 4) {
                        if (request.status == 200) {
                            CompCallback(request.responseText);
                        }
                        else if (request.status == 404) {
                            throw 'In Utility.json.Load(), File "' + file + '" does not exist.';
                        }
                        else {
                            alert(file + ": " + request.responseText);
                            throw 'XHR error ' + request.status + '.';
                        }
                    }
                }

                var url = file;
                if (noCache)
                    url += '?' + (new Date()).getTime();

                request.addEventListener('progress', ProgCallback, false);
                request.open('GET', url, true);
            }

        },
        localStorage: {
            // Checking for local save capability
            isAvail: (typeof (Storage) !== undefined),
            Save: function (idx, obj) {
                localStorage.setItem(idx, JSON.stringify(obj));
            },
            Retrieve: function (idx) {
                var saveObj = localStorage.getItem(idx);

                return (saveObj === null) ? null : JSON.parse(saveObj);
            },
            Remove: function (idx) {
                localStorage.removeItem(idx);
            }
        },
        history: {
            isAvail: (typeof (History) !== undefined),
            freshPageLoad: true,
            Push: function(data, url) {                
                // First time, just replace what's in the url
                if (Utility.history.freshPageLoad) {
                    Utility.history.Replace(data, url);
                    Utility.history.freshPageLoad = false;
                }
                else // Every other new tree loaded, push the new state as appropriate
                    history.pushState(data, null, url);
            },
            Replace: function(data, url) {
                 history.replaceState(data, null, url);
            }
        },
        math: {
            GetRandInt: function(min, max) {
                return Math.floor(Math.random() * (max - min + 1)) + min;
            }
        },
        template: {
            /*  HTML importing (below) Only works in chrome. :(
                Use polyfill for other browsers if necessary --> <script src="https://cdnjs.cloudflare.com/ajax/libs/webcomponentsjs/0.7.6/webcomponents.min.js"></script>
                https://www.webcomponents.org/polyfills/
                This can have script tags inside, so maybe it's the best option.      
                            
                var importHTML = document.querySelector(templateIdObj); // Link tag, rel = import, href = another html 
                console.log(importHTML);
                var template = importHTML.import.querySelector('template'); // Template tag inside imported doc
                console.log(template.content);
                dynElems[elemID].elem.appendChild(document.importNode(template.content, true));*/

            PopulateDir: function (template, replaceKey, item) {
                var copy = template.innerHTML;
                var regex = new RegExp("{{" + replaceKey + "}}", ['g']); // regex = /{{key}}/g
                copy = copy.replace(regex, item);
                return copy;
            },
            PopulateDir_Arr: function (template, replaceKey, arr) {
                var listString = '';
                var regex = new RegExp("{{" + replaceKey + "}}", ['g']);
                arr.forEach(function (item) {
                    var copy = template.innerHTML;
                    listString += copy.replace(regex, item);
                });
                return listString;
            },
            PopulateByObj: function (template, dataObj) {
                var copy = template.innerHTML;
                for (var key in dataObj) {
                    var regex = new RegExp("{{" + key + "}}", ['g']);
                    copy = copy.replace(regex, dataObj[key]);
                }
                return copy;
            },
            PopulateByRecursiveObjArr: function (templateIdObj, recurObjArr, extraSweepObj) {
                
                var stringGroup = {};
                function thisPopulate(copy, objData) {
                    for (var key in objData) {
                        if (objData[key].constructor === Array) {
                            var template = document.getElementById(templateIdObj[key]).innerHTML;
                            stringGroup[key] = "";
                            objData[key].forEach(function (obj) {
                                stringGroup[key] += thisPopulate(template, obj);
                            });
                            var regex = new RegExp("{{" + key + "}}", ['g']);
                            copy = copy.replace(regex, stringGroup[key]);
                        }
                        else {
                            var regex = new RegExp("{{" + key + "}}", ['g']);
                            copy = copy.replace(regex, objData[key]);
                        }
                    }
                    return copy;
                }

                var passObj = { 'initKey' : recurObjArr };
                if (extraSweepObj) {
                    for (var key in extraSweepObj) {
                        passObj[key] = extraSweepObj[key];
                    }
                }
                var returnObj = thisPopulate('{{initKey}}', passObj);
                stringGroup = {};
                return returnObj;
            }
        },
        gen: {
            ArrIdxByProp: function(array, key, value) {
                for(var i = 0, len = array.length; i < len; i ++)
                    if(array[i][key] === value)
                        return i;
                return -1;
            },
            B64: function(e) {
                var t ="";
                var n = new Uint8Array(e);
                var r = n.byteLength;
                
                for(var i = 0; i < r; i++) {
                    t+= String.fromCharCode(n[i])
                }
                return window.btoa(t)
            }
        }
    }
})();

var InvFilter = (function () {

    function ChangeVisByType(listItems, invRespType) {
        for(var i = 0; i < listItems.length; i++) {
            if(Number(listItems[i].getAttribute('data-invite')) == invRespType)
                ElemDyns.ShowUnregOne(listItems[i]);
            else
                ElemDyns.HideUnregOne(listItems[i]);
        }
    }

    return {
        ChangeFilterBtn: function(elemID, IdPrefix, list) {
            if(elemID == IdPrefix + 'TotalFilter')
                ElemDyns.ShowUnregisteredColl(list);
            else if(elemID == IdPrefix + 'AccFilter')
                ChangeVisByType(list, Consts.inviteResps.ACCEPT);
            else if(elemID == IdPrefix + 'PendFilter')
                ChangeVisByType(list, Consts.inviteResps.NONE);
            else if(elemID == IdPrefix + 'RejFilter')
                ChangeVisByType(list, Consts.inviteResps.REJECT);
        }
    }
})();

// This is specifically set up for slide-show style navigation
var DataNavHdlr = (function() {

    var incrBtn, decrBtn, currDisp, totalDisp;
    var idx = 0, len = 0, data = [];
    var ChangeDataCB = function() {};
    var DeleteDataCB = function() {};

    function ChangeDataSet(idxAdd) {
        if(len > 0) {
            idx = (idx + len + idxAdd) % len;
            currDisp.textContent = idx + 1;
            ChangeDataCB(data[idx]);
        }
        else
            ChangeDataCB(null);
    }

    return {
        SetElems: function(incrBtnElem, decrBtnElem, currDispElem, totalDispElem) {
            incrBtn = incrBtnElem;
            decrBtn = decrBtnElem;
            currDisp = currDispElem;
            totalDisp = totalDispElem;

            idx = 0;
            incrBtn.onclick = function() {
                ChangeDataSet(1);
            };
            decrBtn.onclick = function() {
                ChangeDataSet(-1);
            };
        },
        SetData: function(dataArr, ChangeCallback, DeleteCallback) {
            data = dataArr;
            len = dataArr.length;
            idx = 0;
            ChangeDataCB = ChangeCallback;
            DeleteDataCB = DeleteCallback || function() {};
            totalDisp.textContent = len;
            ChangeDataSet(0);
        },
        DestroyActiveIdx: function() {
            if(len > 0) {
                DeleteDataCB(idx, (data.splice(idx, 1))[0]);
                len = data.length;
                totalDisp.textContent = len;
                ChangeDataSet(0);
            }
        }
    }
})();

// This is specifically set up for email-list style navigation
var DataListHdlr = (function() {

    var liObj = {},
    objRefArr = [],
    deleteArr = [],
    currElemKey,
    len = 0,
    currDisp,
    totalDisp,
    dispIncr = 0;
    var ChangeDataCB = function() {};
    var DeleteSingleDataCB = function() {};
    var DeleteMultiDataCB = function() {};

    function UpdateCurrDisp(newDisp) {
        currDisp.textContent = newDisp + dispIncr;
    }
    function UpdateTotalDisp(newDisp) {
        totalDisp.textContent = newDisp + dispIncr;
    }

    function RemoveLI(dataKey) {

        len--;
        UpdateTotalDisp(len);

        // Send index and elem to callback where proper dom LI removal & db calls will take place.
        DeleteSingleDataCB(dataKey, liObj[dataKey], len);
        delete liObj[dataKey];

        var delListIdx = deleteArr.indexOf(dataKey);
        if(delListIdx > -1)
            deleteArr.splice(delListIdx, 1);

        var selArrIdx = objRefArr.indexOf(dataKey);
        objRefArr.splice(selArrIdx, 1);

        
        // If item to be deleted is the one currently focused, just go back to zero focus
        if(dataKey == currElemKey)
            NegateView();
        else // This needs to run after the splice, to reflect the new list size
            UpdateCurrIdxDisp();
    }

    function UpdateCurrIdxDisp() {
        UpdateCurrDisp(objRefArr.indexOf(currElemKey) + 1);
    }

    function NegateView() {
        currElemKey = -1;
        UpdateCurrDisp(0);
        ChangeDataCB(currElemKey);
    }

    function OnLIClick(event) {
        // currentTarget refers specifically to the elem with the listener, the LI in this case
        var dataKey = event.currentTarget.getAttribute('data-hashKey') || event.currentTarget.getAttribute('data-listIdx');
        if(Utility.html.CheckClass(event.target, 'deletionCheckbox')) {
            if(event.target.checked) {
                // Add item to deletion list
                deleteArr.push(dataKey);
            }
            else {
                // Remove item from deletion list
                var arrIdx = deleteArr.indexOf(dataKey);
                deleteArr.splice(arrIdx, 1);
            }
            return;
        }

        if(Utility.html.CheckClass(event.target, 'removeBtn')) {
            if(User.accountData.preferences.confMsgs.deleteFB) // User preference check
                if(!confirm('Delete item?'))
                    return;
            
            if(!User.IsGuestAccount()) {
                RemoveLI(dataKey);
            }
            return;
        }

        if(dataKey != currElemKey) {
            if(currElemKey != -1)
                Utility.html.ChangeClass(liObj[currElemKey], 'viewingTrue', 'viewingFalse');
            // "ViewING", marking is as the active element
            Utility.html.ChangeClass(liObj[dataKey], 'viewingFalse', 'viewingTrue');
            // vs. "ViewED"
            if(Utility.html.CheckClass(liObj[dataKey], 'viewedFalse')) {
                Utility.html.ChangeClass(liObj[dataKey], 'viewedFalse', 'viewedTrue');
            }
            ChangeDataCB(dataKey);
            currElemKey = dataKey;
            UpdateCurrIdxDisp();
        }
    }

    function OnDeleteGroupBtnClick() {
        if(deleteArr.length == 0) {
            return;
        }
        if(deleteArr.length == 1) {
            if(User.accountData.preferences.confMsgs.deleteFB) // User preference check
                if(!confirm('Delete checked item?'))
                    return;

            RemoveLI(deleteArr[0]);
        }
        else if(deleteArr.length == objRefArr.length) {
            if(User.accountData.preferences.confMsgs.deleteFB) // User preference check
                if(!confirm('Delete all items?'))
                    return;
                    
            DeleteMultiDataCB(objRefArr, liObj, 0);
        }
        else {
            if(User.accountData.preferences.confMsgs.deleteFB) // User preference check
                if(!confirm('Delete checked items?'))
                    return;

            var elemSendObj = {};
            for(var i = 0, length = deleteArr.length; i < length; i++) {
                // If one of the items selected for deletion is highlighted/active
                if(deleteArr[i] == currElemKey)
                    NegateView();
                // Put all selected elems into it's own object for deletion
                elemSendObj[deleteArr[i]] = liObj[deleteArr[i]];
                len--;
            }
            UpdateTotalDisp(len);
            DeleteMultiDataCB(deleteArr, elemSendObj, len);

            // Cleanup data post-deletion
            for(var i = 0, length = deleteArr.length; i < length; i++) {
                delete elemSendObj[deleteArr[i]];
                delete liObj[deleteArr[i]];
                objRefArr.splice(objRefArr.indexOf(deleteArr[i]), 1);
            }
            // Filter and return all items that are NOT on the deletion list

            /*
            objRefArr = objRefArr.filter(function(val, idx) {
                return sendArr.indexOf(idx) == -1;
            });
            objRefArr = objRefArr.filter(function(val, idx) {
                return deleteArr.indexOf(val) == -1;
            });*/

            // Update display if needed
            if(currElemKey != -1)
                UpdateCurrIdxDisp();
        }
        deleteArr = [];
    }

    function OnSelectAllBtnClick() {
        var allItemsSelected = (deleteArr.length == len);
        deleteArr = [];
        if(allItemsSelected) {
            for(var key in liObj)
                liObj[key].getElementsByClassName('deletionCheckbox')[0].checked = false;
        }
        else {
            for(var key in liObj) {
                liObj[key].getElementsByClassName('deletionCheckbox')[0].checked = true;
                // Easier to clear it out and add everything than to check which items have already been added.
                deleteArr.push(key);
            }
        }
    }

    return {
        SetCtrlElems: function(selectAllElem, deleteGroupElem, currDispElem, totalDispElem) {
            selectAllElem.addEventListener('click', OnSelectAllBtnClick);
            
            if(!User.IsGuestAccount()) {
                deleteGroupElem.addEventListener('click', OnDeleteGroupBtnClick);
            }
            currDisp = currDispElem;
            totalDisp = totalDispElem;

            idx = 0;
        },
        SetData: function(liElems, ChangeCB, DeleteSingleCB, DeleteMultiCB) {
            liObj = {};
            objRefArr = [];
            
            currElemKey = -1;
            currDisp.textContent = 0;
            len = liElems.length;
            UpdateTotalDisp(len);

            for(var i = 0; i < len; i++) {
                liElems[i].addEventListener('click', OnLIClick);
                var key = liElems[i].getAttribute('data-hashKey') || liElems[i].getAttribute('data-listIdx');
                liObj[key] = liElems[i];
                objRefArr[i] = key;
            }

            ChangeDataCB = ChangeCB || function() {};
            if(!User.IsGuestAccount()) {
                DeleteSingleDataCB = DeleteSingleCB || function() {};
                DeleteMultiDataCB = DeleteMultiCB || function() {};
            }
        },
        AdjustDispIncrs: function(incr) {
            dispIncr = incr;
            // Refresh displays to reflect changes
            UpdateCurrDisp(Number(currDisp.textContent));
            UpdateTotalDisp(Number(totalDisp.textContent));
        }
    }
})();

function AdjustRatingBarColourVal(pctVal) {
    if(pctVal == 0) return 0;
    else if(pctVal <= 20) return 1;
    else if(pctVal <= 40) return 2;
    else if(pctVal <= 60) return 3;
    else if(pctVal <= 80) return 4;
    else if(pctVal <= 100) return 5;
}

function NewMailFilter(groupElem, filterOn) {
    var filterElems = groupElem.getElementsByClassName('filterNewFBFalse');
    if(filterOn)
        ElemDyns.HideUnregisteredColl(filterElems);
    else
        ElemDyns.ShowUnregisteredColl(filterElems);
}
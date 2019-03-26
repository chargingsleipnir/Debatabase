var ElemDyns = (function () { 

    var classNames = {
        hiddenAlphaZero: "hiddenAlphaZero",
        hidden: "hideTrue",
        visible: "hideFalse",
        active: "activeTrue",
        inactive: "activeFalse",
        enabled: "enabledTrue",
        disabled: "enabledFalse",
        erroneous: "errorTrue",
        correct: "errorFalse",
        animate: "animPos",
        dead: "animNeg",
        obscured: 'obscuredTrue',
        unobscured: 'obscuredFalse',
        cssSwitchOn: 'cssSwitchTrue',
        cssSwitchOff: 'cssSwitchFalse'
    };

    var obscuredUL,
    ObscuredULElemAddedCB = function(elem){
        //console.log('element added to obscuredUL, offsetHeight: ' + elem.offsetHeight);
        //console.log(elem);
    };

    function DynElem(elem) {
        return { 
            elem: elem,
            subElems: {},
            timeout: null,
            NewInnards: function(string) {
                elem.innerHTML = string;
            },
            ClearInnards: function () {
                elem.innerHTML = '';
            },
            HasInnards: function() {
                return elem.innerHTML != '';
            },
            AddHTMLString: function(string) {
                elem.innerHTML += string;
            },
            AddHTMLNode: function(newElem) {
                elem.appendChild(newElem);
            },
            AddHTMLNodeToFront: function(newElem) {
                if(elem.children[0])
                    elem.insertBefore(newElem, elem.children[0]);
                else
                    elem.appendChild(newElem);
            },
            RemoveHTMLNode: function(node) {
                elem.removeChild(node);
            },
            ReplaceHTMLNode: function(newElem, oldElem) {
                elem.replaceChild(newElem, oldElem);
            },
            GetListItems: function () {
                return elem.children;
            },
            GetListLength: function () {
                return elem.children.length;
            },
            GetLastChild: function () {
                return elem.lastElementChild;
            }
        };
    }
    
    function TabbedBox(arr_TabElems, arr_PanelElems, alwaysOpen, animElemID, OnOpenCB, OnCloseCB) {
        var i = 0;
        this.tabs = new DynElemCont();
        this.panels = new DynElemCont();
        this.isOpen = alwaysOpen;
        this.ExtraEndCB = null;
        var that = this;

        if(OnOpenCB)
            this.OnOpenCB = OnOpenCB;
        if(OnCloseCB)
            this.OnCloseCB = OnCloseCB;
        // assuming tabs and panels are same length, as they must be,
        // make highlightable tabs and hidable panels
        for (i = 0; i < arr_TabElems.length; i++) {
            ElemDyns.MakeHighlightable(this.tabs, arr_TabElems[i].id, false, true);
            ElemDyns.MakeDisablable(this.tabs, arr_TabElems[i].id, true);
            ElemDyns.MakeHidable(this.panels, arr_PanelElems[i].id);
        }
        // Show first index of each, as tabbed box presumes something is always displaying
        if(alwaysOpen) {
            for (i = 0; i < arr_TabElems.length; i++) {
                if(this.tabs.hash[arr_TabElems[i].id].enabled) {
                    this.tabs.hash[arr_TabElems[i].id].Highlight();
                    this.panels.hash[arr_PanelElems[i].id].Show();
                    break;
                }
            }
        }

        if(animElemID) {
            this.panelCont = new DynElemCont();

            // Need to do it this way to pass tabs and panels in.
            function HandleTabAnim(tabs, panels) {
                return function(event, animPos) {
                    if(!animPos) {
                        for (i = 0; i < arr_TabElems.length; i++) {
                            tabs.hash[arr_TabElems[i].id].Downplay();
                            panels.hash[arr_PanelElems[i].id].Hide();
                        }
                        if(that.OnCloseCB) {
                            that.OnCloseCB();
                        }
                    }

                    that.isOpen = animPos;
                    if(that.ExtraEndCB) {
                        that.ExtraEndCB();
                        that.ExtraEndCB = null;
                    }
                }
            }
            ElemDyns.MakeTransitional(this.panelCont, animElemID, HandleTabAnim(this.tabs, this.panels));
        }

        function NextAbleTab(startID) {
            // Establish starting point
            var startIdx = -1;
            for (i = 0; i < arr_TabElems.length; i++) {
                if(startID == arr_TabElems[i].id) {
                    startIdx = i;
                    break;
                }
            }
            // From there, check all tabs after
            for (i = startIdx; i < arr_TabElems.length; i++) {
                if(that.tabs.hash[arr_TabElems[i].id].enabled) {
                    return {
                        tabID: arr_TabElems[i].id,
                        panelID: arr_PanelElems[i].id
                    }
                }
                else {
                    that.tabs.hash[arr_TabElems[i].id].Downplay();
                    that.panels.hash[arr_PanelElems[i].id].Hide();
                }
            }
            // If that didn't work, start from zero and check up to the startID
            for (i = 0; i < startIdx; i++) {
                if(that.tabs.hash[arr_TabElems[i].id].enabled) {
                    return {
                        tabID: arr_TabElems[i].id,
                        panelID: arr_PanelElems[i].id
                    }
                }
                else {
                    that.tabs.hash[arr_TabElems[i].id].Downplay();
                    that.panels.hash[arr_PanelElems[i].id].Hide();
                }
            }
            // If none of that worked, tabs are closed, nothing enabled
            that.isOpen = false;
            if(that.OnCloseCB)
                that.OnCloseCB();

            return null;
        }

        this.CheckTabActive = function(tabID) {
            if(this.tabs.hash[tabID])
                return this.tabs.hash[tabID].lit;
            return false;
        };

        this.GetAnimElem = function() {
            return this.panelCont.hash[animElemID].elem;
        };

        this.CheckTabClicked = function(clickedElem) {
            for (i = 0; i < arr_TabElems.length; i++) {
                if(this.tabs.hash[arr_TabElems[i].id].elem.contains(clickedElem))
                    return true;
            }
            return false;
        };

        this.CheckPanelContClicked = function(clickedElem) {
            if(this.panelCont.hash[animElemID].elem.contains(clickedElem))
                return true;
            return false;
        };
        
        this.ChangeTab = function(idNewTab, idNewPanel) {

            if(!this.tabs.hash[idNewTab].enabled)
                return;

            // Check that tab/panel might already be showing
            if(this.tabs.hash[idNewTab].lit) {
                // This makes sure that the active panel can be closed if desired.
                if(!alwaysOpen) {
                    this.tabs.hash[idNewTab].Downplay();
                    if(this.panelCont)
                        this.panelCont.hash[animElemID].AnimateNeg();
                    else {
                        this.isOpen = false;
                        this.panels.hash[idNewPanel].Hide();
                    }
                }
            }
            else {
                // If the panel actually has visible content
                // ? Had this in the check as well, but it was causing too many false negatives --> this.panels.hash[idNewPanel].elem.textContent.match(/\S/) &&
                if(this.panels.hash[idNewPanel].elem.innerHTML != '') {
                    // OnOpen CB, only if originally set.
                    if(this.OnOpenCB)
                        this.OnOpenCB();

                    // Hide all existing panels, so long as any are open
                    var checkAllHidden = true;
                    for (i = 0; i < arr_TabElems.length; i++) {
                        // Use this to determine if box is openning tab from all being closed or switching tabs
                        if(!this.panels.hash[arr_PanelElems[i].id].hidden) {
                            this.panels.hash[arr_PanelElems[i].id].Hide();
                            checkAllHidden = false;
                        }
                        this.tabs.hash[arr_TabElems[i].id].Downplay();
                    }

                    this.tabs.hash[idNewTab].Highlight();
                    this.panels.hash[idNewPanel].Show();
                    if(checkAllHidden && this.panelCont)
                        this.panelCont.hash[animElemID].AnimatePos();
                    else
                        this.isOpen = true;
                }
                else {
                    this.CloseAll();
                }
            }
        }

        this.ChangeTabAbility = function(tabID, isAble) {
            if(isAble) {
                this.tabs.hash[tabID].Enable();
            }
            else {
                this.tabs.hash[tabID].Disable();
                // if I just disabled the active tab, move on to the next one.
                if(this.tabs.hash[tabID].lit) {
                    var ableTabObj = NextAbleTab(tabID);
                    if(ableTabObj)
                        this.ChangeTab(ableTabObj.tabID, ableTabObj.panelID);
                }
            }
        }

        this.CheckIsOpen = function() {
            return this.isOpen;
        }

        this.CloseAll = function (animEndCB) {
            if(animEndCB) {
                if(!this.isOpen) {
                    animEndCB();
                    return
                }
                this.ExtraEndCB = animEndCB;
            }

            if(!alwaysOpen) {
                if(this.panelCont)
                    this.panelCont.hash[animElemID].AnimateNeg();
                else {
                    for (i = 0; i < arr_TabElems.length; i++) {
                        this.tabs.hash[arr_TabElems[i].id].Downplay();
                        this.panels.hash[arr_PanelElems[i].id].Hide();
                    }
                    this.isOpen = false;
                    if(this.OnCloseCB) {
                        this.OnCloseCB();
                    }
                }
            }
        }

        this.CloseIfEmpty = function(idPanel) {
            if(!this.panels.hash[idPanel].elem.textContent.match(/\S/) || this.panels.hash[idPanel].elem.innerHTML == '') {
                this.panels.hash[idPanel].elem.textContent = '';
                this.panels.hash[idPanel].elem.innerHTML = ''
                this.CloseAll();
            }                
        }
    }

    function CheckAndAddBaseDynElem(dynElemCont, elemKey) {
        if (!dynElemCont.hash.hasOwnProperty(elemKey)) {
            dynElemCont.hash[elemKey] = new DynElem(document.getElementById(elemKey));
            dynElemCont.count++;
        }

        return dynElemCont.hash[elemKey];
    }
    return {
        Init: function() {
            obscuredUL = document.getElementById('ObscuredUL');
            // var observer = new MutationObserver(function(mutations) {
            // *   If I use this observer for different things/elements...
            //     for(var i = 0, len = mutations.length; i < len; i++) {
            //         if(mutations[i].target.id == obscuredUL.id) {

            //         }
            //     }
            //     
            //     if(mutations[0].addedNodes.length > 0) {
            //         ObscuredULElemAddedCB(mutations[0].addedNodes[0]);
            //     }
            // });
            // var config = { childList: true, /*attributes: true, characterData: true*/ };
            // observer.observe(obscuredUL, config);
        },
        MakeDynamic: function (dynElemCont, elemKeys) {
            var objRef;
            // If it's an array, must be array first with elem ID, followed by nested classes.
            if(elemKeys.constructor === Array) {
                objRef = CheckAndAddBaseDynElem(dynElemCont, elemKeys[0]);
                for(var i = 1; i < elemKeys.length; i++) {
                    if(!objRef.subElems.hasOwnProperty(elemKeys[i]))
                        // Create sub dynamic element at this level
                        objRef.subElems[elemKeys[i]] = new DynElem(objRef.elem.getElementsByClassName(elemKeys[i])[0]);
                    // Go one nested level deeper
                    objRef = objRef.subElems[elemKeys[i]];
                }
            }
            else {
                objRef = CheckAndAddBaseDynElem(dynElemCont, elemKeys);
            }
            return objRef;
        },
        MakeHidable: function (dynElemCont, elemKeys) {
            
            var dynObj = ElemDyns.MakeDynamic(dynElemCont, elemKeys);
            
            dynObj.hidable = true;
            dynObj.hidden = Utility.html.CheckClass(dynObj.elem, classNames.hidden);
            //Utility.html.AddClass(dynObj.elem, classNames.hiddenAlphaZero);

            dynObj.Hide = function () {
                if(!dynObj.hidden) {
                    Utility.html.ChangeClass(dynObj.elem, classNames.visible, classNames.hidden);
                    dynObj.hidden = true;
                }
            }
            dynObj.Show = function () {
                if(dynObj.hidden) {
                    Utility.html.ChangeClass(dynObj.elem, classNames.hidden, classNames.visible);
                    dynObj.hidden = false;
                }
            }
            dynObj.ToggleVisibility = function () {
                if (dynObj.hidden)
                    dynObj.Show();
                else
                    dynObj.Hide();
            }
        },
        MakeObscurable: function (dynElemCont, elemKeys) {
            
            var dynObj = ElemDyns.MakeDynamic(dynElemCont, elemKeys);
            
            dynObj.obscurable = true;
            dynObj.obscured = Utility.html.CheckClass(dynObj.elem, classNames.obscured);

            dynObj.Hide = function () {
                if(!dynObj.obscured) {
                    Utility.html.ChangeClass(dynObj.elem, classNames.unobscured, classNames.obscured);
                    dynObj.obscured = true;
                }
            }
            dynObj.Show = function () {
                if(dynObj.obscured) {
                    Utility.html.ChangeClass(dynObj.elem, classNames.obscured, classNames.unobscured);
                    dynObj.obscured = false;
                }
            }
            dynObj.ToggleVisibility = function () {
                if (dynObj.obscured)
                    dynObj.Show();
                else
                    dynObj.Hide();
            }
        },
        MakeHighlightable: function (dynElemCont, elemKeys, highlight, asTab) {
            
            var dynObj = ElemDyns.MakeDynamic(dynElemCont, elemKeys);
            
            dynObj.lit = highlight;
            
            if (asTab) {
                dynObj.Highlight = function () {
                    Utility.html.ChangeClass(dynObj.elem, classNames.inactive, classNames.active);
                    dynObj.lit = true;
                }
                dynObj.Downplay = function () {
                    Utility.html.ChangeClass(dynObj.elem, classNames.active, classNames.inactive);
                    dynObj.lit = false;
                }
                dynObj.ToggleHighlight = function () {
                    if (dynObj.lit)
                        dynObj.Downplay();
                    else
                        dynObj.Highlight();
                }
                
                if (highlight)
                    Utility.html.AddClass(dynObj.elem, classNames.active);
                else
                    Utility.html.AddClass(dynObj.elem, classNames.inactive);
            }
            else {
                dynObj.Highlight = function () {
                    Utility.html.ChangeClass(dynObj.elem, classNames.correct, classNames.erroneous);
                    dynObj.lit = true;
                }
                dynObj.Downplay = function () {
                    Utility.html.ChangeClass(dynObj.elem, classNames.erroneous, classNames.correct);
                    dynObj.lit = false;
                }
                dynObj.ToggleHighlight = function () {
                    if (dynObj.lit)
                        dynObj.Downplay();
                    else
                        dynObj.Highlight();
                }
                
                if (highlight)
                    Utility.html.AddClass(dynObj.elem, classNames.erroneous);
                else
                    Utility.html.AddClass(dynObj.elem, classNames.correct);
            }
        },
        MakeDisablable: function(dynElemCont, elemKeys, enabled) {
            var dynObj = ElemDyns.MakeDynamic(dynElemCont, elemKeys);

            // Add class if it doesn't already exist
            if(Utility.html.CheckClass(dynObj.elem, classNames.disabled))
                dynObj.enabled = false;
            else if(Utility.html.CheckClass(dynObj.elem, classNames.enabled))
                dynObj.enabled = true;
            else {
                dynObj.enabled = enabled;
                if(enabled)
                    Utility.html.AddClass(dynObj.elem, classNames.enabled);
                else
                    Utility.html.AddClass(dynObj.elem, classNames.disabled);
            }

            dynObj.Enable = function() {
                if(!dynObj.enabled) {
                    Utility.html.ChangeClass(dynObj.elem, classNames.disabled, classNames.enabled);
                    dynObj.enabled = true;
                }
            }
            dynObj.Disable = function() {
                if(dynObj.enabled) {
                    Utility.html.ChangeClass(dynObj.elem, classNames.enabled, classNames.disabled);
                    dynObj.enabled = false;
                }
            }
            dynObj.ToggleAbility = function () {
                if (dynObj.enabled)
                    dynObj.Disable();
                else
                    dynObj.Enable();
            }
        },
        //* This is here to be generic, ZERO specific styling intent - use on per element basis
        GiveCssSwitch: function(dynElemCont, elemKeys, switchedOn) {
            var dynObj = ElemDyns.MakeDynamic(dynElemCont, elemKeys);

            dynObj.on = switchedOn;
            if(switchedOn)
                Utility.html.AddClass(dynObj.elem, classNames.cssSwitchOn);
            else
                Utility.html.AddClass(dynObj.elem, classNames.cssSwitchOff);

            dynObj.On = function() {
                if(!dynObj.on) {
                    Utility.html.ChangeClass(dynObj.elem, classNames.cssSwitchOff, classNames.cssSwitchOn);
                    dynObj.on = true;
                }
            }
            dynObj.Off = function() {
                if(dynObj.on) {
                    Utility.html.ChangeClass(dynObj.elem, classNames.cssSwitchOn, classNames.cssSwitchOff);
                    dynObj.on = false;
                }
            }
            dynObj.ToggleSwitch = function () {
                if (dynObj.on)
                    dynObj.Off();
                else
                    dynObj.On();
            }
        },
        MakeBillboard: function (dynElemCont, elemKeys) {
            var dynObj = ElemDyns.MakeDynamic(dynElemCont, elemKeys);

            if(dynObj.elem.nodeName == 'INPUT' || dynObj.elem.nodeName == 'TEXTAREA') {
                dynObj.DisplayMsg = function (msg) {
                    dynObj.elem.value = msg;
                };
                dynObj.ClearMsg = function () {
                    dynObj.elem.value = '';
                };
                dynObj.GetMsg = function() {
                    return dynObj.elem.value;
                };
                dynObj.HasMsg = function() {
                    return dynObj.elem.value != '';
                };
            }
            else {
                dynObj.DisplayMsg = function (msg) {
                    dynObj.elem.textContent = msg;
                };
                dynObj.ClearMsg = function () {
                    dynObj.elem.textContent = '';
                };
                dynObj.GetMsg = function() {
                    return dynObj.elem.textContent;
                };
                dynObj.HasMsg = function() {
                    return dynObj.elem.textContent != '';
                };
            }
            dynObj.TimedMsg = function (msg, secs) {
                // Trying to ensure the newest message always lasts full time
                if (dynObj.timeout) clearTimeout(dynObj.timeout);

                dynObj.DisplayMsg(msg);

                dynObj.timeout = setTimeout(function () { 
                    dynObj.ClearMsg();
                    dynObj.timeout = null;
                }, secs * 1000);
            }
        },
        MakeInputAdjustable: function (dynElemCont, elemKeys) {
            var dynObj = ElemDyns.MakeDynamic(dynElemCont, elemKeys);
            
            dynObj.readonly = dynObj.elem.readOnly;
            
            dynObj.SetValue = function (msg, readonly) {
                dynObj.elem.value = msg;
                dynObj.elem.readOnly = readonly
            }
            dynObj.ClearValue = function () {
                // No reason an input field should be readonly and displaying nothing but the placeholder.
                dynObj.elem.value = " ";
                dynObj.elem.readOnly = false;
            }
        },
        /* TODO: Still deciding between: 
            Utility.html.GetOuterHeight
            offsetHeight
            clientHeight, and
            style.height - would ideally be best, since that's where it's returning
        to capture enough of element. */
        AnimateExtensibility: function (dynElemCont, elemKeys, heightKnown) {
            var dynObj = ElemDyns.MakeDynamic(dynElemCont, elemKeys);
            var startFlattened = false;
            var listItems = dynObj.elem.children;

            Utility.html.AddClass(dynObj.elem, 'extensibleListCont');

            // The new class does not affect height, so this is fine here.
            // Having flattened list items is the only thing I want affecting height
            if(Utility.html.CheckClass(dynObj.elem, classNames.obscured))
                startFlattened = true;
            else if(listItems.length == 0) {
                startFlattened = true;
                Utility.html.AddClass(dynObj.elem, classNames.obscured);
            }
            else
                Utility.html.AddClass(dynObj.elem, classNames.unobscured);

            // This classification will automatically include animation of list & items.
            // Use two classes to ensure other uses of animPos or animNeg aren't interfered with
            function CacheHeight(li) {
                if(!li.heightToCache)
                    li.heightToCache = li.offsetHeight;
            }
            function InitItemClasses(li, flattened) {
                if(flattened)
                    Utility.html.AddClass(li, 'animNeg');
                else
                    Utility.html.AddClass(li, 'animPos');
            }
            function DisableTransition(li) {
                if(Utility.html.CheckClass(li, 'enableTransition'))
                    Utility.html.ChangeClass(li, 'enableTransition', 'disableTransition');
                else
                    Utility.html.AddClass(li, 'disableTransition');
            }
            function ReEnableTransition(li) {
                if(Utility.html.CheckClass(li, 'disableTransition'))
                    Utility.html.ChangeClass(li, 'disableTransition', 'enableTransition');
                else
                    Utility.html.AddClass(li, 'enableTransition');
                
            }

            function PrepLI(prepend, li, startFlat) {
                DisableTransition(li);
                if(!heightKnown) {
                    obscuredUL.appendChild(li);
                    CacheHeight(li);
                }
                InitItemClasses(li, startFlat);
                if(!heightKnown) {
                    if(prepend && dynObj.elem.children.length > 0)
                        dynObj.elem.insertBefore(li, dynObj.elem.children[0]);
                    else
                        dynObj.elem.appendChild(li);
                }
            }

            if(heightKnown) {
                for(var i = 0, len = listItems.length; i < len; i++)
                    PrepLI(false, listItems[i], startFlattened);
            }
            else {
                for(var i = 0, len = listItems.length; i < len; i++)
                    PrepLI(false, listItems[0], startFlattened);
            }
            listItems = dynObj.elem.children;


            dynObj.ChangeLIHeight = function(li, deltaH, CB) {
                li.heightToCache += deltaH;
                if(Utility.html.CheckClass(li, 'animPos')) {
                    function Shrunk(event) {
                        // The element will be removed and sent through the callback to be used again
                        event.target.removeEventListener('transitionend', Shrunk);
                        CB(event.target.heightToCache);
                    }
                    li.addEventListener('transitionend', Shrunk);
                    li.style.height = (li.heightToCache || 0) + 'px';
                }
            }

            dynObj.RecaptureHeight = function() {
                
            }

            dynObj.DisableExtensibleAnim = function(li) {
                li.removeAttribute('style');
                DisableTransition(li);
            }

            dynObj.ReEnableExtensibleAnim = function(li) {
                //li.heightToCache = li.offsetHeight;
                //li.style.height = (li.heightToCache || 0) + 'px';
                ReEnableTransition(li);
            }

            dynObj.Expand = function(interval, CB) {
                if(listItems.length > 0) {
                    function lastItemExpanded(event) {
                        event.target.removeEventListener('transitionend', lastItemExpanded);
                        CB(true);
                    }
                    listItems[listItems.length - 1].addEventListener('transitionend', lastItemExpanded);

                    Utility.html.ChangeClass(dynObj.elem, classNames.obscured, classNames.unobscured);

                    for(var i = 0, len = listItems.length; i < len; i++)
                        ReEnableTransition(listItems[i]);
                    
                    listItems[0].style.height = listItems[0].heightToCache + 'px';
                    // Zero timer necessary for single thread to pass so transitions to instantiate
                    setTimeout(function() {
                        Utility.html.ChangeClass(listItems[0], 'animNeg', 'animPos');
                        
                        if(listItems.length > 1) {
                            var i = 1;
                            var TimerCB = function() {
                                listItems[i].style.height = listItems[i].heightToCache + 'px';
                                Utility.html.ChangeClass(listItems[i], 'animNeg', 'animPos');
                                i++;
                                if(i < listItems.length)
                                    setTimeout(TimerCB, interval);
                            }
                            interval = interval * 1000;                 
                            setTimeout(TimerCB, interval);
                        }
                    }, 0);
                }
                else
                    CB(false);
            };

            dynObj.Collapse = function(interval, CB) {
                if(listItems.length > 0) {
                    function lastItemCollapsed(event) {
                        Utility.html.ChangeClass(dynObj.elem, classNames.unobscured, classNames.obscured);
                        event.target.removeEventListener('transitionend', lastItemCollapsed);
                        CB(true);
                    }
                    listItems[0].addEventListener('transitionend', lastItemCollapsed);

                    for(var i = 0, len = listItems.length; i < len; i++)
                        ReEnableTransition(listItems[i]);
                    
                    // Zero timer necessary for single thread to pass so transitions to instantiate
                    setTimeout(function() {
                        listItems[listItems.length - 1].style.height = '0';
                        Utility.html.ChangeClass(listItems[listItems.length - 1], 'animPos', 'animNeg');
                        if(listItems.length > 1) {
                            var i = listItems.length - 2;
                            var TimerCB = function() {
                                listItems[i].style.height = '0';
                                Utility.html.ChangeClass(listItems[i], 'animPos', 'animNeg');
                                i--;
                                if(i > -1)
                                    setTimeout(TimerCB, interval);
                            }
                            interval = interval * 1000;                 
                            setTimeout(TimerCB, interval);
                        }
                    }, 0);
                }
                else
                    CB(false);
            }

            dynObj.ReplaceWith = function(newLIs, CB) {

                dynObj.Collapse(0.333, function(transitioned) {
                    dynObj.ClearInnards();

                    // Get new items, convert from string if necessary
                    newLIs = (typeof newLIs === 'string' || newLIs instanceof String) ? Utility.html.FromString(newLIs, true) : newLIs;

                    // Adding, then retrieving items, is what ensures their heights are calculated.
                    for(var i = 0, len = newLIs.length; i < len; i++) {
                        // !! .appendChild actually STEALS the element, hence still using index 0 for newLIs !!
                        dynObj.elem.appendChild(newLIs[0]);
                    }
                    listItems = dynObj.elem.children;
                    for(var i = 0, len = listItems.length; i < len; i++) {
                        // Cache heights for later use
                        CacheHeight(listItems[i]);
                        // Set classes
                        DisableTransition(listItems[i]);
                        InitItemClasses(listItems[i], true);
                    }

                    setTimeout(function() {
                        // Apparently the css is applied right away - transitions can be quickly brought back
                        for(var i = 0, len = listItems.length; i < len; i++)
                            ReEnableTransition(listItems[i]);

                        // Expand lists with new items
                        dynObj.Expand(0.333, CB);
                    }, 0);
                });                
            }

            // ! All of these functions seems built to handle themselves in the event of a display:none element,
            // ! (checking for dynObj.elem.offsetHeight != 0) though sometimes the changes still fail to take place.
            dynObj.ReplaceSingle = function(pushElem, popElem) {
                var listPlaceHolder = popElem.nextElementSibling;
                dynObj.Pop(popElem, function(listLen) {
                    if(listPlaceHolder)
                        dynObj.PushBefore(pushElem, listPlaceHolder, function() {});
                    else
                        dynObj.Push(false, pushElem, function() {})
                });
            };

            dynObj.PushBefore = function(li, markerLI) {
                li = (typeof li === 'string' || li instanceof String) ? Utility.html.FromString(li, false) : li;
                if(heightKnown)
                    dynObj.elem.insertBefore(li, markerLI);
                
                if(dynObj.elem.offsetHeight != 0) {
                    function Expanded() {
                        // The element will be removed and sent through the callback to be used again
                        li.removeEventListener('transitionend', Expanded);
                    }
                    li.addEventListener('transitionend', Expanded);
                }

                PrepLI(false, li, true);

                Utility.html.ChangeClass(dynObj.elem, classNames.obscured, classNames.unobscured);
                setTimeout(function() {
                    ReEnableTransition(li);
                    Utility.html.ChangeClass(li, 'animNeg', 'animPos');
                    if(!heightKnown)
                        li.style.height = li.heightToCache + 'px';

                    listItems = dynObj.elem.children;
                }, 250);
            }

            dynObj.Push = function(prepend, li, CB) {
                li = (typeof li === 'string' || li instanceof String) ? Utility.html.FromString(li, false) : li;
                if(heightKnown) {
                    if(prepend && dynObj.elem.children.length > 0)
                        dynObj.elem.insertBefore(li, dynObj.elem.children[0]);
                    else
                        dynObj.elem.appendChild(li);
                }
                
                if(dynObj.elem.offsetHeight != 0) {
                    function Expanded() {
                        // The element will be removed and sent through the callback to be used again
                        li.removeEventListener('transitionend', Expanded);
                        CB();
                    }
                    li.addEventListener('transitionend', Expanded);
                }

                PrepLI(prepend, li, true);

                Utility.html.ChangeClass(dynObj.elem, classNames.obscured, classNames.unobscured);
                setTimeout(function() {
                    ReEnableTransition(li);
                    Utility.html.ChangeClass(li, 'animNeg', 'animPos');
                    if(!heightKnown)
                        li.style.height = li.heightToCache + 'px';

                    listItems = dynObj.elem.children;
                    // Only fires if this element is actually hidden, and no animation takes place.
                    if(dynObj.elem.offsetHeight == 0) {
                        CB();
                    }
                }, 250);

                // TODO: I need to call Expanded or at least CB, even though the transition isn't
                // happenning due to a parent element being display-none.
            }

            dynObj.Pop = function(li, CB) {
                if(dynObj.elem.offsetHeight != 0) {
                    function Collapsed() {
                        li.removeEventListener('transitionend', Collapsed);
                        li.parentElement.removeChild(li);
                        listItems = dynObj.elem.children;
                        if(listItems.length == 0)
                            Utility.html.ChangeClass(dynObj.elem, classNames.unobscured, classNames.obscured);
                        CB(listItems.length);
                    }
                    li.addEventListener('transitionend', Collapsed);
                    ReEnableTransition(li);
                    Utility.html.ChangeClass(li, 'animPos', 'animNeg');
                }
                else {
                    // Only fires if this element is actually hidden, and no animation takes place.
                    li.parentElement.removeChild(li);
                    listItems = dynObj.elem.children;
                    CB(listItems.length);
                }
            }
            dynObj.PopMulti = function(lisObj, len, CB) {
                if(dynObj.elem.offsetHeight != 0) {
                    var countdown = len;
                    function Collapsed(event) {
                        event.target.removeEventListener('transitionend', Collapsed);
                        event.target.parentElement.removeChild(event.target);
                        countdown--;
                        if(countdown <= 0) {
                            listItems = dynObj.elem.children;
                            CB();
                        }
                    }

                    for(var elem in lisObj) {
                        lisObj[elem].addEventListener('transitionend', Collapsed);
                        ReEnableTransition(lisObj[elem]);
                        Utility.html.ChangeClass(lisObj[elem], 'animPos', 'animNeg');
                    }
                }
                else {
                    // Only fires if this element is actually hidden, and no animation takes place.
                    for(var elem in lisObj)
                        lisObj[elem].parentElement.removeChild(lisObj[elem]);
                    CB();
                }
            }
            dynObj.QuickExpand = function(CB) {
                if(listItems.length > 0) {
                    // Hide UL
                    Utility.html.ChangeClass(dynObj.elem, classNames.obscured, classNames.unobscured);
                    // Hide LIs
                    for(var i = 0, len = listItems.length; i < len; i++) {
                        DisableTransition(listItems[i]);
                        if(!heightKnown)
                            listItems[i].style.height = listItems[i].heightToCache + 'px';
                        Utility.html.ChangeClass(listItems[i], 'animNeg', 'animPos');
                        ReEnableTransition(listItems[i]);
                    }
                    // TODO: Might need to use timer before re-enabling transitions              
                    // setTimeout(function() {}, 0);
                    CB(true);
                }
                else
                    CB(false);
            }
            dynObj.QuickCollapse = function(CB) {
                if(listItems.length > 0) {
                    // Hide UL
                    Utility.html.ChangeClass(dynObj.elem, classNames.unobscured, classNames.obscured);
                    // Hide LIs
                    for(var i = 0, len = listItems.length; i < len; i++) {
                        DisableTransition(listItems[i]);
                        if(!heightKnown)
                            listItems[i].style.height = 0 + 'px';
                        Utility.html.ChangeClass(listItems[i], 'animPos', 'animNeg');
                        ReEnableTransition(listItems[i]);
                    }
                    // TODO: Might need to use timer before re-enabling transitions              
                    // setTimeout(function() {}, 0);
                    CB(true);
                }
                else
                    CB(false);
            }

            dynObj.QuickReplace = function(newLIs, closeList, CB) {
                dynObj.ClearInnards();
                if(!newLIs)
                    return;

                // Reset ul
                if(closeList)
                    Utility.html.ChangeClass(dynObj.elem, classNames.unobscured, classNames.obscured);
                else
                    Utility.html.ChangeClass(dynObj.elem, classNames.obscured, classNames.unobscured);

                // Get new items, convert from string if necessary
                if(typeof newLIs === 'string' || newLIs instanceof String)
                    newLIs = Utility.html.FromString(newLIs, true);

                for(var i = 0, len = newLIs.length; i < len; i++) {
                    PrepLI(false, newLIs[0], closeList);
                    if(heightKnown)
                        dynObj.elem.appendChild(newLIs[0]);
                }

                listItems = dynObj.elem.children;
                CB(listItems.length, listItems);
            }
        },
        MakeAnimatable: function(dynElemCont, elemKeys, AnimEndCB) {
            var dynObj = ElemDyns.MakeDynamic(dynElemCont, elemKeys);
            var animPos;
            
            dynObj.AnimatePos = function () {
                animPos = true;
                Utility.html.ChangeClass(dynObj.elem, classNames.dead, classNames.animate);
            };

            dynObj.AnimateNeg = function () {
                animPos = false;
                Utility.html.ChangeClass(dynObj.elem, classNames.animate, classNames.dead);
            };

            dynObj.elem.addEventListener('animationend', function(event) {
                if(animPos !== undefined) {
                    AnimEndCB(event, animPos);
                }
            });

            dynObj.SetDuration = function(secs) {
                var cssTime = '' + secs + 's';
                dynObj.elem.style.animationDuration = cssTime;
            }
        },
        MakeTransitional: function(dynElemCont, elemKeys, AnimEndCB) {
            var dynObj = ElemDyns.MakeDynamic(dynElemCont, elemKeys);
            dynObj.animPos = Utility.html.CheckClass(dynObj.elem, classNames.animate);
            var origDuration = getComputedStyle(dynObj.elem).getPropertyValue("transition-duration");
            
            dynObj.AnimatePos = function () {
                dynObj.animPos = true;
                Utility.html.ChangeClass(dynObj.elem, classNames.dead, classNames.animate);
            };

            dynObj.AnimateNeg = function () {
                dynObj.animPos = false;
                Utility.html.ChangeClass(dynObj.elem, classNames.animate, classNames.dead);
            };

            dynObj.AnimationToggle = function () {
                if(dynObj.animPos)
                    dynObj.AnimateNeg();
                else
                    dynObj.AnimatePos();
            };

            dynObj.elem.addEventListener('transitionend', function(event) {
                CssTransMngr.GetTransEnd(elemKeys, dynObj.animPos, event);

                if(dynObj.animPos !== undefined)
                    AnimEndCB(event, dynObj.animPos);
            });

            dynObj.SetDuration = function(secs) {
                secs = secs || 0;
                var cssTime = '' + secs + 's';
                dynObj.elem.style.transitionDuration = cssTime;
            }
            dynObj.RestoreDuration = function() {
                // reformatting to string not required.
                dynObj.elem.style.transitionDuration = origDuration;
            }
        },
        MakeTabbedBox: function (dynElemCont, boxName, tabClassName, panelClassName, alwaysOpen, animElemID, OnOpenCB, OnCloseCB) {
            if (!dynElemCont.hash.hasOwnProperty(boxName)) {
                dynElemCont.hash[boxName] = new TabbedBox(document.getElementsByClassName(tabClassName), document.getElementsByClassName(panelClassName), alwaysOpen, animElemID, OnOpenCB, OnCloseCB);
                dynElemCont.count++;
            }
        },
        HideGroup: function(dynElemCont, idArr) {
            for(var i = 0; i < idArr.length; i++)
                dynElemCont.hash[idArr[i]].Hide();
        },
        ShowGroup: function(dynElemCont, idArr) {
            for(var i = 0; i < idArr.length; i++)
                dynElemCont.hash[idArr[i]].Show();
        },
        HideUnregOne: function(elem) {
            Utility.html.ChangeClass(elem, classNames.visible, classNames.hidden);
        },
        ShowUnregOne: function(elem) {
            Utility.html.ChangeClass(elem, classNames.hidden, classNames.visible);
        },
        HideUnregisteredColl: function(elemColl) {
            for(var i = 0; i < elemColl.length; i++)
                Utility.html.ChangeClass(elemColl[i], classNames.visible, classNames.hidden);
        },
        ShowUnregisteredColl: function(elemColl) {
            for(var i = 0; i < elemColl.length; i++)
                Utility.html.ChangeClass(elemColl[i], classNames.hidden, classNames.visible);
        },
        HighlightUnregOne: function(elem) {
            Utility.html.ChangeClass(elem, classNames.inactive, classNames.active);
        },
        DownplayUnregOne: function(elem) {
            Utility.html.ChangeClass(elem, classNames.active, classNames.inactive);
        },
        HighlightUnregisteredColl: function(elemColl) {
            for(var i = 0; i < elemColl.length; i++)
                Utility.html.ChangeClass(elemColl[i], classNames.inactive, classNames.active);
        },
        DownplayUnregisteredColl: function(elemColl) {
            for(var i = 0; i < elemColl.length; i++)
                Utility.html.ChangeClass(elemColl[i], classNames.active, classNames.inactive);
        }
    };
})();

function DynElemCont() {
    this.hash = {};
    this.count = 0;
}
DynElemCont.prototype.ClearHash = function() {
    for(var key in this.hash)
        delete this.hash[key];
}
DynElemCont.prototype.Remove = function(key) {
    if (this.hash.hasOwnProperty(key)) {
        delete this.hash[key];
        this.count--;
    }
}
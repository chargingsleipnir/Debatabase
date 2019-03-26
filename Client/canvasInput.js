function Clamp(n, min, max) {
    if(n < min) return min;
    if(n > max) return max;
    return n;
}

var InputTypes = { keyboard: 0, mouse: 1, gamepad: 2 };

var Input = (function() {

    var canvas = null;

    var activeKeyRegistry = {};
    var inactiveKeyRegistry = {};
    window.onkeydown = function(e)
    {
        for (var o in activeKeyRegistry)
            if (e.keyCode in activeKeyRegistry[o] && activeKeyRegistry[o][e.keyCode].readyLoop)
            {
                activeKeyRegistry[o][e.keyCode].controller.pressed = true;
                activeKeyRegistry[o][e.keyCode].controller.DownCallback();
                activeKeyRegistry[o][e.keyCode].readyLoop = false;
            }

        // Disables spacebar & up arrow & down arrow
        /*
        return !(
            e.keyCode == KeyMap.SpaceBar ||
            e.keyCode == KeyMap.ArrowUp ||
            e.keyCode == KeyMap.ArrowDown
        );*/
    };

    window.onkeyup = function(e)
    {
        for (var o in activeKeyRegistry)
            if (e.keyCode in activeKeyRegistry[o])
            {
                activeKeyRegistry[o][e.keyCode].controller.pressed = false;
                activeKeyRegistry[o][e.keyCode].controller.UpCallback();
                activeKeyRegistry[o][e.keyCode].readyLoop = true;
            }
    };

    var activeMouseRegistry = {};
    var inactiveMouseRegistry = {};
    function SetMousePos(mouse, event) {
        var rect = canvas.getBoundingClientRect();
        //activeMouseRegistry[mouse].pos.x = event.pageX - canvas.offsetLeft;
        //activeMouseRegistry[mouse].pos.y = event.pageY - canvas.offsetTop;
        activeMouseRegistry[mouse].pos.x = event.clientX - rect.left;
        activeMouseRegistry[mouse].pos.y = event.clientY - rect.top;
    }
    function SetMouseDir(mouse, event) {
        /* event.webkitMovementX seems to jump about severely. moz is very smooth, but
         * this is incredibly jumpy, making it unusable in chrome without clamping */

        if(event.webkitMovementX || event.webkitMovementY) {
            activeMouseRegistry[mouse].dir.x = Clamp(event.webkitMovementX, -10.0, 10.0);
            activeMouseRegistry[mouse].dir.y = Clamp(event.webkitMovementY, -10.0, 10.0);
        }
        else {
            var xVal = event.movementX || event.mozMovementX || 0;
            var yVal = event.movementY || event.mozMovementY || 0;
            activeMouseRegistry[mouse].dir.x = Clamp(xVal, -10.0, 10.0);
            activeMouseRegistry[mouse].dir.y = Clamp(yVal, -10.0, 10.0);
        }
    }

    function TrackMousePos(e) {
        for (var o in activeMouseRegistry) {
            SetMousePos(o, e);
        }
    }
    function TrackMouseDir(e) {
        for (var o in activeMouseRegistry) {
            SetMouseDir(o, e);
        }
    }

    function onmousemove(e) {
        for (var o in activeMouseRegistry) {
            SetMousePos(o, e);
            SetMouseDir(o, e);
            activeMouseRegistry[o].MoveCallback();
        }
    }

    function onmousedown(e) {
        for (var o in activeMouseRegistry) {
            SetMousePos(o, e);
            switch(e.button) {
                case 0:
                    activeMouseRegistry[o].leftPressed = true;
                    activeMouseRegistry[o].LeftDownCallback();
                    break;
                case 1:
                    activeMouseRegistry[o].middlePressed = true;
                    break;
                case 2:
                    activeMouseRegistry[o].rightPressed = true;
                    activeMouseRegistry[o].RightDownCallback();
                    break;
            }
        }
    }

    function onmouseup(e) {
        for (var o in activeMouseRegistry) {
            SetMousePos(o, e);
            switch(e.button) {
                case 0:
                    activeMouseRegistry[o].leftPressed = false;
                    activeMouseRegistry[o].LeftUpCallback();
                    break;
                case 1:
                    activeMouseRegistry[o].middlePressed = false;
                    break;
                case 2:
                    activeMouseRegistry[o].rightPressed = false;
                    activeMouseRegistry[o].RightUpCallback();
                    break;
            }
        }
    }

    var ReqPointerLock,
        ExitPointerLock,
        pointerLocked = true,
        exitPLCalled = false;
    function SetPL() {
        Input.SetPointerLock(true);
        canvas.removeEventListener("click", SetPL);
    }
    function PointerChangeCallback() {
        pointerLocked =
            document.pointerLockElement === canvas ||
            document.mozPointerLockElement === canvas ||
            document.webkitPointerLockElement === canvas;

        if (pointerLocked) {
            // Pointer was just locked
            //canvas.removeEventListener("click", SetPL);
            canvas.removeEventListener('mousemove', TrackMousePos);
            canvas.addEventListener('mousemove', TrackMouseDir, false);
            //SetPaused(false);
        } else {
            // Pointer was just unlocked
            if(!exitPLCalled) {
                canvas.addEventListener("click", SetPL);
            }
            canvas.removeEventListener('mousemove', TrackMouseDir);
            canvas.addEventListener('mousemove', TrackMousePos, false);
            //SetPaused(true);

            exitPLCalled = false;
        }
    }

    function SwapRegistries(from, to, name) {
        to[name] = from[name];
        delete from[name];
        // reset all key to ready state
        for (var o in to[name]) {
            if(to[name][o].hasOwnProperty('controller')) {
                to[name][o].controller.pressed = false;
                to[name][o].readyLoop = true;
            }
            else {
                to[name][o].leftPressed = false;
                to[name][o].middlePressed = false;
                to[name][o].rightPressed = false;
            }
        }
    }

    return {
        RegisterControlScheme: function(name, active, inputType)
        {
            /// <signature>
            ///  <summary>Store a distinct instance to recieve input</summary>
            ///  <param name="name" type="string">A unique string, the name of the object to be affected by input</param>
            ///  <param name="active" type="bool">Whether or not this object is currently requiring input</param>
            ///  <returns type="void" />
            /// </signature>
            switch(inputType) {
                case InputTypes.keyboard:
                    if(active) activeKeyRegistry[name] = {};
                    else inactiveKeyRegistry[name] = {};
                    break;
                case InputTypes.mouse:
                    if(active) activeMouseRegistry[name] = {};
                    else inactiveMouseRegistry[name] = {};
                    break;
                case InputTypes.gamepad:
                    break;
            }
        },
        UnRegisterControlScheme: function(name)
        {
            /// <signature>
            ///  <summary>Remove a distinct instance from recieving input</summary>
            ///  <param name="name" type="string">The unique string name given to the object</param>
            ///  <returns type="void" />
            /// </signature>
            if (name in activeKeyRegistry) delete activeKeyRegistry[name];
            else if (name in inactiveKeyRegistry) delete inactiveKeyRegistry[name];
            else if (name in activeMouseRegistry) delete activeMouseRegistry[name];
            else if (name in inactiveMouseRegistry) delete inactiveMouseRegistry[name];
            else console.log("No object by that name to unregister");
        },
        SetActive: function(name, beActive)
        {
            /// <signature>
            ///  <summary>Set active status of object to recieve input</summary>
            ///  <param name="name" type="string">The unique string name given to the object</param>
            ///  <param name="beActive" type="bool">Whether or not this object is to recieve input</param>
            ///  <returns type="void" />
            /// </signature>
            if (!(name in activeKeyRegistry) &&
                !(name in inactiveKeyRegistry) &&
                !(name in activeMouseRegistry) &&
                !(name in inactiveMouseRegistry))
                throw ("No object by that name to change active status");
            else if (name in activeKeyRegistry && beActive == false) {
                SwapRegistries(activeKeyRegistry, inactiveKeyRegistry, name);
            }
            else if (name in inactiveKeyRegistry && beActive) {
                SwapRegistries(inactiveKeyRegistry, activeKeyRegistry, name);
            }
            else if (name in activeMouseRegistry && beActive == false) {
                SwapRegistries(activeMouseRegistry, inactiveMouseRegistry, name);
            }
            else if (name in inactiveMouseRegistry && beActive) {
                SwapRegistries(inactiveMouseRegistry, activeMouseRegistry, name);
            }
            else
                console.log("Object is already where you want it");
        },
        ListInputObjects: function()
        {
            /// <signature>
            ///  <summary>List all objects registered to recieve input at some point</summary>
            ///  <returns type="void" />
            /// </signature>
            for (var o in activeKeyRegistry)
                console.log('Active: ' + o + ' : ' + activeKeyRegistry[o]);
            for (var o in inactiveKeyRegistry)
                console.log('Inactive: ' + o + ' : ' + inactiveKeyRegistry[o]);
            for (var o in activeMouseRegistry)
                console.log('Active: ' + o + ' : ' + activeMouseRegistry[o]);
            for (var o in inactiveMouseRegistry)
                console.log('Inactive: ' + o + ' : ' + inactiveMouseRegistry[o]);
        },
        CheckRegistry: function(name) {
            if(name in activeKeyRegistry || name in inactiveKeyRegistry)
                return InputTypes.keyboard;
            else if (name in activeMouseRegistry || name in inactiveMouseRegistry)
                return InputTypes.mouse;
            else
                return -1;
        },
        CheckKeysActive: function(name) {
            return name in activeKeyRegistry;
        },
        CheckMouseActive: function(name) {
            return name in activeMouseRegistry;
        },
        CreateInputController: function(name, keyMapping) {
            /// <signature>
            ///  <summary>Add specific input to an object</summary>
            ///  <param name="name" type="string">The unique string name given to the object</param>
            ///  <param name="keyMapping" type="int">Use the global object keyMap to get exact key codes for keyboard implementation only</param>
            ///  <returns type="bool" />
            /// </signature>

            if(keyMapping) {
                var keyController = {
                    pressed: false,
                    DownCallback: function(){},
                    UpCallback: function(){},
                    SetBtnCalls: function(downCallback, upCallback) {
                        if(downCallback) this.DownCallback = downCallback;
                        if(upCallback) this.UpCallback = upCallback
                    },
                    Release: function() { this.pressed = false; }
                };

                if (name in activeKeyRegistry) {
                    activeKeyRegistry[name][keyMapping] = {
                        controller: keyController,
                        readyLoop: true
                    };
                }
                else if (name in inactiveKeyRegistry) {
                    inactiveKeyRegistry[name][keyMapping] = {
                        controller: keyController,
                        readyLoop: true
                    };
                }
                else
                    console.log("No object by that name to add boolean reference");

                return keyController;
            }

            var mouseController = {
                pos: { x: 0, y: 0 },
                dir: { x: 0, y: 0 },
                leftPressed: false,
                middlePressed: false,
                rightPressed: false,
                LeftRelease: function() { this.leftPressed = false; },
                MiddleRelease: function() { this.middlePressed = false; },
                RightRelease: function() { this.rightPressed = false; },
                MoveCallback: function() {},
                LeftDownCallback: function() {},
                LeftUpCallback: function() {},
                SetLeftBtnCalls: function(downCallback, upCallback) {
                    if(downCallback) this.LeftDownCallback = downCallback;
                    if(upCallback) this.LeftUpCallback = upCallback;
                },
                RightDownCallback: function() {},
                RightUpCallback: function() {},
                SetRightBtnCalls: function(downCallback, upCallback) {
                    if(downCallback) this.RightDownCallback = downCallback;
                    if(upCallback) this.RightUpCallback = upCallback;
                },
                SetCursor: function(cursorType) { canvas.style.cursor = cursorType; }
            };

            if (name in activeMouseRegistry) {
                activeMouseRegistry[name] = mouseController;
            }
            else if (name in inactiveMouseRegistry) {
                inactiveMouseRegistry[name] = mouseController;
            }
            else
                console.log("No object by that name to add boolean reference");

            return mouseController;
        },
        RemoveInputCall: function(name, input)
        {
            /// <signature>
            ///  <summary>Remove a certain input call from an object</summary>
            ///  <param name="name" type="string">The unique string name given to the object</param>
            ///  <param name="input" type="decimal">Use the global object keyMap to get exact key code to remove</param>
            ///  <returns type="void" />
            /// </signature>
            if (name in activeKeyRegistry)
                delete activeKeyRegistry[name][input];
            else if (name in inactiveKeyRegistry)
                delete inactiveKeyRegistry[name][input];
            else
                console.log("No object by that name to remove callback");
        },
        SetPointerLock: function(beLocked) {
            pointerLocked = beLocked;
            if(beLocked) {
                ReqPointerLock.call(canvas);
            }
            else {
                ExitPointerLock.call(document);
                exitPLCalled = true;
            }
        },
        CheckPointerLocked: function() {
            return pointerLocked;
        },
        AddPointerLockEL: function() {
            canvas.addEventListener("click", SetPL);
        },
        Initialize: function(c) {
            canvas = c;

            /*
            ReqPointerLock =
                canvas.requestPointerLock ||
                canvas.webkitRequestPointerLock ||
                canvas.mozRequestPointerLock;
            ExitPointerLock =
                document.exitPointerLock ||
                document.mozExitPointerLock ||
                document.webkitExitPointerLock;

            canvas.addEventListener("click", SetPL);*/

            //canvas.addEventListener('mousemove', TrackMousePos, false);
            //canvas.addEventListener('mousemove', TrackMouseDir, false);
            canvas.addEventListener('mousemove', onmousemove, false);
            canvas.addEventListener('mousedown', onmousedown, false);
            canvas.addEventListener('mouseup', onmouseup, false);

            /*
            document.addEventListener('pointerlockchange', PointerChangeCallback, false);
            document.addEventListener('mozpointerlockchange', PointerChangeCallback, false);
            document.addEventListener('webkitpointerlockchange', PointerChangeCallback, false);
            */
        }
    };
})();
var TreeTransMngr = (function() {
    var canvas, ctx;
    var canvasRect;
    var outerScrollElem;

    var TransStates = {
        OPEN: 0,
        CLOSING: 1,
        CLOSED: 2,
        OPENNING: 3
    },
    state = TransStates.OPEN;

    var OnClosedCB,
    OnOpenCB,
    ClosingTickCB,
    ClosedTickCB,
    OpenningTickCB;

    function ClearCBs() {
        OnClosedCB = null;
        OnOpenCB = null;
        ClosingTickCB = null;
        ClosedTickCB = null;
        OpenningTickCB = null;
    }

    var alpha = 0.0;
    var alphaChangeIncr = TREE_TRANS_INCR;

    function DrawTransitionBase() {
        ctx.globalAlpha = alpha;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    function Tick() {
        if(state == TransStates.CLOSING) {
            alpha += alphaChangeIncr;
            DrawTransitionBase();
            if(ClosingTickCB)
                ClosingTickCB(ctx);
            // Transition Closing complete
            if(alpha >= 1.0) {
                alpha = 1.0;
                state = TransStates.CLOSED;

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                if(OnClosedCB)
                    OnClosedCB(ctx);

                if(!ClosedTickCB) {
                    AnimCtrl.SetActive('treeTrans', false);
                    if(!OnClosedCB)
                        TreeTransMngr.TransOpen(null, null);
                }
            }
        }
        else if(state == TransStates.CLOSED) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillRect(0, 0, canvas.width, canvas.height);       
            ClosedTickCB(ctx);
        }
        else if(state == TransStates.OPENNING) {
            alpha -= alphaChangeIncr;
            DrawTransitionBase();
            if(OpenningTickCB)
                OpenningTickCB(ctx);
            // Transition Opening complete
            if (alpha <= 0.0) {
                alpha = 0.0;
                state = TransStates.OPEN;
                if(OnOpenCB)
                    OnOpenCB();
                Utility.html.ChangeClass(canvas, 'hideFalse', 'hideTrue');
                AnimCtrl.SetActive('treeTrans', false);
                ClearCBs();
            }
        }
    }

    return {
        Init: function(treeContScrollElem) {
            canvas = document.getElementById('TreeTransitionDisp');
            ctx = canvas.getContext('2d');
            outerScrollElem = treeContScrollElem;
            AnimCtrl.SetEvent('treeTrans', Tick);
        },
        Resize: function(width, height) {
            canvas.width = width;
            canvas.height = height;
            // After a height reset, styles need to be reset as well, no idea why.
            ctx.fillStyle = 'black';
            ctx.globalAlpha = 0.0;
        },
        TransClose: function(OnTransStartCB, ClosingTickCallback, OnCloseCallback, ClosedTickCallback) {
            if(state == TransStates.OPEN) {
                Utility.html.ChangeClass(canvas, 'hideTrue', 'hideFalse');
                // This MUST happen after element no longer hidden. CSS Display: none makes bounding box zeroed out
                canvasRect = Utility.html.GetRect(canvas, outerScrollElem);
                state = TransStates.CLOSING;
                ClosingTickCB = ClosingTickCallback;
                OnClosedCB = OnCloseCallback;
                ClosedTickCB = ClosedTickCallback;
                if(OnTransStartCB) 
                    OnTransStartCB(ctx);

                AnimCtrl.SetActive('treeTrans', true);
            }
        },
        TransOpen: function(OpenningTickCallback, OnOpenCallback) {
            if(state == TransStates.CLOSED) {
                state = TransStates.OPENNING;
                OpenningTickCB = OpenningTickCallback;
                OnOpenCB = OnOpenCallback;

                if(!AnimCtrl.CheckRunning()) {
                    AnimCtrl.SetActive('treeTrans', true);
                }
            }
        },
        CanvasPosAdjust: function(rect) {
            rect.x -= canvasRect.x;
            rect.y -= canvasRect.y;
        },
        GetAlphaChangeIncr: function() {
            return alphaChangeIncr;
        }
    }
})();
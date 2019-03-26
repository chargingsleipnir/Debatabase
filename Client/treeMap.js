var TreeMap = (function () {
    var canvas, ctx, mouse, nodeList = [], animationID;

    var cameraCtrl = {
        dragging: false,
        posPrev: {
            x: 0,
            y: 0
        },
        posCurr: {
            x: 0,
            y: 0
        }
    }

    const
        FONT_SIZE = 12,
        FONT_WEIGHT = 500,
        RAD_NODE_CONT = 25,
        RAD_NODE_BASE = 19,
        RAD_DROP_BTN_W = 9,
        RAD_DROP_BTN_H = 7,
        RAD_NAV_BTN = 7,
        STROKE_W = 2,
        GAP_X = 60,
        GAP_Y = 70,
        WIND_H = 50,
        HOVER_ALPHA = 0.33;

    var branchList = [],
        indicesToLoaded = [];

    var levelKidsDispVertical = -2,
        indicesKidsDisp = [];

        // Hold this globally as it changes with a click, and I'd otherwise have to cache the node itself
        // each time it changes to toggle the property for the previous and the new - this is easier.
    var idxNodeFocused = 0;

    var infoElem;
    var asserElem;

    function Clear() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '' + FONT_WEIGHT + ' ' + FONT_SIZE + 'px Arial';
        ctx.lineWidth = STROKE_W;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
    }

    function DrawCircle(x, y, radius) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2*Math.PI, false);
        ctx.fill();
        ctx.stroke();
    }

    // CLASS ================================================

    function NodeBox(x, y, halfW, halfH) {
        this.x = x;
        this.y = y;
        this.offX = 0;
        this.offY = 0;
        this.halfW = halfW;
        this.halfH = halfH;
        this.active = true;
    }
    NodeBox.prototype.UpdatePos = function(x, y) {
        this.x = x + this.offX;
        this.y = y + this.offY;
    }
    NodeBox.prototype.UpdateOffset = function(x, y) {
        this.offX = x;
        this.offY = y;
    }
    NodeBox.prototype.UpdateSize = function(halfW, halfH) {
        this.halfW = halfW;
        this.halfH = halfH;
    }
    NodeBox.prototype.DrawBG = function(offsetX, offsetY) {
        ctx.fillRect(
            this.x - offsetX,
            this.pos.y - offsetY,
            (this.halfW * 2) + (offsetX * 2),
            (this.halfY * 2) + (offsetY * 2)
        );
    }
    NodeBox.prototype.Draw = function() {
        ctx.beginPath();
        ctx.rect(this.x - this.halfW, this.y - this.halfH, this.halfW * 2, this.halfH * 2);
        ctx.fill();
        ctx.stroke();
    };
    NodeBox.prototype.DrawHover = function() {
        ctx.globalAlpha = HOVER_ALPHA;
        ctx.fillRect(this.x - this.halfW, this.y - this.halfH, this.halfW * 2, this.halfH * 2);
        ctx.globalAlpha = 1;
    }
    NodeBox.prototype.ContainsPoint = function(x, y) {
        return x > this.x - this.halfW && x < this.x + this.halfW && y > this.y - this.halfH && y < this.y + this.halfH;
    }

    // CLASS ================================================

    function NodeCircle(x, y, radius) {
        this.x = x;
        this.y = y;
        this.offX = 0;
        this.offY = 0;
        this.radius = radius;
        this.active = true;
    }
    NodeCircle.prototype.UpdatePos = function(x, y) {
        this.x = x + this.offX;
        this.y = y + this.offY;
    }
    NodeCircle.prototype.UpdateOffset = function(x, y) {
        this.offX = x;
        this.offY = y;
    }
    NodeCircle.prototype.UpdateSize = function(radius) {
        this.radius = radius;
    }
    NodeCircle.prototype.DrawBG = function(offsetRad) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + offsetRad, 0, 2*Math.PI, false);
        ctx.fill();
    }
    NodeCircle.prototype.Draw = function() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, 2*Math.PI, false);
        ctx.fill();
        ctx.stroke();
    }
    NodeCircle.prototype.DrawHover = function() {
        ctx.globalAlpha = HOVER_ALPHA;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, 2*Math.PI, false);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
    NodeCircle.prototype.DrawHoverCopy = function(x, y) {
        ctx.globalAlpha = HOVER_ALPHA;
        ctx.beginPath();
        ctx.arc(x, y, this.radius, 0, 2*Math.PI, false);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
    NodeCircle.prototype.ContainsPoint = function(x, y) {
        return Math.sqrt(Math.pow(x - this.x, 2) + Math.pow(y - this.y, 2)) < this.radius;
    }


    // CLASS ================================================
    function NodeSet() {
        this.parent = null;
        this.list = [];
        this.count = 0;
        this.listIdxRep = 0; // Index of the node within it's group of siblings
        this.branchIdx = -1; // Index of the node as part of the branch set
        this.nodeListIdx = -1; // Index within the node list (these indices always come after the established branch indices)

        this.level = 0;
        this.pos = { x: 0, y: 0 };
        this.active = false;

        // ? No onNavPath??
        this.anyLIOnLoadedPath = false;

        this.innerText = '0 / 0';
        this.navUpHoverActive = false;
        this.navDownHoverActive = false;

        this.drawID = -1;

        this.navShapeUp = new NodeBox(this.pos.x, this.pos.y, RAD_NAV_BTN, RAD_NAV_BTN);
        this.navShapeUp.UpdateOffset(-RAD_NODE_CONT - RAD_NAV_BTN, -RAD_NAV_BTN);
        this.navShapeDown = new NodeBox(this.pos.x, this.pos.y, RAD_NAV_BTN, RAD_NAV_BTN);
        this.navShapeDown.UpdateOffset(-RAD_NODE_CONT - RAD_NAV_BTN, RAD_NAV_BTN);      
    }
    NodeSet.prototype.DeactivateRecursive = function(inclSelf) {
        if(inclSelf)
            this.active = false;
        for(var i = 0, len = this.list.length; i < len; i++)
            this.list[i].DeactivateRecursive(true);
    };
    NodeSet.prototype.SetActive = function(beActive) {
        if(beActive) {
            // All the other siblings need to be shut off - only one active at a time.
            this.DeactivateRecursive(false);
            this.active = true;

            this.list[this.listIdxRep].SetActive(true);
        }
        else {
            this.DeactivateRecursive(true);
        }
    }
    NodeSet.prototype.SetIdx = function(idx) {
        this.nodeListIdx = idx;
    };
    NodeSet.prototype.SetParent = function(node) {
        this.parent = node;
    };
    NodeSet.prototype.SetList = function(nodeArr) {
        this.list = nodeArr;
        this.count = nodeArr.length;
        this.SetBranchIdx(0);
        this.UpdateText(0);
    };
    NodeSet.prototype.IncrBranchIdx = function(qty) {
        this.ActiveNode(((this.listIdxRep + qty) + this.list.length) % this.list.length);
    };
    NodeSet.prototype.ActiveNode = function(sibIdx) {
        this.SetBranchIdx(sibIdx);
        this.UpdateText(sibIdx);
        this.SetActive(true);
    };
    NodeSet.prototype.SetBranchIdx = function(sibIdx) {
        this.listIdxRep = sibIdx;
        this.branchIdx = this.list[sibIdx].branchIdx;
    };
    NodeSet.prototype.UpdateText = function(sibIdx) {
        //var listIdx = this.list.indexOf(nodeIdx);
        this.innerText = '' + (sibIdx + 1) + ' / ' + this.count;
    };
    NodeSet.prototype.BranchOut = function(level) {
        this.level = level;

        for(var i = 0, len = this.list.length; i < len; i++) {
            this.list[i].BranchOut(level);
        }
    };
    NodeSet.prototype.CheckClicked = function(x, y, BaseCB, DropCB, NavCB) {
        if(this.navShapeUp.ContainsPoint(x, y)) {
            if(NavCB) NavCB(this, 1);
            return true;
        }
        if(this.navShapeDown.ContainsPoint(x, y)) {
            if(NavCB) NavCB(this, -1);
            return true;
        }
        return false;
    };
    NodeSet.prototype.UpdatePosBranchRecursive = function(x, y) {
        this.pos.x = x;
        this.pos.y = y;
        this.navShapeUp.UpdatePos(x, y);
        this.navShapeDown.UpdatePos(x, y);       

        for(var i = 0, len = this.list.length; i < len; i++)
            this.list[i].UpdatePosBranchRecursive(x, y);
    };
    NodeSet.prototype.UpdatePos = function(x, y) {
        this.pos.x = x;
        this.pos.y = y;
        this.navShapeUp.UpdatePos(x, y);
        this.navShapeDown.UpdatePos(x, y);        
    };
    NodeSet.prototype.UpdateRecursive = function() { 
        if(this.active) {
            // Check for hover events
            this.navUpHoverActive = false;
            this.navDownHoverActive = false;
            if(this.navShapeUp.ContainsPoint(mouse.pos.x, mouse.pos.y)) {
                this.navUpHoverActive = true;
                mouse.SetCursor(CursorTypes.hand);
            }
            if(this.navShapeDown.ContainsPoint(mouse.pos.x, mouse.pos.y)) {
                this.navDownHoverActive = true;
                mouse.SetCursor(CursorTypes.hand);
            }

            for(var i = 0, len = this.list.length; i < len; i++)
                this.list[i].UpdateRecursive();
        }
    };
    NodeSet.prototype.Draw = function() {
        if(this.active) {
            // TODO: Insert an image of the location pin on the active node.

            var pathCol = this.list[this.listIdxRep].onLoadedPath ? 'red' : 'black';
            ctx.strokeStyle = pathCol;
            ctx.fillStyle = pathCol;

            // Fill text, as needed
            ctx.fillText(this.innerText, this.pos.x, this.pos.y + 1);

            // Draw up & down arrows
            // TODO: Change this to use object heirarchy, so child shapes/draw patterns can be added in Init, not drwn manually here.
            var partRad = this.navShapeUp.halfW * 0.5;
            ctx.fillStyle = 'white';
            this.navShapeUp.Draw();
            if(this.navUpHoverActive) {
                ctx.fillStyle = 'blue';
                this.navShapeUp.DrawHover();
                ctx.fillStyle = 'white';
            }
            ctx.beginPath();
            ctx.moveTo(this.navShapeUp.x - partRad, this.navShapeUp.y + partRad);            
            ctx.lineTo(this.navShapeUp.x, this.navShapeUp.y - partRad + 1);
            ctx.lineTo(this.navShapeUp.x + partRad, this.navShapeUp.y + partRad);
            ctx.stroke();

            this.navShapeDown.Draw();
            if(this.navDownHoverActive) {
                ctx.fillStyle = 'blue';
                this.navShapeDown.DrawHover();
                ctx.fillStyle = 'white';
            }
            ctx.beginPath();
            ctx.moveTo(this.navShapeDown.x - partRad, this.navShapeDown.y - partRad);            
            ctx.lineTo(this.navShapeDown.x, this.navShapeDown.y + partRad - 1);
            ctx.lineTo(this.navShapeDown.x + partRad, this.navShapeDown.y - partRad);
            ctx.stroke();
        }
    };

    function Node(branchIdx) {
        this.branchIdx = branchIdx;

        this.parent = null;
        this.children = [null, null];

        this.hasKids = false;
        this.kidsShowing = false;

        this.hasSibs = false;
        this.sibIdx = -1;

        this.level = 0;
        this.pos = { x: 0, y: 0 };
        this.active = false;

        this.willAnimate = false;
        this.animating = false;
        this.dropHoverActive = false;
        this.baseHoverActive = false;

        // These will determine node highlighting.
        this.onNavPath = false;
        this.onLoadedPath = false;
        this.loaded = false;

        this.drawID = -1;

        this.contShape = new NodeCircle(this.pos.x, this.pos.y, RAD_NODE_CONT);
        this.baseShape = new NodeCircle(this.contShape.x, this.contShape.y, RAD_NODE_BASE);
        this.dropShape = null;
    }
    Node.prototype.DeactivateRecursive = function(inclSelf) {
        if(inclSelf) this.active = false;
        this.kidsShowing = false;
        if(this.children[Consts.argTypes.CORROB]) this.children[Consts.argTypes.CORROB].DeactivateRecursive(true);
        if(this.children[Consts.argTypes.REFUTE]) this.children[Consts.argTypes.REFUTE].DeactivateRecursive(true);
    };
    Node.prototype.SetActive = function(beActive) {
        if(beActive) {
            this.active = true;
        }
        else {
            this.DeactivateRecursive(true);
        }
    }
    Node.prototype.ActivateChildren = function(beActive) {
        this.kidsShowing = beActive;
        if(this.children[Consts.argTypes.CORROB]) this.children[Consts.argTypes.CORROB].SetActive(beActive);
        // V+ if(this.children[Consts.argTypes.EXT_CONTRIB]) this.children[Consts.argTypes.EXT_CONTRIB].SetActive(beActive);
        if(this.children[Consts.argTypes.REFUTE]) this.children[Consts.argTypes.REFUTE].SetActive(beActive);
    };
    Node.prototype.SetChild = function(side, nodeOrCont) {
        this.children[side] = nodeOrCont;
        this.hasKids = true;
        if(!this.dropShape) {
            this.dropShape = new NodeBox(this.contShape.x, this.contShape.y, RAD_DROP_BTN_W, RAD_DROP_BTN_H);
            this.dropShape.UpdateOffset(
                RAD_NODE_CONT - RAD_DROP_BTN_W - 3,
                RAD_NODE_CONT - RAD_DROP_BTN_H - 3
            );
        }
    };
    Node.prototype.SetParent = function(nodeOrCont) {
        this.parent = nodeOrCont;       
    };
    Node.prototype.Update = function() {

    };
    Node.prototype.UpdatePosBranchRecursive = function(x, y) {
        this.pos.x = x;
        this.pos.y = y;
        this.contShape.UpdatePos(x, y);
        this.baseShape.UpdatePos(this.contShape.x, this.contShape.y);
        if(this.dropShape)
            this.dropShape.UpdatePos(this.contShape.x, this.contShape.y);

        // TODO: The gap values may be adjusted based on regular of last child set open
        if(this.children[Consts.argTypes.CORROB])
            this.children[Consts.argTypes.CORROB].UpdatePosBranchRecursive(x - GAP_X, y + GAP_Y);
        // V+
        // if(this.children[Consts.argTypes.EXT_CONTRIB])
        //     this.children[Consts.argTypes.EXT_CONTRIB].UpdatePosBranchRecursive(x, y + GAP_Y);
        if(this.children[Consts.argTypes.REFUTE])
            this.children[Consts.argTypes.REFUTE].UpdatePosBranchRecursive(x + GAP_X, y + GAP_Y);
        
    };
    Node.prototype.UpdatePos = function(x, y) {
        this.pos.x = x;
        this.pos.y = y;
        this.contShape.UpdatePos(x, y);
        this.baseShape.UpdatePos(this.contShape.x, this.contShape.y);
        if(this.dropShape)
            this.dropShape.UpdatePos(this.contShape.x, this.contShape.y);
    };
    Node.prototype.BranchOut = function(level) {
        this.level = level;
        var nextLevel = level + 1;

        if(this.children[Consts.argTypes.CORROB])
            this.children[Consts.argTypes.CORROB].BranchOut(nextLevel);
        // V+
        // if(this.children[Consts.argTypes.EXT_CONTRIB])
        //     this.children[Consts.argTypes.EXT_CONTRIB].BranchOut(nextLevel);
        if(this.children[Consts.argTypes.REFUTE])
            this.children[Consts.argTypes.REFUTE].BranchOut(nextLevel);
    };
    Node.prototype.CheckClicked = function(x, y, BaseCB, DropCB) {
        if(this.dropShape) {
            if(this.dropShape.ContainsPoint(x, y)) {
                if(DropCB) DropCB(this);
                return true;
            }
        }
        if(this.baseShape.ContainsPoint(x, y)) {
            if(BaseCB) BaseCB(this);
            return true;
        }
        return false;
    };
    Node.prototype.UpdateRecursive = function() {
        this.dropHoverActive = false;
        this.baseHoverActive = false;
        var noDropHover = false;

        if(this.active) {
            if(this.dropShape) {
                // Don't show hover if this node isn't the current one showing
                if(this.hasSibs) {
                    if(this.parent.listIdxRep != this.sibIdx)
                        noDropHover = true;
                }
                if(!noDropHover) {
                    if(this.dropShape.ContainsPoint(mouse.pos.x, mouse.pos.y)) {
                        this.dropHoverActive = true;
                        mouse.SetCursor(CursorTypes.hand);
                    }
                }
            }
            if(!this.dropHoverActive) {
                if(this.baseShape.ContainsPoint(mouse.pos.x, mouse.pos.y)) {
                    this.baseHoverActive = true;
                    mouse.SetCursor(CursorTypes.hand);
                }
            }

            if(this.children[Consts.argTypes.CORROB]) this.children[Consts.argTypes.CORROB].UpdateRecursive();
            // V+ if(this.children[Consts.argTypes.EXT_CONTRIB]) this.children[Consts.argTypes.EXT_CONTRIB].UpdateRecursive();
            if(this.children[Consts.argTypes.REFUTE]) this.children[Consts.argTypes.REFUTE].UpdateRecursive();
        }
    };

    Node.prototype.Draw = function() {
        if(this.active) {
            if(this.kidsShowing) {
                DrawNodeConnector(this, this.children[Consts.argTypes.CORROB]);
                // V+ DrawNodeConnector(this, this.children[Consts.argTypes.EXT_CONTRIB]);
                DrawNodeConnector(this, this.children[Consts.argTypes.REFUTE]);
            }

            // TODO: Insert an image of the location pin on the active node.

            // Do BG on those without siblings.
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'white';
            this.contShape.Draw();

            var pathCol = this.onLoadedPath ? 'red' : 'black';

            // NODE BASE
            ctx.strokeStyle = pathCol;
            ctx.fillStyle = (this.branchIdx == idxNodeFocused) ? 'lightgreen' : 'white';
            this.baseShape.Draw();

            // TODO: Move this drawing sequence into the base shape itself
            // var partRad = this.baseShape.radius * 0.25;
            // //ctx.rect(this.baseShape.x - partRad, this.baseShape.y - partRad, partRad * 2, partRad * 2);
            // ctx.beginPath();
            // ctx.moveTo(this.baseShape.x - partRad, this.baseShape.y);            
            // ctx.lineTo(this.baseShape.x + partRad, this.baseShape.y);
            // ctx.stroke();

            ctx.fillStyle = pathCol;

            if(this.baseHoverActive && this.branchIdx != idxNodeFocused) {
                ctx.fillStyle = 'lightgreen';
                this.baseShape.DrawHover();
            }

            if(this.dropShape) {
                var partRadX = this.dropShape.halfW * 0.5;
                var partRadY = this.dropShape.halfH * 0.25;
                ctx.fillStyle = 'white';
                
                this.dropShape.Draw();
                // TODO: Move this drawing sequence into the drop shape itself
                ctx.beginPath();
                if(this.kidsShowing)
                    partRadY *= -1;

                ctx.moveTo(this.dropShape.x - partRadX, this.dropShape.y - partRadY);            
                ctx.lineTo(this.dropShape.x, this.dropShape.y + partRadY);
                ctx.lineTo(this.dropShape.x + partRadX, this.dropShape.y - partRadY);
                ctx.stroke();

                
                if(this.dropHoverActive) {
                    ctx.fillStyle = 'blue';
                    this.dropShape.DrawHover();
                }
            }
        }
    };    

    // INDEPENDENT DRAW ASSIST FUNCTIONS
    function DrawNodeConnector(parent, child) {
        if(child) {
            if(child.active) {
                if(child.list)
                    ctx.strokeStyle = child.anyLIOnLoadedPath ? 'red' : 'black';
                else
                    ctx.strokeStyle = child.onLoadedPath ? 'red' : 'black';

                ctx.globalCompositeOperation = 'destination-over';
                // TODO: Make this more awesome looking
                ctx.beginPath();
                ctx.moveTo(parent.pos.x, parent.pos.y);            
                ctx.lineTo(child.pos.x, child.pos.y);
                ctx.stroke();
                ctx.globalCompositeOperation = 'source-over';
            }
        }
    }

    function DrawArrow(x, y, strokeColour) {
        ctx.beginPath();
        ctx.strokeStyle = strokeColour;
        // Vertical stick
        ctx.moveTo(x, y - 10);            
        ctx.lineTo(x, y + 5);
        // Angled pointer
        ctx.moveTo(x - 5, y + 5);            
        ctx.lineTo(x, y + 10);           
        ctx.lineTo(x + 5, y + 5);
        ctx.stroke();
    }

    // UPDATING / ANIMATING

    function Animate() {
        Clear();

        mouse.SetCursor(CursorTypes.normal);
        //nodeList[0].UpdatePosBranchRecursive(nodeList[0].pos.x, nodeList[0].pos.y);
        nodeList[0].UpdateRecursive();
        DrawLayerCtrl.Run();

        animationID = requestAnimationFrame(Animate);
    }

    function NodeBaseBtnCB(node) {
        if(idxNodeFocused == node.branchIdx)
            return;
        else {
            // idxNodeFocused for green highlight, and display the given asertion
            idxNodeFocused = node.branchIdx;
            asserElem.innerHTML = branchList[node.branchIdx].assertion;
        }
    }
    // TODO: Consider actually child nodes exposed as the default position on index change.
    // ? Too confusing? Little extra convenience?
    function NodeNavCB(nodeSet, qty) {
        var oldIdx = nodeSet.branchIdx;
        // The active index is defintely changing, so shut down the child nodes for sure.
        HideChildPath(nodeList[nodeSet.branchIdx]);
        // Change indices
        nodeSet.IncrBranchIdx(qty);
        // If the focal node was a sibling, of has been deactivated (because it was a descendant), change the focus to this one.
        if(oldIdx == idxNodeFocused || !nodeList[idxNodeFocused].active)
            NodeBaseBtnCB(nodeList[nodeSet.branchIdx]);
    }
    function HideChildPath(node) {
        if(node.kidsShowing) {
            /* if the level is lesser, all higher nodes are closed. Stay that way in this, the child closing section */
            if(node.level <= levelKidsDispVertical) {
                for(var i = indicesKidsDisp.length - 1; i >= node.level; i--) {
                    nodeList[indicesKidsDisp[i]].kidsShowing = false;
                    indicesKidsDisp.pop();
                }
                    
                levelKidsDispVertical = node.level - 1;
            }
            // If it was a lower level node that was selected...
            if(nodeList[idxNodeFocused].level > node.level)
                NodeBaseBtnCB(node);

            // Sets false recursively - pretty important to be the last thing done here.
            node.DeactivateRecursive(false);
            return true;
        }
        return false;
    }
    function NodeDropBtnCB(node) {
        var nodeToUse = node.list ? node.list[node.listIdxRep] : node;

        // Child nodes currently showing, about to change
        if(!HideChildPath(nodeToUse)) {
            // Child nodes hidden, about to show
            if(node.hasSibs) {
                if(node.parent.listIdxRep != node.sibIdx) {
                    return;
                }
            }

            /* if the level is lesser, all higher nodes are closed, currently held index at same level is closed/replaced */
            if(nodeToUse.level < levelKidsDispVertical) {
                for(var i = indicesKidsDisp.length - 1; i >= nodeToUse.level; i--) {
                    // TODO: Only need to do this at the end, since it's recursive ?
                    nodeList[indicesKidsDisp[i]].DeactivateRecursive(false);
                    indicesKidsDisp.pop();
                }
                levelKidsDispVertical = nodeToUse.level;
                indicesKidsDisp[levelKidsDispVertical] = nodeToUse.branchIdx;

                // If it was a lower level node that was selected...
                if(nodeList[idxNodeFocused].level > node.level)
                    NodeBaseBtnCB(node);
            }
            /* if the level is the same, and if index is different, currently held index is closed/replaced */
            else if(nodeToUse.level == levelKidsDispVertical && nodeToUse.branchIdx != indicesKidsDisp[levelKidsDispVertical]) {
                nodeList[indicesKidsDisp[levelKidsDispVertical]].DeactivateRecursive(false);
                indicesKidsDisp[levelKidsDispVertical] = nodeToUse.branchIdx;

                if(nodeList[idxNodeFocused].level > node.level)
                    NodeBaseBtnCB(node);
            }
            /* if the level is higher (should only ever be by one level), current highest still open but sibs compressed, new one open/added */
            else if (nodeToUse.level > levelKidsDispVertical) {
                levelKidsDispVertical++;
                indicesKidsDisp.push(nodeToUse.branchIdx);
                if(node.hasSibs) {
                    node.parent.ActiveNode(node.sibIdx);
                }
            }
            nodeToUse.ActivateChildren(true);
        }

        nodeList[0].UpdatePosBranchRecursive(nodeList[0].pos.x, nodeList[0].pos.y);
    }
    function ClimbTreeFromMapCB() {
        SliderRight.CloseImm();
    }
    function TreeMapContResetCB() {
        SliderRight.ResetTransDur();
    }
    function OnMouseMove() {
        if(cameraCtrl.dragging) {
            // Put current into previous
            cameraCtrl.posPrev.x = cameraCtrl.posCurr.x;
            cameraCtrl.posPrev.y = cameraCtrl.posCurr.y;
            cameraCtrl.posCurr.x = mouse.pos.x;
            cameraCtrl.posCurr.y = mouse.pos.y;
            nodeList[0].pos.x += cameraCtrl.posCurr.x - cameraCtrl.posPrev.x;
            nodeList[0].pos.y += cameraCtrl.posCurr.y - cameraCtrl.posPrev.y;
            nodeList[0].UpdatePosBranchRecursive(nodeList[0].pos.x, nodeList[0].pos.y);
        }
    }
    function OnLeftMouseDown() {
        // Need an out for every non-blank space possibly being clicked.
        for(var i = 0, len = nodeList.length; i < len; i++)
            if(nodeList[i].active)
                if(nodeList[i].CheckClicked(mouse.pos.x, mouse.pos.y))
                    return;

        cameraCtrl.dragging = true;
        cameraCtrl.posCurr.x = mouse.pos.x;
        cameraCtrl.posCurr.y = mouse.pos.y;
    }
    function OnLeftMouseUp() {
        // If everything is dragging properly, the left mouse up can never land on a node whilst dragging.
        if(!cameraCtrl.dragging) {
            for(var i = 0, len = nodeList.length; i < len; i++)
                if(nodeList[i].active)
                    if(nodeList[i].CheckClicked(mouse.pos.x, mouse.pos.y, NodeBaseBtnCB, NodeDropBtnCB, NodeNavCB))
                        return;
        }
        else
            cameraCtrl.dragging = false;
    }

    function MakeNodeConnections(i, side) {
        var childLen = branchList[i].children[side].length;
        var nodeChild = null;
        if(childLen > 1) {
            var childArr = [];
            // Make container
            var cont = new NodeSet();
            // Add it's draw call to the draw stack
            cont.drawID = DrawLayerCtrl.AddDrawCall('mapNodes', cont.Draw.bind(cont));
            // Add container as child of this node
            nodeList[i].SetChild(side, cont);
            // Add this node as parent of container
            cont.SetParent(nodeList[i]);
            for(var j = 0; j < childLen; j++) {
                // get each node in list of children for this side
                nodeChild = nodeList[branchList[i].children[side][j]];
                nodeChild.hasSibs = true;
                nodeChild.sibIdx = j;
                // make container the parent of that node
                nodeChild.SetParent(cont);
                // add node to list for container
                childArr.push(nodeChild);
            }
            cont.SetList(childArr);
            var newLen = nodeList.push(cont);
            cont.SetIdx(newLen - 1);
        }
        else if(childLen == 1) {
            nodeChild = nodeList[branchList[i].children[side][0]];
            nodeList[i].SetChild(side, nodeChild);
            nodeChild.SetParent(nodeList[i]);
        }
        // Children slots already set to null by default if no child branches present
    }

    return {
        Init: function() {
            canvas = document.getElementById('TreeMap');
            canvas.width = 600;
            canvas.height = 600;

            if(canvas.getContext && (ctx = canvas.getContext("2d"))) {
                // Only show this button if the browser supports the canvas element
                ElemDyns.ShowUnregisteredColl([document.getElementById('LocationBtn')]);

                DrawLayerCtrl.AddLayer('mapNodes', 0);

                Input.Initialize(canvas);
                var mouseCtrlName = "treeMapMouseCtrl";
                Input.RegisterControlScheme(mouseCtrlName, true, InputTypes.mouse);
                mouse = Input.CreateInputController(mouseCtrlName);

                mouse.SetLeftBtnCalls(OnLeftMouseDown, OnLeftMouseUp);
                mouse.MoveCallback = OnMouseMove;

                infoElem = document.getElementById('TreeMapInfoBox');
                infoElem.style.width = canvas.width + 'px';
                infoElem.style.maxWidth = canvas.width + 'px';
                infoElem.style.height = WIND_H + 'px';
                infoElem.style.maxHeight = WIND_H + 'px';

                asserElem = document.getElementById('TreeMapAsserBox');
                document.getElementById('TreeMapGoToBtn').addEventListener('click', function() {
                    if(idxNodeFocused == TreeHdlr.active.focalIdx)
                        SliderRight.Close();
                    else
                        TreeHdlr.ClimbTree(idxNodeFocused, null, null, ClimbTreeFromMapCB, null, null, TreeMapContResetCB);
                });
            }
        },
        Resize: function(width, height) {
            canvas.width = width;
            canvas.height = height + 1;

            infoElem.style.width = canvas.width + 'px';
            infoElem.style.maxWidth = canvas.width + 'px';
            infoElem.style.height = WIND_H + 'px';
            infoElem.style.maxHeight = WIND_H + 'px';

            if(nodeList[0])
                nodeList[0].UpdatePosBranchRecursive(canvas.width * 0.5, GAP_Y * 0.5);
        },
        SetTree: function(branches) {
            branchList = branches;
            nodeList = [];

            // Only one being used right now, but keep this setup incase things become more complicated later
            DrawLayerCtrl.ClearLayer('mapNodes');

            // First, create a node for every branch item, this is a given.
            for(var i = 0, len = branchList.length; i < len; i++) {
                nodeList[i] = new Node(i);
                nodeList[i].drawID = DrawLayerCtrl.AddDrawCall('mapNodes', nodeList[i].Draw.bind(nodeList[i]));
            }

            // Then, go through each node and make connections directly to other nodes
            // ListNodes will be added to the end of the nodelist
            for(var i = 0, len = nodeList.length; i < len; i++) {
                MakeNodeConnections(i, Consts.argTypes.CORROB);
                MakeNodeConnections(i, Consts.argTypes.REFUTE);
                // V+ MakeNodeConnections(i, Consts.argTypes.EXT_CONTRIB);
            }

            // This will add additional details to each node pertaining to the tree structure
            // Only sets up the levels right now - use for any other one time permanent data.
            nodeList[0].BranchOut(0);
            // Set all updated positioning. Use this any time going forward to adjust positions
            nodeList[0].UpdatePosBranchRecursive(canvas.width * 0.5, GAP_Y * 0.5);

            indicesToLoaded = [];
            indicesKidsDisp = [];

            asserElem.innerHTML = branchList[0].assertion;
        },
        UpdateBranch: function(branchIdx, branchData) {
            branchList[branchIdx] = branchData;
        },
        SetLoadedPath: function(branchIdx) {
            //* Set everything back to zero
            // Reset loaded path
            if(indicesToLoaded.length > 0) {
                for(var i = 0, len = indicesToLoaded.length; i < len; i++) {
                    nodeList[indicesToLoaded[i]].onLoadedPath = false;
                    if(nodeList[indicesToLoaded[i]].hasSibs)
                        nodeList[indicesToLoaded[i]].parent.anyLIOnLoadedPath = false;
                }
            }
            // Deactivate everything
            nodeList[0].SetActive(false);

            nodeList[branchIdx].onLoadedPath = true;
            nodeList[branchIdx].loaded = true;
            levelKidsDispVertical = -2

            // These two index lists will be similar at first, but once the user starts navigating around the map,
            // the indicesKidsDisp array will contunuously change, whereas the indicesToLoaded array will not

            indicesToLoaded = [branchIdx];
            indicesKidsDisp = nodeList[branchIdx].hasKids ? [branchIdx] : [];

            //* Acquire the loaded path from the given index up to 0, then reverse it, and prepare the map from top to bottom.
            if(branchIdx > 0) {
                var nextIdx = branchList[branchIdx].parent;
                while (nextIdx > -1) {
                    indicesToLoaded.push(nextIdx);
                    indicesKidsDisp.push(nextIdx);
                    nextIdx = branchList[nextIdx].parent;
                }
                indicesToLoaded.reverse();
                indicesKidsDisp.reverse();
            }

            for(var i = 0; i < indicesToLoaded.length; i++) {
                if(nodeList[indicesToLoaded[i]].hasSibs) {
                    nodeList[indicesToLoaded[i]].parent.ActiveNode(nodeList[indicesToLoaded[i]].sibIdx);
                    nodeList[indicesToLoaded[i]].parent.anyLIOnLoadedPath = true;
                }
                nodeList[indicesToLoaded[i]].onLoadedPath = true;
                nodeList[indicesToLoaded[i]].SetActive(true);
                if(nodeList[indicesToLoaded[i]].hasKids) {
                    nodeList[indicesToLoaded[i]].ActivateChildren(true);
                    levelKidsDispVertical = nodeList[indicesToLoaded[i]].level;
                }                
            }

            NodeBaseBtnCB(nodeList[branchIdx]);

            // Update all positioning from the start
            nodeList[0].UpdatePosBranchRecursive(nodeList[0].pos.x, nodeList[0].pos.y);
        },
        Run: function() {
            animationID = requestAnimationFrame(Animate);
        },
        Stop: function() {
            Clear();
            cancelAnimationFrame(animationID);
        }
    }
})();
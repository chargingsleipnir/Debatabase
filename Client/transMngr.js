var CssTransMngr = (function () {

    var queue = [];
    var heap = {};
    var inTrans = false;

    function Next() {
        if(queue.length > 0)
            setTimeout(heap[queue[0]], 100);
        else {
            inTrans = false;
            Main.UnPause();
        }
    }

    function Remove(idKey) {
        var idx = queue.indexOf(idKey);
        if(idx == -1)
            return false;
        
        queue.splice(idx, 1);
        delete heap[idKey];
        return true;
    }

    return {
        AddToQueue: function(idKey, CB, idx) {
            if(queue.indexOf(idKey) > -1)
                return;

            if(idx)
                queue.splice(idx, 0, idKey);
            else
                queue.push(idKey);

            heap[idKey] = CB;
        },
        RemoveFromQueue: function(idKey) {
            Remove(idKey);
        },
        CheckInQueue: function(idKey) {
            return queue.indexOf(idKey) > -1;
        },
        LaunchQueue: function() {
            if(!inTrans) {
                Next();
                inTrans = true;
                Main.Pause(false);
            }
        },
        GetTransEnd: function(idKey, animPos, event) {
            if(Remove(idKey))          
                Next();
        },
    }
})();
var AnimCtrl = (function(){
    var animationID = -1,
    running = false;
    var cbObj = {};
    var activeCount = 0;

    function Animate() {
        for(var key in cbObj)
            if(cbObj[key].active)
                cbObj[key].CB();

        if(running)
            animationID = requestAnimationFrame(Animate);
    }

    return {
        CheckRunning: function() {
            return running;
        },
        SetEvent: function(key, Callback) {
            cbObj[key] = {
                CB: Callback,
                active: false
            }
        },
        RemoveEvent: function(key) {
            delete cbObj[key];
        },
        SetActive: function(key, isActive) {
            if(!cbObj[key]) // If key doesn't exist, return
                return;
            
            if(cbObj[key].active == isActive) // If active status doesn't change for the given key, return
                return;

            cbObj[key].active = isActive;

            if(isActive) {
                activeCount++;
                if(activeCount > 0) {
                    running = true;
                    animationID = requestAnimationFrame(Animate);
                }
            }
            else {
                activeCount--;
                if(activeCount <= 0) {
                    running = false;
                    cancelAnimationFrame(animationID);
                }
            }
        }
    }
})();

var IntervalCtrl = (function(){
    var animationID = -1,
    running = false;
    var cbObj = {};
    var activeCount = 0;
    var fr = 1000 / 60;

    function Animate() {
        for(var key in cbObj)
            if(cbObj[key].active)
                cbObj[key].CB();
    }

    return {
        CheckRunning: function() {
            return running;
        },
        SetEvent: function(key, Callback) {
            cbObj[key] = {
                CB: Callback,
                active: false
            }
        },
        RemoveEvent: function(key) {
            delete cbObj[key];
        },
        SetActive: function(key, isActive) {
            if(!cbObj[key]) // If key doesn't exist, return
                return;
            
            if(cbObj[key].active == isActive) // If active status doesn't change for the given key, return
                return;

            cbObj[key].active = isActive;

            if(isActive) {
                activeCount++;
                if(activeCount > 0) {
                    running = true;
                    animationID = setInterval(Animate, fr);
                }
            }
            else {
                activeCount--;
                if(activeCount <= 0) {
                    running = false;
                    clearInterval(animationID)
                }
            }
        }
    }
})();
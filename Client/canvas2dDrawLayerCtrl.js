var DrawLayerCtrl = (function() {
    var layers = {},
    layerSequence = [],
    sequenceCount = 0;

    var allCalls = [];

    // TODO: Track freed up indices in allCalls and reuse them
    // Needs more beefed up protections/efficiencies all 'round

    return {
        AddLayer: function(name, index) {
            layers[name] = [];
            layerSequence[index] = name;
            sequenceCount++;
        },
        ClearLayer: function(name) {
            layers[name] = [];
        },
        AddDrawCall: function(layerName, call) {
            var drawID = allCalls.push(call) - 1;
            layers[layerName].push(drawID)
            return drawID;
        },
        ChangeLayers: function(layerNameFrom, layerNameTo, drawId) {
            var idx = layers[layerNameFrom].indexOf(drawId);
            if(idx > -1) {
                layers[layerNameFrom].splice(idx, 1);
                layers[layerNameTo].push(drawId);
            }
        },
        Run: function() {
            for(var i = 0; i < sequenceCount; i++) {
                //! layers[layerSequence[i]] had an error as "undefined" - cannot repeat.
                //? Might have only happened due to reseting the server while browser was running.
                // Sequence that made it happen:
                // 1. Send new messages to open account
                // 2. Pushing mail button on focal arg would slide SliderRight open but then immediately close it, repeatedly
                // 3. Trying to open SliderRight through navmap threw error here.
                for(var j = 0, len = layers[layerSequence[i]].length; j < len; j++) {
                    allCalls[layers[layerSequence[i]][j]]();
                }
            }
        }
    }
})();
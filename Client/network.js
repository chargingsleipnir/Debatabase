var Network = (function () {

    var socket;

    return {
        connected: false,
        InitSocketConnection: function (Callback) {
            // ESTABLISH CONNECTION
            try {
                socket = io();
                socket.on('connect', function () {
                    console.log("Socket connected: " + socket.connected);
                    console.log("Client side socket id: " + socket.id);
                    Network.connected = socket.connected;
                    Callback(socket.id);
                });

                socket.prototype.onclose = function(reason) {
                    this.emit('disconnecting', reason);
                    this.leaveAll();
                    this.emit('disconnect', reason);
                }
            }
            catch (err) {
                // TODO
            }
        },
        CreateResponse: function (str_Name, Callback) {
            socket.on(str_Name, function(resObj) {
                Callback(resObj);
            });
        },
        Emit: function (str_Name, data) {
            socket.emit(str_Name, data);
        },
        RemoveListener: function (str_Name, Callback) {
            socket.removeListener(str_Name, Callback);
        },
        GetSocketID: function () {
            return socket.id;
        }
    };
})();
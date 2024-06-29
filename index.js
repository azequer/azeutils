var WebSocketServer = require("ws").Server;

var wss = new WebSocketServer({port:8847});
var authenticatedClts = {};

wss.on('connection', function connection(ws) {
    console.log("Connection from "+ws.address);
    ws.on('message', function(message) {
        var splmsg = message.toString().split("!%");
        wss.broadcast(ws, message.toString());
        switch (splmsg[0]) {
            case 'JOIN':
                authenticatedClts[ws] = Number(splmsg[1]);
                break;
            default:
                break;
        }
    });
    ws.on("close", function(code, why) {
        if(authenticatedClts[ws]) {
            wss.broadcast(ws, "LEAVE!%"+authenticatedClts[ws]);
            authenticatedClts[ws] = null;
        }
    })
});

wss.broadcast = function broadcast(clt, msg) {
   console.log(clt.address+" said "+msg);
   wss.clients.forEach(function each(client) {
       //if(client != clt) {
           client.send(msg);
       //}
    });
};
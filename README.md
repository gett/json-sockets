# xsockets

a socket optimized for cross-domain use for the web and node. it's easy to use:

``` js
var sockets = require('xsockets');

sockets.listen(9999, function(socket) {
	socket.on('message', function(message) {
		socket.send(message); // echo
	});
});

var socket = sockets.connect('localhost:9999');

socket.send({hello:'world'});
socket.on('message', function(message) {
	console.log(message);
});

```
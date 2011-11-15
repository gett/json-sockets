# cross-sockets

a socket optimized for cross-domain use. it's easy to use:

``` js
var sockets = require('cross-sockets');
var socket = sockets.connect();

socket.send({hello:'world'});
socket.on('message', function(message) {
	console.log(message);
});

sockets.listen(9999, function(socket) {
	socket.on('message', function(message) {
		socket.send(message); // echo
	});
});
```
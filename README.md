# json-sockets

a socket optimized for cross-domain use for the web and node. it's easy to use:

``` js
var sockets = require('json-sockets');

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
A main goal of json-sockets is to be simple, cross-domain, cross-browser and purely native js.  
To accomplish this the following transport methods are used:

`WebSockets` Chrome, Safari, Safari Mobile (fallbacks to CORS on connection timeout)  
`CORS` Firefox 3.5+ [Crome, Safari]  
`Post-Message + AJAX` Internet Explorer 8+, Opera  
`JSONP` Internet Explorer 7- and everybody else  

in the browser use the [browser.js](https://github.com/gett/json-sockets/blob/master/browser.js) and a common.js compiler
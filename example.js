require('cross-sockets').listen(11000, function(socket) {
	socket.on('message', function(message) {
		console.log('rcvd', message);
		socket.send(message);
	});
});
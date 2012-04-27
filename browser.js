var common = require('common');

var noop = function() {};

var WebSocket = window.MozWebSocket || window.WebSocket;
var createLongPoll = function(host) {
	var mania = require('crossmania').create(host);
	var that = common.createEmitter();
	var writer;
	var reader;

	var onerror = function(err) {
		that.destroy();
	};

	writer = mania.post('/sockets', common.fork(onerror, function(id) {
		var buffer = '';

		var empty = function() {
			var b = buffer.substring(0, mania.type === 'jsonp' ? 1000 : buffer.length);
			
			buffer = buffer.substring(b.length);
			return b;	
		};
		var flush = function() {
			if (!buffer) {
				writer = null;
				that.send = send;
				return;
			}
			that.send = sendBuffer;
			writer = mania.put('/sockets/'+id).send(empty(), common.fork(onerror, flush));
		};
		var sendBuffer = function(message) {
			buffer += message+'\n';
		};
		var send = function(message) {
			buffer += message+'\n';
			flush();
		};
		var read = function(message) {
			if (message === '') {
				onerror(new Error('empty message'));
				return;
			}
			if (message) {
				message = message.split('\n');

				for (var i = 0; i < message.length; i++) {
					if (message[i]) {
						that.emit('message', message[i]);
					}
				}
			}
			reader = mania.get('/sockets/'+id, common.fork(onerror, read));	
		};

		read();

		that.send = send;
		that.emit('open');
	}));

	that.type = 'long-poll-'+mania.type;
	that.send = noop;
	that.destroy = function() {
		that.destroy = noop;

		if (writer) {
			writer.destroy();
		}
		if (reader) {
			reader.destroy();
		}
		that.emit('close');
	};

	return that;
};
var createWebSocket = WebSocket && function(host) {
	host = host.indexOf('://') === -1 ? 'ws://'+host : host;

	var that = common.createEmitter();
	var socket = new WebSocket(host.replace('http://', 'ws://').replace('https://', 'wss://'));
	var closed = false;
	var open = false;
	var messaging = false;

	var fallback = function() {
		var poll = createLongPoll(host);

		createSocket = createLongPoll;
		socket.onopen = socket.onclose = socket.onmessage = noop;

		try {
			socket.close();
		} catch (err) {
			// pass
		}

		poll.on('open', function() {
			that.emit('open');
		});
		poll.on('close', function() {
			that.emit('close');
		});
		poll.on('message', function(message) {
			that.emit('message', message);
		});

		that.type = poll.type;
		that.send = function(message) {
			poll.send(message);	
		};
		that.destroy = function() {
			poll.destroy();	
		};

	};

	var timeout = setTimeout(fallback, 5000);

	socket.onopen = function() {
		clearTimeout(timeout);

		if (closed) {
			return;
		}

		open = true;
		that.emit('open');
	};
	socket.onclose = function() {
		clearTimeout(timeout);

		if (closed) {
			return;
		}
		if (!open) {
			fallback();
			return;
		}
		if (!messaging) {
			createSocket = createLongPoll; // if websockets seems buggy - let's just stick with long polls		
		}
		
		closed = true;
		that.emit('close');	
	};
	socket.onmessage = function(e) {
		messaging = true;
		that.emit('message', e.data);	
	};

	that.type = 'websocket';
	that.send = function(message) {
		socket.send(message);
	};
	that.destroy = function() {
		clearTimeout(timeout);

		closed = true;
		socket.close();
		that.emit('close');
	};

	return that;
};

var createSocket = createWebSocket || createLongPoll;

exports.connect = function(host) {
	var that = common.createEmitter();
	var socket = createSocket(host);
	var buffer = [];

	socket.on('open', function() {
		that.send = function(message) {
			socket.send(JSON.stringify(message));
		};

		while (buffer.length) {
			that.send(buffer.shift());
		}

		that.emit('open');
	});
	socket.on('message', function(message) {
		if (message === 'ping') {
			socket.send('pong');
			return;
		}
		if (message === 'pong') {
			return;
		}
		that.emit('message', JSON.parse(message));
	});
	socket.on('close', function() {
		that.emit('close');
	});

	that.type = socket.type;
	that.send = function(message) {
		buffer.push(message);
	};
	that.destroy = function() {
		socket.destroy();	
	};

	return that;
};
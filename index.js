var common = require('common');
var router = require('router');
var sockets = require('message-sockets');

var TIMEOUT = 10*1000;
var polls = {};

var LongPoll = common.emitter(function() {
	this.put = '';
	this.get = '';

	this._respond = null;
	this._hanging();
	this._destroy = this.destroy.bind(this);
});

LongPoll.prototype.send = function(message) {
	message+='\n';

	if (this._respond) {
		this._hanging();
		this._respond(200, message);
		this._respond = null;
		return;
	}
	this.get += message;
};
LongPoll.prototype.destroy = function() {
	this.emit('close');
};
LongPoll.prototype.onget = function(request, respond) {
	if (this.get) {
		respond(200, this.get);
		this.get = '';
		return;
	}
	request.on('close', this._destroy);
	this._respond = respond;
};
LongPoll.prototype.onput = function(data) {
	var self = this;

	data = (this.put+data).split('\n');
	this.put = data.pop();

	data.forEach(function(message) {
		self.emit('message', message);
	});
};
LongPoll.prototype._hanging = function() {
	if (this._timeout) {
		clearTimeout(this._timeout);
	}
	this._timeout = setTimeout(this._destroy, TIMEOUT);
};

exports.connect = function(host) {
	return sockets.connect(host);	
};
exports.listen = function(port, onsocket) {
	var server;

	if (typeof port === 'number') {
		server = router.create();
		server.listen(port);
	} else {
		server = port;
	}

	sockets.listen(server, onsocket);

	var mania = require('crossmania').string(server);

	mania.post('/sockets', function(request, data, respond) {
		var id = common.uuid();
		var poll = polls[id] = new LongPoll();

		poll.on('close', function(argument) {
			delete polls[id];
		});

		var socket = sockets.createSocket(poll, true);

		socket.ping();
		onsocket(socket);

		respond(200, id);
	});
	mania.put('/sockets/{id}', function(request, data, respond) {
		var poll = polls[request.params.id];

		if (!poll) {
			respond(404);
			return;
		}

		poll.onput(data);
		respond(200, 'ok');
	});
	mania.get('/sockets/{id}', function(request, respond) {
		var poll = polls[request.params.id];

		if (!poll) {
			respond(404);
			return;
		}

		poll.onget(request, respond);
	});
};
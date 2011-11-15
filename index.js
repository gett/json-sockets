var common = require('common');

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

exports.listen = function(port, onsocket) {
	var mania = require('crossmania').string();

	mania.post('/sockets', function(request, data, respond) {
		var id = common.uuid();
		var poll = polls[id] = new LongPoll();

		poll.on('close', function(argument) {
			delete polls[id];
		});

		onsocket(poll);

		respond(200, id);
	});
	mania.put('/sockets/{id}', function(request, data, respond) {
		var poll = polls[request.params.id];

		if (!poll) {
			respond(404);
			return;
		}

		poll.onput(data);
		respond(200);
	});
	mania.get('/sockets/{id}', function(request, respond) {
		var poll = polls[request.params.id];

		if (!poll) {
			respond(404);
			return;
		}

		poll.onget(request, respond);
	});

	mania.listen(port);	
};

exports.listen(9000, function(socket) {
	socket.on('message', function(message) {
		console.log('rcvd', message);
		socket.send(message);
	});
});
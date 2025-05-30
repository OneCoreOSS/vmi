const net = require('net');

function Connect() {
	/* connect, get capabilities and oob */
	return new Promise((resolve, reject) => {
		const onConnect = () => {
			this.alive = true;
			this.sock.on('data', data => this.OnData(data));
			this.sock.on('error', err => this.emit('error', err));
			this.sock.on('close', hadErr => this.OnDisconnect(hadErr));
		};

		if (this.opts.path) {
			this.sock = net.createConnection(this.opts.path, onConnect);
		} else {
			this.sock = net.createConnection(this.opts.port, this.opts.host, onConnect);
		}

		/* greeting is needed */
		this.once('greeting', greeting => {
			this.capabilities = greeting.capabilities || [];
			const enable = [];
			if (this.capabilities.includes('oob')) {
				enable.push('oob');
			}
			this.Send({
				execute:  'qmp_capabilities',
				arguments:{ enable }
			})
			.then(() => resolve())
			.catch(reject);
		});

		this.sock.once('error', reject);
	});
}

function Close() {
	if (this.alive) {
		this.alive = false;
		this.sock.end();
	}
}

module.exports = { Connect, Close };

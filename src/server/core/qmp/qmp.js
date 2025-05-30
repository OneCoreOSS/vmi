const EventEmitter = require('events');
const { Connect, Close } = require('./connection');
const { Send, OnData, OnDisconnect } = require('./events');

class QMPClient extends EventEmitter {
	constructor(opts) {
		super();
		this.opts         = opts;
		this.sock         = null;
		this.buffer       = '';
		this.nextId       = 1;
		this.pending      = new Map();
		this.capabilities = [];
		this.alive        = false;
	}

	Execute(cmd, args = {}, oob = false) {
		if (!this.alive) {
			return Promise.reject(new Error('QMP socket is closed'));
		}
		const payload = oob && this.capabilities.includes('oob')
			? { 'exec-oob': cmd }
			: { execute: cmd };

		return this.Send({
			...payload,
			...(Object.keys(args).length ? { arguments: args } : {})
		});
	}

	HMPExecute(cmdLine) {
		// QMP->HMP Wrapper
		return this.Execute('human-monitor-command', {
			'command-line': cmdLine
		});
	}
}

QMPClient.prototype.Connect      = Connect;
QMPClient.prototype.Close        = Close;
QMPClient.prototype.Send         = Send;
QMPClient.prototype.OnData       = OnData;
QMPClient.prototype.OnDisconnect = OnDisconnect;

module.exports = { QMPClient };

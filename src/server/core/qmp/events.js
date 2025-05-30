function Send(msg) {
	return new Promise((resolve, reject) => {
		const id = this.nextId++;
		msg.id = id;
		this.pending.set(id, { resolve, reject });

		const line = JSON.stringify(msg) + '\r\n';
		this.sock.write(line, 'utf8', err => {
			if (err) {
				this.pending.delete(id);
				reject(err);
			}
		});
	});
}

function OnData(chunk) {
	this.buffer += chunk.toString('ascii');
	let idx;
	while ((idx = this.buffer.indexOf('\r\n')) !== -1) {
		const raw = this.buffer.slice(0, idx);
		this.buffer = this.buffer.slice(idx + 2);
		if (!raw.trim()) continue;

		let msg;
		try { msg = JSON.parse(raw); }
		catch { continue; }

		/* greeting event */
		if (msg.QMP && msg.QMP.version) {
			this.emit('greeting', msg.QMP);
			continue;
		}

		/* poweroff event */
		if (msg.event) {
			const ev = msg.event;
			if (ev === 'POWERDOWN' || ev === 'SHUTDOWN') {
				this.emit('poweroff', msg.data || {}, msg.timestamp);
				this.Close();
			}
			this.emit('event', ev, msg.data || {}, msg.timestamp);
			continue;
		}

		/* command response/output */
		const { id } = msg;
		if (id == null || !this.pending.has(id)) {
			continue;
		}
		const { resolve, reject } = this.pending.get(id);
		this.pending.delete(id);

		if (msg.error) {
			const err = new Error(msg.error.desc || 'QMP error');
			err.class = msg.error.class;
			reject(err);
		} else {
			resolve(msg.return);
		}
	}
}

function OnDisconnect(hadError) {
	if (!this.alive) return;
	this.alive = false;
	for (const { reject } of this.pending.values()) {
		reject(new Error('QMP socket closed'));
	}
	this.pending.clear();
	this.emit('disconnect', hadError);
}

module.exports = { Send, OnData, OnDisconnect };

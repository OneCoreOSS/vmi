const { ValidateSession, GetSessBase, GetSessUser, RefreshVNCList } = require("./main")
const VMIPath = require('../../vmipath');
const path = require("path");
const fs = require("fs");

module.exports = (router) => {
	router.post('/delete-vm', async (req, res) => {
		const VMIToken = req.get('Authorization')?.split(' ')[1]
		if (!VMIToken || !(await ValidateSession(VMIToken, req))) {
			return res.status(401).json({ error: 'Unauthorized' });
		}
		const User = await GetSessUser(req)
		if (!User) {
			return res.status(500).json({ error: 'Session user not found' })
		}
		const VMUUID = req.get('VMUUID');
		if (!VMUUID) {
			return res.status(400).json({ error: 'Missing VMUUID header' });
		}

		const RunDir = path.join(VMIPath, 'vms', VMUUID, 'run');
		const SockPath = path.join(RunDir, 'QMPSock');
		const PIDPath = path.join(RunDir, 'PID');

		if (fs.existsSync(SockPath) && fs.existsSync(PIDPath)) {
			try {
				const PID = parseInt(fs.readFileSync(PIDPath, 'utf8'), 10);
				if (!isNaN(PID)) {
					try {
						process.kill(PID, 0);
						return res.status(400).json({ error: 'VM is still running' });
					} catch (err) {
						if (err.code !== 'ESRCH' && err.code !== 'EPERM') {
							console.warn(`Unexpected error checking VM PID:`, err);
							return res.status(500).json({ error: 'PID check error' });
						}
					}
				}
			} catch (err) {
				console.error(`Failed to read or parse PID for VM ${VMUUID}:`, err);
			}
		}

		const VMPath = path.join(VMIPath, 'vms', VMUUID);
		try {
			fs.rmSync(VMPath, { recursive: true, force: true });
		} catch (err) {
			console.error(`Failed to delete VM folder for ${VMUUID}:`, err);
			return res.status(500).json({ error: 'Failed to delete VM folder' });
		}

		const LookupPath = path.join(VMIPath, 'vms', 'lookup.json');
		if (fs.existsSync(LookupPath)) {
			try {
				const LookupRaw = fs.readFileSync(LookupPath, 'utf8');
				const Lookup = JSON.parse(LookupRaw);
				if (Lookup[VMUUID]) {
					delete Lookup[VMUUID];
					fs.writeFileSync(LookupPath, JSON.stringify(Lookup, null, 2));
				}
			} catch (err) {
				console.error(`Failed to update lookup.json after deleting VM:`, err);
				return res.status(500).json({ error: 'Failed to update lookup.json' });
			}
		}

		RefreshVNCList(User, VMIToken);
		return res.json({ success: true });

	});
}


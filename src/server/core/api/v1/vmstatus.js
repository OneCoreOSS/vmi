const { ValidateSession, GetSessBase, GetSessUser, RefreshVNCList } = require("./main")
const VMIPath = require('../../vmipath');
const path = require("path");
const fs = require("fs");

module.exports = (router) => {
	router.get('/get-vmstatus', async (req, res) => {
		const { VMUUID } = req.query;
		if (!VMUUID) {
			return res.status(400).send('0');
		}

		const RunDir   = path.join(VMIPath, 'vms', VMUUID, 'run');
		const SockPath = path.join(RunDir, 'QMPSock');
		const PIDPath  = path.join(RunDir, 'PID');

		if (!fs.existsSync(SockPath) || !fs.existsSync(PIDPath)) {
			return res.send('0');
		}

		let PID;
		try {
			PID = parseInt(fs.readFileSync(PIDPath, 'utf8'), 10);
		} catch (ReadErr) {
			console.error(`Error reading PID for VM ${VMUUID}:`, ReadErr);
			return res.send('0');
		}

		let Alive = false;
		try {
			process.kill(PID, 0);
			Alive = true;
		} catch (err) {
			if (err.code === 'EPERM') {
				Alive = true;
			}
		}
		return res.send(Alive ? '1' : '0');
	});
}


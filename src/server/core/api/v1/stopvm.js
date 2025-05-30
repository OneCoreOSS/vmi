const { ValidateSession, GetSessBase, GetSessUser, RefreshVNCList } = require("./main")
const VMIPath = require('../../vmipath');
const path = require("path");
const fs = require("fs");

module.exports = (router) => {
	router.post('/stop-vm', async (req, res) => {
		const VMIToken = req.get('Authorization')?.split(' ')[1]
		if (!VMIToken || !(await ValidateSession(VMIToken, req))) {
			return res.status(401).json({ error: 'Unauthorized' });
		}

		const User = await GetSessUser(req)
		if (!User) {
			return res.status(500).json({ error: 'Session user not found' })
		}

		const { VMUUID, StopType } = req.body
		if (!VMUUID || !StopType || !['HARD', 'SOFT'].includes(StopType)) {
			return res.status(400).json({ error: 'Missing or invalid VMUUID or StopType' })
		}

		const LookupPath = path.join(VMIPath, 'vms', 'lookup.json')
		if (!fs.existsSync(LookupPath)) {
			return res.status(404).json({ error: 'No VMs configured' })
		}

		const Lookup = JSON.parse(fs.readFileSync(LookupPath, 'utf8'))
		if (!Lookup[VMUUID]) {
			return res.status(404).json({ error: 'VM UUID not found' })
		}

		const InfoPath = path.join(VMIPath, 'vms', VMUUID, 'vminfo.json')
		if (!fs.existsSync(InfoPath)) {
			return res.status(500).json({ error: 'VM info file missing' })
		}

		const Info = JSON.parse(fs.readFileSync(InfoPath, 'utf8'))
		const Owners = Array.isArray(Info.Base?.Owners) ? Info.Base.Owners : []
		if (!Owners.includes(User)) {
			return res.status(403).json({ error: 'Forbidden' })
		}

		const RunDir = path.join(VMIPath, 'vms', VMUUID, 'run')
		const PIDPath = path.join(RunDir, 'PID')
		const QMPSock = path.join(RunDir, 'QMPSock')

		if (!fs.existsSync(PIDPath)) {
			return res.status(404).json({ error: 'PID file not found — VM may not be running' });
		}

		const PID = parseInt(fs.readFileSync(PIDPath, 'utf8'), 10)
		if (isNaN(PID)) {
			return res.status(500).json({ error: 'Invalid PID file content' })
		}

		const wait = ms => new Promise(r => setTimeout(r, ms))

		/* hard shutdown = kill the process */
		if (StopType === 'HARD') {
			try {
				process.kill(PID, 'SIGKILL')
			} catch (err) {
				console.error(`Failed to kill PID ${PID}:`, err)
				return res.status(500).json({ error: 'Failed to kill VM process' })
			}

			try {
				if (fs.existsSync(PIDPath)) fs.unlinkSync(PIDPath)
				if (fs.existsSync(QMPSock)) fs.unlinkSync(QMPSock)
			} catch (CleanupErr) {
				console.warn(`Cleanup error:`, CleanupErr)
			}

			return res.json({ success: true })
		}

		/* soft shutdown = ACPI Powerdown */
		const Client = new QMPClient({ path: QMPSock })
		try {
			await Client.Connect()
			await Client.Execute('system_powerdown')
		} catch (err) {
			console.error(`QMP SOFT shutdown failed:`, err)
			return res.status(500).json({ error: 'Failed to send system_powerdown' })
		}

		let Disconnected = false
		client.on('disconnect', () => {
			Disconnected = true
		})

		for (let i = 0; i < 20; i++) {
			if (Disconnected) break
			await wait(500)
		}

		if (!Disconnected) {
			return res.status(500).json({ error: 'VM did not power off in time' })
		}

		/* cleanup */
		try {
			if (fs.existsSync(PIDPath)) fs.unlinkSync(PIDPath)
			if (fs.existsSync(QMPSock)) fs.unlinkSync(QMPSock)
		} catch (CleanupErr) {
			console.warn(`Cleanup error:`, CleanupErr)
		}

		return res.json({ success: true })

	});
}


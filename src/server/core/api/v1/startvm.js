const { ValidateSession, GetSessBase, GetSessUser, RefreshVNCList } = require("./main")
const VMIPath = require('../../vmipath');
const { LoadConfig, BuildCommand } = require('../../cli/main');
const { QMPClient } = require('../../qmp/qmp');
const shellQuote = require('shell-quote');
const path = require("path");
const fs = require("fs");
const { exec, spawn } = require('child_process');

module.exports = (router) => {
	router.post('/start-vm', async (req, res) => {
		const VMIToken = req.get('Authorization')?.split(' ')[1]
		if (!VMIToken || !(await ValidateSession(VMIToken, req))) {
			return res.status(401).json({ error: 'Unauthorized' });
		}

		const User = await GetSessUser(req)
		if (!User) {
			return res.status(500).json({ error: 'Session user not found' })
		}
		const { VMUUID } = req.body
		if (!VMUUID) {
			return res.status(400).json({ error: 'Missing VMUUID' })
		}

		const LookupPath = path.join(VMIPath, 'vms', 'lookup.json')
		if (!fs.existsSync(LookupPath)) {
			return res.status(404).json({ error: 'No VMs configured' })
		}

		const Lookup = JSON.parse(fs.readFileSync(LookupPath, 'utf8'))
		const UUIDList = Object.keys(Lookup)
		const VMIndex = UUIDList.indexOf(VMUUID)
		if (VMIndex === -1) {
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

		const Config = LoadConfig(InfoPath)
		let CmdStr = BuildCommand(Config).replace(/%VMI:([^ ]+)/g, (_, p) => path.join(VMIPath, p))

		CmdStr += ` -vnc 127.0.0.1:${VMIndex}`

		/* add the vnc & qmp to the built cmd */
		const RunDir = path.join(VMIPath, 'vms', VMUUID, 'run')
		fs.mkdirSync(RunDir, { recursive: true })
		const QMPSock = path.join(RunDir, 'QMPSock')
		CmdStr += ` -qmp unix:${QMPSock},server,wait=off`

		console.log(`Starting VM ${VMUUID} with command:\n${CmdStr}`)

		const Parts = shellQuote.parse(CmdStr).map(part =>
			typeof part === 'object' && 'pattern' in part ? part.pattern : String(part)
		)
		const QEMU = spawn(Parts[0], Parts.slice(1), {
			detached: true,
			stdio: ['ignore', 'inherit', 'inherit']
		})
		QEMU.unref()

		QEMU.on('error', err => {
			console.error(`Failed to exec QEMU for VM ${VMUUID}:`, err)
		})

		const wait = ms => new Promise(r => setTimeout(r, ms))
		const MaxRetries = 20
		let SockExists = false
		for (let i = 0; i < MaxRetries; i++) {
			if (fs.existsSync(QMPSock)) {
				SockExists = true
				break
			}
			await wait(500)
		}

		if (!SockExists) {
			console.error(`QMP socket never appeared for VM ${VMUUID} at ${QMPSock}`)
			return res.status(500).json({ error: 'QMP socket not found after launch' })
		}

		const Client = new QMPClient({ path: QMPSock })
		let Connected = false, LastErr = null
		for (let i = 1; i <= 3; i++) {
			try {
				await Client.Connect()
				Connected = true
				break
			} catch (err) {
				LastErr = err
				console.warn(`QMP connect attempt ${i} failed:`, err)
				if (i < 3) await wait(3000)
			}
		}

		if (!Connected) {
			console.error(`All QMP connection attempts failed for VM ${VMUUID}:`, lastErr)
			return res.status(500).json({ error: 'Failed to initialize QMP after 3 attempts' })
		}

		Client.on('error', err => console.error(`QMP error for VM ${VMUUID}:`, err))
		//QMPClients.set(VMUUID, client)

		const PIDPath = path.join(RunDir, 'PID')
		fs.writeFileSync(PIDPath, String(QEMU.pid))

		res.json({ success: true })

	});
}


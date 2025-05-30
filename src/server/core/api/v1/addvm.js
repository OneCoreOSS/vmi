const { ValidateSession, GetSessBase, GetSessUser, RefreshVNCList } = require("./main")
const VMIPath = require('../../vmipath');
const path = require("path");
const fs = require("fs");
const { randomUUID } = require("crypto");

module.exports = (router) => {
	router.post('/add-vm', async (req, res) => {
		const VMIToken = req.get('Authorization')?.split(' ')[1]
		if (!VMIToken || !(await ValidateSession(VMIToken, req))) {
			return res.status(401).json({ error: 'Unauthorized' });
		}
		const User = await GetSessUser(req)
		if (!User) {
			return res.status(500).json({ error: 'Session user not found' })
		}

		const VMInfo = req.body.VMInfo
		if (!VMInfo || typeof VMInfo.Base?.Name !== 'string') {
			return res.status(400).json({ error: 'Missing or invalid VMInfo' })
		}

		let VMUUID, VMDir, InfoPath
		do {
			VMUUID = randomUUID()
			VMDir = path.join(VMIPath, 'vms', VMUUID)
			InfoPath = path.join(VMDir, 'vminfo.json')
		} while (fs.existsSync(InfoPath))

		fs.mkdirSync(VMDir, { recursive: true })
		fs.writeFileSync(InfoPath, JSON.stringify(VMInfo, null, 2))

		const LookupPath = path.join(VMIPath, 'vms', 'lookup.json')
		let Lookup = {}
		if (fs.existsSync(LookupPath)) {
			Lookup = JSON.parse(fs.readFileSync(LookupPath, 'utf8'))
		}
		Lookup[VMUUID] = [VMInfo.Base.Name, VMInfo.Base.OSFamily];
		fs.writeFileSync(LookupPath, JSON.stringify(Lookup, null, 2))

		RefreshVNCList(User, VMIToken)
		res.json({ success: true, VMUUID })

	});
}


const { ValidateSession, GetSessBase, GetSessUser, RefreshVNCList } = require("./main")
const VMIPath = require('../../vmipath');
const path = require("path");
const fs = require("fs");

module.exports = (router) => {
	router.get('/get-vminfo', async (req, res) => {
		const VMIToken = req.get('Authorization')?.split(' ')[1]
		if (!VMIToken || !(await ValidateSession(VMIToken, req))) {
			return res.status(401).json({ error: 'Unauthorized' });
		}

		const User = await GetSessUser(req)
		if (!User) {
			return res.status(500).json({ error: 'Session user not found' })
		}
		const VMUUID = req.get("VMUUID");
		if (!VMUUID) {
			return res.status(400).json({ error: 'Missing VMUUID parameter' })
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
		res.json(Info)
	});
}


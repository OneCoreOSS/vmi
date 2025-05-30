const VMIPath = require('../../vmipath');
const { ValidateSession, GetSessBase, GetSessUser, RefreshVNCList } = require("./main");
const os = require('os');
const fs = require('fs');
const path = require('path');

module.exports = (router) => {
	router.get('/list-vms', async (req, res) => {
		const VMIToken = req.get('Authorization')?.split(' ')[1]
		if (!VMIToken || !(await ValidateSession(VMIToken, req))) {
			return res.status(401).json({ error: 'Unauthorized' });
		}

		const User = await GetSessUser(req)
		if (!User) {
			return res.status(500).json({ error: 'Session user not found' });
		}

		const LookupPath = path.join(VMIPath, 'vms', 'lookup.json')
		const Lookup = fs.existsSync(LookupPath) ? JSON.parse(fs.readFileSync(LookupPath, 'utf8')) : {}

		const OwnedVMs = Object.entries(Lookup).reduce((arr, [VMUUID, [Name, OSFamily]]) => {
			const InfoPath = path.join(VMIPath, 'vms', VMUUID, 'vminfo.json')
			if (!fs.existsSync(InfoPath)) return arr
			const Info = JSON.parse(fs.readFileSync(InfoPath, 'utf8'))
			const Owners = Array.isArray(Info.Base?.Owners) ? Info.Base.Owners : []
			if (Owners.includes(User)) {
		    		arr.push({ VMUUID, Name, OSFamily })
			}
			return arr;
		}, [])

		res.json(OwnedVMs);
	});
}


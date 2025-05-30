const { ValidateSession, GetSessBase, GetSessUser, RefreshVNCList } = require("./main")
const VMIPath = require('../../vmipath');
const path = require("path");
const fs = require("fs");

module.exports = (router) => {
	router.post('/edit-vm', async (req, res) => {
		const VMIToken = req.get('Authorization')?.split(' ')[1]
		if (!VMIToken || !(await ValidateSession(VMIToken, req))) {
			return res.status(401).json({ error: 'Unauthorized' });
		}

		const { VMUUID, VMInfo } = req.body || {}
		if (!VMUUID || typeof VMInfo !== 'object') {
			return res.status(400).json({ error: 'VMUUID and VMInfo body fields are required' });
		}

		const ReqKeys = ['Base', 'Hardware', 'Storage', 'Misc', 'ExtraQEMUParams']
		const Missing = ReqKeys.filter(key => !(key in VMInfo))
		if (Missing.length) {
			return res.status(400).json({ error: 'VMInfo missing required sections', Missing})
		}

		const InfoPath = path.join(VMIPath, 'vms', VMUUID, 'vminfo.json')
		if (!fs.existsSync(InfoPath)) {
			return res.status(404).json({ error: 'VM not found' })
		}

		try {
			fs.writeFileSync(InfoPath, JSON.stringify(VMInfo, null, 2), 'utf8');
			return res.json({ success: true })
		} catch (err) {
			console.error(`Error writing vminfo for ${VMUUID}:`, err)
			return res.status(500).json({ error: 'Failed to write VM info' })
		}
	});
}


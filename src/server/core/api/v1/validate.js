const { ValidateSession, GetSessBase, RefreshVNCList } = require("./main");
const GetVMIVersion = require('../../version.js');
const os = require('os');

module.exports = (router) => {
	router.get('/validate', async (req, res) => {
		const VMIToken = req.get('Authorization')?.split(' ')[1]
		if (!VMIToken || !(await ValidateSession(VMIToken, req))) {
			return res.status(401).json({ error: 'Unauthorized' });
		}

		const Version = GetVMIVersion();
		const MaxSMP = os.cpus().length;
		const MaxRAM = Math.floor(os.totalmem() / 1024 / 1024);

		res.json({
			"Product": "OneCoreVMI",
			"Manufacturer": "OneCore",
			"Version": Version,
			"MaxSMP": MaxSMP,
			"MaxRAM": MaxRAM
		});
	});
}


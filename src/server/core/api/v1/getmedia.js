const { ValidateSession, GetSessBase, GetSessUser, RefreshVNCList } = require("./main")
const VMIPath = require('../../vmipath');
const path = require("path");
const fs = require("fs");

module.exports = (router) => {
	router.get('/get-media', async (req, res) => {
		const VMIToken = req.get('Authorization')?.split(' ')[1]
		if (!VMIToken || !(await ValidateSession(VMIToken, req))) {
			return res.status(401).json({ error: 'Unauthorized' });
		}

		const MediaBase = path.join(VMIPath, 'media')

		function ListFiles(subdir) {
			const Dir = path.join(MediaBase, subdir)
			if (!fs.existsSync(Dir)) return []
			return fs.readdirSync(Dir).filter(Name => {
				const Full = path.join(Dir, Name)
				return fs.statSync(Full).isFile()
			})
		}

		const Disks   = ListFiles('disk')
		const Floppys = ListFiles('floppy')
		const ISOs    = ListFiles('iso')

		res.json({
			"Disks":   Disks,
			"Floppys": Floppys,
			"ISOs":    ISOs
		});
	});
}


const { ValidateSession, GetSessBase, GetSessUser, RefreshVNCList } = require("./main")
const VMIPath = require('../../vmipath');
const path = require("path");
const fs = require("fs");
const { exec, spawn } = require('child_process')

module.exports = (router) => {
	router.post('/create-disk', async (req, res) => {
		const VMIToken = req.get('Authorization')?.split(' ')[1]
		if (!VMIToken || !(await ValidateSession(VMIToken, req))) {
			return res.status(401).json({ error: 'Unauthorized' });
		}

		const { DiskName, FileType, FileSize } = req.body
		if (!DiskName || !FileType || isNaN(Number(FileSize))) {
			return res.status(400).json({ error: 'Missing or invalid DiskName, FileType or FileSize' })
		}
		const Sanitized = DiskName.replace(/[<>:"\/\\|?*\x00-\x1F]/g, '_')
		const MediaDir = path.join(VMIPath, 'media', 'disk')
		fs.mkdirSync(MediaDir, { recursive: true })
		const ImagePath = path.join(MediaDir, `${Sanitized}.${FileType}`)
		const cmd = `qemu-img create -f ${FileType} "${ImagePath}" ${FileSize}G`
		exec(cmd, (_err, _stdout, stderr) => {
			if (stderr) {
				return res.status(500).json({ success: false, error: stderr.trim() })
			}
			res.json({ success: true })
		});
	});
}


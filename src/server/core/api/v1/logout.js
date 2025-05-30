const { ValidateSession, GetSessBase, GetSessUser, RefreshVNCList } = require("./main")
const VMIPath = require('../../vmipath');
const path = require("path");
const fs = require("fs");
const argon2 = require("argon2");

module.exports = (router) => {
	router.post('/logout', async (req, res) => {
		const VMIToken = req.get('Authorization')?.split(' ')[1]
		if (!VMIToken || !(await ValidateSession(VMIToken, req))) {
			return res.status(401).json({ error: 'Unauthorized' });
		}

		const Username = await GetSessUser(req);
		if (!Username) {
			return res.status(401).json({ error: 'Invalid token' })
		}
		const ListPath = path.join(VMIPath, 'assigned', Username, 'vms.lst')
		const LinkPath = path.join(VMIPath, 'vms', 'vnclist', `${Username}.lst`)
		try { fs.unlinkSync(ListPath) } catch {}
		try { fs.unlinkSync(LinkPath) } catch {}
		const Base = GetSessBase(req)
		const TokenPath = path.join(Base, 'token')
		if (!fs.existsSync(TokenPath)) {
			return res.status(401).json({ error: 'Invalid token' })
		}
		try {
			const Stored = fs.readFileSync(TokenPath, 'utf8').trim()
			if (await argon2.verify(Stored, VMIToken)) {
				fs.rmSync(Base, { recursive: true, force: true })
				return res.json({ success: true })
			}
		} catch {}
		res.status(401).json({ error: 'Invalid token' })
	});
}


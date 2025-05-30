const VMIPath = require('../../vmipath');
const fs = require('fs');
const path = require('path');
const argon2 = require('argon2');
const crypto = require('crypto');
const { ValidateSession, GetSessBase, RefreshVNCList } = require("./main")

module.exports = (router) => {
	router.post('/login', async (req, res) => {
		const { Username, Password } = req.body
		if (!Username || !Password) {
			return res.status(400).json({ error: 'Missing credentials' });
		}

		const [HashUser, HashPass] = fs.readFileSync(path.join(VMIPath, 'auth'), 'utf8').trim().split('\n');
			try {
				if (await argon2.verify(HashUser, Username) && await argon2.verify(HashPass, Password)) {
				const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!?.,:;#%';
				let Token = ''
				for (let i = 0; i < 32; i++) {
					Token += chars.charAt(crypto.randomInt(0, chars.length))
				}
				const RawIP = req.ip.replace(/^::ffff:/, '')
				const UAgentHash = crypto.createHash('sha256').update(req.get('User-Agent') || '').digest('hex');
				const Base = path.join(VMIPath, 'tokens', RawIP, UAgentHash);
				fs.mkdirSync(Base, { recursive: true });
				fs.writeFileSync(path.join(Base, 'user'), Username);
				const HashToken = await argon2.hash(Token);
				fs.writeFileSync(path.join(Base, 'token'), HashToken);
				fs.writeFileSync(path.join(Base, '.created'), String(Date.now()))
				RefreshVNCList(Username, Token)
				return res.json({ Token })
			}
		} catch (err) {
			console.error(err)
		}
		res.status(401).json({ error: 'Invalid credentials' })
	});
}


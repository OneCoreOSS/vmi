const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const argon2 = require('argon2')
const VMIPath = require('../../vmipath');

async function ValidateSession(Token, req) {
	const RawIP = req.ip.replace(/^::ffff:/, '')
	const UAHash = crypto.createHash('sha256').update(req.get('User-Agent') || '').digest('hex')
	const Base = path.join(VMIPath, 'tokens', RawIP, UAHash)
	const TokenPath = path.join(Base, 'token')
	const CreationPath = path.join(Base, '.created')
	if (!fs.existsSync(TokenPath) || !fs.existsSync(CreationPath)){
		return false
	}
	const TokenHash = fs.readFileSync(TokenPath, 'utf8').trim()
	const Created = parseInt(fs.readFileSync(CreationPath, 'utf8').trim(), 10)
	if (isNaN(Created) || Date.now() - Created > 30 * 24 * 60 * 60 * 1000){
		return false
	}
	try { return await argon2.verify(TokenHash, Token) }
	catch { return false }
}

function GetSessBase(req) {
	const RawIP = req.ip.replace(/^::ffff:/, '')
	const UAHash = crypto.createHash('sha256').update(req.get('User-Agent') || '').digest('hex')
	return path.join(VMIPath, 'tokens', RawIP, UAHash)
}

async function GetSessUser(req) {
	const Token = req.get('Authorization')?.split(' ')[1]
	if (!Token || !(await ValidateSession(Token, req))) return null
	const Base = GetSessBase(req)
	const UserFile = path.join(Base, 'user')
	if (!fs.existsSync(UserFile)) return null
	return fs.readFileSync(UserFile, 'utf8').trim()
}

function RefreshVNCList(Username, Token) {
	const TokenHash = crypto.createHash('sha256').update(Token).digest('hex')
	const AssignedDir = path.join(VMIPath, 'assigned', Username)
	fs.mkdirSync(AssignedDir, { recursive: true })
	const LstPath = path.join(AssignedDir, 'vms.lst')

	const LookupPath = path.join(VMIPath, 'vms', 'lookup.json')
	const Lookup = fs.existsSync(LookupPath) ? JSON.parse(fs.readFileSync(LookupPath, 'utf8')) : {}

	const Lines = Object.keys(Lookup).map((UUID, i) => {
		const InfoPath = path.join(VMIPath, 'vms', UUID, 'vminfo.json')
		if (!fs.existsSync(InfoPath)) return null
		const Info = JSON.parse(fs.readFileSync(InfoPath, 'utf8'))
		const Owners = Array.isArray(Info.Base?.Owners) ? Info.Base.Owners : []
		if (!Owners.includes(Username)) return null
		const Port = 5900 + i
		return `${TokenHash}-${UUID}: 127.0.0.1:${Port}`
	}).filter(Boolean)

	fs.writeFileSync(LstPath, Lines.join('\n') + '\n')

	const LinkDir = path.join(VMIPath, 'vms', 'vnclist')
	fs.mkdirSync(LinkDir, { recursive: true })
	const LinkPath = path.join(LinkDir, `${Username}.lst`)
	try { fs.unlinkSync(LinkPath) } catch {}
	fs.symlinkSync(LstPath, LinkPath)
}

module.exports = { ValidateSession, GetSessBase, GetSessUser, RefreshVNCList };

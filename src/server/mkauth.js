const fs = require('fs')
const path = require('path')
const readline = require('readline')
const argon2 = require('argon2')

async function run() {
	const [,, VmiPath, UsernameArg, PasswordArg] = process.argv

	if (!VmiPath) {
		console.log("usage: mkauth <vmi path> [username] [password]")
		process.exit(1)
	}

	let Username = UsernameArg
	let Password = PasswordArg

	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		terminal: true
	})
	const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve))

	if (!Username) {
		Username = await question("Username % ")
	}

	if (!Password) {
		while (true) {
			Password = await question("Password % ")
			const Confirm  = await question("Confirm Password % ")

			if (Password !== Confirm) {
				console.log(" !! Passwords do not match. Please try again.")
				continue
			}

			const LengthChk  = Password.length >= 8
			const SpecialChk = (Password.match(/[^A-Za-z0-9]/g) || []).length
			const DigitsChk  = (Password.match(/\d/g) || []).length
			const LowerChk   = /[a-z]/.test(Password)
			const UpperChk   = /[A-Z]/.test(Password)

			if (!LengthChk) {
				console.log(" !! Password must be at least 8 characters long.")
			} else if (SpecialChk < 2) {
				console.log(" !! Password must contain at least 2 special characters.")
			} else if (DigitsChk < 2) {
				console.log(" !! Password must contain at least 2 numbers.")
			} else if (!LowerChk || !UpperChk) {
				console.log(" !! Password must contain both lowercase and uppercase letters.")
			} else {
				break
			}
		}
	} else {
		console.log("When passing a password as an argument, it will not be validated or hidden.")
	}

	rl.close()

	try {
		const HashUser = await argon2.hash(Username)
		const HashPass = await argon2.hash(Password)

		const AuthPath = path.join(VmiPath, 'auth')
		fs.writeFileSync(AuthPath, `${HashUser}\n${HashPass}\n`)

		console.log(` :: Authentication file written to ${AuthPath}`)
	} catch (err) {
		console.error(" !! ERROR %% ", err)
		process.exit(1)
	}
}

run().catch(err => {
	console.error(" !! ERROR %% ", err)
	process.exit(1)
})

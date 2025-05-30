const fs   = require('fs');
const path = require('path');

const ArchMap = {
	x86_64: 'x86',
	amd64:  'x86',
	arm64:  'arm64',
	aarch64:'arm64'
};

function LoadConfig(FilePath) {
	if (!fs.existsSync(FilePath)) {
		throw new Error(`Config file not found: ${filePath}`);
	}
	return JSON.parse(fs.readFileSync(FilePath, 'utf8'));
}

/* this basically builds a CLI qemu-system-X command from our vmi config */

function BuildCommand(VMCfg) {
	const UserArch = VMCfg.Base.Arch;
	const VMArch = ArchMap[UserArch];
	if (!VMArch) {
		throw new Error(`Unsupported architecture: ${UserArch}`);
	}

	const { binary, handlers } = require(path.join(__dirname, `qemu-${VMArch}.js`));
	const args = [ binary ];

	/* Base Branding */
	args.push(`-smbios type=2,manufacturer="OneCore",product="OneCoreVMI",version="1.00"`);
	args.push(`-smbios type=1,manufacturer="OneCore",product="OneCoreVMI",version="1.00"`);

	/* Base CFG */
	if (VMCfg.Base.CPU)     args.push(`-cpu ${VMCfg.Base.CPU}`);
	if (VMCfg.Base.SMP)     args.push(`-smp ${VMCfg.Base.SMP}`);
	if (VMCfg.Base.RAM)     args.push(`-m ${VMCfg.Base.RAM}`);
	if (VMCfg.Base.Machine) args.push(`-machine ${VMCfg.Base.Machine}`);
	if (VMCfg.Base.Accel)   args.push(`-accel ${VMCfg.Base.Accel}`);

	/* Hardware CFG */
	if (VMCfg.Misc.Battery) args.push(`-acpitable file="%VMI:/resfiles/qemu/SSDT1.dat"`);

	['Hardware','Misc'].forEach(Section => {
		Object.entries(VMCfg[Section] || {}).forEach(([k,v]) => {
			const fn = handlers[k];
			if(fn) {
				const out = fn(v);
				if(out) args.push(out);
			}
		});
	});

	/* Storage CFG */
	Object.values(VMCfg.Storage || {}).forEach(([type, iface, file]) => {
		if (type === 'Disk') {
			args.push(`-drive if=${iface},file="${file}"`);
		} else if (type === 'Floppy') {
			args.push(`-drive if=floppy,file=${file}`);
		} else if (type === 'CDROM' || iface === 'iso') {
			args.push(`-cdrom ${file}`);
		}
	});

	/* Extra CFG */
	if (VMCfg.ExtraQEMUParams) {
		args.push(VMCfg.ExtraQEMUParams);
	}

	return args.join(' ');
}

module.exports = { LoadConfig, BuildCommand };

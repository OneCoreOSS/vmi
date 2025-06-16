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

const VMStorageList = {
	"virtio": [],
	"ide": [],
	"nvme": [],
	"scsi": [],
	"sd": []
}

const OnlyOne = {
	"scsipci": "-device virtio-scsi-pci,id=scsi",
}

/* this basically builds a CLI qemu-system-X command from our vmi config */

function BuildCommand(VMCfg) {
	VMStorageList.virtio = [];
	VMStorageList.ide = [];
	VMStorageList.nvme = [];
	VMStorageList.scsi = [];
	VMStorageList.sd = [];

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
			if(iface == "virtio") {
				args.push(`-drive if=${iface},file="${file}",id=vmi.virtio${VMStorageList[iface].length}`)
			} else if(iface == "ide") {
				args.push(`-drive if=${iface},file="${file}",id=vmi.ide${VMStorageList[iface].length}`)
			} else if(iface == "nvme") {
				args.push(`-drive if=none,file="${file}",id=vmi.nvme${VMStorageList[iface].length} -device nvme,serial=0x073C0530,drive=vmi.nvme${VMStorageList[iface].length}`)
			} else if(iface == "scsi") {
				args.push(`-drive if=none,file="${file}",id=vmi.scsi${VMStorageList[iface].length} ${OnlyOne.scsipci} -device scsi-hd,drive=vmi.scsi${VMStorageList[iface].length}`)
				OnlyOne.scsipci = "";
			} else if(iface == "sd") {
				args.push(`-drive if=none,file="${file}",id=vmi.sdcard${VMStorageList[iface].length} -device sdhci-pci,id=sdcard${VMStorageList[iface].length} -device sd-card,drive=vmi.sdcard${VMStorageList[iface].length}`)
			}
			//args.push(`-drive if=${iface},file="${file}"`);
		} else if (type === 'Floppy') {
			args.push(`-drive if=floppy,file=${file}`);
		} else if (type === 'CDROM' || iface === 'iso') {
			args.push(`-cdrom ${file}`);
		}
		VMStorageList[iface].push(0); // Increment drive ID by 1
	});

	/* Extra CFG */
	if (VMCfg.ExtraQEMUParams) {
		args.push(VMCfg.ExtraQEMUParams);
	}

	return args.join(' ');
}

module.exports = { LoadConfig, BuildCommand };

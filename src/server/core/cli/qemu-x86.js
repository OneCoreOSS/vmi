module.exports = {
	binary: 'qemu-system-x86_64',
	handlers: {
		Mouse: (p)        => p === 'usb' ? '-usb -device usb-tablet' : '',
		Keyboard: (p)     => p === 'usb' ? '-usb -device usb-kbd'    : '',
		Network: (p)      => `-device ${p},netdev=net0 -netdev user,id=net0`,
		Graphics: (p)     => `-device ${p}`,

		UEFI: (enabled) => enabled ? '-drive if=pflash,file=/usr/local/share/qemu/edk2-x86_64-code.fd,readonly=on -smbios type=0,vendor="OneCore",version="1.00",uefi=on' : '-smbios type=0,vendor="OneCore",version="1.00",uefi=off',
	    	TPM2_0: (en) => en ? '-chardev socket,id=chrtpm,path=/var/run/tpm2-sock ' + '-tpmdev emulator,id=tpm0,chardev=chrtpm ' + '-device tpm-tis,tpmdev=tpm0' : '',
		Battery: () => '',
		AppleSMC: () => ''
	}
};

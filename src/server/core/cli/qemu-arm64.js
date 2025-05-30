module.exports = {
	binary: 'qemu-system-aarch64',
	handlers: {
		Mouse: (p)      => p === 'usb' ? '-device usb-mouse' : '',
		Keyboard: (p)   => p === 'usb' ? '-device usb-kbd'   : '',
		Network: (p)    => `-device ${p},id=net0 -netdev user,id=net0`,
		Graphics: (p)   => `-device ${p}`,

		UEFI: (enabled) => enabled ? '-drive if=pflash,file=/usr/local/share/qemu/edk2-aarch64-code.fd,readonly=on' : '',
		TPM2_0: (en)    => en ? '-chardev socket,id=chrtpm,path=/var/run/tpm2-sock ' + '-tpmdev emulator,id=tpm0,chardev=chrtpm ' + '-device tpm-tis,tpmdev=tpm0' : '',
		Battery: ()     => '',
		AppleSMC: ()    => ''
	}
};

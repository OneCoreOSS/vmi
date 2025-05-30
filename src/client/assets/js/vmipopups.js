const vmi_data_cache = {};
const CurrentVMConfig = {
	"Base": {
		"Owners": [],
		"Name": false,
		"OSFamily": "",
		"Accel": false,
		"Arch": false,
		"Machine": false,
		"CPU": false,
		"SMP": false,
		"RAM": 0,
	},
	"Hardware": {
		"Mouse": "",
		"Keyboard": "",
		"Network": "",
		"Graphics": "",
	},
	"Storage": {},
	"Misc": {
		"UEFI": false,
		"SecureBoot": false,
		"TPM2.0": false,
		"Battery": false,
		"AppleSMC": false
	},
	"ExtraQEMUParams": ""
}

function PopulateUserSelect(id, options) {
	const Select = document.getElementById(id);
	Select.innerHTML = '';
	for (const value of options) {
		const Option = document.createElement('option');
		Option.value = value;
		Option.innerText = value;
		Select.appendChild(Option);
	}
}

function LoadUserArch(VMPage){
	// check if vmi arch is already set (it should)
	const UserArch = CurrentVMConfig.Base.Arch ? CurrentVMConfig.Base.Arch : document.getElementById("vm-new-select-arch").value;
	const ValidArchs = {
		"x86_64": true,
		"aarch64": true
	}
	if(ValidArchs[UserArch]){
		if(!vmi_data_cache[`${UserArch}-features.json`]){
			fetch(`/resources/vmi/${UserArch}-features.json`)
			.then(res => {
				if(!res.ok){
					throw new Error(`[OneCore VMI] : Could not load features for architecture '${UserArch}'`);
				}
				return res.json();
			})
			.then(JSONFeatures => {
				vmi_data_cache[`${UserArch}-features.json`] = JSONFeatures;
				if(VMPage == "newvm"){
					PopulateUserSelect("vm-new-select-machine", JSONFeatures.machines);
					PopulateUserSelect("vm-new-select-cpu", JSONFeatures.cpus);
				} else if(VMPage == "newvm2"){
					PopulateUserSelect("vm-new-select-net", JSONFeatures.netadapters);
					PopulateUserSelect("vm-new-select-graphics", JSONFeatures.graphics);
				}
			})
		} else {
			if(VMPage == "newvm"){
				PopulateUserSelect("vm-new-select-machine", vmi_data_cache[`${UserArch}-features.json`].machines);
				PopulateUserSelect("vm-new-select-cpu", vmi_data_cache[`${UserArch}-features.json`].cpus);
			} else if(VMPage == "newvm2"){
				PopulateUserSelect("vm-new-select-net", vmi_data_cache[`${UserArch}-features.json`].netadapters);
				PopulateUserSelect("vm-new-select-graphics", vmi_data_cache[`${UserArch}-features.json`].graphics);
			}
		}
	}
}

function CreateItem(label,value,id){
	const Div = document.createElement("div");
	const Label = document.createElement("label");
	const Input = document.createElement("input");
	Div.className = "user-selection";
	Label.textContent = label;
	Input.id = "editvm-val-" + id.toLowerCase();
	Input.type = "text";

	if (typeof value === "boolean") {
		Input.type = "checkbox";
		Input.checked = value;
	} else {
		Input.type = "text";
		Input.value = value;
	}

	Div.appendChild(Label);
	Div.appendChild(Input);
	document.getElementById("editvm-misc-items").appendChild(Div);
}

const VMI_Popups = {
	"auth": function(){
		document.getElementById("auth-login-bttn").addEventListener("click", async function(){
			document.getElementById("auth-login-bttn").disabled = true;
			const res = await fetch('/api/v1/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					Username: document.getElementById("auth-username").value,
					Password: document.getElementById("auth-password").value
				})
			})
			const data = await res.json();
			if(res.ok){
				console.log(`Token OK`);
				//document.getElementById("glass-back-cover").style.display = "none";
				//document.getElementById("topbar-rightmost").style.display = "flex";
				if(document.getElementById("auth-remember").checked){
					localStorage.setItem("VMIToken", data.Token);
					localStorage.setItem("VMIUser", document.getElementById("auth-username").value);
				} else {
					sessionStorage.setItem("VMIToken", data.Token);
					sessionStorage.setItem("VMIUser", document.getElementById("auth-username").value);
				}
				location.reload();
				// document.getElementById("popup-window").remove();
			} else {
				alert(`Authentication Failed\n\n${data.error}`);
				document.getElementById("auth-login-bttn").disabled = false;
				throw new Error(`[OneCore VMI] : Auth FAIL : ${data.error}`);
			}
		});
	},
	"newvm": function(){
		LoadUserArch("newvm");
		document.getElementById("vm-new-select-arch").addEventListener("change",function(){
			LoadUserArch("newvm");
		});
		document.getElementById("newvm-smp").max = HostSpecs.MaxSMP;
		document.getElementById("newvm-ram").max = HostSpecs.MaxRAM;
		document.getElementById("newvm-smp-count").innerText = `Processor Cores (${document.getElementById("newvm-smp").value})`;
		document.getElementById("newvm-smp").addEventListener("input",function(){
			document.getElementById("newvm-smp-count").innerText = `Processor Cores (${document.getElementById("newvm-smp").value})`;
		});
		document.getElementById("newvm-next-bttn").addEventListener("click",function(){
			if(document.getElementById("newvm-name").value.length>0){
				const VMIUser = localStorage.getItem("VMIUser") ?? sessionStorage.getItem("VMIUser");
				CurrentVMConfig.Base.Owners = [VMIUser];
				CurrentVMConfig.Base.Name = document.getElementById("newvm-name").value;
				CurrentVMConfig.Base.OSFamily = document.getElementById("vm-new-select-family").value;
				CurrentVMConfig.Base.Accel = document.getElementById("vm-new-select-accel").value;
				CurrentVMConfig.Base.Arch = document.getElementById("vm-new-select-arch").value;
				CurrentVMConfig.Base.Machine = document.getElementById("vm-new-select-machine").value;
				CurrentVMConfig.Base.CPU = document.getElementById("vm-new-select-cpu").value;
				CurrentVMConfig.Base.SMP = document.getElementById("newvm-smp").value;
				CurrentVMConfig.Base.RAM = document.getElementById("newvm-ram").value;
				document.getElementById("popup-window").remove();
				NewPopup("newvm2");
			} else {
				alert("Virtual Machine name is not set");
			}
		});
		const RAMSlider = document.getElementById("newvm-ram");
		const RAMValue = document.getElementById("newvm-ram-count");

		function SnapRAM(){
			// TODO: autodetect snap point with API & Math
			const SnapPoints = [8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192];
			const SnapThreshold = 150;
			let value = parseInt(RAMSlider.value);
			for (let point of SnapPoints) {
				if (Math.abs(value - point) <= SnapThreshold) {
					value = point;
					break;
				}
			}
			RAMValue.innerText = `RAM (${value} MB)`;
			RAMSlider.value = value;
		}
		RAMSlider.addEventListener("input", () => {
			SnapRAM();
		});
		SnapRAM();
	},

	"newvm2": function(){
		LoadUserArch("newvm2");
		document.getElementById("newvm-next-bttn").addEventListener("click",function(){
			CurrentVMConfig.Hardware.Mouse = document.getElementById("vm-new-select-mouse").value
			CurrentVMConfig.Hardware.Keyboard = document.getElementById("vm-new-select-kbd").value
			CurrentVMConfig.Hardware.Network = document.getElementById("vm-new-select-net").value
			CurrentVMConfig.Hardware.Graphics = document.getElementById("vm-new-select-graphics").value
			document.getElementById("popup-window").remove();
			NewPopup("newvm3");
		});
	},

	"newvm3": async function(){
		/* setup disk info for this vm */
		const VMIMedias = [];
		document.getElementById("newdisk-name").value = `VMIDisk for ${CurrentVMConfig.Base.Name}`;
		document.getElementById("newvm-disk-size-count").innerText = `Disk Size (${document.getElementById("newvm-disk-size").value} GB)`;

		document.getElementById("newvm-disk-size").addEventListener("input", () => {
			document.getElementById("newvm-disk-size-count").innerText = `Disk Size (${document.getElementById("newvm-disk-size").value} GB)`;
		});

		document.getElementById("newvm-mainsel-newdisk").addEventListener("change",function(){
			if(this.checked) document.getElementById("newvm-diskcreate-listing").style.display = "contents";
			else document.getElementById("newvm-diskcreate-listing").style.display = "none";
		});

		document.getElementById("newvm-mainsel-fromvmi").addEventListener("change",function(){
			if(this.checked) document.getElementById("vmi-media-list").style.display = "grid";
			else document.getElementById("vmi-media-list").style.display = "none";
		});


		/* list vmi medias, sort by : CD -> FLOPPY -> DISK */

		const VMIToken = localStorage.getItem("VMIToken") ?? sessionStorage.getItem("VMIToken");

		try {
			const res = await fetch('/api/v1/get-media', {
				method: 'GET',
				headers: {
					'Authorization': 'Bearer ' + VMIToken
				}
			});

			if (!res.ok) {
				throw new Error(`[OneCore VMI] : Fetching media failed : ${res.status}`);
			}

			const MediaList = await res.json();
			const IfType = {
				"ISOs": ["CDROM","ide","%VMI:/media/iso"],
				"Disks": ["Disk","virtio","%VMI:/media/disk"],
				"Floppys": ["Floppy","floppy","%VMI:/media/floppy"]
			}
			console.log(MediaList);
			Object.entries(MediaList).forEach(([Type, FileArr]) => {
				FileArr.forEach(Filename => {
					const MediaButton = document.createElement('button');
					const MediaButtonImg = document.createElement('img');
					const MediaButtonTxt = document.createElement('a');
					MediaButtonTxt.innerText = Filename;
					MediaButtonImg.alt = Type;
					MediaButtonImg.className = "contained-img svg-side";
					MediaButtonImg.style.maxHeight = "25%";
					if(Type == "ISOs") MediaButtonImg.src = "/assets/svg/dvd.svg";
					else if(Type == "Floppys") MediaButtonImg.src = "/assets/svg/floppy.svg";
					else if(Type == "Disks") MediaButtonImg.src = "/assets/svg/disk.svg";
					MediaButton.className = "grid-listing-bttn";
					MediaButton.appendChild(MediaButtonImg);
					MediaButton.appendChild(MediaButtonTxt);
					MediaButton.addEventListener("click", function(){
						if(this.getAttribute("vmi-media-index")){
							const VMIMediaIndex = parseInt(this.getAttribute("vmi-media-index"));
							VMIMedias.splice(VMIMediaIndex, 1);
							this.removeAttribute("vmi-media-index");
							this.style.border = "";
							Array.from(document.getElementById('vmi-media-list').children).forEach(MediaBttn => {
								if(MediaBttn.hasAttribute('vmi-media-index')) {
									const ChildIndex = parseInt(MediaBttn.getAttribute('vmi-media-index'));
									if(ChildIndex > VMIMediaIndex) {
										MediaBttn.setAttribute('vmi-media-index', ChildIndex - 1);
									}
								}
							});
						} else {
							this.setAttribute("vmi-media-index",VMIMedias.length);
							VMIMedias.push([IfType[Type][0], IfType[Type][1], `${IfType[Type][2]}/${Filename}`]);
							this.style.border = "1px solid #0F0";
						}
					});
					document.getElementById('vmi-media-list').appendChild(MediaButton);
				});
			});

		} catch (err) {
			throw new Error(`[OneCore VMI] : Network/Parsing Error : ${err}`);
		}

		document.getElementById("newvm-createdisk-bttn").addEventListener("click", async function(){
			if(document.getElementById("newvm-mainsel-newdisk").checked){
				const VMI_DiskName = document.getElementById("newdisk-name").value;
				const VMI_FileType = document.getElementById("newvm-disk-select-type").value;
				const VMIToken = localStorage.getItem("VMIToken") ?? sessionStorage.getItem("VMIToken");
				document.getElementById("newvm-skipdisk-bttn").disabled = true;
				document.getElementById("newvm-createdisk-bttn").disabled = true;
				document.getElementById("popup-close-bttn").style.display = "none";

				const res = await fetch('/api/v1/create-disk', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${VMIToken}`,
					},
					body: JSON.stringify({
						DiskName: VMI_DiskName,
						FileType: VMI_FileType,
						FileSize: String(document.getElementById("newvm-disk-size").value),
					}),
				});
				if(!res.ok){
					const err = await res.json().catch(() => ({ error: res.statusText }));
					alert(`Failed to create disk\n\n ${err.error || resp.statusText}`);
					document.getElementById("newvm-skipdisk-bttn").disabled = false;
					document.getElementById("newvm-createdisk-bttn").disabled = false;
					document.getElementById("popup-close-bttn").style.display = "block";
					throw new Error(`[OneCore VMI] : Failed to create disk : ${err.error || resp.statusText}`);
				} else {
					console.log("Disk created successfully");
					CurrentVMConfig.Storage[`${Object.keys(CurrentVMConfig.Storage).length}`] = ["Disk","virtio",`%VMI:/media/disk/${VMI_DiskName}.${VMI_FileType}`];
				}
			}
			if(document.getElementById("newvm-mainsel-fromvmi").checked){
				if(VMIMedias.length>0){
					VMIMedias.forEach(media => {
						CurrentVMConfig.Storage[`${Object.keys(CurrentVMConfig.Storage).length}`] = media;
					});
				}
			}
			document.getElementById("popup-window").remove();
			NewPopup("newvm4");

		});
		document.getElementById("newvm-skipdisk-bttn").addEventListener("click",function(){
			document.getElementById("popup-window").remove();
			NewPopup("newvm4");
		});
	},

	"newvm4": function(){
		document.getElementById("newvm-next-bttn").addEventListener("click", async function(){
			CurrentVMConfig.Misc.UEFI = document.getElementById("newvm-uefi").checked;
			CurrentVMConfig.Misc.SecureBoot = document.getElementById("newvm-secboot").checked;
			CurrentVMConfig.Misc["TPM2.0"] = document.getElementById("newvm-tpm").checked;
			CurrentVMConfig.Misc.Battery = document.getElementById("newvm-battery").checked;
			CurrentVMConfig.Misc.AppleSMC = document.getElementById("newvm-applesmc").checked;
			CurrentVMConfig.ExtraQEMUParams = document.getElementById("newvm-extracli").value;

			const VMIToken = localStorage.getItem("VMIToken") ?? sessionStorage.getItem("VMIToken");
			const res = await fetch('/api/v1/add-vm', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${VMIToken}`
				},
				body: JSON.stringify({ VMInfo: CurrentVMConfig })
			});

			if (!res.ok) {
				const err = await res.json();
				alert(`VM Creation failed\n\n ${err.error || resp.statusText}`);
				throw new Error(`[OneCore VMI] : VM Creation failed : ${err.error || resp.statusText}`);
			} else {
				const data = await res.json();
				//console.log('VM created, UUID =', data.uuid);
				VMI_VMList.push({
					"OSFamily": CurrentVMConfig.Base.OSFamily,
					"Name": CurrentVMConfig.Base.Name,
					"VMUUID": data.VMUUID
				});
				document.getElementById("popup-window").remove();
				document.getElementById("glass-back-cover").style.display = "none";
			}
			//NewPopup("newvm3");
		});
	},

	"newmedia": function(){
		document.getElementById("media-new-select-source").addEventListener("change",function(){
			if(document.getElementById("media-new-select-source").value == "FILE") {
				document.getElementById("newmedia-url-selection").style.display = "none";
				document.getElementById("newmedia-file-selection").style.display = "flex";
			} else {
				document.getElementById("newmedia-file-selection").style.display = "none";
				document.getElementById("newmedia-url-selection").style.display = "flex";
			}
		});
		document.getElementById("newmedia-upload-bttn").addEventListener("click", function(){
			const UpForm = new FormData();
			const UploadFile = document.getElementById("newmedia-upload");
			const UploadMode = document.getElementById("media-new-select-source").value;
			const UploadURL = document.getElementById("newmedia-url-upload").value.trim();
			UpForm.append('FileType', document.getElementById("media-new-select-type").value);
			if(UploadMode == "FILE"){
				if(!UploadFile.files[0]){
					alert("Please select a file to upload.");
					return;
				} else {
					UpForm.append('UploadType', 'FILE');
					UpForm.append('file', UploadFile.files[0]);
				}
			} else {
				if (!UploadURL) {
					alert('Please enter a URL.');
					return;
				} else {
					UpForm.append('UploadType', 'URL');
					UpForm.append('FileURL', UploadURL);
				}
			}
			document.getElementById("newmedia-upload-bttn").disabled = true;
			document.getElementById("popup-close-bttn").style.display = "none";
			document.getElementById("media-new-statusdiv").style.display = "flex";
			const VMIToken = localStorage.getItem("VMIToken") ?? sessionStorage.getItem("VMIToken");
			const XHRReq = new XMLHttpRequest();
			XHRReq.open('POST', '/api/v1/upload', true);
			XHRReq.setRequestHeader('Authorization', `Bearer ${VMIToken}`);
			if (UploadMode === "FILE") {
				XHRReq.upload.onprogress = (e) => {
					if (e.lengthComputable) {
						const Percent = (e.loaded / e.total) * 100;
						document.getElementById("media-new-progressbar").value = Percent / 100;
						const LoadedMB = (e.loaded / 1024 / 1024).toFixed(0);
						const TotalMB = (e.total / 1024 / 1024).toFixed(0);
						document.getElementById("media-new-status").textContent = `Uploaded ${LoadedMB} MB of ${TotalMB} MB (${Math.round(Percent)}%)`;
					}
				};
			} else {
				let LastIndex = 0;
				XHRReq.responseType = 'text';
				XHRReq.onprogress = (e) => {

					const text = XHRReq.responseText;
					const newData = text.slice(LastIndex);
					LastIndex = text.length;

					/* i formated it as "event: progress\ndata: {...}\n\n" */
					const regex = /event:\s*progress[^\n]*\n(?:data:\s*)(\{[\s\S]*?\})\n\n/g;
					let m;
					while ((m = regex.exec(newData)) !== null) {
						try {
							const Progress = JSON.parse(m[1]);
							const LoadedMB = (Progress.loaded / 1024 / 1024).toFixed(1);
							const TotalMB  = (Progress.total  / 1024 / 1024).toFixed(1);
							const Percent      = Progress.percent;
							document.getElementById("media-new-progressbar").value = Percent / 100;
							document.getElementById("media-new-status").textContent = `Downloaded ${LoadedMB} MB of ${TotalMB} MB (${Percent}%)`;
						} catch (err) {
							console.warn("Could not parse progress JSON:", err);
						}
					}
				};
			}

			XHRReq.onload = () => {
				if (XHRReq.status === 200) {
					document.getElementById("media-new-status").textContent = "Upload complete !";
				} else {
					document.getElementById("media-new-status").textContent = `Error ${XHRReq.status}: ${XHRReq.responseText}`;
				}
				document.getElementById("popup-close-bttn").style.display = "block";
				document.getElementById("newmedia-upload-bttn").disabled = false;
			};

			XHRReq.onerror = () => {
				document.getElementById("media-new-status").textContent = 'Network error';
			};

			XHRReq.send(UpForm);
		})
	},

	"deletevm": function(Args){
		// Args[0] : VMUUID
		// Args[1] : VMName
		document.getElementById("delvm-vmname").innerText = Args[1];
		document.getElementById("delvm-cancel-bttn").addEventListener("click", function(){
			document.getElementById("popup-close-bttn").click();
		});
		document.getElementById("delvm-delete-bttn").addEventListener("click", async function(){
			document.getElementById("delvm-delete-bttn").disabled = true;
			document.getElementById("delvm-cancel-bttn").disabled = true;
			document.getElementById("popup-close-bttn").style.display = "none";
			const VMName = document.getElementById("delvm-vmname").innerText;
			const UserVMName = document.getElementById("delvm-vmname-user").value;
			if(VMName == UserVMName){
				const VMIToken = localStorage.getItem("VMIToken") ?? sessionStorage.getItem("VMIToken");
				try {
					const res = await fetch('/api/v1/delete-vm', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'Authorization': `Bearer ${VMIToken}`,
							'VMUUID': Args[0]
						}
					});

					const data = await res.json();
					if (res.ok) {
						console.log('VM deleted successfully:', data);
						location.reload();
					} else {
						alert(`Failed to delete VM\n\n${data.error}`);
					}
				} catch (err) {
					alert(`Failed to delete VM\n\n${err}`);
					throw new Error(`[OneCore VMI] : Request Failed : ${err}`);
				}
			} else {
				document.getElementById("delvm-delete-bttn").disabled = false;
				document.getElementById("delvm-cancel-bttn").disabled = false;
				document.getElementById("popup-close-bttn").style.display = "block";
				alert("Cannot Delete VM\n\nNames do not match.");
			}
		});
	},

	"vmiinfo": function(Args){
		// Args[0] : Product
		// Args[1] : Manufacturer
		// Args[2] : Version
		// Args[3] : MaxSMP
		// Args[4] : MaxRAM
		document.getElementById("vmiinfo-product").value = Args[0];
		document.getElementById("vmiinfo-manufacturer").value = Args[1];
		document.getElementById("vmiinfo-version").value = Args[2];
		document.getElementById("vmiinfo-maxsmp").value = `${Args[3]} Cores`;
		document.getElementById("vmiinfo-maxram").value = `${Args[4]} MB`;
	},

	"editvm": async function(Args){
		// Args[0] : VMUUID
		// Args[1] : VMName
		console.log(Args[0])
		const VMIToken = localStorage.getItem("VMIToken") ?? sessionStorage.getItem("VMIToken");
		const res = await fetch('/api/v1/get-vminfo', {
			method: 'GET',
			headers: {
				'Authorization': `Bearer ${VMIToken}`,
				'VMUUID': Args[0]
			}
		});

		if (!res.ok) {
			throw new Error(`[OneCore VMI] : Could not get VM Info : ${res.status}`);
		}

		const VMInfo = await res.json();
		console.log('VM Info:', VMInfo);

		CurrentVMConfig.Base = VMInfo.Base;
		CurrentVMConfig.Hardware = VMInfo.Hardware;
		CurrentVMConfig.Storage = VMInfo.Storage;
		CurrentVMConfig.Misc = VMInfo.Misc;
		CurrentVMConfig.ExtraQEMUParams = VMInfo.ExtraQEMUParams;

		var excludeBase = ["Owners","Name","OSFamily"];

		Object.keys(VMInfo).forEach(function(section){
			if (section==="Storage") return;
			var content = VMInfo[section];
			if (typeof content==="object" && !Array.isArray(content)) {
				Object.keys(content).forEach(function(key) {
					if (section==="Base" && excludeBase.indexOf(key) >- 1) return;
					CreateItem(key,content[key],key);
				});
			} else {
				CreateItem(section,content,section);
			}
		});

		document.getElementById("editvm-apply-bttn").addEventListener("click", async function(){
			this.disabled = true;

			for (let section in CurrentVMConfig) {
				for (let key in CurrentVMConfig[section]) {
					let el = document.getElementById('editvm-val-' + key.toLowerCase());
					if (!el) continue;
					// checkbox -> .checked, all others -> .value
					CurrentVMConfig[section][key] = el.type === 'checkbox' ? el.checked : el.value;
				}
			}


			const res = await fetch('/api/v1/edit-vm', {
				method: 'POST',
				headers: {
					'Authorization': 'Bearer ' + VMIToken,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ VMUUID: Args[0], VMInfo: CurrentVMConfig })
			});

			if(!res.ok){
				const error = await res.text();
				alert(`Something went wrong while modifying the VM.\n\n${error}`);
				this.disabled = false;
			} else {
				document.getElementById("popup-close-bttn").click();
			}
		})
	},

	"settings": function(){
		document.getElementById("settings-apply-bttn").addEventListener("click",function(){
			localStorage.setItem("VMISettings",JSON.stringify({
				"ReducedMotion": document.getElementById("settings-reducedmotion").checked,
				"RoundingRadius": document.getElementById("settings-roundingrad").value
			}));
			location.reload();
		});
	}

}

/* global variables accessible by everything after init */

const VMI_VMList = [];
let VMRunning = false;
let HostSpecs = {
	"MaxRAM": 0,
	"MaxSMP": 0
};

/* sidebar stuff */

document.getElementById("attached-sidebar-closebttn").addEventListener("click", function(){
	document.getElementById('attached-sidebar').classList.toggle('hidden');
});

async function StrToSHA256(Input) {
	const Encoder = new TextEncoder();
	const Data = Encoder.encode(Input);
	const HashBuffer = await crypto.subtle.digest('SHA-256', Data);
	const HashArray = Array.from(new Uint8Array(HashBuffer));
	const HashHex = HashArray.map(b => b.toString(16).padStart(2, '0')).join('');
	return HashHex;
}

function ShowVMList(OS){
	document.getElementById("attached-sidebar").querySelectorAll(".horizontal-select-bttn").forEach(child => child.remove());
	document.getElementById("attached-sidebar-titletxt").innerText = `${OS} Virtual Machines`;
	VMI_VMList.forEach(function(k,i){
		if(VMI_VMList[i].OSFamily == OS){
			const VMSelectBttn = document.createElement("div");
			const VMSelectBttnTxt = document.createElement("a");
			VMSelectBttn.className = "horizontal-select-bttn";
			VMSelectBttn.addEventListener("click", async function(){
				document.getElementById("VMDisplay")?.remove();
				document.getElementById("attached-sidebar").classList.toggle('hidden');
				document.getElementById("active-vm-txt").innerText = VMI_VMList[i].Name;
				const VMIToken = localStorage.getItem("VMIToken") ?? sessionStorage.getItem("VMIToken");
				const TkHash = await StrToSHA256(VMIToken);
				console.log(`DEBUG: vnc url is https://onecore.int/novnc/vnc.html?path=websockify?token=${TkHash}-${VMI_VMList[i].VMUUID}`);

				document.getElementById("vm-actions-list").replaceChildren();
				/* init new vm action buttons */
				const ActionOnOff = document.createElement("div");
				const ActionEdit = document.createElement("div");
				const ActionDelete = document.createElement("div");

				const ActionOnOffImg = document.createElement("img");
				const ActionEditImg = document.createElement("img");
				const ActionDeleteImg = document.createElement("img");

				const ActionOnOffTxt = document.createElement("a");
				const ActionEditTxt = document.createElement("a");
				const ActionDeleteTxt = document.createElement("a");

				ActionOnOff.id = "vmact-poweron-bttn";
				ActionOnOff.className = "horizontal-select-bttn";
				ActionOnOffImg.src = "/assets/svg/run.svg";
				ActionOnOffTxt.innerText = "Power On";
				ActionOnOff.appendChild(ActionOnOffImg);
				ActionOnOff.appendChild(ActionOnOffTxt);
				const StatReq = await fetch(`/api/v1/get-vmstatus?VMUUID=${encodeURIComponent(VMI_VMList[i].VMUUID)}`, {
					method: 'GET',
				});

				if (!StatReq.ok) {
					console.warn(`vmstatus returned HTTP ${res.status}`);
					return false;
				} else {
					const VMStatus = (await StatReq.text()).trim();
					if (VMStatus === '1') {
							document.getElementById("vmview").style.backgroundColor = "var(--color-pure-black)";
							document.getElementById("vmview-infostatus").style.display = "none";
							const VMDisplay = document.createElement("iframe");
							VMDisplay.id = "VMDisplay";
							VMDisplay.src = `/novnc/vnc_lite.html?path=websockify?token=${TkHash}-${VMI_VMList[i].VMUUID}`;
							document.getElementById("vmview").appendChild(VMDisplay);
							VMRunning = true;
					}
				}
				ActionOnOff.addEventListener("click", async function(){
					if(this.getAttribute("disabled") == "true") return;
					this.setAttribute("disabled",true);
					if(!VMRunning){
						/* api turn on */
						try {
							const res = await fetch('/api/v1/start-vm', {
								method: 'POST',
								headers: {
									'Content-Type': 'application/json',
									'Authorization': `Bearer ${VMIToken}`
								},
								body: JSON.stringify({ VMUUID: VMI_VMList[i].VMUUID })
							});

							if (!res.ok) {
								const err = await res.json().catch(() => ({}));
								throw new Error(err.error || `HTTP ${res.status}`);
							}
							console.log("VM started!");
						} catch (err) {
							this.setAttribute("disabled",false);
							throw new Error(`[OneCore VMI] : Failed to start VM: ${err}`);
						}

						/* actual ui turning "on" */
						document.getElementById("vmview").style.backgroundColor = "var(--color-pure-black)";
						document.getElementById("vmview-infostatus").style.display = "none";
						const VMDisplay = document.createElement("iframe");
						VMDisplay.id = "VMDisplay";
						VMDisplay.src = `/novnc/vnc_lite.html?path=websockify?token=${TkHash}-${VMI_VMList[i].VMUUID}`;
						document.getElementById("vmview").appendChild(VMDisplay);
						this.children[0].src = "/assets/svg/stop.svg";
						this.children[1].innerText = "Power Off";
						VMRunning = true;
						this.setAttribute("disabled",false);
				} else {
						try {
							const res = await fetch('/api/v1/stop-vm', {
								method: 'POST',
								headers: {
									'Content-Type': 'application/json',
									'Authorization': `Bearer ${VMIToken}`
								},
								body: JSON.stringify({ VMUUID: VMI_VMList[i].VMUUID, StopType: "HARD" })
							});

							if (!res.ok) {
								const err = await res.json().catch(() => ({}));
								throw new Error(err.error || `HTTP ${res.status}`);
							}
							console.log("VM stopped!");
						} catch (err) {
							this.setAttribute("disabled",false);
							throw new Error(`[OneCore VMI] : Failed to stop VM: ${err}`);
						}

						document.getElementById("VMDisplay")?.remove();
						this.children[0].src = "/assets/svg/run.svg";
						this.children[1].innerText = "Power On";
						VMRunning = false;
						this.setAttribute("disabled",false);
					}
				})
				ActionEdit.id = "vmact-edit-bttn";
				ActionEdit.className = "horizontal-select-bttn";
				ActionEditImg.src = "/assets/svg/notepad.svg";
				ActionEditTxt.innerText = "Modify VM";
				ActionEdit.appendChild(ActionEditImg);
				ActionEdit.appendChild(ActionEditTxt);

				ActionDelete.id = "vmact-delete-bttn";
				ActionDelete.className = "horizontal-select-bttn";
				ActionDeleteImg.src = "/assets/svg/boom.svg";
				ActionDeleteTxt.innerText = "Delete VM";
				ActionDelete.appendChild(ActionDeleteImg);
				ActionDelete.appendChild(ActionDeleteTxt);

				ActionDelete.addEventListener("click", function(){
					NewPopup("deletevm",[VMI_VMList[i].VMUUID, VMI_VMList[i].Name]);
				});

				ActionEdit.addEventListener("click", function(){
					NewPopup("editvm",[VMI_VMList[i].VMUUID, VMI_VMList[i].Name]);
				});

				document.getElementById("vm-actions-list").appendChild(ActionOnOff);
				document.getElementById("vm-actions-list").appendChild(ActionEdit);
				document.getElementById("vm-actions-list").appendChild(ActionDelete);
			});
			VMSelectBttnTxt.innerText = VMI_VMList[i].Name;
			VMSelectBttn.appendChild(VMSelectBttnTxt);
			document.getElementById("attached-sidebar").appendChild(VMSelectBttn);
		}
	});
	document.getElementById('attached-sidebar').classList.toggle('hidden');
}

document.getElementById("Windows-VMListButton").addEventListener("click", () => ShowVMList("Windows"));
document.getElementById("Linux-VMListButton").addEventListener("click", () => ShowVMList("Linux"));
document.getElementById("macOS-VMListButton").addEventListener("click", () => ShowVMList("macOS"));
document.getElementById("Other-VMListButton").addEventListener("click", () => ShowVMList("Other"));



const observer = new MutationObserver(() => {
	const exists = document.getElementById("VMDisplay") !== null;
	if (!exists) {
		VMRunning = false;
		document.getElementById("vmact-poweron-bttn").children[0].src = "/assets/svg/run.svg";
		document.getElementById("vmact-poweron-bttn").children[1].innerText = "Power On";
	} else {
		VMRunning = true;
		document.getElementById("vmact-poweron-bttn").children[0].src = "/assets/svg/stop.svg";
		document.getElementById("vmact-poweron-bttn").children[1].innerText = "Power Off";
	}
});

observer.observe(document.getElementById("vmview"), {
	childList: true,
	subtree: true
});

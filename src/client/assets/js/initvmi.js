(() => {

	const VMISettings = JSON.parse(localStorage.getItem("VMISettings"));
	if(VMISettings){
		if(VMISettings["ReducedMotion"]){
			document.documentElement.style.setProperty("--vmi-transition", "0s");
			document.documentElement.style.setProperty("--vmi-slideanims", "0s");
		}
		if(VMISettings["RoundingRadius"]){
			document.documentElement.style.setProperty("--vmi-radius", `${VMISettings["RoundingRadius"]}rem`);
		}
	}
	document.getElementById("NewVMButton").addEventListener("click", function(){
		NewPopup("newvm");
	});

	document.getElementById("AddMediaButton").addEventListener("click", function(){
		NewPopup("newmedia");
	});

	document.getElementById("SettingsButton").addEventListener("click", function(){
		NewPopup("settings");
	});

	const VMIToken = localStorage.getItem("VMIToken") ?? sessionStorage.getItem("VMIToken");
	if(!VMIToken){
		NewPopup("auth");
	} else {
		fetch('/api/v1/validate', {
			method: 'GET',
			headers: {
				'Authorization': 'Bearer ' + VMIToken
			}
		})
		.then(res => {
			if (!res.ok){
				// in most cases this only happen because of our default 30day token expiry
				// so clear the token variables in case the user selects to remember or not.
				localStorage.removeItem("VMIToken")
				sessionStorage.removeItem("VMIToken")
				NewPopup("auth");
				throw new Error('Unauthorized or failed request');
			}
			return res.json();
		})
		.then(async (data) => {
			if (data.Product === "OneCoreVMI") {
				console.log("Session is OK.");
				/* build vmi info */
				document.getElementById("logo-item").addEventListener("click", function(){
					NewPopup("vmiinfo", [data.Product, data.Manufacturer, data.Version, data.MaxSMP, data.MaxRAM]);
				});
				HostSpecs.MaxRAM = data.MaxRAM;
				HostSpecs.MaxSMP = data.MaxSMP;
				/* preload the vmlist */
				await fetch('/api/v1/list-vms', {
					method: 'GET',
					headers: {
						'Authorization': `Bearer ${VMIToken}`
					}
				})
				.then(res => {
					if (!res.ok) {
						throw new Error(`Error ${res.status}: ${res.statusText}`);
					}
					return res.json();
				})
				.then(VMList => {
					console.log('List of VMs:', VMList);
					VMList.forEach(function(k,i){
						VMI_VMList.push(VMList[i]);
					});
				})
				.catch(err => {
					console.error('Failed to fetch list of VMs:', err);
				});

				document.getElementById("glass-back-cover").style.display = "none";
				document.getElementById("topbar-rightmost").style.display = "flex";
			} else {
				console.log(`Unexpected API Validation : ${data}`);
				return;
			}
		})
		.catch(err => {
			localStorage.removeItem("VMIToken")
			sessionStorage.removeItem("VMIToken")
			NewPopup("auth");
			throw new Error(`Unknown error : ${err}`);
		})
	}

	document.getElementById("logout-bttn").addEventListener("click", function(){
		const VMIToken_Temp = localStorage.getItem("VMIToken") ?? sessionStorage.getItem("VMIToken");
		fetch('/api/v1/logout', {
			method: 'POST',
			headers: {
				'Authorization': 'Bearer ' + VMIToken_Temp
			}
		})
		.then(res => res.json())
		.then(data => {
			location.reload();
		})
		.catch(err => {
			alert(`Logout failed : ${err}\n\nPlease refresh the page.`);
		})
	})
})();

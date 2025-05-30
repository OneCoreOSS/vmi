function NewPopup(PopupName, Args){
	fetch(`/resources/popups/${PopupName}.html`)
	.then(res => {
		if(!res.ok){
			throw new Error(`[OneCore VMI] : Failed to create popup %% response not ok`);
		}
		return res.text();
	})
	.then(HTMLContent => {
		if(document.getElementById("popup-window") == null){
			document.getElementById("glass-back-cover").style.display = "block";
			document.body.insertAdjacentHTML('beforeend', HTMLContent);
			if(document.getElementById("popup-close-bttn") != null){
				document.getElementById("popup-close-bttn").addEventListener("click", function(){
					document.getElementById("popup-window").remove();
					document.getElementById("glass-back-cover").style.display = "none";
				})
			}
			if(VMI_Popups[PopupName]) VMI_Popups[PopupName](Args);
			setTimeout(function(){document.getElementById("popup-window").classList.toggle("hidden")},20);
		} else {
			console.warn(`[OneCore VMI] : Not creating popup due to already active popup.`);
		}
	})
	.catch(err => {
		throw new Error(`[OneCore VMI] : Failed to create popup %% ${err}`);
	});
}

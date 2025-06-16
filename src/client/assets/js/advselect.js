function TriggerAdvancedSelect(){
	var AdvSelects = document.getElementsByClassName("user-advanced-select");
	for(let i=0;i<AdvSelects.length;i++){
		AdvSelects[i].addEventListener("click",function(){
			const UserPrompt = prompt(AdvSelects[i].getAttribute("advdesc"));
			if(!isNaN(UserPrompt)){
				document.getElementById(AdvSelects[i].getAttribute("advtarget")).value = UserPrompt;
			} else {
				alert("Error\n\nInput must be a number.");
			}
		})
	}
}

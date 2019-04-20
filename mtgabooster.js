// TODO? Select cards and export the list in MTGA format?

let Sets = ["m19", "xln", "rix", "dom", "grn", "rna"];
let Cards;
let Collection;
let CardsByRarity = {'common':[], 'uncommon':[], 'rare':[], 'mythic':[]};
let CardsBySet = {};

// Hide controls while there is no collection informations
let GeneratorEl = document.getElementById("generator");
GeneratorEl.style.display = "none";

// Load all card informations
fetch("MTGACards.json").then(function (response) {
	response.text().then(function (text) {
		try {
			Cards = JSON.parse(text);
		} catch(e) {
			alert(e);
		}
	});
});

for(s of Sets)
	CardsBySet[s] = {'common':[], 'uncommon':[], 'rare':[], 'mythic':[]};

function parseMTGALog(e) {
	let file = e.target.files[0];
	if (!file) {
		return;
	}
	var reader = new FileReader();
	reader.onload = function(e) {
		let contents = e.target.result;
		let call_idx = contents.lastIndexOf("PlayerInventory.GetPlayerCardsV3");
		let collection_start = contents.indexOf('{', call_idx);
		let collection_end = contents.indexOf('}', collection_start);
		
		try {
			Collection = JSON.parse(contents.slice(collection_start, collection_end + 1));
		} catch(e) {
			alert(e);
		}
		
		for(e in Collection) {
			if(e in Cards) {
				CardsByRarity[Cards[e]["rarity"]].push(e);
				CardsBySet[Cards[e]["set"]][Cards[e]["rarity"]].push(e);
			} else {
				console.warn(e + " unknown.");
			}
		}
		
		// Collection populated, show controls
		GeneratorEl.style.display = "block";
	};
	reader.readAsText(file);
}

document.getElementById('file-input').addEventListener('change', parseMTGALog, false);

// Generate set selection inputs
let random_booster_set = document.getElementById('random_booster_set');
let option = document.createElement('option');
random_booster_set.appendChild(option);
for(s in Sets) {
	let option = document.createElement('option');
	option.innerHTML = Sets[s];
	random_booster_set.appendChild(option);
}

function get_random(arr) {
	return arr[Math.floor(Math.random() * arr.length)];
}

function gen_card_str(arr) {
	let c = get_random(arr);
	console.log(Cards[c]);
	return `<figure class="card" data-arena-id="${c}"><img src="${Cards[c]["image_uris"]["small"]}"/><figcaption>${Cards[c]["name"]}</figcaption></figure>`;
}

// TODO? Track duplicates to avoid exceeding the amount of available copies of a specific card.
function gen_booster() {
	let subset = CardsByRarity;
	let random_booster_set = document.getElementById('random_booster_set');
	if(random_booster_set.value != "")
		subset = CardsBySet[random_booster_set.value];
			
	let booster_view = document.getElementById('random_booster_view');
	booster_view.innerHTML = "";
	
	for(let booster = 0; booster < document.getElementById('booster_quantity').value; ++booster) {
		let el = document.createElement('div');
		el.classList.add("booster");
		if(Math.random() * 8 < 1)
			el.innerHTML += gen_card_str(subset['mythic']);
		else 
			el.innerHTML += gen_card_str(subset['rare']);
		for(let i = 0; i < 3; ++i)
			el.innerHTML += gen_card_str(subset['uncommon']);
		for(let i = 0; i < 10; ++i)
			el.innerHTML += gen_card_str(subset['common']);
		booster_view.appendChild(el);
	}
}

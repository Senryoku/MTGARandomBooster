// TODO? Select cards and export the list in MTGA format?

let Sets = ["m19", "xln", "rix", "dom", "grn", "rna"];
let Cards;
let Collection;
let CardsByRarity;
let CardsBySet;

function display_collection_date() {
	let date = localStorage.getItem("CollectionDate");
	if(!date) return;
	let el = document.getElementById("last-collection-update");
	el.innerHTML = date;
}

function set_collection(coll) {
	if(!coll) return;
	
	Collection = coll;
	gen_collection_caches();
	// Collection populated, show controls
	GeneratorEl.style.display = "block";
	
	gen_booster();
}

function gen_collection_caches() {
	CardsByRarity = {'common':[], 'uncommon':[], 'rare':[], 'mythic':[]};
	CardsBySet = {};
	for(s of Sets)
		CardsBySet[s] = {'common':[], 'uncommon':[], 'rare':[], 'mythic':[]};
	for(e in Collection) {
		if(e in Cards) {
			CardsByRarity[Cards[e]["rarity"]].push(e);
			CardsBySet[Cards[e]["set"]][Cards[e]["rarity"]].push(e);
		} else {
			console.warn(e + " unknown.");
		}
	}
}

// Hide controls while there is no collection informations
let GeneratorEl = document.getElementById("generator");
GeneratorEl.style.display = "none";

// Load all card informations
fetch("data/MTGACards.json").then(function (response) {
	response.text().then(function (text) {
		try {
			Cards = JSON.parse(text);
			
			let localStorageCollection = localStorage.getItem("Collection");
			if(localStorageCollection) {
				try {
					let json = JSON.parse(localStorageCollection);
					set_collection(json);
					display_collection_date();
					console.log("Loaded collection from local storage");
				} catch(e) {
					console.error(e);
				}
			}
		} catch(e) {
			alert(e);
		}
	});
});

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
			set_collection(JSON.parse(contents.slice(collection_start, collection_end + 1)));
			localStorage.setItem("Collection", JSON.stringify(Collection));
			localStorage.setItem("CollectionDate", new Date().toLocaleDateString());
			display_collection_date();
		} catch(e) {
			alert(e);
		}		
	};
	reader.readAsText(file);
}

document.getElementById('file-input').addEventListener('change', parseMTGALog, false);
document.getElementById('image_size').addEventListener('change', function (e) { 
	document.querySelectorAll(".card img").forEach(function(el) { el.style.width = e.target.value + "px";});
});

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
	return `<figure class="card" data-arena-id="${c}" data-cmc="${Cards[c]["cmc"]}" onclick="swap(this)"><img src="${Cards[c]["image_uris"]["png"]}"/><figcaption>${Cards[c]["name"]}</figcaption></figure>`;
}

function sort_by_cmc(el) {
	let children = [];
	for(let c of el.children)
		children.push(c);
	children.sort(function(lhs, rhs) { return parseInt(lhs.dataset.cmc) > parseInt(rhs.dataset.cmc); });
	for(let c of children)
		el.appendChild(c);
}

function swap(el) {
	if(el.origin && el.parentNode != el.origin) {
		el.origin.appendChild(el);
	} else {
		el.origin = el.parentNode;
		let deck_el = document.getElementById("deck");
		deck_el.appendChild(el);
		sort_by_cmc(deck_el);
	}
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

// TODO? Select cards and export the list in MTGA format?

var app = new Vue({
	el: '#main-vue',
	data: {
		Sets: ["m19", "xln", "rix", "dom", "grn", "rna"],
		Cards: {},
		Collection: [],
		CollectionDate: [],
		CardsByRarity: {},
		CardsBySet: [],
		Boosters: [],
		Deck: [],
		
		BoosterQuantity: 6,
		SetRestriction: ""
	},
	computed: {
	},
	methods: {
		pick: function(card) {
			if(card.picked) {
				app.Deck = arrayRemove(app.Deck, card);
				card.picked = false;
			} else {
				app.Deck.push(card);
				app.Deck.sort(function(lhs, rhs) { return lhs.cmc > rhs.cmc; });
				card.picked = true;
			}
		}
	}
});

function clone(obj) {
	return JSON.parse(JSON.stringify(obj));
}

function isEmpty(obj) {
    for(var key in obj) {
        if(obj.hasOwnProperty(key))
            return false;
    }
    return true;
}

function arrayRemove(arr, value) {
	return arr.filter(function(ele){
	   return ele != value;
	});
}

function set_collection(coll) {
	if(!coll) return;
	
	app.Collection = coll;
	gen_collection_caches();
	app.CollectionDate = localStorage.getItem("CollectionDate");
	
	gen_booster();
}

function gen_collection_caches() {
	app.CardsByRarity = {'common':[], 'uncommon':[], 'rare':[], 'mythic':[]};
	app.CardsBySet = {};
	for(s of app.Sets)
		app.CardsBySet[s] = {'common':[], 'uncommon':[], 'rare':[], 'mythic':[]};
	for(e in app.Collection) {
		if(e in app.Cards) {
			app.CardsByRarity[app.Cards[e]["rarity"]].push(e);
			app.CardsBySet[app.Cards[e]["set"]][app.Cards[e]["rarity"]].push(e);
		} else {
			console.warn(e + " unknown.");
		}
	}
}

// Load all card informations
fetch("data/MTGACards.json").then(function (response) {
	response.text().then(function (text) {
		try {
			app.Cards = JSON.parse(text);
			
			// Look for a localy stored collection
			let localStorageCollection = localStorage.getItem("Collection");
			if(localStorageCollection) {
				try {
					let json = JSON.parse(localStorageCollection);
					set_collection(json);
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
			let collStr = contents.slice(collection_start, collection_end + 1);
			localStorage.setItem("Collection", collStr);
			localStorage.setItem("CollectionDate", new Date().toLocaleDateString());
			set_collection(JSON.parse(collStr));
		} catch(e) {
			alert(e);
		}		
	};
	reader.readAsText(file);
}

document.getElementById('file-input').addEventListener('change', parseMTGALog, false);
document.getElementById('image-size').addEventListener('change', function (e) { 
	document.querySelectorAll(".card img").forEach(function(el) { el.style.width = e.target.value + "px";});
});

// Generate set selection inputs
let random_booster_set = document.getElementById('random-booster-set');
let option = document.createElement('option');
random_booster_set.appendChild(option);
for(s in app.Sets) {
	let option = document.createElement('option');
	option.innerHTML = app.Sets[s];
	random_booster_set.appendChild(option);
}

function get_random(arr) {
	return arr[Math.floor(Math.random() * arr.length)];
}

function gen_booster() {
	// We'll pick cards from a copy of the collection to make sure
	// we do not end up with more copies of a card than we really have available.
	let localCollection = clone(app.Collection);
	
	let subset = app.CardsByRarity;
	if(app.SetRestriction != "")
		subset = app.CardsBySet[app.SetRestriction];

	let pick_card = function (arr) {
		do {
			if(isEmpty(localCollection)) {
				alert("Not enough cards in collection.");
				return {};
			}
			let c = get_random(arr);
			if(localCollection[c] && localCollection[c] > 0) {
				localCollection[c] -= 1;
				if(localCollection[c] == 0)
					delete localCollection[c];
				return {id: c, name: app.Cards[c]["name"], set: app.Cards[c]["set"], cmc: app.Cards[c]["cmc"]};
			}
		} while(true);
	};

	app.Deck = [];
	app.Boosters = [];
	for(let booster = 0; booster < app.BoosterQuantity; ++booster) {
		let booster = [];
		
		if(Math.random() * 8 < 1) // 1 Rare/Mythic
			booster.push(pick_card(subset['mythic']));
		else 
			booster.push(pick_card(subset['rare']));
		
		for(let i = 0; i < 3; ++i) // 3 Uncommons
			booster.push(pick_card(subset['uncommon']));
		
		for(let i = 0; i < 10; ++i) // 10 Commons
			booster.push(pick_card(subset['common']));

		app.Boosters.push(booster);
	}
}
const ColorOrder = {'W':0, 'U':1, 'B':2, 'R':3, 'G':4};
function orderColor(lhs, rhs) {
	if(!lhs || !rhs)
		return 0;
	if(lhs.length == 1 && rhs.length == 1)
		return ColorOrder[lhs[0]] - ColorOrder[rhs[0]];
	else if(lhs.length == 1)
		return -1;
	else if(rhs.length == 1)
		return 1;
	else
		return String(lhs.flat()).localeCompare(String(rhs.flat()));
}

Vue.component('card', {
  template: `
<figure class="card" :data-arena-id="card.id" :data-cmc="card.border_crop" v-on:click="pick(card)" :style="{top: 25*offset+'px', left: 0}">
	<img v-if="cards[card.id].image_uris" :src="cards[card.id].image_uris.border_crop"/>
	<img v-else-if="cards[card.id].card_faces[0]" :src="cards[card.id].card_faces[0].image_uris.border_crop"/>
	<img v-else src="img/missing.svg">
	<figcaption>{{ card.name }}</figcaption>
</figure>
`,
  props: ['card', 'cards', 'pick', 'offset']
});

var app = new Vue({
	el: '#main-vue',
	data: {
		Sets: ["m19", "xln", "rix", "dom", "grn", "rna"],
		Cards: {},
		Collection: {},
		CollectionDate: [],
		CardsByRarity: {},
		CardsBySet: [],
		Boosters: [],
		Deck: [],
		// Options
		BoosterQuantity: 6,
		SetRestriction: "",
		CardOrder: "Booster",
		DeckOrderCMC: true,
		// Others
		CardsLoaded: false
	},
	computed: {
		DeckCMC: function() {
			let a = app.Deck.reduce((acc, item) => {
			  if (!acc[item.cmc])
				acc[item.cmc] = [];
			  acc[item.cmc].push(item);
			  return acc;
			}, {});
			return a;
		},
		BoostersCMC: function() {
			return app.Boosters.flat().sort(function (lhs, rhs) {
				if(lhs.cmc == rhs.cmc)
					return orderColor(lhs.colors, rhs.colors);
				return lhs.cmc > rhs.cmc;
			});
		},
		BoostersColor: function() {
			return app.Boosters.flat().sort(function (lhs, rhs) {
				if(orderColor(lhs.colors, rhs.colors) == 0)
					return lhs.cmc > rhs.cmc;
				return orderColor(lhs.colors, rhs.colors);
			});
		}
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

// Helper functions ////////////////////////////////////////////////////////////////////////////////

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

// https://hackernoon.com/copying-text-to-clipboard-with-javascript-df4d4988697f
const copyToClipboard = str => {
	const el = document.createElement('textarea');  // Create a <textarea> element
	el.value = str;                                 // Set its value to the string that you want copied
	el.setAttribute('readonly', '');                // Make it readonly to be tamper-proof
	el.style.position = 'absolute';                 
	el.style.left = '-9999px';                      // Move outside the screen to make it invisible
	document.body.appendChild(el);                  // Append the <textarea> element to the HTML document
	const selected =            
		document.getSelection().rangeCount > 0      // Check if there is any content selected previously
			? document.getSelection().getRangeAt(0) // Store selection if found
			: false;                                // Mark as false to know no selection existed before
	el.select();                                    // Select the <textarea> content
	document.execCommand('copy');                   // Copy - only works as a result of a user action (e.g. click events)
	document.body.removeChild(el);                  // Remove the <textarea> element
	if (selected) {                                 // If a selection existed before copying
		document.getSelection().removeAllRanges();  // Unselect everything on the HTML document
		document.getSelection().addRange(selected); // Restore the original selection
	}
};

////////////////////////////////////////////////////////////////////////////////////////////////////

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
			app.CardsLoaded = true;
			
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
/*
document.getElementById('image-size').addEventListener('change', function (e) { 
	document.querySelectorAll(".card img").forEach(function(el) { el.style.width = e.target.value + "px";});
});
*/

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
				return {id: c, name: app.Cards[c].name, set: app.Cards[c].set, cmc: app.Cards[c].cmc, collector_number: app.Cards[c].collector_number, colors: app.Cards[c].color_identity};
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

function exportMTGA(arr) {
	let str = "";
	for(c of arr) {
		let set = c.set.toUpperCase();
		if(set == "DOM") set = "DAR"; // DOM is called DAR in MTGA
		str += `1 ${c.name} (${set}) ${c.collector_number}\n`
	}
	return str;
}

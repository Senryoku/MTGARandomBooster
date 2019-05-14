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
<figure class="card" :data-arena-id="card.id" :data-cmc="card.border_crop" v-on:click="pick(card)">
	<img v-if="card.image_uris[language]" :src="card.image_uris[language]"/>
	<img v-else src="img/missing.svg">
	<figcaption>{{ card.printed_name[language] }}</figcaption>
</figure>
`,
  props: ['card', 'language', 'pick']
});

var app = new Vue({
	el: '#main-vue',
	data: {
		Sets: ["m19", "xln", "rix", "dom", "grn", "rna", "war"],
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
		HideCollectionManager: true,
		Language: 'en',
		Languages: [{code: 'en', name: 'English'},
					{code: 'es', name: 'Spanish'},
					{code: 'fr', name: 'French'},
					{code: 'de', name: 'German'},
					{code: 'it', name: 'Italian'},
					{code: 'pt', name: 'Portuguese'},
					{code: 'ja', name: 'Japanese'},
					{code: 'ko', name: 'Korean'},
					{code: 'ru', name: 'Russian'},
					{code: 'zhs', name: 'Simplified Chinese'},
					{code: 'zht', name: 'Traditional Chinese'}
		],
		ShowCollectionStats: false,
		MissingRaresSet: 'war',
		ShowNonBoosterCards: false,
		// Others
		CardsLoaded: false
	},
	computed: {
		DeckCMC: function() {
			let a = this.Deck.reduce((acc, item) => {
			  if (!acc[item.cmc])
				acc[item.cmc] = [];
			  acc[item.cmc].push(item);
			  return acc;
			}, {});
			return a;
		},
		BoostersCMC: function() {
			return this.Boosters.flat().sort(function (lhs, rhs) {
				if(lhs.cmc == rhs.cmc)
					return orderColor(lhs.colors, rhs.colors);
				return lhs.cmc > rhs.cmc;
			});
		},
		BoostersColor: function() {
			return this.Boosters.flat().sort(function (lhs, rhs) {
				if(orderColor(lhs.colors, rhs.colors) == 0)
					return lhs.cmc > rhs.cmc;
				return orderColor(lhs.colors, rhs.colors);
			});
		},
		MissingRares: function() {
			let rares = [];
			for(let c in this.Cards) {
				if((this.MissingRaresSet == "" || this.MissingRaresSet == this.Cards[c].set) && (this.ShowNonBoosterCards || this.Cards[c].in_booster) && this.Cards[c].rarity == "rare" && this.Cards[c].count < 4)
					rares.push(this.Cards[c]);
			}
			return rares;
		},
		MissingMythics: function() {
			let rares = [];
			for(let c in this.Cards) {
				if((this.MissingRaresSet == "" || this.MissingRaresSet == this.Cards[c].set) && (this.ShowNonBoosterCards || this.Cards[c].in_booster) && this.Cards[c].rarity == "mythic" && this.Cards[c].count < 4)
					rares.push(this.Cards[c]);
			}
			return rares;
		}
	},
	methods: {
		pick: function(card) {
			if(card.picked) {
				this.Deck = arrayRemove(this.Deck, card);
				card.picked = false;
			} else {
				this.Deck.push(card);
				this.Deck.sort(function(lhs, rhs) { return lhs.cmc > rhs.cmc; });
				card.picked = true;
			}
		},
		set_collection: function(coll) {
			if(!coll) return;
			
			this.Collection = coll;
			this.gen_collection_caches();
			this.CollectionDate = localStorage.getItem("CollectionDate");
			
			this.gen_booster();
		},
		gen_collection_caches: function() {
			this.CardsByRarity = {'common':[], 'uncommon':[], 'rare':[], 'mythic':[]};
			this.CardsBySet = {};
			for(let s of this.Sets)
				this.CardsBySet[s] = {'common':[], 'uncommon':[], 'rare':[], 'mythic':[]};
			for(let c in this.Cards)
				this.Cards[c].count = 0;
			for(e in this.Collection) {
				if(e in this.Cards) {
					this.Cards[e].count = parseInt(this.Collection[e]);
					this.CardsByRarity[this.Cards[e]["rarity"]].push(e);
					if(!this.CardsBySet[this.Cards[e]["set"]])
						this.CardsBySet[this.Cards[e]["set"]] = {'common':[], 'uncommon':[], 'rare':[], 'mythic':[]};
					this.CardsBySet[this.Cards[e]["set"]][this.Cards[e]["rarity"]].push(e);
				} else {
					console.warn(e + " unknown.");
				}
			}
		},
		parseMTGALog: function(e) {
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
					app.set_collection(JSON.parse(collStr));
				} catch(e) {
					alert(e);
				}		
			};
			reader.readAsText(file);
		},
		gen_booster: function() {
			let subset = this.CardsByRarity;
			if(this.SetRestriction != "")
				subset = this.CardsBySet[this.SetRestriction];
			
			// We'll pick cards from a copy of the collection to make sure
			// we do not end up with more copies of a card than we really have available.
			let localCollection = {'common':{}, 'uncommon':{}, 'rare':{}, 'mythic':{}};
			for(r in subset) {
				for(c of subset[r])
					localCollection[r][c] = this.Collection[c];
			}
			
			const count_cards = function(coll) { return Object.values(coll).reduce((acc, val) => acc + val, 0); };

			let comm_count = count_cards(localCollection['common']);
			if(comm_count < 10 * this.BoosterQuantity) {
				alert(`Not enough cards (${comm_count}/${10 * this.BoosterQuantity} commons) in collection.`);
				return;
			}
			
			let unco_count = count_cards(localCollection['uncommon']);
			if(unco_count < 3 * this.BoosterQuantity) {
				alert(`Not enough cards (${unco_count}/${3 * this.BoosterQuantity} uncommons) in collection.`);
				return;
			}
			
			let rm_count = count_cards(localCollection['rare']) + count_cards(localCollection['mythic']);
			if(rm_count < this.BoosterQuantity) {
				alert(`Not enough cards (${rm_count}/${this.BoosterQuantity} rares & mythics) in collection.`);
				return;
			}
			
			let pick_card = function (dict) {
				if(isEmpty(dict)) { // Should not happen anymore
					alert("[pick_card] Not enough cards in collection.");
					return;
				}
				let c = get_random_key(dict);
				dict[c] -= 1;
				if(dict[c] == 0)
					delete dict[c];
				return {id: c, name: app.Cards[c].name, printed_name: app.Cards[c].printed_name, image_uris: app.Cards[c].image_uris, set: app.Cards[c].set, cmc: app.Cards[c].cmc, collector_number: app.Cards[c].collector_number, colors: app.Cards[c].color_identity, in_booster: app.Cards[c].in_booster};
			};

			this.Deck = [];
			this.Boosters = [];
			for(let b = 0; b < this.BoosterQuantity; ++b) {
				let booster = [];
				
				 // 1 Rare/Mythic
				if(isEmpty(localCollection['mythic']) && isEmpty(localCollection['rare'])) {
					alert("Not enough cards in collection.");
					return;
				} else if(isEmpty(localCollection['mythic'])) {
					booster.push(pick_card(localCollection['rare']));
				} else if(isEmpty(localCollection['rare'])) {
					booster.push(pick_card(localCollection['mythic']));
				} else {
					if(Math.random() * 8 < 1)
						booster.push(pick_card(localCollection['mythic']));
					else
						booster.push(pick_card(localCollection['rare']));
				}
				
				for(let i = 0; i < 3; ++i) // 3 Uncommons
					booster.push(pick_card(localCollection['uncommon']));
				
				for(let i = 0; i < 10; ++i) // 10 Commons
					booster.push(pick_card(localCollection['common']));

				this.Boosters.push(booster);
			}
		}
	},
	mounted: function() {
		// Load all card informations
		fetch("data/MTGACards.json").then(function (response) {
			response.text().then(function (text) {
				try {
					app.Cards = JSON.parse(text);
					for(let c in app.Cards) {
						if(!('in_booster' in app.Cards[c]))
							app.Cards[c].in_booster = true;
						for(let l of app.Languages) {
							if(!(l.code in app.Cards[c]['printed_name']))
								app.Cards[c]['printed_name'][l.code] = app.Cards[c]['name'];
							if(!(l.code in app.Cards[c]['image_uris']))
								app.Cards[c]['image_uris'][l.code] = app.Cards[c]['image_uris']['en'];
						}
					}
					app.CardsLoaded = true;
					
					// Look for a localy stored collection
					let localStorageCollection = localStorage.getItem("Collection");
					if(localStorageCollection) {
						try {
							let json = JSON.parse(localStorageCollection);
							app.set_collection(json);
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

		/*
		document.getElementById('file-input').addEventListener('change', parseMTGALog, false);
		document.getElementById('image-size').addEventListener('change', function (e) { 
			document.querySelectorAll(".card img").forEach(function(el) { el.style.width = e.target.value + "px";});
		});
		*/
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
	return arr.filter(function(ele) {
	   return ele != value;
	});
}

function get_random(arr) {
	return arr[Math.floor(Math.random() * arr.length)];
}

function get_random_key(dict) {
	return Object.keys(dict)[Math.floor(Math.random() * Object.keys(dict).length)];
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

function exportMTGA(arr) {
	let str = "";
	for(c of arr) {
		let set = c.set.toUpperCase();
		if(set == "DOM") set = "DAR"; // DOM is called DAR in MTGA
		let name = c.printed_name[app.Language];
		let idx = name.indexOf('//');
		if(idx != -1)
			name = name.substr(0, idx - 1);
		str += `1 ${name} (${set}) ${c.collector_number}\n`
	}
	return str;
}

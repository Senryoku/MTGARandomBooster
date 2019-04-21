import mmap
import json
import requests

# Removed ana on purpose, this set is (mostly?) useless
Sets = ['m19', 'xln', 'rix', 'dom', 'grn', 'rna']	
APIURL = "https://api.scryfall.com/cards/arena/"

def handle_response_data(data):
	for c in data["data"]:
		selection = {key:value for key,value in c.items() if key in {'name', 'set', 'cmc', 'rarity', 'collector_number', 'color_identity', 'card_faces'}}
		if 'image_uris' in c and 'border_crop' in c['image_uris']:
			selection['image_uris'] = {'border_crop': c['image_uris']['border_crop']}
		cards[c["arena_id"]] = selection

print("Downloading card informations...")
cards = {}
for set in Sets:
	print(set)
	set_infos = json.loads(requests.get("https://api.scryfall.com/sets/" + set).content)
	
	data = json.loads(requests.get(set_infos["search_uri"]).content)
	handle_response_data(data);
	
	while(data["has_more"]):
		response = requests.get(data["next_page"])
		data = json.loads(response.content)
		handle_response_data(data);
		
with open("data/MTGACards.json", 'w') as outfile:
	json.dump(cards, outfile)
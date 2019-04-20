import mmap
import json
import requests

# Removed ana on purpose, this set is (mostly?) useless
Sets = ['m19', 'xln', 'rix', 'dom', 'grn', 'rna']	
APIURL = "https://api.scryfall.com/cards/arena/"

def handle_response_data(data):
	for c in data["data"]:
		cards[c["arena_id"]] = c;

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
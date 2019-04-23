import mmap
import json
import requests
import ijson

# Removed ana on purpose, this set is (mostly?) useless
Sets = ['m19', 'xln', 'rix', 'dom', 'grn', 'rna', 'war']
Langs = ['es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'ru', 'zhs', 'zht']

# I should be using this but its a pain...
BulkDataURL = 'https://archive.scryfall.com/json/scryfall-all-cards.json'
BulkDataPath = 'data/scryfall-all-cards.json'

with open(BulkDataPath, 'r', encoding="utf8") as file:
	#parser = ijson.parse(file)
	#for prefix, event, value in parser:
	#	print('prefix={}, event={}, value={}'.format(prefix, event, value))
	objects = ijson.items(file, 'item')
	arena_cards = (o for o in objects if 'arena' in o['games'])
	cards = {}
	for c in arena_cards:
		if 'arena_id' not in c:
			continue
		if c['arena_id'] not in cards:
			cards[c['arena_id']] = {}
		if c['lang'] == 'en':
			selection = {key:value for key,value in c.items() if key in {'name', 'set', 'cmc', 'rarity', 'collector_number', 'color_identity', 'card_faces'}}
			if 'image_uris' in c and 'border_crop' in c['image_uris']:
				selection['image_uris'] = {'border_crop': c['image_uris']['border_crop']}
			cards[c['arena_id']].update(selection)
		else:
			if 'lang' not in card[c['arena_id']]:
				card[c['arena_id']]['lang'] = {}
			cards[c['arena_id']]['lang'][l] = c['name']

	with open("data/MTGACards.json", 'w') as outfile:
		json.dump(cards, outfile)

# Print iterations progress
def printProgressBar (iteration, total, prefix = '', suffix = '', decimals = 1, length = 100, fill = '█'):
    """
    Call in a loop to create terminal progress bar
    @params:
        iteration   - Required  : current iteration (Int)
        total       - Required  : total iterations (Int)
        prefix      - Optional  : prefix string (Str)
        suffix      - Optional  : suffix string (Str)
        decimals    - Optional  : positive number of decimals in percent complete (Int)
        length      - Optional  : character length of bar (Int)
        fill        - Optional  : bar fill character (Str)
    """
    percent = ("{0:." + str(decimals) + "f}").format(100 * (iteration / float(total)))
    filledLength = int(length * iteration // total)
    bar = fill * filledLength + '-' * (length - filledLength)
    print('\r%s |%s| %s%% %s/%s %s' % (prefix, bar, percent, iteration, total, suffix), end = '\r')
    # Print New Line on Complete
    if iteration == total: 
        print()

def handle_response_data(cards, data, card_count):
	for c in data["data"]:
		selection = {key:value for key,value in c.items() if key in {'name', 'set', 'cmc', 'rarity', 'collector_number', 'color_identity', 'card_faces'}}
		selection['lang'] = {}
		for l in Langs:
			response = requests.get('https://api.scryfall.com/cards/{}/{}/{}'.format(c['set'], c['collector_number'], l))
			traduction = json.loads(response.content)
			if traduction['name']:
				selection['lang'][l] = traduction['name']
		if 'image_uris' in c and 'border_crop' in c['image_uris']:
			selection['image_uris'] = {'border_crop': c['image_uris']['border_crop']}
		cards[c["arena_id"]] = selection
		card_count += 1
		printProgressBar(card_count, data["total_cards"], "", "{:<50}".format(c["name"]), 1, 50)
	return card_count

def slow():
	print("Downloading card informations...")
	cards = {}
	for set in Sets:
		print(set)
		set_infos = json.loads(requests.get("https://api.scryfall.com/sets/" + set).content)
		
		card_count = 0;
		data = json.loads(requests.get(set_infos["search_uri"]).content)
		card_count = handle_response_data(cards, data, card_count);
		
		while(data["has_more"]):
			response = requests.get(data["next_page"])
			data = json.loads(response.content)
			card_count = handle_response_data(cards, data, card_count);

		print("{:<120}".format("\rNext page... (" + data["next_page"] + ")"));
			
	with open("data/MTGACards.json", 'w') as outfile:
		json.dump(cards, outfile)

#slow()

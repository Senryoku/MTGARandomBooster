import mmap
import json
import requests
import ijson
import os
import gzip
import urllib
import requests

# Removed ana on purpose, this set is (mostly?) useless
Sets = ['m19', 'xln', 'rix', 'dom', 'grn', 'rna', 'war']
Langs = ['es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'ru', 'zhs', 'zht']

# I should be using this but its a pain...
BulkDataURL = 'https://archive.scryfall.com/json/scryfall-all-cards.json'
BulkDataPath = 'data/scryfall-all-cards.json'
BulkDataArenaPath = 'data/BulkArena.json'
FinalDataPath = 'data/MTGACards.json'

if not os.path.isfile(BulkDataPath):
	# Toto: Auto
	print("Please download {}".format(BulkDataURL))

if not os.path.isfile(BulkDataArenaPath):
	with open(BulkDataPath, 'r', encoding="utf8") as file:
		objects = ijson.items(file, 'item')
		arena_cards = (o for o in objects if 'arena' in o['games'])
		cards = []
		for c in arena_cards:
			cards.append(c)
		with open(BulkDataArenaPath, 'w') as outfile:
			json.dump(cards, outfile)

# Tag non booster card as such
NonBoosterCards = []
response = requests.get("https://api.scryfall.com/cards/search?{}".format(urllib.parse.urlencode({'q': 'game:arena -in:booster'})))
data = json.loads(response.content)
for c in data['data']:
	NonBoosterCards.append(c['arena_id'])
while(data["has_more"]):
	response = requests.get(data["next_page"])
	data = json.loads(response.content)
	for c in data['data']:
		NonBoosterCards.append(c['arena_id'])
			
with open(BulkDataArenaPath, 'r', encoding="utf8") as file:
	cards = {}
	translations = {}
	translations_img = {}
	arena_cards = json.loads(file.read())
	for c in arena_cards:
		if c['name'] not in translations:
			translations[c['name']] = {}
		if c['name'] not in translations_img:
			translations_img[c['name']] = {}
		if 'arena_id' not in c:
			if 'printed_name' in c:
				translations[c['name']][c['lang']] = c['printed_name']
			elif 'card_faces' in c:
				translations[c['name']][c['lang']] = c['card_faces'][0]['printed_name']
			if 'image_uris' in c and 'border_crop' in c['image_uris']:
				translations_img[c['name']][c['lang']] = c['image_uris']['border_crop']
			elif 'card_faces' in c and 'image_uris' in c['card_faces'][0] and 'border_crop' in c['card_faces'][0]['image_uris']:
				translations_img[c['name']][c['lang']] = c['card_faces'][0]['image_uris']['border_crop']
			continue
		if c['arena_id'] not in cards:
			cards[c['arena_id']] = {}
		if c['lang'] == 'en':
			selection = {key:value for key,value in c.items() if key in {'name', 'set', 'cmc', 'rarity', 'collector_number', 'color_identity'}}
			if c['arena_id'] in NonBoosterCards:
				selection['in_booster'] = False;
			if 'image_uris' in c and 'border_crop' in c['image_uris']:
				translations_img[c['name']][c['lang']] = c['image_uris']['border_crop']
			elif 'card_faces' in c and 'image_uris' in c['card_faces'][0] and 'border_crop' in c['card_faces'][0]['image_uris']:
				translations_img[c['name']][c['lang']] = c['card_faces'][0]['image_uris']['border_crop']
			translations[c['name']][c['lang']] = c['name']
			cards[c['arena_id']].update(selection)
	
	for k in cards:
		cards[k]['printed_name'] = translations[cards[k]['name']]
		cards[k]['image_uris'] = translations_img[cards[k]['name']]

	with open(FinalDataPath, 'w', encoding="utf8") as outfile:
		json.dump(cards, outfile, ensure_ascii=False)
	with gzip.open(FinalDataPath+'.gzip', 'wt', encoding="utf8") as outfile:
		json.dump(cards, outfile, ensure_ascii=False)
		
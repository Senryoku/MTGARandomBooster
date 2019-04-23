import mmap
import json
import requests
import ijson
import os

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

with open(BulkDataArenaPath, 'r', encoding="utf8") as file:
	cards = {}
	translations = {}
	arena_cards = json.loads(file.read())
	for c in arena_cards:
		if 'arena_id' not in c:
			if 'printed_name' in c:
				if c['name'] not in translations:
					translations[c['name']] = {}
				translations[c['name']][c['lang']] = c['printed_name']
			continue
		if c['arena_id'] not in cards:
			cards[c['arena_id']] = {}
		if c['lang'] == 'en':
			selection = {key:value for key,value in c.items() if key in {'name', 'set', 'cmc', 'rarity', 'collector_number', 'color_identity', 'card_faces'}}
			if 'image_uris' in c and 'border_crop' in c['image_uris']:
				selection['image_uris'] = {'border_crop': c['image_uris']['border_crop']}
			cards[c['arena_id']].update(selection)
	
	for k in cards:
		cards[k]['lang'] = translations[c['name']]

	with open(FinalDataPath, 'w', encoding="utf8") as outfile:
		json.dump(cards, outfile, ensure_ascii=False)
		
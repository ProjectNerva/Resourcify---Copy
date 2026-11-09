# Test photos

Photos for trying the photo features by hand. All three are public domain or CC0, so they can be shared and used freely. None shows a face.

| File                         | Use it on     | What the analysis returned on 2026-09-23                                                                                                  |
| ---------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `rationer-canned-soup.jpg`   | Rationer      | 11 cans of soup, about 11 meals. For 2 adults and 1 child that is about 1 day of food.                                                    |
| `rationer-water-bottles.jpg` | Rationer      | 19 to 23 bottles of water, about 9.5 to 11.5 liters. For 1 adult that is about 2 to 3 days of water.                                      |
| `cash-for-cans-pile.jpg`     | Cash for Cans | 720 to 1,500 aluminum cans. The pile is too big to count exactly, which makes it a good test of the "confirm the count yourself" message. |

Counts vary between runs and models. That is expected, and it is why every screen asks people to check the numbers.

## How to use them

1. Open the site with photo analysis turned on. `GEMINI_API_KEY` and `GEMINI_MODEL` must be set, and `ENABLE_EXTERNAL_SERVICES=true`.
2. Go to the Rationer or Cash for Cans.
3. Tap **Add a photo** and pick one of these files, or drag it onto the box on a computer.
4. Tap **Analyze photo** or **Count containers**, then **Accept** on the notice.

On a phone, save the photo to your camera roll first; the same button then offers both the camera and your photo library.

## Sources

- `rationer-canned-soup.jpg`: cropped from [Food Drive DVIDS153341](https://commons.wikimedia.org/wiki/File:Food_Drive_DVIDS153341.jpg), U.S. Navy photo, public domain. Cropped to the cans so no faces appear.
- `rationer-water-bottles.jpg`: [Short water bottles](https://commons.wikimedia.org/wiki/File:Short_water_bottles.jpg), CC0.
- `cash-for-cans-pile.jpg`: [Pile of aluminum beer and soft drink cans](https://commons.wikimedia.org/wiki/File:PILE_OF_ALUMINUM_BEER_AND_SOFT_DRINK_CANS_ARE_THE_RAW_MATERIAL_FOR_BUILDING_BLOCKS_OF_AN_EXPERIMENTAL_HOUSE_BEING..._-_NARA_-_556639.jpg), U.S. National Archives, public domain.

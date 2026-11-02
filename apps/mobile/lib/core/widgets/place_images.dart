/// Bundled illustrative photos (generated in Canva) shown until a listing has
/// its own cover photo. Replace with real photos before launch.
const _templeAssets = {
  'banke-bihari': 'banke-bihari',
  'prem-mandir': 'prem-mandir',
  'iskcon-krishna-balaram-mandir': 'iskcon',
  'shri-krishna-janmabhoomi': 'janmabhoomi',
  'kesava-deo-temple': 'janmabhoomi',
  'dwarkadhish-temple': 'dwarkadhish',
  'shriji-temple': 'shriji',
  'kirti-mandir': 'shriji',
  'daan-ghati-temple': 'govardhan',
  'mukharvind-jatipura': 'govardhan',
  'haridev-ji-temple': 'govardhan',
  'radha-kund': 'radha-kund',
  'pan-sarovar': 'radha-kund',
  'yashoda-kund': 'radha-kund',
};

String templeImage(String slug) => 'assets/images/canva/${_templeAssets[slug] ?? 'temple'}.jpg';

const stayImage = 'assets/images/canva/stay.jpg';
const foodImage = 'assets/images/canva/food.jpg';
const plannerBannerImage = 'assets/images/canva/planner.jpg';

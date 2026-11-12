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

/// Per-temple images generated in Canva (`assets/images/temples/<slug>.jpg`).
const _templePhotos = {
  'shri-krishna-janmabhoomi',
  'dwarkadhish-temple',
  'gita-mandir',
  'bhuteshwar-mahadev',
  'kesava-deo-temple',
  'banke-bihari',
  'iskcon-krishna-balaram-mandir',
  'prem-mandir',
  'radha-raman-temple',
  'radha-vallabh-temple',
  'daan-ghati-temple',
  'mukharvind-jatipura',
  'haridev-ji-temple',
  'radha-kund',
  'chakleshwar-mahadev',
  'shriji-temple',
  'kirti-mandir',
  'rangili-mahal',
  'maan-mandir',
  'mor-kuti',
  'gokulnath-ji-temple',
};

String templeImage(String slug) => _templePhotos.contains(slug)
    ? 'assets/images/temples/$slug.jpg'
    : 'assets/images/canva/${_templeAssets[slug] ?? 'temple'}.jpg';

const stayImage = 'assets/images/canva/stay.jpg';
const foodImage = 'assets/images/canva/food.jpg';
const plannerBannerImage = 'assets/images/canva/planner.jpg';

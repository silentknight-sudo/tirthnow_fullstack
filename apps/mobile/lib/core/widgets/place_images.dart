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

/// Real CC-licensed photos (Wikimedia Commons), credited in the temple screen
/// and in docs/IMAGE_CREDITS.md. Preferred over the Canva illustrations.
const templePhotoCredits = {
  'kirti-mandir': 'Vikas.jehanabad · CC BY-SA 4.0',
  'prem-mandir': 'Suyash Dwivedi · CC BY-SA 4.0',
  'radha-raman-temple': 'Kridha20 · CC BY-SA 4.0',
  'gokulnath-ji-temple': 'Hidden_macy · CC BY 3.0',
  'daan-ghati-temple': 'Gyanendrasinghchauhan · CC BY 3.0',
};

String templeImage(String slug) => templePhotoCredits.containsKey(slug)
    ? 'assets/images/temples/$slug.jpg'
    : 'assets/images/canva/${_templeAssets[slug] ?? 'temple'}.jpg';

const stayImage = 'assets/images/canva/stay.jpg';
const foodImage = 'assets/images/canva/food.jpg';
const plannerBannerImage = 'assets/images/canva/planner.jpg';

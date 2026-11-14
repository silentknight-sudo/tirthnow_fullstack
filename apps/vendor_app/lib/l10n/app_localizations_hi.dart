// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Hindi (`hi`).
class AppLocalizationsHi extends AppLocalizations {
  AppLocalizationsHi([String locale = 'hi']) : super(locale);

  @override
  String get appName => 'तीर्थनाउ पार्टनर';

  @override
  String get emptyList => 'अभी यहाँ कुछ नहीं है';

  @override
  String get errorOffline => 'आप ऑफ़लाइन हैं। कनेक्शन जाँचें।';

  @override
  String get errorGeneric => 'कुछ गड़बड़ हुई। फिर से कोशिश करें।';

  @override
  String get retry => 'फिर कोशिश करें';

  @override
  String get save => 'सेव करें';

  @override
  String get cancel => 'रद्द करें';

  @override
  String get add => 'जोड़ें';

  @override
  String get edit => 'बदलें';

  @override
  String get next => 'आगे बढ़ें';

  @override
  String get back => 'पीछे';

  @override
  String get saved => 'सेव हो गया';

  @override
  String get required => 'ज़रूरी है';

  @override
  String get invalidValue => 'यह मान जाँचें';

  @override
  String get loginTitle => 'तीर्थयात्रियों के साथ अपना व्यापार बढ़ाएँ';

  @override
  String get loginSub => 'कैब, ठहरना, भोजनालय और मंदिर स्टोर — ब्रज के लिए एक पार्टनर ऐप।';

  @override
  String get phoneLabel => 'मोबाइल नंबर';

  @override
  String get phoneHint => '10 अंकों का मोबाइल नंबर';

  @override
  String get sendOtp => 'OTP भेजें';

  @override
  String get otpLabel => '6 अंकों का OTP';

  @override
  String otpSentTo(String phone) {
    return '$phone पर OTP भेजा गया';
  }

  @override
  String get mockOtpHint => 'डेमो मोड: 123456 डालें';

  @override
  String get verify => 'सत्यापित करें';

  @override
  String get changeNumber => 'नंबर बदलें';

  @override
  String get language => 'English';

  @override
  String get obChooseTitle => 'आप कौन-सी सेवा देते हैं?';

  @override
  String get obChooseSub => 'एक चुनें। दूसरा व्यवसाय बाद में जोड़ सकते हैं।';

  @override
  String get svcCab => 'कैब और टैक्सी';

  @override
  String get svcCabSub => 'बाइक, ऑटो और कार की सवारी';

  @override
  String get svcHotel => 'होटल';

  @override
  String get svcHotelSub => 'ठहरने में दिखने वाले कमरे';

  @override
  String get svcDharamshala => 'धर्मशाला';

  @override
  String get svcDharamshalaSub => 'यात्री विश्राम गृह, ठहरने में';

  @override
  String get svcRestaurant => 'भोजनालय';

  @override
  String get svcRestaurantSub => 'सात्विक भोजन, ऑर्डर';

  @override
  String get svcStore => 'मंदिर स्टोर';

  @override
  String get svcStoreSub => 'पूजा सामग्री, प्रसाद, पोशाक';

  @override
  String get obBusinessTitle => 'व्यवसाय की जानकारी';

  @override
  String get displayName => 'व्यवसाय का नाम (यात्रियों को दिखेगा)';

  @override
  String get legalName => 'कानूनी नाम (PAN के अनुसार)';

  @override
  String get city => 'शहर';

  @override
  String get pan => 'PAN';

  @override
  String get gstin => 'GSTIN (वैकल्पिक)';

  @override
  String get createAccount => 'पार्टनर खाता बनाएँ';

  @override
  String get kycTitle => 'व्यवसाय सत्यापित करें';

  @override
  String get kycSub => 'साफ़ फ़ोटो अपलोड करें। लाइव होने से पहले हर दस्तावेज़ जाँचा जाता है।';

  @override
  String get kycHow => 'सत्यापन कैसे होता है';

  @override
  String get kycHowBody =>
      '1. PAN और GSTIN सरकारी रिकॉर्ड से मिलाए जाते हैं।\n2. आधार आपकी अनुमति से DigiLocker / e-KYC से सत्यापित होता है।\n3. लाइसेंस (FSSAI, ट्रेड लाइसेंस, RC, ड्राइविंग लाइसेंस) हमारी टीम जाँचती है।\n4. बैंक खाता ₹1 के टेस्ट जमा से पक्का होता है।\nडेमो मोड में दस्तावेज़ तुरंत स्वीकार होते हैं।';

  @override
  String get docPan => 'PAN कार्ड';

  @override
  String get docAadhaar => 'आधार कार्ड';

  @override
  String get docGst => 'GST प्रमाणपत्र';

  @override
  String get docFssai => 'FSSAI लाइसेंस';

  @override
  String get docTradeLicense => 'ट्रेड लाइसेंस';

  @override
  String get docRc => 'वाहन RC';

  @override
  String get docDrivingLicence => 'ड्राइविंग लाइसेंस';

  @override
  String get docPermit => 'परमिट';

  @override
  String get docOther => 'अन्य दस्तावेज़';

  @override
  String get upload => 'अपलोड';

  @override
  String get uploaded => 'अपलोड हुआ';

  @override
  String get docApproved => 'सत्यापित';

  @override
  String get docRejected => 'अस्वीकृत';

  @override
  String get docPending => 'जाँच में';

  @override
  String get bankTitle => 'भुगतान बैंक खाता';

  @override
  String get accountHolder => 'खाताधारक का नाम';

  @override
  String get accountNumber => 'खाता संख्या';

  @override
  String get ifsc => 'IFSC';

  @override
  String get addBank => 'बैंक खाता जोड़ें';

  @override
  String get submitKyc => 'सत्यापन के लिए भेजें';

  @override
  String missingDocs(String docs) {
    return 'अभी चाहिए: $docs';
  }

  @override
  String get waitingTitle => 'मंज़ूरी का इंतज़ार';

  @override
  String get waitingBody =>
      'धन्यवाद! हमारी टीम आपके दस्तावेज़ जाँच रही है। मंज़ूरी मिलते ही आप यात्रियों को दिखेंगे।';

  @override
  String get rejectedTitle => 'कुछ दस्तावेज़ ठीक करने हैं';

  @override
  String get fixDocs => 'दस्तावेज़ ठीक करें';

  @override
  String get suspendedTitle => 'खाता निलंबित';

  @override
  String get checkStatus => 'स्थिति देखें';

  @override
  String get signOut => 'साइन आउट';

  @override
  String get tabDashboard => 'डैशबोर्ड';

  @override
  String get tabOrders => 'ऑर्डर';

  @override
  String get tabListings => 'लिस्टिंग';

  @override
  String get tabMore => 'और';

  @override
  String hello(String name) {
    return 'नमस्ते, $name';
  }

  @override
  String get live => 'यात्रियों के लिए लाइव';

  @override
  String get days7 => '7 दिन';

  @override
  String get days30 => '30 दिन';

  @override
  String get days90 => '90 दिन';

  @override
  String get earnings => 'आपकी कमाई';

  @override
  String get earningsNote =>
      '5% प्लेटफ़ॉर्म शुल्क के बाद। वसूला गया GST फ़ाइलिंग के लिए आपको मिलता है।';

  @override
  String get statOrders => 'ऑर्डर';

  @override
  String get statGross => 'कुल बिक्री';

  @override
  String get statAvg => 'औसत ऑर्डर';

  @override
  String get statDiscounts => 'कूपन छूट';

  @override
  String get salesTrend => 'रोज़ की कमाई';

  @override
  String get topItems => 'सबसे ज़्यादा बिकने वाले';

  @override
  String get ratings => 'ग्राहक रेटिंग';

  @override
  String ratingCount(String count) {
    return '$count रेटिंग';
  }

  @override
  String get seeReviews => 'समीक्षाएँ देखें';

  @override
  String get ordersPending => 'नए';

  @override
  String get ordersActive => 'चालू';

  @override
  String get ordersDone => 'पूरे';

  @override
  String get ordersCancelled => 'रद्द';

  @override
  String get accept => 'स्वीकार';

  @override
  String get reject => 'अस्वीकार';

  @override
  String get start => 'शुरू करें';

  @override
  String get complete => 'पूरा करें';

  @override
  String get rejectReason => 'कारण';

  @override
  String youGet(String amount) {
    return 'आपको मिलेगा $amount';
  }

  @override
  String customerPays(String amount) {
    return 'यात्री देगा $amount';
  }

  @override
  String get priceNote => 'यात्रियों को आपकी कीमत + 18% GST + 5% प्लेटफ़ॉर्म शुल्क दिखता है।';

  @override
  String get basePrice => 'आपकी कीमत (₹)';

  @override
  String get vehicles => 'वाहन';

  @override
  String get fares => 'किराया';

  @override
  String get addVehicle => 'वाहन जोड़ें';

  @override
  String get vehicleClass => 'वाहन प्रकार';

  @override
  String get regNo => 'रजिस्ट्रेशन नंबर';

  @override
  String get model => 'मॉडल';

  @override
  String get seats => 'सीटें';

  @override
  String get driverName => 'ड्राइवर का नाम';

  @override
  String get baseFare => 'बेस किराया (₹)';

  @override
  String get perKm => 'प्रति किमी (₹)';

  @override
  String get perMin => 'प्रति मिनट (₹)';

  @override
  String get minFare => 'न्यूनतम किराया (₹)';

  @override
  String get nightPct => 'रात्रि अधिभार %';

  @override
  String get setFare => 'किराया तय करें';

  @override
  String get cabBike => 'बाइक';

  @override
  String get cabAuto => 'ऑटो';

  @override
  String get cabERickshaw => 'ई-रिक्शा';

  @override
  String get cabHatchback => 'हैचबैक';

  @override
  String get cabSedan => 'सेडान';

  @override
  String get cabSuv => 'SUV';

  @override
  String get cabTempo => 'टेम्पो ट्रैवलर';

  @override
  String get properties => 'प्रॉपर्टी';

  @override
  String get addProperty => 'प्रॉपर्टी जोड़ें';

  @override
  String get propertyName => 'प्रॉपर्टी का नाम';

  @override
  String get address => 'पता';

  @override
  String get roomTypes => 'कमरे के प्रकार';

  @override
  String get addRoomType => 'कमरे का प्रकार जोड़ें';

  @override
  String get roomName => 'कमरे का नाम';

  @override
  String get maxGuests => 'अधिकतम मेहमान';

  @override
  String get totalRooms => 'कमरे';

  @override
  String get perNight => 'प्रति रात';

  @override
  String get published => 'प्रकाशित';

  @override
  String get hidden => 'छिपा हुआ';

  @override
  String get restaurants => 'भोजनालय';

  @override
  String get addRestaurant => 'भोजनालय जोड़ें';

  @override
  String get restaurantName => 'भोजनालय का नाम';

  @override
  String get pureVeg => 'शुद्ध शाकाहारी';

  @override
  String get satvik => 'सात्विक (बिना प्याज़-लहसुन)';

  @override
  String get menu => 'मेन्यू';

  @override
  String get addMenuItem => 'व्यंजन जोड़ें';

  @override
  String get dishName => 'व्यंजन का नाम';

  @override
  String get category => 'श्रेणी';

  @override
  String get jain => 'जैन';

  @override
  String get available => 'उपलब्ध';

  @override
  String get products => 'उत्पाद';

  @override
  String get addProduct => 'उत्पाद जोड़ें';

  @override
  String get productName => 'उत्पाद का नाम';

  @override
  String get description => 'विवरण';

  @override
  String get mrp => 'MRP (₹, वैकल्पिक)';

  @override
  String get stock => 'स्टॉक';

  @override
  String get unit => 'इकाई (पीस, पैक, किग्रा)';

  @override
  String get addPhoto => 'फ़ोटो जोड़ें';

  @override
  String inStock(String n) {
    return '$n स्टॉक में';
  }

  @override
  String sold(String n) {
    return '$n बिके';
  }

  @override
  String get delete => 'हटाएँ';

  @override
  String get catPoojaThali => 'पूजा थाली';

  @override
  String get catDiyaDhoop => 'दीया और धूप';

  @override
  String get catGarland => 'माला';

  @override
  String get catPrasad => 'प्रसाद';

  @override
  String get catPoshak => 'पोशाक';

  @override
  String get catTilakMala => 'तिलक और माला';

  @override
  String get catIdols => 'मूर्तियाँ';

  @override
  String get catBooks => 'पुस्तकें';

  @override
  String get catOther => 'अन्य';

  @override
  String get coupons => 'कूपन';

  @override
  String get couponsSub => 'ज़्यादा यात्री लाने के लिए छूट दें';

  @override
  String get addCoupon => 'कूपन बनाएँ';

  @override
  String get couponCode => 'कोड (जैसे RADHE10)';

  @override
  String get percentOff => '% छूट';

  @override
  String get flatOff => 'फ़्लैट ₹ छूट';

  @override
  String get discountValue => 'छूट';

  @override
  String get minOrder => 'न्यूनतम ऑर्डर (₹)';

  @override
  String get maxDiscount => 'अधिकतम छूट (₹, वैकल्पिक)';

  @override
  String get usageLimit => 'उपयोग सीमा (वैकल्पिक)';

  @override
  String get validDays => 'कितने दिन मान्य (वैकल्पिक)';

  @override
  String used(String n) {
    return '$n बार उपयोग';
  }

  @override
  String get active => 'सक्रिय';

  @override
  String get reviews => 'समीक्षाएँ';

  @override
  String get reply => 'जवाब दें';

  @override
  String get yourReply => 'आपका जवाब';

  @override
  String get profile => 'व्यवसाय प्रोफ़ाइल';

  @override
  String get kycStatus => 'सत्यापन';

  @override
  String get statusActive => 'स्वीकृत';

  @override
  String get statusPending => 'जाँच में';

  @override
  String get statusDraft => 'अधूरा';

  @override
  String get statusRejected => 'बदलाव चाहिए';

  @override
  String get statusSuspended => 'निलंबित';

  @override
  String get switchLanguage => 'भाषा';

  @override
  String get help => 'पार्टनर सहायता';

  @override
  String get splashTitle => 'तीर्थनाउ के साथ अपना तीर्थ व्यवसाय बढ़ाएँ';

  @override
  String get splashSub =>
      'अपनी कैब, होटल, धर्मशाला, भोजनालय या मंदिर स्टोर जोड़ें और हज़ारों यात्रियों तक पहुँचें।';

  @override
  String get getStarted => 'शुरू करें';

  @override
  String get login => 'लॉगिन';

  @override
  String get register => 'रजिस्टर';

  @override
  String get verifyNumber => 'अपना नंबर सत्यापित करें';

  @override
  String otpEnter(String phone) {
    return '$phone पर भेजा गया 6 अंकों का OTP डालें';
  }

  @override
  String resendIn(String sec) {
    return '$sec सेकंड में दोबारा भेजें';
  }

  @override
  String get resend => 'OTP दोबारा भेजें';

  @override
  String get partnerTag => 'पार्टनर';

  @override
  String get overview => 'व्यवसाय का सार';

  @override
  String lastDays(String n) {
    return 'पिछले $n दिन';
  }

  @override
  String get revenue => 'कमाई';

  @override
  String get aov => 'औसत ऑर्डर';

  @override
  String get rating => 'रेटिंग';

  @override
  String get addListing => 'लिस्टिंग जोड़ें';

  @override
  String get payouts => 'भुगतान';

  @override
  String get analytics => 'एनालिटिक्स';

  @override
  String get aiTips => 'AI व्यवसाय सुझाव';

  @override
  String get tipNoListings =>
      'साफ़ फ़ोटो के साथ पहली लिस्टिंग जोड़ें — यात्री वही बुक करते हैं जो दिखता है।';

  @override
  String get tipCoupon => 'त्योहार कूपन (10% छूट) बनाएँ ताकि पहले ऑर्डर जल्दी आएँ।';

  @override
  String get tipRating =>
      'समीक्षाओं का जवाब दें — जवाब देने वाले पार्टनर को ज़्यादा यात्री लौटते हैं।';

  @override
  String tipGrowth(String pct) {
    return 'बिक्री $pct% बढ़ी है — सप्ताहांत की भीड़ के लिए स्टॉक तैयार रखें।';
  }

  @override
  String tipDown(String pct) {
    return 'बिक्री $pct% घटी है — सीमित समय का कूपन या नई फ़ोटो आज़माएँ।';
  }

  @override
  String get businessAnalytics => 'व्यवसाय एनालिटिक्स';

  @override
  String get bestDay => 'सबसे अच्छा दिन';

  @override
  String get marketing => 'मार्केटिंग और ग्रोथ';

  @override
  String get shareStore => 'WhatsApp पर शेयर करें';

  @override
  String get shareStoreSub => 'ग्राहकों और ग्रुप में अपनी लिस्टिंग भेजें';

  @override
  String shareText(String name) {
    return 'तीर्थनाउ पर $name के साथ बुक करें — आपकी ब्रज यात्रा के लिए भरोसेमंद सेवा 🙏';
  }

  @override
  String get festivalCampaign => 'त्योहार अभियान';

  @override
  String get festivalCampaignSub => 'जन्माष्टमी, होली, कार्तिक के लिए तैयार कूपन';

  @override
  String get comingSoon => 'जल्द आ रहा है';

  @override
  String get promotions => 'प्रमोशन चलाएँ';

  @override
  String get promotionsSub => 'सर्च और होम में अपनी लिस्टिंग आगे लाएँ';

  @override
  String get loyalty => 'लॉयल्टी प्रोग्राम';

  @override
  String get loyaltySub => 'बार-बार आने वाले यात्रियों को इनाम';

  @override
  String get support => 'सहायता';

  @override
  String get howHelp => 'हम आपकी कैसे मदद करें?';

  @override
  String get chatSupport => 'WhatsApp पर बात करें';

  @override
  String get callUs => 'कॉलबैक मंगाएँ';

  @override
  String get emailUs => 'ईमेल करें';

  @override
  String get faqs => 'सामान्य प्रश्न';

  @override
  String get faq1q => 'भुगतान कब मिलता है?';

  @override
  String get faq1a =>
      'सेवा पूरी होने के बाद 5% प्लेटफ़ॉर्म शुल्क घटाकर कमाई आपके बैंक खाते में आती है।';

  @override
  String get faq2q => 'यात्री मेरी कीमत से ज़्यादा क्यों देता है?';

  @override
  String get faq2a => 'चेकआउट पर आपकी कीमत में 18% GST और 5% प्लेटफ़ॉर्म शुल्क जुड़ता है।';

  @override
  String get faq3q => 'सत्यापन में कितना समय लगता है?';

  @override
  String get faq3a => 'सभी दस्तावेज़ और बैंक खाता जुड़ने के बाद आमतौर पर 24 घंटे में।';

  @override
  String get all => 'सभी';

  @override
  String get draft => 'ड्राफ़्ट';

  @override
  String get stepDetails => 'जानकारी';

  @override
  String get stepKyc => 'KYC';

  @override
  String get stepVerify => 'सत्यापन';

  @override
  String get docsSecure => 'आपके दस्तावेज़ एन्क्रिप्टेड हैं और केवल सत्यापन के लिए उपयोग होते हैं।';

  @override
  String get businessType => 'व्यवसाय का प्रकार';

  @override
  String get account => 'मेरा खाता';

  @override
  String get settings => 'सेटिंग्स';

  @override
  String get radheRadhe => 'राधे राधे 🙏';

  @override
  String needsAction(String n) {
    return '$n नए ऑर्डर आपका इंतज़ार कर रहे हैं';
  }

  @override
  String get total => 'कुल';

  @override
  String get quickActions => 'त्वरित कार्य';

  @override
  String get tabAccount => 'खाता';

  @override
  String get orderPlaced => 'मिला';

  @override
  String get orderAccepted => 'स्वीकृत';

  @override
  String get orderStarted => 'शुरू';

  @override
  String get orderDone => 'पूरा';
}

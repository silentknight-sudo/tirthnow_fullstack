// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Hindi (`hi`).
class AppLocalizationsHi extends AppLocalizations {
  AppLocalizationsHi([String locale = 'hi']) : super(locale);

  @override
  String get appName => 'तीर्थ नाउ';

  @override
  String get navHome => 'होम';

  @override
  String get navTemples => 'मंदिर';

  @override
  String get navBook => 'बुक करें';

  @override
  String get navGuide => 'गाइड';

  @override
  String get navProfile => 'प्रोफ़ाइल';

  @override
  String get retry => 'फिर कोशिश करें';

  @override
  String get cancel => 'रद्द करें';

  @override
  String get save => 'सेव करें';

  @override
  String get delete => 'हटाएँ';

  @override
  String get done => 'हो गया';

  @override
  String get continueLabel => 'आगे बढ़ें';

  @override
  String get seeAll => 'सभी देखें';

  @override
  String get loading => 'लोड हो रहा है…';

  @override
  String get errorGeneric => 'कुछ गड़बड़ हो गई।';

  @override
  String get errorOffline => 'आप ऑफ़लाइन हैं। जहाँ संभव हो, सेव किया डेटा दिख रहा है।';

  @override
  String get emptyList => 'अभी यहाँ कुछ नहीं है।';

  @override
  String get signInToContinue => 'आगे बढ़ने के लिए फ़ोन से साइन इन करें।';

  @override
  String get signIn => 'साइन इन करें';

  @override
  String get welcomeTitle => 'हर तीर्थ, अभी।';

  @override
  String get welcomeSub => 'ब्रज यात्रा के लिए आरती समय, दर्शन, ठहरना, सवारी, SOS और AI गाइड।';

  @override
  String get chooseLanguage => 'भाषा चुनें';

  @override
  String get phoneLabel => 'मोबाइल नंबर';

  @override
  String get phoneHint => '10 अंकों का नंबर';

  @override
  String get phoneInvalid => 'सही 10 अंकों का भारतीय मोबाइल नंबर डालें।';

  @override
  String get sendOtp => 'OTP भेजें';

  @override
  String get otpLabel => '6 अंकों का OTP';

  @override
  String otpSentTo(Object phone) {
    return 'हमने $phone पर कोड भेजा है';
  }

  @override
  String get otpInvalid => '6 अंकों का कोड डालें।';

  @override
  String get verify => 'सत्यापित करें';

  @override
  String get mockOtpHint => 'टेस्ट मोड: 123456 डालें';

  @override
  String get continueAsGuest => 'मेहमान के रूप में जारी रखें';

  @override
  String get guestNote =>
      'मेहमान देख सकते हैं, गाइड से पूछ सकते हैं और SOS इस्तेमाल कर सकते हैं। बुकिंग के लिए साइन इन करें।';

  @override
  String greeting(Object name) {
    return 'राधे राधे$name';
  }

  @override
  String get nextAarti => 'अगली आरती';

  @override
  String get startsIn => 'शुरू होने में';

  @override
  String get upcomingAartis => 'आने वाली आरतियाँ';

  @override
  String get festivals => 'त्योहार';

  @override
  String get weather => 'मौसम';

  @override
  String get quickActions => 'तुरंत';

  @override
  String get nearbyTemples => 'मंदिर';

  @override
  String get noUpcomingAarti => 'अगले कुछ घंटों में कोई आरती नहीं है।';

  @override
  String feelsLike(Object temp) {
    return 'महसूस $temp';
  }

  @override
  String get searchTemples => 'मंदिर खोजें';

  @override
  String get crowd => 'भीड़';

  @override
  String get crowdLevel0 => 'बहुत कम';

  @override
  String get crowdLevel1 => 'कम';

  @override
  String get crowdLevel2 => 'मध्यम';

  @override
  String get crowdLevel3 => 'ज़्यादा';

  @override
  String get crowdLevel4 => 'बहुत ज़्यादा';

  @override
  String get aartiSchedule => 'आरती समय-सारणी';

  @override
  String get today => 'आज';

  @override
  String get tomorrow => 'कल';

  @override
  String get remindMe => 'याद दिलाएँ';

  @override
  String get reminderSet => 'रिमाइंडर लग गया';

  @override
  String get reminderRemoved => 'रिमाइंडर हटा';

  @override
  String get directions => 'रास्ता';

  @override
  String get dressCode => 'वेशभूषा';

  @override
  String get about => 'परिचय';

  @override
  String get live => 'लाइव';

  @override
  String get watchLive => 'लाइव देखें';

  @override
  String get timesFromTemple => 'समय मंदिर की प्रकाशित समय-सारणी से हैं।';

  @override
  String get bookTitle => 'बुकिंग';

  @override
  String get stays => 'ठहरना';

  @override
  String get cabs => 'कैब';

  @override
  String get food => 'भोजन';

  @override
  String get experiences => 'अनुभव';

  @override
  String get myBookings => 'मेरी बुकिंग';

  @override
  String get checkIn => 'चेक-इन';

  @override
  String get checkOut => 'चेक-आउट';

  @override
  String get guests => 'मेहमान';

  @override
  String get rooms => 'कमरे';

  @override
  String get perNight => 'प्रति रात';

  @override
  String get selectRoom => 'कमरा चुनें';

  @override
  String get bookNow => 'अभी बुक करें';

  @override
  String payNow(Object amount) {
    return '$amount भुगतान करें';
  }

  @override
  String get total => 'कुल';

  @override
  String get taxes => 'कर';

  @override
  String get fees => 'शुल्क';

  @override
  String get cancellationPolicy => 'रद्दीकरण नियम';

  @override
  String get pickup => 'पिकअप';

  @override
  String get drop => 'ड्रॉप';

  @override
  String get getQuotes => 'किराया देखें';

  @override
  String get veg => 'शुद्ध शाकाहारी';

  @override
  String get satvik => 'सात्विक';

  @override
  String get addToOrder => 'जोड़ें';

  @override
  String get slots => 'उपलब्ध स्लॉट';

  @override
  String get seats => 'सीटें';

  @override
  String get orderStatus_pending => 'भुगतान बाकी';

  @override
  String get orderStatus_confirmed => 'पक्का';

  @override
  String get orderStatus_in_progress => 'जारी';

  @override
  String get orderStatus_completed => 'पूरा';

  @override
  String get orderStatus_cancelled => 'रद्द';

  @override
  String get orderStatus_refunded => 'रिफ़ंड हुआ';

  @override
  String get cancelBooking => 'बुकिंग रद्द करें';

  @override
  String refundAmount(Object amount) {
    return 'रिफ़ंड: $amount';
  }

  @override
  String get paymentSuccess => 'भुगतान सफल। आपकी बुकिंग पक्की है।';

  @override
  String get paymentFailed => 'भुगतान पूरा नहीं हुआ।';

  @override
  String get mockCheckoutTitle => 'टेस्ट चेकआउट';

  @override
  String get mockCheckoutBody => 'टेस्ट मोड में असली पैसे नहीं कटते।';

  @override
  String get mockPaySucceed => 'भुगतान (सफल)';

  @override
  String get mockPayFail => 'भुगतान विफल';

  @override
  String get trackRide => 'सवारी ट्रैक करें';

  @override
  String get writeReview => 'समीक्षा लिखें';

  @override
  String get rating => 'रेटिंग';

  @override
  String get reviewHint => 'अपना अनुभव बताएँ';

  @override
  String get sosTitle => 'SOS';

  @override
  String get sosHold => 'मदद के लिए दबाकर रखें';

  @override
  String sosCountdown(Object seconds) {
    return '$seconds में अलर्ट जाएगा';
  }

  @override
  String get sosActive => 'मदद आ रही है। परिवार को सूचना दे दी गई है।';

  @override
  String get sosShareLink => 'लाइव लोकेशन शेयर करें';

  @override
  String get sosCancel => 'अलर्ट रद्द करें';

  @override
  String get sosSafe => 'मैं सुरक्षित हूँ';

  @override
  String get sosNoContacts => 'आपात संपर्क जोड़ें ताकि हम परिवार को सूचना दे सकें।';

  @override
  String get callEmergency => '112 पर कॉल करें';

  @override
  String get nearbyHelp => 'पास में मदद';

  @override
  String get emergencyContacts => 'आपात संपर्क';

  @override
  String get addContact => 'संपर्क जोड़ें';

  @override
  String get name => 'नाम';

  @override
  String get relation => 'रिश्ता';

  @override
  String get locationDenied => 'लोकेशन अनुमति बंद है। अलर्ट बिना लोकेशन के जाएगा।';

  @override
  String get notifications => 'सूचनाएँ';

  @override
  String get markAllRead => 'सभी पढ़ लिया';

  @override
  String get notificationPrefs => 'सूचना सेटिंग';

  @override
  String get aartiReminders => 'आरती रिमाइंडर';

  @override
  String minutesBefore(Object minutes) {
    return '$minutes मिनट पहले';
  }

  @override
  String get profile => 'प्रोफ़ाइल';

  @override
  String get language => 'भाषा';

  @override
  String get displayName => 'आपका नाम';

  @override
  String get signOut => 'साइन आउट';

  @override
  String get deleteAccount => 'अकाउंट हटाएँ';

  @override
  String get deleteAccountConfirm => 'इससे आपका अकाउंट और डेटा हमेशा के लिए हट जाएगा। जारी रखें?';

  @override
  String get guestUser => 'मेहमान';

  @override
  String get weatherAndTrains => 'मौसम और ट्रेन';

  @override
  String get trainsTo => 'ट्रेनें';

  @override
  String get fromStation => 'से';

  @override
  String get toStation => 'तक';

  @override
  String get search => 'खोजें';

  @override
  String get reels => 'रील्स';

  @override
  String get comments => 'टिप्पणियाँ';

  @override
  String get addComment => 'टिप्पणी लिखें';

  @override
  String get saved => 'सेव किए';

  @override
  String get guideTitle => 'ब्रज गाइड';

  @override
  String get guideHint => 'मंदिर, आरती, ठहरने के बारे में पूछें…';

  @override
  String get guideIntro =>
      'राधे राधे! ब्रज के बारे में कुछ भी पूछिए। आरती का समय हमेशा मंदिर की सूची से आता है।';

  @override
  String get newChat => 'नई बातचीत';

  @override
  String get sources => 'स्रोत';

  @override
  String get planner => 'यात्रा योजनाकार';

  @override
  String get planTrip => 'मेरी यात्रा बनाएँ';

  @override
  String get days => 'दिन';

  @override
  String get pace => 'गति';

  @override
  String get paceRelaxed => 'आराम से';

  @override
  String get paceModerate => 'सामान्य';

  @override
  String get paceIntense => 'भरपूर';

  @override
  String get startDate => 'शुरुआत की तारीख';

  @override
  String get sharePlan => 'शेयर करें';

  @override
  String get downloadPdf => 'PDF डाउनलोड';

  @override
  String get voiceAsk => 'बोलने के लिए दबाएँ';

  @override
  String get identifyTemple => 'मंदिर पहचानें';

  @override
  String quotaLeft(Object count) {
    return 'आज $count सवाल बाकी';
  }

  @override
  String get changeNumber => 'नंबर बदलें';

  @override
  String freeCancellation(Object pct, Object hours) {
    return 'चेक-इन से $hours घंटे पहले तक मुफ़्त रद्दीकरण; उसके बाद $pct% शुल्क।';
  }

  @override
  String nightsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count रातें',
      one: '1 रात',
    );
    return '$_temp0';
  }

  @override
  String roomsLeft(int count) {
    return '$count बाकी';
  }

  @override
  String get nightFare => 'रात का किराया';

  @override
  String driverAt(Object km) {
    return 'ड्राइवर $km किमी दूर है';
  }

  @override
  String get driverLocation => 'ड्राइवर की लाइव लोकेशन';

  @override
  String get eldersInGroup => 'समूह में बुज़ुर्ग';

  @override
  String get wheelchairAccess => 'व्हीलचेयर सुविधा';

  @override
  String minTravel(Object minutes) {
    return '$minutes मिनट यात्रा';
  }

  @override
  String get allBraj => 'पूरा ब्रज';

  @override
  String dayN(Object n) {
    return 'दिन $n';
  }

  @override
  String get send => 'भेजें';

  @override
  String get happeningNow => 'अभी चल रही है';

  @override
  String get tagline => 'आपका तीर्थ साथी';

  @override
  String get askGuide => 'ब्रज गाइड से कुछ भी पूछें…';

  @override
  String get aiVoice => 'AI आवाज़';

  @override
  String get quickAccess => 'त्वरित सेवाएँ';

  @override
  String get liveCrowd => 'लाइव भीड़';

  @override
  String get viewAll => 'सभी देखें';

  @override
  String get brajDarshan => 'ब्रज दर्शन';

  @override
  String templeCount(int count) {
    return '$count मंदिर';
  }

  @override
  String get viewPlan => 'योजना देखें';

  @override
  String get trains => 'ट्रेनें';

  @override
  String get popularTemples => 'लोकप्रिय मंदिर';

  @override
  String get tripPlannerTitle => 'AI यात्रा योजनाकार';

  @override
  String get tripPlannerBody => 'AI से सेकंडों में अपनी ब्रज यात्रा की योजना बनाएँ';

  @override
  String get trustAartiTitle => 'लाइव आरती समय';

  @override
  String get trustAartiBody => 'मंदिर की समय-सारणी से';

  @override
  String get trustPayTitle => 'सुरक्षित बुकिंग';

  @override
  String get trustPayBody => 'सत्यापित भुगतान';

  @override
  String get trustSosTitle => 'SOS 24×7';

  @override
  String get trustSosBody => 'मदद बस एक टैप दूर';

  @override
  String get staysSub => 'मंदिरों के पास धर्मशालाएँ व होटल';

  @override
  String get cabsSub => 'मंदिरों के बीच तय किराया';

  @override
  String get foodSub => 'शुद्ध शाकाहारी व सात्विक भोजन';

  @override
  String get experiencesSub => 'नाव सवारी, पदयात्रा व आरती सीट';

  @override
  String get bookSub => 'आपकी यात्रा की हर ज़रूरत, एक जगह';

  @override
  String get brandTagline => 'हर तीर्थ, आपके साथ';

  @override
  String get welcomeBack => 'फिर से स्वागत है';

  @override
  String get welcomeBackSub => 'अपनी आध्यात्मिक यात्रा जारी रखने के लिए लॉगिन करें';

  @override
  String get registerTitle => 'स्वागत है';

  @override
  String get registerSub => 'अपनी ब्रज यात्रा शुरू करने के लिए खाता बनाएँ';

  @override
  String get tabLogin => 'लॉगिन';

  @override
  String get tabRegister => 'रजिस्टर';

  @override
  String get fullName => 'पूरा नाम';

  @override
  String get fullNameHint => 'आपका पूरा नाम';

  @override
  String get nameRequired => 'कृपया अपना पूरा नाम लिखें';

  @override
  String get guestSub => 'मेहमान के रूप में देखें (सीमित सुविधा)';

  @override
  String get orLabel => 'या';

  @override
  String get loginFooter => 'यात्रा, दर्शन, सुविधा और सुरक्षा – सब कुछ एक ही ऐप में';

  @override
  String get splashSub => 'भारत का आध्यात्मिक यात्रा ऐप';

  @override
  String get scan => 'स्कैन';

  @override
  String get myTrips => 'मेरी यात्राएँ';

  @override
  String get aiGuide => 'AI गाइड';

  @override
  String get newReel => 'नई रील';

  @override
  String get recordVideo => 'वीडियो रिकॉर्ड करें';

  @override
  String get chooseFromGallery => 'गैलरी से चुनें';

  @override
  String get reelComposerHint => 'दर्शन, आरती या परिक्रमा का पल साझा करें (90 सेकंड तक)।';

  @override
  String get writeCaption => 'कैप्शन लिखें… #हैशटैग जोड़ें';

  @override
  String get tagTemple => 'मंदिर टैग करें';

  @override
  String get noTemple => 'कोई मंदिर नहीं';

  @override
  String get cover => 'कवर';

  @override
  String get chooseCover => 'कवर चुनें';

  @override
  String get changeVideo => 'वीडियो बदलें';

  @override
  String get shareReel => 'साझा करें';

  @override
  String uploadingReel(int percent) {
    return 'अपलोड हो रहा है $percent%';
  }

  @override
  String get reelProcessing => 'पोस्ट हो गई! प्रोसेस होते ही आपकी रील फ़ीड में दिखेगी।';

  @override
  String get myReels => 'मेरी रील्स';

  @override
  String get reelsCount => 'रील्स';

  @override
  String get followers => 'फ़ॉलोअर्स';

  @override
  String get following => 'फ़ॉलोइंग';

  @override
  String get editReel => 'रील संपादित करें';

  @override
  String get deleteReel => 'रील हटाएँ';

  @override
  String get deleteReelConfirm => 'यह रील हटाएँ? इसे वापस नहीं लाया जा सकता।';

  @override
  String get reelStatus_processing => 'प्रोसेस हो रही है';

  @override
  String get reelStatus_removed => 'हटाई गई';

  @override
  String get reelStatus_pending => 'समीक्षा में';

  @override
  String get videoTooLong => 'कृपया 90 सेकंड या उससे छोटा वीडियो चुनें।';

  @override
  String get videoTooBig => 'यह वीडियो बहुत बड़ा है (अधिकतम 100 MB)।';

  @override
  String get forYou => 'आपके लिए';

  @override
  String get noReelsYet => 'अभी कोई रील नहीं। अपना पहला दर्शन पल साझा करें!';

  @override
  String get reelSaved => 'रील अपडेट हो गई';

  @override
  String get editVideo => 'वीडियो संपादित करें';

  @override
  String get editVideoHint => 'ट्रिम, फ़िल्टर, गति, टेक्स्ट, आवाज़';

  @override
  String get reset => 'रीसेट';

  @override
  String get trim => 'ट्रिम';

  @override
  String get filters => 'फ़िल्टर';

  @override
  String get speed => 'गति';

  @override
  String get text => 'टेक्स्ट';

  @override
  String get sound => 'आवाज़';

  @override
  String get trimHint => 'साझा करने वाला हिस्सा चुनने के लिए किनारे खींचें';

  @override
  String get addText => 'टेक्स्ट जोड़ें';

  @override
  String get textHint => 'टेक्स्ट हिलाने के लिए खींचें · बदलने के लिए टैप करें';

  @override
  String get originalSound => 'मूल आवाज़';

  @override
  String get typeSomething => 'कुछ लिखें…';

  @override
  String get textPlain => 'सादा';

  @override
  String get textBox => 'बॉक्स';

  @override
  String get textOutline => 'आउटलाइन';

  @override
  String get filter_none => 'सामान्य';

  @override
  String get filter_warm => 'गर्म';

  @override
  String get filter_cool => 'ठंडा';

  @override
  String get filter_vivid => 'चटक';

  @override
  String get filter_mono => 'मोनो';

  @override
  String get filter_sepia => 'सीपिया';

  @override
  String get filter_fade => 'फ़ेड';

  @override
  String get filter_saffron => 'केसरिया';

  @override
  String get followingEmpty => 'क्रिएटर्स को फ़ॉलो करें, उनकी रील्स यहाँ दिखेंगी';

  @override
  String get follow => 'फ़ॉलो';

  @override
  String get followingButton => 'फ़ॉलो कर रहे हैं';

  @override
  String get viewProfile => 'प्रोफ़ाइल देखें';

  @override
  String get report => 'रिपोर्ट करें';

  @override
  String get reportWhy => 'आप यह रील क्यों रिपोर्ट कर रहे हैं?';

  @override
  String get reportSpam => 'स्पैम';

  @override
  String get reportNudity => 'अश्लील सामग्री';

  @override
  String get reportHate => 'नफ़रत भरी भाषा';

  @override
  String get reportViolence => 'हिंसा';

  @override
  String get reportHarassment => 'धमकाना या उत्पीड़न';

  @override
  String get reportMisinformation => 'गलत जानकारी';

  @override
  String get reportScam => 'धोखाधड़ी';

  @override
  String get reportOther => 'कुछ और';

  @override
  String get reportThanks => 'धन्यवाद — हमारी टीम इसकी जाँच करेगी';

  @override
  String get share => 'साझा करें';

  @override
  String get noCommentsYet => 'अभी कोई टिप्पणी नहीं। बातचीत शुरू करें।';

  @override
  String get commentPosted => 'टिप्पणी भेजी गई — स्वीकृति के बाद दिखेगी';

  @override
  String get reply => 'जवाब दें';

  @override
  String get justNow => 'अभी';

  @override
  String replyingTo(String name) {
    return '$name को जवाब';
  }

  @override
  String get originalAudio => 'मूल ऑडियो';

  @override
  String get aartiDisclaimer =>
      'आरती और दर्शन के समय मंदिर की सूची से हैं; त्योहारों पर बदल सकते हैं।';

  @override
  String get addMember => 'सदस्य जोड़ें';

  @override
  String get addMembersFirst => 'अपने समूह का कम से कम एक सदस्य जोड़ें';

  @override
  String get addStop => 'पड़ाव जोड़ें';

  @override
  String get address => 'पता';

  @override
  String get age => 'आयु';

  @override
  String get arrivalTime => 'आगमन (पहला दिन)';

  @override
  String get arrivingBy => 'आगमन का साधन';

  @override
  String get checkInTime => 'चेक-इन समय';

  @override
  String get cities => 'शहर';

  @override
  String get createAiPlan => 'AI योजना बनाएँ';

  @override
  String get createCustomPlan => 'मेरी योजना बनाएँ';

  @override
  String get customEmpty => 'हर दिन के लिए अपने पड़ाव जोड़ें: मंदिर, भोजन, ख़रीदारी, कुछ भी।';

  @override
  String get customNeedsStops =>
      'अपनी योजना के लिए कम से कम एक पड़ाव, ठहरना या यात्रा विवरण जोड़ें';

  @override
  String get departureTime => 'वापसी (अंतिम दिन)';

  @override
  String get editMember => 'सदस्य बदलें';

  @override
  String get estCost => 'अनुमानित ख़र्च';

  @override
  String get gettingAround => 'स्थानीय साधन';

  @override
  String get groupName => 'समूह का नाम';

  @override
  String get groupNameHint => 'जैसे शर्मा परिवार यात्रा';

  @override
  String get interest_aarti => 'आरती';

  @override
  String get interest_festivals => 'त्योहार';

  @override
  String get interest_food => 'भोजन';

  @override
  String get interest_ghats => 'घाट';

  @override
  String get interest_parikrama => 'परिक्रमा';

  @override
  String get interest_shopping => 'ख़रीदारी';

  @override
  String get interest_temples => 'मंदिर';

  @override
  String get interests => 'रुचियाँ';

  @override
  String get invalidAge => '0 से 120 के बीच आयु लिखें';

  @override
  String get invalidPhone => '10 अंकों का मोबाइल नंबर लिखें';

  @override
  String get modeAi => 'AI योजना';

  @override
  String get modeCustom => 'अपनी योजना';

  @override
  String get modeAiHint =>
      'हम असली आरती समय, आराम और यात्रा के अनुसार हर दिन बनाते हैं, फिर आपके पड़ाव जोड़ते हैं।';

  @override
  String get modeCustomHint => 'सिर्फ़ जो आप जोड़ें: आपके पड़ाव, ठहरना और यात्रा, सुंदर रूप में।';

  @override
  String get noteOptional => 'नोट (वैकल्पिक)';

  @override
  String get notesForGroup => 'समूह के लिए नोट्स';

  @override
  String get notesHint => 'साथ ले जाने का सामान, मिलने की जगह, पहनावा…';

  @override
  String get ownStay => 'या अपना ठहरना';

  @override
  String get ownStayHint => 'धर्मशाला, आश्रम या होटल का नाम';

  @override
  String get ownStopsHint => 'वैकल्पिक: ज़रूरी जगहें जोड़ें; हम उन्हें योजना में शामिल करेंगे।';

  @override
  String get phoneOptional => 'फ़ोन (वैकल्पिक)';

  @override
  String get pickHotel => 'TirthNow पर ठहरना चुनें';

  @override
  String get pilgrims => 'यात्री';

  @override
  String get planAnother => 'बदलें या नई यात्रा बनाएँ';

  @override
  String get planYourYatra => 'अपनी यात्रा प्लान करें';

  @override
  String get plannerHeroHint =>
      'अकेले, परिवार या पूरा समूह: ठहरना, यात्रा और दर्शन एक ही योजना में।';

  @override
  String get planningStyle => 'योजना का तरीका';

  @override
  String get pricePerNight => 'कीमत / कमरा / रात';

  @override
  String get required => 'ज़रूरी';

  @override
  String get role_child => 'बच्चा';

  @override
  String get role_elder => 'बुज़ुर्ग';

  @override
  String get role_member => 'सदस्य';

  @override
  String get role_organiser => 'आयोजक';

  @override
  String get stay => 'ठहरना';

  @override
  String get stayOff => 'योजना में ठहरना नहीं जोड़ा जाएगा।';

  @override
  String get stopTitle => 'क्या';

  @override
  String get stopTitleHint => 'जैसे लोई बाज़ार में लस्सी';

  @override
  String get templeOptional => 'मंदिर (वैकल्पिक)';

  @override
  String get ticketDetails => 'टिकट विवरण';

  @override
  String get ticketDetailsHint => 'ट्रेन नंबर, PNR, कोच…';

  @override
  String get time => 'समय';

  @override
  String get travelDetails => 'यात्रा';

  @override
  String get travelOff => 'आगमन या वापसी नहीं जोड़ी जाएगी।';

  @override
  String get travel_bus => 'बस';

  @override
  String get travel_cab => 'कैब';

  @override
  String get travel_car => 'कार';

  @override
  String get travel_e_rickshaw => 'ई-रिक्शा';

  @override
  String get travel_flight => 'फ़्लाइट';

  @override
  String get travel_own_vehicle => 'अपना वाहन';

  @override
  String get travel_train => 'ट्रेन';

  @override
  String get travel_walk => 'पैदल';

  @override
  String get travellingFrom => 'कहाँ से';

  @override
  String get tripFamily => 'परिवार';

  @override
  String get tripGroup => 'समूह';

  @override
  String get tripSolo => 'अकेले';

  @override
  String get whenWhere => 'कब और कहाँ';

  @override
  String get whoIsTravelling => 'कौन जा रहा है';

  @override
  String get yatraGroup => 'यात्रा समूह';

  @override
  String get yourItinerary => 'आपका कार्यक्रम';

  @override
  String get yourOwnStops => 'आपके अपने पड़ाव';

  @override
  String get yourYatra => 'आपकी यात्रा';

  @override
  String ageYears(int age) {
    return '$age वर्ष';
  }

  @override
  String membersCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count सदस्य',
      one: '1 सदस्य',
      zero: 'अभी कोई सदस्य नहीं',
    );
    return '$_temp0';
  }

  @override
  String get night => 'रात';

  @override
  String get reelsFromBraj => 'ब्रज की रील्स';

  @override
  String get goodMorning => 'सुप्रभात · आज के दर्शन की योजना बनाएँ';

  @override
  String get goodAfternoon => 'शुभ दोपहर · आराम करें, फिर संध्या आरती';

  @override
  String get goodEvening => 'शुभ संध्या · संध्या आरती का समय';

  @override
  String get radheRadhe => 'राधे राधे';

  @override
  String get slide1Title => 'रात में प्रेम मंदिर';

  @override
  String get slide1Sub => 'रोशनी, संगमरमर और संगीतमय फव्वारा';

  @override
  String get slide2Title => 'परिवार या समूह की यात्रा प्लान करें';

  @override
  String get slide2Sub => 'सदस्य, ठहरना, यात्रा और सुंदर PDF';

  @override
  String get slide3Title => 'ब्रज की रील्स देखें';

  @override
  String get slide3Sub => 'दर्शन, आरती और यात्रा के पल';

  @override
  String get explore => 'देखें';

  @override
  String get planGroupYatra => 'समूह यात्रा प्लान करें';

  @override
  String get planGroupYatraSub =>
      'अपना समूह, ठहरना और यात्रा जोड़ें। असली आरती समय के साथ दिन-प्रतिदिन की योजना पाएँ।';

  @override
  String get featMembers => 'सदस्य';

  @override
  String get aartiAudioNote => 'पाठ ऑडियो (डेमो आवाज़)। बोल पारंपरिक हैं।';

  @override
  String get aartiIntro => 'मंदिर के अनुसार पूरी आरती पढ़ें और साथ में सुनें।';

  @override
  String get aartiTitle => 'आरती';

  @override
  String get changePhoto => 'फ़ोटो बदलें';

  @override
  String get createFamilyGroup => 'परिवार समूह बनाएँ';

  @override
  String get createGroup => 'समूह बनाएँ';

  @override
  String get createProfile => 'प्रोफ़ाइल बनाएँ';

  @override
  String get creatorsToFollow => 'फ़ॉलो करने के लिए क्रिएटर';

  @override
  String get deleteGroup => 'समूह हटाएँ';

  @override
  String get deleteGroupConfirm => 'यह सभी के लिए समूह हटा देगा। जारी रखें?';

  @override
  String get demo => 'डेमो';

  @override
  String get demoPeopleNote => 'डेमो के लिए नमूना प्रोफ़ाइल। ये असली यात्री नहीं हैं।';

  @override
  String get editProfile => 'आपकी प्रोफ़ाइल';

  @override
  String get endTrip => 'यात्रा समाप्त करें';

  @override
  String get endTripConfirm => 'इस यात्रा को पूरा मानें? लोकेशन शेयर करना बंद हो जाएगा।';

  @override
  String get enterYourName => 'कृपया अपना नाम लिखें';

  @override
  String get familyNameHint => 'जैसे शर्मा परिवार';

  @override
  String get familyPrivacy =>
      'केवल वही लोग जुड़ सकते हैं जिन्हें आप कोड देते हैं। आपकी लोकेशन तभी दिखती है जब आप यात्रा पर हों और इस समूह के लिए शेयर करना चालू हो। आप कभी भी बंद कर सकते हैं।';

  @override
  String get familyTracking => 'परिवार ट्रैकिंग';

  @override
  String get familyTrackingSub => 'आपकी अनुमति से घर पर परिवार आपकी यात्रा देख सके';

  @override
  String get invite => 'आमंत्रित करें';

  @override
  String get inviteFamilyHint => 'परिवार के साथ जॉइन कोड शेयर करें ताकि वे आपकी यात्रा देख सकें।';

  @override
  String get joinCode => 'जॉइन कोड';

  @override
  String get joinFamilyGroup => 'परिवार समूह से जुड़ें';

  @override
  String get joinWithCode => 'कोड से जुड़ें';

  @override
  String get joinedGroup => 'आप समूह से जुड़ गए। चाहें तो शेयर करना चालू करें।';

  @override
  String get leaveGroup => 'समूह छोड़ें';

  @override
  String get leaveGroupConfirm => 'इस परिवार समूह को छोड़ें?';

  @override
  String get listening => 'सुन रहे हैं… अब बोलें';

  @override
  String get liveLyricsAudio => 'लाइव · बोल · ऑडियो';

  @override
  String get lyricsAudio => 'बोल + ऑडियो';

  @override
  String get micPermission => 'आवाज़ से पूछने के लिए माइक्रोफ़ोन की अनुमति दें';

  @override
  String get myBookingsSub => 'आपकी बुक की गई जगहें, भोजन, कैब और अनुभव';

  @override
  String get myTrip => 'मेरी यात्रा';

  @override
  String get noActiveTrip => 'कोई यात्रा जारी नहीं';

  @override
  String get noFamilyGroups => 'अभी कोई परिवार समूह नहीं। एक बनाएँ या कोड से जुड़ें।';

  @override
  String get noPastTrips => 'आपकी पूरी की गई यात्राएँ यहाँ दिखेंगी।';

  @override
  String get notOnTrip => 'यात्रा पर नहीं';

  @override
  String get ok => 'ठीक है';

  @override
  String get onTrip => 'यात्रा पर';

  @override
  String get onTripNotSharing => 'लोकेशन शेयर नहीं';

  @override
  String get openInMaps => 'मैप में खोलें';

  @override
  String get pause => 'रोकें';

  @override
  String get people => 'लोग';

  @override
  String get pilgrimsInBraj => 'ब्रज में यात्री';

  @override
  String get play => 'चलाएँ';

  @override
  String get poojaAarti => 'आरती';

  @override
  String get poojaAll => 'सभी';

  @override
  String get poojaDeity => 'ठाकुर जी';

  @override
  String get poojaIntro => 'ब्रज में दर्शन और पूजा का ज़रूरी सामान।';

  @override
  String get poojaItems => 'पूजा सामग्री';

  @override
  String get poojaOffering => 'भोग व अर्पण';

  @override
  String get poojaSoon => 'स्थानीय दुकानों से ऑर्डर जल्द आ रहा है।';

  @override
  String get poojaTilak => 'तिलक व माला';

  @override
  String get profilePublicNote => 'आपका नाम और फ़ोटो आपकी रील्स और टिप्पणियों पर दिखते हैं।';

  @override
  String get profileSaved => 'प्रोफ़ाइल सहेजी गई';

  @override
  String get repeat => 'दोहराएँ';

  @override
  String get replay => 'फिर से चलाएँ';

  @override
  String get shareConsent => 'केवल आपके चुने परिवार वाले देख सकते हैं। कभी भी बंद करें।';

  @override
  String get shareLiveLocation => 'परिवार के साथ लाइव लोकेशन शेयर करें';

  @override
  String get shareWhatsApp => 'व्हाट्सऐप';

  @override
  String get shareWithGroup => 'मेरी यात्रा की लोकेशन शेयर करें';

  @override
  String get shareWithGroupSub => 'केवल यात्रा के दौरान इस समूह को दिखेगी';

  @override
  String get sharingOn => 'लाइव लोकेशन शेयर हो रही है';

  @override
  String get sharingPaused => 'लोकेशन शेयर करना रुका है';

  @override
  String get speaking => 'उत्तर बोल रहे हैं…';

  @override
  String get speakingPaused => 'रुका हुआ';

  @override
  String get startPilgrimage => 'अपनी यात्रा शुरू करें';

  @override
  String get startPilgrimageSub => 'हम आपको सूचित करेंगे, और आपकी अनुमति से परिवार साथ बना रहेगा।';

  @override
  String get startTrip => 'यात्रा शुरू करें';

  @override
  String get stop => 'बंद करें';

  @override
  String get stopListening => 'हो गया';

  @override
  String get textSize => 'अक्षर का आकार';

  @override
  String get tripEndedMsg =>
      'आपकी तीर्थयात्रा पूरी हो गई है। TirthNow के साथ यात्रा करने के लिए धन्यवाद!';

  @override
  String get tripHistory => 'यात्रा इतिहास';

  @override
  String get tripInProgress => 'यात्रा जारी है';

  @override
  String get tripStartedMsg =>
      'आपकी TirthNow तीर्थयात्रा शुरू हो गई है। आपकी यात्रा सुरक्षित और मंगलमय हो!';

  @override
  String get tripTitleHint => 'यात्रा का नाम (जैसे वृंदावन यात्रा)';

  @override
  String get uploadReel => 'रील अपलोड करें';

  @override
  String get voiceLangApp => 'ऐप की भाषा में बोलें';

  @override
  String get voiceReplies => 'बोलकर उत्तर';

  @override
  String get voiceSettings => 'आवाज़';

  @override
  String atPlace(String place) {
    return '$place पर';
  }

  @override
  String fromPlace(String place) {
    return 'कहाँ से: $place';
  }

  @override
  String lastUpdated(String time) {
    return 'अपडेट $time';
  }

  @override
  String startedAt(String time) {
    return 'शुरू: $time';
  }

  @override
  String familyInvite(String name, String code) {
    return 'हमारी तीर्थयात्रा देखने के लिए TirthNow परिवार समूह \"$name\" से जुड़ें 🙏 TirthNow खोलें → मेरी यात्राएँ → परिवार ट्रैकिंग → कोड से जुड़ें: $code';
  }

  @override
  String get yatraJourney => 'यात्रा जर्नी';

  @override
  String get yatraJourneySub =>
      'वॉइस गाइड, किराया और दर्शन सुझावों के साथ ब्रज यात्रा पड़ाव-दर-पड़ाव';

  @override
  String get rideYatraJourney => 'यात्रा जर्नी पर चलें';

  @override
  String get journeyStop => 'पड़ाव';

  @override
  String get journeyKm => 'किमी';

  @override
  String get journeyFare => 'किराया (अनुमान)';

  @override
  String get journeySpeed => 'गति';

  @override
  String get journeyPrev => 'पिछला पड़ाव';

  @override
  String get journeyNext => 'अगला पड़ाव';

  @override
  String get journeyStart => 'यात्रा शुरू करें';

  @override
  String get journeyContinue => 'जारी रखें';

  @override
  String get journeyRestart => 'फिर से चलें';

  @override
  String get voiceGuide => 'वॉइस गाइड';

  @override
  String get pilgrimTips => 'यात्री सुझाव';

  @override
  String get journeyNote =>
      'चित्रात्मक नक्शा, पैमाने पर नहीं। दूरी और किराया नमूना अनुमान हैं; दर्शन का समय हर मंदिर के पेज पर देखें।';

  @override
  String visitMins(int mins) {
    return 'लगभग $mins मिनट';
  }

  @override
  String nextStopIn(String km) {
    return 'अगला पड़ाव $km किमी';
  }
}

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
}

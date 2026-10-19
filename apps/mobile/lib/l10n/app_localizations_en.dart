// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appName => 'Tirth Now';

  @override
  String get navHome => 'Home';

  @override
  String get navTemples => 'Temples';

  @override
  String get navBook => 'Book';

  @override
  String get navGuide => 'Guide';

  @override
  String get navProfile => 'Profile';

  @override
  String get retry => 'Try again';

  @override
  String get cancel => 'Cancel';

  @override
  String get save => 'Save';

  @override
  String get delete => 'Delete';

  @override
  String get done => 'Done';

  @override
  String get continueLabel => 'Continue';

  @override
  String get seeAll => 'See all';

  @override
  String get loading => 'Loading…';

  @override
  String get errorGeneric => 'Something went wrong.';

  @override
  String get errorOffline => 'You are offline. Showing saved data where possible.';

  @override
  String get emptyList => 'Nothing here yet.';

  @override
  String get signInToContinue => 'Sign in with your phone to continue.';

  @override
  String get signIn => 'Sign in';

  @override
  String get welcomeTitle => 'Every tirth, right now.';

  @override
  String get welcomeSub =>
      'Aarti times, darshan, stays, rides, SOS and an AI guide for your yatra in Braj.';

  @override
  String get chooseLanguage => 'Choose language';

  @override
  String get phoneLabel => 'Mobile number';

  @override
  String get phoneHint => '10-digit number';

  @override
  String get phoneInvalid => 'Enter a valid 10-digit Indian mobile number.';

  @override
  String get sendOtp => 'Send OTP';

  @override
  String get otpLabel => '6-digit OTP';

  @override
  String otpSentTo(Object phone) {
    return 'We sent a code to $phone';
  }

  @override
  String get otpInvalid => 'Enter the 6-digit code.';

  @override
  String get verify => 'Verify';

  @override
  String get mockOtpHint => 'Test mode: use 123456';

  @override
  String get continueAsGuest => 'Continue as guest';

  @override
  String get guestNote => 'Guests can browse, ask the guide and use SOS. Sign in to book.';

  @override
  String greeting(Object name) {
    return 'Radhe Radhe$name';
  }

  @override
  String get nextAarti => 'Next aarti';

  @override
  String get startsIn => 'Starts in';

  @override
  String get upcomingAartis => 'Upcoming aartis';

  @override
  String get festivals => 'Festivals';

  @override
  String get weather => 'Weather';

  @override
  String get quickActions => 'Quick actions';

  @override
  String get nearbyTemples => 'Temples';

  @override
  String get noUpcomingAarti => 'No aarti scheduled in the next few hours.';

  @override
  String feelsLike(Object temp) {
    return 'Feels like $temp';
  }

  @override
  String get searchTemples => 'Search temples';

  @override
  String get crowd => 'Crowd';

  @override
  String get crowdLevel0 => 'Very low';

  @override
  String get crowdLevel1 => 'Low';

  @override
  String get crowdLevel2 => 'Moderate';

  @override
  String get crowdLevel3 => 'High';

  @override
  String get crowdLevel4 => 'Very high';

  @override
  String get aartiSchedule => 'Aarti schedule';

  @override
  String get today => 'Today';

  @override
  String get tomorrow => 'Tomorrow';

  @override
  String get remindMe => 'Remind me';

  @override
  String get reminderSet => 'Reminder set';

  @override
  String get reminderRemoved => 'Reminder removed';

  @override
  String get directions => 'Directions';

  @override
  String get dressCode => 'Dress code';

  @override
  String get about => 'About';

  @override
  String get live => 'Live';

  @override
  String get watchLive => 'Watch live';

  @override
  String get timesFromTemple => 'Times come from the temple\'s published schedule.';

  @override
  String get bookTitle => 'Book';

  @override
  String get stays => 'Stays';

  @override
  String get cabs => 'Cabs';

  @override
  String get food => 'Food';

  @override
  String get experiences => 'Experiences';

  @override
  String get myBookings => 'My bookings';

  @override
  String get checkIn => 'Check-in';

  @override
  String get checkOut => 'Check-out';

  @override
  String get guests => 'Guests';

  @override
  String get rooms => 'Rooms';

  @override
  String get perNight => 'per night';

  @override
  String get selectRoom => 'Select room';

  @override
  String get bookNow => 'Book now';

  @override
  String payNow(Object amount) {
    return 'Pay $amount';
  }

  @override
  String get total => 'Total';

  @override
  String get taxes => 'Taxes';

  @override
  String get fees => 'Fees';

  @override
  String get cancellationPolicy => 'Cancellation policy';

  @override
  String get pickup => 'Pickup';

  @override
  String get drop => 'Drop';

  @override
  String get getQuotes => 'Get fares';

  @override
  String get veg => 'Pure veg';

  @override
  String get satvik => 'Satvik';

  @override
  String get addToOrder => 'Add';

  @override
  String get slots => 'Available slots';

  @override
  String get seats => 'Seats';

  @override
  String get orderStatus_pending => 'Awaiting payment';

  @override
  String get orderStatus_confirmed => 'Confirmed';

  @override
  String get orderStatus_in_progress => 'In progress';

  @override
  String get orderStatus_completed => 'Completed';

  @override
  String get orderStatus_cancelled => 'Cancelled';

  @override
  String get orderStatus_refunded => 'Refunded';

  @override
  String get cancelBooking => 'Cancel booking';

  @override
  String refundAmount(Object amount) {
    return 'Refund: $amount';
  }

  @override
  String get paymentSuccess => 'Payment successful. Your booking is confirmed.';

  @override
  String get paymentFailed => 'Payment did not complete.';

  @override
  String get mockCheckoutTitle => 'Test checkout';

  @override
  String get mockCheckoutBody => 'No real money is charged in test mode.';

  @override
  String get mockPaySucceed => 'Pay (succeed)';

  @override
  String get mockPayFail => 'Fail payment';

  @override
  String get trackRide => 'Track ride';

  @override
  String get writeReview => 'Write a review';

  @override
  String get rating => 'Rating';

  @override
  String get reviewHint => 'Share your experience';

  @override
  String get sosTitle => 'SOS';

  @override
  String get sosHold => 'Press and hold for help';

  @override
  String sosCountdown(Object seconds) {
    return 'Sending alert in $seconds';
  }

  @override
  String get sosActive => 'Help is on the way. Your family has been alerted.';

  @override
  String get sosShareLink => 'Share live location';

  @override
  String get sosCancel => 'Cancel alert';

  @override
  String get sosSafe => 'I am safe';

  @override
  String get sosNoContacts => 'Add emergency contacts so we can alert your family.';

  @override
  String get callEmergency => 'Call 112';

  @override
  String get nearbyHelp => 'Nearby help';

  @override
  String get emergencyContacts => 'Emergency contacts';

  @override
  String get addContact => 'Add contact';

  @override
  String get name => 'Name';

  @override
  String get relation => 'Relation';

  @override
  String get locationDenied => 'Location permission is off. Alerts will go without your location.';

  @override
  String get notifications => 'Notifications';

  @override
  String get markAllRead => 'Mark all read';

  @override
  String get notificationPrefs => 'Notification settings';

  @override
  String get aartiReminders => 'Aarti reminders';

  @override
  String minutesBefore(Object minutes) {
    return '$minutes min before';
  }

  @override
  String get profile => 'Profile';

  @override
  String get language => 'Language';

  @override
  String get displayName => 'Your name';

  @override
  String get signOut => 'Sign out';

  @override
  String get deleteAccount => 'Delete account';

  @override
  String get deleteAccountConfirm => 'This permanently deletes your account and data. Continue?';

  @override
  String get guestUser => 'Guest';

  @override
  String get weatherAndTrains => 'Weather & trains';

  @override
  String get trainsTo => 'Trains';

  @override
  String get fromStation => 'From';

  @override
  String get toStation => 'To';

  @override
  String get search => 'Search';

  @override
  String get reels => 'Reels';

  @override
  String get comments => 'Comments';

  @override
  String get addComment => 'Add a comment';

  @override
  String get saved => 'Saved';

  @override
  String get guideTitle => 'Braj Guide';

  @override
  String get guideHint => 'Ask about temples, aarti, stays…';

  @override
  String get guideIntro =>
      'Radhe Radhe! Ask me anything about Braj. Aarti times always come from the temple schedule.';

  @override
  String get newChat => 'New chat';

  @override
  String get sources => 'Sources';

  @override
  String get planner => 'Trip planner';

  @override
  String get planTrip => 'Plan my trip';

  @override
  String get days => 'Days';

  @override
  String get pace => 'Pace';

  @override
  String get paceRelaxed => 'Relaxed';

  @override
  String get paceModerate => 'Moderate';

  @override
  String get paceIntense => 'Packed';

  @override
  String get startDate => 'Start date';

  @override
  String get sharePlan => 'Share';

  @override
  String get downloadPdf => 'Download PDF';

  @override
  String get voiceAsk => 'Hold to speak';

  @override
  String get identifyTemple => 'Identify a temple';

  @override
  String quotaLeft(Object count) {
    return '$count questions left today';
  }

  @override
  String get changeNumber => 'Change number';

  @override
  String freeCancellation(Object pct, Object hours) {
    return 'Free cancellation until $hours h before check-in; $pct% charge after that.';
  }

  @override
  String nightsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count nights',
      one: '1 night',
    );
    return '$_temp0';
  }

  @override
  String roomsLeft(int count) {
    return '$count left';
  }

  @override
  String get nightFare => 'night fare';

  @override
  String driverAt(Object km) {
    return 'Driver is $km km away';
  }

  @override
  String get driverLocation => 'Driver\'s live location';

  @override
  String get eldersInGroup => 'Elders in the group';

  @override
  String get wheelchairAccess => 'Wheelchair access';

  @override
  String minTravel(Object minutes) {
    return '$minutes min travel';
  }

  @override
  String get allBraj => 'All Braj';

  @override
  String dayN(Object n) {
    return 'Day $n';
  }

  @override
  String get send => 'Send';

  @override
  String get happeningNow => 'Happening now';

  @override
  String get tagline => 'Your Braj yatra companion';

  @override
  String get askGuide => 'Ask Braj Guide anything…';

  @override
  String get aiVoice => 'AI Voice';

  @override
  String get quickAccess => 'Quick access';

  @override
  String get liveCrowd => 'Live crowd';

  @override
  String get viewAll => 'View all';

  @override
  String get brajDarshan => 'Braj darshan';

  @override
  String templeCount(int count) {
    return '$count temples';
  }

  @override
  String get viewPlan => 'View plan';

  @override
  String get trains => 'Trains';

  @override
  String get popularTemples => 'Popular temples';

  @override
  String get tripPlannerTitle => 'AI Trip Planner';

  @override
  String get tripPlannerBody => 'Plan your Braj yatra with AI in seconds';

  @override
  String get trustAartiTitle => 'Live aarti times';

  @override
  String get trustAartiBody => 'From temple schedules';

  @override
  String get trustPayTitle => 'Secure booking';

  @override
  String get trustPayBody => 'Verified payments';

  @override
  String get trustSosTitle => 'SOS 24×7';

  @override
  String get trustSosBody => 'Help is one tap away';

  @override
  String get staysSub => 'Dharamshalas & hotels near temples';

  @override
  String get cabsSub => 'Fixed fares between temples';

  @override
  String get foodSub => 'Pure veg & satvik meals';

  @override
  String get experiencesSub => 'Boat rides, walks & aarti seats';

  @override
  String get bookSub => 'Everything for your yatra, in one place';
}

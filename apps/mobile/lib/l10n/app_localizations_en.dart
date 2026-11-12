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
  String get guideTitle => 'Tirth Guide';

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
  String get tagline => 'Your tirth companion';

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

  @override
  String get brandTagline => 'हर तीर्थ, आपके साथ';

  @override
  String get welcomeBack => 'Welcome back';

  @override
  String get welcomeBackSub => 'Login to continue your spiritual journey';

  @override
  String get registerTitle => 'Welcome';

  @override
  String get registerSub => 'Create an account to begin your Braj journey';

  @override
  String get tabLogin => 'Login';

  @override
  String get tabRegister => 'Register';

  @override
  String get fullName => 'Full name';

  @override
  String get fullNameHint => 'Your full name';

  @override
  String get nameRequired => 'Please enter your full name';

  @override
  String get guestSub => 'Explore as guest (limited access)';

  @override
  String get orLabel => 'OR';

  @override
  String get loginFooter => 'Yatra, darshan, stays and safety — all in one app';

  @override
  String get splashSub => 'India\'s spiritual journey app';

  @override
  String get scan => 'Scan';

  @override
  String get myTrips => 'My Trips';

  @override
  String get aiGuide => 'AI Guide';

  @override
  String get newReel => 'New reel';

  @override
  String get recordVideo => 'Record video';

  @override
  String get chooseFromGallery => 'Choose from gallery';

  @override
  String get reelComposerHint => 'Share a darshan, aarti or parikrama moment (up to 90 seconds).';

  @override
  String get writeCaption => 'Write a caption… use #hashtags';

  @override
  String get tagTemple => 'Tag a temple';

  @override
  String get noTemple => 'No temple';

  @override
  String get cover => 'Cover';

  @override
  String get chooseCover => 'Choose cover';

  @override
  String get changeVideo => 'Change video';

  @override
  String get shareReel => 'Share';

  @override
  String uploadingReel(int percent) {
    return 'Uploading $percent%';
  }

  @override
  String get reelProcessing => 'Posted! Your reel will appear in the feed once it has processed.';

  @override
  String get myReels => 'My reels';

  @override
  String get reelsCount => 'Reels';

  @override
  String get followers => 'Followers';

  @override
  String get following => 'Following';

  @override
  String get editReel => 'Edit reel';

  @override
  String get deleteReel => 'Delete reel';

  @override
  String get deleteReelConfirm => 'Delete this reel? This cannot be undone.';

  @override
  String get reelStatus_processing => 'Processing';

  @override
  String get reelStatus_removed => 'Removed';

  @override
  String get reelStatus_pending => 'Under review';

  @override
  String get videoTooLong => 'Please pick a video of 90 seconds or less.';

  @override
  String get videoTooBig => 'This video is too large (max 100 MB).';

  @override
  String get forYou => 'For you';

  @override
  String get noReelsYet => 'No reels yet. Share your first darshan moment!';

  @override
  String get reelSaved => 'Reel updated';

  @override
  String get editVideo => 'Edit video';

  @override
  String get editVideoHint => 'Trim, filters, speed, text, sound';

  @override
  String get reset => 'Reset';

  @override
  String get trim => 'Trim';

  @override
  String get filters => 'Filters';

  @override
  String get speed => 'Speed';

  @override
  String get text => 'Text';

  @override
  String get sound => 'Sound';

  @override
  String get trimHint => 'Drag the ends to choose the part to share';

  @override
  String get addText => 'Add text';

  @override
  String get textHint => 'Drag text to move it · tap to edit';

  @override
  String get originalSound => 'Original sound';

  @override
  String get typeSomething => 'Type something…';

  @override
  String get textPlain => 'Plain';

  @override
  String get textBox => 'Box';

  @override
  String get textOutline => 'Outline';

  @override
  String get filter_none => 'Normal';

  @override
  String get filter_warm => 'Warm';

  @override
  String get filter_cool => 'Cool';

  @override
  String get filter_vivid => 'Vivid';

  @override
  String get filter_mono => 'Mono';

  @override
  String get filter_sepia => 'Sepia';

  @override
  String get filter_fade => 'Fade';

  @override
  String get filter_saffron => 'Saffron';

  @override
  String get followingEmpty => 'Follow creators to see their reels here';

  @override
  String get follow => 'Follow';

  @override
  String get followingButton => 'Following';

  @override
  String get viewProfile => 'View profile';

  @override
  String get report => 'Report';

  @override
  String get reportWhy => 'Why are you reporting this reel?';

  @override
  String get reportSpam => 'Spam';

  @override
  String get reportNudity => 'Nudity or sexual content';

  @override
  String get reportHate => 'Hate speech';

  @override
  String get reportViolence => 'Violence';

  @override
  String get reportHarassment => 'Bullying or harassment';

  @override
  String get reportMisinformation => 'False information';

  @override
  String get reportScam => 'Scam or fraud';

  @override
  String get reportOther => 'Something else';

  @override
  String get reportThanks => 'Thanks — our team will review it';

  @override
  String get share => 'Share';

  @override
  String get noCommentsYet => 'No comments yet. Start the conversation.';

  @override
  String get commentPosted => 'Comment posted — it appears once approved';

  @override
  String get reply => 'Reply';

  @override
  String get justNow => 'now';

  @override
  String replyingTo(String name) {
    return 'Replying to $name';
  }

  @override
  String get originalAudio => 'Original audio';

  @override
  String get aartiDisclaimer =>
      'Aarti and darshan times come from temple schedules and can change on festival days.';

  @override
  String get addMember => 'Add member';

  @override
  String get addMembersFirst => 'Add at least one member of your group';

  @override
  String get addStop => 'Add a stop';

  @override
  String get address => 'Address';

  @override
  String get age => 'Age';

  @override
  String get arrivalTime => 'Arrival (day 1)';

  @override
  String get arrivingBy => 'Arriving by';

  @override
  String get checkInTime => 'Check-in time';

  @override
  String get cities => 'Cities';

  @override
  String get createAiPlan => 'Create AI plan';

  @override
  String get createCustomPlan => 'Create my plan';

  @override
  String get customEmpty => 'Add your own stops for each day: temples, meals, shopping, anything.';

  @override
  String get customNeedsStops =>
      'Add at least one stop, a stay or travel details for a custom plan';

  @override
  String get departureTime => 'Departure (last day)';

  @override
  String get editMember => 'Edit member';

  @override
  String get estCost => 'Est. cost';

  @override
  String get gettingAround => 'Getting around';

  @override
  String get groupName => 'Group name';

  @override
  String get groupNameHint => 'e.g. Sharma parivar yatra';

  @override
  String get interest_aarti => 'Aarti';

  @override
  String get interest_festivals => 'Festivals';

  @override
  String get interest_food => 'Food';

  @override
  String get interest_ghats => 'Ghats';

  @override
  String get interest_parikrama => 'Parikrama';

  @override
  String get interest_shopping => 'Shopping';

  @override
  String get interest_temples => 'Temples';

  @override
  String get interests => 'Interests';

  @override
  String get invalidAge => 'Enter an age from 0 to 120';

  @override
  String get invalidPhone => 'Enter a 10-digit mobile number';

  @override
  String get modeAi => 'AI plan';

  @override
  String get modeCustom => 'Custom plan';

  @override
  String get modeAiHint =>
      'We build each day around real aarti times, rest and travel, then add your own stops.';

  @override
  String get modeCustomHint => 'Only what you add: your stops, stay and travel, nicely laid out.';

  @override
  String get noteOptional => 'Note (optional)';

  @override
  String get notesForGroup => 'Notes for the group';

  @override
  String get notesHint => 'Things to carry, meeting point, dress code…';

  @override
  String get ownStay => 'Or your own stay';

  @override
  String get ownStayHint => 'Dharamshala, ashram or hotel name';

  @override
  String get ownStopsHint => 'Optional: add places you must visit; we fit them into the plan.';

  @override
  String get phoneOptional => 'Phone (optional)';

  @override
  String get pickHotel => 'Pick a TirthNow stay';

  @override
  String get pilgrims => 'Pilgrims';

  @override
  String get planAnother => 'Edit or plan another trip';

  @override
  String get planYourYatra => 'Plan your yatra';

  @override
  String get plannerHeroHint =>
      'Solo, family or a whole group: stays, travel and darshan in one plan.';

  @override
  String get planningStyle => 'Planning style';

  @override
  String get pricePerNight => 'Price / room / night';

  @override
  String get required => 'Required';

  @override
  String get role_child => 'Child';

  @override
  String get role_elder => 'Elder';

  @override
  String get role_member => 'Member';

  @override
  String get role_organiser => 'Organiser';

  @override
  String get stay => 'Stay';

  @override
  String get stayOff => 'We won\'t add a stay to the plan.';

  @override
  String get stopTitle => 'What';

  @override
  String get stopTitleHint => 'e.g. Lassi at Loi Bazaar';

  @override
  String get templeOptional => 'Temple (optional)';

  @override
  String get ticketDetails => 'Ticket details';

  @override
  String get ticketDetailsHint => 'Train no., PNR, coach…';

  @override
  String get time => 'Time';

  @override
  String get travelDetails => 'Travel';

  @override
  String get travelOff => 'We won\'t add arrival or departure.';

  @override
  String get travel_bus => 'Bus';

  @override
  String get travel_cab => 'Cab';

  @override
  String get travel_car => 'Car';

  @override
  String get travel_e_rickshaw => 'E-rickshaw';

  @override
  String get travel_flight => 'Flight';

  @override
  String get travel_own_vehicle => 'Own vehicle';

  @override
  String get travel_train => 'Train';

  @override
  String get travel_walk => 'On foot';

  @override
  String get travellingFrom => 'Travelling from';

  @override
  String get tripFamily => 'Family';

  @override
  String get tripGroup => 'Group';

  @override
  String get tripSolo => 'Solo';

  @override
  String get whenWhere => 'When & where';

  @override
  String get whoIsTravelling => 'Who\'s travelling';

  @override
  String get yatraGroup => 'Yatra group';

  @override
  String get yourItinerary => 'Your itinerary';

  @override
  String get yourOwnStops => 'Your own stops';

  @override
  String get yourYatra => 'Your yatra';

  @override
  String ageYears(int age) {
    return '$age yrs';
  }

  @override
  String membersCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count members',
      one: '1 member',
      zero: 'No members yet',
    );
    return '$_temp0';
  }

  @override
  String get night => 'night';

  @override
  String get reelsFromBraj => 'Reels from Braj';

  @override
  String get goodMorning => 'Good morning · plan your darshan';

  @override
  String get goodAfternoon => 'Good afternoon · rest, then evening aarti';

  @override
  String get goodEvening => 'Good evening · time for sandhya aarti';

  @override
  String get radheRadhe => 'Radhe Radhe';

  @override
  String get slide1Title => 'Prem Mandir by night';

  @override
  String get slide1Sub => 'Lights, marble and the musical fountain';

  @override
  String get slide2Title => 'Plan a family or group yatra';

  @override
  String get slide2Sub => 'Members, stays, travel and a beautiful PDF';

  @override
  String get slide3Title => 'Watch reels from Braj';

  @override
  String get slide3Sub => 'Darshan, aarti and yatra moments';

  @override
  String get explore => 'Explore';

  @override
  String get planGroupYatra => 'Plan a group yatra';

  @override
  String get planGroupYatraSub =>
      'Add your group, stay and travel. Get a day-by-day plan around real aarti times.';

  @override
  String get featMembers => 'Members';

  @override
  String get aartiAudioNote => 'Recitation audio (demo voice). Lyrics are traditional.';

  @override
  String get aartiIntro => 'Read the full aarti and listen along, temple by temple.';

  @override
  String get aartiTitle => 'Aarti';

  @override
  String get changePhoto => 'Change photo';

  @override
  String get createFamilyGroup => 'Create family group';

  @override
  String get createGroup => 'Create group';

  @override
  String get createProfile => 'Create Profile';

  @override
  String get creatorsToFollow => 'Creators to follow';

  @override
  String get deleteGroup => 'Delete group';

  @override
  String get deleteGroupConfirm => 'This removes the group for everyone. Continue?';

  @override
  String get demo => 'DEMO';

  @override
  String get demoPeopleNote => 'Sample profiles for the demo. They are not real visitors.';

  @override
  String get editProfile => 'Your profile';

  @override
  String get endTrip => 'End trip';

  @override
  String get endTripConfirm => 'Mark this pilgrimage as completed? Location sharing will stop.';

  @override
  String get enterYourName => 'Please enter your name';

  @override
  String get familyNameHint => 'e.g. Sharma parivar';

  @override
  String get familyPrivacy =>
      'Only people you invite with the code can join. Your location is visible only while you are on a trip AND you have turned sharing on for this group. You can stop at any time.';

  @override
  String get familyTracking => 'Family tracking';

  @override
  String get familyTrackingSub => 'Let family at home follow your trip, with your permission';

  @override
  String get invite => 'Invite';

  @override
  String get inviteFamilyHint => 'Share the join code with family so they can follow your trip.';

  @override
  String get joinCode => 'Join code';

  @override
  String get joinFamilyGroup => 'Join a family group';

  @override
  String get joinWithCode => 'Join with code';

  @override
  String get joinedGroup => 'You joined the group. Turn on sharing if you want them to see you.';

  @override
  String get leaveGroup => 'Leave group';

  @override
  String get leaveGroupConfirm => 'Leave this family group?';

  @override
  String get listening => 'Listening… speak now';

  @override
  String get liveLyricsAudio => 'Live · Lyrics · Audio';

  @override
  String get lyricsAudio => 'Lyrics + audio';

  @override
  String get micPermission => 'Allow microphone access to ask by voice';

  @override
  String get myBookingsSub => 'Stays, food, cabs and experiences you booked';

  @override
  String get myTrip => 'My Trip';

  @override
  String get noActiveTrip => 'No trip in progress';

  @override
  String get noFamilyGroups => 'No family groups yet. Create one or join with a code.';

  @override
  String get noPastTrips => 'Your completed trips will appear here.';

  @override
  String get notOnTrip => 'Not on a trip';

  @override
  String get ok => 'OK';

  @override
  String get onTrip => 'ON TRIP';

  @override
  String get onTripNotSharing => 'Location not shared';

  @override
  String get openInMaps => 'Open in Maps';

  @override
  String get pause => 'Pause';

  @override
  String get people => 'People';

  @override
  String get pilgrimsInBraj => 'Pilgrims in Braj';

  @override
  String get play => 'Play';

  @override
  String get poojaAarti => 'Aarti';

  @override
  String get poojaAll => 'All';

  @override
  String get poojaDeity => 'Thakur ji';

  @override
  String get poojaIntro => 'Essentials for darshan and pooja in Braj.';

  @override
  String get poojaItems => 'Temple Store';

  @override
  String get poojaOffering => 'Offerings';

  @override
  String get poojaSoon => 'Ordering from local shops is coming soon.';

  @override
  String get poojaTilak => 'Tilak & mala';

  @override
  String get profilePublicNote => 'Your name and photo appear on your reels and comments.';

  @override
  String get profileSaved => 'Profile saved';

  @override
  String get repeat => 'Repeat';

  @override
  String get replay => 'Replay';

  @override
  String get shareConsent => 'Only family you choose can see it. Stop any time.';

  @override
  String get shareLiveLocation => 'Share live location with family';

  @override
  String get shareWhatsApp => 'WhatsApp';

  @override
  String get shareWithGroup => 'Share my trip location';

  @override
  String get shareWithGroupSub => 'Visible to this group only while you are on a trip';

  @override
  String get sharingOn => 'Sharing live location';

  @override
  String get sharingPaused => 'Location sharing paused';

  @override
  String get speaking => 'Speaking the answer…';

  @override
  String get speakingPaused => 'Paused';

  @override
  String get startPilgrimage => 'Start your pilgrimage';

  @override
  String get startPilgrimageSub =>
      'We\'ll notify you, and your family can follow along if you allow it.';

  @override
  String get startTrip => 'Start trip';

  @override
  String get stop => 'Stop';

  @override
  String get stopListening => 'Done';

  @override
  String get textSize => 'Text size';

  @override
  String get tripEndedMsg =>
      'Your pilgrimage has been completed. Thank you for travelling with TirthNow!';

  @override
  String get tripHistory => 'Trip history';

  @override
  String get tripInProgress => 'Trip In Progress';

  @override
  String get tripStartedMsg =>
      'Your TirthNow pilgrimage has started. We wish you a safe and blessed journey!';

  @override
  String get tripTitleHint => 'Trip name (e.g. Vrindavan yatra)';

  @override
  String get uploadReel => 'Upload a reel';

  @override
  String get voiceLangApp => 'Speak in app language';

  @override
  String get voiceReplies => 'Spoken replies';

  @override
  String get voiceSettings => 'Voice';

  @override
  String atPlace(String place) {
    return 'At $place';
  }

  @override
  String fromPlace(String place) {
    return 'From: $place';
  }

  @override
  String lastUpdated(String time) {
    return 'Updated $time';
  }

  @override
  String startedAt(String time) {
    return 'Started: $time';
  }

  @override
  String familyInvite(String name, String code) {
    return 'Join our TirthNow family group \"$name\" to follow our pilgrimage 🙏 Open TirthNow → My Trips → Family tracking → Join with code: $code';
  }

  @override
  String get yatraJourney => 'Yatra Journey';

  @override
  String get yatraJourneySub =>
      'Ride a Braj yatra stop by stop with a voice guide, fares and darshan tips';

  @override
  String get rideYatraJourney => 'Ride the Yatra Journey';

  @override
  String get journeyStop => 'Stop';

  @override
  String get journeyKm => 'km';

  @override
  String get journeyFare => 'Fare (est.)';

  @override
  String get journeySpeed => 'Speed';

  @override
  String get journeyPrev => 'Previous stop';

  @override
  String get journeyNext => 'Next stop';

  @override
  String get journeyStart => 'Start journey';

  @override
  String get journeyContinue => 'Continue';

  @override
  String get journeyRestart => 'Ride again';

  @override
  String get voiceGuide => 'Voice guide';

  @override
  String get pilgrimTips => 'Pilgrim tips';

  @override
  String get journeyNote =>
      'Illustrative map, not to scale. Distances and fares are sample estimates; check live darshan timings on each temple page.';

  @override
  String visitMins(int mins) {
    return '~$mins min visit';
  }

  @override
  String nextStopIn(String km) {
    return 'Next stop $km km';
  }

  @override
  String get heroTabTravel => 'Traveling';

  @override
  String get heroTabPooja => 'Pooja';

  @override
  String get heroTabPlace => 'Place';

  @override
  String get heroTabTemple => 'Temple';

  @override
  String get heroTravelTitle => 'Traveling';

  @override
  String get heroTravelSub =>
      'Plan a family or group yatra with all your travel needs in one place.';

  @override
  String get heroTravelCta => 'Plan your yatra';

  @override
  String get heroBrajGuide => 'Braj Guide';

  @override
  String get heroPickupDrop => 'Pickup & Drop';

  @override
  String get heroPoojaTitle => 'Pooja & Aarti';

  @override
  String get heroPoojaSub => 'Live aarti times, lyrics with audio and darshan bookings.';

  @override
  String get heroPoojaCta => 'Open aarti';

  @override
  String get heroAarti => 'Aarti times';

  @override
  String get heroLyrics => 'Lyrics & audio';

  @override
  String get heroDarshan => 'Darshan';

  @override
  String get heroPlaceTitle => 'Places in Braj';

  @override
  String get heroPlaceSub =>
      'Temples, kunds and parikrama routes across Vrindavan, Mathura and Govardhan.';

  @override
  String get heroPlaceCta => 'Start Yatra Journey';

  @override
  String get heroTemples => 'Temples';

  @override
  String get heroPlanTrip => 'Plan trip';

  @override
  String get heroStoreSub => 'Prasad, garlands, poshak and pooja essentials from the temple town.';

  @override
  String get heroStoreCta => 'Visit Temple Store';

  @override
  String get heroPrasad => 'Prasad';

  @override
  String get heroGarland => 'Garlands';

  @override
  String get heroPoshak => 'Poshak';

  @override
  String get heroDiya => 'Diya & dhoop';

  @override
  String get heroTravelVideo => 'Travel Video';

  @override
  String get aiTripPlanner => 'AI Trip Planner';

  @override
  String get planYourYatraSub =>
      'Create a personalized Braj yatra with stays, travel, darshan, aarti times and more.';

  @override
  String get planTravellers => 'Travellers';

  @override
  String get planDateDays => 'Date & Days';

  @override
  String get planTravel => 'Travel';

  @override
  String get planPace => 'Pace & Plan';

  @override
  String get planStops => 'Your Stops';

  @override
  String get cpUsernameRule => 'Username: 3-30 lowercase letters, numbers, _ or .';

  @override
  String get cpPickInterest => 'Pick at least one interest';

  @override
  String get cpIntBraj => 'Braj Yatra';

  @override
  String get cpIntTips => 'Travel Tips';

  @override
  String get cpIntVlogs => 'Yatra Vlogs';

  @override
  String get cpIntFestivals => 'Festival & Events';

  @override
  String get cpIntBhakti => 'Bhakti / Kirtan';

  @override
  String get cpIntFood => 'Local Food';

  @override
  String get cpIntHistory => 'History & Culture';

  @override
  String get cpIntOther => 'Other';

  @override
  String get cpAccountTitle => 'Create Account';

  @override
  String get cpAccountSub => 'Sign up to start creating and sharing on TirthNow';

  @override
  String get cpWithGoogle => 'Continue with Google';

  @override
  String get cpWithPhone => 'Continue with Phone';

  @override
  String get cpWithEmail => 'Continue with Email';

  @override
  String get cpSignInNote => 'You\'ll come back here after signing in.';

  @override
  String get cpFemale => 'Female';

  @override
  String get cpMale => 'Male';

  @override
  String get cpOther => 'Other';

  @override
  String get cpUndisclosed => 'Prefer not to say';

  @override
  String get cpDetailsTitle => 'Basic Details';

  @override
  String get cpDetailsSub => 'Tell us a bit about yourself';

  @override
  String get cpUsername => 'Username';

  @override
  String cpUsernameHint(String name) {
    return 'This will be your unique profile link tirthnow.com/@$name';
  }

  @override
  String get cpDob => 'Date of Birth';

  @override
  String get cpDobHint => 'Select your date of birth';

  @override
  String get cpGender => 'Gender';

  @override
  String get cpGenderHint => 'Select gender';

  @override
  String get cpProfileTitle => 'Create Your Profile';

  @override
  String get cpProfileSub => 'Make it easy for others to know you';

  @override
  String get cpAddPhoto => 'Add Profile Photo';

  @override
  String get cpBio => 'Bio (optional)';

  @override
  String get cpBioHint => 'Eg. Braj yatra, temples, travel & bhakti content creator 🙏';

  @override
  String get cpLocation => 'Location';

  @override
  String get cpLocationHint => 'Add your city (e.g. Mathura)';

  @override
  String get cpInterestsTitle => 'Choose Your Interests';

  @override
  String get cpInterestsSub => 'Select topics you create or enjoy';

  @override
  String get cpInterests => 'Interests';

  @override
  String get cpReviewTitle => 'Review & Create';

  @override
  String get cpReviewSub => 'Check your details before creating your profile';

  @override
  String get cpIntroTitle => 'Create your TirthNow Creator Profile';

  @override
  String get cpIntroSub =>
      'Share your yatra, darshan, travel tips and Braj experiences with the community.';

  @override
  String get cpPointVideos => 'Create & share short videos';

  @override
  String get cpPointCommunity => 'Build your devotee community';

  @override
  String get cpPointFollowers => 'Get followers & engagement';

  @override
  String get cpHaveProfile => 'I already have a profile';

  @override
  String get cpSignIn => 'Sign In';

  @override
  String get cpDoneTitle => 'Profile Created Successfully!';

  @override
  String get cpDoneSub =>
      'Welcome to the TirthNow Creators community. Start sharing your yatra and Braj experiences.';

  @override
  String get cpGoProfile => 'Go to My Profile';

  @override
  String get cpFirstPost => 'Create Your First Post';

  @override
  String get cpStepAccount => 'Account';

  @override
  String get cpStepDetails => 'Details';

  @override
  String get cpStepProfile => 'Profile';

  @override
  String get cpStepInterests => 'Interests';

  @override
  String get guideOnline => 'Online · Hindi & English';

  @override
  String get guideTyping => 'Typing…';

  @override
  String get guideWelcome => 'Radhe Radhe! 🙏';

  @override
  String get guideToolScan => 'Scan a temple';

  @override
  String get guideToolPlan => 'Plan my yatra';

  @override
  String get guideToolAarti => 'Aarti times';

  @override
  String get guideTryAsking => 'Try asking';

  @override
  String get guideListen => 'Listen';

  @override
  String get gTagline => 'Explore • Learn • Experience';

  @override
  String get gHello => 'I\'m your Tirth Guide AI. How can I help you today?';

  @override
  String get gHelloSub => 'Ask anything about temples, aarti, darshan, or travel plans.';

  @override
  String get gHint => 'Ask anything about temples…';

  @override
  String get gTapToSpeak => 'Tap to speak';

  @override
  String get gAttach => 'Attach';

  @override
  String get gHistory => 'Your chats';

  @override
  String get gSignInHistory => 'Sign in to see your chats';

  @override
  String get gTempleInfo => 'Temple Info';

  @override
  String get gAartiTimings => 'Aarti Timings';

  @override
  String get gTravelGuide => 'Travel Guide';

  @override
  String get gMore => 'More';

  @override
  String get gGallery => 'Gallery';

  @override
  String get gCamera => 'Camera';

  @override
  String get gLocation => 'Location';

  @override
  String get gTripPdf => 'Trip PDF';

  @override
  String get gHighlights => 'Key Highlights:';

  @override
  String get gViewOnMap => 'View on Map';

  @override
  String get gTempleDetails => 'Temple details';

  @override
  String get gNearby => 'Temples near you';

  @override
  String get gNearbyAsk => 'Which temples are near me?';

  @override
  String get gPhotoNoMatch => 'Couldn\'t recognise this temple. Try a clearer photo of the front.';

  @override
  String get gPromptAarti => 'Aaj ki aarti timings batao';

  @override
  String get gPromptTravel => 'How do I travel around Vrindavan, Mathura and Govardhan?';

  @override
  String get gPromptWear => 'What should I wear for darshan?';

  @override
  String get gPromptParikrama => 'Govardhan parikrama kitne km hai?';

  @override
  String get gPromptFood => 'Best sattvik food near Prem Mandir?';

  @override
  String get gPromptFestival => 'Which festivals are coming up in Braj?';

  @override
  String get gPromptHolyPlaces => 'Show me details about Vrindavan Dham';

  @override
  String gAskAbout(String name) {
    return 'Show me details about $name';
  }

  @override
  String gDham(String name) {
    return '$name Dham';
  }

  @override
  String gNextAarti(String name, String time) {
    return 'Next aarti: $name at $time';
  }

  @override
  String gKmAway(String km) {
    return '$km km away';
  }
}

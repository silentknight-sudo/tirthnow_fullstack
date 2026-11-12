import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_hi.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale) : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate = _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[Locale('en'), Locale('hi')];

  /// No description provided for @appName.
  ///
  /// In en, this message translates to:
  /// **'Tirth Now'**
  String get appName;

  /// No description provided for @navHome.
  ///
  /// In en, this message translates to:
  /// **'Home'**
  String get navHome;

  /// No description provided for @navTemples.
  ///
  /// In en, this message translates to:
  /// **'Temples'**
  String get navTemples;

  /// No description provided for @navBook.
  ///
  /// In en, this message translates to:
  /// **'Book'**
  String get navBook;

  /// No description provided for @navGuide.
  ///
  /// In en, this message translates to:
  /// **'Guide'**
  String get navGuide;

  /// No description provided for @navProfile.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get navProfile;

  /// No description provided for @retry.
  ///
  /// In en, this message translates to:
  /// **'Try again'**
  String get retry;

  /// No description provided for @cancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancel;

  /// No description provided for @save.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get save;

  /// No description provided for @delete.
  ///
  /// In en, this message translates to:
  /// **'Delete'**
  String get delete;

  /// No description provided for @done.
  ///
  /// In en, this message translates to:
  /// **'Done'**
  String get done;

  /// No description provided for @continueLabel.
  ///
  /// In en, this message translates to:
  /// **'Continue'**
  String get continueLabel;

  /// No description provided for @seeAll.
  ///
  /// In en, this message translates to:
  /// **'See all'**
  String get seeAll;

  /// No description provided for @loading.
  ///
  /// In en, this message translates to:
  /// **'Loading…'**
  String get loading;

  /// No description provided for @errorGeneric.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong.'**
  String get errorGeneric;

  /// No description provided for @errorOffline.
  ///
  /// In en, this message translates to:
  /// **'You are offline. Showing saved data where possible.'**
  String get errorOffline;

  /// No description provided for @emptyList.
  ///
  /// In en, this message translates to:
  /// **'Nothing here yet.'**
  String get emptyList;

  /// No description provided for @signInToContinue.
  ///
  /// In en, this message translates to:
  /// **'Sign in with your phone to continue.'**
  String get signInToContinue;

  /// No description provided for @signIn.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get signIn;

  /// No description provided for @welcomeTitle.
  ///
  /// In en, this message translates to:
  /// **'Every tirth, right now.'**
  String get welcomeTitle;

  /// No description provided for @welcomeSub.
  ///
  /// In en, this message translates to:
  /// **'Aarti times, darshan, stays, rides, SOS and an AI guide for your yatra in Braj.'**
  String get welcomeSub;

  /// No description provided for @chooseLanguage.
  ///
  /// In en, this message translates to:
  /// **'Choose language'**
  String get chooseLanguage;

  /// No description provided for @phoneLabel.
  ///
  /// In en, this message translates to:
  /// **'Mobile number'**
  String get phoneLabel;

  /// No description provided for @phoneHint.
  ///
  /// In en, this message translates to:
  /// **'10-digit number'**
  String get phoneHint;

  /// No description provided for @phoneInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid 10-digit Indian mobile number.'**
  String get phoneInvalid;

  /// No description provided for @sendOtp.
  ///
  /// In en, this message translates to:
  /// **'Send OTP'**
  String get sendOtp;

  /// No description provided for @otpLabel.
  ///
  /// In en, this message translates to:
  /// **'6-digit OTP'**
  String get otpLabel;

  /// No description provided for @otpSentTo.
  ///
  /// In en, this message translates to:
  /// **'We sent a code to {phone}'**
  String otpSentTo(Object phone);

  /// No description provided for @otpInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter the 6-digit code.'**
  String get otpInvalid;

  /// No description provided for @verify.
  ///
  /// In en, this message translates to:
  /// **'Verify'**
  String get verify;

  /// No description provided for @mockOtpHint.
  ///
  /// In en, this message translates to:
  /// **'Test mode: use 123456'**
  String get mockOtpHint;

  /// No description provided for @continueAsGuest.
  ///
  /// In en, this message translates to:
  /// **'Continue as guest'**
  String get continueAsGuest;

  /// No description provided for @guestNote.
  ///
  /// In en, this message translates to:
  /// **'Guests can browse, ask the guide and use SOS. Sign in to book.'**
  String get guestNote;

  /// No description provided for @greeting.
  ///
  /// In en, this message translates to:
  /// **'Radhe Radhe{name}'**
  String greeting(Object name);

  /// No description provided for @nextAarti.
  ///
  /// In en, this message translates to:
  /// **'Next aarti'**
  String get nextAarti;

  /// No description provided for @startsIn.
  ///
  /// In en, this message translates to:
  /// **'Starts in'**
  String get startsIn;

  /// No description provided for @upcomingAartis.
  ///
  /// In en, this message translates to:
  /// **'Upcoming aartis'**
  String get upcomingAartis;

  /// No description provided for @festivals.
  ///
  /// In en, this message translates to:
  /// **'Festivals'**
  String get festivals;

  /// No description provided for @weather.
  ///
  /// In en, this message translates to:
  /// **'Weather'**
  String get weather;

  /// No description provided for @quickActions.
  ///
  /// In en, this message translates to:
  /// **'Quick actions'**
  String get quickActions;

  /// No description provided for @nearbyTemples.
  ///
  /// In en, this message translates to:
  /// **'Temples'**
  String get nearbyTemples;

  /// No description provided for @noUpcomingAarti.
  ///
  /// In en, this message translates to:
  /// **'No aarti scheduled in the next few hours.'**
  String get noUpcomingAarti;

  /// No description provided for @feelsLike.
  ///
  /// In en, this message translates to:
  /// **'Feels like {temp}'**
  String feelsLike(Object temp);

  /// No description provided for @searchTemples.
  ///
  /// In en, this message translates to:
  /// **'Search temples'**
  String get searchTemples;

  /// No description provided for @crowd.
  ///
  /// In en, this message translates to:
  /// **'Crowd'**
  String get crowd;

  /// No description provided for @crowdLevel0.
  ///
  /// In en, this message translates to:
  /// **'Very low'**
  String get crowdLevel0;

  /// No description provided for @crowdLevel1.
  ///
  /// In en, this message translates to:
  /// **'Low'**
  String get crowdLevel1;

  /// No description provided for @crowdLevel2.
  ///
  /// In en, this message translates to:
  /// **'Moderate'**
  String get crowdLevel2;

  /// No description provided for @crowdLevel3.
  ///
  /// In en, this message translates to:
  /// **'High'**
  String get crowdLevel3;

  /// No description provided for @crowdLevel4.
  ///
  /// In en, this message translates to:
  /// **'Very high'**
  String get crowdLevel4;

  /// No description provided for @aartiSchedule.
  ///
  /// In en, this message translates to:
  /// **'Aarti schedule'**
  String get aartiSchedule;

  /// No description provided for @today.
  ///
  /// In en, this message translates to:
  /// **'Today'**
  String get today;

  /// No description provided for @tomorrow.
  ///
  /// In en, this message translates to:
  /// **'Tomorrow'**
  String get tomorrow;

  /// No description provided for @remindMe.
  ///
  /// In en, this message translates to:
  /// **'Remind me'**
  String get remindMe;

  /// No description provided for @reminderSet.
  ///
  /// In en, this message translates to:
  /// **'Reminder set'**
  String get reminderSet;

  /// No description provided for @reminderRemoved.
  ///
  /// In en, this message translates to:
  /// **'Reminder removed'**
  String get reminderRemoved;

  /// No description provided for @directions.
  ///
  /// In en, this message translates to:
  /// **'Directions'**
  String get directions;

  /// No description provided for @dressCode.
  ///
  /// In en, this message translates to:
  /// **'Dress code'**
  String get dressCode;

  /// No description provided for @about.
  ///
  /// In en, this message translates to:
  /// **'About'**
  String get about;

  /// No description provided for @live.
  ///
  /// In en, this message translates to:
  /// **'Live'**
  String get live;

  /// No description provided for @watchLive.
  ///
  /// In en, this message translates to:
  /// **'Watch live'**
  String get watchLive;

  /// No description provided for @timesFromTemple.
  ///
  /// In en, this message translates to:
  /// **'Times come from the temple\'s published schedule.'**
  String get timesFromTemple;

  /// No description provided for @bookTitle.
  ///
  /// In en, this message translates to:
  /// **'Book'**
  String get bookTitle;

  /// No description provided for @stays.
  ///
  /// In en, this message translates to:
  /// **'Stays'**
  String get stays;

  /// No description provided for @cabs.
  ///
  /// In en, this message translates to:
  /// **'Cabs'**
  String get cabs;

  /// No description provided for @food.
  ///
  /// In en, this message translates to:
  /// **'Food'**
  String get food;

  /// No description provided for @experiences.
  ///
  /// In en, this message translates to:
  /// **'Experiences'**
  String get experiences;

  /// No description provided for @myBookings.
  ///
  /// In en, this message translates to:
  /// **'My bookings'**
  String get myBookings;

  /// No description provided for @checkIn.
  ///
  /// In en, this message translates to:
  /// **'Check-in'**
  String get checkIn;

  /// No description provided for @checkOut.
  ///
  /// In en, this message translates to:
  /// **'Check-out'**
  String get checkOut;

  /// No description provided for @guests.
  ///
  /// In en, this message translates to:
  /// **'Guests'**
  String get guests;

  /// No description provided for @rooms.
  ///
  /// In en, this message translates to:
  /// **'Rooms'**
  String get rooms;

  /// No description provided for @perNight.
  ///
  /// In en, this message translates to:
  /// **'per night'**
  String get perNight;

  /// No description provided for @selectRoom.
  ///
  /// In en, this message translates to:
  /// **'Select room'**
  String get selectRoom;

  /// No description provided for @bookNow.
  ///
  /// In en, this message translates to:
  /// **'Book now'**
  String get bookNow;

  /// No description provided for @payNow.
  ///
  /// In en, this message translates to:
  /// **'Pay {amount}'**
  String payNow(Object amount);

  /// No description provided for @total.
  ///
  /// In en, this message translates to:
  /// **'Total'**
  String get total;

  /// No description provided for @taxes.
  ///
  /// In en, this message translates to:
  /// **'Taxes'**
  String get taxes;

  /// No description provided for @fees.
  ///
  /// In en, this message translates to:
  /// **'Fees'**
  String get fees;

  /// No description provided for @cancellationPolicy.
  ///
  /// In en, this message translates to:
  /// **'Cancellation policy'**
  String get cancellationPolicy;

  /// No description provided for @pickup.
  ///
  /// In en, this message translates to:
  /// **'Pickup'**
  String get pickup;

  /// No description provided for @drop.
  ///
  /// In en, this message translates to:
  /// **'Drop'**
  String get drop;

  /// No description provided for @getQuotes.
  ///
  /// In en, this message translates to:
  /// **'Get fares'**
  String get getQuotes;

  /// No description provided for @veg.
  ///
  /// In en, this message translates to:
  /// **'Pure veg'**
  String get veg;

  /// No description provided for @satvik.
  ///
  /// In en, this message translates to:
  /// **'Satvik'**
  String get satvik;

  /// No description provided for @addToOrder.
  ///
  /// In en, this message translates to:
  /// **'Add'**
  String get addToOrder;

  /// No description provided for @slots.
  ///
  /// In en, this message translates to:
  /// **'Available slots'**
  String get slots;

  /// No description provided for @seats.
  ///
  /// In en, this message translates to:
  /// **'Seats'**
  String get seats;

  /// No description provided for @orderStatus_pending.
  ///
  /// In en, this message translates to:
  /// **'Awaiting payment'**
  String get orderStatus_pending;

  /// No description provided for @orderStatus_confirmed.
  ///
  /// In en, this message translates to:
  /// **'Confirmed'**
  String get orderStatus_confirmed;

  /// No description provided for @orderStatus_in_progress.
  ///
  /// In en, this message translates to:
  /// **'In progress'**
  String get orderStatus_in_progress;

  /// No description provided for @orderStatus_completed.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get orderStatus_completed;

  /// No description provided for @orderStatus_cancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get orderStatus_cancelled;

  /// No description provided for @orderStatus_refunded.
  ///
  /// In en, this message translates to:
  /// **'Refunded'**
  String get orderStatus_refunded;

  /// No description provided for @cancelBooking.
  ///
  /// In en, this message translates to:
  /// **'Cancel booking'**
  String get cancelBooking;

  /// No description provided for @refundAmount.
  ///
  /// In en, this message translates to:
  /// **'Refund: {amount}'**
  String refundAmount(Object amount);

  /// No description provided for @paymentSuccess.
  ///
  /// In en, this message translates to:
  /// **'Payment successful. Your booking is confirmed.'**
  String get paymentSuccess;

  /// No description provided for @paymentFailed.
  ///
  /// In en, this message translates to:
  /// **'Payment did not complete.'**
  String get paymentFailed;

  /// No description provided for @mockCheckoutTitle.
  ///
  /// In en, this message translates to:
  /// **'Test checkout'**
  String get mockCheckoutTitle;

  /// No description provided for @mockCheckoutBody.
  ///
  /// In en, this message translates to:
  /// **'No real money is charged in test mode.'**
  String get mockCheckoutBody;

  /// No description provided for @mockPaySucceed.
  ///
  /// In en, this message translates to:
  /// **'Pay (succeed)'**
  String get mockPaySucceed;

  /// No description provided for @mockPayFail.
  ///
  /// In en, this message translates to:
  /// **'Fail payment'**
  String get mockPayFail;

  /// No description provided for @trackRide.
  ///
  /// In en, this message translates to:
  /// **'Track ride'**
  String get trackRide;

  /// No description provided for @writeReview.
  ///
  /// In en, this message translates to:
  /// **'Write a review'**
  String get writeReview;

  /// No description provided for @rating.
  ///
  /// In en, this message translates to:
  /// **'Rating'**
  String get rating;

  /// No description provided for @reviewHint.
  ///
  /// In en, this message translates to:
  /// **'Share your experience'**
  String get reviewHint;

  /// No description provided for @sosTitle.
  ///
  /// In en, this message translates to:
  /// **'SOS'**
  String get sosTitle;

  /// No description provided for @sosHold.
  ///
  /// In en, this message translates to:
  /// **'Press and hold for help'**
  String get sosHold;

  /// No description provided for @sosCountdown.
  ///
  /// In en, this message translates to:
  /// **'Sending alert in {seconds}'**
  String sosCountdown(Object seconds);

  /// No description provided for @sosActive.
  ///
  /// In en, this message translates to:
  /// **'Help is on the way. Your family has been alerted.'**
  String get sosActive;

  /// No description provided for @sosShareLink.
  ///
  /// In en, this message translates to:
  /// **'Share live location'**
  String get sosShareLink;

  /// No description provided for @sosCancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel alert'**
  String get sosCancel;

  /// No description provided for @sosSafe.
  ///
  /// In en, this message translates to:
  /// **'I am safe'**
  String get sosSafe;

  /// No description provided for @sosNoContacts.
  ///
  /// In en, this message translates to:
  /// **'Add emergency contacts so we can alert your family.'**
  String get sosNoContacts;

  /// No description provided for @callEmergency.
  ///
  /// In en, this message translates to:
  /// **'Call 112'**
  String get callEmergency;

  /// No description provided for @nearbyHelp.
  ///
  /// In en, this message translates to:
  /// **'Nearby help'**
  String get nearbyHelp;

  /// No description provided for @emergencyContacts.
  ///
  /// In en, this message translates to:
  /// **'Emergency contacts'**
  String get emergencyContacts;

  /// No description provided for @addContact.
  ///
  /// In en, this message translates to:
  /// **'Add contact'**
  String get addContact;

  /// No description provided for @name.
  ///
  /// In en, this message translates to:
  /// **'Name'**
  String get name;

  /// No description provided for @relation.
  ///
  /// In en, this message translates to:
  /// **'Relation'**
  String get relation;

  /// No description provided for @locationDenied.
  ///
  /// In en, this message translates to:
  /// **'Location permission is off. Alerts will go without your location.'**
  String get locationDenied;

  /// No description provided for @notifications.
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get notifications;

  /// No description provided for @markAllRead.
  ///
  /// In en, this message translates to:
  /// **'Mark all read'**
  String get markAllRead;

  /// No description provided for @notificationPrefs.
  ///
  /// In en, this message translates to:
  /// **'Notification settings'**
  String get notificationPrefs;

  /// No description provided for @aartiReminders.
  ///
  /// In en, this message translates to:
  /// **'Aarti reminders'**
  String get aartiReminders;

  /// No description provided for @minutesBefore.
  ///
  /// In en, this message translates to:
  /// **'{minutes} min before'**
  String minutesBefore(Object minutes);

  /// No description provided for @profile.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get profile;

  /// No description provided for @language.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get language;

  /// No description provided for @displayName.
  ///
  /// In en, this message translates to:
  /// **'Your name'**
  String get displayName;

  /// No description provided for @signOut.
  ///
  /// In en, this message translates to:
  /// **'Sign out'**
  String get signOut;

  /// No description provided for @deleteAccount.
  ///
  /// In en, this message translates to:
  /// **'Delete account'**
  String get deleteAccount;

  /// No description provided for @deleteAccountConfirm.
  ///
  /// In en, this message translates to:
  /// **'This permanently deletes your account and data. Continue?'**
  String get deleteAccountConfirm;

  /// No description provided for @guestUser.
  ///
  /// In en, this message translates to:
  /// **'Guest'**
  String get guestUser;

  /// No description provided for @weatherAndTrains.
  ///
  /// In en, this message translates to:
  /// **'Weather & trains'**
  String get weatherAndTrains;

  /// No description provided for @trainsTo.
  ///
  /// In en, this message translates to:
  /// **'Trains'**
  String get trainsTo;

  /// No description provided for @fromStation.
  ///
  /// In en, this message translates to:
  /// **'From'**
  String get fromStation;

  /// No description provided for @toStation.
  ///
  /// In en, this message translates to:
  /// **'To'**
  String get toStation;

  /// No description provided for @search.
  ///
  /// In en, this message translates to:
  /// **'Search'**
  String get search;

  /// No description provided for @reels.
  ///
  /// In en, this message translates to:
  /// **'Reels'**
  String get reels;

  /// No description provided for @comments.
  ///
  /// In en, this message translates to:
  /// **'Comments'**
  String get comments;

  /// No description provided for @addComment.
  ///
  /// In en, this message translates to:
  /// **'Add a comment'**
  String get addComment;

  /// No description provided for @saved.
  ///
  /// In en, this message translates to:
  /// **'Saved'**
  String get saved;

  /// No description provided for @guideTitle.
  ///
  /// In en, this message translates to:
  /// **'Braj Guide'**
  String get guideTitle;

  /// No description provided for @guideHint.
  ///
  /// In en, this message translates to:
  /// **'Ask about temples, aarti, stays…'**
  String get guideHint;

  /// No description provided for @guideIntro.
  ///
  /// In en, this message translates to:
  /// **'Radhe Radhe! Ask me anything about Braj. Aarti times always come from the temple schedule.'**
  String get guideIntro;

  /// No description provided for @newChat.
  ///
  /// In en, this message translates to:
  /// **'New chat'**
  String get newChat;

  /// No description provided for @sources.
  ///
  /// In en, this message translates to:
  /// **'Sources'**
  String get sources;

  /// No description provided for @planner.
  ///
  /// In en, this message translates to:
  /// **'Trip planner'**
  String get planner;

  /// No description provided for @planTrip.
  ///
  /// In en, this message translates to:
  /// **'Plan my trip'**
  String get planTrip;

  /// No description provided for @days.
  ///
  /// In en, this message translates to:
  /// **'Days'**
  String get days;

  /// No description provided for @pace.
  ///
  /// In en, this message translates to:
  /// **'Pace'**
  String get pace;

  /// No description provided for @paceRelaxed.
  ///
  /// In en, this message translates to:
  /// **'Relaxed'**
  String get paceRelaxed;

  /// No description provided for @paceModerate.
  ///
  /// In en, this message translates to:
  /// **'Moderate'**
  String get paceModerate;

  /// No description provided for @paceIntense.
  ///
  /// In en, this message translates to:
  /// **'Packed'**
  String get paceIntense;

  /// No description provided for @startDate.
  ///
  /// In en, this message translates to:
  /// **'Start date'**
  String get startDate;

  /// No description provided for @sharePlan.
  ///
  /// In en, this message translates to:
  /// **'Share'**
  String get sharePlan;

  /// No description provided for @downloadPdf.
  ///
  /// In en, this message translates to:
  /// **'Download PDF'**
  String get downloadPdf;

  /// No description provided for @voiceAsk.
  ///
  /// In en, this message translates to:
  /// **'Hold to speak'**
  String get voiceAsk;

  /// No description provided for @identifyTemple.
  ///
  /// In en, this message translates to:
  /// **'Identify a temple'**
  String get identifyTemple;

  /// No description provided for @quotaLeft.
  ///
  /// In en, this message translates to:
  /// **'{count} questions left today'**
  String quotaLeft(Object count);

  /// No description provided for @changeNumber.
  ///
  /// In en, this message translates to:
  /// **'Change number'**
  String get changeNumber;

  /// No description provided for @freeCancellation.
  ///
  /// In en, this message translates to:
  /// **'Free cancellation until {hours} h before check-in; {pct}% charge after that.'**
  String freeCancellation(Object pct, Object hours);

  /// No description provided for @nightsCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 night} other{{count} nights}}'**
  String nightsCount(int count);

  /// No description provided for @roomsLeft.
  ///
  /// In en, this message translates to:
  /// **'{count} left'**
  String roomsLeft(int count);

  /// No description provided for @nightFare.
  ///
  /// In en, this message translates to:
  /// **'night fare'**
  String get nightFare;

  /// No description provided for @driverAt.
  ///
  /// In en, this message translates to:
  /// **'Driver is {km} km away'**
  String driverAt(Object km);

  /// No description provided for @driverLocation.
  ///
  /// In en, this message translates to:
  /// **'Driver\'s live location'**
  String get driverLocation;

  /// No description provided for @eldersInGroup.
  ///
  /// In en, this message translates to:
  /// **'Elders in the group'**
  String get eldersInGroup;

  /// No description provided for @wheelchairAccess.
  ///
  /// In en, this message translates to:
  /// **'Wheelchair access'**
  String get wheelchairAccess;

  /// No description provided for @minTravel.
  ///
  /// In en, this message translates to:
  /// **'{minutes} min travel'**
  String minTravel(Object minutes);

  /// No description provided for @allBraj.
  ///
  /// In en, this message translates to:
  /// **'All Braj'**
  String get allBraj;

  /// No description provided for @dayN.
  ///
  /// In en, this message translates to:
  /// **'Day {n}'**
  String dayN(Object n);

  /// No description provided for @send.
  ///
  /// In en, this message translates to:
  /// **'Send'**
  String get send;

  /// No description provided for @happeningNow.
  ///
  /// In en, this message translates to:
  /// **'Happening now'**
  String get happeningNow;

  /// No description provided for @tagline.
  ///
  /// In en, this message translates to:
  /// **'Your tirth companion'**
  String get tagline;

  /// No description provided for @askGuide.
  ///
  /// In en, this message translates to:
  /// **'Ask Braj Guide anything…'**
  String get askGuide;

  /// No description provided for @aiVoice.
  ///
  /// In en, this message translates to:
  /// **'AI Voice'**
  String get aiVoice;

  /// No description provided for @quickAccess.
  ///
  /// In en, this message translates to:
  /// **'Quick access'**
  String get quickAccess;

  /// No description provided for @liveCrowd.
  ///
  /// In en, this message translates to:
  /// **'Live crowd'**
  String get liveCrowd;

  /// No description provided for @viewAll.
  ///
  /// In en, this message translates to:
  /// **'View all'**
  String get viewAll;

  /// No description provided for @brajDarshan.
  ///
  /// In en, this message translates to:
  /// **'Braj darshan'**
  String get brajDarshan;

  /// No description provided for @templeCount.
  ///
  /// In en, this message translates to:
  /// **'{count} temples'**
  String templeCount(int count);

  /// No description provided for @viewPlan.
  ///
  /// In en, this message translates to:
  /// **'View plan'**
  String get viewPlan;

  /// No description provided for @trains.
  ///
  /// In en, this message translates to:
  /// **'Trains'**
  String get trains;

  /// No description provided for @popularTemples.
  ///
  /// In en, this message translates to:
  /// **'Popular temples'**
  String get popularTemples;

  /// No description provided for @tripPlannerTitle.
  ///
  /// In en, this message translates to:
  /// **'AI Trip Planner'**
  String get tripPlannerTitle;

  /// No description provided for @tripPlannerBody.
  ///
  /// In en, this message translates to:
  /// **'Plan your Braj yatra with AI in seconds'**
  String get tripPlannerBody;

  /// No description provided for @trustAartiTitle.
  ///
  /// In en, this message translates to:
  /// **'Live aarti times'**
  String get trustAartiTitle;

  /// No description provided for @trustAartiBody.
  ///
  /// In en, this message translates to:
  /// **'From temple schedules'**
  String get trustAartiBody;

  /// No description provided for @trustPayTitle.
  ///
  /// In en, this message translates to:
  /// **'Secure booking'**
  String get trustPayTitle;

  /// No description provided for @trustPayBody.
  ///
  /// In en, this message translates to:
  /// **'Verified payments'**
  String get trustPayBody;

  /// No description provided for @trustSosTitle.
  ///
  /// In en, this message translates to:
  /// **'SOS 24×7'**
  String get trustSosTitle;

  /// No description provided for @trustSosBody.
  ///
  /// In en, this message translates to:
  /// **'Help is one tap away'**
  String get trustSosBody;

  /// No description provided for @staysSub.
  ///
  /// In en, this message translates to:
  /// **'Dharamshalas & hotels near temples'**
  String get staysSub;

  /// No description provided for @cabsSub.
  ///
  /// In en, this message translates to:
  /// **'Fixed fares between temples'**
  String get cabsSub;

  /// No description provided for @foodSub.
  ///
  /// In en, this message translates to:
  /// **'Pure veg & satvik meals'**
  String get foodSub;

  /// No description provided for @experiencesSub.
  ///
  /// In en, this message translates to:
  /// **'Boat rides, walks & aarti seats'**
  String get experiencesSub;

  /// No description provided for @bookSub.
  ///
  /// In en, this message translates to:
  /// **'Everything for your yatra, in one place'**
  String get bookSub;

  /// No description provided for @brandTagline.
  ///
  /// In en, this message translates to:
  /// **'हर तीर्थ, आपके साथ'**
  String get brandTagline;

  /// No description provided for @welcomeBack.
  ///
  /// In en, this message translates to:
  /// **'Welcome back'**
  String get welcomeBack;

  /// No description provided for @welcomeBackSub.
  ///
  /// In en, this message translates to:
  /// **'Login to continue your spiritual journey'**
  String get welcomeBackSub;

  /// No description provided for @registerTitle.
  ///
  /// In en, this message translates to:
  /// **'Welcome'**
  String get registerTitle;

  /// No description provided for @registerSub.
  ///
  /// In en, this message translates to:
  /// **'Create an account to begin your Braj journey'**
  String get registerSub;

  /// No description provided for @tabLogin.
  ///
  /// In en, this message translates to:
  /// **'Login'**
  String get tabLogin;

  /// No description provided for @tabRegister.
  ///
  /// In en, this message translates to:
  /// **'Register'**
  String get tabRegister;

  /// No description provided for @fullName.
  ///
  /// In en, this message translates to:
  /// **'Full name'**
  String get fullName;

  /// No description provided for @fullNameHint.
  ///
  /// In en, this message translates to:
  /// **'Your full name'**
  String get fullNameHint;

  /// No description provided for @nameRequired.
  ///
  /// In en, this message translates to:
  /// **'Please enter your full name'**
  String get nameRequired;

  /// No description provided for @guestSub.
  ///
  /// In en, this message translates to:
  /// **'Explore as guest (limited access)'**
  String get guestSub;

  /// No description provided for @orLabel.
  ///
  /// In en, this message translates to:
  /// **'OR'**
  String get orLabel;

  /// No description provided for @loginFooter.
  ///
  /// In en, this message translates to:
  /// **'Yatra, darshan, stays and safety — all in one app'**
  String get loginFooter;

  /// No description provided for @splashSub.
  ///
  /// In en, this message translates to:
  /// **'India\'s spiritual journey app'**
  String get splashSub;

  /// No description provided for @scan.
  ///
  /// In en, this message translates to:
  /// **'Scan'**
  String get scan;

  /// No description provided for @myTrips.
  ///
  /// In en, this message translates to:
  /// **'My Trips'**
  String get myTrips;

  /// No description provided for @aiGuide.
  ///
  /// In en, this message translates to:
  /// **'AI Guide'**
  String get aiGuide;

  /// No description provided for @newReel.
  ///
  /// In en, this message translates to:
  /// **'New reel'**
  String get newReel;

  /// No description provided for @recordVideo.
  ///
  /// In en, this message translates to:
  /// **'Record video'**
  String get recordVideo;

  /// No description provided for @chooseFromGallery.
  ///
  /// In en, this message translates to:
  /// **'Choose from gallery'**
  String get chooseFromGallery;

  /// No description provided for @reelComposerHint.
  ///
  /// In en, this message translates to:
  /// **'Share a darshan, aarti or parikrama moment (up to 90 seconds).'**
  String get reelComposerHint;

  /// No description provided for @writeCaption.
  ///
  /// In en, this message translates to:
  /// **'Write a caption… use #hashtags'**
  String get writeCaption;

  /// No description provided for @tagTemple.
  ///
  /// In en, this message translates to:
  /// **'Tag a temple'**
  String get tagTemple;

  /// No description provided for @noTemple.
  ///
  /// In en, this message translates to:
  /// **'No temple'**
  String get noTemple;

  /// No description provided for @cover.
  ///
  /// In en, this message translates to:
  /// **'Cover'**
  String get cover;

  /// No description provided for @chooseCover.
  ///
  /// In en, this message translates to:
  /// **'Choose cover'**
  String get chooseCover;

  /// No description provided for @changeVideo.
  ///
  /// In en, this message translates to:
  /// **'Change video'**
  String get changeVideo;

  /// No description provided for @shareReel.
  ///
  /// In en, this message translates to:
  /// **'Share'**
  String get shareReel;

  /// No description provided for @uploadingReel.
  ///
  /// In en, this message translates to:
  /// **'Uploading {percent}%'**
  String uploadingReel(int percent);

  /// No description provided for @reelProcessing.
  ///
  /// In en, this message translates to:
  /// **'Posted! Your reel will appear in the feed once it has processed.'**
  String get reelProcessing;

  /// No description provided for @myReels.
  ///
  /// In en, this message translates to:
  /// **'My reels'**
  String get myReels;

  /// No description provided for @reelsCount.
  ///
  /// In en, this message translates to:
  /// **'Reels'**
  String get reelsCount;

  /// No description provided for @followers.
  ///
  /// In en, this message translates to:
  /// **'Followers'**
  String get followers;

  /// No description provided for @following.
  ///
  /// In en, this message translates to:
  /// **'Following'**
  String get following;

  /// No description provided for @editReel.
  ///
  /// In en, this message translates to:
  /// **'Edit reel'**
  String get editReel;

  /// No description provided for @deleteReel.
  ///
  /// In en, this message translates to:
  /// **'Delete reel'**
  String get deleteReel;

  /// No description provided for @deleteReelConfirm.
  ///
  /// In en, this message translates to:
  /// **'Delete this reel? This cannot be undone.'**
  String get deleteReelConfirm;

  /// No description provided for @reelStatus_processing.
  ///
  /// In en, this message translates to:
  /// **'Processing'**
  String get reelStatus_processing;

  /// No description provided for @reelStatus_removed.
  ///
  /// In en, this message translates to:
  /// **'Removed'**
  String get reelStatus_removed;

  /// No description provided for @reelStatus_pending.
  ///
  /// In en, this message translates to:
  /// **'Under review'**
  String get reelStatus_pending;

  /// No description provided for @videoTooLong.
  ///
  /// In en, this message translates to:
  /// **'Please pick a video of 90 seconds or less.'**
  String get videoTooLong;

  /// No description provided for @videoTooBig.
  ///
  /// In en, this message translates to:
  /// **'This video is too large (max 100 MB).'**
  String get videoTooBig;

  /// No description provided for @forYou.
  ///
  /// In en, this message translates to:
  /// **'For you'**
  String get forYou;

  /// No description provided for @noReelsYet.
  ///
  /// In en, this message translates to:
  /// **'No reels yet. Share your first darshan moment!'**
  String get noReelsYet;

  /// No description provided for @reelSaved.
  ///
  /// In en, this message translates to:
  /// **'Reel updated'**
  String get reelSaved;

  /// No description provided for @editVideo.
  ///
  /// In en, this message translates to:
  /// **'Edit video'**
  String get editVideo;

  /// No description provided for @editVideoHint.
  ///
  /// In en, this message translates to:
  /// **'Trim, filters, speed, text, sound'**
  String get editVideoHint;

  /// No description provided for @reset.
  ///
  /// In en, this message translates to:
  /// **'Reset'**
  String get reset;

  /// No description provided for @trim.
  ///
  /// In en, this message translates to:
  /// **'Trim'**
  String get trim;

  /// No description provided for @filters.
  ///
  /// In en, this message translates to:
  /// **'Filters'**
  String get filters;

  /// No description provided for @speed.
  ///
  /// In en, this message translates to:
  /// **'Speed'**
  String get speed;

  /// No description provided for @text.
  ///
  /// In en, this message translates to:
  /// **'Text'**
  String get text;

  /// No description provided for @sound.
  ///
  /// In en, this message translates to:
  /// **'Sound'**
  String get sound;

  /// No description provided for @trimHint.
  ///
  /// In en, this message translates to:
  /// **'Drag the ends to choose the part to share'**
  String get trimHint;

  /// No description provided for @addText.
  ///
  /// In en, this message translates to:
  /// **'Add text'**
  String get addText;

  /// No description provided for @textHint.
  ///
  /// In en, this message translates to:
  /// **'Drag text to move it · tap to edit'**
  String get textHint;

  /// No description provided for @originalSound.
  ///
  /// In en, this message translates to:
  /// **'Original sound'**
  String get originalSound;

  /// No description provided for @typeSomething.
  ///
  /// In en, this message translates to:
  /// **'Type something…'**
  String get typeSomething;

  /// No description provided for @textPlain.
  ///
  /// In en, this message translates to:
  /// **'Plain'**
  String get textPlain;

  /// No description provided for @textBox.
  ///
  /// In en, this message translates to:
  /// **'Box'**
  String get textBox;

  /// No description provided for @textOutline.
  ///
  /// In en, this message translates to:
  /// **'Outline'**
  String get textOutline;

  /// No description provided for @filter_none.
  ///
  /// In en, this message translates to:
  /// **'Normal'**
  String get filter_none;

  /// No description provided for @filter_warm.
  ///
  /// In en, this message translates to:
  /// **'Warm'**
  String get filter_warm;

  /// No description provided for @filter_cool.
  ///
  /// In en, this message translates to:
  /// **'Cool'**
  String get filter_cool;

  /// No description provided for @filter_vivid.
  ///
  /// In en, this message translates to:
  /// **'Vivid'**
  String get filter_vivid;

  /// No description provided for @filter_mono.
  ///
  /// In en, this message translates to:
  /// **'Mono'**
  String get filter_mono;

  /// No description provided for @filter_sepia.
  ///
  /// In en, this message translates to:
  /// **'Sepia'**
  String get filter_sepia;

  /// No description provided for @filter_fade.
  ///
  /// In en, this message translates to:
  /// **'Fade'**
  String get filter_fade;

  /// No description provided for @filter_saffron.
  ///
  /// In en, this message translates to:
  /// **'Saffron'**
  String get filter_saffron;

  /// No description provided for @followingEmpty.
  ///
  /// In en, this message translates to:
  /// **'Follow creators to see their reels here'**
  String get followingEmpty;

  /// No description provided for @follow.
  ///
  /// In en, this message translates to:
  /// **'Follow'**
  String get follow;

  /// No description provided for @followingButton.
  ///
  /// In en, this message translates to:
  /// **'Following'**
  String get followingButton;

  /// No description provided for @viewProfile.
  ///
  /// In en, this message translates to:
  /// **'View profile'**
  String get viewProfile;

  /// No description provided for @report.
  ///
  /// In en, this message translates to:
  /// **'Report'**
  String get report;

  /// No description provided for @reportWhy.
  ///
  /// In en, this message translates to:
  /// **'Why are you reporting this reel?'**
  String get reportWhy;

  /// No description provided for @reportSpam.
  ///
  /// In en, this message translates to:
  /// **'Spam'**
  String get reportSpam;

  /// No description provided for @reportNudity.
  ///
  /// In en, this message translates to:
  /// **'Nudity or sexual content'**
  String get reportNudity;

  /// No description provided for @reportHate.
  ///
  /// In en, this message translates to:
  /// **'Hate speech'**
  String get reportHate;

  /// No description provided for @reportViolence.
  ///
  /// In en, this message translates to:
  /// **'Violence'**
  String get reportViolence;

  /// No description provided for @reportHarassment.
  ///
  /// In en, this message translates to:
  /// **'Bullying or harassment'**
  String get reportHarassment;

  /// No description provided for @reportMisinformation.
  ///
  /// In en, this message translates to:
  /// **'False information'**
  String get reportMisinformation;

  /// No description provided for @reportScam.
  ///
  /// In en, this message translates to:
  /// **'Scam or fraud'**
  String get reportScam;

  /// No description provided for @reportOther.
  ///
  /// In en, this message translates to:
  /// **'Something else'**
  String get reportOther;

  /// No description provided for @reportThanks.
  ///
  /// In en, this message translates to:
  /// **'Thanks — our team will review it'**
  String get reportThanks;

  /// No description provided for @share.
  ///
  /// In en, this message translates to:
  /// **'Share'**
  String get share;

  /// No description provided for @noCommentsYet.
  ///
  /// In en, this message translates to:
  /// **'No comments yet. Start the conversation.'**
  String get noCommentsYet;

  /// No description provided for @commentPosted.
  ///
  /// In en, this message translates to:
  /// **'Comment posted — it appears once approved'**
  String get commentPosted;

  /// No description provided for @reply.
  ///
  /// In en, this message translates to:
  /// **'Reply'**
  String get reply;

  /// No description provided for @justNow.
  ///
  /// In en, this message translates to:
  /// **'now'**
  String get justNow;

  /// No description provided for @replyingTo.
  ///
  /// In en, this message translates to:
  /// **'Replying to {name}'**
  String replyingTo(String name);

  /// No description provided for @originalAudio.
  ///
  /// In en, this message translates to:
  /// **'Original audio'**
  String get originalAudio;

  /// No description provided for @aartiDisclaimer.
  ///
  /// In en, this message translates to:
  /// **'Aarti and darshan times come from temple schedules and can change on festival days.'**
  String get aartiDisclaimer;

  /// No description provided for @addMember.
  ///
  /// In en, this message translates to:
  /// **'Add member'**
  String get addMember;

  /// No description provided for @addMembersFirst.
  ///
  /// In en, this message translates to:
  /// **'Add at least one member of your group'**
  String get addMembersFirst;

  /// No description provided for @addStop.
  ///
  /// In en, this message translates to:
  /// **'Add a stop'**
  String get addStop;

  /// No description provided for @address.
  ///
  /// In en, this message translates to:
  /// **'Address'**
  String get address;

  /// No description provided for @age.
  ///
  /// In en, this message translates to:
  /// **'Age'**
  String get age;

  /// No description provided for @arrivalTime.
  ///
  /// In en, this message translates to:
  /// **'Arrival (day 1)'**
  String get arrivalTime;

  /// No description provided for @arrivingBy.
  ///
  /// In en, this message translates to:
  /// **'Arriving by'**
  String get arrivingBy;

  /// No description provided for @checkInTime.
  ///
  /// In en, this message translates to:
  /// **'Check-in time'**
  String get checkInTime;

  /// No description provided for @cities.
  ///
  /// In en, this message translates to:
  /// **'Cities'**
  String get cities;

  /// No description provided for @createAiPlan.
  ///
  /// In en, this message translates to:
  /// **'Create AI plan'**
  String get createAiPlan;

  /// No description provided for @createCustomPlan.
  ///
  /// In en, this message translates to:
  /// **'Create my plan'**
  String get createCustomPlan;

  /// No description provided for @customEmpty.
  ///
  /// In en, this message translates to:
  /// **'Add your own stops for each day: temples, meals, shopping, anything.'**
  String get customEmpty;

  /// No description provided for @customNeedsStops.
  ///
  /// In en, this message translates to:
  /// **'Add at least one stop, a stay or travel details for a custom plan'**
  String get customNeedsStops;

  /// No description provided for @departureTime.
  ///
  /// In en, this message translates to:
  /// **'Departure (last day)'**
  String get departureTime;

  /// No description provided for @editMember.
  ///
  /// In en, this message translates to:
  /// **'Edit member'**
  String get editMember;

  /// No description provided for @estCost.
  ///
  /// In en, this message translates to:
  /// **'Est. cost'**
  String get estCost;

  /// No description provided for @gettingAround.
  ///
  /// In en, this message translates to:
  /// **'Getting around'**
  String get gettingAround;

  /// No description provided for @groupName.
  ///
  /// In en, this message translates to:
  /// **'Group name'**
  String get groupName;

  /// No description provided for @groupNameHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Sharma parivar yatra'**
  String get groupNameHint;

  /// No description provided for @interest_aarti.
  ///
  /// In en, this message translates to:
  /// **'Aarti'**
  String get interest_aarti;

  /// No description provided for @interest_festivals.
  ///
  /// In en, this message translates to:
  /// **'Festivals'**
  String get interest_festivals;

  /// No description provided for @interest_food.
  ///
  /// In en, this message translates to:
  /// **'Food'**
  String get interest_food;

  /// No description provided for @interest_ghats.
  ///
  /// In en, this message translates to:
  /// **'Ghats'**
  String get interest_ghats;

  /// No description provided for @interest_parikrama.
  ///
  /// In en, this message translates to:
  /// **'Parikrama'**
  String get interest_parikrama;

  /// No description provided for @interest_shopping.
  ///
  /// In en, this message translates to:
  /// **'Shopping'**
  String get interest_shopping;

  /// No description provided for @interest_temples.
  ///
  /// In en, this message translates to:
  /// **'Temples'**
  String get interest_temples;

  /// No description provided for @interests.
  ///
  /// In en, this message translates to:
  /// **'Interests'**
  String get interests;

  /// No description provided for @invalidAge.
  ///
  /// In en, this message translates to:
  /// **'Enter an age from 0 to 120'**
  String get invalidAge;

  /// No description provided for @invalidPhone.
  ///
  /// In en, this message translates to:
  /// **'Enter a 10-digit mobile number'**
  String get invalidPhone;

  /// No description provided for @modeAi.
  ///
  /// In en, this message translates to:
  /// **'AI plan'**
  String get modeAi;

  /// No description provided for @modeCustom.
  ///
  /// In en, this message translates to:
  /// **'Custom plan'**
  String get modeCustom;

  /// No description provided for @modeAiHint.
  ///
  /// In en, this message translates to:
  /// **'We build each day around real aarti times, rest and travel, then add your own stops.'**
  String get modeAiHint;

  /// No description provided for @modeCustomHint.
  ///
  /// In en, this message translates to:
  /// **'Only what you add: your stops, stay and travel, nicely laid out.'**
  String get modeCustomHint;

  /// No description provided for @noteOptional.
  ///
  /// In en, this message translates to:
  /// **'Note (optional)'**
  String get noteOptional;

  /// No description provided for @notesForGroup.
  ///
  /// In en, this message translates to:
  /// **'Notes for the group'**
  String get notesForGroup;

  /// No description provided for @notesHint.
  ///
  /// In en, this message translates to:
  /// **'Things to carry, meeting point, dress code…'**
  String get notesHint;

  /// No description provided for @ownStay.
  ///
  /// In en, this message translates to:
  /// **'Or your own stay'**
  String get ownStay;

  /// No description provided for @ownStayHint.
  ///
  /// In en, this message translates to:
  /// **'Dharamshala, ashram or hotel name'**
  String get ownStayHint;

  /// No description provided for @ownStopsHint.
  ///
  /// In en, this message translates to:
  /// **'Optional: add places you must visit; we fit them into the plan.'**
  String get ownStopsHint;

  /// No description provided for @phoneOptional.
  ///
  /// In en, this message translates to:
  /// **'Phone (optional)'**
  String get phoneOptional;

  /// No description provided for @pickHotel.
  ///
  /// In en, this message translates to:
  /// **'Pick a TirthNow stay'**
  String get pickHotel;

  /// No description provided for @pilgrims.
  ///
  /// In en, this message translates to:
  /// **'Pilgrims'**
  String get pilgrims;

  /// No description provided for @planAnother.
  ///
  /// In en, this message translates to:
  /// **'Edit or plan another trip'**
  String get planAnother;

  /// No description provided for @planYourYatra.
  ///
  /// In en, this message translates to:
  /// **'Plan your yatra'**
  String get planYourYatra;

  /// No description provided for @plannerHeroHint.
  ///
  /// In en, this message translates to:
  /// **'Solo, family or a whole group: stays, travel and darshan in one plan.'**
  String get plannerHeroHint;

  /// No description provided for @planningStyle.
  ///
  /// In en, this message translates to:
  /// **'Planning style'**
  String get planningStyle;

  /// No description provided for @pricePerNight.
  ///
  /// In en, this message translates to:
  /// **'Price / room / night'**
  String get pricePerNight;

  /// No description provided for @required.
  ///
  /// In en, this message translates to:
  /// **'Required'**
  String get required;

  /// No description provided for @role_child.
  ///
  /// In en, this message translates to:
  /// **'Child'**
  String get role_child;

  /// No description provided for @role_elder.
  ///
  /// In en, this message translates to:
  /// **'Elder'**
  String get role_elder;

  /// No description provided for @role_member.
  ///
  /// In en, this message translates to:
  /// **'Member'**
  String get role_member;

  /// No description provided for @role_organiser.
  ///
  /// In en, this message translates to:
  /// **'Organiser'**
  String get role_organiser;

  /// No description provided for @stay.
  ///
  /// In en, this message translates to:
  /// **'Stay'**
  String get stay;

  /// No description provided for @stayOff.
  ///
  /// In en, this message translates to:
  /// **'We won\'t add a stay to the plan.'**
  String get stayOff;

  /// No description provided for @stopTitle.
  ///
  /// In en, this message translates to:
  /// **'What'**
  String get stopTitle;

  /// No description provided for @stopTitleHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Lassi at Loi Bazaar'**
  String get stopTitleHint;

  /// No description provided for @templeOptional.
  ///
  /// In en, this message translates to:
  /// **'Temple (optional)'**
  String get templeOptional;

  /// No description provided for @ticketDetails.
  ///
  /// In en, this message translates to:
  /// **'Ticket details'**
  String get ticketDetails;

  /// No description provided for @ticketDetailsHint.
  ///
  /// In en, this message translates to:
  /// **'Train no., PNR, coach…'**
  String get ticketDetailsHint;

  /// No description provided for @time.
  ///
  /// In en, this message translates to:
  /// **'Time'**
  String get time;

  /// No description provided for @travelDetails.
  ///
  /// In en, this message translates to:
  /// **'Travel'**
  String get travelDetails;

  /// No description provided for @travelOff.
  ///
  /// In en, this message translates to:
  /// **'We won\'t add arrival or departure.'**
  String get travelOff;

  /// No description provided for @travel_bus.
  ///
  /// In en, this message translates to:
  /// **'Bus'**
  String get travel_bus;

  /// No description provided for @travel_cab.
  ///
  /// In en, this message translates to:
  /// **'Cab'**
  String get travel_cab;

  /// No description provided for @travel_car.
  ///
  /// In en, this message translates to:
  /// **'Car'**
  String get travel_car;

  /// No description provided for @travel_e_rickshaw.
  ///
  /// In en, this message translates to:
  /// **'E-rickshaw'**
  String get travel_e_rickshaw;

  /// No description provided for @travel_flight.
  ///
  /// In en, this message translates to:
  /// **'Flight'**
  String get travel_flight;

  /// No description provided for @travel_own_vehicle.
  ///
  /// In en, this message translates to:
  /// **'Own vehicle'**
  String get travel_own_vehicle;

  /// No description provided for @travel_train.
  ///
  /// In en, this message translates to:
  /// **'Train'**
  String get travel_train;

  /// No description provided for @travel_walk.
  ///
  /// In en, this message translates to:
  /// **'On foot'**
  String get travel_walk;

  /// No description provided for @travellingFrom.
  ///
  /// In en, this message translates to:
  /// **'Travelling from'**
  String get travellingFrom;

  /// No description provided for @tripFamily.
  ///
  /// In en, this message translates to:
  /// **'Family'**
  String get tripFamily;

  /// No description provided for @tripGroup.
  ///
  /// In en, this message translates to:
  /// **'Group'**
  String get tripGroup;

  /// No description provided for @tripSolo.
  ///
  /// In en, this message translates to:
  /// **'Solo'**
  String get tripSolo;

  /// No description provided for @whenWhere.
  ///
  /// In en, this message translates to:
  /// **'When & where'**
  String get whenWhere;

  /// No description provided for @whoIsTravelling.
  ///
  /// In en, this message translates to:
  /// **'Who\'s travelling'**
  String get whoIsTravelling;

  /// No description provided for @yatraGroup.
  ///
  /// In en, this message translates to:
  /// **'Yatra group'**
  String get yatraGroup;

  /// No description provided for @yourItinerary.
  ///
  /// In en, this message translates to:
  /// **'Your itinerary'**
  String get yourItinerary;

  /// No description provided for @yourOwnStops.
  ///
  /// In en, this message translates to:
  /// **'Your own stops'**
  String get yourOwnStops;

  /// No description provided for @yourYatra.
  ///
  /// In en, this message translates to:
  /// **'Your yatra'**
  String get yourYatra;

  /// No description provided for @ageYears.
  ///
  /// In en, this message translates to:
  /// **'{age} yrs'**
  String ageYears(int age);

  /// No description provided for @membersCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{No members yet} =1{1 member} other{{count} members}}'**
  String membersCount(int count);

  /// No description provided for @night.
  ///
  /// In en, this message translates to:
  /// **'night'**
  String get night;

  /// No description provided for @reelsFromBraj.
  ///
  /// In en, this message translates to:
  /// **'Reels from Braj'**
  String get reelsFromBraj;

  /// No description provided for @goodMorning.
  ///
  /// In en, this message translates to:
  /// **'Good morning · plan your darshan'**
  String get goodMorning;

  /// No description provided for @goodAfternoon.
  ///
  /// In en, this message translates to:
  /// **'Good afternoon · rest, then evening aarti'**
  String get goodAfternoon;

  /// No description provided for @goodEvening.
  ///
  /// In en, this message translates to:
  /// **'Good evening · time for sandhya aarti'**
  String get goodEvening;

  /// No description provided for @radheRadhe.
  ///
  /// In en, this message translates to:
  /// **'Radhe Radhe'**
  String get radheRadhe;

  /// No description provided for @slide1Title.
  ///
  /// In en, this message translates to:
  /// **'Prem Mandir by night'**
  String get slide1Title;

  /// No description provided for @slide1Sub.
  ///
  /// In en, this message translates to:
  /// **'Lights, marble and the musical fountain'**
  String get slide1Sub;

  /// No description provided for @slide2Title.
  ///
  /// In en, this message translates to:
  /// **'Plan a family or group yatra'**
  String get slide2Title;

  /// No description provided for @slide2Sub.
  ///
  /// In en, this message translates to:
  /// **'Members, stays, travel and a beautiful PDF'**
  String get slide2Sub;

  /// No description provided for @slide3Title.
  ///
  /// In en, this message translates to:
  /// **'Watch reels from Braj'**
  String get slide3Title;

  /// No description provided for @slide3Sub.
  ///
  /// In en, this message translates to:
  /// **'Darshan, aarti and yatra moments'**
  String get slide3Sub;

  /// No description provided for @explore.
  ///
  /// In en, this message translates to:
  /// **'Explore'**
  String get explore;

  /// No description provided for @planGroupYatra.
  ///
  /// In en, this message translates to:
  /// **'Plan a group yatra'**
  String get planGroupYatra;

  /// No description provided for @planGroupYatraSub.
  ///
  /// In en, this message translates to:
  /// **'Add your group, stay and travel. Get a day-by-day plan around real aarti times.'**
  String get planGroupYatraSub;

  /// No description provided for @featMembers.
  ///
  /// In en, this message translates to:
  /// **'Members'**
  String get featMembers;

  /// No description provided for @aartiAudioNote.
  ///
  /// In en, this message translates to:
  /// **'Recitation audio (demo voice). Lyrics are traditional.'**
  String get aartiAudioNote;

  /// No description provided for @aartiIntro.
  ///
  /// In en, this message translates to:
  /// **'Read the full aarti and listen along, temple by temple.'**
  String get aartiIntro;

  /// No description provided for @aartiTitle.
  ///
  /// In en, this message translates to:
  /// **'Aarti'**
  String get aartiTitle;

  /// No description provided for @changePhoto.
  ///
  /// In en, this message translates to:
  /// **'Change photo'**
  String get changePhoto;

  /// No description provided for @createFamilyGroup.
  ///
  /// In en, this message translates to:
  /// **'Create family group'**
  String get createFamilyGroup;

  /// No description provided for @createGroup.
  ///
  /// In en, this message translates to:
  /// **'Create group'**
  String get createGroup;

  /// No description provided for @createProfile.
  ///
  /// In en, this message translates to:
  /// **'Create Profile'**
  String get createProfile;

  /// No description provided for @creatorsToFollow.
  ///
  /// In en, this message translates to:
  /// **'Creators to follow'**
  String get creatorsToFollow;

  /// No description provided for @deleteGroup.
  ///
  /// In en, this message translates to:
  /// **'Delete group'**
  String get deleteGroup;

  /// No description provided for @deleteGroupConfirm.
  ///
  /// In en, this message translates to:
  /// **'This removes the group for everyone. Continue?'**
  String get deleteGroupConfirm;

  /// No description provided for @demo.
  ///
  /// In en, this message translates to:
  /// **'DEMO'**
  String get demo;

  /// No description provided for @demoPeopleNote.
  ///
  /// In en, this message translates to:
  /// **'Sample profiles for the demo. They are not real visitors.'**
  String get demoPeopleNote;

  /// No description provided for @editProfile.
  ///
  /// In en, this message translates to:
  /// **'Your profile'**
  String get editProfile;

  /// No description provided for @endTrip.
  ///
  /// In en, this message translates to:
  /// **'End trip'**
  String get endTrip;

  /// No description provided for @endTripConfirm.
  ///
  /// In en, this message translates to:
  /// **'Mark this pilgrimage as completed? Location sharing will stop.'**
  String get endTripConfirm;

  /// No description provided for @enterYourName.
  ///
  /// In en, this message translates to:
  /// **'Please enter your name'**
  String get enterYourName;

  /// No description provided for @familyNameHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Sharma parivar'**
  String get familyNameHint;

  /// No description provided for @familyPrivacy.
  ///
  /// In en, this message translates to:
  /// **'Only people you invite with the code can join. Your location is visible only while you are on a trip AND you have turned sharing on for this group. You can stop at any time.'**
  String get familyPrivacy;

  /// No description provided for @familyTracking.
  ///
  /// In en, this message translates to:
  /// **'Family tracking'**
  String get familyTracking;

  /// No description provided for @familyTrackingSub.
  ///
  /// In en, this message translates to:
  /// **'Let family at home follow your trip, with your permission'**
  String get familyTrackingSub;

  /// No description provided for @invite.
  ///
  /// In en, this message translates to:
  /// **'Invite'**
  String get invite;

  /// No description provided for @inviteFamilyHint.
  ///
  /// In en, this message translates to:
  /// **'Share the join code with family so they can follow your trip.'**
  String get inviteFamilyHint;

  /// No description provided for @joinCode.
  ///
  /// In en, this message translates to:
  /// **'Join code'**
  String get joinCode;

  /// No description provided for @joinFamilyGroup.
  ///
  /// In en, this message translates to:
  /// **'Join a family group'**
  String get joinFamilyGroup;

  /// No description provided for @joinWithCode.
  ///
  /// In en, this message translates to:
  /// **'Join with code'**
  String get joinWithCode;

  /// No description provided for @joinedGroup.
  ///
  /// In en, this message translates to:
  /// **'You joined the group. Turn on sharing if you want them to see you.'**
  String get joinedGroup;

  /// No description provided for @leaveGroup.
  ///
  /// In en, this message translates to:
  /// **'Leave group'**
  String get leaveGroup;

  /// No description provided for @leaveGroupConfirm.
  ///
  /// In en, this message translates to:
  /// **'Leave this family group?'**
  String get leaveGroupConfirm;

  /// No description provided for @listening.
  ///
  /// In en, this message translates to:
  /// **'Listening… speak now'**
  String get listening;

  /// No description provided for @liveLyricsAudio.
  ///
  /// In en, this message translates to:
  /// **'Live · Lyrics · Audio'**
  String get liveLyricsAudio;

  /// No description provided for @lyricsAudio.
  ///
  /// In en, this message translates to:
  /// **'Lyrics + audio'**
  String get lyricsAudio;

  /// No description provided for @micPermission.
  ///
  /// In en, this message translates to:
  /// **'Allow microphone access to ask by voice'**
  String get micPermission;

  /// No description provided for @myBookingsSub.
  ///
  /// In en, this message translates to:
  /// **'Stays, food, cabs and experiences you booked'**
  String get myBookingsSub;

  /// No description provided for @myTrip.
  ///
  /// In en, this message translates to:
  /// **'My Trip'**
  String get myTrip;

  /// No description provided for @noActiveTrip.
  ///
  /// In en, this message translates to:
  /// **'No trip in progress'**
  String get noActiveTrip;

  /// No description provided for @noFamilyGroups.
  ///
  /// In en, this message translates to:
  /// **'No family groups yet. Create one or join with a code.'**
  String get noFamilyGroups;

  /// No description provided for @noPastTrips.
  ///
  /// In en, this message translates to:
  /// **'Your completed trips will appear here.'**
  String get noPastTrips;

  /// No description provided for @notOnTrip.
  ///
  /// In en, this message translates to:
  /// **'Not on a trip'**
  String get notOnTrip;

  /// No description provided for @ok.
  ///
  /// In en, this message translates to:
  /// **'OK'**
  String get ok;

  /// No description provided for @onTrip.
  ///
  /// In en, this message translates to:
  /// **'ON TRIP'**
  String get onTrip;

  /// No description provided for @onTripNotSharing.
  ///
  /// In en, this message translates to:
  /// **'Location not shared'**
  String get onTripNotSharing;

  /// No description provided for @openInMaps.
  ///
  /// In en, this message translates to:
  /// **'Open in Maps'**
  String get openInMaps;

  /// No description provided for @pause.
  ///
  /// In en, this message translates to:
  /// **'Pause'**
  String get pause;

  /// No description provided for @people.
  ///
  /// In en, this message translates to:
  /// **'People'**
  String get people;

  /// No description provided for @pilgrimsInBraj.
  ///
  /// In en, this message translates to:
  /// **'Pilgrims in Braj'**
  String get pilgrimsInBraj;

  /// No description provided for @play.
  ///
  /// In en, this message translates to:
  /// **'Play'**
  String get play;

  /// No description provided for @poojaAarti.
  ///
  /// In en, this message translates to:
  /// **'Aarti'**
  String get poojaAarti;

  /// No description provided for @poojaAll.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get poojaAll;

  /// No description provided for @poojaDeity.
  ///
  /// In en, this message translates to:
  /// **'Thakur ji'**
  String get poojaDeity;

  /// No description provided for @poojaIntro.
  ///
  /// In en, this message translates to:
  /// **'Essentials for darshan and pooja in Braj.'**
  String get poojaIntro;

  /// No description provided for @poojaItems.
  ///
  /// In en, this message translates to:
  /// **'Temple Store'**
  String get poojaItems;

  /// No description provided for @poojaOffering.
  ///
  /// In en, this message translates to:
  /// **'Offerings'**
  String get poojaOffering;

  /// No description provided for @poojaSoon.
  ///
  /// In en, this message translates to:
  /// **'Ordering from local shops is coming soon.'**
  String get poojaSoon;

  /// No description provided for @poojaTilak.
  ///
  /// In en, this message translates to:
  /// **'Tilak & mala'**
  String get poojaTilak;

  /// No description provided for @profilePublicNote.
  ///
  /// In en, this message translates to:
  /// **'Your name and photo appear on your reels and comments.'**
  String get profilePublicNote;

  /// No description provided for @profileSaved.
  ///
  /// In en, this message translates to:
  /// **'Profile saved'**
  String get profileSaved;

  /// No description provided for @repeat.
  ///
  /// In en, this message translates to:
  /// **'Repeat'**
  String get repeat;

  /// No description provided for @replay.
  ///
  /// In en, this message translates to:
  /// **'Replay'**
  String get replay;

  /// No description provided for @shareConsent.
  ///
  /// In en, this message translates to:
  /// **'Only family you choose can see it. Stop any time.'**
  String get shareConsent;

  /// No description provided for @shareLiveLocation.
  ///
  /// In en, this message translates to:
  /// **'Share live location with family'**
  String get shareLiveLocation;

  /// No description provided for @shareWhatsApp.
  ///
  /// In en, this message translates to:
  /// **'WhatsApp'**
  String get shareWhatsApp;

  /// No description provided for @shareWithGroup.
  ///
  /// In en, this message translates to:
  /// **'Share my trip location'**
  String get shareWithGroup;

  /// No description provided for @shareWithGroupSub.
  ///
  /// In en, this message translates to:
  /// **'Visible to this group only while you are on a trip'**
  String get shareWithGroupSub;

  /// No description provided for @sharingOn.
  ///
  /// In en, this message translates to:
  /// **'Sharing live location'**
  String get sharingOn;

  /// No description provided for @sharingPaused.
  ///
  /// In en, this message translates to:
  /// **'Location sharing paused'**
  String get sharingPaused;

  /// No description provided for @speaking.
  ///
  /// In en, this message translates to:
  /// **'Speaking the answer…'**
  String get speaking;

  /// No description provided for @speakingPaused.
  ///
  /// In en, this message translates to:
  /// **'Paused'**
  String get speakingPaused;

  /// No description provided for @startPilgrimage.
  ///
  /// In en, this message translates to:
  /// **'Start your pilgrimage'**
  String get startPilgrimage;

  /// No description provided for @startPilgrimageSub.
  ///
  /// In en, this message translates to:
  /// **'We\'ll notify you, and your family can follow along if you allow it.'**
  String get startPilgrimageSub;

  /// No description provided for @startTrip.
  ///
  /// In en, this message translates to:
  /// **'Start trip'**
  String get startTrip;

  /// No description provided for @stop.
  ///
  /// In en, this message translates to:
  /// **'Stop'**
  String get stop;

  /// No description provided for @stopListening.
  ///
  /// In en, this message translates to:
  /// **'Done'**
  String get stopListening;

  /// No description provided for @textSize.
  ///
  /// In en, this message translates to:
  /// **'Text size'**
  String get textSize;

  /// No description provided for @tripEndedMsg.
  ///
  /// In en, this message translates to:
  /// **'Your pilgrimage has been completed. Thank you for travelling with TirthNow!'**
  String get tripEndedMsg;

  /// No description provided for @tripHistory.
  ///
  /// In en, this message translates to:
  /// **'Trip history'**
  String get tripHistory;

  /// No description provided for @tripInProgress.
  ///
  /// In en, this message translates to:
  /// **'Trip In Progress'**
  String get tripInProgress;

  /// No description provided for @tripStartedMsg.
  ///
  /// In en, this message translates to:
  /// **'Your TirthNow pilgrimage has started. We wish you a safe and blessed journey!'**
  String get tripStartedMsg;

  /// No description provided for @tripTitleHint.
  ///
  /// In en, this message translates to:
  /// **'Trip name (e.g. Vrindavan yatra)'**
  String get tripTitleHint;

  /// No description provided for @uploadReel.
  ///
  /// In en, this message translates to:
  /// **'Upload a reel'**
  String get uploadReel;

  /// No description provided for @voiceLangApp.
  ///
  /// In en, this message translates to:
  /// **'Speak in app language'**
  String get voiceLangApp;

  /// No description provided for @voiceReplies.
  ///
  /// In en, this message translates to:
  /// **'Spoken replies'**
  String get voiceReplies;

  /// No description provided for @voiceSettings.
  ///
  /// In en, this message translates to:
  /// **'Voice'**
  String get voiceSettings;

  /// No description provided for @atPlace.
  ///
  /// In en, this message translates to:
  /// **'At {place}'**
  String atPlace(String place);

  /// No description provided for @fromPlace.
  ///
  /// In en, this message translates to:
  /// **'From: {place}'**
  String fromPlace(String place);

  /// No description provided for @lastUpdated.
  ///
  /// In en, this message translates to:
  /// **'Updated {time}'**
  String lastUpdated(String time);

  /// No description provided for @startedAt.
  ///
  /// In en, this message translates to:
  /// **'Started: {time}'**
  String startedAt(String time);

  /// No description provided for @familyInvite.
  ///
  /// In en, this message translates to:
  /// **'Join our TirthNow family group \"{name}\" to follow our pilgrimage 🙏 Open TirthNow → My Trips → Family tracking → Join with code: {code}'**
  String familyInvite(String name, String code);

  /// No description provided for @yatraJourney.
  ///
  /// In en, this message translates to:
  /// **'Yatra Journey'**
  String get yatraJourney;

  /// No description provided for @yatraJourneySub.
  ///
  /// In en, this message translates to:
  /// **'Ride a Braj yatra stop by stop with a voice guide, fares and darshan tips'**
  String get yatraJourneySub;

  /// No description provided for @rideYatraJourney.
  ///
  /// In en, this message translates to:
  /// **'Ride the Yatra Journey'**
  String get rideYatraJourney;

  /// No description provided for @journeyStop.
  ///
  /// In en, this message translates to:
  /// **'Stop'**
  String get journeyStop;

  /// No description provided for @journeyKm.
  ///
  /// In en, this message translates to:
  /// **'km'**
  String get journeyKm;

  /// No description provided for @journeyFare.
  ///
  /// In en, this message translates to:
  /// **'Fare (est.)'**
  String get journeyFare;

  /// No description provided for @journeySpeed.
  ///
  /// In en, this message translates to:
  /// **'Speed'**
  String get journeySpeed;

  /// No description provided for @journeyPrev.
  ///
  /// In en, this message translates to:
  /// **'Previous stop'**
  String get journeyPrev;

  /// No description provided for @journeyNext.
  ///
  /// In en, this message translates to:
  /// **'Next stop'**
  String get journeyNext;

  /// No description provided for @journeyStart.
  ///
  /// In en, this message translates to:
  /// **'Start journey'**
  String get journeyStart;

  /// No description provided for @journeyContinue.
  ///
  /// In en, this message translates to:
  /// **'Continue'**
  String get journeyContinue;

  /// No description provided for @journeyRestart.
  ///
  /// In en, this message translates to:
  /// **'Ride again'**
  String get journeyRestart;

  /// No description provided for @voiceGuide.
  ///
  /// In en, this message translates to:
  /// **'Voice guide'**
  String get voiceGuide;

  /// No description provided for @pilgrimTips.
  ///
  /// In en, this message translates to:
  /// **'Pilgrim tips'**
  String get pilgrimTips;

  /// No description provided for @journeyNote.
  ///
  /// In en, this message translates to:
  /// **'Illustrative map, not to scale. Distances and fares are sample estimates; check live darshan timings on each temple page.'**
  String get journeyNote;

  /// No description provided for @visitMins.
  ///
  /// In en, this message translates to:
  /// **'~{mins} min visit'**
  String visitMins(int mins);

  /// No description provided for @nextStopIn.
  ///
  /// In en, this message translates to:
  /// **'Next stop {km} km'**
  String nextStopIn(String km);

  /// No description provided for @heroTabTravel.
  ///
  /// In en, this message translates to:
  /// **'Traveling'**
  String get heroTabTravel;

  /// No description provided for @heroTabPooja.
  ///
  /// In en, this message translates to:
  /// **'Pooja'**
  String get heroTabPooja;

  /// No description provided for @heroTabPlace.
  ///
  /// In en, this message translates to:
  /// **'Place'**
  String get heroTabPlace;

  /// No description provided for @heroTabTemple.
  ///
  /// In en, this message translates to:
  /// **'Temple'**
  String get heroTabTemple;

  /// No description provided for @heroTravelTitle.
  ///
  /// In en, this message translates to:
  /// **'Traveling'**
  String get heroTravelTitle;

  /// No description provided for @heroTravelSub.
  ///
  /// In en, this message translates to:
  /// **'Plan a family or group yatra with all your travel needs in one place.'**
  String get heroTravelSub;

  /// No description provided for @heroTravelCta.
  ///
  /// In en, this message translates to:
  /// **'Plan your yatra'**
  String get heroTravelCta;

  /// No description provided for @heroBrajGuide.
  ///
  /// In en, this message translates to:
  /// **'Braj Guide'**
  String get heroBrajGuide;

  /// No description provided for @heroPickupDrop.
  ///
  /// In en, this message translates to:
  /// **'Pickup & Drop'**
  String get heroPickupDrop;

  /// No description provided for @heroPoojaTitle.
  ///
  /// In en, this message translates to:
  /// **'Pooja & Aarti'**
  String get heroPoojaTitle;

  /// No description provided for @heroPoojaSub.
  ///
  /// In en, this message translates to:
  /// **'Live aarti times, lyrics with audio and darshan bookings.'**
  String get heroPoojaSub;

  /// No description provided for @heroPoojaCta.
  ///
  /// In en, this message translates to:
  /// **'Open aarti'**
  String get heroPoojaCta;

  /// No description provided for @heroAarti.
  ///
  /// In en, this message translates to:
  /// **'Aarti times'**
  String get heroAarti;

  /// No description provided for @heroLyrics.
  ///
  /// In en, this message translates to:
  /// **'Lyrics & audio'**
  String get heroLyrics;

  /// No description provided for @heroDarshan.
  ///
  /// In en, this message translates to:
  /// **'Darshan'**
  String get heroDarshan;

  /// No description provided for @heroPlaceTitle.
  ///
  /// In en, this message translates to:
  /// **'Places in Braj'**
  String get heroPlaceTitle;

  /// No description provided for @heroPlaceSub.
  ///
  /// In en, this message translates to:
  /// **'Temples, kunds and parikrama routes across Vrindavan, Mathura and Govardhan.'**
  String get heroPlaceSub;

  /// No description provided for @heroPlaceCta.
  ///
  /// In en, this message translates to:
  /// **'Start Yatra Journey'**
  String get heroPlaceCta;

  /// No description provided for @heroTemples.
  ///
  /// In en, this message translates to:
  /// **'Temples'**
  String get heroTemples;

  /// No description provided for @heroPlanTrip.
  ///
  /// In en, this message translates to:
  /// **'Plan trip'**
  String get heroPlanTrip;

  /// No description provided for @heroStoreSub.
  ///
  /// In en, this message translates to:
  /// **'Prasad, garlands, poshak and pooja essentials from the temple town.'**
  String get heroStoreSub;

  /// No description provided for @heroStoreCta.
  ///
  /// In en, this message translates to:
  /// **'Visit Temple Store'**
  String get heroStoreCta;

  /// No description provided for @heroPrasad.
  ///
  /// In en, this message translates to:
  /// **'Prasad'**
  String get heroPrasad;

  /// No description provided for @heroGarland.
  ///
  /// In en, this message translates to:
  /// **'Garlands'**
  String get heroGarland;

  /// No description provided for @heroPoshak.
  ///
  /// In en, this message translates to:
  /// **'Poshak'**
  String get heroPoshak;

  /// No description provided for @heroDiya.
  ///
  /// In en, this message translates to:
  /// **'Diya & dhoop'**
  String get heroDiya;

  /// No description provided for @heroTravelVideo.
  ///
  /// In en, this message translates to:
  /// **'Travel Video'**
  String get heroTravelVideo;

  /// No description provided for @aiTripPlanner.
  ///
  /// In en, this message translates to:
  /// **'AI Trip Planner'**
  String get aiTripPlanner;

  /// No description provided for @planYourYatraSub.
  ///
  /// In en, this message translates to:
  /// **'Create a personalized Braj yatra with stays, travel, darshan, aarti times and more.'**
  String get planYourYatraSub;

  /// No description provided for @planTravellers.
  ///
  /// In en, this message translates to:
  /// **'Travellers'**
  String get planTravellers;

  /// No description provided for @planDateDays.
  ///
  /// In en, this message translates to:
  /// **'Date & Days'**
  String get planDateDays;

  /// No description provided for @planTravel.
  ///
  /// In en, this message translates to:
  /// **'Travel'**
  String get planTravel;

  /// No description provided for @planPace.
  ///
  /// In en, this message translates to:
  /// **'Pace & Plan'**
  String get planPace;

  /// No description provided for @planStops.
  ///
  /// In en, this message translates to:
  /// **'Your Stops'**
  String get planStops;

  /// No description provided for @cpUsernameRule.
  ///
  /// In en, this message translates to:
  /// **'Username: 3-30 lowercase letters, numbers, _ or .'**
  String get cpUsernameRule;

  /// No description provided for @cpPickInterest.
  ///
  /// In en, this message translates to:
  /// **'Pick at least one interest'**
  String get cpPickInterest;

  /// No description provided for @cpIntBraj.
  ///
  /// In en, this message translates to:
  /// **'Braj Yatra'**
  String get cpIntBraj;

  /// No description provided for @cpIntTips.
  ///
  /// In en, this message translates to:
  /// **'Travel Tips'**
  String get cpIntTips;

  /// No description provided for @cpIntVlogs.
  ///
  /// In en, this message translates to:
  /// **'Yatra Vlogs'**
  String get cpIntVlogs;

  /// No description provided for @cpIntFestivals.
  ///
  /// In en, this message translates to:
  /// **'Festival & Events'**
  String get cpIntFestivals;

  /// No description provided for @cpIntBhakti.
  ///
  /// In en, this message translates to:
  /// **'Bhakti / Kirtan'**
  String get cpIntBhakti;

  /// No description provided for @cpIntFood.
  ///
  /// In en, this message translates to:
  /// **'Local Food'**
  String get cpIntFood;

  /// No description provided for @cpIntHistory.
  ///
  /// In en, this message translates to:
  /// **'History & Culture'**
  String get cpIntHistory;

  /// No description provided for @cpIntOther.
  ///
  /// In en, this message translates to:
  /// **'Other'**
  String get cpIntOther;

  /// No description provided for @cpAccountTitle.
  ///
  /// In en, this message translates to:
  /// **'Create Account'**
  String get cpAccountTitle;

  /// No description provided for @cpAccountSub.
  ///
  /// In en, this message translates to:
  /// **'Sign up to start creating and sharing on TirthNow'**
  String get cpAccountSub;

  /// No description provided for @cpWithGoogle.
  ///
  /// In en, this message translates to:
  /// **'Continue with Google'**
  String get cpWithGoogle;

  /// No description provided for @cpWithPhone.
  ///
  /// In en, this message translates to:
  /// **'Continue with Phone'**
  String get cpWithPhone;

  /// No description provided for @cpWithEmail.
  ///
  /// In en, this message translates to:
  /// **'Continue with Email'**
  String get cpWithEmail;

  /// No description provided for @cpSignInNote.
  ///
  /// In en, this message translates to:
  /// **'You\'ll come back here after signing in.'**
  String get cpSignInNote;

  /// No description provided for @cpFemale.
  ///
  /// In en, this message translates to:
  /// **'Female'**
  String get cpFemale;

  /// No description provided for @cpMale.
  ///
  /// In en, this message translates to:
  /// **'Male'**
  String get cpMale;

  /// No description provided for @cpOther.
  ///
  /// In en, this message translates to:
  /// **'Other'**
  String get cpOther;

  /// No description provided for @cpUndisclosed.
  ///
  /// In en, this message translates to:
  /// **'Prefer not to say'**
  String get cpUndisclosed;

  /// No description provided for @cpDetailsTitle.
  ///
  /// In en, this message translates to:
  /// **'Basic Details'**
  String get cpDetailsTitle;

  /// No description provided for @cpDetailsSub.
  ///
  /// In en, this message translates to:
  /// **'Tell us a bit about yourself'**
  String get cpDetailsSub;

  /// No description provided for @cpUsername.
  ///
  /// In en, this message translates to:
  /// **'Username'**
  String get cpUsername;

  /// No description provided for @cpUsernameHint.
  ///
  /// In en, this message translates to:
  /// **'This will be your unique profile link tirthnow.com/@{name}'**
  String cpUsernameHint(String name);

  /// No description provided for @cpDob.
  ///
  /// In en, this message translates to:
  /// **'Date of Birth'**
  String get cpDob;

  /// No description provided for @cpDobHint.
  ///
  /// In en, this message translates to:
  /// **'Select your date of birth'**
  String get cpDobHint;

  /// No description provided for @cpGender.
  ///
  /// In en, this message translates to:
  /// **'Gender'**
  String get cpGender;

  /// No description provided for @cpGenderHint.
  ///
  /// In en, this message translates to:
  /// **'Select gender'**
  String get cpGenderHint;

  /// No description provided for @cpProfileTitle.
  ///
  /// In en, this message translates to:
  /// **'Create Your Profile'**
  String get cpProfileTitle;

  /// No description provided for @cpProfileSub.
  ///
  /// In en, this message translates to:
  /// **'Make it easy for others to know you'**
  String get cpProfileSub;

  /// No description provided for @cpAddPhoto.
  ///
  /// In en, this message translates to:
  /// **'Add Profile Photo'**
  String get cpAddPhoto;

  /// No description provided for @cpBio.
  ///
  /// In en, this message translates to:
  /// **'Bio (optional)'**
  String get cpBio;

  /// No description provided for @cpBioHint.
  ///
  /// In en, this message translates to:
  /// **'Eg. Braj yatra, temples, travel & bhakti content creator 🙏'**
  String get cpBioHint;

  /// No description provided for @cpLocation.
  ///
  /// In en, this message translates to:
  /// **'Location'**
  String get cpLocation;

  /// No description provided for @cpLocationHint.
  ///
  /// In en, this message translates to:
  /// **'Add your city (e.g. Mathura)'**
  String get cpLocationHint;

  /// No description provided for @cpInterestsTitle.
  ///
  /// In en, this message translates to:
  /// **'Choose Your Interests'**
  String get cpInterestsTitle;

  /// No description provided for @cpInterestsSub.
  ///
  /// In en, this message translates to:
  /// **'Select topics you create or enjoy'**
  String get cpInterestsSub;

  /// No description provided for @cpInterests.
  ///
  /// In en, this message translates to:
  /// **'Interests'**
  String get cpInterests;

  /// No description provided for @cpReviewTitle.
  ///
  /// In en, this message translates to:
  /// **'Review & Create'**
  String get cpReviewTitle;

  /// No description provided for @cpReviewSub.
  ///
  /// In en, this message translates to:
  /// **'Check your details before creating your profile'**
  String get cpReviewSub;

  /// No description provided for @cpIntroTitle.
  ///
  /// In en, this message translates to:
  /// **'Create your TirthNow Creator Profile'**
  String get cpIntroTitle;

  /// No description provided for @cpIntroSub.
  ///
  /// In en, this message translates to:
  /// **'Share your yatra, darshan, travel tips and Braj experiences with the community.'**
  String get cpIntroSub;

  /// No description provided for @cpPointVideos.
  ///
  /// In en, this message translates to:
  /// **'Create & share short videos'**
  String get cpPointVideos;

  /// No description provided for @cpPointCommunity.
  ///
  /// In en, this message translates to:
  /// **'Build your devotee community'**
  String get cpPointCommunity;

  /// No description provided for @cpPointFollowers.
  ///
  /// In en, this message translates to:
  /// **'Get followers & engagement'**
  String get cpPointFollowers;

  /// No description provided for @cpHaveProfile.
  ///
  /// In en, this message translates to:
  /// **'I already have a profile'**
  String get cpHaveProfile;

  /// No description provided for @cpSignIn.
  ///
  /// In en, this message translates to:
  /// **'Sign In'**
  String get cpSignIn;

  /// No description provided for @cpDoneTitle.
  ///
  /// In en, this message translates to:
  /// **'Profile Created Successfully!'**
  String get cpDoneTitle;

  /// No description provided for @cpDoneSub.
  ///
  /// In en, this message translates to:
  /// **'Welcome to the TirthNow Creators community. Start sharing your yatra and Braj experiences.'**
  String get cpDoneSub;

  /// No description provided for @cpGoProfile.
  ///
  /// In en, this message translates to:
  /// **'Go to My Profile'**
  String get cpGoProfile;

  /// No description provided for @cpFirstPost.
  ///
  /// In en, this message translates to:
  /// **'Create Your First Post'**
  String get cpFirstPost;

  /// No description provided for @cpStepAccount.
  ///
  /// In en, this message translates to:
  /// **'Account'**
  String get cpStepAccount;

  /// No description provided for @cpStepDetails.
  ///
  /// In en, this message translates to:
  /// **'Details'**
  String get cpStepDetails;

  /// No description provided for @cpStepProfile.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get cpStepProfile;

  /// No description provided for @cpStepInterests.
  ///
  /// In en, this message translates to:
  /// **'Interests'**
  String get cpStepInterests;

  /// No description provided for @guideOnline.
  ///
  /// In en, this message translates to:
  /// **'Online · Hindi & English'**
  String get guideOnline;

  /// No description provided for @guideTyping.
  ///
  /// In en, this message translates to:
  /// **'Typing…'**
  String get guideTyping;

  /// No description provided for @guideWelcome.
  ///
  /// In en, this message translates to:
  /// **'Radhe Radhe! 🙏'**
  String get guideWelcome;

  /// No description provided for @guideToolScan.
  ///
  /// In en, this message translates to:
  /// **'Scan a temple'**
  String get guideToolScan;

  /// No description provided for @guideToolPlan.
  ///
  /// In en, this message translates to:
  /// **'Plan my yatra'**
  String get guideToolPlan;

  /// No description provided for @guideToolAarti.
  ///
  /// In en, this message translates to:
  /// **'Aarti times'**
  String get guideToolAarti;

  /// No description provided for @guideTryAsking.
  ///
  /// In en, this message translates to:
  /// **'Try asking'**
  String get guideTryAsking;

  /// No description provided for @guideListen.
  ///
  /// In en, this message translates to:
  /// **'Listen'**
  String get guideListen;
}

class _AppLocalizationsDelegate extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) => <String>['en', 'hi'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'hi':
      return AppLocalizationsHi();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}

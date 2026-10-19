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
  /// **'Your Braj yatra companion'**
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

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
  /// **'TirthNow Partner'**
  String get appName;

  /// No description provided for @emptyList.
  ///
  /// In en, this message translates to:
  /// **'Nothing here yet'**
  String get emptyList;

  /// No description provided for @errorOffline.
  ///
  /// In en, this message translates to:
  /// **'You\'re offline. Check your connection.'**
  String get errorOffline;

  /// No description provided for @errorGeneric.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong. Please try again.'**
  String get errorGeneric;

  /// No description provided for @retry.
  ///
  /// In en, this message translates to:
  /// **'Retry'**
  String get retry;

  /// No description provided for @save.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get save;

  /// No description provided for @cancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancel;

  /// No description provided for @add.
  ///
  /// In en, this message translates to:
  /// **'Add'**
  String get add;

  /// No description provided for @edit.
  ///
  /// In en, this message translates to:
  /// **'Edit'**
  String get edit;

  /// No description provided for @next.
  ///
  /// In en, this message translates to:
  /// **'Continue'**
  String get next;

  /// No description provided for @back.
  ///
  /// In en, this message translates to:
  /// **'Back'**
  String get back;

  /// No description provided for @saved.
  ///
  /// In en, this message translates to:
  /// **'Saved'**
  String get saved;

  /// No description provided for @required.
  ///
  /// In en, this message translates to:
  /// **'Required'**
  String get required;

  /// No description provided for @invalidValue.
  ///
  /// In en, this message translates to:
  /// **'Check this value'**
  String get invalidValue;

  /// No description provided for @loginTitle.
  ///
  /// In en, this message translates to:
  /// **'Grow your business with pilgrims'**
  String get loginTitle;

  /// No description provided for @loginSub.
  ///
  /// In en, this message translates to:
  /// **'Cabs, stays, restaurants and temple stores — one partner app for Braj.'**
  String get loginSub;

  /// No description provided for @phoneLabel.
  ///
  /// In en, this message translates to:
  /// **'Mobile number'**
  String get phoneLabel;

  /// No description provided for @phoneHint.
  ///
  /// In en, this message translates to:
  /// **'10-digit mobile number'**
  String get phoneHint;

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
  /// **'OTP sent to {phone}'**
  String otpSentTo(String phone);

  /// No description provided for @mockOtpHint.
  ///
  /// In en, this message translates to:
  /// **'Demo mode: use 123456'**
  String get mockOtpHint;

  /// No description provided for @verify.
  ///
  /// In en, this message translates to:
  /// **'Verify & continue'**
  String get verify;

  /// No description provided for @changeNumber.
  ///
  /// In en, this message translates to:
  /// **'Change number'**
  String get changeNumber;

  /// No description provided for @language.
  ///
  /// In en, this message translates to:
  /// **'हिंदी'**
  String get language;

  /// No description provided for @obChooseTitle.
  ///
  /// In en, this message translates to:
  /// **'Which service do you offer?'**
  String get obChooseTitle;

  /// No description provided for @obChooseSub.
  ///
  /// In en, this message translates to:
  /// **'Pick one. You can register another business later.'**
  String get obChooseSub;

  /// No description provided for @svcCab.
  ///
  /// In en, this message translates to:
  /// **'Cab & Taxi'**
  String get svcCab;

  /// No description provided for @svcCabSub.
  ///
  /// In en, this message translates to:
  /// **'Bike, auto and car rides'**
  String get svcCabSub;

  /// No description provided for @svcHotel.
  ///
  /// In en, this message translates to:
  /// **'Hotel'**
  String get svcHotel;

  /// No description provided for @svcHotelSub.
  ///
  /// In en, this message translates to:
  /// **'Rooms listed under Stay'**
  String get svcHotelSub;

  /// No description provided for @svcDharamshala.
  ///
  /// In en, this message translates to:
  /// **'Dharamshala'**
  String get svcDharamshala;

  /// No description provided for @svcDharamshalaSub.
  ///
  /// In en, this message translates to:
  /// **'Pilgrim rest houses, under Stay'**
  String get svcDharamshalaSub;

  /// No description provided for @svcRestaurant.
  ///
  /// In en, this message translates to:
  /// **'Restaurant'**
  String get svcRestaurant;

  /// No description provided for @svcRestaurantSub.
  ///
  /// In en, this message translates to:
  /// **'Satvik food, dine-in and orders'**
  String get svcRestaurantSub;

  /// No description provided for @svcStore.
  ///
  /// In en, this message translates to:
  /// **'Temple Store'**
  String get svcStore;

  /// No description provided for @svcStoreSub.
  ///
  /// In en, this message translates to:
  /// **'Pooja items, prasad, poshak'**
  String get svcStoreSub;

  /// No description provided for @obBusinessTitle.
  ///
  /// In en, this message translates to:
  /// **'Business details'**
  String get obBusinessTitle;

  /// No description provided for @displayName.
  ///
  /// In en, this message translates to:
  /// **'Business name (shown to pilgrims)'**
  String get displayName;

  /// No description provided for @legalName.
  ///
  /// In en, this message translates to:
  /// **'Legal name (as on PAN)'**
  String get legalName;

  /// No description provided for @city.
  ///
  /// In en, this message translates to:
  /// **'City'**
  String get city;

  /// No description provided for @pan.
  ///
  /// In en, this message translates to:
  /// **'PAN'**
  String get pan;

  /// No description provided for @gstin.
  ///
  /// In en, this message translates to:
  /// **'GSTIN (optional)'**
  String get gstin;

  /// No description provided for @createAccount.
  ///
  /// In en, this message translates to:
  /// **'Create partner account'**
  String get createAccount;

  /// No description provided for @kycTitle.
  ///
  /// In en, this message translates to:
  /// **'Verify your business'**
  String get kycTitle;

  /// No description provided for @kycSub.
  ///
  /// In en, this message translates to:
  /// **'Upload clear photos. Each document is checked before you go live.'**
  String get kycSub;

  /// No description provided for @kycHow.
  ///
  /// In en, this message translates to:
  /// **'How verification works'**
  String get kycHow;

  /// No description provided for @kycHowBody.
  ///
  /// In en, this message translates to:
  /// **'1. PAN and GSTIN are matched with government records.\n2. Aadhaar is verified through DigiLocker / e-KYC with your consent.\n3. Licences (FSSAI, trade licence, RC, driving licence) are checked by our team.\n4. Your bank account is confirmed with a ₹1 test deposit.\nIn demo mode documents are accepted instantly.'**
  String get kycHowBody;

  /// No description provided for @docPan.
  ///
  /// In en, this message translates to:
  /// **'PAN card'**
  String get docPan;

  /// No description provided for @docAadhaar.
  ///
  /// In en, this message translates to:
  /// **'Aadhaar card'**
  String get docAadhaar;

  /// No description provided for @docGst.
  ///
  /// In en, this message translates to:
  /// **'GST certificate'**
  String get docGst;

  /// No description provided for @docFssai.
  ///
  /// In en, this message translates to:
  /// **'FSSAI licence'**
  String get docFssai;

  /// No description provided for @docTradeLicense.
  ///
  /// In en, this message translates to:
  /// **'Trade licence'**
  String get docTradeLicense;

  /// No description provided for @docRc.
  ///
  /// In en, this message translates to:
  /// **'Vehicle RC'**
  String get docRc;

  /// No description provided for @docDrivingLicence.
  ///
  /// In en, this message translates to:
  /// **'Driving licence'**
  String get docDrivingLicence;

  /// No description provided for @docPermit.
  ///
  /// In en, this message translates to:
  /// **'Permit'**
  String get docPermit;

  /// No description provided for @docOther.
  ///
  /// In en, this message translates to:
  /// **'Other document'**
  String get docOther;

  /// No description provided for @upload.
  ///
  /// In en, this message translates to:
  /// **'Upload'**
  String get upload;

  /// No description provided for @uploaded.
  ///
  /// In en, this message translates to:
  /// **'Uploaded'**
  String get uploaded;

  /// No description provided for @docApproved.
  ///
  /// In en, this message translates to:
  /// **'Verified'**
  String get docApproved;

  /// No description provided for @docRejected.
  ///
  /// In en, this message translates to:
  /// **'Rejected'**
  String get docRejected;

  /// No description provided for @docPending.
  ///
  /// In en, this message translates to:
  /// **'In review'**
  String get docPending;

  /// No description provided for @bankTitle.
  ///
  /// In en, this message translates to:
  /// **'Payout bank account'**
  String get bankTitle;

  /// No description provided for @accountHolder.
  ///
  /// In en, this message translates to:
  /// **'Account holder name'**
  String get accountHolder;

  /// No description provided for @accountNumber.
  ///
  /// In en, this message translates to:
  /// **'Account number'**
  String get accountNumber;

  /// No description provided for @ifsc.
  ///
  /// In en, this message translates to:
  /// **'IFSC'**
  String get ifsc;

  /// No description provided for @addBank.
  ///
  /// In en, this message translates to:
  /// **'Add bank account'**
  String get addBank;

  /// No description provided for @submitKyc.
  ///
  /// In en, this message translates to:
  /// **'Submit for verification'**
  String get submitKyc;

  /// No description provided for @missingDocs.
  ///
  /// In en, this message translates to:
  /// **'Still needed: {docs}'**
  String missingDocs(String docs);

  /// No description provided for @waitingTitle.
  ///
  /// In en, this message translates to:
  /// **'Waiting for approval'**
  String get waitingTitle;

  /// No description provided for @waitingBody.
  ///
  /// In en, this message translates to:
  /// **'Thanks! Our team is reviewing your documents. You\'ll be listed for pilgrims as soon as you\'re approved.'**
  String get waitingBody;

  /// No description provided for @rejectedTitle.
  ///
  /// In en, this message translates to:
  /// **'Some documents need attention'**
  String get rejectedTitle;

  /// No description provided for @fixDocs.
  ///
  /// In en, this message translates to:
  /// **'Fix documents'**
  String get fixDocs;

  /// No description provided for @suspendedTitle.
  ///
  /// In en, this message translates to:
  /// **'Account suspended'**
  String get suspendedTitle;

  /// No description provided for @checkStatus.
  ///
  /// In en, this message translates to:
  /// **'Check status'**
  String get checkStatus;

  /// No description provided for @signOut.
  ///
  /// In en, this message translates to:
  /// **'Sign out'**
  String get signOut;

  /// No description provided for @tabDashboard.
  ///
  /// In en, this message translates to:
  /// **'Dashboard'**
  String get tabDashboard;

  /// No description provided for @tabOrders.
  ///
  /// In en, this message translates to:
  /// **'Orders'**
  String get tabOrders;

  /// No description provided for @tabListings.
  ///
  /// In en, this message translates to:
  /// **'Listings'**
  String get tabListings;

  /// No description provided for @tabMore.
  ///
  /// In en, this message translates to:
  /// **'More'**
  String get tabMore;

  /// No description provided for @hello.
  ///
  /// In en, this message translates to:
  /// **'Namaste, {name}'**
  String hello(String name);

  /// No description provided for @live.
  ///
  /// In en, this message translates to:
  /// **'Live for pilgrims'**
  String get live;

  /// No description provided for @days7.
  ///
  /// In en, this message translates to:
  /// **'7 days'**
  String get days7;

  /// No description provided for @days30.
  ///
  /// In en, this message translates to:
  /// **'30 days'**
  String get days30;

  /// No description provided for @days90.
  ///
  /// In en, this message translates to:
  /// **'90 days'**
  String get days90;

  /// No description provided for @earnings.
  ///
  /// In en, this message translates to:
  /// **'Your earnings'**
  String get earnings;

  /// No description provided for @earningsNote.
  ///
  /// In en, this message translates to:
  /// **'After the 5% platform fee. GST collected is paid out to you for filing.'**
  String get earningsNote;

  /// No description provided for @statOrders.
  ///
  /// In en, this message translates to:
  /// **'Orders'**
  String get statOrders;

  /// No description provided for @statGross.
  ///
  /// In en, this message translates to:
  /// **'Gross sales'**
  String get statGross;

  /// No description provided for @statAvg.
  ///
  /// In en, this message translates to:
  /// **'Avg order'**
  String get statAvg;

  /// No description provided for @statDiscounts.
  ///
  /// In en, this message translates to:
  /// **'Coupon discounts'**
  String get statDiscounts;

  /// No description provided for @salesTrend.
  ///
  /// In en, this message translates to:
  /// **'Daily earnings'**
  String get salesTrend;

  /// No description provided for @topItems.
  ///
  /// In en, this message translates to:
  /// **'Best sellers'**
  String get topItems;

  /// No description provided for @ratings.
  ///
  /// In en, this message translates to:
  /// **'Customer ratings'**
  String get ratings;

  /// No description provided for @ratingCount.
  ///
  /// In en, this message translates to:
  /// **'{count} ratings'**
  String ratingCount(String count);

  /// No description provided for @seeReviews.
  ///
  /// In en, this message translates to:
  /// **'See reviews'**
  String get seeReviews;

  /// No description provided for @ordersPending.
  ///
  /// In en, this message translates to:
  /// **'New'**
  String get ordersPending;

  /// No description provided for @ordersActive.
  ///
  /// In en, this message translates to:
  /// **'Active'**
  String get ordersActive;

  /// No description provided for @ordersDone.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get ordersDone;

  /// No description provided for @ordersCancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get ordersCancelled;

  /// No description provided for @accept.
  ///
  /// In en, this message translates to:
  /// **'Accept'**
  String get accept;

  /// No description provided for @reject.
  ///
  /// In en, this message translates to:
  /// **'Reject'**
  String get reject;

  /// No description provided for @start.
  ///
  /// In en, this message translates to:
  /// **'Start'**
  String get start;

  /// No description provided for @complete.
  ///
  /// In en, this message translates to:
  /// **'Mark complete'**
  String get complete;

  /// No description provided for @rejectReason.
  ///
  /// In en, this message translates to:
  /// **'Reason'**
  String get rejectReason;

  /// No description provided for @youGet.
  ///
  /// In en, this message translates to:
  /// **'You get {amount}'**
  String youGet(String amount);

  /// No description provided for @customerPays.
  ///
  /// In en, this message translates to:
  /// **'Pilgrim pays {amount}'**
  String customerPays(String amount);

  /// No description provided for @priceNote.
  ///
  /// In en, this message translates to:
  /// **'Pilgrims see your price + 18% GST + 5% platform fee.'**
  String get priceNote;

  /// No description provided for @basePrice.
  ///
  /// In en, this message translates to:
  /// **'Your price (₹)'**
  String get basePrice;

  /// No description provided for @vehicles.
  ///
  /// In en, this message translates to:
  /// **'Vehicles'**
  String get vehicles;

  /// No description provided for @fares.
  ///
  /// In en, this message translates to:
  /// **'Fares'**
  String get fares;

  /// No description provided for @addVehicle.
  ///
  /// In en, this message translates to:
  /// **'Add vehicle'**
  String get addVehicle;

  /// No description provided for @vehicleClass.
  ///
  /// In en, this message translates to:
  /// **'Vehicle type'**
  String get vehicleClass;

  /// No description provided for @regNo.
  ///
  /// In en, this message translates to:
  /// **'Registration no.'**
  String get regNo;

  /// No description provided for @model.
  ///
  /// In en, this message translates to:
  /// **'Model'**
  String get model;

  /// No description provided for @seats.
  ///
  /// In en, this message translates to:
  /// **'Seats'**
  String get seats;

  /// No description provided for @driverName.
  ///
  /// In en, this message translates to:
  /// **'Driver name'**
  String get driverName;

  /// No description provided for @baseFare.
  ///
  /// In en, this message translates to:
  /// **'Base fare (₹)'**
  String get baseFare;

  /// No description provided for @perKm.
  ///
  /// In en, this message translates to:
  /// **'Per km (₹)'**
  String get perKm;

  /// No description provided for @perMin.
  ///
  /// In en, this message translates to:
  /// **'Per minute (₹)'**
  String get perMin;

  /// No description provided for @minFare.
  ///
  /// In en, this message translates to:
  /// **'Minimum fare (₹)'**
  String get minFare;

  /// No description provided for @nightPct.
  ///
  /// In en, this message translates to:
  /// **'Night surcharge %'**
  String get nightPct;

  /// No description provided for @setFare.
  ///
  /// In en, this message translates to:
  /// **'Set fare'**
  String get setFare;

  /// No description provided for @cabBike.
  ///
  /// In en, this message translates to:
  /// **'Bike'**
  String get cabBike;

  /// No description provided for @cabAuto.
  ///
  /// In en, this message translates to:
  /// **'Auto'**
  String get cabAuto;

  /// No description provided for @cabERickshaw.
  ///
  /// In en, this message translates to:
  /// **'E-rickshaw'**
  String get cabERickshaw;

  /// No description provided for @cabHatchback.
  ///
  /// In en, this message translates to:
  /// **'Hatchback'**
  String get cabHatchback;

  /// No description provided for @cabSedan.
  ///
  /// In en, this message translates to:
  /// **'Sedan'**
  String get cabSedan;

  /// No description provided for @cabSuv.
  ///
  /// In en, this message translates to:
  /// **'SUV'**
  String get cabSuv;

  /// No description provided for @cabTempo.
  ///
  /// In en, this message translates to:
  /// **'Tempo traveller'**
  String get cabTempo;

  /// No description provided for @properties.
  ///
  /// In en, this message translates to:
  /// **'Properties'**
  String get properties;

  /// No description provided for @addProperty.
  ///
  /// In en, this message translates to:
  /// **'Add property'**
  String get addProperty;

  /// No description provided for @propertyName.
  ///
  /// In en, this message translates to:
  /// **'Property name'**
  String get propertyName;

  /// No description provided for @address.
  ///
  /// In en, this message translates to:
  /// **'Address'**
  String get address;

  /// No description provided for @roomTypes.
  ///
  /// In en, this message translates to:
  /// **'Room types'**
  String get roomTypes;

  /// No description provided for @addRoomType.
  ///
  /// In en, this message translates to:
  /// **'Add room type'**
  String get addRoomType;

  /// No description provided for @roomName.
  ///
  /// In en, this message translates to:
  /// **'Room name'**
  String get roomName;

  /// No description provided for @maxGuests.
  ///
  /// In en, this message translates to:
  /// **'Max guests'**
  String get maxGuests;

  /// No description provided for @totalRooms.
  ///
  /// In en, this message translates to:
  /// **'Rooms'**
  String get totalRooms;

  /// No description provided for @perNight.
  ///
  /// In en, this message translates to:
  /// **'per night'**
  String get perNight;

  /// No description provided for @published.
  ///
  /// In en, this message translates to:
  /// **'Published'**
  String get published;

  /// No description provided for @hidden.
  ///
  /// In en, this message translates to:
  /// **'Hidden'**
  String get hidden;

  /// No description provided for @restaurants.
  ///
  /// In en, this message translates to:
  /// **'Restaurants'**
  String get restaurants;

  /// No description provided for @addRestaurant.
  ///
  /// In en, this message translates to:
  /// **'Add restaurant'**
  String get addRestaurant;

  /// No description provided for @restaurantName.
  ///
  /// In en, this message translates to:
  /// **'Restaurant name'**
  String get restaurantName;

  /// No description provided for @pureVeg.
  ///
  /// In en, this message translates to:
  /// **'Pure veg'**
  String get pureVeg;

  /// No description provided for @satvik.
  ///
  /// In en, this message translates to:
  /// **'Satvik (no onion-garlic)'**
  String get satvik;

  /// No description provided for @menu.
  ///
  /// In en, this message translates to:
  /// **'Menu'**
  String get menu;

  /// No description provided for @addMenuItem.
  ///
  /// In en, this message translates to:
  /// **'Add dish'**
  String get addMenuItem;

  /// No description provided for @dishName.
  ///
  /// In en, this message translates to:
  /// **'Dish name'**
  String get dishName;

  /// No description provided for @category.
  ///
  /// In en, this message translates to:
  /// **'Category'**
  String get category;

  /// No description provided for @jain.
  ///
  /// In en, this message translates to:
  /// **'Jain'**
  String get jain;

  /// No description provided for @available.
  ///
  /// In en, this message translates to:
  /// **'Available'**
  String get available;

  /// No description provided for @products.
  ///
  /// In en, this message translates to:
  /// **'Products'**
  String get products;

  /// No description provided for @addProduct.
  ///
  /// In en, this message translates to:
  /// **'Add product'**
  String get addProduct;

  /// No description provided for @productName.
  ///
  /// In en, this message translates to:
  /// **'Product name'**
  String get productName;

  /// No description provided for @description.
  ///
  /// In en, this message translates to:
  /// **'Description'**
  String get description;

  /// No description provided for @mrp.
  ///
  /// In en, this message translates to:
  /// **'MRP (₹, optional)'**
  String get mrp;

  /// No description provided for @stock.
  ///
  /// In en, this message translates to:
  /// **'Stock'**
  String get stock;

  /// No description provided for @unit.
  ///
  /// In en, this message translates to:
  /// **'Unit (piece, pack, kg)'**
  String get unit;

  /// No description provided for @addPhoto.
  ///
  /// In en, this message translates to:
  /// **'Add photo'**
  String get addPhoto;

  /// No description provided for @inStock.
  ///
  /// In en, this message translates to:
  /// **'{n} in stock'**
  String inStock(String n);

  /// No description provided for @sold.
  ///
  /// In en, this message translates to:
  /// **'{n} sold'**
  String sold(String n);

  /// No description provided for @delete.
  ///
  /// In en, this message translates to:
  /// **'Delete'**
  String get delete;

  /// No description provided for @catPoojaThali.
  ///
  /// In en, this message translates to:
  /// **'Pooja thali'**
  String get catPoojaThali;

  /// No description provided for @catDiyaDhoop.
  ///
  /// In en, this message translates to:
  /// **'Diya & dhoop'**
  String get catDiyaDhoop;

  /// No description provided for @catGarland.
  ///
  /// In en, this message translates to:
  /// **'Garlands'**
  String get catGarland;

  /// No description provided for @catPrasad.
  ///
  /// In en, this message translates to:
  /// **'Prasad'**
  String get catPrasad;

  /// No description provided for @catPoshak.
  ///
  /// In en, this message translates to:
  /// **'Poshak'**
  String get catPoshak;

  /// No description provided for @catTilakMala.
  ///
  /// In en, this message translates to:
  /// **'Tilak & mala'**
  String get catTilakMala;

  /// No description provided for @catIdols.
  ///
  /// In en, this message translates to:
  /// **'Idols'**
  String get catIdols;

  /// No description provided for @catBooks.
  ///
  /// In en, this message translates to:
  /// **'Books'**
  String get catBooks;

  /// No description provided for @catOther.
  ///
  /// In en, this message translates to:
  /// **'Other'**
  String get catOther;

  /// No description provided for @coupons.
  ///
  /// In en, this message translates to:
  /// **'Coupons'**
  String get coupons;

  /// No description provided for @couponsSub.
  ///
  /// In en, this message translates to:
  /// **'Offer discounts to bring more pilgrims'**
  String get couponsSub;

  /// No description provided for @addCoupon.
  ///
  /// In en, this message translates to:
  /// **'Create coupon'**
  String get addCoupon;

  /// No description provided for @couponCode.
  ///
  /// In en, this message translates to:
  /// **'Code (e.g. RADHE10)'**
  String get couponCode;

  /// No description provided for @percentOff.
  ///
  /// In en, this message translates to:
  /// **'% off'**
  String get percentOff;

  /// No description provided for @flatOff.
  ///
  /// In en, this message translates to:
  /// **'Flat ₹ off'**
  String get flatOff;

  /// No description provided for @discountValue.
  ///
  /// In en, this message translates to:
  /// **'Discount'**
  String get discountValue;

  /// No description provided for @minOrder.
  ///
  /// In en, this message translates to:
  /// **'Minimum order (₹)'**
  String get minOrder;

  /// No description provided for @maxDiscount.
  ///
  /// In en, this message translates to:
  /// **'Max discount (₹, optional)'**
  String get maxDiscount;

  /// No description provided for @usageLimit.
  ///
  /// In en, this message translates to:
  /// **'Usage limit (optional)'**
  String get usageLimit;

  /// No description provided for @validDays.
  ///
  /// In en, this message translates to:
  /// **'Valid for days (optional)'**
  String get validDays;

  /// No description provided for @used.
  ///
  /// In en, this message translates to:
  /// **'Used {n}'**
  String used(String n);

  /// No description provided for @active.
  ///
  /// In en, this message translates to:
  /// **'Active'**
  String get active;

  /// No description provided for @reviews.
  ///
  /// In en, this message translates to:
  /// **'Reviews'**
  String get reviews;

  /// No description provided for @reply.
  ///
  /// In en, this message translates to:
  /// **'Reply'**
  String get reply;

  /// No description provided for @yourReply.
  ///
  /// In en, this message translates to:
  /// **'Your reply'**
  String get yourReply;

  /// No description provided for @profile.
  ///
  /// In en, this message translates to:
  /// **'Business profile'**
  String get profile;

  /// No description provided for @kycStatus.
  ///
  /// In en, this message translates to:
  /// **'Verification'**
  String get kycStatus;

  /// No description provided for @statusActive.
  ///
  /// In en, this message translates to:
  /// **'Approved'**
  String get statusActive;

  /// No description provided for @statusPending.
  ///
  /// In en, this message translates to:
  /// **'Under review'**
  String get statusPending;

  /// No description provided for @statusDraft.
  ///
  /// In en, this message translates to:
  /// **'Incomplete'**
  String get statusDraft;

  /// No description provided for @statusRejected.
  ///
  /// In en, this message translates to:
  /// **'Needs changes'**
  String get statusRejected;

  /// No description provided for @statusSuspended.
  ///
  /// In en, this message translates to:
  /// **'Suspended'**
  String get statusSuspended;

  /// No description provided for @switchLanguage.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get switchLanguage;

  /// No description provided for @help.
  ///
  /// In en, this message translates to:
  /// **'Partner support'**
  String get help;

  /// No description provided for @splashTitle.
  ///
  /// In en, this message translates to:
  /// **'Grow your Pilgrimage Business with TirthNow'**
  String get splashTitle;

  /// No description provided for @splashSub.
  ///
  /// In en, this message translates to:
  /// **'List your cab, hotel, dharamshala, restaurant or temple store and reach thousands of pilgrims.'**
  String get splashSub;

  /// No description provided for @getStarted.
  ///
  /// In en, this message translates to:
  /// **'Get Started'**
  String get getStarted;

  /// No description provided for @login.
  ///
  /// In en, this message translates to:
  /// **'Login'**
  String get login;

  /// No description provided for @register.
  ///
  /// In en, this message translates to:
  /// **'Register'**
  String get register;

  /// No description provided for @verifyNumber.
  ///
  /// In en, this message translates to:
  /// **'Verify your number'**
  String get verifyNumber;

  /// No description provided for @otpEnter.
  ///
  /// In en, this message translates to:
  /// **'Enter the 6-digit OTP sent to {phone}'**
  String otpEnter(String phone);

  /// No description provided for @resendIn.
  ///
  /// In en, this message translates to:
  /// **'Resend OTP in {sec}s'**
  String resendIn(String sec);

  /// No description provided for @resend.
  ///
  /// In en, this message translates to:
  /// **'Resend OTP'**
  String get resend;

  /// No description provided for @partnerTag.
  ///
  /// In en, this message translates to:
  /// **'Partner'**
  String get partnerTag;

  /// No description provided for @overview.
  ///
  /// In en, this message translates to:
  /// **'Business overview'**
  String get overview;

  /// No description provided for @lastDays.
  ///
  /// In en, this message translates to:
  /// **'Last {n} days'**
  String lastDays(String n);

  /// No description provided for @revenue.
  ///
  /// In en, this message translates to:
  /// **'Revenue'**
  String get revenue;

  /// No description provided for @aov.
  ///
  /// In en, this message translates to:
  /// **'Avg order'**
  String get aov;

  /// No description provided for @rating.
  ///
  /// In en, this message translates to:
  /// **'Rating'**
  String get rating;

  /// No description provided for @addListing.
  ///
  /// In en, this message translates to:
  /// **'Add listing'**
  String get addListing;

  /// No description provided for @payouts.
  ///
  /// In en, this message translates to:
  /// **'Payouts'**
  String get payouts;

  /// No description provided for @analytics.
  ///
  /// In en, this message translates to:
  /// **'Analytics'**
  String get analytics;

  /// No description provided for @aiTips.
  ///
  /// In en, this message translates to:
  /// **'AI business tips'**
  String get aiTips;

  /// No description provided for @tipNoListings.
  ///
  /// In en, this message translates to:
  /// **'Add your first listing with a clear photo — pilgrims book what they can see.'**
  String get tipNoListings;

  /// No description provided for @tipCoupon.
  ///
  /// In en, this message translates to:
  /// **'Create a festival coupon (10% off) to get your first orders faster.'**
  String get tipCoupon;

  /// No description provided for @tipRating.
  ///
  /// In en, this message translates to:
  /// **'Reply to reviews — partners who reply get more repeat pilgrims.'**
  String get tipRating;

  /// No description provided for @tipGrowth.
  ///
  /// In en, this message translates to:
  /// **'Sales are up {pct}% — keep stock ready for the weekend rush.'**
  String tipGrowth(String pct);

  /// No description provided for @tipDown.
  ///
  /// In en, this message translates to:
  /// **'Sales dipped {pct}% — try a limited-time coupon or new photos.'**
  String tipDown(String pct);

  /// No description provided for @businessAnalytics.
  ///
  /// In en, this message translates to:
  /// **'Business analytics'**
  String get businessAnalytics;

  /// No description provided for @bestDay.
  ///
  /// In en, this message translates to:
  /// **'Best day'**
  String get bestDay;

  /// No description provided for @marketing.
  ///
  /// In en, this message translates to:
  /// **'Marketing & growth'**
  String get marketing;

  /// No description provided for @shareStore.
  ///
  /// In en, this message translates to:
  /// **'Share on WhatsApp'**
  String get shareStore;

  /// No description provided for @shareStoreSub.
  ///
  /// In en, this message translates to:
  /// **'Send your listing to customers and groups'**
  String get shareStoreSub;

  /// No description provided for @shareText.
  ///
  /// In en, this message translates to:
  /// **'Book with {name} on TirthNow — trusted service for your Braj yatra 🙏'**
  String shareText(String name);

  /// No description provided for @festivalCampaign.
  ///
  /// In en, this message translates to:
  /// **'Festival campaigns'**
  String get festivalCampaign;

  /// No description provided for @festivalCampaignSub.
  ///
  /// In en, this message translates to:
  /// **'Ready coupons for Janmashtami, Holi, Kartik'**
  String get festivalCampaignSub;

  /// No description provided for @comingSoon.
  ///
  /// In en, this message translates to:
  /// **'Coming soon'**
  String get comingSoon;

  /// No description provided for @promotions.
  ///
  /// In en, this message translates to:
  /// **'Run promotions'**
  String get promotions;

  /// No description provided for @promotionsSub.
  ///
  /// In en, this message translates to:
  /// **'Boost your listing in search and home'**
  String get promotionsSub;

  /// No description provided for @loyalty.
  ///
  /// In en, this message translates to:
  /// **'Loyalty program'**
  String get loyalty;

  /// No description provided for @loyaltySub.
  ///
  /// In en, this message translates to:
  /// **'Reward repeat pilgrims'**
  String get loyaltySub;

  /// No description provided for @support.
  ///
  /// In en, this message translates to:
  /// **'Help & support'**
  String get support;

  /// No description provided for @howHelp.
  ///
  /// In en, this message translates to:
  /// **'How can we help you?'**
  String get howHelp;

  /// No description provided for @chatSupport.
  ///
  /// In en, this message translates to:
  /// **'Chat on WhatsApp'**
  String get chatSupport;

  /// No description provided for @callUs.
  ///
  /// In en, this message translates to:
  /// **'Request a callback'**
  String get callUs;

  /// No description provided for @emailUs.
  ///
  /// In en, this message translates to:
  /// **'Email us'**
  String get emailUs;

  /// No description provided for @faqs.
  ///
  /// In en, this message translates to:
  /// **'FAQs'**
  String get faqs;

  /// No description provided for @faq1q.
  ///
  /// In en, this message translates to:
  /// **'When do I get paid?'**
  String get faq1q;

  /// No description provided for @faq1a.
  ///
  /// In en, this message translates to:
  /// **'Earnings are settled to your bank account after the service is completed, minus the 5% platform fee.'**
  String get faq1a;

  /// No description provided for @faq2q.
  ///
  /// In en, this message translates to:
  /// **'Why does the pilgrim pay more than my price?'**
  String get faq2q;

  /// No description provided for @faq2a.
  ///
  /// In en, this message translates to:
  /// **'18% GST and the 5% platform fee are added on top of your price at checkout.'**
  String get faq2a;

  /// No description provided for @faq3q.
  ///
  /// In en, this message translates to:
  /// **'How long does verification take?'**
  String get faq3q;

  /// No description provided for @faq3a.
  ///
  /// In en, this message translates to:
  /// **'Usually within 24 hours once all documents and the bank account are added.'**
  String get faq3a;

  /// No description provided for @all.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get all;

  /// No description provided for @draft.
  ///
  /// In en, this message translates to:
  /// **'Draft'**
  String get draft;

  /// No description provided for @stepDetails.
  ///
  /// In en, this message translates to:
  /// **'Details'**
  String get stepDetails;

  /// No description provided for @stepKyc.
  ///
  /// In en, this message translates to:
  /// **'KYC'**
  String get stepKyc;

  /// No description provided for @stepVerify.
  ///
  /// In en, this message translates to:
  /// **'Verify'**
  String get stepVerify;

  /// No description provided for @docsSecure.
  ///
  /// In en, this message translates to:
  /// **'Your documents are encrypted and used only for verification.'**
  String get docsSecure;

  /// No description provided for @businessType.
  ///
  /// In en, this message translates to:
  /// **'Business type'**
  String get businessType;

  /// No description provided for @account.
  ///
  /// In en, this message translates to:
  /// **'My account'**
  String get account;

  /// No description provided for @settings.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get settings;
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

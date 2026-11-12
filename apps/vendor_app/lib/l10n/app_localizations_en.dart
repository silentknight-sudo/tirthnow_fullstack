// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appName => 'TirthNow Partner';

  @override
  String get emptyList => 'Nothing here yet';

  @override
  String get errorOffline => 'You\'re offline. Check your connection.';

  @override
  String get errorGeneric => 'Something went wrong. Please try again.';

  @override
  String get retry => 'Retry';

  @override
  String get save => 'Save';

  @override
  String get cancel => 'Cancel';

  @override
  String get add => 'Add';

  @override
  String get edit => 'Edit';

  @override
  String get next => 'Continue';

  @override
  String get back => 'Back';

  @override
  String get saved => 'Saved';

  @override
  String get required => 'Required';

  @override
  String get invalidValue => 'Check this value';

  @override
  String get loginTitle => 'Grow your business with pilgrims';

  @override
  String get loginSub => 'Cabs, stays, restaurants and temple stores — one partner app for Braj.';

  @override
  String get phoneLabel => 'Mobile number';

  @override
  String get phoneHint => '10-digit mobile number';

  @override
  String get sendOtp => 'Send OTP';

  @override
  String get otpLabel => '6-digit OTP';

  @override
  String otpSentTo(String phone) {
    return 'OTP sent to $phone';
  }

  @override
  String get mockOtpHint => 'Demo mode: use 123456';

  @override
  String get verify => 'Verify & continue';

  @override
  String get changeNumber => 'Change number';

  @override
  String get language => 'हिंदी';

  @override
  String get obChooseTitle => 'Which service do you offer?';

  @override
  String get obChooseSub => 'Pick one. You can register another business later.';

  @override
  String get svcCab => 'Cab & Taxi';

  @override
  String get svcCabSub => 'Bike, auto and car rides';

  @override
  String get svcHotel => 'Hotel';

  @override
  String get svcHotelSub => 'Rooms listed under Stay';

  @override
  String get svcDharamshala => 'Dharamshala';

  @override
  String get svcDharamshalaSub => 'Pilgrim rest houses, under Stay';

  @override
  String get svcRestaurant => 'Restaurant';

  @override
  String get svcRestaurantSub => 'Satvik food, dine-in and orders';

  @override
  String get svcStore => 'Temple Store';

  @override
  String get svcStoreSub => 'Pooja items, prasad, poshak';

  @override
  String get obBusinessTitle => 'Business details';

  @override
  String get displayName => 'Business name (shown to pilgrims)';

  @override
  String get legalName => 'Legal name (as on PAN)';

  @override
  String get city => 'City';

  @override
  String get pan => 'PAN';

  @override
  String get gstin => 'GSTIN (optional)';

  @override
  String get createAccount => 'Create partner account';

  @override
  String get kycTitle => 'Verify your business';

  @override
  String get kycSub => 'Upload clear photos. Each document is checked before you go live.';

  @override
  String get kycHow => 'How verification works';

  @override
  String get kycHowBody =>
      '1. PAN and GSTIN are matched with government records.\n2. Aadhaar is verified through DigiLocker / e-KYC with your consent.\n3. Licences (FSSAI, trade licence, RC, driving licence) are checked by our team.\n4. Your bank account is confirmed with a ₹1 test deposit.\nIn demo mode documents are accepted instantly.';

  @override
  String get docPan => 'PAN card';

  @override
  String get docAadhaar => 'Aadhaar card';

  @override
  String get docGst => 'GST certificate';

  @override
  String get docFssai => 'FSSAI licence';

  @override
  String get docTradeLicense => 'Trade licence';

  @override
  String get docRc => 'Vehicle RC';

  @override
  String get docDrivingLicence => 'Driving licence';

  @override
  String get docPermit => 'Permit';

  @override
  String get docOther => 'Other document';

  @override
  String get upload => 'Upload';

  @override
  String get uploaded => 'Uploaded';

  @override
  String get docApproved => 'Verified';

  @override
  String get docRejected => 'Rejected';

  @override
  String get docPending => 'In review';

  @override
  String get bankTitle => 'Payout bank account';

  @override
  String get accountHolder => 'Account holder name';

  @override
  String get accountNumber => 'Account number';

  @override
  String get ifsc => 'IFSC';

  @override
  String get addBank => 'Add bank account';

  @override
  String get submitKyc => 'Submit for verification';

  @override
  String missingDocs(String docs) {
    return 'Still needed: $docs';
  }

  @override
  String get waitingTitle => 'Waiting for approval';

  @override
  String get waitingBody =>
      'Thanks! Our team is reviewing your documents. You\'ll be listed for pilgrims as soon as you\'re approved.';

  @override
  String get rejectedTitle => 'Some documents need attention';

  @override
  String get fixDocs => 'Fix documents';

  @override
  String get suspendedTitle => 'Account suspended';

  @override
  String get checkStatus => 'Check status';

  @override
  String get signOut => 'Sign out';

  @override
  String get tabDashboard => 'Dashboard';

  @override
  String get tabOrders => 'Orders';

  @override
  String get tabListings => 'Listings';

  @override
  String get tabMore => 'More';

  @override
  String hello(String name) {
    return 'Namaste, $name';
  }

  @override
  String get live => 'Live for pilgrims';

  @override
  String get days7 => '7 days';

  @override
  String get days30 => '30 days';

  @override
  String get days90 => '90 days';

  @override
  String get earnings => 'Your earnings';

  @override
  String get earningsNote =>
      'After the 5% platform fee. GST collected is paid out to you for filing.';

  @override
  String get statOrders => 'Orders';

  @override
  String get statGross => 'Gross sales';

  @override
  String get statAvg => 'Avg order';

  @override
  String get statDiscounts => 'Coupon discounts';

  @override
  String get salesTrend => 'Daily earnings';

  @override
  String get topItems => 'Best sellers';

  @override
  String get ratings => 'Customer ratings';

  @override
  String ratingCount(String count) {
    return '$count ratings';
  }

  @override
  String get seeReviews => 'See reviews';

  @override
  String get ordersPending => 'New';

  @override
  String get ordersActive => 'Active';

  @override
  String get ordersDone => 'Completed';

  @override
  String get ordersCancelled => 'Cancelled';

  @override
  String get accept => 'Accept';

  @override
  String get reject => 'Reject';

  @override
  String get start => 'Start';

  @override
  String get complete => 'Mark complete';

  @override
  String get rejectReason => 'Reason';

  @override
  String youGet(String amount) {
    return 'You get $amount';
  }

  @override
  String customerPays(String amount) {
    return 'Pilgrim pays $amount';
  }

  @override
  String get priceNote => 'Pilgrims see your price + 18% GST + 5% platform fee.';

  @override
  String get basePrice => 'Your price (₹)';

  @override
  String get vehicles => 'Vehicles';

  @override
  String get fares => 'Fares';

  @override
  String get addVehicle => 'Add vehicle';

  @override
  String get vehicleClass => 'Vehicle type';

  @override
  String get regNo => 'Registration no.';

  @override
  String get model => 'Model';

  @override
  String get seats => 'Seats';

  @override
  String get driverName => 'Driver name';

  @override
  String get baseFare => 'Base fare (₹)';

  @override
  String get perKm => 'Per km (₹)';

  @override
  String get perMin => 'Per minute (₹)';

  @override
  String get minFare => 'Minimum fare (₹)';

  @override
  String get nightPct => 'Night surcharge %';

  @override
  String get setFare => 'Set fare';

  @override
  String get cabBike => 'Bike';

  @override
  String get cabAuto => 'Auto';

  @override
  String get cabERickshaw => 'E-rickshaw';

  @override
  String get cabHatchback => 'Hatchback';

  @override
  String get cabSedan => 'Sedan';

  @override
  String get cabSuv => 'SUV';

  @override
  String get cabTempo => 'Tempo traveller';

  @override
  String get properties => 'Properties';

  @override
  String get addProperty => 'Add property';

  @override
  String get propertyName => 'Property name';

  @override
  String get address => 'Address';

  @override
  String get roomTypes => 'Room types';

  @override
  String get addRoomType => 'Add room type';

  @override
  String get roomName => 'Room name';

  @override
  String get maxGuests => 'Max guests';

  @override
  String get totalRooms => 'Rooms';

  @override
  String get perNight => 'per night';

  @override
  String get published => 'Published';

  @override
  String get hidden => 'Hidden';

  @override
  String get restaurants => 'Restaurants';

  @override
  String get addRestaurant => 'Add restaurant';

  @override
  String get restaurantName => 'Restaurant name';

  @override
  String get pureVeg => 'Pure veg';

  @override
  String get satvik => 'Satvik (no onion-garlic)';

  @override
  String get menu => 'Menu';

  @override
  String get addMenuItem => 'Add dish';

  @override
  String get dishName => 'Dish name';

  @override
  String get category => 'Category';

  @override
  String get jain => 'Jain';

  @override
  String get available => 'Available';

  @override
  String get products => 'Products';

  @override
  String get addProduct => 'Add product';

  @override
  String get productName => 'Product name';

  @override
  String get description => 'Description';

  @override
  String get mrp => 'MRP (₹, optional)';

  @override
  String get stock => 'Stock';

  @override
  String get unit => 'Unit (piece, pack, kg)';

  @override
  String get addPhoto => 'Add photo';

  @override
  String inStock(String n) {
    return '$n in stock';
  }

  @override
  String sold(String n) {
    return '$n sold';
  }

  @override
  String get delete => 'Delete';

  @override
  String get catPoojaThali => 'Pooja thali';

  @override
  String get catDiyaDhoop => 'Diya & dhoop';

  @override
  String get catGarland => 'Garlands';

  @override
  String get catPrasad => 'Prasad';

  @override
  String get catPoshak => 'Poshak';

  @override
  String get catTilakMala => 'Tilak & mala';

  @override
  String get catIdols => 'Idols';

  @override
  String get catBooks => 'Books';

  @override
  String get catOther => 'Other';

  @override
  String get coupons => 'Coupons';

  @override
  String get couponsSub => 'Offer discounts to bring more pilgrims';

  @override
  String get addCoupon => 'Create coupon';

  @override
  String get couponCode => 'Code (e.g. RADHE10)';

  @override
  String get percentOff => '% off';

  @override
  String get flatOff => 'Flat ₹ off';

  @override
  String get discountValue => 'Discount';

  @override
  String get minOrder => 'Minimum order (₹)';

  @override
  String get maxDiscount => 'Max discount (₹, optional)';

  @override
  String get usageLimit => 'Usage limit (optional)';

  @override
  String get validDays => 'Valid for days (optional)';

  @override
  String used(String n) {
    return 'Used $n';
  }

  @override
  String get active => 'Active';

  @override
  String get reviews => 'Reviews';

  @override
  String get reply => 'Reply';

  @override
  String get yourReply => 'Your reply';

  @override
  String get profile => 'Business profile';

  @override
  String get kycStatus => 'Verification';

  @override
  String get statusActive => 'Approved';

  @override
  String get statusPending => 'Under review';

  @override
  String get statusDraft => 'Incomplete';

  @override
  String get statusRejected => 'Needs changes';

  @override
  String get statusSuspended => 'Suspended';

  @override
  String get switchLanguage => 'Language';

  @override
  String get help => 'Partner support';
}

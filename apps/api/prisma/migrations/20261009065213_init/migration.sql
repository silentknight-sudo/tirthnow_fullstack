-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "citext";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('active', 'suspended', 'deleted');

-- CreateEnum
CREATE TYPE "role_key" AS ENUM ('user', 'vendor_owner', 'vendor_staff', 'admin', 'super_admin');

-- CreateEnum
CREATE TYPE "device_platform" AS ENUM ('android', 'ios', 'web');

-- CreateEnum
CREATE TYPE "aarti_kind" AS ENUM ('mangla', 'shringar', 'rajbhog', 'utthapan', 'sandhya', 'shayan', 'other');

-- CreateEnum
CREATE TYPE "poi_category" AS ENUM ('hospital', 'police', 'pharmacy', 'atm', 'parking', 'toilet', 'water', 'ghat', 'other');

-- CreateEnum
CREATE TYPE "explore_kind" AS ENUM ('ghat', 'kund', 'van', 'market', 'museum', 'food_spot', 'story');

-- CreateEnum
CREATE TYPE "media_kind" AS ENUM ('image', 'video', 'document', 'audio');

-- CreateEnum
CREATE TYPE "media_status" AS ENUM ('pending_upload', 'uploaded', 'processing', 'ready', 'failed');

-- CreateEnum
CREATE TYPE "vendor_type" AS ENUM ('hotel', 'cab', 'restaurant', 'experience', 'multi');

-- CreateEnum
CREATE TYPE "vendor_status" AS ENUM ('draft', 'kyc_pending', 'kyc_rejected', 'active', 'suspended');

-- CreateEnum
CREATE TYPE "kyc_doc_type" AS ENUM ('pan', 'gst', 'aadhaar', 'fssai', 'trade_license', 'rc', 'permit', 'other');

-- CreateEnum
CREATE TYPE "kyc_status" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "vehicle_class" AS ENUM ('auto', 'hatchback', 'sedan', 'suv', 'tempo_traveller', 'e_rickshaw');

-- CreateEnum
CREATE TYPE "experience_kind" AS ENUM ('guided_tour', 'boat_ride', 'parikrama_guide', 'cooking', 'workshop', 'other');

-- CreateEnum
CREATE TYPE "order_type" AS ENUM ('hotel', 'cab', 'food', 'experience', 'transit');

-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'refunded');

-- CreateEnum
CREATE TYPE "actor_type" AS ENUM ('user', 'vendor', 'admin', 'system', 'provider');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('created', 'authorized', 'captured', 'failed', 'refunded', 'partially_refunded');

-- CreateEnum
CREATE TYPE "refund_status" AS ENUM ('pending', 'processed', 'failed');

-- CreateEnum
CREATE TYPE "ledger_account" AS ENUM ('platform_clearing', 'vendor_payable', 'platform_revenue', 'gst_payable', 'refunds_payable');

-- CreateEnum
CREATE TYPE "payout_status" AS ENUM ('pending_approval', 'approved', 'processing', 'paid', 'failed', 'on_hold');

-- CreateEnum
CREATE TYPE "review_target" AS ENUM ('hotel', 'restaurant', 'experience', 'vendor', 'temple');

-- CreateEnum
CREATE TYPE "moderation_status" AS ENUM ('pending', 'approved', 'flagged', 'removed');

-- CreateEnum
CREATE TYPE "reel_status" AS ENUM ('processing', 'published', 'hidden', 'removed');

-- CreateEnum
CREATE TYPE "report_target" AS ENUM ('reel', 'comment', 'review', 'user', 'vendor');

-- CreateEnum
CREATE TYPE "report_status" AS ENUM ('open', 'actioned', 'dismissed');

-- CreateEnum
CREATE TYPE "mod_action" AS ENUM ('approve', 'hide', 'remove', 'warn_user', 'suspend_user', 'restore');

-- CreateEnum
CREATE TYPE "knowledge_source" AS ENUM ('upload', 'url', 'text', 'cms');

-- CreateEnum
CREATE TYPE "kdoc_status" AS ENUM ('draft', 'pending_approval', 'approved', 'indexing', 'indexed', 'failed', 'archived');

-- CreateEnum
CREATE TYPE "chat_role" AS ENUM ('user', 'assistant', 'tool', 'system');

-- CreateEnum
CREATE TYPE "itinerary_status" AS ENUM ('draft', 'saved', 'archived');

-- CreateEnum
CREATE TYPE "itin_item_kind" AS ENUM ('temple', 'aarti', 'meal', 'travel', 'stay', 'explore', 'rest', 'custom');

-- CreateEnum
CREATE TYPE "notif_channel" AS ENUM ('push', 'sms', 'whatsapp', 'email', 'in_app');

-- CreateEnum
CREATE TYPE "notif_status" AS ENUM ('queued', 'sent', 'delivered', 'failed', 'read');

-- CreateEnum
CREATE TYPE "sos_status" AS ENUM ('triggered', 'dispatched', 'resolved', 'cancelled', 'false_alarm');

-- CreateEnum
CREATE TYPE "config_kind" AS ENUM ('feature_flag', 'banner', 'setting');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "firebase_uid" TEXT,
    "email" CITEXT,
    "phone_e164" TEXT,
    "password_hash" TEXT,
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "is_guest" BOOLEAN NOT NULL DEFAULT false,
    "status" "user_status" NOT NULL DEFAULT 'active',
    "last_login_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "user_id" UUID NOT NULL,
    "display_name" TEXT,
    "avatar_media_id" UUID,
    "preferred_lang" TEXT NOT NULL DEFAULT 'en',
    "home_city_id" UUID,
    "accessibility" JSONB NOT NULL DEFAULT '{}',
    "notification_prefs" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" "role_key" NOT NULL,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "vendor_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "fcm_token" TEXT,
    "platform" "device_platform" NOT NULL,
    "app_version" TEXT,
    "locale" TEXT,
    "last_seen_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "device_id" UUID,
    "token_hash" TEXT NOT NULL,
    "family_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone_e164" TEXT NOT NULL,
    "relation" TEXT,
    "notify_whatsapp" BOOLEAN NOT NULL DEFAULT true,
    "priority" SMALLINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "emergency_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name_i18n" JSONB NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "sort_order" SMALLINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "temples" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "city_id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name_i18n" JSONB NOT NULL,
    "description_i18n" JSONB,
    "history_i18n" JSONB,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "opening_hours" JSONB NOT NULL DEFAULT '{}',
    "dress_code_i18n" JSONB,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cover_media_id" UUID,
    "gallery_media_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "crowd_level" SMALLINT NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "temples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aarti_schedules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "temple_id" UUID NOT NULL,
    "kind" "aarti_kind" NOT NULL,
    "name_i18n" JSONB NOT NULL,
    "local_time" TIME(0) NOT NULL,
    "duration_min" SMALLINT NOT NULL DEFAULT 15,
    "recurrence" TEXT NOT NULL DEFAULT 'FREQ=DAILY',
    "valid_from" DATE,
    "valid_to" DATE,
    "season" TEXT NOT NULL DEFAULT 'all',
    "is_live_streamed" BOOLEAN NOT NULL DEFAULT false,
    "stream_url" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "aarti_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "festivals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "city_id" UUID,
    "temple_id" UUID,
    "name_i18n" JSONB NOT NULL,
    "description_i18n" JSONB,
    "starts_on" DATE NOT NULL,
    "ends_on" DATE NOT NULL,
    "crowd_advisory_i18n" JSONB,
    "cover_media_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "festivals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pois" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "city_id" UUID NOT NULL,
    "category" "poi_category" NOT NULL,
    "name_i18n" JSONB NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "phone_e164" TEXT,
    "is_24x7" BOOLEAN NOT NULL DEFAULT false,
    "is_emergency" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "pois_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "explore_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "city_id" UUID NOT NULL,
    "kind" "explore_kind" NOT NULL,
    "title_i18n" JSONB NOT NULL,
    "body_i18n" JSONB,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "cover_media_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "explore_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parikrama_routes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name_i18n" JSONB NOT NULL,
    "description_i18n" JSONB,
    "distance_m" INTEGER NOT NULL,
    "est_duration_min" INTEGER NOT NULL,
    "polyline" TEXT,
    "difficulty" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "parikrama_routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parikrama_route_stops" (
    "route_id" UUID NOT NULL,
    "seq" SMALLINT NOT NULL,
    "temple_id" UUID,
    "poi_id" UUID,
    "note_i18n" JSONB,

    CONSTRAINT "parikrama_route_stops_pkey" PRIMARY KEY ("route_id","seq")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_user_id" UUID,
    "kind" "media_kind" NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "duration_ms" INTEGER,
    "status" "media_status" NOT NULL DEFAULT 'pending_upload',
    "variants" JSONB NOT NULL DEFAULT '{}',
    "blurhash" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_user_id" UUID NOT NULL,
    "type" "vendor_type" NOT NULL,
    "legal_name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "gstin" TEXT,
    "pan" TEXT,
    "city_id" UUID,
    "status" "vendor_status" NOT NULL DEFAULT 'draft',
    "razorpay_linked_account_id" TEXT,
    "commission_rule_id" UUID,
    "approved_at" TIMESTAMPTZ(3),
    "approved_by" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_kyc_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "doc_type" "kyc_doc_type" NOT NULL,
    "media_id" UUID NOT NULL,
    "status" "kyc_status" NOT NULL DEFAULT 'pending',
    "reviewer_note" TEXT,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "vendor_kyc_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_staff" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "vendor_staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_bank_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "account_holder" TEXT NOT NULL,
    "account_number_enc" TEXT NOT NULL,
    "account_last4" TEXT NOT NULL,
    "ifsc" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "vendor_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotels" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "city_id" UUID NOT NULL,
    "name_i18n" JSONB NOT NULL,
    "description_i18n" JSONB,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "address" TEXT NOT NULL,
    "star_rating" SMALLINT,
    "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "checkin_time" TIME(0) NOT NULL,
    "checkout_time" TIME(0) NOT NULL,
    "cancellation_policy" JSONB NOT NULL DEFAULT '{}',
    "rating_avg" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "hotels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hotel_id" UUID NOT NULL,
    "name_i18n" JSONB NOT NULL,
    "max_guests" SMALLINT NOT NULL,
    "base_price_paise" INTEGER NOT NULL,
    "total_rooms" INTEGER NOT NULL,
    "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "media_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "room_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_inventory" (
    "room_type_id" UUID NOT NULL,
    "stay_date" DATE NOT NULL,
    "total" INTEGER NOT NULL,
    "available" INTEGER NOT NULL,
    "price_paise" INTEGER NOT NULL,
    "stop_sell" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "room_inventory_pkey" PRIMARY KEY ("room_type_id","stay_date")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "class" "vehicle_class" NOT NULL,
    "registration_no" TEXT NOT NULL,
    "model" TEXT,
    "seats" SMALLINT NOT NULL,
    "driver_name" TEXT,
    "driver_phone_e164" TEXT,
    "driver_user_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cab_fares" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "class" "vehicle_class" NOT NULL,
    "base_fare_paise" INTEGER NOT NULL,
    "per_km_paise" INTEGER NOT NULL,
    "per_min_paise" INTEGER NOT NULL,
    "min_fare_paise" INTEGER NOT NULL,
    "night_surcharge_pct" SMALLINT NOT NULL DEFAULT 0,
    "fixed_routes" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "cab_fares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "city_id" UUID NOT NULL,
    "name_i18n" JSONB NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "is_pure_veg" BOOLEAN NOT NULL DEFAULT true,
    "is_satvik" BOOLEAN NOT NULL DEFAULT false,
    "fssai_no" TEXT,
    "opening_hours" JSONB NOT NULL DEFAULT '{}',
    "external_links" JSONB NOT NULL DEFAULT '{}',
    "accepts_orders" BOOLEAN NOT NULL DEFAULT false,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "restaurant_id" UUID NOT NULL,
    "name_i18n" JSONB NOT NULL,
    "category" TEXT NOT NULL,
    "price_paise" INTEGER NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "is_jain" BOOLEAN NOT NULL DEFAULT false,
    "media_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "city_id" UUID NOT NULL,
    "kind" "experience_kind" NOT NULL,
    "title_i18n" JSONB NOT NULL,
    "description_i18n" JSONB,
    "price_paise" INTEGER NOT NULL,
    "duration_min" SMALLINT NOT NULL,
    "max_group_size" SMALLINT NOT NULL,
    "cancellation_policy" JSONB NOT NULL DEFAULT '{}',
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experience_slots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "experience_id" UUID NOT NULL,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "booked" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "experience_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "vendor_id" UUID,
    "type" "order_type" NOT NULL,
    "status" "order_status" NOT NULL DEFAULT 'pending',
    "subtotal_paise" INTEGER NOT NULL,
    "tax_paise" INTEGER NOT NULL DEFAULT 0,
    "discount_paise" INTEGER NOT NULL DEFAULT 0,
    "fee_paise" INTEGER NOT NULL DEFAULT 0,
    "total_paise" INTEGER NOT NULL,
    "commission_paise" INTEGER,
    "commission_rule_id" UUID,
    "service_starts_at" TIMESTAMPTZ(3),
    "service_ends_at" TIMESTAMPTZ(3),
    "hold_expires_at" TIMESTAMPTZ(3),
    "details" JSONB NOT NULL DEFAULT '{}',
    "idempotency_key" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "item_type" TEXT NOT NULL,
    "ref_id" UUID,
    "stay_date" DATE,
    "quantity" INTEGER NOT NULL,
    "unit_price_paise" INTEGER NOT NULL,
    "total_paise" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "from_status" "order_status",
    "to_status" "order_status" NOT NULL,
    "actor_type" "actor_type" NOT NULL,
    "actor_id" UUID,
    "reason" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cancellations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "cancelled_by_type" "actor_type" NOT NULL,
    "cancelled_by" UUID,
    "reason_code" TEXT NOT NULL,
    "reason_text" TEXT,
    "refundable_paise" INTEGER NOT NULL DEFAULT 0,
    "penalty_paise" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cancellations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scope" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "response_status" INTEGER,
    "response_body" JSONB,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_order_id" TEXT NOT NULL,
    "provider_payment_id" TEXT,
    "status" "payment_status" NOT NULL DEFAULT 'created',
    "amount_paise" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'INR',
    "method" TEXT,
    "raw" JSONB NOT NULL DEFAULT '{}',
    "captured_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" TEXT NOT NULL,
    "provider_event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payment_id" UUID,
    "payload" JSONB NOT NULL,
    "signature_valid" BOOLEAN NOT NULL,
    "processed_at" TIMESTAMPTZ(3),
    "processing_error" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payment_id" UUID NOT NULL,
    "cancellation_id" UUID,
    "provider_refund_id" TEXT,
    "amount_paise" INTEGER NOT NULL,
    "status" "refund_status" NOT NULL DEFAULT 'pending',
    "reason" TEXT,
    "initiated_by" UUID,
    "idempotency_key" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "order_type" "order_type",
    "vendor_id" UUID,
    "city_id" UUID,
    "percent_bps" INTEGER NOT NULL DEFAULT 0,
    "flat_paise" INTEGER NOT NULL DEFAULT 0,
    "min_paise" INTEGER,
    "max_paise" INTEGER,
    "effective_from" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_to" TIMESTAMPTZ(3),
    "priority" SMALLINT NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "commission_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "txn_id" UUID NOT NULL,
    "account" "ledger_account" NOT NULL,
    "vendor_id" UUID,
    "order_id" UUID,
    "payout_id" UUID,
    "debit_paise" BIGINT NOT NULL DEFAULT 0,
    "credit_paise" BIGINT NOT NULL DEFAULT 0,
    "memo" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "amount_paise" BIGINT NOT NULL,
    "status" "payout_status" NOT NULL DEFAULT 'pending_approval',
    "provider_transfer_id" TEXT,
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ(3),
    "paid_at" TIMESTAMPTZ(3),
    "failure_reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "order_id" UUID,
    "target_type" "review_target" NOT NULL,
    "target_id" UUID NOT NULL,
    "rating" SMALLINT NOT NULL,
    "body" TEXT,
    "media_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "vendor_reply" TEXT,
    "vendor_replied_at" TIMESTAMPTZ(3),
    "moderation_status" "moderation_status" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reels" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "video_media_id" UUID NOT NULL,
    "thumbnail_media_id" UUID,
    "caption" TEXT,
    "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "city_id" UUID,
    "temple_id" UUID,
    "duration_ms" INTEGER,
    "status" "reel_status" NOT NULL DEFAULT 'processing',
    "moderation_status" "moderation_status" NOT NULL DEFAULT 'pending',
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "save_count" INTEGER NOT NULL DEFAULT 0,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "reels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reel_likes" (
    "reel_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reel_likes_pkey" PRIMARY KEY ("reel_id","user_id")
);

-- CreateTable
CREATE TABLE "reel_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reel_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "parent_id" UUID,
    "body" TEXT NOT NULL,
    "moderation_status" "moderation_status" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "reel_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reel_saves" (
    "reel_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reel_saves_pkey" PRIMARY KEY ("reel_id","user_id")
);

-- CreateTable
CREATE TABLE "follows" (
    "follower_id" UUID NOT NULL,
    "followee_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("follower_id","followee_id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reporter_id" UUID,
    "target_type" "report_target" NOT NULL,
    "target_id" UUID NOT NULL,
    "reason_code" TEXT NOT NULL,
    "details" TEXT,
    "ai_scores" JSONB,
    "status" "report_status" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_actions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "report_id" UUID,
    "target_type" "report_target" NOT NULL,
    "target_id" UUID NOT NULL,
    "action" "mod_action" NOT NULL,
    "actor_id" UUID,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "source_type" "knowledge_source" NOT NULL,
    "source_ref" TEXT,
    "media_id" UUID,
    "lang" TEXT NOT NULL DEFAULT 'en',
    "city_id" UUID,
    "temple_id" UUID,
    "status" "kdoc_status" NOT NULL DEFAULT 'draft',
    "content_hash" TEXT,
    "uploaded_by" UUID,
    "approved_by" UUID,
    "indexed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "knowledge_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_chunks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "document_id" UUID NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "token_count" INTEGER NOT NULL,
    "embedding" vector(1536),
    "embedding_model" TEXT,
    "city_id" UUID,
    "temple_id" UUID,
    "lang" TEXT NOT NULL DEFAULT 'en',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "title" TEXT,
    "lang" TEXT NOT NULL DEFAULT 'en',
    "city_id" UUID,
    "memory_summary" TEXT,
    "last_message_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "role" "chat_role" NOT NULL,
    "content" TEXT NOT NULL,
    "citations" JSONB,
    "tool_calls" JSONB,
    "model" TEXT,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "latency_ms" INTEGER,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itineraries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "days" SMALLINT NOT NULL,
    "budget_paise" INTEGER,
    "party_size" SMALLINT NOT NULL DEFAULT 1,
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "share_token" TEXT,
    "status" "itinerary_status" NOT NULL DEFAULT 'draft',
    "model" TEXT,
    "raw_llm_output" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "itineraries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itinerary_days" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "itinerary_id" UUID NOT NULL,
    "day_index" SMALLINT NOT NULL,
    "date" DATE NOT NULL,
    "city_id" UUID,
    "notes_i18n" JSONB,

    CONSTRAINT "itinerary_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itinerary_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "day_id" UUID NOT NULL,
    "seq" SMALLINT NOT NULL,
    "kind" "itin_item_kind" NOT NULL,
    "temple_id" UUID,
    "aarti_schedule_id" UUID,
    "poi_id" UUID,
    "explore_item_id" UUID,
    "title" TEXT NOT NULL,
    "starts_at" TIMESTAMPTZ(3),
    "ends_at" TIMESTAMPTZ(3),
    "travel_distance_m" INTEGER,
    "travel_duration_min" INTEGER,
    "est_cost_paise" INTEGER,
    "note" TEXT,

    CONSTRAINT "itinerary_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage" (
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "requests" INTEGER NOT NULL DEFAULT 0,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "cost_micros" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("user_id","date")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "channel" "notif_channel" NOT NULL,
    "title_i18n" JSONB,
    "body_i18n" JSONB NOT NULL,
    "dlt_template_id" TEXT,
    "whatsapp_template_name" TEXT,
    "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "template_id" UUID,
    "channel" "notif_channel" NOT NULL,
    "recipient" TEXT,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "status" "notif_status" NOT NULL DEFAULT 'queued',
    "provider_message_id" TEXT,
    "error" TEXT,
    "scheduled_for" TIMESTAMPTZ(3),
    "sent_at" TIMESTAMPTZ(3),
    "read_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sos_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "status" "sos_status" NOT NULL DEFAULT 'triggered',
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "accuracy_m" INTEGER,
    "location_trail" JSONB NOT NULL DEFAULT '[]',
    "battery_pct" SMALLINT,
    "share_token" TEXT NOT NULL,
    "share_expires_at" TIMESTAMPTZ(3) NOT NULL,
    "dispatch_result" JSONB NOT NULL DEFAULT '{}',
    "dispatched_at" TIMESTAMPTZ(3),
    "resolved_at" TIMESTAMPTZ(3),
    "handled_by" UUID,
    "idempotency_key" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sos_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_id" UUID,
    "actor_role" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "request_id" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_config" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "kind" "config_kind" NOT NULL,
    "targeting" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "starts_at" TIMESTAMPTZ(3),
    "ends_at" TIMESTAMPTZ(3),
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "app_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_firebase_uid_key" ON "users"("firebase_uid");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_e164_key" ON "users"("phone_e164");

-- CreateIndex
CREATE UNIQUE INDEX "roles_key_key" ON "roles"("key");

-- CreateIndex
CREATE INDEX "user_roles_user_id_idx" ON "user_roles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_id_vendor_id_key" ON "user_roles"("user_id", "role_id", "vendor_id");

-- CreateIndex
CREATE UNIQUE INDEX "devices_fcm_token_key" ON "devices"("fcm_token");

-- CreateIndex
CREATE INDEX "devices_user_id_idx" ON "devices"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_family_id_idx" ON "refresh_tokens"("family_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "emergency_contacts_user_id_idx" ON "emergency_contacts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "cities_slug_key" ON "cities"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "temples_slug_key" ON "temples"("slug");

-- CreateIndex
CREATE INDEX "temples_city_id_idx" ON "temples"("city_id");

-- CreateIndex
CREATE INDEX "temples_lat_lng_idx" ON "temples"("lat", "lng");

-- CreateIndex
CREATE INDEX "aarti_schedules_temple_id_local_time_idx" ON "aarti_schedules"("temple_id", "local_time");

-- CreateIndex
CREATE INDEX "festivals_starts_on_ends_on_idx" ON "festivals"("starts_on", "ends_on");

-- CreateIndex
CREATE INDEX "pois_city_id_category_idx" ON "pois"("city_id", "category");

-- CreateIndex
CREATE INDEX "pois_lat_lng_idx" ON "pois"("lat", "lng");

-- CreateIndex
CREATE INDEX "explore_items_city_id_kind_idx" ON "explore_items"("city_id", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "parikrama_routes_slug_key" ON "parikrama_routes"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_storage_key_key" ON "media_assets"("storage_key");

-- CreateIndex
CREATE INDEX "media_assets_owner_user_id_idx" ON "media_assets"("owner_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_razorpay_linked_account_id_key" ON "vendors"("razorpay_linked_account_id");

-- CreateIndex
CREATE INDEX "vendors_owner_user_id_idx" ON "vendors"("owner_user_id");

-- CreateIndex
CREATE INDEX "vendors_status_idx" ON "vendors"("status");

-- CreateIndex
CREATE INDEX "vendor_kyc_documents_vendor_id_idx" ON "vendor_kyc_documents"("vendor_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_staff_vendor_id_user_id_key" ON "vendor_staff"("vendor_id", "user_id");

-- CreateIndex
CREATE INDEX "vendor_bank_accounts_vendor_id_idx" ON "vendor_bank_accounts"("vendor_id");

-- CreateIndex
CREATE INDEX "hotels_city_id_idx" ON "hotels"("city_id");

-- CreateIndex
CREATE INDEX "hotels_vendor_id_idx" ON "hotels"("vendor_id");

-- CreateIndex
CREATE INDEX "hotels_lat_lng_idx" ON "hotels"("lat", "lng");

-- CreateIndex
CREATE INDEX "room_types_hotel_id_idx" ON "room_types"("hotel_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_registration_no_key" ON "vehicles"("registration_no");

-- CreateIndex
CREATE INDEX "vehicles_vendor_id_idx" ON "vehicles"("vendor_id");

-- CreateIndex
CREATE UNIQUE INDEX "cab_fares_vendor_id_class_key" ON "cab_fares"("vendor_id", "class");

-- CreateIndex
CREATE INDEX "restaurants_city_id_idx" ON "restaurants"("city_id");

-- CreateIndex
CREATE INDEX "restaurants_vendor_id_idx" ON "restaurants"("vendor_id");

-- CreateIndex
CREATE INDEX "menu_items_restaurant_id_idx" ON "menu_items"("restaurant_id");

-- CreateIndex
CREATE INDEX "experiences_city_id_idx" ON "experiences"("city_id");

-- CreateIndex
CREATE INDEX "experiences_vendor_id_idx" ON "experiences"("vendor_id");

-- CreateIndex
CREATE UNIQUE INDEX "experience_slots_experience_id_starts_at_key" ON "experience_slots"("experience_id", "starts_at");

-- CreateIndex
CREATE UNIQUE INDEX "orders_code_key" ON "orders"("code");

-- CreateIndex
CREATE INDEX "orders_user_id_created_at_idx" ON "orders"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "orders_vendor_id_status_created_at_idx" ON "orders"("vendor_id", "status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "orders_status_hold_expires_at_idx" ON "orders"("status", "hold_expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "orders_user_id_idempotency_key_key" ON "orders"("user_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_status_history_order_id_created_at_idx" ON "order_status_history"("order_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "cancellations_order_id_key" ON "cancellations"("order_id");

-- CreateIndex
CREATE INDEX "idempotency_keys_expires_at_idx" ON "idempotency_keys"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_keys_scope_user_id_key_key" ON "idempotency_keys"("scope", "user_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_order_id_key" ON "payments"("provider_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_payment_id_key" ON "payments"("provider_payment_id");

-- CreateIndex
CREATE INDEX "payments_order_id_idx" ON "payments"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_events_provider_provider_event_id_key" ON "payment_events"("provider", "provider_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_provider_refund_id_key" ON "refunds"("provider_refund_id");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_idempotency_key_key" ON "refunds"("idempotency_key");

-- CreateIndex
CREATE INDEX "refunds_payment_id_idx" ON "refunds"("payment_id");

-- CreateIndex
CREATE INDEX "commission_rules_is_active_order_type_idx" ON "commission_rules"("is_active", "order_type");

-- CreateIndex
CREATE INDEX "ledger_entries_txn_id_idx" ON "ledger_entries"("txn_id");

-- CreateIndex
CREATE INDEX "ledger_entries_vendor_id_account_created_at_idx" ON "ledger_entries"("vendor_id", "account", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payouts_provider_transfer_id_key" ON "payouts"("provider_transfer_id");

-- CreateIndex
CREATE INDEX "payouts_vendor_id_status_idx" ON "payouts"("vendor_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_order_id_key" ON "reviews"("order_id");

-- CreateIndex
CREATE INDEX "reviews_target_type_target_id_created_at_idx" ON "reviews"("target_type", "target_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "reels_status_score_idx" ON "reels"("status", "score" DESC);

-- CreateIndex
CREATE INDEX "reels_user_id_created_at_idx" ON "reels"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "reels_hashtags_idx" ON "reels" USING GIN ("hashtags");

-- CreateIndex
CREATE INDEX "reel_comments_reel_id_created_at_idx" ON "reel_comments"("reel_id", "created_at");

-- CreateIndex
CREATE INDEX "follows_followee_id_idx" ON "follows"("followee_id");

-- CreateIndex
CREATE INDEX "reports_status_created_at_idx" ON "reports"("status", "created_at");

-- CreateIndex
CREATE INDEX "reports_target_type_target_id_idx" ON "reports"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "moderation_actions_target_type_target_id_idx" ON "moderation_actions"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "knowledge_documents_status_idx" ON "knowledge_documents"("status");

-- CreateIndex
CREATE INDEX "knowledge_chunks_city_id_idx" ON "knowledge_chunks"("city_id");

-- CreateIndex
CREATE INDEX "knowledge_chunks_temple_id_idx" ON "knowledge_chunks"("temple_id");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_chunks_document_id_chunk_index_key" ON "knowledge_chunks"("document_id", "chunk_index");

-- CreateIndex
CREATE INDEX "chat_sessions_user_id_last_message_at_idx" ON "chat_sessions"("user_id", "last_message_at" DESC);

-- CreateIndex
CREATE INDEX "chat_messages_session_id_created_at_idx" ON "chat_messages"("session_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "itineraries_share_token_key" ON "itineraries"("share_token");

-- CreateIndex
CREATE INDEX "itineraries_user_id_created_at_idx" ON "itineraries"("user_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "itinerary_days_itinerary_id_day_index_key" ON "itinerary_days"("itinerary_id", "day_index");

-- CreateIndex
CREATE UNIQUE INDEX "itinerary_items_day_id_seq_key" ON "itinerary_items"("day_id", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_key_channel_key" ON "notification_templates"("key", "channel");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_status_scheduled_for_idx" ON "notifications"("status", "scheduled_for");

-- CreateIndex
CREATE UNIQUE INDEX "sos_events_share_token_key" ON "sos_events"("share_token");

-- CreateIndex
CREATE INDEX "sos_events_status_created_at_idx" ON "sos_events"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "sos_events_user_id_idempotency_key_key" ON "sos_events"("user_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "app_config_key_key" ON "app_config"("key");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_avatar_media_id_fkey" FOREIGN KEY ("avatar_media_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_home_city_id_fkey" FOREIGN KEY ("home_city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "temples" ADD CONSTRAINT "temples_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "temples" ADD CONSTRAINT "temples_cover_media_id_fkey" FOREIGN KEY ("cover_media_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aarti_schedules" ADD CONSTRAINT "aarti_schedules_temple_id_fkey" FOREIGN KEY ("temple_id") REFERENCES "temples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "festivals" ADD CONSTRAINT "festivals_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "festivals" ADD CONSTRAINT "festivals_temple_id_fkey" FOREIGN KEY ("temple_id") REFERENCES "temples"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "festivals" ADD CONSTRAINT "festivals_cover_media_id_fkey" FOREIGN KEY ("cover_media_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pois" ADD CONSTRAINT "pois_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "explore_items" ADD CONSTRAINT "explore_items_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "explore_items" ADD CONSTRAINT "explore_items_cover_media_id_fkey" FOREIGN KEY ("cover_media_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parikrama_route_stops" ADD CONSTRAINT "parikrama_route_stops_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "parikrama_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parikrama_route_stops" ADD CONSTRAINT "parikrama_route_stops_temple_id_fkey" FOREIGN KEY ("temple_id") REFERENCES "temples"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parikrama_route_stops" ADD CONSTRAINT "parikrama_route_stops_poi_id_fkey" FOREIGN KEY ("poi_id") REFERENCES "pois"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_commission_rule_id_fkey" FOREIGN KEY ("commission_rule_id") REFERENCES "commission_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_kyc_documents" ADD CONSTRAINT "vendor_kyc_documents_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_kyc_documents" ADD CONSTRAINT "vendor_kyc_documents_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_kyc_documents" ADD CONSTRAINT "vendor_kyc_documents_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_staff" ADD CONSTRAINT "vendor_staff_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_staff" ADD CONSTRAINT "vendor_staff_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_bank_accounts" ADD CONSTRAINT "vendor_bank_accounts_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_types" ADD CONSTRAINT "room_types_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_inventory" ADD CONSTRAINT "room_inventory_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_driver_user_id_fkey" FOREIGN KEY ("driver_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cab_fares" ADD CONSTRAINT "cab_fares_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_slots" ADD CONSTRAINT "experience_slots_experience_id_fkey" FOREIGN KEY ("experience_id") REFERENCES "experiences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_commission_rule_id_fkey" FOREIGN KEY ("commission_rule_id") REFERENCES "commission_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancellations" ADD CONSTRAINT "cancellations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_cancellation_id_fkey" FOREIGN KEY ("cancellation_id") REFERENCES "cancellations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_initiated_by_fkey" FOREIGN KEY ("initiated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_payout_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "payouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reels" ADD CONSTRAINT "reels_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reels" ADD CONSTRAINT "reels_video_media_id_fkey" FOREIGN KEY ("video_media_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reels" ADD CONSTRAINT "reels_thumbnail_media_id_fkey" FOREIGN KEY ("thumbnail_media_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reels" ADD CONSTRAINT "reels_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reels" ADD CONSTRAINT "reels_temple_id_fkey" FOREIGN KEY ("temple_id") REFERENCES "temples"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reel_likes" ADD CONSTRAINT "reel_likes_reel_id_fkey" FOREIGN KEY ("reel_id") REFERENCES "reels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reel_likes" ADD CONSTRAINT "reel_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reel_comments" ADD CONSTRAINT "reel_comments_reel_id_fkey" FOREIGN KEY ("reel_id") REFERENCES "reels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reel_comments" ADD CONSTRAINT "reel_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reel_comments" ADD CONSTRAINT "reel_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "reel_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reel_saves" ADD CONSTRAINT "reel_saves_reel_id_fkey" FOREIGN KEY ("reel_id") REFERENCES "reels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reel_saves" ADD CONSTRAINT "reel_saves_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followee_id_fkey" FOREIGN KEY ("followee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_temple_id_fkey" FOREIGN KEY ("temple_id") REFERENCES "temples"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "knowledge_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itineraries" ADD CONSTRAINT "itineraries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_days" ADD CONSTRAINT "itinerary_days_itinerary_id_fkey" FOREIGN KEY ("itinerary_id") REFERENCES "itineraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_days" ADD CONSTRAINT "itinerary_days_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_items" ADD CONSTRAINT "itinerary_items_day_id_fkey" FOREIGN KEY ("day_id") REFERENCES "itinerary_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_items" ADD CONSTRAINT "itinerary_items_temple_id_fkey" FOREIGN KEY ("temple_id") REFERENCES "temples"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_items" ADD CONSTRAINT "itinerary_items_aarti_schedule_id_fkey" FOREIGN KEY ("aarti_schedule_id") REFERENCES "aarti_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_items" ADD CONSTRAINT "itinerary_items_poi_id_fkey" FOREIGN KEY ("poi_id") REFERENCES "pois"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_items" ADD CONSTRAINT "itinerary_items_explore_item_id_fkey" FOREIGN KEY ("explore_item_id") REFERENCES "explore_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "notification_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sos_events" ADD CONSTRAINT "sos_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sos_events" ADD CONSTRAINT "sos_events_handled_by_fkey" FOREIGN KEY ("handled_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_config" ADD CONSTRAINT "app_config_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- Raw SQL objects Prisma cannot express (ADR-0008). Indexes are prefixed `rx_`
-- so scripts/new-migration.ts can strip the DROP statements Prisma generates
-- for them in later migrations. CHECK constraints and triggers are not diffed
-- by Prisma and need no special handling.
-- ─────────────────────────────────────────────────────────────────────────────

-- Global (non vendor-scoped) roles: one grant per user/role. NULL vendor_id is
-- not covered by the composite unique index.
CREATE UNIQUE INDEX "rx_user_roles_global_unique" ON "user_roles" ("user_id", "role_id") WHERE "vendor_id" IS NULL;

-- Fuzzy temple search (Phase 2 catalog search builds on these).
CREATE INDEX "rx_temples_name_en_trgm" ON "temples" USING GIN (("name_i18n"->>'en') gin_trgm_ops);
CREATE INDEX "rx_temples_name_hi_trgm" ON "temples" USING GIN (("name_i18n"->>'hi') gin_trgm_ops);

-- RAG retrieval: cosine similarity over 1536-d embeddings.
CREATE INDEX "rx_knowledge_chunks_embedding_hnsw" ON "knowledge_chunks" USING hnsw ("embedding" vector_cosine_ops);

-- Pending-hold sweep for expired inventory holds.
CREATE INDEX "rx_orders_pending_hold" ON "orders" ("hold_expires_at") WHERE "status" = 'pending';

-- Integrity checks.
ALTER TABLE "room_inventory" ADD CONSTRAINT "room_inventory_available_check" CHECK ("available" >= 0 AND "available" <= "total");
ALTER TABLE "room_inventory" ADD CONSTRAINT "room_inventory_price_check" CHECK ("price_paise" >= 0);
ALTER TABLE "room_types" ADD CONSTRAINT "room_types_price_check" CHECK ("base_price_paise" >= 0 AND "total_rooms" >= 0 AND "max_guests" > 0);
ALTER TABLE "experience_slots" ADD CONSTRAINT "experience_slots_booked_check" CHECK ("booked" >= 0 AND "booked" <= "capacity");
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_price_check" CHECK ("price_paise" >= 0);
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_price_check" CHECK ("price_paise" >= 0);
ALTER TABLE "cab_fares" ADD CONSTRAINT "cab_fares_amounts_check" CHECK ("base_fare_paise" >= 0 AND "per_km_paise" >= 0 AND "per_min_paise" >= 0 AND "min_fare_paise" >= 0 AND "night_surcharge_pct" BETWEEN 0 AND 100);
ALTER TABLE "orders" ADD CONSTRAINT "orders_amounts_check" CHECK ("subtotal_paise" >= 0 AND "tax_paise" >= 0 AND "discount_paise" >= 0 AND "fee_paise" >= 0 AND "total_paise" >= 0);
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_amounts_check" CHECK ("quantity" > 0 AND "unit_price_paise" >= 0 AND "total_paise" >= 0);
ALTER TABLE "payments" ADD CONSTRAINT "payments_amount_check" CHECK ("amount_paise" > 0);
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_amount_check" CHECK ("amount_paise" > 0);
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_values_check" CHECK ("percent_bps" BETWEEN 0 AND 10000 AND "flat_paise" >= 0);
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_one_side_check" CHECK (("debit_paise" >= 0 AND "credit_paise" >= 0) AND (("debit_paise" = 0) <> ("credit_paise" = 0)));
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_rating_check" CHECK ("rating" BETWEEN 1 AND 5);
ALTER TABLE "temples" ADD CONSTRAINT "temples_crowd_level_check" CHECK ("crowd_level" BETWEEN 0 AND 4);
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_star_rating_check" CHECK ("star_rating" IS NULL OR "star_rating" BETWEEN 1 AND 5);

-- Ledger: every txn_id group must balance at commit time.
CREATE FUNCTION "ledger_assert_balanced"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  imbalance bigint;
BEGIN
  SELECT COALESCE(SUM("debit_paise"), 0) - COALESCE(SUM("credit_paise"), 0)
    INTO imbalance FROM "ledger_entries" WHERE "txn_id" = NEW."txn_id";
  IF imbalance <> 0 THEN
    RAISE EXCEPTION 'ledger transaction % is unbalanced by % paise', NEW."txn_id", imbalance
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "ledger_entries_balanced"
  AFTER INSERT ON "ledger_entries"
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION "ledger_assert_balanced"();

-- Append-only tables: block UPDATE and DELETE (TRUNCATE in tests is unaffected).
CREATE FUNCTION "reject_mutation"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME USING ERRCODE = 'insufficient_privilege';
END;
$$;

CREATE TRIGGER "ledger_entries_append_only" BEFORE UPDATE OR DELETE ON "ledger_entries"
  FOR EACH ROW EXECUTE FUNCTION "reject_mutation"();
CREATE TRIGGER "audit_logs_append_only" BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION "reject_mutation"();
CREATE TRIGGER "order_status_history_append_only" BEFORE UPDATE OR DELETE ON "order_status_history"
  FOR EACH ROW EXECUTE FUNCTION "reject_mutation"();

-- Reference data: the five RBAC roles always exist.
INSERT INTO "roles" ("key", "permissions", "updated_at") VALUES
  ('user', '[]', now()),
  ('vendor_owner', '[]', now()),
  ('vendor_staff', '[]', now()),
  ('admin', '[]', now()),
  ('super_admin', '[]', now());

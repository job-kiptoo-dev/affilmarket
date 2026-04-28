import {
  pgTable, pgEnum, uuid, text, boolean, timestamp,
  integer, decimal, json, index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── ENUMS ───────────────────────────────────────────
export const roleEnum             = pgEnum('role',                       ['VENDOR', 'AFFILIATE', 'BOTH', 'ADMIN']);
export const userStatusEnum       = pgEnum('user_status',                ['active', 'suspended', 'pending_verification']);
export const vendorStatusEnum     = pgEnum('vendor_status',              ['pending', 'approved', 'rejected', 'suspended']);
export const affiliateStatusEnum  = pgEnum('affiliate_status',           ['active', 'suspended', 'pending']);
export const productStatusEnum    = pgEnum('product_status',             ['draft', 'pending_approval', 'active', 'rejected', 'inactive']);
export const paymentStatusEnum    = pgEnum('payment_status',             ['PENDING', 'PAID', 'FAILED', 'REFUNDED']);
export const orderStatusEnum      = pgEnum('order_status',               ['CREATED', 'PAID', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']);
export const payoutMethodEnum     = pgEnum('payout_method',              ['MPESA', 'BANK']);
export const payoutStatusEnum     = pgEnum('payout_status',              ['REQUESTED', 'APPROVED', 'PAID', 'REJECTED']);
export const payoutRoleEnum       = pgEnum('payout_role',                ['VENDOR', 'AFFILIATE']);
export const disputeStatusEnum    = pgEnum('dispute_status',             ['open', 'resolved']);
export const mpesaStatusEnum      = pgEnum('mpesa_transaction_status',   ['PENDING', 'SUCCESS', 'FAILED', 'TIMEOUT']);

// ─── USERS ───────────────────────────────────────────
// Better Auth generates text IDs, not UUIDs
export const users = pgTable('users', {
  id:            text('id').primaryKey(),                          // ← text (Better Auth)
  name:          text('name').notNull(),
  email:         text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image:         text('image'),
  phone:         text('phone'),
  role:          roleEnum('role').notNull(),
  status:        userStatusEnum('status').notNull().default('pending_verification'),
  createdAt:     timestamp('created_at').notNull().defaultNow(),
  updatedAt:     timestamp('updated_at').notNull().$onUpdate(() => new Date()),
});

// ─── SESSIONS ────────────────────────────────────────
export const sessions = pgTable('sessions', {
  id:        text('id').primaryKey(),                              // ← text (Better Auth)
  expiresAt: timestamp('expires_at').notNull(),
  token:     text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().$onUpdate(() => new Date()),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), // ← text
},(table)=>[ 
    index('session_user_idx').on(table.userId),
  ]);

// ─── ACCOUNTS ────────────────────────────────────────
export const accounts = pgTable('accounts', {
  id:                    text('id').primaryKey(),                  // ← text (Better Auth)
  accountId:             text('account_id').notNull(),
  providerId:            text('provider_id').notNull(),
  userId:                text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }), // ← text
  accessToken:           text('access_token'),
  refreshToken:          text('refresh_token'),
  idToken:               text('id_token'),
  accessTokenExpiresAt:  timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope:                 text('scope'),
  password:              text('password'),
  createdAt:             timestamp('created_at').notNull().defaultNow(),
  updatedAt:             timestamp('updated_at').notNull().$onUpdate(() => new Date()),
},(table)=>[
    index('account_user_idx').on(table.userId),
    index('account_provider_idx').on(table.providerId,table.accountId)
  ]
);

// ─── VERIFICATIONS ───────────────────────────────────
export const verifications = pgTable('verifications', {
  id:         text('id').primaryKey(),                             // ← text (Better Auth)
  identifier: text('identifier').notNull(),
  value:      text('value').notNull(),
  expiresAt:  timestamp('expires_at').notNull(),
  createdAt:  timestamp('created_at').defaultNow(),
  updatedAt:  timestamp('updated_at').$onUpdate(() => new Date()),
});

// ─── VENDOR PROFILES ─────────────────────────────────
export const vendorProfiles = pgTable('vendor_profiles', {
  id:             uuid('id').primaryKey().defaultRandom(),
  userId:         text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }), // ← text
  shopName:       text('shop_name').notNull(),
  legalName:      text('legal_name'),
  phone:          text('phone'),
  shopAddress:    json('shop_address'),
  kraPin:         text('kra_pin'),
  kraPinDoc:      text('kra_pin_doc'),
  logoUrl:        text('logo_url'),
  description:    text('description'),
  suspendedAt:    timestamp('suspended_at'),
  suspendedReason: text('suspended_reason'),
  status:         vendorStatusEnum('status').notNull().default('pending'),
  isOnboarded:    boolean('is_onboarded').default(false).notNull(),
  avgRating:      decimal('avg_rating', { precision: 3, scale: 2 }),
  createdAt:      timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()), // ← add defaultNow()
},
  (table) =>[ 
    index('vendor_user_idx').on(table.userId),
    index('vendor_status_idx').on(table.status)
  ]);

// ─── AFFILIATE PROFILES ──────────────────────────────
export const affiliateProfiles = pgTable('affiliate_profiles', {
  id:                uuid('id').primaryKey(),
  userId:            text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }), // ← text
  fullName:          text('full_name').notNull(),
  phone:             text('phone'),
  affiliateToken:    text('affiliate_token').notNull().unique(),
  payoutMethod:      payoutMethodEnum('payout_method').notNull().default('MPESA'),
  mpesaPhone:        text('mpesa_phone'),
  bankName:          text('bank_name'),
  bankAccountName:   text('bank_account_name'),
  bankAccountNumber: text('bank_account_number'),
  idNumber:          text('id_number'),
  isOnboarded:       boolean('is_onboarded').default(false).notNull(),
  suspendedAt:       timestamp('suspended_at'),
  suspendedReason:   text('suspended_reason'),
  status:            affiliateStatusEnum('status').notNull().default('pending'),
  createdAt:         timestamp('created_at').notNull().defaultNow(),
  updatedAt:         timestamp('updated_at').notNull().$onUpdate(() => new Date()),
},(table)=>[
    index('affiliate_user_idx').on(table.userId),
    index('affiliate_status_idx').on(table.status)
  ]
);

// ─── CATEGORIES ──────────────────────────────────────
export const categories = pgTable('categories', {
  id:        uuid('id').primaryKey(),
  name:      text('name').notNull(),
  slug:      text('slug').notNull().unique(),
  icon:      text('icon'),
  parentId:  uuid('parent_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
},(table)=>[
    index('categories_parent_idx').on(table.parentId),
]
);

// ─── PRODUCTS ────────────────────────────────────────
export const products = pgTable('products', {
  id:                      uuid('id').primaryKey(),
 // vendorId:                uuid('vendor_id').notNull().references(() => vendorProfiles.id),
  vendorId: uuid('vendor_id')
    .notNull()
    .references(() => vendorProfiles.id, { onDelete: 'cascade' }),
  title:                   text('title').notNull(),
  slug:                    text('slug').notNull().unique(),
  shortDescription:        text('short_description'),
  description:             text('description'),
  categoryId:              uuid('category_id').references(() => categories.id),
  subcategoryId:           uuid('subcategory_id').references(() => categories.id),
  sku:                     text('sku'),
  price:                   decimal('price', { precision: 10, scale: 2 }).notNull(),
  stockQuantity:           integer('stock_quantity').notNull().default(0),
  mainImageUrl:            text('main_image_url'),
  galleryImages:           json('gallery_images'),
  affiliateCommissionRate: decimal('affiliate_commission_rate', { precision: 4, scale: 3 }).notNull().default('0.10'),
  status:                  productStatusEnum('status').notNull().default('draft'),
  country:                 text('country').notNull().default('KE'),
  adminNote:               text('admin_note'),
  createdAt:               timestamp('created_at').notNull().defaultNow(),
  updatedAt:               timestamp('updated_at').notNull().$onUpdate(() => new Date()),
}, (table)=>[
    index('product_vendor_idx').on(table.vendorId),
    index('products_category_idx').on(table.categoryId),
    index('product_status_idx').on(table.status),
    //vendor
    index('product_vendor_status_idx').on(table.vendorId, table.status),
    //marketpalce listing
    index('product_category_status_idx').on(table.categoryId,table.status),
  ]
);

// ─── ORDERS ──────────────────────────────────────────
export const orders = pgTable('orders', {
  id:                  uuid('id').primaryKey(),
  vendorId:            uuid('vendor_id').notNull().references(() => vendorProfiles.id),
  affiliateId:         uuid('affiliate_id').references(() => affiliateProfiles.id),
  productId:           uuid('product_id').notNull().references(() => products.id),
  price:               decimal('price', { precision: 10, scale: 2 }).notNull(),
  quantity:            integer('quantity').notNull().default(1),
  totalAmount:         decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  customerName:        text('customer_name').notNull(),
  customerPhone:       text('customer_phone').notNull(),
  customerEmail:       text('customer_email'),
  country:             text('country').notNull().default('KE'),
  city:                text('city'),
  address:             text('address'),
  notes:               text('notes'),
  paymentStatus:       paymentStatusEnum('payment_status').notNull().default('PENDING'),
  orderStatus:         orderStatusEnum('order_status').notNull().default('CREATED'),
  paymentReference:    text('payment_reference'),
  mpesaReceiptNumber:  text('mpesa_receipt_number'),
  deliveryMethod:      text('delivery_method'),
  deliveryTracking:    text('delivery_tracking'),
  platformFee:         decimal('platform_fee', { precision: 10, scale: 2 }),
  affiliateCommission: decimal('affiliate_commission', { precision: 10, scale: 2 }),
  vendorEarnings:      decimal('vendor_earnings', { precision: 10, scale: 2 }),
  platformRevenue:     decimal('platform_revenue', { precision: 10, scale: 2 }),
  commissionsComputed: boolean('commissions_computed').notNull().default(false),
  balancesReleased:    boolean('balances_released').notNull().default(false),
  createdAt:           timestamp('created_at').notNull().defaultNow(),
  updatedAt:           timestamp('updated_at').notNull().$onUpdate(() => new Date()),
},(table)=>[
  index('orders_vendor_idx').on(table.vendorId),
  index('orders_affiliate_idx').on(table.affiliateId),
  index('orders_product_idx').on(table.productId),
  // vendor dashboard
  index('orders_vendor_created_idx')
    .on(table.vendorId, table.createdAt),
  // affiliate dashboard
  index('orders_affiliate_created_idx')
    .on(table.affiliateId, table.createdAt),
  // order tracking
  index('orders_status_idx')
    .on(table.orderStatus),
  // payment processing
  index('orders_payment_idx')
    .on(table.paymentStatus),
  ]
);

// ─── MPESA TRANSACTIONS ──────────────────────────────
export const mpesaTransactions = pgTable('mpesa_transactions', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  orderId:            uuid('order_id').references(() => orders.id),
  checkoutRequestId:  text('checkout_request_id').unique(),
  merchantRequestId:  text('merchant_request_id'),
  phoneNumber:        text('phone_number').notNull(),
  amount:             decimal('amount', { precision: 10, scale: 2 }).notNull(),
  status:             mpesaStatusEnum('status').notNull().default('PENDING'),
  mpesaReceiptNumber: text('mpesa_receipt_number'),
  resultCode:         integer('result_code'),
  resultDesc:         text('result_desc'),
  rawCallback:        json('raw_callback'),
  checkoutMetadata:   json('checkout_metadata'),
  createdAt:          timestamp('created_at').notNull().defaultNow(),
  updatedAt:          timestamp('updated_at').notNull().$onUpdate(() => new Date()),
},(table)=>[
  index('mpesa_order_idx').on(table.orderId),
  index('mpesa_checkout_idx').on(table.checkoutRequestId),
  ]
);

// ─── AFFILIATE CLICKS ────────────────────────────────
export const affiliateClicks = pgTable('affiliate_clicks', {
  id:          uuid('id').primaryKey(),

    affiliateId: uuid('affiliate_id')
    .notNull()
    .references(() => affiliateProfiles.id, { onDelete: 'cascade' }),

  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),

  // affiliateId: uuid('affiliate_id').notNull().references(() => affiliateProfiles.id),
  // productId:   uuid('product_id').notNull().references(() => products.id),
  ipAddress:   text('ip_address'),
  userAgent:   text('user_agent'),
  referrer:    text('referrer'),
  cookieToken: text('cookie_token'),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  index('affiliate_clicks_affiliate_idx').on(table.affiliateId),
  index('affiliate_clicks_cookie_idx').on(table.cookieToken),
]);

// ─── REVIEWS ─────────────────────────────────────────
export const reviews = pgTable('reviews', {
  id:         uuid('id').primaryKey(),
  orderId:    uuid('order_id').notNull().unique().references(() => orders.id),
  productId:  uuid('product_id').notNull().references(() => products.id),
  vendorId:   uuid('vendor_id').notNull().references(() => vendorProfiles.id),
  rating:     integer('rating').notNull(),
  reviewText: text('review_text'),
  createdAt:  timestamp('created_at').notNull().defaultNow(),
},(table)=>[
  index('reviews_product_idx').on(table.productId),
  index('reviews_vendor_idx').on(table.vendorId),
]
);

// ─── BALANCES ────────────────────────────────────────
export const balances = pgTable('balances', {
  id:               uuid('id').primaryKey(),
  userId:           text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }), // ← text
  pendingBalance:   decimal('pending_balance',   { precision: 10, scale: 2 }).notNull().default('0'),
  availableBalance: decimal('available_balance', { precision: 10, scale: 2 }).notNull().default('0'),
  paidOutTotal:     decimal('paid_out_total',    { precision: 10, scale: 2 }).notNull().default('0'),
  updatedAt:        timestamp('updated_at').notNull().$onUpdate(() => new Date()),
});

// ─── PAYOUT REQUESTS ─────────────────────────────────
export const payoutRequests = pgTable('payout_requests', {
  id:        uuid('id').primaryKey(),
  userId:    text('user_id').notNull().references(() => users.id), // ← text
  role:      payoutRoleEnum('role').notNull(),
  amount:    decimal('amount', { precision: 10, scale: 2 }).notNull(),
  method:    payoutMethodEnum('method').notNull(),
  status:    payoutStatusEnum('status').notNull().default('REQUESTED'),
  adminNote: text('admin_note'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().$onUpdate(() => new Date()),
},(table)=>[
    index('payout_user_idx').on(table.userId),
    index('payout_status_idx').on(table.status),
  ]);

// ─── PLATFORM SETTINGS ───────────────────────────────
export const platformSettings = pgTable('platform_settings', {
  key:       text('key').primaryKey(),
  value:     text('value').notNull(),
  updatedAt: timestamp('updated_at').notNull().$onUpdate(() => new Date()),
});

// ─── DISPUTE TICKETS ─────────────────────────────────
export const disputeTickets = pgTable('dispute_tickets', {
  id:         uuid('id').primaryKey(),
  orderId:    uuid('order_id').notNull().references(() => orders.id),
  openedById: text('opened_by_id').notNull().references(() => users.id), // ← text
  messages:   json('messages').notNull().default([]),
  status:     disputeStatusEnum('status').notNull().default('open'),
  createdAt:  timestamp('created_at').notNull().defaultNow(),
  updatedAt:  timestamp('updated_at').notNull().$onUpdate(() => new Date()),
},(table)=>[
    index('dispute_order_idx').on(table.orderId),
    index('dispute_opened_idx').on(table.openedById),
  ]
);

// ─── RELATIONS ───────────────────────────────────────
export const usersRelations = relations(users, ({ one, many }) => ({
  vendorProfile:    one(vendorProfiles,   { fields: [users.id], references: [vendorProfiles.userId] }),
  affiliateProfile: one(affiliateProfiles, { fields: [users.id], references: [affiliateProfiles.userId] }),
  balance:          one(balances,          { fields: [users.id], references: [balances.userId] }),
  sessions:         many(sessions),
  accounts:         many(accounts),
  payoutRequests:   many(payoutRequests),
  disputesOpened:   many(disputeTickets),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent:      one(categories, { fields: [categories.parentId], references: [categories.id], relationName: 'CategoryTree' }),
  children:    many(categories, { relationName: 'CategoryTree' }),
  products:    many(products,   { relationName: 'ProductCategory' }),
  subProducts: many(products,   { relationName: 'ProductSubcategory' }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  vendor:      one(vendorProfiles, { fields: [products.vendorId],      references: [vendorProfiles.id] }),
  category:    one(categories,     { fields: [products.categoryId],    references: [categories.id], relationName: 'ProductCategory' }),
  subcategory: one(categories,     { fields: [products.subcategoryId], references: [categories.id], relationName: 'ProductSubcategory' }),
  orders:      many(orders),
  clicks:      many(affiliateClicks),
  reviews:     many(reviews),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  vendor:            one(vendorProfiles,   { fields: [orders.vendorId],    references: [vendorProfiles.id] }),
  affiliate:         one(affiliateProfiles, { fields: [orders.affiliateId], references: [affiliateProfiles.id] }),
  product:           one(products,          { fields: [orders.productId],   references: [products.id] }),
  review:            one(reviews),
  disputes:          many(disputeTickets),
  mpesaTransactions: many(mpesaTransactions),
}));


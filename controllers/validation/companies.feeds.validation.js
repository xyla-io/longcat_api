const { Validating } = require('../../modules/validating');

const createTableFeedParameters = Validating.model({
  type: 'object',
  properties: {
    displayName: {
      type: 'string',
      minLength: 1,
    },
    description: {
      type: 'string',
    },
    mergeColumns: {
      type: 'array',
      items: {
        type: 'string',
        minLength: 1,
      },
      maxItems: 1024,
    },
    columnMappings: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        additionalProperties: {
          type: 'string',
          minLength: 1,
        },
        maxProperties: 1024,
      },
      maxProperties: 64,
    },
    columnTypes: {
      type: 'object',
      additionalProperties: {
        type: 'string',
        minLength: 1,
      },
      maxProperties: 1024,
    },
  },
  required: ['displayName', 'columnTypes'],
  additionalProperties: false,
});

const companyMetadataSchema = {
  type: 'object',
  properties: {
    currency: {
      type: 'string',
      minLength: 1,
    },
    display_name: {
      type: 'string',
      minLength: 1,
    },
  },
  required: [
    'currency',
    'display_name',
  ],
};

const productsSchema = {
  type: 'object',
  additionalProperties: {
    type: 'object',
    properties: {
      display_name: {
        type: 'string',
        minLength: 1,
      },
      platform_ids: {
        type: 'object',
        properties: {
          android: { type: 'string', minLength: 1 },
          ios: { type: ['number', 'string'] },
          web: { type: 'string', minLength: 1 },
        },
        additionalProperties: false,
      },
    },
    required: [
      'display_name',
      'platform_ids',
    ],
  },
};

const editsSchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      match: {
        type: 'object',
      },
      replace: {
        type: 'object',
      },
    },
  },
};

const currencyExchangeSchema = {
  type: 'object',
  properties: {
    credentials_key: { type: 'string' },
    currencies: { type: 'array', items: { type: 'string' } },
  },
  additionalProperties: false,
};

const appsflyerTaskSchema = {
  type: 'object',
  properties: {
    action: { enum: ['fetch'] },
    target: { enum: ['appsflyer'] },
    credentials_key: { type: 'string' },
    identifier: { type: 'string' },
    platforms: {
      type: 'array',
      minItems: 1,
      items: {
        enum: ['ios', 'android', 'web']
      }
    },
    custom_event_names: { type: 'array', minItems: 1, items: { type: 'string' } },
    columns: { type: 'array', minItems: 1, items: { type: 'string' } },
    product_identifiers: { type: 'array', items: { type: 'string' }, minItems: 1},
    task_types: {
      type: 'array',
      minItems: 1,
      items: {
        enum: [
          'fetch_appsflyer_purchase_events',
          'fetch_appsflyer_install_events',
          'fetch_appsflyer_custom_events',
        ]
      },
    },
    edits: editsSchema,
  },
  additionalProperties: false,
  required: [
    'action',
    'target',
    'credentials_key',
    'platforms',
    'product_identifiers',
    'task_types',
  ],
};

const appsflyerDataLockerTaskSchema = {
  type: 'object',
  properties: {
    action: { enum: ['fetch'] },
    target: { enum: ['appsflyer_data_locker'] },
    credentials_key: { type: 'string' },
    data_locker_report_type: { enum: ['inapps', 'installs'] },
    hourly_data_path: { type: 'string' },
    bucket_name: { type: 'string' },
    bucket_region: { type: 'string' },
    identifier: { type: 'string' },
    product_identifiers: { type: 'array', items: { type: 'string' }},
    task_types: {
      type: 'array',
      minItems: 1,
      items: {
        enum: ['fetch_appsflyer_data_locker']
      },
    },
    edits: editsSchema,
  },
  additionalProperties: false,
  required: [
    'action',
    'target',
    'credentials_key',
    'data_locker_report_type',
    'hourly_data_path',
    'product_identifiers',
    'task_types',
  ],
};

const adjustTaskSchema = {
  type: 'object',
  properties: {
    action: { enum: ['fetch'] },
    target: { enum: ['adjust'] },
    app_token: { type: 'string' },
    credentials_key: { type: 'string' },
    first_cohort_date: { type: 'string' },
    product_identifiers: { type: 'array', items: { type: 'string' }, minItems: 1 },
    task_types: {
      type: 'array',
      minItems: 1,
      items: {
        enum: [
          'fetch_adjust_deliverables',
          'fetch_adjust_events',
          'fetch_adjust_cohorts_measures_daily',
          'fetch_adjust_cohorts_measures_weekly',
          'fetch_adjust_cohorts_measures_monthly',
        ],
      },
    },
    edits: editsSchema,
  },
  additionalProperties: false,
  required: [
    'action',
    'target',
    'credentials_key',
    'app_token',
    'product_identifiers',
    'task_types',
  ],
};

const facebookTaskSchema = {
  type: 'object',
  properties: {
    action: { enum: ['fetch'] },
    target: { enum: ['facebook'] },
    account_id: { type: 'number' },
    credentials_key: { type: 'string' },
    product_identifiers: { type: 'array', minItems: 1, items: { type: 'string' } },
    task_types: {
      type: 'array',
      minItems: 1,
      items: {
        enum: [
          'fetch_facebook_campaigns',
          'fetch_facebook_adsets',
          'fetch_facebook_ads',
        ]
      },
    },
    identifier: { type: 'string' },
    infer_app_display_name: { type: 'boolean' },
    campaign_regex_filter: { type: 'string' },
    currency_exchange: currencyExchangeSchema,
    edits: editsSchema,
  },
  additionalProperties: false,
  required: [
    'action',
    'target',
    'account_id',
    'credentials_key',
    'product_identifiers',
    'task_types',
  ],
};

const googleAdWordsTaskSchema = {
  type: 'object',
  properties: {
    action: { enum: ['fetch'] },
    target: { enum: ['google_adwords'] },
    client_customer_id: { type: 'number' },
    credentials_key: { type: 'string' },
    identifier: { type: 'string' },
    product_identifiers: { type: 'array', items: { type: 'string' }, minItems: 1},
    task_types: {
      type: 'array',
      minItems: 1,
      items: {
        enum: ['fetch_google_adwords_campaigns']
      },
    },
    currency_exchange: currencyExchangeSchema,
    infer_app_display_name: { type: 'boolean' },
    edits: editsSchema,
  },
  additionalProperties: false,
  required: [
    'action',
    'target',
    'client_customer_id',
    'credentials_key',
    'product_identifiers',
    'task_types',
  ],
};

const googleAdsTaskSchema = {
  type: 'object',
  properties: {
    action: { enum: ['fetch'] },
    target: { enum: ['google_ads'] },
    login_customer_id: { type: 'string' },
    exclude_customer_ids: { type: 'array', items: { type: 'string' }, minItems: 0},
    customer_id: { type: 'string' },
    credentials_key: { type: 'string' },
    identifier: { type: 'string' },
    product_identifiers: { type: 'array', items: { type: 'string' }, minItems: 1},
    task_types: {
      type: 'array',
      minItems: 1,
      items: {
        enum: [
          'fetch_google_ads_keywords_web',
          'fetch_google_ads_assets',
          'fetch_google_ads_ad_conversion_actions',
          'fetch_google_ads_ads',
          'fetch_google_ads_ad_assets',
          'fetch_google_ads_ad_groups',
          'fetch_google_ads_campaigns'
        ]
      },
    },
    currency_exchange: currencyExchangeSchema,
    edits: editsSchema,
  },
  additionalProperties: false,
  required: [
    'action',
    'target',
    'login_customer_id',
    'credentials_key',
    'product_identifiers',
    'task_types',
  ],
};

const snapchatTaskSchema = {
  type: 'object',
  properties: {
    action: { enum: ['fetch'] },
    target: { enum: ['snapchat'] },
    ad_account_id: { type: 'string' },
    credentials_key: { type: 'string' },
    product_identifiers: { type: 'array', items: { type: 'string' }, minItems: 1},
    identifier: { type: 'string' },
    task_types: {
      type: 'array',
      minItems: 1,
      items: {
        enum: [
          'fetch_snapchat_campaigns',
          'fetch_snapchat_adsquads',
          'fetch_snapchat_ads',
        ],
      },
    },
    edits: editsSchema,
    swipe_up_attribution_window: { enum: ['1_DAY', '7_DAY', '28_DAY'] },
    view_attribution_window: { enum: ['1_HOUR', '3_HOUR', '6_HOUR', '1_DAY', '7_DAY', '28_DAY'] },
  },
  additionalProperties: false,
  required: [
    'action',
    'target',
    'ad_account_id',
    'credentials_key',
    'product_identifiers',
    'task_types',
  ],
};

const tiktokTaskSchema = {
  type: 'object',
  properties: {
    action: { enum: ['fetch'] },
    target: { enum: ['tiktok'] },
    advertiser_id: { type: 'string' },
    credentials_key: { type: 'string' },
    product_identifiers: { type: 'array', items: { type: 'string' }, minItems: 1},
    identifier: { type: 'string' },
    task_types: {
      type: 'array',
      minItems: 1,
      items: {
        enum: [
          'fetch_tiktok_campaigns',
          'fetch_tiktok_adgroups',
          'fetch_tiktok_ads',
        ],
      },
    },
    edits: editsSchema,
  },
  additionalProperties: false,
  required: [
    'action',
    'target',
    'advertiser_id',
    'credentials_key',
    'product_identifiers',
    'task_types',
  ],
};

const appleSearchAdsTaskSchema = {
  type: 'object',
  properties: {
    action: { enum: ['fetch'] },
    target: { enum: ['apple_search_ads'] },
    credentials_key: { type: 'string' },
    identifier: { type: 'string' },
    org_id: { type: 'number' },
    product_identifiers: { type: 'array', items: { type: 'string' }, minItems: 1},
    task_types: {
      type: 'array',
      minItems: 1,
      items: {
        enum: [
          'fetch_apple_search_ads_campaigns',
          'fetch_apple_search_ads_adgroups',
          'fetch_apple_search_ads_keywords',
          'fetch_apple_search_ads_creative_sets',
          'fetch_apple_search_ads_searchterms',
        ],
      },
    },
    keep_empty_app_display_names: { type: 'boolean' },
    edits: editsSchema,
  },
  additionalProperties: false,
  required: [
    'action',
    'target',
    'credentials_key',
    'org_id',
    'product_identifiers',
    'task_types',
  ],
};

const mutateTaskSchema = {
  type: 'object',
  properties: {
    action: { enum: ['mutate'] },
    target: { enum: [
      'performance_cube_filtered',
      'performance_cube_unfiltered',
      'appsflyer_cube',
    ]},
    credentials_key: { type: ['string', 'null'] },
    product_identifiers: { type: 'array', items: { type: 'string' } },
    task_types: {
      type: 'array',
      items: {
        minItems: 1,
        enum: [
          /* mutate */
          'mutate_filter_performance_cube_channels',
          'mutate_filter_performance_cube_mmps',
          'mutate_filter_performance_cube_organic',
          'mutate_performance_cube_tags',
          /* materialize */
          'materialize_performance_cube_apple_search_ads',
          'materialize_performance_cube_facebook',
          'materialize_performance_cube_google_adwords',
          'materialize_performance_cube_google_ads',
          'materialize_performance_cube_snapchat',
          'materialize_performance_cube_tiktok',
          'materialize_performance_cube_appsflyer',
          'materialize_performance_cube_appsflyer_keyword',
          'materialize_performance_cube_data_locker',
          'materialize_performance_cube_data_locker_keyword',
          'materialize_performance_cube_data_locker_organic',
          'materialize_performance_cube_google_ads_conversion_action',
          'materialize_performance_cube_adjust',
          'materialize_appsflyer_cube',,
          'materialize_entity_campaign',
          'materialize_entity_adset',
          'materialize_entity_ad',
          /* latest */
          'latest_performance_cube_apple_search_ads',
          'latest_performance_cube_facebook',
          'latest_performance_cube_google',
          'latest_performance_cube_google_ads',
          'latest_performance_cube_snapchat',
          'latest_performance_cube_tiktok',
        ],
      },
    },
    infer_channel: { type: 'boolean' },
    identifier: { type: 'string' },
    dynamic_metric_count: { type: 'number' },
    target_channel_platform: { type: 'boolean' },
    cohort_anchor: { type: 'string' },
  },
  additionalProperties: false,
  required: [
    'action',
    'target',
    'task_types',
    'credentials_key',
    'product_identifiers',
  ],
};

const taskSetsSchema = {
  type: 'object',
  additionalProperties: {
    anyOf: [
      appsflyerTaskSchema,
      appsflyerDataLockerTaskSchema,
      adjustTaskSchema,
      appleSearchAdsTaskSchema,
      googleAdWordsTaskSchema,
      googleAdsTaskSchema,
      facebookTaskSchema,
      snapchatTaskSchema,
      tiktokTaskSchema,
      mutateTaskSchema,
    ],
  },
};

const createAlmacenConfigParameters = Validating.model({
  type: 'object',
  properties: {
    schedule: {
      type: 'array',
      required: false,
      items: {
        type: 'object',
        properties: {
          hour: { type: 'integer', minimum: 0, maximum: 23, },
          minute: { type: 'integer', minimum: 0, maximum: 59 },
        },
        required: [ 'hour', 'minute' ],
        additionalProperties: false,
      },
      maxItems: 48,
    },
    config: {
      type: 'object',
      required: true,
      additionalProperties: {
        type: 'object',
        properties: {
          company_metadata: companyMetadataSchema,
          products: productsSchema, 
          task_sets: taskSetsSchema,
        },
        additionalProperties: false,
        required: [
          'company_metadata',
          'products',
          'task_sets',
        ],
      },
      maxProperties: 1,
    },
    disabled: {
      type: 'boolean',
      required: false,
    },
  },
  additionalProperties: false,
});

const updateAlmacenConfigParameters = Validating.model({
  type: 'object',
  properties: {
    schedule: {
      type: 'array',
      required: false,
      items: {
        type: 'object',
        properties: {
          hour: { type: 'integer', minimum: 0, maximum: 23, },
          minute: { type: 'integer', minimum: 0, maximum: 59 },
        },
        required: [ 'hour', 'minute' ],
        additionalProperties: false,
      },
      maxItems: 48,
    },
    config: {
      type: 'object',
      required: false,
      additionalProperties: {
        type: 'object',
        properties: {
          company_metadata: companyMetadataSchema,
          products: productsSchema, 
          task_sets: taskSetsSchema,
        },
        additionalProperties: false,
        required: [
          'company_metadata',
          'products',
          'task_sets',
        ],
      },
      maxProperties: 1,
    },
    disabled: {
      type: 'boolean',
      required: false,
    },
  },
  additionalProperties: false,
});

module.exports.createTableFeedParameters = createTableFeedParameters;
module.exports.updateAlmacenConfigParameters = updateAlmacenConfigParameters;
module.exports.createAlmacenConfigParameters = createAlmacenConfigParameters;

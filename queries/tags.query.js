const entityQueries = Object.freeze({
  ad: schema => `
    select
      decode(ad_tag, null, 'False', 'True') as is_tagged,
      coalesce(decode(product_name, '', null, product_name), 'Unknown') as app,
      coalesce(decode(product_platform, '', null, product_platform), 'N/A') as platform,
      channel,
      campaign_name,
      adset_name,
      ad_name,
      '"' || replace(campaign_id, '"', '\\"') || '"' as campaign_id,
      '"' || replace(adset_id, '"', '\\"') || '"' as adset_id,
      '"' || replace(ad_id, '"', '\\"') || '"' as ad_id,
      ad_tag,
      ad_subtag
    from ${schema}.entity_ad
  `,
  adset: schema => `
    select
      decode(adset_tag, null, 'False', 'True') as is_tagged,
      coalesce(decode(product_name, '', null, product_name), 'Unknown') as app,
      coalesce(decode(product_platform, '', null, product_platform), 'N/A') as platform,
      channel,
      campaign_name,
      adset_name,
      '"' || replace(campaign_id, '"', '\\"') || '"' as campaign_id,
      '"' || replace(adset_id, '"', '\\"') || '"' as adset_id,
      adset_tag,
      adset_subtag
    from ${schema}.entity_adset
  `,
  campaign: schema => `
    select
      decode(campaign_tag, null, 'False', 'True') as is_tagged,
      coalesce(decode(product_name, '', null, product_name), 'Unknown') as app,
      coalesce(decode(product_platform, '', null, product_platform), 'N/A') as platform,
      channel,
      campaign_name,
      '"' || replace(campaign_id, '"', '\\"') || '"' as campaign_id,
      campaign_tag,
      campaign_subtag
    from ${schema}.entity_campaign
  `,
});

module.exports.compose = ({ schema, tagEntity }) => {
 return entityQueries[tagEntity](schema.replace(/\'/g, '\'\''));
}

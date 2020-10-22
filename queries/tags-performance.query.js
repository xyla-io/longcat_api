module.exports.compose = ({ schema }) => {
  return `with channel as (
    select ${schema}.channel_entity_url(channel, 'campaign', campaign_id) as property#url
      , split_part(property#url, '/', 3) as category#channel
      , 'campaign' as property#entity
      , campaign_id as property#entity_id
      , product_name as category#product_name
      , platform as category#platform
      , daily_cohort as time#date
      , date_trunc('week', daily_cohort)::date as time#week
      , max(campaign_name) as property#campaign_name
      , sum(spend) as metric#spend
      , sum(impressions) as metric#impressions
      , sum(clicks) as metric#clicks
      , sum(cohort_revenue) as metric#revenue_total
      , sum(decode(event_day < 1, true, cohort_revenue, 0)) as metric#revenue_d0
      , sum(decode(event_day < 3, true, cohort_revenue, 0)) as metric#revenue_d3
      , sum(decode(event_day < 7, true, cohort_revenue, 0)) as metric#revenue_d7
    from ${schema}.performance_cube_filtered
    group by 1, 4, 5, 6, 7
    ), event as (
    select ${schema}.channel_entity_url(channel, 'campaign', campaign_id) as property#url
      , product_name as category#product_name
      , platform as category#platform
      , mmp || '.' || event_name as event_name
      , daily_cohort as time#date
      , sum(cohort_events) as events
    from ${schema}.performance_cube_filtered
    where cohort_events > 0 or cohort_events < 0
    group by 1, 2, 3, 4, 5
    ), event_json as (
    select property#url
      , category#product_name
      , category#platform
      , time#date
      , '{' || listagg(${schema}.quote_json(event_name) || ':' || events, ',') || '}' as json#metric#event
    from event
    group by 1, 2, 3, 4
    ), tags as (
    select url as property#url
      , tags as json#category#tag
    from ${schema}.standard_tags
    )
    select * from channel
    left join tags
    using(property#url)
    left join event_json
    using (property#url, category#product_name, category#platform, time#date);
  `;
};
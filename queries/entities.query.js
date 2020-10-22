module.exports.compose = ({ schema }) => {
  return `with t as (
    select channel
      , entity_granularity as entity
      , campaign_id as id
      , campaign_name as name
      , max(daily_cohort) as date
    from ${schema}.performance_cube_unfiltered
    where mmp is null
    and entity_granularity = 'campaign'
    and campaign_id is not null
    and campaign_id != ''
    group by 1, 2, 3, 4
    union all
    select channel
      , 'adgroup' as entity
      , adset_id as id
      , adset_name as name
      , max(daily_cohort) as date
    from ${schema}.performance_cube_unfiltered
    where mmp is null
    and entity_granularity = 'adset'
    and adset_id is not null
    and adset_id != ''
    group by 1, 2, 3, 4
    union all
    select channel
      , entity_granularity as entity
      , ad_id as id
      , ad_name as name
      , max(daily_cohort) as date
    from ${schema}.performance_cube_unfiltered
    where mmp is null
    and entity_granularity = 'ad'
    and ad_id is not null
    and ad_id != ''
    and ad_id not like 'flx-%'
    group by 1, 2, 3, 4
    union all
    select 'Google' as channel
        , 'asset' as entity
        , asset_id as id
        , asset_name as name
        , current_date as date
    from ${schema}.fetch_google_ads_assets
    )
    select * from (
    select ${schema}.channel_entity_url(channel, entity, id) as url
      , channel
      , entity
      , id
      , name
    from (
    select channel
      , entity
      , id
      , max(date) as date
    from t
    group by 1, 2, 3
    ) as d
    left join (
    select channel
      , entity
      , id
      , date
      , max(name) as name
    from t
    group by 1, 2, 3, 4
    ) as m
    using (channel, entity, id, date)
    ) as u
    left join ${schema}.url_numbers
    using (url);`
};
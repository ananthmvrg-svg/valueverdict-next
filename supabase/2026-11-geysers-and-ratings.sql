-- Value Verdict: Geysers as their own category, and stricter customer ratings for big appliances.
-- Run once in Supabase → SQL Editor → New query → paste → Run. Safe to re-run (it skips rows that exist).

-- 1. Geysers category (winter season), with budget pages
insert into categories (category_id, name, slug, description, icon, sort_order, active, amazon_deals)
values ('CAT10', 'Geysers', 'geysers',
        'Storage and instant water heaters for every bathroom size, with energy rating, tank and warranty compared.',
        '🚿', 9, true, true)
on conflict (category_id) do nothing;

insert into subcategories (subcategory_id, category_id, name, slug, description, max_price, sort_order, active) values
  ('SUB40', 'CAT10', 'Under ₹5,000',  'under-5k',  'Instant geysers and small storage models.',        5000,  1, true),
  ('SUB41', 'CAT10', 'Under ₹8,000',  'under-8k',  '10–15 L storage geysers for one bathroom.',        8000,  2, true),
  ('SUB42', 'CAT10', 'Under ₹12,000', 'under-12k', '15–25 L, 5-star and glass-lined tanks.',          12000, 3, true),
  ('SUB43', 'CAT10', 'Above ₹12,000', 'above-12k', 'Large, smart and premium water heaters.',          null,  4, true)
on conflict (subcategory_id) do nothing;

-- the existing geyser search moves from Home Appliances to Geysers; add one for instant geysers
update amazon_deal_searches set category_id = 'CAT10', min_price = 3000, keywords = 'storage water heater geyser',
       must_include = 'geyser|water heater|!for geyser|!stand|!pipe|!valve|!element|!rod|!thermostat'
 where id = 26;
insert into amazon_deal_searches (category_id, section, keywords, search_index, min_saving_percent, min_price, min_rating, must_include, sort_order, active, source)
select 'CAT10', 'Instant geyser deals', 'instant water heater geyser 3 litre', 'HomeAndKitchen', 15, 2000, 4,
       'instant|geyser|water heater|!for geyser|!tap|!faucet|!rod|!element', 2, true, 'baseline'
 where not exists (select 1 from amazon_deal_searches where section = 'Instant geyser deals');

-- 2. Customer reviews: big appliances only from listings rated 4★ and above (was 3★)
update amazon_deal_searches set min_rating = 4
 where category_id in ('CAT01', 'CAT03', 'CAT05', 'CAT07', 'CAT10');

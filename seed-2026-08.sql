-- Seeds the August 2026 issue so the site has live content the moment the
-- worker is deployed. Safe to re-run: it replaces the row with the same slug.
--
-- Member birthdays and anniversaries from the printed edition are deliberately
-- not included. See README, "A note on privacy".

INSERT INTO torch_issues
  (slug, issue_label, issue_date, verse_text, verse_ref,
   feature_kicker, feature_title, feature_when, feature_body, feature_image,
   events_json, cards_json, pdf_key, pdf_public, status,
   created_at, updated_at, updated_by)
VALUES (
  '2026-08',
  'August 2026',
  '2026-08-01',
  'Rooted and built up in him, and stablished in the faith, as ye have been taught, abounding therein with thanksgiving.',
  'Colossians 2:7',
  'Missions Conference',
  'Heart For His Harvest',
  'August 2-5, 2026 - Fellowship after the Sunday evening service',
  'Welcome the Chadwick, Owens, Palmani, and Simmons families to our Missions Conference. Sign up on the bulletin board as soon as you can if you would like to take any of the missionaries out for a meal.',
  'img/torch-2026-08-missions-conference.jpg',
  '[{"date": "July 31", "name": "North of 62: Dixie Boat Ride", "detail": ""}, {"date": "August 1", "name": "Ladies Meeting in Plymouth", "detail": ""}, {"date": "August 2-5", "name": "Missions Conference", "detail": ""}, {"date": "August 7-8", "name": "Soulwinning Marathon", "detail": ""}, {"date": "August 7", "name": "North of 62: King''s Brass", "detail": ""}, {"date": "August 20", "name": "First Day of School", "detail": "half day"}, {"date": "August 22", "name": "Teen Service Activity", "detail": ""}, {"date": "August 23", "name": "Parent-Teacher Fellowship", "detail": "5:00 PM"}]',
  '[{"heading": "RBC Teens", "accent": "accent-crimson", "body": "", "rows": [{"date": "August 7-8", "name": "Soulwinning Marathon", "detail": "10:00 AM to 2:00 PM"}, {"date": "August 19", "name": "Truth and Training", "detail": "7:00 PM"}, {"date": "August 22", "name": "Service Activity", "detail": "10:00 AM to 12:30 PM"}, {"date": "Soulwinning", "name": "August 5, 12, 19, 26", "detail": "3:30 PM"}], "image": "img/torch-2026-08-soulwinning-marathon.jpg", "image_alt": "Soulwinning Marathon, August 7 and 8, 10am to 2pm", "image_w": 420, "image_h": 417}, {"heading": "International Appetizer & Sweets Fellowship", "accent": "", "rows": [], "body": "- Sunday, August 2. Bring an internationally inspired appetizer or dessert to share.\n- Please bring food into the gym before the evening service, and be sure your name is on all of your dishes and utensils.", "image": "img/torch-2026-08-international-fellowship.jpg", "image_alt": "A plate of international flags", "image_w": 184, "image_h": 162}, {"heading": "Roanoke Baptist School News", "accent": "", "rows": [], "body": "- School starts on Thursday, August 20, and is a half day with noon dismissal. Please be sure your students have all of their supplies for the first day.\n- A short parent-teacher meeting will be held on Sunday, August 23, at 5:00 PM in the library. Child care will be provided in the gym during the meeting."}, {"heading": "Soulwinning & Prayer", "accent": "accent-crimson", "rows": [], "body": "- Sunday evenings at 5:30 PM. Men pray in the Preacher''s office, ladies in the Multi-Purpose Room.\n- Saturday Men''s Prayer at 9:00 AM on August 1, 22, and 29.\n- The prayer breakfast is canceled for August."}, {"heading": "Missions Spotlight", "accent": "accent-teal", "rows": [], "body": "We are collecting items for missionary packets through October 18: gel pens and Fun Dip. Thank you for your participation.", "image": "img/torch-2026-08-missions-packet-items.jpg", "image_alt": "Gel pens and Fun Dip, the items being collected for missionary packets", "image_w": 540, "image_h": 296}]',
  NULL,
  0,
  'published',
  '2026-08-17T00:00:00.000Z',
  '2026-08-17T00:00:00.000Z',
  'seed'
)
ON CONFLICT(slug) DO UPDATE SET
  issue_label=excluded.issue_label, issue_date=excluded.issue_date,
  verse_text=excluded.verse_text, verse_ref=excluded.verse_ref,
  feature_kicker=excluded.feature_kicker, feature_title=excluded.feature_title,
  feature_when=excluded.feature_when, feature_body=excluded.feature_body,
  feature_image=excluded.feature_image, events_json=excluded.events_json,
  cards_json=excluded.cards_json, status=excluded.status,
  updated_at=excluded.updated_at, updated_by=excluded.updated_by;

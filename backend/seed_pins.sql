BEGIN;

INSERT OR IGNORE INTO tags (name) VALUES
  ('French'),
  ('Chrome'),
  ('Y2K'),
  ('Minimalist'),
  ('Nude'),
  ('Glitter');

INSERT INTO pins (title, image_url, description) VALUES
  ('Classic French Set', 'https://images.unsplash.com/photo-1762121903467-8cf5cc423ba5?w=1200&auto=format&fit=crop&q=80', 'Timeless French tips with a clean finish.'),
  ('Pink Chrome Shine', 'https://images.unsplash.com/photo-1763063556535-5f6174a5c5d4?w=1200&auto=format&fit=crop&q=80', 'Soft pink chrome with a mirror-like shine.'),
  ('Minimal Nude', 'https://images.unsplash.com/photo-1659391542239-9648f307c0b1?w=1200&auto=format&fit=crop&q=80', 'Barely-there nude for an elegant look.'),
  ('Y2K Pop', 'https://images.unsplash.com/photo-1737214475365-e4f06281dcf3?w=1200&auto=format&fit=crop&q=80', 'Playful Y2K accents with glossy finishes.'),
  ('Glitter Accent', 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=1200&auto=format&fit=crop&q=80', 'Sparkle accents for a night-out vibe.'),
  ('Soft Pastel Dream', 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=1200&auto=format&fit=crop&q=80', 'Muted pastels with subtle gradients.'),
  ('Classic Red', 'https://images.unsplash.com/photo-1519017713917-9807534d0b0b?w=1200&auto=format&fit=crop&q=80', 'Bold red polish with high-gloss shine.'),
  ('Abstract Art', 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=1200&auto=format&fit=crop&q=80', 'Abstract nail art with modern shapes.');

INSERT INTO pin_tags (pin_id, tag_id)
SELECT p.id, t.id FROM pins p, tags t
WHERE p.title = 'Classic French Set' AND t.name = 'French';

INSERT INTO pin_tags (pin_id, tag_id)
SELECT p.id, t.id FROM pins p, tags t
WHERE p.title = 'Pink Chrome Shine' AND t.name IN ('Chrome', 'Minimalist');

INSERT INTO pin_tags (pin_id, tag_id)
SELECT p.id, t.id FROM pins p, tags t
WHERE p.title = 'Minimal Nude' AND t.name IN ('Minimalist', 'Nude');

INSERT INTO pin_tags (pin_id, tag_id)
SELECT p.id, t.id FROM pins p, tags t
WHERE p.title = 'Y2K Pop' AND t.name IN ('Y2K', 'Chrome');

INSERT INTO pin_tags (pin_id, tag_id)
SELECT p.id, t.id FROM pins p, tags t
WHERE p.title = 'Glitter Accent' AND t.name IN ('Glitter', 'Minimalist');

INSERT INTO pin_tags (pin_id, tag_id)
SELECT p.id, t.id FROM pins p, tags t
WHERE p.title = 'Soft Pastel Dream' AND t.name IN ('Minimalist', 'French');

INSERT INTO pin_tags (pin_id, tag_id)
SELECT p.id, t.id FROM pins p, tags t
WHERE p.title = 'Classic Red' AND t.name IN ('Minimalist');

INSERT INTO pin_tags (pin_id, tag_id)
SELECT p.id, t.id FROM pins p, tags t
WHERE p.title = 'Abstract Art' AND t.name IN ('Chrome', 'Y2K');

COMMIT;

-- Demo students for matching, search and the request board (charter risk #5, Objective 4).
-- Run AFTER schema.sql and seed.sql. Safe to run twice. Password for all demo users: password123
-- Remove later with:  DELETE FROM users WHERE email LIKE '%@demo.skillswap';

INSERT INTO users (name, email, password_hash)
SELECT d.name, d.email, crypt('password123', gen_salt('bf', 12))
FROM (VALUES
    ('Maya Serikova',   'maya@demo.skillswap'),
    ('Jordan Lee',      'jordan@demo.skillswap'),
    ('Sam Rivera',      'sam@demo.skillswap'),
    ('Aruzhan Bekova',  'aruzhan@demo.skillswap'),
    ('Timur Akhmetov',  'timur@demo.skillswap')
) AS d(name, email)
ON CONFLICT (email) DO NOTHING;

INSERT INTO profiles (user_id, university, faculty, year, bio, telegram, whatsapp, show_contact)
SELECT u.id, 'KBTU', d.faculty, d.year, d.bio, d.telegram, d.whatsapp, d.show_contact
FROM (VALUES
    ('maya@demo.skillswap',    'Business School', 2, 'Happy to help with English and IELTS speaking. Want to learn Python for data analysis.', '@maya_learns', NULL, true),
    ('jordan@demo.skillswap',  'School of Information Technology and Engineering', 3, 'React and JavaScript every day. Looking for a German conversation partner.', '@jordan_codes', NULL, true),
    ('sam@demo.skillswap',     'International School of Economics', 1, 'Public speaking club member. Need help with Mathematics before exams.', NULL, '+77001112233', true),
    ('aruzhan@demo.skillswap', 'School of Applied Mathematics', 4, 'Mathematics and Physics tutor. Want to try Guitar.', '@aruzhan_math', NULL, false),
    ('timur@demo.skillswap',   'School of Energy and Oil & Gas Industry', 2, 'Football captain. Learning Python and English.', '@timur_fc', NULL, true)
) AS d(email, faculty, year, bio, telegram, whatsapp, show_contact)
JOIN users u ON u.email = d.email
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_skills (user_id, skill_id, type, level)
SELECT u.id, s.id, d.type, d.level
FROM (VALUES
    ('maya@demo.skillswap',    'English',         'teach', 'advanced'),
    ('maya@demo.skillswap',    'IELTS',           'teach', 'advanced'),
    ('maya@demo.skillswap',    'Python',          'learn', 'beginner'),
    ('jordan@demo.skillswap',  'React',           'teach', 'advanced'),
    ('jordan@demo.skillswap',  'JavaScript',      'teach', 'advanced'),
    ('jordan@demo.skillswap',  'German',          'learn', 'beginner'),
    ('sam@demo.skillswap',     'Public Speaking', 'teach', 'intermediate'),
    ('sam@demo.skillswap',     'Mathematics',     'learn', 'beginner'),
    ('aruzhan@demo.skillswap', 'Mathematics',     'teach', 'advanced'),
    ('aruzhan@demo.skillswap', 'Physics',         'teach', 'advanced'),
    ('aruzhan@demo.skillswap', 'Guitar',          'learn', 'beginner'),
    ('timur@demo.skillswap',   'Football',        'teach', 'advanced'),
    ('timur@demo.skillswap',   'Python',          'learn', 'beginner'),
    ('timur@demo.skillswap',   'English',         'learn', 'intermediate')
) AS d(email, skill, type, level)
JOIN users u ON u.email = d.email
JOIN skills s ON s.name = d.skill
ON CONFLICT (user_id, skill_id, type) DO NOTHING;

INSERT INTO requests (user_id, title, category_id)
SELECT u.id, d.title, c.id
FROM (VALUES
    ('sam@demo.skillswap',   'Need help with integrals before the Calculus midterm', 'Academic'),
    ('timur@demo.skillswap', 'Looking for someone to practise English speaking twice a week', 'Languages'),
    ('jordan@demo.skillswap','Can someone review my German pronunciation?', 'Languages')
) AS d(email, title, category)
JOIN users u ON u.email = d.email
JOIN categories c ON c.name = d.category
WHERE NOT EXISTS (SELECT 1 FROM requests r WHERE r.user_id = u.id AND r.title = d.title);

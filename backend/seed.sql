
INSERT INTO skills (name, category_id)
SELECT data.skill_name, c.id
FROM (
    VALUES
        ('Mathematics', 'Academic'),
        ('Physics', 'Academic'),
        ('Chemistry', 'Academic'),
        ('English', 'Languages'),
        ('IELTS', 'Languages'),
        ('German', 'Languages'),
        ('Python', 'IT & Programming'),
        ('JavaScript', 'IT & Programming'),
        ('React', 'IT & Programming'),
        ('Node.js', 'IT & Programming'),
        ('Football', 'Sport'),
        ('Basketball', 'Sport'),
        ('Drawing', 'Arts & Music'),
        ('Guitar', 'Arts & Music'),
        ('Public Speaking', 'Other')
) AS data(skill_name, category_name)
JOIN categories c ON c.name = data.category_name
ON CONFLICT (name, category_id) DO NOTHING;

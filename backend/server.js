
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const pool = require('./db');
const app = express();
const PORT = process.env.PORT || 3000;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'SkillSwap API is running'
  });
});


app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name FROM categories ORDER BY name'
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Failed to fetch categories:', error.message);

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch categories'
      }
    });
  }
});


app.get('/api/skills', async (req, res) => {
  try {
    const { category } = req.query;

    let result;

    if (category) {
      result = await pool.query(
        'SELECT id, name, category_id FROM skills WHERE category_id = $1 ORDER BY name',
        [category]
      );
    } else {
      result = await pool.query(
        'SELECT id, name, category_id FROM skills ORDER BY name'
      );
    }

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Failed to fetch skills:', error.message);

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch skills'
      }
    });
  }
});

app.get('/api/categories/:id/skills', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, category_id FROM skills WHERE category_id = $1 ORDER BY name',
      [req.params.id]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Failed to fetch category skills:', error.message);

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch category skills'
      }
    });
  }
});


app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, university } = req.body || {};

  if (
    typeof name !== 'string' ||
    !name.trim() ||
    typeof email !== 'string' ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    typeof password !== 'string' ||
    password.length < 8 ||
    (university !== undefined && typeof university !== 'string')
  ) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Valid name, email and password (min 8 characters) are required'
      }
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 12);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email`,
      [name.trim(), normalizedEmail, passwordHash]
    );

    const user = userResult.rows[0];

    await client.query(
      `INSERT INTO profiles (user_id, university)
       VALUES ($1, $2)`,
      [user.id, university?.trim() || null]
    );

    await client.query('COMMIT');

    return res.status(201).json(user);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Registration error:', error.message);

    if (error.code === '23505') {
      return res.status(409).json({
        error: {
          code: 'EMAIL_EXISTS',
          message: 'Email is already registered'
        }
      });
    }

    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Registration failed'
      }
    });
  } finally {
    client.release();
  }
});


app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (typeof email !== 'string' || typeof password !== 'string' ||
        !email.trim() || !password) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required'
        }
      });
    }

    const result = await pool.query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email.trim().toLowerCase()]
    );

    const user = result.rows[0];

    const validPassword = user
      ? await bcrypt.compare(password, user.password_hash)
      : false;

    if (!validPassword) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is missing');
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    return res.status(200).json({
      token,
      user_id: user.id
    });
  } catch (error) {
    console.error('Login error:', error.message);

    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Login failed'
      }
    });
  }
});


app.get('/api/auth/me', async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      }
    });
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await pool.query(
      'SELECT id, name, email FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not found'
        }
      });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    if (error.name === 'JsonWebTokenError' ||
        error.name === 'TokenExpiredError' ||
        error.name === 'NotBeforeError') {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token'
        }
      });
    }

    console.error('Auth me error:', error.message);

    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch user'
      }
    });
  }
});


// ---------- Sprint 2: contact sharing (US-10, US-11) ----------

function getUserIdFromToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(authHeader.slice(7), process.env.JWT_SECRET).userId;
  } catch (error) {
    return null;
  }
}

// Own full profile, including contact fields and the sharing switch.
app.get('/api/users/me', async (req, res) => {
  const userId = getUserIdFromToken(req);

  if (!userId) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  }

  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email,
              p.university, p.faculty, p.year, p.bio,
              p.whatsapp, p.telegram,
              COALESCE(p.show_contact, false) AS show_contact
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'User not found' }
      });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Get own profile error:', error.message);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch profile' }
    });
  }
});

// Another student's WhatsApp/Telegram, only if they turned "Show my contact" on.
app.get('/api/users/:id/contact', async (req, res) => {
  const userId = getUserIdFromToken(req);

  if (!userId) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  }

  try {
    const result = await pool.query(
      `SELECT u.id, p.telegram, p.whatsapp, COALESCE(p.show_contact, false) AS show_contact
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE u.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      });
    }

    const contact = result.rows[0];
    const telegram = contact.telegram || null;
    const whatsapp = contact.whatsapp || null;

    if (!contact.show_contact || (!telegram && !whatsapp)) {
      return res.status(403).json({
        error: { code: 'CONTACT_HIDDEN', message: 'This student does not share contact details' }
      });
    }

    return res.status(200).json({ user_id: contact.id, telegram, whatsapp });
  } catch (error) {
    if (error.code === '22P02') {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid user ID' }
      });
    }

    console.error('Get contact error:', error.message);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch contact' }
    });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        u.id,
        u.name,
        p.university,
        p.faculty,
        p.year,
        p.bio,
        COALESCE(
          p.show_contact AND (NULLIF(p.telegram, '') IS NOT NULL OR NULLIF(p.whatsapp, '') IS NOT NULL),
          false
        ) AS contact_available
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE u.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    const skillsResult = await pool.query(
      `SELECT
        us.id,
        us.skill_id,
        s.name,
        s.category_id,
        us.type,
        us.level
       FROM user_skills us
       JOIN skills s ON s.id = us.skill_id
       WHERE us.user_id = $1
       ORDER BY s.name`,
      [req.params.id]
    );

    return res.status(200).json({
      ...result.rows[0],
      skills: skillsResult.rows
    });
  } catch (error) {
    console.error('Get profile error:', error.message);

    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch profile'
      }
    });
  }
});


app.put('/api/users/me', async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      }
    });
  }

  let decoded;

  try {
    decoded = jwt.verify(
      authHeader.slice(7),
      process.env.JWT_SECRET
    );
  } catch (error) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token'
      }
    });
  }

  const { name, university, faculty, year, bio, whatsapp, telegram, show_contact } = req.body || {};

  if (
    (name !== undefined && (typeof name !== 'string' || !name.trim())) ||
    [university, faculty, bio, whatsapp, telegram].some(
      value => value !== undefined && value !== null && typeof value !== 'string'
    ) ||
    (year !== undefined && year !== null &&
      (!Number.isInteger(year) || year < 1 || year > 7)) ||
    (show_contact !== undefined && typeof show_contact !== 'boolean')
  ) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid profile data'
      }
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    if (name !== undefined) {
      const updated = await client.query(
        'UPDATE users SET name = $1 WHERE id = $2 RETURNING id',
        [name.trim(), decoded.userId]
      );

      if (updated.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'User not found' }
        });
      }
    }

    await client.query(
      `INSERT INTO profiles (user_id)
       VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [decoded.userId]
    );

    await client.query(
      `UPDATE profiles
       SET university = COALESCE($1, university),
           faculty = COALESCE($2, faculty),
           year = COALESCE($3, year),
           bio = COALESCE($4, bio),
           whatsapp = COALESCE($5, whatsapp),
           telegram = COALESCE($6, telegram)
       WHERE user_id = $7`,
      [university, faculty, year, bio, whatsapp, telegram, decoded.userId]
    );

    // US-11: contact can be shown only if a Telegram or WhatsApp is saved
    if (show_contact !== undefined) {
      if (show_contact === true) {
        const saved = await client.query(
          'SELECT telegram, whatsapp FROM profiles WHERE user_id = $1',
          [decoded.userId]
        );
        const { telegram: savedTelegram, whatsapp: savedWhatsapp } = saved.rows[0] || {};

        if (!savedTelegram?.trim() && !savedWhatsapp?.trim()) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            error: {
              code: 'CONTACT_REQUIRED',
              message: 'Add a Telegram username or WhatsApp number first'
            }
          });
        }
      }

      await client.query(
        'UPDATE profiles SET show_contact = $1 WHERE user_id = $2',
        [show_contact, decoded.userId]
      );
    }

    const result = await client.query(
      `SELECT u.id, u.name, u.email,
              p.university, p.faculty, p.year, p.bio,
              p.whatsapp, p.telegram, p.show_contact
       FROM users u
       JOIN profiles p ON p.user_id = u.id
       WHERE u.id = $1`,
      [decoded.userId]
    );

    await client.query('COMMIT');
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update profile error:', error.message);

    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update profile'
      }
    });
  } finally {
    client.release();
  }
});


app.get('/api/users/me/skills', async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      }
    });
  }

  let decoded;

  try {
    decoded = jwt.verify(
      authHeader.slice(7),
      process.env.JWT_SECRET
    );
  } catch (error) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token'
      }
    });
  }

  try {
    const result = await pool.query(
      `SELECT
         us.id,
         us.skill_id,
         s.name,
         s.category_id,
         us.type,
         us.level
       FROM user_skills us
       JOIN skills s ON s.id = us.skill_id
       WHERE us.user_id = $1
       ORDER BY s.name`,
      [decoded.userId]
    );

    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Get user skills error:', error.message);

    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch user skills'
      }
    });
  }
});


app.post('/api/users/me/skills', async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      }
    });
  }

  let decoded;

  try {
    decoded = jwt.verify(
      authHeader.slice(7),
      process.env.JWT_SECRET
    );
  } catch (error) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token'
      }
    });
  }

  const { skill_id, type, level } = req.body || {};

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (
    typeof skill_id !== 'string' ||
    !uuidRegex.test(skill_id) ||
    !['teach', 'learn'].includes(type) ||
    !['beginner', 'intermediate', 'advanced'].includes(level)
  ) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid skill_id, type or level'
      }
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO user_skills (user_id, skill_id, type, level)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, skill_id, type, level`,
      [decoded.userId, skill_id, type, level]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        error: {
          code: 'SKILL_EXISTS',
          message: 'Skill already added'
        }
      });
    }

    if (error.code === '23503') {
      return res.status(404).json({
        error: {
          code: 'SKILL_NOT_FOUND',
          message: 'Skill not found'
        }
      });
    }

    console.error('Add user skill error:', error.message);

    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to add user skill'
      }
    });
  }
});


app.put('/api/users/me/skills/:id', async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      }
    });
  }

  let decoded;

  try {
    decoded = jwt.verify(
      authHeader.slice(7),
      process.env.JWT_SECRET
    );
  } catch (error) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token'
      }
    });
  }

  const { type, level } = req.body || {};

  if (
    (type === undefined && level === undefined) ||
    (type !== undefined && !['teach', 'learn'].includes(type)) ||
    (level !== undefined &&
      !['beginner', 'intermediate', 'advanced'].includes(level))
  ) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid type or level'
      }
    });
  }

  try {
    const result = await pool.query(
      `UPDATE user_skills
       SET type = COALESCE($1, type),
           level = COALESCE($2, level)
       WHERE id = $3 AND user_id = $4
       RETURNING id, user_id, skill_id, type, level`,
      [type ?? null, level ?? null, req.params.id, decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'SKILL_NOT_FOUND',
          message: 'User skill not found'
        }
      });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        error: {
          code: 'SKILL_EXISTS',
          message: 'This skill already exists'
        }
      });
    }

    if (error.code === '22P02') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid skill ID'
        }
      });
    }

    console.error('Update skill error:', error.message);

    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update skill'
      }
    });
  }
});


app.delete('/api/users/me/skills/:id', async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      }
    });
  }

  let decoded;

  try {
    decoded = jwt.verify(
      authHeader.slice(7),
      process.env.JWT_SECRET
    );
  } catch (error) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token'
      }
    });
  }

  try {
    const result = await pool.query(
      `DELETE FROM user_skills
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [req.params.id, decoded.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: {
          code: 'SKILL_NOT_FOUND',
          message: 'User skill not found'
        }
      });
    }

    return res.status(204).send();
  } catch (error) {
    if (error.code === '22P02') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid skill ID'
        }
      });
    }

    console.error('Delete skill error:', error.message);

    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete skill'
      }
    });
  }
});

// ---------- Sprint 2: matching, search, request board (US-06 – US-09) ----------

// Sends 401 and returns null when there is no valid token.
function requireUser(req, res) {
  const userId = getUserIdFromToken(req);

  if (!userId) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
    return null;
  }

  return userId;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Public card info for a list of users.
async function loadUserCards(userIds) {
  if (userIds.length === 0) return new Map();

  const result = await pool.query(
    `SELECT u.id, u.name, p.university, p.faculty, p.year, p.bio,
            COALESCE(
              p.show_contact AND (NULLIF(p.telegram, '') IS NOT NULL OR NULLIF(p.whatsapp, '') IS NOT NULL),
              false
            ) AS contact_available
     FROM users u
     LEFT JOIN profiles p ON p.user_id = u.id
     WHERE u.id = ANY($1::uuid[])`,
    [userIds]
  );

  return new Map(result.rows.map(row => [row.id, row]));
}

// US-06: students whose skills complement mine.
// mutual        = they teach something I want to learn AND want something I teach
// can_teach_you = they teach something I want to learn (one-way)
app.get('/api/matches', async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  try {
    const mine = await pool.query(
      'SELECT skill_id, type FROM user_skills WHERE user_id = $1',
      [userId]
    );

    const myTeach = mine.rows.filter(r => r.type === 'teach').map(r => r.skill_id);
    const myLearn = mine.rows.filter(r => r.type === 'learn').map(r => r.skill_id);

    if (myLearn.length === 0) {
      return res.status(200).json([]);
    }

    const others = await pool.query(
      `SELECT us.user_id, us.type, s.name
       FROM user_skills us
       JOIN skills s ON s.id = us.skill_id
       WHERE us.user_id <> $1
         AND (
           (us.type = 'teach' AND us.skill_id = ANY($2::uuid[])) OR
           (us.type = 'learn' AND us.skill_id = ANY($3::uuid[]))
         )`,
      [userId, myLearn, myTeach]
    );

    const byUser = new Map();
    for (const row of others.rows) {
      if (!byUser.has(row.user_id)) {
        byUser.set(row.user_id, { can_teach_you: [], wants_from_you: [] });
      }
      const entry = byUser.get(row.user_id);
      if (row.type === 'teach') entry.can_teach_you.push(row.name);
      else entry.wants_from_you.push(row.name);
    }

    // Only students who can teach me something are matches.
    const candidates = [...byUser.entries()].filter(([, e]) => e.can_teach_you.length > 0);
    const cards = await loadUserCards(candidates.map(([id]) => id));

    const matches = candidates
      .map(([id, e]) => ({
        ...cards.get(id),
        match_type: e.wants_from_you.length > 0 ? 'mutual' : 'can_teach_you',
        can_teach_you: e.can_teach_you.sort(),
        wants_from_you: e.wants_from_you.sort()
      }))
      .sort((a, b) =>
        (a.match_type === 'mutual' ? 0 : 1) - (b.match_type === 'mutual' ? 0 : 1) ||
        b.can_teach_you.length - a.can_teach_you.length ||
        a.name.localeCompare(b.name)
      )
      .slice(0, 20);

    return res.status(200).json(matches);
  } catch (error) {
    console.error('Matches error:', error.message);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch matches' }
    });
  }
});

// US-07: students who TEACH a subject. ?subject=physics&category=<category_id>
app.get('/api/search', async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const subject = typeof req.query.subject === 'string' ? req.query.subject.trim() : '';
  const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';

  if (category && !UUID_REGEX.test(category)) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid category' }
    });
  }

  try {
    const result = await pool.query(
      `SELECT us.user_id, s.name, s.category_id
       FROM user_skills us
       JOIN skills s ON s.id = us.skill_id
       WHERE us.type = 'teach'
         AND us.user_id <> $1
         AND ($2 = '' OR s.name ILIKE '%' || $2 || '%')
         AND ($3 = '' OR s.category_id::text = $3)
       ORDER BY s.name`,
      [userId, subject, category]
    );

    const byUser = new Map();
    for (const row of result.rows) {
      if (!byUser.has(row.user_id)) byUser.set(row.user_id, []);
      byUser.get(row.user_id).push(row.name);
    }

    const cards = await loadUserCards([...byUser.keys()]);
    const students = [...byUser.entries()]
      .map(([id, teaches]) => ({ ...cards.get(id), teaches }))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 50);

    return res.status(200).json(students);
  } catch (error) {
    console.error('Search error:', error.message);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Search failed' }
    });
  }
});

// US-08: public request board, newest first.
app.get('/api/requests', async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  try {
    const result = await pool.query(
      `SELECT r.id, r.title, r.category_id, c.name AS category_name, r.status, r.created_at,
              u.id AS author_id, u.name AS author_name,
              COUNT(rr.id)::int AS responses_count,
              COALESCE(BOOL_OR(rr.user_id = $1), false) AS responded_by_me
       FROM requests r
       JOIN users u ON u.id = r.user_id
       JOIN categories c ON c.id = r.category_id
       LEFT JOIN request_responses rr ON rr.request_id = r.id
       GROUP BY r.id, c.name, u.id
       ORDER BY r.created_at DESC
       LIMIT 100`,
      [userId]
    );

    // Authors see who responded to their own requests (US-09).
    const ownIds = result.rows.filter(r => r.author_id === userId).map(r => r.id);
    const responders = new Map();

    if (ownIds.length > 0) {
      const resp = await pool.query(
        `SELECT rr.request_id, u.id, u.name
         FROM request_responses rr
         JOIN users u ON u.id = rr.user_id
         WHERE rr.request_id = ANY($1::uuid[])
         ORDER BY rr.created_at`,
        [ownIds]
      );
      for (const row of resp.rows) {
        if (!responders.has(row.request_id)) responders.set(row.request_id, []);
        responders.get(row.request_id).push({ id: row.id, name: row.name });
      }
    }

    return res.status(200).json(
      result.rows.map(r => ({
        id: r.id,
        title: r.title,
        category_id: r.category_id,
        category_name: r.category_name,
        status: r.status,
        created_at: r.created_at,
        author: { id: r.author_id, name: r.author_name },
        responses_count: r.responses_count,
        responded_by_me: r.responded_by_me,
        ...(r.author_id === userId ? { responders: responders.get(r.id) || [] } : {})
      }))
    );
  } catch (error) {
    console.error('Get requests error:', error.message);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch requests' }
    });
  }
});

app.post('/api/requests', async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const { title, category_id } = req.body || {};
  const cleanTitle = typeof title === 'string' ? title.trim() : '';

  if (!cleanTitle) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Please describe what you need help with' }
    });
  }
  if (cleanTitle.length > 120) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Title must not exceed 120 characters' }
    });
  }
  if (typeof category_id !== 'string' || !UUID_REGEX.test(category_id)) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Please choose a category' }
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO requests (user_id, title, category_id)
       VALUES ($1, $2, $3)
       RETURNING id, title, category_id, status, created_at`,
      [userId, cleanTitle, category_id]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23503') {
      return res.status(404).json({
        error: { code: 'CATEGORY_NOT_FOUND', message: 'Category not found' }
      });
    }

    console.error('Create request error:', error.message);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create request' }
    });
  }
});

// US-09: "I can help"
app.post('/api/requests/:id/responses', async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  if (!UUID_REGEX.test(req.params.id)) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid request ID' }
    });
  }

  try {
    const found = await pool.query(
      'SELECT user_id, status FROM requests WHERE id = $1',
      [req.params.id]
    );

    if (found.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'REQUEST_NOT_FOUND', message: 'Request not found' }
      });
    }
    if (found.rows[0].user_id === userId) {
      return res.status(400).json({
        error: { code: 'OWN_REQUEST', message: 'You cannot respond to your own request' }
      });
    }
    if (found.rows[0].status !== 'open') {
      return res.status(400).json({
        error: { code: 'REQUEST_CLOSED', message: 'This request is closed' }
      });
    }

    const result = await pool.query(
      `INSERT INTO request_responses (request_id, user_id)
       VALUES ($1, $2)
       RETURNING id, request_id, user_id, created_at`,
      [req.params.id, userId]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        error: { code: 'ALREADY_RESPONDED', message: 'You already responded to this request' }
      });
    }

    console.error('Respond to request error:', error.message);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to respond' }
    });
  }
});

// Author closes or reopens a request.
app.patch('/api/requests/:id', async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;

  const { status } = req.body || {};

  if (!['open', 'closed'].includes(status) || !UUID_REGEX.test(req.params.id)) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid status or request ID' }
    });
  }

  try {
    const result = await pool.query(
      `UPDATE requests SET status = $1
       WHERE id = $2 AND user_id = $3
       RETURNING id, status`,
      [status, req.params.id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { code: 'REQUEST_NOT_FOUND', message: 'Request not found' }
      });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Update request error:', error.message);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update request' }
    });
  }
});

app.listen(PORT, () => {
  console.log(`SkillSwap backend running on http://localhost:${PORT}`);
});

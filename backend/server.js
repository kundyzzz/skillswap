
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


app.get('/api/users/me', async (req, res) => {
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
    decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
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
      `SELECT u.id, u.name, u.email,
              p.university, p.faculty, p.year, p.bio,
              p.whatsapp, p.telegram
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE u.id = $1`,
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
    console.error('Get own profile error:', error.message);

    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch own profile'
      }
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
        p.bio
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

  const { name, university, faculty, year, bio, whatsapp, telegram } = req.body || {};

  if (
    (name !== undefined && (typeof name !== 'string' || !name.trim())) ||
    [university, faculty, bio, whatsapp, telegram].some(
      value => value !== undefined && value !== null && typeof value !== 'string'
    ) ||
    (year !== undefined && year !== null &&
      (!Number.isInteger(year) || year < 1 || year > 7))
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

    const result = await client.query(
      `SELECT u.id, u.name, u.email,
              p.university, p.faculty, p.year, p.bio,
              p.whatsapp, p.telegram
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

app.listen(PORT, () => {
  console.log(`SkillSwap backend running on http://localhost:${PORT}`);
});

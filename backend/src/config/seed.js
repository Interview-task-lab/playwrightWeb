/**
 * Database Seed Script
 *
 * Populates the database with default domains and users for testing.
 * Run via: npm run db:seed
 */

const bcrypt = require('bcrypt');
const { pool, initDatabase } = require('./database');

async function seed() {
  console.log('🌱 Starting database seeding...');

  // Ensure tables exist before seeding
  await initDatabase();

  try {
    // 1. We no longer truncate/delete tables on every seed to preserve recorded tests and FKs.
    console.log('Skipping tables truncation to preserve recorded test cases.');

    // 2. Insert default domains (Parent domains)
    console.log('Inserting parent domains...');
    await pool.query(`
      INSERT INTO domains (name, parent_id)
      VALUES ('Kredi', NULL), ('Hesap', NULL)
      ON CONFLICT (name) DO NOTHING
    `);

    // Fetch existing parent domains to get their IDs
    const parentQuery = await pool.query("SELECT id, name FROM domains WHERE parent_id IS NULL");
    const domains = {};
    parentQuery.rows.forEach(row => {
      domains[row.name] = row.id;
    });

    // Insert sub-domains
    console.log('Inserting sub domains...');
    await pool.query(`
      INSERT INTO domains (name, parent_id)
      VALUES 
        ('Bireysel Kredi', $1),
        ('Ticari Kredi', $1),
        ('Vadeli Hesap', $2),
        ('Vadesiz Hesap', $2)
      ON CONFLICT (name) DO NOTHING
    `, [domains['Kredi'], domains['Hesap']]);

    // Fetch all domains to populate full map
    const allQuery = await pool.query("SELECT id, name FROM domains");
    allQuery.rows.forEach(row => {
      domains[row.name] = row.id;
    });

    console.log('Domains loaded/created:', domains);

    // 3. Hash the default password "123456"
    console.log('Hashing default passwords...');
    const saltRounds = 10;
    const defaultPasswordHash = await bcrypt.hash('123456', saltRounds);

    // 4. Insert default users
    const users = [
      {
        username: 'admin',
        firstName: 'System',
        lastName: 'Admin',
        role: 'admin',
        domainId: null
      },
      {
        username: 'qa_user',
        firstName: 'QA',
        lastName: 'Engineer',
        role: 'qa',
        domainId: null
      },
      {
        username: 'loan_member',
        firstName: 'Loan',
        lastName: 'Member',
        role: 'kredi_takimi',
        domainId: domains['Kredi']
      },
      {
        username: 'individual_loan_member',
        firstName: 'Individual Loan',
        lastName: 'Member',
        role: 'kredi_takimi',
        domainId: domains['Bireysel Kredi']
      },
      {
        username: 'commercial_loan_member',
        firstName: 'Commercial Loan',
        lastName: 'Member',
        role: 'kredi_takimi',
        domainId: domains['Ticari Kredi']
      },
      {
        username: 'account_member',
        firstName: 'Account',
        lastName: 'Member',
        role: 'hesap_takimi',
        domainId: domains['Vadeli Hesap']
      }
    ];

    for (const user of users) {
      await pool.query(`
        INSERT INTO users (username, first_name, last_name, password_hash, role, domain_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (username) DO UPDATE
        SET first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            password_hash = EXCLUDED.password_hash,
            role = EXCLUDED.role,
            domain_id = EXCLUDED.domain_id
      `, [
        user.username,
        user.firstName,
        user.lastName,
        defaultPasswordHash,
        user.role,
        user.domainId
      ]);
      console.log(`Created/Updated user: ${user.username} (${user.role})`);
    }

    console.log('✅ Seeding completed successfully!');
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
  } finally {
    // End the pool to allow process termination
    await pool.end();
  }
}

seed();

require('dotenv').config();
const { query } = require('./config/database');
const { hashPassword } = require('./utils/auth');

const createTestUsers = async () => {
  try {
    console.log('🔄 Creating test users...\n');

    // Hash password
    const password = 'password123';
    const passwordHash = await hashPassword(password);
    console.log('✅ Password hashed successfully');
    console.log('Password:', password);
    console.log('Hash:', passwordHash.substring(0, 30) + '...\n');

    // Delete existing test users
    await query(`DELETE FROM users WHERE username IN ('superadmin', 'admin', 'teacher1', 'teacher2', 'teacher3', 'teacher4')`);
    console.log('🗑️  Cleared existing test users\n');

    // Create Super Admin
    const superAdmin = await query(
      `INSERT INTO users (id, username, email, password_hash, role, first_name, last_name, phone_number, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
       RETURNING id, username, email, role, first_name, last_name`,
      ['11111111-1111-1111-1111-111111111111', 'superadmin', 'superadmin@school.ug', passwordHash, 'super_admin', 'John', 'Mukasa', '+256700000001']
    );
    console.log('✅ Super Admin created:', superAdmin.rows[0]);

    // Create Admin
    const admin = await query(
      `INSERT INTO users (id, username, email, password_hash, role, first_name, last_name, phone_number, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9)
       RETURNING id, username, email, role, first_name, last_name`,
      ['22222222-2222-2222-2222-222222222222', 'admin', 'admin@school.ug', passwordHash, 'admin', 'Sarah', 'Nakato', '+256700000002', '11111111-1111-1111-1111-111111111111']
    );
    console.log('✅ Admin created:', admin.rows[0]);

    // Create Teachers
    const teachers = [
      { id: '33333333-3333-3333-3333-333333333333', username: 'teacher1', email: 'teacher1@school.ug', firstName: 'James', lastName: 'Okello', phone: '+256700000003' },
      { id: '44444444-4444-4444-4444-444444444444', username: 'teacher2', email: 'teacher2@school.ug', firstName: 'Grace', lastName: 'Nambi', phone: '+256700000004' },
      { id: '55555555-5555-5555-5555-555555555555', username: 'teacher3', email: 'teacher3@school.ug', firstName: 'David', lastName: 'Ssentongo', phone: '+256700000005' },
      { id: '66666666-6666-6666-6666-666666666666', username: 'teacher4', email: 'teacher4@school.ug', firstName: 'Mary', lastName: 'Apio', phone: '+256700000006' }
    ];

    for (const teacher of teachers) {
      const result = await query(
        `INSERT INTO users (id, username, email, password_hash, role, first_name, last_name, phone_number, is_active, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9)
         RETURNING id, username, email, role, first_name, last_name`,
        [teacher.id, teacher.username, teacher.email, passwordHash, 'teacher', teacher.firstName, teacher.lastName, teacher.phone, '22222222-2222-2222-2222-222222222222']
      );
      console.log('✅ Teacher created:', result.rows[0]);
    }

    // Display summary
    const summary = await query(`
      SELECT role, COUNT(*) as count
      FROM users
      GROUP BY role
      ORDER BY CASE role
        WHEN 'super_admin' THEN 1
        WHEN 'admin' THEN 2
        WHEN 'teacher' THEN 3
      END
    `);

    console.log('\n📊 User Summary:');
    summary.rows.forEach(row => {
      console.log(`   ${row.role}: ${row.count} user(s)`);
    });

    console.log('\n✅ All test users created successfully!');
    console.log('\n📝 Login Credentials (all users):');
    console.log('   Password: password123\n');
    console.log('   Usernames:');
    console.log('   - superadmin (Super Admin)');
    console.log('   - admin (Admin)');
    console.log('   - teacher1, teacher2, teacher3, teacher4 (Teachers)\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test users:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
};

createTestUsers();
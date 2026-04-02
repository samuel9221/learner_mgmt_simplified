require('dotenv').config();
const bcrypt = require('bcrypt');
const { query } = require('./config/database');

async function testPassword() {
  console.log('🔍 Testing password for superadmin...\n');
  
  try {
    // Get user from database
    const result = await query(
      'SELECT username, password_hash FROM users WHERE username = $1',
      ['superadmin']
    );
    
    if (result.rows.length === 0) {
      console.log('❌ User "superadmin" NOT FOUND in database!');
      console.log('\n💡 Run: node create_users.js');
      process.exit(1);
    }
    
    const user = result.rows[0];
    console.log('✅ User found:', user.username);
    console.log('📝 Stored hash:', user.password_hash.substring(0, 20) + '...');
    
    // Test password
    const password = 'password123';
    console.log('🔑 Testing password:', password);
    
    const isMatch = await bcrypt.compare(password, user.password_hash);
    
    if (isMatch) {
      console.log('\n✅ PASSWORD MATCH! Login should work.');
    } else {
      console.log('\n❌ PASSWORD DOES NOT MATCH!');
      console.log('\n💡 Solution: Recreate the user with correct password');
      console.log('   Run: node create_users.js');
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  process.exit(0);
}

testPassword();
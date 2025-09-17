#!/usr/bin/env node

/**
 * Test User Generation Script for EMR Calendar
 * Creates 10 providers and 10 patients in Supabase
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables
config()

// Test data
const providers = [
  { name: 'Dr. John Smith', email: 'john.smith@hospital.com' },
  { name: 'Dr. Sarah Johnson', email: 'sarah.johnson@clinic.com' },
  { name: 'Dr. Michael Brown', email: 'michael.brown@medical.com' },
  { name: 'Dr. Emily Davis', email: 'emily.davis@healthcare.com' },
  { name: 'Dr. David Wilson', email: 'david.wilson@hospital.com' },
  { name: 'Dr. Lisa Anderson', email: 'lisa.anderson@clinic.com' },
  { name: 'Dr. Robert Taylor', email: 'robert.taylor@medical.com' },
  { name: 'Dr. Jessica Moore', email: 'jessica.moore@healthcare.com' },
  { name: 'Dr. William Garcia', email: 'william.garcia@hospital.com' },
  { name: 'Dr. Ashley Martinez', email: 'ashley.martinez@clinic.com' }
]

const patients = [
  { name: 'James Wilson', email: 'james.wilson@email.com' },
  { name: 'Mary Johnson', email: 'mary.johnson@email.com' },
  { name: 'Robert Davis', email: 'robert.davis@email.com' },
  { name: 'Jennifer Miller', email: 'jennifer.miller@email.com' },
  { name: 'Michael Brown', email: 'michael.brown@email.com' },
  { name: 'Linda Garcia', email: 'linda.garcia@email.com' },
  { name: 'William Jones', email: 'william.jones@email.com' },
  { name: 'Elizabeth Martinez', email: 'elizabeth.martinez@email.com' },
  { name: 'David Anderson', email: 'david.anderson@email.com' },
  { name: 'Barbara Thompson', email: 'barbara.thompson@email.com' }
]

const timezones = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'UTC'
]

const phoneNumbers = [
  '+1234567890', '+1987654321', '+1555123456', '+1444987654', '+1333555777',
  '+1222444666', '+1111333555', '+1666888000', '+1777999111', '+1888222444'
]

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)]
}

// Initialize Supabase client
function initializeSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables:')
    console.error('   SUPABASE_URL')
    console.error('   SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Create user in Supabase Auth and profile table
async function createUser(supabase, userData) {
  try {
    console.log(`Creating ${userData.role}: ${userData.name}`)

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: 'TestPass123!',
      email_confirm: true
    })

    if (authError) {
      console.error(`❌ Auth creation failed for ${userData.email}:`, authError.message)
      return null
    }

    // Create profile
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: userData.email,
        full_name: userData.name,
        role: userData.role,
        timezone: userData.timezone,
        phone_number: userData.phone_number
      })

    if (profileError) {
      console.error(`❌ Profile creation failed for ${userData.email}:`, profileError.message)
      // Clean up auth user
      await supabase.auth.admin.deleteUser(authData.user.id)
      return null
    }

    console.log(`✅ Created: ${userData.email}`)
    return authData.user
  } catch (error) {
    console.error(`❌ Error creating ${userData.email}:`, error.message)
    return null
  }
}

async function main() {
  console.log('🚀 Creating test users...')

  const supabase = initializeSupabase()

  // Test connection with correct table name
  const { error: testError } = await supabase.from('users').select('count').limit(1)
  if (testError) {
    console.error('❌ Supabase connection failed:', testError.message)
    process.exit(1)
  }
  console.log('✅ Supabase connected')

  let createdUsers = 0

  // Create providers
  console.log('\n👩‍⚕️ Creating providers...')
  for (let i = 0; i < providers.length; i++) {
    const user = await createUser(supabase, {
      name: providers[i].name,
      email: providers[i].email,
      role: 'provider',
      timezone: getRandomElement(timezones),
      phone_number: phoneNumbers[i]
    })
    if (user) createdUsers++
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  // Create patients
  console.log('\n🧑‍🦽 Creating patients...')
  for (let i = 0; i < patients.length; i++) {
    const user = await createUser(supabase, {
      name: patients[i].name,
      email: patients[i].email,
      role: 'patient',
      timezone: getRandomElement(timezones),
      phone_number: phoneNumbers[i]
    })
    if (user) createdUsers++
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  console.log(`\n🎉 Created ${createdUsers}/20 users successfully`)
  console.log('Password for all users: TestPass123!')
  console.log('Check your Supabase dashboard to verify the users were created.')
}

main().catch(console.error)
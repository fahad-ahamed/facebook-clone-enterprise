// Script to seed 1547 test users and create friendships with the first user
// Run with: bun run prisma/seed-users.ts

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Random name data for generating users
const firstNames = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa',
  'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
  'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle',
  'Kenneth', 'Dorothy', 'Kevin', 'Carol', 'Brian', 'Amanda', 'George', 'Melissa',
  'Edward', 'Deborah', 'Ronald', 'Stephanie', 'Timothy', 'Rebecca', 'Jason', 'Sharon',
  'Jeffrey', 'Laura', 'Ryan', 'Cynthia', 'Jacob', 'Kathleen', 'Gary', 'Amy',
  'Nicholas', 'Angela', 'Eric', 'Shirley', 'Jonathan', 'Anna', 'Stephen', 'Brenda',
  'Larry', 'Pamela', 'Justin', 'Emma', 'Scott', 'Nicole', 'Brandon', 'Helen',
  'Benjamin', 'Samantha', 'Samuel', 'Katherine', 'Raymond', 'Christine', 'Gregory', 'Debra',
  'Frank', 'Rachel', 'Alexander', 'Carolyn', 'Patrick', 'Janet', 'Jack', 'Catherine',
  'Dennis', 'Maria', 'Jerry', 'Heather', 'Tyler', 'Diane', 'Aaron', 'Ruth',
  'Jose', 'Julie', 'Adam', 'Olivia', 'Henry', 'Joyce', 'Nathan', 'Virginia',
  'Douglas', 'Victoria', 'Zachary', 'Kelly', 'Peter', 'Lauren', 'Kyle', 'Christina'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
  'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
  'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young',
  'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
  'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker',
  'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy',
  'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper', 'Peterson', 'Bailey',
  'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson',
  'Watson', 'Brooks', 'Chavez', 'Wood', 'James', 'Bennett', 'Gray', 'Mendoza',
  'Ruiz', 'Hughes', 'Li', 'Alvarez', 'Jimenez', 'Gonzales', 'Mason', 'Alexander',
  'Graham', 'Long', 'Harrison', 'Ross', 'Foster', 'Sanders', 'Price', 'Barnes'
];

const cities = [
  'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Phoenix, AZ',
  'Philadelphia, PA', 'San Antonio, TX', 'San Diego, CA', 'Dallas, TX', 'San Jose, CA',
  'Austin, TX', 'Jacksonville, FL', 'Fort Worth, TX', 'Columbus, OH', 'Charlotte, NC',
  'San Francisco, CA', 'Indianapolis, IN', 'Seattle, WA', 'Denver, CO', 'Washington, DC',
  'Boston, MA', 'Nashville, TN', 'Detroit, MI', 'Portland, OR', 'Las Vegas, NV'
];

const workplaces = [
  'Google', 'Apple', 'Microsoft', 'Amazon', 'Meta', 'Netflix', 'Tesla', 'SpaceX',
  'IBM', 'Oracle', 'Salesforce', 'Adobe', 'Intel', 'Cisco', 'Dell', 'HP',
  'Uber', 'Lyft', 'Airbnb', 'Twitter', 'LinkedIn', 'Slack', 'Zoom', 'Spotify'
];

const schools = [
  'Harvard University', 'Stanford University', 'MIT', 'Yale University', 'Princeton University',
  'Columbia University', 'University of Chicago', 'Duke University', 'Northwestern University',
  'UCLA', 'UC Berkeley', 'University of Michigan', 'NYU', 'Cornell University'
];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomEmail(firstName: string, lastName: string, num: number): string {
  const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com'];
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${num}@${getRandomElement(domains)}`;
}

async function main() {
  console.log('Starting to seed users...');
  
  // Get the first user
  const firstUser = await prisma.user.findFirst({
    orderBy: { createdAt: 'asc' }
  });
  
  if (!firstUser) {
    console.error('No users found in database. Please create at least one user first.');
    process.exit(1);
  }
  
  console.log(`First user: ${firstUser.firstName} ${firstUser.lastName} (${firstUser.id})`);
  
  // Check how many users already exist
  const existingCount = await prisma.user.count();
  const usersToCreate = Math.max(0, 1547 - existingCount);
  
  if (usersToCreate === 0) {
    console.log('Users already exist. Checking friendships...');
  } else {
    console.log(`Creating ${usersToCreate} test users...`);
  }
  
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  // Create users one by one to avoid batch issues
  let createdCount = 0;
  for (let i = 0; i < usersToCreate; i++) {
    const num = i + existingCount + 1;
    const firstName = getRandomElement(firstNames);
    const lastName = getRandomElement(lastNames);
    const email = generateRandomEmail(firstName, lastName, num);
    
    try {
      await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          username: `${firstName.toLowerCase()}${lastName.toLowerCase()}${num}`,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${firstName}${lastName}${num}`,
          currentCity: Math.random() > 0.3 ? getRandomElement(cities) : undefined,
          hometown: Math.random() > 0.5 ? getRandomElement(cities) : undefined,
          workplace: Math.random() > 0.4 ? getRandomElement(workplaces) : undefined,
          education: Math.random() > 0.5 ? getRandomElement(schools) : undefined,
          isVerified: true, // All seeded users are email verified
          isOnline: Math.random() > 0.4,
        }
      });
      createdCount++;
      
      if (createdCount % 100 === 0) {
        console.log(`Created ${createdCount} users...`);
      }
    } catch (error) {
      // Skip duplicates silently
    }
  }
  
  console.log(`Created ${createdCount} new users.`);
  
  // Get all users except the first user
  const allUsers = await prisma.user.findMany({
    where: { id: { not: firstUser.id } },
    select: { id: true }
  });
  
  console.log(`Total users to create friendships for: ${allUsers.length}`);
  
  // Check existing friendships
  const existingFriendships = await prisma.friendship.findMany({
    where: {
      OR: [
        { user1Id: firstUser.id },
        { user2Id: firstUser.id }
      ]
    }
  });
  
  const existingFriendIds = new Set(
    existingFriendships.map(f => 
      f.user1Id === firstUser.id ? f.user2Id : f.user1Id
    )
  );
  
  const friendshipsToCreate = allUsers.filter(u => !existingFriendIds.has(u.id));
  console.log(`Friendships to create: ${friendshipsToCreate.length}`);
  
  // Create friendships one by one
  let friendshipCount = 0;
  for (const user of friendshipsToCreate) {
    try {
      await prisma.friendship.create({
        data: {
          user1Id: firstUser.id,
          user2Id: user.id,
        }
      });
      friendshipCount++;
      
      if (friendshipCount % 200 === 0) {
        console.log(`Created ${friendshipCount} friendships...`);
      }
    } catch (error) {
      // Skip duplicates silently
    }
  }
  
  // Verify final count
  const finalFriendshipCount = await prisma.friendship.count({
    where: {
      OR: [
        { user1Id: firstUser.id },
        { user2Id: firstUser.id }
      ]
    }
  });
  
  const finalUserCount = await prisma.user.count();
  
  console.log('\n=== Seeding Complete ===');
  console.log(`Total users: ${finalUserCount}`);
  console.log(`Total friendships for first user: ${finalFriendshipCount}`);
  
  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  });

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clear existing data
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversationMember.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.reaction.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.friendRequest.deleteMany();
  await prisma.friendship.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const password = await bcrypt.hash('password123', 10);
  
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'john@example.com',
        password,
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
        coverPhoto: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
        bio: 'Living life to the fullest! 🌟 Tech enthusiast | Coffee lover ☕',
        currentCity: 'San Francisco, CA',
        hometown: 'New York, NY',
        workplace: 'Tech Company Inc.',
        education: 'Stanford University',
        relationshipStatus: 'Single',
        isVerified: true,
        isOnline: true,
      }
    }),
    prisma.user.create({
      data: {
        email: 'sarah@example.com',
        password,
        firstName: 'Sarah',
        lastName: 'Wilson',
        username: 'sarahw',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
        bio: 'Designer | Traveler | Dreamer ✨',
        currentCity: 'Los Angeles, CA',
        isVerified: true,
        isOnline: true,
      }
    }),
    prisma.user.create({
      data: {
        email: 'mike@example.com',
        password,
        firstName: 'Mike',
        lastName: 'Johnson',
        username: 'mikej',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
        bio: 'Coffee addict ☕ | Developer',
        currentCity: 'Seattle, WA',
        isOnline: true,
      }
    }),
    prisma.user.create({
      data: {
        email: 'emily@example.com',
        password,
        firstName: 'Emily',
        lastName: 'Rose',
        username: 'emilyr',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily',
        bio: 'Artist 🎨 | Nature lover 🌿',
        currentCity: 'Portland, OR',
        isVerified: true,
        isOnline: false,
      }
    }),
    prisma.user.create({
      data: {
        email: 'david@example.com',
        password,
        firstName: 'David',
        lastName: 'Kim',
        username: 'davidk',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
        bio: 'Music producer | Gamer',
        currentCity: 'Austin, TX',
        isOnline: true,
      }
    }),
    prisma.user.create({
      data: {
        email: 'lisa@example.com',
        password,
        firstName: 'Lisa',
        lastName: 'Moore',
        username: 'lisam',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa',
        bio: 'Fitness enthusiast 💪 | Yoga teacher',
        currentCity: 'Denver, CO',
        isVerified: true,
        isOnline: false,
      }
    }),
  ]);

  console.log(`Created ${users.length} users`);

  // Create friendships
  await prisma.friendship.createMany({
    data: [
      { user1Id: users[0].id, user2Id: users[1].id },
      { user1Id: users[0].id, user2Id: users[2].id },
      { user1Id: users[0].id, user2Id: users[3].id },
      { user1Id: users[1].id, user2Id: users[2].id },
      { user1Id: users[2].id, user2Id: users[4].id },
      { user1Id: users[3].id, user2Id: users[5].id },
    ]
  });

  console.log('Created friendships');

  // Create friend requests
  await prisma.friendRequest.createMany({
    data: [
      { senderId: users[4].id, receiverId: users[0].id, status: 'pending' },
      { senderId: users[5].id, receiverId: users[0].id, status: 'pending' },
    ]
  });

  console.log('Created friend requests');

  // Create posts
  const posts = await Promise.all([
    prisma.post.create({
      data: {
        authorId: users[1].id,
        content: 'Just finished building an awesome project! 🚀 What an amazing journey it has been. Grateful for all the support from my friends and family! #coding #developer #success',
        postType: 'status',
        visibility: 'public',
        likeCount: 245,
        commentCount: 42,
        shareCount: 18,
      }
    }),
    prisma.post.create({
      data: {
        authorId: users[2].id,
        content: 'Beautiful sunset today! Nature never fails to amaze me 🌅 #nature #sunset #beauty',
        mediaUrl: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=800',
        mediaType: 'image',
        postType: 'photo',
        visibility: 'friends',
        location: 'San Francisco, CA',
        likeCount: 892,
        commentCount: 67,
        shareCount: 23,
      }
    }),
    prisma.post.create({
      data: {
        authorId: users[0].id,
        content: 'Life update: New job, new city, new adventures! 💼✨ Can\'t wait to see what the future holds. #newchapter #excited',
        postType: 'life_event',
        visibility: 'public',
        feeling: 'feeling excited',
        likeCount: 156,
        commentCount: 28,
        shareCount: 5,
      }
    }),
    prisma.post.create({
      data: {
        authorId: users[3].id,
        content: 'Morning coffee hit different today ☕ #coffee #morning #vibes',
        mediaUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800',
        mediaType: 'image',
        postType: 'photo',
        visibility: 'public',
        likeCount: 234,
        commentCount: 12,
        shareCount: 3,
      }
    }),
    prisma.post.create({
      data: {
        authorId: users[4].id,
        content: 'Just released my new track! Check it out 🎵 Link in bio #music #newrelease',
        postType: 'status',
        visibility: 'public',
        likeCount: 567,
        commentCount: 89,
        shareCount: 45,
      }
    }),
    prisma.post.create({
      data: {
        authorId: users[5].id,
        content: 'Yoga session done ✅ Feeling refreshed and ready for the day! #yoga #wellness #morningroutine',
        mediaUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800',
        mediaType: 'image',
        postType: 'photo',
        visibility: 'public',
        likeCount: 345,
        commentCount: 34,
        shareCount: 12,
      }
    }),
  ]);

  console.log(`Created ${posts.length} posts`);

  // Create comments
  await prisma.comment.createMany({
    data: [
      { postId: posts[0].id, authorId: users[0].id, content: 'Congratulations! 🎉 This looks amazing!', likeCount: 12 },
      { postId: posts[0].id, authorId: users[2].id, content: 'Well done! Keep it up! 💪', likeCount: 5 },
      { postId: posts[1].id, authorId: users[0].id, content: 'Stunning view! Where is this?', likeCount: 8 },
      { postId: posts[2].id, authorId: users[1].id, content: 'So proud of you! 🌟', likeCount: 15 },
      { postId: posts[3].id, authorId: users[2].id, content: 'Coffee is life! ☕', likeCount: 3 },
    ]
  });

  console.log('Created comments');

  // Create reactions
  await prisma.reaction.createMany({
    data: [
      { userId: users[0].id, postId: posts[0].id, type: 'like' },
      { userId: users[0].id, postId: posts[1].id, type: 'love' },
      { userId: users[1].id, postId: posts[0].id, type: 'like' },
      { userId: users[1].id, postId: posts[2].id, type: 'love' },
      { userId: users[2].id, postId: posts[0].id, type: 'wow' },
      { userId: users[3].id, postId: posts[1].id, type: 'like' },
    ]
  });

  console.log('Created reactions');

  // Create notifications
  await prisma.notification.createMany({
    data: [
      { userId: users[0].id, type: 'like', message: 'Sarah Wilson liked your post', actorId: users[1].id },
      { userId: users[0].id, type: 'comment', message: 'Mike Johnson commented on your photo', actorId: users[2].id },
      { userId: users[0].id, type: 'friend', message: 'Emily Rose sent you a friend request', actorId: users[3].id },
      { userId: users[0].id, type: 'tag', message: 'David Kim tagged you in a photo', actorId: users[4].id },
      { userId: users[1].id, type: 'like', message: 'John Doe liked your post', actorId: users[0].id },
    ]
  });

  console.log('Created notifications');

  // Create stories
  await prisma.story.createMany({
    data: [
      { userId: users[1].id, mediaType: 'image', mediaUrl: 'https://picsum.photos/seed/story1/400/700', visibility: 'friends', expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      { userId: users[2].id, mediaType: 'image', mediaUrl: 'https://picsum.photos/seed/story2/400/700', visibility: 'friends', expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      { userId: users[3].id, mediaType: 'image', mediaUrl: 'https://picsum.photos/seed/story3/400/700', visibility: 'public', expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      { userId: users[4].id, mediaType: 'image', mediaUrl: 'https://picsum.photos/seed/story4/400/700', visibility: 'friends', expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    ]
  });

  console.log('Created stories');

  // Create conversations and messages
  const conversation1 = await prisma.conversation.create({
    data: {
      type: 'direct',
      user1Id: users[0].id,
      user2Id: users[1].id,
    }
  });

  await prisma.conversationMember.createMany({
    data: [
      { conversationId: conversation1.id, userId: users[0].id },
      { conversationId: conversation1.id, userId: users[1].id },
    ]
  });

  await prisma.message.createMany({
    data: [
      { conversationId: conversation1.id, senderId: users[1].id, content: 'Hey! How are you? 😊', isRead: true },
      { conversationId: conversation1.id, senderId: users[0].id, content: 'Hi Sarah! I\'m doing great, thanks!', isRead: true },
      { conversationId: conversation1.id, senderId: users[1].id, content: 'Want to grab coffee later?', isRead: false },
    ]
  });

  const conversation2 = await prisma.conversation.create({
    data: {
      type: 'direct',
      user1Id: users[0].id,
      user2Id: users[2].id,
    }
  });

  await prisma.conversationMember.createMany({
    data: [
      { conversationId: conversation2.id, userId: users[0].id },
      { conversationId: conversation2.id, userId: users[2].id },
    ]
  });

  await prisma.message.createMany({
    data: [
      { conversationId: conversation2.id, senderId: users[2].id, content: 'See you tomorrow!', isRead: true },
    ]
  });

  console.log('Created conversations and messages');

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

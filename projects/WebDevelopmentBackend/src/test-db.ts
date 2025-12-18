import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔌 Testing Supabase connection...\n');

  try {
    // Test 1: Create a lead
    console.log('📝 Creating test lead...');
    const testLead = await prisma.lead.create({
      data: {
        name: 'John Doe',
        email: `test-${Date.now()}@example.com`,
        projectDescription: 'Need a restaurant website with online ordering',
        source: 'test',
        estimatedBudgetMin: 5000,
        estimatedBudgetMax: 10000,
        estimatedTimeline: '6-8 weeks'
      }
    });
    console.log('✅ Lead created:', {
      id: testLead.id,
      name: testLead.name,
      email: testLead.email
    });

    // Test 2: Create a conversation for that lead
    console.log('\n💬 Creating test conversation...');
    const conversation = await prisma.conversation.create({
      data: {
        leadId: testLead.id,
        messages: [
          { role: 'user', content: 'I need a website', timestamp: new Date() },
          { role: 'assistant', content: 'Great! Tell me more', timestamp: new Date() }
        ],
        tokenCount: 150
      }
    });
    console.log('✅ Conversation created:', {
      id: conversation.id,
      messages: conversation.messages
    });

    // Test 3: Query with relationships
    console.log('\n🔍 Querying lead with conversations...');
    const leadWithConversations = await prisma.lead.findUnique({
      where: { id: testLead.id },
      include: {
        conversations: true,
        bookings: true
      }
    });
    console.log('✅ Found lead with', leadWithConversations?.conversations.length, 'conversations');

    // Test 4: Count all leads
    const totalLeads = await prisma.lead.count();
    console.log('\n📊 Total leads in database:', totalLeads);

    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    await prisma.conversation.deleteMany({
      where: { leadId: testLead.id }
    });
    await prisma.lead.delete({
      where: { id: testLead.id }
    });
    console.log('✅ Test data cleaned up');

    console.log('\n✨ All tests passed! Database is working perfectly!\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

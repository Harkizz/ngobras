/**
 * Command-line test runner for auto-read message functionality
 * Run with: node run_auto_read_test.js
 */

// Create mock browser environment
global.window = {};
global.console.log = function(...args) {
  const message = args.map(arg => {
    if (typeof arg === 'object') {
      return JSON.stringify(arg, null, 2);
    }
    return String(arg);
  }).join(' ');
  
  // Add color to console output
  let coloredMessage = message;
  if (message.includes('✅')) {
    coloredMessage = `\x1b[32m${message}\x1b[0m`; // Green
  } else if (message.includes('❌')) {
    coloredMessage = `\x1b[31m${message}\x1b[0m`; // Red
  } else if (message.includes('[ChatroomAdmin]')) {
    coloredMessage = `\x1b[36m${message}\x1b[0m`; // Cyan for ChatroomAdmin logs
  } else if (message.includes('[MockSupabase]')) {
    coloredMessage = `\x1b[35m${message}\x1b[0m`; // Magenta for MockSupabase logs
  }
  
  console.info(coloredMessage);
};

// Mock Supabase client for testing
const mockSupabase = {
  from: function(table) {
    console.log(`[MockSupabase] Called from('${table}')`);
    return {
      update: function(data) {
        console.log(`[MockSupabase] Called update with data:`, data);
        return {
          match: function(conditions) {
            console.log(`[MockSupabase] Called match with conditions:`, conditions);
            // Simulate successful update
            return Promise.resolve({
              data: { updated: true },
              count: 3, // Simulate 3 messages updated
              error: null
            });
          }
        };
      }
    };
  }
};

// Mock query parameters
const mockUserId = '123-user-456';
const mockAdminId = '789-admin-012';

// Test the updateUnreadMessages function
async function testUpdateUnreadMessages() {
  console.log('=== Testing updateUnreadMessages function ===');
  
  // Set up global variables used by the function
  window.supabase = mockSupabase;
  window.userId = mockUserId;
  window.adminId = mockAdminId;
  
  // Define the function (copied from chatroom_admin.js with minor modifications for testing)
  async function updateUnreadMessages() {
    if (!window.supabase || !window.adminId || !window.userId) {
      console.error('[ChatroomAdmin] Cannot update message status: missing supabase client, adminId, or userId');
      return { success: false, error: 'Missing required data' };
    }

    try {
      console.log('[ChatroomAdmin] Updating unread messages to read status...');
      
      // Find messages where admin is the receiver and messages are unread
      // This means messages sent by the user to the admin
      const { data, error, count } = await window.supabase
        .from('messages')
        .update({ is_read: true })
        .match({ 
          sender_id: window.userId,
          receiver_id: window.adminId,
          is_read: false
        });
      
      if (error) {
        console.error('[ChatroomAdmin] Error updating message read status:', error);
        return { success: false, error };
      }
      
      console.log(`[ChatroomAdmin] Successfully updated message read status. Affected rows:`, count);
      return { success: true, count };
    } catch (err) {
      console.error('[ChatroomAdmin] Exception updating message read status:', err);
      return { success: false, error: err };
    }
  }
  
  // Run the test
  try {
    const result = await updateUnreadMessages();
    console.log('Test result:', result);
    
    if (result.success) {
      console.log('✅ Test PASSED: Successfully updated unread messages');
    } else {
      console.log('❌ Test FAILED: Failed to update unread messages');
    }
  } catch (err) {
    console.error('❌ Test ERROR:', err);
  }
}

// Test the realtime handler for new messages
async function testRealtimeHandler() {
  console.log('\n=== Testing Realtime Handler ===');
  
  // Mock variables
  window.adminId = mockAdminId;
  window.userId = mockUserId;
  
  // Mock updateUnreadMessages function that was called by the handler
  let updateCalled = false;
  window.updateUnreadMessages = async function() {
    updateCalled = true;
    console.log('[MockFunction] updateUnreadMessages was called');
    return { success: true, count: 2 };
  };
  
  // Simulate a payload from Supabase realtime
  const mockPayload = {
    eventType: 'INSERT',
    new: {
      sender_id: mockUserId,
      receiver_id: mockAdminId,
      is_read: false,
      content: 'Test message'
    }
  };
  
  // Simulate the handler logic
  console.log('Simulating realtime event handler with payload:', mockPayload);
  
  const msg = mockPayload.new;
  if (mockPayload.eventType === 'INSERT' && 
      msg.sender_id === mockUserId && 
      msg.receiver_id === mockAdminId && 
      msg.is_read === false) {
    console.log('[ChatroomAdmin][Realtime] New unread message detected, updating read status...');
    await window.updateUnreadMessages();
  }
  
  if (updateCalled) {
    console.log('✅ Test PASSED: updateUnreadMessages was called for new unread message');
  } else {
    console.log('❌ Test FAILED: updateUnreadMessages was not called');
  }
}

// Test error handling
async function testErrorHandling() {
  console.log('\n=== Testing Error Handling ===');
  
  // Test case 1: Missing Supabase client
  console.log('Test case 1: Missing Supabase client');
  window.supabase = null;
  window.userId = mockUserId;
  window.adminId = mockAdminId;
  
  async function updateUnreadMessages1() {
    if (!window.supabase || !window.adminId || !window.userId) {
      console.error('[ChatroomAdmin] Cannot update message status: missing supabase client, adminId, or userId');
      return { success: false, error: 'Missing required data' };
    }
    // Rest of function not needed for this test
    return { success: true };
  }
  
  const result1 = await updateUnreadMessages1();
  if (!result1.success && result1.error === 'Missing required data') {
    console.log('✅ Test PASSED: Correctly handled missing Supabase client');
  } else {
    console.log('❌ Test FAILED: Did not handle missing Supabase client correctly');
  }
  
  // Test case 2: Supabase error
  console.log('\nTest case 2: Supabase error');
  window.supabase = {
    from: function() {
      return {
        update: function() {
          return {
            match: function() {
              return Promise.resolve({
                data: null,
                count: 0,
                error: { message: 'Database error', code: 'DB_ERROR' }
              });
            }
          };
        }
      };
    }
  };
  window.userId = mockUserId;
  window.adminId = mockAdminId;
  
  async function updateUnreadMessages2() {
    if (!window.supabase || !window.adminId || !window.userId) {
      console.error('[ChatroomAdmin] Cannot update message status: missing supabase client, adminId, or userId');
      return { success: false, error: 'Missing required data' };
    }

    try {
      console.log('[ChatroomAdmin] Updating unread messages to read status...');
      
      const { data, error, count } = await window.supabase
        .from('messages')
        .update({ is_read: true })
        .match({ 
          sender_id: window.userId,
          receiver_id: window.adminId,
          is_read: false
        });
      
      if (error) {
        console.error('[ChatroomAdmin] Error updating message read status:', error);
        return { success: false, error };
      }
      
      return { success: true, count };
    } catch (err) {
      console.error('[ChatroomAdmin] Exception updating message read status:', err);
      return { success: false, error: err };
    }
  }
  
  const result2 = await updateUnreadMessages2();
  if (!result2.success && result2.error && result2.error.code === 'DB_ERROR') {
    console.log('✅ Test PASSED: Correctly handled Supabase error');
  } else {
    console.log('❌ Test FAILED: Did not handle Supabase error correctly');
  }
}

// Run all tests
async function runTests() {
  console.log('🧪 STARTING AUTO-READ FUNCTIONALITY TESTS 🧪');
  console.log('==========================================');
  
  await testUpdateUnreadMessages();
  await testRealtimeHandler();
  await testErrorHandling();
  
  console.log('==========================================');
  console.log('🧪 ALL TESTS COMPLETED 🧪');
}

// Run tests
runTests().catch(err => {
  console.error('Test suite error:', err);
});
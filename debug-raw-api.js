#!/usr/bin/env node

/**
 * Raw ClickUp API Test Script
 * Tests ClickUp API directly without any MCP processing to isolate duplication issue
 */

import axios from 'axios';

const CLICKUP_API_TOKEN = process.env.CLICKUP_API_TOKEN;
const TASK_ID = '868f9p3bg'; // Your test task ID

if (!CLICKUP_API_TOKEN) {
  console.error('CLICKUP_API_TOKEN environment variable is required');
  process.exit(1);
}

async function testRawAPI() {
  console.log('=== RAW CLICKUP API TEST ===');
  console.log('Testing comment creation without any MCP processing...\n');

  const payload = {
    notify_all: false,
    comment_text: '**RAW API TEST - NO MCP PROCESSING**'
  };

  const config = {
    method: 'post',
    url: `https://api.clickup.com/api/v2/task/${TASK_ID}/comment`,
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'Authorization': CLICKUP_API_TOKEN
    },
    data: JSON.stringify(payload)
  };

  console.log('Request Configuration:');
  console.log('URL:', config.url);
  console.log('Headers:', JSON.stringify(config.headers, null, 2));
  console.log('Payload:', config.data);
  console.log('\n--- SENDING REQUEST ---\n');

  try {
    const response = await axios(config);
    
    console.log('=== RAW CLICKUP API RESPONSE ===');
    console.log('Status:', response.status);
    console.log('Response Data:', JSON.stringify(response.data, null, 2));
    console.log('================================\n');

    // Now get the comments to see what was actually stored
    console.log('=== FETCHING COMMENTS TO VERIFY ===');
    const getResponse = await axios({
      method: 'get',
      url: `https://api.clickup.com/api/v2/task/${TASK_ID}/comment`,
      headers: {
        'accept': 'application/json',
        'Authorization': CLICKUP_API_TOKEN
      }
    });

    console.log('Comments Response:', JSON.stringify(getResponse.data, null, 2));
    console.log('===================================\n');

    // Check if the latest comment has duplication
    if (getResponse.data.comments && getResponse.data.comments.length > 0) {
      const latestComment = getResponse.data.comments[0];
      console.log('=== LATEST COMMENT ANALYSIS ===');
      console.log('Comment ID:', latestComment.id);
      console.log('Comment Text:', latestComment.comment_text);
      console.log('Comment Structure:', JSON.stringify(latestComment.comment, null, 2));
      
      // Check for duplication patterns
      if (latestComment.comment_text && latestComment.comment_text.includes('**RAW API TEST - NO MCP PROCESSING**')) {
        const occurrences = (latestComment.comment_text.match(/\*\*RAW API TEST - NO MCP PROCESSING\*\*/g) || []).length;
        console.log('Duplication Check: Found', occurrences, 'occurrences of test text');
        
        if (occurrences > 1) {
          console.log('🚨 DUPLICATION DETECTED IN RAW API RESPONSE!');
          console.log('This means ClickUp API itself is returning duplicated content.');
        } else {
          console.log('✅ No duplication in raw API response.');
          console.log('Duplication must be happening in MCP processing.');
        }
      }
      console.log('===============================');
    }

  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

testRawAPI();

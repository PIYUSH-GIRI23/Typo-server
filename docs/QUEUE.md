# 🐰 RabbitMQ Queue Documentation

Complete guide to message queue architecture, patterns, and async operations in Typo server.

---

## Table of Contents
- [Overview](#overview)
- [Connection Management](#connection-management)
- [Queue Types](#queue-types)
- [Message Patterns](#message-patterns)
- [Priority System](#priority-system)
- [Operations](#operations)
- [Consumer Implementation](#consumer-implementation)

---

## Overview

Typo uses **RabbitMQ** for asynchronous message processing to:
- 📧 Send emails without blocking API responses
- 💾 Update Redis cache asynchronously
- 📦 Pre-load typing test content on server startup
- ⚡ Decouple time-consuming operations from request handling

### Queue Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     TYPO API SERVER                         │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Producer   │  │   Producer   │  │   Producer   │       │
│  │  (Register)  │  │  (Analytics) │  │  (Startup)   │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                  │                  │             │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                       RABBITMQ BROKER                       │
│  ┌──────────────────┐ ┌────────────┐                        │
│  │   Mail Queue     │ │ Paragraph  │                        │
│  │   Priority 5-10  │ │ Queue      │                        │
│  │   ┌────────────┐ │ │Priority 3  │                        │
│  │   │ signup     │ │ │            │                        │
│  │   │ delete     │ │ └────────────┘                        │
│  │   │ reset-otp  │ │                                       │
│  │   └────────────┘ │                                       │
│  └──────────────────┘                                       │
└─────────┬──────────────────┬────────────────────────────────┘
          │                  │
          ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    CONSUMER SERVICES                        │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │  Mail        │  │  Content     │                         │
│  │  Service     │  │  Loader      │                         │
│  │  (Nodemailer)│  │  Service     │                         │
│  └──────────────┘  └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Connection Management

### Connection Configuration

**File:** `init/queue.js`

```javascript
import amqp from 'amqplib';
import { env } from './env.js';

let connection = null;
let channel = null;

export const MAIL_QUEUE = 'mail_queue';
export const PARAGRAPH_QUEUE = 'paragraph_queue';

export const connectMQ = async () => {
  try {
    if (channel) return channel;
    
    const { user, password, host, port } = env.rabbitmq;
    const url = `amqp://${user}:${password}@${host}:${port}`;
    
    connection = await amqp.connect(url);
    channel = await connection.createChannel();
    
    // Assert queues exist with priority support
    await channel.assertQueue(MAIL_QUEUE, {
      durable: true,
      maxPriority: 10
    });
    
    await channel.assertQueue(PARAGRAPH_QUEUE, {
      durable: true,
      maxPriority: 10
    });
    
    console.log('RabbitMQ connected');
    return channel;
  } catch (error) {
    console.error('RabbitMQ connection error:', error);
    throw error;
  }
};

export const stopMQ = async () => {
  try {
    if (channel) {
      await channel.close();
      channel = null;
    }
    if (connection) {
      await connection.close();
      connection = null;
    }
    console.log('RabbitMQ connection closed');
  } catch (error) {
    console.error('Error closing RabbitMQ:', error);
  }
};
```

### Connection Features
- ✅ Singleton pattern (single connection/channel)
- ✅ Durable queues (survive broker restart)
- ✅ Priority support (10 levels)
- ✅ Persistent messages (survive broker restart)
- ✅ Graceful shutdown

---

## Queue Types

### 1. Mail Queue

**Queue Name:** `mail_queue`

**Purpose:** Asynchronous email delivery

**Message Types:**
- `signup`: Welcome email on registration
- `delete`: Account deletion confirmation
- `reset-otp`: Password reset OTP email

**Priority Range:** 5-10

**Durability:** Persistent messages

**Consumer:** Mail service (separate Node.js process or mailservice/)

---

### 2. Paragraph Queue

**Queue Name:** `paragraph_queue`

**Purpose:** Content delivery for typing tests

**Message Types:**
- Paragraph data with ID, content, type, difficulty, length

**Priority Range:** 3

**Durability:** Persistent messages

**Consumer:** Content loader service or frontend cache

---

## Message Patterns

### Mail Queue Message Format

```javascript
{
  mailId: "user@example.com",
  type: "signup" | "delete" | "reset-otp",
  datetime: {
    date: "31-01-2026",
    time: "14:30:45",
    dateTime: "31-01-2026 14:30:45"
  }
}
```

**Fields:**
- `mailId`: Recipient email address
- `type`: Email template to use
- `datetime`: Formatted timestamp for email content

**Example:**
```json
{
  "mailId": "john@example.com",
  "type": "signup",
  "datetime": {
    "date": "31-01-2026",
    "time": "14:30:45",
    "dateTime": "31-01-2026 14:30:45"
  }
}
```---

### Paragraph Queue Message Format

```javascript
{
  id: "qo1",
  content: "Practice every day and small gains will lead to steady lasting progress",
  type: "quote" | "word",
  difficulty: "easy" | "hard",
  length: "short" | "long"
}
```

**Fields:**
- `id`: Unique paragraph identifier (e.g., qo1, wes2, whl5)
- `content`: Full paragraph text
- `type`: Content category
- `difficulty`: Typing difficulty level
- `length`: Paragraph length category

**Example:**
```json
{
  "id": "wes3",
  "content": "The morning light filled the quiet fields...",
  "type": "word",
  "difficulty": "easy",
  "length": "short"
}
```

---

## Priority System

### Priority Levels (1-10)

| Priority | Queue | Type | Reason |
|----------|-------|------|--------|
| **10** | Mail | reset-otp | Critical: User waiting for OTP |
| **8** | Mail | signup | Important: Welcome new user |
| **5** | Mail | delete | Normal: Confirmation email |
| **5** | User | set-analytics | Normal: Cache update |
| **3** | Paragraph | load-content | Low: Background content loading |

### Priority Behavior

RabbitMQ processes messages in priority order:
```
Queue Contents:
[Priority 10] OTP email
[Priority 8]  Signup email
[Priority 5]  Delete email
[Priority 3]  Paragraph load

Processing Order:
1. OTP email (priority 10)
2. Signup email (priority 8)
3. Delete email (priority 5)
4. Paragraph load (priority 3)
```

**Same Priority:** FIFO (First-In-First-Out)

---

## Operations

### 1. Push to Mail Queue

**File:** `queue/mailQueue.js`

```javascript
import { connectMQ, MAIL_QUEUE } from "../init/queue.js";

const pushMailQueue = async (mailId, type, datetime, priority = 5) => {
  const ch = await connectMQ();
  const message = { mailId, type, datetime };
  
  ch.sendToQueue(
    MAIL_QUEUE, 
    Buffer.from(JSON.stringify(message)), 
    {
      persistent: true,
      priority
    }
  );
  
  console.log("Message pushed to mailQueue:", message);
};

export { pushMailQueue };
```

**Usage:**
```javascript
// Signup email (priority 8)
await pushMailQueue(
  "user@example.com",
  "signup",
  formatDateTime(Date.now()),
  8
);

// Delete email (priority 5)
await pushMailQueue(
  "user@example.com",
  "delete",
  formatDateTime(Date.now()),
  5
);

// OTP email (priority 10 - highest)
await pushMailQueue(
  "user@example.com",
  "reset-otp",
  formatDateTime(Date.now()),
  10
);
```

---
### 2. Push to Paragraph Queue

**File:** `queue/paragraphQueue.js`

```javascript
import { connectMQ, PARAGRAPH_QUEUE } from "../init/queue.js";

const pushParagraphQueue = async (data, priority = 5) => {
  const ch = await connectMQ();
  
  ch.sendToQueue(
    PARAGRAPH_QUEUE, 
    Buffer.from(JSON.stringify(data)), 
    {
      persistent: true,
      priority
    }
  );
};

export { pushParagraphQueue };
```

**Usage:**
```javascript
// Load paragraph content
await pushParagraphQueue({
  id: "qo1",
  content: "Practice every day...",
  type: "quote",
  difficulty: "easy",
  length: "short"
}, 3);
```

---

## Consumer Implementation

### Basic Consumer Pattern

**Example: Mail Queue Consumer**

```javascript
import amqp from 'amqplib';

const consumeMailQueue = async () => {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();
  
  await channel.assertQueue('mail_queue', { durable: true });
  
  // Prefetch 1 message at a time (prevents overwhelming consumer)
  channel.prefetch(1);
  
  console.log('Waiting for messages in mail_queue...');
  
  channel.consume('mail_queue', async (msg) => {
    if (msg !== null) {
      try {
        const data = JSON.parse(msg.content.toString());
        console.log('Received:', data);
        
        // Process message (send email)
        await sendEmail(data.mailId, data.type, data.datetime);
        
        // Acknowledge message (remove from queue)
        channel.ack(msg);
        console.log('Message processed successfully');
      } catch (error) {
        console.error('Error processing message:', error);
        
        // Negative acknowledgment (requeue message)
        channel.nack(msg, false, true);
      }
    }
  });
};

consumeMailQueue();
```

### Consumer Features
- ✅ Prefetch 1 message (process one at a time)
- ✅ Acknowledge on success (ack)
- ✅ Requeue on failure (nack with requeue)
- ✅ Error handling
- ✅ Persistent connection

---

### Mail Service Consumer (mailservice/)

**Expected Implementation:**

```javascript
// mailservice/index.js
import nodemailer from 'nodemailer';
import amqp from 'amqplib';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

const sendEmail = async (mailId, type, datetime) => {
  const templates = {
    signup: {
      subject: 'Welcome to Typo!',
      text: `Welcome! You registered on ${datetime.dateTime}`
    },
    delete: {
      subject: 'Account Deleted',
      text: `Your account was deleted on ${datetime.dateTime}`
    },
    'reset-otp': {
      subject: 'Password Reset OTP',
      text: `Your OTP is: [OTP]. Valid for 2 minutes.`
    }
  };
  
  const template = templates[type];
  
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: mailId,
    subject: template.subject,
    text: template.text
  });
  
  console.log(`Email sent to ${mailId}: ${type}`);
};

const consumeMailQueue = async () => {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();
  
  await channel.assertQueue('mail_queue', { durable: true });
  channel.prefetch(1);
  
  channel.consume('mail_queue', async (msg) => {
    if (msg) {
      try {
        const { mailId, type, datetime } = JSON.parse(msg.content.toString());
        await sendEmail(mailId, type, datetime);
        channel.ack(msg);
      } catch (error) {
        console.error('Email error:', error);
        channel.nack(msg, false, true);
      }
    }
  });
  
  console.log('Mail consumer running...');
};

consumeMailQueue();
```

---

## Paragraph Loading

### Startup Content Loading

**File:** `helper/paragraphLoader.js`

```javascript
import quotes from '../data/quote.js';
import {
  easyShortPara,
  easyLongPara,
  hardShortPara,
  hardLongPara
} from '../data/paragraph.js';
import { pushParagraphQueue } from '../queue/paragraphQueue.js';
import { env } from '../init/env.js';

export const loadParagraphsToQueue = async () => {
  const maxPara = env.para.max; // Default: 10
  const promises = [];
  
  // Load quotes
  for (let i = 0; i < Math.min(quotes.length, maxPara); i++) {
    promises.push(
      pushParagraphQueue({
        id: `${env.para.quote}${i + 1}`,
        content: quotes[i],
        type: 'quote',
        difficulty: 'easy',
        length: 'short'
      }, 3)
    );
  }
  
  // Load easy short paragraphs
  for (let i = 0; i < Math.min(easyShortPara.length, maxPara); i++) {
    promises.push(
      pushParagraphQueue({
        id: `${env.para.wordEasyShort}${i + 1}`,
        content: easyShortPara[i],
        type: 'word',
        difficulty: 'easy',
        length: 'short'
      }, 3)
    );
  }
  
  // Load easy long paragraphs
  for (let i = 0; i < Math.min(easyLongPara.length, maxPara); i++) {
    promises.push(
      pushParagraphQueue({
        id: `${env.para.wordEasyLong}${i + 1}`,
        content: easyLongPara[i],
        type: 'word',
        difficulty: 'easy',
        length: 'long'
      }, 3)
    );
  }
  
  // Load hard short paragraphs
  for (let i = 0; i < Math.min(hardShortPara.length, maxPara); i++) {
    promises.push(
      pushParagraphQueue({
        id: `${env.para.wordHardShort}${i + 1}`,
        content: hardShortPara[i],
        type: 'word',
        difficulty: 'hard',
        length: 'short'
      }, 3)
    );
  }
  
  // Load hard long paragraphs
  for (let i = 0; i < Math.min(hardLongPara.length, maxPara); i++) {
    promises.push(
      pushParagraphQueue({
        id: `${env.para.wordHardLong}${i + 1}`,
        content: hardLongPara[i],
        type: 'word',
        difficulty: 'hard',
        length: 'long'
      }, 3)
    );
  }
  
  // Push all paragraphs in parallel
  await Promise.all(promises);
  
  console.log(`✓ Loaded ${promises.length} paragraphs to queue`);
};
```

**Execution:** Called during server startup after all services connect

**Total Paragraphs:** 50 (10 quotes + 10 × 4 paragraph types)

---

## Message Persistence

### Durable Queues

```javascript
await channel.assertQueue('mail_queue', {
  durable: true  // Queue survives broker restart
});
```

**Benefits:**
- ✅ Queue metadata saved to disk
- ✅ Queue recreated after RabbitMQ restart
- ✅ No message loss during broker downtime

---

### Persistent Messages

```javascript
ch.sendToQueue(MAIL_QUEUE, Buffer.from(JSON.stringify(message)), {
  persistent: true  // Message survives broker restart
});
```

**Benefits:**
- ✅ Message saved to disk
- ✅ Survives RabbitMQ crashes
- ✅ Guaranteed delivery (with ack)

---

## Error Handling

### Producer Errors

```javascript
try {
  await pushMailQueue(email, "signup", datetime, 8);
} catch (error) {
  console.error('Queue error:', error);
  
  // Fallback: log to database or retry later
  await logFailedEmail(email, "signup");
}
```

### Consumer Errors

```javascript
channel.consume('mail_queue', async (msg) => {
  try {
    // Process message
    await sendEmail(data);
    channel.ack(msg);
  } catch (error) {
    console.error('Processing error:', error);
    
    // Requeue message for retry
    channel.nack(msg, false, true);
  }
});
```

**Requeue Strategy:**
- First failure: Requeue immediately
- Persistent failures: Dead letter queue (optional)
- Max retries: 3 (implement counter in message)

---

## Performance Considerations

### Prefetch Setting

```javascript
channel.prefetch(1);  // Process 1 message at a time
```

**Benefits:**
- Even load distribution across consumers
- Prevents consumer overload
- Better error handling

**Alternative:**
```javascript
channel.prefetch(10);  // Process 10 messages concurrently
```

Use higher prefetch for:
- Fast processing operations
- Multiple consumer instances
- High throughput requirements

---

### Connection Pooling

Current implementation uses **single connection/channel**:
- ✅ Simple
- ✅ Sufficient for low-medium traffic
- ❌ Single point of failure

**Scaling:** For high traffic, use connection pool:
```javascript
// Advanced: Connection pool
const connectionPool = [];
for (let i = 0; i < 5; i++) {
  connectionPool.push(await amqp.connect(url));
}
```

---

## Monitoring

### RabbitMQ Management UI

Access at: `http://localhost:15672` (default credentials: guest/guest)

**Features:**
- View queue length
- Monitor message rates
- Check consumer count
- View unacknowledged messages

---

### Queue Stats

```bash
# List queues
rabbitmqctl list_queues

# Queue details
rabbitmqctl list_queues name messages consumers

# Purge queue (CAUTION!)
rabbitmqctl purge_queue mail_queue
```

---

## Best Practices

### ✅ Do's

1. **Always acknowledge messages**
   ```javascript
   channel.ack(msg);  // Success
   channel.nack(msg, false, true);  // Failure, requeue
   ```

2. **Use durable queues and persistent messages**
   ```javascript
   await channel.assertQueue(queueName, { durable: true });
   ch.sendToQueue(queueName, buffer, { persistent: true });
   ```

3. **Set appropriate prefetch**
   ```javascript
   channel.prefetch(1);  // Conservative
   ```

4. **Handle errors gracefully**
   ```javascript
   try {
     await processMessage(data);
     channel.ack(msg);
   } catch (error) {
     channel.nack(msg, false, true);
   }
   ```

5. **Use priorities for critical messages**
   ```javascript
   await pushMailQueue(email, "reset-otp", datetime, 10);  // Highest priority
   ```

---

### ❌ Don'ts

1. **Don't forget to acknowledge**
   ```javascript
   // Bad: Memory leak, queue fills up
   channel.consume(queue, (msg) => {
     processMessage(msg);
     // Missing: channel.ack(msg)
   });
   ```

2. **Don't use non-durable queues in production**
   ```javascript
   // Bad: Lose messages on restart
   await channel.assertQueue(queueName, { durable: false });
   ```

3. **Don't process heavy operations synchronously**
   ```javascript
   // Bad: Blocks consumer
   channel.consume(queue, (msg) => {
     heavyOperation();  // Synchronous, blocks
     channel.ack(msg);
   });
   
   // Good: Async processing
   channel.consume(queue, async (msg) => {
     await heavyOperation();  // Non-blocking
     channel.ack(msg);
   });
   ```

4. **Don't ignore connection errors**
   ```javascript
   // Bad: Silent failure
   await pushMailQueue(email, type, datetime);
   
   // Good: Handle errors
   try {
     await pushMailQueue(email, type, datetime);
   } catch (error) {
     console.error('Queue error:', error);
     // Fallback strategy
   }
   ```

---

**Last Updated:** Febuary 1, 2026   
**RabbitMQ Version:** 3.12+  
**amqplib Version:** 0.10.9

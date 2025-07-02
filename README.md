# NGOBRAS Project

NGOBRAS (Ngobrol Asik Sosiologi) is a comprehensive web-based healthcare consultation platform that enables users to communicate with healthcare professionals and AI assistants. The application is built as a Progressive Web App (PWA) with real-time messaging capabilities, user authentication, and administrative features.

## Table of Contents

- [Overview](#overview)
- [Core Components](#core-components)
- [Architecture](#architecture)
- [Data Flow](#data-flow)
- [API Integrations](#api-integrations)
- [Design Patterns](#design-patterns)
- [Authentication System](#authentication-system)
- [Real-time Communication](#real-time-communication)
- [Progressive Web App Features](#progressive-web-app-features)
- [Directory Structure](#directory-structure)
- [Future Development](#future-development)

## Overview

NGOBRAS is a healthcare consultation platform that provides:

- User authentication and profile management
- Real-time chat with healthcare professionals
- AI-powered consultation options
- Administrative dashboard for managing users and conversations
- Progressive Web App capabilities for offline access and mobile installation
- Message read status tracking and notifications

## Core Components

### Frontend Components

1. **User Interface**
   - Main chat interface (`ngobras.html`, `ngobras.js`, `ngobras.css`)
   - Chat room for conversations (`chatroom.html`, `chatroom.js`, `chatroom.css`)
   - Authentication screens (`login.html`, `signup.html`)
   - Admin dashboard (`admin.html`, `admin.js`, `admin.css`)

2. **Authentication System**
   - Supabase authentication integration
   - Centralized client management (`supabaseClient.js`)
   - Login/signup flows with error handling
   - Session management and JWT handling

3. **Real-time Messaging**
   - Supabase Realtime for live chat functionality
   - Message synchronization and storage
   - Read status tracking
   - Fallback polling mechanism when real-time fails

4. **Progressive Web App**
   - Service worker implementation (`sw.js`)
   - Offline capabilities
   - App manifest (`manifest.json`)
   - Installation prompts and status detection

### Backend Components

1. **Express Server**
   - API endpoints for data access
   - Authentication middleware
   - Message handling
   - Proxy for Supabase operations

2. **Database Integration**
   - Supabase database connection
   - Row-level security policies
   - Real-time subscriptions

3. **AI Integration**
   - Multiple AI provider support (OpenAI, Anthropic, Google)
   - Configurable AI assistants
   - Context management for conversations

## Architecture

NGOBRAS follows a client-server architecture with:

1. **Frontend Layer**
   - Browser-based client application
   - Progressive Web App capabilities
   - Real-time communication via Supabase Realtime

2. **Backend Layer**
   - Express.js server for API endpoints
   - Authentication and authorization handling
   - Proxy for database operations

3. **Database Layer**
   - Supabase PostgreSQL database
   - Row-level security for data protection
   - Real-time subscriptions for live updates

4. **External Services**
   - AI providers (OpenAI, Anthropic, Google)
   - CDN for static assets

## Data Flow

1. **Authentication Flow**
   - User enters credentials
   - Credentials validated against Supabase Auth
   - JWT token stored for subsequent requests
   - User profile loaded from database

2. **Messaging Flow**
   - User sends message via UI
   - Message sent to server with JWT authentication
   - Server validates and stores message in database
   - Real-time subscription notifies recipient
   - Read status updated when message viewed

3. **Admin Dashboard Flow**
   - Admin authenticates with admin credentials
   - Dashboard loads user and message statistics
   - Real-time updates for new messages
   - Unread message counts displayed

4. **AI Consultation Flow**
   - User selects AI assistant type
   - Messages sent to server
   - Server forwards to appropriate AI provider
   - Responses stored and displayed in real-time

## API Integrations

1. **Supabase**
   - Authentication (`auth.signInWithPassword`, `auth.signUp`)
   - Database operations (`from('messages').select()`, etc.)
   - Real-time subscriptions (`supabase.channel()`)

2. **AI Providers**
   - OpenAI API integration
   - Anthropic API integration
   - Google AI integration

## Design Patterns

1. **Singleton Pattern**
   - Centralized Supabase client (`supabaseClient.js`)
   - Race condition protection for initialization

2. **Observer Pattern**
   - Real-time message subscriptions
   - UI updates based on data changes

3. **Proxy Pattern**
   - Server as proxy for database operations
   - JWT forwarding for authenticated requests

4. **Factory Pattern**
   - AI provider selection based on configuration

5. **Module Pattern**
   - JavaScript modules with clear responsibilities
   - Encapsulated functionality

## Authentication System

The application uses Supabase Authentication with:

1. **Email/Password Authentication**
   - Standard login/signup flows
   - Password reset capabilities

2. **JWT Token Management**
   - Secure token storage
   - Token forwarding for authenticated requests

3. **Role-Based Access Control**
   - User roles (user, admin)
   - Permission-based access to features

4. **Session Management**
   - Automatic session refresh
   - Session timeout handling

## Real-time Communication

Real-time features are implemented using:

1. **Supabase Realtime**
   - PostgreSQL change notifications
   - Channel subscriptions for specific tables

2. **Message Synchronization**
   - Initial message loading
   - Real-time updates for new messages
   - Fallback polling when real-time fails

3. **Read Status Tracking**
   - Automatic marking of messages as read
   - Unread message counts for admins
   - Visual indicators for message status

## Progressive Web App Features

1. **Offline Capabilities**
   - Service worker for asset caching
   - Offline indicator and handling

2. **Installation**
   - Web app manifest
   - Install prompts
   - Standalone mode detection

3. **Push Notifications**
   - New message notifications
   - Background notification handling

## Directory Structure

```
project-root/
  ├── server.js                # Express server
  ├── package.json             # Node.js dependencies
  ├── .env                     # Environment variables
  ├── vercel.json              # Vercel deployment config
  ├── data/                    # Database setup scripts
  └── src/                     # Frontend source files
      ├── css/                 # CSS stylesheets
      │   ├── admin.css        # Admin dashboard styles
      │   ├── chatroom.css     # Chat interface styles
      │   ├── login.css        # Authentication styles
      │   └── ngobras.css      # Main app styles
      ├── js/                  # JavaScript files
      │   ├── admin.js         # Admin dashboard logic
      │   ├── chatroom.js      # Chat functionality
      │   ├── login.js         # Authentication logic
      │   ├── ngobras.js       # Main app logic
      │   ├── supabaseClient.js # Centralized Supabase client
      │   └── sw.js            # Service Worker
      ├── images/              # Image assets
      │   ├── icons/           # App icons
      │   └── elements/        # UI elements
      ├── ngobras.html         # Main application page
      ├── chatroom.html        # Chat interface
      ├── login.html           # Login page
      ├── signup.html          # Signup page
      ├── admin.html           # Admin dashboard
      ├── manifest.json        # PWA manifest
      └── index.html           # Entry point
```

## Future Development

Potential areas for extending the NGOBRAS system:

1. **Enhanced AI Capabilities**
   - More specialized healthcare AI assistants
   - Image analysis for symptoms
   - Voice input/output

2. **Advanced Analytics**
   - User engagement metrics
   - Consultation effectiveness tracking
   - Pattern recognition for common issues

3. **Integration Opportunities**
   - Electronic health record systems
   - Appointment scheduling
   - Pharmacy services

4. **Expanded Platform Support**
   - Native mobile applications
   - Desktop applications
   - Voice assistant integration

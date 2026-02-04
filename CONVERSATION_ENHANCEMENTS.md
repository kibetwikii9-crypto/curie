# Conversation Page Enhancements

This document describes the new features added to the conversations page based on the suggestions.

## Overview

The conversations page has been enhanced with the following features:
1. **Bulk Actions** - Select and perform actions on multiple conversations
2. **Conversation Tags** - User-defined tags for categorizing conversations
3. **Team Assignments** - Assign conversations to team members
4. **Analytics Dashboard** - Real-time conversation analytics

---

## Features

### 1. Bulk Selection & Actions

**Frontend:**
- Checkbox next to each conversation when bulk mode is enabled
- "Bulk Actions" button to toggle bulk selection mode
- Bulk action toolbar appears when conversations are selected
- "Select All" / "Deselect All" quick actions

**Backend API Endpoints:**
- `POST /api/dashboard/conversations/bulk/export` - Export multiple conversations to JSON
- `POST /api/dashboard/conversations/bulk/tag` - Add a tag to multiple conversations

**Usage:**
1. Click "Bulk Actions" button to enter bulk mode
2. Select conversations using checkboxes
3. Use toolbar to export or tag selected conversations

---

### 2. Conversation Tags

**Database Tables:**
- `conversation_tags` - Stores user-defined tags
- `conversation_tag_relations` - Many-to-many relationship between conversations and tags

**Backend API Endpoints:**
- `GET /api/dashboard/conversations/tags` - Get all tags
- `POST /api/dashboard/conversations/tags` - Create a new tag
- `PUT /api/dashboard/conversations/tags/{tag_id}` - Update a tag
- `DELETE /api/dashboard/conversations/tags/{tag_id}` - Delete a tag
- `POST /api/dashboard/conversations/{conversation_id}/tags` - Add tag to conversation
- `DELETE /api/dashboard/conversations/{conversation_id}/tags/{tag_id}` - Remove tag from conversation

**Frontend Features:**
- Tags management modal (accessible via tag icon button)
- Create tags with custom name, color, and description
- Add/remove tags to individual conversations
- Tags displayed in conversation list and detail view
- Quick tag selector dropdown in conversation detail

**Usage:**
1. Click the tag icon button to open tags management
2. Create new tags with custom colors
3. Add tags to conversations using the dropdown
4. Remove tags by clicking the X on the tag badge

---

### 3. Team Assignments

**Database Table:**
- `conversation_assignments` - Tracks which user is assigned to each conversation

**Backend API Endpoints:**
- `POST /api/dashboard/conversations/{conversation_id}/assign` - Assign conversation to a user
- `DELETE /api/dashboard/conversations/{conversation_id}/assign` - Unassign conversation

**Frontend Features:**
- "Assign" button in conversation detail header
- Assignment modal with team member selector and notes field
- Assigned conversations show purple badge in list
- Assignment details displayed in conversation detail

**Usage:**
1. Open a conversation detail
2. Click "Assign" button
3. Select team member and add optional notes
4. Submit to assign the conversation

---

### 4. Conversation Analytics

**Backend API Endpoint:**
- `GET /api/dashboard/conversations/analytics` - Get conversation analytics

**Metrics Provided:**
- Total conversations
- Unique users
- Average messages per conversation
- Tagged conversations count
- Assigned conversations count
- Conversations by channel
- Conversations by intent
- Popular tags with usage counts

**Frontend Features:**
- Collapsible analytics panel in conversation list header
- Grid layout showing key metrics
- Popular tags visualization
- Real-time data updates

**Usage:**
1. Click "Analytics" button in conversations header
2. View real-time metrics
3. Click again to hide analytics panel

---

## Database Migration

A SQL migration file has been created at:
```
database/conversation_enhancements_migration.sql
```

**To apply the migration:**

```bash
# Connect to your database and run:
psql -U your_user -d your_database -f database/conversation_enhancements_migration.sql

# Or in Supabase SQL Editor, copy and paste the contents of the file
```

**Tables Created:**
1. `conversation_tags` - User-defined tags with colors
2. `conversation_tag_relations` - Links tags to conversations
3. `conversation_assignments` - Assigns conversations to users

---

## API Changes

### Updated Endpoints

**GET /api/dashboard/conversations**
- Now includes `tags` array and `assigned_to_user_id` field for each conversation

**GET /api/dashboard/conversations/{conversation_id}**
- Now includes `tags` array and `assignment` object

---

## Models Updated

`app/models.py` - Added three new models:
- `ConversationTag`
- `ConversationTagRelation`
- `ConversationAssignment`

`app/routes/dashboard.py` - Added new endpoints for:
- Tag CRUD operations
- Bulk actions
- Assignment management
- Analytics

---

## Frontend Components

The conversations page (`frontend/app/dashboard/conversations/page.tsx`) has been completely rewritten with:

**New State Management:**
- Bulk selection state
- Tags management state
- Assignment state
- Analytics state

**New UI Components:**
- Bulk selection checkboxes
- Bulk action toolbar
- Tags management modal
- Create tag modal
- Assignment modal
- Analytics panel

**New Mutations:**
- Create/delete tags
- Add/remove tags from conversations
- Bulk tag conversations
- Bulk export conversations
- Assign/unassign conversations

---

## Usage Examples

### Creating and Using Tags

```typescript
// 1. Create a tag
const tagData = {
  name: "Important",
  color: "#EF4444",
  description: "High priority conversations"
};
// Use the UI or API: POST /api/dashboard/conversations/tags

// 2. Add tag to conversation
// Use the UI or API: POST /api/dashboard/conversations/{id}/tags
// Body: { tag_id: 1 }

// 3. Bulk tag multiple conversations
// Select conversations in UI and use bulk tag action
// Or API: POST /api/dashboard/conversations/bulk/tag
// Body: { conversation_ids: [1, 2, 3], tag_id: 1 }
```

### Assigning Conversations

```typescript
// 1. Assign to team member
// Use the UI or API: POST /api/dashboard/conversations/{id}/assign
// Body: { assigned_to_user_id: 5, notes: "Follow up on pricing" }

// 2. Unassign
// API: DELETE /api/dashboard/conversations/{id}/assign
```

### Bulk Export

```typescript
// Select multiple conversations and export
// API: POST /api/dashboard/conversations/bulk/export
// Body: { conversation_ids: [1, 2, 3] }
// Returns: JSON with full conversation data
```

---

## Benefits

1. **Better Organization** - Tags help categorize conversations
2. **Team Collaboration** - Assignments ensure conversations are handled
3. **Improved Visibility** - Analytics provide insights at a glance
4. **Efficiency** - Bulk actions save time on repetitive tasks
5. **Data Export** - Bulk export for reporting and analysis

---

## Next Steps

Consider adding:
- Tag-based filtering in conversation list
- Assignment notifications
- Analytics export
- Custom tag colors per user
- Conversation priority levels
- Advanced search with tag filters

---

## Support

For issues or questions, refer to the main project documentation or contact the development team.

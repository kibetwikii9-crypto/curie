# Role Assignment Criteria

## Overview
This document explains how user roles are assigned during registration and how the system determines whether a user becomes a `business_owner`, `agent`, or `admin`.

## Registration Flow

### Regular Sign-Up (Default Behavior)
When a user signs up through the normal registration flow:

1. **Default Role**: `business_owner`
   - If the user doesn't specify a role, or specifies `"agent"`, they are automatically assigned the `business_owner` role
   - A new `Business` record is automatically created
   - The user is set as the `owner_id` of the newly created business
   - The user's `business_id` is set to the newly created business

2. **Business Creation**:
   - Business name is derived from:
     - User's `full_name` if provided, OR
     - Email prefix (part before `@`) if `full_name` is not provided
   - Example: If email is `john@example.com` and full_name is `John Doe`, business name will be `John Doe`
   - Example: If email is `john@example.com` and full_name is `None`, business name will be `john`

### Admin Sign-Up
To create an admin user:

1. **Manual Process**: Admin users cannot be created through the normal registration flow
2. **Requirements**:
   - Must explicitly set `role="admin"` during user creation
   - This is typically done via:
     - Database script
     - Direct database insertion
     - Backend admin endpoint (if implemented)
3. **Admin Characteristics**:
   - `business_id` is `None` (not linked to any business)
   - Can see all businesses' data (when `business_id` is `None` in queries, no filtering is applied)
   - Cannot access business-specific features that require a `business_id`

### Agent Role
The `agent` role is currently not used in the normal flow:
- If a user tries to register with `role="agent"`, they are automatically converted to `business_owner`
- The `agent` role may be used in the future for users who belong to an existing business (not owners)

## Code Location

### Registration Endpoint
**File**: `app/routes/auth.py`
**Function**: `register()`

```python
# Determine role: if not admin, make them business_owner
final_role = user_data.role
if final_role == "agent" or (final_role not in ["admin", "business_owner", "agent"]):
    # Regular sign-up: make them business_owner and auto-create Business
    final_role = "business_owner"
```

### User Creation
**File**: `app/services/auth.py`
**Function**: `create_user()`

```python
# If role is business_owner and no business_id provided, create a new Business
if role == "business_owner" and business_id is None:
    business_name = full_name or email.split("@")[0]
    business = Business(
        name=business_name,
        owner_id=user.id,
        settings=None,
    )
    db.add(business)
    db.flush()
    business_id = business.id
    user.business_id = business_id
```

## Summary

| Registration Type | Role Assigned | Business Created | business_id Set |
|------------------|---------------|------------------|-----------------|
| Normal sign-up (no role specified) | `business_owner` | ✅ Yes | ✅ Yes |
| Sign-up with `role="agent"` | `business_owner` (converted) | ✅ Yes | ✅ Yes |
| Sign-up with `role="business_owner"` | `business_owner` | ✅ Yes | ✅ Yes |
| Sign-up with `role="admin"` | `admin` | ❌ No | ❌ No (stays `None`) |
| Manual admin creation | `admin` | ❌ No | ❌ No (stays `None`) |

## Data Isolation

All data is now properly scoped to the user's business:
- **Conversations**: Filtered by `business_id`
- **Messages**: Filtered by `business_id`
- **Leads**: Filtered by `business_id`
- **Knowledge Base**: Filtered by `business_id`
- **Channel Integrations**: Filtered by `business_id`
- **Analytics**: All metrics filtered by `business_id`

Admin users can see all data across all businesses (no filtering applied when `business_id` is `None`).




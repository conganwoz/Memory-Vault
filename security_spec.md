# Security Specification for Kindred

## 1. Data Invariants

*   **User Profiles**: Every user must have a profile document in `/users/{userId}` where `{userId}` matches their Auth UID.
*   **Albums**: 
    *   Every album must have an `ownerId` matching the creator's UID.
    *   The `ownerId` must be immutable after creation.
    *   Access to an album (read/write) is restricted to members listed in the `members` array.
*   **Photos**:
    *   Each photo belongs to an album.
    *   Only members of the parent album can upload photos.
    *   The `uploaderId` must match the authenticated user's UID.
*   **Recaps**:
    *   Recaps are system-generated (via API) but stored in Firestore.
    *   Members of the album can read recaps.

## 2. The "Dirty Dozen" Payloads

1.  **Identity Spoofing**: Attempt to create a user profile for someone else.
2.  **Project Hijacking**: Attempt to update an album's `ownerId`.
3.  **Unauthorized Upload**: Non-member attempting to upload a photo to an album.
4.  **Malicious ID**: Attempting to create an album with a 1MB string as ID.
5.  **State Skip**: Attempting to set an album's photo count directly without uploading photos.
6.  **Metadata Tampering**: Attempting to change `createdAt` on a photo.
7.  **Unverified Write**: Writing to an album with an unverified email.
8.  **Ghost Field**: Adding `isPremium: true` to a user profile.
9.  **Orphaned Photo**: Creating a photo that refers to a non-existent album.
10. **Query Scrape**: Attempting to list all albums in the system.
11. **PII Leak**: Non-member attempting to read another user's email.
12. **System Field Injection**: Attempting to modify an AI-generated recap summary.

## 3. Test Runner (Draft)

(Full `firestore.rules.test.ts` will be implemented if a test environment is available. Given the present constraints, we focus on generating hardened rules verified by logic analysis.)

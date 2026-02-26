# Bitespeed Identity Reconciliation

## Endpoint

`POST` https://bitespeed-backend-s0uc.onrender.com/identify

## Tech Stack

- Node.js
- TypeScript
- Express.js
- MySQL
- mysql2

## Request

```json
{
  "email": "string (optional)",
  "phoneNumber": "string (optional)"
}
```

## Response

```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["email1", "email2"],
    "phoneNumbers": ["phone1", "phone2"],
    "secondaryContactIds": [2, 3]
  }
}
```

## Cases

### 1. New Contact

If no existing contact matches, a new **primary** contact is created.

**Request:**
```json
{ "email": "mcfly@hillvalley.edu", "phoneNumber": "123456" }
```
**Response:**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["mcfly@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": []
  }
}
```

### 2. Existing Email, New Phone

A **secondary** contact is created and linked to the primary.

**Request:**
```json
{ "email": "mcfly@hillvalley.edu", "phoneNumber": "999999" }
```
**Response:**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["mcfly@hillvalley.edu"],
    "phoneNumbers": ["123456", "999999"],
    "secondaryContactIds": [2]
  }
}
```

### 3. New Email, Existing Phone

A **secondary** contact is created and linked to the primary.

**Request:**
```json
{ "email": "lorraine@hillvalley.edu", "phoneNumber": "123456" }
```
**Response:**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["mcfly@hillvalley.edu", "lorraine@hillvalley.edu"],
    "phoneNumbers": ["123456", "999999"],
    "secondaryContactIds": [2, 3]
  }
}
```

### 4. Linking Two Primaries

When a request links two existing primary contacts, the older one stays **primary** and the newer one becomes **secondary**.

**Request:**
```json
{ "email": "mcfly@hillvalley.edu", "phoneNumber": "555555" }
```
**Response:**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["mcfly@hillvalley.edu", "lorraine@hillvalley.edu", "george@hillvalley.edu"],
    "phoneNumbers": ["123456", "999999", "555555"],
    "secondaryContactIds": [2, 3, 4]
  }
}
```

### 5. No Duplicates

If the exact combination already exists, no new record is created.

**Request:**
```json
{ "email": "mcfly@hillvalley.edu", "phoneNumber": "123456" }
```
**Response:** Same consolidated response as above.
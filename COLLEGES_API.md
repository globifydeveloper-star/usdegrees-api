# Colleges API Documentation

## Overview
The Colleges API provides endpoints for listing and filtering colleges. It supports pagination and search filtering by college name, city, or state.

---

## Endpoints

### 1. List All Colleges (with Pagination & Filtering)

**Endpoint:** `GET /colleges`

**Description:** Returns a paginated list of colleges. Defaults to 20 colleges per page with optional search filtering.

**Query Parameters:**

| Parameter | Type    | Default | Max    | Description |
|-----------|---------|---------|--------|-------------|
| `page`    | integer | 1       | -      | Page number (1-based) |
| `limit`   | integer | 20      | 100    | Items per page |
| `search`  | string  | -       | -      | Filter by name, city, or state (case-insensitive) |

**Response:**

```json
{
  "data": [
    {
      "unitid": 123456,
      "school_name": "Harvard University",
      "city": "Cambridge",
      "state": "MA",
      "school_type": "Private, nonprofit",
      "school_url": "www.harvard.edu/"
    },
    ...
  ],
  "total": 5000,
  "page": 1,
  "limit": 20,
  "hasMore": true
}
```

**Status Code:** `200 OK`

---

### 2. Get Single College Details

**Endpoint:** `GET /colleges/:unitid`

**Description:** Returns details for a specific college by its UNITID.

**Path Parameters:**

| Parameter | Type    | Description |
|-----------|---------|-------------|
| `unitid`  | integer | The college's UNITID |

**Response:**

```json
{
  "unitid": 123456,
  "school_name": "Harvard University",
  "city": "Cambridge",
  "state": "MA",
  "school_type": "Private, nonprofit",
  "school_url": "www.harvard.edu/"
}
```

**Status Codes:**
- `200 OK` - College found
- `400 Bad Request` - Invalid college ID
- `404 Not Found` - College not found

---

## Example Requests

### Get First 20 Colleges
```bash
curl "http://localhost:8000/colleges"
```

### Get Page 2 (21-40)
```bash
curl "http://localhost:8000/colleges?page=2&limit=20"
```

### Search for Colleges in California
```bash
curl "http://localhost:8000/colleges?search=California"
```

### Search for "MIT" Colleges
```bash
curl "http://localhost:8000/colleges?search=MIT"
```

### Search with Custom Limit
```bash
curl "http://localhost:8000/colleges?search=state&limit=50"
```

### Get Single College by UNITID
```bash
curl "http://localhost:8000/colleges/123456"
```

---

## Frontend Integration Example

### React Hook for Fetching Colleges

```typescript
import { useState, useEffect } from 'react';

interface College {
  unitid: number;
  school_name: string;
  city: string | null;
  state: string | null;
  school_type: string | null;
  school_url: string | null;
}

interface CollegesResponse {
  data: College[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export const useColleges = (initialSearch = '') => {
  const [colleges, setColleges] = useState<College[]>([]);
  const [search, setSearch] = useState(initialSearch);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchColleges = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '20',
          ...(search && { search }),
        });

        const response = await fetch(`http://localhost:8000/colleges?${params}`);
        const data: CollegesResponse = await response.json();

        setColleges(data.data);
        setTotal(data.total);
        setHasMore(data.hasMore);
      } catch (error) {
        console.error('Error fetching colleges:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchColleges();
  }, [search, page]);

  return {
    colleges,
    search,
    setSearch,
    page,
    setPage,
    total,
    hasMore,
    loading,
  };
};
```

### React Component Usage

```typescript
import { useColleges } from './hooks/useColleges';

export const CollegesList = () => {
  const { colleges, search, setSearch, page, setPage, hasMore, loading } =
    useColleges();

  return (
    <div>
      <input
        type="text"
        placeholder="Search colleges..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1); // Reset to first page
        }}
      />

      {loading ? (
        <p>Loading...</p>
      ) : (
        <ul>
          {colleges.map((college) => (
            <li key={college.unitid}>
              <h3>{college.school_name}</h3>
              <p>
                {college.city}, {college.state}
              </p>
              <p>{college.school_type}</p>
            </li>
          ))}
        </ul>
      )}

      <div>
        <button
          onClick={() => setPage(page - 1)}
          disabled={page === 1}
        >
          Previous
        </button>
        <span>Page {page}</span>
        <button
          onClick={() => setPage(page + 1)}
          disabled={!hasMore}
        >
          Next
        </button>
      </div>
    </div>
  );
};
```

---

## Database Requirements

The API expects a `schools` table with the following schema:

```sql
CREATE TABLE schools (
  unitid INT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  city VARCHAR(100),
  state VARCHAR(10),
  school_type VARCHAR(50),
  school_url VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes for better query performance
CREATE INDEX idx_schools_name ON schools(LOWER(name));
CREATE INDEX idx_schools_state ON schools(state);
CREATE INDEX idx_schools_city ON schools(city);
```

---

## Error Handling

### Invalid College ID
```json
{
  "error": "Invalid college ID"
}
```
Status: `400 Bad Request`

### College Not Found
```json
{
  "error": "College not found"
}
```
Status: `404 Not Found`

### Server Error
```json
{
  "error": "Failed to fetch colleges",
  "details": "error details here"
}
```
Status: `500 Internal Server Error`

---

## Performance Notes

- **Default limit:** 20 colleges per page (recommended for mobile)
- **Maximum limit:** 100 colleges per page (to prevent performance issues)
- **Search:** Uses case-insensitive LIKE matching on name, city, and state
- **Recommended indexes:** Create indexes on `name`, `state`, and `city` columns for better performance

---

## API Testing

### Using Thunder Client / Postman

1. **List Colleges:**
   - URL: `http://localhost:8000/colleges`
   - Method: `GET`

2. **Search:**
   - URL: `http://localhost:8000/colleges?search=Harvard`
   - Method: `GET`

3. **Pagination:**
   - URL: `http://localhost:8000/colleges?page=2&limit=50`
   - Method: `GET`

4. **Single College:**
   - URL: `http://localhost:8000/colleges/123456`
   - Method: `GET`

---

## Running the API

```bash
# Development mode
npm run dev

# Build for production
npm run build

# Start production build
npm start
```

The API will be available at `http://localhost:8000` (or configured PORT).

# Reports Download API - Quick Reference

Quick reference guide for the three report download APIs.

---

## 🎫 1. Route Seat Report (PDF)

**Bus seating chart with passenger information**

```
GET /api/admin/reports/route-seat-report-download
```

| Parameter | Required | Example |
|-----------|----------|---------|
| `routeId` | ✅ Yes   | `507f1f77bcf86cd799439011` |
| `date`    | ✅ Yes   | `2025-10-28` |

**Example:**
```bash
/api/admin/reports/route-seat-report-download?routeId=507f1f77bcf86cd799439011&date=2025-10-28
```

**Output:** PDF file with seating chart

---

## 💰 2. Sales Report (Excel/PDF)

**Ticket sales summary with financial details**

```
GET /api/admin/reports/sales-report-download
```

| Parameter       | Required | Default | Example |
|-----------------|----------|---------|---------|
| `fromDate`      | ❌ No    | 7 days ago | `2025-10-20` |
| `toDate`        | ❌ No    | Today | `2025-10-28` |
| `salesDateType` | ❌ No    | `sale` | `sale` or `departure` |
| `salesAgent`    | ❌ No    | All | `507f1f77bcf86cd799439011` |
| `salesOffice`   | ❌ No    | All | `507f1f77bcf86cd799439011` |
| `format`        | ❌ No    | `excel` | `excel` or `pdf` |

**Examples:**
```bash
# Basic (Excel)
/api/admin/reports/sales-report-download?fromDate=2025-10-20&toDate=2025-10-28

# PDF with filters
/api/admin/reports/sales-report-download?fromDate=2025-10-20&toDate=2025-10-28&format=pdf&salesDateType=departure

# By specific agent
/api/admin/reports/sales-report-download?fromDate=2025-10-20&toDate=2025-10-28&salesAgent=507f1f77bcf86cd799439011
```

**Output:** Excel (.xlsx) or PDF file

---

## 🚗 3. Drivers Report (Excel/PDF)

**Driver assignments and trip details**

```
GET /api/admin/reports/drivers-report-download
```

| Parameter  | Required | Default | Example |
|------------|----------|---------|---------|
| `fromDate` | ❌ No    | 7 days ago | `2025-10-20` |
| `toDate`   | ❌ No    | Today | `2025-10-28` |
| `driverId` | ❌ No    | All | `507f1f77bcf86cd799439011` |
| `format`   | ❌ No    | `excel` | `excel` or `pdf` |

**Examples:**
```bash
# Basic (Excel)
/api/admin/reports/drivers-report-download?fromDate=2025-10-20&toDate=2025-10-28

# PDF format
/api/admin/reports/drivers-report-download?fromDate=2025-10-20&toDate=2025-10-28&format=pdf

# Specific driver
/api/admin/reports/drivers-report-download?fromDate=2025-10-20&toDate=2025-10-28&driverId=507f1f77bcf86cd799439011
```

**Output:** Excel (.xlsx) or PDF file

---

## 🔐 Authentication

All endpoints require admin authentication:

```
Authorization: Bearer <admin-jwt-token>
```

---

## ⚠️ Common Error Codes

| Code | Meaning |
|------|---------|
| 400  | Invalid parameters (bad format, missing required fields) |
| 401  | Unauthorized (missing/invalid token) |
| 404  | Resource not found (invalid route/driver ID) |
| 500  | Server error |

---

## 📝 Date Format

All dates must use **YYYY-MM-DD** format:
- ✅ Correct: `2025-10-28`
- ❌ Wrong: `10/28/2025`, `28-10-2025`

---

## 🔍 MongoDB ObjectId Format

All IDs must be valid 24-character hex strings:
- ✅ Correct: `507f1f77bcf86cd799439011`
- ❌ Wrong: `507f1f77`, `invalid-id`

---

## 💡 Quick Tips

1. **Route Seat Report**: Best used for printing passenger manifests before trips
2. **Sales Report**: Use `salesDateType=sale` for accounting, `departure` for trip planning
3. **Drivers Report**: Perfect for driver schedules and payroll calculations
4. **Format**: Use PDF for printing, Excel for further data analysis
5. **Date Ranges**: Keep ranges reasonable (< 90 days) for faster generation

---

## 📦 Response Types

| Report Type | Formats Available | Content-Type |
|-------------|-------------------|--------------|
| Route Seat  | PDF only          | `application/pdf` |
| Sales       | Excel, PDF        | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` or `application/pdf` |
| Drivers     | Excel, PDF        | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` or `application/pdf` |

---

## 🔗 Full Documentation

For detailed integration examples and complete specifications, see:
- [Full API Documentation](./REPORTS_DOWNLOAD_API.md)

---

## 📞 Support

Need help? Contact: support@example.com


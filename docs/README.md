# API Documentation

Welcome to the API documentation for the Ticketing Application backend.

## 📚 Available Documentation

### Report APIs

1. **[Reports Download API - Full Documentation](./REPORTS_DOWNLOAD_API.md)**
   - Complete API specifications
   - Detailed integration examples
   - Error handling guide
   - Best practices

2. **[Reports Download API - Quick Reference](./REPORTS_API_QUICK_REFERENCE.md)**
   - Quick lookup for parameters
   - Common usage examples
   - Tips and tricks

3. **[Postman Collection](./Reports_API.postman_collection.json)**
   - Import into Postman for easy testing
   - Pre-configured requests
   - Example parameters

### Other Documentation

- **[Dashboard API](./DASHBOARD_API.md)** - Dashboard statistics and metrics
- **[Sales Report Download API](./SALES_REPORT_DOWNLOAD_API.md)** - Sales report generation
- **[Reports API Integration](./REPORTS_API_INTEGRATION.md)** - Report integration guide
- **[Routes API with Seats](../ROUTES_API_WITH_SEATS.md)** - Route and seat management
- **[Seat Clearing Fix](../SEAT_CLEARING_FIX.md)** - Seat clearing mechanism
- **[Extra Baggage Feature](../EXTRA_BAGGAGE_FEATURE.md)** - Extra baggage handling
- **[PDF Ticket Guide](../PDF_TICKET_GUIDE.md)** - Ticket PDF generation

## 🚀 Quick Start

### 1. Authentication

All admin endpoints require authentication. First, obtain an admin JWT token:

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "your-password"
}
```

### 2. Use the Token

Include the token in the Authorization header for all subsequent requests:

```bash
Authorization: Bearer <your-jwt-token>
```

### 3. Make Report Requests

Example - Download Route Seat Report:

```bash
GET /api/admin/reports/route-seat-report-download?routeId=507f1f77bcf86cd799439011&date=2025-10-28
Authorization: Bearer <your-jwt-token>
```

## 📋 Report Types Overview

| Report Type | Format | Description | Use Case |
|-------------|--------|-------------|----------|
| **Route Seat Report** | PDF | Bus seating chart with passengers | Pre-trip passenger manifest |
| **Sales Report** | Excel, PDF | Ticket sales with financial details | Accounting, revenue tracking |
| **Drivers Report** | Excel, PDF | Driver assignments and trips | Driver schedules, payroll |

## 🔗 API Base URLs

- **Development**: `http://localhost:5000/api`
- **Staging**: `https://staging-api.example.com/api`
- **Production**: `https://api.example.com/api`

## 🛠 Testing with Postman

1. Download the [Postman collection](./Reports_API.postman_collection.json)
2. Import into Postman: `File > Import > Choose File`
3. Set environment variables:
   - `base_url`: Your API base URL (e.g., `http://localhost:5000`)
   - `admin_token`: Your admin JWT token
4. Start testing!

## 📝 Date Formats

All dates in API requests must use **ISO 8601** format:
- **Date only**: `YYYY-MM-DD` (e.g., `2025-10-28`)
- **Date and time**: `YYYY-MM-DDTHH:mm:ss.sssZ` (e.g., `2025-10-28T16:00:00.000Z`)

## 🔍 MongoDB ObjectId Format

All IDs must be valid 24-character hexadecimal strings:
- **Valid**: `507f1f77bcf86cd799439011`
- **Invalid**: `507f1f77`, `invalid-id`, `123`

## ⚠️ Common Error Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 400 | Bad Request | Invalid parameters, wrong format |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Internal server issue |

## 💡 Best Practices

1. **Always validate inputs** on the client side before making API requests
2. **Handle errors gracefully** and show user-friendly messages
3. **Use appropriate date ranges** for reports (avoid very large ranges)
4. **Cache authentication tokens** to reduce login requests
5. **Implement retry logic** for network errors
6. **Show loading indicators** during file downloads
7. **Test with Postman** before integrating into your application

## 🔐 Security Considerations

1. **Never expose JWT tokens** in client-side code or version control
2. **Use HTTPS** in production environments
3. **Rotate tokens regularly** for enhanced security
4. **Implement rate limiting** on the client side
5. **Validate server certificates** in production

## 📞 Support & Resources

- **Email Support**: support@example.com
- **Developer Portal**: https://developers.example.com
- **Status Page**: https://status.example.com
- **GitHub Issues**: https://github.com/your-org/your-repo/issues

## 📊 Rate Limits

To ensure fair usage and system stability:
- **100 requests per minute** per IP address
- **1,000 requests per hour** per authenticated user
- **Report generation**: Max 10 concurrent requests per user

## 🆕 Changelog

### Version 1.0.0 (October 28, 2025)
- ✅ Route Seat Report Download (PDF)
- ✅ Sales Report Download (Excel/PDF)
- ✅ Drivers Report Download (Excel/PDF)
- ✅ Admin authentication
- ✅ Comprehensive error handling

---

## 📖 Additional Resources

- **Main README**: [../README.md](../README.md)
- **API Routes Documentation**: See individual API docs above
- **Database Schema**: Contact your database administrator
- **Deployment Guide**: See DevOps documentation

---

**Last Updated**: October 28, 2025  
**API Version**: 1.0.0


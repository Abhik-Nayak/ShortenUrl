# ShortenURL - MERN Stack URL Shortener & QR Code Generator

A full-stack MERN application that allows users to generate short URLs and QR codes for long URLs. The system supports both guest users (tracked via httpOnly cookie) and registered users with authentication and pricing plans.

## Features

### Core Features
- **URL Shortening**: Convert long URLs into short, memorable links
- **QR Code Generation**: Automatic QR code generation for each short URL
- **Guest & Registered Users**: Create short URLs as a guest or register for advanced features
- **Click Analytics**: Track clicks with detailed analytics (geographic location, device, browser, referrer)
- **Custom Aliases**: Registered users can create custom short codes
- **Plan-based Quotas**: Free, Pro, and Enterprise plans with different limits

### Authentication
- Email/Password registration and login
- JWT tokens stored in httpOnly cookies
- Guest user tracking with secure guestId cookies
- Secure password hashing with bcrypt

### Analytics
- Real-time click tracking with geographic location
- Device and browser detection
- Referrer tracking
- Day-by-day analytics
- Custom date range filtering

### Payment Integration
- Stripe integration for plan upgrades
- Webhook handling for payment success
- Automatic plan updates

## Tech Stack

### Backend
- **Runtime**: Node.js + Express.js
- **Database**: MongoDB
- **Authentication**: JWT + bcrypt
- **QR Code**: qrcode library
- **Analytics**: GeoIP-Lite, UA-Parser
- **Payment**: Stripe
- **Security**: Helmet, CORS, Rate Limiting

### Frontend
- **Framework**: React 18
- **Routing**: React Router v6
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Styling**: Tailwind CSS
- **Icons**: React Icons
- **Notifications**: React Hot Toast

## Quick Start

### Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and other config
npm install
npm run dev
```

### Frontend Setup
```bash
cd frontend
cp .env.example .env
npm install
npm start
```

Backend runs on `http://localhost:5000`
Frontend runs on `http://localhost:3000`

## Project Structure

```
backend/
├── models/          # MongoDB schemas
├── controllers/     # Business logic
├── routes/          # API endpoints
├── middleware/      # Auth, validation, error handling
├── utils/           # Helper functions
└── server.js        # Express app

frontend/
├── src/
│   ├── components/  # Reusable components
│   ├── pages/       # Route pages
│   ├── store/       # Zustand state
│   ├── services/    # API calls
│   └── App.jsx      # Root component
└── public/         # Static files
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/logout` - Logout
- `GET /api/auth/me` - Get profile (protected)

### URLs
- `POST /api/url/create` - Create short URL
- `GET /api/url/list` - List user's URLs
- `GET /api/url/:id` - Get URL details
- `DELETE /api/url/:id` - Delete URL
- `GET /:shortCode` - Redirect to original URL

### Analytics
- `GET /api/analytics/:urlId` - Get URL analytics
- `GET /api/analytics/dashboard` - Dashboard stats (protected)

### Plans
- `GET /api/plan` - List all plans
- `GET /api/plan/current` - Get user's plan (protected)
- `POST /api/plan/upgrade` - Upgrade plan (protected)

## Pricing Plans

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Links/month | 100 | 5,000 | 100,000 |
| Analytics retention | 30 days | 365 days | Unlimited |
| Custom domains | ❌ | ✅ | ✅ |
| Custom aliases | ✅ | ✅ | ✅ |
| API access | ❌ | ✅ | ✅ |
| Price | Free | $9.99 | $49.99 |

## Security

- **Password**: Bcrypt hashing
- **Authentication**: JWT in httpOnly cookies
- **Validation**: Input validation on all endpoints
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS**: Configured for security
- **Headers**: Helmet.js for security headers
- **Guest Tracking**: Secure guestId in httpOnly cookies

## Environment Variables

### Backend (.env)
```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_secret_key
JWT_EXPIRY=7d
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
BASE_URL=http://localhost:5000
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000/api
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push and create a Pull Request

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

For issues and questions, please create an issue on GitHub.

---

**Built with ❤️ using MERN Stack**

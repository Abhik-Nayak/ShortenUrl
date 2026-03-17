# URL Shortener 🚀

A highly-scalable, enterprise-ready URL shortening application. Features a blazing-fast Express backend architected to handle massive traffic using Redis caching, RabbitMQ message queues, and a distributed Snowflake ID generator, paired with a gorgeous Next.js Glassmorphism frontend.

## 🌟 Key Features

### Backend Architecture (`url-shortener-sever`)
- **Fast Lookups:** Uses **Redis** caching to immediately serve redirect URLs, drastically reducing database load.
- **Micro-Second ID Generation:** Replaces standard database IDs with a custom **Twitter Snowflake ID Generator**, converting the numeric IDs into compact **Base62 strings**. This guarantees zero collisions and zero database trips during ID generation.
- **Asynchronous Analytics Batching:** Uses **RabbitMQ** to queue URL click events instead of writing to the database synchronously. A dedicated background worker consumes these events and processes thousands of clicks asynchronously via MongoDB `bulkWrite` operations every 10 seconds.
- **MongoDB:** Persistent storage for URLs and their click analytics.

### Frontend UI (`url-shortener-web`)
- **Next.js & React:** Built using the modern Next.js App Router.
- **Glassmorphism Design:** A beautiful, animated mesh gradient background overlaid with translucent, blurred glass components.
- **Tailwind CSS:** Fully responsive, utility-first styling.
- **One-Click Copy:** Seamless UX allowing users to drop their URL and instantly copy the shortened version to their clipboard.

---

## 🛠️ Tech Stack

- **Frontend:** Next.js, React, Tailwind CSS, TypeScript
- **Backend:** Node.js, Express, TypeScript
- **Databases/Brokers:** 
  - MongoDB (Primary Data Store)
  - Redis (Caching Layer)
  - RabbitMQ (Message Broker for Analytics Batching)

---

## 🚀 Getting Started

To run this application, you must start both the backend Node server and the Next.js frontend development server.

### Prerequisites
Make sure you have instances of **MongoDB**, **Redis**, and **RabbitMQ** running (e.g., using Docker).

### 1. Start the Backend
Navigate to the server directory, install dependencies, and configure your environment:

```bash
cd url-shortener-sever
npm install
```

Make sure your `url-shortener-sever/.env` file contains the required settings:
```ini
PORT=5000
MONGO_URI=mongodb_connection_string
BASE_URL=http://localhost:5000
REDIS_URL=redis_connection_string

Rabbitmq_Host=localhost
Rabbitmq_Username=admin
Rabbitmq_Password=admin123
```

Start the server:
```bash
npm run dev
```
*(The backend runs on `http://localhost:5000`)*

### 2. Start the Frontend
In a new terminal, navigate to the web directory and start Next.js:

```bash
cd url-shortener-web
npm install
npm run dev
```
*(The UI runs on `http://localhost:3000`)*

### 3. Use the App!
Open **[http://localhost:3000](http://localhost:3000)** in your browser. Paste a long URL into the beautiful glass form and watch it generate an incredibly fast, highly scalable short link!

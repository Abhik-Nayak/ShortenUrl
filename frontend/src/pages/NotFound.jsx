/**
 * Not Found Page (404)
 */

import React from "react";
import { Link } from "react-router-dom";

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
      <p className="text-2xl text-gray-600 mb-6">Page Not Found</p>
      <p className="text-gray-500 mb-8 max-w-md">
        Sorry, the page you're looking for doesn't exist. It might have been moved or deleted.
      </p>
      <Link to="/" className="btn btn-primary">
        Go Home
      </Link>
    </div>
  );
}

export default NotFound;

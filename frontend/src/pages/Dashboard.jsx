/**
 * Dashboard Page
 * Shows user's URLs, analytics, and account information
 */

import React, { useEffect, useState } from "react";
import { useAuthStore } from "../store/authStore";
import { useUrlStore } from "../store/urlStore";
import { analyticsAPI, planAPI } from "../services/apiService";
import URLShortenerForm from "../components/URLShortenerForm";
import { FiTrash2, FiBarChart2, FiDownload, FiCopy } from "react-icons/fi";
import CopyToClipboard from "react-copy-to-clipboard";
import toast from "react-hot-toast";

function Dashboard() {
  const { user } = useAuthStore();
  const { urls, fetchUrls, deleteUrl, isLoading } = useUrlStore();
  const [currentPlan, setCurrentPlan] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [selectedUrl, setSelectedUrl] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(false);

  useEffect(() => {
    // Fetch user's URLs
    fetchUrls({ limit: 50 });

    // Fetch current plan
    const fetchPlan = async () => {
      try {
        const response = await planAPI.getCurrentPlan();
        setCurrentPlan(response.data.plan);
      } catch (err) {
        toast.error("Failed to load plan information");
      }
    };

    fetchPlan();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this URL?")) {
      try {
        await deleteUrl(id);
        toast.success("URL deleted successfully");
      } catch (err) {
        toast.error("Failed to delete URL");
      }
    }
  };

  const handleViewAnalytics = async (urlId) => {
    try {
      const response = await analyticsAPI.getUrlAnalytics(urlId, { detailed: false });
      setSelectedUrl({ id: urlId, ...response.data });
      setShowAnalytics(true);
    } catch (err) {
      toast.error("Failed to load analytics");
    }
  };

  const handleDownloadQR = (qrCode, shortCode) => {
    const link = document.createElement("a");
    link.href = qrCode;
    link.download = `qrcode-${shortCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold">Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome back, {user?.name}!</p>
        </div>
      </div>

      {/* Plan Card */}
      {currentPlan && (
        <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold capitalize">{currentPlan.type} Plan</h2>
              <p className="text-gray-600 mt-1">
                {currentPlan.linksUsed} of {currentPlan.linksPerMonth} links used this month
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-3 max-w-xs">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{
                    width: `${(currentPlan.linksUsed / currentPlan.linksPerMonth) * 100}%`,
                  }}
                />
              </div>
            </div>
            {currentPlan.type !== "enterprise" && (
              <a
                href="/pricing"
                className="btn btn-primary"
              >
                Upgrade
              </a>
            )}
          </div>
        </div>
      )}

      {/* Create New URL */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Create New Short URL</h2>
        <URLShortenerForm />
      </section>

      {/* URLs List */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Your Short URLs</h2>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="loading-spinner mx-auto"></div>
          </div>
        ) : urls.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-600 text-lg">No short URLs yet. Create one above!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {urls.map((url) => (
              <div key={url._id} className="card">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {/* URL Info */}
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{url.title || "Untitled"}</h3>
                    <p className="text-blue-600 break-all">{url.shortUrl}</p>
                    <p className="text-gray-600 text-sm mt-1 break-all">
                      {url.originalUrl}
                    </p>
                    <p className="text-gray-500 text-sm mt-2">
                      {url.clickCount} clicks • Created{" "}
                      {new Date(url.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <CopyToClipboard text={url.shortUrl}>
                      <button className="btn btn-secondary flex items-center space-x-2">
                        <FiCopy size={16} /> <span>Copy</span>
                      </button>
                    </CopyToClipboard>
                    <button
                      onClick={() => handleViewAnalytics(url._id)}
                      className="btn btn-secondary flex items-center space-x-2"
                    >
                      <FiBarChart2 size={16} /> <span>Analytics</span>
                    </button>
                    <button
                      onClick={() => handleDelete(url._id)}
                      className="btn bg-red-100 text-red-700 hover:bg-red-200 flex items-center space-x-2"
                    >
                      <FiTrash2 size={16} /> <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Analytics Modal */}
      {showAnalytics && selectedUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Analytics</h2>
              <button
                onClick={() => setShowAnalytics(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            {selectedUrl.stats && (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded">
                    <p className="text-gray-600">Total Clicks</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {selectedUrl.stats.totalClicks}
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded">
                    <p className="text-gray-600">Unique Countries</p>
                    <p className="text-3xl font-bold text-green-600">
                      {selectedUrl.stats.uniqueCountries}
                    </p>
                  </div>
                </div>

                {/* Top Countries */}
                {Object.keys(selectedUrl.stats.topCountries).length > 0 && (
                  <div>
                    <h3 className="font-bold mb-3">Top Countries</h3>
                    <ul className="space-y-2">
                      {Object.entries(selectedUrl.stats.topCountries).map(([country, count]) => (
                        <li key={country} className="flex justify-between">
                          <span>{country}</span>
                          <span className="font-bold">{count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Top Browsers */}
                {Object.keys(selectedUrl.stats.topBrowsers).length > 0 && (
                  <div>
                    <h3 className="font-bold mb-3">Top Browsers</h3>
                    <ul className="space-y-2">
                      {Object.entries(selectedUrl.stats.topBrowsers).map(([browser, count]) => (
                        <li key={browser} className="flex justify-between">
                          <span>{browser}</span>
                          <span className="font-bold">{count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Devices */}
                {Object.keys(selectedUrl.stats.topDevices).length > 0 && (
                  <div>
                    <h3 className="font-bold mb-3">Device Distribution</h3>
                    <ul className="space-y-2">
                      {Object.entries(selectedUrl.stats.topDevices).map(([device, count]) => (
                        <li key={device} className="flex justify-between capitalize">
                          <span>{device}</span>
                          <span className="font-bold">{count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;

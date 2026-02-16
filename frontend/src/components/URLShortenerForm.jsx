/**
 * URL Shortener Form Component
 * Allows users to create shortened URLs with QR codes
 */

import React, { useState } from "react";
import { useUrlStore } from "../store/urlStore";
import { useAuthStore } from "../store/authStore";
import toast from "react-hot-toast";
import { FiCopy, FiDownload, FiEye } from "react-icons/fi";
import CopyToClipboard from "react-copy-to-clipboard";

function URLShortenerForm() {
  const [formData, setFormData] = useState({
    originalUrl: "",
    customAlias: "",
    title: "",
    description: "",
  });
  const [createdUrl, setCreatedUrl] = useState(null);
  const { createShortUrl, isLoading } = useUrlStore();
  const { isAuthenticated } = useAuthStore();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.originalUrl) {
      toast.error("Please enter a URL");
      return;
    }

    try {
      const result = await createShortUrl(formData);
      setCreatedUrl(result.url);
      setFormData({
        originalUrl: "",
        customAlias: "",
        title: "",
        description: "",
      });
      toast.success("Short URL created successfully!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create short URL");
    }
  };

  const handleDownloadQR = () => {
    if (!createdUrl?.qrCode) return;

    const link = document.createElement("a");
    link.href = createdUrl.qrCode;
    link.download = `qrcode-${createdUrl.shortCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="card space-y-4">
        <h2 className="text-2xl font-bold mb-6">Create Short URL</h2>

        {/* Original URL */}
        <div>
          <label className="block font-medium mb-2">Paste your long URL here</label>
          <input
            type="url"
            name="originalUrl"
            placeholder="https://example.com/very-long-url-here"
            value={formData.originalUrl}
            onChange={handleChange}
            className="input"
            required
          />
        </div>

        {/* Title */}
        <div>
          <label className="block font-medium mb-2">Title (optional)</label>
          <input
            type="text"
            name="title"
            placeholder="e.g., My Website"
            value={formData.title}
            onChange={handleChange}
            className="input"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block font-medium mb-2">Description (optional)</label>
          <textarea
            name="description"
            placeholder="Describe this link..."
            value={formData.description}
            onChange={handleChange}
            className="input"
            rows="3"
          />
        </div>

        {/* Custom Alias */}
        {isAuthenticated && (
          <div>
            <label className="block font-medium mb-2">Custom Alias (optional)</label>
            <div className="flex gap-2">
              <span className="self-center text-gray-500">shortenurl.app/</span>
              <input
                type="text"
                name="customAlias"
                placeholder="mycustom"
                value={formData.customAlias}
                onChange={handleChange}
                className="input flex-1"
              />
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="btn btn-primary w-full"
        >
          {isLoading ? "Creating..." : "Create Short URL"}
        </button>
      </form>

      {/* Created URL Result */}
      {createdUrl && (
        <div className="card mt-6 space-y-4 bg-green-50 border border-green-200">
          <h3 className="text-lg font-bold text-green-800">URL Created Successfully!</h3>

          {/* Short URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Short URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={createdUrl.shortUrl}
                readOnly
                className="input flex-1 bg-white"
              />
              <CopyToClipboard text={createdUrl.shortUrl}>
                <button className="btn btn-secondary flex items-center space-x-2">
                  <FiCopy /> <span>Copy</span>
                </button>
              </CopyToClipboard>
            </div>
          </div>

          {/* Original URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Original URL
            </label>
            <a
              href={createdUrl.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline block break-all"
            >
              {createdUrl.originalUrl}
            </a>
          </div>

          {/* QR Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              QR Code
            </label>
            <div className="flex gap-4 items-center">
              {createdUrl.qrCode && (
                <img src={createdUrl.qrCode} alt="QR Code" className="w-32 h-32 border" />
              )}
              <button
                onClick={handleDownloadQR}
                className="btn btn-secondary flex items-center space-x-2"
              >
                <FiDownload /> <span>Download QR</span>
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-white p-3 rounded border">
              <p className="text-gray-600">Clicks</p>
              <p className="text-2xl font-bold">{createdUrl.clickCount}</p>
            </div>
            <div className="bg-white p-3 rounded border">
              <p className="text-gray-600">Created</p>
              <p className="text-sm">
                {new Date(createdUrl.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default URLShortenerForm;

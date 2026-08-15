import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL;

export default function Analytics() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get(`/api/urls/${id}/analytics`);
        setData(res.data);
      } catch {
        toast.error('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [id]);

  if (loading) {
    return <div className="loading">Loading analytics...</div>;
  }

  if (!data) {
    return (
      <div className="analytics-empty">
        <p>Could not load analytics for this URL.</p>
        <Link to="/" className="btn btn-secondary">Back to Dashboard</Link>
      </div>
    );
  }

  const shortUrl = `${API_URL}/${data.url.short_code}`;

  return (
    <div className="analytics">
      <Link to="/" className="back-link">&larr; Back to Dashboard</Link>

      <div className="analytics-header">
        <h2>URL Analytics</h2>
        <div className="analytics-url-info">
          <p><strong>Short URL:</strong> <a href={shortUrl} target="_blank" rel="noreferrer">{shortUrl}</a></p>
          <p><strong>Original URL:</strong> <a href={data.url.original_url} target="_blank" rel="noreferrer">{data.url.original_url}</a></p>
        </div>
      </div>

      <div className="analytics-stats">
        <div className="stat-card">
          <span className="stat-value">{data.total_clicks ?? 0}</span>
          <span className="stat-label">Total Clicks</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{data.unique_visitors ?? 0}</span>
          <span className="stat-label">Unique Visitors</span>
        </div>
      </div>

      <div className="analytics-sections">
        <div className="analytics-section">
          <h3>Top Referrers</h3>
          {data.top_referrers.length === 0 ? (
            <p className="empty-state">No referrer data yet.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Referrer</th>
                  <th>Clicks</th>
                </tr>
              </thead>
              <tbody>
                {data.top_referrers.map((item) => (
                  <tr key={item.referrer}>
                    <td>{item.referrer}</td>
                    <td>{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="analytics-section">
          <h3>Clicks by Date</h3>
          {Object.keys(data.clicks_by_date).length === 0 ? (
            <p className="empty-state">No clicks recorded yet.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Clicks</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.clicks_by_date)
                  .sort((a, b) => b[0].localeCompare(a[0]))
                  .map(([date, count]) => (
                    <tr key={date}>
                      <td>{date}</td>
                      <td>{count}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="analytics-section">
          <h3>Top User Agents</h3>
          {data.top_user_agents.length === 0 ? (
            <p className="empty-state">No user agent data yet.</p>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User Agent</th>
                    <th>Clicks</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_user_agents.map((item, i) => (
                    <tr key={i}>
                      <td className="ua-cell">{item.user_agent}</td>
                      <td>{item.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
